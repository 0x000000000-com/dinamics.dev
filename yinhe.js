/* Dinamics 银河 — the galaxy and the cinema. WebGL 1, no library. */
(() => {
'use strict';
const Y = window.YH || {};
const MOB = !!Y.mobile, RED = !!Y.reduced;

// ---------- small math ----------
const v3 = (x = 0, y = 0, z = 0) => [x, y, z];
const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]);
const nrm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const ss = t => t * t * (3 - 2 * t);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function rnd(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
function persp(o, fov, asp, n, f, sx, sy) {
  const t = 1 / Math.tan(fov / 2), nf = 1 / (n - f); o.fill(0);
  o[0] = t / asp; o[5] = t; o[8] = -sx; o[9] = -sy; o[10] = (f + n) * nf; o[11] = -1; o[14] = 2 * f * n * nf;
}
function lookAt(o, e, c, up) {
  const z = nrm(sub(e, c)), x = nrm(cross(up, z)), y = cross(z, x);
  o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[3] = 0; o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[7] = 0;
  o[8] = x[2]; o[9] = y[2]; o[10] = z[2]; o[11] = 0; o[12] = -dot(x, e); o[13] = -dot(y, e); o[14] = -dot(z, e); o[15] = 1;
}
function mmul(o, a, b) {
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k]; o[i * 4 + j] = s;
  }
}
function xform(m, p) { const x = p[0], y = p[1], z = p[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; }
const hex = h => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];

// ---------- GL helpers ----------
function glctx(cv) {
  const o = { alpha: false, antialias: !MOB, depth: true, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance' };
  return cv.getContext('webgl', o) || cv.getContext('experimental-webgl', o);
}
function prog(gl, vs, fs) {
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(sh)); return sh; };
  const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}, a = {};
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name; u[n] = gl.getUniformLocation(p, n); }
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
  return { p, u, a };
}
function buf(gl, data) { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); return b; }
function attr(gl, P, name, b, size, stride = 0, off = 0) {
  const l = P.a[name]; if (l === undefined || l < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride * 4, off * 4);
}

