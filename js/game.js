/* CODE DRAGON — battle logic
   The turn loop, answer handling (free-text + multiple choice), damage math, start & end.
   Balance knobs: BASE_HERO_DMG and DRAGON_DMG at the top of this file. */

/* =========================================================
   BATTLE LOOP
========================================================= */
const BASE_HERO_DMG = 22;   // damage to dragon on correct
const DRAGON_DMG     = 18;  // damage to hero on wrong

async function nextRound(){
  if(state.heroHp<=0 || state.dragonHp<=0){ return endGame(); }
  state.round++;
  state.busy = true;
  const classKey = state.classKey;
  const difficulty = Math.min(5, 1 + Math.floor(state.round/2)); // ramps up

  $('turnFlag').textContent = "⚔ YOUR STRIKE — answer to wound the dragon";
  $('turnFlag').classList.remove('def');
  $('verdict').innerHTML = "";

  // ---- get the question ----
  let question, bankItem=null;
  if(state.mode==="ai"){
    $('answerArea').innerHTML = "";
    $('questionText').innerHTML = `<span class="thinking">The dragon conjures a question<span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`;
    try{
      question = await aiGenerateQuestion(classKey, difficulty);
    }catch(e){
      // graceful fallback to bank
      bankItem = pickBank(classKey);
      question = bankItem.q;
    }
  }else{
    bankItem = pickBank(classKey);
    question = bankItem.q;
  }

  $('questionText').textContent = question;
  renderAnswerArea(classKey, question, bankItem);
  state.busy = false;
}

let bankPool = {};
function pickBank(classKey){
  if(!bankPool[classKey] || bankPool[classKey].length===0){
    bankPool[classKey] = [...BANK[classKey]].sort(()=>Math.random()-0.5);
  }
  return bankPool[classKey].pop();
}

function renderAnswerArea(classKey, question, bankItem){
  const area = $('answerArea');
  area.className = "";
  // Free-text only when in AI mode AND we actually have a generated (non-bank) question
  if(state.mode==="ai" && !bankItem){
    area.innerHTML = `
      <div class="freeform">
        <textarea id="answerInput" placeholder="Type your answer like you're in the interview…"></textarea>
        <div class="ff-row">
          <span class="hint">Gemini grades what you write. Partial credit deals half damage.</span>
          <button class="btn" id="submitAns">ATTACK ▶</button>
        </div>
      </div>`;
    $('answerInput').focus();
    $('submitAns').addEventListener('click', submitFreeform);
    $('answerInput').addEventListener('keydown',(e)=>{ if(e.key==="Enter" && (e.ctrlKey||e.metaKey)) submitFreeform(); });
  }else{
    // multiple choice (classic, or AI-fallback)
    const keys=["A","B","C","D"];
    area.className="answers";
    area.innerHTML = "";
    bankItem.a.forEach((opt,i)=>{
      const el=document.createElement('div'); el.className="ans"; el.tabIndex=0;
      el.innerHTML = `<span class="key">${keys[i]}</span><span>${opt}</span>`;
      const choose=()=>resolveMC(el, i, bankItem);
      el.addEventListener('click',choose);
      el.addEventListener('keydown',e=>{if(e.key==="Enter"||e.key===" ")choose();});
      area.appendChild(el);
    });
  }
}

async function submitFreeform(){
  if(state.busy) return;
  state.busy=true;
  const answer = $('answerInput').value.trim();
  const question = $('questionText').textContent;
  const btn=$('submitAns'); if(btn){btn.disabled=true; btn.textContent="GRADING…";}
  $('answerInput').disabled = true;
  $('verdict').innerHTML = `<span class="thinking">The dragon weighs your words<span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`;

  let result;
  try{
    result = await aiGradeAnswer(state.classKey, question, answer);
  }catch(e){
    // fallback: blank=wrong, any text=partial
    result = answer ? {verdict:"partial",damageMultiplier:0.5,quip:"The grading flame flickered… half-credit."}
                    : {verdict:"wrong",damageMultiplier:0,quip:"Silence? The dragon laughs."};
  }
  applyResult(result.verdict, result.damageMultiplier, result.quip, question);
}

