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
const RESUME_CTX = { resume:"", jd:"", imageBase64:"", imageMime:"" }; // résumé text or image + optional JD
const LS_KEY = "codeDragonGeminiKey";
const LS_JD = "codeDragonJD";

const gid = id => document.getElementById(id);

/* topic each class is quizzed on */
const GEMINI_TOPIC = {
  mage:    "front-end web development (HTML, CSS, JavaScript, the DOM, React, accessibility, performance)",
  fighter: "back-end engineering (HTTP, REST APIs, databases, SQL, caching, concurrency, system design)",
  thief:   "cybersecurity (web vulnerabilities, cryptography basics, authentication, network security, threat modeling)",
};

/* ---------- low-level call ---------- */
async function geminiCall(promptText, schema, extraParts){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), GEMINI.timeoutMs);
  const useServer = (typeof BACKEND !== "undefined" && BACKEND.gemini);
  const parts = [];
  if(extraParts && extraParts.length) parts.push(...extraParts);
  parts.push({ text: promptText });
  const payload = {
    contents:[{ role:"user", parts }],
    generationConfig:{ responseMimeType:"application/json", responseSchema: schema, temperature: 0.9 },
  };
  try{
    let res;
    if(useServer){
      // keys live server-side (e.g. Vercel env) — proxy through /api/gemini
      res = await fetch("/api/gemini", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({ model: GEMINI.model, payload }),
      });
    } else {
      const apiKey = GEMINI.key || geminiLocalKey();   // local config key as a safety net
      res = await fetch(GEMINI.endpoint(GEMINI.model), {
        method:"POST",
        headers:{ "Content-Type":"application/json", "x-goog-api-key": apiKey },
        signal: ctrl.signal,
        body: JSON.stringify(payload),
      });
    }
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

/* AI features are usable when the user is in an AI/Résumé mode AND we have a
   way to reach Gemini — either a client key or the server proxy. */
function aiAvailable(){
  return (typeof AI_MODE !== "undefined" && AI_MODE) &&
         (!!GEMINI.key || (typeof BACKEND !== "undefined" && BACKEND.gemini));
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
  // If the user uploaded a résumé image, pass it as a vision part so Gemini can read it directly
  const imgParts = (RESUME_MODE && RESUME_CTX.imageBase64)
    ? [{ inlineData:{ mimeType: RESUME_CTX.imageMime, data: RESUME_CTX.imageBase64 } }]
    : [];
  const out = await geminiCall(prompt, schema, imgParts);
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
  if(rw) rw.style.display = RESUME_MODE ? "block" : "none";

  const serverKey = (typeof BACKEND !== "undefined" && BACKEND.gemini);
  const localKey  = !!geminiLocalKey();
  if(kw){
    const krow = kw.querySelector(".keyrow");
    const st = gid("keyStatus");
    if(!AI_MODE){
      kw.style.display = "none";
    } else if(serverKey){
      // key held server-side (e.g. Vercel env): show the box as a confirmation, hide the input row
      kw.style.display = "block";
      if(krow) krow.style.display = "none";
      if(st){ st.textContent = "✓ Gemini key loaded from the server — nothing to paste."; st.className = "ok"; }
    } else if(localKey){
      // key from config.local.js: nothing to type
      kw.style.display = "none";
    } else {
      // no key available yet — show manual entry, plus a diagnostic about the server proxy
      kw.style.display = "block";
      if(krow) krow.style.display = "";
      if(st){
        if(typeof BACKEND === "undefined" || !BACKEND.checked){
          st.textContent = "Checking the server for a key…"; st.className = "";
        } else if(!BACKEND.reached){
          st.textContent = "No server proxy found (" + (BACKEND.error||"unreachable") + "). Paste a key below, or deploy the /api functions and reload.";
          st.className = "bad";
        } else if(!BACKEND.gemini){
          st.textContent = "Server reached but GEMINI_API_KEY isn't visible to it — add it (Production) and REDEPLOY, or paste a key below.";
          st.className = "bad";
        } else {
          st.textContent = ""; st.className = "";
        }
      }
    }
  }
}

/* Called once backend detection finishes: drop the "paste a key" hint when the
   server has the key, and re-apply the current mode so the field state + any
   diagnostic message reflect what the server reported. */
