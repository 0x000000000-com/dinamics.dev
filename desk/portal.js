/* Dinamics · partner desk on /partners: an agent who opens the page with their own link (#t=…) sees their clients, deals and commission instead of the program. */
(() => {
  const { $, h, put, t, tf, api, store, copy, mark } = window.Desk, DN = window.DN;
  const root = $('#desk'), prog = $('#program'), cta = document.querySelector('.top .btn');
  let token = '', M = null, note = null;
  // the agent's own link carries the key after # (it never reaches any server log); it is kept on this device
  function enter() {
    const m = /[#&]t=([\w-]{20,})/.exec(location.hash || '');
    if (m) { store.set('dn-partner', m[1]); history.replaceState(null, '', location.pathname); M = null; }
    token = store.get('dn-partner', '');
    root.hidden = !token; prog.hidden = !!token; if (cta) cta.hidden = !!token;
    if (token) { window.scrollTo(0, 0); load(); }
  }
  function leave(msg) {
    store.del('dn-partner'); token = ''; M = null; showQR = false;
    root.hidden = true; prog.hidden = false; if (cta) cta.hidden = false;
    put($('#desk-note'), msg ? h('p', { cls: 'dk-msg bad', style: 'margin-bottom:24px' }, msg) : null);
    document.title = t('title'); window.scrollTo(0, 0);
  }
  const TIER = { agent: 'tier_agent', area: 'tier_area', state: 'tier_state' };
  const LS = { active: 'ls_active', won: 'ls_won', expired: 'ls_expired', lost: 'ls_lost', void: 'ls_void' };
  const LINK = () => `https://dinamics.dev/partners#t=${token}`;
  const safe = () => h('div', { cls: 'dk-safe', role: 'note' }, h('h3', {}, t('safe_h')),
    h('ul', {}, h('li', { html: t('safe_1') }), h('li', { html: t('safe_url') }), h('li', { html: t('safe_2') }), h('li', { html: t('safe_4') }), h('li', { html: t('safe_3') })));
  // moving to a new phone: the new phone scans this phone's screen, so no link has to be sent anywhere
  let showQR = false;
  function moveTo() {
    const box = h('div', { cls: 'rowc dk-move' });
    if (!showQR) put(box, h('p', { style: 'margin:0' }, t('move_p')), h('div', { cls: 'tools', style: 'margin-top:12px' }, h('button', { cls: 'btn', type: 'button', onclick: () => { showQR = true; draw(); } }, t('move_btn'))));
    else {
      const qr = h('div', { cls: 'dk-qr', role: 'img', 'aria-label': t('move_h') }); qr.innerHTML = window.QR.svg(LINK(), { fit: Math.min(240, Math.max(150, (root.clientWidth || 300) - 60)) });   // the desk is on screen; the new box is not yet
      put(box, h('p', { style: 'margin:0' }, t('move_p')), qr, h('p', { cls: 'dk-msg bad', style: 'margin-top:14px' }, t('move_warn')),
        h('div', { cls: 'tools' }, h('button', { cls: 'btn ghost', type: 'button', onclick: () => copy(LINK()) }, t('ok_copy')),
          h('a', { cls: 'btn ghost', href: 'https://wa.me/?text=' + encodeURIComponent(tf('ok_wa_text', { code: M.agent.code, link: LINK() })), target: '_blank', rel: 'noopener' }, t('ok_wa')),
          h('button', { cls: 'btn ghost', type: 'button', onclick: () => { showQR = false; draw(); } }, t('move_hide'))));
    }
    return [h('h2', {}, t('move_h')), box, h('p', { cls: 'note', style: 'margin-top:10px' }, t('move_lost'))];
  }
  const DS = { quoted: 'ds_quoted', accepted: 'ds_accepted', building: 'ds_building', finished: 'ds_finished', paid: 'ds_paid', live: 'ds_live', cancelled: 'ds_cancelled', expired: 'ds_expired', request: 'ds_request' };

  function leadForm() {
    const err = h('p', { cls: 'err', role: 'alert' });
    const f = h('form', { cls: 'dk-form', novalidate: true },
      h('div', { cls: 'two' },
        h('label', { cls: 'fld' }, h('span', {}, t('l_company')), h('input', { name: 'company', maxlength: 120, required: true })),
        h('label', { cls: 'fld' }, h('span', {}, t('l_contact')), h('input', { name: 'contact', maxlength: 80, required: true }))),
      h('div', { cls: 'two' },
        h('label', { cls: 'fld' }, h('span', {}, t('l_phone'), ' ', h('i', {}, t('l_one_of'))), h('input', { name: 'phone', type: 'tel', maxlength: 30, inputmode: 'tel' })),
        h('label', { cls: 'fld' }, h('span', {}, t('l_email'), ' ', h('i', {}, t('l_one_of'))), h('input', { name: 'email', type: 'email', maxlength: 120 }))),
      h('div', { cls: 'two' },
        h('label', { cls: 'fld' }, h('span', {}, t('l_region'), ' ', h('i', {}, t('opt'))), h('input', { name: 'region', maxlength: 60, placeholder: t('l_region_ph') })),
        h('label', { cls: 'fld' }, h('span', {}, t('l_stage')), h('select', { name: 'stage', required: true }, ['first', 'needs', 'quoted', 'deciding'].map(s => h('option', { value: s }, t('stage_' + s)))))),
      h('label', { cls: 'fld' }, h('span', {}, t('l_need')), h('textarea', { name: 'need', maxlength: 500, required: true, placeholder: t('l_need_ph') })),
      err, h('button', { cls: 'btn', type: 'submit' }, t('l_go')));
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = ''; if (note) { note.remove(); note = null; }
      const v = Object.fromEntries(new FormData(f)), body = { company: v.company.trim(), contact: v.contact.trim(), phone: v.phone.trim(), email: v.email.trim(), region: v.region.trim(), stage: v.stage, need: v.need.trim() };
      if (body.company.length < 2) return void (err.textContent = mark(f, { company: t('e_company') }));
      if (!body.contact) return void (err.textContent = mark(f, { contact: t('e_contact') }));
      if (!body.phone && !body.email) return void (err.textContent = mark(f, { phone: t('e_reach') }));
      if (body.need.length < 2) return void (err.textContent = mark(f, { need: t('e_need') }));
      mark(f, {});
      const b = f.querySelector('button'); b.disabled = true;
      const r = await api('/api/leads', { method: 'POST', token, body });
      b.disabled = false;
      if (r.ok) { note = h('p', { cls: 'dk-msg good' }, tf('l_ok', { c: body.company, d: r.lead.expires })); await load(); return; }
      err.textContent = r.error === 'taken' ? (r.won ? t('e_taken_won') : tf('e_lead_taken', { d: r.until })) : r.error === 'mine' ? t('e_mine')
        : r.error === 'direct' ? t('e_direct') : r.error === 'phone' ? t('e_phone') : r.error === 'email' ? t('e_email') : r.error === 'ended' ? t('e_ended') : r.error === 'slow_down' ? t('e_slow') : r.error === 'network' ? t('e_net') : t('e_server');
    });
    return f;
  }
  function leadRow(l) {
    const chip = h('span', { cls: 'chip' + (l.state === 'won' ? ' ok' : ['expired', 'lost', 'void'].includes(l.state) ? ' bad' : '') }, l.state === 'active' ? tf('ls_active_n', { n: l.days_left }) : t(LS[l.state] || l.state));
    const row = h('div', { cls: 'rowc' }, h('div', { cls: 'top2' }, h('h3', {}, l.company), chip),
      h('p', {}, [l.contact, l.need].filter(Boolean).join(' · ')),
      h('p', { cls: 'note' }, tf('l_dates', { a: l.created, b: l.expires }) + (l.ext === 'asked' ? ' · ' + t('ext_asked') : l.ext === 'grant' ? ' · ' + t('ext_grant') : l.ext === 'deny' ? ' · ' + t('ext_deny') : '')));
    if (l.ext === 'can' && l.days_left <= 30) {
      const btn = h('button', { cls: 'btn ghost', type: 'button', style: 'height:40px;margin-top:10px', onclick: () => {
        const ta = h('textarea', { maxlength: 500, placeholder: t('ext_ph'), style: 'width:100%;min-height:80px;margin-top:10px' }), e2 = h('p', { cls: 'err' });
        const send = h('button', { cls: 'btn', type: 'button', style: 'height:40px;margin-top:8px', onclick: async () => {
          if (ta.value.trim().length < 5) { e2.textContent = t('ext_short'); return; }
          send.disabled = true; const r = await api(`/api/leads/${l.id}/extend`, { method: 'POST', token, body: { note: ta.value.trim() } }); send.disabled = false;
          if (r.ok) { note = h('p', { cls: 'dk-msg good' }, t('ext_sent')); load(); } else e2.textContent = t('e_server');
        } }, t('ext_send'));
        btn.replaceWith(h('div', {}, ta, e2, send));
      } }, t('ext_btn'));
      row.append(btn);
    }
    return row;
  }
  function dealRow(d) {
    return h('div', { cls: 'rowc' }, h('div', { cls: 'top2' }, h('h3', {}, `${d.quote} · ${d.name[DN.lang] || d.name.zh}`), h('span', { cls: 'chip' + (d.state === 'live' ? ' ok' : '') }, t(DS[d.state] || d.state)), h('span', { cls: 'note' }, d.total ? 'US$' + d.total : '')),
      h('p', {}, d.client),
      d.instalments.length ? h('ul', { cls: 'dk-pays' }, d.instalments.map(i => h('li', {}, h('b', {}, i.name[DN.lang] || i.name.zh), h('span', {}, 'US$' + i.amount),
        h('span', {}, i.status === 'paid' ? tf('paid_on', { d: i.paid }) : t('not_paid')), i.commission ? h('span', { cls: 'cut' }, tf('your_cut', { a: 'US$' + i.commission })) : null))) : null);
  }
  function draw() {
    if (!token || !M) return;
    document.title = t('desk_title');
    const a = M.agent, active = M.leads.filter(l => l.state === 'active').length, won = M.leads.filter(l => l.state === 'won').length;
    const thisMonth = M.months.find(x => x.month === M.today.slice(0, 7)), owed = M.settlements.filter(s => !s.paid);
    const share = code => [['share_site', `https://dinamics.dev/work/website?a=${code}#price`], ['share_platform', `https://dinamics.dev/work/platform?a=${code}#price`]];
    put(root, 
      h('p', { cls: 'num' }, t('desk_h')),
      h('h1', { style: 'margin-top:12px' }, a.code),
      h('p', { cls: 'lede' }, [a.name, t(TIER[a.tier]), a.place ? a.place[DN.lang] || a.place.zh : a.region_text, tf('since', { d: a.since })].filter(Boolean).join(' · ')),
      a.status === 'ended' ? h('p', { cls: 'dk-msg bad', style: 'margin-top:16px' }, t('ended_note')) : null,
      safe(),
      h('div', { cls: 'stats' },
        h('div', { cls: 'stat2' }, h('b', {}, active), h('span', {}, t('st_active'))), h('div', { cls: 'stat2' }, h('b', {}, won), h('span', {}, t('st_won'))),
        h('div', { cls: 'stat2' }, h('b', {}, 'US$' + (thisMonth ? thisMonth.earned : '0.00')), h('span', {}, t('st_month'))),
        h('div', { cls: 'stat2' }, h('b', {}, 'US$' + (owed.length ? owed.map(s => Number(s.amount.replace(/,/g, ''))).reduce((x, y) => x + y, 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00')), h('span', {}, t('st_owed')))),
      a.status === 'active' ? [h('h2', {}, t('l_h')), h('p', { cls: 'note' }, t('l_rule')), h('p', { cls: 'note', style: 'margin-top:4px' }, t('l_acct')), note, h('div', { cls: 'dk-panel', style: 'margin-top:14px' }, leadForm())] : null,
      h('h2', {}, tf('my_leads', { n: M.leads.length })), M.leads.length ? h('div', { cls: 'rows' }, M.leads.map(leadRow)) : h('p', { cls: 'note' }, t('none_yet')),
      h('h2', {}, tf('my_clients', { n: (M.clients || []).length })), h('p', { cls: 'note' }, t('clients_p')),
      (M.clients || []).length ? h('div', { cls: 'rows' }, M.clients.map(c => h('div', { cls: 'rowc' }, h('div', { cls: 'top2' }, h('h3', {}, [c.name, c.company].filter(Boolean).join(' · ')),
        h('span', { cls: 'chip' }, t({ lead: 'via_lead', link: 'via_link', admin: 'via_admin' }[c.via] || 'via_admin'))),
        h('p', {}, [c.phone, c.email].filter(Boolean).join(' · ')), h('p', { cls: 'note' }, tf('cl_line', { d: c.since, n: c.orders }))))) : h('p', { cls: 'note' }, t('none_clients')),
      h('h2', {}, tf('my_deals', { n: M.deals.length })), M.deals.length ? h('div', { cls: 'rows' }, M.deals.map(dealRow)) : h('p', { cls: 'note' }, t('none_deals')),
      h('h2', {}, t('my_money')), h('p', { cls: 'note' }, t('money_rule')),
      M.months.length ? h('div', { cls: 'rows' }, M.months.map(mo => { const s = M.settlements.find(x => x.month === mo.month);
        return h('div', { cls: 'rowc' }, h('div', { cls: 'top2' }, h('h3', {}, mo.month), h('span', { cls: 'chip' + (s && s.paid ? ' ok' : '') }, s ? (s.paid ? tf('set_paid', { d: s.paid }) : t('set_due')) : t('set_open')), h('b', {}, 'US$' + mo.earned)),
          h('p', {}, mo.lines.map(l => `${(l.label && (l.label[DN.lang] || l.label.zh)) || l.note} ${l.rate ? l.rate + '%' : ''} US$${l.amount}`.replace(/\s+/g, ' ')).join(' · '))); })) : h('p', { cls: 'note' }, t('none_money')),
      h('h2', {}, t('share_h')), h('p', { cls: 'note' }, t('share_p')),
      ...share(a.code).map(([k, u]) => h('div', { cls: 'rowc', style: 'margin-top:10px' }, h('div', { cls: 'top2' }, h('h3', {}, t(k)), h('button', { cls: 'btn ghost', type: 'button', style: 'height:38px', onclick: () => copy(u) }, t('copy'))), h('p', { cls: 'linkbox' }, u))),
      ...moveTo(),
      h('p', { style: 'margin-top:34px' }, h('button', { cls: 'btn ghost', type: 'button', onclick: () => leave('') }, t('logout'))));
  }
  async function load() {
    if (!token) return;
    if (!M) put(root, h('p', { cls: 'lede' }, t('loading')));
    const r = await api('/api/me', { token });
    if (!r.ok) { if (r.status === 401) return leave(t('bad_link'));
      put(root, h('h1', {}, t('desk_h')), h('p', { cls: 'dk-msg bad', style: 'margin-top:18px' }, r.error === 'network' ? t('e_net') : t('e_server'))); return; }
    M = r; draw();
  }
  DN.on(() => draw());
  addEventListener('hashchange', enter);
  enter();
})();
