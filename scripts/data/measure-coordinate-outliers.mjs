#!/usr/bin/env node
/**
 * measure-coordinate-outliers.mjs — is any pin somewhere the entry does not
 * claim to be?
 *
 * WHY. A wrong coordinate is this archive's quietest serious failure. Prose that
 * is wrong can be read and doubted; a marker 200 km from the shrine it names
 * looks exactly like a marker. Nothing had ever checked the 169 pins against the
 * 169 `Location` strings, and the front door's whole job is to draw them.
 *
 * WHAT IT CHECKS, in rising order of how much judgement it needs:
 *
 *   1. **Outside Pakistan.** A generous bounding box. Zero tolerance: an archive
 *      of shrines in Pakistan has no correct answer outside it.
 *   2. **Identical pins.** Two entries at the same coordinate to five decimal
 *      places — about a metre. Sometimes right and often is: three shrines
 *      inside Miani Sahib graveyard, two tombs on the Uch Sharif mound. Reported
 *      rather than failed, because the question it asks a human is "do these
 *      two entries claim the same place?", which no script can answer.
 *   3. **Far from the place it names.** Sites are grouped by the closed place
 *      vocabulary, and a pin is flagged when it sits far from the median of its
 *      own cluster — both in absolute terms and relative to that cluster's own
 *      spread, so a tight city cluster and a sprawling district are judged on
 *      their own scales.
 *
 * THE FALSE POSITIVE THAT CHECK #3 WILL ALWAYS HAVE, and why it is not worth
 * engineering away: the vocabulary is district-level, and a district is large.
 * Mohra Sharif is 58 km from the Rawalpindi cluster and **correctly pinned** —
 * its own Location says "Murree Tehsil, Rawalpindi District", and Murree is up
 * in the hills. Tightening the threshold until that disappears would also hide
 * a genuine 60 km error somewhere flat. So it flags, a human reads the Location
 * line printed beside it, and the answer takes five seconds.
 *
 * NOT A GATE, and deliberately: exit code is 0 whatever it finds. Two entries
 * sharing a graveyard is not a defect, and a check whose output needs a person
 * should not be able to block a commit.
 *
 *     node scripts/data/measure-coordinate-outliers.mjs
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { placesForLocation, locationOfRow } from './lib/places.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const rows = JSON.parse(readFileSync(join(ROOT, 'data', 'shrines.json'), 'utf8')).rows;

/* Generous enough to cover every disputed and administered boundary — the point
   is to catch a transposed sign or a decimal in the wrong place, not to have an
   opinion about borders. */
const PAKISTAN = { minLat: 23.5, maxLat: 37.2, minLng: 60.8, maxLng: 77.9 };

const km = (a, b) => {
  const R = 6371;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};
const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const points = [];
for (const row of rows) {
  const lat = parseFloat(row.Latitude);
  const lng = parseFloat(row.Longitude);
  if (!isFinite(lat) || !isFinite(lng)) continue;
  points.push({ name: row.Name, lat, lng, loc: locationOfRow(row) });
}
console.log(`[coords] ${points.length} of ${rows.length} rows carry coordinates`);

// ── 1. outside Pakistan ──────────────────────────────────────────────────────
const outside = points.filter(
  (p) =>
    p.lat < PAKISTAN.minLat ||
    p.lat > PAKISTAN.maxLat ||
    p.lng < PAKISTAN.minLng ||
    p.lng > PAKISTAN.maxLng,
);
console.log(`\n  outside Pakistan: ${outside.length}`);
outside.forEach((p) => console.log(`     ${p.name} — ${p.lat}, ${p.lng} | ${p.loc}`));

// ── 2. identical pins ────────────────────────────────────────────────────────
const atPoint = new Map();
for (const p of points) {
  const key = `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  if (!atPoint.has(key)) atPoint.set(key, []);
  atPoint.get(key).push(p);
}
const shared = [...atPoint.entries()].filter(([, v]) => v.length > 1);
console.log(`\n  entries sharing a pin to ~1 m: ${shared.length} group(s)`);
for (const [key, group] of shared) {
  console.log(`     ${key}`);
  group.forEach((p) => console.log(`        ${p.name.slice(0, 52).padEnd(54)}${p.loc.slice(0, 70)}`));
}
if (shared.length) {
  console.log(
    '\n     Read the Location lines: a shared pin is correct where the entries\n' +
      '     claim one complex — a graveyard, a necropolis, a village — and wrong\n' +
      '     where they name different addresses.',
  );
}

// ── 3. far from the place it names ───────────────────────────────────────────
const byPlace = new Map();
for (const p of points) {
  for (const place of placesForLocation(p.loc)) {
    if (!byPlace.has(place.slug)) byPlace.set(place.slug, []);
    byPlace.get(place.slug).push(p);
  }
}
const clusters = [...byPlace.entries()].filter(([, v]) => v.length >= 3);
const flagged = [];
for (const [slug, pts] of clusters) {
  const centre = { lat: median(pts.map((p) => p.lat)), lng: median(pts.map((p) => p.lng)) };
  const withDistance = pts.map((p) => ({ ...p, d: km(centre, p) }));
  const spread = median(withDistance.map((p) => p.d));
  for (const p of withDistance) {
    if (p.d > 40 && p.d > Math.max(6 * spread, 15)) flagged.push({ slug, n: pts.length, spread, ...p });
  }
}
console.log(
  `\n  clusters of 3+ sites: ${clusters.length} — pins far from their own cluster: ${flagged.length}`,
);
for (const f of flagged.sort((a, b) => b.d - a.d)) {
  console.log(
    `     ${f.d.toFixed(0)} km from the "${f.slug}" median (cluster spread ${f.spread.toFixed(1)} km, ${f.n} sites)`,
  );
  console.log(`        ${f.name}`);
  console.log(`        ${f.lat}, ${f.lng} | ${f.loc.slice(0, 88)}`);
}
console.log(
  '\n     A flag here is a question, not a defect. The place vocabulary is\n' +
    '     district-level and districts are large: Mohra Sharif sits 58 km from\n' +
    '     the Rawalpindi median and is pinned correctly, because its own\n' +
    '     Location says Murree Tehsil.',
);
