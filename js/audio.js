"use strict";
/* ============================================================
   SOUND (WebAudio, generated)
   ============================================================ */
const Sfx = (()=> {
  let ac=null, muted=false;
  function ctx(){ if(!ac){ try{ac=new (window.AudioContext||window.webkitAudioContext)();}catch(e){} } return ac; }
  function tone(freq,dur,type='square',vol=0.12,slideTo=null){
    if(muted) return; const a=ctx(); if(!a) return;
    const o=a.createOscillator(), g=a.createGain();
    o.type=type; o.frequency.setValueAtTime(freq,a.currentTime);
    if(slideTo) o.frequency.exponentialRampToValueAtTime(slideTo,a.currentTime+dur);
    g.gain.setValueAtTime(vol,a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+dur);
    o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime+dur);
  }
  function noise(dur,vol=0.2){
    if(muted) return; const a=ctx(); if(!a) return;
    const n=a.sampleRate*dur, buf=a.createBuffer(1,n,a.sampleRate), d=buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i]=(Math.random()*2-1)*(1-i/n);
    const s=a.createBufferSource(), g=a.createGain(), f=a.createBiquadFilter();
    f.type='lowpass'; f.frequency.value=900; g.gain.value=vol;
    s.buffer=buf; s.connect(f).connect(g).connect(a.destination); s.start();
  }
  return {
    correct(){ tone(660,0.08); setTimeout(()=>tone(880,0.1),80); setTimeout(()=>tone(1180,0.12),170); },
    wrong(){ tone(200,0.18,'sawtooth',0.14,90); },
    hitHero(){ noise(0.18,0.25); tone(120,0.15,'square',0.1,60); },
    hitDragon(){ tone(380,0.06); setTimeout(()=>noise(0.12,0.18),40); },
    dodge(){ tone(900,0.06,'sine',0.1,1500); },
    cast(){ tone(500,0.12,'triangle',0.1,1100); },
    slash(){ noise(0.1,0.18); tone(700,0.05,'square',0.08,1400); },
    charge(){ [440,660,880,1320].forEach((f,i)=>setTimeout(()=>tone(f,0.1,'triangle',0.1),i*70)); },
    special(){ tone(180,0.3,'sawtooth',0.14,1600); setTimeout(()=>{noise(0.25,0.3); tone(1200,0.2,'square',0.1,300);},120); },
    win(){ [523,659,784,1046].forEach((f,i)=>setTimeout(()=>tone(f,0.18,'square',0.12),i*150)); },
    lose(){ [400,330,260,180].forEach((f,i)=>setTimeout(()=>tone(f,0.25,'sawtooth',0.12),i*180)); },
    toggle(){ muted=!muted; if(!muted){tone(880,0.06);} return muted; },
    isMuted(){ return muted; },
    resume(){ const a=ctx(); if(a&&a.state==='suspended') a.resume(); }
  };
})();
document.getElementById('muteBtn').addEventListener('click',function(){
  const m=Sfx.toggle(); this.textContent = m? '♪ OFF':'♪ ON';
  if(m && typeof stopVoice==='function') stopVoice();   // also silence character voices
});
