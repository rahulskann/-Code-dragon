"use strict";
/* ============================================================
   CODE DRAGON — a turn-based interview RPG
   Single-file: pixel sprites on canvas, animated, with SFX.
   ============================================================ */

/* ---------- world / render constants ---------- */
const WORLD_W = 160, WORLD_H = 90, SCALE = 4;          // stage canvas = 640x360
const GROUND_Y = 74;
const stage = document.getElementById('stage');
const sctx = stage.getContext('2d');
sctx.imageSmoothingEnabled = false;

/* offscreen "world" buffer rendered at low-res, then upscaled */
const world = document.createElement('canvas');
world.width = WORLD_W; world.height = WORLD_H;
const wctx = world.getContext('2d');
wctx.imageSmoothingEnabled = false;

/* shared temp buffer for tinting hero sprites */
const tmp = document.createElement('canvas');
const tctx = tmp.getContext('2d');

/* ---------- tiny helpers ---------- */
const wait = ms => new Promise(r => setTimeout(r, ms));
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
const rand = (a,b)=>a+Math.random()*(b-a);
const easeOut = p => 1-(1-p)*(1-p);
