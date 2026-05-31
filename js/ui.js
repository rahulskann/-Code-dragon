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
    // speak the class's hover line on mouse-over / keyboard focus (needs an ElevenLabs key)
    card.addEventListener('mouseenter',()=>speakHover(key));
    card.addEventListener('focus',()=>speakHover(key));
  });
})();


/* =========================================================
   SETUP WIRING
========================================================= */
function setMode(mode){
  state.mode = mode;
  $('optAI').classList.toggle('sel', mode==="ai");
  $('optClassic').classList.toggle('sel', mode==="classic");
  const tag=$('modeTag');
  tag.textContent = mode==="ai" ? "✦ GEMINI AI" : "CLASSIC";
  tag.classList.toggle('ai', mode==="ai");
}
$('optAI').addEventListener('click', ()=>setMode("ai"));
$('optClassic').addEventListener('click', ()=>setMode("classic"));
$('optAI').addEventListener('keydown', e=>{if(e.key==="Enter"||e.key===" ")setMode("ai");});
$('optClassic').addEventListener('keydown', e=>{if(e.key==="Enter"||e.key===" ")setMode("classic");});

// preload saved Gemini and ElevenLabs keys
(function(){
  const gk = lsGet(LS_GEMINI_KEY);
  if(gk){ state.apiKey = gk; $('geminiKey').value = gk; $('geminiStatus').textContent = "Saved Gemini key loaded for preview fallback."; $('geminiStatus').className = "ok"; }
  const vk = getElevenKey();
  if(vk){ $('voiceKey').value = vk; $('voiceStatus').textContent = "Saved voice key loaded — characters will speak."; $('voiceStatus').className = "ok"; }
})();

$('geminiSave').addEventListener('click', async ()=>{
  const k=$('geminiKey').value.trim();
  if(!k){ state.apiKey = ""; lsSet(LS_GEMINI_KEY,""); $('geminiStatus').textContent="No Gemini key set — AI Mode needs a proxy or saved key."; $('geminiStatus').className=""; return; }
  state.apiKey = k;
  lsSet(LS_GEMINI_KEY,k);
  $('geminiStatus').textContent="Testing Gemini key…"; $('geminiStatus').className="";
  try{
    await callGemini("Reply with JSON {\"ok\":true}.", {type:"object",properties:{ok:{type:"boolean"}},required:["ok"]});
    $('geminiStatus').textContent="✓ Gemini ready — AI Mode can now use your key if the proxy is unavailable."; $('geminiStatus').className="ok";
  }catch(e){
    $('geminiStatus').textContent=`✗ ${e.message}`; $('geminiStatus').className="bad";
  }
});

$('voiceSave').addEventListener('click', async ()=>{
  const k=$('voiceKey').value.trim();
  if(!k){ setElevenKey(""); $('voiceStatus').textContent="Voices off — no key set."; $('voiceStatus').className=""; return; }
  setElevenKey(k);
  $('voiceStatus').textContent="Testing voice key…"; $('voiceStatus').className="";
  try{
    await testElevenKey();
    $('voiceStatus').textContent="✓ Voices connected — hover a class to hear it."; $('voiceStatus').className="ok";
  }catch(e){
    $('voiceStatus').textContent="✗ Couldn't reach ElevenLabs (key, quota, or network). Game runs fine without voices."; $('voiceStatus').className="bad";
  }
});

$('toSelect').addEventListener('click', ()=>{
  show('selectScreen');
});

/* end buttons */
$('againBtn').addEventListener('click', ()=>startBattle(state.classKey));
$('classBtn').addEventListener('click', ()=>show('selectScreen'));

/* mute */
$('muteBtn').addEventListener('click', ()=>{
  state.muted=!state.muted;
  $('muteBtn').textContent = state.muted ? "♪ OFF" : "♪ ON";
  if(state.muted) stopVoice();   // also silence any in-progress character voice
});

updateBars();
