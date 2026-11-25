/* Dinamics 银河 v2 — the galaxy, the planets, the cinema and the works in orbit. WebGL 1, no library. */
(() => {
'use strict';
const Y = window.YH || {};
const MOB = !!Y.mobile, RED = !!Y.reduced;

// ======================================================================
//  small math
// ======================================================================
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
const s5 = t => t * t * t * (t * (t * 6 - 15) + 10);
const eio = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const TAU = Math.PI * 2;
function rnd(seed) { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function gauss(r) { let u = 0; while (u === 0) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * r()); }
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
// centripetal-free Catmull–Rom (uniform), good enough between camera stations
function cr(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return [0, 1, 2].map(k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3));
}
// star colour from temperature (K), linear light
const TT = [[2600, [1, .42, .16]], [3400, [1, .6, .33]], [4200, [1, .74, .5]], [5000, [1, .85, .68]], [5800, [1, .93, .85]], [6600, [.96, .96, 1]], [7800, [.84, .89, 1]], [10000, [.72, .8, 1]], [15000, [.62, .72, 1]], [30000, [.55, .66, 1]]];
function tcol(T) {
  if (T <= TT[0][0]) return TT[0][1];
  for (let k = 1; k < TT.length; k++) if (T < TT[k][0]) return mix(TT[k - 1][1], TT[k][1], (T - TT[k - 1][0]) / (TT[k][0] - TT[k - 1][0]));
  return TT[TT.length - 1][1];
}

// ======================================================================
//  GL
// ======================================================================
const cv = document.createElement('canvas'); cv.className = 'yh-gl'; cv.setAttribute('aria-hidden', 'true');
(Y.host || document.body).appendChild(cv);
const gl = cv.getContext('webgl', { alpha: false, antialias: false, depth: true, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: true })
  || cv.getContext('experimental-webgl', { alpha: false, antialias: false, failIfMajorPerformanceCaveat: true });
// no graphics chip (the 3D would be drawn by the processor, a few frames a second): the still picture instead
const SOFT = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render|gdi generic/i;
const gpuName = () => { try { const x = gl.getExtension('WEBGL_debug_renderer_info'); return String(gl.getParameter(x ? x.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || ''); } catch (e) { return ''; } };
if (!gl || SOFT.test(gpuName())) { try { const lc = gl && gl.getExtension('WEBGL_lose_context'); if (lc) lc.loseContext(); } catch (e) {} document.documentElement.classList.add('no-gl'); cv.remove(); return; }
const HI = (() => { const f = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT); return f && f.precision > 0; })();
const PREC = HI ? 'precision highp float;\n' : 'precision mediump float;\n';
const MAXPT = Math.min(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE)[1] || 64, 512);
// render target format: half float if we can render to it, else 8 bit with headroom
const HDR = (() => {
  const h = gl.getExtension('OES_texture_half_float'), hl = gl.getExtension('OES_texture_half_float_linear');
  gl.getExtension('EXT_color_buffer_half_float');
  const test = type => {
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 4, 4, 0, gl.RGBA, type, null);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(f); gl.deleteTexture(t); return ok;
  };
  if (h && hl && test(h.HALF_FLOAT_OES)) return { type: h.HALF_FLOAT_OES, K: 1 };
  const f = gl.getExtension('OES_texture_float'), fl = gl.getExtension('OES_texture_float_linear');
  gl.getExtension('WEBGL_color_buffer_float');
  if (f && fl && test(gl.FLOAT)) return { type: gl.FLOAT, K: 1 };
  return { type: gl.UNSIGNED_BYTE, K: 0.25 };
})();
const K = HDR.K;

// shaders compile in the background (KHR_parallel_shader_compile): nothing here waits for the driver; the first frame is drawn only once every program reports done
const PSC = gl.getExtension('KHR_parallel_shader_compile');
const PROGS = [];
let BOOT = 0, BK = 0, BOOTP = null;   // 0: shaders compiling, 1: painting the galaxy map, 2: running
function prog(vs, fs) {
  const mk = (t, s) => { const sh = gl.createShader(t); gl.shaderSource(sh, s); gl.compileShader(sh); return sh; };
  const p = gl.createProgram(), v = mk(gl.VERTEX_SHADER, PREC + vs), f = mk(gl.FRAGMENT_SHADER, PREC + fs);
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  const P = { p, v, f, u: null, a: null, head: fs.split('\n').slice(0, 3).join('\n') };
  PROGS.push(P); return P;
}
const done = P => !!P.u || !PSC || gl.getProgramParameter(P.p, PSC.COMPLETION_STATUS_KHR);
function fin(P) {
  if (P.u) return P;
  if (!gl.getProgramParameter(P.p, gl.LINK_STATUS)) throw new Error((gl.getShaderInfoLog(P.v) || '') + (gl.getShaderInfoLog(P.f) || '') + (gl.getProgramInfoLog(P.p) || '') + '\n' + P.head);
  const p = P.p, u = {}, a = {};
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); i++) { const n = gl.getActiveUniform(p, i).name.replace(/\[0\]$/, ''); u[n] = gl.getUniformLocation(p, n); }
  for (let i = 0; i < gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES); i++) { const n = gl.getActiveAttrib(p, i).name; a[n] = gl.getAttribLocation(p, n); }
  P.u = u; P.a = a; return P;
}
function buf(data, kind = gl.ARRAY_BUFFER) { const b = gl.createBuffer(); gl.bindBuffer(kind, b); gl.bufferData(kind, data, gl.STATIC_DRAW); return b; }
let ATTR = [];
function attr(P, name, b, size, stride = 0, off = 0) {
  const l = fin(P).a[name]; if (l === undefined || l < 0) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, size, gl.FLOAT, false, stride * 4, off * 4); ATTR.push(l);
}
function use(P) { fin(P); ATTR.forEach(l => gl.disableVertexAttribArray(l)); ATTR = []; gl.useProgram(P.p); return P.u; }
function tex2d(w, h, type = gl.UNSIGNED_BYTE, filter = gl.LINEAR, data = null) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter === gl.NEAREST ? gl.NEAREST : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, type, data); return t;
}
function target(w, h, depth) {
  const t = tex2d(w, h, HDR.type), f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  let d = null;
  if (depth) { d = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, d); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { t, f, d, w, h };
}
function free(T) { if (!T) return; gl.deleteTexture(T.t); gl.deleteFramebuffer(T.f); if (T.d) gl.deleteRenderbuffer(T.d); }
const QUAD = buf(new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]));
const TRI = buf(new Float32Array([-1, -1, 3, -1, -1, 3]));

// ======================================================================
//  post: bloom (dual filter) + filmic tone map + grain
// ======================================================================
const VFS = `attribute vec2 q; varying vec2 uv; void main(){ uv = q*0.5 + 0.5; gl_Position = vec4(q, 0.0, 1.0); }`;
const PDOWN = prog(VFS, `varying vec2 uv; uniform sampler2D tx; uniform vec2 px; uniform float pre, thr;
vec3 tap(vec2 o){ vec3 c = texture2D(tx, uv + o*px).rgb; if (pre > 0.5) { float l = max(c.r, max(c.g, c.b)); float k = max(l - thr, 0.0); k = k*k/(k + thr*0.6 + 1e-4); c *= k/max(l, 1e-4); } return c; }
void main(){ vec3 c = tap(vec2(0.0))*4.0 + tap(vec2(-1.0,-1.0)) + tap(vec2(1.0,-1.0)) + tap(vec2(-1.0,1.0)) + tap(vec2(1.0,1.0)); gl_FragColor = vec4(c/8.0, 1.0); }`);
const PUP = prog(VFS, `varying vec2 uv; uniform sampler2D tx; uniform vec2 px; uniform float k;
void main(){ vec3 c = texture2D(tx, uv + vec2(-2.0,0.0)*px).rgb + texture2D(tx, uv + vec2(2.0,0.0)*px).rgb + texture2D(tx, uv + vec2(0.0,-2.0)*px).rgb + texture2D(tx, uv + vec2(0.0,2.0)*px).rgb
  + (texture2D(tx, uv + vec2(-1.0,-1.0)*px).rgb + texture2D(tx, uv + vec2(1.0,-1.0)*px).rgb + texture2D(tx, uv + vec2(-1.0,1.0)*px).rgb + texture2D(tx, uv + vec2(1.0,1.0)*px).rgb)*2.0;
  gl_FragColor = vec4(c/12.0*k, 1.0); }`);
const PCOMP = prog(VFS, `varying vec2 uv; uniform sampler2D sc, bl; uniform float bloom, expo, seed, vig, invK, lift;
vec3 aces(vec3 x){ return clamp((x*(2.51*x + 0.03))/(x*(2.43*x + 0.59) + 0.14), 0.0, 1.0); }
float h(vec2 p){ p = fract(p*vec2(0.1371, 0.1193)); p += dot(p, p.yx + 23.17); return fract((p.x + p.y)*p.x); }
void main(){
  vec3 c = (texture2D(sc, uv).rgb + texture2D(bl, uv).rgb*bloom)*invK*expo;
  c = aces(c);
  vec2 d = uv - 0.5; c *= 1.0 - vig*dot(d, d)*1.6;
  c = pow(c, vec3(1.0/2.2));
  c += (h(gl_FragCoord.xy + seed) - 0.5)*0.022 + lift;
  gl_FragColor = vec4(c, 1.0);
}`);
const R = { w: 1, h: 1, scene: null, lv: [], scale: 1 };
function resizeTargets(w, h) {
  if (R.scene && R.w === w && R.h === h) return;
  free(R.scene); R.lv.forEach(free); R.lv = [];
  R.w = w; R.h = h; R.scene = target(w, h, true);
  let lw = w, lh = h;
  for (let i = 0; i < (MOB ? 5 : 6); i++) { lw = Math.max(1, lw >> 1); lh = Math.max(1, lh >> 1); R.lv.push(target(lw, lh, false)); if (lw < 8 || lh < 8) break; }
}
function post(P) {
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  // down
  let src = R.scene;
  R.lv.forEach((L, i) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, L.f); gl.viewport(0, 0, L.w, L.h); gl.disable(gl.BLEND);
    const u = use(PDOWN); attr(PDOWN, 'q', TRI, 2);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src.t); gl.uniform1i(u.tx, 0);
    gl.uniform2f(u.px, 1 / src.w, 1 / src.h); gl.uniform1f(u.pre, i === 0 ? 1 : 0); gl.uniform1f(u.thr, 0.9 * K);
    gl.drawArrays(gl.TRIANGLES, 0, 3); src = L;
  });
  // up, adding into the level above
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  for (let i = R.lv.length - 1; i > 0; i--) {
    const S0 = R.lv[i], D0 = R.lv[i - 1];
    gl.bindFramebuffer(gl.FRAMEBUFFER, D0.f); gl.viewport(0, 0, D0.w, D0.h);
    const u = use(PUP); attr(PUP, 'q', TRI, 2);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S0.t); gl.uniform1i(u.tx, 0);
    gl.uniform2f(u.px, 0.5 / S0.w, 0.5 / S0.h); gl.uniform1f(u.k, 0.8);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  gl.disable(gl.BLEND);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, cv.width, cv.height);
  const u = use(PCOMP); attr(PCOMP, 'q', TRI, 2);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, R.scene.t); gl.uniform1i(u.sc, 0);
  gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, R.lv[0].t); gl.uniform1i(u.bl, 1);
  gl.uniform1f(u.bloom, P.bloom); gl.uniform1f(u.expo, P.expo); gl.uniform1f(u.seed, (S.frame % 64) * 17.0);
  gl.uniform1f(u.vig, P.vig); gl.uniform1f(u.invK, 1 / K); gl.uniform1f(u.lift, 0.0);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.activeTexture(gl.TEXTURE0);
}

// ======================================================================
//  THE GALAXY — a two-armed spiral from the density-wave picture:
//  stars run on ellipses whose tilt grows with size; where they crowd, the arms appear.
// ======================================================================
const N = Y.crafts || 18;
const RC = 11, RG = 70, RF = 100, E1 = 0.74, E2 = 0.92, OFF = 0.08;
const exF = a => a < RC ? 1 + (a / RC) * (E1 - 1) : a < RG ? E1 + (a - RC) / (RG - RC) * (E2 - E1) : a < RF ? E2 + (a - RG) / (RF - RG) * (1 - E2) : 1;
function orbit(a, th, shift = 0) {
  const b = a * exF(a), be = a * OFF + shift, ct = Math.cos(th), st = Math.sin(th), cb = Math.cos(be), sb = Math.sin(be);
  return [a * ct * cb - b * st * sb, a * ct * sb + b * st * cb];
}
// the crest of one arm, worked out from the same ellipses: radius grows ~linearly with angle
const ARM = [[0.576, 13.1], [0.926, 17.57], [1.274, 21.71], [1.623, 25.84], [1.972, 30.0], [2.321, 34.21], [2.67, 38.47], [3.019, 42.78], [3.368, 47.13], [3.717, 51.51], [4.066, 55.9], [4.415, 60.31], [4.764, 64.68], [4.878, 66.1]];
function armAt(r) { for (let k = 1; k < ARM.length; k++) if (r <= ARM[k][1]) { const f = (r - ARM[k - 1][1]) / (ARM[k][1] - ARM[k - 1][1]); return lerp(ARM[k - 1][0], ARM[k][0], f); } return ARM[ARM.length - 1][0]; }

// arm-contrast map: star density divided by its ring average, on a grid
const GRID = 160, GEXT = 100;
function contrastMap(pts) {
  const g = new Float32Array(GRID * GRID), cell = (2 * GEXT) / GRID;
  for (const [x, z] of pts) { const i = Math.floor((x + GEXT) / cell), j = Math.floor((z + GEXT) / cell); if (i >= 0 && j >= 0 && i < GRID && j < GRID) g[j * GRID + i]++; }
  // blur 2 passes box 3
  const b = new Float32Array(g.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) { let s = 0, n = 0; for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i + di, jj = j + dj; if (ii >= 0 && jj >= 0 && ii < GRID && jj < GRID) { s += g[jj * GRID + ii]; n++; } } b[j * GRID + i] = s / n; }
    g.set(b);
  }
  const RB = 64, rs = new Float32Array(RB), rn = new Float32Array(RB);
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) { const x = (i + .5) * cell - GEXT, z = (j + .5) * cell - GEXT, k = Math.min(RB - 1, Math.floor(Math.hypot(x, z) / (GEXT * 1.42) * RB)); rs[k] += g[j * GRID + i]; rn[k]++; }
  for (let j = 0; j < GRID; j++) for (let i = 0; i < GRID; i++) { const x = (i + .5) * cell - GEXT, z = (j + .5) * cell - GEXT, k = Math.min(RB - 1, Math.floor(Math.hypot(x, z) / (GEXT * 1.42) * RB)); const m = rs[k] / Math.max(rn[k], 1); g[j * GRID + i] = m > 0 ? g[j * GRID + i] / m : 0; }
  return (x, z) => { const i = clamp(Math.floor((x + GEXT) / cell), 0, GRID - 1), j = clamp(Math.floor((z + GEXT) / cell), 0, GRID - 1); return g[j * GRID + i]; };
}