// ======================================================================
//  THE GALAXY
// ======================================================================
const cv = document.createElement('canvas'); cv.className = 'yh-gl'; cv.setAttribute('aria-hidden', 'true');
const host = Y.host || document.body; host.appendChild(cv);
const gl = glctx(cv);
if (!gl) { document.documentElement.classList.add('no-gl'); return; }
const DPR = Math.min(window.devicePixelRatio || 1, MOB ? 1.5 : 2);
const N = Y.crafts || 18;
const GOLD = [0.851, 0.698, 0.42];
// 18 planets: one colour pair each (body, atmosphere); muted so the gold of the core stays the one bright thing
const PAL = ['#7f9cf5', '#e0a96d', '#6fc3b2', '#c58bd9', '#e58a7c', '#8fd16b', '#62b0e8', '#d9c36a', '#b98a6e', '#9aa7c7', '#e07fae', '#7ad0d4', '#c9a0f2', '#efb35c', '#6f8fd9', '#e8796b', '#a1c28d', '#8ea0b5'];
const PLANETS = [];
{
  const r = rnd(1801);
  for (let i = 0; i < N; i++) {
    const R = 13 + i * 2.55 + (r() - .5) * 1.2;          // spiral outward: neighbours in the tour are neighbours in space
    const th = -i * 0.62 - 0.4;
    const c = hex(PAL[i % PAL.length]);
    PLANETS.push({ i, R, th, y: (r() - .5) * 2.2, rad: 1.05 + r() * 0.65 + (i % 5 === 0 ? 0.35 : 0), c1: mix(c, [0.08, 0.09, 0.14], 0.45), c2: c, seed: r() * 10, hi: 0 });
  }
}
// particles: the disc (3 arms), the background stars, and the D
const galaxyN = MOB ? 6500 : 15000;
let gB, gN, sB, sN, dB, dN;
{
  const r = rnd(7), a = new Float32Array(galaxyN * 7);
  const blue = [0.42, 0.55, 1.0], vio = [0.72, 0.5, 1.0], warm = [1.0, 0.82, 0.55];
  for (let k = 0; k < galaxyN; k++) {
    const arm = k % 3, t = Math.pow(r(), 0.9), R = 4 + t * 66;
    const twist = R * 0.105, spread = (0.5 + 0.35 * (1 - t)) * (0.55 + 0.45 * r());
    const th = arm * 2.0944 + twist + gauss(r) * spread * 0.55;
    const y = gauss(r) * (0.35 + 2.1 * Math.exp(-R / 10)) * (r() < 0.04 ? 2.5 : 1);
    let col = mix(warm, mix(blue, vio, r()), ss(clamp((R - 6) / 40)));
    if (r() < 0.06) col = mix(col, [1, 0.86, 0.6], 0.8);
    const b = (0.10 + 0.22 * r()) * (R < 12 ? 1.6 : 1);
    const o = k * 7;
    a[o] = Math.cos(th) * R; a[o + 1] = y; a[o + 2] = Math.sin(th) * R;
    a[o + 3] = col[0] * b; a[o + 4] = col[1] * b; a[o + 5] = col[2] * b; a[o + 6] = 0.28 + r() * 0.75 + (r() < 0.02 ? 1.5 : 0);
  }
  gB = buf(gl, a); gN = galaxyN;
  const sn = MOB ? 900 : 1800, s = new Float32Array(sn * 7);
  for (let k = 0; k < sn; k++) {
    const u = r() * 2 - 1, ph = r() * 6.2832, q = Math.sqrt(1 - u * u), R = 420 + r() * 120, b = 0.25 + r() * 0.6;
    const c = r() < 0.15 ? [1, 0.85, 0.7] : r() < 0.3 ? [0.7, 0.8, 1] : [1, 1, 1];
    const o = k * 7; s[o] = q * Math.cos(ph) * R; s[o + 1] = u * R; s[o + 2] = q * Math.sin(ph) * R;
    s[o + 3] = c[0] * b; s[o + 4] = c[1] * b; s[o + 5] = c[2] * b; s[o + 6] = 1.4 + r() * 2.4;
  }
  sB = buf(gl, s); sN = sn;
  // the D, from the logo's own strokes (100×100 box, y down): stem, the dot, the bowl
  const SEG = Y.dStrokes || [[22, 42, 22, 88, 11], [22, 17, 22, 17, 13], [37, 14, 52, 14, 10], [52, 14, 63.4, 15.8, 11.5], [63.4, 15.8, 73.7, 21.1, 11.2], [73.7, 21.1, 81.9, 29.3, 10.7], [81.9, 29.3, 87.2, 39.6, 10], [87.2, 39.6, 89, 51, 9.1], [89, 51, 87.2, 62.4, 8.1], [87.2, 62.4, 81.9, 72.7, 6.9], [81.9, 72.7, 73.7, 80.9, 5.5], [73.7, 80.9, 63.4, 86.2, 4], [63.4, 86.2, 52, 88, 2.4], [52, 88, 36, 88, 1.5]];
  let L = 0; const segL = SEG.map(s => Math.max(Math.hypot(s[2] - s[0], s[3] - s[1]), s[4] * 0.8)); segL.forEach(x => L += x);
  const dn = MOB ? 1600 : 3200, d = new Float32Array(dn * 8);
  for (let k = 0; k < dn; k++) {
    let pick = r() * L, si = 0; while (pick > segL[si] && si < SEG.length - 1) { pick -= segL[si]; si++; }
    const s = SEG[si], f = r(), w = s[4] * 0.5 * Math.sqrt(r()), ang = r() * 6.2832;
    let x = lerp(s[0], s[2], f) + Math.cos(ang) * w, y = lerp(s[1], s[3], f) + Math.sin(ang) * w;
    x = (x - 55) * 0.085; y = -(y - 51) * 0.085;
    const u = r() * 2 - 1, ph = r() * 6.2832, q = Math.sqrt(1 - u * u), R = 30 + r() * 60;
    const o = k * 8; d[o] = x; d[o + 1] = y; d[o + 2] = q * Math.cos(ph) * R; d[o + 3] = u * R * 0.6; d[o + 4] = q * Math.sin(ph) * R;
    d[o + 5] = 0.55 + r() * 0.45; d[o + 6] = r(); d[o + 7] = 0.5 + r() * 1.1;
  }
  dB = buf(gl, d); dN = dn;
}
const quad = buf(gl, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
// orbit rings: one loop per planet, 96 points each
const RING = 96, ringB = (() => { const a = new Float32Array(N * RING * 3); PLANETS.forEach((p, i) => { for (let k = 0; k < RING; k++) { const t = k / RING * 6.2832; a.set([Math.cos(t) * p.R, p.y, Math.sin(t) * p.R], (i * RING + k) * 3); } }); return buf(gl, a); })();

const PTS = prog(gl, `
attribute vec3 p; attribute vec4 c;
uniform mat4 vp; uniform float rot, ps, reveal, bright, tw, time;
varying vec3 vc; varying float va;
void main(){
  float cs = cos(rot), sn = sin(rot);
  vec3 q = vec3(cs*p.x - sn*p.z, p.y, sn*p.x + cs*p.z);
  gl_Position = vp * vec4(q, 1.0);
  float r = length(p.xz);
  va = (1.0 - smoothstep(reveal*74.0 - 12.0, reveal*74.0, r)) * bright * (1.0 + tw*0.35*sin(time*2.3 + p.x*1.7 + p.z));
  vc = c.rgb;
  gl_PointSize = clamp(c.a * ps / gl_Position.w, 1.0, 48.0);
}`, `precision mediump float; varying vec3 vc; varying float va;
void main(){ vec2 q = gl_PointCoord - 0.5; float d = dot(q,q)*4.0; float a = exp(-d*3.2) * va; gl_FragColor = vec4(vc*a, 1.0); }`);
const DP = prog(gl, `
attribute vec2 dxy; attribute vec3 sc; attribute vec3 c;
uniform mat4 vp; uniform vec3 cr, cu; uniform float form, ps, bright, time;
varying float va; varying float vh;
void main(){
  float f = smoothstep(0.0, 1.0, clamp(form*1.35 - c.y*0.35, 0.0, 1.0));
  vec3 home = cr*dxy.x + cu*dxy.y;
  vec3 q = mix(sc, home, f) + (cr*sin(time*0.9 + c.y*20.0) + cu*cos(time*0.7 + c.y*13.0))*0.06*f;
  gl_Position = vp * vec4(q, 1.0);
  va = c.x * bright * (0.35 + 0.65*f);
  vh = c.y;
  gl_PointSize = clamp(c.z * ps / gl_Position.w, 1.0, 40.0);
}`, `precision mediump float; varying float va; varying float vh;
void main(){ vec2 q = gl_PointCoord - 0.5; float d = dot(q,q)*4.0; float a = exp(-d*3.0)*va;
  vec3 col = mix(vec3(1.0,0.78,0.42), vec3(1.0,0.95,0.82), vh); gl_FragColor = vec4(col*a, 1.0); }`);
const PL = prog(gl, `
attribute vec2 q; uniform mat4 vp; uniform vec3 cen, cr, cu; uniform float rad;
varying vec2 uv;
void main(){ uv = q*1.7; gl_Position = vp * vec4(cen + (cr*q.x + cu*q.y)*rad*1.7, 1.0); }`, `precision highp float;
varying vec2 uv; uniform vec3 c1, c2, L; uniform float seed, hi, a, time;
float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
void main(){
  float r = length(uv); if (r > 1.7) discard;
  vec3 col; float al;
  vec2 ld = normalize(L.xy + vec2(1e-4));
  if (r < 1.0) {
    vec3 n = vec3(uv, sqrt(1.0 - r*r));
    float d = dot(n, L), lit = smoothstep(-0.2, 0.75, d);
    float lon = atan(n.x, n.z) + time*0.04 + seed;
    float b = 0.5 + 0.5*sin(n.y*(6.0 + seed*0.8) + (n2(vec2(lon*2.2, n.y*5.0) + seed) - 0.5)*3.2);
    b = mix(b, n2(vec2(lon*6.0, n.y*14.0) + seed*3.0), 0.25);
    vec3 surf = mix(c1, c2, b);
    col = surf*(0.10 + 0.90*lit) + surf*0.10*n.z;
    float rim = pow(1.0 - n.z, 2.6);
    col += c2*rim*(0.25 + 0.75*lit);
    col += vec3(1.0, 0.86, 0.56)*hi*(rim*0.9 + 0.08);
    al = 1.0;
  } else {
    float g = exp(-(r - 1.0)*6.5), side = 0.3 + 0.7*max(dot(normalize(uv), ld), 0.0);
    col = mix(c2, vec3(1.0, 0.84, 0.5), hi)*g*side;
    al = g*side*(0.5 + 0.5*hi);
  }
  gl_FragColor = vec4(col*a, al*a);
}`);
const GLW = prog(gl, `
attribute vec2 q; uniform mat4 vp; uniform vec3 cen, cr, cu; uniform float rad; varying vec2 uv;
void main(){ uv = q; gl_Position = vp * vec4(cen + (cr*q.x + cu*q.y)*rad, 1.0); }`, `precision mediump float; varying vec2 uv; uniform vec3 col; uniform float a;
void main(){ float r = length(uv); float g = exp(-r*r*5.0)*0.9 + exp(-r*16.0)*0.6; gl_FragColor = vec4(col*g*a, 1.0); }`);
const RG = prog(gl, `
attribute vec3 p; uniform mat4 vp; uniform float rot;
void main(){ float cs = cos(rot), sn = sin(rot); gl_Position = vp*vec4(cs*p.x - sn*p.z, p.y, sn*p.x + cs*p.z, 1.0); }`,
`precision mediump float; uniform vec3 col; uniform float a; void main(){ gl_FragColor = vec4(col*a, 1.0); }`);

// ---------- state ----------
const S = {
  w: 1, h: 1, time: 0, rot: 0, open: Y.skipOpening || RED ? 1 : 0, openT0: 0, drag: null, az: 0, el: 0, vaz: 0,
  hover: -1, act: -1, dim: 1, pose: null, running: true, hintI: 0
};
const view = new Float32Array(16), proj = new Float32Array(16), vp = new Float32Array(16);
let camR = [1, 0, 0], camU = [0, 1, 0], camE = [0, 0, 100], fpx = 1;
const FOV = 0.82;

function planetPos(p, rot) {
  const t = p.th + rot; return [Math.cos(t) * p.R, p.y, Math.sin(t) * p.R];
}
function sph(az, el, d, c = [0, 0, 0]) { return [c[0] + d * Math.cos(el) * Math.sin(az), c[1] + d * Math.sin(el), c[2] + d * Math.cos(el) * Math.cos(az)]; }

// poses: eye, target, lens shift (ndc), brightness of the disc
function poseHero() {
  const d = MOB ? 112 : 92;
  return { e: sph(0.35 + S.az, 0.56 + S.el, d), c: [0, 0, 0], sx: 0, sy: MOB ? -0.2 : -0.24, dim: 1, dA: 1, gA: 1 };
}
function poseCraft(i) {
  const p = PLANETS[i], P = planetPos(p, S.rot), out = nrm([P[0], 0, P[2]]), tan = [-out[2], 0, out[0]];
  const k = p.rad * (MOB ? 1.45 : 1);
  const e = add(add(add(P, mul(out, 5.2 * k)), [0, 2.8 * k, 0]), mul(tan, 8.8 * k));
  const side = i % 2 ? -1 : 1;
  return { e, c: P, sx: MOB ? 0 : side * 0.42, sy: MOB ? 0.36 : 0.02, dim: 1, act: i, dA: 0.06, gA: 0.5 };
}
function poseFilm() { return { e: sph(0.35, 0.18, 9), c: [0, 0, 0], sx: 0, sy: 0, dim: 1, dA: 1.3, gA: 1.5 }; }
function poseEnd() { return { e: sph(0.9, 1.05, MOB ? 190 : 165), c: [0, 0, 0], sx: 0, sy: MOB ? 0.3 : 0.18, dim: 1, dA: 0.45, gA: 0.7 }; }
function poseOf(id) {
  if (id === 'hero') return poseHero();
  if (id[0] === 'c') return poseCraft(+id.slice(1));
  if (id === 'film') return poseFilm();
  return poseEnd();
}

// the stations are the sections marked data-st; their centres are the anchors of the flight
let ST = [];
function measure() {
  ST = [...document.querySelectorAll('[data-st]')].map(el => {
    const r = el.getBoundingClientRect(), top = r.top + scrollY;
    return { id: el.dataset.st, y: top + Math.min(r.height, innerHeight) / 2 + (el.dataset.st === 'film' ? (r.height - innerHeight) / 2 : 0), el };
  }).sort((a, b) => a.y - b.y);
}
function currentPose() {
  if (!ST.length) return poseHero();
  const yc = scrollY + innerHeight / 2;
  if (yc <= ST[0].y) return poseOf(ST[0].id);
  for (let k = 0; k < ST.length - 1; k++) {
    const A = ST[k], B = ST[k + 1];
    if (yc < B.y) {
      const f = eio(clamp((yc - A.y) / (B.y - A.y))), pa = poseOf(A.id), pb = poseOf(B.id);
      const lift = Math.sin(Math.PI * f) * Math.min(len(sub(pa.e, pb.e)) * 0.22, 26) * (RED ? 0.2 : 1);
      return { e: add(mix(pa.e, pb.e, f), [0, lift, 0]), c: mix(pa.c, pb.c, f), sx: lerp(pa.sx, pb.sx, f), sy: lerp(pa.sy, pb.sy, f), dim: 1, act: f < 0.5 ? pa.act : pb.act, actK: Math.abs(f - 0.5) * 2,
        dA: lerp(pa.dA, pb.dA, f), gA: lerp(pa.gA, pb.gA, f) };
    }
  }
  return poseOf(ST[ST.length - 1].id);
}

// opening: stardust gathers into the D, then the camera pulls back and the galaxy unrolls
function openingPose(o, hero) {
  const k = eio(clamp((o - 0.32) / 0.55));
  const near = { e: [0, 0, 30], c: [0, 0, 0], sx: 0, sy: hero.sy * 0.5 };
  return { e: mix(near.e, hero.e, k), c: mix(near.c, hero.c, k), sx: lerp(near.sx, hero.sx, k), sy: lerp(near.sy, hero.sy, k), dim: 1, dA: 1, gA: 1 };
}

function resize() {
  const w = Math.max(1, Math.round(cv.clientWidth * DPR)), h = Math.max(1, Math.round(cv.clientHeight * DPR));
  if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; }
  S.w = w; S.h = h; fpx = h / (2 * Math.tan(FOV / 2));
  measure();
}

