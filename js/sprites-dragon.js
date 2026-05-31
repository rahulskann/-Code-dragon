"use strict";
/* ============================================================
   PROCEDURAL DRAGON  (drawn to its own offscreen each frame)
   faces LEFT toward the hero.  ~62 x 50 local pixels.
   ============================================================ */
const DRG_W=62, DRG_H=50;
const drgCv=document.createElement('canvas'); drgCv.width=DRG_W; drgCv.height=DRG_H;
const dctx=drgCv.getContext('2d');

function fillEllipse(c,cx,cy,rx,ry,col){
  c.fillStyle=col;
  c.beginPath();c.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);c.fill();
}
function fillTri(c,p,col){
  c.fillStyle=col;c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[2],p[3]);c.lineTo(p[4],p[5]);c.closePath();c.fill();
}

function drawDragon(state){
  const c=dctx;
  c.clearRect(0,0,DRG_W,DRG_H);
  const mouth = state.mouth||0;       // 0..1 jaw open
  const wing  = state.wing||0;        // wing flap angle factor -1..1
  const eye   = state.eyeGlow||0;     // 0..1 pulse

  const RED='#b5341f', RED_D='#7d2114', BELLY='#e0894a', BELLY_D='#c06a30';
  const HORN='#e8dcc0', SPIKE='#3a0f08', WING='#7a1f12', WING_D='#561009';
  const DARK='#2a0d08', TOOTH='#f2efe6';

  /* ---- wing (behind everything), flaps ---- */
  const wbx=42, wby=20, wlen=20+wing*4, wopen=14+wing*8;
  c.save();
  // membrane
  fillTri(c,[wbx,wby, wbx-wlen, wby-wopen, wbx-2, wby+10], WING);
  fillTri(c,[wbx,wby, wbx-wlen+3, wby-wopen-6, wbx-wlen+1, wby-2], WING_D);
  // wing finger bones
  c.strokeStyle=WING_D;c.lineWidth=1;
  c.beginPath();
  c.moveTo(wbx,wby);c.lineTo(wbx-wlen,wby-wopen);
  c.moveTo(wbx,wby);c.lineTo(wbx-wlen+6,wby-wopen+3);
  c.moveTo(wbx,wby);c.lineTo(wbx-wlen+12,wby-2);
  c.stroke();
  c.restore();

  /* ---- tail ---- */
  for(let i=0;i<5;i++){
    const tx=50+i*2.4, ty=34-i*1.2, r=8-i*1.4;
    fillEllipse(c,tx,ty,Math.max(1.5,r),Math.max(1.2,r*0.8),RED);
  }
  fillTri(c,[60,26, 62,20, 56,24], SPIKE); // tail spike

  /* ---- back spikes ---- */
  for(let i=0;i<4;i++){
    const sx=30+i*5, sy=22-i*0.5;
    fillTri(c,[sx,sy, sx+4,sy, sx+2,sy-5], SPIKE);
  }

  /* ---- body ---- */
  fillEllipse(c,38,32,16,13,RED);
  fillEllipse(c,33,38,11,8,BELLY);      // belly
  fillEllipse(c,33,40,9,5,BELLY_D);
  // belly scale lines
  c.strokeStyle=BELLY_D;c.lineWidth=1;
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(26,36+i*3);c.lineTo(40,36+i*3);c.stroke();}

  /* ---- legs ---- */
  fillEllipse(c,44,44,5,4,RED_D);
  fillEllipse(c,28,45,5,4,RED_D);
  fillTri(c,[24,48, 30,48, 27,44], RED_D); // foot claws
  fillTri(c,[24,48, 27,49, 26,46], '#3a1109');

  /* ---- neck ---- */
  c.strokeStyle=RED;c.lineWidth=9;c.lineCap='round';
  c.beginPath();c.moveTo(30,26);c.quadraticCurveTo(20,20,15,18);c.stroke();
  c.strokeStyle=RED_D;c.lineWidth=3;
  c.beginPath();c.moveTo(30,24);c.quadraticCurveTo(21,18,16,16);c.stroke();

  /* ---- head ---- */
  fillEllipse(c,13,16,9,7,RED);
  // snout (points left)
  fillTri(c,[5,15, 14,11, 14,18], RED);
  // brow ridge
  fillTri(c,[10,9, 18,9, 14,13], RED_D);

  /* ---- horns ---- */
  fillTri(c,[15,9, 19,2, 17,10], HORN);
  fillTri(c,[11,9, 14,3, 13,10], HORN);

  /* ---- jaw (opens) ---- */
  const jawDrop = mouth*6;
  // open mouth interior
  if(mouth>0.05){
    c.fillStyle='#2a0606';
    c.beginPath();
    c.moveTo(5,16);c.lineTo(14,15);c.lineTo(14,18+jawDrop);c.lineTo(6,17+jawDrop);
    c.closePath();c.fill();
  }
  // lower jaw
  fillTri(c,[5,17, 14,17, 13,19+jawDrop], RED);
  fillTri(c,[6,17, 12,17, 11,19+jawDrop], RED_D);
  // teeth (upper)
  c.fillStyle=TOOTH;
  c.fillRect(6,15,1,2);c.fillRect(9,15,1,2);c.fillRect(12,15,1,2);
  if(mouth>0.2){ // lower teeth show when open
    c.fillRect(7,16+jawDrop,1,2);c.fillRect(10,16+jawDrop,1,2);
  }

  /* ---- eye (glowing) ---- */
  const g = 0.45+eye*0.55;
  c.fillStyle=`rgba(255,210,60,${g})`;
  fillEllipse(c,11,14,2.6,2.6,`rgba(255,210,60,${g})`);
  c.fillStyle='#fff2a0'; fillEllipse(c,11,14,1.6,1.6,'#ffe27a');
  c.fillStyle=DARK; c.fillRect(11,12.5,1,3); // slit pupil
  // glow halo
  if(eye>0.1){
    c.save();c.globalAlpha=eye*0.4;c.fillStyle='#ffcf4a';
    fillEllipse(c,11,14,4.5,4.5,'#ffcf4a');c.restore();
  }
}