const G = {};
// the galaxy as a picture seen from above: light (rgb) and dust (a), solved per texel from the ellipses
const GMAP = MOB ? 512 : 1024, GEXTM = 104;
const GBAKE = prog(`attribute vec2 q; varying vec2 uv; void main(){ uv = q; gl_Position = vec4(q, 0.0, 1.0); }`, `varying vec2 uv;
uniform float RC, RG, RF, E1, E2, OFF, EXT;
float exF(float a){ return a < RC ? 1.0 + (a/RC)*(E1 - 1.0) : a < RG ? E1 + (a - RC)/(RG - RC)*(E2 - E1) : a < RF ? E2 + (a - RG)/(RF - RG)*(1.0 - E2) : 1.0; }
float rho(float a, float ph, float sh){ float b = a*exF(a), d = ph - (a*OFF + sh); float c = cos(d), s = sin(d); return a*b/sqrt(b*b*c*c + a*a*s*s); }
// semi-major axis of the ellipse through (r, ph), and how crowded the ellipses are there
vec2 solve(float r, float ph, float sh){
  float lo = 0.05, hi = 150.0;
  for (int i = 0; i < 18; i++) { float m = 0.5*(lo + hi); if (rho(m, ph, sh) < r) lo = m; else hi = m; }
  float a = 0.5*(lo + hi);
  float j = (rho(a + 0.06, ph, sh) - rho(max(a - 0.06, 0.01), ph, sh))/0.12;
  return vec2(a, 1.0/max(j, 0.12));
}
float h3(vec3 p){ p = fract(p*vec3(0.1173, 0.1311, 0.1427)); p += dot(p, p.zyx + 19.19); return fract((p.x + p.z)*p.y); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
const mat3 RO = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float fbm(vec3 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 6; i++) { s += a*vn(p); p = RO*p*2.02 + 1.7; a *= 0.5; } return s; }
void main(){
  vec2 P = uv*EXT; float r = max(length(P), 0.02), ph = atan(P.y, P.x + 1e-6);
  vec2 S = solve(r, ph, 0.0), D = solve(r, ph, 0.2);
  float a = S.x, ad = D.x;
  // noise in coordinates that run along the orbits (fast across, slow along), so clumps and lanes trail the arms
  vec2 cs = vec2(cos(ph), sin(ph));
  vec3 o = vec3(a*0.55, cs*max(a*0.12, 1.8)), od = vec3(ad*0.75, cs*max(ad*0.16, 2.2));
  float n0 = fbm(o*0.5 + 2.0), n1 = fbm(o*1.4 + 4.0), n2 = fbm(o*3.8 + 9.0);
  float nf = fbm(od*2.4 + 1.7), nr = 1.0 - abs(fbm(od*4.4 + 7.0)*2.0 - 1.0), nb = fbm(od*0.7 + 5.0);
  float A = S.y*(0.6 + 0.8*n0), Ad = D.y*(0.55 + 0.9*nb);
  float disk = exp(-a/14.0)*smoothstep(104.0, 62.0, a)*(0.4 + 0.6*smoothstep(0.0, 8.0, a));
  float arm = pow(clamp(A, 0.25, 4.0), 1.6);
  float young = smoothstep(0.95, 1.75, A)*smoothstep(0.32, 0.7, n1)*smoothstep(7.0, 18.0, a)*(0.4 + 1.6*n2*n2);
  float knots = smoothstep(0.64, 0.86, n2)*smoothstep(1.25, 2.1, A)*smoothstep(10.0, 18.0, a);
  vec3 old = vec3(1.0, 0.86, 0.72)*disk*(0.16 + 0.6*arm)*(0.5 + 1.0*n1);
  vec3 blue = vec3(0.5, 0.66, 1.0)*disk*young*4.6;
  vec3 pink = vec3(1.0, 0.27, 0.5)*disk*knots*4.0;
  vec3 E = old + blue + pink;
  float dd = exp(-ad/26.0)*smoothstep(5.0, 14.0, ad)*smoothstep(98.0, 62.0, ad);
  float lane = pow(clamp(Ad, 0.2, 4.0), 2.0)*(0.12 + 2.4*nr*nr*nr)*smoothstep(0.22, 0.58, nb);
  float dust = dd*(lane + 0.22*smoothstep(0.48, 0.82, nf)*nr);
  gl_FragColor = vec4(sqrt(clamp(E/6.0, 0.0, 1.0)), sqrt(clamp(dust/2.5, 0.0, 1.0)));
}`);
// the map is painted a band at a time over the first frames, so no single GPU job is long
const MAPB = { band: 0, n: 8, F: null };
{
  const T = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, T);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, GMAP, GMAP, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  MAPB.F = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, MAPB.F); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, T, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  G.map = T;
}
function bakeMap() {
  if (MAPB.band >= MAPB.n) return true;
  const h = GMAP / MAPB.n, y0 = MAPB.band * h;
  gl.bindFramebuffer(gl.FRAMEBUFFER, MAPB.F); gl.viewport(0, 0, GMAP, GMAP); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  gl.enable(gl.SCISSOR_TEST); gl.scissor(0, y0, GMAP, h);
  const u = use(GBAKE); attr(GBAKE, 'q', TRI, 2);
  gl.uniform1f(u.RC, RC); gl.uniform1f(u.RG, RG); gl.uniform1f(u.RF, RF); gl.uniform1f(u.E1, E1); gl.uniform1f(u.E2, E2); gl.uniform1f(u.OFF, OFF); gl.uniform1f(u.EXT, GEXTM);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.disable(gl.SCISSOR_TEST); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (++MAPB.band < MAPB.n) return false;
  gl.deleteFramebuffer(MAPB.F); MAPB.F = null;
  gl.bindTexture(gl.TEXTURE_2D, G.map); gl.generateMipmap(gl.TEXTURE_2D);
  return true;
}
{
  const r = rnd(20261125);
  const gam = h => h * (-Math.log(1 - r()) - Math.log(1 - r()));
  const probe = [];
  for (let k = 0; k < 60000; k++) { const a = 2 + r() * 98, th = r() * TAU; probe.push(orbit(a, th)); }
  const C = contrastMap(probe);
  const armK = (x, z) => ss(clamp((C(x, z) - 1.05) / 1.1));
  // stars bright enough to see one by one
  const NS = MOB ? 7000 : 18000, s = new Float32Array(NS * 9);
  for (let k = 0; k < NS; k++) {
    const bulge = r() < 0.12, a = bulge ? Math.min(gam(2.4), 16) : Math.min(gam(15), 99), th = r() * TAU;
    let [x, z] = orbit(a, th); x += gauss(r) * 0.8; z += gauss(r) * 0.8;
    const y = gauss(r) * (bulge ? 1.2 + 2 * Math.exp(-a / 4) : 0.25 + 0.8 * Math.exp(-a / 9));
    const ak = armK(x, z);
    const T = bulge ? 3200 + 2600 * r() : (r() < 0.2 + ak * 0.6 ? 7000 + 16000 * Math.pow(r(), 2) : 3000 + 4200 * r());
    const c = tcol(T), L = (0.05 + 1.1 * Math.pow(r(), 8) + (T > 9000 ? 0.25 * r() : 0)) * (bulge ? 0.5 : 1);
    s.set([x, y, z, c[0], c[1], c[2], L, 0.16 + 0.1 * r(), 10.0], k * 9);
  }
  G.stars = { b: buf(s), n: NS };
  // star-forming knots on the arms: pink, with a few hot stars
  const NH = MOB ? 120 : 300, hh = new Float32Array(NH * 4 * 9);
  let nh = 0;
  for (let tries = 0; nh < NH * 4 && tries < NH * 80; tries++) {
    const a = 12 + r() * 56, th = r() * TAU;
    let [x, z] = orbit(a, th); x += gauss(r) * 0.5; z += gauss(r) * 0.5;
    if (C(x, z) < 1.8 + r() * 0.6) continue;
    const y = gauss(r) * 0.2;
    hh.set([x, y, z, 1.0, 0.32, 0.55, 0.05 + 0.12 * r(), 0.35 + 0.5 * r(), 4.5], nh * 9); nh++;
    const m = 1 + Math.floor(r() * 3);
    for (let q = 0; q < m && nh < NH * 4; q++) { const c = tcol(12000 + r() * 15000); hh.set([x + gauss(r) * 0.45, y + gauss(r) * 0.15, z + gauss(r) * 0.45, c[0], c[1], c[2], 0.5 + 1.0 * r(), 0.2, 10.0], nh * 9); nh++; }
  }
  G.hii = { b: buf(hh.subarray(0, nh * 9)), n: nh };
  // the sky far behind: stars of our own neighbourhood, and other galaxies
  const NB = MOB ? 2200 : 5200, bg = new Float32Array(NB * 9);
  for (let k = 0; k < NB; k++) {
    const u = r() * 2 - 1, ph = r() * TAU, q = Math.sqrt(1 - u * u), Rr = 1500;
    const c = tcol(3200 + Math.pow(r(), 1.5) * 14000), L = 0.05 + 1.2 * Math.pow(r(), 10);
    bg.set([q * Math.cos(ph) * Rr, u * Rr, q * Math.sin(ph) * Rr, c[0], c[1], c[2], L, 1.0 + 1.3 * Math.pow(r(), 3), 7.0], k * 9);
  }
  G.bg = { b: buf(bg), n: NB };
  const NF = MOB ? 24 : 48, fg = new Float32Array(NF * 10);
  for (let k = 0; k < NF; k++) {
    const u = r() * 1.6 - 0.8, ph = r() * TAU, q = Math.sqrt(1 - u * u), Rr = 1400;
    const c = mix([1, 0.86, 0.7], [0.85, 0.9, 1], r());
    fg.set([q * Math.cos(ph) * Rr, u * Rr, q * Math.sin(ph) * Rr, c[0], c[1], c[2], 0.03 + 0.08 * r(), 3 + 9 * Math.pow(r(), 2), 0.2 + 0.7 * r(), r() * Math.PI], k * 10);
  }
  G.far = { b: buf(fg), n: NF };
}
// the D, from the logo's own strokes (100×100 box, y down)
{
  const r = rnd(7);
  const SEG = Y.dStrokes || [[22, 42, 22, 88, 11], [22, 17, 22, 17, 13], [37, 14, 52, 14, 10], [52, 14, 63.4, 15.8, 11.5], [63.4, 15.8, 73.7, 21.1, 11.2], [73.7, 21.1, 81.9, 29.3, 10.7], [81.9, 29.3, 87.2, 39.6, 10], [87.2, 39.6, 89, 51, 9.1], [89, 51, 87.2, 62.4, 8.1], [87.2, 62.4, 81.9, 72.7, 6.9], [81.9, 72.7, 73.7, 80.9, 5.5], [73.7, 80.9, 63.4, 86.2, 4], [63.4, 86.2, 52, 88, 2.4], [52, 88, 36, 88, 1.5]];
  let L = 0; const segL = SEG.map(s => Math.max(Math.hypot(s[2] - s[0], s[3] - s[1]), s[4] * 0.8)); segL.forEach(x => L += x);
  const dn = MOB ? 1800 : 3600, d = new Float32Array(dn * 8);
  for (let k = 0; k < dn; k++) {
    let pick = r() * L, si = 0; while (pick > segL[si] && si < SEG.length - 1) { pick -= segL[si]; si++; }
    const s = SEG[si], f = r(), w = s[4] * 0.5 * Math.sqrt(r()), ang = r() * TAU;
    let x = lerp(s[0], s[2], f) + Math.cos(ang) * w, y = lerp(s[1], s[3], f) + Math.sin(ang) * w;
    x = (x - 55) * 0.085; y = -(y - 51) * 0.085;
    const u = r() * 2 - 1, ph = r() * TAU, q = Math.sqrt(1 - u * u), Rr = 30 + r() * 60;
    d.set([x, y, q * Math.cos(ph) * Rr, u * Rr * 0.6, q * Math.sin(ph) * Rr, 0.55 + r() * 0.45, r(), 0.5 + r() * 1.1], k * 8);
  }
  G.D = { b: buf(d), n: dn };
}

const SPR = prog(`attribute vec3 p; attribute vec4 c; attribute vec2 s;
uniform mat4 vp; uniform float rot, ps, reveal, fixedPx, maxPx, aMul, time, tw;
varying vec4 vc; varying float vk;
void main(){
  float cs = cos(rot), sn = sin(rot);
  vec3 q = vec3(cs*p.x - sn*p.z, p.y, sn*p.x + cs*p.z);
  gl_Position = vp*vec4(q, 1.0);
  float px = fixedPx > 0.5 ? s.x*fixedPx : s.x*ps/max(gl_Position.w, 0.01);
  float a = c.a*aMul;
  if (fixedPx < 0.5 && s.y > 8.0) { px = (1.2 + s.x*5.0)*ps/1000.0; a *= clamp(70.0/max(gl_Position.w, 1.0), 0.35, 3.0); }
  else if (fixedPx < 0.5) { a *= smoothstep(6.0, 22.0, gl_Position.w); px = min(px, 28.0*ps/1000.0); }
  a *= 1.0 - smoothstep(reveal*112.0 - 18.0, reveal*112.0, length(p.xz));
  a *= 1.0 - smoothstep(maxPx*0.5, maxPx*0.95, px);
  if (tw > 0.0) a *= 1.0 + tw*sin(time*(1.3 + fract(p.x*0.37)*2.0) + p.z);
  if (px < 1.5) { a *= px*px/2.25; px = 1.5; }
  gl_PointSize = px;
  vc = vec4(c.rgb, a); vk = s.y;
}`, `varying vec4 vc; varying float vk; uniform float dark, K;
void main(){
  vec2 q = gl_PointCoord - 0.5; float d = dot(q, q)*4.0;
  float g = exp(-d*vk)*(1.0 - smoothstep(0.7, 1.0, d))*vc.a;
  if (dark > 0.5) gl_FragColor = vec4(vc.rgb*g, 1.0);
  else gl_FragColor = vec4(vc.rgb*g*K, 1.0);
}`);
const FARG = prog(`attribute vec3 p; attribute vec4 c; attribute vec3 s; uniform mat4 vp; uniform float fixedPx;
varying vec4 vc; varying vec2 vs;
void main(){ gl_Position = vp*vec4(p, 1.0); gl_PointSize = s.x*fixedPx; vc = c; vs = s.yz; }`, `varying vec4 vc; varying vec2 vs; uniform float K;
void main(){ vec2 q = gl_PointCoord - 0.5; float cs = cos(vs.y), sn = sin(vs.y); q = vec2(cs*q.x - sn*q.y, sn*q.x + cs*q.y); q.y /= max(vs.x, 0.15);
  float d = dot(q, q)*4.0; float g = (exp(-d*5.0) + exp(-d*40.0)*0.8)*(1.0 - smoothstep(0.6, 1.0, d))*vc.a; gl_FragColor = vec4(vc.rgb*g*K, 1.0); }`);
const DPP = prog(`attribute vec2 dxy; attribute vec3 sc; attribute vec3 c;
uniform mat4 vp; uniform vec3 cr, cu; uniform float form, ps, bright, time;
varying float va; varying float vh;
void main(){
  float f = smoothstep(0.0, 1.0, clamp(form*1.35 - c.y*0.35, 0.0, 1.0));
  vec3 home = cr*dxy.x + cu*dxy.y;
  vec3 q = mix(sc, home, f) + (cr*sin(time*0.9 + c.y*20.0) + cu*cos(time*0.7 + c.y*13.0))*0.05*f;
  gl_Position = vp*vec4(q, 1.0);
  va = c.x*bright*(0.35 + 0.65*f); vh = c.y;
  gl_PointSize = clamp(c.z*ps*0.85/gl_Position.w, 1.0, 40.0);
}`, `varying float va; varying float vh; uniform float K;
void main(){ vec2 q = gl_PointCoord - 0.5; float d = dot(q, q)*4.0; float a = exp(-d*3.4)*(1.0 - smoothstep(0.7, 1.0, d))*va;
  vec3 col = mix(vec3(1.0, 0.62, 0.26), vec3(1.0, 0.86, 0.6), vh); gl_FragColor = vec4(col*a*K, 1.0); }`);
const NSTEP = MOB ? 14 : 24;
const GVOL = prog(`attribute vec2 q; varying vec2 ndc; void main(){ ndc = q; gl_Position = vec4(q, 0.0, 1.0); }`, `varying vec2 ndc;
uniform sampler2D map; uniform vec3 eye, cr, cu, cf; uniform vec2 shift; uniform float th, asp, rot, reveal, K, gA, coreA, jit, ext, kE, kD;
float h2(vec2 p){ p = fract(p*vec2(0.1031, 0.1173)); p += dot(p, p.yx + 21.37); return fract((p.x + p.y)*p.x); }
// light of a flattened gaussian lump at the centre, summed along the ray (exact)
float gline(vec3 o, vec3 d, float s, float q){ vec3 A = vec3(1.0, 1.0/(q*q), 1.0)/(s*s); float dad = dot(d*d, A), oad = dot(o*d, A), oao = dot(o*o, A); return sqrt(3.14159/dad)*exp(-(oao - oad*oad/dad)); }
void main(){
  vec3 d = normalize(cf + cr*(ndc.x - shift.x)*th*asp + cu*(ndc.y - shift.y)*th);
  float cs = cos(-rot), sn = sin(-rot);
  vec3 o = vec3(cs*eye.x - sn*eye.z, eye.y, sn*eye.x + cs*eye.z);
  d = vec3(cs*d.x - sn*d.z, d.y, sn*d.x + cs*d.z);
  const float H = 4.5, RM = 106.0;
  float t0 = 0.0, t1 = 600.0;
  if (abs(d.y) > 1e-5) { float ta = (-H - o.y)/d.y, tb = (H - o.y)/d.y; t0 = max(min(ta, tb), 0.0); t1 = min(max(ta, tb), 600.0); }
  else if (abs(o.y) > H) t1 = -1.0;
  float A = dot(d.xz, d.xz), B = dot(o.xz, d.xz), C = dot(o.xz, o.xz) - RM*RM, disc = B*B - A*C;
  if (disc < 0.0 || A < 1e-8) { if (C > 0.0) t1 = -1.0; }
  else { float sq = sqrt(disc); t0 = max(t0, (-B - sq)/A); t1 = min(t1, (-B + sq)/A); }
  vec3 E = vec3(0.0); float T = 1.0;
  if (t1 > t0) {
    float dt = (t1 - t0)/float(${NSTEP});
    float t = t0 + dt*h2(gl_FragCoord.xy + jit);
    for (int i = 0; i < ${NSTEP}; i++) {
      vec3 p = o + d*t;
      vec4 m = texture2D(map, p.xz/(2.0*ext) + 0.5);
      float r = length(p.xz);
      float se = 0.32 + 1.5*exp(-r/9.0), sd = 0.14 + 0.45*exp(-r/9.0);
      float we = exp(-p.y*p.y/(se*se))/se, wd = exp(-p.y*p.y/(sd*sd))/sd;
      float rv = 1.0 - smoothstep(reveal*112.0 - 18.0, reveal*112.0, r);
      float near = smoothstep(3.0, 26.0, t);
      E += T*m.rgb*m.rgb*(6.0*kE*rv*we*dt*near);
      T *= exp(-m.a*m.a*2.5*kD*rv*wd*dt*(0.3 + 0.7*near));
      t += dt;
    }
  }
  float rb = smoothstep(0.0, 0.5, reveal);
  float Bl = 1.1*gline(o, d, 0.55, 0.82) + 0.22*gline(o, d, 1.7, 0.74) + 0.035*gline(o, d, 5.0, 0.64);
  E += vec3(1.0, 0.78, 0.55)*Bl*coreA*rb*(0.4 + 0.6*T);
  gl_FragColor = vec4(E*gA*K, mix(1.0, T, gA));
}`);