// pointer: drag to turn the galaxy (hero), tap a planet to fly to it
const SCR = new Array(N).fill(null);
function pick(x, y) {
  let best = -1, bd = 1e9;
  SCR.forEach((s, i) => { if (!s) return; const d = Math.hypot(s[0] - x, s[1] - y); const lim = Math.max(s[2] * 1.25, MOB ? 26 : 20); if (d < lim && d < bd) { bd = d; best = i; } });
  return best;
}
function inHero() { return !ST.length || scrollY + innerHeight / 2 < (ST[1] ? (ST[0].y + ST[1].y) / 2 : 1e9); }
cv.style.touchAction = 'pan-y';
addEventListener('pointerdown', e => {
  if (e.target !== cv && !e.target.closest('.yh-drag')) return;
  if (e.target.closest('a,button,input,select,textarea,.card,.yh-nodrag')) return;
  S.drag = { x: e.clientX, y: e.clientY, az: S.az, el: S.el, moved: 0, t: performance.now() };
});
addEventListener('pointermove', e => {
  if (S.drag) {
    const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag.moved = Math.max(S.drag.moved, Math.hypot(dx, dy));
    if (inHero() && S.drag.moved > 6) { S.az = S.drag.az - dx * 0.006; if (e.pointerType !== 'touch') S.el = clamp(S.drag.el + dy * 0.003, -0.35, 0.45); S.vaz = -e.movementX * 0.006 || 0; }
    return;
  }
  if (e.pointerType === 'mouse') { const i = pick(e.clientX, e.clientY); if (i !== S.hover) { S.hover = i; Y.onHover && Y.onHover(i, i >= 0 ? SCR[i] : null); cv.style.cursor = i >= 0 ? 'pointer' : ''; } }
});
addEventListener('pointerup', e => {
  const d = S.drag; S.drag = null; if (!d) return;
  if (d.moved > 6) { if (inHero()) { Y.onDragged && Y.onDragged(); } return; }
  const i = pick(e.clientX, e.clientY);
  if (i >= 0) { Y.onPick && Y.onPick(i); sfx(i); }
});

