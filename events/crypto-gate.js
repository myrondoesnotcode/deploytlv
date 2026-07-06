/*
 * crypto-gate.js — client-side decryption gate for Deploy TLV event portals.
 *
 * The attendee data is served ONLY as ciphertext (data.enc.js → window.D<N>_ENC).
 * There is no plaintext data and no plaintext password anywhere in the served
 * files. The visitor's passphrase is used to derive an AES-256-GCM key
 * (PBKDF2-SHA256) which decrypts the data in-browser. A wrong passphrase makes
 * GCM authentication fail, so the passphrase never has to be compared to a
 * stored value — decryption succeeding IS the proof it's correct.
 *
 * Public helper: DeployGate.init({ encGlobal, dataGlobal, appSrc, storageKey })
 *
 * Parameters MUST match build/encrypt-portal.js exactly (salt/iv/iter come from
 * the encrypted payload itself, so only the algorithm identifiers are hard-coded).
 */
(function () {
  'use strict';

  function b64ToBytes(b64) {
    var bin = atob(b64);
    var out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  async function deriveKey(password, saltBytes, iterations) {
    var baseKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: saltBytes, iterations: iterations, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  // Returns the decrypted plaintext string, or throws if the passphrase is wrong
  // (GCM auth-tag mismatch → OperationError).
  async function decryptPayload(payload, password) {
    var key = await deriveKey(password, b64ToBytes(payload.salt), payload.iter);
    var pt = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: b64ToBytes(payload.iv) },
      key,
      b64ToBytes(payload.ct)
    );
    return new TextDecoder().decode(pt);
  }

  // Fetch, Babel-transform, and run the JSX app AFTER the data global is set.
  // (The app reads window.D<N> at module top, so it must not run before decrypt.)
  async function bootApp(appSrc) {
    var res = await fetch(appSrc, { cache: 'no-cache' });
    if (!res.ok) throw new Error('Failed to load app: ' + res.status);
    var src = await res.text();
    if (typeof Babel === 'undefined') throw new Error('Babel not loaded');
    var compiled = Babel.transform(src, { presets: ['react'], filename: appSrc }).code;
    // Run at global scope so React/ReactDOM globals resolve.
    (0, eval)(compiled);
  }

  window.DeployGate = {
    /**
     * Wire the existing #gate DOM to the decryption flow.
     * @param {string} encGlobal  window property holding the encrypted payload (e.g. 'D3_ENC')
     * @param {string} storageKey localStorage key that caches the passphrase on this device
     *
     * Data mode (events/2, /3) — plaintext is JSON:
     * @param {string} [dataGlobal] window property the app reads (e.g. 'D3')
     * @param {string} [appSrc]     path to the JSX app compiled after decrypt (e.g. 'app.js')
     *
     * Inline-code mode (events/1) — plaintext is a self-contained JS bundle
     * (data + precompiled app) that is eval'd directly:
     * @param {boolean} [inlineCode] when true, eval the decrypted plaintext instead
     */
    init: function (opts) {
      var encGlobal = opts.encGlobal;
      var dataGlobal = opts.dataGlobal;
      var appSrc = opts.appSrc;
      var storageKey = opts.storageKey;
      var inlineCode = opts.inlineCode;

      var gate = document.getElementById('gate');
      var form = document.getElementById('gate-form');
      var input = document.getElementById('gate-input');
      var btn = document.getElementById('gate-btn');
      var err = document.getElementById('gate-error');

      var payload = window[encGlobal];
      var busy = false;

      function fail(msg) {
        err.textContent = msg || '// INCORRECT. TRY AGAIN.';
        form.classList.remove('shake');
        void form.offsetWidth;
        form.classList.add('shake');
        input.value = '';
        input.focus();
      }

      // Attempt decryption + boot. `silent` = auto-attempt from a saved passphrase
      // (don't shake/clear the form if it fails, e.g. passphrase was rotated).
      async function attempt(password, silent) {
        if (busy || !password) return;
        busy = true;
        err.textContent = '';
        try {
          var plaintext = await decryptPayload(payload, password);
          if (inlineCode) {
            // Self-contained bundle (data + precompiled app). Runs at global scope.
            (0, eval)(plaintext);
          } else {
            window[dataGlobal] = JSON.parse(plaintext);
            await bootApp(appSrc);
          }
          try { localStorage.setItem(storageKey, password); } catch (e) {}
          gate.classList.add('fade-out');
          setTimeout(function () { gate.style.display = 'none'; }, 400);
        } catch (e) {
          try { localStorage.removeItem(storageKey); } catch (e2) {}
          if (!silent) fail();
        } finally {
          busy = false;
        }
      }

      if (!payload) {
        fail('// DATA UNAVAILABLE.');
        return;
      }

      btn.addEventListener('click', function () {
        attempt(input.value.trim().toLowerCase(), false);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') attempt(input.value.trim().toLowerCase(), false);
      });

      // Returning visitor on this device: try the cached passphrase silently.
      var saved = null;
      try { saved = localStorage.getItem(storageKey); } catch (e) {}
      if (saved) attempt(saved, true);
    },
  };
})();
