/**
 * Builds the team edition into dist-team/ (31 October 2026).
 *
 *   npm run build:team            (then: npm run team:encrypt)
 *
 * The team view is a separate build of the same code (docs/TEAM_ACCESS_PLAN.md, option C, ruled by
 * Rauf): VITE_TEAM_GATE=team turns the gate on for good and leaves out the public PWA, and the base
 * is /Sufi-Shrines/team/ (set TEAM_BASE to change it). It is never published as it stands:
 * encrypt-team.mjs turns it into ciphertext under dist/team/.
 *
 * Plain `vite build` only: no tsc (`npm run build` has already typechecked the same sources), no
 * prerender (prerendered pages would be more plaintext to encrypt, and the service worker serves
 * the app shell for every route). The environment is set here rather than as `VAR=x cmd` in
 * package.json, because npm runs scripts under cmd.exe on Windows and under sh on the CI runners.
 */
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const base = process.env.TEAM_BASE ?? '/Sufi-Shrines/team/';
if (!base.startsWith('/') || !base.endsWith('/team/')) {
  console.error(`build-team: TEAM_BASE must start with / and end with /team/, not ${base}`);
  process.exit(1);
}

console.log(`build-team: vite build, team gate, base ${base}, into dist-team/`);
const result = spawnSync(
  process.execPath,
  [join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', 'dist-team'],
  {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, VITE_TEAM_GATE: 'team', VITE_BASE_PATH: base },
  },
);
if (result.error) throw result.error;
process.exit(result.status ?? 1);