// ---------- sound: off until the visitor turns it on (soft space hum and a click) ----------
let AC = null, hum = null;
function sound(on) {
  if (on && !AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      const g = AC.createGain(); g.gain.value = 0; g.connect(AC.destination);
      const f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.connect(g);
      [55, 82.4, 110.2].forEach((hz, i) => { const o = AC.createOscillator(); o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = hz; o.detune.value = (i - 1) * 7; const og = AC.createGain(); og.gain.value = i === 2 ? 0.05 : 0.12; o.connect(og); og.connect(f); o.start(); });
      const lfo = AC.createOscillator(), lg = AC.createGain(); lfo.frequency.value = 0.07; lg.gain.value = 180; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
      hum = g;
    } catch (e) { AC = null; }
  }
  if (!AC) return;
  if (on) AC.resume();
  hum.gain.cancelScheduledValues(AC.currentTime); hum.gain.setTargetAtTime(on ? 0.22 : 0, AC.currentTime, 0.4);
  S.sound = on;
}
function sfx(i) {
  if (!AC || !S.sound) return;
  const t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(660 + (i % 6) * 110, t); o.frequency.exponentialRampToValueAtTime(220, t + 0.35);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  o.connect(g); g.connect(AC.destination); o.start(t); o.stop(t + 0.55);
}

