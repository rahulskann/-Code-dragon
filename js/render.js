/* CODE DRAGON — stage rendering & HP bars
   The canvas animation loop, attack/hit animations, and the HP bar updater. */

/* =========================================================
   STAGE RENDER + ANIMATION
========================================================= */
const stage = $('stageCanvas');
const sctx = stage.getContext('2d');
sctx.imageSmoothingEnabled = false;
let anim = { heroOffset:0, dragonOffset:0, heroFlash:0, dragonFlash:0, shake:0, t:0 };

function renderStage(){
  anim.t += 1;
  sctx.clearRect(0,0,320,160);
  const shake = anim.shake>0 ? (Math.random()*2-1)*anim.shake : 0;
  if(anim.shake>0) anim.shake *= 0.85;
  sctx.save();
  sctx.translate(shake, shake*0.5);

  // ground
  sctx.fillStyle = "#0e0820";
  sctx.fillRect(0,128,320,32);

  // dragon (top-right), idle bob
  const dMap = SPRITES.dragon, dS = 9;
  const dCols = dMap[0].length*dS, dRows = dMap.length*dS;
  const dbob = Math.sin(anim.t/26)*3;
  drawSprite(sctx, dMap, 320-dCols-22 + anim.dragonOffset, 18+dbob, dS, {flash:anim.dragonFlash>0});
  if(anim.dragonFlash>0) anim.dragonFlash--;

  // hero (bottom-left)
  if(state.classKey){
    const hMap = SPRITES[state.classKey], hS = 8;
    const hbob = Math.sin(anim.t/30)*2;
    drawSprite(sctx, hMap, 30 + anim.heroOffset, 70+hbob, hS, {flash:anim.heroFlash>0});
    if(anim.heroFlash>0) anim.heroFlash--;
  }
  sctx.restore();

  // ease offsets back to 0
  anim.heroOffset *= 0.8; anim.dragonOffset *= 0.8;
  if(Math.abs(anim.heroOffset)<0.3) anim.heroOffset=0;
  if(Math.abs(anim.dragonOffset)<0.3) anim.dragonOffset=0;

  requestAnimationFrame(renderStage);
}
requestAnimationFrame(renderStage);

function heroAttackAnim(){ anim.heroOffset = 40; anim.dragonFlash = 6; anim.shake = 4; }
function dragonAttackAnim(){ anim.dragonOffset = -40; anim.heroFlash = 6; anim.shake = 6; }


/* =========================================================
   HP BARS
========================================================= */
function updateBars(){
  const dPct = Math.max(0,state.dragonHp);
  const hPct = Math.max(0,state.heroHp);
  $('dragonHpFill').style.width = dPct+"%";
  $('heroHpFill').style.width = hPct+"%";
  $('dragonHpNum').textContent = Math.round(dPct);
  $('heroHpNum').textContent = Math.round(hPct);
  const hf=$('heroHpFill');
  hf.style.background = hPct>50?"var(--hp-good)":hPct>25?"var(--hp-mid)":"var(--hp-low)";
}
