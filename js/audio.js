/* CODE DRAGON — sound effects
   Tiny Web Audio beeps. Adjust frequencies/durations to retune the SFX. */

/* =========================================================
   AUDIO (tiny beeps)
========================================================= */
let AC=null;
function beep(freq, dur=0.08, type="square", vol=0.05){
  if(state.muted) return;
  try{
    AC = AC || new (window.AudioContext||window.webkitAudioContext)();
    const o=AC.createOscillator(), g=AC.createGain();
    o.type=type; o.frequency.value=freq; o.connect(g); g.connect(AC.destination);
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime+dur);
    o.start(); o.stop(AC.currentTime+dur);
  }catch{}
}
const sfx = {
  hitHero:()=>{beep(140,.12,"sawtooth",.06);},
  hitDragon:()=>{beep(520,.08);beep(680,.08);},
  pick:()=>beep(440,.05),
  win:()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>beep(f,.12,"square",.06),i*120));},
  lose:()=>{[300,240,180].forEach((f,i)=>setTimeout(()=>beep(f,.18,"sawtooth",.06),i*160));},
};
