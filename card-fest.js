/* Dinamics e-card · festival ornaments. Fetched only when a festival is near (or ?holiday=<id>), like the home page.
   The pieces, colours and calendar are the home page's (fest/holiday.js, copied in by card/build_card.py); the layout is the card's:
   a string of lights along the card's top edge, two ornaments hanging in the gap of its header, a hat on the logo for some festivals,
   the festival's glow behind the card and things drifting down in front of it. The card changes style every few seconds, so the
   ornaments are redrawn in the new style's colours with the same layout and animation phase: they keep swinging, nothing jumps. */
(() => {
let SEED = 7;
const rnd = () => (SEED = (Math.imul(SEED, 1664525) + 1013904223) >>> 0) / 4294967296;
const rgb = h => { h = h.trim().replace('#', ''); if (h.length === 3) h = h.replace(/./g, c => c + c); const v = parseInt(h.slice(0, 6), 16); return [v >> 16 & 255, v >> 8 & 255, v & 255] };
const dist = (a, b) => { const r = (a[0] + b[0]) / 2, d0 = a[0] - b[0], d1 = a[1] - b[1], d2 = a[2] - b[2]; return Math.sqrt((2 + r / 256) * d0 * d0 + 4 * d1 * d1 + (2 + (255 - r) / 256) * d2 * d2) };
const lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]) };
/* the colours of a festival that stand out on this style: far from the background, not the style's own accent */
function pick(cands, k, ctx) {
  const bg = rgb(ctx.bg), co = rgb(ctx.co);
  return cands.map((c, i) => { const v = rgb(c); return { c, s: Math.min(dist(v, bg), 420) + Math.min(dist(v, co), 260) * .55 - i * 6 } })
    .sort((a, b) => b.s - a.s).slice(0, k).map(x => x.c);
}
const R = (a, b) => a + rnd() * (b - a), clamp = (v, a, b) => v < a ? a : v > b ? b : v;
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
const CCSS = `.cf-card{position:absolute;inset:0;z-index:3;pointer-events:none;overflow:hidden;border-radius:inherit}
.cf-card .fx-garland{position:absolute;left:0;top:0;overflow:visible}
.cf-hat{position:absolute;pointer-events:none;transform:rotate(-16deg);transform-origin:55% 90%}.cf-hat svg{display:block}
.cf-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden}
.cf-fg{position:fixed;inset:0;z-index:15;pointer-events:none;overflow:hidden}
.cf-fg .fx-p i{background:var(--cf-d0)}
@media (prefers-reduced-motion:reduce){.cf-card *,.cf-bg *{animation:none!important}.cf-fg,.cf-bg .fx-fw{display:none}.cf-bg .fx-bok{opacity:var(--o)}}`;

