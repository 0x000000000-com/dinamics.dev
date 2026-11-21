/* Dinamics · craft pages: language, the sign that turns from the Dinamics mark into this craft's sign. */
(() => {
  const P = window.PAGE, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const RM = matchMedia('(prefers-reduced-motion: reduce)');
  /* DN (language + who wants to hear about it) is set up in the page head, before any demo runs */
  const DN = window.DN, subs = DN.subs; let lang = DN.lang;

  function apply(l) {
    lang = l; DN.lang = l; const T = P[l];
    document.documentElement.lang = l === 'zh' ? 'zh-CN' : 'en';
    document.title = T.title;
    const md = $('meta[name="description"]'); if (md) md.setAttribute('content', T.meta);
    $$('[data-t]').forEach(e => { const v = T[e.dataset.t]; if (v != null) e.innerHTML = v });
    $$('[data-tl]').forEach(e => { const v = T[e.dataset.tl]; if (v != null) { e.setAttribute('aria-label', v); e.setAttribute('title', v) } });
    $$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === l)));
    subs.forEach(f => { try { f(l) } catch (e) { console.error(e) } });
  }
  $$('.lang button').forEach(b => b.addEventListener('click', () => {
    try { localStorage.setItem('dinamics-lang', b.dataset.l) } catch (e) {}
    apply(b.dataset.l);
  }));

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
  apply(lang);
})();
