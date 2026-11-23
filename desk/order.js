/* Dinamics · order page: pick a package, leave your details, get the quote on the spot. */
(() => {
  const { $, h, put, t, tf, api, store, ref, notify, mark } = window.Desk, DN = window.DN, D = window.DESK, P = D.packages;
  let pkg = P.find(p => p.id === new URLSearchParams(location.search).get('pkg')) || null;
  const box = $('#pkg'), wrap = $('#order-wrap'), form = $('#order'), err = $('#order-err'), btn = $('#order-go');
  const money = n => 'US$' + n.toLocaleString('en-US');
  const agentIn = form.elements.agent; if (!agentIn.value) agentIn.value = ref();
  const cSel = form.elements.country;
  function fillCountries() {
    const v = cSel.value;
    put(cSel, h('option', { value: '' }, t('pick_country')), ...D.countries.map(([c, zh, en]) => h('option', { value: c }, DN.lang === 'zh' ? zh : en)), h('option', { value: 'XX' }, t('other_country')));
    cSel.value = v;
  }
  function price(p) { return [p.frm && DN.lang === 'en' ? t('from_pre') : '', money(p.usd), p.frm && DN.lang === 'zh' ? h('small', {}, t('from_suf')) : null]; }
  function draw() {
    const L = DN.lang; fillCountries();
    if (!pkg) {
      wrap.hidden = true;
      put(box, h('h1', {}, t('choose')), h('p', { cls: 'lede' }, t('choose_sub')),
        h('div', { cls: 'tiers' }, P.map(p => h('a', { cls: 'tier', href: '?pkg=' + p.id, style: 'text-decoration:none;color:inherit;display:block' },
          h('p', { cls: 'note', style: 'margin:0' }, t(p.kind === 'website' ? 'k_website' : 'k_platform')), h('h3', { style: 'margin-top:6px' }, p[L].name),
          h('p', { cls: 'pc', style: 'font-size:clamp(30px,3.4vw,40px)' }, ...price(p)), h('p', {}, p.frm ? t('frm_when') : p[L].days)))));
      return;
    }
    wrap.hidden = false;
    put(box, 
      h('p', { cls: 'num' }, t(pkg.kind === 'website' ? 'k_website' : 'k_platform')),
      h('h1', { style: 'margin-top:14px' }, pkg[L].name),
      h('p', { cls: 'dk-price' }, ...price(pkg)),
      h('p', { cls: 'dk-when' }, pkg.frm ? t('frm_when') : pkg[L].days),
      h('ul', { cls: 'dk-list' }, pkg[L].items.map(i => h('li', {}, i))),
      h('p', { cls: 'note', style: 'margin:18px 0 0' }, tf('year_line', { y: money(pkg.year), what: t(pkg.kind === 'website' ? 'year_site' : 'year_platform') })),
      h('p', { cls: 'note', style: 'margin:6px 0 0' }, t('excl')),
      h('p', { style: 'margin:16px 0 0' }, h('a', { href: '?', cls: 'note', onclick: e => { e.preventDefault(); pkg = null; history.replaceState(null, '', location.pathname); draw(); } }, t('change_pkg'))));
    $('#form-h').textContent = pkg.frm ? t('form_h_frm') : t('form_h');
    $('#note-label').textContent = pkg.frm ? t('f_note_req') : t('f_note');
    form.elements.note.required = pkg.frm; form.elements.note.placeholder = t('note_ph');
    btn.textContent = pkg.frm ? t('go_req') : t('go');
    $('#s1').textContent = pkg.frm ? t('s1_frm') : t('s1');
  }
  DN.on(draw);
  const ERR = { contact: 'e_contact', email: 'e_email', phone: 'e_phone', note: 'e_note', pkg: 'e_pkg', slow_down: 'e_slow', network: 'e_net' };
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const f = Object.fromEntries(new FormData(form));
    const body = { pkg: pkg.id, contact: (f.contact || '').trim(), company: (f.company || '').trim(), email: (f.email || '').trim(), phone: (f.phone || '').trim(), country: f.country || '',
      note: (f.note || '').trim(), agent: (f.agent || '').trim(), hp: f.website || '', lang: DN.lang };
    const bad = {};
    if (body.contact.length < 2) bad.contact = t('e_contact');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) bad.email = t('e_email');
    else if (body.phone.replace(/\D/g, '').length < 8 || body.phone.replace(/\D/g, '').length > 15) bad.phone = t('e_phone');
    else if (pkg.frm && body.note.length < 10) bad.note = t('e_note');
    if (Object.keys(bad).length) { err.textContent = mark(form, bad); return; }
    mark(form, {});
    btn.disabled = true; btn.textContent = t('working');
    const r = await api('/api/order', { method: 'POST', body });
    btn.disabled = false; btn.textContent = pkg.frm ? t('go_req') : t('go');
    if (!r.ok) {
      const k = ERR[r.error] || 'e_server';
      err.textContent = ['contact', 'email', 'phone', 'note'].includes(r.error) ? mark(form, { [r.error]: t(k) }) : t(k);
      return;
    }
    const mine = store.get('dn-quotes', []).filter(q => q.no !== r.no); mine.unshift({ no: r.no, token: r.token, name: pkg.zh.name, name_en: pkg.en.name, t: Date.now() }); store.set('dn-quotes', mine.slice(0, 20));
    notify(`新订单 ${r.no} · ${pkg.zh.name} · ${pkg.frm ? '说需求，待定价' : money(pkg.usd)}`,
      { '报价单': r.no, '配套': pkg.zh.name, '金额': pkg.frm ? '待定价' : money(pkg.usd), '联系人': body.contact, '公司': body.company, '邮箱': body.email, 'WhatsApp / 电话': body.phone,
        '国家': body.country, '需求': body.note, '代理编号': body.agent, '语言': body.lang === 'en' ? '英文' : '中文', '后台': 'https://dinamics.dev/admin' }, body.email);
    location.href = '/quote#' + r.no + '.' + r.token;
  });
})();