// ======================================================================
//  PLANETS — each surface baked once into a cube map (colour + height, clouds + night light),
//  then drawn as a true sphere per pixel: terminator, ocean glint, cloud shadows, air glow, rings.
// ======================================================================
const NOISE = `float h3(vec3 p){ p = fract(p*vec3(0.1173, 0.1311, 0.1427)); p += dot(p, p.zyx + 19.19); return fract((p.x + p.z)*p.y); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*f*(f*(f*6.0 - 15.0) + 10.0);
  return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
const mat3 RO = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float fbm(vec3 p, float oc){ float s = 0.0, a = 0.5, w = 0.0; for (int i = 0; i < 9; i++) { if (float(i) >= oc) break; s += a*vn(p); w += a; p = RO*p*2.03 + 1.3; a *= 0.5; } return s/w; }
float ridged(vec3 p, float oc){ float s = 0.0, a = 0.5, w = 0.0, pr = 1.0; for (int i = 0; i < 9; i++) { if (float(i) >= oc) break; float n = 1.0 - abs(vn(p)*2.0 - 1.0); n *= n; s += a*n*pr; pr = n; w += a; p = RO*p*2.1 + 2.7; a *= 0.5; } return s/w; }
`;
const PBAKE = prog(`attribute vec2 q; varying vec2 uv; void main(){ uv = q; gl_Position = vec4(q, 0.0, 1.0); }`, `varying vec2 uv;
uniform float face, type, outB;
uniform vec3 seed, C0, C1, C2, C3, C4, C5;
uniform vec4 P, Q, ST;
${NOISE}
vec3 faceDir(float f, vec2 s){
  if (f < 0.5) return vec3(1.0, -s.y, -s.x);
  if (f < 1.5) return vec3(-1.0, -s.y, s.x);
  if (f < 2.5) return vec3(s.x, 1.0, s.y);
  if (f < 3.5) return vec3(s.x, -1.0, -s.y);
  if (f < 4.5) return vec3(s.x, -s.y, 1.0);
  return vec3(-s.x, -s.y, -1.0);
}
float craters(vec3 p, float sc){
  p *= sc; vec3 i = floor(p), f = fract(p); float h = 0.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 c = vec3(float(x), float(y), float(z));
    vec3 r = vec3(h3(i + c), h3(i + c + 17.31), h3(i + c + 41.7));
    float rad = 0.14 + 0.34*r.x*r.x;
    float q = length(c + vec3(h3(i + c + 3.3), h3(i + c + 9.7), h3(i + c + 23.1)) - f)/rad;
    if (q < 1.8 && r.y > 0.3) h += (q < 1.0 ? (q*q - 1.0)*0.75 : 0.0) + exp(-(q - 1.0)*(q - 1.0)*12.0)*0.3;
  }
  return h;
}
// 0 terra · 1 banded giant · 2 ice moon · 3 lava · 4 rock · 5 haze · 6 Pluto · 7 Enceladus · 8 Triton · 9 Iapetus · 10 Ceres
vec4 terra(vec3 n){
  vec3 p = n*P.w + seed;
  vec3 w = vec3(fbm(p*1.1 + 3.1, 4.0), fbm(p*1.1 + 7.7, 4.0), fbm(p*1.1 + 11.5, 4.0)) - 0.5;
  vec3 q = p + w*P.y;
  float c = fbm(q, 8.0);
  float sea = P.x;
  float land = smoothstep(sea - 0.003, sea + 0.003, c);
  float m = ridged(q*2.4 + 5.0, 7.0);
  float t = clamp((c - sea)/0.3 + land*m*Q.z*smoothstep(sea, sea + 0.08, c), 0.0, 1.0);
  float lat = abs(n.y);
  float dep = clamp((sea - c)/0.16, 0.0, 1.0);
  vec3 ocean = mix(C1, C0, pow(dep, 0.45));
  float dry = fbm(p*2.2 + 9.0, 5.0) + (0.25 - abs(lat - 0.32))*0.6*Q.w;
  vec3 lnd = mix(C2, C3, smoothstep(0.08, 0.55, t));
  lnd = mix(lnd, C4, smoothstep(0.5, 0.66, dry)*Q.w);
  lnd *= 0.82 + 0.36*fbm(p*11.0, 4.0);
  float snow = clamp(smoothstep(0.8, 0.92, t) + smoothstep(P.z, P.z + 0.05, lat + (fbm(p*3.0, 4.0) - 0.5)*0.14), 0.0, 1.0);
  vec3 col = mix(ocean, lnd, land);
  col = mix(col, C5, snow);
  float hh = mix(0.45 - dep*0.25, 0.5 + t*0.5, max(land, snow));
  return vec4(col, hh);
}
vec4 gas(vec3 n){
  vec3 p = n + seed;
  // shear flow: features drawn out along the latitude lines, eddies where the bands rub
  vec3 sp = vec3(p.x*2.2, p.y*P.x*0.8, p.z*2.2);
  vec3 w1 = vec3(fbm(sp + 1.0, 5.0), fbm(sp + 4.0, 5.0), fbm(sp + 7.0, 5.0)) - 0.5;
  vec3 w2 = vec3(fbm(sp*2.6 + w1*2.2 + 2.0, 5.0), fbm(sp*2.6 + w1*2.2 + 5.0, 5.0), fbm(sp*2.6 + w1*2.2 + 8.0, 5.0)) - 0.5;
  float b = n.y + (w1.x*0.06 + w2.y*0.035)*P.y;
  float bn = fbm(vec3(b*P.x, seed.x*0.1, seed.y*0.1), 6.0);
  float zone = smoothstep(0.4, 0.6, bn);
  vec3 col = mix(C1, C0, zone);
  float fine = fbm(vec3(b*P.x*3.2, seed.z*0.1, 3.0), 4.0);
  col = mix(col, C2, smoothstep(0.5, 0.78, fine)*0.4*(1.0 - zone*0.5));
  col = mix(col, C3, smoothstep(0.66, 0.86, bn)*0.55);
  float eddy = fbm(sp*7.0 + w2*3.0, 5.0);
  col *= 0.9 + 0.2*eddy;
  col = mix(col, C0, smoothstep(0.7, 0.95, eddy)*0.25*(1.0 - zone));
  // a great storm: an oval drawn out east–west, turning
  if (ST.w > 0.0) {
    vec3 sN = normalize(ST.xyz);
    vec3 e = normalize(cross(vec3(0.0, 1.0, 0.0), sN)), nn = cross(sN, e);
    vec2 lc = vec2(dot(n - sN, e)*0.55, dot(n - sN, nn))/ST.w;
    float rr = length(lc), ang = 2.4*exp(-rr*1.4);
    lc = mat2(cos(ang), -sin(ang), sin(ang), cos(ang))*lc;
    float front = step(0.0, dot(n, sN));
    float k = smoothstep(1.0, 0.6, length(lc) + (fbm(vec3(lc*3.0, 1.0) + seed, 4.0) - 0.5)*0.3)*front;
    col = mix(col, C4, k*0.85);
    col = mix(col, C0*1.05, smoothstep(1.25, 1.02, length(lc))*(1.0 - k)*front*0.55);
  }
  return vec4(col, 0.5);
}
vec4 icy(vec3 n){
  vec3 p = n*2.0 + seed;
  float base = fbm(p*1.4, 6.0);
  vec3 col = mix(C0, C1, smoothstep(0.38, 0.7, base));
  float l1 = 1.0 - smoothstep(0.0, 0.03, abs(fbm(p*2.0 + 3.0, 5.0) - 0.5));
  float l2 = 1.0 - smoothstep(0.0, 0.022, abs(fbm(p*4.2 + 7.0, 5.0) - 0.5));
  float l3 = 1.0 - smoothstep(0.0, 0.018, abs(fbm(p*8.5 + 1.0, 4.0) - 0.5));
  float lines = max(l1, max(l2*0.8, l3*0.55));
  col = mix(col, C2, lines*0.7);
  col *= 0.9 + 0.2*fbm(p*12.0, 4.0);
  return vec4(col, 0.55 + lines*0.12 - base*0.1);
}
float seam(vec3 p){ vec3 w = vec3(fbm(p*0.7 + 1.0, 4.0), fbm(p*0.7 + 5.0, 4.0), fbm(p*0.7 + 9.0, 4.0)) - 0.5; return 1.0 - smoothstep(0.0, 0.028, abs(fbm(p*1.6 + w*1.4 + 4.0, 7.0) - 0.5)); }
vec4 lava(vec3 n){
  vec3 p = n*P.x + seed;
  float b = fbm(p*1.3, 8.0);
  float crack = seam(p);
  float pool = smoothstep(0.7, 0.76, fbm(p*0.9 + 9.0, 7.0));
  vec3 col = mix(C0, C1, smoothstep(0.35, 0.65, b))*(0.75 + 0.5*fbm(p*9.0, 4.0));
  col = mix(col, C2, clamp(crack*0.6 + pool*0.8, 0.0, 1.0));
  return vec4(col, 0.5 + b*0.35 - crack*0.06 - pool*0.12);
}
vec4 rock(vec3 n){
  vec3 p = n + seed;
  float b = fbm(p*1.6, 7.0);
  float maria = smoothstep(0.5, 0.6, fbm(p*0.9 + 4.0, 5.0))*P.y;
  float h = (b - 0.5)*0.3 + P.x*(craters(n + seed*0.1, 2.4)*0.32 + craters(n + seed*0.2, 5.5)*0.16 + craters(n + seed*0.3, 13.0)*0.07);
  vec3 col = mix(C0, C1, maria);
  col = mix(col, C2, smoothstep(0.52, 0.85, fbm(p*3.0 + 2.0, 5.0))*0.55);
  col *= 0.78 + 0.45*b;
  float lat = abs(n.y);
  col = mix(col, C5, smoothstep(P.z, P.z + 0.1, lat + (b - 0.5)*0.12));
  col = mix(col, C2, smoothstep(0.9, 0.97, vn(n*70.0 + seed*3.0))*Q.z);
  float grooves = (1.0 - smoothstep(0.0, 0.035, abs(fbm(p*5.5 + 2.0, 5.0) - 0.5)))*(1.0 - maria);
  col = mix(col, C2, grooves*Q.w*0.55);
  return vec4(col, clamp(0.5 + h, 0.0, 1.0));
}
vec4 haze(vec3 n){
  vec3 p = n + seed;
  vec3 sp = vec3(p.x*1.2, p.y*P.x, p.z*1.2);
  float w = fbm(sp*1.4, 5.0);
  float b = fbm(sp*2.0 + w*1.4, 6.0);
  vec3 col = mix(C0, C1, smoothstep(0.32, 0.7, b));
  col = mix(col, C2, smoothstep(0.58, 0.8, fbm(sp*4.0 + 3.0, 4.0))*0.35);
  return vec4(col, 0.5);
}
// a point on the sphere as east/north offsets from a centre, for drawing one feature
vec2 loc(vec3 n, vec3 c){ vec3 e = normalize(cross(vec3(0.0, 1.0, 0.0), c)), u = cross(c, e); return vec2(dot(n - c, e), dot(n - c, u)); }
// Pluto: tan ground, a dark red-brown belt along the equator, the bright heart of nitrogen ice
vec4 pluto(vec3 n){
  vec3 p = n*1.6 + seed;
  float b = fbm(p*1.5, 7.0);
  vec3 col = mix(C0, C1, smoothstep(0.35, 0.7, b));
  vec3 c = normalize(ST.xyz);
  float belt = smoothstep(0.42, 0.16, abs(n.y + 0.05 + (fbm(p*2.0, 4.0) - 0.5)*0.3))*smoothstep(0.36, 0.6, fbm(p*0.9 + 5.0, 5.0));
  vec2 h = loc(n, c)/ST.w + (vec2(fbm(n*9.0 + seed, 4.0), fbm(n*9.0 + seed + 3.0, 4.0)) - 0.5)*0.2;
  float x = h.x*1.05, y = h.y + 0.2, r2 = x*x + y*y - 1.0, hf = r2*r2*r2 - x*x*y*y*y;   // the heart curve, written out: pow() of a negative number is undefined on some GPUs
  float heart = (1.0 - smoothstep(-0.03, 0.05, hf))*step(0.2, dot(n, c));
  col = mix(col, C2, belt*0.85*(1.0 - heart));
  col = mix(col, C3, heart);
  col *= 0.86 + 0.28*fbm(p*8.0, 4.0)*(1.0 - heart*0.8);
  float cr = craters(n + seed*0.1, 4.0)*0.12;
  return vec4(col, clamp(0.5 + (b - 0.5)*0.25 + cr*(1.0 - heart) - belt*0.03, 0.0, 1.0));
}
// Enceladus: brilliant white ice, cratered in the north, four blue "tiger stripes" in the south
vec4 encel(vec3 n){
  vec3 p = n*2.0 + seed;
  float b = fbm(p*1.6, 6.0);
  vec3 col = mix(C0, C1, smoothstep(0.42, 0.72, b));
  vec3 c = normalize(ST.xyz); float d = dot(n, c);
  vec2 l = loc(n, c)/ST.w;
  float region = smoothstep(0.5, 0.8, d);
  float ca = cos(0.5), sa = sin(0.5);
  float k = l.x*ca + l.y*sa + (fbm(n*6.0 + seed, 4.0) - 0.5)*0.5, along = -l.x*sa + l.y*ca;
  float stripes = (1.0 - smoothstep(0.0, 0.07, abs(fract(k*0.5 + 0.5) - 0.5)))*step(abs(k), 3.6)*smoothstep(2.6, 1.6, abs(along))*region;
  float ridges = (1.0 - smoothstep(0.0, 0.07, abs(fbm(p*5.0, 4.0) - 0.5)))*0.3;
  col = mix(col, C1*0.94, ridges*(0.3 + 0.7*region));
  col = mix(col, C2, stripes*0.9);
  float cr = craters(n + seed*0.1, 3.2)*0.1 + craters(n + seed*0.2, 8.0)*0.05;
  return vec4(col, clamp(0.5 + cr*(1.0 - region) - stripes*0.08 + ridges*0.05, 0.0, 1.0));
}
// Triton: pale dimpled "cantaloupe" ground and a pink polar cap streaked dark by geysers
vec4 triton(vec3 n){
  vec3 p = n*2.2 + seed;
  float b = fbm(p*1.4, 6.0);
  float dimp = craters(n + seed*0.1, 9.0)*0.5 + craters(n + seed*0.2, 15.0)*0.3;
  vec3 col = mix(C0, C1, smoothstep(0.35, 0.7, b))*(0.92 + dimp*0.25);
  vec3 c = normalize(ST.xyz); float d = dot(n, c);
  float cap = smoothstep(ST.w - 0.05, ST.w + 0.05, d + (fbm(p*2.5, 5.0) - 0.5)*0.22);
  vec2 l = loc(n, c);
  float streak = smoothstep(0.6, 0.78, fbm(vec3(l.x*3.0, l.y*16.0, 1.0) + seed, 4.0))*cap;
  col = mix(col, C2, cap);
  col = mix(col, C3, streak*0.7);
  return vec4(col, clamp(0.5 + (b - 0.5)*0.15 + dimp*0.06*(1.0 - cap), 0.0, 1.0));
}
// Iapetus: one side bright ice, the other coated in dark red-brown dust; a ridge along the equator
vec4 iapetus(vec3 n){
  vec3 p = n*1.8 + seed;
  float b = fbm(p*1.6, 6.0);
  float cr = craters(n + seed*0.1, 2.6)*0.3 + craters(n + seed*0.2, 6.0)*0.15;
  vec3 c = normalize(ST.xyz);
  float dark = smoothstep(ST.w - 0.08, ST.w + 0.08, dot(n, c) + (fbm(p*1.8 + 3.0, 6.0) - 0.5)*0.35);
  vec3 col = mix(mix(C0, C1, smoothstep(0.3, 0.7, b)), C2*(0.8 + 0.4*b), dark);
  float ridge = exp(-n.y*n.y*700.0)*0.1;
  return vec4(col*(0.86 + 0.28*fbm(p*7.0, 4.0)), clamp(0.5 + cr + ridge + (b - 0.5)*0.2, 0.0, 1.0));
}
// Ceres: dark grey, cratered, and in Occator crater the brightest salt spots in the asteroid belt
vec4 ceres(vec3 n){
  vec3 p = n*2.0 + seed;
  float b = fbm(p*1.5, 7.0);
  float cr = craters(n + seed*0.1, 3.0)*0.28 + craters(n + seed*0.2, 7.0)*0.14 + craters(n + seed*0.3, 15.0)*0.06;
  vec3 col = mix(C0, C1, smoothstep(0.35, 0.7, b))*(0.85 + 0.3*fbm(p*6.0, 4.0));
  vec3 c = normalize(ST.xyz); vec2 l = loc(n, c)/ST.w; float r = length(l), front = step(0.0, dot(n, c));
  float rim = exp(-(r - 1.0)*(r - 1.0)*40.0)*front, flo = smoothstep(1.0, 0.85, r)*front;
  float spot = (smoothstep(0.3, 0.13, length(l - vec2(0.05, 0.02))) + smoothstep(0.16, 0.06, length(l - vec2(0.42, 0.18)))*0.9 + smoothstep(0.11, 0.04, length(l - vec2(0.36, -0.12)))*0.8)*front;
  col = mix(col, C1*0.85, flo*0.4);
  col = mix(col, C2, clamp(spot, 0.0, 1.0));
  return vec4(col, clamp(0.5 + cr + rim*0.12 - flo*0.1 + (b - 0.5)*0.2, 0.0, 1.0));
}
vec4 surf(vec3 n){
  if (type < 0.5) return terra(n);
  if (type < 1.5) return gas(n);
  if (type < 2.5) return icy(n);
  if (type < 3.5) return lava(n);
  if (type < 4.5) return rock(n);
  if (type < 5.5) return haze(n);
  if (type < 6.5) return pluto(n);
  if (type < 7.5) return encel(n);
  if (type < 8.5) return triton(n);
  if (type < 9.5) return iapetus(n);
  return ceres(n);
}
void main(){
  vec3 n = normalize(faceDir(face, uv));
  if (outB < 0.5) { vec4 s = surf(n); gl_FragColor = vec4(clamp(s.rgb, 0.0, 1.0), s.a); return; }
  // clouds (r) and light on the night side (g)
  float cl = 0.0;
  if (Q.x > 0.0) {
    vec3 cp = n*2.3 + seed*1.7;
    vec3 w = vec3(fbm(cp*1.1, 4.0), fbm(cp*1.1 + 5.2, 4.0), fbm(cp*1.1 + 9.1, 4.0)) - 0.5;
    float c = fbm(cp*vec3(1.0, 2.0, 1.0) + w*1.8, 8.0) + 0.05*sin(abs(n.y)*16.0);
    float d = fbm(cp*6.0 + w*3.0, 5.0);
    cl = smoothstep(0.92 - Q.x*0.9, 1.25 - Q.x*0.9, c + (d - 0.5)*0.18);
    cl = cl*cl*(0.75 + 0.25*d);
  }
  float em = 0.0;
  if (Q.y > 0.0) {
    if (type < 0.5) {
      vec4 s = terra(n);
      float land = step(0.5, s.a)*(1.0 - step(0.9, s.r*s.g*s.b*3.0));
      float clus = smoothstep(0.5, 0.72, fbm(n*5.0 + seed + 3.0, 5.0));
      vec3 cell = floor(n*240.0);
      float spk = step(0.78, h3(cell))*(0.4 + 0.6*h3(cell + 7.0));
      em = land*clus*spk*Q.y;
    } else if (type > 2.5 && type < 3.5) {
      vec3 p = n*P.x + seed;
      float crack = seam(p);
      float pool = smoothstep(0.7, 0.76, fbm(p*0.9 + 9.0, 7.0));
      em = (crack*0.75 + pool*0.9)*(0.45 + 0.55*fbm(p*7.0, 4.0))*Q.y;
    } else {
      float spot = smoothstep(0.8, 0.86, fbm(n*4.0 + seed + 11.0, 5.0));
      em = spot*Q.y;
    }
  }
  gl_FragColor = vec4(cl, clamp(em, 0.0, 1.0), 0.0, 1.0);
}`);
const PDRAW = prog(`attribute vec2 q; uniform mat4 vp; uniform vec3 cen, cr, cu; uniform float ext; varying vec3 wp;
void main(){ wp = cen + (cr*q.x + cu*q.y)*ext; gl_Position = vp*vec4(wp, 1.0); }`, `varying vec3 wp;
uniform vec3 cen, eye, L, Lc, emitC, ringC, ringN; uniform vec4 atm, ring;
uniform float rad, pix, pass, K, expo, atmH, spec, clouds, bump, limb, wrap, hi, ret, texel, night, amb, nbias;
uniform samplerCube ta, tb; uniform mat3 rotM, cloudM;
float ringD(float rr){
  if (rr < ring.x || rr > ring.y) return 0.0;
  float u = (rr - ring.x)/(ring.y - ring.x);
  float d = 0.55 + 0.22*sin(u*38.0 + sin(u*11.0)*2.0) + 0.12*sin(u*97.0 + 1.0) + 0.08*sin(u*211.0);
  d *= smoothstep(0.0, 0.05, u)*smoothstep(1.0, 0.92, u);
  d *= 1.0 - 0.9*smoothstep(0.6, 0.62, u)*smoothstep(0.69, 0.67, u);
  return clamp(d, 0.0, 1.0);
}
void main(){
  vec3 rd = normalize(wp - eye), oc = eye - cen;
  float b = dot(oc, rd), c = dot(oc, oc) - rad*rad, disc = b*b - c;
  vec3 pc = oc - rd*b; float dmin = length(pc);
  float pixL = pix*sqrt(max(1.0 - rad*rad/dot(oc, oc), 0.04));   // one pixel, measured across the edge (smaller than pix when the planet is near)
  float cov = clamp((rad - dmin)/pixL + 0.5, 0.0, 1.0);
  if (pass < 0.5) {
    if (cov <= 0.0) discard;
    float tS = -b - sqrt(max(disc, 0.0));
    vec3 Pp = oc + rd*tS, N = normalize(Pp), S = rotM*N;
    vec4 A = textureCube(ta, S);
    vec3 nb = N;
    if (bump > 0.0) {
      vec3 T1 = normalize(cross(abs(S.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0), S)), T2 = cross(S, T1);
      float e = texel*1.5;
      float h1 = textureCube(ta, normalize(S + T1*e)).a, h2 = textureCube(ta, normalize(S + T2*e)).a;
      vec3 sl = normalize(S - (T1*(h1 - A.a) + T2*(h2 - A.a))*bump/(e*60.0));
      nb = sl*rotM;
    }
    vec3 alb = pow(A.rgb, vec3(2.2));
    float ndl0 = dot(N, L), ndl = dot(nb, L);
    float term = smoothstep(-wrap, wrap + 0.25, ndl0);
    float lit = max(ndl, 0.0)*(1.0 - wrap) + term*wrap*max(ndl + 0.3, 0.0)*0.8;
    vec3 Cn = cloudM*N;
    float cl = textureCube(tb, Cn).r*clouds;
    float clS = textureCube(tb, normalize(Cn + (cloudM*L)*0.02)).r*clouds;
    float oceanM = smoothstep(0.46, 0.42, A.a)*spec;
    vec3 V = -rd, H = normalize(L + V);
    float fres = 0.03 + 0.97*pow(1.0 - max(dot(V, H), 0.0), 5.0);
    float sp = pow(max(dot(N, H), 0.0), 140.0)*oceanM*fres*14.0 + pow(max(dot(N, H), 0.0), 18.0)*oceanM*0.06;
    vec3 ground = alb*(lit*(1.0 - clS*0.6) + amb) + sp*step(0.0, ndl0)*(1.0 - cl);
    vec3 cloud = vec3(0.92, 0.93, 0.95)*(max(ndl0, 0.0)*0.95 + term*0.1 + amb);
    vec3 col = mix(ground, cloud, cl)*Lc;
    float mu = max(dot(N, V), 0.0);
    col *= mix(1.0, pow(mu, 0.45), limb);
    float nightK = mix(1.0, smoothstep(0.1, -0.2, ndl0), night);
    float lite = textureCube(tb, S).g;
    if (nbias > 0.0) lite *= clamp(2.0 - texel*1.57*rad/max(tS*pix/length(oc), 1e-6), 0.0, 1.0);   // close to the ground its lights would show as squares: they fade where a texel is bigger than a pixel
    col += emitC*lite*nightK*(1.0 - cl*0.8);
    float rim = pow(1.0 - mu, 2.4), atL = smoothstep(-0.3, 0.55, ndl0);
    col = mix(col, atm.rgb*atL*1.2, clamp(rim*atm.a*1.1, 0.0, 0.85)) + atm.rgb*atm.a*0.05*atL;
    col *= mix(vec3(1.0), vec3(1.0, 0.72, 0.5), atm.a*0.6*smoothstep(0.25, 0.0, abs(ndl0))*step(0.0, ndl0));
    if (ring.w > 0.0) {
      float dn = dot(L, ringN);
      if (abs(dn) > 1e-3) { float tr = -dot(Pp, ringN)/dn; if (tr > 0.0) col *= 1.0 - ringD(length(Pp + L*tr)/rad)*ring.z*0.8; }
    }
    col *= 1.0 + hi*0.2;
    gl_FragColor = vec4(col*expo*K*cov, cov);
  } else {
    vec3 acc = vec3(0.0); float al = 0.0;
    bool hitS = disc > 0.0;
    float tS = hitS ? -b - sqrt(disc) : 1e9;
    if (dmin > rad*0.97 && atm.a > 0.0) {
      float x = (dmin - rad)/(rad*atmH);
      float dens = exp(-x*2.3)*(1.0 - smoothstep(2.6, 4.0, x))*smoothstep(rad*0.99 - max(pixL, rad*0.004), rad*0.99 + pixL, dmin);
      float atL = smoothstep(-0.4, 0.45, dot(pc/max(dmin, 1e-4), L));
      acc += atm.rgb*atm.a*dens*atL*1.5;
    }
    if (ring.w > 0.0) {
      float dn = dot(rd, ringN);
      if (abs(dn) > 1e-4) {
        float tr = -dot(oc, ringN)/dn;
        if (tr > 0.0 && tr < tS) {
          vec3 pr = oc + rd*tr; float de = ringD(length(pr)/rad);
          if (de > 0.0) {
            float bb = dot(pr, L), cc = dot(pr, pr) - rad*rad;
            float sh = (bb < 0.0 && bb*bb - cc > 0.0) ? 0.06 : 1.0;
            float ln = abs(dot(L, ringN)), back = step(0.0, -dot(L, ringN)*dot(rd, ringN));
            vec3 rc = ringC*(0.2 + 0.8*ln)*sh*mix(1.0, 0.55, back);
            float a2 = de*ring.z;
            acc = acc*(1.0 - a2) + rc*a2; al = max(al, a2);
          }
        }
      }
    }
    float rc2 = rad*1.7 + pix*3.0;
    acc += vec3(1.0, 0.78, 0.42)*exp(-pow((dmin - rc2)/(pix*0.85), 2.0))*(ret*0.32 + hi*0.95);
    gl_FragColor = vec4(acc*expo*K, al);
  }
}`);
// eighteen worlds; neighbours in the tour look nothing alike
const C = h => hex(h);
function hex(h) { const v = [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; return v; }
const WORLDS = [
  // eighteen real bodies of the solar system, each its own look
  // Earth
  { type: 0, rad: 0.81, c: ['#081a3a', '#0f4a66', '#3d5a22', '#6b5a3c', '#a88a5a', '#f2f2f2'], P: [0.5, 0.55, 0.78, 1.8], Q: [0.55, 1.0, 0.35, 0.8], atm: [0.35, 0.58, 1.0, 0.85], atmH: 0.035, spec: 1, clouds: 1, bump: 1, night: 1, emit: [1.0, 0.72, 0.38], tilt: 0.41 },
  // Jupiter
  { type: 1, rad: 1.47, c: ['#eadcc0', '#a8744a', '#7a4a2c', '#f6eedc', '#b0543a', '#ffffff'], P: [7.0, 1.0, 0, 0], Q: [0, 0, 0, 0], st: [0.6, -0.38, 0.7, 0.1], atm: [0.8, 0.72, 0.6, 0.25], atmH: 0.025, limb: 0.6, tilt: 0.05 },
  // Mars
  { type: 4, rad: 0.66, c: ['#9a5a34', '#6e3a22', '#c0865a', '#000000', '#000000', '#efe8e2'], P: [0.55, 0.6, 0.9, 0], Q: [0, 0, 0, 0], atm: [0.95, 0.62, 0.45, 0.25], atmH: 0.02, bump: 2.2, tilt: 0.44 },
  // Neptune
  { type: 1, rad: 1.23, c: ['#4f76c8', '#2c4f9e', '#24407e', '#9cb8ea', '#14244e', '#ffffff'], P: [5.0, 0.7, 0, 0], Q: [0, 0, 0, 0], st: [-0.5, -0.3, 0.8, 0.08], atm: [0.45, 0.62, 1.0, 0.6], atmH: 0.03, limb: 0.7, tilt: 0.5 },
  // Saturn
  { type: 1, rad: 1.38, c: ['#e8d8ae', '#c9a876', '#b08f5e', '#f2e8cc', '#c89a5a', '#ffffff'], P: [8.0, 0.5, 0, 0], Q: [0, 0, 0, 0], atm: [0.9, 0.82, 0.6, 0.25], atmH: 0.025, limb: 0.55, ring: [1.28, 2.25, 0.9], ringC: [0.88, 0.8, 0.66], tilt: 0.47 },
  // Pluto: tan ground, the dark red-brown belt along the equator, and the bright heart-shaped plain of nitrogen ice
  { type: 6, rad: 0.62, c: ['#c4a284', '#e2cbb2', '#5c2c1e', '#f6f1ea', '#000000', '#000000'], P: [0, 0, 0, 0], Q: [0, 0, 0, 0], st: [-0.18, 0.12, 1, 0.42], face: 0, atm: [0.55, 0.72, 1.0, 0.3], atmH: 0.025, bump: 0.8, tilt: 0.3 },
  // Europa
  { type: 2, rad: 0.59, c: ['#e8e0d2', '#c9b39a', '#8a4a2a', '#000000', '#000000', '#000000'], P: [0, 0, 0, 0], Q: [0, 0, 0, 0], atm: [0.7, 0.8, 1.0, 0.0], atmH: 0.02, bump: 1.2, tilt: 0.1 },
  // Ganymede: dark old ground and lighter grooved ice, frost at the poles
  { type: 4, rad: 0.72, c: ['#b6aea2', '#584c42', '#e2ded6', '#000000', '#000000', '#d4d9de'], P: [0.55, 0.6, 0.8, 0], Q: [0, 0, 0, 1], atm: [0, 0, 0, 0], atmH: 0.02, bump: 1.6, tilt: 0.05 },
  // Venus
  { type: 5, rad: 0.78, c: ['#f0e6cc', '#dccaa0', '#fbf6ea', '#000000', '#000000', '#000000'], P: [3.0, 0, 0, 0], Q: [0, 0, 0, 0], atm: [1.0, 0.92, 0.75, 0.75], atmH: 0.04, limb: 0.35, tilt: 0.05 },
  // Moon
  { type: 4, rad: 0.57, c: ['#8e8a84', '#4e4b48', '#b5b0a8', '#000000', '#000000', '#000000'], P: [1.0, 0.9, 2.0, 0], Q: [0, 0, 0, 0], atm: [0, 0, 0, 0], atmH: 0.02, bump: 2.6, tilt: 0.1 },
  // Uranus
  { type: 1, rad: 1.17, c: ['#a4d8de', '#8ccad2', '#7cbcc6', '#c8eef0', '#6ab0c0', '#ffffff'], P: [3.5, 0.3, 0, 0], Q: [0, 0, 0, 0], atm: [0.6, 0.9, 1.0, 0.55], atmH: 0.035, limb: 0.65, ring: [1.6, 2.0, 0.35], ringC: [0.5, 0.52, 0.55], tilt: 1.5 },
  // Titan
  { type: 5, rad: 0.71, c: ['#c48446', '#ad6e32', '#d69c58', '#000000', '#000000', '#000000'], P: [2.2, 0, 0, 0], Q: [0, 0, 0, 0], atm: [0.55, 0.72, 1.0, 1.0], atmH: 0.07, limb: 0.3, tilt: 0.3 },
  // Enceladus: the whitest ice in the solar system, blue tiger stripes in the south
  { type: 7, rad: 0.5, c: ['#f4f6f8', '#dce3e8', '#86b6d0', '#000000', '#000000', '#000000'], P: [0, 0, 0, 0], Q: [0, 0, 0, 0], st: [0, -0.55, 0.84, 0.16], face: 0, atm: [0.8, 0.9, 1.0, 0.18], atmH: 0.02, bump: 1.0, tilt: 0.1 },
  // Ceres: dark grey, cratered, with the bright salt spots of Occator
  { type: 10, rad: 0.52, c: ['#5c5a57', '#474541', '#f6f6f2', '#000000', '#000000', '#000000'], P: [0, 0, 0, 0], Q: [0, 0, 0, 0], st: [0.12, 0.3, 0.95, 0.17], face: 0, atm: [0, 0, 0, 0], atmH: 0.02, bump: 2.0, tilt: 0.05 },
  // Iapetus: one side bright ice, the other coated in dark red-brown dust
  { type: 9, rad: 0.58, c: ['#e6e2da', '#bab3a6', '#3c2618', '#000000', '#000000', '#000000'], P: [0, 0, 0, 0], Q: [0, 0, 0, 0], st: [0.92, 0.05, 0.38, 0.0], face: 0, atm: [0, 0, 0, 0], atmH: 0.02, bump: 1.6, tilt: 0.1 },
  // Io
  { type: 4, rad: 0.63, c: ['#e2c63e', '#4a2e10', '#f4eecc', '#000000', '#000000', '#5a3216'], P: [0.25, 0.75, 1.6, 0], Q: [0, 0.8, 0, 0], atm: [1.0, 0.9, 0.5, 0.12], atmH: 0.02, emit: [1.5, 0.5, 0.1], bump: 1.0, tilt: 0.05 },
  // Triton: pale dimpled 'cantaloupe' ground and a pink polar cap streaked by geysers
  { type: 8, rad: 0.6, c: ['#b4b29a', '#d2cab4', '#f2dcd2', '#5c4a46', '#000000', '#000000'], P: [0, 0, 0, 0], Q: [0, 0, 0, 0], st: [0, -0.62, 0.78, 0.55], face: 0, atm: [0.6, 0.75, 1.0, 0.22], atmH: 0.02, bump: 1.2, tilt: 0.2 },
  // Callisto: dark, the most cratered body known, sprinkled with bright crater spots
  { type: 4, rad: 0.68, c: ['#4e463c', '#38322c', '#cfc9be', '#000000', '#000000', '#000000'], P: [1.0, 0.35, 2.0, 0], Q: [0, 0, 0.9, 0], atm: [0, 0, 0, 0], atmH: 0.02, bump: 2.0, tilt: 0.05 }
];
const PL = [];
{
  // along one arm, from the inside out, evenly by arc length
  const pts = []; for (let rr = 13.1; rr <= 66; rr += 0.2) { const ph = armAt(rr); pts.push([Math.cos(ph) * rr, Math.sin(ph) * rr, rr]); }
  const cum = [0]; for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]));
  const at = s => { let k = 1; while (k < cum.length - 1 && cum[k] < s) k++; const f = (s - cum[k - 1]) / (cum[k] - cum[k - 1] || 1); return [lerp(pts[k - 1][0], pts[k][0], f), lerp(pts[k - 1][1], pts[k][1], f), lerp(pts[k - 1][2], pts[k][2], f)]; };
  const s0 = cum[Math.round((14.5 - 13.1) / 0.2)], s1 = cum[Math.round((62 - 13.1) / 0.2)];
  const r = rnd(1801);
  for (let i = 0; i < N; i++) {
    const W = WORLDS[i % WORLDS.length];
    const [x, z, rr] = at(lerp(s0, s1, i / (N - 1)));
    const th = Math.atan2(z, x), R = rr + 1.2 + (r() - 0.5) * 1.6;
    const tilt = W.tilt || 0, ta = r() * TAU;
    const axis = nrm([Math.sin(tilt) * Math.cos(ta), Math.cos(tilt), Math.sin(tilt) * Math.sin(ta)]);
    PL.push({ i, W, R, th, y: (r() - 0.5) * 2.0 + (i % 2 ? 0.6 : -0.6), rad: W.rad, axis, spin: (0.012 + r() * 0.02) * (r() < 0.2 ? -1 : 1), cloudSpin: 0.004 + r() * 0.006, seed: [r() * 50, r() * 50, r() * 50], hi: 0, lo: null, hiTex: null });
  }
}
function planetPos(p, rot = S.rot) { const t = p.th + rot; return [Math.cos(t) * p.R, p.y, Math.sin(t) * p.R]; }
// cube textures and baking
const CFB = gl.createFramebuffer();
function cubeTex(size) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_CUBE_MAP, t);
  for (let f = 0; f < 6; f++) gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + f, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { t, size };
}
function bakeFace(p, cube, face, outB) {
  const W = p.W;
  gl.bindFramebuffer(gl.FRAMEBUFFER, CFB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X + face, cube.t, 0);
  gl.viewport(0, 0, cube.size, cube.size); gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  const u = use(PBAKE); attr(PBAKE, 'q', TRI, 2);
  gl.uniform1f(u.face, face); gl.uniform1f(u.type, W.type); gl.uniform1f(u.outB, outB ? 1 : 0); gl.uniform3fv(u.seed, p.seed);
  for (let k = 0; k < 6; k++) gl.uniform3fv(u['C' + k], C(W.c[k]));
  gl.uniform4fv(u.P, W.P); gl.uniform4fv(u.Q, W.Q); gl.uniform4fv(u.ST, W.st || [0, 0, 1, 0]);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function bakeAll(p, sa, sb) {
  const A = cubeTex(sa), B = cubeTex(sb);
  for (let f = 0; f < 6; f++) { bakeFace(p, A, f, false); bakeFace(p, B, f, true); }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, A.t); gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, B.t); gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  return { A, B };
}
const LO = MOB ? [64, 32] : [128, 64], HIRES = MOB ? [256, 128] : [512, 256];
let loNext = 0;
function bakeLo() { for (let n = 0; n < 2 && loNext < PL.length; n++, loNext++) PL[loNext].lo = bakeAll(PL[loNext], LO[0], LO[1]); }
// the sharp versions are baked a face at a time for the planets close to the camera
const HQ = { jobs: [], slots: [] };
function wantHi(p) {
  if (p.hiTex || HQ.jobs.some(j => j.p === p)) return;
  if (HQ.slots.length >= 2) { const old = HQ.slots.shift(); old.p.hiTex = null; gl.deleteTexture(old.A.t); gl.deleteTexture(old.B.t); }
  const job = { p, A: cubeTex(HIRES[0]), B: cubeTex(HIRES[1]), k: 0 }; HQ.jobs.push(job);
}
function bakeStep() {
  const job = HQ.jobs[0]; if (!job) return;
  for (let n = 0; n < 2 && job.k < 12; n++, job.k++) bakeFace(job.p, job.k < 6 ? job.A : job.B, job.k % 6, job.k >= 6);
  if (job.k >= 12) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, job.A.t); gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, job.B.t); gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    job.p.hiTex = { A: job.A, B: job.B }; HQ.slots.push({ p: job.p, A: job.A, B: job.B }); HQ.jobs.shift();
  }
}
function m3(a) { return new Float32Array(a); }
// the spin angle at which a body shows its signature side (body +z) to the camera at its stop
function faceAng(p) { const d = rotYv(p.D0, S.rot), yv = p.axis, xr = nrm(cross([0, 0, 1], yv)), zr = cross(xr, yv); return Math.atan2(dot(xr, d), dot(zr, d)); }
// world -> planet frame, turning with time: rows are the planet's own axes
function frameOf(p, ang, ax = p.axis) {
  const yv = ax, xr = nrm(cross([0, 0, 1], yv)), zr = cross(xr, yv);
  const c = Math.cos(ang), s = Math.sin(ang);
  const x = add(mul(xr, c), mul(zr, -s)), z = add(mul(xr, s), mul(zr, c));
  // mat3 column-major: M*v gives (dot(x,v), dot(y,v), dot(z,v))
  return m3([x[0], yv[0], z[0], x[1], yv[1], z[1], x[2], yv[2], z[2]]);
}
const SCR = new Array(N).fill(null);
function planetLight(p, w) {
  // light from the side of the galaxy's centre, swung toward where the camera stands at this planet's stop
  const st = stationDir(p, w), core = nrm(sub([0, 0, 0], w));
  return nrm(add(add(mul(core, 0.62), mul(st, 0.8)), [0, 0.42, 0]));
}
function drawPlanets(P, t, pass) {
  const u = use(PDRAW); attr(PDRAW, 'q', QUAD, 2);
  gl.uniformMatrix4fv(u.vp, false, vp); gl.uniform3fv(u.cr, camR); gl.uniform3fv(u.cu, camU); gl.uniform3fv(u.eye, camE);
  gl.uniform1f(u.pass, pass); gl.uniform1f(u.K, K); gl.uniform1i(u.ta, 0); gl.uniform1i(u.tb, 1);
  const order = PL.map(p => { const w = planetPos(p); return { p, w, d: len(sub(w, camE)) }; }).sort((a, b) => b.d - a.d);
  for (const { p, w, d } of order) {
    const W = p.W, T = p.hiTex || p.lo;
    if (!T) continue;
    const ringO = W.ring ? W.ring[1] : 1, extK = Math.max(W.ring ? ringO * 1.04 : 1, 1 + (W.atmH || 0.03) * 4.2, 1.85);
    const ext = p.rad * extK * Math.min(3, d / Math.sqrt(Math.max(d * d - (p.rad * extK) * (p.rad * extK) * 0.98, 1e-3)));
    gl.uniform3fv(u.cen, w); gl.uniform1f(u.ext, ext); gl.uniform1f(u.rad, p.rad);
    gl.uniform1f(u.pix, d * 2 * Math.tan(FOV / 2) / S.h);
    const LD = S.land && S.land.i === p.i && S.land.L;   // the planet we landed on: its own light, a softer and deeper air
    gl.uniform3fv(u.L, LD ? S.land.L : lightOf(p)); gl.uniform3fv(u.Lc, [1.0, 0.97, 0.92]);
    gl.uniform4fv(u.atm, LD ? [W.atm[0], W.atm[1], W.atm[2], W.atm[3] * 0.5] : W.atm); gl.uniform1f(u.atmH, (W.atmH || 0.03) * (LD ? 2.4 : 1));
    gl.uniform1f(u.spec, W.spec || 0); gl.uniform1f(u.clouds, W.clouds || 0); gl.uniform1f(u.bump, W.bump || 0); gl.uniform1f(u.limb, W.limb || 0);
    gl.uniform1f(u.wrap, W.atm[3] > 0.6 ? 0.18 : 0.06); gl.uniform1f(u.night, W.night || 0); gl.uniform3fv(u.emitC, W.emit || [0, 0, 0]); gl.uniform1f(u.nbias, LD ? 1 : 0);
    const AX = LD ? S.land.ax : p.axis;
    gl.uniform4fv(u.ring, W.ring ? [W.ring[0], W.ring[1], W.ring[2], 1] : [0, 0, 0, 0]); gl.uniform3fv(u.ringC, W.ringC || [0, 0, 0]); gl.uniform3fv(u.ringN, AX);
    gl.uniform1f(u.hi, p.hi); gl.uniform1f(u.ret, P.ret || 0); gl.uniform1f(u.texel, 2 / T.A.size); gl.uniform1f(u.amb, 0.012);
    gl.uniform1f(u.expo, P.pA === undefined ? 1 : P.pA);
    const tl = LD && S.land.tr != null ? t - S.land.tr : t;   // the planet we landed on starts turning when the 3D comes in, so it matches its picture
    const ang = W.face !== undefined && !LD ? faceAng(p) + W.face + t * 0.003 : tl * p.spin;
    gl.uniformMatrix3fv(u.rotM, false, frameOf(p, ang, AX)); gl.uniformMatrix3fv(u.cloudM, false, frameOf(p, ang + tl * p.cloudSpin, AX));
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_CUBE_MAP, T.A.t);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_CUBE_MAP, T.B.t);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (pass === 1) {
      const c = xform(vp, w);
      if (c[3] > 0.3) {
        const x = (c[0] / c[3] * 0.5 + 0.5) * S.cw, y = (0.5 - c[1] / c[3] * 0.5) * S.ch, r = p.rad * (S.h / (2 * Math.tan(FOV / 2))) / c[3] / R.scale;
        SCR[p.i] = x > -60 && y > -60 && x < S.cw + 60 && y < S.ch + 60 ? [x, y, r] : null;
        if (r > (MOB ? 22 : 34)) wantHi(p);
      } else SCR[p.i] = null;
    }
  }
  gl.activeTexture(gl.TEXTURE0);
}
// ======================================================================
//  THE CINEMA — stepped rows, people in the seats, velvet curtains, a projector beam over our heads,
//  and the light of the film falling on all of it. Units are metres; the screen faces +z.
// ======================================================================
const CI = (() => {
  const C0 = Y.cinema; if (!C0 || !C0.video) return null;
  const CR = 30, TH = 0.27, SW = 2 * CR * TH, SH = SW / 1.778, YB = 1.3, YT = YB + SH, ZS = 0.0;
  const ROWS = 16, SEATS = 22, SEATW = 0.56;
  const rowZ = r => 9 + r * 1.05, rowH = r => 0.35 + r * 0.18;
  const camRow = MOB ? 15 : 11;
  // ---------- static geometry: floor steps, seats, walls, lamps ----------
  const V = [];   // p(3) n(3) c(3) m(2)
  const face = (a, b, c, d, n, col, m0 = 0, m1 = 0) => { for (const q of [a, b, c, a, c, d]) V.push(q[0], q[1], q[2], n[0], n[1], n[2], col[0], col[1], col[2], m0, m1); };
  function box(x0, y0, z0, x1, y1, z1, col, m0 = 0, m1 = 0) {
    face([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], col, m0, m1);
    face([x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [0, -1, 0], col, m0, m1);
    face([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], col, m0, m1);
    face([x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], col, m0, m1);
    face([x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], col, m0, m1);
    face([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], col, m0, m1);
  }
  function rollX(x0, x1, y, z, r, col, m1) {   // the padded top of a seat back
    const n = 8;
    for (let k = 0; k < n; k++) {
      const a0 = Math.PI * k / n - Math.PI / 2 * 0, a1 = Math.PI * (k + 1) / n;
      const p = a => [Math.cos(a) * r, Math.sin(a) * r];
      const [c0, s0] = p(a0 + 0), [c1, s1] = p(a1);
      // half cylinder over the top, from the front (-z) to the back (+z)
      const zz0 = z - c0, yy0 = y + s0, zz1 = z - c1, yy1 = y + s1;
      const n0 = [0, s0 / r, -c0 / r], n1 = [0, s1 / r, -c1 / r];
      for (const q of [[x0, yy0, zz0, n0], [x1, yy0, zz0, n0], [x1, yy1, zz1, n1], [x0, yy0, zz0, n0], [x1, yy1, zz1, n1], [x0, yy1, zz1, n1]]) V.push(q[0], q[1], q[2], q[3][0], q[3][1], q[3][2], col[0], col[1], col[2], 0, m1);
    }
  }
  const SEAT = [0.16, 0.022, 0.03], FRAME = [0.03, 0.03, 0.035], CARPET = [0.045, 0.03, 0.03], WALL = [0.05, 0.042, 0.04], STAGE = [0.03, 0.025, 0.025];
  box(-9.2, 0, -3, 9.2, 0.95, 3.2, STAGE);
  box(-9.2, 0, 3.2, 9.2, 0.02, 8.4, CARPET);
  for (let r = 0; r < ROWS; r++) {
    const z = rowZ(r), h = rowH(r);
    box(-9.2, 0, z - 0.6, 9.2, h, z + 0.45, CARPET);
    for (const sx of [-6.92, -0.5, 0.5, 6.92]) box(sx - 0.04, h, z - 0.62, sx + 0.04, h + 0.025, z - 0.56, [1, 0.6, 0.25], 2);   // step lights
    for (let k = 0; k < SEATS; k++) {
      const x = (k - (SEATS - 1) / 2) * SEATW + (k < SEATS / 2 ? -0.55 : 0.55);
      if (Math.abs(x) > 6.5) continue;
      box(x - 0.25, h + 0.4, z + 0.27, x + 0.25, h + 0.93, z + 0.4, SEAT, 0, 1);
      rollX(x - 0.25, x + 0.25, h + 0.93, z + 0.335, 0.065, SEAT, 1);
      box(x - 0.24, h + 0.38, z - 0.2, x + 0.24, h + 0.5, z + 0.27, SEAT, 0, 1);
      box(x + 0.255, h + 0.55, z - 0.15, x + 0.305, h + 0.64, z + 0.38, FRAME);
    }
  }
  // walls, ceiling, lamps and exit signs
  face([-9.2, 0, -3], [-9.2, 0, 29], [-9.2, 14, 29], [-9.2, 14, -3], [1, 0, 0], WALL, 0, 0.3);
  face([9.2, 0, 29], [9.2, 0, -3], [9.2, 14, -3], [9.2, 14, 29], [-1, 0, 0], WALL, 0, 0.3);
  face([-9.2, 14, -3], [-9.2, 14, 29], [9.2, 14, 29], [9.2, 14, -3], [0, -1, 0], [0.02, 0.02, 0.022]);
  face([9.2, 0, 29], [-9.2, 0, 29], [-9.2, 14, 29], [9.2, 14, 29], [0, 0, -1], WALL);
  face([-9.2, 0, -0.6], [9.2, 0, -0.6], [9.2, 14, -0.6], [-9.2, 14, -0.6], [0, 0, 1], [0.006, 0.006, 0.006]);
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) box(sx * 9.18 - 0.08, 5.0, 7 + k * 6 - 0.16, sx * 9.18 + 0.08, 5.6, 7 + k * 6 + 0.16, [1, 0.7, 0.4], 1);
  for (const sx of [-1, 1]) box(sx * 9.16 - 0.03, 2.9, 5.2, sx * 9.16 + 0.03, 3.05, 5.55, [0.2, 1, 0.45], 3);
  const geo = { b: buf(new Float32Array(V)), n: V.length / 11 };
  // ---------- the screen: a slice of a cylinder, its two ends come forward ----------
  const SEG = MOB ? 32 : 64, sv = [];
  for (let k = 0; k <= SEG; k++) { const a = -TH + 2 * TH * k / SEG, x = Math.sin(a) * CR, z = ZS + CR * (1 - Math.cos(a)), u = k / SEG; sv.push(x, YB, z, u, 1, x, YT, z, u, 0); }
  const scr = { b: buf(new Float32Array(sv)), n: (SEG + 1) * 2 };
  // ---------- curtains: two halves and a valance, folds generated in the shader ----------
  const cu = []; const CU = 140;
  for (let k = 0; k <= CU; k++) { const u = k / CU; cu.push(u, 0, u, 1); }
  const curt = { b: buf(new Float32Array(cu)), n: (CU + 1) * 2 };
  // ---------- the people: heads and shoulders above the seat backs in front ----------
  const r = rnd(4242), HD = [];
  for (let rr = 0; rr < camRow; rr++) for (let k = 0; k < SEATS; k++) {
    const x = (k - (SEATS - 1) / 2) * SEATW + (k < SEATS / 2 ? -0.55 : 0.55);
    if (Math.abs(x) > 6.5) continue;
    const near = Math.abs(rr - camRow) < 3 ? 0.62 : 0.5;
    if (r() > near) continue;
    const z = rowZ(rr), h = rowH(rr), lean = (r() - 0.5) * 0.06, hr = r(), hair = hr < 0.06 ? 0.16 : hr < 0.3 ? 0.06 : 0.022, big = 0.92 + r() * 0.2;
    HD.push([x + lean, h + 1.2 + (r() - 0.5) * 0.08, z + 0.17, 0.092 * big, 0.118 * big, 0.105 * big, hair, r()]);   // head
    HD.push([x + lean * 0.5, h + 0.98, z + 0.25, 0.21 * big, 0.11, 0.12, 0.02 + r() * 0.05, r()]);                 // shoulders
  }
  const hv = [];
  for (const h of HD) for (const q of [[-1, -1], [1, -1], [-1, 1], [1, -1], [1, 1], [-1, 1]]) hv.push(q[0], q[1], ...h);
  const heads = { b: buf(new Float32Array(hv)), n: hv.length / 10 };
  // ---------- dust in the projector beam ----------
  const OPJ = [0.0, 8.6, 28.7];
  const DN = MOB ? 350 : 800, dv = new Float32Array(DN * 4);
  for (let k = 0; k < DN; k++) {
    const f = Math.pow(r(), 0.7), u = r(), v = r();
    const tgt = [lerp(-SW / 2, SW / 2, u), lerp(YB, YT, v), ZS + 0.6];
    const p = mix(OPJ, tgt, 0.06 + f * 0.9);
    dv.set([p[0] + (r() - 0.5) * 0.4, p[1] + (r() - 0.5) * 0.4, p[2], r()], k * 4);
  }
  const dust = { b: buf(dv), n: DN };
  return { CR, TH, SW, SH, YB, YT, ZS, rowZ, rowH, camRow, geo, scr, curt, heads, dust, OPJ, video: C0.video, cfg: C0,
    tex: null, pot: null, lt: null, has: 0, lastUp: -1, frameNew: false, state: 'pre', showT: 0, playing: false, house: 1, curtain: 0, beam: 0, gain: 0, q: 0, w: 0 };
})();
const CLIGHT = `
uniform sampler2D lt; uniform float house, gainS, TH, CR, YB, YT, foot;
vec3 light(vec3 P, vec3 N, vec3 V, float sheen){
  vec3 E = vec3(0.0);
  float rim = pow(1.0 - abs(dot(N, V)), 3.0)*sheen;
  for (int i = 0; i < 8; i++) {
    float a = -TH + (float(i) + 0.5)/8.0*2.0*TH;
    vec3 sn = vec3(-sin(a), 0.0, cos(a));
    for (int j = 0; j < 2; j++) {
      vec3 sp = vec3(CR*sin(a), mix(YB, YT, (float(j) + 0.5)/2.0), CR*(1.0 - cos(a)));
      vec3 l = sp - P; float d2 = dot(l, l); l *= inversesqrt(d2);
      float f = max(dot(-l, sn), 0.0)*(max(dot(N, l), 0.0) + rim*0.8);
      E += (texture2D(lt, vec2((float(i) + 0.5)/8.0, 1.0 - (float(j) + 0.5)/2.0)).rgb + 0.015)*f*14.0/(d2 + 2.0);
    }
  }
  E *= gainS;
  for (int k = 0; k < 8; k++) {
    float sd = k < 4 ? -1.0 : 1.0, zz = 7.0 + mod(float(k), 4.0)*6.0;
    vec3 l = vec3(sd*8.9, 5.3, zz) - P; float d2 = dot(l, l); l *= inversesqrt(d2);
    E += vec3(1.0, 0.64, 0.34)*house*3.2*(max(dot(N, l), 0.0) + rim*0.5)/(d2 + 0.6);
  }
  for (int k = 0; k < 3; k++) {
    vec3 l = vec3(-6.0 + float(k)*6.0, 1.05, 2.9) - P; float d2 = dot(l, l); l *= inversesqrt(d2);
    E += vec3(1.0, 0.55, 0.28)*foot*5.0*(max(dot(N, l), 0.0) + rim*0.6)/(d2 + 0.4);
  }
  return E + vec3(0.006, 0.005, 0.005)*(1.0 + house*3.0);
}`;
let CG = null;
const CG_SRC = () => prog(`attribute vec3 p, n, c; attribute vec2 m; uniform mat4 vp; varying vec3 vw, vn, vc; varying vec2 vm;
void main(){ vw = p; vn = n; vc = c; vm = m; gl_Position = vp*vec4(p, 1.0); }`, `varying vec3 vw, vn, vc; varying vec2 vm; uniform vec3 eye; uniform float K, expo;
${CLIGHT}
void main(){
  vec3 N = normalize(vn), V = normalize(eye - vw);
  vec3 col;
  if (vm.x > 0.5) {
    float on = vm.x < 1.5 ? house : vm.x < 2.5 ? 0.35 + 0.25*house : 0.6;
    col = vc*on*(vm.x < 1.5 ? 9.0 : vm.x < 2.5 ? 4.0 : 1.6);
  } else {
    vec3 alb = vc;
    if (abs(N.x) > 0.9) alb *= 0.75 + 0.35*smoothstep(0.42, 0.5, abs(fract(vw.z*0.8) - 0.5));
    col = alb*light(vw, N, V, vm.y);
  }
  gl_FragColor = vec4(col*expo*K, 1.0);
}`);
let CS = null;
const CS_SRC = () => prog(`attribute vec3 p; attribute vec2 uv; uniform mat4 vp; varying vec2 v; varying vec3 vw;
void main(){ v = uv; vw = p; gl_Position = vp*vec4(p, 1.0); }`, `varying vec2 v; varying vec3 vw; uniform sampler2D tx; uniform float K, expo, gain, has, house;
void main(){
  vec3 c = has > 0.5 ? texture2D(tx, v).rgb : vec3(0.0);
  c = pow(c, vec3(2.2))*gain;
  float edge = smoothstep(0.0, 0.006, v.x)*smoothstep(1.0, 0.994, v.x)*smoothstep(0.0, 0.01, v.y)*smoothstep(1.0, 0.99, v.y);
  c = c*edge + vec3(0.02, 0.019, 0.018)*house*0.5;
  gl_FragColor = vec4(c*expo*K, 1.0);
}`);
let CC = null;
const CC_SRC = () => prog(`attribute vec2 uv; uniform mat4 vp; uniform float sd, open, t, valance;
varying vec3 vw, vn; varying float vf;
void main(){
  float u = uv.x, xL, xE, y0 = 0.95, y1 = 12.9, z0 = 2.7, F = 15.0, A;
  if (valance > 0.5) { xL = -9.3; xE = 9.3; y0 = 11.35; F = 40.0; A = 0.1; }
  else { xE = sd*9.3; xL = sd*mix(0.0, 8.15, open); A = mix(0.07, 0.2, open); }
  float ph = u*F*6.2832 + sd*1.3;
  float sway = sin(t*0.6 + u*3.0)*0.015*(1.0 - open*0.6);
  float x = mix(xL, xE, u), y = mix(y0, y1, uv.y);
  float z = z0 + sin(ph)*A*(0.8 + 0.2*uv.y) + sway;
  float dxdu = xE - xL, dzdu = cos(ph)*F*6.2832*A;
  vn = normalize(vec3(-dzdu, 0.0, abs(dxdu) + 1e-3)*vec3(sign(dxdu + 1e-6), 1.0, 1.0));
  vf = sin(ph);
  vw = vec3(x, y, z); gl_Position = vp*vec4(vw, 1.0);
}`, `varying vec3 vw, vn; varying float vf; uniform vec3 eye; uniform float K, expo;
${CLIGHT}
void main(){
  vec3 N = normalize(vn); if (dot(N, eye - vw) < 0.0) N = -N;
  vec3 V = normalize(eye - vw);
  vec3 alb = vec3(0.24, 0.016, 0.022)*(0.75 + 0.25*vf);
  vec3 col = alb*light(vw, N, V, 1.4);
  col *= smoothstep(0.95, 1.5, vw.y)*0.6 + 0.4;
  gl_FragColor = vec4(col*expo*K, 1.0);
}`);
let CH = null;
const CH_SRC = () => prog(`attribute vec2 q; attribute vec3 c, r; attribute vec2 h; uniform mat4 vp; uniform vec3 cr, cu;
varying vec3 vw, vc, vr; varying vec2 vh;
void main(){ float s = max(r.x, max(r.y, r.z))*1.25; vw = c + (cr*q.x + cu*q.y)*s; vc = c; vr = r; vh = h; gl_Position = vp*vec4(vw, 1.0); }`,
`varying vec3 vw, vc, vr; varying vec2 vh; uniform vec3 eye; uniform float K, expo;
${CLIGHT}
void main(){
  vec3 ro = (eye - vc)/vr, rd = (vw - eye)/vr;
  float A = dot(rd, rd), B = dot(ro, rd), C = dot(ro, ro) - 1.0, D = B*B - A*C;
  vec3 pc = ro - rd*(B/A); float dm = length(pc);
  float n = fract(sin(dot(floor(vw.xy*90.0), vec2(12.9898, 78.233)))*43758.5453);
  float al = smoothstep(1.0, 0.9, dm + (n - 0.5)*0.05);
  if (al < 0.02) discard;
  float t = D > 0.0 ? (-B - sqrt(max(D, 0.0)))/A : B/A*-1.0;
  vec3 ps = D > 0.0 ? ro + rd*t : pc/max(dm, 1e-3);
  vec3 N = normalize(ps/vr), P = vc + ps*vr, V = normalize(eye - P);
  float strand = 0.75 + 0.5*fract(sin(dot(floor(vec2(atan(ps.x, ps.z)*40.0, ps.y*6.0)), vec2(12.9898, 78.233)))*43758.5453);
  vec3 alb = vec3(vh.x*1.1, vh.x*0.82, vh.x*0.66)*strand + 0.003;
  vec3 col = alb*light(P, N, V, 1.6);
  gl_FragColor = vec4(col*expo*K*al, al);
}`);
let CB = null;
const CB_SRC = () => prog(`attribute vec2 q; varying vec2 ndc; void main(){ ndc = q; gl_Position = vec4(q, 0.0, 1.0); }`, `varying vec2 ndc;
uniform vec3 eye, cr, cu, cf, O; uniform vec2 shift; uniform float th, asp, K, expo, beam, t, SW, YB, YT, ZS; uniform sampler2D pot;
float h3(vec3 p){ p = fract(p*vec3(0.1173, 0.1311, 0.1427)); p += dot(p, p.zyx + 19.19); return fract((p.x + p.z)*p.y); }
float vn(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0 - 2.0*f);
  return mix(mix(mix(h3(i), h3(i + vec3(1.0, 0.0, 0.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 0.0)), h3(i + vec3(1.0, 1.0, 0.0)), f.x), f.y),
             mix(mix(h3(i + vec3(0.0, 0.0, 1.0)), h3(i + vec3(1.0, 0.0, 1.0)), f.x), mix(h3(i + vec3(0.0, 1.0, 1.0)), h3(i + vec3(1.0, 1.0, 1.0)), f.x), f.y), f.z); }
void main(){
  vec3 d = normalize(cf + cr*(ndc.x - shift.x)*th*asp + cu*(ndc.y - shift.y)*th);
  // the beam: a pyramid from the projector port to the four corners of the screen
  vec3 c0 = vec3(-SW*0.5, YB, ZS + 0.6) - O, c1 = vec3(SW*0.5, YB, ZS + 0.6) - O, c2 = vec3(SW*0.5, YT, ZS + 0.6) - O, c3 = vec3(-SW*0.5, YT, ZS + 0.6) - O;
  vec3 ro = eye - O;
  float t0 = 0.0, t1 = 80.0;
  vec3 ns[4]; ns[0] = normalize(cross(c0, c1)); ns[1] = normalize(cross(c1, c2)); ns[2] = normalize(cross(c2, c3)); ns[3] = normalize(cross(c3, c0));
  for (int i = 0; i < 4; i++) {
    vec3 nn = ns[i]; float a = dot(ro, nn), b = dot(d, nn);
    if (abs(b) < 1e-6) { if (a > 0.0) t1 = -1.0; }
    else { float tt = -a/b; if (b > 0.0) t1 = min(t1, tt); else t0 = max(t0, tt); }
  }
  if (abs(d.z) > 1e-5) { float tz = (ZS + 0.6 - eye.z)/d.z; if (d.z < 0.0) t1 = min(t1, tz); else t0 = max(t0, tz); }
  vec3 acc = vec3(0.0);
  if (t1 > t0 && beam > 0.001) {
    float dt = (t1 - t0)/12.0, tt = t0 + dt*fract(sin(dot(gl_FragCoord.xy, vec2(12.99, 78.23)))*43758.5);
    for (int i = 0; i < 12; i++) {
      vec3 p = eye + d*tt, s = p - O;
      float k = (ZS + 0.6 - O.z)/s.z; vec3 hit = O + s*k;
      vec2 uv = vec2((hit.x + SW*0.5)/SW, (hit.y - YB)/(YT - YB));
      vec3 col = pow(texture2D(pot, vec2(uv.x, 1.0 - uv.y), 1.5).rgb, vec3(2.2)) + vec3(0.014, 0.013, 0.012);
      float edge = smoothstep(0.0, 0.05, uv.x)*smoothstep(1.0, 0.95, uv.x)*smoothstep(0.0, 0.05, uv.y)*smoothstep(1.0, 0.95, uv.y);
      float n1 = vn(p*0.5 + vec3(0.0, t*0.05, t*0.08)), n2 = vn(p*1.6 - vec3(t*0.07, 0.0, 0.0));
      float haze = 0.07 + 0.55*pow(n1*n2, 2.0);
      float spread = 1.0/(dot(s, s)*0.0035 + 0.35);
      float near = smoothstep(ZS + 0.6, ZS + 7.5, p.z);   // the air just in front of the screen stays clear, so the picture is not fogged
      acc += col*edge*haze*spread*near*dt;
      tt += dt;
    }
  }
  gl_FragColor = vec4(acc*beam*0.11*expo*K, 1.0);
}`);
let CD = null;
const CD_SRC = () => prog(`attribute vec4 p; uniform mat4 vp; uniform vec3 O; uniform float t, ps, SW, YB, YT, ZS, beam; uniform sampler2D pot; varying vec3 vc;
void main(){
  vec3 q = p.xyz + vec3(sin(t*0.13 + p.w*40.0), sin(t*0.09 + p.w*23.0)*0.6, sin(t*0.11 + p.w*31.0))*0.25;
  gl_Position = vp*vec4(q, 1.0);
  vec3 s = q - O; float k = (ZS + 0.6 - O.z)/s.z; vec3 hit = O + s*k;
  vec2 uv = vec2((hit.x + SW*0.5)/SW, (hit.y - YB)/(YT - YB));
  float inb = step(0.0, uv.x)*step(uv.x, 1.0)*step(0.0, uv.y)*step(uv.y, 1.0);
  vc = (pow(texture2D(pot, vec2(uv.x, 1.0 - uv.y)).rgb, vec3(2.2)) + 0.04)*inb*beam*1.1*(0.4 + 0.6*sin(t*1.7 + p.w*60.0)*sin(t*1.7 + p.w*60.0))/(dot(s, s)*0.004 + 0.4);
  gl_PointSize = (1.0 + p.w*1.6)*ps;
}`, `varying vec3 vc; uniform float K, expo; void main(){ vec2 q = gl_PointCoord - 0.5; float a = exp(-dot(q, q)*16.0); gl_FragColor = vec4(vc*a*expo*K*0.9, 1.0); }`);
let CLT = null;
const CLT_SRC = () => prog(`attribute vec2 q; varying vec2 uv; void main(){ uv = q*0.5 + 0.5; gl_Position = vec4(q, 0.0, 1.0); }`, `varying vec2 uv; uniform sampler2D tx; uniform vec2 cells;
void main(){ vec3 s = vec3(0.0); vec2 c = floor(uv*cells);
  for (int i = 0; i < 4; i++) for (int j = 0; j < 4; j++) s += texture2D(tx, (c + (vec2(float(i), float(j)) + 0.5)/4.0)/cells).rgb;
  gl_FragColor = vec4(pow(s/16.0, vec3(2.2)), 1.0); }`);
