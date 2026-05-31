"use strict";
/* ============================================================
   BATTLE LOGIC
   ============================================================ */
const DMG = { dragon:20, atkStrong:23, atkWeak:8 };
const QTIME = 20;           // seconds per normal question
const SPECIAL_TIME = 8;     // harsher timer for the special attack
const SPECIAL_NEEDED = 3;   // correct answers to charge the meter
const SPECIAL_MULT = 2;     // double damage on a special hit

let stats = {correct:0, wrong:0, rounds:0, specialsUsed:0};
let qDeck = [];          // shuffled remaining questions for current class
let answerResolve = null;
let timerHandle = null;
let specialCharge = 0;   // 0..SPECIAL_NEEDED

/* ---- battle lifecycle token: bumped whenever a fight starts or is abandoned.
        The battle loop checks it after every await and bails if it's stale,
        so clicking HOME (or starting a new fight) can't leave a zombie loop
        running animations onto the wrong screen. ---- */
let battleToken = 0;
function abortBattle(){
  battleToken++;                 // invalidate any in-flight loop
  clearInterval(timerHandle);    // stop a running question timer
  if(answerResolve){ const r=answerResolve; answerResolve=null; r(false); } // unstick a pending answer
  if(typeof stopVoice==='function') stopVoice();   // silence character voices
}

const $ = id => document.getElementById(id);

function setLog(html){ $('log').innerHTML = '<span id="logText">'+html+'</span>'; }
function setLogWait(html){ $('log').innerHTML = '<span id="logText" class="blink">'+html+'</span>'; }

function shuffle(arr){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){const j=(Math.random()*(i+1))|0;[a[i],a[j]]=[a[j],a[i]];} return a; }
function nextQuestion(){ if(qDeck.length===0) qDeck = shuffle(QUESTIONS[hero.key]); return qDeck.pop(); }

function worldToPct(wx,wy){ return { left:(wx/WORLD_W*100)+'%', top:(wy/WORLD_H*100)+'%' }; }
function floatNum(wx,wy,text,color){
  const el=document.createElement('div');
  el.className='dmgnum'; el.textContent=text; el.style.color=color;
  const p=worldToPct(wx,wy); el.style.left=p.left; el.style.top=p.top;
  $('dmgLayer').appendChild(el);
  setTimeout(()=>el.remove(),1000);
}
function banner(text){
  const el=document.createElement('div'); el.className='banner'; el.textContent=text;
  $('stageWrap').appendChild(el); setTimeout(()=>el.remove(),900);
}

function updateBars(){
  const hpFrac=clamp(hero.hp/hero.maxHp,0,1);
  $('heroFill').style.width=(hpFrac*100)+'%';
  $('heroHpText').textContent=Math.max(0,Math.round(hero.hp))+' / '+hero.maxHp;
  const hf=$('heroFill');
  hf.style.background = hpFrac>0.5 ? 'linear-gradient(180deg,#7cf09a,#46d36b)'
                      : hpFrac>0.25? 'linear-gradient(180deg,#f6e08a,#e8c25a)'
                      : 'linear-gradient(180deg,#ff8a72,#e0503a)';
  $('dragonFill').style.width=(clamp(dragon.hp/dragon.maxHp,0,1)*100)+'%';
}

/* ---- special charge meter ---- */
function updateSpecialBar(){
  const frac = clamp(specialCharge/SPECIAL_NEEDED,0,1);
  $('specFill').style.width=(frac*100)+'%';
  const ready = specialCharge>=SPECIAL_NEEDED;
  $('specRow').classList.toggle('ready', ready);
  $('specLabel').textContent = ready ? '⚡READY!' : '⚡SPECIAL';
}
function addCharge(){
  if(specialCharge>=SPECIAL_NEEDED) return;
  specialCharge++;
  updateSpecialBar();
  if(specialCharge>=SPECIAL_NEEDED){ Sfx.charge(); banner('SPECIAL READY!'); }
}
function resetCharge(){ specialCharge=0; updateSpecialBar(); }

function damageHero(amt){
  hero.hp=clamp(hero.hp-amt,0,hero.maxHp);
  floatNum(hero.x, hero.baseY-18, '-'+amt, '#ff6a52');
  shake=4; updateBars();
}
function damageDragon(amt){
  dragon.hp=clamp(dragon.hp-amt,0,dragon.maxHp);
  floatNum(dragon.x, 22, '-'+amt, '#ffd23c');
  shake=2.5; updateBars();
}

