"use strict";
/* ============================================================
   GOOGLE GEMINI INTEGRATION
   Adds an "AI Mode" on top of the existing game:
     • open-ended interview questions generated per class
     • free-text answers graded by Gemini (correct / partial / wrong)
     • in-character dragon quips + an end-of-battle review
   Everything degrades gracefully to the built-in question bank if
   there's no key, the network fails, or a request times out — so the
   battle loop and all animations keep working untouched.
   ============================================================ */

const GEMINI = {
  model: "gemini-2.5-flash",
  endpoint(m){ return "https://generativelanguage.googleapis.com/v1beta/models/" + m + ":generateContent"; },
  timeoutMs: 12000,
  key: "",
};
let AI_MODE = false;
let RESUME_MODE = false;                 // a flavour of AI mode: questions built from the user's résumé
const RESUME_CTX = { resume:"", jd:"" }; // the pasted résumé + optional job description
const LS_KEY = "codeDragonGeminiKey";
const LS_RESUME = "codeDragonResume";
const LS_JD = "codeDragonJD";

const gid = id => document.getElementById(id);

/* topic each class is quizzed on */
const GEMINI_TOPIC = {
  mage:    "front-end web development (HTML, CSS, JavaScript, the DOM, React, accessibility, performance)",
  fighter: "back-end engineering (HTTP, REST APIs, databases, SQL, caching, concurrency, system design)",
  thief:   "cybersecurity (web vulnerabilities, cryptography basics, authentication, network security, threat modeling)",
};

/* ---------- low-level call ---------- */
async function geminiCall(promptText, schema){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), GEMINI.timeoutMs);
  const apiKey = GEMINI.key || geminiLocalKey();   // local config key as a safety net
  try{
    const res = await fetch(GEMINI.endpoint(GEMINI.model), {
      method:"POST",
      headers:{ "Content-Type":"application/json", "x-goog-api-key": apiKey },
      signal: ctrl.signal,
      body: JSON.stringify({
        contents:[{ role:"user", parts:[{ text: promptText }] }],
        generationConfig:{ responseMimeType:"application/json", responseSchema: schema, temperature: 0.9 },
      }),
    });
    clearTimeout(t);
    if(!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    const txt = data && data.candidates && data.candidates[0] &&
                data.candidates[0].content && data.candidates[0].content.parts &&
                data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text;
    if(!txt) throw new Error("empty response");
    return JSON.parse(txt);
  } catch(e){ clearTimeout(t); throw e; }
}

/* ---------- public helpers used by battle.js ---------- */
async function geminiGenerateQuestion(classKey, kind){
  const topic = GEMINI_TOPIC[classKey] || GEMINI_TOPIC.mage;
  let prompt;
  if(RESUME_MODE && RESUME_CTX.resume){
    // Personalized: build a real-world scenario out of the candidate's own work.
    // Topic is NOT tied to the chosen avatar — it's inferred from the résumé/JD.
    prompt =
      "You are a senior tech interviewer running a PERSONALIZED interview.\n" +
      "Base the question entirely on the candidate's own work below — infer their field and stack from it; " +
      "do NOT assume a fixed topic or domain.\n" +
      "Here is the candidate's RÉSUMÉ / project list:\n\"\"\"\n" + RESUME_CTX.resume.slice(0,4000) + "\n\"\"\"\n" +
      (RESUME_CTX.jd ? "Here is the TARGET JOB DESCRIPTION (bias toward these skills):\n\"\"\"\n" + RESUME_CTX.jd.slice(0,2000) + "\n\"\"\"\n" : "") +
      "Pick ONE specific project, technology, or responsibility from their résumé and turn it into a realistic, " +
      "ON-THE-JOB problem they could hit in real time — an incident, a scaling or performance issue, a nasty bug, " +
      "a design tradeoff, or a decision under pressure. Reference their actual work by name so it feels tailored to them, " +
      "and make them reason through it rather than recite a definition. Answerable in 2-4 sentences. " +
      "Do NOT include the answer. Return only the question.";
  } else {
    prompt =
      "You are a tech interviewer. Generate ONE concise interview question about " + topic + ". " +
      "It must be answerable in 1-3 sentences. Do NOT include the answer. " +
      "Avoid repeating common textbook phrasings; make it feel like a real interview.";
  }
  const schema = { type:"object", properties:{ question:{type:"string"} }, required:["question"] };
  const out = await geminiCall(prompt, schema);
  return out.question;
}

