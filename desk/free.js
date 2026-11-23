/* Dinamics · free tools: what every tool page shares — counting (opened / used / clicked to order, never who), downloads, reading a logo, the paid next step. */
(() => {
  const { h, t } = window.Desk, D = window.DESK || {}, TOOL = D.tool || '';
  // a count for Dinamics' admin page; automated checks on the real site are not counted
  function use(ev, tool = TOOL) {
    if (!tool || (navigator.webdriver && location.hostname === 'dinamics.dev')) return;
    try { fetch(D.api + '/api/free/use', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tool, ev }), keepalive: true }).catch(() => {}); } catch (e) {}
  }
  function download(blob, name) {
    const u = URL.createObjectURL(blob), a = h('a', { href: u, download: name, hidden: true }); document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 8000);
  }
  const canvasBlob = c => new Promise(r => c.toBlob(r, 'image/png'));
  // a logo or picture someone picks: stays in this browser, made smaller so pages and files stay light
  function readImage(file, max = 900) {
    return new Promise((ok, no) => {
      if (!file || !/^image\//.test(file.type)) return no(new Error('type'));
      if (file.size > 10 * 1024 * 1024) return no(new Error('size'));
      const r = new FileReader();
      r.onerror = () => no(new Error('read'));
      r.onload = () => {
        const img = new Image();
        img.onerror = () => no(new Error('read'));
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          const url = c.toDataURL('image/png'), out = new Image(); out.onload = () => ok({ img: out, url }); out.src = url;
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }
  // the paid next step under every tool (v picks the words: the website check has three, by score)
  const NEXT = {
    check: [['/work/website', 'up_see_site'], ['/order?pkg=website-standard', 'up_order_site']],
    checkhigh: [['/work/website', 'up_see_site'], ['/order?pkg=website-animated', 'up_order_site2']],
    card: [['/dsj', 'up_see_full'], ['mailto:contact@dinamics.dev?subject=Dinamics%20e-card', 'up_talk']],
    invoice: [['/work/platform', 'up_see_platform'], ['/order?pkg=platform-starter', 'up_order_platform']],
    qr: [['/work/website', 'up_see_site'], ['/order?pkg=website-standard', 'up_order_site']],
    greeting: [['/work/brand', 'up_see_brand'], ['mailto:contact@dinamics.dev?subject=Dinamics%20brand', 'up_talk']],
    ai: [['/work/chatbot', 'up_see_bot'], ['mailto:contact@dinamics.dev?subject=Dinamics%20AI', 'up_talk']],
  };
  function upsell(tool = TOOL, v = tool) {
    return h('section', { cls: 'fr-up', 'aria-labelledby': 'fr-up-h' },
      h('h2', { id: 'fr-up-h' }, t('up_' + v + '_h')), h('p', {}, t('up_' + v + '_p')),
      h('div', { cls: 'fr-btns' }, (NEXT[v] || NEXT[tool] || []).map(([href, k], i) => h('a', { cls: 'btn' + (i ? '' : ' ghost'), href, onclick: () => use('order', tool) }, t(k)))),
      h('p', { cls: 'fr-paid' }, t('paid_note')));
  }
  // share a picture straight to WhatsApp and the like where the phone allows it; otherwise download it
  async function sendFile(blob, name) {
    try {
      const f = new File([blob], name, { type: blob.type });
      if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return 'shared'; }
    } catch (e) { if (e && e.name === 'AbortError') return 'cancel'; }
    download(blob, name); return 'saved';
  }
  const canShareFiles = () => { try { return !!(navigator.canShare && navigator.canShare({ files: [new File([''], 'x.png', { type: 'image/png' })] })); } catch (e) { return false; } };
  // the hub: each card's picture plays once as it comes into view, and again on hover
  const cards = [...document.querySelectorAll('.fr-card')];
  if (cards.length && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const play = c => { c.classList.remove('fr-on'); void c.offsetWidth; c.classList.add('fr-on'); };
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return; io.unobserve(e.target); setTimeout(() => play(e.target), 140 * (cards.indexOf(e.target) % 3));
    }), { rootMargin: '0px 0px 12% 0px' }) : null;
    cards.forEach(c => { io ? io.observe(c) : play(c); c.addEventListener('mouseenter', () => play(c)); c.addEventListener('focus', () => play(c)); });
  }
  window.Free = { use, download, canvasBlob, readImage, upsell, sendFile, canShareFiles, TOOL };
  use('open');
})();
