/* Dinamics · festival ornaments. This file is fetched only when a festival is near (or ?holiday=<id>).
   For every style it draws: a garland along the top of the first screen, ornaments hanging in the gap of the header,
   a few things drifting across, and sometimes a hat for the logo. Colours are picked per style, so nothing vanishes into
   the background or clashes with the style's own accent. */
(() => {
const rgb = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const v = parseInt(h.slice(0, 6), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255] };
const dist = (a, b) => { const r = (a[0] + b[0]) / 2, d0 = a[0] - b[0], d1 = a[1] - b[1], d2 = a[2] - b[2]; return Math.sqrt((2 + r / 256) * d0 * d0 + 4 * d1 * d1 + (2 + (255 - r) / 256) * d2 * d2) };
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]) };
/* the colours of a festival that stand out on this style: far from the background, not the style's own accent */
function pick(cands, k, ctx) {
  const bg = rgb(ctx.bg), co = rgb(ctx.co);
  return cands.map((c, i) => { const v = rgb(c); return { c, s: Math.min(dist(v, bg), 420) + Math.min(dist(v, co), 260) * .55 - i * 6 } })
    .sort((a, b) => b.s - a.s).slice(0, k).map(x => x.c);
}
const R = (a, b) => a + Math.random() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const svg = (w, h, inner, cls = '', style = '') => `<svg class="${cls}" style="${style}" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${inner}</svg>`;

/* ---------------- the pieces ---------------- */
const P = {
  bulb: c => `<g><circle cx="0" cy="12" r="19" fill="${c}" opacity=".1"/><circle cx="0" cy="12" r="12.5" fill="${c}" opacity=".2"/><rect x="-3.5" y="-2" width="7" height="6" rx="1.5" fill="#6B6B6B"/><path d="M0,3c5,0 6,6 5,11c-1,4 -3,6 -5,6s-4,-2 -5,-6c-1,-5 0,-11 5,-11z" fill="${c}"/><ellipse cx="-1.6" cy="9" rx="1.4" ry="3" fill="#fff" opacity=".55"/></g>`,
  bauble: (c, s = 1) => `<g transform="scale(${s})"><rect x="-5" y="-4" width="10" height="7" rx="2" fill="#C9A44C"/><circle cx="0" cy="17" r="15" fill="${c}"/><path d="M-13,12c8,4 18,4 26,0" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none"/><ellipse cx="-5" cy="10" rx="4" ry="6" fill="#fff" opacity=".45"/></g>`,
  star: (c, s = 1) => `<path transform="scale(${s})" d="M0,-14L4,-4L15,-4L6,3L9,14L0,7L-9,14L-6,3L-15,-4L-4,-4Z" fill="${c}"/>`,
  lantern: (c, gold, ch, s = 1) => `<g transform="scale(${s})"><rect x="-10" y="-6" width="20" height="7" rx="2" fill="${gold}"/><ellipse cx="0" cy="26" rx="27" ry="24" fill="${c}"/>
    <path d="M-14,4c-6,14 -6,30 0,44M14,4c6,14 6,30 0,44M0,2v48" stroke="${gold}" stroke-opacity=".55" stroke-width="1.6" fill="none"/>
    <rect x="-12" y="48" width="24" height="6" rx="2" fill="${gold}"/><path d="M-6,54l-2,22M0,54v24M6,54l2,22" stroke="${gold}" stroke-width="2.4"/>
    <text x="0" y="34" text-anchor="middle" font-family="Noto Serif SC,STSong,SimSun,serif" font-weight="900" font-size="22" fill="${gold}">${ch}</text></g>`,
  heart: (c, s = 1) => `<path transform="scale(${s})" d="M0,6C-10,-6 -22,0 -18,12C-14,22 0,30 0,30C0,30 14,22 18,12C22,0 10,-6 0,6Z" fill="${c}"/>`,
  crescent: (c, s = 1) => `<g transform="scale(${s})"><path d="M8,-22A26,26 0 1 0 8,30A34,34 0 0 1 8,-22Z" fill="${c}"/>${P.star(c, .5).replace('scale(0.5)', 'translate(14,4) scale(.5)')}</g>`,
  ketupat: (c, c2, s = 1) => `<g transform="scale(${s})"><path d="M0,0L22,22L0,44L-22,22Z" fill="${c}"/><path d="M-11,11L11,33M0,0L-11,11M11,11L-11,33M-16.5,16.5L5.5,38.5M5.5,5.5L-16.5,27.5" stroke="${c2}" stroke-width="3"/><path d="M0,44l-4,16M0,44l4,14" stroke="${c}" stroke-width="2.6"/></g>`,
  egg: (c, c2, s = 1) => `<g transform="scale(${s})"><ellipse cx="0" cy="22" rx="16" ry="21" fill="${c}"/><path d="M-15,16l5,-5l5,5l5,-5l5,5l5,-5l5,5M-15,28l5,5l5,-5l5,5l5,-5l5,5l5,-5" stroke="${c2}" stroke-width="2.4" fill="none"/><ellipse cx="-5" cy="12" rx="3.5" ry="6" fill="#fff" opacity=".4"/></g>`,
  pumpkin: (c, s = 1) => `<g transform="scale(${s})"><rect x="-3" y="-4" width="6" height="9" rx="2" fill="#3E6B2E"/><ellipse cx="-11" cy="20" rx="12" ry="16" fill="${c}"/><ellipse cx="11" cy="20" rx="12" ry="16" fill="${c}"/><ellipse cx="0" cy="20" rx="12" ry="17" fill="${c}" stroke="#000" stroke-opacity=".12"/>
    <path d="M-10,14l5,-5l4,6ZM10,14l-5,-5l-4,6Z" fill="#2A1A08"/><path d="M-11,24q11,10 22,0l-4,4l-3,-3l-4,4l-4,-4l-3,3Z" fill="#2A1A08"/></g>`,
  diya: (c, flame, s = 1) => `<g transform="scale(${s})"><path d="M-20,8C-18,22 18,22 20,8Z" fill="${c}"/><path d="M-20,8h40" stroke="#5A2A08" stroke-width="2"/><path d="M-12,14l4,3l4,-3l4,3l4,-3l4,3l4,-3" stroke="#FFD166" stroke-width="1.6" fill="none"/>
    <g class="fx-fl"><path d="M0,8C-6,0 -2,-8 0,-16C2,-8 6,0 0,8Z" fill="${flame}"/><path d="M0,6C-3,1 -1,-4 0,-8C1,-4 3,1 0,6Z" fill="#FFF3B0"/></g></g>`,
  paperLantern: (c, gold, s = 1) => `<g transform="scale(${s})"><rect x="-7" y="-4" width="14" height="6" rx="2" fill="${gold}"/><ellipse cx="0" cy="22" rx="20" ry="22" fill="${c}"/><path d="M-10,2c-4,12 -4,28 0,40M10,2c4,12 4,28 0,40" stroke="#000" stroke-opacity=".15" stroke-width="1.4" fill="none"/><rect x="-7" y="42" width="14" height="5" rx="2" fill="${gold}"/><path d="M0,47v16" stroke="${gold}" stroke-width="2.4"/></g>`,
  flowerStrand: (c1, c2, c3, len) => { let s = ''; for (let y = 0; y < len; y += 9) s += `<circle cx="0" cy="${y}" r="5.2" fill="${c1}"/><circle cx="-1.5" cy="${y - 1.5}" r="1.6" fill="#fff" opacity=".7"/>`; return s + `<circle cx="0" cy="${len + 4}" r="9" fill="${c2}"/><path d="M-6,${len + 10}q6,10 12,0q-2,8 -6,16q-4,-8 -6,-16z" fill="${c3}"/>` },
  bat: c => `<path d="M0,0C-6,-8 -14,-8 -22,-2C-16,-2 -14,2 -14,6C-10,2 -6,2 -4,6C-2,2 2,2 4,6C6,2 10,2 14,6C14,2 16,-2 22,-2C14,-8 6,-8 0,0Z" fill="${c}"/>`,
};

