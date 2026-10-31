/*
 * team-crypto.js: the one implementation of the team edition's encryption (31 October 2026).
 *
 * The team build is published on the same GitHub Pages site as the public one, but only as
 * AES-256-GCM ciphertext (docs/TEAM_ACCESS_PLAN.md, option C). Three programs need the same
 * primitives: scripts/team/encrypt-team.mjs (node, at deploy), unlock.js (the passphrase page) and
 * team-sw.js (the service worker that decrypts). Keeping one copy means the format cannot drift
 * between the side that writes it and the side that reads it, and the round-trip test
 * (scripts/team/test-team-crypto.mjs) exercises the code the browser runs.
 *
 * It is a classic script, not a module: a service worker loads it with importScripts() (module
 * service workers are not yet safe to assume), the page with a <script> tag, and node evaluates it
 * with vm.runInThisContext (scripts/team/load-team-crypto.mjs). It only uses Web Crypto, which
 * browsers and node (globalThis.crypto.subtle, node 20+) share, and attaches itself to globalThis.
 *
 * Format, version 1:
 *   key   PBKDF2-HMAC-SHA256(passphrase, 16-byte random salt, >= 600,000 iterations) -> AES-256-GCM
 *   box   12-byte random IV || ciphertext || 16-byte GCM tag
 *   AAD   every box is bound to what it holds: 'sufi-shrines-team/1 check', '... map', or
 *         '... file <relative path>'. A blob moved to another path, or the map swapped for the
 *         check, fails to decrypt instead of being served as the wrong file.
 */
(function (root) {
  'use strict';

  var FORMAT = 'sufi-shrines-team/1';
  var MIN_ITERATIONS = 600000;
  var CHECK_TEXT = 'Mapping the Shrines of Pakistan: team edition key check';
  var subtle = root.crypto.subtle;
  var enc = new TextEncoder();
  var dec = new TextDecoder();

  function randomBytes(n) {
    return root.crypto.getRandomValues(new Uint8Array(n));
  }

  function toBase64(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(s);
  }

  function fromBase64(text) {
    var s = atob(text);
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }

  /* URL-safe, so a blob name can sit in a path without escaping. */
  function randomName(bytes) {
    return toBase64(randomBytes(bytes || 12))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  function aad(kind, path) {
    return enc.encode(FORMAT + ' ' + kind + (path === undefined ? '' : ' ' + path));
  }

  /* The key is never extractable: script on the page can use it but cannot read it back out, so
     a stored key cannot be copied off this browser as bytes. `usages` is ['decrypt'] in the
     browser and ['encrypt', 'decrypt'] at deploy. */
  async function deriveKey(passphrase, kdf, usages) {
    if (!kdf || kdf.name !== 'PBKDF2' || kdf.hash !== 'SHA-256')
      throw new Error('team-crypto: unsupported KDF');
    if (!(kdf.iterations >= MIN_ITERATIONS))
      throw new Error('team-crypto: fewer than ' + MIN_ITERATIONS + ' PBKDF2 iterations');
    var base = await subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, [
      'deriveKey',
    ]);
    return subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: fromBase64(kdf.salt), iterations: kdf.iterations },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      usages || ['decrypt'],
    );
  }

  /* A fresh random 96-bit IV for every box. */
  async function seal(key, plain, additional) {
    var iv = randomBytes(12);
    var ct = new Uint8Array(
      await subtle.encrypt({ name: 'AES-GCM', iv: iv, additionalData: additional }, key, plain),
    );
    var out = new Uint8Array(12 + ct.length);
    out.set(iv, 0);
    out.set(ct, 12);
    return out;
  }

  /* Throws (an OperationError) when the key is wrong or the box was altered. */
  async function open(key, box, additional) {
    var bytes = box instanceof Uint8Array ? box : new Uint8Array(box);
    if (bytes.length < 28) throw new Error('team-crypto: box too short');
    return new Uint8Array(
      await subtle.decrypt(
        { name: 'AES-GCM', iv: bytes.subarray(0, 12), additionalData: additional },
        key,
        bytes.subarray(12),
      ),
    );
  }

  function newKdf(iterations) {
    return {
      name: 'PBKDF2',
      hash: 'SHA-256',
      iterations: iterations || MIN_ITERATIONS,
      salt: toBase64(randomBytes(16)),
    };
  }

  async function sealCheck(key) {
    return toBase64(await seal(key, enc.encode(CHECK_TEXT), aad('check')));
  }

  /* True when this key opens this manifest's check value: the passphrase is right and the
     manifest is the one the key was made for (a redeploy draws a new salt). */
  async function verifyKey(key, manifest) {
    try {
      var plain = await open(key, fromBase64(manifest.check), aad('check'));
      return dec.decode(plain) === CHECK_TEXT;
    } catch (e) {
      return false;
    }
  }

  async function sealMap(key, map) {
    return toBase64(await seal(key, enc.encode(JSON.stringify(map)), aad('map')));
  }

  async function openMap(key, manifest) {
    return JSON.parse(dec.decode(await open(key, fromBase64(manifest.map), aad('map'))));
  }

  function sealFile(key, path, bytes) {
    return seal(key, bytes, aad('file', path));
  }

  function openFile(key, path, box) {
    return open(key, box, aad('file', path));
  }

  /* ── where the browser keeps the key ─────────────────────────────────────────────────────
     IndexedDB, which (unlike localStorage) stores a CryptoKey as an object, so it stays
     non-extractable at rest. The page writes it, the service worker reads and deletes it. */
  var DB_NAME = 'sufi-shrines-team';
  var STORE = 'keys';
  var KEY_ID = 'aes';

  function withStore(mode, fn) {
    return new Promise(function (resolve, reject) {
      var req = root.indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function () {
        req.result.createObjectStore(STORE);
      };
      req.onerror = function () {
        reject(req.error);
      };
      req.onsuccess = function () {
        var db = req.result;
        var tx = db.transaction(STORE, mode);
        var result;
        tx.oncomplete = function () {
          db.close();
          resolve(result);
        };
        tx.onerror = tx.onabort = function () {
          db.close();
          reject(tx.error);
        };
        var r = fn(tx.objectStore(STORE));
        if (r)
          r.onsuccess = function () {
            result = r.result;
          };
      };
    });
  }

  var keyStore = {
    get: function () {
      return withStore('readonly', function (s) {
        return s.get(KEY_ID);
      });
    },
    set: function (key) {
      return withStore('readwrite', function (s) {
        return s.put(key, KEY_ID);
      });
    },
    clear: function () {
      return withStore('readwrite', function (s) {
        return s.delete(KEY_ID);
      });
    },
  };

  root.TeamCrypto = {
    FORMAT: FORMAT,
    MIN_ITERATIONS: MIN_ITERATIONS,
    toBase64: toBase64,
    fromBase64: fromBase64,
    randomName: randomName,
    newKdf: newKdf,
    deriveKey: deriveKey,
    sealCheck: sealCheck,
    verifyKey: verifyKey,
    sealMap: sealMap,
    openMap: openMap,
    sealFile: sealFile,
    openFile: openFile,
    keyStore: keyStore,
  };
})(globalThis);
