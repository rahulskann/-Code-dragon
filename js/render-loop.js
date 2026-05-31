"use strict";
/* ============================================================
   MAIN RENDER LOOP
   ============================================================ */
function frame(now){
  updateHeroAnim(now);
  updateDragonAnim(now);
  updateEffects();

  drawBackground(now);

  // dragon (own offscreen, redrawn each frame; flash tint applied on its buffer)
  drawDragon(dragon);
  if(dragon.flash>0){
    dctx.globalCompositeOperation='source-atop';
    dctx.fillStyle=`rgba(255,120,90,${dragon.flash})`;
    dctx.fillRect(0,0,DRG_W,DRG_H);
    dctx.globalCompositeOperation='source-over';
  }
  wctx.save();
  wctx.globalAlpha=dragon.alpha;
  wctx.drawImage(drgCv,
    Math.round(dragon.x-DRG_W/2+dragon.offX),
    Math.round(dragon.baseY-DRG_H+dragon.offY));
  wctx.restore();

  // hero
  drawHeroSprite(wctx, hero.key, hero.x, hero.baseY,
    {offX:hero.offX, offY:hero.offY, flash:hero.flash, alpha:hero.alpha});

  drawEffects();

  // upscale world -> stage with screen shake
  sctx.clearRect(0,0,stage.width,stage.height);
  let sx=0, sy=0;
  if(shake>0){ sx=rand(-shake,shake); sy=rand(-shake,shake); shake*=0.85; if(shake<0.4)shake=0; }
  sctx.drawImage(world,0,0,WORLD_W,WORLD_H,
    Math.round(sx*SCALE), Math.round(sy*SCALE), stage.width, stage.height);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
