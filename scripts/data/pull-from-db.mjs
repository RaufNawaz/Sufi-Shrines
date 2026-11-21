#!/usr/bin/env node
/**
 * npm run data:pull — Supabase (the master since 21 Nov 2026) → the site's data.
 *
 * 1. pipeline/db/export_snapshot.py --supabase writes public/shrines-sheet.csv (read-only login).
 * 2. build-dataset.mjs rebuilds data/shrines.json, the app snapshot and the index from it.
 * Then commit and push 1.7 to publish. Python: SHRINES_PYTHON, else ~/.venvs/shrines-db.
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const venv = join(homedir(), '.venvs', 'shrines-db');
const python =
  process.env.SHRINES_PYTHON ||
  [join(venv, 'Scripts', 'python.exe'), join(venv, 'bin', 'python')].find(existsSync) ||
  'python3';

function run(cmd, args) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

run(python, ['pipeline/db/export_snapshot.py', '--supabase', '--out', 'public/shrines-sheet.csv']);
run(process.execPath, ['scripts/data/build-dataset.mjs']);
