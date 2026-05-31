"use strict";
/* ============================================================
   CODE DRAGON — ElevenLabs character voices
   Gives the heroes and the Bug Dragon SPOKEN lines: on hover (class
   select), when they ATTACK, and when they TAKE DAMAGE.

   ────────────────────────────────────────────────────────────────
   HOW TO CHANGE VOICES  (read me!)
   ────────────────────────────────────────────────────────────────
   Each character below has a `voiceId`. To change how a character sounds,
   swap that string for any voice ID from your ElevenLabs account. Two ways
   to find IDs:

     1) Dashboard: elevenlabs.io → "Voices". Open a voice, and from its
        ••• menu choose "Copy voice ID". Paste it into `voiceId` below.

     2) From this game: open the browser console (F12) AFTER you've saved
        your key on the setup screen, and run:   listVoices()
        It prints every voice you have as `<voiceId> — <name>`. Copy one in.

   You can also reword what each character SAYS (the `lines`), and fine-tune
   delivery with `settings` (stability / similarity_boost / style, each 0–1).

   NOTE: the default IDs below are ElevenLabs' classic preset voices. Per
   their docs these presets are slated to retire at the end of 2026 and may
   not exist on newer accounts — if a character is silent, run listVoices()
   and paste in one of YOUR ids. Voices are optional: with no key set, the
   game simply stays quiet and plays exactly as before.
   ──────────────────────────────────────────────────────────────── */

const ELEVEN = {
  base:  "https://api.elevenlabs.io/v1/text-to-speech/",
  list:  "https://api.elevenlabs.io/v1/voices",
  model: "eleven_flash_v2_5",          // low-latency model, good for short game lines
  lsKey: "codeDragonElevenKey",
};

/* Per character: a voiceId, optional voice_settings, and lines per event.
   Events: hover | attack | hurt. One line is picked at random each time. */
const VOICES = {
  mage: {
    voiceId: "21m00Tcm4TlvDq8ikWAM",                 // default preset "Rachel"
    settings: { stability: 0.40, similarity_boost: 0.75, style: 0.35 },
    lines: {
      hover:  ["I weave the interface from light itself.",
               "The front end bends to my will, adventurer."],
      attack: ["Behold — a flawless render!",
               "Reflow, repaint, destroy!"],
      hurt:   ["My layout… shattered!",
               "Ugh — my styles are bleeding!"],
    },
  },
  fighter: {
    voiceId: "pNInz6obpgDQGcFmaJgB",                 // default preset "Adam"
    settings: { stability: 0.55, similarity_boost: 0.80, style: 0.25 },
    lines: {
      hover:  ["I hold the line at the server gate.",
               "Throw your traffic at me. I will not fall."],
      attack: ["Two hundred — and one CREATED!",
               "Your request is handled, beast!"],
      hurt:   ["Five hundred… internal error!",
               "Argh — the server's going down!"],
    },
  },
  thief: {
    voiceId: "ErXwobaYiN019PkySvjV",                 // default preset "Antoni"
    settings: { stability: 0.45, similarity_boost: 0.75, style: 0.40 },
    lines: {
      hover:  ["Every defense has a crack. I find them.",
               "You never saw me slip in."],
      attack: ["Exploit confirmed. Patch THIS.",
               "Straight through your firewall."],
      hurt:   ["My cover's blown!",
               "Tch — caught in the act!"],
    },
  },
  dragon: {
    voiceId: "VR6AewLTigWG4xSOukaG",                 // default preset "Arnold"
    settings: { stability: 0.35, similarity_boost: 0.85, style: 0.55 },
    lines: {
      hover:  ["I guard the offer letter, little applicant.",
               "Come closer. Let me hear you stammer."],
      attack: ["Burn in my interview fire!",
               "Rejected — with extreme prejudice!"],
      hurt:   ["Impossible… a correct answer?!",
               "Grrr — you actually studied."],
    },
  },
};

/* ---------- key storage ----------
   A key in the git-ignored config.local.js (window.LOCAL_KEYS.eleven) wins;
   otherwise fall back to a key typed/saved on the setup screen. */
function _localElevenKey(){ return (typeof window!=="undefined" && window.LOCAL_KEYS && window.LOCAL_KEYS.eleven) ? String(window.LOCAL_KEYS.eleven).trim() : ""; }
function getElevenKey(){ const l=_localElevenKey(); if(l) return l; try { return localStorage.getItem(ELEVEN.lsKey) || ""; } catch(e){ return ""; } }
function setElevenKey(k){ try { localStorage.setItem(ELEVEN.lsKey, k || ""); } catch(e){} }

/* voices are silent when there's no key, or when sound is muted */
function _voiceOff(){ return !getElevenKey() || (typeof Sfx!=="undefined" && Sfx.isMuted && Sfx.isMuted()); }

/* ---------- clip cache (each unique line fetched once, then replayed free) ---------- */
const _clipCache = new Map();                        // "voiceId|text" -> blob URL

