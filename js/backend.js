"use strict";
/* ============================================================
   BACKEND DETECTION (Vercel serverless proxy)
   ------------------------------------------------------------
   When this page is deployed with the /api functions (e.g. on Vercel) and the
   GEMINI_API_KEY / ELEVEN_API_KEY env vars are set, the game routes all vendor
   calls through that proxy — so the keys stay server-side and the player never
   pastes anything.

   If there's no backend (opened as a local file, or a static host without the
   functions), detection silently fails and the game falls back to the original
   client-side key flow (config.local.js or a key typed on the setup screen).
   ============================================================ */
const BACKEND = { checked: false, gemini: false, eleven: false };

async function detectBackend() {
  try {
    const r = await fetch('/api/status', { method: 'GET' });
    if (r.ok) {
      const j = await r.json();
      BACKEND.gemini = !!j.gemini;
      BACKEND.eleven = !!j.eleven;
    }
  } catch (e) {
    /* no backend reachable — stay in client-key mode */
  }
  BACKEND.checked = true;
  // Let the key-driven setup UIs reconfigure now that we know what's available.
  // (These functions live in gemini.js / voices.js, which have already loaded
  //  synchronously by the time this async fetch resolves.)
  if (typeof geminiApplyBackend === 'function') geminiApplyBackend();
  if (typeof voicesApplyBackend === 'function') voicesApplyBackend();
  return BACKEND;
}

// Kick off detection immediately.
detectBackend();
