"use strict";
/* ============================================================
   ENTITY STATE + ANIMATION
   ============================================================ */
const hero = { key:'mage', hp:100, maxHp:100, x:36, baseY:GROUND_Y,
               anim:'idle', animStart:0, animDur:0,
               offX:0, offY:0, flash:0, alpha:1 };
const dragon = { hp:130, maxHp:130, x:116, baseY:GROUND_Y+2,
                 anim:'idle', animStart:0, animDur:0,
                 offX:0, offY:0, flash:0, alpha:1,
                 mouth:0, wing:0, eyeGlow:0.5 };

let shake = 0;            // screen shake magnitude
let particles = [];
let projectiles = [];

function setAnim(e,name,dur){ e.anim=name; e.animStart=performance.now(); e.animDur=dur; }
function playAnim(e,name,dur){ setAnim(e,name,dur); return wait(dur); }

/* update an entity's transform from its current animation */
function updateHeroAnim(now){
  const e=hero;
  const p = e.animDur? clamp((now-e.animStart)/e.animDur,0,1) : 1;
  e.offX=0; e.offY=0;
  switch(e.anim){
    case 'idle':
      e.offY = Math.sin(now/320)*0.8; break;
    case 'attackStrong':
      e.offX = Math.sin(p*Math.PI)*11; e.offY = -Math.sin(p*Math.PI)*3; break;
    case 'attackWeak':
      e.offX = Math.sin(p*Math.PI)*5; break;
    case 'cast':
      e.offY = -Math.sin(p*Math.PI)*4; break;
    case 'dodge':
      e.offX = -Math.sin(p*Math.PI)*12; e.offY = -Math.sin(p*Math.PI)*7; break;
    case 'hit':
      e.flash = (1-p); e.offX = Math.sin(now/30)*3*(1-p); break;
    case 'die':
      e.flash = Math.max(e.flash,(1-p)*0.6);
      e.alpha = 1-p; e.offY = p*7; e.offX = Math.sin(now/40)*2*(1-p); break;
  }
  if(p>=1 && e.anim!=='idle' && e.anim!=='die'){ e.anim='idle'; e.flash=0; }
}

function updateDragonAnim(now){
  const e=dragon;
  const p = e.animDur? clamp((now-e.animStart)/e.animDur,0,1) : 1;
  e.offX=0; e.offY=0;
  // baseline idle flap + breathing
  e.wing = Math.sin(now/440);
  e.eyeGlow = 0.45 + Math.sin(now/300)*0.25;
  switch(e.anim){
    case 'idle':
      e.offY = Math.sin(now/520)*1.2; e.mouth=0; break;
    case 'windup':
      e.offX = easeOut(p)*5; e.offY = -easeOut(p)*4;
      e.mouth = p*0.45; e.wing = 0.9; e.eyeGlow = 0.9; break;
    case 'strike':
      e.offX = -Math.sin(p*Math.PI)*16; e.offY = Math.sin(p*Math.PI)*3;
      e.mouth = Math.sin(p*Math.PI); e.wing = Math.cos(p*Math.PI*2)*1; e.eyeGlow=1; break;
    case 'recover':
      e.offX = (1-easeOut(p))*5; e.mouth=(1-p)*0.4; break;
    case 'hit':
      e.flash=(1-p); e.offX=Math.sin(now/28)*4*(1-p); e.mouth=0.2*(1-p); break;
    case 'die':
      e.flash=Math.max(e.flash,(1-p)*0.7);
      e.alpha=1-p; e.offY=p*10; e.offX=Math.sin(now/50)*3*(1-p);
      e.mouth=0.3; e.eyeGlow=(1-p)*0.5; break;
  }
  if(p>=1 && e.anim!=='idle' && e.anim!=='die'){ e.anim='idle'; e.flash=0; }
}
