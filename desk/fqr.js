/* Dinamics · free scan signs: WhatsApp, Wi-Fi and your website on one sign, with your shop name, logo and opening hours.
   Table card, door sticker or A4 poster, drawn at print resolution: a PDF to print, a picture to share, and each code on its own.
   Everything stays in this browser; the Wi-Fi password is never remembered. */
(() => {
  const { $, h, put, t, tf, copy, toast, store } = window.Desk, DN = window.DN, F = window.Free, Q = window.QR;
  const form = $('#qr-form'), out = $('#qr-out');
  const CC = [['60', 'MY'], ['65', 'SG'], ['66', 'TH'], ['62', 'ID'], ['63', 'PH'], ['84', 'VN'], ['86', 'CN'], ['852', 'HK'], ['853', 'MO'], ['886', 'TW'], ['91', 'IN'], ['61', 'AU'], ['44', 'GB'], ['1', 'US / CA'], ['', '+']];
  const KINDS = ['wa', 'wifi', 'url'];
  // the looks: background, its second tone, words, quieter words, the accent, and the ink of the codes (always dark on their white cards)
  const LOOKS = [
    { id: 'onyx', bg: '#0A0A0B', bg2: '#1A1710', ink: '#F4EEE2', sub: '#B9B0A0', co: '#D9B26B', qr: '#111111' },
    { id: 'paper', bg: '#FFFFFF', bg2: '#F1F1EE', ink: '#121212', sub: '#5A5A5A', co: '#121212', qr: '#121212' },
    { id: 'cafe', bg: '#F3E7D3', bg2: '#E8D5B5', ink: '#3A2716', sub: '#7A6048', co: '#B5522D', qr: '#2E1F12' },
    { id: 'jade', bg: '#0E3B31', bg2: '#145244', ink: '#F1F6EF', sub: '#A9C6B9', co: '#E8C46A', qr: '#0E3B31' },
    { id: 'coral', bg: '#E8452C', bg2: '#F0663F', ink: '#FFFFFF', sub: '#FFE3D6', co: '#FFE9A8', qr: '#1A1A1A' },
    { id: 'ocean', bg: '#0B2A6F', bg2: '#123A92', ink: '#FFFFFF', sub: '#BFD2FF', co: '#7FD3FF', qr: '#0B2A6F' },
  ];
  const SIZES = { tent: [105, 148], door: [150, 150], poster: [210, 297] };   // millimetres: A6 table card, 15 cm square sticker, A4 poster
  const DPI = 300, mmPx = mm => Math.round(mm / 25.4 * DPI);
  const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
  const SERIF = '"Noto Serif SC","Songti SC","STSong",Georgia,serif';
  // what you typed last time (never the Wi-Fi password), on this device only; the single-code tool before this one is read once
  const old = store.get('dn-free-qr', null), saved = store.get('dn-free-sign', null) || (old ? { on: { wa: old.mode !== 'wifi' && old.mode !== 'url', wifi: old.mode === 'wifi', url: old.mode === 'url' }, cc: old.cc, num: old.num, msg: old.msg, link: old.link, ssid: old.ssid, enc: old.enc } : {});
  const S = { on: { wa: true, wifi: false, url: false }, cc: '60', num: '', msg: null, link: '', ssid: '', pass: '', enc: 'WPA', showPass: true,
    shop: '', tag: '', hours: '', look: 'onyx', size: 'tent', shape: 'square', cap: {}, ...saved, pass: '' };
  S.on = { wa: !!(S.on || {}).wa, wifi: !!(S.on || {}).wifi, url: !!(S.on || {}).url }; if (!KINDS.some(k => S.on[k])) S.on.wa = true;
  if (!LOOKS.some(l => l.id === S.look)) S.look = 'onyx'; if (!SIZES[S.size]) S.size = 'tent';
  let logo = null, timer = 0, last = null;
  const keep = () => { const { pass, ...rest } = S; store.set('dn-free-sign', rest); };
  const kinds = () => KINDS.filter(k => S.on[k]);
  const look = () => LOOKS.find(l => l.id === S.look);
  const capOf = k => (S.cap[k] ?? t('cap_' + k)).trim();
  const bytes = s => new TextEncoder().encode(s).length;
  const esc = s => s.replace(/([\\;,:"])/g, '\\$1');

  // ---- what goes into each code ----
  function payload(k) {
    if (k === 'wa') {
      let d = S.num.replace(/\D/g, ''), zero = false;
      if (S.cc && d.startsWith('0')) { d = d.replace(/^0+/, ''); zero = true; }   // 012 345 6789 → +60 12 345 6789
      d = S.cc + d;
      if (d.length < 8 || d.length > 15) return { err: 'e_wa', field: 'num' };
      const m = (S.msg ?? t('msg_def')).trim();
      return { text: 'https://wa.me/' + d + (m ? '?text=' + encodeURIComponent(m) : ''), link: true, zero };
    }
    if (k === 'url') {
      let s = S.link.trim(); if (!s) return { err: 'e_link', field: 'link' };
      if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
      try { const u = new URL(s); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw 0; return { text: u.href, link: true }; } catch (e) { return { err: 'e_link', field: 'link' }; }
    }
    if (!S.ssid.trim()) return { err: 'e_ssid', field: 'ssid' };
    return { text: `WIFI:T:${S.enc === 'nopass' ? 'nopass' : S.enc};S:${esc(S.ssid)};${S.enc === 'nopass' ? '' : 'P:' + esc(S.pass) + ';'};` };
  }
  const midOf = k => (k === 'url' ? (logo ? 'logo' : 'none') : 'icon');   // WhatsApp and Wi-Fi carry their sign; the website code carries your logo if you have one

  // ---- one code: its modules on whole pixels, a white space in the middle for the sign or logo ----
  function cells(text, k, size) {
    const mid = midOf(k), M = Q.matrix(text, { ecl: mid === 'none' ? 'M' : 'H' }), n = M.length, px = Math.floor(size / (n + 4)), off = Math.round((size - px * n) / 2);
    const box = mid === 'none' ? 0 : Math.round(n * 0.24) * px, b0 = size / 2 - box / 2 - px * 0.6, b1 = size / 2 + box / 2 + px * 0.6;
    const hole = (x, y) => box && x + px > b0 && x < b1 && y + px > b0 && y < b1;
    const eye = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    const C = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (M[y][x] && !(S.shape === 'dot' && eye(x, y)) && !hole(off + x * px, off + y * px)) C.push([off + x * px, off + y * px]);
    const eyes = S.shape === 'dot' ? [[0, 0], [n - 7, 0], [0, n - 7]].map(([x, y]) => [off + x * px, off + y * px]) : [];
    return { n, px, size, cells: C, eyes, box, mid };
  }
  const rr = (c, x, y, w, hh, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, hh, r) : c.rect(x, y, w, hh); };
  const WA_BUBBLE = 'M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.2A9.4 9.4 0 1 0 12 2.6z';
  const WA_PHONE = 'M8.9 7.1c.3 0 .6 0 .8.6l.9 2.2c.1.3 0 .6-.1.8l-.7.8c-.1.2-.2.4 0 .7a8.2 8.2 0 0 0 3.5 3.2c.2.1.5.1.7-.1l.8-.9c.2-.2.5-.3.8-.2l2.1 1c.3.1.5.4.4.8-.2 1.3-1.3 2.2-2.6 2.1-4.1-.4-7.4-3.7-7.8-7.8-.1-1.3.8-2.4 1.9-2.6z';
  // the small signs: WhatsApp, Wi-Fi, a globe; drawn in a box of size s at x, y
  function icon(c, k, x, y, s, ink) {
    if (k === 'wa') { c.fillStyle = '#25D366'; rr(c, x, y, s, s, s * 0.22); c.fill(); c.save(); c.translate(x + s * 0.17, y + s * 0.17); c.scale(s * 0.66 / 24, s * 0.66 / 24); c.fillStyle = '#fff'; c.fill(new Path2D(WA_BUBBLE)); c.fillStyle = '#25D366'; c.fill(new Path2D(WA_PHONE)); c.restore(); return; }
    c.fillStyle = ink; rr(c, x, y, s, s, s * 0.22); c.fill(); c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineWidth = s * 0.085;
    if (k === 'wifi') { for (const r of [0.36, 0.25, 0.14]) { c.beginPath(); c.arc(x + s / 2, y + s * 0.74, s * r, Math.PI * 1.22, Math.PI * 1.78); c.stroke(); } c.fillStyle = '#fff'; c.beginPath(); c.arc(x + s / 2, y + s * 0.74, s * 0.055, 0, 7); c.fill(); return; }
    const cx = x + s / 2, cy = y + s / 2, r = s * 0.3; c.lineWidth = s * 0.07;
    c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); c.beginPath(); c.ellipse(cx, cy, r * 0.45, r, 0, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(cx - r, cy); c.lineTo(cx + r, cy); c.stroke();
  }
  function drawCode(c, P, x0, y0, k, ink) {
    const px = P.px; c.fillStyle = ink;
    if (S.shape === 'dot') {
      for (const [x, y] of P.cells) { c.beginPath(); c.arc(x0 + x + px / 2, y0 + y + px / 2, px * 0.46, 0, 7); c.fill(); }
      for (const [x, y] of P.eyes) {
        c.fillStyle = ink; rr(c, x0 + x, y0 + y, 7 * px, 7 * px, px * 2); c.fill();
        c.fillStyle = '#fff'; rr(c, x0 + x + px, y0 + y + px, 5 * px, 5 * px, px * 1.35); c.fill();
        c.fillStyle = ink; rr(c, x0 + x + 2 * px, y0 + y + 2 * px, 3 * px, 3 * px, px * 0.9); c.fill();
      }
    } else for (const [x, y] of P.cells) c.fillRect(x0 + x, y0 + y, px, px);
    if (!P.box) return;
    const pad = px * 0.6, x = x0 + P.size / 2 - P.box / 2, y = y0 + P.size / 2 - P.box / 2, s = P.box;
    c.fillStyle = '#fff'; rr(c, x - pad, y - pad, s + pad * 2, s + pad * 2, s * 0.22); c.fill();
    if (P.mid === 'logo' && logo) { const q = Math.min(s / logo.img.naturalWidth, s / logo.img.naturalHeight), w = logo.img.naturalWidth * q, hh = logo.img.naturalHeight * q; c.save(); rr(c, x, y, s, s, s * 0.18); c.clip(); c.drawImage(logo.img, x + (s - w) / 2, y + (s - hh) / 2, w, hh); c.restore(); return; }
    icon(c, k, x, y, s, ink);
  }
  // fit words into a width: shrink to a floor, then cut with an ellipsis
  function fitText(c, s, maxW, z, min, weight, face) {
    const set = q => (c.font = `${weight} ${q}px ${face}`);
    for (set(z); c.measureText(s).width > maxW && z > min; z -= 2) set(z - 2);
    if (c.measureText(s).width > maxW) { while (s.length > 1 && c.measureText(s + '…').width > maxW) s = s.slice(0, -1); s += '…'; }
    return { s, z };
  }

  // ---- the sign ----
  function sign(codes) {
    const [wmm, hmm] = SIZES[S.size], W = mmPx(wmm), H = mmPx(hmm), L = look(), u = W / 100, tall = H > W * 1.1;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = L.bg; c.fillRect(0, 0, W, H);
    const g = c.createRadialGradient(W * 0.5, H * 0.08, 0, W * 0.5, H * 0.08, Math.max(W, H) * 0.75); g.addColorStop(0, L.bg2); g.addColorStop(1, L.bg); c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.strokeStyle = L.co; c.globalAlpha = 0.55; c.lineWidth = Math.max(2, u * 0.32); rr(c, u * 3.2, u * 3.2, W - u * 6.4, H - u * 6.4, u * 3); c.stroke(); c.globalAlpha = 1;
    c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    // the top: logo, shop name, one line
    let y = tall ? u * 10 : u * 8.5;
    const shop = S.shop.trim(), tag = S.tag.trim(), hours = S.hours.split('\n').map(s => s.trim()).filter(Boolean).slice(0, 3);
    if (logo) {
      const s = u * (tall ? 17 : 13), x = W / 2 - s / 2, q = Math.min((s * 0.82) / logo.img.naturalWidth, (s * 0.82) / logo.img.naturalHeight), w = logo.img.naturalWidth * q, hh = logo.img.naturalHeight * q;
      c.save(); c.shadowColor = 'rgba(0,0,0,.18)'; c.shadowBlur = u * 1.6; c.fillStyle = '#fff'; rr(c, x, y, s, s, s * 0.22); c.fill(); c.restore();
      c.drawImage(logo.img, W / 2 - w / 2, y + s / 2 - hh / 2, w, hh); y += s + u * (tall ? 5.5 : 4);
    }
    if (shop) { const f = fitText(c, shop, W - u * 16, u * (tall ? 10 : 8), u * 4.5, 900, SERIF); c.fillStyle = L.ink; c.fillText(f.s, W / 2, y + f.z * 0.82); y += f.z * 1.12; }
    if (tag) { const f = fitText(c, tag, W - u * 18, u * (tall ? 4.2 : 3.4), u * 2.4, 600, SANS); c.fillStyle = L.co; c.fillText(f.s, W / 2, y + f.z * 1.15); y += f.z * 1.6; }
    if (shop || tag || logo) y += u * (tall ? 4 : 3);
    // the bottom: opening hours and a small mark
    const markZ = u * 1.7, hz = u * (tall ? 3.3 : 2.7);
    let foot = H - u * 6.2 - markZ;
    c.font = `500 ${markZ}px ${SANS}`; c.fillStyle = L.sub; c.globalAlpha = 0.75; c.fillText('dinamics.dev/free', W / 2, H - u * 5.2); c.globalAlpha = 1;
    if (hours.length) {
      foot -= hours.length * hz * 1.42 + u * 1.5;
      hours.forEach((ln, i) => { const f = fitText(c, ln, W - u * 18, hz, u * 1.9, 600, SANS); c.fillStyle = L.sub; c.fillText(f.s, W / 2, foot + u * 1.5 + hz * 1.42 * (i + 0.8)); });
    }
    // the codes on white cards, as big as the space allows: in one row, or in two rows (one, then two) when that makes them bigger
    const n = codes.length, gap = u * 4, wifi = codes.some(x => x.k === 'wifi' && S.showPass), extra = 0.17 + (wifi ? 0.17 : 0);
    const areaT = y, areaB = foot - u * 2, AW = W - u * 14, AH = areaB - areaT, most = u * (n === 1 ? 62 : 60);
    let best = null;
    for (const rows of n === 1 ? [[1]] : n === 2 ? [[2], [1, 1]] : [[3], [1, 2]]) {
      const cols = Math.max(...rows), tw = Math.min((AW - gap * (cols - 1)) / cols, (AH - gap * (rows.length - 1)) / rows.length / (1 + extra), most);
      if (!best || tw > best.tw + 1) best = { rows, tw };
    }
    const tw = best.tw, th = tw * (1 + extra), p = tw * 0.07, blockH = best.rows.length * th + (best.rows.length - 1) * gap, at = [];
    best.rows.forEach((m, r) => { for (let i = 0; i < m; i++) at.push([W / 2 - (tw * m + gap * (m - 1)) / 2 + i * (tw + gap), areaT + Math.max(0, (AH - blockH) / 2) + r * (th + gap)]); });
    codes.forEach(({ k, text }, i) => {
      const [x, y0] = at[i];
      c.save(); c.shadowColor = 'rgba(0,0,0,.22)'; c.shadowBlur = u * 2; c.shadowOffsetY = u * 0.5; c.fillStyle = '#fff'; rr(c, x, y0, tw, th, tw * 0.07); c.fill(); c.restore();
      const qs = tw - p * 2, P = cells(text, k, Math.round(qs)); drawCode(c, P, Math.round(x + p), Math.round(y0 + p), k, L.qr);
      // the words under it: its sign and what it is for
      const ly = y0 + p + qs + tw * 0.09, isz = tw * 0.085;
      const f = fitText(c, capOf(k) || t('m_' + k), tw - p * 2 - isz * 1.4, tw * 0.075, tw * 0.045, 800, SANS);
      c.textAlign = 'left'; const lw = isz + tw * 0.03 + c.measureText(f.s).width, lx = x + tw / 2 - lw / 2;
      icon(c, k, lx, ly - isz * 0.82, isz, L.qr); c.fillStyle = L.qr; c.fillText(f.s, lx + isz + tw * 0.03, ly); c.textAlign = 'center';
      if (k === 'wifi' && S.showPass) {
        const rows = [`${t('wf_name')} ${S.ssid.trim()}`].concat(S.enc !== 'nopass' && S.pass ? [`${t('wf_pass')} ${S.pass}`] : []);
        rows.forEach((r, j) => { const q = fitText(c, r, tw - p * 2, tw * 0.055, tw * 0.035, 600, SANS); c.fillStyle = '#555'; c.fillText(q.s, x + tw / 2, ly + tw * (0.085 + j * 0.07)); });
      }
    });
    return cv;
  }

  // ---- one code alone, as a picture and as SVG (the words under it in the code's colour) ----
  function single(k, text) {
    const W = 1200, P = cells(text, k, W), cap = capOf(k), capH = cap ? 190 : 0, ink = '#111111';
    const cv = document.createElement('canvas'); cv.width = W; cv.height = W + capH; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, W + capH); drawCode(c, P, 0, 0, k, ink);
    if (capH) { const f = fitText(c, cap, W - 120, 72, 28, 800, SANS); c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(f.s, W / 2, W + capH / 2 - 20); }
    const px = P.px, fx = v => +v.toFixed(2);
    let d = S.shape === 'dot' ? P.cells.map(([x, y]) => `<circle cx="${fx(x + px / 2)}" cy="${fx(y + px / 2)}" r="${fx(px * 0.46)}"/>`).join('') : `<path d="${P.cells.map(([x, y]) => `M${x} ${y}h${px}v${px}h-${px}z`).join('')}"/>`;
    d += P.eyes.map(([x, y]) => `<rect x="${x}" y="${y}" width="${7 * px}" height="${7 * px}" rx="${2 * px}"/><rect x="${x + px}" y="${y + px}" width="${5 * px}" height="${5 * px}" rx="${fx(1.35 * px)}" fill="#fff"/><rect x="${x + 2 * px}" y="${y + 2 * px}" width="${3 * px}" height="${3 * px}" rx="${fx(0.9 * px)}"/>`).join('');
    let mid = '';
    if (P.box) {   // the middle as a picture of itself, so the SVG matches the PNG exactly
      const pad = Math.ceil(px * 0.6) + 2, s = P.box + pad * 2, x = W / 2 - s / 2, m = document.createElement('canvas'); m.width = m.height = s;
      m.getContext('2d').drawImage(cv, x, x, s, s, 0, 0, s, s); mid = `<image href="${m.toDataURL('image/png')}" x="${fx(x)}" y="${fx(x)}" width="${s}" height="${s}"/>`;
    }
    const capS = capH ? `<text x="${W / 2}" y="${W + capH / 2 - 20}" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system,'Segoe UI','PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-weight="800" font-size="64" fill="${ink}">${cap.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>` : '';
    return { cv, svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W + capH}" width="${W}" height="${W + capH}"><rect width="${W}" height="${W + capH}" fill="#fff"/><g fill="${ink}">${d}</g>${mid}${capS}</svg>` };
  }

  // ---- a PDF of the sign at its real size (one page, the picture as JPEG) ----
  function pdfOf(cv, wmm, hmm) {
    const jpg = atob(cv.toDataURL('image/jpeg', 0.95).split(',')[1]), W = (wmm * 72 / 25.4).toFixed(2), H = (hmm * 72 / 25.4).toFixed(2), body = `q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
    const objs = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`,
      `<< /Type /XObject /Subtype /Image /Width ${cv.width} /Height ${cv.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpg.length} >>\nstream\n${jpg}\nendstream`,
      `<< /Length ${body.length} >>\nstream\n${body}\nendstream`];
    let s = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'; const at = [];
    objs.forEach((o, i) => { at.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
    const x = s.length; s += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + at.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
    s += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${x}\n%%EOF\n`;
    return new Blob([Uint8Array.from(s, ch => ch.charCodeAt(0) & 255)], { type: 'application/pdf' });
  }

  // ---- the form ----
  const tabs = (items, cur, pick) => h('div', { cls: 'fr-tabs', role: 'group' }, items.map(([v, k]) => h('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => pick(v) }, t(k))));
  const fld = (k, el, opt) => h('label', { cls: 'fld' }, h('span', {}, t(k), opt ? h('i', {}, ' ' + t('opt')) : null), el);
  const inp = (name, attrs = {}) => { const e = h(attrs.tag || 'input', { name, ...attrs, tag: null }); e.value = S[name] ?? ''; e.addEventListener('input', () => { S[name] = e.value; changed(); }); return e; };
  const capIn = k => { const e = h('input', { name: 'cap_' + k, maxlength: 30 }); e.value = S.cap[k] ?? t('cap_' + k); e.addEventListener('input', () => { S.cap[k] = e.value; changed(); }); return fld('f_cap', e, true); };
  function drawForm() {
    const L = [];
    L.push(h('div', { cls: 'fld' }, h('span', {}, t('f_codes')), h('div', { cls: 'fr-tabs fr-kinds', role: 'group' }, KINDS.map(k => h('button', { type: 'button', 'aria-pressed': String(S.on[k]), onclick: () => {
      if (S.on[k] && kinds().length === 1) { toast(t('e_one')); return; }
      S.on[k] = !S.on[k]; keep(); drawForm(); changed(true); } }, t('m_' + k)))), h('p', { cls: 'fr-hint' }, t('codes_hint'))));
    if (S.on.wa) {
      const cc = h('select', { name: 'cc', 'aria-label': t('f_cc') }, CC.map(([c, n]) => h('option', { value: c }, c ? `+${c} ${n}` : '+ …')));
      cc.value = S.cc; cc.addEventListener('change', () => { S.cc = cc.value; changed(); });
      const m = h('textarea', { name: 'msg', rows: 2, maxlength: 300 }); m.value = S.msg ?? t('msg_def'); m.addEventListener('input', () => { S.msg = m.value; changed(); });
      L.push(h('fieldset', { cls: 'fr-set' }, h('legend', {}, t('m_wa')), h('div', { cls: 'fr-ccrow' }, fld('f_cc', cc), fld('f_wa', inp('num', { type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', placeholder: t('wa_ph'), maxlength: 24 }))), fld('f_msg', m, true), capIn('wa')));
    }
    if (S.on.wifi) {
      const enc = h('select', { name: 'enc' }, [['WPA', 'enc_wpa'], ['WEP', 'enc_wep'], ['nopass', 'enc_none']].map(([v, k]) => h('option', { value: v }, t(k))));
      enc.value = S.enc; enc.addEventListener('change', () => { S.enc = enc.value; drawForm(); changed(); });
      const show = h('input', { type: 'checkbox', name: 'showPass' }); show.checked = !!S.showPass; show.addEventListener('change', () => { S.showPass = show.checked; changed(true); });
      L.push(h('fieldset', { cls: 'fr-set' }, h('legend', {}, t('m_wifi')), fld('f_ssid', inp('ssid', { maxlength: 64, autocapitalize: 'off', spellcheck: 'false' })),
        h('div', { cls: 'two' }, S.enc === 'nopass' ? null : fld('f_pass', inp('pass', { type: 'text', maxlength: 64, autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off' })), fld('f_enc', enc)),
        h('label', { cls: 'fr-check' }, show, h('span', {}, t('wf_show'))), capIn('wifi')));
    }
    if (S.on.url) L.push(h('fieldset', { cls: 'fr-set' }, h('legend', {}, t('m_url')), fld('f_link', inp('link', { type: 'text', inputmode: 'url', autocapitalize: 'off', spellcheck: 'false', placeholder: t('link_ph'), maxlength: 600 })), capIn('url')));
    // the sign: name, one line, logo, hours
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      try { logo = await F.readImage(file.files[0], 900); drawForm(); changed(); } catch (e) { toast(t(e.message === 'size' ? 'e_img_size' : e.message === 'type' ? 'e_img_type' : 'e_img_read')); } file.value = ''; } });
    L.push(h('fieldset', { cls: 'fr-set' }, h('legend', {}, t('f_sign')),
      fld('f_shop', inp('shop', { maxlength: 40, placeholder: t('shop_ph') }), true),
      fld('f_tag', inp('tag', { maxlength: 50, placeholder: t('tag_ph') }), true),
      h('div', { cls: 'fld' }, h('span', {}, t('logo'), h('i', {}, ' ' + t('opt'))),
        h('div', { cls: 'fr-row' }, logo ? h('img', { cls: 'fr-thumb', src: logo.url, alt: '' }) : null,
          h('button', { type: 'button', cls: 'btn ghost', onclick: () => file.click() }, t(logo ? 'logo_drop' : 'logo_pick')),
          logo ? h('button', { type: 'button', cls: 'fr-link', onclick: () => { logo = null; drawForm(); changed(); } }, t('logo_del')) : null, file),
        h('p', { cls: 'fr-hint' }, t('logo_note'))),
      fld('f_hours', inp('hours', { tag: 'textarea', rows: 2, maxlength: 120, placeholder: t('hours_ph') }), true)));
    L.push(h('div', { cls: 'fld' }, h('span', {}, t('f_look')), h('div', { cls: 'fr-swatches', role: 'group' }, LOOKS.map(l => h('button', { type: 'button', cls: 'fr-swatch', style: `background:linear-gradient(135deg,${l.bg} 50%,${l.co} 50%)`, 'aria-label': t('lk_' + l.id), title: t('lk_' + l.id), 'aria-pressed': String(l.id === S.look), onclick: () => { S.look = l.id; keep(); drawForm(); changed(true); } }))), h('p', { cls: 'fr-hint' }, t('lk_' + S.look))));
    L.push(h('div', { cls: 'fld' }, h('span', {}, t('f_size')), tabs([['tent', 'sz_tent'], ['door', 'sz_door'], ['poster', 'sz_poster']], S.size, v => { S.size = v; keep(); drawForm(); changed(true); })));
    L.push(h('div', { cls: 'fld' }, h('span', {}, t('f_shape')), tabs([['square', 'sh_square'], ['dot', 'sh_dot']], S.shape, v => { S.shape = v; keep(); drawForm(); changed(true); })));
    put(form, L);
  }

  // ---- the result ----
  let gen = 0;
  function changed(now) { clearTimeout(timer); timer = setTimeout(() => { keep(); draw(); }, now ? 0 : 160); }
  async function draw() {
    const my = ++gen;
    form.querySelectorAll('.fld').forEach(f => f.removeAttribute('aria-invalid'));
    const ks = kinds(), P = ks.map(k => ({ k, ...payload(k) })), bad = P.find(x => x.err);
    if (bad) {
      const el = form.querySelector(`[name="${bad.field}"]`), show = el && el.value.trim();   // an empty field is not an error until you've typed something
      if (show) el.closest('.fld').setAttribute('aria-invalid', 'true');
      last = null; put(out, h('div', { cls: 'fr-sign fr-qrph' }, h('p', {}, show ? t(bad.err) : t('ph_fill'))));
      return;
    }
    const lim = x => Q.maxBytes(midOf(x.k) === 'none' ? 'M' : 'H'), long = P.find(x => bytes(x.text) > lim(x));
    if (long) { put(out, h('p', { cls: 'dk-msg bad' }, tf('e_long', { n: lim(long), m: bytes(long.text) }))); last = null; return; }
    try { await Promise.race([document.fonts.load(`900 100px "Noto Serif SC"`, S.shop || '店'), new Promise(r => setTimeout(r, 1500))]); } catch (e) {}
    if (my !== gen) return;
    const cv = sign(P), key = JSON.stringify(P.map(x => x.text)); last = { cv, key };
    const img = h('img', { cls: 'fr-signimg', src: cv.toDataURL('image/png'), alt: [S.shop, ...P.map(x => capOf(x.k))].filter(Boolean).join(' · ') });
    const sname = `scan-sign-${S.size}`, [wmm, hmm] = SIZES[S.size];
    const acts = h('div', { cls: 'fr-btns' },
      h('button', { type: 'button', cls: 'btn', onclick: () => { F.download(pdfOf(cv, wmm, hmm), sname + '.pdf'); F.use('use'); } }, t('dl_pdf')),
      h('button', { type: 'button', cls: 'btn ghost', onclick: async () => { F.download(await F.canvasBlob(cv), sname + '.png'); F.use('use'); } }, t('dl_png')),
      F.canShareFiles() ? h('button', { type: 'button', cls: 'btn ghost', onclick: async () => { const r = await F.sendFile(await F.canvasBlob(cv), sname + '.png'); if (r !== 'cancel') F.use('use'); } }, t('share')) : null);
    const one = P.map(x => { const sg = single(x.k, x.text); return h('div', { cls: 'fr-one' }, h('b', {}, t('m_' + x.k)),
      h('button', { type: 'button', cls: 'fr-link', 'aria-label': t('m_' + x.k) + ' PNG', onclick: async () => { F.download(await F.canvasBlob(sg.cv), `qr-${x.k}.png`); F.use('use'); } }, 'PNG'),
      h('button', { type: 'button', cls: 'fr-link', 'aria-label': t('m_' + x.k) + ' SVG', onclick: () => { F.download(new Blob([sg.svg], { type: 'image/svg+xml' }), `qr-${x.k}.svg`); F.use('use'); } }, 'SVG')); });
    const wa = P.find(x => x.k === 'wa'), link = wa ? h('div', { cls: 'fr-linkbox' }, h('p', { cls: 'fr-lbl' }, t('wa_link')), h('code', {}, wa.text),
      h('div', { cls: 'fr-btns' }, h('button', { type: 'button', cls: 'btn ghost', onclick: () => { copy(wa.text); F.use('use'); } }, t('copy_link')), h('a', { cls: 'btn ghost', href: wa.text, target: '_blank', rel: 'noopener' }, t('test_open'))),
      wa.zero ? h('p', { cls: 'fr-hint' }, t('zero_tip')) : null) : null;
    const ok = h('p', { cls: 'fr-hint fr-ok', hidden: true }, '✓ ' + t('self_ok'));
    put(out, h('div', { cls: 'fr-sign' + (S.size === 'door' ? ' fr-sq' : '') }, img), acts, ok, h('p', { cls: 'fr-hint' }, t('size_tip_' + S.size)),
      h('div', { cls: 'fr-ones' }, h('p', { cls: 'fr-lbl' }, t('one_h')), one), link);
    selfCheck(cv, P.map(x => x.text), key, ok);
  }
  // where the browser can read QR codes itself, read every code on the sign back once
  async function selfCheck(cv, texts, key, el) {
    if (!('BarcodeDetector' in window)) return;
    try { const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(cv), got = r.map(x => x.rawValue); if (texts.every(x => got.includes(x)) && last && last.key === key) el.hidden = false; } catch (e) {}
  }
  DN.on(() => { drawForm(); draw(); put($('#qr-up'), F.upsell('qr')); });
})();