/* a draped string along the top edge, with things hung all along it */
function garland(W, each, every, ctx, itemY = 0) {
  const sag = ctx.mob ? 8 : 6, n = Math.max(4, Math.round(W / every)), k = ctx.mob ? .9 : 1; let path = '', items = '';
  const y = x => 4 + sag * 4 * (x / W) * (1 - x / W) * .9 + Math.sin(x / W * 5 * Math.PI) * 2.5;
  for (let x = 0; x <= W; x += W / 80) path += (x ? 'L' : 'M') + x.toFixed(1) + ',' + y(x).toFixed(1);
  for (let i = 0; i < n; i++) { const x = (i + .5) * W / n; items += `<g transform="translate(${x.toFixed(1)},${(y(x) + itemY * k).toFixed(1)}) scale(${k})" class="fx-tw" style="animation-delay:-${(i * .37 % 2.4).toFixed(2)}s">${each(i)}</g>` }
  return svg(W, 64, `<path d="${path}" fill="none" stroke="${ctx.line}" stroke-width="2"/>${items}`, 'fx-garland', 'position:absolute;left:0;top:0;overflow:visible');
}
/* one piece on a string from the top edge, swinging a little; a piece is [svg, width, height], hung from its top middle */
function hanger(x, len, piece, S, d) {
  const [inner, w, h] = piece, pw = Math.ceil(w * S + 6), ph = Math.ceil(h * S + 6);
  return `<div class="fx-hang" style="left:${Math.round(x - pw / 2)}px;width:${pw}px;animation-delay:-${d}s"><div class="fx-str" style="height:${len}px"></div>${svg(pw, ph, `<g transform="translate(${pw / 2},2) scale(${S})">${inner}</g>`, '', 'display:block;overflow:visible;margin-top:-2px')}</div>`;
}
/* a long string down the right edge with several pieces on it */
function chain(x, pieces, S, gap, d, line, top0 = 0) {
  let y = top0, mw = 0; const parts = [];
  for (const [inner, w, h] of pieces) { y += gap; parts.push(`<g transform="translate(0,${y.toFixed(1)}) scale(${S})">${inner}</g>`); y += h * S; mw = Math.max(mw, w * S) }
  const pw = Math.ceil(mw + 8), ph = Math.ceil(y + 8);
  return `<div class="fx-hang fx-chain" style="left:${Math.round(x - pw / 2)}px;width:${pw}px;animation-delay:-${d}s">${svg(pw, ph, `<line x1="${pw / 2}" y1="0" x2="${pw / 2}" y2="${(y - 6).toFixed(1)}" stroke="${line}" stroke-width="1.5"/><g transform="translate(${pw / 2},0)">${parts.join('')}</g>`, '', 'display:block;overflow:visible')}</div>`;
}
/* the pieces, each hung from its top middle: [svg, width, height] */
const Q = {
  bauble: c => [P.bauble(c), 30, 36],
  star: c => [`<g transform="translate(0,14)">${P.star(c)}</g>`, 30, 28],
  heart: c => [`<g transform="translate(0,4)">${P.heart(c)}</g>`, 40, 34],
  lantern: (c, g, ch) => [`<g transform="translate(0,6)">${P.lantern(c, g, ch)}</g>`, 56, 84],
  crescent: c => [`<g transform="translate(-8,23)">${P.crescent(c)}</g>`, 56, 54],
  ketupat: (c, c2) => [P.ketupat(c, c2), 44, 60],
  egg: (c, c2) => [P.egg(c, c2), 32, 44],
  pumpkin: c => [`<g transform="translate(0,4)">${P.pumpkin(c)}</g>`, 48, 41],
  diya: (c, f) => [`<g transform="translate(0,18)">${P.diya(c, f)}</g>`, 42, 40],
  paper: (c, g) => [`<g transform="translate(0,4)">${P.paperLantern(c, g)}</g>`, 40, 67],
  strand: (a, b, c, len) => [P.flowerStrand(a, b, c, len), 22, len + 28],
  bat: c => [`<g transform="translate(0,9)">${P.bat(c)}</g>`, 46, 16],
  spider: c => [`<path d="M0,0V6" stroke="${c}" stroke-width="1.4"/><g transform="translate(0,6)"><circle cx="0" cy="12" r="8" fill="${c}"/><circle cx="0" cy="3" r="5" fill="${c}"/><path d="M-8,8l-9,-5M-8,12h-10M-8,16l-9,5M8,8l9,-5M8,12h10M8,16l9,5" stroke="${c}" stroke-width="2.2" stroke-linecap="round"/><circle cx="-2" cy="2" r="1.3" fill="#fff"/><circle cx="2" cy="2" r="1.3" fill="#fff"/></g>`, 40, 28],
  gift: (c, r) => [`<rect x="-15" y="8" width="30" height="24" rx="3" fill="${c}"/><rect x="-17" y="3" width="34" height="8" rx="2" fill="${c}"/><rect x="-3" y="3" width="6" height="29" fill="${r}"/><path d="M0,4C-6,-6 -14,-2 -8,3M0,4C6,-6 14,-2 8,3" stroke="${r}" stroke-width="3" fill="none" stroke-linecap="round"/>`, 36, 34],
  cane: () => [`<path d="M4,40V12A8,8 0 0 0 -12,12" fill="none" stroke="#FFFFFF" stroke-width="7" stroke-linecap="round"/><path d="M4,40V12A8,8 0 0 0 -12,12" fill="none" stroke="#E63946" stroke-width="7" stroke-dasharray="5 5"/>`, 30, 46],
  year: (c, y) => [`<text x="0" y="34" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="800" font-size="34" fill="${c}">${y}</text>`, 92, 40],
  crackers: (c, g, n) => {   /* a string of firecrackers, in pairs */
    let s = `<path d="M0,0V${n * 13 + 8}" stroke="${g}" stroke-width="1.6"/>`;
    for (let i = 0; i < n; i++) { const y = 8 + i * 13; s += `<g transform="translate(0,${y}) rotate(-58)"><rect x="2" y="-4" width="22" height="8" rx="2" fill="${c}"/><rect x="2" y="-4" width="3" height="8" fill="${g}"/><rect x="21" y="-4" width="3" height="8" fill="${g}"/></g><g transform="translate(0,${y + 6}) rotate(58)"><rect x="-24" y="-4" width="22" height="8" rx="2" fill="${c}"/><rect x="-24" y="-4" width="3" height="8" fill="${g}"/><rect x="-5" y="-4" width="3" height="8" fill="${g}"/></g>` }
    return [s + `<circle cx="0" cy="${n * 13 + 12}" r="5" fill="${g}"/>`, 46, n * 13 + 18];
  },
};
/* the light around a festival: big soft glows, bokeh drifting up, and (for some) fireworks or a moon */
function ambience(cols, ctx, opt = {}) {
  const { W, H, mob } = ctx, a = ctx.light ? .16 : .3, spots = opt.fog ? [[.1, .95, .7], [.9, .98, .7], [.5, 1.05, .8]] : [[.14, .12, .6], [.86, .16, .55], [.5, 1.04, .75]];
  let s = '', g = '';
  spots.forEach(([x, y, r], i) => { const D = Math.max(W, H) * r * (mob ? 1.2 : 1); g += `<i class="fx-glow" style="left:${(x * W - D / 2).toFixed(0)}px;top:${(y * H - D / 2).toFixed(0)}px;width:${D.toFixed(0)}px;height:${D.toFixed(0)}px;background:radial-gradient(closest-side,${cols[i % cols.length]},transparent);opacity:${a};animation-delay:-${(i * 2.3).toFixed(1)}s"></i>` });
  const n = mob ? 8 : 15;
  for (let i = 0; i < n; i++) {
    const d = R(mob ? 28 : 44, mob ? 84 : 150), x = R(0, W), y = R(H * .06, H * .92), c = cols[i % cols.length];
    s += `<i class="fx-bok" style="left:${(x - d / 2).toFixed(0)}px;top:${(y - d / 2).toFixed(0)}px;width:${d.toFixed(0)}px;height:${d.toFixed(0)}px;background:radial-gradient(circle,${c} 0,${c}66 36%,transparent 70%);--o:${((ctx.light ? .2 : .38) * R(.55, 1)).toFixed(2)};--dy:${(-R(30, 90)).toFixed(0)}px;animation-duration:${R(8, 14).toFixed(1)}s;animation-delay:-${R(0, 14).toFixed(1)}s"></i>`;
  }
  ctx.back.push(g);
  return s;
}
function fireworks(cols, ctx, count) {
  const { W, H, mob } = ctx; let s = '';
  for (let i = 0; i < count; i++) {
    const x = R(W * .1, W * .9), y = R(H * .1, H * .48), r = R(56, 100) * (mob ? .65 : 1), c = cols[i % cols.length], c2 = cols[(i + 1) % cols.length], k = 16, b = r * 1.25;
    let rays = '';
    for (let j = 0; j < k; j++) { const t = j / k * Math.PI * 2, cs = Math.cos(t), sn = Math.sin(t); rays += `<line x1="${(cs * r * .3).toFixed(1)}" y1="${(sn * r * .3).toFixed(1)}" x2="${(cs * r).toFixed(1)}" y2="${(sn * r).toFixed(1)}" stroke="${j % 2 ? c : c2}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${(cs * r * 1.1).toFixed(1)}" cy="${(sn * r * 1.1).toFixed(1)}" r="2.6" fill="${j % 2 ? c2 : c}"/>` }
    s += `<svg class="fx-fw" style="left:${(x - b).toFixed(0)}px;top:${(y - b).toFixed(0)}px;animation-delay:-${R(0, 6).toFixed(1)}s;animation-duration:${R(4.6, 6.8).toFixed(1)}s" viewBox="${-b} ${-b} ${b * 2} ${b * 2}" width="${(b * 2).toFixed(0)}" height="${(b * 2).toFixed(0)}" aria-hidden="true">${rays}<circle r="${(r * .12).toFixed(1)}" fill="#FFFFFF" opacity=".8"/></svg>`;
  }
  return s;
}
function moon(ctx) {
  const { W, mob } = ctx, r = mob ? 36 : 70, x = mob ? W * .78 : (ctx.gx0 + ctx.gx1) / 2, y = mob ? 112 : 168;
  ctx.back.push(`<i class="fx-moon${ctx.light ? ' lt' : ''}" style="left:${(x - r * 2.2).toFixed(0)}px;top:${(y - r * 2.2).toFixed(0)}px;width:${(r * 4.4).toFixed(0)}px;height:${(r * 4.4).toFixed(0)}px;--r:${r}px"></i>`);
  return '';
}
/* things drifting across the first screen */
function drift(kind, count, html, W, H) {
  let s = '';
  for (let i = 0; i < count; i++) {
    const x = R(0, W), dur = R(kind === 'up' ? 9 : 7, kind === 'up' ? 16 : 14), del = -R(0, dur), sz = R(.6, 1.2), sway = R(-40, 40);
    s += `<span class="fx-p fx-${kind}" style="left:${x.toFixed(0)}px;--d:${dur.toFixed(1)}s;--s:${sz.toFixed(2)};--w:${sway.toFixed(0)}px;--H:${H}px;animation-delay:${del.toFixed(1)}s">${html(i)}</span>`;
  }
  return s;
}
const HAT = {
  xmas: `<svg viewBox="0 0 40 36" width="38" height="34"><path d="M4,28C8,14 18,4 30,6C34,10 34,16 32,20L36,30Z" fill="#E63946"/><rect x="0" y="25" width="38" height="9" rx="4.5" fill="#fff"/><circle cx="34" cy="8" r="5" fill="#fff"/></svg>`,
  halloween: `<svg viewBox="0 0 40 36" width="38" height="34"><path d="M12,26L22,2L28,26Z" fill="#2A1A3A"/><ellipse cx="20" cy="27" rx="19" ry="5" fill="#2A1A3A"/><rect x="12" y="20" width="16" height="4" fill="#FF7518"/></svg>`,
};

