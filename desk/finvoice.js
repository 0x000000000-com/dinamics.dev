/* Dinamics · free quotations, invoices and receipts: filled in here, printed or saved as a PDF or a picture. Everything stays on this device (localStorage). */
(() => {
  const { $, h, put, t, tf, toast, store } = window.Desk, DN = window.DN, F = window.Free;
  const form = $('#iv-form'), out = $('#iv-out');
  const CUR = [['MYR', 'RM', 2], ['SGD', 'S$', 2], ['THB', '฿', 2], ['IDR', 'Rp', 0], ['PHP', '₱', 2], ['VND', '₫', 0], ['USD', 'US$', 2], ['CNY', '¥', 2], ['HKD', 'HK$', 2], ['TWD', 'NT$', 0], ['AUD', 'A$', 2], ['EUR', '€', 2], ['GBP', '£', 2], ['INR', '₹', 2]];
  const PRE = { QT: 'QT', INV: 'INV', RC: 'RC' };
  // the words printed on the document: its own language, whatever language this page is in
  const DL = {
    zh: { QT: '报价单', INV: '发票', RC: '收据', no: '编号', date: '日期', until_QT: '有效期至', until_INV: '付款期限', method: '收款方式', to_QT: '客户', to_INV: '客户', to_RC: '付款人',
          desc: '项目', qty: '数量', price: '单价', amt: '金额', sub: '小计', disc: '折扣', total: '总计', total_RC: '实收', notes: '备注', bank: '付款资料', sign: '授权签名', reg: '注册号', paid: '已收款',
          made: '用 Dinamics 免费工具制作 · dinamics.dev/free' },
    en: { QT: 'QUOTATION', INV: 'INVOICE', RC: 'RECEIPT', no: 'No.', date: 'Date', until_QT: 'Valid until', until_INV: 'Due by', method: 'Paid by', to_QT: 'To', to_INV: 'Bill to', to_RC: 'Received from',
          desc: 'Description', qty: 'Qty', price: 'Unit price', amt: 'Amount', sub: 'Subtotal', disc: 'Discount', total: 'Total', total_RC: 'Amount received', notes: 'Notes', bank: 'Payment details', sign: 'Authorised signature', reg: 'Reg. no.', paid: 'PAID',
          made: 'Made with Dinamics free tools · dinamics.dev/free' },
  };
  const day = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const plus = n => { const d = new Date(); d.setDate(d.getDate() + n); return day(d); };
  const blank = () => ({ buyer: { name: '', addr: '' }, items: [{ d: '', q: '1', p: '' }], date: day(), until: plus(14), method: '', noEdited: false });
  const S = Object.assign({ type: 'QT', dl: 'zh', cur: 'MYR', seller: { name: '', reg: '', addr: '', phone: '', email: '' }, disc: '', tax: '', taxName: '', notes: '', bank: '', sign: false, logo: null, seq: { QT: 1, INV: 1, RC: 1 }, no: '' }, blank(), store.get('dn-free-inv', {}));
  if (!PRE[S.type]) S.type = 'QT';
  let logoImg = null;
  if (S.logo) { const im = new Image(); im.onload = () => { logoImg = im; render(); }; im.src = S.logo; }
  const numOf = () => `${PRE[S.type]}-${new Date().getFullYear()}-${String(S.seq[S.type] || 1).padStart(4, '0')}`;
  if (!S.noEdited || !S.no) S.no = numOf();
  const keep = () => { try { store.set('dn-free-inv', S); } catch (e) {} };
  const L = (k) => { const z = DL.zh[k], e = DL.en[k]; return S.dl === 'zh' ? z : S.dl === 'en' ? e : `${z} ${e}`; };
  const cur = () => CUR.find(c => c[0] === S.cur) || CUR[0];
  const num = v => { const x = parseFloat(String(v).replace(/[^\d.-]/g, '')); return isFinite(x) ? x : 0; };
  const money = v => { const [, sym, dp] = cur(); const r = Math.round(v * 10 ** dp) / 10 ** dp; return (r < 0 ? '-' : '') + sym + ' ' + Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp }); };
  const qtyStr = v => { const x = num(v); return Number.isInteger(x) ? String(x) : x.toLocaleString('en-US', { maximumFractionDigits: 3 }); };
  function totals() {
    const rows = S.items.filter(i => i.d.trim() || num(i.p));
    const sub = rows.reduce((a, i) => a + num(i.q || 1) * num(i.p), 0), disc = Math.min(num(S.disc), sub), rate = num(S.tax), tax = (sub - disc) * rate / 100;
    return { rows, sub, disc, rate, tax, total: sub - disc + tax };
  }
  const taxLabel = r => `${S.taxName.trim() || (S.dl === 'en' ? 'Tax' : S.dl === 'zh' ? '税' : '税 Tax')} ${qtyStr(r)}%`;
  const fmtDate = s => { if (!s) return ''; const [y, m, d] = s.split('-'); return S.dl === 'zh' ? `${y}年${+m}月${+d}日` : `${+d} ${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][m - 1]} ${y}`; };
  function meta() {
    const m = [[L('no'), S.no], [L('date'), fmtDate(S.date)]];
    if (S.type !== 'RC' && S.until) m.push([L('until_' + S.type), fmtDate(S.until)]);
    if (S.type === 'RC' && S.method.trim()) m.push([L('method'), S.method.trim()]);
    return m;
  }

  // ---- the document, as HTML (preview and printing) ----
  function paper() {
    const T = totals(), sl = S.seller, lines = s => s.split('\n').flatMap((x, i) => i ? [h('br'), x] : [x]);
    return h('div', { cls: 'fr-paper' },
      h('div', { cls: 'fr-hd' },
        h('div', { cls: 'fr-seller' }, S.logo ? h('img', { cls: 'fr-logo', src: S.logo, alt: '' }) : null, h('b', { cls: 'fr-sname' }, sl.name || '—'),
          sl.reg ? h('span', {}, `${L('reg')}: ${sl.reg}`) : null, sl.addr ? h('span', {}, ...lines(sl.addr)) : null, [sl.phone, sl.email].filter(Boolean).length ? h('span', {}, [sl.phone, sl.email].filter(Boolean).join(' · ')) : null),
        h('div', { cls: 'fr-ttl' }, h('h1', {}, L(S.type)), h('dl', { cls: 'fr-meta' }, meta().flatMap(([a, b]) => [h('dt', {}, a), h('dd', {}, b)])))),
      S.buyer.name || S.buyer.addr ? h('div', { cls: 'fr-to' }, h('p', { cls: 'fr-plbl' }, L('to_' + S.type)), h('p', {}, h('b', {}, S.buyer.name), S.buyer.addr ? [h('br'), ...lines(S.buyer.addr)] : null)) : null,
      h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, L('desc')), h('th', { cls: 'fr-n' }, L('qty')), h('th', { cls: 'fr-n' }, L('price')), h('th', { cls: 'fr-n' }, L('amt')))),
        h('tbody', {}, T.rows.map(i => h('tr', {}, h('td', {}, ...lines(i.d)), h('td', { cls: 'fr-n' }, qtyStr(i.q || 1)), h('td', { cls: 'fr-n' }, money(num(i.p))), h('td', { cls: 'fr-n' }, money(num(i.q || 1) * num(i.p))))))),
      h('div', { cls: 'fr-sum' }, S.type === 'RC' ? h('div', { cls: 'fr-paid' }, L('paid')) : h('span'),
        h('dl', { cls: 'fr-tot' },
          T.disc || T.rate ? [h('dt', {}, L('sub')), h('dd', {}, money(T.sub))] : null,
          T.disc ? [h('dt', {}, L('disc')), h('dd', {}, '-' + money(T.disc).replace(/^-/, ''))] : null,
          T.rate ? [h('dt', {}, taxLabel(T.rate)), h('dd', {}, money(T.tax))] : null,
          h('dt', { cls: 'fr-g' }, L(S.type === 'RC' ? 'total_RC' : 'total')), h('dd', { cls: 'fr-g' }, money(T.total)))),
      S.notes.trim() ? h('div', { cls: 'fr-note' }, h('p', { cls: 'fr-plbl' }, L('notes')), h('p', {}, ...lines(S.notes.trim()))) : null,
      S.bank.trim() && S.type !== 'RC' ? h('div', { cls: 'fr-note' }, h('p', { cls: 'fr-plbl' }, L('bank')), h('p', {}, ...lines(S.bank.trim()))) : null,
      S.sign ? h('div', { cls: 'fr-sign' }, h('span', {}, L('sign'))) : null,
      h('p', { cls: 'fr-made' }, DL[S.dl === 'en' ? 'en' : 'zh'].made));
  }

  // ---- the same document drawn as a picture (A4 at 150 dpi), for sending on WhatsApp ----
  const SANS = '-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC","Noto Sans SC","Microsoft YaHei",sans-serif';
  const tokens = s => s.match(/[⺀-鿿豈-﫿＀-￯　-〿가-힯]|[^\s⺀-鿿豈-﫿＀-￯　-〿가-힯]+\s*|\s+/g) || [];
  function picture() {
    const W = 1240, M = 96, R = W - M, me = document.createElement('canvas').getContext('2d'), ops = [];
    const f = (w, s) => `${w} ${s}px ${SANS}`;
    const wrap = (str, max, font) => {
      me.font = font; const outL = [];
      for (const para of String(str).split('\n')) {
        let line = '';
        for (const tk of tokens(para)) {
          if (!line || me.measureText((line + tk).trimEnd()).width <= max) line += tk; else { outL.push(line.trimEnd()); line = tk.trimStart(); }
          while (me.measureText(line.trimEnd()).width > max && line.length > 1) { let k = line.length - 1; while (k > 1 && me.measureText(line.slice(0, k)).width > max) k--; outL.push(line.slice(0, k)); line = line.slice(k); }
        }
        outL.push(line.trimEnd());
      }
      return outL;
    };
    const txt = (s, x, y, font, color = '#14161a', align = 'left') => ops.push(c => { c.font = font; c.fillStyle = color; c.textAlign = align; c.fillText(s, x, y); });
    const line = (x0, y0, x1, y1, w = 2, color = '#e3e5e9') => ops.push(c => { c.strokeStyle = color; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); });
    const para = (s, x, y, max, font, lh, color, align) => { const ls = wrap(s, max, font); ls.forEach((l, i) => txt(l, x, y + i * lh, font, color, align)); return y + ls.length * lh; };
    const T = totals(), sl = S.seller;
    // header: the seller on the left, the title and numbers on the right
    let yl = M;
    if (logoImg) { const k = Math.min(240 / logoImg.naturalWidth, 120 / logoImg.naturalHeight), w = logoImg.naturalWidth * k, hh = logoImg.naturalHeight * k; ops.push(c => c.drawImage(logoImg, M, yl, w, hh)); yl += hh + 26; }
    yl = para(sl.name || '—', M, yl + 30, 560, f(800, 32), 40);
    if (sl.reg) yl = para(`${L('reg')}: ${sl.reg}`, M, yl + 4, 560, f(400, 21), 30, '#5b616b');
    if (sl.addr) yl = para(sl.addr, M, yl + 4, 560, f(400, 21), 30, '#5b616b');
    const ce = [sl.phone, sl.email].filter(Boolean).join(' · '); if (ce) yl = para(ce, M, yl + 4, 560, f(400, 21), 30, '#5b616b');
    let yr = M + 50; const tSize = S.dl === 'both' ? 40 : 54;
    yr = para(L(S.type), R, yr, 520, f(800, tSize), tSize + 8, '#14161a', 'right') + 14;
    for (const [a, b] of meta()) { txt(b, R, yr, f(700, 22), '#14161a', 'right'); me.font = f(700, 22); txt(a, R - me.measureText(b).width - 18, yr, f(400, 20), '#5b616b', 'right'); yr += 34; }
    let y = Math.max(yl, yr) + 34;
    if (S.buyer.name || S.buyer.addr) {
      txt(L('to_' + S.type), M, y, f(600, 19), '#5b616b'); y += 34;
      if (S.buyer.name) y = para(S.buyer.name, M, y, 700, f(700, 25), 34);
      if (S.buyer.addr) y = para(S.buyer.addr, M, y + 2, 700, f(400, 21), 30, '#3a3f47');
      y += 26;
    }
    // the items
    const cQ = R - 470, cP = R - 250, cA = R, dW = cQ - 120 - M;
    txt(L('desc'), M, y, f(700, 19), '#5b616b'); txt(L('qty'), cQ, y, f(700, 19), '#5b616b', 'right'); txt(L('price'), cP, y, f(700, 19), '#5b616b', 'right'); txt(L('amt'), cA, y, f(700, 19), '#5b616b', 'right');
    y += 16; line(M, y, R, y, 3, '#14161a'); y += 40;
    for (const i of T.rows) {
      const ls = wrap(i.d || ' ', dW, f(400, 22));
      ls.forEach((l, k) => txt(l, M, y + k * 32, f(400, 22)));
      txt(qtyStr(i.q || 1), cQ, y, f(400, 22), '#14161a', 'right'); txt(money(num(i.p)), cP, y, f(400, 22), '#14161a', 'right'); txt(money(num(i.q || 1) * num(i.p)), cA, y, f(600, 22), '#14161a', 'right');
      y += (ls.length - 1) * 32 + 22; line(M, y, R, y); y += 38;
    }
    // the totals (and the PAID stamp on a receipt)
    const tr = [];
    if (T.disc || T.rate) tr.push([L('sub'), money(T.sub)]);
    if (T.disc) tr.push([L('disc'), '-' + money(T.disc).replace(/^-/, '')]);
    if (T.rate) tr.push([taxLabel(T.rate), money(T.tax)]);
    const yStamp = y;
    for (const [a, b] of tr) { txt(a, R - 260, y, f(400, 21), '#5b616b', 'right'); txt(b, R, y, f(600, 22), '#14161a', 'right'); y += 36; }
    line(R - 470, y - 14, R, y - 14, 3, '#14161a'); y += 24;
    txt(L(S.type === 'RC' ? 'total_RC' : 'total'), R - 260, y, f(700, 23), '#14161a', 'right'); txt(money(T.total), R, y, f(800, 32), '#14161a', 'right'); y += 30;
    if (S.type === 'RC') ops.push(c => { c.save(); c.translate(M + 150, yStamp + 30); c.rotate(-0.16); c.strokeStyle = '#1f9d61'; c.lineWidth = 5; c.beginPath(); c.roundRect ? c.roundRect(-140, -46, 280, 92, 14) : c.rect(-140, -46, 280, 92); c.stroke();
      c.fillStyle = '#1f9d61'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = f(800, S.dl === 'both' ? 30 : 42); c.fillText(L('paid'), 0, 2); c.restore(); });
    y += 40;
    for (const [k, v] of [['notes', S.notes], ['bank', S.type === 'RC' ? '' : S.bank]]) {
      if (!v.trim()) continue;
      txt(L(k), M, y, f(700, 19), '#5b616b'); y = para(v.trim(), M, y + 34, R - M, f(400, 21), 31, '#2b3038') + 22;
    }
    if (S.sign) { y += 70; line(R - 380, y, R, y, 2, '#14161a'); txt(L('sign'), R - 190, y + 34, f(400, 19), '#5b616b', 'center'); y += 60; }
    const H = Math.max(1754, y + M + 40);
    txt(DL[S.dl === 'en' ? 'en' : 'zh'].made, W / 2, H - 52, f(400, 17), '#9aa0a8', 'center');
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.textBaseline = 'alphabetic';
    ops.forEach(o => { c.save(); o(c); c.restore(); });
    return cv;
  }

  // ---- the form ----
  const tabs = (items, curV, pick) => h('div', { cls: 'fr-tabs', role: 'group' }, items.map(([v, k]) => h('button', { type: 'button', 'aria-pressed': String(v === curV), onclick: () => pick(v) }, t(k))));
  const fld = (k, el, opt) => h('label', { cls: 'fld' }, h('span', {}, t(k), opt ? h('i', {}, ' ' + t('opt')) : null), el);
  function bind(get, set, attrs = {}) {
    const el = h(attrs.tag || 'input', { ...attrs, tag: null }); el.value = get() ?? '';
    el.addEventListener('input', () => { set(el.value); changed(); }); return el;
  }
  const sec = k => h('h3', { cls: 'fr-sec' }, t(k));
  function itemRow(it, i) {
    const d = bind(() => it.d, v => it.d = v, { tag: 'textarea', rows: 1, maxlength: 300, 'aria-label': t('it_desc'), placeholder: t('it_desc') });
    const q = bind(() => it.q, v => it.q = v, { inputmode: 'decimal', maxlength: 10, 'aria-label': t('it_qty'), placeholder: t('it_qty') });
    const p = bind(() => it.p, v => it.p = v, { inputmode: 'decimal', maxlength: 14, 'aria-label': t('it_price'), placeholder: t('it_price') });
    return h('div', { cls: 'fr-item' }, d, q, p, h('button', { type: 'button', 'aria-label': t('del_item'), title: t('del_item'), onclick: () => { S.items.splice(i, 1); if (!S.items.length) S.items.push({ d: '', q: '1', p: '' }); drawForm(); changed(); } }, '×'));
  }
  function drawForm() {
    const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onchange: async () => {
      try { const r = await F.readImage(file.files[0], 480); S.logo = r.url; logoImg = r.img; drawForm(); changed(); } catch (e) { toast(t(e.message === 'size' ? 'e_img_size' : e.message === 'type' ? 'e_img_type' : 'e_img_read')); } file.value = ''; } });
    const curSel = h('select', { name: 'cur' }, CUR.map(([c, s]) => h('option', { value: c }, `${c} · ${s}`))); curSel.value = S.cur;
    curSel.addEventListener('change', () => { S.cur = curSel.value; changed(); });
    const methods = h('datalist', { id: 'iv-methods' }, t('m_list').split('|').map(m => h('option', { value: m })));
    put(form,
      tabs([['QT', 'ty_QT'], ['INV', 'ty_INV'], ['RC', 'ty_RC']], S.type, v => { S.type = v; if (!S.noEdited) S.no = numOf(); drawForm(); changed(); }),
      h('div', { cls: 'two' }, h('div', { cls: 'fld' }, h('span', {}, t('f_doclang')), tabs([['zh', 'dl_zh'], ['en', 'dl_en'], ['both', 'dl_both']], S.dl, v => { S.dl = v; drawForm(); changed(); })), fld('f_cur', curSel)),
      sec('sec_from'),
      h('div', { cls: 'fld' }, h('span', {}, t('logo'), h('i', {}, ' ' + t('opt'))),
        h('div', { cls: 'fr-row' }, S.logo ? h('img', { cls: 'fr-thumb', src: S.logo, alt: '' }) : null,
          h('button', { type: 'button', cls: 'btn ghost', onclick: () => file.click() }, t(S.logo ? 'logo_drop' : 'logo_pick')),
          S.logo ? h('button', { type: 'button', cls: 'fr-link', onclick: () => { S.logo = null; logoImg = null; drawForm(); changed(); } }, t('logo_del')) : null, file),
        h('p', { cls: 'fr-hint' }, t('logo_note'))),
      fld('f_sname', bind(() => S.seller.name, v => S.seller.name = v, { name: 'sname', maxlength: 120, autocomplete: 'organization' })),
      h('div', { cls: 'two' }, fld('f_sreg', bind(() => S.seller.reg, v => S.seller.reg = v, { maxlength: 60 }), true), fld('f_sphone', bind(() => S.seller.phone, v => S.seller.phone = v, { type: 'tel', maxlength: 40 }), true)),
      fld('f_semail', bind(() => S.seller.email, v => S.seller.email = v, { type: 'email', maxlength: 120 }), true),
      fld('f_saddr', bind(() => S.seller.addr, v => S.seller.addr = v, { tag: 'textarea', rows: 2, maxlength: 300 }), true),
      sec('sec_to'),
      fld('f_cname', bind(() => S.buyer.name, v => S.buyer.name = v, { maxlength: 120 }), true),
      fld('f_caddr', bind(() => S.buyer.addr, v => S.buyer.addr = v, { tag: 'textarea', rows: 2, maxlength: 300 }), true),
      sec('sec_doc'),
      h('div', { cls: 'two' }, fld('f_no', bind(() => S.no, v => { S.no = v; S.noEdited = true; }, { maxlength: 40 })), fld('f_date', bind(() => S.date, v => S.date = v, { type: 'date' }))),
      S.type === 'RC' ? fld('f_method', bind(() => S.method, v => S.method = v, { maxlength: 60, list: 'iv-methods', placeholder: t('method_ph') }), true)
        : fld(S.type === 'QT' ? 'f_valid' : 'f_due', bind(() => S.until, v => S.until = v, { type: 'date' }), true),
      methods,
      sec('sec_items'),
      h('div', { cls: 'fr-items' }, h('div', { cls: 'fr-item fr-ihead', 'aria-hidden': 'true' }, h('span', {}, t('it_desc')), h('span', {}, t('it_qty')), h('span', {}, t('it_price')), h('span')), S.items.map(itemRow)),
      h('button', { type: 'button', cls: 'btn ghost fr-add', onclick: () => { S.items.push({ d: '', q: '1', p: '' }); drawForm(); changed(); const ds = form.querySelectorAll('.fr-item textarea'); ds[ds.length - 1].focus(); } }, '+ ' + t('add_item')),
      h('div', { cls: 'fr-three' }, fld('f_disc', bind(() => S.disc, v => S.disc = v, { inputmode: 'decimal', maxlength: 14 })), fld('f_tax', bind(() => S.tax, v => S.tax = v, { inputmode: 'decimal', maxlength: 6 })), fld('f_taxname', bind(() => S.taxName, v => S.taxName = v, { maxlength: 20, placeholder: t('tax_ph') }))),
      fld('f_notes', bind(() => S.notes, v => S.notes = v, { tag: 'textarea', rows: 2, maxlength: 600, placeholder: t('notes_ph') }), true),
      S.type === 'RC' ? null : fld('f_bank', bind(() => S.bank, v => S.bank = v, { tag: 'textarea', rows: 2, maxlength: 400, placeholder: t('bank_ph') }), true),
      h('label', { cls: 'chk' }, (() => { const c = h('input', { type: 'checkbox' }); c.checked = !!S.sign; c.addEventListener('change', () => { S.sign = c.checked; changed(); }); return c; })(), h('span', {}, t('f_sign'))),
      h('div', { cls: 'fr-row fr-formfoot' },
        h('button', { type: 'button', cls: 'btn ghost', onclick: () => { S.seq[S.type] = (S.seq[S.type] || 1) + 1; Object.assign(S, blank()); S.no = numOf(); drawForm(); changed(); scrollTo({ top: form.getBoundingClientRect().top + scrollY - 100, behavior: 'smooth' }); } }, t('new_doc')),
        h('button', { type: 'button', cls: 'fr-link', onclick: () => { store.del('dn-free-inv'); toast(t('reset_ok')); setTimeout(() => location.reload(), 600); } }, t('reset_all'))));
  }

  // ---- the result ----
  let timer = 0;
  function changed() { clearTimeout(timer); timer = setTimeout(() => { keep(); render(); }, 120); }
  const ready = () => { if (!S.seller.name.trim()) return 'e_sname'; if (!totals().rows.length) return 'e_items'; return ''; };
  const fname = ext => `${PRE[S.type]}-${(S.no || numOf()).replace(/[^\w.-]+/g, '_')}.${ext}`.replace(/^(\w+)-\1-/, '$1-');
  function act(fn) {
    return async () => {
      const e = ready(); if (e) { toast(t(e)); const el = form.querySelector(e === 'e_sname' ? '[name=sname]' : '.fr-item textarea'); if (el) el.focus(); return; }
      await fn(); F.use('use');
    };
  }
  function render() {
    const doc = paper();
    put(out,
      h('div', { cls: 'fr-btns fr-ivbtns' },
        h('button', { type: 'button', cls: 'btn', onclick: act(async () => { document.body.classList.add('fr-printing'); const pr = $('#iv-print'); put(pr, paper()); await new Promise(r => setTimeout(r, 60)); print(); }) }, t('print_pdf')),
        h('button', { type: 'button', cls: 'btn ghost', onclick: act(async () => F.download(await F.canvasBlob(picture()), fname('png'))) }, t('dl_png')),
        F.canShareFiles() ? h('button', { type: 'button', cls: 'btn ghost', onclick: act(async () => { await F.sendFile(await F.canvasBlob(picture()), fname('png')); }) }, t('share')) : null),
      h('div', { cls: 'fr-paperwrap' }, doc),
      h('p', { cls: 'fr-hint' }, t('print_tip')));
  }
  // printing: only the document, on its own page
  const pr = h('div', { id: 'iv-print', cls: 'fr-printonly' }); document.body.append(pr);
  addEventListener('afterprint', () => { document.body.classList.remove('fr-printing'); put(pr); });
  DN.on(() => { drawForm(); render(); put($('#iv-up'), F.upsell('invoice')); });
})();
