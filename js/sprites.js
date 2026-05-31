/* CODE DRAGON — pixel sprites
   PAL = color palette (1 char per color). SPRITES = string maps drawn to canvas.
   Edit a sprite by changing its rows; each character maps to a PAL color, '.' = transparent. */

/* =========================================================
   PIXEL SPRITES  (string maps -> scaled canvas)
========================================================= */
const PAL = {
  '.':null,
  // shared
  k:'#100a1c', w:'#efe8d6', e:'#0a0712',
  // mage (purple)
  m:'#7d4fd6', M:'#9a72ea', s:'#3a2a5e',
  // fighter (red)
  f:'#d23b3b', F:'#ff6a52', a:'#8a8a96', A:'#c8c8d2',
  // thief (green)
  t:'#2fa06b', T:'#46d36b', g:'#16331f',
  // skin / misc
  c:'#e8b98a', y:'#e8c25a', o:'#caa233',
  // dragon
  d:'#7a1f1f', D:'#d23b3b', r:'#ff7a4a', x:'#ffd24a', b:'#120a22',
};

const SPRITES = {
  mage: [
    "...MMM...",
    "..MsssM..",
    "..McccM..",
    "...ccc...",
    "..msmsm..",
    ".mmsssmm.",
    "m.msssm.m",
    "..mm.mm..",
    "..k...k..",
  ],
  fighter: [
    "...aAa...",
    "..acccA..",
    "..acccA..",
    "...ccc...",
    "..fAfAf..",
    ".ffFFFff.",
    "a.fFFFf.A",
    "..ff.ff..",
    "..k...k..",
  ],
  thief: [
    "...ttt...",
    "..tTTTt..",
    "..tcccT..",
    "...ccc...",
    "..tgtgt..",
    ".ttgggtt.",
    "t.tgggt.t",
    "..tt.tt..",
    "..k...k..",
  ],
  dragon: [
    "..d.....d..",
    ".dDd...dDd.",
    "..dDdddDd..",
    ".dDDDDDDDd.",
    "dDDxbDbxDDd",
    "dDDDrrrDDDd",
    ".dDDrxrDDd.",
    "..dDDrDDd..",
    "...dDDDd...",
    "..d.d.d.d..",
  ],
};

function spriteSize(map){ return {cols:map[0].length, rows:map.length}; }
function drawSprite(ctx, map, ox, oy, scale, opts={}){
  const {flash=false, alpha=1} = opts;
  ctx.save(); ctx.globalAlpha = alpha;
  for(let y=0;y<map.length;y++){
    for(let x=0;x<map[y].length;x++){
      const ch = map[y][x];
      let col = PAL[ch];
      if(!col) continue;
      if(flash) col = '#ffffff';
      ctx.fillStyle = col;
      ctx.fillRect(ox + x*scale, oy + y*scale, scale, scale);
    }
  }
  ctx.restore();
}
