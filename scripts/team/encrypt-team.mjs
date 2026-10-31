/**
 * Encrypts the team edition (dist-team/) into dist/team/, beside the public site (31 October 2026).
 *
 *   TEAM_PASSPHRASE=... npm run team:encrypt      (after npm run build and npm run build:team)
 *
 * GitHub Pages serves static files to anyone, so the team build is published only as ciphertext,
 * opened in the browser with a shared passphrase (docs/TEAM_ACCESS_PLAN.md, option C). What it
 * writes:
 *
 *   dist/team/index.html, unlock.js, team-crypto.js   the passphrase page (scripts/team/shell/)
 *   dist/team/team-sw.js                               the service worker that decrypts
 *   dist/team/manifest.json                            KDF parameters, salt, check value, and the
 *                                                      path -> blob map, itself encrypted
 *   dist/team/b/<random>.bin                           one AES-256-GCM box per file
 *
 * A file that is byte-identical to the public build's file at the same path (photos, fonts, most of
 * public/) is not copied at all: it is public already, and the service worker fetches the public
 * copy. Every other file, the app's own index.html included, is encrypted under a fresh random IV,
 * with a key from PBKDF2-HMAC-SHA256 (600,000 iterations, random 16-byte salt) over TEAM_PASSPHRASE.
 * The crypto is scripts/team/shell/team-crypto.js, the same file the browser runs.
 *
 * It refuses to run without a passphrase of at least 12 characters, and never prints it. After
 * writing, it decrypts everything again the way the browser does and compares, then runs the
 * public-bundle scanner both ways: on dist-team it must find team content (the canary works), on
 * dist/team it must find none (nothing readable leaked).
 *
 * Options: --dist <dir> (default dist), --team-dist <dir> (default dist-team), --no-scan.
 */
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SHELL_DIR, TeamCrypto } from './load-team-crypto.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** The files the shell owns. The service worker passes these straight to the network, so the
 *  team build must not have a file of its own at any of these paths. */
export const SHELL_FILES = ['index.html', 'unlock.js', 'team-crypto.js', 'team-sw.js'];
const RESERVED = new Set([...SHELL_FILES.filter((f) => f !== 'index.html'), 'manifest.json']);

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.ics': 'text/calendar; charset=utf-8',
  '.pdf': 'application/pdf',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.ogg': 'audio/ogg',
  '.wasm': 'application/wasm',
};

/** A salt given as base64 of at least 16 bytes (`openssl rand -base64 16` makes one). */
export function validSalt(salt) {
  if (typeof salt !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(salt)) return false;
  return Buffer.from(salt, 'base64').length >= 16;
}

export function contentType(path) {
  return TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.isFile()) out.push(relative(base, full).split(sep).join('/'));
  }
  return out;
}

function parseArgs(argv) {
  const opts = { dist: join(ROOT, 'dist'), teamDist: join(ROOT, 'dist-team'), scan: true };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dist') opts.dist = resolve(argv[++i]);
    else if (argv[i] === '--team-dist') opts.teamDist = resolve(argv[++i]);
    else if (argv[i] === '--no-scan') opts.scan = false;
    else throw new Error(`encrypt-team: unknown argument ${argv[i]}`);
  }
  return opts;
}

/**
 * Encrypts `teamDist` into `<dist>/team`. Exported for the round-trip test; returns counts only,
 * never key material.
 */