let CCP = null;
const CCP_SRC = () => prog(`attribute vec2 q; varying vec2 uv; void main(){ uv = q*0.5 + 0.5; gl_Position = vec4(q, 0.0, 1.0); }`, `varying vec2 uv; uniform sampler2D tx;
void main(){ gl_FragColor = vec4(texture2D(tx, uv).rgb, 1.0); }`);
function cinePrep() {
  if (CG || !CI || CI.failed) return;
  try { CG = CG_SRC(); CS = CS_SRC(); CC = CC_SRC(); CH = CH_SRC(); CB = CB_SRC(); CD = CD_SRC(); CLT = CLT_SRC(); CCP = CCP_SRC(); }
  catch (e) { CG = null; CI.failed = true; document.documentElement.classList.add('no-cine'); }
}
// the hall is drawn once its shaders have finished compiling in the background; a shader that fails leaves the plain film player
function cineReady() {
  if (CI.ok) return true;
  const L = [CG, CS, CC, CH, CB, CD, CLT, CCP];
  if (!L.every(done)) return false;
  try { L.forEach(fin); CI.ok = true; } catch (e) { CG = null; CI.failed = true; document.documentElement.classList.add('no-cine'); }
  return !!CI.ok;
}
if (CI) {
  CI.tex = tex2d(2, 2, gl.UNSIGNED_BYTE, gl.LINEAR, new Uint8Array(16));
  CI.pot = (() => { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 256, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { t, f }; })();
  CI.lt = (() => { const t = tex2d(8, 2, gl.UNSIGNED_BYTE, gl.LINEAR, new Uint8Array(64).fill(8)); const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); return { t, f }; })();
  const v = CI.video;
  if (v.requestVideoFrameCallback) { const cb = () => { CI.frameNew = true; v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
}
// copy a picture (video frame or poster) to the screen texture, a small mip-mapped copy for the beam, and the 8×2 light
function cineUpload(src) {
  try {
    gl.bindTexture(gl.TEXTURE_2D, CI.tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src); CI.has = 1;
  } catch (e) { return; }
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  gl.bindFramebuffer(gl.FRAMEBUFFER, CI.pot.f); gl.viewport(0, 0, 512, 256);
  let u = use(CCP); attr(CCP, 'q', TRI, 2); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, CI.tex); gl.uniform1i(u.tx, 0); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindTexture(gl.TEXTURE_2D, CI.pot.t); gl.generateMipmap(gl.TEXTURE_2D);
  gl.bindFramebuffer(gl.FRAMEBUFFER, CI.lt.f); gl.viewport(0, 0, 8, 2);
  u = use(CLT); attr(CLT, 'q', TRI, 2); gl.bindTexture(gl.TEXTURE_2D, CI.pot.t); gl.uniform1i(u.tx, 0); gl.uniform2f(u.cells, 8, 2); gl.drawArrays(gl.TRIANGLES, 0, 3);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function cineLights(u, P) {
  gl.uniform1f(u.house, CI.house); gl.uniform1f(u.gainS, CI.gain * 3.0); gl.uniform1f(u.TH, CI.TH); gl.uniform1f(u.CR, CI.CR); gl.uniform1f(u.YB, CI.YB); gl.uniform1f(u.YT, CI.YT);
  gl.uniform1f(u.foot, CI.house * (1 - CI.curtain) * 0.6);
  gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, CI.lt.t); gl.uniform1i(u.lt, 2); gl.activeTexture(gl.TEXTURE0);
  gl.uniform3fv(u.eye, camE); gl.uniform1f(u.K, K); gl.uniform1f(u.expo, P.cexpo);
}
function drawCinema(P, t) {
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND);
  let u = use(CG); gl.uniformMatrix4fv(u.vp, false, vp); cineLights(u, P);
  attr(CG, 'p', CI.geo.b, 3, 11, 0); attr(CG, 'n', CI.geo.b, 3, 11, 3); attr(CG, 'c', CI.geo.b, 3, 11, 6); attr(CG, 'm', CI.geo.b, 2, 11, 9);
  gl.drawArrays(gl.TRIANGLES, 0, CI.geo.n);
  u = use(CS); gl.uniformMatrix4fv(u.vp, false, vp); attr(CS, 'p', CI.scr.b, 3, 5, 0); attr(CS, 'uv', CI.scr.b, 2, 5, 3);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, CI.tex); gl.uniform1i(u.tx, 0);
  gl.uniform1f(u.K, K); gl.uniform1f(u.expo, P.cexpo); gl.uniform1f(u.gain, CI.gain * 1.2); gl.uniform1f(u.has, CI.has); gl.uniform1f(u.house, CI.house);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, CI.scr.n);
  u = use(CC); gl.uniformMatrix4fv(u.vp, false, vp); cineLights(u, P); gl.uniform1f(u.t, t); attr(CC, 'uv', CI.curt.b, 2);
  for (const [sd, val] of [[-1, 0], [1, 0], [0, 1]]) { gl.uniform1f(u.sd, sd || 1); gl.uniform1f(u.valance, val); gl.uniform1f(u.open, CI.curtain); gl.drawArrays(gl.TRIANGLE_STRIP, 0, CI.curt.n); }
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  u = use(CH); gl.uniformMatrix4fv(u.vp, false, vp); cineLights(u, P); gl.uniform3fv(u.cr, camR); gl.uniform3fv(u.cu, camU);
  attr(CH, 'q', CI.heads.b, 2, 10, 0); attr(CH, 'c', CI.heads.b, 3, 10, 2); attr(CH, 'r', CI.heads.b, 3, 10, 5); attr(CH, 'h', CI.heads.b, 2, 10, 8);
  gl.drawArrays(gl.TRIANGLES, 0, CI.heads.n);
  gl.depthMask(false); gl.blendFunc(gl.ONE, gl.ONE);
  if (CI.beam > 0.002) {
    gl.disable(gl.DEPTH_TEST);
    u = use(CB); attr(CB, 'q', TRI, 2);
    gl.uniform3fv(u.eye, camE); gl.uniform3fv(u.cr, camR); gl.uniform3fv(u.cu, camU); gl.uniform3fv(u.cf, camF); gl.uniform3fv(u.O, CI.OPJ);
    gl.uniform2f(u.shift, P.sx, P.sy); gl.uniform1f(u.th, Math.tan(P.fov / 2)); gl.uniform1f(u.asp, S.w / S.h);
    gl.uniform1f(u.K, K); gl.uniform1f(u.expo, P.cexpo); gl.uniform1f(u.beam, CI.beam); gl.uniform1f(u.t, t);
    gl.uniform1f(u.SW, CI.SW); gl.uniform1f(u.YB, CI.YB); gl.uniform1f(u.YT, CI.YT); gl.uniform1f(u.ZS, CI.ZS);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, CI.pot.t); gl.uniform1i(u.pot, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.enable(gl.DEPTH_TEST);
    u = use(CD); gl.uniformMatrix4fv(u.vp, false, vp); gl.uniform3fv(u.O, CI.OPJ); gl.uniform1f(u.t, t); gl.uniform1f(u.ps, R.scale);
    gl.uniform1f(u.SW, CI.SW); gl.uniform1f(u.YB, CI.YB); gl.uniform1f(u.YT, CI.YT); gl.uniform1f(u.ZS, CI.ZS); gl.uniform1f(u.beam, CI.beam);
    gl.uniform1f(u.K, K); gl.uniform1f(u.expo, P.cexpo); gl.uniform1i(u.pot, 0);
    attr(CD, 'p', CI.dust.b, 4); gl.drawArrays(gl.POINTS, 0, CI.dust.n);
  }
  gl.disable(gl.DEPTH_TEST);
}
// ======================================================================
//  state, camera
// ======================================================================
const S = {
  w: 1, h: 1, cw: 1, ch: 1, time: 0, frame: 0, rot: 0, open: Y.skipOpening || RED ? 1 : 0, openT0: 0, drag: null, az: 0, el: 0, vaz: 0,
  hover: -1, running: true, px: 0, py: 0, tpx: 0, tpy: 0, sound: false, sc: 0, sv: 0, jump: null, ft: 0, slow: 0, late: false, dead: false
};
if (Y.land != null && Y.land >= 0 && Y.land < N) S.land = { i: Y.land, t0: null };
const view = new Float32Array(16), proj = new Float32Array(16), vp = new Float32Array(16);
let camR = [1, 0, 0], camU = [0, 1, 0], camF = [0, 0, -1], camE = [0, 0, 100], fpx = 1;
const FOV = MOB ? 1.0 : 0.82;
function sph(az, el, d, c = [0, 0, 0]) { return [c[0] + d * Math.cos(el) * Math.sin(az), c[1] + d * Math.sin(el), c[2] + d * Math.cos(el) * Math.cos(az)]; }
function camBasis(e, c) { const z = nrm(sub(e, c)), x = nrm(cross([0, 1, 0], z)); return { x, y: cross(z, x), z }; }
// where the camera stands at a planet's stop: outside its orbit and a little above, so the bright centre of the galaxy
// shows on the side of the card and the planet sits on the other
function stationDir(p, w = planetPos(p)) {
  const out = nrm([w[0], 0, w[2]]), tan = [-out[2], 0, out[0]];
  const cardLeft = MOB ? true : p.i % 2 === 0;
  let best = null;
  for (const sg of [1, -1]) {
    const d = nrm(add(add(mul(out, 0.8), mul(tan, 0.55 * sg)), [0, MOB ? 0.22 : 0.13, 0]));
    const e = add(w, mul(d, 10)), B = camBasis(e, w), side = dot(sub([0, 0, 0], e), B.x);
    const score = MOB ? -Math.abs(side) : (cardLeft ? -side : side);
    if (!best || score > best.score) best = { d, score };
  }
  return best.d;
}
PL.forEach(p => { p.L0 = planetLight(p, planetPos(p, 0)); });
function lightOf(p) { return rotYv(p.L0, S.rot); }
function rotYv(v, a) { const c = Math.cos(a), s = Math.sin(a); return [c * v[0] - s * v[2], v[1], s * v[0] + c * v[2]]; }