/* ---- the question UI returns a Promise<boolean correct> ---- */
async function askQuestion(kind, opt={}){ // kind 'defense' | 'attack'
  const timeLimit = opt.timeLimit || QTIME;
  const special = !!opt.special;
  const tag=$('qTag');
  $('qPanel').classList.toggle('special', special);
  if(special){ tag.textContent='SPECIAL — fast!'; tag.className='spc pixel'; }
  else if(kind==='defense'){ tag.textContent='DEFEND — dodge!'; tag.className='def pixel'; }
  else { tag.textContent='ATTACK — strike!'; tag.className='atk pixel'; }

  // In an AI/Résumé mode with no client key, make sure backend detection has
  // settled before deciding — otherwise a slow /api/status probe would wrongly
  // drop the first question to the offline bank.
  if(typeof AI_MODE!=='undefined' && AI_MODE && !GEMINI.key &&
     typeof whenBackendReady==='function' &&
     (typeof BACKEND==='undefined' || !BACKEND.checked)){
    try{ await whenBackendReady(); }catch(e){}
  }

  if((typeof aiAvailable==='function' ? aiAvailable() : (typeof AI_MODE!=='undefined' && AI_MODE && GEMINI.key))){
    return await askQuestionAI(kind, {timeLimit, special});
  }
  return await askQuestionMC(nextQuestion(), {timeLimit, special});
}

/* ---- classic multiple-choice round ---- */
function askQuestionMC(item, {timeLimit, special}){
  return new Promise(resolve=>{
    const myToken = battleToken;
    answerResolve = resolve;
    $('qText').textContent=item.q;
    const wrap=$('answers'); wrap.innerHTML='';
    const keys=['A','B','C','D'];
    const btns=[];
    item.a.forEach((opt2,i)=>{
      const b=document.createElement('button');
      b.className='ans'+(special?' special':'');
      b.innerHTML='<span class="key">'+keys[i]+'</span><span>'+opt2+'</span>';
      b.addEventListener('click',()=>finish(i));
      wrap.appendChild(b); btns.push(b);
    });

    // timer (Classic keeps the countdown)
    const tw=$('timerWrap'); if(tw) tw.style.display='';
    const fill=$('timerFill'); fill.style.transform='scaleX(1)';
    clearInterval(timerHandle);
    const start=performance.now();
    timerHandle=setInterval(()=>{
      const elapsed=(performance.now()-start)/1000;
      const frac=clamp(1-elapsed/timeLimit,0,1);
      fill.style.transform='scaleX('+frac+')';
      if(frac<=0){ finish(-1); }
    },80);

    let done=false;
    function finish(choice){
      if(done) return; done=true;
      clearInterval(timerHandle);
      if(myToken!==battleToken){ return; }   // battle abandoned: drop this result
      answerResolve=null;
      const correct = choice===item.c;
      btns.forEach((b,i)=>{
        b.disabled=true;
        if(i===item.c) b.classList.add('correct');
        else if(i===choice) b.classList.add('wrong');
      });
      if(correct){ stats.correct++; Sfx.correct(); }
      else { stats.wrong++; Sfx.wrong(); }
      // brief pause so player sees the right answer highlighted
      setTimeout(()=>{ $('qPanel').classList.remove('special'); resolve(correct); }, correct?420:780);
    }
  });
}

