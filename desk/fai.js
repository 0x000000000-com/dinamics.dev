/* Dinamics · free AI customer service trial: a sample chat that plays itself, and the application (it goes to Dinamics' admin page; we reply on WhatsApp). */
(() => {
  const { $, h, put, t, tf, api, notify, mark } = window.Desk, DN = window.DN, F = window.Free, D = window.DESK || {};
  const chat = $('#ai-chat'), form = $('#ai-form'), done = $('#ai-done');
  // ---- the sample chat: a hair salon, one booking and one hand-over ----
  const SCRIPT = [['in', 'dm1'], ['me', 'dm2'], ['in', 'dm3'], ['me', 'dm4'], ['in', 'dm5'], ['me', 'dm6', true]];
  let play = 0;
  const bubble = ([who, k, hand]) => h('div', { cls: 'fr-msg fr-' + who + (hand ? ' fr-hand' : '') }, who === 'me' ? h('span', { cls: 'fr-aib' }, 'AI') : null, h('span', {}, t(k)));
  function still() { put(chat, h('p', { cls: 'fr-tag' }, t('demo_tag')), SCRIPT.map(bubble)); }
  async function run() {
    const me = ++play, wait = ms => new Promise(r => setTimeout(r, ms));
    while (me === play) {
      put(chat, h('p', { cls: 'fr-tag' }, t('demo_tag')));
      for (const m of SCRIPT) {
        if (me !== play) return;
        if (m[0] === 'me') { const dots = h('div', { cls: 'fr-msg fr-me fr-typing', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')); chat.append(dots); await wait(1100); dots.remove(); }
        if (me !== play) return;
        const b = bubble(m); b.classList.add('fr-pop'); chat.append(b); await wait(m[0] === 'in' ? 1300 : 1700);
      }
      await wait(4200); if (me !== play) return;
      chat.classList.add('fr-fadeout'); await wait(600); chat.classList.remove('fr-fadeout');
    }
  }
  function startChat() {
    chat.setAttribute('aria-label', t('demo_tag') + ': ' + SCRIPT.map(([, k]) => t(k)).join(' / '));
    if (DN.RM && DN.RM.matches) { play++; still(); return; }
    if (!('IntersectionObserver' in window)) { run(); return; }
    still(); const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); } }, { threshold: 0.3 }); io.observe(chat);
  }

  // ---- the application ----
  const S = { channel: 'whatsapp' };
  const fld = (k, name, attrs = {}, opt = false) => h('label', { cls: 'fld' }, h('span', {}, t(k), opt ? h('i', {}, ' ' + t('opt')) : null), h(attrs.tag || 'input', { name, ...attrs, tag: null }));
  function drawForm() {
    const keepV = {}; form.querySelectorAll('[name]').forEach(e => { keepV[e.name] = e.type === 'checkbox' ? e.checked : e.value; });
    const ctry = h('select', { name: 'country' }, h('option', { value: '' }, t('pick_country')), (D.countries || []).map(([c, zh, en]) => h('option', { value: c }, DN.lang === 'zh' ? zh : en)), h('option', { value: 'XX' }, t('other_country')));
    put(form,
      h('div', { cls: 'two' }, fld('f_biz', 'business', { maxlength: 120, autocomplete: 'organization', required: true }), fld('f_kind', 'kind', { maxlength: 200, placeholder: t('kind_ph') }, true)),
      h('div', { cls: 'two' }, fld('f_who', 'contact', { maxlength: 80, autocomplete: 'name', required: true }), fld('f_wa3', 'phone', { type: 'tel', inputmode: 'tel', maxlength: 40, autocomplete: 'tel', placeholder: t('wa3_ph'), required: true })),
      h('div', { cls: 'two' }, fld('f_mail3', 'email', { type: 'email', maxlength: 120, autocomplete: 'email' }, true), h('label', { cls: 'fld' }, h('span', {}, t('f_ctry'), h('i', {}, ' ' + t('opt'))), ctry)),
      h('div', { cls: 'fld' }, h('span', {}, t('f_channel')), h('div', { cls: 'fr-tabs', role: 'group' }, ['whatsapp', 'telegram', 'website', 'other'].map(c => h('button', { type: 'button', 'aria-pressed': String(S.channel === c), onclick: () => { S.channel = c; drawForm(); } }, t('ch_' + c))))),
      fld('f_note3', 'note', { tag: 'textarea', rows: 3, maxlength: 1000, placeholder: t('note3_ph') }, true),
      h('input', { cls: 'hp', name: 'hp', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' }),
      h('label', { cls: 'chk' }, h('input', { type: 'checkbox', name: 'consent' }), h('span', {}, t('consent'))),
      h('div', { cls: 'fr-terms' }, h('p', { cls: 'fr-lbl' }, t('terms_h')), h('ol', {}, ['t1', 't2', 't3', 't4', 't5'].map(k => h('li', {}, t(k))))),
      h('p', { cls: 'err', id: 'ai-err', role: 'alert' }),
      h('button', { cls: 'btn wide', type: 'submit', id: 'ai-go' }, t('go_ai')));
    for (const [n, v] of Object.entries(keepV)) { const e = form.querySelector(`[name="${n}"]`); if (!e) continue; if (e.type === 'checkbox') e.checked = v; else e.value = v; }
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const v = n => (form.elements[n] ? String(form.elements[n].value).trim() : ''), err = $('#ai-err'), go = $('#ai-go');
    const body = { business: v('business'), kind: v('kind'), contact: v('contact'), phone: v('phone'), email: v('email'), country: v('country') === 'XX' ? '' : v('country'), channel: S.channel, note: v('note'), lang: DN.lang, hp: v('hp') };
    const problems = {};
    if (!body.business) problems.business = t('e_biz');
    if (!body.contact) problems.contact = t('e_who');
    if (body.phone.replace(/\D/g, '').length < 8) problems.phone = t('e_phone');
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) problems.email = t('e_email');
    let msg = mark(form, problems);
    if (!msg && !form.elements.consent.checked) { msg = t('e_consent'); form.elements.consent.focus(); }
    err.textContent = msg; if (msg) return;
    go.disabled = true; go.textContent = t('working');
    const r = await api('/api/free/ai', { method: 'POST', body });
    go.disabled = false; go.textContent = t('go_ai');
    if (!r.ok) {
      const map = { business: ['business', 'e_biz'], contact: ['contact', 'e_who'], phone: ['phone', 'e_phone'], email: ['email', 'e_email'] }[r.error];
      err.textContent = map ? mark(form, { [map[0]]: t(map[1]) }) : r.error === 'network' ? t('e_net') : r.error === 'slow_down' ? t('e_slow') : t('e_server');
      return;
    }
    notify('AI 客服试用申请 · ' + body.business, { 店名: body.business, 生意: body.kind, 联系人: body.contact, WhatsApp: body.phone, 邮箱: body.email, 国家: body.country, 想接在哪里: body.channel, 说明: body.note, 编号: r.id }, body.email);
    form.hidden = true;
    put(done, h('div', { cls: 'dk-msg good fr-okbox' }, h('h3', {}, tf('ai_ok_h', { name: body.contact })), h('p', {}, tf('ai_ok_p', { wa: D.wa || '' }))));
    done.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  DN.on(() => { startChat(); drawForm(); put($('#ai-up'), F.upsell('ai')); if (!form.hidden) return; const p = done.querySelector('p'); if (p) p.textContent = tf('ai_ok_p', { wa: D.wa || '' }); });
})();
