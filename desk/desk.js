/* Dinamics · shared bits of the order, quote and partner pages: talking to the desk server, building the page, the two languages. */
(() => {
  const D = window.DESK || {}, DN = window.DN;
  const $ = (s, r = document) => r.querySelector(s);
  // a tiny builder: never puts what someone typed in as HTML
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
      else if (k === 'cls') e.className = v;
      else if (k === 'html') e.innerHTML = v;            // only for our own fixed words
      else e.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null && k !== false) e.append(k instanceof Node ? k : String(k));
    return e;
  }
  // swap an element's content: lists are flattened and empty parts dropped (replaceChildren alone prints them as text: "null", "[object HTMLElement]")
  const put = (el, ...kids) => el.replaceChildren(...kids.flat(9).filter(k => k != null && k !== false));
  const t = k => { const T = (window.PAGE || {})[DN.lang] || {}; return T[k] ?? k; };
  const tf = (k, o) => t(k).replace(/\{(\w+)\}/g, (_, n) => o[n] ?? '');
  // data the server keeps in Chinese and English ({zh, en}): Malay pages show the English (2026-11-23)
  // words the server keeps only in Chinese and English (package names, what is included, payment parts) come in Malay from the page's own list
  const MSX = D.msx || {};
  const pick = o => {
    if (o == null) return ''; if (typeof o !== 'object' || Array.isArray(o)) return o;
    if (o[DN.lang] != null) return o[DN.lang]; if (DN.lang === 'zh') return o.zh ?? '';
    const e = o.en ?? o.zh ?? ''; return DN.lang === 'ms' ? (Array.isArray(e) ? e.map(x => MSX[x] || x) : MSX[e] || e) : e;
  };
  // country names: in Malay from the browser's own list when it has one
  let RN = null; try { RN = new Intl.DisplayNames(['ms'], { type: 'region' }); } catch (e) {}
  const cname = (c, zh, en) => DN.lang === 'zh' ? zh : DN.lang === 'ms' && RN && /^[A-Z]{2}$/.test(c) ? (RN.of(c) || en) : en;
  function toast(msg) {
    let e = $('#toast'); if (!e) { e = h('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); document.body.append(e); }
    e.textContent = msg; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), 2600);
  }
  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast(t('copied')); }
    catch (e) { const a = h('textarea', { style: 'position:fixed;opacity:0' }); a.value = text; document.body.append(a); a.select(); try { document.execCommand('copy'); toast(t('copied')); } catch (x) {} a.remove(); }
  }
  async function api(path, { method = 'GET', body, token } = {}) {
    const headers = {}; if (body) headers['content-type'] = 'application/json'; if (token) headers.authorization = 'Bearer ' + token;
    const me = store.get('dn-client', ''); if (me) headers['x-dn-client'] = me;   // a signed-in client (account page)
    let r; try { r = await fetch(D.api + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); }
    catch (e) { return { ok: false, status: 0, error: 'network' }; }
    let j = {}; try { j = await r.json(); } catch (e) {}
    return { ok: r.ok, status: r.status, error: j.error, ...j };
  }
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  // an agent's code from a shared link (?a=MY1001) is remembered for 90 days and filled into an order
  try { const a = new URLSearchParams(location.search).get('a'); if (/^[A-Z]{1,2}\d{4,6}$/i.test(a || '')) store.set('dn-ref', { a: a.toUpperCase(), t: Date.now() }); } catch (e) {}
  const ref = () => { const r = store.get('dn-ref', null); return r && Date.now() - r.t < 90 * 864e5 ? r.a : ''; };
  // a short note to Dinamics' inbox (only from the real site, never from previews or tests)
  function notify(subject, fields, replyto) {
    if (location.hostname !== 'dinamics.dev' || D.notify === false) return;
    const body = { _subject: subject, _template: 'table', _captcha: 'false', ...fields };
    if (replyto) body._replyto = replyto;
    fetch('https://formsubmit.co/ajax/contact@dinamics.dev', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) }).catch(() => {});
  }
  // country and state pickers from the ISO lists the server also checks
  function placePicker(R, { onchange } = {}) {
    const lang = () => DN.lang;
    const cSel = h('select', { id: 'f-country', name: 'country', autocomplete: 'country' });
    const rSel = h('select', { id: 'f-region', name: 'region' }), rTxt = h('input', { id: 'f-region-text', name: 'region_text', autocomplete: 'address-level1', maxlength: 60 });
    const rWrap = h('label', { cls: 'fld', for: 'f-region' }, h('span', { 'data-k': 'f_region' }), rSel, rTxt);
    function fillC() {
      const v = cSel.value; put(cSel, h('option', { value: '' }, t('pick_country')), ...R.countries.map(([c, zh, en]) => h('option', { value: c }, cname(c, zh, en))), h('option', { value: 'XX' }, t('other_country')));
      cSel.value = v || '';
    }
    function fillR() {
      const c = cSel.value, list = R.regions[c] || [], keep = rSel.value;
      put(rSel, h('option', { value: '' }, t('pick_region')), ...list.map(([code, name]) => h('option', { value: code }, name)));
      rSel.value = list.some(r => r[0] === keep) ? keep : '';
      const useList = list.length > 0;
      rWrap.hidden = !c; rSel.hidden = !useList; rSel.required = useList && !!c;
      rTxt.hidden = useList; rTxt.required = c === 'XX'; rTxt.placeholder = t('region_text_ph');
      $('[data-k=f_region]', rWrap).textContent = t('f_region');
      if (onchange) onchange();
    }
    cSel.addEventListener('change', fillR);
    DN.on(() => { fillC(); fillR(); });
    return { country: cSel, region: rSel, regionText: rTxt, regionWrap: rWrap, value: () => ({ country: cSel.value, region: rSel.hidden ? '' : rSel.value, region_text: rTxt.hidden ? '' : rTxt.value.trim() }) };
  }
  // show a field's problem next to it
  function mark(form, map) {
    form.querySelectorAll('.fld').forEach(f => f.removeAttribute('aria-invalid'));
    for (const [name, msg] of Object.entries(map)) {
      const el = form.querySelector(`[name="${name}"]`); const f = el && el.closest('.fld');
      if (f) { f.setAttribute('aria-invalid', 'true'); el.focus(); }
      return msg;
    }
    return '';
  }
  window.Desk = { $, h, put, t, tf, pick, cname, toast, copy, api, store, ref, notify, placePicker, mark };
})();
