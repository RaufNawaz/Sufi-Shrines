/*
 * unlock.js: the passphrase page's one job (31 October 2026).
 *
 * Derives the key in this browser (PBKDF2-SHA256 -> AES-256-GCM, not extractable), checks it
 * against the manifest's check value so a wrong passphrase is refused at once, stores the key in
 * IndexedDB, registers the team service worker for the team base, and then opens the page that was
 * asked for: `?next=<path>` (set by the service worker or by the public 404.html redirect), or the
 * team root. The passphrase itself is never stored or sent anywhere; only the derived key is kept.
 */
(function () {
  'use strict';

  var TC = window.TeamCrypto;
  var TEAM_BASE = new URL('./', document.currentScript.src).pathname;
  var form = document.getElementById('unlock-form');
  var input = document.getElementById('passphrase');
  var show = document.getElementById('show-passphrase');
  var button = document.getElementById('unlock-button');
  var status = document.getElementById('unlock-status');
  var error = document.getElementById('unlock-error');

  var MESSAGES = {
    empty: ['Enter the passphrase first.', 'پہلے پاس فریز درج کریں۔'],
    wrong: [
      'That passphrase is not right. Check it and try again.',
      'یہ پاس فریز درست نہیں۔ دوبارہ دیکھ کر کوشش کریں۔',
    ],
    unsupported: [
      'This browser cannot open the team edition: it needs service workers and IndexedDB, which ' +
        'private browsing often turns off. Try a normal window.',
      'یہ براؤزر ٹیم ایڈیشن نہیں کھول سکتا، کیونکہ اسے سروس ورکر اور IndexedDB درکار ہیں جو اکثر ' +
        'پرائیویٹ ونڈو میں بند ہوتے ہیں۔ عام ونڈو میں کوشش کریں۔',
    ],
    failed: [
      'The team edition could not be opened. Check your connection and try again.',
      'ٹیم ایڈیشن نہیں کھل سکا۔ اپنا انٹرنیٹ کنکشن دیکھ کر دوبارہ کوشش کریں۔',
    ],
    working: ['Checking the passphrase…', 'پاس فریز کی جانچ ہو رہی ہے…'],
  };

  function bilingual(target, pair) {
    target.textContent = '';
    var en = document.createElement('p');
    en.textContent = pair[0];
    var ur = document.createElement('p');
    ur.lang = 'ur';
    ur.dir = 'rtl';
    ur.textContent = pair[1];
    target.appendChild(en);
    target.appendChild(ur);
  }

  function showError(which) {
    status.textContent = '';
    bilingual(error, MESSAGES[which]);
    error.hidden = false;
    input.setAttribute('aria-invalid', 'true');
  }

  function clearError() {
    error.hidden = true;
    error.textContent = '';
    input.removeAttribute('aria-invalid');
  }

  function busy(on) {
    button.disabled = on;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
    if (on) bilingual(status, MESSAGES.working);
    else status.textContent = '';
  }

  /* A path inside the team edition, never an absolute URL: TEAM_BASE always starts with '/', so
     anything appended stays on this origin. `lock` is dropped, or unlocking would lock again. */
  function nextPath() {
    var raw = new URLSearchParams(location.search).get('next') || '';
    raw = raw.replace(/^[/\\]+/, '');
    if (/^(lock|index\.html)([?#].*)?$/.test(raw)) return '';
    return raw;
  }

  function whenActive(reg) {
    return new Promise(function (resolve) {
      if (reg.active) return resolve(reg);
      var worker = reg.installing || reg.waiting;
      worker.addEventListener('statechange', function () {
        if (worker.state === 'activated') resolve(reg);
      });
    });
  }

  show.addEventListener('change', function () {
    input.type = show.checked ? 'text' : 'password';
  });

  var supported = 'serviceWorker' in navigator && !!window.indexedDB && !!window.crypto.subtle;
  if (!supported) {
    showError('unsupported');
    button.disabled = true;
    return;
  }

  var manifest = fetch(TEAM_BASE + 'manifest.json', { cache: 'no-cache' }).then(function (r) {
    if (!r.ok) throw new Error('manifest ' + r.status);
    return r.json();
  });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    clearError();
    var passphrase = input.value;
    if (!passphrase) {
      showError('empty');
      input.focus();
      return;
    }
    busy(true);
    manifest
      .then(function (m) {
        return TC.deriveKey(passphrase, m.kdf, ['decrypt']).then(function (key) {
          return TC.verifyKey(key, m).then(function (ok) {
            if (!ok) return false;
            return TC.keyStore
              .set(key)
              .then(function () {
                return navigator.serviceWorker.register(TEAM_BASE + 'team-sw.js', {
                  scope: TEAM_BASE,
                });
              })
              .then(whenActive)
              .then(function () {
                return true;
              });
          });
        });
      })
      .then(
        function (ok) {
          if (!ok) {
            busy(false);
            showError('wrong');
            input.focus();
            input.select();
            return;
          }
          input.value = '';
          location.replace(TEAM_BASE + nextPath());
        },
        function () {
          busy(false);
          showError('failed');
        },
      );
  });
})();
