/* Dinamics · free e-card builder: fill in the details, get the card's link, its QR code, a picture of it and a contact file. Nothing is sent anywhere. */
(() => {
  const { $, h, put, t, copy, toast, store } = window.Desk, DN = window.DN, F = window.Free, E = window.ECard;
  const form = $('#cd-form'), out = $('#cd-out');
  const S = { n: '', t: '', c: '', w: '', p: '', e: '', s: '', a: '', l: DN.lang === 'en' ? 'en' : 'zh', y: 'auto', ...store.get('dn-free-card', {}) };
  let card = null, timer = 0;
  const keep = () => store.set('dn-free-card', S);
  const data = () => ({ ...S, y: S.y === 'auto' ? '' : S.y });
  const link = () => location.origin + '/free/c#' + E.encode(data());
  function problem() {
    if (!S.n.trim()) return ['n', 'e_name'];
    if (!S.w.trim() && !S.p.trim() && !S.e.trim()) return ['w', 'e_contact'];
    if (S.w.trim()) { const d = E.waNum(S.w); if (/^\s*0/.test(S.w) || d.length < 8 || d.length > 15) return ['w', 'e_wa_card']; }
    if (S.e.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(S.e.trim())) return ['e', 'e_email'];
    if (S.s.trim() && !E.siteHref(S.s)) return ['s', 'e_site'];
    return null;
  }
  const fld = (k, name, attrs = {}, opt = true) => {
    const el = h(attrs.tag || 'input', { name, ...attrs, tag: null }); el.value = S[name] || '';
    el.addEventListener('input', () => { S[name] = el.value; changed(); });
    return h('label', { cls: 'fld' }, h('span', {}, t(k), opt ? h('i', {}, ' ' + t('opt')) : null), el);
  };
  const tabs = (items, cur, pick) => h('div', { cls: 'fr-tabs', role: 'group' }, items.map(([v, k]) => h('button', { type: 'button', 'aria-pressed': String(v === cur), onclick: () => pick(v) }, k)));
  function drawForm() {
    put(form,
      fld('f_name', 'n', { maxlength: 60, autocomplete: 'name' }, false),
      h('div', { cls: 'two' }, fld('f_title', 't', { maxlength: 60, autocomplete: 'organization-title' }), fld('f_company', 'c', { maxlength: 80, autocomplete: 'organization' })),
      h('div', { cls: 'two' }, fld('f_wa2', 'w', { type: 'tel', inputmode: 'tel', maxlength: 24, placeholder: t('wa2_ph') }), fld('f_phone', 'p', { type: 'tel', inputmode: 'tel', maxlength: 24, autocomplete: 'tel' })),
      fld('f_email', 'e', { type: 'email', maxlength: 100, autocomplete: 'email' }),
      fld('f_site', 's', { type: 'text', inputmode: 'url', autocapitalize: 'off', spellcheck: 'false', maxlength: 100, placeholder: 'yourshop.com' }),
      fld('f_addr', 'a', { tag: 'textarea', rows: 2, maxlength: 160 }),
      h('div', { cls: 'fld' }, h('span', {}, t('f_clang')), tabs([['zh', '中文'], ['en', 'English']], S.l, v => { S.l = v; drawForm(); changed(true); })),
      h('div', { cls: 'fld' }, h('span', {}, t('f_style')), h('div', { cls: 'fr-swatches', role: 'group' },
        h('button', { type: 'button', cls: 'fr-swatch fr-auto', 'aria-pressed': String(S.y === 'auto'), title: t('style_auto'), 'aria-label': t('style_auto'), onclick: () => { S.y = 'auto'; drawForm(); changed(true); } }),
        E.styles.map(s => h('button', { type: 'button', cls: 'fr-swatch', style: `background:linear-gradient(135deg,${s.bg} 50%,${s.co} 50%)`, title: s[DN.lang] || s.zh, 'aria-label': s[DN.lang] || s.zh, 'aria-pressed': String(S.y === s.id), onclick: () => { S.y = s.id; drawForm(); changed(true); } }))),
        h('p', { cls: 'fr-hint' }, S.y === 'auto' ? t('style_auto') : (E.styles.find(s => s.id === S.y) || {})[DN.lang] || '')));
  }
  function changed(now) { clearTimeout(timer); timer = setTimeout(() => { keep(); render(); }, now ? 0 : 160); }
  function render() {
    if (card) card.stop();
    form.querySelectorAll('.fld').forEach(f => f.removeAttribute('aria-invalid'));
    const bad = problem();
    const d = data(), url = link();
    const stage = h('div', { cls: 'fr-cardstage' });
    card = E.el(bad && !S.n.trim() ? { ...d, n: DN.lang === 'en' ? 'Your name' : '你的名字' } : d, { lang: S.l, url, onStyle: st => { stage.style.background = `radial-gradient(120% 80% at 85% 0%, ${st.co}38, transparent 62%), ${st.bg}`; } });
    stage.append(card);
    const flip = h('button', { type: 'button', cls: 'fr-link', onclick: () => { card.flip(!card.classList.contains('ec-flipped')); } }, E.W[S.l].qr + ' / ' + E.W[S.l].front);
    if (bad) {
      const el = form.querySelector(`[name="${bad[0]}"]`); const typed = Object.values(S).some(v => v && v !== 'zh' && v !== 'en' && v !== 'auto');
      if (typed && el && (el.value.trim() || bad[1] !== 'e_name')) el.closest('.fld').setAttribute('aria-invalid', 'true');
      put(out, stage, h('p', { cls: typed ? 'dk-msg bad' : 'fr-hint' }, t(typed ? bad[1] : 'lede')));
      return;
    }
    const name = (S.n.trim().replace(/[^\w㐀-鿿-]+/g, '-').replace(/^-|-$/g, '') || 'card').slice(0, 40);
    const used = () => F.use('use');
    put(out,
      stage, flip,
      h('div', { cls: 'fr-linkbox' }, h('p', { cls: 'fr-lbl' }, t('out_link')), h('code', {}, url),
        h('div', { cls: 'fr-btns' },
          h('button', { type: 'button', cls: 'btn', onclick: () => { copy(url); used(); } }, t('copy')),
          h('a', { cls: 'btn ghost', href: url, target: '_blank', rel: 'noopener', onclick: used }, t('open_card')),
          h('a', { cls: 'btn ghost', href: 'https://wa.me/?text=' + encodeURIComponent(t('wa_text') + url), target: '_blank', rel: 'noopener', onclick: used }, t('send_wa'))),
        h('p', { cls: 'fr-hint' }, t('link_note'))),
      h('div', { cls: 'fr-btns' },
        h('button', { type: 'button', cls: 'btn ghost', onclick: async () => { const r = await F.sendFile(await F.canvasBlob(await E.pictureReady(d, url, card.styleNow(), S.l)), `ecard-${name}.png`); if (r !== 'cancel') used(); } }, t('card_png')),
        h('button', { type: 'button', cls: 'btn ghost', onclick: async () => { const c = document.createElement('canvas'); c.width = c.height = 1024; window.QR.draw(c.getContext('2d'), url, { size: 1024, quiet: 4, ecl: 'M' }); F.download(await F.canvasBlob(c), `ecard-${name}-qr.png`); used(); } }, t('qr_png')),
        h('button', { type: 'button', cls: 'btn ghost', onclick: () => { F.download(new Blob([E.vcf(d)], { type: 'text/vcard;charset=utf-8' }), `${name}.vcf`); used(); } }, t('vcf'))));
  }
  DN.on(() => { drawForm(); render(); put($('#cd-up'), F.upsell('card')); });
})();
