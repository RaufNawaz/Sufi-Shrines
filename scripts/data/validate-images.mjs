#!/usr/bin/env node
/**
 * validate-images.mjs — HTTP-reachability gate for every "Image 1"/"Image 2"
 * URL in the canonical dataset (data/shrines.json). Part of M4's release
 * gate (docs/planning/EXECUTION_PLAN.md): a broken image link shouldn't ship silently.
 *
 * Network-dependent and rate-limit-aware (small concurrency, retry once,
 * spaced requests — Wikimedia Commons throttles aggressively). Skippable
 * via --skip-images for offline dev or sandboxed environments with no
 * outbound network.
 *
 * Usage:  node scripts/data/validate-images.mjs
 * Or:     npm run data:validate:images
 */

import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const SHRINES_JSON = join(ROOT, 'data', 'shrines.json');

const SKIP = process.argv.includes('--skip-images') || process.env.SKIP_IMAGE_VALIDATION === '1';

if (SKIP) {
  console.log('[validate-images] Skipped (--skip-images / SKIP_IMAGE_VALIDATION=1).');
  process.exit(0);
}

if (!existsSync(SHRINES_JSON)) {
  console.error(`[validate-images] data/shrines.json not found. Run: npm run data:build`);
  process.exit(1);
}

const canonical = JSON.parse(readFileSync(SHRINES_JSON, 'utf8'));
const rows = canonical.rows ?? [];

const TIMEOUT_MS = 10000;
// Wikimedia Commons throttles hard on rapid requests (observed HTTP 429
// after ~2 rapid HEADs earlier this session) — every other host gets a
// lighter touch. Concurrency is per-host, not global, so slow Commons
// pacing doesn't stall checks against other hosts.
const WIKIMEDIA_DELAY_MS = 6000;
const OTHER_DELAY_MS = 500;
const RETRY_DELAYS_MS = [8000, 15000]; // backoff schedule specifically for 429

function isWikimedia(url) {
  return /(^|\.)wikimedia\.org$/.test(new URL(url).hostname);
}

/** HEAD first (cheaper); some hosts (older Commons mirrors) reject HEAD, so
 * fall back to a ranged GET rather than treating that as broken. */
async function checkOnce(url) {
  for (const method of ['HEAD', 'GET']) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      const res = await fetch(url, {
        method,
        signal: controller.signal,
        headers: method === 'GET' ? { Range: 'bytes=0-1024' } : undefined,
        redirect: 'follow',
      });
      clearTimeout(timer);
      if (res.ok || res.status === 206) return { ok: true };
      if (method === 'HEAD') continue; // try GET before giving up
      return { ok: false, status: res.status, reason: `HTTP ${res.status}` };
    } catch (err) {
      if (method === 'HEAD') continue;
      return { ok: false, reason: err.name === 'AbortError' ? 'timeout' : err.message };
    }
  }
  return { ok: false, reason: 'unreachable' };
}

/** Retries with a longer backoff specifically on 429 (rate-limited, not
 * actually broken) — a plain 404/403 fails fast without wasting the budget. */
async function checkWithRetry(url) {
  let result = await checkOnce(url);
  for (const delay of RETRY_DELAYS_MS) {
    if (result.ok || result.status !== 429) return result;
    await new Promise((r) => setTimeout(r, delay));
    result = await checkOnce(url);
  }
  return result;
}

// Build the work list: one entry per non-empty Image 1 / Image 2 cell.
const jobs = [];
rows.forEach((row, i) => {
  const name = String(row['Name'] ?? `row ${i}`);
  for (const field of ['Image 1', 'Image 2']) {
    const url = String(row[field] ?? '').trim();
    if (url) jobs.push({ name, field, url });
  }
});

const wikimediaJobs = jobs.filter((j) => isWikimedia(j.url));
const otherJobs = jobs.filter((j) => !isWikimedia(j.url));

console.log(
  `[validate-images] Checking ${jobs.length} image URL(s) across ${rows.length} rows ` +
    `(${wikimediaJobs.length} Wikimedia, serial with ${WIKIMEDIA_DELAY_MS / 1000}s spacing; ` +
    `${otherJobs.length} other hosts, lightly parallel)…`,
);

const failures = [];
let done = 0;

function reportProgress() {
  done++;
  if (done % 20 === 0 || done === jobs.length) {
    console.log(`[validate-images] ${done}/${jobs.length} checked (${failures.length} failing so far)`);
  }
}

async function runWikimediaSerial() {
  for (const job of wikimediaJobs) {
    const result = await checkWithRetry(job.url);
    if (!result.ok) failures.push({ ...job, reason: result.reason });
    reportProgress();
    await new Promise((r) => setTimeout(r, WIKIMEDIA_DELAY_MS));
  }
}

async function runOtherWorker(queue) {
  while (queue.length) {
    const job = queue.shift();
    const result = await checkWithRetry(job.url);
    if (!result.ok) failures.push({ ...job, reason: result.reason });
    reportProgress();
    await new Promise((r) => setTimeout(r, OTHER_DELAY_MS));
  }
}

const otherQueue = [...otherJobs];
await Promise.all([
  runWikimediaSerial(),
  ...Array.from({ length: 3 }, () => runOtherWorker(otherQueue)),
]);

if (failures.length) {
  console.error(`\n[validate-images] ${failures.length} unreachable image URL(s):`);
  failures.forEach((f) => console.error(`  ✗  ${f.name} — ${f.field}: ${f.url} (${f.reason})`));
  process.exit(1);
}

console.log(`[validate-images] ✓ all ${jobs.length} image URLs reachable`);
