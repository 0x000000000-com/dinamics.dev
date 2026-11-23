/* Dinamics · partner program page: the sign-up form. */
(() => {
  const { $, h, put, t, tf, api, store, copy, notify, placePicker, mark } = window.Desk, DN = window.DN, D = window.DESK;
  const form = $('#join'), err = $('#join-err'), btn = $('#join-go'), done = $('#joined');
  const place = placePicker(D.regions);
  put($('#place'), h('label', { cls: 'fld', for: 'f-country' }, h('span', { 'data-k': 'f_country' }), place.country), place.regionWrap);
  DN.on(() => { const s = $('[data-k=f_country]'); if (s) s.textContent = t('f_country'); });
  // 「我已经是代理」: the desk opens with each agent's own link
  $('#have').addEventListener('click', () => { const n = $('#have-note'); n.hidden = !n.hidden; });
  const ERR = { name: 'e_name', phone: 'e_phone', email: 'e_email', region: 'e_region', agree: 'e_agree', phone_taken: 'e_joined', slow_down: 'e_slow', network: 'e_net' };
  function showDone(code, token) {
    const portal = `https://dinamics.dev/partners#t=${token}`;
    form.hidden = true; done.hidden = false;
    put(done, 
      h('h3', {}, t('ok_h')),
      h('p', { cls: 'dk-price', style: 'font-size:clamp(40px,6vw,64px)' }, code),
      h('p', {}, t('ok_p')), h('div', { cls: 'linkbox' }, portal),
      h('div', { cls: 'tools' },
        h('button', { cls: 'btn', type: 'button', onclick: () => copy(portal) }, t('ok_copy')),
        h('a', { cls: 'btn ghost', href: 'https://wa.me/?text=' + encodeURIComponent(tf('ok_wa_text', { code, link: portal })), target: '_blank', rel: 'noopener' }, t('ok_wa')),
        h('a', { cls: 'btn ghost', href: '#t=' + token }, t('ok_open'))),
      h('p', { cls: 'note', style: 'margin-top:14px' }, t('ok_keep')));
  }
  form.addEventListener('submit', async e => {
    e.preventDefault(); err.textContent = '';
    const f = Object.fromEntries(new FormData(form)), where = place.value();
    const body = { name: (f.name || '').trim(), phone: (f.phone || '').trim(), email: (f.email || '').trim(), ...where, agree: !!form.elements.agree.checked, hp: f.website || '', lang: DN.lang };
    const bad = {};
    if (body.name.length < 2) bad.name = t('e_name');
    else if (body.phone.replace(/\D/g, '').length < 8 || body.phone.replace(/\D/g, '').length > 15) bad.phone = t('e_phone');
    else if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) bad.email = t('e_email');
    else if (!body.country || (place.region.required && !body.region) || (body.country === 'XX' && body.region_text.length < 2)) bad[body.country ? (body.country === 'XX' ? 'region_text' : 'region') : 'country'] = t('e_region');
    else if (!body.agree) { err.textContent = t('e_agree'); form.elements.agree.focus(); return; }
    if (Object.keys(bad).length) { err.textContent = mark(form, bad); return; }
    mark(form, {});
    btn.disabled = true; btn.textContent = t('working');
    const r = await api('/api/apply', { method: 'POST', body });
    btn.disabled = false; btn.textContent = t('join_btn');
    if (!r.ok) { const k = ERR[r.error] || 'e_server'; err.textContent = ['name', 'phone', 'email'].includes(r.error) ? mark(form, { [r.error]: t(k) }) : t(k); return; }
    store.set('dn-partner', r.token);
    notify(`新代理报名 ${r.code} · ${body.name}`, { '代理编号': r.code, '名字': body.name, '电话': body.phone, '邮箱': body.email, '地区': [body.country, body.region, body.region_text].filter(Boolean).join(' · '), '语言': body.lang === 'en' ? '英文' : '中文', '后台': 'https://dinamics.dev/admin' }, body.email || undefined);
    showDone(r.code, r.token);
  });
})();