async function geminiGradeAnswer(classKey, question, answer){
  const topic = GEMINI_TOPIC[classKey] || GEMINI_TOPIC.mage;
  const resume = (RESUME_MODE && RESUME_CTX.resume);
  const head = resume
    ? "You are a strict but fair technical interviewer. This question was drawn from the candidate's own résumé, " +
      "so judge whether they reason like someone who actually did the work (infer the relevant field from the question).\n"
    : "You are a strict but fair interviewer grading a candidate on " + topic + ".\n";
  const prompt =
    head +
    "QUESTION: " + question + "\nCANDIDATE ANSWER: " + (answer || "(left blank)") + "\n" +
    "Grade it. \"correct\" = solid and accurate; \"partial\" = right idea but incomplete or vague; " +
    "\"wrong\" = incorrect or empty. " +
    "Also give \"quip\": a short, theatrical taunt from a fire-breathing dragon reacting to the answer (max 14 words).";
  const schema = { type:"object", properties:{
    verdict:{ type:"string", enum:["correct","partial","wrong"] },
    quip:{ type:"string" },
  }, required:["verdict","quip"] };
  return await geminiCall(prompt, schema);
}

async function geminiReview(classKey, stats){
  const topic = GEMINI_TOPIC[classKey] || GEMINI_TOPIC.mage;
  const subject = (RESUME_MODE && RESUME_CTX.resume)
    ? "their own résumé projects and real-world scenarios"
    : topic;
  const prompt =
    "A candidate just finished a mock interview (a boss-fight game) on " + subject + ". " +
    "They answered " + stats.correct + " well and missed " + stats.wrong + ". " +
    "Write a 2-sentence performance review: one thing they did well and the single topic to study next. " +
    "Encouraging, plain English.";
  const schema = { type:"object", properties:{ review:{type:"string"} }, required:["review"] };
  const out = await geminiCall(prompt, schema);
  return out.review;
}

/* ---------- setup screen wiring ---------- */
function geminiLocalKey(){
  return (typeof window!=="undefined" && window.LOCAL_KEYS && window.LOCAL_KEYS.gemini)
    ? String(window.LOCAL_KEYS.gemini).trim() : "";
}

function geminiSetMode(mode){
  // "ai" and "resume" both use Gemini free-text; only "resume" pulls in the résumé.
  AI_MODE = (mode === "ai" || mode === "resume");
  RESUME_MODE = (mode === "resume");
  const a = gid("optAI"), c = gid("optClassic"), r = gid("optResume");
  const kw = gid("keyWrap"), rw = gid("resumeWrap");
  if(a) a.classList.toggle("sel", mode === "ai");
  if(c) c.classList.toggle("sel", mode === "classic");
  if(r) r.classList.toggle("sel", mode === "resume");
  const hasLocal = !!geminiLocalKey();
  if(kw) kw.style.display = (AI_MODE && !hasLocal) ? "block" : "none";  // both AI flavours need a key
  if(rw) rw.style.display = RESUME_MODE ? "block" : "none";
}

function geminiLoadKey(){
  // 1) prefer a key supplied by the git-ignored local config file
  const local = geminiLocalKey();
  if(local){
    GEMINI.key = local;
    geminiSetMode("ai");
    const kw = gid("keyWrap"); if(kw) kw.style.display = "none";   // nothing to type
    const st = gid("keyStatus"); if(st){ st.textContent = "Gemini key loaded from config.local.js."; st.className = "ok"; }
    return;
  }
  // 2) otherwise fall back to a previously typed/saved key
  let k = "";
  try { k = localStorage.getItem(LS_KEY) || ""; } catch(e){}
  if(k){
    GEMINI.key = k;
    const inp = gid("keyInput"); if(inp) inp.value = k;
    geminiSetMode("ai");
    const st = gid("keyStatus"); if(st){ st.textContent = "Saved key loaded."; st.className = "ok"; }
  }
}

