/* CODE DRAGON — config & shared state
   Tweak the Gemini model, request timeout, and global game state here. */

/* =========================================================
   CONFIG
========================================================= */
const GEMINI = {
  model: "gemini-2.5-flash",
  endpoint: (m) => `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent`,
  timeoutMs: 12000,
};
const LS_KEY = "codeDragonGeminiKey";

let state = {
  mode: "classic",        // "ai" | "classic"
  apiKey: "",
  classKey: null,
  heroHp: 100, dragonHp: 100,
  round: 0, correct: 0, wrong: 0,
  history: [],            // {q, verdict} for the end review
  muted: false,
  busy: false,
};

const $ = (id) => document.getElementById(id);
function show(sec){ document.querySelectorAll('section').forEach(s=>s.classList.remove('active')); $(sec).classList.add('active'); }

/* try/return-safe localStorage (works as a local file; harmless if blocked) */
function lsGet(k){ try { return localStorage.getItem(k) || ""; } catch { return ""; } }
function lsSet(k,v){ try { localStorage.setItem(k,v); } catch {} }
