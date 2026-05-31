/* CODE DRAGON — config & shared state
   Tweak the Gemini model, request timeout, and global game state here. */

/* =========================================================
   CONFIG
========================================================= */
const GEMINI = {
  model: "gemini-2.5-flash",
  timeoutMs: 12000,
};

let state = {
  mode: "classic",        // "ai" | "classic"
  classKey: null,
  heroHp: 100, dragonHp: 100,
  round: 0, correct: 0, wrong: 0,
  history: [],            // {q, verdict} for the end review
  muted: false,
  busy: false,
};

const $ = (id) => document.getElementById(id);
function lsGet(key){ return localStorage.getItem(key); }
function lsSet(key, value){ if(value===null || value===undefined){ localStorage.removeItem(key); } else { localStorage.setItem(key, String(value)); } }
function show(sec){ document.querySelectorAll('section').forEach(s=>s.classList.remove('active')); $(sec).classList.add('active'); }