/* ---- AI round: Gemini writes the question and grades free text ---- */
async function askQuestionAI(kind, {timeLimit, special}){
  const myToken = battleToken;
  // generate the question
  $('answers').innerHTML='';
  $('qText').innerHTML='<span class="aiThinking">⏳ The dragon conjures a challenge…</span>';
  // AI / Résumé rounds are untimed — hide the countdown bar entirely.
  const _tw=$('timerWrap'); if(_tw) _tw.style.display='none';
  $('timerFill').style.transform='scaleX(1)';
  let qtext;
  try { qtext = await geminiGenerateQuestion(hero.key, kind); }
  catch(e){ return await askQuestionMC(nextQuestion(), {timeLimit, special}); } // fallback
  if(myToken!==battleToken){ return false; }   // abandoned during generation

  return await new Promise(resolve=>{
    answerResolve = resolve;
    $('qText').textContent=qtext;
    const wrap=$('answers'); wrap.innerHTML='';
    const ta=document.createElement('textarea');
    ta.id='aiAnswer'; ta.className='aiAnswer';
    ta.placeholder='Type your answer like a real interview…  (Enter to submit, Shift+Enter for a new line)';
    const btn=document.createElement('button');
    btn.className='ans aiSubmit'+(special?' special':'');
    btn.innerHTML='<span class="key">⏎</span><span>Submit answer</span>';
    wrap.appendChild(ta); wrap.appendChild(btn);
    ta.focus();

    // No timer in AI / Résumé mode — answer at your own pace, like a real interview.
    const tw=$('timerWrap'); if(tw) tw.style.display='none';
    clearInterval(timerHandle);   // kill any leftover Classic timer

    let done=false;
    async function submit(timedOut){
      if(done) return; done=true;
      clearInterval(timerHandle);
      if(myToken!==battleToken){ return; }   // battle abandoned: drop this result
      const answer=(ta.value||'').trim();
      ta.disabled=true; btn.disabled=true;
      let verdict='wrong', quip='';
      if(timedOut && !answer){ verdict='wrong'; quip='Too slow! The flames are already here.'; }
      else {
        $('qText').innerHTML='<span class="aiThinking">🐉 The dragon weighs your words…</span>';
        try { const g=await geminiGradeAnswer(hero.key, qtext, answer); verdict=g.verdict; quip=g.quip; }
        catch(e){ verdict = answer? 'partial':'wrong'; quip='(the grading flame flickered — partial credit)'; }
        if(myToken!==battleToken){ return; }   // abandoned while grading
        $('qText').textContent=qtext;
      }
      answerResolve=null;
      const correct = (verdict==='correct' || verdict==='partial');
      btn.classList.add(correct?'correct':'wrong');
      if(correct){ stats.correct++; Sfx.correct(); } else { stats.wrong++; Sfx.wrong(); }
      const vClass = verdict==='correct'?'ok':verdict==='partial'?'hot':'bad';
      if(quip) setLog('🐉 “'+quip+'” <span class="'+vClass+'">['+verdict.toUpperCase()+']</span>');
      setTimeout(()=>{ $('qPanel').classList.remove('special'); resolve(correct); }, correct?520:760);
    }
    btn.addEventListener('click',()=>submit(false));
    ta.addEventListener('keydown',e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); submit(false); } });
  });
}

/* ---- "special is charged" pre-attack choice -> 'special' | 'normal' ---- */
function chooseMove(){
  return new Promise(resolve=>{
    const tag=$('qTag'); tag.textContent='CHARGED!'; tag.className='spc pixel';
    const aiNoTimer = (typeof aiAvailable==='function' ? aiAvailable() : (typeof AI_MODE!=='undefined' && AI_MODE && GEMINI.key));
    const tw=$('timerWrap'); if(tw) tw.style.display = aiNoTimer ? 'none' : '';
    $('timerFill').style.transform='scaleX(1)';
    $('qText').innerHTML = aiNoTimer
      ? 'Your special is charged. Risk a <b>high-stakes</b> question for <b>DOUBLE</b> damage — or take a safe swing and bank it?'
      : 'Your special is charged. Risk the <b>fast '+SPECIAL_TIME+'s timer</b> for <b>DOUBLE</b> damage — or take a safe swing and bank it?';
    const wrap=$('answers'); wrap.innerHTML='';
    const u=document.createElement('button');
    u.className='moveBtn unleash'; u.innerHTML='⚡ UNLEASH SPECIAL ⚡';
    u.addEventListener('click',()=>resolve('special'));
    const n=document.createElement('button');
    n.className='moveBtn normal'; n.textContent='Normal attack';
    n.addEventListener('click',()=>resolve('normal'));
    wrap.appendChild(u); wrap.appendChild(n);
  });
}

/* ---- attack visual per class ---- */
async function heroAttackFx(strong){
  const d=HERO_DATA[hero.key];
  const targetX=dragon.x-8, targetY=22;
  if(d.projectile==='melee'){
    Sfx.slash();
    await playAnim(hero,'attackStrong',strong?260:200);
  } else if(d.projectile==='orb'){
    Sfx.cast();
    setAnim(hero,'cast',360);
    await wait(140);
    await new Promise(res=>{
      spawnProjectile('orb', hero.x+7, hero.baseY-10, targetX, targetY, d.proj, res);
    });
  } else { // dagger
    Sfx.slash();
    setAnim(hero,'attackStrong',300);
    await wait(120);
    await new Promise(res=>{
      spawnProjectile('dagger', hero.x+7, hero.baseY-12, targetX, targetY, d.proj, res);
    });
  }
}

function screenFlash(){
  const f=$('flashFx'); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
}

