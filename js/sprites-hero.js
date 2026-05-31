"use strict";
/* ============================================================
   PIXEL HERO SPRITES  (12 x 16, '.' = transparent)
   ============================================================ */
const HERO_DATA = {
  mage: {
    name:"MAGE", role:"Back-End Engineer",
    blurb:"Weaver of pixels, layouts & reactive spells.",
    color:"var(--mage)", projectile:"orb", proj:"#5fe6ff",
    palette:{ P:'#7d4fd6', p:'#9a72ea', C:'#36d6e7', S:'#f2c9a0', K:'#241133', B:'#3a2a55' },
    map:[
      "....PPPP....",
      "...PPPPPP...",
      "..PPpPPPP...",
      ".PPPPPPPPPP.",
      "..CCCCCCCC..",
      "...SSSSSS...",
      "...SKSSKS...",
      "...SSSSSS...",
      "..PPPPPPPP..",
      "..PPPCPPPP..",
      ".PPPPPPPPPP.",
      ".PPPPPPPPPP.",
      ".PPPPPPPPPP.",
      "..PPPPPPPP..",
      "..PP....PP..",
      "..BB....BB..",
    ]
  },
  fighter: {
    name:"FIGHTER", role:"Front-End Engineer",
    blurb:"Iron-clad keeper of servers, data & uptime.",
    color:"var(--fighter)", projectile:"melee", proj:"#fff2c0",
    palette:{ A:'#8a93a6', R:'#d23b3b', S:'#f2c9a0', K:'#1a1d28', G:'#e2b53c', B:'#444a59' },
    map:[
      ".....RR.....",
      "...AAAAAA...",
      "..AAAAAAAA..",
      "..AAAAAAAA..",
      "..AKKKKKKA..",
      "..AAAAAAAA..",
      "..GGGGGGGG..",
      ".AAAAAAAAAA.",
      ".AAAAAAAAAA.",
      "..AAAAAAAA..",
      "..AGGGGGGA..",
      "..AAAAAAAA..",
      "..AAAAAAAA..",
      "..AA....AA..",
      "..AA....AA..",
      "..BB....BB..",
    ]
  },
  thief: {
    name:"THIEF", role:"Cyber-Security Expert",
    blurb:"Shadow that finds the cracks before they do.",
    color:"var(--thief)", projectile:"dagger", proj:"#d9ffe8",
    palette:{ H:'#1f6b4a', h:'#2fa06b', S:'#f2c9a0', M:'#16241d', Y:'#e8e24a', L:'#5a4632', B:'#2a2118' },
    map:[
      "...HHHHHH...",
      "..HHHHHHHH..",
      ".HHHHHHHHHH.",
      ".HHSSSSSSHH.",
      ".HHSYSSYSHH.",
      ".HHMMMMMMHH.",
      "..hLLLLLLh..",
      "..LLLLLLLL..",
      ".LLLLLLLLLL.",
      "..LLLLLLLL..",
      "..LLLLLLLL..",
      "..LLLLLLLL..",
      "..LL....LL..",
      "..LL....LL..",
      "..BB....BB..",
      "..BB....BB..",
    ]
  }
};

/* render a hero pixel-map into its own offscreen canvas */
function buildHeroCanvas(key){
  const d = HERO_DATA[key];
  const cols = d.map[0].length, rows = d.map.length;
  const cv = document.createElement('canvas');
  cv.width = cols; cv.height = rows;
  const c = cv.getContext('2d');
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      const ch = d.map[y][x];
      if(ch==='.') continue;
      c.fillStyle = d.palette[ch] || '#f0f';
      c.fillRect(x,y,1,1);
    }
  }
  return {cv, cols, rows};
}
const HERO_CANVAS = {
  mage: buildHeroCanvas('mage'),
  fighter: buildHeroCanvas('fighter'),
  thief: buildHeroCanvas('thief'),
};

/* blit a hero canvas to a ctx with optional red/white flash tint + alpha */
function drawHeroSprite(ctx, key, cx, bottomY, opt={}){
  const hc = HERO_CANVAS[key];
  const {cols,rows,cv} = hc;
  const x = Math.round(cx - cols/2 + (opt.offX||0));
  const y = Math.round(bottomY - rows + (opt.offY||0));
  const flash = opt.flash||0, alpha = opt.alpha==null?1:opt.alpha;
  ctx.save();
  ctx.globalAlpha = alpha;
  if(flash>0){
    tmp.width=cols; tmp.height=rows;
    tctx.clearRect(0,0,cols,rows);
    tctx.globalCompositeOperation='source-over';
    tctx.drawImage(cv,0,0);
    tctx.globalCompositeOperation='source-atop';
    tctx.fillStyle = opt.flashColor || `rgba(255,90,60,${flash})`;
    tctx.fillRect(0,0,cols,rows);
    tctx.globalCompositeOperation='source-over';
    ctx.drawImage(tmp,x,y);
  } else {
    ctx.drawImage(cv,x,y);
  }
  ctx.restore();
}
