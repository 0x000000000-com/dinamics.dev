/* Dinamics · craft pages: language, the sign that turns from the Dinamics mark into this craft's sign. */
(() => {
  const P = window.PAGE, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  /* DN (language + who wants to hear about it) is set up in the page head, before any demo runs */
  const DN = window.DN, subs = DN.subs; let lang = DN.lang;

  function apply(l) {
    lang = l; DN.lang = l; const T = P[l];
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : l;
    document.title = T.title;
    const md = $('meta[name="description"]'); if (md) md.setAttribute('content', T.meta);
    $$('[data-t]').forEach(e => { const v = T[e.dataset.t]; if (v != null) e.innerHTML = v });
    $$('[data-tl]').forEach(e => { const v = T[e.dataset.tl]; if (v != null) { e.setAttribute('aria-label', v); e.setAttribute('title', v) } });
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === l)));
    const ls = $('.lsel'); if (ls) ls.value = l;
    subs.forEach(f => { try { f(l) } catch (e) { console.error(e) } });
  }
  const pick = l => { try { localStorage.setItem('dinamics-lang', l) } catch (e) {} apply(l); };
  $$('.lang button').forEach(b => b.addEventListener('click', () => pick(b.dataset.l)));
  const ls = $('.lsel'); if (ls) ls.addEventListener('change', () => pick(ls.value));   /* phones: one menu, 16px so iOS does not zoom */

  /* 返回上一页: when another door is behind this one (the trail below, the same as on the new craft pages), the visitor goes back to it;
     from the galaxy, or with nothing behind, the link itself goes to the home page at this craft's planet. */
  const bk = $('a[data-prev]');
  if (bk) {
    const TRAIL = /*trail>*/(I => {
  // the doors the visitor walked through in this tab, in order: [path, planet]. 返回上一页 reads the page before from here; the browser's own
  // history cannot tell (the samples that play inside a page add their own entries to it). Kept in sessionStorage; a page inside a frame keeps out.
  const K = 'dn-trail', KB = 'dn-trail-to', here = location.pathname, cut = p => p.replace(/(index)?\.html$/, ''), same = (a, b) => cut(a) === cut(b);
  const rd = () => { try { const t = JSON.parse(sessionStorage.getItem(K) || '[]'); return Array.isArray(t) ? t : []; } catch (e) { return []; } };
  const wr = t => { try { sessionStorage.setItem(K, JSON.stringify(t.slice(-12))); } catch (e) { } };
  if (window.top !== window) return { prev: () => null, go() { } };
  function show(kept) {
    let t = rd(), r = null, self = false, to = null;
    try { to = sessionStorage.getItem(KB); sessionStorage.removeItem(KB); } catch (e) { }
    try { const u = new URL(document.referrer); if (u.origin === location.origin) { self = same(u.pathname, here); if (cut(u.pathname) !== '/' && !self) r = u.pathname; } } catch (e) { }
    const top = t.length ? t[t.length - 1][0] : '', nav = kept ? 'back_forward' : ((performance.getEntriesByType('navigation')[0] || {}).type || 'navigate');
    const on = () => same(top, r) ? t.concat([[here, I]]) : [[r, -1], [here, I]];
    if (same(top, here) && (self || (to && same(to, here)))) return;   // the button brought the visitor here, or the page opened itself again: the trail is right
    if (!r) t = [[here, I]];                                             // from the galaxy, from outside, or by its address: nothing of ours behind it
    else if (nav === 'navigate') t = on();
    else { let k = -1; t.forEach((x, j) => { if (same(x[0], here)) k = j; }); t = k >= 0 ? t.slice(0, k + 1) : on(); }   // the browser's back, or a reload
    wr(t);
  }
  show(false); addEventListener('pageshow', e => { if (e.persisted) show(true); });
  return { prev() { const t = rd(); return t.length > 1 && same(t[t.length - 1][0], here) ? t[t.length - 2] : null; },
           go(p) { const t = rd(); t.pop(); wr(t); try { sessionStorage.setItem(KB, p[0]); } catch (e) { } } };
})/*<trail*/(+bk.hash.slice(2));
    bk.addEventListener('click', e => {
      if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const p = TRAIL.prev(); if (!p) return;
      e.preventDefault(); TRAIL.go(p); location.href = p[0];
    });
  }

  /* the sign: starts as the Dinamics mark, becomes this craft's sign (the same move as on the home page wall) */
  const g = $('.hero .glyph');
  if (g && P.g0 && P.g) {
    const L = g.querySelectorAll('line');
    const set = (a, b, p) => L.forEach((ln, j) => {
      const A = a[j], B = b[j];
      ['x1', 'y1', 'x2', 'y2'].forEach((k, n) => ln.setAttribute(k, (A[n] + (B[n] - A[n]) * p).toFixed(2)));
      ln.setAttribute('stroke-width', (A[4] + (B[4] - A[4]) * p).toFixed(2));
      ln.classList.toggle('k', !!(p > .5 ? B[5] : A[5]));
    });
    const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    if (RM.matches) set(P.g0, P.g, 1);
    else {
      set(P.g0, P.g, 0);
      setTimeout(() => {
        const t0 = performance.now();
        (function step(now) { const p = Math.min(1, (now - t0) / 900); set(P.g0, P.g, ease(p)); if (p < 1) requestAnimationFrame(step) })(t0);
      }, 380);
    }
  }
  /* prices: written in US dollars; another currency is shown at the day's rate, the price itself stays in US dollars */
  const sel = $('#prc-cur');
  let FX = null; try { FX = JSON.parse($('#fx').textContent) } catch (e) {}
  if (sel && FX) {
    const SYM = { USD: 'US$', MYR: 'RM', SGD: 'S$', THB: '฿', IDR: 'Rp', PHP: '₱', CNY: 'CN¥', HKD: 'HK$', JPY: 'JP¥', KRW: '₩', AUD: 'A$', EUR: '€', GBP: '£' };
    const nice = x => { const s = x < 1e3 ? 10 : x < 1e4 ? 50 : x < 1e5 ? 100 : x < 1e6 ? 1000 : x < 1e7 ? 1e4 : 1e5; return Math.round(x / s) * s; };
    let cur = 'USD'; try { cur = localStorage.getItem('dinamics-cur') || 'USD' } catch (e) {}
    const draw = () => {
      if (cur !== 'USD' && !FX.rates[cur]) cur = 'USD';
      $$('.amt[data-usd]').forEach(e => { const u = +e.dataset.usd; e.textContent = cur === 'USD' ? 'US$' + u.toLocaleString('en-US') : '≈ ' + SYM[cur] + nice(u * FX.rates[cur]).toLocaleString('en-US'); });
      sel.value = cur; const d = $('#prc-date'); if (d) d.textContent = FX.date;
      document.documentElement.dataset.cur = cur;
    };
    sel.addEventListener('change', () => { cur = sel.value; try { localStorage.setItem('dinamics-cur', cur) } catch (e) {} draw(); });
    subs.push(draw);
    fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=' + Object.keys(FX.rates).join(','), { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null).then(j => { if (j && j.rates && j.date) { FX = { date: j.date, rates: Object.assign({}, FX.rates, j.rates) }; draw(); } }).catch(() => {});
  }
  apply(lang);
})();