/* ---- the over-the-top special attack visual ---- */
async function heroSpecialFx(){
  const d=HERO_DATA[hero.key];
  const targetX=dragon.x-8, targetY=24;
  // charge-up
  Sfx.cast();
  setAnim(hero,'cast',520);
  for(let i=0;i<3;i++){ burst(hero.x, hero.baseY-14, d.proj, 6, 0.9); await wait(120); }
  Sfx.special();
  if(d.projectile==='melee'){
    // triple lunge slash storm
    for(let i=0;i<3;i++){
      setAnim(hero,'attackStrong',180);
      await wait(150);
      burst(dragon.x-6, 22+i*4, d.proj, 10, 2.6);
    }
    await new Promise(res=>setTimeout(res,80));
  } else {
    // a big charged orb + escorts
    await wait(80);
    spawnProjectile('orb', hero.x+7, hero.baseY-12, targetX, targetY-6, d.proj, null, true);
    spawnProjectile('orb', hero.x+7, hero.baseY-12, targetX, targetY+6, d.proj, null, true);
    await new Promise(res=>{
      spawnProjectile('orb', hero.x+7, hero.baseY-10, targetX, targetY, d.proj, res, true);
    });
  }
}

async function dragonTurn(){
  setLog('The dragon rears back, jaws crackling with errors...');
  await playAnim(dragon,'windup',650);
  setLogWait('<span class="hot">DEFEND!</span> Answer right to dodge the blast.');
  const dodged = await askQuestion('defense');
  if(dodged){
    addCharge();
    banner('DODGED!'); Sfx.dodge();
    setAnim(dragon,'strike',500);
    await wait(120);
    setAnim(hero,'dodge',460);
    burst(hero.x-6, hero.baseY-10, '#8fd6ff', 10, 1.6);
    await wait(500);
    setLog('<span class="ok">You read the docs and slipped aside — no damage!</span>');
  } else {
    await playAnim(dragon,'strike',520);
    Sfx.hitHero();
    enqueueSpeak('dragon','attack'); enqueueSpeak(hero.key,'hurt');
    setAnim(hero,'hit',520); hero.flash=1;
    burst(hero.x, hero.baseY-12, '#ff7a3a', 16, 2.2);
    damageHero(DMG.dragon);
    banner('-'+DMG.dragon+' HP');
    setLog('<span class="bad">The flames connect! You take '+DMG.dragon+' damage.</span>');
    await wait(520);
  }
  setAnim(dragon,'recover',300);
}

async function playerTurn(){
  // offer the special if the meter is charged
  let useSpecial=false;
  if(specialCharge>=SPECIAL_NEEDED){
    setLogWait('<span class="hot">SPECIAL CHARGED!</span> Choose how to strike.');
    useSpecial = (await chooseMove())==='special';
  }

  if(useSpecial){
    resetCharge();
    stats.specialsUsed++;
    const _aiNoTimer = (typeof aiAvailable==='function' ? aiAvailable() : (typeof AI_MODE!=='undefined' && AI_MODE && GEMINI.key));
    setLogWait(_aiNoTimer
      ? '<span class="hot">Channeling everything — make this answer count!</span>'
      : '<span class="hot">Channeling everything — answer FAST!</span>');
    const hit = await askQuestion('attack',{special:true, timeLimit:SPECIAL_TIME});
    if(hit){
      const dmg = DMG.atkStrong*SPECIAL_MULT;
      await heroSpecialFx();
      screenFlash(); shake=7; Sfx.hitDragon();
      enqueueSpeak(hero.key,'attack'); enqueueSpeak('dragon','hurt');
      setAnim(dragon,'hit',640); dragon.flash=1;
      burst(dragon.x-4, 24, HERO_DATA[hero.key].proj, 34, 3.2);
      burst(dragon.x-4, 24, '#ffffff', 14, 3.0);
      damageDragon(dmg);
      banner('MEGA CRIT!');
      setLog('<span class="ok">SPECIAL ATTACK lands for '+dmg+' — devastating!</span>');
      await wait(520);
    } else {
      await heroAttackFx(false);
      Sfx.hitDragon();
      setAnim(dragon,'hit',300); dragon.flash=0.5;
      burst(dragon.x-6, 26, '#9a8f72', 8, 1.4);
      damageDragon(DMG.atkWeak);
      setLog('<span class="bad">The special fizzled — only '+DMG.atkWeak+' damage. Charge spent!</span>');
      await wait(380);
    }
    return;
  }

  setLogWait('<span class="hot">YOUR MOVE!</span> Nail the question to land a blow.');
  const correct = await askQuestion('attack');
  if(correct){
    addCharge();
    await heroAttackFx(true);
    Sfx.hitDragon();
    enqueueSpeak(hero.key,'attack'); enqueueSpeak('dragon','hurt');
    setAnim(dragon,'hit',460); dragon.flash=1;
    burst(dragon.x-6, 24, HERO_DATA[hero.key].proj, 18, 2.4);
    burst(dragon.x-6, 24, '#ffffff', 6, 2.0);
    damageDragon(DMG.atkStrong);
    banner('CRIT!');
    setLog('<span class="ok">Flawless answer! Critical strike for '+DMG.atkStrong+'.</span>');
    await wait(380);
  } else {
    await heroAttackFx(false);
    Sfx.hitDragon();
    setAnim(dragon,'hit',300); dragon.flash=0.5;
    burst(dragon.x-6, 26, '#9a8f72', 8, 1.4);
    damageDragon(DMG.atkWeak);
    setLog('<span class="bad">Shaky answer... only a glancing hit for '+DMG.atkWeak+'.</span>');
    await wait(360);
  }
}