// ---------- the stops: every section marked data-st is one ----------
let ST = [];
function measure() {
  ST = [...document.querySelectorAll('[data-st]')].map(el => {
    const r = el.getBoundingClientRect(), top = r.top + scrollY, id = el.dataset.st;
    return { id, el, top, h: r.height, y: id === 'film' ? top + r.height / 2 : top + Math.min(r.height, innerHeight) / 2 };
  }).sort((a, b) => a.y - b.y);
  if (typeof w3layout === 'function' && S.ready) w3layout();
  L3.dirty = true;
}
const BASE = { sx: 0, sy: 0, gA: 1, dA: 1, coreA: 1, pA: 1, ret: 0, bloom: 0.2, expo: 1.0, vig: 0.35, lift: 0 };
function poseHero() { return Object.assign({}, BASE, { e: sph(0.35 + S.az, 0.56 + S.el, MOB ? 118 : 92), c: [0, 0, 0], sy: MOB ? -0.2 : -0.24, ret: 0 }); }
function poseCraft(i) {
  const p = PL[i], w = planetPos(p), d = rotYv(p.D0, S.rot);
  const D = p.rad * (MOB ? 6.6 : 4.4);
  return Object.assign({}, BASE, { e: add(w, mul(d, D)), c: w, sx: MOB ? 0 : (i % 2 ? -0.46 : 0.46), sy: MOB ? 0.36 : 0.02, dA: 0, gA: 0.55, act: i, lift: 1 });
}
PL.forEach(p => { p.D0 = stationDir(p, planetPos(p, 0)); });
// ---------- landing on a planet (a craft's page): low over its lit side, the horizon ahead, the galaxy above ----------
const LANDH = MOB ? 1.42 : 1.34, LB = { a: 2.06, yaw: MOB ? 0.0 : -0.3, hz: MOB ? 0.4 : 0.32 };   // the galaxy's centre ahead and to the right, away from the words
// the site faces away from the galaxy's centre, so from low over it the centre rises just above the horizon ahead;
// the light comes from behind the right shoulder, so the ground below shows its colours
function siteFrame(p) {
  const w = planetPos(p), k = nrm(sub([0, 0, 0], w));
  let m = sub([0, 1, 0], mul(k, k[1])); m = len(m) < 1e-3 ? [1, 0, 0] : nrm(m);
  const u = nrm(add(mul(k, Math.cos(LB.a)), mul(m, Math.sin(LB.a))));
  let f = nrm(sub(k, mul(u, dot(k, u)))), r = nrm(cross(f, u));
  f = nrm(add(mul(f, Math.cos(LB.yaw)), mul(r, Math.sin(LB.yaw)))); r = nrm(cross(f, u));
  return { w, u, f, r };
}
// a stop on the walk: th, how far round the planet from the landing site; h, the height (in radii from its centre);
// yaw, turned right of ahead; hz, where the horizon sits (0 the middle of the screen, 1 its bottom edge)
function walkCam(p, B, q) {
  const c = Math.cos(q.th), s = Math.sin(q.th);
  const U = nrm(add(mul(B.u, c), mul(B.f, s))), F0 = nrm(sub(mul(B.f, c), mul(B.u, s)));
  const F = nrm(add(mul(F0, Math.cos(q.yaw)), mul(B.r, Math.sin(q.yaw)))), Rt = nrm(cross(F, U));
  const e = add(B.w, mul(U, p.rad * q.h));
  const g = Math.acos(Math.min(1, 1 / q.h)) - Math.atan(q.hz * Math.tan(FOV / 2));
  const v = nrm(sub(mul(F, Math.cos(g)), mul(U, Math.sin(g))));
  return { e, U, F, R: Rt, v, up: nrm(cross(Rt, v)) };
}
// the walk: the page says where it has scrolled to (a stop number, fractions between); the camera follows on a spring and holds at each stop
const WK = Array.isArray(Y.walk) && Y.walk.length ? Y.walk : [{ th: 0, h: LANDH, yaw: 0, hz: LB.hz, n: 0, g: 0.55 }];
S.walk = { t: 0, x: 0, v: 0 };
function walkAt(x) {
  const n = WK.length - 1, X = clamp(x, 0, n), j = Math.min(n - 1, Math.floor(X)), f = n ? X - j : 0;
  if (!n) return Object.assign({}, WK[0]);
  const a = WK[j], b = WK[j + 1], e = ss(clamp((f - 0.14) / 0.72)), q = {};
  for (const k in a) q[k] = typeof a[k] === 'number' ? lerp(a[k], b[k] === undefined ? a[k] : b[k], e) : a[k];
  return q;
}
// day at the top of the page, night by its foot: the light swings from above the right shoulder to below the horizon behind
function landLight(B, n) {
  const dayL = add(add(mul(B.r, 0.7), mul(B.u, 0.62)), mul(B.f, -0.28)), nightL = add(add(mul(B.r, 0.25), mul(B.u, -0.45)), mul(B.f, -0.85));   // night: the light is behind us and below, so the ground ahead goes dark
  return nrm(mix(nrm(dayL), nrm(nightL), clamp(n)));
}
function landFrame(p) {
  const B = siteFrame(p), q = walkAt(S.walk.x), C = walkCam(p, B, q);
  S.land.L = landLight(B, q.n || 0);
  S.land.ax = nrm(add(mul(B.u, Math.sin(0.44)), mul(B.f, -Math.cos(0.44))));   // its pole tilted back: we fly at about 25° north, its bands and rings run along the horizon
  return { w: B.w, u: C.U, f: C.F, e: C.e, v: C.v, q };
}
// the descent: from inside the atmosphere looking straight down, the camera rises a little and pitches up to the horizon
function landPose() {
  const p = PL[S.land.i], F = landFrame(p);
  const P = Object.assign({}, BASE, { e: F.e, c: add(F.e, F.v), up: F.u, dA: 0, gA: F.q.g === undefined ? 0.55 : F.q.g, act: p.i, landed: 1 });
  if (S.land.t0 != null) {
    const k = clamp((performance.now() - S.land.t0) / 3000), E = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(2 - 2 * k, 3) / 2;   // slow out of the air, pull up, level off
    if (k < 1) {
      P.e = mix(add(F.w, mul(F.u, p.rad * 1.06)), F.e, E);
      P.c = add(P.e, nrm(add(mul(F.u, -(1 - E)), mul(F.v, E))));
      P.up = nrm(add(mul(F.f, 1 - E), mul(F.u, E)));
    } else S.land.t0 = null;
  }
  return P;
}
// ---------- the page's own elements on the planet (a screen in the sky, signs along the way), in CSS 3D with the same camera ----------
const L3 = { layers: [], items: [], ok: false, dirty: true }, LK = 1000;   // the CSS camera works in thousandths of a world unit: a planet is small, and near the camera the browser would drop elements
function l3layout() {
  L3.dirty = false; L3.ok = false; L3.items = [];
  if (!S.land) return;
  L3.layers = [...document.querySelectorAll('.l3')].filter(L => L.firstElementChild && getComputedStyle(L).position === 'fixed');
  if (!L3.layers.length) return;
  const p = PL[S.land.i], B = siteFrame(p), ty = Math.tan(FOV / 2), tx = ty * S.cw / Math.max(1, S.ch);
  L3.layers.forEach(L => L.querySelectorAll('[data-l3]').forEach(el => {
    const d = el.dataset, g = k => +((MOB && d[k + 'm'] != null ? d[k + 'm'] : d[k]) || 0), st = +d.st, C = walkCam(p, B, WK[Math.min(st, WK.length - 1)]);
    const was = el.style.display; el.style.display = 'block'; const wpx = el.offsetWidth || 1, hpx = el.offsetHeight || 1; el.style.display = was;   // measured while shown
    const x = g('x'), y = g('y');
    let pos, X, Yv, Z, s;
    if (d.l3 === 'sign') {   // stands on the ground where the screen point (x, y) meets the planet, upright, turned to the camera
      const dir = nrm(add(add(C.v, mul(C.R, x * tx)), mul(C.up, y * ty))), oc = sub(C.e, B.w), bq = dot(oc, dir), cq = dot(oc, oc) - p.rad * p.rad, disc = bq * bq - cq;
      const tH = disc > 0 ? -bq - Math.sqrt(disc) : p.rad * 0.3, base = add(C.e, mul(dir, tH)), N = nrm(sub(base, B.w));
      const toC = sub(C.e, base); Z = nrm(sub(toC, mul(N, dot(toC, N)))); Yv = N; X = cross(Yv, Z);
      s = (g('h') || 0.3) * 2 * len(toC) * ty / hpx; pos = add(base, mul(N, hpx * s / 2));
    } else {                 // a flat screen held in the sky in front of the camera at this stop: centre (x, y) on the screen, w of its width
      const D = p.rad * (g('d') || 0.5);
      pos = add(add(add(C.e, mul(C.v, D)), mul(C.R, x * D * tx)), mul(C.up, y * D * ty));
      X = C.R; Yv = C.up; Z = mul(C.v, -1); s = (g('w') || 0.6) * 2 * D * tx / wpx;
    }
    el.style.transform = cssObj(X, Yv, Z, mul(pos, LK), s * LK);
    L3.items.push({ el, st, pos, span: g('span') || 1, a: -1 });
  }));
  L3.ok = true;
}
function l3frame(P, hidden) {
  if (!S.land) return;
  if (L3.dirty) l3layout();
  if (!L3.ok) return;
  const p = (S.ch / 2) / Math.tan(FOV / 2), ox = P.sx * S.cw / 2, oy = -P.sy * S.ch / 2, v = view;
  const cam = 'translate(' + ox.toFixed(2) + 'px,' + oy.toFixed(2) + 'px) translateZ(' + p.toFixed(3) + 'px) matrix3d(' + [v[0], -v[1], v[2], v[3], v[4], -v[5], v[6], v[7], v[8], -v[9], v[10], v[11], v[12] * LK, -v[13] * LK, v[14] * LK, v[15]].map(w3f).join(',') + ') translate(' + (S.cw / 2) + 'px,' + (S.ch / 2) + 'px)';
  L3.layers.forEach(L => { L.style.perspective = p.toFixed(3) + 'px'; L.style.perspectiveOrigin = (S.cw / 2 + ox).toFixed(1) + 'px ' + (S.ch / 2 + oy).toFixed(1) + 'px'; L.firstElementChild.style.transform = cam; });
  const desc = S.land.t0 != null, x = S.walk.x;
  for (const it of L3.items) {
    const ez = v[2] * it.pos[0] + v[6] * it.pos[1] + v[10] * it.pos[2] + v[14];
    let a = hidden || desc || S.dive || ez > -0.002 ? 0 : ss(clamp(1 - Math.abs(x - it.st) / it.span)); if (a < 0.02) a = 0;
    if (Math.abs(a - it.a) > 0.004 || (a === 0) !== (it.a === 0)) {
      it.a = a; const st = it.el.style, show = a > 0;
      st.opacity = a.toFixed(3); st.pointerEvents = a > 0.6 ? 'auto' : 'none';
      if (show !== it.shown) { it.shown = show; st.display = show ? 'block' : 'none'; it.el.classList.toggle('on', show); }   // hidden ones are out of the page, so a film there does not start
    }
  }
}
const HILAND = MOB ? [512, 256] : [1024, 512];
function landBaked() {
  const p = PL[S.land.i]; if (p.hiTex) return true;
  const job = S.land.job || (S.land.job = { p, A: cubeTex(HILAND[0]), B: cubeTex(HILAND[1]), k: 0 });
  for (let n = 0; n < 2 && job.k < 12; n++, job.k++) bakeFace(p, job.k < 6 ? job.A : job.B, job.k % 6, job.k >= 6);
  if (job.k < 12) return false;
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, job.A.t); gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, job.B.t); gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
  p.hiTex = { A: job.A, B: job.B }; return true;
}
function poseFilm() { const P = poseCraft(N - 1); P.e = mix(P.e, P.c, 0.35); P.lift = 0; return P; }
// the works ride on a ring above the disc; the camera orbits outside it, looking in at one at a time
const RW = 46, YW = 18, PHI0 = 0.25, NW = Y.works || 8, WDC = MOB ? 27.5 : 24.5;
const wAng = k => PHI0 + k * TAU / NW;
function poseWorkIntro() { return Object.assign({}, BASE, { e: sph(Math.PI / 2 - wAng(0) + 0.35, 0.5, MOB ? 165 : 140), c: [0, 8, 0], sy: MOB ? 0.12 : 0.08, dA: 0.7 }); }
function poseWork(k) {
  const a = wAng(k), f = [Math.cos(a), 0, Math.sin(a)], P0 = [f[0] * RW, YW, f[2] * RW];
  return Object.assign({}, BASE, { e: add(add(P0, mul(f, WDC)), [0, MOB ? 3 : 2.2, 0]), c: add(P0, [0, MOB ? -0.6 : -0.3, 0]), dA: 0.5, coreA: 1 });
}
const FREE = (() => { const a = wAng(NW - 1) + 0.9, e = sph(Math.PI / 2 - a, 0.66, MOB ? 120 : 98), c = [0, 26, 0]; return { e, c }; })();
function poseFree() { return Object.assign({}, BASE, { e: FREE.e, c: FREE.c, dA: 0.6 }); }
function poseEnd() { return Object.assign({}, BASE, { e: sph(Math.PI / 2 - wAng(NW - 1) - 1.6, 0.92, MOB ? 215 : 178), c: [0, 0, 0], sy: MOB ? -0.32 : -0.46, dA: 0.45 }); }
function poseOf(id) {
  if (id === 'hero') return poseHero();
  if (id[0] === 'c') return poseCraft(+id.slice(1));
  if (id === 'film') return poseFilm();
  if (id === 'wi') return poseWorkIntro();
  if (id[0] === 'w') return poseWork(+id.slice(1));
  if (id === 'free') return poseFree();
  return poseEnd();
}
const dwell = f => s5(clamp((f - 0.14) / 0.72));
function scrollS() {
  if (!ST.length) return 0;
  const yc = scrollY + innerHeight / 2;
  if (yc <= ST[0].y) return 0;
  for (let k = 0; k < ST.length - 1; k++) if (yc < ST[k + 1].y) return k + dwell((yc - ST[k].y) / (ST[k + 1].y - ST[k].y));
  return ST.length - 1;
}
function poseAtS(s) {
  if (!ST.length) return poseHero();
  const n = ST.length, k = clamp(Math.floor(s), 0, n - 1), f = s - k;
  const at = i => poseOf(ST[clamp(i, 0, n - 1)].id);
  const P1 = at(k);
  if (k >= n - 1 || f < 1e-4) return P1;
  const P0 = at(k - 1), P2 = at(k + 1), P3 = at(k + 2);
  const P = {};
  for (const key in BASE) P[key] = lerp(P1[key], P2[key], f);
  P.e = cr(P0.e, P1.e, P2.e, P3.e, f); P.c = cr(P0.c, P1.c, P2.c, P3.c, f);
  if (P1.lift && P2.lift) P.e[1] += Math.sin(Math.PI * f) * Math.min(len(sub(P2.e, P1.e)) * 0.12, 5);
  P.act = f < 0.5 ? P1.act : P2.act; P.actK = Math.abs(f - 0.5) * 2;
  return P;
}
// ---------- draw the galaxy ----------
function sprites(set, mode, t, reveal) {
  const u = use(SPR); gl.uniformMatrix4fv(u.vp, false, vp); gl.uniform1f(u.ps, fpx); gl.uniform1f(u.maxPx, MAXPT); gl.uniform1f(u.time, t); gl.uniform1f(u.K, K);
  gl.uniform1f(u.rot, mode.bg ? 0 : S.rot); gl.uniform1f(u.reveal, mode.bg ? 9 : reveal); gl.uniform1f(u.fixedPx, mode.bg ? R.scale : 0);
  gl.uniform1f(u.aMul, mode.a); gl.uniform1f(u.tw, mode.tw || 0); gl.uniform1f(u.dark, 0);
  attr(SPR, 'p', set.b, 3, 9, 0); attr(SPR, 'c', set.b, 4, 9, 3); attr(SPR, 's', set.b, 2, 9, 7);
  gl.drawArrays(gl.POINTS, 0, set.n);
}
function drawGalaxyBack(P, reveal, t) {
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  sprites(G.bg, { bg: 1, a: 1, tw: 0.25 }, t, reveal);
  { const u = use(FARG); gl.uniformMatrix4fv(u.vp, false, vp); gl.uniform1f(u.fixedPx, R.scale); gl.uniform1f(u.K, K);
    attr(FARG, 'p', G.far.b, 3, 10, 0); attr(FARG, 'c', G.far.b, 4, 10, 3); attr(FARG, 's', G.far.b, 3, 10, 7); gl.drawArrays(gl.POINTS, 0, G.far.n); }
  if (P.gA < 0.005) return;
  // the disc and the bulge: light and dust along each ray
  gl.blendFunc(gl.ONE, gl.SRC_ALPHA);
  const u = use(GVOL); attr(GVOL, 'q', TRI, 2);
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, G.map); gl.uniform1i(u.map, 0);
  gl.uniform3fv(u.eye, camE); gl.uniform3fv(u.cr, camR); gl.uniform3fv(u.cu, camU); gl.uniform3fv(u.cf, camF);
  gl.uniform2f(u.shift, P.sx, P.sy); gl.uniform1f(u.th, Math.tan(FOV / 2)); gl.uniform1f(u.asp, S.w / S.h); gl.uniform1f(u.rot, S.rot);
  gl.uniform1f(u.reveal, reveal); gl.uniform1f(u.K, K); gl.uniform1f(u.gA, P.gA); gl.uniform1f(u.coreA, P.coreA); gl.uniform1f(u.jit, (S.frame % 32) * 7.1);
  gl.uniform1f(u.ext, GEXTM); gl.uniform1f(u.kE, 0.17); gl.uniform1f(u.kD, 1.4);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}