/* lights along the top edge of the card, sized to the card */
function cardGarland(W, each, n, line, k, T) {
  const y = x => 2.5 + 4 * 4 * (x / W) * (1 - x / W) + Math.sin(x / W * 5 * Math.PI) * 1.2;
  let path = '', items = '';
  for (let x = 0; x <= W + .1; x += W / 60) path += (x ? 'L' : 'M') + x.toFixed(1) + ',' + y(x).toFixed(1);
  for (let i = 0; i < n; i++) { const x = (i + .5) * W / n; items += `<g transform="translate(${x.toFixed(1)},${y(x).toFixed(1)}) scale(${k.toFixed(3)})" class="fx-tw" style="animation-delay:-${((i * .37 + T) % 3.2).toFixed(2)}s">${each(i)}</g>` }
  return svg(Math.ceil(W), 40, `<path d="${path}" fill="none" stroke="${line}" stroke-width="1.3"/>${items}`, 'fx-garland');
}
/* the ornaments on the card, in the colours that stand out on this style */
function cardParts(id, c) {
  const o = { top: '', hang: '', hat: HAT[id] || '', d: [] };
  const n = Math.max(8, Math.round(c.fw / 27)), G = each => cardGarland(c.fw, each, n, c.line, c.k, c.T);
  /* two ornaments in the gap of the header, the second on a longer string so they never collide; m = size of each, for the big ones */
  const gap = c.gx1 - c.gx0, xs = [c.gx0 + gap * .2, c.gx1 - gap * .2], lens = [5, 28];
  const two = (a, b, ma = 1, mb = 1) => {   /* keep each ornament clear of the wordmark and of the style button */
    const w0 = a[1] * c.S * ma / 2 + 3, w1 = b[1] * c.S * mb / 2 + 3;
    const x0 = Math.max(xs[0], c.gx0 + w0), x1 = Math.max(Math.min(xs[1], c.gx1 - w1), x0 + 10);
    return [[a, ma, x0], [b, mb, x1]].map(([p, m, x], i) => hanger(x, Math.round(lens[i] * c.S), p, c.S * m, ((i * 1.3 + c.T) % 9.2).toFixed(2))).join('') };
  switch (id) {
    case 'xmas': { const k = pick(['#E63946', '#2BA84A', '#FFC93C', '#3A86FF', '#FFFFFF', '#B5179E'], 4, c);
      o.top = G(i => P.bulb(k[i % k.length])); o.hang = two(Q.bauble(k[0]), Q.star(k[1]));
      o.d = pick(['#FFFFFF', '#DDE8FF', '#9FB6D8', '#6E86A8'], 1, c); break }
    case 'newyear': { const k = pick(['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#FFFFFF', '#9B5DE5'], 4, c);
      o.top = G(i => P.star(k[i % k.length], .8)); o.hang = two(Q.star(k[1]), Q.year(k[0], c.fy), 1, .66); o.d = k.slice(0, 3); break }
    case 'cny': { const red = pick(['#D62828', '#E63946', '#F2C14E'], 1, c)[0], gold = red === '#F2C14E' ? '#B5172F' : '#F2C14E';
      const zod = '鼠牛虎兔龙蛇马羊猴鸡狗猪'[((c.fy - 2020) % 12 + 12) % 12];
      o.top = G(i => `<path d="M0,0l-4,20h8Z" fill="${i % 2 ? gold : red}"/><circle cx="0" cy="25" r="5" fill="${i % 2 ? red : gold}"/>`);
      o.hang = two(Q.lantern(red, gold, '福'), Q.lantern(red, gold, zod), .74, .74); o.d = pick(['#FFB3C6', '#FF8FAB', '#FFFFFF', '#F2C14E'], 1, c); break }
    case 'valentine': { const k = pick(['#FF4D6D', '#FF8FA3', '#C9184A', '#FFFFFF', '#FFB3C1'], 3, c);
      o.top = G(i => P.heart(k[i % k.length], .6)); o.hang = two(Q.heart(k[0]), Q.heart(k[1])); o.d = k; break }
    case 'raya': { const k = pick(['#1B9E5A', '#F2C14E', '#FFFFFF', '#0B6E4F', '#E9C46A'], 2, c);
      o.top = G(i => i % 2 ? P.star(k[1], .6) : `<circle cx="0" cy="6" r="5" fill="${k[0]}"/>`); o.hang = two(Q.ketupat(k[0], k[1]), Q.crescent(k[1]), .88, .82); o.d = [k[1]]; break }
    case 'songkran': { const water = pick(['#4CC9F0', '#4895EF', '#90E0EF', '#FFFFFF'], 1, c)[0];
      o.top = G(() => `<circle cx="0" cy="5" r="6" fill="#FFFFFF" stroke="#E9E4D0"/>`);
      o.hang = two(Q.strand('#FFFFFF', '#FFA62B', '#E63946', 40), Q.strand('#FFFFFF', '#FFA62B', '#E63946', 58)); o.d = [water]; break }
    case 'easter': { const k = pick(['#FFADAD', '#FFD6A5', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'], 4, c);
      o.top = G(i => P.egg(k[i % k.length], '#FFFFFF', .55)); o.hang = two(Q.egg(k[0], k[2]), Q.egg(k[1], k[3])); o.d = k.slice(0, 3); break }
    case 'midautumn': { const k = pick(['#E63946', '#FB8500', '#FFB703', '#F72585'], 3, c), gold = '#F2C14E';
      o.top = G(i => `<ellipse cx="0" cy="11" rx="7" ry="8" fill="${k[i % k.length]}"/><path d="M0,19v6" stroke="${gold}" stroke-width="1.8"/>`);
      o.hang = two(Q.paper(k[0], gold), Q.paper(k[1], gold)); o.d = pick(['#FFD166', '#F2C14E', '#FFFFFF'], 1, c); break }
    case 'halloween': { const k = pick(['#FF7518', '#9D4EDD', '#39FF14', '#111111', '#FFFFFF'], 2, c), dark = k[1] === '#FFFFFF' ? '#111' : k[1];
      o.top = G(i => i % 2 ? P.pumpkin(k[0], .5) : `<path d="M-7,4l7,12l7,-12Z" fill="${k[1]}"/>`); o.hang = two(Q.pumpkin(k[0]), Q.spider(dark), .86, 1);
      o.d = pick(['#1A1020', '#2A1A3A', '#FFFFFF', '#9D4EDD'], 1, c); break }
    case 'diwali': { const k = pick(['#FB8500', '#FFB703', '#E63946', '#F72585'], 3, c), clay = pick(['#C1440E', '#E07A3F', '#8C3A1A'], 1, c)[0];
      o.top = G(i => `<circle cx="0" cy="7" r="6.5" fill="${k[i % k.length]}"/><circle cx="0" cy="20" r="5.5" fill="${k[(i + 1) % k.length]}"/>`);
      o.hang = two(Q.diya(clay, '#FFB703'), Q.strand(k[0], k[1], k[2], 48)); o.d = pick(['#FFD166', '#FFB703', '#FFFFFF'], 1, c); break }
    /* ---- 2026-11-23: the seventeen new festivals ---- */
    case 'lantern': { const red = pick(['#D62828', '#E63946', '#F2C14E'], 1, c)[0], gold = red === '#F2C14E' ? '#B5172F' : '#F2C14E';
      o.top = G(i => `<ellipse cx="0" cy="10" rx="7" ry="8" fill="${i % 2 ? gold : red}"/><path d="M0,18v6" stroke="${gold}" stroke-width="1.6"/>`);
      o.hang = two(Q.lantern(red, gold, '元'), Q.lantern(red, gold, '宵'), .74, .74); o.d = pick(['#FF9F1C', '#FFB703', '#E85D04', '#FFFFFF'], 1, c); break }
    case 'duanwu': { const leaf = pick(['#2D6A4F', '#40916C', '#74C69D', '#1B4332'], 1, c)[0], k = pick(['#E63946', '#F2C14E', '#7B2CBF', '#FF8FAB'], 2, c);
      o.top = G(i => i % 2 ? P.zongzi(leaf, k[0], .45) : `<circle cx="0" cy="7" r="4.5" fill="${k[1]}"/>`); o.hang = two(Q.zongzi(leaf, k[0]), Q.sachet(k[0], k[1]), .9, .78); o.d = [leaf]; break }
    case 'qixi': { const k = pick(['#C77DFF', '#FF8FAB', '#90E0EF', '#FFFFFF', '#F2C14E'], 3, c);
      o.top = G(i => i % 3 ? P.star(k[i % k.length], .4) : P.heart(k[0], .35)); o.hang = two(Q.star(k[1]), Q.heart(k[0])); o.d = pick(['#1D1D35', '#3C2A4D', '#FFFFFF'], 1, c); break }
    case 'ramadan': { const k = pick(['#F2C14E', '#E9C46A', '#2A9D8F', '#FFFFFF', '#E76F51'], 3, c);
      o.top = G(i => i % 2 ? P.star(k[0], .5) : `<circle cx="0" cy="6" r="4" fill="${k[1]}"/>`); o.hang = two(Q.fanous(k[0], k[2]), Q.crescent(k[0]), .9, .8); o.d = [k[0]]; break }
    case 'eidadha': { const k = pick(['#1B9E5A', '#F2C14E', '#FFFFFF', '#0B6E4F', '#E9C46A'], 2, c);
      o.top = G(i => i % 2 ? P.star8(k[1], .32) : `<circle cx="0" cy="6" r="4.5" fill="${k[0]}"/>`); o.hang = two(Q.star8(k[1]), Q.crescent(k[1]), 1, .8); o.d = [k[1]]; break }
    case 'vesak': { const k = pick(['#F7B2C4', '#FFD166', '#FFFFFF', '#F28482', '#84A59D'], 3, c);
      o.top = G(i => i % 2 ? P.lotus(k[0], k[2], .35) : `<circle cx="0" cy="6" r="4" fill="${k[1]}"/>`); o.hang = two(Q.lotus(k[0], k[2]), Q.star(k[1])); o.d = [k[0], pick(['#52B788', '#2D6A4F', '#B7E4C7'], 1, c)[0]]; break }
    case 'holi': { const k = pick(['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC', '#06D6A0'], 5, c);
      o.top = G(i => `<circle cx="0" cy="7" r="6" fill="${k[i % k.length]}"/>`); o.hang = two(Q.rosette(k[0], k[2]), Q.rosette(k[1], k[3])); o.d = k.slice(0, 3); break }
    case 'nowruz': { const k = pick(['#E63946', '#F4A261', '#2A9D8F', '#E9C46A', '#8ECAE6', '#FFFFFF'], 4, c), fish = pick(['#FB8500', '#FF6B35', '#E85D04'], 1, c)[0];
      o.top = G(i => P.egg(k[i % k.length], '#FFFFFF', .45)); o.hang = two(Q.goldfish(fish), Q.egg(k[0], k[3])); o.d = pick(['#FFC8DD', '#FFAFCC', '#FFFFFF', '#F28482'], 2, c); break }
    case 'womensday': { const k = pick(['#E0218A', '#FF8FAB', '#9D4EDD', '#FFD166', '#FFFFFF'], 3, c), mim = pick(['#FFD60A', '#FFC300', '#F2C14E'], 1, c)[0];
      o.top = G(i => i % 2 ? P.carnation(k[0], k[1], .4) : `<circle cx="-3" cy="6" r="3.4" fill="${mim}"/><circle cx="3" cy="8" r="3.4" fill="${mim}"/><circle cx="0" cy="2" r="3.4" fill="${mim}"/>`);
      o.hang = two(Q.carnation(k[0], k[1]), Q.heart(k[2])); o.d = [mim]; break }
    case 'stpatricks': { const g = pick(['#1B8A3A', '#2DC653', '#7AE582', '#FFFFFF'], 2, c);
      o.top = G(i => i % 2 ? P.shamrock(g[0], .45) : `<circle cx="0" cy="7" r="4.5" fill="#F2C14E"/>`); o.hang = two(Q.shamrock(g[0]), Q.shamrock(g[1])); o.d = g; break }
    case 'labourday': { const k = pick(['#FFC93C', '#E63946', '#3A86FF', '#FFFFFF', '#8D99AE'], 3, c), stem = pick(['#52B788', '#2D6A4F'], 1, c)[0], bell = pick(['#FFFFFF', '#E9F5DB', '#8D99AE', '#5C677D'], 1, c)[0];
      o.top = G(i => i % 2 ? P.gear(k[i % 3], .32) : `<circle cx="0" cy="6" r="4" fill="${k[0]}"/>`); o.hang = two(Q.gear(k[0]), Q.lily(stem, bell)); o.d = k.slice(0, 2); break }
    case 'mothersday': { const k = pick(['#FF4D6D', '#FF8FA3', '#E0218A', '#FFFFFF', '#FFB3C1'], 3, c);
      o.top = G(i => i % 2 ? P.carnation(k[0], k[1], .38) : P.heart(k[2], .32)); o.hang = two(Q.carnation(k[0], k[2]), Q.heart(k[1])); o.d = k; break }
    case 'fathersday': { const k = pick(['#1D3557', '#457B9D', '#E63946', '#F2C14E', '#FFFFFF'], 3, c);
      o.top = G(i => i % 2 ? P.star(k[2], .4) : `<circle cx="0" cy="6" r="4" fill="${k[1]}"/>`); o.hang = two(Q.tie(k[0], '#FFFFFF'), Q.medal('#F2C14E', k[2])); o.d = pick(['#F2C14E', '#457B9D', '#FFFFFF'], 2, c); break }
    case 'dayofdead': { const k = pick(['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC', '#06D6A0'], 5, c), mari = pick(['#FB8500', '#FFB703'], 1, c)[0];
      o.top = G(i => P.picado(k[i % k.length], .9)); o.hang = two(Q.skull('#FFFFFF', k[0]), Q.marigold(mari, '#E85D04')); o.d = [mari]; break }
    case 'thanksgiving': { const k = pick(['#D00000', '#E85D04', '#FFBA08', '#9D0208', '#FAA307'], 3, c);
      o.top = G(i => P.maple(k[i % k.length], .5)); o.hang = two(Q.gourd(k[1]), Q.maple(k[0]), .8, 1); o.d = k; break }
    case 'shopping': { const k = pick(['#FF4D6D', '#FF7A00', '#FFD60A', '#3A86FF', '#FFFFFF'], 3, c);
      o.top = G(i => i % 2 ? P.tag(k[i % 3], .45) : `<circle cx="0" cy="6" r="4" fill="${k[(i + 1) % 3]}"/>`); o.hang = two(Q.bag(k[0], k[1]), Q.tag(k[2])); o.d = k; break }
    case 'hanukkah': { const k = pick(['#3A86FF', '#4895EF', '#FFFFFF', '#F2C14E', '#90E0EF'], 3, c);
      o.top = G(i => i % 2 ? P.davidStar(k[0], .4) : `<circle cx="0" cy="6" r="4" fill="${k[1]}"/>`); o.hang = two(Q.menorah(k[0], '#FFB703'), Q.dreidel(k[1], k[2]), .62, .9); o.d = pick(['#F2C14E', '#3A86FF', '#FFFFFF'], 2, c); break }
  }
  return o;
}
/* the page: the festival's glow behind the card, things drifting in front (their colour comes from --cf-d0..2, set with each style) */
const V = h => h.replace(/(fill|stroke)="CFD(\d)"/g, 'style="$1:var(--cf-d$2)"');
function pageParts(id, c) {
  const N = c.mob ? 16 : 34, W = c.W, H = c.H; let s = '', dr = '';
  switch (id) {
    case 'xmas': s = ambience(pick(['#E63946', '#2BA84A', '#FFC93C', '#FFFFFF'], 3, c), c);
      dr = drift('down', N, i => i % 4 ? '<i></i>' : V(`<svg viewBox="-10 -10 20 20" width="18" height="18"><path d="M0,-9V9M-8,-4.5L8,4.5M-8,4.5L8,-4.5" stroke="CFD0" stroke-width="1.8" stroke-linecap="round"/></svg>`), W, H); break;
    case 'newyear': { const k = pick(['#FFD166', '#EF476F', '#06D6A0', '#118AB2', '#FFFFFF', '#9B5DE5'], 4, c);
      s = ambience(k, c) + fireworks(k, c, c.mob ? 2 : 4); dr = drift('down', N, i => `<b style="background:var(--cf-d${i % 3})"></b>`, W, H); break }
    case 'cny': { const red = pick(['#D62828', '#E63946', '#F2C14E'], 1, c)[0], gold = red === '#F2C14E' ? '#B5172F' : '#F2C14E';
      s = ambience([red, gold, '#FF6B35'], c) + fireworks([gold, red, '#FFFFFF'], c, c.mob ? 2 : 3);
      dr = drift('down', c.mob ? 12 : 26, () => V(`<svg viewBox="-8 -8 16 16" width="17" height="17"><path d="M0,-7C4,-7 6,-2 0,0C6,2 4,7 0,7C-4,7 -6,2 0,0C-6,-2 -4,-7 0,-7Z" fill="CFD0"/></svg>`), W, H); break }
    case 'valentine': { const k = pick(['#FF4D6D', '#FF8FA3', '#C9184A', '#FFFFFF', '#FFB3C1'], 3, c);
      s = ambience(k, c); dr = drift('up', c.mob ? 12 : 22, i => V(`<svg viewBox="-20 -6 40 38" width="24" height="23">${P.heart('CFD' + (i % 3))}</svg>`), W, H); break }
    case 'raya': { const k = pick(['#1B9E5A', '#F2C14E', '#FFFFFF', '#0B6E4F', '#E9C46A'], 2, c);
      s = ambience([k[0], k[1]], c); dr = drift('down', c.mob ? 10 : 20, () => V(`<svg viewBox="-10 -10 20 20" width="16" height="16">${P.star('CFD0', .6)}</svg>`), W, H); break }
    case 'songkran': s = ambience([pick(['#4CC9F0', '#4895EF', '#90E0EF', '#FFFFFF'], 1, c)[0], '#90E0EF', '#FFFFFF'], c);
      dr = drift('down', c.mob ? 14 : 30, () => V(`<svg viewBox="-6 -10 12 20" width="12" height="20"><path d="M0,-9C3,-3 6,1 6,4A6,6 0 0 1 -6,4C-6,1 -3,-3 0,-9Z" fill="CFD0" opacity=".85"/></svg>`), W, H); break;
    case 'easter': { const k = pick(['#FFADAD', '#FFD6A5', '#CAFFBF', '#9BF6FF', '#A0C4FF', '#BDB2FF', '#FFC6FF'], 4, c);
      s = ambience(k, c); dr = drift('down', c.mob ? 10 : 20, i => V(`<svg viewBox="-8 -8 16 16" width="16" height="16"><circle r="6" fill="CFD${i % 3}"/><circle r="2.4" fill="#FFF3B0"/></svg>`), W, H); break }
    case 'midautumn': s = ambience(pick(['#E63946', '#FB8500', '#FFB703', '#F72585'], 3, c), c) + moon(c);
      dr = drift('down', c.mob ? 12 : 24, () => V(`<svg viewBox="-6 -6 12 12" width="12" height="12"><path d="M0,-5L1.5,-1.5L5,0L1.5,1.5L0,5L-1.5,1.5L-5,0L-1.5,-1.5Z" fill="CFD0"/></svg>`), W, H); break;
    case 'halloween': s = ambience(['#FF7518', '#9D4EDD', '#FF7518'], c, { fog: true });
      dr = drift('across', c.mob ? 5 : 10, () => V(`<svg class="fx-bat" viewBox="-24 -10 48 20" width="40" height="17">${P.bat('CFD0')}</svg>`), W, H); break;
    case 'diwali': { const k = pick(['#FB8500', '#FFB703', '#E63946', '#F72585'], 3, c);
      s = ambience(k, c) + fireworks(k, c, c.mob ? 2 : 3);
      dr = drift('down', c.mob ? 12 : 22, () => V(`<svg viewBox="-8 -8 16 16" width="14" height="14"><path d="M0,-7L2,-2L7,0L2,2L0,7L-2,2L-7,0L-2,-2Z" fill="CFD0"/></svg>`), W, H); break }
    /* ---- 2026-11-23: the seventeen new festivals ---- */
    case 'lantern': { const red = pick(['#D62828', '#E63946', '#F2C14E'], 1, c)[0], gold = red === '#F2C14E' ? '#B5172F' : '#F2C14E';
      s = ambience([red, gold, '#FF9F1C'], c) + moon(c); dr = drift('up', c.mob ? 8 : 14, () => V(`<svg viewBox="-13 -2 26 36" width="20" height="28">${P.sky('CFD0', '#FFE29A')}</svg>`), W, H); break }
    case 'duanwu': s = ambience([pick(['#2D6A4F', '#40916C', '#74C69D'], 1, c)[0], '#E63946', '#95D5B2'], c);
      dr = drift('down', c.mob ? 10 : 20, () => V(`<svg viewBox="-12 -4 24 8" width="26" height="9"><path d="M-11,0C-4,-4 4,-4 11,0C4,4 -4,4 -11,0Z" fill="CFD0"/></svg>`), W, H); break;
    case 'qixi': s = ambience(pick(['#C77DFF', '#FF8FAB', '#90E0EF', '#FFFFFF', '#F2C14E'], 3, c), c);
      dr = drift('across', c.mob ? 4 : 8, () => V(`<svg class="fx-bat" viewBox="-22 -12 44 24" width="40" height="22">${P.magpie('CFD0')}</svg>`), W, H); break;
    case 'ramadan': s = ambience(['#F2C14E', '#E9C46A', '#264653'], c) + moon(c);
      dr = drift('down', c.mob ? 10 : 18, () => V(`<svg viewBox="-8 -8 16 16" width="12" height="12">${P.star('CFD0', .5)}</svg>`), W, H); break;
    case 'eidadha': s = ambience(pick(['#1B9E5A', '#F2C14E', '#FFFFFF', '#0B6E4F'], 2, c), c);
      dr = drift('down', c.mob ? 10 : 18, () => V(`<svg viewBox="-16 -16 32 32" width="13" height="13">${P.star8('CFD0', .8)}</svg>`), W, H); break;
    case 'vesak': s = ambience(['#F7B2C4', '#FFD166', '#FFF3B0'], c);
      dr = drift('up', c.mob ? 8 : 16, i => V(`<svg viewBox="-10 -10 20 20" width="14" height="14"><path d="M0,9C-4,3 -4,-3 0,-9C4,-3 4,3 0,9Z" fill="CFD${i % 2}" opacity=".85"/></svg>`), W, H); break;
    case 'holi': s = ambience(pick(['#FF006E', '#FB5607', '#FFBE0B', '#3A86FF', '#8338EC', '#06D6A0'], 5, c), c);
      dr = drift('up', c.mob ? 12 : 24, i => `<i style="background:var(--cf-d${i % 3});width:13px;height:13px;filter:blur(1.5px)"></i>`, W, H); break;
    case 'nowruz': s = ambience(['#E63946', '#2A9D8F', '#B7E4C7'], c);
      dr = drift('down', c.mob ? 10 : 18, i => V(`<svg viewBox="-8 -8 16 16" width="13" height="13"><circle r="5" fill="CFD${i % 2}"/><circle r="1.8" fill="#FFD166"/></svg>`), W, H); break;
    case 'womensday': s = ambience(['#E0218A', '#FFD60A', '#FF8FAB'], c); dr = drift('down', c.mob ? 12 : 22, () => '<i></i>', W, H); break;
    case 'stpatricks': s = ambience(['#1B8A3A', '#2DC653', '#F2C14E'], c);
      dr = drift('down', c.mob ? 10 : 20, i => V(`<svg viewBox="-16 -16 32 34" width="15" height="16">${P.shamrock('CFD' + (i % 2), .7)}</svg>`), W, H); break;
    case 'labourday': s = ambience(['#FFC93C', '#E63946'], c);
      dr = drift('down', c.mob ? 8 : 16, i => V(`<svg viewBox="-18 -18 36 36" width="15" height="15">${P.gear('CFD' + (i % 2), .8)}</svg>`), W, H); break;
    case 'mothersday': s = ambience(pick(['#FF4D6D', '#FF8FA3', '#E0218A', '#FFFFFF', '#FFB3C1'], 3, c), c);
      dr = drift('up', c.mob ? 10 : 18, i => V(`<svg viewBox="-20 -6 40 38" width="18" height="17">${P.heart('CFD' + (i % 3))}</svg>`), W, H); break;
    case 'fathersday': s = ambience(['#1D3557', '#457B9D', '#F2C14E'], c);
      dr = drift('down', c.mob ? 10 : 18, i => V(`<svg viewBox="-8 -8 16 16" width="12" height="12">${P.star('CFD' + (i % 2), .5)}</svg>`), W, H); break;
    case 'dayofdead': s = ambience(['#FB8500', '#FF006E', '#8338EC'], c); dr = drift('down', c.mob ? 10 : 20, () => '<i></i>', W, H); break;
    case 'thanksgiving': s = ambience(['#D00000', '#E85D04', '#FFBA08'], c);
      dr = drift('down', c.mob ? 12 : 24, i => V(`<svg viewBox="-16 -16 32 38" width="18" height="21">${P.maple('CFD' + (i % 3), .9)}</svg>`), W, H); break;
    case 'shopping': { const k = pick(['#FF4D6D', '#FF7A00', '#FFD60A', '#3A86FF', '#FFFFFF'], 3, c);
      s = ambience(k, c) + fireworks(k, c, c.mob ? 1 : 2); dr = drift('down', N, i => `<b style="background:var(--cf-d${i % 3})"></b>`, W, H); break }
    case 'hanukkah': s = ambience(['#3A86FF', '#F2C14E', '#4895EF'], c);
      dr = drift('down', c.mob ? 10 : 16, i => V(`<svg viewBox="-16 -16 32 32" width="13" height="13">${P.davidStar('CFD' + (i % 2), .8)}</svg>`), W, H); break;
  }
  return { bg: c.back.join('') + s, drift: dr };
}
let T0 = null, PAGE = '';
function renderCard(id, x) {
  if (!document.getElementById('fx-css')) { const s = document.createElement('style'); s.id = 'fx-css'; s.textContent = CSS + '\n' + CCSS; document.head.append(s) }
  if (T0 === null) T0 = performance.now();
  const T = (performance.now() - T0) / 1000, cs = getComputedStyle(x.root), v = (k, d) => cs.getPropertyValue(k).trim() || d;
  const bg = v('--bg', '#0A0A0B'), co = v('--co', '#D9B26B'), tile = v('--tile', bg), light = lum(rgb(bg)) > .45;
  const line = lum(rgb(tile)) > .45 ? 'rgba(40,36,30,.5)' : 'rgba(255,250,240,.5)';
  /* the card: measured in its own layout pixels (it may be tilted or turning, so no screen rectangles here) */
  const f = x.front, fw = f.clientWidth, tp = x.top, mkW = x.mk.clientWidth || 26, mkH = x.mk.clientHeight || 27;
  const gx0 = tp.offsetLeft + x.wm.offsetLeft + x.wm.offsetWidth + 4, gx1 = Math.max(tp.offsetLeft + x.sty.offsetLeft - 4, gx0 + 40);
  SEED = 11;
  const cp = cardParts(id, { fw, gx0, gx1, S: fw / 343 * .95, k: fw / 343 * .46, T, line, fy: x.fy, bg: tile, co });
  let cl = f.querySelector('.cf-card'); if (!cl) { cl = document.createElement('div'); cl.className = 'cf-card'; cl.setAttribute('aria-hidden', 'true'); f.append(cl) }
  cl.style.setProperty('--fx-line', line);
  let hat = '';
  if (cp.hat) {
    const hs = mkW / 30 * .8, hx = tp.offsetLeft + mkW * .13, hy = tp.offsetTop + (tp.offsetHeight - mkH) / 2 + mkH * .12;
    hat = `<div class="cf-hat" style="left:${(hx - 21 * hs).toFixed(1)}px;top:${(hy - 31 * hs).toFixed(1)}px${light ? '' : ';filter:drop-shadow(0 0 1.2px rgba(255,244,228,.9))'}">${cp.hat.replace('width="38" height="34"', `width="${(38 * hs).toFixed(1)}" height="${(34 * hs).toFixed(1)}"`)}</div>`;
  }
  cl.innerHTML = cp.top + cp.hang + hat;
  /* the page: drawn once per festival and screen size; with each style only the drifting things' colour changes */
  let bgL = document.querySelector('.cf-bg'), fgL = document.querySelector('.cf-fg');
  if (!bgL) {
    bgL = document.createElement('div'); bgL.className = 'cf-bg'; bgL.setAttribute('aria-hidden', 'true'); document.body.prepend(bgL);
    fgL = document.createElement('div'); fgL.className = 'cf-fg'; fgL.setAttribute('aria-hidden', 'true'); document.body.append(fgL);
  }
  const key = id + ':' + x.W + 'x' + x.H;
  if (key !== PAGE) {
    PAGE = key; SEED = 29;
    const pp = pageParts(id, { W: x.W, H: x.H, mob: x.mob, light, bg, co, gx0: x.W * .74, gx1: x.W * .9, back: [] });
    bgL.innerHTML = pp.bg; fgL.innerHTML = pp.drift;
  }
  cp.d.forEach((c, i) => fgL.style.setProperty('--cf-d' + i, c));
  return { hang: cl.querySelectorAll('.fx-hang').length, top: !!cl.querySelector('.fx-garland'), hat: !!cl.querySelector('.cf-hat'), drift: fgL.children.length };
}
window.DNCF && window.DNCF({ renderCard });
})();
