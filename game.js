/* Equestria Girls - Dance Studio :: HTML5 port
   Rebuilt from the original Flash build (BFF framework, AS3).
   Art / audio extracted from the original SWFs; game logic reimplemented. */

(function () {
"use strict";

const W = 800, H = 600, FPS = 24;
let wide = false;          // 16:9 letterbox-free mode
let VW = W, offX = 0;      // view width and the stage's x offset inside it
const AR_MIN = 4 / 3, AR_MAX = 21 / 9;
/* the stage as a place: AX is its centre line, FLOOR_Y the line the dancers
   stand on. Widening the view zooms the world about that point, so the floor
   never moves and nobody ends up dancing in mid-air. */
const AX = 400, FLOOR_Y = 415;
let WK = 1;                // world zoom for the current view
function setWide(on, ratio) {
  wide = on;
  let ar = wide ? (ratio || 16 / 9) : 4 / 3;
  ar = Math.max(AR_MIN, Math.min(AR_MAX, ar));
  VW = Math.round(H * ar);
  offX = Math.round((VW - W) / 2);
  WK = worldK();
  crowdCache.key = null;
}
/* smallest uniform zoom that still lets the backdrop reach both edges */
function worldK() {
  if (!wide) return 1;
  const b = partBox("stage_bg", "1", [1, 0, 0, 1, -3.2, -0.4]);
  if (!b.w) return 1;
  const L = b.x, R = b.x + b.w, needL = -offX, needR = VW - offX;
  let k = 1;
  if (L > needL) k = Math.max(k, (AX - needL) / (AX - L));
  if (R < needR) k = Math.max(k, (needR - AX) / (R - AX));
  return k * 1.004;                       // hairline of overlap, no edge gap
}
function worldM(m) {
  if (!wide) return m;
  return [m[0] * WK, m[1] * WK, m[2] * WK, m[3] * WK,
          AX + (m[4] - AX) * WK, FLOOR_Y + (m[5] - FLOOR_Y) * WK];
}
function worldX(x) { return wide ? AX + (x - AX) * WK : x; }
function worldY(y) { return wide ? FLOOR_Y + (y - FLOOR_Y) * WK : y; }
function worldS(s) { return wide ? s * WK : s; }
/* widen a placement matrix so backdrops reach the edges of a 16:9 view.
   "x" stretches horizontally about the stage centre, "both" scales uniformly. */
function seamM(m, dir) {          // nudge a curtain half toward the centre
  return [m[0], m[1], m[2], m[3], m[4] + dir * 1.5, m[5]];
}
/* The crowd is one fixed strip of silhouettes, too narrow for a wide view.
   Rather than blowing it up until it swallows the stage, it is repeated
   left and right, every other copy mirrored so the copies join without a
   seam, and the whole row is composed once into an offscreen canvas. */
const crowdCache = { key: null, cv: null, w: 0, x0: 0, h: 0 };
function drawCrowd(m) {
  const wm = worldM(m);
  const e = UI.crowd;
  if (!wide || !e) { drawPart("crowd", "1", wm); return; }
  const z = e.z || 1, cw = e.f["1"].w / z, ch = e.f["1"].h / z, k = wm[0];
  const seg = k * cw;
  const L0 = wm[4] - k * e.ox, T0 = wm[5] - k * e.oy;
  const nL = Math.max(0, Math.ceil((L0 - (-offX - 2)) / seg));
  const nR = Math.max(0, Math.ceil((VW - offX + 2 - (L0 + seg)) / seg));
  const x0 = L0 - nL * seg;

  function paintRow(originX, originY) {
    for (let i = 0; i <= nL + nR; i++) {
      const left = originX + i * seg;
      if ((i - nL) & 1) drawPart("crowd", "1", [-k, 0, 0, k, left + k * (cw - e.ox), originY + k * e.oy]);
      else drawPart("crowd", "1", [k, 0, 0, k, left + k * e.ox, originY + k * e.oy]);
    }
  }
  if (loaded < total) { paintRow(x0, T0); return; }

  const key = VW + "|" + Math.round(baseScale * 100) + "|" + Math.round(k * 1000) +
              "|" + (nL + nR);
  if (crowdCache.key !== key) {
    if (!crowdCache.cv) crowdCache.cv = document.createElement("canvas");
    const cw2 = Math.max(1, Math.ceil((nL + 1 + nR) * seg * baseScale) + 2);
    const ch2 = Math.max(1, Math.ceil(k * ch * baseScale) + 2);
    crowdCache.cv.width = cw2; crowdCache.cv.height = ch2;
    const c = crowdCache.cv.getContext("2d");
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.setTransform(baseScale, 0, 0, baseScale, 0, 0);
    const prev = ctx;
    _swapCtx(c);
    paintRow(0, 0);
    _swapCtx(prev);
    crowdCache.key = key;
    crowdCache.w = cw2 / baseScale;
    crowdCache.h = ch2 / baseScale;
  }
  ctx.drawImage(crowdCache.cv, x0, T0, crowdCache.w, crowdCache.h);
}

function wideM(m, mode) {
  if (!wide) return m;
  const k = VW / W;                       // uniform scale, never distort
  const ay = mode === "bottom" ? H : (mode === "top" ? 0 : 300);
  return [m[0] * k, m[1] * k, m[2] * k, m[3] * k,
          400 + (m[4] - 400) * k, ay + (m[5] - ay) * k];
}
const cv = document.getElementById("stage");
let ctx = cv.getContext("2d");
const mainCtx = ctx;
function _swapCtx(c) { ctx = c; }

/* ---------------------------------------------------------------- assets */
const IMG = {};
const SND = {};
let loaded = 0, total = 0;

const AUDIO_FILES = ["Disco", "Techno", "PopRock", "Country", "ButtonClicked",
  "ButtonRollOver", "CameraClicked", "SelectionSFX", "IdleSFX",
  "50SFX", "75SFX", "90SFX", "100SFX"];

function checkAllLoaded() {
  if (loaded >= total && !warmTotal) warmUp();
}
function loadImage(path) {
  total++;
  const im = new Image();
  im.onload = im.onerror = () => { loaded++; checkAllLoaded(); };
  im.src = "assets/" + path;
  IMG[path] = im;
  return im;
}

let warmed = 0, warmTotal = 0;
function warmUp() {
  const keys = Object.keys(IMG);
  warmTotal = keys.length;
  let i = 0;
  const off = document.createElement("canvas");
  off.width = off.height = 8;
  const o = off.getContext("2d");
  const canBitmap = typeof createImageBitmap === "function";

  function fallback(im) {
    try { if (im && im.width) o.drawImage(im, 0, 0, 1, 1); } catch (e) {}
  }
  function step() {
    if (i >= keys.length) return;
    const key = keys[i++];
    const im = IMG[key];
    // animation atlases are the ones that must never be re-decoded
    if (canBitmap && key.indexOf("anim/") === 0 && im && im.width) {
      createImageBitmap(im).then(bm => {
        IMG[key] = bm;
        warmed++; step();
      }).catch(() => { fallback(im); warmed++; step(); });
      return;
    }
    fallback(im);
    warmed++;
    if (warmed % 12 === 0) requestAnimationFrame(step); else step();
  }
  step();
}

function preload() {
  const files = new Set();
  for (const k in UI) for (const f in UI[k].f) files.add("ui/" + UI[k].f[f].file);
  for (const k in ANIM) files.add("anim/" + ANIM[k].file);
  ["img/ART_Logo_EG.png", "img/game_logo.png", "img/Hud_ART_Logo_DanceStudio.png"].forEach(f => files.add(f));
  files.add("ui/splash_hd.webp");
  files.forEach(loadImage);
  AUDIO_FILES.forEach(n => {
    total++;
    const a = new Audio("assets/audio/" + n + ".mp3");
    a.preload = "auto";
    a.addEventListener("canplaythrough", () => { loaded++; checkAllLoaded(); }, { once: true });
    a.addEventListener("error", () => { loaded++; checkAllLoaded(); }, { once: true });
    SND[n] = a;
  });
}

/* ----------------------------------------------------------------- sound */
let muted = false;
let music = null;
let volMusic = 0.9, volSfx = 0.55;

const sfxPool = {};
function sfx(name, vol) {
  if (muted || !SND[name]) return;
  let pool = sfxPool[name];
  if (!pool) pool = sfxPool[name] = [];
  let a = null;
  for (const c of pool) if (c.paused || c.ended) { a = c; break; }
  if (!a) {
    if (pool.length >= 4) { a = pool[0]; }
    else { a = SND[name].cloneNode(); pool.push(a); }
  }
  try { a.currentTime = 0; } catch (e) {}
  a.volume = Math.max(0, Math.min(1, (vol === undefined ? 1 : vol) * volSfx));
  a.play().catch(() => {});
}
function playMusic(name, from) {
  stopMusic();
  const a = SND[name];
  if (!a) return;
  music = a;
  a.currentTime = from || 0;
  a.volume = muted ? 0 : volMusic;
  a.play().catch(() => {});
}
function stopMusic() {
  if (music) { music.pause(); music.currentTime = 0; music = null; }
}
function pauseMusic() { if (music) music.pause(); }
function resumeMusic() { if (music) music.play().catch(() => {}); }

function saveSettings() {
  try {
    localStorage.setItem("egds", JSON.stringify(
      { volMusic, volSfx, muted, wide, wideLocked, lang }));
  } catch (e) {}
}
function loadSettings() {
  try {
    const o = JSON.parse(localStorage.getItem("egds") || "{}");
    if (typeof o.volMusic === "number") volMusic = o.volMusic;
    if (typeof o.volSfx === "number") volSfx = o.volSfx;
    if (typeof o.muted === "boolean") muted = o.muted;
    if (o.lang === "ru" || o.lang === "en") lang = o.lang;
    if (typeof o.wide === "boolean" && o.wideLocked) { wideLocked = true; setWide(o.wide); }
  } catch (e) {}
}

/* cached static backdrop: the big art is redrawn only when something changes */
const bgCache = { key: null, cv: null, cx: null };
function drawBackdrop(key, paint) {
  if (loaded < total || warmed < warmTotal) {   // still loading: draw live
    bgCache.key = null;
    paint();
    return;
  }
  const full = key + "|" + VW + "|" + (wide ? 1 : 0) + "|" + Math.round(baseScale * 100);
  if (bgCache.key !== full) {
    if (!bgCache.cv) {
      bgCache.cv = document.createElement("canvas");
      bgCache.cx = bgCache.cv.getContext("2d");
    }
    const w = Math.max(1, Math.ceil(VW * baseScale) + 1);
    const h = Math.max(1, Math.ceil(H * baseScale) + 1);
    if (bgCache.cv.width !== w || bgCache.cv.height !== h) {
      bgCache.cv.width = w; bgCache.cv.height = h;
    }
    const c = bgCache.cx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, w, h);
    c.setTransform(baseScale, 0, 0, baseScale, 0, 0);
    c.translate(offX, 0);
    const prev = ctx;
    _swapCtx(c);
    paint();
    _swapCtx(prev);
    bgCache.key = full;
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bgCache.cv, 0, 0);
  ctx.restore();
}

/* -------------------------------------------------------------- drawing */
function uiFrame(name, frame) {
  const e = UI[name];
  if (!e) return null;
  const keys = Object.keys(e.f);
  const f = e.f[frame] || e.f[keys[0]];
  return { e, f, img: IMG["ui/" + f.file] };
}

/* draw a UI part with a Flash-style matrix [a,b,c,d,tx,ty] */
function drawPart(name, frame, m, alpha) {
  const r = uiFrame(name, frame);
  if (!r || !r.img || !r.img.width) return;
  const z = r.e.z || 1;
  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  ctx.drawImage(r.img, -r.e.ox, -r.e.oy, r.f.w / z, r.f.h / z);
  ctx.restore();
}

/* axis-aligned bounds of a placed part, in stage coordinates */
function partBox(name, frame, m) {
  const r = uiFrame(name, frame);
  if (!r) return { x: 0, y: 0, w: 0, h: 0 };
  const z = r.e.z || 1;
  const x0 = -r.e.ox, y0 = -r.e.oy, x1 = x0 + r.f.w / z, y1 = y0 + r.f.h / z;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < 4; i++) {
    const px = i & 1 ? x1 : x0, py = i & 2 ? y1 : y0;
    const tx = m[0] * px + m[2] * py + m[4];
    const ty = m[1] * px + m[3] * py + m[5];
    if (tx < minX) minX = tx; if (tx > maxX) maxX = tx;
    if (ty < minY) minY = ty; if (ty > maxY) maxY = ty;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/* matrix for a kid of a scene at a given frame */
function kidM(scene, i, frame) {
  const sc = SCENES[scene], kid = sc.kids[i];
  const tl = sc.timeline[String(i)];
  if (tl) {
    if (tl[String(frame)]) return tl[String(frame)];
    // hold last defined frame <= requested
    let best = null, bestF = -1;
    for (const k in tl) { const f = +k; if (f <= frame && f > bestF) { bestF = f; best = tl[k]; } }
    if (best) return best;
  }
  return kid.m;
}

function drawScene(scene, frame, opts) {
  opts = opts || {};
  const sc = SCENES[scene];
  const skip = opts.skip || [];
  const frames = opts.frames || {};
  for (let i = 0; i < sc.kids.length; i++) {
    if (skip.indexOf(i) >= 0) continue;
    const kid = sc.kids[i];
    const name = IDMAP[kid.id];
    if (!name || !UI[name]) continue;
    drawPart(name, frames[i] || opts.frameOf && opts.frameOf(i, kid) || firstFrame(name), kidM(scene, i, frame));
  }
}
function firstFrame(name) { return Object.keys(UI[name].f)[0]; }

/* animated character sheets */
function drawAnim(key, frame, x, y, scale) {
  const a = ANIM[key];
  if (!a) return;
  const img = IMG["anim/" + a.file];
  if (!img || !img.width) return;
  let i = Math.max(0, Math.min(a.frames - 1, frame | 0));
  if (a.map) i = a.map[i];
  const cx = i % a.cols, cy = (i / a.cols) | 0;
  const s = scale === undefined ? 1 : scale;
  const z = a.z || 1;
  ctx.save();
  ctx.imageSmoothingQuality = "low";
  ctx.transform(s, 0, 0, s, x, y);
  ctx.drawImage(img, cx * a.fw, cy * a.fh, a.fw, a.fh, -a.ox, -a.oy, a.fw / z, a.fh / z);
  ctx.restore();
}

function text(str, x, y, size, align, color, outline) {
  ctx.save();
  ctx.font = size + "px " + fontFamily();
  ctx.textAlign = align || "center";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";
  if (outline !== "none") {
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.strokeStyle = outline || "rgba(45,10,55,0.85)";
    ctx.strokeText(str, x, y);
  }
  ctx.fillStyle = color || "#fff";
  ctx.fillText(str, x, y);
  ctx.restore();
}

/* --------------------------------------------------------------- buttons */
const hot = [];            // clickable regions for the current frame
let mouse = { x: -1, y: -1, down: false };

function hit(box, onClick, opts) {
  hot.push({ box, onClick, opts: opts || {} });
}
function boxOfPart(name, frame, m, pad) {
  const b = partBox(name, frame, m);
  const p = pad || 0;
  return { x: b.x - p, y: b.y - p, w: b.w + 2 * p, h: b.h + 2 * p };
}
function inBox(b, x, y) { return x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h; }

function hoverGlow(b, on) {
  if (!on || touching || mouse.x < 0) return;
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = "#ffe6ff";
  ctx.beginPath();
  const r = Math.min(b.w, b.h) * 0.25;
  roundRect(ctx, b.x, b.y, b.w, b.h, r);
  ctx.fill();
  ctx.restore();
}
function drawSlot(x, y, size) {
  const h = size / 2;
  ctx.save();
  ctx.fillStyle = "rgba(58,22,72,0.55)";
  roundRect(ctx, x - h, y - h, size, size, 9); ctx.fill();
  ctx.strokeStyle = "rgba(226,180,240,0.75)"; ctx.lineWidth = 2;
  roundRect(ctx, x - h, y - h, size, size, 9); ctx.stroke();
  ctx.restore();
}
function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r); c.closePath();
}