function drawGalaxyFront(P, reveal, t) {
  if (P.gA < 0.005) return;
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  sprites(G.stars, { a: P.gA }, t, reveal);
  sprites(G.hii, { a: P.gA }, t, reveal);
}
function drawD(P, o, t) {
  const u = use(DPP); gl.uniformMatrix4fv(u.vp, false, vp); gl.uniform3fv(u.cr, camR); gl.uniform3fv(u.cu, camU);
  gl.uniform1f(u.form, o < 1 ? clamp(o / 0.4) : 1); gl.uniform1f(u.ps, fpx); gl.uniform1f(u.bright, 0.5 * P.dA); gl.uniform1f(u.time, t); gl.uniform1f(u.K, K);
  attr(DPP, 'dxy', G.D.b, 2, 8, 0); attr(DPP, 'sc', G.D.b, 3, 8, 2); attr(DPP, 'c', G.D.b, 3, 8, 5);
  gl.drawArrays(gl.POINTS, 0, G.D.n);
}

// ======================================================================
//  WORKS AND TOOLS IN SPACE — the page's own elements placed in the scene with CSS 3D,
//  moved every frame with the same camera, so they stay sharp and clickable
// ======================================================================
const W3 = { layers: [], items: [], ok: false, on: false };
const w3f = v => Math.abs(v) < 1e-9 ? '0' : v.toFixed(6);
function cssObj(X, Yv, Z, T, s) {
  const e = [X[0] * s, X[1] * s, X[2] * s, 0, Yv[0] * s, Yv[1] * s, Yv[2] * s, 0, Z[0] * s, Z[1] * s, Z[2] * s, 0, T[0], T[1], T[2], 1];
  return 'translate(-50%,-50%) matrix3d(' + [e[0], e[1], e[2], e[3], -e[4], -e[5], -e[6], -e[7], e[8], e[9], e[10], e[11], e[12], e[13], e[14], e[15]].map(w3f).join(',') + ')';
}
function w3layout() {
  W3.layers = [...document.querySelectorAll(MOB ? '.works .w3' : '.w3')]; W3.items = []; W3.ok = false;
  if (!W3.layers.length) return;
  const up = [0, 1, 0];
  document.querySelectorAll('.w3p').forEach((el, k) => {
    const a = wAng(k), f = [Math.cos(a), 0, Math.sin(a)], X = cross(up, f), P0 = [f[0] * RW, YW, f[2] * RW];
    const wpx = el.offsetWidth || (MOB ? 340 : 960), s = (MOB ? 9.4 : 17.5) / wpx;
    W3.items.push({ el, kind: 'w', k, pos: P0, tf: cssObj(X, up, f, P0, s) });
  });
  const tiles = MOB ? [] : [...document.querySelectorAll('.w3t')];
  if (tiles.length) {
    const B = camBasis(FREE.e, FREE.c), base = add(FREE.e, mul(B.z, MOB ? -24 : -30));
    const cols = MOB ? 1 : 3, rows = Math.ceil(tiles.length / cols);
    tiles.forEach((el, k) => {
      const wpx = el.offsetWidth || 300, hpx = el.offsetHeight || 170, s = (MOB ? 8.2 : 7.4) / wpx;
      const cx = (k % cols) - (cols - 1) / 2, cy = Math.floor(k / cols) - (rows - 1) / 2, ang = cx * (MOB ? 0.22 : 0.17);
      const X = nrm(add(mul(B.x, Math.cos(ang)), mul(B.z, Math.sin(ang)))), Z = cross(X, B.y);
      const pos = add(add(add(base, mul(B.x, cx * wpx * s * 1.07)), mul(B.y, -cy * hpx * s * 1.12 - (MOB ? 2.6 : 3.4))), mul(B.z, Math.abs(cx) * 1.3));
      W3.items.push({ el, kind: 't', k, pos, tf: cssObj(X, B.y, Z, pos, s) });
    });
  }
  W3.items.forEach(it => { it.el.style.transform = it.tf; });
  W3.ok = true;
}
function stIndex(id) { return ST.findIndex(x => x.id === id); }
function w3frame(P, hidden) {
  if (!W3.ok) return;
  const iwi = stIndex('wi'), iw = stIndex('w' + (NW - 1)), ifr = stIndex('free');
  const aW = hidden || iwi < 0 ? 0 : ss(clamp((S.sc - (iwi - 0.6)) / 0.6)) * ss(clamp(((iw + 0.62) - S.sc) / 0.5));
  const aT = hidden || ifr < 0 ? 0 : ss(clamp((S.sc - (ifr - 0.62)) / 0.5)) * ss(clamp(((ifr + 0.6) - S.sc) / 0.45));
  const on = aW > 0.003 || aT > 0.003;
  if (on !== W3.on) { W3.on = on; W3.layers.forEach(L => L.classList.toggle('on', on)); if (!on) W3.items.forEach(it => { it.a = 0; it.el.style.opacity = '0'; it.el.style.visibility = 'hidden'; it.el.style.pointerEvents = 'none'; }); }
  if (!on) return;
  const p = (S.ch / 2) / Math.tan(FOV / 2), ox = P.sx * S.cw / 2, oy = -P.sy * S.ch / 2, v = view;
  const cam = 'translate(' + ox.toFixed(2) + 'px,' + oy.toFixed(2) + 'px) translateZ(' + p.toFixed(3) + 'px) matrix3d(' + [v[0], -v[1], v[2], v[3], v[4], -v[5], v[6], v[7], v[8], -v[9], v[10], v[11], v[12], -v[13], v[14], v[15]].map(w3f).join(',') + ') translate(' + (S.cw / 2) + 'px,' + (S.ch / 2) + 'px)';
  W3.layers.forEach(L => { L.style.perspective = p.toFixed(3) + 'px'; L.style.perspectiveOrigin = (S.cw / 2 + ox).toFixed(1) + 'px ' + (S.ch / 2 + oy).toFixed(1) + 'px'; L.firstElementChild.style.transform = cam; });
  for (const it of W3.items) {
    const ez = v[2] * it.pos[0] + v[6] * it.pos[1] + v[10] * it.pos[2] + v[14];
    const a = (it.kind === 'w' ? aW : aT) * ss(clamp((-ez - 4) / 6));
    if (Math.abs(a - (it.a || 0)) > 0.004 || (a === 0) !== (it.a === 0)) { it.a = a; it.el.style.opacity = a.toFixed(3); it.el.style.visibility = a > 0.004 ? 'visible' : 'hidden'; it.el.style.pointerEvents = a > 0.6 ? 'auto' : 'none'; }
  }
}

