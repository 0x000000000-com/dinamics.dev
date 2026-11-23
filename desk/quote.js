/* Dinamics · the quote: read it, accept it, follow the order from deposit to go-live. */
(() => {
  const { $, h, put, t, tf, api, store, copy, notify, mark, toast } = window.Desk, DN = window.DN, D = window.DESK;
  const root = $('#quote');
  const m = /^#(DN-\d{4}-\d{3,})(?:\.([\w-]{20,}))?$/.exec(location.hash || '');
  const no = m && m[1], token = m && m[2];
  let Q = null, busy = false, RC = 0;   // RC: the payment whose receipt is open (0 = the quote)
  const want = new URLSearchParams(location.search).get('receipt') || '';
  const L = () => DN.lang, tr = o => Desk.pick(o);
  const money = s => 'US$' + s;
  const link = () => `https://dinamics.dev/quote#${no}.${token}`;

  function mine() {
    const list = store.get('dn-quotes', []);
    put(root, h('h1', {}, t('q_title')), h('p', { cls: 'lede' }, t('no_quote')),
      store.get('dn-client', '') ? h('p', { style: 'margin-top:16px' }, h('a', { cls: 'btn ghost', href: '/account' }, t('q_acct'))) : null,
      list.length ? h('div', { cls: 'rows' }, h('h2', { style: 'margin-top:24px' }, t('my_quotes')), list.map(q => h('a', { cls: 'rowc', href: `/quote#${q.no}.${q.token}`, style: 'display:block;text-decoration:none;color:inherit', onclick: () => setTimeout(() => location.reload(), 0) },
        h('div', { cls: 'top2' }, h('h3', {}, q.no), h('span', { cls: 'chip' }, L() === 'zh' ? q.name : (L() === 'ms' && q.name_ms) || q.name_en || q.name))))) : null,
      h('p', { style: 'margin-top:24px' }, h('a', { cls: 'btn', href: '/order' }, t('to_order'))));
  }

  const STEPS = [['quoted', 'tr_quote'], ['accepted', 'tr_accept'], ['building', 'tr_build'], ['finished', 'tr_finish'], ['paid', 'tr_paid'], ['live', 'tr_live']];
  function track(state) {
    const at = STEPS.findIndex(s => s[0] === state);
    return h('ol', { cls: 'track', 'aria-label': t('tr_label') }, STEPS.map(([k, key], i) => h('li', { cls: i < at ? 'done' : i === at ? 'now' : '', 'aria-current': i === at ? 'step' : null }, t(key))));
  }
  function stateNote(q) {
    const dep = q.instalments[0], key = { request: 'st_request', expired: 'st_expired', cancelled: 'st_cancelled', building: 'st_building', finished: 'st_finished', paid: 'st_paid', live: 'st_live' }[q.state];
    if (q.state === 'accepted') return h('p', { cls: 'dk-msg good' }, tf('next_dep', { a: money(dep.amount), email: q.client.email }));
    return key ? h('p', { cls: 'dk-msg' + (['expired', 'cancelled'].includes(q.state) ? ' bad' : q.state === 'live' ? ' good' : '') }, t(key)) : null;
  }
  function payRow(i) {
    const st = i.status === 'paid' ? [h('span', { cls: 'chip ok' }, tf('is_paid', { d: i.paid })), i.receipt && !Q.peek ? h('button', { cls: 'dk-rc', type: 'button', onclick: () => openReceipt(i.n) }, tf('rc_btn', { no: i.receipt.no })) : null]
      : i.status === 'sent' ? h('span', { cls: 'chip' }, tf('is_sent', { d: i.due })) : h('span', { cls: 'chip dim' }, t('is_planned'));
    return h('tr', {}, h('td', { 'data-l': t('th_part') }, h('b', {}, tr(i.name))), h('td', { 'data-l': t('th_when') }, tr(i.stage)), h('td', { cls: 'n', 'data-l': t('th_share') }, i.pct + '%'),
      h('td', { cls: 'n', 'data-l': t('th_amount') }, i.amount), h('td', { 'data-l': t('th_status') }, st));
  }
  function terms(q) {
    const fee = /^[\d,.]+$/.test(q.source_fee || '') ? money(q.source_fee) : '';   // goes into the terms as HTML: digits only
    return h('ul', { cls: 'terms' }, ['tm_start', 'tm_rev', 'tm_acc', 'tm_live', 'tm_own', 'tm_show', 'tm_conf', 'tm_cancel', 'tm_excl'].map(k => h('li', { html: tf(k, { fee }) })));
  }

  // a receipt for one payment: printable, both languages, the seller as Dinamics has set it
  function openReceipt(n) { RC = n; draw(); window.scrollTo(0, 0); }
  function receipt(q, i) {
    const S = q.seller || {}, r = i.receipt, lines = a => a.filter(Boolean).flatMap((x, k) => k ? [h('br'), x] : [x]);
    document.title = `${t('rc_title')} ${r.no} · Dinamics`;
    const mark = document.querySelector('.top .brand .lockup');   // the Dinamics logo at the top of the receipt: on screen, printed and in the PDF (the page header is not printed)
    put(root,
      h('div', { cls: 'qs dk-receipt' },
        h('section', {}, mark ? h('div', { cls: 'dk-rc-logo', role: 'img', 'aria-label': 'Dinamics' }, mark.cloneNode(true)) : null,
          h('div', { cls: 'top2' }, h('h1', { style: 'margin:0;font-size:clamp(30px,4vw,44px)' }, t('rc_title')), h('span', { cls: 'chip ok' }, t('rc_paid'))),
          h('dl', { style: 'margin-top:16px' },
            h('dt', {}, t('rc_no')), h('dd', {}, h('b', {}, r.no)), h('dt', {}, t('rc_date')), h('dd', {}, r.day),
            h('dt', {}, t('rc_from')), h('dd', {}, lines([S.name, S.reg ? tf('rc_reg', { reg: S.reg }) : '', S.address, [S.email, S.phone].filter(Boolean).join(' · ')])),
            h('dt', {}, t('rc_to')), h('dd', {}, lines([[q.client.company, q.client.contact].filter(Boolean).join(' · '), [q.client.email, q.client.phone].filter(Boolean).join(' · ')])))),
        h('section', {}, h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, t('rc_item')), h('th', { cls: 'n' }, t('rc_amount')))),
          h('tbody', {}, h('tr', {}, h('td', {}, tf('rc_line', { no: q.no, name: tr(q.name), part: `${tr(i.name)} ${i.pct}%` })), h('td', { cls: 'n' }, money(r.amount)))),
          h('tfoot', {}, h('tr', {}, h('td', {}, t('rc_total')), h('td', { cls: 'n' }, money(r.amount)))))),
        h('section', {}, h('dl', {}, h('dt', {}, t('rc_via')), h('dd', {}, S.pay_via || ''), h('dt', {}, t('rc_status')), h('dd', {}, t('rc_paid_long'))),
          h('p', { cls: 'note', style: 'margin:14px 0 0' }, t('rc_note')))),
      h('div', { cls: 'tools noprint' }, h('button', { cls: 'btn', type: 'button', onclick: () => window.print() }, t('rc_print')),
        h('button', { cls: 'btn ghost', type: 'button', onclick: () => { RC = 0; if (want) history.replaceState(null, '', location.pathname + location.hash); draw(); } }, t('rc_back'))));
  }

  function draw() {
    if (!no) return mine();
    if (!Q) return;
    const ri = RC && Q.instalments.find(x => x.n === RC && x.receipt); if (ri) return receipt(Q, ri);
    document.title = t('title');
    const q = Q, items = Desk.pick(q.items);
    const kids = [
      h('p', { cls: 'num' }, t('q_title')),
      h('h1', { style: 'margin-top:12px' }, tr(q.name)),
      q.total ? h('p', { cls: 'dk-price' }, money(q.total)) : null,
      track(q.state === 'request' ? 'quoted' : q.state), q.peek ? h('p', { cls: 'dk-msg', style: 'margin-top:14px' }, t('peek_note')) : stateNote(q),
      q.account === 'can' && token ? h('div', { cls: 'dk-msg dk-claim', style: 'margin-top:14px' }, h('p', { style: 'margin:0' }, t('q_claim_p')),
        h('button', { cls: 'btn', type: 'button', style: 'margin-top:10px', onclick: async e => {
          const b = e.currentTarget; b.disabled = true;
          const r = await api('/api/client/claim', { method: 'POST', body: { no, token } });
          b.disabled = false;
          if (r.ok) { Q.account = 'mine'; toast(t('q_claimed')); draw(); } else toast(r.error === 'taken' ? t('q_claim_taken') : t('e_server'));
        } }, t('q_claim'))) : null,
      q.account === 'mine' ? h('p', { cls: 'note', style: 'margin-top:12px' }, t('q_in_acct'), ' ', h('a', { href: '/account' }, t('q_acct'))) : null,
    ];
    const sheet = h('div', { cls: 'qs' },
      h('section', {}, h('dl', {},
        h('dt', {}, t('h_no')), h('dd', {}, h('b', {}, q.no)), h('dt', {}, t('h_date')), h('dd', {}, q.created),
        q.valid_until && ['quoted', 'expired'].includes(q.state) ? [h('dt', {}, t('h_valid')), h('dd', {}, q.valid_until)] : null,
        h('dt', {}, t('h_client')), h('dd', {}, [q.client.company, q.client.contact].filter(Boolean).join(' · ')),
        h('dt', {}, t('h_contact')), h('dd', {}, [q.client.email, q.client.phone].filter(Boolean).join(' · ')),
        h('dt', {}, t('h_from')), h('dd', {}, 'Dinamics · dinamics.dev · contact@dinamics.dev'))),
      h('section', {}, h('h2', {}, t('sec_scope')),
        h('table', {}, h('thead', {}, h('tr', {}, h('th', {}, t('th_item')), h('th', { cls: 'n' }, t('th_price')))),
          h('tbody', {}, h('tr', {}, h('td', {}, h('b', {}, tr(q.name)), h('ul', { cls: 'dk-list', style: 'border:0;padding-top:8px;margin-top:4px' }, items.map(i => h('li', {}, i)))), h('td', { cls: 'n' }, q.total || t('to_price')))),
          q.total ? h('tfoot', {}, h('tr', {}, h('td', {}, t('total')), h('td', { cls: 'n' }, money(q.total)))) : null)),
      q.days[L()] ? h('section', {}, h('h2', {}, t('sec_time')), h('p', { style: 'margin:0' }, tf('time_line', { d: q.days[L()] }))) : null,
      q.instalments.length ? h('section', {}, h('h2', {}, t('sec_pay')),
        h('table', { cls: 'pay' }, h('thead', {}, h('tr', {}, h('th', {}, t('th_part')), h('th', {}, t('th_when')), h('th', { cls: 'n' }, t('th_share')), h('th', { cls: 'n' }, t('th_amount')), h('th', {}, t('th_status')))),
          h('tbody', {}, q.instalments.map(payRow))),
        h('ul', { cls: 'terms', style: 'margin-top:16px' }, ['pay1', 'pay2', 'pay3', 'pay4', 'pay5'].map(k => h('li', { html: t(k) })),
          q.year ? h('li', {}, tf('year_line', { y: money(q.year), what: t(q.kind === 'platform' ? 'year_platform' : 'year_site') })) : null)) : null,
      h('section', {}, h('h2', {}, t('sec_terms')), terms(q)));
    kids.push(sheet);
    if (q.state === 'quoted' && !q.peek) kids.push(acceptBox(q));
    if (q.accepted) kids.push(h('p', { cls: 'note', style: 'margin-top:14px' }, tf('accepted_line', { d: q.accepted.day, name: q.accepted.name, show: t(q.accepted.show_work ? 'show_yes' : 'show_no') })));
    kids.push(h('div', { cls: 'tools' },
      q.peek || !token ? null : h('button', { cls: 'btn ghost', type: 'button', onclick: () => copy(link()) }, t('copy_link')),
      q.peek || !token ? null : h('a', { cls: 'btn ghost', href: 'https://wa.me/?text=' + encodeURIComponent(`Dinamics ${q.no}: ${link()}`), target: '_blank', rel: 'noopener' }, t('wa_self')),
      h('button', { cls: 'btn ghost', type: 'button', onclick: () => window.print() }, t('print'))),
      q.peek || !token ? null : h('p', { cls: 'note noprint' }, t('keep_note')));
    put(root, kids);
  }

  function acceptBox(q) {
    const err = h('p', { cls: 'err', role: 'alert' });
    const form = h('form', { cls: 'dk-form dk-panel', style: 'margin-top:22px', novalidate: true },
      h('h2', { style: 'margin:0' }, t('sec_accept')),
      h('label', { cls: 'chk' }, h('input', { type: 'checkbox', name: 'agree', required: true }), h('span', {}, t('agree_label'))),
      h('label', { cls: 'fld' }, h('span', {}, t('sign_label')), h('input', { name: 'name', autocomplete: 'name', maxlength: 80, required: true, value: q.client.contact })),
      h('fieldset', { style: 'border:0;padding:0;margin:0' }, h('legend', { style: 'font-weight:600;margin-bottom:8px' }, t('show_q')),
        h('label', { cls: 'chk' }, h('input', { type: 'radio', name: 'show', value: 'yes', checked: true }), h('span', {}, t('show_yes_long'))),
        h('label', { cls: 'chk', style: 'margin-top:6px' }, h('input', { type: 'radio', name: 'show', value: 'no' }), h('span', {}, t('show_no_long')))),
      err, h('button', { cls: 'btn wide', type: 'submit' }, t('accept_btn')));
    form.addEventListener('submit', async e => {
      e.preventDefault(); if (busy) return;
      const name = form.elements.name.value.trim();
      if (!form.elements.agree.checked) { err.textContent = t('e_agree'); form.elements.agree.focus(); return; }
      if (name.length < 2) { err.textContent = mark(form, { name: t('e_name') }); return; }
      busy = true; const b = form.querySelector('button[type=submit]'); b.disabled = true; b.textContent = t('accepting');
      const r = await api('/api/quote/accept', { method: 'POST', token, body: { no, name, agree: true, show_work: form.elements.show.value === 'yes' } });
      busy = false; b.disabled = false; b.textContent = t('accept_btn');
      if (!r.ok) { err.textContent = r.error === 'state' ? tf('e_state', { s: t({ expired: 'state_expired', request: 'state_request', cancelled: 'state_cancelled' }[r.state] || (r.state ? 'state_accepted' : 'state_x')) }) : r.error === 'network' ? t('e_net') : t('e_server'); return; }
      Q = r.quote;
      notify(`客户已同意 ${q.no} · ${q.name.zh} · ${money(q.total)} · 去发定金付款请求`, { '报价单': q.no, '配套': q.name.zh, '金额': money(q.total), '定金': money(q.instalments[0].amount),
        '签名': name, '客户': [q.client.company, q.client.contact].filter(Boolean).join(' · '), '邮箱': q.client.email, '电话': q.client.phone, '展示作品': form.elements.show.value === 'yes' ? '同意' : '不同意', '后台': 'https://dinamics.dev/admin' }, q.client.email);
      draw(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    });
    return form;
  }

  async function load() {
    if (!no) return draw();
    put(root, h('p', { cls: 'lede' }, t('loading')));
    const r = await api('/api/quote?no=' + encodeURIComponent(no), { token });
    if (!r.ok) { put(root, h('h1', {}, t('q_title')), h('p', { cls: 'dk-msg bad', style: 'margin-top:20px' }, r.error === 'network' ? t('e_net') : !token && !store.get('dn-client', '') ? t('q_need_in') : t('e_notfound')),
      !token && !store.get('dn-client', '') ? h('p', { style: 'margin-top:16px' }, h('a', { cls: 'btn', href: '/account?next=' + encodeURIComponent('/quote#' + no) }, t('q_sign_in'))) : null); return; }
    Q = r;
    const list = store.get('dn-quotes', []);
    if (!Q.peek && token && !list.some(x => x.no === no)) { list.unshift({ no, token, name: Q.name.zh, name_en: Q.name.en, t: Date.now() }); store.set('dn-quotes', list.slice(0, 20)); }
    if (!new URLSearchParams(location.search).get('lang') && !localStorage.getItem('dinamics-lang') && Q.lang && Q.lang !== 'zh' && DN.lang !== Q.lang) {   // the quote opens in the language it was ordered in
      const b = document.querySelector(`.lang button[data-l=${Q.lang}]`); if (b) b.click();
    }
    const w = want && Q.instalments.find(x => x.receipt && x.receipt.no === want); if (w) RC = w.n;   // opened from the account: straight to that receipt
    draw();
  }
  DN.on(() => draw());
  addEventListener('hashchange', () => location.reload());
  load();
})();