/* ------------------------------------------------------------- language */
let lang = "en";
const STR = {
  en: {
    play: "PLAY", match: "MATCH GAME", create: "CREATE", dance: "A DANCE",
    chooseSong: "CHOOSE YOUR SONG", chooseDancer: "CHOOSE YOUR DANCER",
    watchLearn: "WATCH AND LEARN", watchClosely: "WATCH CLOSELY...",
    learnMoves: "LEARN THE MOVES!", matchMoves: "MATCH THE MOVES",
    showtime: "IT'S SHOWTIME!", ready: "Ready to start?",
    takePic: "Take a pic!",
    great: "GREAT PERFORMANCE!", perfect: "Perfect! Every move matched!",
    goodJob: "Great job!", niceTry: "Nice try!", practise: "Keep practising!",
    ownDance: "Your own dance!",
    noPics: "No pictures taken", school: "Canterlot High",
    yearbook: "yearbook spread",
    howTo: "HOW TO PLAY",
    steps: ["Watch the dance", "Memorize the dance", "Recreate the dance",
            "Watch your performance", "Take pictures!"],
    settings: "SETTINGS", music: "Music", sfxVol: "Sound effects",
    language: "Language", loading: "Loading\u2026",
  },
  ru: {
    play: "\u0418\u0413\u0420\u0410\u0422\u042c", match: "\u041f\u041e\u0412\u0422\u041e\u0420\u0418 \u0422\u0410\u041d\u0415\u0426",
    create: "\u0421\u041e\u0417\u0414\u0410\u0422\u042c", dance: "\u0421\u0412\u041e\u0419 \u0422\u0410\u041d\u0415\u0426",
    chooseSong: "\u0412\u042b\u0411\u0415\u0420\u0418 \u041f\u0415\u0421\u041d\u042e",
    chooseDancer: "\u0412\u042b\u0411\u0415\u0420\u0418 \u0422\u0410\u041d\u0426\u041e\u0412\u0429\u0418\u0426\u0423",
    watchLearn: "\u0421\u041c\u041e\u0422\u0420\u0418 \u0418 \u0417\u0410\u041f\u041e\u041c\u0418\u041d\u0410\u0419",
    watchClosely: "\u0421\u043c\u043e\u0442\u0440\u0438 \u0432\u043d\u0438\u043c\u0430\u0442\u0435\u043b\u044c\u043d\u043e...",
    learnMoves: "\u0417\u0430\u043f\u043e\u043c\u043d\u0438 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f!",
    matchMoves: "\u041f\u041e\u0412\u0422\u041e\u0420\u0418 \u0414\u0412\u0418\u0416\u0415\u041d\u0418\u042f",
    showtime: "\u0412\u0420\u0415\u041c\u042f \u0412\u042b\u0421\u0422\u0423\u041f\u0410\u0422\u042c!",
    ready: "\u0413\u043e\u0442\u043e\u0432(\u0430) \u043d\u0430\u0447\u0430\u0442\u044c?",
    takePic: "\u0424\u043e\u0442\u043e!",
    great: "\u041e\u0422\u041b\u0418\u0427\u041d\u041e\u0415 \u0412\u042b\u0421\u0422\u0423\u041f\u041b\u0415\u041d\u0418\u0415!",
    perfect: "\u0418\u0434\u0435\u0430\u043b\u044c\u043d\u043e! \u0412\u0441\u0435 \u0434\u0432\u0438\u0436\u0435\u043d\u0438\u044f \u0441\u043e\u0432\u043f\u0430\u043b\u0438!",
    goodJob: "\u041e\u0442\u043b\u0438\u0447\u043d\u0430\u044f \u0440\u0430\u0431\u043e\u0442\u0430!",
    niceTry: "\u041d\u0435\u043f\u043b\u043e\u0445\u043e!",
    practise: "\u0415\u0449\u0451 \u043f\u043e\u0442\u0440\u0435\u043d\u0438\u0440\u0443\u0439\u0441\u044f!",
    ownDance: "\u0422\u0432\u043e\u0439 \u0441\u043e\u0431\u0441\u0442\u0432\u0435\u043d\u043d\u044b\u0439 \u0442\u0430\u043d\u0435\u0446!",
    noPics: "\u0424\u043e\u0442\u043e\u0433\u0440\u0430\u0444\u0438\u0439 \u043d\u0435\u0442",
    school: "\u041a\u0430\u043d\u0442\u0435\u0440\u043b\u043e\u0442",
    yearbook: "\u0448\u043a\u043e\u043b\u044c\u043d\u044b\u0439 \u0430\u043b\u044c\u0431\u043e\u043c",
    howTo: "\u041a\u0410\u041a \u0418\u0413\u0420\u0410\u0422\u042c",
    steps: ["\u0421\u043c\u043e\u0442\u0440\u0438 \u0442\u0430\u043d\u0435\u0446",
            "\u0417\u0430\u043f\u043e\u043c\u043d\u0438 \u0442\u0430\u043d\u0435\u0446",
            "\u041f\u043e\u0432\u0442\u043e\u0440\u0438 \u0442\u0430\u043d\u0435\u0446",
            "\u041f\u043e\u0441\u043c\u043e\u0442\u0440\u0438 \u0432\u044b\u0441\u0442\u0443\u043f\u043b\u0435\u043d\u0438\u0435",
            "\u0421\u0434\u0435\u043b\u0430\u0439 \u0444\u043e\u0442\u043e!"],
    settings: "\u041d\u0410\u0421\u0422\u0420\u041e\u0419\u041a\u0418",
    music: "\u041c\u0443\u0437\u044b\u043a\u0430",
    sfxVol: "\u0417\u0432\u0443\u043a\u0438",
    language: "\u042f\u0437\u044b\u043a",
    loading: "\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430\u2026",
  },
};
function setLang(v) { lang = v; }
function T(k) { return (STR[lang] && STR[lang][k]) || STR.en[k]; }
function fontFamily() {
  return lang === "ru" ? "Pangolin, 'Comic Sans MS', cursive"
                       : "StoveTop, 'Comic Sans MS', sans-serif";
}