// ---------- draw ----------
function frame(now) {
  if (!S.running) return;
  requestAnimationFrame(frame);
  const t = now / 1000, dt = Math.min(0.05, t - (S.time || t)); S.time = t;
  if (cv.style.opacity === '0') return;
  if (!S.drag && Math.abs(S.vaz) > 1e-5) { S.az += S.vaz; S.vaz *= 0.94; }
  if (!RED) S.rot += dt * 0.012;
  if (S.open < 1) {
    if (!S.openT0) S.openT0 = t;
    S.open = clamp((t - S.openT0) / 3.0);
    Y.onOpening && Y.onOpening(S.open);
  }
  const hero = poseHero();
  let P = S.open < 1 ? openingPose(S.open, hero) : currentPose();
  if (S.open < 1 && scrollY > 10) { S.open = 1; Y.onOpening && Y.onOpening(1); }
  if (!RED && S.open >= 1 && inHero() && !S.drag) S.az += dt * 0.025;
  lookAt(view, P.e, P.c, [0, 1, 0]);
  persp(proj, FOV, S.w / S.h, 0.5, 2000, P.sx, P.sy);
  mmul(vp, proj, view);
  camR = [view[0], view[4], view[8]]; camU = [view[1], view[5], view[9]]; camE = P.e;
  gl.viewport(0, 0, S.w, S.h);
  gl.clearColor(0.012, 0.014, 0.024, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const o = S.open, reveal = o < 1 ? eio(clamp((o - 0.3) / 0.6)) : 1, planetsA = o < 1 ? clamp((o - 0.55) / 0.35) : 1;
  const ps = fpx * 0.5;
  // stars and disc (additive)
  gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(PTS.p); gl.uniformMatrix4fv(PTS.u.vp, false, vp); gl.uniform1f(PTS.u.ps, ps); gl.uniform1f(PTS.u.time, t);
  attr(gl, PTS, 'p', sB, 3, 7, 0); attr(gl, PTS, 'c', sB, 4, 7, 3);
  gl.uniform1f(PTS.u.rot, 0); gl.uniform1f(PTS.u.reveal, 9); gl.uniform1f(PTS.u.bright, 0.5 + 0.5 * reveal); gl.uniform1f(PTS.u.tw, 1);
  gl.drawArrays(gl.POINTS, 0, sN);
  attr(gl, PTS, 'p', gB, 3, 7, 0); attr(gl, PTS, 'c', gB, 4, 7, 3);
  gl.uniform1f(PTS.u.rot, S.rot); gl.uniform1f(PTS.u.reveal, reveal); gl.uniform1f(PTS.u.bright, 1); gl.uniform1f(PTS.u.tw, 0.3);
  gl.drawArrays(gl.POINTS, 0, gN);
  // orbit rings
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  gl.useProgram(RG.p); gl.uniformMatrix4fv(RG.u.vp, false, vp); gl.uniform1f(RG.u.rot, S.rot); attr(gl, RG, 'p', ringB, 3);
  for (let i = 0; i < N; i++) {
    const on = (i === P.act ? 1 : 0) + (i === S.hover ? 0.6 : 0);
    gl.uniform3fv(RG.u.col, on ? [1, 0.85, 0.5] : [0.6, 0.66, 0.85]); gl.uniform1f(RG.u.a, (0.07 + 0.3 * on) * planetsA);
    gl.drawArrays(gl.LINE_LOOP, i * RING, RING);
  }
  // the core glow and the D
  gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(GLW.p); gl.uniformMatrix4fv(GLW.u.vp, false, vp); attr(gl, GLW, 'q', quad, 2);
  gl.uniform3fv(GLW.u.cr, camR); gl.uniform3fv(GLW.u.cu, camU); gl.uniform3fv(GLW.u.cen, [0, 0, 0]);
  const gA = P.gA === undefined ? 1 : P.gA, dA = P.dA === undefined ? 1 : P.dA;
  gl.uniform1f(GLW.u.rad, 26); gl.uniform3fv(GLW.u.col, [0.55, 0.38, 0.16]); gl.uniform1f(GLW.u.a, (0.55 + 0.45 * reveal) * gA); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.uniform1f(GLW.u.rad, 9); gl.uniform3fv(GLW.u.col, [0.9, 0.7, 0.4]); gl.uniform1f(GLW.u.a, 0.5 * ss(clamp(o * 2)) * Math.min(dA, 1)); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.useProgram(DP.p); gl.uniformMatrix4fv(DP.u.vp, false, vp); gl.uniform3fv(DP.u.cr, camR); gl.uniform3fv(DP.u.cu, camU);
  gl.uniform1f(DP.u.form, o < 1 ? clamp(o / 0.4) : 1); gl.uniform1f(DP.u.ps, ps); gl.uniform1f(DP.u.bright, 0.75 * dA); gl.uniform1f(DP.u.time, t);
  attr(gl, DP, 'dxy', dB, 2, 8, 0); attr(gl, DP, 'sc', dB, 3, 8, 2); attr(gl, DP, 'c', dB, 3, 8, 5);
  gl.drawArrays(gl.POINTS, 0, dN);
  // planets, far to near
  gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.useProgram(PL.p); gl.uniformMatrix4fv(PL.u.vp, false, vp); gl.uniform3fv(PL.u.cr, camR); gl.uniform3fv(PL.u.cu, camU); gl.uniform1f(PL.u.time, t);
  attr(gl, PL, 'q', quad, 2);
  const order = PLANETS.map(p => { const w = planetPos(p, S.rot); return { p, w, d: len(sub(w, camE)) }; }).sort((a, b) => b.d - a.d);
  for (const { p, w } of order) {
    const target = (p.i === P.act ? 1 : 0) * (P.actK === undefined ? 1 : P.actK) + (p.i === S.hover ? 0.8 : 0);
    p.hi += (clamp(target) - p.hi) * 0.12;
    const Lw = nrm(sub([0, 0, 0], w)), Lv = nrm([dot(Lw, camR), dot(Lw, camU), dot(Lw, nrm(sub(camE, w)))]);
    gl.uniform3fv(PL.u.cen, w); gl.uniform1f(PL.u.rad, p.rad); gl.uniform3fv(PL.u.c1, p.c1); gl.uniform3fv(PL.u.c2, p.c2);
    gl.uniform3fv(PL.u.L, Lv); gl.uniform1f(PL.u.seed, p.seed); gl.uniform1f(PL.u.hi, p.hi); gl.uniform1f(PL.u.a, planetsA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // where it is on screen, for taps and labels
    const c = xform(vp, w);
    if (c[3] > 0.5) {
      const x = (c[0] / c[3] * 0.5 + 0.5) * cv.clientWidth, y = (0.5 - c[1] / c[3] * 0.5) * cv.clientHeight, r = p.rad * fpx / c[3] / DPR;
      SCR[p.i] = planetsA > 0.5 && x > -40 && y > -40 && x < cv.clientWidth + 40 && y < cv.clientHeight + 40 ? [x, y, r] : null;
    } else SCR[p.i] = null;
  }
  gl.disable(gl.DEPTH_TEST);
  if (Y.onFrame) Y.onFrame(SCR, P);
}

// ---------- public ----------
Y.engine = {
  skip() { S.open = 1; Y.onOpening && Y.onOpening(1); },
  sound, sfx, measure,
  planet(i) { return SCR[i]; }
};
new ResizeObserver(resize).observe(cv);
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { S.running = !document.hidden; if (S.running) requestAnimationFrame(frame); });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
resize();
requestAnimationFrame(t => { cv.classList.add('on'); frame(t); });

// ======================================================================
//  THE CINEMA — a dark hall, a big curved screen playing the film
// ======================================================================
const C = Y.cinema;
if (!C || !C.host) return;
let cine = null;
function initCinema() {
  if (cine) return cine;
  const cvc = document.createElement('canvas'); cvc.className = 'yh-cine-gl'; cvc.setAttribute('aria-hidden', 'true'); C.host.prepend(cvc);
  const g = glctx(cvc); if (!g) return null;
  const vid = C.video;
  // screen: part of a cylinder around the seats, so its two ends come forward
  const CR = 19, TH = 0.56, SH = (2 * CR * TH) / 1.778, SY = 0.9, SEGS = MOB ? 32 : 64;
  const sv = [];
  for (let k = 0; k <= SEGS; k++) {
    const a = -TH + 2 * TH * k / SEGS, x = Math.sin(a) * CR, z = 4 - Math.cos(a) * CR, u = k / SEGS;
    sv.push(x, SY, z, u, 1, x, SY + SH, z, u, 0);
  }
  const scrB = buf(g, new Float32Array(sv));
  const floorB = buf(g, new Float32Array([-40, 0, -20, -40, 0, 14, 40, 0, -20, 40, 0, 14]));
  const wallB = buf(g, new Float32Array([-40, -1, -16.2, 40, -1, -16.2, -40, 22, -16.2, 40, 22, -16.2]));
  const SP = prog(g, `
attribute vec3 p; attribute vec2 uv; uniform mat4 vp; varying vec2 v;
void main(){ v = uv; gl_Position = vp*vec4(p, 1.0); }`, `precision mediump float; varying vec2 v; uniform sampler2D tx; uniform float a, has;
void main(){ vec3 c = has > 0.5 ? texture2D(tx, v).rgb : vec3(0.06,0.055,0.05);
  float edge = smoothstep(0.0, 0.012, v.x)*smoothstep(1.0, 0.988, v.x)*smoothstep(0.0, 0.02, v.y)*smoothstep(1.0, 0.98, v.y);
  gl_FragColor = vec4(c*a*mix(0.6, 1.0, edge), 1.0); }`);
  const FP = prog(g, `
attribute vec3 p; uniform mat4 vp; varying vec3 w; void main(){ w = p; gl_Position = vp*vec4(p, 1.0); }`, `precision mediump float; varying vec3 w;
uniform vec3 cl, cm, cr; uniform float a, floorY;
void main(){
  // light from the screen falls on the floor: strongest in front of it, coloured by what is on it (left, middle, right thirds)
  float dz = max(w.z + 15.0, 0.0);
  float spread = 1.0/(1.0 + dz*dz*0.012);
  float x = clamp(w.x/26.0 + 0.5, 0.0, 1.0);
  vec3 c = x < 0.5 ? mix(cl, cm, x*2.0) : mix(cm, cr, (x - 0.5)*2.0);
  float side = exp(-pow(w.x/(14.0 + dz*0.9), 2.0));
  float sheen = exp(-pow(w.x/(9.0 + dz*0.35), 2.0))*exp(-dz*0.11)*0.9;
  vec3 col = c*(spread*side*0.9 + sheen*1.25) + vec3(0.008, 0.008, 0.012);
  if (floorY < 0.5) { float up = clamp(w.y/22.0, 0.0, 1.0); col = c*0.42*exp(-pow(w.x/24.0, 2.0))*(1.0 - up)*(1.0 - up) + vec3(0.006); }
  gl_FragColor = vec4(col*a, 1.0);
}`);
  const tx = g.createTexture(); g.bindTexture(g.TEXTURE_2D, tx);
  [g.TEXTURE_WRAP_S, g.TEXTURE_WRAP_T].forEach(k => g.texParameteri(g.TEXTURE_2D, k, g.CLAMP_TO_EDGE));
  g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR); g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
  g.texImage2D(g.TEXTURE_2D, 0, g.RGB, 1, 1, 0, g.RGB, g.UNSIGNED_BYTE, new Uint8Array([10, 9, 8]));
  const smp = document.createElement('canvas'); smp.width = 12; smp.height = 6; const sx = smp.getContext('2d', { willReadFrequently: true });
  const st = { g, cvc, vid, scrB, floorB, wallB, SP, FP, tx, has: 0, smp, sx, col: [[.2, .16, .1], [.25, .2, .12], [.2, .16, .1]], tcol: [[.2, .16, .1], [.25, .2, .12], [.2, .16, .1]], lastS: 0, a: 0, px: 0, py: 0, tpx: 0, tpy: 0 };
  const upload = src => { try { g.bindTexture(g.TEXTURE_2D, tx); g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL, false); g.texImage2D(g.TEXTURE_2D, 0, g.RGB, g.RGB, g.UNSIGNED_BYTE, src); st.has = 1; sample(src); } catch (e) { } };
  function sample(src) {
    try {
      sx.drawImage(src, 0, 0, 12, 6); const d = sx.getImageData(0, 0, 12, 6).data;
      for (let third = 0; third < 3; third++) {
        let r = 0, gg = 0, b = 0, n = 0;
        for (let y = 0; y < 6; y++) for (let x = third * 4; x < third * 4 + 4; x++) { const o = (y * 12 + x) * 4; r += d[o]; gg += d[o + 1]; b += d[o + 2]; n++; }
        st.tcol[third] = [r / n / 255, gg / n / 255, b / n / 255];
      }
    } catch (e) { }
  }
  st.upload = upload;
  if (C.poster) { const im = new Image(); im.onload = () => { if (!vid || vid.readyState < 2) upload(im); }; im.src = C.poster; }
  addEventListener('pointermove', e => { if (!cine) return; st.tpx = (e.clientX / innerWidth - 0.5) * 2; st.tpy = (e.clientY / innerHeight - 0.5) * 2; });
  cine = st; return st;
}
const cvp = new Float32Array(16), cview = new Float32Array(16), cproj = new Float32Array(16);
function cineFrame(t) {
  requestAnimationFrame(cineFrame);
  const st = cine; if (!st) return;
  const q = C.progress ? C.progress() : 0;          // 0..1 through the cinema section
  const vis = q > 0 && q < 1;
  if (!vis && st.a < 0.01) return;
  const g = st.g, cvc = st.cvc;
  const w = Math.max(1, Math.round(cvc.clientWidth * DPR)), h = Math.max(1, Math.round(cvc.clientHeight * DPR));
  if (w !== cvc.width || h !== cvc.height) { cvc.width = w; cvc.height = h; }
  const target = vis ? ss(clamp(q / 0.16)) * ss(clamp((1 - q) / 0.14)) : 0;
  st.a += (target - st.a) * 0.12;
  const v = st.vid;
  if (v && v.readyState >= 2 && !v.paused && t - st.lastS > 33) { st.upload(v); st.lastS = t; }
  for (let k = 0; k < 3; k++) st.col[k] = mix(st.col[k], st.tcol[k], 0.08);
  st.px += (st.tpx - st.px) * 0.05; st.py += (st.tpy - st.py) * 0.05;
  if (C.onLight) C.onLight(st.col, st.a, st.px, st.py);
  const dolly = lerp(8.2, 5.6, ss(clamp((q - 0.1) / 0.8)));
  const eye = [st.px * 0.9, 1.9 - st.py * 0.35, dolly], at = [st.px * 0.4, 5.0 + (MOB ? 0.5 : 0), -14];
  lookAt(cview, eye, at, [0, 1, 0]); persp(cproj, MOB ? 1.2 : 0.95, w / h, 0.3, 200, 0, MOB ? -0.05 : 0.02); mmul(cvp, cproj, cview);
  g.viewport(0, 0, w, h); g.clearColor(0, 0, 0, 1); g.clear(g.COLOR_BUFFER_BIT); g.disable(g.DEPTH_TEST); g.disable(g.BLEND);
  const FP = st.FP; g.useProgram(FP.p); g.uniformMatrix4fv(FP.u.vp, false, cvp);
  g.uniform3fv(FP.u.cl, st.col[0]); g.uniform3fv(FP.u.cm, st.col[1]); g.uniform3fv(FP.u.cr, st.col[2]); g.uniform1f(FP.u.a, st.a);
  g.uniform1f(FP.u.floorY, 1); attr(g, FP, 'p', st.floorB, 3); g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  g.uniform1f(FP.u.floorY, 0); attr(g, FP, 'p', st.wallB, 3); g.drawArrays(g.TRIANGLE_STRIP, 0, 4);
  const SP = st.SP; g.useProgram(SP.p); g.uniformMatrix4fv(SP.u.vp, false, cvp); g.uniform1f(SP.u.a, st.a); g.uniform1f(SP.u.has, st.has);
  g.activeTexture(g.TEXTURE0); g.bindTexture(g.TEXTURE_2D, st.tx); g.uniform1i(SP.u.tx, 0);
  attr(g, SP, 'p', st.scrB, 3, 5, 0); attr(g, SP, 'uv', st.scrB, 2, 5, 3);
  g.drawArrays(g.TRIANGLE_STRIP, 0, (MOB ? 33 : 65) * 2);
  // the screen's top edge on the page, so the title can sit just above it
  if (C.onScreenTop) { const c = xform(cvp, [0, 0.9 + (2 * 19 * 0.56) / 1.778, -15]); C.onScreenTop((0.5 - c[1] / c[3] * 0.5) * cvc.clientHeight); }
}
Y.cine = {
  init() { const s = initCinema(); if (s && !s.loop) { s.loop = 1; requestAnimationFrame(cineFrame); } return !!s; },
  upload(src) { cine && cine.upload(src); }
};
})();