export async function encryptTeam({ dist, teamDist, passphrase, salt, log = console.log }) {
  if (typeof passphrase !== 'string' || passphrase.length < 12)
    throw new Error('TEAM_PASSPHRASE is missing or shorter than 12 characters');
  if (salt !== undefined && !validSalt(salt))
    throw new Error('TEAM_SALT must be base64 of at least 16 bytes');
  for (const [dir, what] of [
    [dist, 'the public build (npm run build)'],
    [teamDist, 'the team build (npm run build:team)'],
  ]) {
    if (!existsSync(join(dir, 'index.html'))) throw new Error(`no ${dir}/index.html: run ${what}`);
  }

  const outDir = join(dist, 'team');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(join(outDir, 'b'), { recursive: true });

  // `.vite/manifest.json` is build metadata for the budget check, never requested by the app.
  const files = walk(teamDist)
    .filter((rel) => !rel.startsWith('.vite/'))
    .sort();
  const clashes = files.filter((rel) => RESERVED.has(rel) || rel.startsWith('b/'));
  if (clashes.length)
    throw new Error(`the team build has files at paths the shell reserves: ${clashes.join(', ')}`);

  /* A pinned salt (TEAM_SALT, Rauf 31 October 2026) keeps the derived key the same across
     deploys, so the team stays unlocked until the passphrase changes. Without it each run draws a
     new salt and every browser is asked for the passphrase again. */
  const kdf = salt ? { ...TeamCrypto.newKdf(), salt } : TeamCrypto.newKdf();
  const key = await TeamCrypto.deriveKey(passphrase, kdf, ['encrypt', 'decrypt']);
  const map = { format: TeamCrypto.FORMAT, files: {} };
  const used = new Set();
  let encrypted = 0;
  let encryptedBytes = 0;
  let reused = 0;

  for (const rel of files) {
    const bytes = readFileSync(join(teamDist, rel));
    const publicFile = join(dist, rel);
    if (
      existsSync(publicFile) &&
      statSync(publicFile).size === bytes.length &&
      readFileSync(publicFile).equals(bytes)
    ) {
      reused += 1;
      continue;
    }
    let name;
    do name = `b/${TeamCrypto.randomName(12)}.bin`;
    while (used.has(name));
    used.add(name);
    const box = await TeamCrypto.sealFile(key, rel, new Uint8Array(bytes));
    writeFileSync(join(outDir, name), box);
    map.files[rel] = { blob: name, type: contentType(rel) };
    encrypted += 1;
    encryptedBytes += bytes.length;
  }
  if (!map.files['index.html']) throw new Error('the team index.html was not encrypted');

  const manifest = {
    format: TeamCrypto.FORMAT,
    kdf,
    cipher: { name: 'AES-GCM', length: 256, ivBytes: 12, tagBits: 128 },
    check: await TeamCrypto.sealCheck(key),
    map: await TeamCrypto.sealMap(key, map),
  };
  writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const f of SHELL_FILES) copyFileSync(join(SHELL_DIR, f), join(outDir, f));

  /* Read it back the way the browser will: a decrypt-only key from the manifest, the check,
     the map, then every box against the file it came from. */
  const readKey = await TeamCrypto.deriveKey(passphrase, manifest.kdf, ['decrypt']);
  if (!(await TeamCrypto.verifyKey(readKey, manifest)))
    throw new Error('read-back: the check value does not open');
  const readMap = await TeamCrypto.openMap(readKey, manifest);
  for (const [rel, entry] of Object.entries(readMap.files)) {
    const plain = await TeamCrypto.openFile(readKey, rel, readFileSync(join(outDir, entry.blob)));
    if (!Buffer.from(plain).equals(readFileSync(join(teamDist, rel))))
      throw new Error(`read-back: ${rel} does not decrypt to the original`);
  }
  const expected = new Set([...SHELL_FILES, 'manifest.json', ...used]);
  const stray = walk(outDir).filter((rel) => !expected.has(rel));
  if (stray.length) throw new Error(`unexpected files in ${outDir}: ${stray.join(', ')}`);

  log(
    `encrypt-team: ${encrypted} files encrypted (${(encryptedBytes / 1024).toFixed(0)} KiB), ` +
      `${reused} identical to the public build and left to it, ` +
      `PBKDF2-SHA256 x ${kdf.iterations}; read-back OK`,
  );
  return { encrypted, reused, encryptedBytes, outDir };
}

function runScanner(dir, expectHits) {
  const scanner = join(ROOT, 'scripts', 'check-public-bundle.mjs');
  if (!existsSync(scanner)) {
    console.warn(
      'encrypt-team: WARNING scripts/check-public-bundle.mjs does not exist yet, so neither the ' +
        'canary (team content found in dist-team) nor the leak scan of dist/team ran.',
    );
    return true;
  }
  const args = [scanner, '--dir', dir, ...(expectHits ? ['--expect-hits'] : [])];
  const r = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    const opts = parseArgs(process.argv.slice(2));
    /* Trimmed, as the passphrase page trims what is typed: a secret pasted into GitHub with a
       trailing newline or space must not make a key nobody can type (31 October 2026). */
    const passphrase = (process.env.TEAM_PASSPHRASE ?? '').trim();
    if (passphrase.length < 12) {
      console.error(
        'encrypt-team: TEAM_PASSPHRASE is missing or shorter than 12 characters; refusing to ' +
          'publish the team build.',
      );
      process.exit(1);
    }
    const salt = (process.env.TEAM_SALT ?? '').trim() || undefined;
    if (salt !== undefined && !validSalt(salt)) {
      console.error('encrypt-team: TEAM_SALT is set but is not base64 of at least 16 bytes.');
      process.exit(1);
    }
    const { outDir } = await encryptTeam({ ...opts, passphrase, salt });
    if (opts.scan) {
      // The canary first: a scanner that finds nothing in the plaintext proves nothing below.
      if (!runScanner(opts.teamDist, true)) {
        console.error('encrypt-team: the scanner found no team content in dist-team; its canary');
        console.error('  is broken, so a clean scan of dist/team would mean nothing.');
        process.exit(1);
      }
      if (!runScanner(outDir, false)) {
        console.error('encrypt-team: readable team content in dist/team. Do not deploy.');
        process.exit(1);
      }
    }
  } catch (err) {
    // Messages here never contain the passphrase: nothing above puts it in one.
    console.error(`encrypt-team: ${err.message}`);
    process.exit(1);
  }
}