/* ------------------------------------------------------------ game state */
const CHARS = ["twilight", "fluttershy", "pinkie", "applejack", "rarity", "rainbow"];
const PORTRAIT_FRAME = { applejack: "1", fluttershy: "10", pinkie: "20", rainbow: "30", rarity: "40", twilight: "50" };
const SONGS = ["Disco", "Techno", "PopRock", "Country"];
const SONG_ART = { Disco: "song_disco", Techno: "song_techno", PopRock: "song_rock", Country: "song_country" };
const SONG_BG = { Disco: "2", Techno: "3", PopRock: "4", Country: "5" };
const SONG_LABEL = { Disco: "DISCO", Techno: "TECHNO", PopRock: "ROCK", Country: "COUNTRY" };

const G = {
  mode: "joinme",
  song: null,
  character: null,
  friends: [],
  sequence: [],      // ["Idle",3,"Idle",5,...]
  created: [],
  photos: [],
  stars: 0,
};

function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0;[a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function buildSequence() {
  const order = shuffle([1, 2, 3, 4, 5, 6]);
  const seq = ["Idle"];
  order.forEach(m => { seq.push(m); seq.push("Idle"); });
  return seq;
}
function seqFromSlots(slots) {
  const seq = ["Idle"];
  slots.forEach(s => { seq.push(s === null ? "Idle" : s); seq.push("Idle"); });
  return seq;
}
function animKey(chr, move) { return chr + "_" + (move === "Idle" ? "idle" : move); }

/* ------------------------------------------------------------ dance rig  */
/* Plays a sequence of 60-frame clips across a set of dancer slots. */
function Dance(slots, seq, chars) {
  this.slots = slots;         // [{x,y,scale,char}]
  this.seq = seq;
  this.chars = chars;
  this.i = 0; this.f = 0; this.playing = false; this.done = false;
}
Dance.prototype.start = function () { this.i = 0; this.f = 0; this.playing = true; this.done = false; };
Dance.prototype.tick = function () {
  if (!this.playing) return;
  this.f++;
  if (this.f >= 60) {
    this.f = 0; this.i++;
    if (this.i >= this.seq.length) { this.playing = false; this.done = true; this.i = this.seq.length - 1; this.f = 59; }
  }
};
Dance.prototype.move = function () { return this.seq[Math.min(this.i, this.seq.length - 1)]; };
Dance.prototype.draw = function () {
  const mv = this.playing || this.done ? this.move() : "Idle";
  for (const s of this.slots) {
    const key = animKey(s.char, mv);
    const fr = this.playing ? this.f : (idleClock % 60);
    drawAnim(key, fr, worldX(s.x), worldY(s.y), worldS(s.scale));
  }
};
let idleClock = 0;

/* --------------------------------------------------------------- screens */
let screen = null;
const Screens = {};
function go(name, arg) {
  if (screen && screen.leave) screen.leave();
  screen = Screens[name];
  screen.name = name;
  if (screen.enter) screen.enter(arg);
}

/* HUD (sound + how-to), drawn over the in-game screens */
function drawHud(opts) {
  opts = opts || {};
  const sc = SCENES.hud;
  if (!opts.noCurtain) drawPart("curtain_top", "1", wideM(sc.kids[0].m, "top"));
  if (!opts.noLogo) {
    const logo = IMG["img/Hud_ART_Logo_DanceStudio.png"];
    if (logo && logo.width) ctx.drawImage(logo, 12 - offX, 6, 78, 78);
  }
  // top-right cluster: drawn by hand so every icon shares one baseline
  const R = W + offX - 20, cyTop = 42, D = 42, GAP = 10;
  let x = R - D / 2;

  function chip(w, h, label, onClick) {
    const b = { x: x - w / 2, y: cyTop - h / 2, w, h };
    ctx.save();
    ctx.fillStyle = "rgba(88,26,96,0.92)";
    roundRect(ctx, b.x, b.y, w, h, Math.min(w, h) / 2.6); ctx.fill();
    ctx.strokeStyle = "rgba(240,190,250,0.95)"; ctx.lineWidth = 2.5;
    roundRect(ctx, b.x, b.y, w, h, Math.min(w, h) / 2.6); ctx.stroke();
    ctx.restore();
    if (label) text(label, x, cyTop + 1, 18, "center", "#fff", "rgba(40,8,50,0.9)");
    hit(b, onClick);
    return b;
  }
  function circle(onClick) {
    const b = { x: x - D / 2, y: cyTop - D / 2, w: D, h: D };
    ctx.save();
    ctx.fillStyle = "rgba(88,26,96,0.92)";
    ctx.beginPath(); ctx.arc(x, cyTop, D / 2, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(240,190,250,0.95)"; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, cyTop, D / 2 - 1, 0, 7); ctx.stroke();
    ctx.restore();
    hit(b, onClick);
    return b;
  }

  // "?"
  circle(() => { sfx("ButtonClicked"); howto.open = true; });
  text("?", x, cyTop + 2, 26, "center", "#ffe9ff", "rgba(40,8,50,0.9)");
  x -= D + GAP;

  // speaker
  circle(() => {
    muted = !muted; if (music) music.volume = muted ? 0 : volMusic;
    saveSettings(); sfx("ButtonClicked");
  });
  ctx.save();
  ctx.translate(x, cyTop);
  ctx.fillStyle = muted ? "rgba(255,233,255,0.45)" : "#ffe9ff";
  ctx.beginPath();
  ctx.moveTo(-9, -4); ctx.lineTo(-3, -4); ctx.lineTo(3, -10);
  ctx.lineTo(3, 10); ctx.lineTo(-3, 4); ctx.lineTo(-9, 4);
  ctx.closePath(); ctx.fill();
  if (!muted) {
    ctx.strokeStyle = "#ffe9ff"; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(4, 0, 7, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(4, 0, 11, -0.9, 0.9); ctx.stroke();
  } else {
    ctx.strokeStyle = "#ff7a7a"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-11, -11); ctx.lineTo(11, 11); ctx.stroke();
  }
  ctx.restore();
  x -= D + GAP;

  // fullscreen (phones have no F key)
  circle(() => { sfx("ButtonClicked"); toggleFullscreen(); });
  ctx.save();
  ctx.translate(x, cyTop);
  ctx.strokeStyle = "#ffe9ff"; ctx.lineWidth = 2.6;
  ctx.lineCap = "round"; ctx.lineJoin = "round";
  const fsOn = !!(document.fullscreenElement || document.webkitFullscreenElement);
  const a1 = fsOn ? 5 : 10, a2 = fsOn ? 10 : 5;
  for (let q = 0; q < 4; q++) {
    ctx.save();
    ctx.rotate(q * Math.PI / 2);
    ctx.beginPath();
    ctx.moveTo(-a1, -a2 - 2); ctx.lineTo(-a1, -a1 - 2); ctx.lineTo(-a2, -a1 - 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
  x -= D + GAP;

  // gear
  circle(() => { sfx("ButtonClicked"); settings.open = true; });
  ctx.save();
  ctx.translate(x, cyTop);
  ctx.fillStyle = "#ffe9ff";
  for (let i = 0; i < 8; i++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-2.6, -13.5, 5.2, 6); }
  ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill();
  ctx.fillStyle = "rgba(88,26,96,1)";
  ctx.beginPath(); ctx.arc(0, 0, 3.6, 0, 7); ctx.fill();
  ctx.restore();
  x -= D / 2 + GAP;

  // aspect chip
  const aw = 58, ah = 32;
  x -= aw / 2;
  chip(aw, ah, wide ? "16:9" : "4:3", () => {
    sfx("ButtonClicked"); wideLocked = true; setWide(!wide); resize(); saveSettings();
  });
}

/* settings panel */
const settings = {
  open: false,
  drag: null,
  rows() {
    const PW = 520, PH = 436, px = 400 - PW / 2, py = 300 - PH / 2;
    return {
      PW, PH, px, py,
      music: { x: px + 176, y: py + 116, w: 268 },
      sfx:   { x: px + 176, y: py + 182, w: 268 },
      en:    { x: px + 176, y: py + 226, w: 128, h: 40 },
      ru:    { x: px + 316, y: py + 226, w: 128, h: 40 },
      tg:    { x: px + 46, y: py + 288, w: PW - 92, h: 44 },
      gh:    { x: px + 46, y: py + 338, w: PW - 92, h: 44 },
    };
  },
  slider(r, value, label) {
    ctx.save();
    ctx.fillStyle = "rgba(140,90,160,0.35)";
    roundRect(ctx, r.x, r.y - 7, r.w, 14, 7); ctx.fill();
    ctx.fillStyle = "#e35fd0";
    roundRect(ctx, r.x, r.y - 7, Math.max(14, r.w * value), 14, 7); ctx.fill();
    const kx = r.x + r.w * value;
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(kx, r.y, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = "#8e2a86"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(kx, r.y, 13, 0, 7); ctx.stroke();
    ctx.restore();
    text(label, r.x, r.y - 26, 20, "left", "#5b1a63", "none");
    text(Math.round(value * 100) + "%", r.x + r.w, r.y - 26, 20, "right", "#a24bb0", "none");
  },
  linkBtn(b, label, sub) {
    const hot2 = inBox(b, mouse.x, mouse.y) && mouse.x >= 0;
    ctx.save();
    ctx.fillStyle = hot2 ? "#a03aa8" : "#8e2a86";
    roundRect(ctx, b.x, b.y, b.w, b.h, 13); ctx.fill();
    ctx.restore();
    text(label, b.x + 18, b.y + b.h / 2 + 1, 21, "left", "#fff", "rgba(40,8,50,0.85)");
    text(sub, b.x + b.w - 18, b.y + b.h / 2 + 1, 17, "right", "#f0c7f6", "none");
  },
  draw() {
    if (!this.open) return;
    hit({ x: -offX, y: 0, w: VW, h: H }, () => { this.open = false; saveSettings(); });
    const r = this.rows();
    ctx.save();
    ctx.fillStyle = "rgba(18,4,28,0.8)";
    ctx.fillRect(-offX, 0, VW, H);
    ctx.fillStyle = "#fdf7ff";
    roundRect(ctx, r.px, r.py, r.PW, r.PH, 26); ctx.fill();
    ctx.strokeStyle = "#8e2a86"; ctx.lineWidth = 5;
    roundRect(ctx, r.px, r.py, r.PW, r.PH, 26); ctx.stroke();
    ctx.fillStyle = "#8e2a86";
    roundRect(ctx, r.px, r.py, r.PW, 62, 26); ctx.fill();
    ctx.fillRect(r.px, r.py + 40, r.PW, 22);
    ctx.restore();
    text(T("settings"), r.px + r.PW / 2 - 20, r.py + 31, 26, "center", "#fff", "rgba(60,10,70,0.9)");

    this.slider(r.music, volMusic, T("music"));
    this.slider(r.sfx, volSfx, T("sfxVol"));
    text(T("language"), r.px + 46, r.en.y + 20, 20, "left", "#5b1a63", "none");
    for (const code of ["en", "ru"]) {
      const b = r[code], on = lang === code;
      ctx.save();
      ctx.fillStyle = on ? "#e35fd0" : "rgba(140,90,160,0.28)";
      roundRect(ctx, b.x, b.y, b.w, b.h, 12); ctx.fill();
      ctx.restore();
      text(code === "en" ? "English" : "\u0420\u0443\u0441\u0441\u043a\u0438\u0439",
           b.x + b.w / 2, b.y + b.h / 2 + 1, 19, "center",
           on ? "#fff" : "#7b4a88", on ? "rgba(90,20,100,0.85)" : "none");
      hit(b, () => { sfx("ButtonClicked"); lang = code; saveSettings(); });
    }

    this.linkBtn(r.tg, "Telegram", "@VestronVulture");
    this.linkBtn(r.gh, "GitHub", "sewerdev");

    hit(r.tg, () => { sfx("ButtonClicked"); openLink("https://t.me/VestronVulture"); });
    hit(r.gh, () => { sfx("ButtonClicked"); openLink("https://github.com/sewerdev/"); });

    const cb = [r.px + r.PW - 34, r.py + 30];
    drawPart("btn_close", "1", [0.62, 0, 0, 0.62, cb[0], cb[1]]);
    hit({ x: cb[0] - 26, y: cb[1] - 26, w: 52, h: 52 },
        () => { sfx("ButtonClicked"); this.open = false; saveSettings(); });
  },
  pick(x, y) {
    if (!this.open) return null;
    const r = this.rows();
    for (const k of ["music", "sfx"]) {
      const b = r[k];
      if (x >= b.x - 18 && x <= b.x + b.w + 18 && Math.abs(y - b.y) < 26) return k;
    }
    return null;
  },
  setFrom(k, x) {
    const r = this.rows()[k];
    const v = Math.max(0, Math.min(1, (x - r.x) / r.w));
    if (k === "music") { volMusic = v; if (music && !muted) music.volume = v; }
    else volSfx = v;
  },
};
function openLink(url) {
  try { window.open(url, "_blank", "noopener"); } catch (e) { location.href = url; }
}

/* how-to overlay */
const howto = {
  open: false,
  steps: ["Watch the dance", "Memorize the dance", "Recreate the dance",
    "Watch your performance", "Take pictures!"],
  draw() {
    if (!this.open) return;
    hit({ x: -offX, y: 0, w: VW, h: H }, () => { this.open = false; });
    const PW = 520, PH = 400, px = 400 - PW / 2, py = 300 - PH / 2;
    ctx.save();
    ctx.fillStyle = "rgba(18,4,28,0.78)";
    ctx.fillRect(-offX, 0, VW, H);
    // panel
    ctx.fillStyle = "#fdf7ff";
    roundRect(ctx, px, py, PW, PH, 26); ctx.fill();
    ctx.strokeStyle = "#8e2a86"; ctx.lineWidth = 5;
    roundRect(ctx, px, py, PW, PH, 26); ctx.stroke();
    // title bar so the heading never collides with the close button
    ctx.fillStyle = "#8e2a86";
    roundRect(ctx, px, py, PW, 62, 26); ctx.fill();
    ctx.fillRect(px, py + 40, PW, 22);
    ctx.restore();
    text(T("howTo"), px + PW / 2 - 18, py + 31, 27, "center", "#ffffff", "rgba(60,10,70,0.9)");

    T("steps").forEach((t, i) => {
      const cy = py + 96 + i * 58;
      ctx.save();
      ctx.fillStyle = "#e35fd0";
      ctx.beginPath(); ctx.arc(px + 56, cy, 19, 0, 7); ctx.fill();
      ctx.restore();
      text(String(i + 1), px + 56, cy + 1, 21, "center", "#fff", "rgba(90,20,100,0.9)");
      text(t, px + 92, cy + 1, 23, "left", "#5b1a63", "none");
    });

    const mC = [1, 0, 0, 1, px + PW - 16, py + 12];
    drawPart("btn_close", "1", mC);
    hit(boxOfPart("btn_close", "1", mC, 6), () => { sfx("ButtonClicked", 0.5); this.open = false; });
    // tapping the dimmed area also closes it
    hit({ x: -offX, y: 0, w: VW, h: H }, () => { this.open = false; });
  }
};

function plateButton(b, line1, line2) {
  ctx.save();
  ctx.fillStyle = "rgba(46,10,66,0.95)";
  roundRect(ctx, b.x, b.y, b.w, b.h, 16); ctx.fill();
  ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 5;
  roundRect(ctx, b.x, b.y, b.w, b.h, 16); ctx.stroke();
  ctx.strokeStyle = "#c455c9"; ctx.lineWidth = 2;
  roundRect(ctx, b.x - 3, b.y - 3, b.w + 6, b.h + 6, 19); ctx.stroke();
  ctx.restore();
  const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
  text(line1, cx, cy - 13, 21, "center", "#fff", "rgba(20,4,30,0.9)");
  text(line2, cx, cy + 14, 23, "center", "#fff", "rgba(20,4,30,0.9)");
}

/* ---------------------------------------------------------------- splash */
Screens.splash = {
  enter() { stopMusic(); G.song = null; G.character = null; G.photos = []; },
  draw() {
    drawBackdrop("splash", () => {
      const art = IMG["ui/splash_hd.webp"];
      if (art && art.width) {
        // cover: fill the view without ever distorting the artwork
        const k = Math.max(VW / art.width, H / art.height);
        const dw = art.width * k, dh = art.height * k;
        ctx.drawImage(art, -offX + (VW - dw) / 2, (H - dh) / 2, dw, dh);
      } else {
        drawPart("splash_bg", "1", wideM(SCENES.splash.kids[0].m, "center"));
      }
    });
    drawScene("splash", 1, { skip: [0, 2, 3, 4, 5, 6, 7] });
    const eg = IMG["img/ART_Logo_EG.png"], gl = IMG["img/game_logo.png"];
    if (eg && eg.width) ctx.drawImage(eg, 14 - offX, 10, 104, 104);
    if (gl && gl.width) {
      const gw2 = 330, gh2 = gw2 * gl.height / gl.width;
      ctx.drawImage(gl, 400 - gw2 / 2, 34, gw2, gh2);
    }

    const mPlay = SCENES.splash.kids[4].m, mCreate = SCENES.splash.kids[6].m;
    const bp = boxOfPart("btn_play_match", "1", mPlay, -6);
    const bc = boxOfPart("btn_create", "1", mCreate, -6);
    hoverGlow(bp, inBox(bp, mouse.x, mouse.y));
    hoverGlow(bc, inBox(bc, mouse.x, mouse.y));
    if (lang === "ru") {
      plateButton(bp, T("play"), T("match"));
      plateButton(bc, T("create"), T("dance"));
    } else {
      drawPart("btn_play_match", "1", mPlay);
      drawPart("btn_create", "1", mCreate);
    }
    hit(bp, () => { sfx("ButtonClicked"); G.mode = "joinme"; go("song"); });
    hit(bc, () => { sfx("ButtonClicked"); G.mode = "freedance"; go("song"); });

    drawHud({ noCurtain: true, noLogo: true });
  }
};

/* ------------------------------------------------------------ song select */
Screens.song = {
  sel: null,
  enter() { this.sel = G.song; stopMusic(); },
  leave() { stopMusic(); },
  draw() {
    const sc = SCENES.song;
    drawBackdrop("song|" + (SONG_BG[this.sel] || "1"), () => {
      drawPart("stage_bg", SONG_BG[this.sel] || "1", worldM(sc.kids[0].m));
      drawPart("drapes", "1", wideM(sc.kids[1].m, "top"));
      drawPart("vignette", "1", wideM(sc.kids[2].m, "center"));
    });
    drawPart("songbar", "1", sc.kids[3].m);
    text(T("chooseSong"), 400, 78, 30);

    const cards = [[4, "Disco", 9], [5, "Techno", 10], [6, "PopRock", 11], [7, "Country", 12]];
    for (const [ki, song, pi] of cards) {
      const m = sc.kids[ki].m;
      const name = SONG_ART[song];
      const b = boxOfPart(name, "1", m, -12);
      const on = this.sel === song;
      if (on) {
        ctx.save(); ctx.globalCompositeOperation = "lighter"; ctx.globalAlpha = 0.35;
        ctx.fillStyle = "#ffd9ff"; roundRect(ctx, b.x - 6, b.y - 6, b.w + 12, b.h + 12, 12); ctx.fill(); ctx.restore();
      }
      hoverGlow(b, inBox(b, mouse.x, mouse.y));
      drawPart(name, "1", m);
      const pm = sc.kids[pi].m;
      const playing = music === SND[song] && !music.paused;
      drawPart(playing ? "btn_pausesong" : "btn_playsong", "1", pm);
      hit(boxOfPart(playing ? "btn_pausesong" : "btn_playsong", "1", pm), () => {
        if (playing) { pauseMusic(); } else { playMusic(song); }
        this.sel = song; sfx("SelectionSFX", 0.5);
      });
      hit(b, () => { sfx("SelectionSFX", 0.6); this.sel = song; playMusic(song); });
      if (on) text("\u2713", b.x + b.w - 14, b.y + 14, 30, "center", "#8dff8d");
    }

    const mNext = sc.kids[13].m, mPrev = sc.kids[14].m;
    drawPart("btn_prevnext", "1", mPrev);
    drawPart("btn_prevnext", "1", mNext, this.sel ? 1 : 0.4);
    hit(boxOfPart("btn_prevnext", "1", mPrev), () => { sfx("ButtonClicked"); go("splash"); });
    hit(boxOfPart("btn_prevnext", "1", mNext), () => {
      if (!this.sel) return;
      sfx("ButtonClicked"); G.song = this.sel; go("pony");
    });
    drawHud();
  }
};

/* ------------------------------------------------------------ pony select */
Screens.pony = {
  sel: null,
  enter() { this.sel = G.character; if (G.song) playMusic(G.song); },
  draw() {
    const sc = SCENES.pony;
    const cardKid = { twilight: 3, fluttershy: 4, applejack: 5, pinkie: 6, rarity: 7, rainbow: 8 };
    drawBackdrop("pony|" + (SONG_BG[G.song] || "1"), () => {
      drawPart("stage_bg", SONG_BG[G.song] || "1", worldM(sc.kids[0].m));
      drawPart("drapes", "1", wideM(sc.kids[1].m, "top"));
      drawPart("vignette", "1", wideM(sc.kids[2].m, "center"));
    });
    text(T("chooseDancer"), 400, 78, 30);

    for (const chr in cardKid) {
      const ki = cardKid[chr], m = sc.kids[ki].m, name = IDMAP[sc.kids[ki].id];
      const b = boxOfPart(name, "1", m, -8);
      hoverGlow(b, inBox(b, mouse.x, mouse.y));
      drawPart(name, this.sel === chr ? "16" : "1", m);
      if (this.sel === chr) text("\u2713", b.x + b.w / 2, b.y + b.h - 24, 40, "center", "#3fbf5a");
      hit(b, () => { sfx("SelectionSFX", 0.6); this.sel = chr; });
    }

    const mNext = sc.kids[9].m, mPrev = sc.kids[10].m;
    drawPart("btn_prevnext", "1", mPrev);
    drawPart("btn_prevnext", "1", mNext, this.sel ? 1 : 0.4);
    hit(boxOfPart("btn_prevnext", "1", mPrev), () => { sfx("ButtonClicked"); go("song"); });
    hit(boxOfPart("btn_prevnext", "1", mNext), () => {
      if (!this.sel) return;
      sfx("ButtonClicked");
      G.character = this.sel;
      G.friends = shuffle(CHARS.filter(c => c !== G.character)).slice(0, 5);
      G.created = [];
      stopMusic();
      if (G.mode === "joinme") { G.sequence = buildSequence(); go("watch"); }
      else { G.sequence = null; go("create"); }
    });
    drawHud();
  }
};

/* ----------------------------------------------------------- watch & learn */
const WATCH_SCALES = [0.8, 0.9, 0.93, 0.9, 0.95];
Screens.watch = {
  enter() {
    const sc = SCENES.watch;
    const slots = [1, 2, 3, 4, 5].map((ki, i) => ({
      x: sc.kids[ki].m[4], y: sc.kids[ki].m[5],
      scale: WATCH_SCALES[i], char: G.friends[i]
    }));
    this.dance = new Dance(slots, G.sequence, G.friends);
    this.curtain = 1;          // 1 closed .. 90 open
    this.opening = false;
    this.slot = 0;             // filled thumbnails
    this.doneOnce = false;
  },
  leave() { stopMusic(); },
  tick() {
    if (this.opening && this.curtain < 90) this.curtain += 1;
    if (!this.opening && this.curtain > 1) this.curtain -= 1.5;
    if (this.dance.playing) {
      const before = this.dance.i;
      this.dance.tick();
      if (this.dance.i !== before) {
        const mv = this.dance.seq[this.dance.i];
        if (mv !== "Idle") this.slot++;
      }
      if (this.dance.done) { this.doneOnce = true; this.opening = false; SND[G.song] && fadeOut(); }
    }
  },
  draw() {
    const sc = SCENES.watch, f = Math.round(this.curtain);
    drawBackdrop("watch|" + (SONG_BG[G.song] || "1"), () => {
      drawPart("stage_bg", SONG_BG[G.song] || "1", worldM(kidM("watch", 0, 1)));
      drawPart("overlay_fx", SONG_BG[G.song] || "1", worldM(kidM("watch", 6, 1)), 0.85);
    });
    this.dance.draw();
    drawPart("curtain", "1", wideM(seamM(kidM("watch", 8, f), 1), "top"));
    drawPart("curtain", "1", wideM(seamM(kidM("watch", 9, f), -1), "top"));
    drawCrowd(kidM("watch", 10, f));

    // title + intro text while closed
    if (this.curtain < 40) {
      text(T("watchClosely"), 400, 236, 26);
      text(T("learnMoves"), 400, 270, 30);
    }

    // sequence carousel
    const mCar = kidM("watch", 13, f);
    drawPart("carousel_frame", "1", mCar);
    const cb = partBox("carousel_frame", "1", mCar);
    for (let i = 0; i < 6; i++) {
      const x = cb.x + 46 + i * 84, y = cb.y + cb.h / 2;
      drawSlot(x, y, 62);
      const mv = G.sequence[1 + i * 2];
      if (i < this.slot) drawPart("th_move" + mv, "1", [0.72, 0, 0, 0.72, x, y]);
      else text(String(i + 1), x, y + 2, 24, "center", "#d9b6e8");
      if (i === this.slot - 1 && this.dance.playing)
        drawPart("arrow_marker", "1", [0.9, 0, 0, 0.9, x, y - 44]);
    }

    // watching pony portrait + current move hint
    const mWp = kidM("watch", 15, f);
    drawPart("watching_pony", PORTRAIT_FRAME[G.character] || "1", mWp);
    const mHint = kidM("watch", 16, f);
    const cur = this.dance.playing ? this.dance.move() : null;
    if (cur && cur !== "Idle") drawPart("th_move" + cur, "1", [0.8, 0, 0, 0.8, mHint[4] + 40, mHint[5] + 40]);

    // play button
    if (!this.dance.playing) {
      const mPlay = kidM("watch", 17, f);
      drawPart("btn_playsong", "1", mPlay);
      hit(boxOfPart("btn_playsong", "1", mPlay), () => {
        sfx("ButtonClicked");
        this.slot = 0; this.opening = true;
        this.dance.start(); playMusic(G.song);
      });
    }

    const mPrev = kidM("watch", 12, f), mNext = kidM("watch", 11, f);
    drawPart("btn_prevnext", "1", mPrev);
    drawPart("btn_prevnext", "1", mNext, this.doneOnce ? 1 : 0.35);
    hit(boxOfPart("btn_prevnext", "1", mPrev), () => { sfx("ButtonClicked"); go("pony"); });
    hit(boxOfPart("btn_prevnext", "1", mNext), () => {
      if (!this.doneOnce) return;
      sfx("ButtonClicked"); stopMusic(); go("create");
    });
    text(T("watchLearn"), 400, 42, 28);
    drawHud();
  }
};
function fadeOut() {
  if (!music) return;
  const a = music, step = a.volume / 24;
  const t = setInterval(() => {
    a.volume = Math.max(0, a.volume - step);
    if (a.volume <= 0.01) { clearInterval(t); a.pause(); }
  }, 60);
}

/* --------------------------------------------------------- match the moves */
Screens.create = {
  enter() {
    this.slots = [null, null, null, null, null, null];
    if (G.created && G.created.length === 13)       // returning from showtime
      for (let i = 0; i < 6; i++) {
        const v = G.created[1 + i * 2];
        this.slots[i] = v === "Idle" ? null : v;
      }
    this.preview = { move: "Idle", f: 0, playing: false };
    this.playingAll = false;
    this.dance = null;
    playMusic(G.song);
  },
  leave() { stopMusic(); },
  tick() {
    if (this.playingAll && this.dance) {
      this.dance.tick();
      if (this.dance.done) { this.playingAll = false; this.dance = null; }
    } else if (this.preview.playing) {
      this.preview.f++;
      if (this.preview.f >= 60) { this.preview.f = 0; this.preview.playing = false; this.preview.move = "Idle"; }
    }
  },
  filled() { return this.slots.filter(s => s !== null).length; },
  draw() {
    const sc = SCENES.create;
    drawBackdrop("create|" + (SONG_BG[G.song] || "1"), () => {
      drawPart("stage_bg", SONG_BG[G.song] || "1", worldM(sc.kids[0].m));
      drawPart("curtain", "1", wideM(seamM(sc.kids[1].m, 1), "top"));
      drawPart("curtain", "1", wideM(seamM(sc.kids[2].m, -1), "top"));
    });

    // centre preview dancer
    const mPrev = [1, 0, 0, 1, 578, 462];
    const pvX = worldX(mPrev[4]), pvY = worldY(mPrev[5]);
    if (this.playingAll && this.dance) {
      this.dance.draw();
    } else {
      const key = animKey(G.character, this.preview.move);
      const fr = this.preview.playing ? this.preview.f : (idleClock % 60);
      drawAnim(key, fr, pvX, pvY, worldS(1.0));
    }

    // move board (2 columns x 3 rows)
    drawPart("preview_frame", "1", sc.kids[3].m);
    drawPart("divider", "1", sc.kids[4].m);
    drawPart("divider", "1", sc.kids[5].m);
    const bb = partBox("preview_frame", "1", sc.kids[3].m);
    for (let i = 0; i < 6; i++) {
      const c = i % 2, r = (i / 2) | 0;
      const x = bb.x + 66 + c * 118, y = bb.y + 78 + r * 106;
      const b = { x: x - 44, y: y - 44, w: 88, h: 88 };
      hoverGlow(b, inBox(b, mouse.x, mouse.y));
      drawPart("th_move" + (i + 1), "1", [0.95, 0, 0, 0.95, x, y]);
      hit(b, () => {
        const free = this.slots.indexOf(null);
        if (free < 0) return;
        sfx("SelectionSFX", 0.6);
        this.slots[free] = i + 1;
        this.preview.move = i + 1; this.preview.f = 0; this.preview.playing = true;
      });
    }
    text(T("matchMoves"), 400, 44, 26);

    // sequence bar
    const mCar = sc.kids[8].m;
    drawPart("carousel_frame", "1", mCar);
    const cb = partBox("carousel_frame", "1", mCar);
    for (let i = 0; i < 6; i++) {
      const x = cb.x + 46 + i * 84, y = cb.y + cb.h / 2;
      drawSlot(x, y, 62);
      if (this.slots[i] !== null) {
        drawPart("th_move" + this.slots[i], "1", [0.72, 0, 0, 0.72, x, y]);
        drawPart("btn_close", "1", [0.34, 0, 0, 0.34, x + 28, y - 28]);
        hit({ x: x + 15, y: y - 41, w: 26, h: 26 }, () => { sfx("ButtonClicked", 0.5); this.slots[i] = null; });
      } else {
        text(String(i + 1), x, y + 2, 24, "center", "#d9b6e8");
      }
    }

    // preview / stop transport
    const mRing = sc.kids[9].m;
    const canPlay = this.filled() > 0;
    drawPart("ring", "1", mRing, canPlay ? 1 : 0.4);
    const mp = sc.kids[12].m, mq = sc.kids[11].m;
    drawPart(this.playingAll ? "btn_pausesong" : "btn_playsong", "1", this.playingAll ? mq : mp, canPlay ? 1 : 0.4);
    hit(boxOfPart("btn_playsong", "1", mp), () => {
      if (!canPlay) return;
      sfx("ButtonClicked");
      if (this.playingAll) { this.playingAll = false; this.dance = null; return; }
      const seq = seqFromSlots(this.slots);
      this.dance = new Dance([{ x: 578, y: 462, scale: 1.0, char: G.character }], seq, [G.character]);
      this.dance.start(); this.playingAll = true;
      playMusic(G.song);
    });

    // back arrow: to the routine in match mode, to dancer select in free dance
    const mBack = [-1, 0, 0, 1, 74, sc.kids[6].m[5]];
    drawPart("btn_prevnext", "1", mBack);
    hit(boxOfPart("btn_prevnext", "1", mBack), () => {
      sfx("ButtonClicked"); stopMusic();
      go(G.mode === "freedance" ? "pony" : "watch");
    });

    const mNext = sc.kids[6].m;
    const ready = this.filled() === 6;
    drawPart("btn_prevnext", "1", mNext, ready ? 1 : 0.35);
    hit(boxOfPart("btn_prevnext", "1", mNext), () => {
      if (!ready) return;
      sfx("ButtonClicked");
      G.created = seqFromSlots(this.slots);
      if (!G.sequence) G.sequence = G.created.slice();
      stopMusic(); go("show");
    });
    drawHud();
  }
};

/* ------------------------------------------------------------- show time */
const SHOW_SCALES = [0.75, 0.85, 0.8, 0.75, 0.9, 0.95];
Screens.show = {
  enter() {
    const sc = SCENES.show;
    const slots = [1, 2, 3, 4, 5, 6].map((ki, i) => ({
      x: sc.kids[ki].m[4], y: sc.kids[ki].m[5],
      scale: SHOW_SCALES[i],
      char: i === 5 ? G.character : G.friends[i]
    }));
    this.dance = new Dance(slots, G.created, null);
    G.photos = [];
    this.curtain = 1;
    this.opening = false;
    this.snaps = 5;
    this.flash = 0;
    this.finished = false;
  },
  leave() { stopMusic(); },
  tick() {
    if (this.opening && this.curtain < 90) this.curtain += 1;
    if (!this.opening && this.curtain > 1) this.curtain -= 1.5;
    if (this.flash > 0) this.flash--;
    if (this.dance.playing) {
      this.dance.tick();
      if (this.dance.done) {
        this.finished = true; this.opening = false; fadeOut();
        setTimeout(() => { if (screen === Screens.show) go("results"); }, 1400);
      }
    }
  },
  draw() {
    const f = Math.round(this.curtain), sc = SCENES.show;
    drawBackdrop("show|" + (SONG_BG[G.song] || "1"), () => {
      drawPart("stage_bg", SONG_BG[G.song] || "1", worldM(kidM("show", 0, 1)));
      drawPart("overlay_fx", SONG_BG[G.song] || "1", worldM(kidM("show", 7, 1)), 0.85);
    });
    this.dance.draw();
    drawPart("curtain", "1", wideM(seamM(kidM("show", 9, f), 1), "top"));
    drawPart("curtain", "1", wideM(seamM(kidM("show", 10, f), -1), "top"));
    drawCrowd(kidM("show", 11, f));

    if (this.curtain < 40) {
      text(T("showtime"), 400, 224, 36);
      text(T("ready"), 400, 272, 24);
    }

    if (!this.dance.playing && !this.finished) {
      const mPlay = kidM("show", 13, f);
      drawPart("btn_playsong", "1", mPlay);
      hit(boxOfPart("btn_playsong", "1", mPlay), () => {
        sfx("ButtonClicked");
        this.opening = true; this.dance.start(); playMusic(G.song);
      });
    }

    if (this.dance.playing) {
      const mCam = kidM("show", 12, f);
      drawPart("camera_bar", "1", mCam);
      const cb = partBox("camera_bar", "1", mCam);
      const cb2 = cb;
      for (let i = 0; i < 6; i++) {
        const px = cb2.x + 64 + i * 76, py = cb2.y + 112;
        const mv = G.created[1 + i * 2];
        drawPart("placeholder", "1", [0.88, 0, 0, 0.88, px, py]);
        if (mv !== "Idle") drawPart("th_move" + mv, "1", [0.7, 0, 0, 0.7, px, py]);
        if (this.dance.i === 1 + i * 2) drawPart("arrow_marker", "1", [0.9, 0, 0, 0.9, px, py - 40]);
      }
      const bx = cb.x + cb.w - 66, by = cb.y + 46;
      const sb = { x: bx - 28, y: by - 28, w: 58, h: 58 };
      hoverGlow(sb, inBox(sb, mouse.x, mouse.y));
      text(String(this.snaps), bx + 20, by + 26, 17, "center", "#fff");
      hit(sb, () => {
        if (this.snaps <= 0) return;
        this.snaps--; this.flash = 6; sfx("CameraClicked");
        G.photos.push(snapshot());
      });
    }

    // back to the move board, even mid-performance
    if (!this.finished) {
      const mBack = [-1, 0, 0, 1, 74, 540];
      const bb = boxOfPart("btn_prevnext", "1", mBack);
      hoverGlow(bb, inBox(bb, mouse.x, mouse.y));
      drawPart("btn_prevnext", "1", mBack);
      hit(bb, () => {
        sfx("ButtonClicked"); stopMusic();
        this.dance.playing = false;
        go("create");
      });
    }

    if (this.flash > 0) {
      ctx.save(); ctx.globalAlpha = this.flash / 6; ctx.fillStyle = "#fff";
      ctx.fillRect(-offX, 0, VW, H); ctx.restore();
    }
    drawHud();
  }
};

function snapshot() {
  const off = document.createElement("canvas");
  off.width = 320; off.height = 240;
  const sw = Math.min(cv.width, cv.height * 4 / 3);
  off.getContext("2d").drawImage(cv, (cv.width - sw) / 2, 0, sw, cv.height,
                                 0, 0, 320, 240);
  return off;
}

/* ---------------------------------------------------------------- results */
Screens.results = {
  enter() {
    let n = 0;
    for (let i = 0; i < G.sequence.length; i++)
      if (G.sequence[i] !== "Idle" && G.sequence[i] === G.created[i]) n++;
    G.stars = n;
    this.t = 0;
    stopMusic();
    sfx(n >= 6 ? "100SFX" : n >= 5 ? "90SFX" : n >= 3 ? "75SFX" : "50SFX", 0.8);
  },
  tick() { this.t++; },
  draw() {
    ctx.save(); ctx.fillStyle = "#2a0f36"; ctx.fillRect(0, 0, W, H); ctx.restore();
    const sc = SCENES.results;
    drawScene("results", 1, { skip: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] });
    drawPart("portrait", PORTRAIT_FRAME[G.character] || "1", sc.kids[12].m);
    text(T("great"), 400, 88, 24);
    for (let i = 0; i < 6; i++) {
      const m = sc.kids[6 + i].m;
      const on = i < G.stars && this.t > 10 + i * 8;
      drawPart("star", on ? "20" : "1", m, on ? 1 : 0.25);
    }
    const label = G.mode === "freedance" ? T("ownDance")
      : G.stars >= 6 ? T("perfect")
        : G.stars >= 4 ? T("goodJob")
          : G.stars >= 2 ? T("niceTry") : T("practise");
    text(label, 400, 152, 22, "center", "#ffd9ff");
    text(G.stars + " / 6", 400, 380, 30);

    const mR = sc.kids[4].m, mP = sc.kids[5].m;
    drawPart("btn_restart", "1", mR);
    drawPart("btn_pictures", "1", mP, G.photos.length ? 1 : 0.4);
    hit(boxOfPart("btn_restart", "1", mR), () => { sfx("ButtonClicked"); go("splash"); });
    hit(boxOfPart("btn_pictures", "1", mP), () => {
      if (!G.photos.length) return;
      sfx("ButtonClicked"); go("book");
    });
  }
};

/* ------------------------------------------------------------- year book */
Screens.book = {
  draw() {
    ctx.save(); ctx.fillStyle = "#1d0a28"; ctx.fillRect(0, 0, W, H); ctx.restore();
    const sc = SCENES.book;
    drawPart("book_page", "1", sc.kids[15].m);
    drawPart("book", "1", sc.kids[0].m);
    text(T("school"), 268, 112, 22, "center", "#7b2f86");
    text(T("yearbook"), 268, 138, 16, "center", "#a04fae");
    drawPart("portrait", PORTRAIT_FRAME[G.character] || "1", sc.kids[10].m);
    for (let i = 0; i < 6; i++) drawPart("star", i < G.stars ? "20" : "1", sc.kids[4 + i].m, i < G.stars ? 1 : 0.25);

    G.photos.slice(0, 5).forEach((c, i) => {
      const x = 430 + (i % 2) * 150, y = 150 + ((i / 2) | 0) * 120;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(((i * 37) % 13 - 6) * Math.PI / 180);
      ctx.fillStyle = "#fff"; ctx.fillRect(-66, -50, 132, 108);
      ctx.drawImage(c, -60, -44, 120, 90);
      ctx.strokeStyle = "#d9c3e6"; ctx.lineWidth = 2; ctx.strokeRect(-66, -50, 132, 108);
      ctx.restore();
    });
    if (!G.photos.length) text(T("noPics"), 560, 300, 22, "center", "#8c5fa0");

    const mC = sc.kids[14].m, mR = sc.kids[13].m;
    drawPart("btn_close", "1", mC);
    drawPart("btn_restart", "1", mR);
    hit(boxOfPart("btn_close", "1", mC), () => { sfx("ButtonClicked"); go("results"); });
    hit(boxOfPart("btn_restart", "1", mR), () => { sfx("ButtonClicked"); go("splash"); });
  }
};

/* ------------------------------------------------------------------ loop */
let last = 0, acc = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  if (!last) last = ts;
  let dt = ts - last; last = ts;
  if (dt > 250) dt = 1000 / FPS;      // stalled: skip the gap, never fast-forward
  acc += dt;
  const step = 1000 / FPS;
  let ticks = 0;
  while (acc >= step && ticks < 2) {
    acc -= step; ticks++;
    idleClock++;
    if (screen && screen.tick) screen.tick();
  }
  if (acc > step * 2) acc = step;
  hot.length = 0;
  ctx.setTransform(baseScale, 0, 0, baseScale, 0, 0);
  ctx.clearRect(0, 0, VW, H);
  ctx.fillStyle = "#2b1038"; ctx.fillRect(0, 0, VW, H);
  ctx.translate(offX, 0);
  if (screen) screen.draw();
  howto.draw();
  settings.draw();
  if (loaded < total || warmed < warmTotal) drawLoader();
  cv.style.cursor = hot.some(h => inBox(h.box, mouse.x, mouse.y)) ? "pointer" : "default";
}

function drawLoader() {
  ctx.save();
  ctx.fillStyle = "rgba(12,3,20,0.92)"; ctx.fillRect(-offX, 0, VW, H);
  ctx.restore();
  const p = total ? (warmTotal ? 0.75 * (loaded / total) + 0.25 * (warmed / warmTotal)
                               : 0.75 * (loaded / total)) : 0;
  text(T("loading"), 400, 275, 28);
  ctx.save();
  ctx.strokeStyle = "#8e2a86"; ctx.lineWidth = 3;
  roundRect(ctx, 250, 300, 300, 22, 11); ctx.stroke();
  ctx.fillStyle = "#e35fd0";
  roundRect(ctx, 252, 302, 296 * p, 18, 9); ctx.fill();
  ctx.restore();
  text(Math.round(p * 100) + "%", 400, 340, 18);
}

/* ------------------------------------------------------------ input/size */
function stagePos(ev) {
  const r = cv.getBoundingClientRect();
  return { x: (ev.clientX - r.left) * VW / r.width - offX,
           y: (ev.clientY - r.top) * H / r.height };
}
cv.addEventListener("mousemove", e => {
  const p = stagePos(e); mouse.x = p.x; mouse.y = p.y;
  if (settings.drag) settings.setFrom(settings.drag, p.x);
});
cv.addEventListener("mousedown", e => {
  const p = stagePos(e);
  const k = settings.pick(p.x, p.y);
  if (k) { settings.drag = k; settings.setFrom(k, p.x); }
});
window.addEventListener("mouseup", () => {
  if (settings.drag) { settings.drag = null; saveSettings(); }
});
cv.addEventListener("mouseleave", () => { mouse.x = mouse.y = -1; });
cv.addEventListener("click", e => {
  if (loaded < total || warmed < warmTotal) return;
  if (Date.now() < touchUntil) return;   // already handled by touchend
  const p = stagePos(e);
  mouse.x = p.x; mouse.y = p.y;
  for (let i = hot.length - 1; i >= 0; i--)
    if (inBox(hot[i].box, p.x, p.y)) { hot[i].onClick(); return; }
});
let touching = false, touchUntil = 0;
cv.addEventListener("touchstart", e => {
  const t = e.touches[0]; if (!t) return;
  touching = true;
  const r = cv.getBoundingClientRect();
  mouse.x = (t.clientX - r.left) * VW / r.width - offX;
  mouse.y = (t.clientY - r.top) * H / r.height;
  const k = settings.pick(mouse.x, mouse.y);
  if (k) { settings.drag = k; settings.setFrom(k, mouse.x); }
}, { passive: true });
cv.addEventListener("touchmove", e => {
  if (!settings.drag) return;
  const t = e.touches[0]; if (!t) return;
  const r = cv.getBoundingClientRect();
  settings.setFrom(settings.drag, (t.clientX - r.left) * VW / r.width - offX);
  if (e.cancelable) e.preventDefault();
}, { passive: false });
cv.addEventListener("touchend", e => {
  if (e.cancelable) e.preventDefault();
  if (settings.drag) { settings.drag = null; saveSettings(); mouse.x = mouse.y = -1; return; }
  touchUntil = Date.now() + 600;
  const tx = mouse.x, ty = mouse.y;
  mouse.x = mouse.y = -1;          // no hover highlight left behind on touch
  touching = false;
  if (loaded < total || warmed < warmTotal) return;
  for (let i = hot.length - 1; i >= 0; i--)
    if (inBox(hot[i].box, tx, ty)) { hot[i].onClick(); return; }
});

function toggleFullscreen() {
  const el = document.getElementById("wrap") || document.documentElement;
  const doc = document;
  if (doc.fullscreenElement || doc.webkitFullscreenElement) {
    (doc.exitFullscreen || doc.webkitExitFullscreen || function () {}).call(doc);
  } else {
    (el.requestFullscreen || el.webkitRequestFullscreen ||
     el.webkitEnterFullscreen || function () {}).call(el);
  }
  setTimeout(resize, 120);
}

document.addEventListener("keydown", e => {
  if (e.key === "m" || e.key === "M") { muted = !muted; if (music) music.volume = muted ? 0 : volMusic; }
  if (e.key === "f" || e.key === "F") toggleFullscreen();
  if (e.key === "Escape") { howto.open = false; if (settings.open) { settings.open = false; saveSettings(); } }
  if (e.key === "w" || e.key === "W") { wideLocked = true; setWide(!wide); resize(); }
});

let baseScale = 1, wideLocked = false;
function resize() {
  const winAR = window.innerWidth / Math.max(1, window.innerHeight);
  if (!wideLocked) setWide(winAR >= 1.45, winAR);
  else if (wide) setWide(true, Math.max(16 / 9, Math.min(AR_MAX, winAR)));
  const s = Math.min(window.innerWidth / VW, window.innerHeight / H);
  cv.style.width = (VW * s) + "px";
  cv.style.height = (H * s) + "px";
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  baseScale = s * dpr;
  cv.width = Math.round(VW * baseScale);
  cv.height = Math.round(H * baseScale);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  bgCache.key = null;
  crowdCache.key = null;
}
window.addEventListener("resize", resize);
document.addEventListener("fullscreenchange", () => setTimeout(resize, 60));

/* -------------------------------------------------------------- start up */
loadSettings();
preload();
setTimeout(() => { if (loaded < total) { loaded = total; warmUp(); } }, 20000);
resize();
go("splash");
requestAnimationFrame(frame);

})();
