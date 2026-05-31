/* CODE DRAGON — Gemini API calls
   All prompts live here: question generation, answer grading, and the end-of-game review.
   Reword the prompts to change how the dragon asks and grades. */

/* =========================================================
   GEMINI CALLS
========================================================= */
async function callGemini(promptText, schema){
  const ctrl = new AbortController();
  const t = setTimeout(()=>ctrl.abort(), GEMINI.timeoutMs);
  try{
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({ prompt: promptText, schema })
    });
    clearTimeout(t);
    if(!res.ok){
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body}`);
    }
    const data = await res.json();
    const txt = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!txt) throw new Error("empty response");
    return JSON.parse(txt);
  }catch(e){ clearTimeout(t); throw e; }
}

async function aiGenerateQuestion(classKey, difficulty){
  const topic = HERO_DATA[classKey].topic;
  const prompt =
    `You are a tech interviewer. Generate ONE concise interview question about ${topic}. ` +
    `Difficulty (1 easy – 5 hard): ${difficulty}. ` +
    `It must be answerable in 1–3 sentences. Do not include the answer. Avoid repeating common textbook phrasings.`;
  const schema = { type:"object", properties:{ question:{type:"string"} }, required:["question"] };
  const out = await callGemini(prompt, schema);
  return out.question;
}

async function aiGradeAnswer(classKey, question, answer){
  const topic = HERO_DATA[classKey].topic;
  const prompt =
    `You are a strict but fair ${classKey} interviewer grading a candidate on ${topic}.\n` +
    `QUESTION: ${question}\nCANDIDATE ANSWER: ${answer || "(left blank)"}\n` +
    `Grade it. "correct" = solid & accurate; "partial" = right idea but incomplete/vague; "wrong" = incorrect or empty. ` +
    `damageMultiplier: 1.0 for correct, 0.5 for partial, 0 for wrong. ` +
    `quip: a short, theatrical taunt from a fire dragon reacting to the answer (max 14 words).`;
  const schema = { type:"object", properties:{
      verdict:{type:"string", enum:["correct","partial","wrong"]},
      damageMultiplier:{type:"number"},
      quip:{type:"string"}
    }, required:["verdict","damageMultiplier","quip"] };
  return await callGemini(prompt, schema);
}

async function aiPerformanceReview(classKey){
  const lines = state.history.map(h=>`Q: ${h.q} -> ${h.verdict}`).join("\n");
  const prompt =
    `A candidate just finished a mock ${HERO_DATA[classKey].role} interview (boss-fight game).\n${lines}\n` +
    `Write a 2-sentence performance review: what they did well and the single topic to study next. Encouraging, plain English.`;
  const schema = { type:"object", properties:{ review:{type:"string"} }, required:["review"] };
  const out = await callGemini(prompt, schema);
  return out.review;
}