function geminiApplyBackend(){
  if(typeof BACKEND === "undefined") return;
  const hint = gid("keyHint"); if(hint) hint.style.display = BACKEND.gemini ? "none" : "";
  if(AI_MODE) geminiSetMode(RESUME_MODE ? "resume" : "ai");
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

  // résumé file upload wiring
  const rin = gid("resumeInput"), jin = gid("jdInput");
  const dropZone = gid("resumeDropZone"), dropLabel = gid("resumeDropLabel");
  const fileChosen = gid("resumeFileChosen"), browseBtn = gid("resumeBrowse");

  // restore saved JD text
  try {
    const sj = localStorage.getItem(LS_JD) || "";
    if(jin && sj){ jin.value = sj; RESUME_CTX.jd = sj; }
  } catch(e){}
  if(jin) jin.addEventListener("input", ()=>{ RESUME_CTX.jd=(jin.value||"").trim(); try{localStorage.setItem(LS_JD, RESUME_CTX.jd);}catch(e){} });

  // clicking the "browse" link or the drop zone opens the file picker
  if(browseBtn) browseBtn.addEventListener("click", (e)=>{ e.stopPropagation(); rin && rin.click(); });
  if(dropZone) dropZone.addEventListener("click", ()=>{ rin && rin.click(); });

  // drag-and-drop
  if(dropZone){
    dropZone.addEventListener("dragover", e=>{ e.preventDefault(); dropZone.classList.add("dragover"); });
    dropZone.addEventListener("dragleave", ()=>dropZone.classList.remove("dragover"));
    dropZone.addEventListener("drop", e=>{
      e.preventDefault(); dropZone.classList.remove("dragover");
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if(file) handleResumeFile(file);
    });
  }

  if(rin) rin.addEventListener("change", ()=>{
    const file = rin.files && rin.files[0];
    if(file) handleResumeFile(file);
  });

  async function handleResumeFile(file){
    const st = gid("resumeStatus");
    if(st){ st.textContent = "Reading file…"; st.className = ""; }
    if(dropLabel) dropLabel.style.display = "none";
    if(fileChosen){ fileChosen.style.display = ""; fileChosen.textContent = "📄 " + file.name; }

    try {
      if(file.type === "application/pdf"){
        // Extract text using PDF.js
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let text = "";
        for(let i = 1; i <= pdf.numPages; i++){
          const page = await pdf.getPage(i);
          const tc = await page.getTextContent();
          text += tc.items.map(s=>s.str).join(" ") + "
";
        }
        RESUME_CTX.resume = text.trim();
        RESUME_CTX.imageBase64 = "";
        RESUME_CTX.imageMime = "";
        if(st){ st.textContent = "✓ PDF read (" + pdf.numPages + " page" + (pdf.numPages>1?"s":"") + ")."; st.className = "ok"; }
      } else if(file.type.startsWith("image/")){
        // Store as base64 — Gemini vision will read it directly
        const b64 = await new Promise((res, rej)=>{
          const r = new FileReader();
          r.onload = ()=> res(r.result.split(",")[1]);
          r.onerror = rej;
          r.readAsDataURL(file);
        });
        RESUME_CTX.imageBase64 = b64;
        RESUME_CTX.imageMime = file.type;
        RESUME_CTX.resume = "[image résumé uploaded — Gemini will read it directly]";
        if(st){ st.textContent = "✓ Image loaded — Gemini will read it."; st.className = "ok"; }
      } else {
        if(st){ st.textContent = "Unsupported file type. Please upload a PDF or image."; st.className = "bad"; }
        resetResumeFile();
        return;
      }
    } catch(err){
      if(st){ st.textContent = "Could not read file: " + (err.message || err); st.className = "bad"; }
      resetResumeFile();
    }
  }

  function resetResumeFile(){
    RESUME_CTX.resume = ""; RESUME_CTX.imageBase64 = ""; RESUME_CTX.imageMime = "";
    if(dropLabel) dropLabel.style.display = "";
    if(fileChosen){ fileChosen.style.display = "none"; fileChosen.textContent = ""; }
  }

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
      const serverKey = (typeof BACKEND !== "undefined" && BACKEND.gemini);
      const local = geminiLocalKey();
      if(serverKey){
        // key is held server-side (Vercel env) — nothing to read or store
      } else if(local){
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
      const ji = gid("jdInput");
      RESUME_CTX.jd = ji ? (ji.value || "").trim() : "";
      try { localStorage.setItem(LS_JD, RESUME_CTX.jd); } catch(e){}
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
