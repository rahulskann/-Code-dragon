"use strict";
/* ============================================================
   PARTICLES + PROJECTILES
   ============================================================ */
function burst(x,y,color,n,spd){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2, s=rand(spd*0.3,spd);
    particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-rand(0,0.5),
      life:rand(18,34),max:34,color,size:rand(1,2),grav:0.04});
  }
}
function spawnProjectile(type,sx,sy,tx,ty,color,onArrive,big){
  const dx=tx-sx, dy=ty-sy, dist=Math.hypot(dx,dy)||1, spd=big?2.2:2.6;
  projectiles.push({type,x:sx,y:sy,vx:dx/dist*spd,vy:dy/dist*spd,
    tx,ty,color,onArrive,ang:0,big:!!big});
}
function updateEffects(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx; p.y+=p.vy; p.vy+=p.grav; p.life--;
    if(p.life<=0) particles.splice(i,1);
  }
  for(let i=projectiles.length-1;i>=0;i--){
    const pr=projectiles[i];
    pr.x+=pr.vx; pr.y+=pr.vy; pr.ang+=0.5;
    // trailing sparkle
    if(Math.random()<0.6) particles.push({x:pr.x,y:pr.y,vx:0,vy:0,life:8,max:8,color:pr.color,size:1,grav:0});
    if(Math.hypot(pr.tx-pr.x,pr.ty-pr.y)<3){
      if(pr.onArrive) pr.onArrive();
      projectiles.splice(i,1);
    }
  }
}
function drawEffects(){
  particles.forEach(p=>{
    wctx.globalAlpha = clamp(p.life/p.max,0,1);
    wctx.fillStyle=p.color;
    wctx.fillRect(Math.round(p.x),Math.round(p.y),p.size,p.size);
  });
  wctx.globalAlpha=1;
  projectiles.forEach(pr=>{
    if(pr.type==='dagger'){
      wctx.save(); wctx.translate(pr.x,pr.y); wctx.rotate(pr.ang);
      wctx.fillStyle='#cfd6e0'; wctx.fillRect(-1,-3,2,5);
      wctx.fillStyle='#7a5a30'; wctx.fillRect(-1,2,2,2);
      wctx.restore();
    } else { // orb
      const r = pr.big?2:1;
      if(pr.big){ // glow halo
        wctx.globalAlpha=0.4; wctx.fillStyle=pr.color;
        wctx.fillRect(Math.round(pr.x)-3,Math.round(pr.y)-3,7,7); wctx.globalAlpha=1;
      }
      wctx.fillStyle=pr.color; wctx.fillRect(Math.round(pr.x)-r,Math.round(pr.y)-r,r*2+1,r*2+1);
      wctx.fillStyle='#ffffff'; wctx.fillRect(Math.round(pr.x),Math.round(pr.y),1,1);
    }
  });
}