// ---------- the cinema's own clock: fade in, lights down, curtains open, the film starts ----------
function cineUpdate(t) {
  const el = CI.cfg.el; if (!el) return { w: 0, g: 1 };
  const r = el.getBoundingClientRect(), H = innerHeight;
  const q = clamp(-r.top / Math.max(1, r.height - H)), pinned = r.top <= 1 && r.bottom >= H - 1;
  if (!CG && r.top < H * 2.5 && r.bottom > -H) cinePrep();
  if (!CG || !cineReady()) { let g = 1; if (pinned) g = 0; else if (r.top > 0 && r.top < H) g = ss(r.top / H); else if (r.bottom > 0 && r.bottom < H) g = ss(1 - r.bottom / H); return { w: 0, g: CI.failed ? g : 1 }; }
  let g = 1;
  if (pinned) g = 0; else if (r.top > 0 && r.top < H) g = ss(r.top / H); else if (r.bottom > 0 && r.bottom < H) g = ss(1 - r.bottom / H);
  const w = pinned ? ss(clamp(q / 0.03)) * ss(clamp((1 - q) / 0.05)) : 0;
  CI.q = q; CI.w = w;
  if (pinned && q > 0.025 && CI.state === 'pre') { CI.state = 'show'; CI.showT = t; }
  if (!pinned && CI.state === 'show') { CI.state = 'pre'; CI.started = false; if (CI.hold) { CI.hold = false; if (CI.cfg.onHold) CI.cfg.onHold(false); } }
  const k = CI.state === 'show' ? t - CI.showT : -1;
  if (k < 0) { CI.house = 1; CI.curtain = 0; CI.beam = 0; CI.gain = 0; }
  else if (RED) { CI.house = 0.07; CI.curtain = 1; CI.beam = 1; CI.gain = 1; }
  else { CI.house = 1 - 0.9 * ss(clamp(k / 2.6)); CI.curtain = ss(clamp((k - 0.8) / 3.4)); CI.beam = ss(clamp((k - 2.4) / 1.5)); CI.gain = ss(clamp((k - 2.6) / 1.6)); }
  const v = CI.video, want = k > (RED ? 0 : 2.6) && pinned && !CI.hold;
  if (want && v.paused) { if (!CI.started) { CI.started = true; try { v.currentTime = 0; } catch (e) { } } const pr = v.play(); if (pr && pr.catch) pr.catch(() => { }); }
  if (!want && !v.paused) v.pause();
  if (w > 0) {
    const src = CI.cfg.poster;
    if (src && CI.posterSrc !== src) { CI.posterSrc = src; CI.poster = new Image(); CI.poster.onload = () => { if (CI.video.paused) CI.needPoster = true; }; CI.poster.src = src; }
    if (v.readyState >= 2 && !v.paused && (CI.frameNew || (!v.requestVideoFrameCallback && t - CI.lastUp > 0.033))) { cineUpload(v); CI.frameNew = false; CI.lastUp = t; }
    else if (CI.needPoster && CI.poster && CI.poster.naturalWidth) { cineUpload(CI.poster); CI.needPoster = false; }
  }
  if (CI.cfg.onState) CI.cfg.onState(w, CI.house, CI.curtain, CI.gain);
  return { w, g };
}
function poseCinema() {
  const q = CI.q, z = lerp(MOB ? 25.0 : 23.6, MOB ? 22.4 : 17.8, ss(clamp((q - 0.04) / 0.86)));
  const row = clamp((z - 9) / 1.05, 0, 15), eyeY = 0.35 + row * 0.18 + 1.2;
  const e = [0.05 + S.px * (MOB ? 0 : 0.35), eyeY - S.py * (MOB ? 0 : 0.1), z], c = [0, CI.YB + CI.SH * (MOB ? 0.42 : 0.56), 0];
  return Object.assign({}, BASE, { e, c, sx: 0, sy: MOB ? -0.1 : -0.02, fov: MOB ? 1.42 : 0.82, cexpo: 2.2, bloom: 0.12, vig: 0.55, gA: 0, pA: 0, dA: 0 });
}
function cineScreenTop() {
  const c = xform(vp, [0, CI.YT, CI.ZS]); return c[3] > 0 ? (0.5 - c[1] / c[3] * 0.5) * S.ch : 0;
}