function resolveMC(el, idx, bankItem){
  if(state.busy) return;
  state.busy=true;
  document.querySelectorAll('.ans').forEach(a=>a.classList.add('disabled'));
  const correct = idx===bankItem.c;
  el.classList.add(correct?"correct":"wrong");
  if(!correct){
    const right = document.querySelectorAll('.ans')[bankItem.c];
    if(right) right.classList.add("correct");
  }
  const quip = correct ? "A clean hit! The dragon recoils." : "Wrong — taste dragonfire!";
  applyResult(correct?"correct":"wrong", correct?1:0, quip, bankItem.q);
}

function applyResult(verdict, mult, quip, question){
  state.history.push({q:question, verdict});
  const v=$('verdict');
  if(verdict==="correct"){ state.correct++; }
  else if(verdict==="partial"){ state.correct++; }
  else { state.wrong++; }

  // damage logic: hero strikes for mult * base; if not full, dragon counterstrikes
  const dmgToDragon = Math.round(BASE_HERO_DMG * mult);
  if(dmgToDragon>0){ heroAttackAnim(); sfx.hitDragon(); }
  state.dragonHp -= dmgToDragon;

  let counter = 0;
  if(mult < 1){
    counter = Math.round(DRAGON_DMG * (1 - mult));
    setTimeout(()=>{ dragonAttackAnim(); sfx.hitHero(); }, 260);
    state.heroHp -= counter;
  }

  updateBars();
  v.innerHTML = `<span class="v ${verdict}">${verdict.toUpperCase()}</span>` +
                (dmgToDragon? ` · −${dmgToDragon} to dragon`:``) +
                (counter? ` · −${counter} to you`:``) +
                `<span class="quip">🐉 “${quip}”</span>`;

  state.busy=false;
  setTimeout(()=>{
    if(state.heroHp<=0 || state.dragonHp<=0) endGame();
    else {
      const cont=document.createElement('button');
      cont.className="btn"; cont.textContent="NEXT TURN ▶";
      cont.style.marginTop="12px";
      cont.addEventListener('click',()=>nextRound());
      v.appendChild(document.createElement('br'));
      v.appendChild(cont);
      cont.focus();
    }
  }, 700);
}


/* =========================================================
   START / END
========================================================= */
function startBattle(classKey){
  state.classKey = classKey;
  state.heroHp=100; state.dragonHp=100; state.round=0; state.correct=0; state.wrong=0;
  state.history=[]; bankPool={};
  const d=HERO_DATA[classKey];
  $('heroName').textContent = d.name+" · "+d.role;
  $('heroName').style.color = d.color;
  show('battleScreen');
  updateBars();
  nextRound();
}

async function endGame(){
  const win = state.dragonHp<=0 && state.heroHp>0;
  show('endScreen');
  const tEl=$('endTitle');
  tEl.className = win?"win":"lose";
  tEl.textContent = win?"VICTORY!":"DEFEATED";
  $('endSub').textContent = win
    ? "The dragon yields the offer letter."
    : "The dragon guards the gate another day.";
  const total = state.correct+state.wrong;
  $('endStats').innerHTML =
    `Class: <b>${HERO_DATA[state.classKey].role}</b><br>`+
    `Rounds: <b>${state.round}</b> · Correct/Partial: <b>${state.correct}</b> · Missed: <b>${state.wrong}</b>`;

  const rev=$('endReview');
  if(state.mode==="ai"){
    rev.style.display="block";
    rev.innerHTML = `<span class="thinking">The dragon writes your review<span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`;
    try{
      const r = await aiPerformanceReview(state.classKey);
      rev.textContent = "🐉 " + r;
    }catch(e){
      rev.textContent = total
        ? `You answered ${state.correct} of ${total} well. Review the topics you missed and run it back.`
        : "Review the fundamentals and try again.";
    }
  }else{
    rev.style.display = total? "block":"none";
    rev.textContent = `You answered ${state.correct} of ${total} correctly. Switch to AI Mode for open-ended interview practice.`;
  }
  win?sfx.win():sfx.lose();
}