let _geminiSetupDone = false;
function geminiInitSetup(){
  if(_geminiSetupDone) return;
  _geminiSetupDone = true;
  const a = gid("optAI"), c = gid("optClassic"), r = gid("optResume");
  if(a){ a.addEventListener("click", ()=>geminiSetMode("ai"));
         a.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" ") geminiSetMode("ai"); }); }
  if(c){ c.addEventListener("click", ()=>geminiSetMode("classic"));
         c.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" ") geminiSetMode("classic"); }); }
  if(r){ r.addEventListener("click", ()=>geminiSetMode("resume"));
         r.addEventListener("keydown", e=>{ if(e.key==="Enter"||e.key===" ") geminiSetMode("resume"); }); }

  // résumé / job-description fields: restore saved text and keep RESUME_CTX in sync as the user types
  const rin = gid("resumeInput"), jin = gid("jdInput");
  try {
    const sr = localStorage.getItem(LS_RESUME) || "";
    const sj = localStorage.getItem(LS_JD) || "";
    if(rin && sr){ rin.value = sr; RESUME_CTX.resume = sr; }
    if(jin && sj){ jin.value = sj; RESUME_CTX.jd = sj; }
  } catch(e){}
  if(rin) rin.addEventListener("input", ()=>{ RESUME_CTX.resume=(rin.value||"").trim(); try{localStorage.setItem(LS_RESUME, RESUME_CTX.resume);}catch(e){} });
  if(jin) jin.addEventListener("input", ()=>{ RESUME_CTX.jd=(jin.value||"").trim(); try{localStorage.setItem(LS_JD, RESUME_CTX.jd);}catch(e){} });

  const test = gid("keyTest");
  if(test) test.addEventListener("click", async ()=>{
    const k = (gid("keyInput").value || "").trim();
    const st = gid("keyStatus");
    if(!k){ st.textContent = "Paste a key first."; st.className = "bad"; return; }
    GEMINI.key = k;
    try { localStorage.setItem(LS_KEY, k); } catch(e){}
    st.textContent = "Testing key…"; st.className = "";
    try {
      await geminiCall('Reply with JSON {"ok":true}.', { type:"object", properties:{ ok:{type:"boolean"} }, required:["ok"] });
      st.textContent = "✓ Key works — Gemini connected."; st.className = "ok";
    } catch(e){
      st.textContent = "✗ Couldn't reach Gemini (key, quota, or running inside a preview). The game will fall back to the offline bank.";
      st.className = "bad";
    }
  });

  const go = gid("toSelect");
  if(go) go.addEventListener("click", ()=>{
    if(AI_MODE){
      const local = geminiLocalKey();
      if(local){
        // key comes from config.local.js — keep it; do NOT read the (hidden) input box
        GEMINI.key = local;
      } else {
        GEMINI.key = (gid("keyInput").value || "").trim();
        try { localStorage.setItem(LS_KEY, GEMINI.key); } catch(e){}
        if(!GEMINI.key){
          const st = gid("keyStatus");
          st.textContent = "No key set — AI Mode will use the offline bank as fallback.";
          st.className = "bad";
        }
      }
    }
    if(RESUME_MODE){
      const ri = gid("resumeInput"), ji = gid("jdInput");
      RESUME_CTX.resume = ri ? (ri.value || "").trim() : "";
      RESUME_CTX.jd     = ji ? (ji.value || "").trim() : "";
      try { localStorage.setItem(LS_RESUME, RESUME_CTX.resume); localStorage.setItem(LS_JD, RESUME_CTX.jd); } catch(e){}
      if(!RESUME_CTX.resume){
        const st = gid("resumeStatus");
        if(st){ st.textContent = "No résumé pasted — you'll get general AI questions instead of personalized ones."; st.className = "bad"; }
      }
    }
    if(typeof refreshSelectScreenForMode==="function") refreshSelectScreenForMode();
    gid("setupScreen").style.display = "none";
    gid("selectScreen").style.display = "block";
  });

  geminiLoadKey();
}

document.addEventListener("DOMContentLoaded", geminiInitSetup);
/* DOM is already parsed when this script runs (scripts are at end of body),
   so also init immediately in case DOMContentLoaded already fired. */
if(document.readyState !== "loading") geminiInitSetup();
