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
  /* 2026-11-23: the pieces for the seventeen new festivals */
  sky: (c, glow, s = 1) => `<g transform="scale(${s})"><path d="M-11,0H11L8,28H-8Z" fill="${c}"/><path d="M-6,0L-4,28M6,0L4,28" stroke="#fff" stroke-opacity=".28" stroke-width="1.4"/><ellipse cx="0" cy="27" rx="7" ry="3.5" fill="${glow}"/><path d="M0,30C-3,26 -1,22 0,19C1,22 3,26 0,30Z" fill="#FFF3B0"/></g>`,
  zongzi: (leaf, tie, s = 1) => `<g transform="scale(${s})"><path d="M0,0L19,32H-19Z" fill="${leaf}"/><path d="M0,0L-6,32M0,0L7,32M-12,20L13,20" stroke="#000" stroke-opacity=".18" stroke-width="1.4"/><path d="M-15,25L15,25M-4,6L6,30" stroke="${tie}" stroke-width="2.6"/></g>`,
  sachet: (c, g, s = 1) => `<g transform="scale(${s})"><path d="M-6,0H6L5,6H-5Z" fill="${g}"/><path d="M-5,6C-18,10 -18,34 0,36C18,34 18,10 5,6Z" fill="${c}"/><path d="M-9,20C-3,24 3,24 9,20" stroke="${g}" stroke-width="1.8" fill="none"/><circle cx="0" cy="17" r="3.4" fill="${g}"/><path d="M0,36V44M-3,44L-4,56M0,44V58M3,44L4,56" stroke="${g}" stroke-width="2"/></g>`,
  magpie: c => `<path d="M-20,-2C-12,-10 -4,-8 0,-1C4,-8 12,-10 20,-2C12,-3 6,0 2,3L10,7L0,6L-10,7L-2,3C-6,0 -12,-3 -20,-2Z" fill="${c}"/><path d="M-2,3L-4,10L0,7L4,10L2,3Z" fill="${c}" opacity=".8"/>`,
  fanous: (frame, glass, s = 1) => `<g transform="scale(${s})"><circle cx="0" cy="2" r="3" fill="none" stroke="${frame}" stroke-width="2"/><path d="M-9,12Q0,0 9,12Z" fill="${frame}"/><path d="M-12,12H12L9,40H-9Z" fill="${glass}" opacity=".9"/><path d="M-12,12H12L9,40H-9ZM-4,12L-3,40M4,12L3,40M-11,24H11" stroke="${frame}" stroke-width="2" fill="none"/><path d="M-9,40H9L5,47H-5Z" fill="${frame}"/><ellipse cx="0" cy="27" rx="4" ry="7" fill="#FFF3B0" opacity=".85"/></g>`,
  star8: (c, s = 1) => `<g transform="scale(${s})"><rect x="-11" y="-11" width="22" height="22" fill="${c}"/><rect x="-11" y="-11" width="22" height="22" fill="${c}" transform="rotate(45)"/><circle r="5" fill="#fff" opacity=".55"/></g>`,
  lotus: (c, c2, s = 1) => `<g transform="scale(${s})">${[-64, -32, 32, 64].map(a => `<path d="M0,20C-6,10 -6,0 0,-10C6,0 6,10 0,20Z" fill="${c2}" transform="rotate(${a} 0 20)"/>`).join('')}<path d="M0,20C-7,9 -7,-2 0,-14C7,-2 7,9 0,20Z" fill="${c}"/><path d="M-16,20H16" stroke="${c2}" stroke-width="3" stroke-linecap="round"/></g>`,
  rosette: (c, c2, s = 1) => `<g transform="scale(${s})">${Array.from({ length: 12 }, (_, i) => `<path d="M0,0L-4,-16H4Z" fill="${i % 2 ? c : c2}" transform="rotate(${i * 30})"/>`).join('')}<circle r="5" fill="#fff"/></g>`,
  goldfish: (c, s = 1) => `<g transform="scale(${s})"><path d="M0,26C-12,22 -12,6 0,2C12,6 12,22 0,26Z" fill="${c}"/><path d="M0,24L-10,40L0,34L10,40Z" fill="${c}" opacity=".8"/><circle cx="-4" cy="10" r="1.8" fill="#222"/><path d="M-6,16C-2,18 2,18 6,16" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" fill="none"/></g>`,
  sabzeh: (pot, grass, s = 1) => `<g transform="scale(${s})">${Array.from({ length: 9 }, (_, i) => `<path d="M${-10 + i * 2.5},22Q${-12 + i * 3},8 ${-14 + i * 3.6},${-2 + (i % 3) * 4}" stroke="${grass}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`).join('')}<path d="M-14,20H14L10,36H-10Z" fill="${pot}"/><path d="M-14,24H14" stroke="#E63946" stroke-width="2.4"/></g>`,
  shamrock: (c, s = 1) => `<g transform="scale(${s})">${[0, 120, 240].map(a => `<path d="M0,0C-3,-6 -11,-10 -12,-4C-13,1 -6,2 0,0C6,2 13,1 12,-4C11,-10 3,-6 0,0Z" fill="${c}" transform="rotate(${a}) translate(0,-7)"/>`).join('')}<path d="M0,2Q3,12 8,18" stroke="${c}" stroke-width="2.4" fill="none" stroke-linecap="round"/></g>`,
  gear: (c, s = 1) => `<g transform="scale(${s})">${Array.from({ length: 8 }, (_, i) => `<rect x="-3.5" y="-17" width="7" height="8" rx="1.5" fill="${c}" transform="rotate(${i * 45})"/>`).join('')}<circle r="12.5" fill="${c}"/><circle r="5" fill="#fff" opacity=".6"/></g>`,
  lily: (stem, bell, s = 1) => `<g transform="scale(${s})"><path d="M0,0C6,14 6,30 -2,44" stroke="${stem}" stroke-width="2" fill="none"/>${[[5, 12], [6, 22], [4, 32], [0, 41]].map(([x, y]) => `<path d="M${x - 4},${y}C${x - 4},${y + 7} ${x + 4},${y + 7} ${x + 4},${y}Z" fill="${bell}"/>`).join('')}</g>`,
  carnation: (c, c2, s = 1) => `<g transform="scale(${s})"><path d="M0,22V40" stroke="#3E8E41" stroke-width="2.4"/><path d="M-6,20L0,30L6,20Z" fill="#3E8E41"/>${[-10, -5, 0, 5, 10].map((x, i) => `<circle cx="${x}" cy="${12 - Math.abs(x) * .3}" r="${7 - Math.abs(x) * .15}" fill="${i % 2 ? c2 : c}"/>`).join('')}<path d="M-12,16l3,-3l3,3l3,-3l3,3l3,-3l3,3l3,-3l3,3" stroke="#fff" stroke-opacity=".5" stroke-width="1.3" fill="none"/></g>`,
  tie: (c, c2, s = 1) => `<g transform="scale(${s})"><path d="M-6,0H6L4,7H-4Z" fill="${c}"/><path d="M-4,7H4L9,34L0,44L-9,34Z" fill="${c}"/><path d="M-5,14L6,10M-6,22L7,18M-8,30L8,26" stroke="${c2}" stroke-width="2.4"/></g>`,
  medal: (c, rib, s = 1) => `<g transform="scale(${s})"><path d="M-9,0L-2,18H2L9,0H4L0,10L-4,0Z" fill="${rib}"/><circle cx="0" cy="28" r="12" fill="${c}"/><circle cx="0" cy="28" r="8.5" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/><path d="M0,21L2,26H7L3,29L5,34L0,31L-5,34L-3,29L-7,26H-2Z" fill="#fff" opacity=".75"/></g>`,
  picado: (c, s = 1) => `<g transform="scale(${s})"><path fill-rule="evenodd" fill="${c}" d="M-13,0H13V22L9,26L5,22L1,26L-3,22L-7,26L-11,22L-13,24ZM-7,6L-4,9L-7,12L-10,9ZM7,6L10,9L7,12L4,9ZM0,12L3,15L0,18L-3,15Z"/></g>`,
  skull: (c, deco, s = 1) => `<g transform="scale(${s})"><path d="M0,0C-14,0 -18,12 -16,22C-15,27 -11,28 -10,32H10C11,28 15,27 16,22C18,12 14,0 0,0Z" fill="${c}"/><circle cx="-6" cy="17" r="5" fill="${deco}"/><circle cx="6" cy="17" r="5" fill="${deco}"/><circle cx="-6" cy="17" r="2" fill="#fff"/><circle cx="6" cy="17" r="2" fill="#fff"/><path d="M0,22L-2,26H2Z" fill="${deco}"/><path d="M-7,30V35M-2.5,30V36M2.5,30V36M7,30V35" stroke="${deco}" stroke-width="1.6"/><circle cx="0" cy="7" r="3" fill="${deco}"/></g>`,
  marigold: (c, c2, s = 1) => `<g transform="scale(${s})">${Array.from({ length: 10 }, (_, i) => `<circle cx="${(Math.cos(i * .628) * 7).toFixed(1)}" cy="${(Math.sin(i * .628) * 7).toFixed(1)}" r="5" fill="${c}"/>`).join('')}<circle r="5" fill="${c2}"/></g>`,
  maple: (c, s = 1) => `<g transform="scale(${s})"><path d="M0,-14L3,-6L10,-9L8,-2L15,0L8,3L10,10L3,7L1,14H-1L-3,7L-10,10L-8,3L-15,0L-8,-2L-10,-9L-3,-6Z" fill="${c}"/><path d="M0,10V20" stroke="${c}" stroke-width="1.8"/></g>`,
  acorn: (nut, cap, s = 1) => `<g transform="scale(${s})"><path d="M0,0V5" stroke="${cap}" stroke-width="2.4"/><path d="M-12,12C-12,4 12,4 12,12Z" fill="${cap}"/><path d="M-8,8l4,4M-2,6l4,6M4,6l4,6" stroke="#000" stroke-opacity=".2" stroke-width="1.2"/><path d="M-10,12C-10,24 -4,30 0,32C4,30 10,24 10,12Z" fill="${nut}"/></g>`,
  gourd: (c, s = 1) => `<g transform="scale(${s})"><rect x="-2.5" y="-4" width="5" height="9" rx="2" fill="#5B3A1A"/><ellipse cx="-10" cy="18" rx="11" ry="14" fill="${c}"/><ellipse cx="10" cy="18" rx="11" ry="14" fill="${c}"/><ellipse cx="0" cy="18" rx="10" ry="15" fill="${c}"/><path d="M-5,6C-8,14 -8,24 -5,31M5,6C8,14 8,24 5,31" stroke="#000" stroke-opacity=".16" stroke-width="1.6" fill="none"/></g>`,
  bag: (c, c2, s = 1) => `<g transform="scale(${s})"><path d="M-7,10C-7,-1 7,-1 7,10" stroke="${c2}" stroke-width="2.6" fill="none"/><path d="M-14,9H14L16,38H-16Z" fill="${c}"/><path d="M-14,9H14" stroke="#fff" stroke-opacity=".35" stroke-width="3"/></g>`,
  tag: (c, s = 1) => `<g transform="scale(${s})"><path fill-rule="evenodd" fill="${c}" d="M-11,8L0,0L11,8V36H-11ZM0,5A2.6,2.6 0 1 0 0,10.2A2.6,2.6 0 1 0 0,5Z"/><text x="0" y="28" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="800" font-size="12" fill="#fff">%</text></g>`,
  menorah: (c, flame, s = 1) => `<g transform="scale(${s})">${Array.from({ length: 9 }, (_, i) => { const x = (i - 4) * 6, h = i === 4 ? 26 : 20; return `<rect x="${x - 1.6}" y="${30 - h}" width="3.2" height="${h}" fill="${c}"/><path d="M${x},${26 - h}C${x - 2.4},${23 - h} ${x - 1},${20 - h} ${x},${18 - h}C${x + 1},${20 - h} ${x + 2.4},${23 - h} ${x},${26 - h}Z" fill="${flame}"/>` }).join('')}<path d="M-25,30H25V33H-25ZM-3,33H3V42H-3ZM-10,42H10V45H-10Z" fill="${c}"/></g>`,
  dreidel: (c, c2, s = 1) => `<g transform="scale(${s})"><rect x="-2" y="0" width="4" height="8" fill="${c2}"/><path d="M-12,8H12V26L0,40L-12,26Z" fill="${c}"/><path d="M-12,8H12V26L0,40L-12,26Z" fill="none" stroke="${c2}" stroke-width="1.6"/><path d="M0,14L4,22H-4Z" fill="none" stroke="${c2}" stroke-width="1.6"/></g>`,
  davidStar: (c, s = 1) => `<g transform="scale(${s})"><path d="M0,-14L12,7H-12Z M0,14L12,-7H-12Z" fill="none" stroke="${c}" stroke-width="2.6" stroke-linejoin="round"/></g>`
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
  /* 2026-11-23: the seventeen new festivals */
  sky: (c, g) => [P.sky(c, g), 26, 34],
  zongzi: (l, t) => [`<g transform="translate(0,2)">${P.zongzi(l, t)}</g>`, 40, 36],
  sachet: (c, g) => [P.sachet(c, g), 36, 60],
  fanous: (f, g) => [P.fanous(f, g), 28, 50],
  star8: c => [`<g transform="translate(0,16)">${P.star8(c)}</g>`, 34, 34],
  lotus: (c, c2) => [`<g transform="translate(0,14)">${P.lotus(c, c2)}</g>`, 44, 36],
  rosette: (c, c2) => [`<g transform="translate(0,17)">${P.rosette(c, c2)}</g>`, 36, 36],
  goldfish: c => [P.goldfish(c), 26, 42],
  sabzeh: (p, g) => [P.sabzeh(p, g), 32, 38],
  shamrock: c => [`<g transform="translate(0,20)">${P.shamrock(c)}</g>`, 34, 40],
  gear: c => [`<g transform="translate(0,18)">${P.gear(c)}</g>`, 36, 36],
  lily: (st, b) => [P.lily(st, b), 22, 48],
  carnation: (c, c2) => [`<g transform="translate(0,2)">${P.carnation(c, c2)}</g>`, 36, 44],
  tie: (c, c2) => [P.tie(c, c2), 22, 46],
  medal: (c, r) => [P.medal(c, r), 28, 42],
  skull: (c, d) => [P.skull(c, d), 36, 38],
  marigold: (c, c2) => [`<g transform="translate(0,12)">${P.marigold(c, c2)}</g>`, 26, 26],
  maple: c => [`<g transform="translate(0,16)">${P.maple(c)}</g>`, 32, 38],
  acorn: (n, c) => [P.acorn(n, c), 26, 34],
  gourd: c => [`<g transform="translate(0,4)">${P.gourd(c)}</g>`, 46, 38],
  bag: (c, c2) => [P.bag(c, c2), 34, 40],
  tag: c => [P.tag(c), 24, 38],
  menorah: (c, f) => [`<g transform="translate(0,6)">${P.menorah(c, f)}</g>`, 54, 52],
  dreidel: (c, c2) => [P.dreidel(c, c2), 26, 42],
  davidStar: c => [`<g transform="translate(0,16)">${P.davidStar(c)}</g>`, 30, 32],
  text: (c, t, fs = 30) => [`<text x="0" y="${fs}" text-anchor="middle" font-family="Archivo,sans-serif" font-weight="800" font-size="${fs}" fill="${c}">${t}</text>`, fs * t.length * .62, fs + 6],
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
  stpatricks: `<svg viewBox="0 0 40 36" width="38" height="34"><rect x="9" y="4" width="22" height="22" rx="2" fill="#1B8A3A"/><ellipse cx="20" cy="27" rx="19" ry="5" fill="#1B8A3A"/><rect x="9" y="18" width="22" height="5" fill="#111"/><rect x="17" y="17" width="6" height="7" fill="none" stroke="#F2C14E" stroke-width="1.8"/></svg>`,
  labourday: `<svg viewBox="0 0 40 36" width="38" height="34"><path d="M5,26C5,12 12,6 20,6C28,6 35,12 35,26Z" fill="#FFC93C"/><path d="M17,6H23V26H17Z" fill="#E0A800"/><rect x="1" y="25" width="38" height="6" rx="3" fill="#FFC93C"/></svg>`,
  fathersday: `<svg viewBox="0 0 40 36" width="38" height="34"><path d="M9,24C9,12 13,6 20,6C27,6 31,12 31,24Z" fill="#4A3B2C"/><path d="M14,9C17,12 23,12 26,9" stroke="#2E241A" stroke-width="2" fill="none"/><ellipse cx="20" cy="25" rx="19" ry="5" fill="#4A3B2C"/><rect x="9" y="19" width="22" height="4" fill="#8C2F39"/></svg>`
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
    /* ---- 2026-11-23: seventeen more festivals (DSJ: 「要，加！」) ---- */
    case 'lantern': {   // 元宵 / Chap Goh Mei: red lanterns with words, sky lanterns rising
      const red = pick(['#D62828', '#E63946', '#F2C14E'], 1, ctx)[0], gold = red === '#F2C14E' ? '#B5172F' : '#F2C14E', chs = ['元', '宵', '灯', '圆', '乐'];
      out.amb = ambience([red, gold, '#FF9F1C'], ctx) + moon(ctx);
      out.top = garland(W, i => `<ellipse cx="0" cy="10" rx="7" ry="8" fill="${i % 2 ? gold : red}"/><path d="M0,18v6" stroke="${gold}" stroke-width="1.6"/>`, mob ? 24 : 30, ctx);
      out.hang = many(i => Q.lantern(red, gold, chs[i]), .92) + side([Q.lantern(red, gold, '圆'), Q.paper(red, gold), Q.lantern(red, gold, '喜')], 1.3, 10);
      const sk = pick(['#FF9F1C', '#FFB703', '#E85D04', '#FFFFFF'], 1, ctx)[0];
      out.drift = drift('up', mob ? 10 : 18, () => `<svg viewBox="-13 -2 26 36" width="20" height="28">${P.sky(sk, '#FFE29A')}</svg>`, W, H);
      break }
    case 'duanwu': {   // 端午: zongzi, sachets, bamboo leaves
      const leaf = pick(['#2D6A4F', '#40916C', '#74C69D', '#1B4332'], 1, ctx)[0], c = pick(['#E63946', '#F2C14E', '#7B2CBF', '#FF8FAB'], 2, ctx);
      out.amb = ambience([leaf, c[0], '#95D5B2'], ctx);
      out.top = garland(W, i => i % 2 ? P.zongzi(leaf, c[0], .45) : `<circle cx="0" cy="7" r="4.5" fill="${c[1]}"/>`, mob ? 24 : 30, ctx, 2);
      out.hang = many(i => i % 2 ? Q.sachet(c[0], c[1]) : Q.zongzi(leaf, c[0])) + side([Q.zongzi(leaf, c[0]), Q.sachet(c[1], c[0]), Q.zongzi(leaf, c[1])], 1.4);
      out.drift = drift('down', mob ? 16 : 30, () => `<svg viewBox="-12 -4 24 8" width="26" height="9"><path d="M-11,0C-4,-4 4,-4 11,0C4,4 -4,4 -11,0Z" fill="${leaf}"/></svg>`, W, H);
      break }
    case 'qixi': {   // 七夕: magpies across the night, stars and hearts
      const c = pick(['#C77DFF', '#FF8FAB', '#90E0EF', '#FFFFFF', '#F2C14E'], 3, ctx), bird = pick(['#1D1D35', '#3C2A4D', '#FFFFFF'], 1, ctx)[0];
      out.amb = ambience(c, ctx);
      out.top = garland(W, i => i % 3 ? P.star(c[i % c.length], .4) : P.heart(c[0], .35), mob ? 22 : 28, ctx, 4);
      out.hang = many(i => i % 2 ? Q.heart(c[0]) : Q.star(c[1])) + side([Q.star(c[1]), Q.heart(c[0]), Q.star(c[2]), Q.heart(c[0])], 1.4);
      out.drift = drift('across', mob ? 6 : 10, () => `<svg class="fx-bat" viewBox="-22 -12 44 24" width="40" height="22">${P.magpie(bird)}</svg>`, W, H);
      break }
    case 'ramadan': {   // fanous lanterns, crescents, stars
      const c = pick(['#F2C14E', '#E9C46A', '#2A9D8F', '#FFFFFF', '#E76F51'], 3, ctx);
      out.amb = ambience([c[0], c[1], '#264653'], ctx) + moon(ctx);
      out.top = garland(W, i => i % 2 ? P.star(c[0], .5) : `<circle cx="0" cy="6" r="4" fill="${c[1]}"/>`, mob ? 22 : 28, ctx, 2);
      out.hang = many(i => i % 2 ? Q.crescent(c[0]) : Q.fanous(c[0], c[2])) + side([Q.fanous(c[0], c[1]), Q.star(c[0]), Q.fanous(c[0], c[2]), Q.crescent(c[0])], 1.4);
      out.drift = drift('down', mob ? 16 : 28, () => `<svg viewBox="-8 -8 16 16" width="12" height="12">${P.star(c[0], .5)}</svg>`, W, H);
      break }
    case 'eidadha': {   // Aidiladha: eight-point stars, crescents, ketupat
      const c = pick(['#1B9E5A', '#F2C14E', '#FFFFFF', '#0B6E4F', '#E9C46A'], 2, ctx);
      out.amb = ambience([c[0], c[1]], ctx);
      out.top = garland(W, i => i % 2 ? P.star8(c[1], .32) : `<circle cx="0" cy="6" r="4.5" fill="${c[0]}"/>`, mob ? 24 : 30, ctx, 6);
      out.hang = many(i => [Q.star8(c[1]), Q.crescent(c[1]), Q.ketupat(c[0], c[1])][i % 3]) + side([Q.star8(c[1]), Q.ketupat(c[0], c[1]), Q.crescent(c[1]), Q.star8(c[0])], 1.35);
      out.drift = drift('down', mob ? 14 : 26, () => `<svg viewBox="-16 -16 32 32" width="13" height="13">${P.star8(c[1], .8)}</svg>`, W, H);
      break }
    case 'vesak': {   // Wesak: lotuses and Vesak star lanterns
      const c = pick(['#F7B2C4', '#FFD166', '#FFFFFF', '#F28482', '#84A59D'], 3, ctx), leaf = pick(['#52B788', '#2D6A4F', '#B7E4C7'], 1, ctx)[0];
      out.amb = ambience([c[0], c[1], '#FFF3B0'], ctx);
      out.top = garland(W, i => i % 2 ? P.lotus(c[0], c[2], .35) : `<circle cx="0" cy="6" r="4" fill="${c[1]}"/>`, mob ? 24 : 30, ctx, 6);
      out.hang = many(i => i % 2 ? Q.lotus(c[0], c[2]) : Q.star(c[1])) + side([Q.lotus(c[0], c[2]), Q.star(c[1]), Q.lotus(c[2], c[0])], 1.4);
      out.drift = drift('up', mob ? 12 : 22, i => `<svg viewBox="-10 -10 20 20" width="14" height="14"><path d="M0,9C-4,3 -4,-3 0,-9C4,-3 4,3 0,9Z" fill="${i % 2 ? c[0] : leaf}" opacity=".85"/></svg>`, W, H);
      break }
    case 'holi': {   // colours: rosettes, powder clouds
      const c = pick(['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC', '#06D6A0'], 5, ctx);
      out.amb = ambience(c, ctx);
      out.top = garland(W, i => `<circle cx="0" cy="7" r="6" fill="${c[i % c.length]}"/>`, mob ? 16 : 20, ctx);
      out.hang = many(i => Q.rosette(c[i % c.length], c[(i + 2) % c.length])) + side([Q.rosette(c[0], c[2]), Q.rosette(c[1], c[3]), Q.rosette(c[4], c[0])], 1.3);
      out.drift = drift('up', mob ? 18 : 34, i => `<i style="background:${c[i % c.length]};width:13px;height:13px;filter:blur(1.5px)"></i>`, W, H);
      break }
    case 'nowruz': {   // painted eggs, goldfish, sabzeh
      const c = pick(['#E63946', '#F4A261', '#2A9D8F', '#E9C46A', '#8ECAE6', '#FFFFFF'], 4, ctx), fish = pick(['#FB8500', '#FF6B35', '#E85D04'], 1, ctx)[0];
      out.amb = ambience([c[0], c[2], '#B7E4C7'], ctx);
      out.top = garland(W, i => P.egg(c[i % c.length], '#FFFFFF', .45), mob ? 24 : 30, ctx, 2);
      out.hang = many(i => [Q.goldfish(fish), Q.egg(c[0], c[3]), Q.sabzeh(c[2], '#52B788'), Q.egg(c[1], c[2])][i % 4]) + side([Q.egg(c[0], c[3]), Q.goldfish(fish), Q.egg(c[2], c[1])], 1.45);
      out.drift = drift('down', mob ? 14 : 26, i => `<svg viewBox="-8 -8 16 16" width="13" height="13"><circle r="5" fill="${['#FFC8DD', '#FFAFCC', '#FFFFFF'][i % 3]}"/><circle r="1.8" fill="#FFD166"/></svg>`, W, H);
      break }
    case 'womensday': {   // tulips and mimosa
      const c = pick(['#E0218A', '#FF8FAB', '#9D4EDD', '#FFD166', '#FFFFFF'], 3, ctx), mim = pick(['#FFD60A', '#FFC300', '#F2C14E'], 1, ctx)[0];
      out.amb = ambience([c[0], mim, c[1]], ctx);
      out.top = garland(W, i => i % 2 ? P.carnation(c[0], c[1], .4) : `<circle cx="-3" cy="6" r="3.4" fill="${mim}"/><circle cx="3" cy="8" r="3.4" fill="${mim}"/><circle cx="0" cy="2" r="3.4" fill="${mim}"/>`, mob ? 22 : 28, ctx, 2);
      out.hang = many(i => i % 2 ? Q.carnation(c[i % 3], c[(i + 1) % 3]) : Q.heart(c[0])) + side([Q.carnation(c[0], c[1]), Q.heart(c[2]), Q.carnation(c[1], c[0])], 1.4);
      out.drift = drift('down', mob ? 18 : 32, () => `<svg viewBox="-6 -6 12 12" width="10" height="10"><circle r="5" fill="${mim}"/></svg>`, W, H);
      break }
    case 'stpatricks': {   // shamrocks, gold coins, a green top hat
      const g = pick(['#1B8A3A', '#2DC653', '#7AE582', '#FFFFFF'], 2, ctx), gold = '#F2C14E';
      out.amb = ambience([g[0], g[1], gold], ctx);
      out.top = garland(W, i => i % 2 ? P.shamrock(g[0], .45) : `<circle cx="0" cy="7" r="4.5" fill="${gold}"/>`, mob ? 22 : 28, ctx, 6);
      out.hang = many(i => i % 2 ? Q.shamrock(g[1]) : Q.shamrock(g[0])) + side([Q.shamrock(g[0]), Q.text(gold, '★', 26), Q.shamrock(g[1])], 1.4);
      out.drift = drift('down', mob ? 16 : 30, i => `<svg viewBox="-16 -16 32 34" width="15" height="16">${P.shamrock(g[i % 2], .7)}</svg>`, W, H);
      break }
    case 'labourday': {   // gears, lilies of the valley, a hard hat
      const c = pick(['#FFC93C', '#E63946', '#3A86FF', '#FFFFFF', '#8D99AE'], 3, ctx), stem = pick(['#52B788', '#2D6A4F'], 1, ctx)[0], bell = pick(['#FFFFFF', '#E9F5DB', '#8D99AE', '#5C677D'], 1, ctx)[0];
      out.amb = ambience([c[0], c[1]], ctx);
      out.top = garland(W, i => i % 2 ? P.gear(c[i % 3], .32) : `<circle cx="0" cy="6" r="4" fill="${c[0]}"/>`, mob ? 22 : 28, ctx, 6);
      out.hang = many(i => i % 2 ? Q.lily(stem, bell) : Q.gear(c[i % 3])) + side([Q.gear(c[0]), Q.gear(c[1]), Q.lily(stem, bell)], 1.3);
      out.drift = drift('down', mob ? 12 : 22, i => `<svg viewBox="-18 -18 36 36" width="15" height="15">${P.gear(c[i % 3], .8)}</svg>`, W, H);
      break }
    case 'mothersday': {   // carnations and hearts
      const c = pick(['#FF4D6D', '#FF8FA3', '#E0218A', '#FFFFFF', '#FFB3C1'], 3, ctx);
      out.amb = ambience(c, ctx);
      out.top = garland(W, i => i % 2 ? P.carnation(c[0], c[1], .38) : P.heart(c[2], .32), mob ? 22 : 28, ctx, 2);
      out.hang = many(i => i % 2 ? Q.heart(c[1]) : Q.carnation(c[0], c[2])) + side([Q.carnation(c[0], c[1]), Q.heart(c[2]), Q.carnation(c[1], c[0])], 1.45);
      out.drift = drift('up', mob ? 14 : 26, i => `<svg viewBox="-20 -6 40 38" width="18" height="17">${P.heart(c[i % c.length])}</svg>`, W, H);
      break }
    case 'fathersday': {   // ties, medals, a fedora
      const c = pick(['#1D3557', '#457B9D', '#E63946', '#F2C14E', '#FFFFFF'], 3, ctx);
      out.amb = ambience([c[0], c[1], '#F2C14E'], ctx);
      out.top = garland(W, i => i % 2 ? P.star(c[2], .4) : `<circle cx="0" cy="6" r="4" fill="${c[1]}"/>`, mob ? 22 : 28, ctx, 4);
      out.hang = many(i => i % 2 ? Q.medal('#F2C14E', c[2]) : Q.tie(c[i % 3], '#FFFFFF')) + side([Q.tie(c[0], '#F2C14E'), Q.medal('#F2C14E', c[1]), Q.tie(c[2], '#FFFFFF')], 1.4);
      out.drift = drift('down', mob ? 14 : 26, i => `<svg viewBox="-8 -8 16 16" width="12" height="12">${P.star(i % 2 ? '#F2C14E' : c[1], .5)}</svg>`, W, H);
      break }
    case 'dayofdead': {   // papel picado, sugar skulls, marigolds
      const c = pick(['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC', '#06D6A0'], 5, ctx), mari = pick(['#FB8500', '#FFB703'], 1, ctx)[0];
      out.amb = ambience([mari, c[0], c[4]], ctx);
      out.top = garland(W, i => P.picado(c[i % c.length], .9), mob ? 26 : 32, ctx);
      out.hang = many(i => i % 2 ? Q.marigold(mari, '#E85D04') : Q.skull('#FFFFFF', c[i % c.length])) + side([Q.skull('#FFFFFF', c[0]), Q.marigold(mari, '#E85D04'), Q.skull('#FFFFFF', c[3]), Q.marigold(mari, '#E85D04')], 1.35);
      out.drift = drift('down', mob ? 16 : 28, () => `<svg viewBox="-6 -6 12 12" width="11" height="11"><circle r="5" fill="${mari}"/></svg>`, W, H);
      break }
    case 'thanksgiving': {   // maple leaves, acorns, pumpkins
      const c = pick(['#D00000', '#E85D04', '#FFBA08', '#9D0208', '#FAA307'], 3, ctx), nut = '#A0522D', cap = '#6B4226';
      out.amb = ambience([c[0], c[1], c[2]], ctx);
      out.top = garland(W, i => P.maple(c[i % c.length], .5), mob ? 22 : 28, ctx, 8);
      out.hang = many(i => [Q.gourd(c[1]), Q.maple(c[0]), Q.acorn(nut, cap), Q.maple(c[2])][i % 4]) + side([Q.maple(c[0]), Q.acorn(nut, cap), Q.gourd(c[1]), Q.maple(c[2])], 1.4);
      out.drift = drift('down', mob ? 18 : 34, i => `<svg viewBox="-16 -16 32 38" width="18" height="21">${P.maple(c[i % c.length], .9)}</svg>`, W, H);
      break }
    case 'shopping': {   // 11.11: bags, price tags, confetti
      const c = pick(['#FF4D6D', '#FF7A00', '#FFD60A', '#3A86FF', '#FFFFFF'], 3, ctx);
      out.amb = ambience(c, ctx) + fireworks(c, ctx, mob ? 2 : 3);
      out.top = garland(W, i => i % 2 ? P.tag(c[i % 3], .45) : `<circle cx="0" cy="6" r="4" fill="${c[(i + 1) % 3]}"/>`, mob ? 22 : 28, ctx, 2);
      out.hang = many(i => i === 1 ? Q.text(c[0], '11.11') : i % 2 ? Q.tag(c[1]) : Q.bag(c[i % 3], c[(i + 1) % 3])) + side([Q.bag(c[0], c[1]), Q.tag(c[2]), Q.bag(c[1], c[0])], 1.4);
      out.drift = drift('down', mob ? 30 : 60, i => `<b style="background:${c[i % c.length]}"></b>`, W, H);
      break }
    case 'hanukkah': {   // menorah, dreidels, stars
      const c = pick(['#3A86FF', '#4895EF', '#FFFFFF', '#F2C14E', '#90E0EF'], 3, ctx), flame = '#FFB703';
      out.amb = ambience([c[0], '#F2C14E', c[1]], ctx);
      out.top = garland(W, i => i % 2 ? P.davidStar(c[0], .4) : `<circle cx="0" cy="6" r="4" fill="${c[1]}"/>`, mob ? 22 : 28, ctx, 6);
      out.hang = many(i => i === 1 ? Q.menorah(c[0], flame) : i % 2 ? Q.davidStar(c[1]) : Q.dreidel(c[0], c[2])) + side([Q.davidStar(c[0]), Q.dreidel(c[1], c[2]), Q.davidStar(c[2])], 1.4);
      out.drift = drift('down', mob ? 14 : 24, i => `<svg viewBox="-16 -16 32 32" width="13" height="13">${P.davidStar(i % 2 ? '#F2C14E' : c[0], .8)}</svg>`, W, H);
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