// ---------- frame ----------
let QS = 1;
function resize() {
  const cw = cv.clientWidth || innerWidth, ch = cv.clientHeight || innerHeight;
  const sc = Math.min(window.devicePixelRatio || 1, MOB ? 1.5 : 1.6) * QS;
  const w = Math.max(1, Math.round(cw * sc)), h = Math.max(1, Math.round(ch * sc));
  if (w !== cv.width || h !== cv.height) { cv.width = w; cv.height = h; }
  S.cw = cw; S.ch = ch; S.w = w; S.h = h; R.scale = sc; resizeTargets(w, h);
  fpx = h / (2 * Math.tan(FOV / 2));
  measure();
}
// the resolution follows the device: if frames take too long, draw fewer pixels; if there is room, draw more
const PACE = { t: 0, n: 0, slow: 0, fast: 0, ups: 0, warm: 2.5 };
function pace(dt) {
  if (PACE.warm > 0) { PACE.warm -= dt; return; }
  PACE.t += dt; PACE.n++;
  if (PACE.t < 0.75) return;
  const avg = PACE.t / PACE.n; PACE.t = 0; PACE.n = 0;
  if (avg > 1 / 42) { PACE.slow++; PACE.fast = 0; } else if (avg < 1 / 57) { PACE.fast++; PACE.slow = 0; } else { PACE.slow = 0; PACE.fast = 0; }
  if (PACE.slow >= 2 && QS > 0.5) { QS = Math.max(0.5, QS * 0.8); PACE.slow = 0; PACE.warm = 1; resize(); }
  else if (PACE.fast >= 6 && QS < 1 && PACE.ups < 3) { QS = Math.min(1, QS / 0.85); PACE.fast = 0; PACE.ups++; PACE.warm = 1; resize(); }
}
// a critically damped follow: no overshoot, no jumps
function spring(x, v, target, w, dt) {
  const d = x - target, e = Math.exp(-w * dt);
  return [target + (d + (v + w * d) * dt) * e, (v - w * (v + w * d) * dt) * e];
}
// the first frames only wait: shaders finish compiling in the background, then the galaxy map is painted band by band
function bootStep() {
  if (BOOT === 0) {
    try {
      if (PSC && performance.now() - BOOTP.t0 < 15000) { if (!BOOTP.every(done)) return false; BOOTP.forEach(fin); }
      else if (BK < BOOTP.length) { fin(BOOTP[BK++]); return false; }
      else BOOTP.forEach(fin);
    } catch (e) { fail(e); return false; }
    BOOT = 1;
  }
  if (BOOT === 1) { if (!bakeMap()) return false; if (S.land && !landBaked()) return false; BOOT = 2; }
  return true;
}
function fail(e) {
  S.dead = true; S.running = false; cv.remove();
  const de = document.documentElement; de.classList.remove('gl'); de.classList.add('no-gl');
  Y.engine = null; if (Y.onFail) Y.onFail(e);
}
// going into a craft: the camera dives at its planet (then the page changes); arriving on a craft page it pulls back out from just above the surface
function landing(P) {
  const now = performance.now();
  if (S.dive) {
    const D = S.dive, k = clamp((now - D.t0) / 1300), e = k * k * (3 - 2 * k), p = PL[D.i], w = planetPos(p);
    if (!D.e0) {
      D.e0 = P.e.slice(); D.c0 = P.c.slice(); D.sx = P.sx; D.sy = P.sy; D.up = (P.up || [0, 1, 0]).slice();
      if (P.landed) { const o = PL[S.land.i]; D.m = add(D.e0, mul(nrm(sub(D.e0, planetPos(o))), o.rad * 4)); }   // off the planet first, then across
    }
    const near = add(w, mul(nrm(sub(D.m || D.e0, w)), p.rad * 1.06)), s2 = e * e;
    P.e = D.m ? add(add(mul(D.e0, (1 - s2) * (1 - s2)), mul(D.m, 2 * (1 - s2) * s2)), mul(near, s2 * s2)) : mix(D.e0, near, s2);
    P.c = mix(D.c0, w, Math.min(1, e * 1.6)); P.sx = D.sx * (1 - e); P.sy = D.sy * (1 - e); P.up = nrm(mix(D.up, [0, 1, 0], Math.min(1, e * 1.6)));
    if (Y.onDive) Y.onDive(k, D.i);
    if (k >= 1 && !D.fired) { D.fired = true; D.done(); }
  } else if (S.arrive) {
    const A = S.arrive, k = clamp((now - A.t0) / 1500), e = 1 - Math.pow(1 - k, 3), p = PL[A.i], w = planetPos(p);
    const from = add(w, mul(nrm(sub(P.e, w)), p.rad * 1.06));
    P.e = mix(from, P.e, e); P.c = mix(w, P.c, e); P.sx *= e; P.sy *= e;
    if (k >= 1) S.arrive = null;
  }
}
function frame(now) {
  if (!S.running || S.dead || S.paused) return;
  requestAnimationFrame(frame);
  if (BOOT < 2) { if (!bootStep()) return; cv.classList.add('on'); S.time = 0; if (S.open < 1 && performance.now() > 1600) S.late = true; if (Y.arrive != null && !RED && PL[Y.arrive]) { S.sc = scrollS(); S.sv = 0; S.arrive = { i: Y.arrive, t0: performance.now() }; } if (S.land) S.land.tr = now / 1000; if (Y.onReady) Y.onReady(); }
  const t = now / 1000, raw = t - (S.time || t - 0.016), dt = Math.min(0.1, Math.max(0.001, raw)); S.time = t; S.frame++;
  if (loNext < PL.length) bakeLo(); else bakeStep();
  scrollTick(dt);
  pace(dt);
  if (!RED && !S.land) S.rot += dt * 0.004;   // on a planet's page the galaxy holds still: only the walk moves the camera
  // the opening plays only when the 3D was ready quickly and runs smoothly; otherwise the words show at once (asked for again from the menu, it waits and plays)
  if (S.open < 1 && scrollY > 10) { S.open = 1; Y.onOpening && Y.onOpening(1); }
  if (S.open < 1 && !Y.forceOpening && (S.late || (raw > 0.09 && ++S.slow > 2))) { S.open = 1; Y.onOpening && Y.onOpening(1, true); }
  if (S.open < 1) { if (!S.openT0) S.openT0 = t; S.open = clamp((t - S.openT0) / 3.2); Y.onOpening && Y.onOpening(S.open); }
  if (!S.drag && Math.abs(S.vaz) > 1e-5) { S.az += S.vaz; S.vaz *= 0.94; }
  const target = scrollS();
  if (RED) { S.sc = target; S.sv = 0; } else [S.sc, S.sv] = spring(S.sc, S.sv, target, 4.2, dt);
  if (!RED && S.open >= 1 && S.sc < 0.5 && !S.drag) S.az += dt * 0.018;
  S.px += (S.tpx - S.px) * (1 - Math.exp(-dt * 3)); S.py += (S.tpy - S.py) * (1 - Math.exp(-dt * 3));
  const cin = CI ? cineUpdate(t) : { w: 0, g: 1 };
  const inHall = cin.w > 0.0005 && cin.g < 0.001;
  if (S.land) { if (RED) { S.walk.x = S.walk.t; S.walk.v = 0; } else [S.walk.x, S.walk.v] = spring(S.walk.x, S.walk.v, S.walk.t, 4.6, dt); }
  let P = inHall ? poseCinema() : S.land ? landPose() : poseAtS(S.sc);
  if (!inHall) {
    if (S.open < 1) { const k = eio(clamp((S.open - 0.3) / 0.6)); P.e = mix([0, 0, 30], P.e, k); P.c = mix([0, 0, 0], P.c, k); P.sy *= k; }
    if (!RED && !MOB) { const B = camBasis(P.e, P.c), k = len(sub(P.e, P.c)) * 0.035; P.e = add(P.e, add(mul(B.x, S.px * k), mul(B.y, -S.py * k * 0.6))); }
    landing(P);
    P.expo *= cin.g;
  } else P.expo = cin.w;
  const fov = P.fov || FOV;
  lookAt(view, P.e, P.c, P.up || [0, 1, 0]); persp(proj, fov, S.w / S.h, inHall ? 0.12 : (S.dive || S.arrive || S.land) ? 0.04 : 0.3, inHall ? 200 : 4000, P.sx, P.sy); mmul(vp, proj, view);
  camR = [view[0], view[4], view[8]]; camU = [view[1], view[5], view[9]]; camF = [-view[2], -view[6], -view[10]]; camE = P.e;
  gl.bindFramebuffer(gl.FRAMEBUFFER, R.scene.f); gl.viewport(0, 0, R.w, R.h);
  gl.clearColor(0, 0, 0, 1); gl.depthMask(true); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  if (inHall) {
    P.fov = fov; drawCinema(P, t);
    if (CI.cfg.onScreenTop) CI.cfg.onScreenTop(cineScreenTop());
    SCR.fill(null);
  } else if (P.expo > 0.002) {
    PL.forEach(p => { const tg = p.i === S.hover ? 1 : 0; p.hi += (tg - p.hi) * (1 - Math.exp(-dt * 8)); });
    const o = S.open, reveal = o < 1 ? eio(clamp((o - 0.28) / 0.62)) : 1;
    P.pA *= o < 1 ? clamp((o - 0.55) / 0.35) : 1;
    gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
    drawGalaxyBack(P, reveal, t);
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (P.pA > 0.01) drawPlanets(P, t, 0);
    gl.depthMask(false);
    drawGalaxyFront(P, reveal, t);
    drawD(P, o, t);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    if (P.pA > 0.01) drawPlanets(P, t, 1); else SCR.fill(null);
    gl.disable(gl.DEPTH_TEST);
  } else SCR.fill(null);
  post(P);
  w3frame(P, inHall || P.expo < 0.05);
  l3frame(P, inHall || P.expo < 0.05);
  if (Y.onFrame) Y.onFrame(SCR, P, S.sc);
}

// ---------- scrolling: a wheel turn glides; jumps ease in and out ----------
const SM = { on: !RED && !MOB && matchMedia('(pointer: fine)').matches, y: 0, tg: 0, set: -1, anim: null };
function maxY() { return Math.max(0, document.documentElement.scrollHeight - innerHeight); }
function scrollTick(dt) {
  if (SM.anim) {
    const a = SM.anim, k = clamp((performance.now() - a.t0) / a.dur), y = lerp(a.y0, a.y1, eio(k));
    SM.y = SM.tg = y; SM.set = Math.round(y); scrollTo(0, y); if (k >= 1) { SM.anim = null; a.done && a.done(); }
    return;
  }
  if (!SM.on) return;
  if (Math.abs(SM.tg - SM.y) > 0.4) {
    SM.y += (SM.tg - SM.y) * (1 - Math.exp(-dt * 7.5));
    if (Math.abs(SM.tg - SM.y) < 0.4) SM.y = SM.tg;
    SM.set = Math.round(SM.y); scrollTo(0, SM.y);
  }
}
if (SM.on) {
  SM.y = SM.tg = scrollY;
  addEventListener('wheel', e => {
    if (e.ctrlKey || e.defaultPrevented || BOOT < 2 || S.dead || S.paused) return;
    const el = e.target.closest && e.target.closest('.menu,[data-scroll]'); if (el) return;
    e.preventDefault(); SM.anim = null;
    const k = e.deltaMode === 1 ? 36 : e.deltaMode === 2 ? innerHeight : 1;
    SM.tg = clamp(SM.tg + e.deltaY * k, 0, maxY());
  }, { passive: false });
}
addEventListener('scroll', () => { if (Math.abs(scrollY - SM.set) > 2 && !SM.anim) { SM.y = SM.tg = scrollY; } }, { passive: true });
function flyTo(y, done) {
  y = clamp(y, 0, maxY());
  const d = Math.abs(y - scrollY);
  if (d < 2) { done && done(); return; }
  if (RED || BOOT < 2 || S.dead || S.paused) { scrollTo(0, y); done && done(); return; }
  SM.anim = { y0: scrollY, y1: y, t0: performance.now(), dur: clamp(700 + d / innerHeight * 140, 900, 2600), done };
}

// ---------- pointer: drag the galaxy, pick a planet ----------
function pick(x, y) {
  let best = -1, bd = 1e9;
  SCR.forEach((s, i) => { if (!s) return; const d = Math.hypot(s[0] - x, s[1] - y), lim = Math.max(s[2] * 1.3, MOB ? 26 : 18); if (d < lim && d < bd) { bd = d; best = i; } });
  return best;
}
cv.style.touchAction = 'pan-y';
addEventListener('pointerdown', e => {
  if (e.target !== cv && !(e.target.closest && e.target.closest('.yh-drag'))) return;
  if (e.target.closest && e.target.closest('a,button,input,select,textarea,.card,.yh-nodrag,.w3p,.w3t')) return;
  S.drag = { x: e.clientX, y: e.clientY, az: S.az, el: S.el, moved: 0 };
});
addEventListener('pointermove', e => {
  S.tpx = (e.clientX / innerWidth - 0.5) * 2; S.tpy = (e.clientY / innerHeight - 0.5) * 2;
  if (S.drag) {
    const dx = e.clientX - S.drag.x, dy = e.clientY - S.drag.y; S.drag.moved = Math.max(S.drag.moved, Math.hypot(dx, dy));
    if (S.sc < 0.5 && S.drag.moved > 6) { S.az = S.drag.az - dx * 0.005; if (e.pointerType !== 'touch') S.el = clamp(S.drag.el + dy * 0.0025, -0.3, 0.42); S.vaz = -(e.movementX || 0) * 0.005; }
    return;
  }
  if (e.pointerType === 'mouse') { const i = pick(e.clientX, e.clientY); if (i !== S.hover) { S.hover = i; Y.onHover && Y.onHover(i, i >= 0 ? SCR[i] : null); cv.style.cursor = i >= 0 ? 'pointer' : ''; } }
});
addEventListener('pointerup', e => {
  const d = S.drag; S.drag = null; if (!d) return;
  if (d.moved > 6) { if (S.sc < 0.5) Y.onDragged && Y.onDragged(); return; }
  const i = pick(e.clientX, e.clientY);
  if (i >= 0) { Y.onPick && Y.onPick(i); sfx(i); }
});

// ---------- sound: off until the visitor turns it on ----------
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

// ---------- public ----------
Y.engine = {
  skip(auto) { S.open = 1; Y.onOpening && Y.onOpening(1, !!auto); },
  hold(b) { if (CI) CI.hold = !!b; },
  descend() { if (S.land && !RED) S.land.t0 = performance.now(); },
  walk(t) { if (S.land) S.walk.t = clamp(+t || 0, 0, WK.length - 1); },
  get walkX() { return S.walk ? S.walk.x : 0; },
  relayout() { measure(); L3.dirty = true; },
  dive(i, done) { if (RED || BOOT < 2 || S.dead || S.paused || !PL[i]) { done(); return; } S.arrive = null; S.dive = { i, t0: performance.now(), done }; },
  // back from a page we dived out to (the browser kept this one as it was): come back out of that planet
  back() { if (!S.dive) return; const i = S.dive.i; S.dive = null; if (!RED) S.arrive = { i, t0: performance.now() }; },
  pause(b) { b = !!b; if (b === !!S.paused) return; S.paused = b; if (!b && S.running && !S.dead) { S.time = 0; requestAnimationFrame(frame); } },
  get ready() { return BOOT >= 2; },
  sound, sfx, measure, flyTo,
  stop(id) { const s = ST.find(x => x.id === id); return s ? s.y - innerHeight / 2 : null; },
  planet(i) { return SCR[i]; }
};
new ResizeObserver(resize).observe(cv);
addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => { if (S.dead) return; S.running = !document.hidden; if (S.running && !S.paused) { S.time = 0; requestAnimationFrame(frame); } });
if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
S.ready = true;
resize();
BOOTP = PROGS.slice(); BOOTP.t0 = performance.now();
requestAnimationFrame(frame);
})();