/* ---------------- each festival ---------------- */
function build(id, ctx) {
  const { W, H, mob } = ctx, out = { amb: '', top: '', hang: '', drift: '', hat: HAT[id] || '' };
  /* the hanging pieces: on a computer in the gap between the logo and the menu, with a long chain down the right edge;
     on a phone, two on the right under the header */
  const n = clamp(Math.floor((ctx.gx1 - ctx.gx0) / 96), 2, 5), xs = Array.from({ length: n }, (_, i) => ctx.gx0 + (i + .5) * (ctx.gx1 - ctx.gx0) / n);
  const lens = [52, 100, 70, 126, 60], S = 1.9;
  const many = (f, k = 1) => mob ? '' : xs.map((x, i) => hanger(x, lens[i], f(i), S * k, i * .7)).join('');
  /* the chain starts below the header; on a phone it is slimmer and runs down the right margin beside the headline */
  const side = (pieces, k = 1.5, gap = 14) => mob ? chain(W - 17, pieces, k * .55, gap * .6, 1.3, ctx.line, 62) : chain(W - 34, pieces, k, gap, 1.3, ctx.line, 74);
  switch (id) {
    case 'xmas': {
      const c = pick(['#E63946', '#2BA84A', '#FFC93C', '#3A86FF', '#FFFFFF', '#B5179E'], 4, ctx);
      out.amb = ambience(pick(['#E63946', '#2BA84A', '#FFC93C', '#FFFFFF'], 3, ctx), ctx);
      out.top = garland(W, i => P.bulb(c[i % c.length]), mob ? 26 : 34, ctx, 2);
      out.hang = many(i => [Q.bauble(c[0]), Q.star(c[1]), Q.gift(c[2], c[0] === '#FFFFFF' ? '#E63946' : '#FFFFFF'), Q.bauble(c[3]), Q.star(c[0])][i % 5])
        + side([Q.star(c[1]), Q.bauble(c[0]), Q.cane(), Q.bauble(c[2]), Q.star(c[3])]);
      const snow = pick(['#FFFFFF', '#DDE8FF', '#9FB6D8', '#6E86A8'], 1, ctx)[0];
      out.drift = drift('down', mob ? 34 : 72, i => i % 4 ? `<i style="background:${snow}"></i>` : `<svg viewBox="-10 -10 20 20" width="18" height="18"><path d="M0,-9V9M-8,-4.5L8,4.5M-8,4.5L8,-4.5" stroke="${snow}" stroke-width="1.8" stroke-linecap="round"/></svg>`, W, H);
      break }
    case 'newyear': {
      const c = pick(['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#FFFFFF', '#9B5DE5'], 4, ctx);
      out.amb = ambience(c, ctx) + fireworks(c, ctx, mob ? 3 : 5);
      out.top = garland(W, i => P.star(c[i % c.length], .8), mob ? 26 : 32, ctx, 12);
      out.hang = many(i => i === 1 ? Q.year(c[0], ctx.fy) : Q.star(c[i % 4])) + side([Q.star(c[0]), Q.star(c[1]), Q.star(c[2]), Q.star(c[3]), Q.star(c[0])], 1.7);
      out.drift = drift('down', mob ? 40 : 84, i => `<b style="background:${c[i % c.length]}"></b>`, W, H);
      break }
    case 'cny': {
      const red = pick(['#D62828', '#E63946', '#F2C14E'], 1, ctx)[0], gold = red === '#F2C14E' ? '#B5172F' : '#F2C14E';
      const zod = '鼠牛虎兔龙蛇马羊猴鸡狗猪'[((ctx.fy - 2020) % 12 + 12) % 12], chs = ['福', zod, '春', '喜', '福'];
      out.amb = ambience([red, gold, '#FF6B35'], ctx) + fireworks([gold, red, '#FFFFFF'], ctx, mob ? 3 : 4);
      out.top = garland(W, i => `<path d="M0,0l-4,20h8Z" fill="${i % 2 ? gold : red}"/><circle cx="0" cy="25" r="5" fill="${i % 2 ? red : gold}"/>`, mob ? 24 : 30, ctx);
      out.hang = many(i => Q.lantern(red, gold, chs[i]), .92) + side([Q.lantern(red, gold, '福'), Q.crackers(red, gold, 12)], 1.35, 10);
      const pet = pick(['#FFB3C6', '#FF8FAB', '#FFFFFF', '#F2C14E'], 1, ctx)[0];
      out.drift = drift('down', mob ? 22 : 40, () => `<svg viewBox="-8 -8 16 16" width="17" height="17"><path d="M0,-7C4,-7 6,-2 0,0C6,2 4,7 0,7C-4,7 -6,2 0,0C-6,-2 -4,-7 0,-7Z" fill="${pet}"/></svg>`, W, H);
      break }
    case 'valentine': {
      const c = pick(['#FF4D6D', '#FF8FA3', '#C9184A', '#FFFFFF', '#FFB3C1'], 3, ctx);
      out.amb = ambience(c, ctx);
      out.top = garland(W, i => P.heart(c[i % c.length], .6), mob ? 24 : 30, ctx, 2);
      out.hang = many(i => Q.heart(c[i % c.length])) + side([Q.heart(c[0]), Q.heart(c[1]), Q.heart(c[2]), Q.heart(c[0])], 1.6);
      out.drift = drift('up', mob ? 20 : 36, i => `<svg viewBox="-20 -6 40 38" width="24" height="23">${P.heart(c[i % c.length])}</svg>`, W, H);
      break }
    case 'raya': {
      const c = pick(['#1B9E5A', '#F2C14E', '#FFFFFF', '#0B6E4F', '#E9C46A'], 2, ctx);
      out.amb = ambience([c[0], c[1]], ctx);
      out.top = garland(W, i => i % 2 ? P.star(c[1], .6) : `<circle cx="0" cy="6" r="5" fill="${c[0]}"/>`, mob ? 24 : 30, ctx, 2);
      out.hang = many(i => i % 2 ? Q.ketupat(c[0], c[1]) : Q.crescent(c[1]), .95) + side([Q.ketupat(c[0], c[1]), Q.star(c[1]), Q.ketupat(c[0], c[1]), Q.star(c[1])], 1.4);
      out.drift = drift('down', mob ? 18 : 34, () => `<svg viewBox="-10 -10 20 20" width="16" height="16">${P.star(c[1], .6)}</svg>`, W, H);
      break }
    case 'songkran': {
      const water = pick(['#4CC9F0', '#4895EF', '#90E0EF', '#FFFFFF'], 1, ctx)[0];
      out.amb = ambience([water, '#90E0EF', '#FFFFFF'], ctx);
      out.top = garland(W, () => `<circle cx="0" cy="5" r="6" fill="#FFFFFF" stroke="#E9E4D0"/>`, mob ? 18 : 22, ctx);
      out.hang = many(i => Q.strand('#FFFFFF', '#FFA62B', '#E63946', [70, 110, 84, 124, 76][i]), .8) + side([Q.strand('#FFFFFF', '#FFA62B', '#E63946', 220)], 1.2, 0);
      out.drift = drift('down', mob ? 28 : 56, () => `<svg viewBox="-6 -10 12 20" width="12" height="20"><path d="M0,-9C3,-3 6,1 6,4A6,6 0 0 1 -6,4C-6,1 -3,-3 0,-9Z" fill="${water}" opacity=".85"/></svg>`, W, H);
      break }
    case 'easter': {
      const c = pick(['#FFADAD', '#FFD6A5', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'], 4, ctx);
      out.amb = ambience(c, ctx);
      out.top = garland(W, i => P.egg(c[i % c.length], '#FFFFFF', .55), mob ? 24 : 30, ctx, 2);
      out.hang = many(i => Q.egg(c[i % 4], c[(i + 2) % 4]), 1.05) + side([Q.egg(c[0], c[2]), Q.egg(c[1], c[3]), Q.egg(c[2], c[0]), Q.egg(c[3], c[1])], 1.5);
      out.drift = drift('down', mob ? 18 : 30, i => `<svg viewBox="-8 -8 16 16" width="16" height="16"><circle r="6" fill="${c[i % c.length]}"/><circle r="2.4" fill="#FFF3B0"/></svg>`, W, H);
      break }
    case 'midautumn': {
      const c = pick(['#E63946', '#FB8500', '#FFB703', '#F72585'], 3, ctx), gold = '#F2C14E';
      out.amb = ambience(c, ctx) + moon(ctx);
      out.top = garland(W, i => `<ellipse cx="0" cy="11" rx="7" ry="8" fill="${c[i % c.length]}"/><path d="M0,19v6" stroke="${gold}" stroke-width="1.8"/>`, mob ? 24 : 30, ctx);
      out.hang = many(i => Q.paper(c[i % c.length], gold), .95) + side([Q.paper(c[0], gold), Q.paper(c[1], gold), Q.paper(c[2], gold)], 1.3);
      const os = pick(['#FFD166', '#F2C14E', '#FFFFFF'], 1, ctx)[0];
      out.drift = drift('down', mob ? 22 : 40, () => `<svg viewBox="-6 -6 12 12" width="12" height="12"><path d="M0,-5L1.5,-1.5L5,0L1.5,1.5L0,5L-1.5,1.5L-5,0L-1.5,-1.5Z" fill="${os}"/></svg>`, W, H);
      break }
    case 'halloween': {
      const c = pick(['#FF7518', '#9D4EDD', '#39FF14', '#111111', '#FFFFFF'], 2, ctx), dark = c[1] === '#FFFFFF' ? '#111' : c[1];
      out.amb = ambience([c[0], '#9D4EDD', '#FF7518'], ctx, { fog: true });
      out.top = garland(W, i => i % 2 ? P.pumpkin(c[0], .5) : `<path d="M-7,4l7,12l7,-12Z" fill="${c[1]}"/>`, mob ? 26 : 34, ctx, 2);
      const bat = pick(['#1A1020', '#2A1A3A', '#FFFFFF', '#9D4EDD'], 1, ctx)[0];
      out.hang = many(i => i % 2 ? Q.pumpkin(c[0]) : Q.spider(dark)) + side([Q.spider(dark), Q.pumpkin(c[0]), Q.bat(bat), Q.pumpkin(c[0])], 1.5);
      out.drift = drift('across', mob ? 8 : 14, () => `<svg class="fx-bat" viewBox="-24 -10 48 20" width="40" height="17">${P.bat(bat)}</svg>`, W, H);
      break }
    case 'diwali': {
      const c = pick(['#FB8500', '#FFB703', '#E63946', '#F72585'], 3, ctx), clay = pick(['#C1440E', '#E07A3F', '#8C3A1A'], 1, ctx)[0];
      out.amb = ambience(c, ctx) + fireworks(c, ctx, mob ? 2 : 4);
      out.top = garland(W, i => `<circle cx="0" cy="7" r="6.5" fill="${c[i % c.length]}"/><circle cx="0" cy="20" r="5.5" fill="${c[(i + 1) % c.length]}"/>`, mob ? 18 : 22, ctx);
      out.hang = many(i => i % 2 ? Q.strand(c[0], c[1], c[2], [60, 96, 74, 110, 66][i]) : Q.diya(clay, '#FFB703')) + side([Q.strand(c[0], c[1], c[2], 120), Q.diya(clay, '#FFB703')], 1.4, 0);
      out.drift = drift('down', mob ? 20 : 36, () => `<svg viewBox="-8 -8 16 16" width="14" height="14"><path d="M0,-7L2,-2L7,0L2,2L0,7L-2,2L-7,0L-2,-2Z" fill="#FFD166"/></svg>`, W, H);
      break }
  }
  return out;
}

const CSS = `.fest{position:absolute;inset:0;z-index:1;pointer-events:none;overflow:hidden}
.fest-back{position:absolute;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.fx-garland{z-index:1}.fx-tw{animation:fx-tw 1.6s ease-in-out infinite alternate}@keyframes fx-tw{to{opacity:.32}}
.fx-glow{position:absolute;border-radius:50%;pointer-events:none;animation:fx-breathe 9s ease-in-out infinite alternate}@keyframes fx-breathe{from{transform:scale(.9)}to{transform:scale(1.08)}}
.fx-bok{position:absolute;border-radius:50%;opacity:0;animation:fx-bok 10s ease-in-out infinite}@keyframes fx-bok{0%{opacity:0;transform:translateY(0)}30%,70%{opacity:var(--o)}100%{opacity:0;transform:translateY(var(--dy))}}
.fx-fw{position:absolute;opacity:0;animation:fx-fw 5s ease-out infinite}@keyframes fx-fw{0%{opacity:0;transform:scale(.12)}5%{opacity:1}24%{opacity:.95;transform:scale(1)}38%{opacity:0;transform:scale(1.14)}100%{opacity:0;transform:scale(1.14)}}
.fx-moon{position:absolute;border-radius:50%;background:radial-gradient(circle,#FFF6D6 0,#FFE8A3 calc(var(--r) * .98),rgba(255,226,140,.45) calc(var(--r) + 2px),rgba(255,214,120,.12) calc(var(--r) * 1.6),transparent 70%);animation:fx-breathe 7s ease-in-out infinite alternate}
.fx-moon.lt{background:radial-gradient(circle,#FFD873 0,#F0AE3C calc(var(--r) * .98),rgba(240,174,60,.42) calc(var(--r) + 2px),rgba(240,174,60,.14) calc(var(--r) * 1.6),transparent 70%)}
.fx-str{width:1.5px;margin:0 auto;background:var(--fx-line)}.fx-chain{animation-duration:6.5s}
.fx-hang{position:absolute;top:0;transform-origin:50% 0;animation:fx-hang 4.6s ease-in-out infinite alternate}@keyframes fx-hang{from{transform:rotate(-3.5deg)}to{transform:rotate(3.5deg)}}
.fx-p{position:absolute;top:0;display:block;will-change:transform;animation:var(--k,fx-down) var(--d) linear infinite}
.fx-p i{display:block;width:8px;height:8px;border-radius:50%;transform:scale(var(--s));opacity:.92}
.fx-p b{display:block;width:8px;height:13px;border-radius:1.5px;transform:scale(var(--s))}
.fx-down{--k:fx-down}.fx-up{--k:fx-up}.fx-across{--k:fx-across}
@keyframes fx-down{from{transform:translate(0,-30px) rotate(0)}to{transform:translate(var(--w),var(--H)) rotate(220deg)}}
@keyframes fx-up{from{transform:translate(0,var(--H)) scale(var(--s));opacity:0}15%{opacity:.9}to{transform:translate(var(--w),-40px) scale(var(--s));opacity:0}}
@keyframes fx-across{from{transform:translate(-60px,calc(var(--H) * .3))}50%{transform:translate(50vw,calc(var(--H) * .12))}to{transform:translate(110vw,calc(var(--H) * .26))}}
.fx-bat path{transform-origin:50% 0;animation:fx-flap .3s ease-in-out infinite alternate}@keyframes fx-flap{to{transform:scaleY(.4)}}
.fx-fl{transform-origin:0 8px;animation:fx-fl .25s ease-in-out infinite alternate}@keyframes fx-fl{to{transform:scale(.85,1.1)}}
.fx-hat{position:absolute;left:-12px;top:-22px;pointer-events:none;transform:rotate(-16deg)}
@media (prefers-reduced-motion:reduce){.fest *{animation:none!important}.fx-p,.fx-fw{display:none}.fx-bok{opacity:var(--o)}}`;

function render(id, ctx) {
  let box = ctx.hero.querySelector('.fest');
  if (!box) { box = document.createElement('div'); box.className = 'fest'; box.setAttribute('aria-hidden', 'true'); ctx.hero.querySelector('#mosaic').after(box) }
  if (!document.getElementById('fx-css')) { const s = document.createElement('style'); s.id = 'fx-css'; s.textContent = CSS; document.head.append(s) }
  const cs = getComputedStyle(ctx.root), bg = (cs.getPropertyValue('--bg') || '#0A0A0B').trim(), co = (cs.getPropertyValue('--co') || '#D9B26B').trim();
  const L = lum(rgb(bg)), line = L > .45 ? 'rgba(40,36,30,.45)' : 'rgba(255,250,240,.45)';
  box.style.setProperty('--fx-line', line);
  const hr = ctx.hero.getBoundingClientRect(), br = ctx.brand && ctx.brand.getBoundingClientRect(), nav = document.querySelector('.top .nav'), nr = nav && nav.offsetWidth ? nav.getBoundingClientRect() : null;
  const gx0 = br ? br.right - hr.left + 34 : ctx.W * .2, gx1 = nr ? nr.left - hr.left - 26 : ctx.W * .55;   /* the gap between the logo and the menu */
  const back = [], o = build(id, { ...ctx, bg, co, line, light: L > .45, gx0, gx1: Math.max(gx1, gx0 + 200), back });
  let bk = ctx.hero.querySelector('.fest-back'); if (!bk) { bk = document.createElement('div'); bk.className = 'fest-back'; bk.setAttribute('aria-hidden', 'true'); ctx.hero.querySelector('#mosaic').before(bk) }
  bk.innerHTML = back.join('');
  box.innerHTML = o.amb + o.top + o.hang + o.drift;
  const b = ctx.brand; if (b) { let h = b.querySelector('.fx-hat'); if (o.hat) { if (!h) { h = document.createElement('span'); h.className = 'fx-hat'; b.style.position = 'relative'; b.append(h) } h.innerHTML = o.hat } else if (h) h.remove() }
}
window.DNH && window.DNH({ render });
})();
