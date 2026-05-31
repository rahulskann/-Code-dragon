"use strict";
/* ============================================================
   BACKGROUND (prerendered) + animated torches & dragon glow
   ============================================================ */
const bg = document.createElement('canvas'); bg.width=WORLD_W; bg.height=WORLD_H;
(function buildBG(){
  const c=bg.getContext('2d');
  // sky / cave gradient
  const g=c.createLinearGradient(0,0,0,GROUND_Y);
  g.addColorStop(0,'#1a0f2e'); g.addColorStop(.6,'#241338'); g.addColorStop(1,'#2e1a2a');
  c.fillStyle=g; c.fillRect(0,0,WORLD_W,GROUND_Y);
  // distant arches
  c.fillStyle='#170b26';
  for(let i=0;i<5;i++){ const x=8+i*34; c.beginPath();
    c.moveTo(x,GROUND_Y); c.lineTo(x,30); c.quadraticCurveTo(x+12,16,x+24,30);
    c.lineTo(x+24,GROUND_Y); c.fill(); }
  // stalactites
  c.fillStyle='#1d1030';
  for(let i=0;i<10;i++){ const x=i*17+ (i%2?5:0); const h=4+ (i*7%9); 
    fillTri(c,[x,0, x+8,0, x+4,h],'#1d1030'); }
  // ground
  const gg=c.createLinearGradient(0,GROUND_Y,0,WORLD_H);
  gg.addColorStop(0,'#3a2a22'); gg.addColorStop(1,'#1a120e');
  c.fillStyle=gg; c.fillRect(0,GROUND_Y,WORLD_W,WORLD_H-GROUND_Y);
  c.fillStyle='#241712'; c.fillRect(0,GROUND_Y,WORLD_W,2);
  // ground rubble specks
  c.fillStyle='#2c1d16';
  for(let i=0;i<40;i++){ c.fillRect((i*53)%WORLD_W, GROUND_Y+3+((i*31)%12), 1,1); }
})();

function drawBackground(now){
  wctx.drawImage(bg,0,0);
  // ominous red glow behind dragon
  const pulse = 0.25+Math.sin(now/600)*0.08 + (dragon.anim==='strike'?0.3:0);
  const rg = wctx.createRadialGradient(dragon.x,40,4,dragon.x,40,40);
  rg.addColorStop(0,`rgba(200,40,30,${pulse})`); rg.addColorStop(1,'rgba(200,40,30,0)');
  wctx.fillStyle=rg; wctx.fillRect(dragon.x-40,0,80,GROUND_Y);
  // two torches with flickering flame
  drawTorch(14, 40, now); drawTorch(WORLD_W-16, 44, now+700);
}
function drawTorch(x,y,now){
  wctx.fillStyle='#2a1810'; wctx.fillRect(x-1,y,2,12);          // post
  const f = Math.sin(now/90)+Math.sin(now/53);
  const fy=y-3+f*0.6;
  wctx.fillStyle='#ff8a1e'; wctx.fillRect(x-1,fy-2,2,4);
  wctx.fillStyle='#ffd23c'; wctx.fillRect(x,fy-1,1,2);
  // glow
  const tg=wctx.createRadialGradient(x,fy,1,x,fy,12);
  tg.addColorStop(0,`rgba(255,150,40,${0.5+f*0.06})`); tg.addColorStop(1,'rgba(255,150,40,0)');
  wctx.fillStyle=tg; wctx.fillRect(x-12,fy-12,24,24);
}
