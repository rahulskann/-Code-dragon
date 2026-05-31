/* CODE DRAGON — ElevenLabs character voices
   Gives the heroes and the dragon SPOKEN lines on hover, on attack, and when hurt.

   ──────────────────────────────────────────────────────────────────────────
   HOW TO CHANGE VOICES  (read me!)
   ──────────────────────────────────────────────────────────────────────────
   Each character below has a `voiceId`. To change how a character sounds, swap
   that string for any voice ID from your ElevenLabs account. Two ways to find IDs:

     1) Dashboard: elevenlabs.io → "Voices". Open a voice, copy its Voice ID
        (the ••• menu has "Copy voice ID"). Paste it into `voiceId` below.

     2) From this game: open the browser console (F12) AFTER you've saved your
        key on the setup screen, and run:   listVoices()
        It prints every voice you have, as `<voiceId> — <name>`. Copy one in.

   You can also reword what each character SAYS (the `lines`), and fine-tune the
   delivery with `settings` (stability / similarity_boost / style, each 0–1).

   NOTE: the default IDs below are ElevenLabs' classic preset voices. Per their
   docs these presets are slated to retire at the end of 2026 and may not exist
   on newer accounts — if a character is silent, run listVoices() and paste in
   one of YOUR ids. Voices are optional: with no key, the game just stays quiet.
   ────────────────────────────────────────────────────────────────────────── */

const ELEVEN = {
  base:  "https://api.elevenlabs.io/v1/text-to-speech/",
  list:  "https://api.elevenlabs.io/v1/voices",
  model: "eleven_flash_v2_5",          // low-latency model, good for short game lines
  lsKey: "codeDragonElevenKey",
};

/* Per character: a voiceId, optional voice_settings, and lines for each event.
   Events: hover | attack | hurt. One line is picked at random each time. */
const VOICES = {
  mage: {
    voiceId: "m3OZYhKGRczbC3OjDu5g",                 // default preset "Rachel"
    settings: { stability: 0.40, similarity_boost: 0.75, style: 0.35 },
    lines: {
      hover:  ["I did not come this far to be stopped by a dragon.",
               "My spells were forged in harder dungeons than this.",
               "The arcane bends to patience. I have plenty."],
      attack: ["The arcane does not miss.",
               "Stand aside. I have work to do.",
               "I cast once. It is enough."],
      hurt:   ["…Unexpected resistance.",
               "I felt that. I will not feel it again.",
               "Something in my logic is off. Give me a moment."],
    },
  },
  fighter: {
    voiceId: "awYfxnQdPQUXY9tdhnBr",                 // default preset "Adam"
    settings: { stability: 0.55, similarity_boost: 0.80, style: 0.25 },
    lines: {
      hover:  ["I have held worse gates than this one.",
               "Nothing gets through me. Nothing ever has.",
               "I was built for this chamber."],
      attack: ["Down. Stay down.",
               "The line holds.",
               "Processed. Moving on."],
      hurt:   ["You found a crack. There will not be another.",
               "Good hit. Last one.",
               "I have endured worse. Much worse."],
    },
  },
  thief: {
    voiceId: "wFxzQFrhIg6Hhofkf2lo",                 // default preset "Antoni"
    settings: { stability: 0.45, similarity_boost: 0.75, style: 0.40 },
    lines: {
      hover:  ["The dragon watches the door. Not the shadows.",
               "I was here before you noticed the door.",
               "Every fortress has a way in. I find it."],
      attack: ["You never saw me move.",
               "Gone before you knew I was there.",
               "That gap has been there the whole time."],
      hurt:   ["Hm. You were watching.",
               "I misjudged the room.",
               "Fair. I got comfortable."],
    },
  },
  dragon: {
    voiceId: "m8PWL7BK17oItpMiO40p",                 // default preset "Arnold"
    settings: { stability: 0.35, similarity_boost: 0.85, style: 0.55 },
    lines: {
      hover:  ["I have turned away a thousand before you. What makes you different?",
               "The offer letter has not moved from my hoard in centuries.",
               "Leave now and I will pretend this never happened."],
      attack: ["You are not the first to try. You will not be the last to fail.",
               "My fire has reduced better adventurers to ash.",
               "The offer letter is not a prize. It is a test. And you are failing."],
      hurt:   ["…You have trained well, little one.",
               "Impossible. No one reaches this chamber prepared.",
               "I almost pity you. Almost."],
    },
  },
};

/* ── key storage ─────────────────────────────────────────────────────────── */
function getElevenKey(){ return lsGet(ELEVEN.lsKey); }
function setElevenKey(k){ lsSet(ELEVEN.lsKey, k || ""); }

/* ── clip cache (each unique line is fetched once, then replayed for free) ── */
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

/* ── playback: one channel, with a small queue so battle lines don't overlap ─ */
let _current = null;     // currently playing Audio
let _queue   = [];       // pending {charKey,event} for sequential battle banter
let _draining = false;

function stopVoice(){
  _queue = [];
  if(_current){ try{ _current.pause(); }catch{} _current = null; }
}

function _pickLine(charKey, event){
  const cfg = VOICES[charKey];
  if(!cfg) return null;
  const pool = cfg.lines[event];
  if(!pool || !pool.length) return null;
  return { text: pool[Math.floor(Math.random() * pool.length)], cfg };
}

/* play a single line; resolves when it finishes (or fails) so the queue advances */
function _playOne(charKey, event){
  return new Promise(async (resolve) => {
    if(state.muted || !getElevenKey()){ return resolve(); }
    const picked = _pickLine(charKey, event);
    if(!picked){ return resolve(); }
    try{
      const url = await _getClip(picked.cfg.voiceId, picked.text, picked.cfg.settings);
      if(state.muted){ return resolve(); }            // muted while fetching
      const a = new Audio(url);
      a.volume = 0.9;
      _current = a;
      const done = () => { if(_current === a) _current = null; resolve(); };
      a.addEventListener("ended", done);
      a.addEventListener("error", done);
      await a.play();
    }catch(e){
      console.warn("[voices] line failed:", e.message);   // stay silent, keep playing
      resolve();
    }
  });
}

async function _drain(){
  if(_draining) return;
  _draining = true;
  while(_queue.length){
    const next = _queue.shift();
    await _playOne(next.charKey, next.event);
  }
  _draining = false;
}

/* Battle banter: lines play one after another (a hit, then a reaction). */
function enqueueSpeak(charKey, event){
  if(state.muted || !getElevenKey()) return;
  _queue.push({ charKey, event });
  _drain();
}

/* Immediate, interrupting line — used for hover so it feels responsive. */
function speakNow(charKey, event){
  if(state.muted || !getElevenKey()) return;
  stopVoice();
  _playOne(charKey, event);
}

/* Hover with a debounce so skimming across a card doesn't refire constantly. */
let _lastHover = { key: null, t: 0 };
function speakHover(charKey){
  const now = Date.now();
  if(_lastHover.key === charKey && now - _lastHover.t < 1500) return;
  _lastHover = { key: charKey, t: now };
  speakNow(charKey, "hover");
}

/* ── helpers for the setup screen / console ─────────────────────────────── */

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
  (data.voices || []).forEach(v => console.log(v.voice_id, "—", v.name));
  return data.voices;
}
