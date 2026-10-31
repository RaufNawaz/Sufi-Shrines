/**
 * Round-trip test of the team edition's encryption (31 October 2026).
 *
 *   npm run test:team
 *
 * Node only, no browser, so it runs anywhere CI does. It loads scripts/team/shell/team-crypto.js,
 * the file the service worker and the passphrase page run, and checks that what encrypt-team.mjs
 * writes opens with the right passphrase and with nothing else:
 *
 *   - the primitives: check value, map, files, a fresh IV per box, each box bound to its path,
 *     tampering detected, fewer than 600,000 PBKDF2 iterations refused;
 *   - encrypt-team.mjs on a small fixture: identical public files left out, every other file
 *     decrypts byte for byte, no plaintext file name in the output, a wrong passphrase rejected;
 *   - the command line refuses a missing or short passphrase and never prints the passphrase.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TeamCrypto as TC } from './load-team-crypto.mjs';
import { encryptTeam, SHELL_FILES } from './encrypt-team.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PASS = 'correct horse battery staple';
const enc = new TextEncoder();
let passed = 0;

async function test(name, fn) {
  await fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

function put(dir, rel, content) {
  mkdirSync(dirname(join(dir, rel)), { recursive: true });
  writeFileSync(join(dir, rel), content);
}

console.log('team crypto');

await test('check value: right passphrase opens it, wrong one does not', async () => {
  const kdf = TC.newKdf();
  assert.equal(kdf.iterations, 600000);
  assert.equal(TC.fromBase64(kdf.salt).length, 16);
  const key = await TC.deriveKey(PASS, kdf, ['encrypt', 'decrypt']);
  const manifest = { kdf, check: await TC.sealCheck(key), map: await TC.sealMap(key, { a: 1 }) };
  const browserKey = await TC.deriveKey(PASS, kdf, ['decrypt']);
  assert.equal(await TC.verifyKey(browserKey, manifest), true);
  assert.deepEqual(await TC.openMap(browserKey, manifest), { a: 1 });
  const wrong = await TC.deriveKey(PASS + '!', kdf, ['decrypt']);
  assert.equal(await TC.verifyKey(wrong, manifest), false);
  await assert.rejects(TC.openMap(wrong, manifest));
  // A different salt (a redeploy) is a different key, even with the same passphrase.
  const otherSalt = await TC.deriveKey(PASS, TC.newKdf(), ['decrypt']);
  assert.equal(await TC.verifyKey(otherSalt, manifest), false);
});

await test('the key cannot be exported', async () => {
  const key = await TC.deriveKey(PASS, TC.newKdf(), ['decrypt']);
  assert.equal(key.extractable, false);
  assert.equal(key.algorithm.name, 'AES-GCM');
  assert.equal(key.algorithm.length, 256);
  await assert.rejects(crypto.subtle.exportKey('raw', key));
});

await test('files: round trip, fresh IV, bound to their path, tampering detected', async () => {
  const key = await TC.deriveKey(PASS, TC.newKdf(), ['encrypt', 'decrypt']);
  const plain = enc.encode('<!doctype html><title>team</title>');
  const a = await TC.sealFile(key, 'index.html', plain);
  const b = await TC.sealFile(key, 'index.html', plain);
  assert.equal(a.length, plain.length + 28);
  assert.notDeepEqual(a.subarray(0, 12), b.subarray(0, 12));
  assert.deepEqual(await TC.openFile(key, 'index.html', a), plain);
  await assert.rejects(TC.openFile(key, 'about/index.html', a), 'a blob served for another path');
  const bent = Uint8Array.from(a);
  bent[20] ^= 1;
  await assert.rejects(TC.openFile(key, 'index.html', bent), 'a flipped bit');
});

await test('fewer than 600,000 iterations are refused', async () => {
  const kdf = { ...TC.newKdf(), iterations: 100000 };
  await assert.rejects(TC.deriveKey(PASS, kdf), /600000/);
});

const work = mkdtempSync(join(tmpdir(), 'team-crypto-'));
try {
  const dist = join(work, 'dist');
  const teamDist = join(work, 'dist-team');
  const photo = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4]);
  put(dist, 'index.html', '<html>public</html>');
  put(dist, 'photos/a.png', photo);
  put(dist, 'assets/vendor-react-abc.js', 'export const shared = 1;');
  put(dist, 'assets/index-pub.js', 'public entry');
  put(teamDist, 'index.html', '<html>team <script src="/x/team/assets/index-team.js"></script>');
  put(teamDist, 'photos/a.png', photo);
  put(teamDist, 'assets/vendor-react-abc.js', 'export const shared = 1;');
  put(teamDist, 'assets/index-team.js', 'secretTeamOnlyPanel()');
  put(teamDist, 'assets/kg-review-queue-zz.js', 'review queue');
  put(teamDist, '.vite/manifest.json', '{}');

  await test('encrypt-team: only non-public files, each decrypting to the original', async () => {
    const r = await encryptTeam({ dist, teamDist, passphrase: PASS, log: () => {} });
    assert.equal(r.encrypted, 3);
    assert.equal(r.reused, 2);
    const out = join(dist, 'team');
    const listing = readdirSync(out).sort();
    assert.deepEqual(listing, [...SHELL_FILES, 'b', 'manifest.json'].sort());
    assert.equal(readdirSync(join(out, 'b')).length, 3);
    const manifestText = readFileSync(join(out, 'manifest.json'), 'utf8');
    for (const leak of ['assets/', 'index-team', 'kg-review', 'photos', 'text/html']) {
      assert.ok(!manifestText.includes(leak), `manifest.json leaks "${leak}"`);
    }
    for (const name of readdirSync(join(out, 'b'))) {
      assert.match(name, /^[A-Za-z0-9_-]{16}\.bin$/);
      const bytes = readFileSync(join(out, 'b', name));
      assert.ok(!bytes.includes('secretTeamOnlyPanel'), 'a blob holds plaintext');
    }

    // Now as the browser: a decrypt-only key, the check, the map, every file.
    const manifest = JSON.parse(manifestText);
    assert.equal(manifest.kdf.iterations, 600000);
    const key = await TC.deriveKey(PASS, manifest.kdf, ['decrypt']);
    assert.equal(await TC.verifyKey(key, manifest), true);
    const map = await TC.openMap(key, manifest);
    assert.deepEqual(Object.keys(map.files).sort(), [
      'assets/index-team.js',
      'assets/kg-review-queue-zz.js',
      'index.html',
    ]);
    assert.equal(map.files['index.html'].type, 'text/html; charset=utf-8');
    assert.equal(map.files['assets/index-team.js'].type, 'text/javascript; charset=utf-8');
    for (const [rel, entry] of Object.entries(map.files)) {
      const plain = await TC.openFile(key, rel, readFileSync(join(out, entry.blob)));
      assert.deepEqual(Buffer.from(plain), readFileSync(join(teamDist, rel)));
    }
    const wrong = await TC.deriveKey('not the passphrase!', manifest.kdf, ['decrypt']);
    assert.equal(await TC.verifyKey(wrong, manifest), false);
  });

  await test('encrypt-team: a second run draws a new salt and new blob names', async () => {
    const first = readFileSync(join(dist, 'team', 'manifest.json'), 'utf8');
    const firstBlobs = readdirSync(join(dist, 'team', 'b'));
    await encryptTeam({ dist, teamDist, passphrase: PASS, log: () => {} });
    const second = JSON.parse(readFileSync(join(dist, 'team', 'manifest.json'), 'utf8'));
    assert.notEqual(JSON.parse(first).kdf.salt, second.kdf.salt);
    const secondBlobs = readdirSync(join(dist, 'team', 'b'));
    assert.equal(secondBlobs.length, 3, 'old blobs are removed');
    assert.ok(!secondBlobs.some((n) => firstBlobs.includes(n)));
  });

  await test('encrypt-team: a pinned salt (TEAM_SALT) keeps an unlocked key working across deploys', async () => {
    const salt = Buffer.alloc(16, 7).toString('base64');
    await encryptTeam({ dist, teamDist, passphrase: PASS, salt, log: () => {} });
    const one = JSON.parse(readFileSync(join(dist, 'team', 'manifest.json'), 'utf8'));
    const key = await TC.deriveKey(PASS, one.kdf, ['decrypt']);
    await encryptTeam({ dist, teamDist, passphrase: PASS, salt, log: () => {} });
    const two = JSON.parse(readFileSync(join(dist, 'team', 'manifest.json'), 'utf8'));
    assert.equal(two.kdf.salt, salt);
    assert.notEqual(two.check, one.check, 'fresh IVs on every run');
    assert.equal(await TC.verifyKey(key, two), true, "the first deploy's key opens the second");
    await assert.rejects(
      encryptTeam({ dist, teamDist, passphrase: PASS, salt: 'c2hvcnQ=', log: () => {} }),
      /TEAM_SALT/,
    );
  });

  await test('encrypt-team: a path the shell reserves is refused', async () => {
    put(teamDist, 'unlock.js', 'clash');
    await assert.rejects(
      encryptTeam({ dist, teamDist, passphrase: PASS, log: () => {} }),
      /reserves: unlock\.js/,
    );
    rmSync(join(teamDist, 'unlock.js'));
  });

  await test('command line: refuses a missing or short passphrase, never prints it', async () => {
    const script = join(HERE, 'encrypt-team.mjs');
    const args = [script, '--dist', dist, '--team-dist', teamDist, '--no-scan'];
    const run = (passphrase) => {
      const env = { ...process.env };
      delete env.TEAM_PASSPHRASE;
      if (passphrase !== undefined) env.TEAM_PASSPHRASE = passphrase;
      return spawnSync(process.execPath, args, { env, encoding: 'utf8' });
    };
    assert.equal(run(undefined).status, 1);
    const short = run('elevenchars');
    assert.equal(short.status, 1);
    assert.ok(!(short.stdout + short.stderr).includes('elevenchars'));
    const ok = run(PASS);
    assert.equal(ok.status, 0, ok.stderr);
    assert.ok(!(ok.stdout + ok.stderr).includes(PASS));
  });
} finally {
  rmSync(work, { recursive: true, force: true });
}

console.log(`team crypto: ${passed} tests passed`);
