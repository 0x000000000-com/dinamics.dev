/* Dinamics · free QR codes: one scan to WhatsApp, a link, some text or the Wi-Fi; a logo in the middle; PNG and SVG. Everything stays in this browser. */
(() => {
  const { $, h, put, t, tf, copy, toast, store } = window.Desk, DN = window.DN, F = window.Free, Q = window.QR;
  const form = $('#qr-form'), out = $('#qr-out');
  const CC = [['60', 'MY'], ['65', 'SG'], ['66', 'TH'], ['62', 'ID'], ['63', 'PH'], ['84', 'VN'], ['86', 'CN'], ['852', 'HK'], ['853', 'MO'], ['886', 'TW'], ['91', 'IN'], ['61', 'AU'], ['44', 'GB'], ['1', 'US / CA'], ['', '+']];
  const COLORS = ['#111111', '#0B1F55', '#0F5E3A', '#7A1020', '#4A1D7A', '#6B4A12'];
  const MODES = ['wa', 'url', 'text', 'wifi'];
  const saved = store.get('dn-free-qr', {});   // what you typed last time (never the Wi-Fi password), on this device only
  const S = { mode: 'wa', cc: '60', num: '', msg: null, link: '', text: '', ssid: '', pass: '', enc: 'WPA', color: COLORS[0], shape: 'square', mid: null, cap: {}, ...saved, pass: '' };
  if (!MODES.includes(S.mode)) S.mode = 'wa';
  let logo = null, timer = 0, last = null;
  const keep = () => { const { pass, ...rest } = S; store.set('dn-free-qr', rest); };
  const hasIcon = () => S.mode === 'wa' || S.mode === 'wifi';
  const midOf = () => { let m = S.mid ?? (hasIcon() ? 'icon' : 'none'); if (m === 'icon' && !hasIcon()) m = 'none'; if (m === 'logo' && !logo) m = hasIcon() ? 'icon' : 'none'; return m; };
  const capOf = () => S.cap[S.mode] ?? t('cap_' + S.mode);
  const bytes = s => new TextEncoder().encode(s).length;
  const esc = s => s.replace(/([\\;,:"])/g, '\\$1');

  // what goes into the code
  function payload() {
    if (S.mode === 'wa') {
      let d = S.num.replace(/\D/g, ''), zero = false;
      if (S.cc && d.startsWith('0')) { d = d.replace(/^0+/, ''); zero = true; }   // 012 345 6789 → +60 12 345 6789
      d = S.cc + d;
      if (d.length < 8 || d.length > 15) return { err: 'e_wa', field: 'num' };
      const m = (S.msg ?? t('msg_def')).trim();
      return { text: 'https://wa.me/' + d + (m ? '?text=' + encodeURIComponent(m) : ''), link: true, zero };
    }
    if (S.mode === 'url') {
      let s = S.link.trim(); if (!s) return { err: 'e_link', field: 'link' };
      if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s;
      try { const u = new URL(s); if (!/^https?:$/.test(u.protocol) || !u.hostname.includes('.')) throw 0; return { text: u.href, link: true }; } catch (e) { return { err: 'e_link', field: 'link' }; }
    }
    if (S.mode === 'text') return S.text.trim() ? { text: S.text } : { err: 'e_text', field: 'text' };
    if (!S.ssid.trim()) return { err: 'e_ssid', field: 'ssid' };
    return { text: `WIFI:T:${S.enc === 'nopass' ? 'nopass' : S.enc};S:${esc(S.ssid)};${S.enc === 'nopass' ? '' : 'P:' + esc(S.pass) + ';'};` };
  }

  // ---- drawing: the same shapes for the picture and the SVG ----
  function plan(text) {
    const mid = midOf(), ecl = mid === 'none' ? 'M' : 'H';
    const M = Q.matrix(text, { ecl }), n = M.length, W = 1200, px = Math.floor(W / (n + 8)), off = (W - px * n) / 2;
    const capH = capOf().trim() ? 190 : 0, box = mid === 'none' ? 0 : Math.round(n * px * 0.24 / px) * px, b0 = W / 2 - box / 2 - px * 0.6, b1 = W / 2 + box / 2 + px * 0.6;
    const hole = (x, y) => box && x + px > b0 && x < b1 && y + px > b0 && y < b1;
    const eye = (x, y) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
    const cells = [];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (M[y][x] && !(S.shape === 'dot' && eye(x, y)) && !hole(off + x * px, off + y * px)) cells.push([off + x * px, off + y * px]);
    const eyes = S.shape === 'dot' ? [[0, 0], [n - 7, 0], [0, n - 7]].map(([x, y]) => [off + x * px, off + y * px]) : [];
    return { n, px, off, W, H: W + capH, capH, cells, eyes, box, b0, mid, ecl };
  }
  const rr = (c, x, y, w, hh, r) => { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, hh, r) : c.rect(x, y, w, hh); };
  const WA_BUBBLE = 'M12 2.6a9.4 9.4 0 0 0-8.1 14.2L2.6 21.4l4.7-1.2A9.4 9.4 0 1 0 12 2.6z';
  const WA_PHONE = 'M8.9 7.1c.3 0 .6 0 .8.6l.9 2.2c.1.3 0 .6-.1.8l-.7.8c-.1.2-.2.4 0 .7a8.2 8.2 0 0 0 3.5 3.2c.2.1.5.1.7-.1l.8-.9c.2-.2.5-.3.8-.2l2.1 1c.3.1.5.4.4.8-.2 1.3-1.3 2.2-2.6 2.1-4.1-.4-7.4-3.7-7.8-7.8-.1-1.3.8-2.4 1.9-2.6z';
  function drawMid(c, P) {
    if (!P.box) return;
    const pad = P.px * 0.6, x = P.W / 2 - P.box / 2, y = P.W / 2 - P.box / 2, s = P.box;
    c.fillStyle = '#fff'; rr(c, x - pad, y - pad, s + pad * 2, s + pad * 2, s * 0.22); c.fill();
    if (P.mid === 'logo' && logo) {
      const k = Math.min(s / logo.img.naturalWidth, s / logo.img.naturalHeight), w = logo.img.naturalWidth * k, hh = logo.img.naturalHeight * k;
      c.save(); rr(c, x, y, s, s, s * 0.18); c.clip(); c.drawImage(logo.img, x + (s - w) / 2, y + (s - hh) / 2, w, hh); c.restore(); return;
    }
    if (S.mode === 'wifi') {
      c.fillStyle = S.color; rr(c, x, y, s, s, s * 0.22); c.fill();
      c.strokeStyle = '#fff'; c.lineCap = 'round'; c.lineWidth = s * 0.085;
      for (const r of [0.36, 0.25, 0.14]) { c.beginPath(); c.arc(x + s / 2, y + s * 0.74, s * r, Math.PI * 1.22, Math.PI * 1.78); c.stroke(); }
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + s / 2, y + s * 0.74, s * 0.055, 0, 7); c.fill(); return;
    }
    c.fillStyle = '#25D366'; rr(c, x, y, s, s, s * 0.22); c.fill();
    c.save(); c.translate(x + s * 0.17, y + s * 0.17); c.scale(s * 0.66 / 24, s * 0.66 / 24);
    c.fillStyle = '#fff'; c.fill(new Path2D(WA_BUBBLE)); c.fillStyle = '#25D366'; c.fill(new Path2D(WA_PHONE)); c.restore();
  }
  function paint(P) {
    const cv = document.createElement('canvas'); cv.width = P.W; cv.height = P.H;
    const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, P.W, P.H); c.fillStyle = S.color;
    const px = P.px;
    if (S.shape === 'dot') {
      for (const [x, y] of P.cells) { c.beginPath(); c.arc(x + px / 2, y + px / 2, px * 0.46, 0, 7); c.fill(); }
      for (const [x, y] of P.eyes) {
        c.fillStyle = S.color; rr(c, x, y, 7 * px, 7 * px, px * 2); c.fill();
        c.fillStyle = '#fff'; rr(c, x + px, y + px, 5 * px, 5 * px, px * 1.35); c.fill();
        c.fillStyle = S.color; rr(c, x + 2 * px, y + 2 * px, 3 * px, 3 * px, px * 0.9); c.fill();
      }
    } else for (const [x, y] of P.cells) c.fillRect(x, y, px, px);
    drawMid(c, P);
    if (P.capH) {
      const s = capOf().trim(); let fs = 72; c.fillStyle = S.color; c.textAlign = 'center'; c.textBaseline = 'middle';
      const font = z => `800 ${z}px -apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif`;
      do { c.font = font(fs); fs -= 4; } while (c.measureText(s).width > P.W - 120 && fs > 28);
      c.fillText(s, P.W / 2, P.W + P.capH / 2 - 20);
    }
    return cv;
  }
  function svgOf(P) {
    const px = P.px, f = v => +v.toFixed(2);
    let d = '';
    if (S.shape === 'dot') for (const [x, y] of P.cells) d += `<circle cx="${f(x + px / 2)}" cy="${f(y + px / 2)}" r="${f(px * 0.46)}"/>`;
    else d = `<path d="${P.cells.map(([x, y]) => `M${f(x)} ${f(y)}h${px}v${px}h-${px}z`).join('')}"/>`;
    const eyes = P.eyes.map(([x, y]) => `<rect x="${x}" y="${y}" width="${7 * px}" height="${7 * px}" rx="${2 * px}"/><rect x="${x + px}" y="${y + px}" width="${5 * px}" height="${5 * px}" rx="${f(1.35 * px)}" fill="#fff"/><rect x="${x + 2 * px}" y="${y + 2 * px}" width="${3 * px}" height="${3 * px}" rx="${f(0.9 * px)}"/>`).join('');
    let mid = '';
    if (P.box) {
      const pad = px * 0.6, x = P.W / 2 - P.box / 2, s = P.box;
      mid = `<rect x="${f(x - pad)}" y="${f(x - pad)}" width="${f(s + pad * 2)}" height="${f(s + pad * 2)}" rx="${f(s * 0.22)}" fill="#fff"/>`;
      if (P.mid === 'logo' && logo) mid += `<clipPath id="lc"><rect x="${f(x)}" y="${f(x)}" width="${s}" height="${s}" rx="${f(s * 0.18)}"/></clipPath><image href="${logo.url}" x="${f(x)}" y="${f(x)}" width="${s}" height="${s}" preserveAspectRatio="xMidYMid meet" clip-path="url(#lc)"/>`;
      else if (S.mode === 'wifi') {
        mid += `<rect x="${f(x)}" y="${f(x)}" width="${s}" height="${s}" rx="${f(s * 0.22)}"/><g fill="none" stroke="#fff" stroke-linecap="round" stroke-width="${f(s * 0.085)}">` +
          [0.36, 0.25, 0.14].map(r => { const cx = x + s / 2, cy = x + s * 0.74, a0 = Math.PI * 1.22, a1 = Math.PI * 1.78;
            return `<path d="M${f(cx + Math.cos(a0) * s * r)} ${f(cy + Math.sin(a0) * s * r)}A${f(s * r)} ${f(s * r)} 0 0 1 ${f(cx + Math.cos(a1) * s * r)} ${f(cy + Math.sin(a1) * s * r)}"/>`; }).join('') +
          `</g><circle cx="${f(x + s / 2)}" cy="${f(x + s * 0.74)}" r="${f(s * 0.055)}" fill="#fff"/>`;
      } else mid += `<rect x="${f(x)}" y="${f(x)}" width="${s}" height="${s}" rx="${f(s * 0.22)}" fill="#25D366"/><g transform="translate(${f(x + s * 0.17)} ${f(x + s * 0.17)}) scale(${f(s * 0.66 / 24)})"><path d="${WA_BUBBLE}" fill="#fff"/><path d="${WA_PHONE}" fill="#25D366"/></g>`;
    }
    const cap = P.capH ? `<text x="${P.W / 2}" y="${P.W + P.capH / 2 - 20}" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system,'Segoe UI','PingFang SC','Noto Sans SC','Microsoft YaHei',sans-serif" font-weight="800" font-size="64" fill="${S.color}">${capOf().trim().replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${P.W} ${P.H}" width="${P.W}" height="${P.H}"><rect width="${P.W}" height="${P.H}" fill="#fff"/><g fill="${S.color}">${d}${eyes}</g>${mid}${cap}</svg>`;
  }

  // ---- the form ----
  const tabs = (items, cur, pick) => h('div', { cls: 'fr-tabs', role: 'group' }, items.map(([v, k]) => h('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => pick(v) }, t(k))));
  const fld = (k, inp, opt) => h('label', { cls: 'fld' }, h('span', {}, t(k), opt ? h('i', {}, ' ' + t('opt')) : null), inp);
  const inp = (name, attrs = {}) => { const e = h(attrs.tag || 'input', { name, ...attrs, tag: null }); e.value = S[name] ?? ''; e.addEventListener('input', () => { S[name] = e.value; changed(); }); return e; };
  function drawForm() {
    const L = [];
    L.push(tabs(MODES.map(m => [m, 'm_' + m]), S.mode, v => { S.mode = v; keep(); drawForm(); changed(true); }));
    if (S.mode === 'wa') {
      const cc = h('select', { name: 'cc', 'aria-label': t('f_cc') }, CC.map(([c, n]) => h('option', { value: c }, c ? `+${c} ${n}` : '+ …')));
      cc.value = S.cc; cc.addEventListener('change', () => { S.cc = cc.value; changed(); });
      L.push(h('div', { cls: 'fr-ccrow' }, fld('f_cc', cc), fld('f_wa', inp('num', { type: 'tel', inputmode: 'tel', autocomplete: 'tel-national', placeholder: t('wa_ph'), maxlength: 24 }))));
      const m = h('textarea', { name: 'msg', rows: 2, maxlength: 300 }); m.value = S.msg ?? t('msg_def');
      m.addEventListener('input', () => { S.msg = m.value; changed(); });
      L.push(fld('f_msg', m, true));
    } else if (S.mode === 'url') L.push(fld('f_link', inp('link', { type: 'text', inputmode: 'url', autocapitalize: 'off', spellcheck: 'false', placeholder: t('link_ph'), maxlength: 1000 })));
    else if (S.mode === 'text') L.push(fld('f_text', inp('text', { tag: 'textarea', rows: 4, maxlength: 1500 })));
    else {
      L.push(fld('f_ssid', inp('ssid', { maxlength: 64, autocapitalize: 'off', spellcheck: 'false' })));
      const enc = h('select', { name: 'enc' }, [['WPA', 'enc_wpa'], ['WEP', 'enc_wep'], ['nopass', 'enc_none']].map(([v, k]) => h('option', { value: v }, t(k))));
      enc.value = S.enc; enc.addEventListener('change', () => { S.enc = enc.value; drawForm(); changed(); });
      L.push(h('div', { cls: 'two' }, S.enc === 'nopass' ? null : fld('f_pass', inp('pass', { type: 'text', maxlength: 64, autocapitalize: 'off', spellcheck: 'false', autocomplete: 'off' })), fld('f_enc', enc)));
    }
    // the middle: nothing, the mode's icon, or your own logo
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      try { logo = await F.readImage(file.files[0], 600); S.mid = 'logo'; drawForm(); changed(); } catch (e) { toast(t(e.message === 'size' ? 'e_img_size' : e.message === 'type' ? 'e_img_type' : 'e_img_read')); } file.value = ''; } });
    const mids = [['none', 'none_opt'], ...(hasIcon() ? [['icon', 'm_' + S.mode]] : []), ['logo', 'logo']];
    L.push(h('div', { cls: 'fld' }, h('span', {}, t('f_mid')), tabs(mids, midOf(), v => {
      if (v === 'logo' && !logo) { file.click(); return; }
      S.mid = v; keep(); drawForm(); changed(); }), file, midOf() === 'logo' && logo ? h('button', { type: 'button', cls: 'fr-link', onclick: () => file.click() }, t('logo_drop')) : null, h('p', { cls: 'fr-hint' }, t('logo_note'))));
    L.push(h('div', { cls: 'fld' }, h('span', {}, t('f_color')), h('div', { cls: 'fr-swatches', role: 'group' }, COLORS.map(c => h('button', { type: 'button', cls: 'fr-swatch', style: `background:${c}`, 'aria-label': c, 'aria-pressed': String(c === S.color), onclick: () => { S.color = c; keep(); drawForm(); changed(); } })))));
    L.push(h('div', { cls: 'fld' }, h('span', {}, t('f_shape')), tabs([['square', 'sh_square'], ['dot', 'sh_dot']], S.shape, v => { S.shape = v; keep(); drawForm(); changed(); })));
    const cap = h('input', { name: 'cap', maxlength: 40 }); cap.value = capOf();
    cap.addEventListener('input', () => { S.cap[S.mode] = cap.value; changed(); });
    L.push(fld('f_cap', cap, true));
    put(form, L);
  }

  // ---- the result ----
  let pic = null;
  function changed(now) { clearTimeout(timer); timer = setTimeout(() => { keep(); draw(); }, now ? 0 : 140); }
  function draw() {
    const p = payload();
    form.querySelectorAll('.fld').forEach(f => f.removeAttribute('aria-invalid'));
    if (p.err) {
      const el = form.querySelector(`[name="${p.field}"]`), show = el && el.value.trim();   // an empty field is not an error until you've typed something
      if (show) el.closest('.fld').setAttribute('aria-invalid', 'true');
      const ph = paint(plan('https://dinamics.dev/free')); ph.className = 'fr-canvas'; ph.setAttribute('aria-hidden', 'true');
      put(out, h('div', { cls: 'fr-qrframe fr-qrph' }, ph, h('p', {}, show ? t(p.err) : t('ph_fill'))));
      last = null; return;
    }
    const P0 = { ecl: midOf() === 'none' ? 'M' : 'H' }, max = Q.maxBytes(P0.ecl), m = bytes(p.text);
    if (m > max) { put(out, h('p', { cls: 'dk-msg bad' }, tf('e_long', { n: max, m }))); last = null; return; }
    const P = plan(p.text); pic = paint(P); last = { p, P };
    pic.className = 'fr-canvas'; pic.setAttribute('role', 'img'); pic.setAttribute('aria-label', p.text);
    const name = 'qr-' + S.mode;
    const acts = h('div', { cls: 'fr-btns' },
      h('button', { type: 'button', cls: 'btn', onclick: async () => { const b = await F.canvasBlob(pic); F.download(b, name + '.png'); F.use('use'); } }, t('dl_png')),
      h('button', { type: 'button', cls: 'btn ghost', onclick: () => { F.download(new Blob([svgOf(P)], { type: 'image/svg+xml' }), name + '.svg'); F.use('use'); } }, t('dl_svg')),
      F.canShareFiles() ? h('button', { type: 'button', cls: 'btn ghost', onclick: async () => { const r = await F.sendFile(await F.canvasBlob(pic), name + '.png'); if (r !== 'cancel') F.use('use'); } }, t('share')) : null);
    const link = p.link ? h('div', { cls: 'fr-linkbox' }, h('p', { cls: 'fr-lbl' }, S.mode === 'wa' ? t('wa_link') : t('f_link')), h('code', {}, p.text),
      h('div', { cls: 'fr-btns' }, h('button', { type: 'button', cls: 'btn ghost', onclick: () => { copy(p.text); F.use('use'); } }, t('copy_link')), h('a', { cls: 'btn ghost', href: p.text, target: '_blank', rel: 'noopener' }, t('test_open'))),
      p.zero ? h('p', { cls: 'fr-hint' }, t('zero_tip')) : null) : null;
    const ok = h('p', { cls: 'fr-hint fr-ok', hidden: true }, '✓ ' + t('self_ok'));
    put(out, h('div', { cls: 'fr-qrframe' }, pic), acts, link, ok, h('p', { cls: 'fr-hint' }, t('size_tip')));
    selfCheck(pic, p.text, ok);
  }
  // where the browser can read QR codes itself, read ours back once
  async function selfCheck(cv, text, el) {
    if (!('BarcodeDetector' in window)) return;
    try { const r = await new BarcodeDetector({ formats: ['qr_code'] }).detect(cv); if (r.some(x => x.rawValue === text) && last && last.p.text === text) el.hidden = false; } catch (e) {}
  }
  DN.on(() => { drawForm(); draw(); put($('#qr-up'), F.upsell('qr')); });
})();
