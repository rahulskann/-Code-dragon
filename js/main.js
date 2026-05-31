"use strict";
/* ============================================================
   FLOW / WIRING
   ============================================================ */
function startBattle(clsKey){
  Sfx.resume();
  battleToken++;              // invalidate any still-running loop from a prior fight
  hero.key=clsKey; hero.hp=hero.maxHp=100; hero.anim='idle'; hero.alpha=1; hero.flash=0;
  dragon.hp=dragon.maxHp=130; dragon.anim='idle'; dragon.alpha=1; dragon.flash=0;
  stats={correct:0,wrong:0,rounds:0,specialsUsed:0};
  qDeck=shuffle(QUESTIONS[clsKey]);
  particles=[]; projectiles=[];
  specialCharge=0; updateSpecialBar();
  $('qPanel').classList.remove('special');

  // hero HUD theming
  const d=HERO_DATA[clsKey];
  const resumeMode = (typeof RESUME_MODE!=='undefined' && RESUME_MODE);
  $('heroName').textContent = resumeMode ? d.name : (d.name+' · '+d.role);
  $('heroName').style.color=({mage:'#9a72ea',fighter:'#ff6a52',thief:'#46d36b'})[clsKey];
  $('heroPortrait').style.boxShadow='inset 0 0 0 1px '+({mage:'#7d4fd6',fighter:'#d23b3b',thief:'#2fa06b'})[clsKey];
  // draw portrait (scaled)
  const pc=$('heroPortrait').getContext('2d'); pc.imageSmoothingEnabled=false;
  pc.clearRect(0,0,48,48);
  const hc=HERO_CANVAS[clsKey];
  pc.drawImage(hc.cv,0,0,hc.cols,hc.rows, 6,2, hc.cols*3, hc.rows*3);

  $('selectScreen').style.display='none';
  $('endScreen').style.display='none';
  $('battleScreen').style.display='block';
  $('qPanel').style.opacity='1';
  if(typeof refreshHomeBtn==='function') refreshHomeBtn();
  updateBars();
  battleLoop();
}

/* build class-select cards (with mini sprite previews) */
(function buildSelect(){
  const wrap=$('cards');
  ['mage','fighter','thief'].forEach(key=>{
    const d=HERO_DATA[key];
    const card=document.createElement('div');
    card.className='card'; card.dataset.cls=key; card.tabIndex=0;
    card.innerHTML =
      '<div class="frame"><canvas width="60" height="100"></canvas></div>'+
      '<h3 class="pixel">'+d.name+'</h3>'+
      '<div class="role">'+d.role+'</div>'+
      '<div class="blurb">'+d.blurb+'</div>';
    wrap.appendChild(card);
    // draw the sprite preview, scale 5x, bobbing
    const cv=card.querySelector('canvas'); const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
    const hc=HERO_CANVAS[key];
    function drawPrev(t){
      c.clearRect(0,0,60,100);
      const s=4; const bob=Math.sin(t/300)*2;
      c.drawImage(hc.cv,0,0,hc.cols,hc.rows,
        (60-hc.cols*s)/2, 100-hc.rows*s-2+bob, hc.cols*s, hc.rows*s);
    }
    (function loop(t){
      if($('selectScreen').style.display!=='none') drawPrev(t);
      requestAnimationFrame(loop);
    })(0);
    card.addEventListener('click',()=>startBattle(key));
    card.addEventListener('keydown',e=>{ if(e.key==='Enter'||e.key===' ') startBattle(key); });
    // speak the class's hover line on mouse-over / keyboard focus (needs an ElevenLabs key)
    card.addEventListener('mouseenter',()=>{ if(typeof speakHover==='function') speakHover(key); });
    card.addEventListener('focus',()=>{ if(typeof speakHover==='function') speakHover(key); });
  });
})();

$('againBtn').addEventListener('click',()=>startBattle(hero.key));
$('classBtn').addEventListener('click',()=>{
  $('endScreen').style.display='none';
  $('battleScreen').style.display='none';
  // Résumé Mode has no class to pick — go back to setup so they can edit/re-upload
  // the résumé or switch modes, instead of the (skipped) avatar-select screen.
  if(typeof RESUME_MODE!=='undefined' && RESUME_MODE){
    $('setupScreen').style.display='block';
    if(typeof refreshHomeBtn==='function') refreshHomeBtn();
    return;
  }
  refreshSelectScreenForMode();
  $('selectScreen').style.display='block';
  if(typeof refreshHomeBtn==='function') refreshHomeBtn();
});

/* Relabel the end-screen "NEW CLASS" button to match the mode. */
function refreshEndScreenForMode(){
  const btn = document.getElementById('classBtn');
  if(!btn) return;
  const resume = (typeof RESUME_MODE!=='undefined' && RESUME_MODE);
  btn.textContent = resume ? 'EDIT RÉSUMÉ' : 'NEW CLASS';
}

/* In Résumé Mode the three sprites are just avatars / fighting styles — the
   quiz comes from the user's résumé, not the class domain. So reframe the
   select-screen copy and hide the domain role + flavour blurb. In every other
   mode the original "choose your class" framing is restored. Called whenever
   the select screen is shown (from setup and from the NEW CLASS button). */
let _selOrig = null;
function refreshSelectScreenForMode(){
  const prompt = document.querySelector('#selectScreen .prompt');
  const hint   = document.querySelector('#selectScreen .hint');
  if(_selOrig===null){
    _selOrig = { prompt: prompt?prompt.innerHTML:'', hint: hint?hint.innerHTML:'' };
  }
  const resume = (typeof RESUME_MODE!=='undefined' && RESUME_MODE);
  if(resume){
    if(prompt) prompt.innerHTML =
      'Your <b>résumé</b> is loaded. Pick an <b>avatar</b> to fight as —<br>the dragon quizzes you on <b>your own projects</b>.';
    if(hint) hint.innerHTML =
      'Your avatar is just a fighting style. Every question is drawn from the résumé you pasted — not the class.';
  } else {
    if(prompt) prompt.innerHTML = _selOrig.prompt;
    if(hint)   hint.innerHTML   = _selOrig.hint;
  }
  // hide the domain job-title + flavour text in résumé mode (they imply a domain-specific quiz)
  document.querySelectorAll('#cards .role, #cards .blurb').forEach(el=>{
    el.style.display = resume ? 'none' : '';
  });
}

/* HOME — leave whatever's happening and return to the MAIN MENU (setup screen).
   Works from the class-select, the battle, or the end screen. Nothing is saved;
   a new fight fully re-initializes in startBattle(). */
function goHome(){
  if(typeof abortBattle==='function') abortBattle();   // stop loop, timer, pending answer
  clearInterval(timerHandle);
  if(typeof stopVoice==='function') stopVoice();         // silence any in-progress voice line
  $('answers').innerHTML='';                             // clear any question UI
  $('qPanel').classList.remove('special');
  $('battleScreen').style.display='none';
  $('endScreen').style.display='none';
  $('selectScreen').style.display='none';
  $('setupScreen').style.display='block';                // back to the main menu
  refreshHomeBtn();
}
$('homeBtn').addEventListener('click', goHome);

/* The home button shows on every screen EXCEPT the main menu itself (you're
   already there). Call after any screen switch. */
function refreshHomeBtn(){
  const hb=document.getElementById('homeBtn');
  if(!hb) return;
  const onMenu = $('setupScreen') && $('setupScreen').style.display!=='none';
  hb.style.display = onMenu ? 'none' : 'block';
}
