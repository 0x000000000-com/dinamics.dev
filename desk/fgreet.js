/* Dinamics · free festival greetings: seven festivals, two pictures each, your greeting, shop name and logo, square or tall, saved as a picture. Nothing is uploaded. */
(() => {
  const { $, h, put, t, tf, toast, store } = window.Desk, DN = window.DN, F = window.Free, D = window.DESK || {};
  const form = $('#gr-form'), out = $('#gr-out');
  const FEST = ['cny', 'raya', 'diwali', 'songkran', 'midautumn', 'xmas', 'newyear'];
  const ZOD = [['鼠', 'Rat'], ['牛', 'Ox'], ['虎', 'Tiger'], ['兔', 'Rabbit'], ['龙', 'Dragon'], ['蛇', 'Snake'], ['马', 'Horse'], ['羊', 'Goat'], ['猴', 'Monkey'], ['鸡', 'Rooster'], ['狗', 'Dog'], ['猪', 'Pig']];
  const LN = { zh: '中文', en: 'English', ms: 'Bahasa Melayu', th: 'ไทย', ta: 'தமிழ்' };
  // the next date of each festival (from the same calendar as the home page), and how far away it is
  const today = (() => { const d = new Date(); return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate(); })();
  const toDate = n => new Date(Math.floor(n / 10000), Math.floor(n / 100) % 100 - 1, n % 100);
  const nextOf = f => ((D.fests || {})[f] || []).find(n => n >= today) || null;
  const daysTo = n => Math.round((toDate(n) - toDate(today)) / 864e5);
  const yearOf = f => { const n = nextOf(f); return n ? Math.floor(n / 10000) : new Date().getFullYear(); };
  // the greetings, per festival and language: [big words, small words]
  function presets(f) {
    const y = yearOf(f), z = ZOD[((y - 2020) % 12 + 12) % 12];
    return {
      cny: { zh: ['新年快乐', `${z[0]}年大吉 · 万事如意`], en: ['Happy Lunar New Year', `Wishing you a prosperous Year of the ${z[1]}`], ms: ['Selamat Tahun Baru Cina', 'Gong Xi Fa Cai'] },
      raya: { ms: ['Selamat Hari Raya Aidilfitri', 'Maaf Zahir dan Batin'], zh: ['开斋节快乐', '祝你和家人平安喜乐'], en: ['Happy Eid al-Fitr', 'Wishing you and your family peace and joy'] },
      diwali: { en: ['Happy Deepavali', 'May the festival of lights brighten your home'], ta: ['தீபாவளி நல்வாழ்த்துக்கள்', ''], zh: ['屠妖节快乐', '愿光明照亮你的家'], ms: ['Selamat Hari Deepavali', ''] },
      songkran: { th: ['สุขสันต์วันสงกรานต์', 'Happy Songkran'], en: ['Happy Songkran', 'Wishing you a cool and happy Thai New Year'], zh: ['泼水节快乐', '新的一年，好运连连'] },
      midautumn: { zh: ['中秋节快乐', '花好月圆 · 人月两团圆'], en: ['Happy Mid-Autumn Festival', 'May your family be together under the full moon'] },
      xmas: { en: ['Merry Christmas', 'and a Happy New Year'], zh: ['圣诞快乐', '平安喜乐 · 万事顺遂'] },
      newyear: { zh: ['新年快乐', `${yearOf('newyear')}，一切顺利`], en: ['Happy New Year', `All the best for ${yearOf('newyear')}`], ms: ['Selamat Tahun Baru', `Semoga ${yearOf('newyear')} lebih baik`] },
    }[f];
  }
  const saved = store.get('dn-free-greet', {});
  const S = { fest: null, size: 'sq', glang: null, l1: null, l2: null, shop: '', extra: '', pic: 0, ...saved, l1: null, l2: null, glang: null };
  if (!FEST.includes(S.fest)) S.fest = [...FEST].sort((a, b) => (nextOf(a) || 99999999) - (nextOf(b) || 99999999))[0];
  if (S.pic !== 0 && S.pic !== 1) S.pic = 0;
  let logo = null; if (saved.logo) { const im = new Image(); im.onload = () => { logo = { img: im, url: saved.logo }; draw(); }; im.src = saved.logo; }
  const langsOf = f => Object.keys(presets(f));
  const defLang = f => { const ls = langsOf(f); return ls.includes(DN.lang) && !(f === 'raya' || f === 'songkran') ? DN.lang : ls[0]; };
  const lines = () => { const p = presets(S.fest)[S.glang] || ['', '']; return [S.l1 ?? p[0], S.l2 ?? p[1]]; };
  const keep = () => store.set('dn-free-greet', { fest: S.fest, size: S.size, shop: S.shop, extra: S.extra, pic: S.pic, logo: logo ? logo.url : null });

  // ---------- the pictures ----------
  // each festival: the colours of the words, the soft veil behind them, and a plain background for the moment before the picture arrives
  const LOOK = {
    cny: { ink: ['#FFF4CF', '#F8CF63', '#D8981F'], sub: '#FFE9B8', shade: 'rgba(70,0,6,.8)', veil: '74,4,8', va: .5, base: ['#B3141E', '#5E0309'] },
    raya: { ink: ['#FFF8DC', '#F4D888', '#CFA54A'], sub: '#F3F7E6', shade: 'rgba(0,26,14,.85)', veil: '2,32,20', va: .5, base: ['#0B6B45', '#03301E'] },
    diwali: { ink: ['#FFFFFF', '#FFE7B0', '#FFC255'], sub: '#FFF1D6', shade: 'rgba(48,6,36,.9)', veil: '52,8,40', va: .58, base: ['#3A1260', '#1A0631'] },
    songkran: { ink: ['#0E6E9A', '#0B5680', '#073B5A'], sub: '#08405F', shade: 'rgba(255,255,255,.9)', veil: '255,255,255', va: .5, base: ['#7FDCEB', '#1FA9CC'] },
    midautumn: { ink: ['#FFF6DC', '#F6D88A', '#D2A343'], sub: '#F3EAD0', shade: 'rgba(0,6,26,.85)', veil: '4,10,34', va: .45, base: ['#14284D', '#040A18'] },
    xmas: { ink: ['#FFFFFF', '#F9E8BC', '#DDB86E'], sub: '#F4F7F2', shade: 'rgba(8,16,34,.85)', veil: '10,18,40', va: .48, base: ['#2A2A55', '#0B1020'] },
    newyear: { ink: ['#FFFFFF', '#FFE49A', '#F2B13F'], sub: '#EEE8FF', shade: 'rgba(8,0,26,.85)', veil: '10,2,32', va: .45, base: ['#1C0F45', '#05030F'] },
  };
  const ARTS = D.art || {};   // { cny: { sq: [{ f, z: [top, bottom] }, …], st: […] }, … }
  const artOf = () => { const l = ((ARTS[S.fest] || {})[S.size] || []); return l[S.pic % Math.max(1, l.length)] || null; };
  const IMG = {};
  function load(src) {
    if (!IMG[src]) {
      const im = new Image(), rec = { im, ok: false };
      rec.p = new Promise(res => { im.onload = () => { rec.ok = true; res(); }; im.onerror = () => res(); });
      im.decoding = 'async'; im.src = src; IMG[src] = rec;
    }
    return IMG[src];
  }
  const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei","Noto Sans Thai","Noto Sans Tamil",sans-serif';
  const SERIF = '"Noto Serif SC","Songti SC","STSong",Georgia,"Noto Sans Thai","Noto Sans Tamil",serif';
  const lg = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; };

  // fit a line into a width: shrink it, then wrap it onto two lines, then shrink again
  function fit(c, text, maxW, big, small, weight, face) {
    const set = z => (c.font = `${weight} ${z}px ${face}`);
    for (let z = big; z >= small; z -= 4) { set(z); if (c.measureText(text).width <= maxW) return { z, ls: [text] }; }
    const sp = /\s/.test(text.trim()), words = sp ? text.trim().split(/\s+/) : [...text];
    let best = null;
    for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(sp ? ' ' : ''), b = words.slice(i).join(sp ? ' ' : ''); const w = Math.max(a.length, b.length); if (!best || w < best.w) best = { w, ls: [a, b] }; }
    if (!best) best = { ls: [text] };
    for (let z = big; z >= small * 0.6; z -= 4) { set(z); if (best.ls.every(l => c.measureText(l).width <= maxW)) return { z, ls: best.ls }; }
    return { z: small * 0.6, ls: best.ls };
  }
  function paint(art) {
    const W = 1080, H = S.size === 'st' ? 1920 : 1080, tall = H > W, A = LOOK[S.fest];
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    const rec = art && IMG[art.f];
    if (rec && rec.ok) c.drawImage(rec.im, 0, 0, W, H);
    else { c.fillStyle = lg(c, 0, 0, 0, H, [[0, A.base[0]], [1, A.base[1]]]); c.fillRect(0, 0, W, H); }
    const zone = (art && art.z) || [tall ? 0.36 : 0.3, tall ? 0.64 : 0.62];
    // measure the block of words: big words, small words, the shop (logo and name), the extra line
    const [l1, l2] = lines(), shop = S.shop.trim(), extra = S.extra.trim();
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const f1 = fit(c, l1 || ' ', W - 150, tall ? 150 : 128, 64, 900, SERIF), lh1 = f1.z * 1.14;
    const f2 = l2 ? fit(c, l2, W - 200, tall ? 54 : 46, 28, 600, SANS) : null;
    const f3 = extra ? fit(c, extra, W - 180, tall ? 36 : 31, 22, 500, SANS) : null;
    const ls = logo ? (tall ? 110 : 92) : 0, shopH = logo ? ls : shop ? (tall ? 60 : 52) : 0;
    const hBig = f1.ls.length * lh1, hSub = f2 ? f2.ls.length * f2.z * 1.32 : 0, hEx = f3 ? f3.ls.length * f3.z * 1.38 : 0;
    const g1 = f2 ? f2.z * 0.55 : 0, g2 = shopH ? (tall ? 52 : 40) : 0, g3 = f3 ? (shopH ? 16 : 30) : 0;
    const total = hBig + g1 + hSub + g2 + shopH + g3 + hEx;
    let top = (zone[0] + zone[1]) / 2 * H - total / 2;
    top = Math.max(H * 0.08, Math.min(top, H * (tall ? 0.86 : 0.9) - total));
    // a soft veil behind the words, so they read on any part of the picture
    const cx = W / 2, cy = top + total / 2, rx = W * 0.62, ry = total / 2 + (tall ? 170 : 130);
    c.save(); c.translate(cx, cy); c.scale(1, ry / rx);
    const vg = c.createRadialGradient(0, 0, 0, 0, 0, rx); vg.addColorStop(0, `rgba(${A.veil},${A.va})`); vg.addColorStop(0.55, `rgba(${A.veil},${A.va * 0.62})`); vg.addColorStop(1, `rgba(${A.veil},0)`);
    c.fillStyle = vg; c.fillRect(-rx, -rx, rx * 2, rx * 2); c.restore();
    // the big words
    c.font = `900 ${f1.z}px ${SERIF}`;
    f1.ls.forEach((ln, i) => {
      const y = top + lh1 * (i + 0.5);
      c.save(); c.shadowColor = A.shade; c.shadowBlur = 26; c.shadowOffsetY = 4;
      c.fillStyle = lg(c, 0, y - f1.z * 0.5, 0, y + f1.z * 0.45, [[0, A.ink[0]], [0.55, A.ink[1]], [1, A.ink[2]]]); c.fillText(ln, W / 2, y); c.restore();
    });
    let y = top + hBig + g1;
    // the small words
    if (f2) { c.font = `600 ${f2.z}px ${SANS}`; c.fillStyle = A.sub; c.save(); c.shadowColor = A.shade; c.shadowBlur = 16;
      f2.ls.forEach((ln, i) => c.fillText(ln, W / 2, y + f2.z * 1.32 * (i + 0.5))); c.restore(); }
    y += hSub + g2;
    // the shop: logo and name
    if (shopH) {
      const by = y + shopH / 2;
      let z = tall ? 50 : 44; c.font = `800 ${z}px ${SANS}`;
      const gap = logo && shop ? 22 : 0, maxName = W - 200 - ls - gap;
      while (shop && c.measureText(shop).width > maxName && z > 22) { z -= 2; c.font = `800 ${z}px ${SANS}`; }
      const sw = shop ? Math.min(c.measureText(shop).width, maxName) : 0, tw = ls + gap + sw; let x = W / 2 - tw / 2;
      if (logo) { c.save(); c.fillStyle = '#fff'; c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowBlur = 20; c.beginPath(); c.roundRect ? c.roundRect(x, by - ls / 2, ls, ls, ls * 0.24) : c.rect(x, by - ls / 2, ls, ls); c.fill(); c.restore();
        const k = Math.min((ls - 16) / logo.img.naturalWidth, (ls - 16) / logo.img.naturalHeight), w = logo.img.naturalWidth * k, hh = logo.img.naturalHeight * k; c.drawImage(logo.img, x + (ls - w) / 2, by - hh / 2, w, hh); x += ls + gap; }
      if (shop) { c.save(); c.textAlign = 'left'; c.fillStyle = A.sub; c.shadowColor = A.shade; c.shadowBlur = 14; c.fillText(shop, x, by + 1, sw + 1); c.restore(); }
      y += shopH;
    }
    // the extra line
    if (f3) { y += g3; c.font = `500 ${f3.z}px ${SANS}`; c.fillStyle = A.sub; c.save(); c.shadowColor = A.shade; c.shadowBlur = 12;
      f3.ls.forEach((ln, i) => c.fillText(ln, W / 2, y + f3.z * 1.38 * (i + 0.5))); c.restore(); }
    // a small mark at the bottom
    c.save(); c.font = `600 21px ${SANS}`; c.fillStyle = 'rgba(255,255,255,.82)'; c.shadowColor = 'rgba(0,0,0,.75)'; c.shadowBlur = 8;
    c.fillText('dinamics.dev/free', W / 2, H - (tall ? 150 : 28)); c.restore();
    return cv;
  }

  // ---------- the form ----------
  const tabs = (items, cur, pick, cls = '') => h('div', { cls: 'fr-tabs ' + cls, role: 'group' }, items.map(([v, label]) => h('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => pick(v) }, label)));
  const fld = (k, el, opt) => h('label', { cls: 'fld' }, h('span', {}, t(k), opt ? h('i', {}, ' ' + t('opt')) : null), el);
  function input(get, set, attrs = {}) { const el = h(attrs.tag || 'input', { ...attrs, tag: null }); el.value = get() ?? ''; el.addEventListener('input', () => { set(el.value); changed(); }); return el; }
  function festLabel(f) { const n = nextOf(f); if (!n) return t('fe_' + f); const d = daysTo(n); return [t('fe_' + f), h('small', {}, d === 0 ? t('today_fest') : tf('in_days', { n: d }))]; }
  function drawForm() {
    if (!S.glang || !langsOf(S.fest).includes(S.glang)) S.glang = defLang(S.fest);
    const [l1, l2] = lines();
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      try { logo = await F.readImage(file.files[0], 480); keep(); drawForm(); changed(); } catch (e) { toast(t(e.message === 'size' ? 'e_img_size' : e.message === 'type' ? 'e_img_type' : 'e_img_read')); } file.value = ''; } });
    put(form,
      h('div', { cls: 'fld' }, h('span', {}, t('f_fest')), h('div', { cls: 'fr-fests', role: 'group' },
        [...FEST].sort((a, b) => (nextOf(a) || 99999999) - (nextOf(b) || 99999999)).map(f => h('button', { type: 'button', 'aria-pressed': String(f === S.fest), onclick: () => { S.fest = f; S.glang = null; S.l1 = S.l2 = null; keep(); drawForm(); changed(true); } }, festLabel(f))))),
      h('div', { cls: 'fld' }, h('span', {}, t('f_glang')), tabs(langsOf(S.fest).map(l => [l, LN[l]]), S.glang, v => { S.glang = v; S.l1 = S.l2 = null; drawForm(); changed(true); })),
      fld('f_line1', input(() => l1, v => S.l1 = v, { maxlength: 40 })),
      fld('f_line2', input(() => l2, v => S.l2 = v, { maxlength: 70 }), true),
      fld('f_shop', input(() => S.shop, v => S.shop = v, { maxlength: 40, placeholder: t('shop_ph') }), true),
      h('div', { cls: 'fld' }, h('span', {}, t('logo'), h('i', {}, ' ' + t('opt'))),
        h('div', { cls: 'fr-row' }, logo ? h('img', { cls: 'fr-thumb', src: logo.url, alt: '' }) : null,
          h('button', { type: 'button', cls: 'btn ghost', onclick: () => file.click() }, t(logo ? 'logo_drop' : 'logo_pick')),
          logo ? h('button', { type: 'button', cls: 'fr-link', onclick: () => { logo = null; keep(); drawForm(); changed(); } }, t('logo_del')) : null, file),
        h('p', { cls: 'fr-hint' }, t('logo_note'))),
      fld('f_extra', input(() => S.extra, v => S.extra = v, { maxlength: 70, placeholder: t('extra_ph') }), true),
      h('div', { cls: 'fld' }, h('span', {}, t('f_size')), tabs([['sq', t('sz_sq')], ['st', t('sz_st')]], S.size, v => { S.size = v; keep(); drawForm(); changed(true); })));
  }
  let timer = 0, pic = null, gen = 0;
  function changed(now) { clearTimeout(timer); timer = setTimeout(() => { keep(); draw(); }, now ? 0 : 150); }
  async function draw() {
    const my = ++gen, [l1, l2] = lines(), art = artOf(), rec = art ? load(art.f) : null;
    try { await Promise.race([Promise.all([document.fonts.load(`900 100px "Noto Serif SC"`, l1 + '福春'), document.fonts.load(`600 40px "Noto Serif SC"`, l2)]), new Promise(r => setTimeout(r, 2500))]); } catch (e) {}
    if (rec && !rec.ok) await Promise.race([rec.p, new Promise(r => setTimeout(r, 900))]);   // a short wait; if it is still coming, the plain background shows and the picture follows
    if (my !== gen) return;
    pic = paint(art); pic.className = 'fr-canvas fr-greet'; pic.setAttribute('role', 'img'); pic.setAttribute('aria-label', [l1, l2, S.shop].filter(Boolean).join(' · '));
    const name = `greeting-${S.fest}-${S.size === 'st' ? '9x16' : '1x1'}.png`, two = (((ARTS[S.fest] || {})[S.size]) || []).length > 1;
    put(out, h('div', { cls: 'fr-greetwrap' + (S.size === 'st' ? ' fr-tall' : '') }, pic),
      h('div', { cls: 'fr-btns' },
        h('button', { type: 'button', cls: 'btn', onclick: async () => { F.download(await F.canvasBlob(pic), name); F.use('use'); } }, t('dl_png')),
        F.canShareFiles() ? h('button', { type: 'button', cls: 'btn ghost', onclick: async () => { const r = await F.sendFile(await F.canvasBlob(pic), name); if (r !== 'cancel') F.use('use'); } }, t('share')) : null,
        two ? h('button', { type: 'button', cls: 'btn ghost', onclick: () => { S.pic = S.pic ? 0 : 1; keep(); draw(); } }, t('shuffle')) : null));
    if (rec && !rec.ok) rec.p.then(() => { if (my === gen && rec.ok) draw(); });
    // the other picture and the other size of this one, ready for the next tap
    const sib = ARTS[S.fest] || {}, other = S.size === 'st' ? 'sq' : 'st';
    [(sib[S.size] || [])[S.pic ? 0 : 1], (sib[other] || [])[S.pic]].forEach(a => a && setTimeout(() => load(a.f), 800));
  }
  DN.on(() => { drawForm(); draw(); put($('#gr-up'), F.upsell('greeting')); });
})();