async function battleLoop(){
  const myToken = battleToken;
  setLog('A wild <span class="hot">BUG DRAGON</span> blocks the path to your offer!');
  await wait(1100);
  if(myToken!==battleToken) return;
  while(true){
    stats.rounds++;
    await dragonTurn();
    if(myToken!==battleToken) return;
    if(hero.hp<=0){ return endBattle(false); }
    updateBars();
    await wait(450);
    if(myToken!==battleToken) return;
    await playerTurn();
    if(myToken!==battleToken) return;
    if(dragon.hp<=0){ return endBattle(true); }
    updateBars();
    await wait(450);
  }
}

function endBattle(win){
  // clear question panel
  $('qPanel').style.opacity='0.35';
  $('qPanel').classList.remove('special');
  $('answers').innerHTML='';
  $('qText').textContent = win? 'The dragon is vanquished.' : 'Your HP has run out.';
  $('qTag').textContent = win? 'VICTORY':'DEFEAT'; $('qTag').className=(win?'atk':'def')+' pixel';
  $('timerFill').style.transform='scaleX(0)';

  if(win){
    Sfx.win();
    setAnim(dragon,'die',1400);
    for(let i=0;i<4;i++) setTimeout(()=>burst(dragon.x+rand(-12,12),30+rand(-8,8),'#ffb13a',14,2.6),i*200);
    setLog('<span class="ok">The Bug Dragon dissolves into resolved tickets. You win!</span>');
  } else {
    Sfx.lose();
    setAnim(hero,'die',1300);
    burst(hero.x, hero.baseY-12, '#888', 14, 1.8);
    setLog('<span class="bad">You fall... but every interview is a retry. Rest and try again.</span>');
  }

  setTimeout(()=>{
    $('battleScreen').style.display='none';
    const es=$('endScreen'); es.style.display='block';
    const t=$('endTitle'), s=$('endSub'), st=$('endStats');
    if(win){ t.textContent='VICTORY!'; t.className='win pixel';
      s.textContent='The offer letter is yours, '+HERO_DATA[hero.key].name+'.'; }
    else { t.textContent='DEFEATED'; t.className='lose pixel';
      s.textContent='The dragon guards the gate another day.'; }
    const total=stats.correct+stats.wrong;
    const acc= total? Math.round(stats.correct/total*100):0;
    st.innerHTML='Rounds fought: <b>'+stats.rounds+'</b><br>'+
                 'Questions answered: <b>'+total+'</b><br>'+
                 'Accuracy: <b>'+acc+'%</b> ('+stats.correct+' right, '+stats.wrong+' wrong)<br>'+
                 'Specials unleashed: <b>'+stats.specialsUsed+'</b><br>'+
                 'Dragon HP left: <b>'+Math.max(0,Math.round(dragon.hp))+'</b>';
    if((typeof aiAvailable==='function' ? aiAvailable() : (typeof AI_MODE!=='undefined' && AI_MODE && GEMINI.key))){
      const rev=document.createElement('div');
      rev.style.marginTop='12px'; rev.style.color='var(--ink-dim)'; rev.style.lineHeight='1.35';
      rev.innerHTML='🐉 <span class="aiThinking">The dragon writes your review…</span>';
      st.appendChild(rev);
      geminiReview(hero.key, stats).then(r=>{ rev.textContent='🐉 '+r; }).catch(()=>{ rev.remove(); });
    }
  }, win?1500:1400);
}
