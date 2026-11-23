/* Dinamics · client account on /account: sign up and sign in with face or fingerprint (or a password), then see every quote and order in one place. */
(() => {
  const { $, h, put, t, tf, api, store, ref, mark, toast } = window.Desk, DN = window.DN, D = window.DESK;
  const root = $('#acct'), KEY = 'dn-client';
  const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((String(s).length + 3) % 4)), c => c.charCodeAt(0));
  const canFace = !!(window.PublicKeyCredential && navigator.credentials && navigator.credentials.create);
  const device = () => { const u = navigator.userAgent; return [/iPhone|iPad/.test(u) ? 'iPhone' : /Android/.test(u) ? 'Android' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : '', /Edg\//.test(u) ? 'Edge' : /CriOS|Chrome\//.test(u) ? 'Chrome' : /Safari\//.test(u) ? 'Safari' : ''].filter(Boolean).join(' · '); };
  let reset = (/[#&]r=([\w-]{20,})/.exec(location.hash || '') || [])[1] || '';
  // after signing in, go back to the page that sent you here (only a page on this site)
  const next = (() => { const n = new URLSearchParams(location.search).get('next') || ''; return /^\/(?!\/)[\w\-/?=&.#%]*$/.test(n) ? n : ''; })();
  let M = null, how = canFace ? 'face' : 'password', resetName = '', pwOpen = false;

  const ERR = { name: 'a_e_name', email: 'e_email', phone: 'e_phone', exists: 'a_e_exists', password: 'a_e_password', login: 'a_e_login', locked: 'a_e_locked', face: 'a_e_face',
    not_verified: 'a_e_face', challenge: 'a_e_again', reset: 'a_e_reset', key_exists: 'a_e_key_exists', slow_down: 'e_slow', network: 'e_net' };
  const why = r => t(ERR[r && r.error] || 'e_server');
  const faceWhy = e => e && e.name === 'NotAllowedError' ? t('a_e_cancel') : e && e.name === 'InvalidStateError' ? t('a_e_key_exists') : e && e.error ? why(e) : t('e_server');

  // a new key on this device (sign up, a reset, or one more device), then signing in with one
  async function newKey(path, body, user) {
    const o = await api('/api/client/' + path, { method: 'POST', body }); if (!o.ok) throw o;
    const c = await navigator.credentials.create({ publicKey: { challenge: unb64u(o.challenge), rp: o.rp, user: { id: unb64u(o.handle), name: user.name, displayName: user.display },
      pubKeyCredParams: o.pubKeyCredParams, timeout: o.timeout, attestation: 'none', authenticatorSelection: o.authenticatorSelection } });
    const r = c.response;
    return { handle: o.handle, passkey: { id: c.id, alg: r.getPublicKeyAlgorithm(), publicKey: b64u(r.getPublicKey()), authenticatorData: b64u(r.getAuthenticatorData()), clientDataJSON: b64u(r.clientDataJSON), name: device() } };
  }
  async function faceIn() {
    const o = await api('/api/client/login/options', { method: 'POST', body: {} }); if (!o.ok) throw o;
    const a = await navigator.credentials.get({ publicKey: { challenge: unb64u(o.challenge), rpId: o.rpId, timeout: o.timeout, userVerification: 'required' } });
    const r = a.response;
    return api('/api/client/login', { method: 'POST', body: { id: a.id, authenticatorData: b64u(r.authenticatorData), clientDataJSON: b64u(r.clientDataJSON), signature: b64u(r.signature) } });
  }
  function signedIn(token) {
    store.set(KEY, token); reset = '';   // a reset link works once: after it, the page shows the account
    if (next) { location.href = next; return; }
    if (location.hash) history.replaceState(null, '', location.pathname);
    M = null; load();
  }
  const field = (key, input, opt) => h('label', { cls: 'fld' }, h('span', {}, t(key), opt ? [' ', h('i', {}, t('opt'))] : null), input);
  const pwInputs = () => [h('input', { name: 'password', type: 'password', autocomplete: 'new-password', minlength: 8, maxlength: 200 }), h('input', { name: 'password2', type: 'password', autocomplete: 'new-password', minlength: 8, maxlength: 200 })];
  const pwCheck = (f, err) => {
    const a = f.elements.password.value, b = f.elements.password2.value;
    if (a.length < 8) { err.textContent = mark(f, { password: t('a_e_password') }); return null; }
    if (a !== b) { err.textContent = mark(f, { password2: t('a_e_same') }); return null; }
    return a;
  };
  const safe = () => h('p', { cls: 'note', style: 'margin-top:14px' }, t('a_safe'));

  // ---------- signed out: sign in on the left, a new account on the right ----------
  function signIn() {
    const err = h('p', { cls: 'err', role: 'alert' });
    const faceBtn = canFace ? h('button', { cls: 'btn wide', type: 'button', onclick: async () => {
      err.textContent = ''; faceBtn.disabled = true;
      try { const r = await faceIn(); if (!r.ok) throw r; signedIn(r.token); } catch (e) { err.textContent = faceWhy(e); pwOpen = true; pw.hidden = false; }
      faceBtn.disabled = false;
    } }, t('a_face_in')) : null;
    const pw = h('form', { cls: 'dk-form', novalidate: true, style: 'margin-top:16px' },
      field('a_who', h('input', { name: 'who', autocomplete: 'username', maxlength: 120, placeholder: t('a_who_ph') })),
      field('a_pw', h('input', { name: 'password', type: 'password', autocomplete: 'current-password', maxlength: 200 })),
      h('button', { cls: canFace ? 'btn ghost wide' : 'btn wide', type: 'submit' }, t('a_pw_in')));
    pw.hidden = canFace && !pwOpen;
    pw.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      const who = pw.elements.who.value.trim(), password = pw.elements.password.value;
      if (!who) { err.textContent = mark(pw, { who: t('a_e_who') }); return; }
      const b = pw.querySelector('button'); b.disabled = true;
      const r = await api('/api/client/password/login', { method: 'POST', body: { who, password } });
      b.disabled = false;
      if (!r.ok) { err.textContent = why(r); return; }
      signedIn(r.token);
    });
    return h('div', { cls: 'dk-panel' }, h('h2', { style: 'margin:0' }, t('a_in_h')), h('p', { cls: 'note', style: 'margin:8px 0 16px' }, t(canFace ? 'a_in_p' : 'a_in_p_nf')),
      faceBtn, canFace ? h('p', { style: 'margin:12px 0 0' }, h('a', { href: '#', cls: 'note', onclick: ev => { ev.preventDefault(); pwOpen = !pwOpen; pw.hidden = !pwOpen; } }, t('a_pw_toggle'))) : null,
      pw, err, h('p', { cls: 'note', style: 'margin-top:14px' }, t('a_lost')));
  }
  function signUp() {
    const err = h('p', { cls: 'err', role: 'alert' });
    const cSel = h('select', { name: 'country', autocomplete: 'country' }, h('option', { value: '' }, t('pick_country')), D.countries.map(([c, zh, en]) => h('option', { value: c }, DN.lang === 'zh' ? zh : en)));
    const [p1, p2] = pwInputs();
    const pwBox = h('div', { cls: 'two' }, field('a_pw', p1), field('a_pw2', p2));
    const f = h('form', { cls: 'dk-form', novalidate: true },
      field('a_f_name', h('input', { name: 'name', autocomplete: 'name', maxlength: 80 })),
      field('a_f_company', h('input', { name: 'company', autocomplete: 'organization', maxlength: 120 }), true),
      h('div', { cls: 'two' }, field('a_f_email', h('input', { name: 'email', type: 'email', autocomplete: 'email', maxlength: 120 })),
        field('a_f_phone', h('input', { name: 'phone', type: 'tel', autocomplete: 'tel', inputmode: 'tel', maxlength: 30 }))),
      field('a_f_country', cSel, true), pwBox,
      h('div', { cls: 'hp', 'aria-hidden': 'true' }, h('label', {}, 'Website ', h('input', { name: 'website', tabindex: '-1', autocomplete: 'off' }))),
      err, h('button', { cls: 'btn wide', type: 'submit' }, t(how === 'face' ? 'a_up_face' : 'a_up_pw')),
      canFace ? h('p', { style: 'margin:0' }, h('a', { href: '#', cls: 'note', onclick: ev => { ev.preventDefault(); how = how === 'face' ? 'password' : 'face'; draw(); } }, t(how === 'face' ? 'a_up_use_pw' : 'a_up_use_face'))) : null,
      h('p', { cls: 'note' }, t('a_privacy')));
    pwBox.hidden = how === 'face';
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      const v = Object.fromEntries(new FormData(f));
      const body = { name: (v.name || '').trim(), company: (v.company || '').trim(), email: (v.email || '').trim(), phone: (v.phone || '').trim(), country: v.country || '', lang: DN.lang, ref: ref(), hp: v.website || '' };
      if (body.name.length < 2) { err.textContent = mark(f, { name: t('a_e_name') }); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) { err.textContent = mark(f, { email: t('e_email') }); return; }
      const digits = body.phone.replace(/\D/g, ''); if (digits.length < 8 || digits.length > 15) { err.textContent = mark(f, { phone: t('e_phone') }); return; }
      let way;
      if (how === 'password') { const pw = pwCheck(f, err); if (!pw) return; way = { password: pw }; }
      mark(f, {});
      const b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = t('working');
      try {
        if (!way) way = await newKey('register/options', body, { name: body.email, display: body.name });
        const r = await api('/api/client/register', { method: 'POST', body: { ...body, ...way } });
        if (!r.ok) throw r;
        signedIn(r.token);
      } catch (x) {
        err.textContent = x && x.error && ['name', 'email', 'phone'].includes(x.error) ? mark(f, { [x.error]: why(x) }) : faceWhy(x);
      }
      b.disabled = false; b.textContent = t(how === 'face' ? 'a_up_face' : 'a_up_pw');
    });
    return h('div', { cls: 'dk-panel' }, h('h2', { style: 'margin:0' }, t('a_up_h')), h('p', { cls: 'note', style: 'margin:8px 0 16px' }, t('a_up_p')), f);
  }

  // ---------- a link from Dinamics to set up the login again ----------
  function resetView() {
    const err = h('p', { cls: 'err', role: 'alert' }), [p1, p2] = pwInputs();
    const f = h('form', { cls: 'dk-form', novalidate: true }, h('div', { cls: 'two' }, field('a_pw', p1), field('a_pw2', p2)), h('button', { cls: 'btn ghost wide', type: 'submit' }, t('a_reset_pw')));
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      const pw = pwCheck(f, err); if (!pw) return;
      const r = await api('/api/client/reset', { method: 'POST', body: { r: reset, password: pw } });
      if (!r.ok) { err.textContent = why(r); return; }
      signedIn(r.token);
    });
    const face = canFace ? h('button', { cls: 'btn wide', type: 'button', onclick: async () => {
      err.textContent = '';
      try { const way = await newKey('reset/options', { r: reset }, { name: resetName, display: resetName }); const r = await api('/api/client/reset', { method: 'POST', body: { r: reset, ...way } }); if (!r.ok) throw r; signedIn(r.token); }
      catch (x) { err.textContent = faceWhy(x); }
    } }, t('a_reset_face')) : null;
    put(root, h('h1', {}, t('a_reset_h')), h('p', { cls: 'lede' }, tf('a_reset_p', { name: resetName })),
      h('div', { cls: 'dk-panel', style: 'margin-top:24px;max-width:560px' }, face, face ? h('p', { cls: 'note', style: 'margin:16px 0 10px' }, t('a_reset_or')) : null, f, err), safe());
  }

  // ---------- signed in ----------
  const DS = { request: 'a_ds_request', quoted: 'a_ds_quoted', accepted: 'a_ds_accepted', building: 'a_ds_building', finished: 'a_ds_finished', paid: 'a_ds_paid', live: 'a_ds_live', cancelled: 'a_ds_cancelled', expired: 'a_ds_expired' };
  function dealRow(q) {
    const name = q.name[DN.lang] || q.name.zh;
    return h('div', { cls: 'rowc' },
      h('div', { cls: 'top2' }, h('h3', {}, `${q.no} · ${name}`), h('span', { cls: 'chip' + (q.state === 'live' ? ' ok' : ['cancelled', 'expired'].includes(q.state) ? ' bad' : '') }, t(DS[q.state] || q.state)),
        q.total ? h('span', { cls: 'note' }, 'US$' + q.total) : null),
      q.instalments.length ? h('ul', { cls: 'dk-pays' }, q.instalments.map(i => h('li', {}, h('b', {}, i.name[DN.lang] || i.name.zh), h('span', {}, 'US$' + i.amount),
        h('span', {}, i.status === 'paid' ? tf('a_paid_on', { d: i.paid }) : i.status === 'sent' ? tf('a_sent_due', { d: i.due }) : t('a_not_yet')),
        i.receipt ? h('a', { href: `/quote?receipt=${encodeURIComponent(i.receipt.no)}#${q.no}` }, tf('a_receipt', { no: i.receipt.no })) : null))) : null,
      h('div', { cls: 'tools', style: 'margin-top:12px' }, h('a', { cls: 'btn ghost', href: '/quote#' + q.no, style: 'height:40px' }, t('a_open'))));
  }
  function ways() {
    const err = h('p', { cls: 'err', role: 'alert' }), c = M.client, [p1, p2] = pwInputs();
    const f = h('form', { cls: 'dk-form', novalidate: true, style: 'margin-top:14px' }, h('div', { cls: 'two' }, field('a_pw', p1), field('a_pw2', p2)),
      h('button', { cls: 'btn ghost', type: 'submit' }, t(c.password ? 'a_pw_change' : 'a_pw_set')));
    f.addEventListener('submit', async e => {
      e.preventDefault(); err.textContent = '';
      const pw = pwCheck(f, err); if (!pw) return;
      const r = await api('/api/client/password/set', { method: 'POST', body: { password: pw } });
      if (!r.ok) { err.textContent = why(r); return; }
      toast(t('a_pw_done')); M = null; load();
    });
    return h('div', { cls: 'rowc' },
      h('p', { style: 'margin:0' }, tf('a_ways', { n: c.keys, pw: t(c.password ? 'a_pw_yes' : 'a_pw_no') })),
      canFace ? h('div', { cls: 'tools', style: 'margin-top:12px' }, h('button', { cls: 'btn', type: 'button', onclick: async () => {
        err.textContent = '';
        try { const way = await newKey('key/options', {}, { name: c.email, display: c.name }); const r = await api('/api/client/key', { method: 'POST', body: way }); if (!r.ok) throw r; toast(t('a_key_done')); M = null; load(); }
        catch (x) { err.textContent = faceWhy(x); }
      } }, t('a_key_add'))) : null,
      f, err);
  }
  function home() {
    const c = M.client;
    document.title = t('a_title_in');
    put(root,
      h('p', { cls: 'num' }, t('a_my')),
      h('h1', { style: 'margin-top:12px' }, tf('a_hello', { name: c.name })),
      h('p', { cls: 'lede' }, [c.company, c.email, c.phone].filter(Boolean).join(' · ')),
      h('p', { cls: 'dk-msg', style: 'margin-top:16px' }, c.agent ? tf('a_agent', { code: c.agent.code, name: c.agent.name }) : t('a_direct')),
      h('div', { cls: 'tools' }, h('a', { cls: 'btn', href: '/order' }, t('a_new_order'))),
      h('h2', {}, tf('a_orders', { n: M.deals.length })),
      M.deals.length ? h('div', { cls: 'rows' }, M.deals.map(dealRow)) : h('p', { cls: 'note' }, t('a_none')),
      h('p', { cls: 'note', style: 'margin-top:12px' }, t('a_old')),
      h('h2', {}, t('a_ways_h')), ways(), safe(),
      h('p', { style: 'margin-top:34px' }, h('button', { cls: 'btn ghost', type: 'button', onclick: async () => {
        await api('/api/client/logout', { method: 'POST', body: {} }); store.del(KEY); M = null; draw();
      } }, t('a_out'))));
  }

  function draw() {
    if (reset) { document.title = t('a_title'); return resetName ? resetView() : null; }
    if (M) return home();
    document.title = t('a_title');
    put(root, h('h1', {}, t('a_h')), h('p', { cls: 'lede' }, t('a_lede')),
      next ? h('p', { cls: 'dk-msg', style: 'margin-top:16px' }, t('a_next')) : null,
      h('div', { cls: 'dk-cols' }, signIn(), signUp()), safe());
  }
  async function load() {
    if (reset) {
      const r = await api('/api/client/reset/check', { method: 'POST', body: { r: reset } });
      if (!r.ok) { put(root, h('h1', {}, t('a_reset_h')), h('p', { cls: 'dk-msg bad', style: 'margin-top:20px' }, why(r))); return; }
      resetName = r.name || ''; return draw();
    }
    if (!store.get(KEY, '')) return draw();
    put(root, h('p', { cls: 'lede' }, t('loading')));
    const r = await api('/api/client/me');
    if (!r.ok) { if (r.status === 401) store.del(KEY); M = null; return draw(); }
    M = r; draw();
  }
  DN.on(() => draw());
  load();
})();