async function _getClip(voiceId, text, settings){
  const cacheKey = voiceId + "|" + text;
  if(_clipCache.has(cacheKey)) return _clipCache.get(cacheKey);
  const res = await fetch(ELEVEN.base + voiceId, {
    method: "POST",
    headers: {
      "xi-api-key": getElevenKey(),
      "Content-Type": "application/json",
      "Accept": "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: ELEVEN.model,
      voice_settings: settings || { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if(!res.ok) throw new Error("ElevenLabs HTTP " + res.status);
  const url = URL.createObjectURL(await res.blob());
  _clipCache.set(cacheKey, url);
  return url;
}

/* ---------- playback: one channel + a small queue so lines don't overlap ---------- */
let _current = null;     // currently playing Audio
let _queue   = [];       // pending {charKey,event} for sequential battle banter
let _draining = false;

function stopVoice(){
  _queue = [];
  if(_current){ try{ _current.pause(); }catch(e){} _current = null; }
}

function _pickLine(charKey, event){
  const cfg = VOICES[charKey];
  if(!cfg) return null;
  const pool = cfg.lines[event];
  if(!pool || !pool.length) return null;
  return { text: pool[(Math.random()*pool.length)|0], cfg };
}

/* play one line; resolves when it finishes (or fails) so the queue can advance */
function _playOne(charKey, event){
  return new Promise(function(resolve){
    if(_voiceOff()) return resolve();
    const picked = _pickLine(charKey, event);
    if(!picked) return resolve();
    _getClip(picked.cfg.voiceId, picked.text, picked.cfg.settings).then(function(url){
      if(_voiceOff()) return resolve();              // muted while fetching
      const a = new Audio(url);
      a.volume = 0.9;
      _current = a;
      const done = function(){ if(_current===a) _current=null; resolve(); };
      a.addEventListener("ended", done);
      a.addEventListener("error", done);
      a.play().catch(done);
    }).catch(function(e){
      console.warn("[voices] line failed:", e && e.message);   // stay silent, keep going
      resolve();
    });
  });
}

function _drain(){
  if(_draining) return;
  _draining = true;
  (function step(){
    if(!_queue.length){ _draining=false; return; }
    const next = _queue.shift();
    _playOne(next.charKey, next.event).then(step);
  })();
}

/* Battle banter: lines play one after another (a strike, then a reaction). */
function enqueueSpeak(charKey, event){
  if(_voiceOff()) return;
  _queue.push({ charKey: charKey, event: event });
  _drain();
}

/* Immediate, interrupting line — used for hover so it feels responsive. */
function speakNow(charKey, event){
  if(_voiceOff()) return;
  stopVoice();
  _playOne(charKey, event);
}

/* Hover with a debounce so skimming across a card doesn't refire constantly. */
let _lastHover = { key:null, t:0 };
function speakHover(charKey){
  const now = Date.now();
  if(_lastHover.key===charKey && now-_lastHover.t < 1500) return;
  _lastHover = { key: charKey, t: now };
  speakNow(charKey, "hover");
}

/* ---------- helpers for the setup screen / console ---------- */

/* connectivity check: hit /v1/voices with the saved key */
async function testElevenKey(){
  const res = await fetch(ELEVEN.list, { headers: { "xi-api-key": getElevenKey() } });
  if(!res.ok) throw new Error("HTTP " + res.status);
  return true;
}

/* Run listVoices() in the console (after saving your key) to see your IDs. */
async function listVoices(){
  const res = await fetch(ELEVEN.list, { headers: { "xi-api-key": getElevenKey() } });
  if(!res.ok){ console.error("Couldn't list voices — HTTP " + res.status); return; }
  const data = await res.json();
  (data.voices || []).forEach(function(v){ console.log(v.voice_id, "—", v.name); });
  return data.voices;
}

/* ---------- setup-screen wiring (voice key field) ---------- */
function voicesInitSetup(){
  const wrap = document.getElementById("voiceWrap");
  const save = document.getElementById("voiceSave");
  const input = document.getElementById("voiceKey");
  const status = document.getElementById("voiceStatus");

  // a key from config.local.js means there's nothing to type — hide the field
  if(_localElevenKey()){
    if(wrap){
      wrap.innerHTML = '<div class="setup-note" style="margin-top:18px;">✓ <b>ElevenLabs</b> voice key loaded from config.local.js — heroes &amp; the dragon will speak.</div>';
    }
    return;
  }

  if(!save || !input) return;

  // preload a saved key
  const existing = getElevenKey();
  if(existing){
    input.value = existing;
    if(status){ status.textContent = "Saved voice key loaded — characters will speak."; status.className = "ok"; }
  }

  save.addEventListener("click", async function(){
    const k = (input.value || "").trim();
    if(!k){ setElevenKey(""); if(status){ status.textContent = "Voices off — no key set."; status.className = ""; } return; }
    setElevenKey(k);
    if(status){ status.textContent = "Testing voice key…"; status.className = ""; }
    try{
      await testElevenKey();
      if(status){ status.textContent = "✓ Voices connected — hover a class to hear it."; status.className = "ok"; }
    }catch(e){
      if(status){ status.textContent = "✗ Couldn't reach ElevenLabs (key, quota, or network). Game runs fine without voices."; status.className = "bad"; }
    }
  });
}
document.addEventListener("DOMContentLoaded", voicesInitSetup);
if(document.readyState !== "loading") voicesInitSetup();
