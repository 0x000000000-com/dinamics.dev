/* Dinamics · the free e-card itself: its details live in the link (#…), its logo (if it has one) on the desk, it goes through eight colours by itself, one tap saves the contact.
   Used by the builder (dinamics.dev/free/card) and by the card page that people open (dinamics.dev/free/c#…). */
(() => {
  const ST = (window.DESK && window.DESK.styles) || window.ECARD_STYLES || [];
  const W = {
    zh: { wa: 'WhatsApp', tel: '电话', mail: '邮箱', site: '网站', addr: '地址', save: '存进通讯录', call: '打电话', qr: '二维码', front: '翻回正面', share: '分享', other: 'EN',
          scan: '扫一扫，打开这张电子名片', made: '免费电子名片 · Dinamics 做的', mine: '我也要做一张', copied: '链接已复制', bad: '这张名片的链接不完整，打不开。', make: '免费做一张电子名片', style: '颜色' },
    en: { wa: 'WhatsApp', tel: 'Phone', mail: 'Email', site: 'Website', addr: 'Address', save: 'Save contact', call: 'Call', qr: 'QR code', front: 'Front', share: 'Share', other: '中',
          scan: 'Scan to open this e-card', made: 'Free e-card · made by Dinamics', mine: 'Make your own', copied: 'Link copied', bad: 'This card\u2019s link is incomplete and can\u2019t be opened.', make: 'Make a free e-card', style: 'Colour' },
  };
  // ---- the link: the details as short JSON, then base64url ----
  const KEYS = ['n', 't', 'c', 'p', 'w', 'e', 's', 'a', 'l', 'y', 'g'];   // g: the logo's id on the desk
  function encode(d) {
    const o = {}; for (const k of KEYS) if (d[k] != null && String(d[k]).trim()) o[k] = String(d[k]).trim();
    const b = new TextEncoder().encode(JSON.stringify(o)); let s = '';
    for (const x of b) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function decode(str) {
    try {
      const s = atob(String(str).replace(/-/g, '+').replace(/_/g, '/')), b = Uint8Array.from(s, c => c.charCodeAt(0));
      const o = JSON.parse(new TextDecoder().decode(b)); if (!o || typeof o.n !== 'string' || !o.n.trim()) return null;
      const d = {}; for (const k of KEYS) if (typeof o[k] === 'string') d[k] = o[k].slice(0, 300);
      if (d.g && !/^[a-f0-9]{20}$/.test(d.g)) delete d.g;
      return d;
    } catch (e) { return null; }
  }
  // the logo: kept on the desk by its id; drawn on the card, in the picture and in the contact file
  const API = () => String(window.ECARD_API || (window.DESK && window.DESK.api) || '').replace(/\/$/, '');
  const logoUrl = id => (id && API() ? API() + '/api/free/logo/' + id : '');
  const LOGOS = {};
  function logoImg(id, ms = 5000) {
    const u = logoUrl(id); if (!u) return Promise.resolve(null);
    if (!LOGOS[u]) LOGOS[u] = new Promise(res => { const im = new Image(); im.crossOrigin = 'anonymous'; im.onload = () => res(im); im.onerror = () => { delete LOGOS[u]; res(null); }; im.src = u; });
    return Promise.race([LOGOS[u], new Promise(r => setTimeout(() => r(null), ms))]);
  }
  const digits = s => String(s || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  const waNum = s => String(s || '').replace(/\D/g, '');
  const siteHref = s => { s = String(s || '').trim(); if (!s) return ''; if (!/^[a-z][a-z0-9+.-]*:/i.test(s)) s = 'https://' + s; try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? u.href : ''; } catch (e) { return ''; } };
  const siteShow = s => siteHref(s).replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  const initials = n => { const w = String(n).trim().split(/\s+/); if (/[\u3400-\u9FFF]/.test(n)) return [...n.replace(/\s/g, '')].slice(0, 2).join(''); return (w.length > 1 ? w[0][0] + w[w.length - 1][0] : w[0].slice(0, 2)).toUpperCase(); };
  // ---- the contact file (vCard 3.0) ----
  function vcf(d, photo) {
    const e = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const L = ['BEGIN:VCARD', 'VERSION:3.0', `N:${e(d.n)};;;;`, `FN:${e(d.n)}`];
    if (d.c) L.push(`ORG:${e(d.c)}`); if (d.t) L.push(`TITLE:${e(d.t)}`);
    if (d.p) L.push(`TEL;TYPE=CELL,VOICE:${digits(d.p)}`);
    if (d.w && waNum(d.w) !== waNum(d.p)) L.push(`TEL;TYPE=CELL:+${waNum(d.w)}`);
    if (d.e) L.push(`EMAIL;TYPE=INTERNET:${e(d.e)}`); if (siteHref(d.s)) L.push(`URL:${siteHref(d.s)}`); if (d.a) L.push(`ADR;TYPE=WORK:;;${e(d.a)};;;;`);
    if (photo) L.push(('PHOTO;ENCODING=b;TYPE=PNG:' + photo).replace(/(.{74})(?=.)/g, '$1\r\n '));   // folded at 75 characters, as vCard asks
    L.push('END:VCARD'); return L.join('\r\n') + '\r\n';
  }
  // the contact file with the logo as the contact's picture (a white square, the logo in the middle)
  async function vcfReady(d) {
    const im = d.g ? await logoImg(d.g) : null; if (!im) return vcf(d);
    try {
      const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 256, 256);
      const k = Math.min(208 / im.naturalWidth, 208 / im.naturalHeight), w = im.naturalWidth * k, h = im.naturalHeight * k; x.drawImage(im, (256 - w) / 2, (256 - h) / 2, w, h);
      return vcf(d, c.toDataURL('image/png').split(',')[1]);
    } catch (e) { return vcf(d); }
  }
  const styleOf = id => ST.find(s => s.id === id);
  const vars = s => `--cb:${s.bg};--cw:${s.wash};--ci:${s.ink};--ci2:${s.ink2};--cc:${s.co};--cc2:${s.co2};--con:${s.on};--g0:${s.l[0]};--g1:${s.l[1]};--g2:${s.l[2]}`;
  // ---- the card, as HTML: front with the details, back with the QR code; it changes colour by itself unless a colour is chosen ----
  function el(d, { lang, url, onStyle } = {}) {
    const T = W[lang || d.l || 'zh'] || W.zh, mk = (tag, cls, txt) => { const x = document.createElement(tag); if (cls) x.className = cls; if (txt != null) x.textContent = txt; return x; };
    const card = mk('div', 'ec'), inner = mk('div', 'ec-in'), front = mk('div', 'ec-face ec-front'), back = mk('div', 'ec-face ec-back');
    const top = mk('div', 'ec-top'), mono = mk('div', 'ec-mono', initials(d.n)), dots = mk('div', 'ec-dots');
    if (d.g && logoUrl(d.g)) {   // a logo: shown on white in place of the initials; if it cannot be fetched, the initials come back
      const im = mk('img'); im.alt = ''; im.crossOrigin = 'anonymous'; im.src = logoUrl(d.g);
      im.onerror = () => { mono.className = 'ec-mono'; mono.textContent = initials(d.n); };
      mono.className = 'ec-mono ec-logo'; mono.textContent = ''; mono.append(im);
    }
    top.append(mono, dots);
    const name = mk('h1', 'ec-name', d.n), role = mk('p', 'ec-role', [d.t, d.c].filter(Boolean).join(' · '));
    const rows = mk('dl', 'ec-rows');
    const row = (k, v, href) => { if (!v) return; const dt = mk('dt', '', T[k]), dd = mk('dd'); if (href) { const a = mk('a', '', v); a.href = href; if (/^https?:/.test(href)) { a.target = '_blank'; a.rel = 'noopener'; } dd.append(a); } else dd.textContent = v; rows.append(dt, dd); };
    row('wa', d.w, d.w ? 'https://wa.me/' + waNum(d.w) : ''); row('tel', d.p, d.p ? 'tel:' + digits(d.p) : ''); row('mail', d.e, d.e ? 'mailto:' + d.e : ''); row('site', siteShow(d.s), siteHref(d.s)); row('addr', d.a);
    const sname = mk('p', 'ec-style');
    front.append(top, mk('div', 'ec-gap'), name, role, mk('hr', 'ec-hr'), rows, sname);
    const qrBox = mk('div', 'ec-qr'); if (url && window.QR) qrBox.innerHTML = window.QR.svg(url, { quiet: 3, dark: '#111', light: '#fff', ecl: 'M' });
    back.append(mk('p', 'ec-bname', d.n), qrBox, mk('p', 'ec-scan', T.scan));
    inner.append(front, back); card.append(inner);
    // the colours
    const list = ST.length ? ST : [{ id: 'gold', zh: '黑金', en: 'Onyx and gold', bg: '#0A0A0B', wash: '#16140F', ink: '#F2EDE3', ink2: '#A39D92', co: '#D9B26B', co2: '#F3D48E', on: '#0A0A0B', l: ['#F3D48E', '#D9B26B', '#A47A36'] }];
    let i = Math.max(0, list.findIndex(s => s.id === d.y)), timer = 0;
    list.forEach((s, k) => { const b = mk('i'); b.style.background = s.co; dots.append(b); });
    function paint(swap) {
      const s = list[i]; card.setAttribute('style', vars(s)); card.dataset.style = s.id;
      if (swap) { card.classList.remove('ec-swap'); void card.offsetWidth; card.classList.add('ec-swap'); }
      sname.textContent = s[lang || d.l || 'zh'] || s.zh; [...dots.children].forEach((b, k) => b.classList.toggle('ec-on', k === i));
      if (onStyle) onStyle(s);
    }
    const auto = !d.y || d.y === 'auto' || !styleOf(d.y);
    const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function next() { i = (i + 1) % list.length; paint(true); }
    paint();
    if (auto && !rm && list.length > 1) timer = setInterval(() => { if (!document.hidden) next(); }, 4200);
    card.stop = () => clearInterval(timer);
    card.flip = on => card.classList.toggle('ec-flipped', on);
    card.styleNow = () => list[i];
    return card;
  }
  // ---- the same card as one picture (1080 × 1350) with its QR code, for WhatsApp status or printing ----
  function picture(d, url, s, lang, logo) {
    s = s || ST[0]; const T = W[lang || d.l || 'zh'] || W.zh, Wd = 1080, Hd = 1350, cv = document.createElement('canvas'); cv.width = Wd; cv.height = Hd;
    const c = cv.getContext('2d'), SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
    c.fillStyle = s.bg; c.fillRect(0, 0, Wd, Hd);
    const glow = c.createRadialGradient(Wd * 0.8, 160, 0, Wd * 0.8, 160, 760); glow.addColorStop(0, s.co + '40'); glow.addColorStop(1, s.co + '00'); c.fillStyle = glow; c.fillRect(0, 0, Wd, Hd);
    const x0 = 90, y0 = 90, cw = Wd - 180, ch = Hd - 180;
    c.fillStyle = s.wash; c.strokeStyle = s.co + '66'; c.lineWidth = 3; c.beginPath(); c.roundRect ? c.roundRect(x0, y0, cw, ch, 44) : c.rect(x0, y0, cw, ch); c.fill(); c.stroke();
    // monogram
    const g = c.createLinearGradient(0, y0 + 70, 0, y0 + 190); g.addColorStop(0, s.l[0]); g.addColorStop(0.55, s.l[1]); g.addColorStop(1, s.l[2]);
    c.fillStyle = logo ? '#fff' : g; c.beginPath(); c.roundRect ? c.roundRect(x0 + 70, y0 + 70, 120, 120, 30) : c.rect(x0 + 70, y0 + 70, 120, 120); c.fill();
    if (logo) { const k = Math.min(96 / logo.naturalWidth, 96 / logo.naturalHeight), w = logo.naturalWidth * k, h = logo.naturalHeight * k; c.drawImage(logo, x0 + 130 - w / 2, y0 + 130 - h / 2, w, h); }
    else { c.fillStyle = s.on; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `800 ${/[\u3400-\u9FFF]/.test(d.n) ? 46 : 52}px ${SANS}`; c.fillText(initials(d.n), x0 + 130, y0 + 133); }
    // name, title
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const SERIF = '"Noto Serif SC","Songti SC","STSong","SimSun",serif';
    let fs = 92; c.font = `900 ${fs}px ${SERIF}`; while (c.measureText(d.n).width > cw - 140 && fs > 40) { fs -= 4; c.font = `900 ${fs}px ${SERIF}`; }
    const g2 = c.createLinearGradient(0, y0 + 300 - fs, 0, y0 + 300); g2.addColorStop(0, s.l[0]); g2.addColorStop(0.6, s.l[1]); g2.addColorStop(1, s.l[2]); c.fillStyle = g2; c.fillText(d.n, x0 + 70, y0 + 300);
    const role = [d.t, d.c].filter(Boolean).join(' · ');
    if (role) { c.fillStyle = s.ink; let rs = 36; c.font = `600 ${rs}px ${SANS}`; while (c.measureText(role).width > cw - 140 && rs > 22) { rs -= 2; c.font = `600 ${rs}px ${SANS}`; } c.fillText(role, x0 + 70, y0 + 364); }
    c.strokeStyle = s.co + '55'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0 + 70, y0 + 410); c.lineTo(x0 + cw - 70, y0 + 410); c.stroke();
    // contact rows, then the QR code
    let y = y0 + 480; const rowsL = [['wa', d.w], ['tel', d.p], ['mail', d.e], ['site', siteShow(d.s)], ['addr', d.a]].filter(r => r[1]);
    for (const [k, v] of rowsL) {
      c.fillStyle = s.ink2; c.font = `500 26px ${SANS}`; c.fillText(T[k], x0 + 70, y);
      c.fillStyle = s.ink; let vs = 32; c.font = `600 ${vs}px ${SANS}`; while (c.measureText(v).width > cw - 330 && vs > 18) { vs -= 2; c.font = `600 ${vs}px ${SANS}`; } c.fillText(v, x0 + 250, y); y += 62;
    }
    const q = 300, qx = x0 + cw - 70 - q, qy = y0 + ch - 70 - q;
    if (url && window.QR) { c.fillStyle = '#fff'; c.beginPath(); c.roundRect ? c.roundRect(qx - 18, qy - 18, q + 36, q + 36, 22) : c.rect(qx - 18, qy - 18, q + 36, q + 36); c.fill(); window.QR.draw(c, url, { x: qx, y: qy, size: q, quiet: 1, dark: '#111', light: '#fff', ecl: 'M' }); }
    c.fillStyle = s.ink2; c.font = `500 26px ${SANS}`; const sc = T.scan; let ls = sc, l2 = '';
    if (c.measureText(sc).width > cw - q - 200) { const m = Math.ceil(sc.length / 2); ls = sc.slice(0, m); l2 = sc.slice(m); }
    c.fillText(ls, x0 + 70, qy + q - (l2 ? 40 : 0)); if (l2) c.fillText(l2, x0 + 70, qy + q);
    c.fillStyle = s.ink2 + 'aa'; c.font = `500 22px ${SANS}`; c.textAlign = 'center'; c.fillText(T.made + ' · dinamics.dev/free', Wd / 2, Hd - 40);
    return cv;
  }
  // the name is drawn in the display face: make sure it has loaded first
  async function pictureReady(d, url, s, lang) {
    const lp = d.g ? logoImg(d.g) : Promise.resolve(null);
    try { await Promise.race([document.fonts.load('900 92px "Noto Serif SC"', d.n), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
    return picture(d, url, s, lang, await lp);
  }
  window.ECard = { encode, decode, el, vcf, vcfReady, picture, pictureReady, vars, W, siteHref, waNum, digits, logoUrl, styles: ST };
})();
