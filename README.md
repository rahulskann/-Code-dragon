# Code Dragon — The Interview of Fire

A turn-based, D&D-inspired interview RPG. Pick a class (Mage / Fighter / Thief —
front-end / back-end / cyber-security), then duel a Bug Dragon by answering
interview questions. Answer right to dodge and strike; charge the SPECIAL meter
with three correct answers to unleash a harshly-timed, double-damage attack.

## Run it
Open `index.html` in any modern browser. No build step, no dependencies.
(Tip: serving the folder — e.g. `python3 -m http.server` — avoids any
file:// quirks, but double-clicking the file works too.)

## Project layout
```
code-dragon/
├── index.html            markup + ordered <script> includes
├── css/
│   └── styles.css         all styling (retro pixel UI, animations)
└── js/                    loaded in this order; one shared global scope
    ├── core.js            world constants, canvas setup, tiny helpers
    ├── sprites-hero.js    PLAYER sprites: HERO_DATA pixel maps + builders
    ├── sprites-dragon.js  DRAGON sprite: procedural pixel-art drawing
    ├── entities.js        hero/dragon state + per-frame animation
    ├── background.js       cave backdrop + flickering torches
    ├── effects.js         particle bursts + projectiles
    ├── render-loop.js     the requestAnimationFrame draw loop
    ├── audio.js           generated WebAudio sound effects
    ├── questions.js       the interview question bank (edit me to add Qs)
    ├── battle.js          turn logic, question UI, special attack, win/lose
    └── main.js            class-select screen + button wiring
```

## How the split works
The scripts are plain (non-module) and load in the order above. Top-level
`const`/`let`/`function` declarations are shared across all of them in the page's
global scope, so this is behaviorally identical to the original single file —
it's purely organizational. **Load order is dependency order:** a file's
top-level code only uses things defined in files above it. If you reorder the
`<script>` tags in `index.html`, keep that rule in mind.

## Common edits
- Add/adjust questions → `js/questions.js`
- Tune balance (damage, timers, charge needed) → constants at the top of `js/battle.js`
- Tweak a sprite → `js/sprites-hero.js` (players) or `js/sprites-dragon.js` (dragon)
- Restyle the UI → `css/styles.css`

## Quitting a fight (HOME button)
During a battle there's a **⌂ HOME** button (top-left). Click it to abandon the
current fight and return to class select. **Nothing is saved** — starting any
fight fully re-initializes HP, stats, the question deck and the special meter,
so HOME just drops you back at the menu with a clean slate.

## Loading API keys from a local file (instead of typing them)
You can avoid pasting keys on the setup screen by putting them in a local,
git-ignored config file:

```bash
cp js/config.local.example.js js/config.local.js   # then edit it
```

In `js/config.local.js`, fill in either/both keys:

```js
window.LOCAL_KEYS = {
  gemini: "your-gemini-key",   // enables AI Mode
  eleven: "your-elevenlabs-key", // enables character voices
};
```

On reload the keys load automatically and the on-screen key fields disappear.
If `config.local.js` is missing or a value is left `""`, the app falls back to
the normal manual entry on the setup screen.

> Why not a `.env` file? This is a static front-end app (no server/build step),
> and a browser can't read `.env` from disk — that's a server-side concept. The
> `config.local.js` approach is the static-app equivalent.
>
> ⚠️ **This does not hide the key.** Anything in `config.local.js` is downloaded
> by the browser and visible in devtools — exactly like the typed-key flow. It
> only removes the typing step on a trusted local machine. `config.local.js` is
> git-ignored so it isn't committed; never ship it to a public site. For a key
> that stays secret, put a small server/proxy in front of the API calls.

---

## ✦ AI Mode (Google Gemini) — added

On launch you now pick **AI Mode** or **Classic** on a setup screen.

- **Classic** — the original multiple-choice game, unchanged, fully offline.
- **AI Mode** — Google Gemini (`gemini-2.5-flash`) writes an open-ended interview
  question each turn, you **type** your answer, and Gemini grades it
  (correct / partial / wrong) and talks back in-character as the dragon. You also
  get a short Gemini performance review on the end screen.

Paste a free key from **aistudio.google.com → "Get API key"** on the setup screen
(stored only in your browser's localStorage). If there's no key, the network
fails, or a request times out, the game automatically falls back to the built-in
question bank for that round — so the battle never breaks during a demo.

### How it's wired (kept minimal on purpose)

All of the AI logic lives in **`js/gemini.js`** (loaded right before `battle.js`).
The only change to the game itself is that `askQuestion()` in `js/battle.js` now
branches: in AI Mode it calls `askQuestionAI()` (generate → free-text → grade),
otherwise it calls `askQuestionMC()` (the original multiple-choice code, untouched).
Both return the same `Promise<boolean>`, so the entire battle loop, the special
meter, and **every animation/effect are unchanged**.

Edit the prompts (question style, grading strictness, dragon voice) in
`js/gemini.js`; switch models via `GEMINI.model` there.

> Note: the live Gemini calls need the page served as a real file/URL — they won't
> fire inside an embedded preview sandbox. Run `python3 -m http.server 8000` from
> this folder, or open `index.html` directly. Classic Mode works anywhere.

> The key is client-side (fine for a demo, visible in devtools). To make it airtight
> for judging, move the two `fetch` calls in `js/gemini.js` behind a small serverless
> proxy that holds the key server-side.
