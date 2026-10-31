/*
 * team-sw.js: the service worker that serves the encrypted team edition (31 October 2026).
 *
 * Scope: the team base (/Sufi-Shrines/team/). GitHub Pages can only serve files, so the decrypting
 * happens here, in the browser, with the key unlock.js stored in IndexedDB:
 *
 *   - the shell's own files (unlock.js, team-crypto.js, team-sw.js, manifest.json, b/*.bin, and
 *     index.html while locked) go straight to the network;
 *   - `lock` forgets the key and redirects to the team root, which is then the passphrase page;
 *   - with a key: a path in the decrypted map gets its decrypted bytes and Content-Type; any other
 *     navigation gets the app's index.html (the router handles the route); any other request gets
 *     the public copy at the same path without `team/` (encrypt-team.mjs left those out because
 *     they are byte-identical to the public build's);
 *   - with no key, or a key that no longer opens the manifest (the passphrase was rotated, or a
 *     redeploy drew a new salt): the key is deleted, and a navigation is sent to the passphrase
 *     page with `?next=` so the reader lands where they meant to go.
 *
 * Requests outside the scope, cross-origin ones (the Google Sheet, map tiles, photos on other
 * hosts) and anything but GET are left alone: no respondWith, so the browser handles them as if
 * this worker did not exist. Decrypted bytes are only ever held in memory, never in Cache Storage.
 */
/* global importScripts */
importScripts('team-crypto.js');

var TC = self.TeamCrypto;
var TEAM_BASE = new URL('./', self.location.href).pathname;
var PUBLIC_BASE = TEAM_BASE.replace(/team\/$/, '');
var NETWORK_ONLY = { 'unlock.js': 1, 'team-crypto.js': 1, 'team-sw.js': 1, 'manifest.json': 1 };

/* The decrypted map and the key it opened with, cached in memory for the life of this worker.
   Re-checked against the network's manifest on every navigation. */
var state = null;
var pending = null;

self.addEventListener('install', function () {
  // Nothing to precache, and an old copy of this file has nothing worth waiting for.
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  // Take over the team pages that are already open, so a page unlocked before this version
  // arrived keeps being served by a worker that knows the current format.
  event.waitUntil(self.clients.claim());
});

function load(refresh) {
  if (state && !refresh) return Promise.resolve(state);
  if (!pending) {
    pending = loadNow().then(
      function (s) {
        pending = null;
        return s;
      },
      function (err) {
        pending = null;
        throw err;
      },
    );
  }
  return pending;
}

/* Resolves to { key, map, text } when unlocked, or null when locked. A key that does not open the
   current manifest's check value is deleted here: that is how a rotated passphrase locks
   everyone out cleanly instead of failing on every file. */
async function loadNow() {
  var key = await TC.keyStore.get();
  if (!key) {
    state = null;
    return null;
  }
  var response = await fetch(TEAM_BASE + 'manifest.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error('manifest.json: ' + response.status);
  var text = await response.text();
  var manifest = JSON.parse(text);
  if (!(await TC.verifyKey(key, manifest))) {
    await forget();
    return null;
  }
  if (state && state.text === text) {
    state.key = key;
    return state;
  }
  state = { key: key, text: text, map: await TC.openMap(key, manifest) };
  return state;
}

async function forget() {
  state = null;
  await TC.keyStore.clear();
}

function redirect(path) {
  return Response.redirect(new URL(path, self.location.origin).href, 302);
}

function toUnlock(rel, search) {
  var next = rel + search;
  return redirect(TEAM_BASE + (next ? '?next=' + encodeURIComponent(next) : ''));
}

async function decrypted(s, rel, entry) {
  var response = await fetch(TEAM_BASE + entry.blob);
  if (!response.ok) throw new Error(entry.blob + ': ' + response.status);
  var plain = await TC.openFile(s.key, rel, await response.arrayBuffer());
  return new Response(plain, {
    status: 200,
    headers: { 'Content-Type': entry.type, 'Cache-Control': 'no-store' },
  });
}

function lookup(s, rel, navigate) {
  var files = s.map.files;
  if (Object.prototype.hasOwnProperty.call(files, rel)) return rel;
  if ((rel === '' || rel.slice(-1) === '/') && files[rel + 'index.html']) return rel + 'index.html';
  return navigate ? 'index.html' : null;
}

async function handle(request, url, rel) {
  var navigate = request.mode === 'navigate';

  if (rel === 'lock') {
    await forget();
    return redirect(TEAM_BASE);
  }

  var s;
  try {
    s = await load(navigate);
  } catch (err) {
    // Offline or the manifest unreachable: carry on with what is in memory, if anything.
    s = state;
  }

  if (!s) {
    if (!navigate)
      return new Response('Locked', { status: 403, headers: { 'Content-Type': 'text/plain' } });
    if (rel === '' || rel === 'index.html') return fetch(request);
    return toUnlock(rel, url.search);
  }

  // Already unlocked, yet sent to the passphrase page with somewhere to go: go there.
  if (navigate && (rel === '' || rel === 'index.html') && url.searchParams.has('next')) {
    var next = (url.searchParams.get('next') || '').replace(/^[/\\]+/, '');
    if (/^(lock|index\.html)([?#].*)?$/.test(next)) next = '';
    return redirect(TEAM_BASE + next);
  }

  var path = lookup(s, rel, navigate);
  if (!path) {
    // Left out of dist/team because the public build has the same bytes at the same path.
    var copy = await fetch(PUBLIC_BASE + url.pathname.slice(TEAM_BASE.length) + url.search, {
      headers: request.headers,
      credentials: 'same-origin',
    });
    /* Re-wrapped so the response carries no URL of its own and the browser keeps the team URL.
       Returned as is, a shared chunk such as vendor-react ran as /Sufi-Shrines/assets/..., its
       relative imports then loaded the public chunks, and the page had two Reacts (measured on
       the first run of test-team-site.mjs, 31 October 2026). */
    var bodyless = copy.status === 204 || copy.status === 205 || copy.status === 304;
    return new Response(bodyless ? null : copy.body, {
      status: copy.status,
      statusText: copy.statusText,
      headers: copy.headers,
    });
  }

  try {
    return await decrypted(s, path, s.map.files[path]);
  } catch (first) {
    // A redeploy while this worker was alive renames every blob: reload the manifest once.
    try {
      s = await load(true);
      if (s && s.map.files[path]) return await decrypted(s, path, s.map.files[path]);
    } catch (second) {
      /* fall through */
    }
    if (!s) return navigate ? toUnlock(rel, url.search) : new Response('Locked', { status: 403 });
    return new Response('The team edition could not be decrypted.', { status: 502 });
  }
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.indexOf(TEAM_BASE) !== 0) return;
  var rel = url.pathname.slice(TEAM_BASE.length);
  try {
    rel = decodeURIComponent(rel);
  } catch (err) {
    /* keep it as sent */
  }
  if (NETWORK_ONLY[rel] || rel.indexOf('b/') === 0) return;
  event.respondWith(handle(request, url, rel));
});
