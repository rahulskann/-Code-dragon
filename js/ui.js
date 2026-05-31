/* CODE DRAGON — UI wiring & init
   Builds the class-select cards and wires up the setup screen, buttons, and mute.
   This file runs last and kicks everything off. */

/* =========================================================
   SELECT SCREEN (animated class cards)
========================================================= */
(function buildSelect(){
  const wrap=$('cards');
  ['mage','fighter','thief'].forEach(key=>{
    const d=HERO_DATA[key];
    const card=document.createElement('div');
    card.className='card'; card.tabIndex=0;
    card.innerHTML =
      '<div class="frame"><canvas width="78" height="100"></canvas></div>'+
      '<h3>'+d.name+'</h3>'+
      '<div class="role" style="color:'+d.color+'">'+d.role+'</div>'+
      '<div class="blurb">'+d.blurb+'</div>';
    wrap.appendChild(card);

    const cv=card.querySelector('canvas'); const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
    const map=SPRITES[key]; const {cols,rows}=spriteSize(map); const s=8;
    (function loop(t){
      if($('selectScreen').classList.contains('active')){
        c.clearRect(0,0,78,100);
        const bob=Math.sin(t/300)*3;
        drawSprite(c, map, (78-cols*s)/2, 100-rows*s-2+bob, s);
      }
      requestAnimationFrame(loop);
    })(0);

    const go=()=>{ sfx.pick(); startBattle(key); };
    card.addEventListener('click',go);
    card.addEventListener('keydown',e=>{if(e.key==="Enter"||e.key===" ")go();});
  });
})();


/* =========================================================
   SETUP WIRING
========================================================= */
function setMode(mode){
  state.mode = mode;
  $('optAI').classList.toggle('sel', mode==="ai");
  $('optClassic').classList.toggle('sel', mode==="classic");
  $('keyWrap').style.display = mode==="ai" ? "block" : "none";
  const tag=$('modeTag');
  tag.textContent = mode==="ai" ? "✦ GEMINI AI" : "CLASSIC";
  tag.classList.toggle('ai', mode==="ai");
}
$('optAI').addEventListener('click', ()=>setMode("ai"));
$('optClassic').addEventListener('click', ()=>setMode("classic"));
$('optAI').addEventListener('keydown', e=>{if(e.key==="Enter"||e.key===" ")setMode("ai");});
$('optClassic').addEventListener('keydown', e=>{if(e.key==="Enter"||e.key===" ")setMode("classic");});

// preload saved key
(function(){ const k=lsGet(LS_KEY); if(k){ $('keyInput').value=k; state.apiKey=k; $('keyStatus').textContent="Saved key loaded."; $('keyStatus').className="ok"; } })();

$('keySave').addEventListener('click', async ()=>{
  const k=$('keyInput').value.trim();
  if(!k){ $('keyStatus').textContent="Paste a key first."; $('keyStatus').className="bad"; return; }
  state.apiKey=k; lsSet(LS_KEY,k);
  $('keyStatus').textContent="Testing key…"; $('keyStatus').className="";
  try{
    await callGemini("Reply with JSON {\"ok\":true}.", {type:"object",properties:{ok:{type:"boolean"}},required:["ok"]});
    $('keyStatus').textContent="✓ Key works — Gemini connected."; $('keyStatus').className="ok";
  }catch(e){
    $('keyStatus').textContent="✗ Couldn't reach Gemini (key, quota, or network). Game will fall back to the question bank."; $('keyStatus').className="bad";
  }
});

$('toSelect').addEventListener('click', ()=>{
  if(state.mode==="ai" && !state.apiKey){
    $('keyStatus').textContent="No key set — running AI Mode with the offline bank as fallback."; $('keyStatus').className="bad";
  }
  show('selectScreen');
});

/* end buttons */
$('againBtn').addEventListener('click', ()=>startBattle(state.classKey));
$('classBtn').addEventListener('click', ()=>show('selectScreen'));

/* mute */
$('muteBtn').addEventListener('click', ()=>{
  state.muted=!state.muted;
  $('muteBtn').textContent = state.muted ? "♪ OFF" : "♪ ON";
});

updateBars();
