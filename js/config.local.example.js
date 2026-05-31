/* ============================================================
   LOCAL KEYS — example template
   ------------------------------------------------------------
   To load your API keys automatically (instead of typing them on the
   setup screen), copy this file to  js/config.local.js  and fill in
   your keys below.

       cp js/config.local.example.js js/config.local.js

   Then edit js/config.local.js. That real file is git-ignored, so your
   keys won't be committed. Leave a value as an empty string ("") to skip
   it — e.g. set only the voice key if you don't want AI Mode.

   ⚠️  SECURITY NOTE: this is a static front-end app, so whatever keys you
   put here are downloaded by the browser and ARE VISIBLE in devtools.
   This file only saves you from typing the key on a trusted local machine;
   it does NOT keep the key secret. Never commit real keys, and don't ship
   config.local.js to a public site. For a key that stays hidden, you'd need
   a small server/proxy in front of the API calls (see README).
   ============================================================ */
window.LOCAL_KEYS = {
  gemini: "",      // Google Gemini key from aistudio.google.com  (enables AI Mode)
  eleven: "",      // ElevenLabs key from elevenlabs.io            (enables voices)
};
