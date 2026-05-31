# CODE DRAGON — Interview of Fire (Gemini Edition)

A turn-based RPG where you fight a dragon by answering tech-interview questions.
Pick a class (Mage = front-end, Fighter = back-end, Thief = security) and answer to
deal damage. In **AI Mode**, Google Gemini writes the questions, grades what you
type, and talks back. In **Classic Mode** it runs offline on a fixed question bank.

## Running it

No build step, no npm. Either:

- **Double-click `index.html`** to open it in your browser, **or**
- Serve the folder (recommended, avoids any file:// quirks):
  ```bash
  cd code-dragon
  python3 -m http.server 8000   # then open http://localhost:8000
  ```

For **AI Mode**, paste a Gemini API key on the setup screen
(get one free at https://aistudio.google.com → "Get API key").
The key is stored only in your browser's localStorage.

> Note: the live Gemini calls need the page served as a real file/URL — they will
> not fire inside an embedded preview sandbox. Classic Mode works anywhere.

## File structure

```
code-dragon/
├── index.html          Page markup + screens. Loads the CSS and JS files.
├── css/
│   └── styles.css       All styling (colors, layout, the retro look).
└── js/                  Plain scripts, loaded in order — order matters.
    ├── config.js        Gemini model name, request timeout, global game state.
    ├── sprites.js       Pixel-art palette + sprite maps + the canvas draw helper.
    ├── data.js          ⭐ Classes and the question bank — edit this most.
    ├── gemini.js        ⭐ All Gemini prompts (question / grading / review).
    ├── audio.js         Sound-effect beeps.
    ├── render.js        Canvas animation loop + HP bars.
    ├── game.js          Battle turn loop, damage math, start/end logic.
    └── ui.js            Class-select cards, setup wiring, buttons, init.
```

The JS files are plain global scripts (no modules/imports), so **load order in
`index.html` matters**: each file relies on the ones loaded above it.

## Where to change common things

| You want to…                              | Edit…                                            |
|-------------------------------------------|--------------------------------------------------|
| Add / reword multiple-choice questions    | `js/data.js` → `BANK`                            |
| Change what a class is quizzed on         | `js/data.js` → `HERO_DATA[...].topic`            |
| Reword how Gemini asks or grades          | `js/gemini.js` (the prompt strings)              |
| Switch Gemini model                       | `js/config.js` → `GEMINI.model`                  |
| Rebalance difficulty / damage             | `js/game.js` → `BASE_HERO_DMG`, `DRAGON_DMG`     |
| Recolor or restyle anything               | `css/styles.css` (the `:root` variables up top)  |
| Tweak a sprite                            | `js/sprites.js` → `SPRITES` (rows of characters) |

## Optional next step: hide the API key

The key currently lives client-side (fine for a demo, visible in devtools).
To make it airtight for judging, put a tiny serverless proxy in front of the two
`fetch` calls in `js/gemini.js` so the key stays server-side. Ask and it can be
added.
