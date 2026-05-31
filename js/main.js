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
  $('heroName').textContent=d.name+' · '+d.role;
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
  $('selectScreen').style.display='block';
});

/* HOME — leave a fight in progress and return to class select.
   Nothing is saved: a new fight fully re-initializes in startBattle(). */
$('homeBtn').addEventListener('click',()=>{
  abortBattle();                       // stop the loop, timer, pending answer & voices
  clearInterval(timerHandle);
  $('answers').innerHTML='';           // clear any question UI
  $('qPanel').classList.remove('special');
  $('battleScreen').style.display='none';
  $('endScreen').style.display='none';
  $('selectScreen').style.display='block';
});
