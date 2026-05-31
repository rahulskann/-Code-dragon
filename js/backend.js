"use strict";
/* ============================================================
   BACKEND DETECTION (Vercel serverless proxy)
   ------------------------------------------------------------
   When this page is deployed with the /api functions (e.g. on Vercel) and the
   GEMINI_API_KEY / ELEVEN_API_KEY env vars are set, the game routes all vendor
   calls through that proxy — so the keys stay server-side and the player never
   pastes anything.

   If there's no backend (opened as a local file, or a static host without the
   functions), detection falls back to the client-side key flow (config.local.js
   or a key typed on the setup screen).

   BACKEND also records *why* it failed so the setup screen + console can tell you
   whether /api/status was unreachable (functions not deployed) or reachable but
   reporting no key (env var not set / not redeployed).
   ============================================================ */
const BACKEND = {
  checked: false,   // detection finished?
  gemini:  false,   // server has GEMINI_API_KEY?
  eleven:  false,   // server has ELEVEN_API_KEY?
  reached: false,   // did /api/status respond at all?
  httpStatus: 0,    // status code from /api/status (0 = never responded)
  error:  null,     // human-readable failure reason, or null
  promise: null,    // in-flight detection promise (await via whenBackendReady)
};

async function _probeStatus() {
  // one attempt; sets reached/httpStatus/error, returns true on a clean 2xx JSON
  try {
    const r = await fetch('/api/status', { method: 'GET', cache: 'no-store' });
    BACKEND.httpStatus = r.status;
    BACKEND.reached = true;
    if (!r.ok) { BACKEND.error = 'status HTTP ' + r.status; return false; }
    const j = await r.json();
    BACKEND.gemini = !!j.gemini;
    BACKEND.eleven = !!j.eleven;
    if (!j.gemini && !j.eleven) BACKEND.error = 'server reachable but no keys set';
    else BACKEND.error = null;
    return true;
  } catch (e) {
    BACKEND.reached = false;
    BACKEND.error = 'unreachable (' + ((e && e.message) || 'network error') + ')';
    return false;
  }
}

function detectBackend() {
  BACKEND.promise = (async () => {
    let ok = await _probeStatus();
    // one quick retry to ride out a cold serverless start / transient network blip
    if (!ok && !BACKEND.reached) {
      await new Promise(res => setTimeout(res, 600));
      ok = await _probeStatus();
    }
    BACKEND.checked = true;
    try {
      console.info(
        '[code-dragon] backend check →',
        'reached=' + BACKEND.reached,
        'http=' + BACKEND.httpStatus,
        'gemini=' + BACKEND.gemini,
        'eleven=' + BACKEND.eleven,
        BACKEND.error ? '(' + BACKEND.error + ')' : ''
      );
    } catch (e) {}
    // Let the key-driven setup UIs reconfigure now that we know what's available.
    if (typeof geminiApplyBackend === 'function') geminiApplyBackend();
    if (typeof voicesApplyBackend === 'function') voicesApplyBackend();
    return BACKEND;
  })();
  return BACKEND.promise;
}

// Await this anywhere that needs detection to have finished.
function whenBackendReady() { return BACKEND.promise || detectBackend(); }

// Console helper: run codeDragonDiag() to see the current backend state.
if (typeof window !== 'undefined') {
  window.codeDragonDiag = function () {
    const d = {
      reached: BACKEND.reached, httpStatus: BACKEND.httpStatus,
      gemini: BACKEND.gemini, eleven: BACKEND.eleven, error: BACKEND.error,
    };
    console.table(d);
    return d;
  };
}

// Kick off detection immediately.
detectBackend();
