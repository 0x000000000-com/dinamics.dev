/* Dinamics · free website check: our server opens the site and reads it; this page explains every finding in plain words, then asks Google for a mobile speed score. */
(() => {
  const { $, h, put, t, tf, copy, api } = window.Desk, DN = window.DN, F = window.Free;
  const form = $('#ck-form'), input = $('#ck-url'), btn = $('#ck-go'), err = $('#ck-err'), out = $('#ck-out'), up = $('#ck-up');
  const CATS = ['speed', 'mobile', 'seo', 'security'];
  const band = s => (s >= 85 ? 'good' : s >= 60 ? 'warn' : 'bad');
  const COL = { good: '#3ecf8e', warn: '#f5b942', bad: '#f2605c' };
  // every finding in plain words: [name, when good, could be better, needs fixing, how to fix]; {v} is the measured value
  const CK = {
    zh: {
      ttfb: ['回应速度', '{v} 毫秒就回应了，很快。', '{v} 毫秒才回应，有点慢。', '{v} 毫秒才回应，太慢了，客户会以为网站坏了。', '换快一点的主机，或者用 CDN（例如 Cloudflare）把网站放到离客户近的地方。'],
      weight: ['首页文件大小', '首页的网页文件 {v} KB，很轻。', '首页的网页文件 {v} KB，偏重，手机网络下要等一下。', '首页的网页文件 {v} KB，太重了。', '把写在网页里的大段代码和数据拆出去，图片不要直接塞进网页文件。'],
      compress: ['压缩传送', '有压缩（{v}），传得快。', '', '没有压缩，同样的内容要多传好几倍。', '在主机上打开 gzip 或 Brotli 压缩。'],
      blocking: ['卡住画面的脚本', '没有会卡住画面的脚本。', '有 {v} 个脚本会让画面晚一点出来。', '有 {v} 个脚本会卡住画面。', '给这些脚本加上 defer 或 async，让画面先出来。'],
      redirects: ['跳转次数', '打开就到，没有多余的跳转。', '要先跳转 {v} 次才到首页。', '要先跳转 {v} 次才到首页，白白浪费时间。', '让网址一次就到最终页面，例如直接用 https:// 开头的那个版本。'],
      viewport: ['手机排版', '有手机设置，手机上会按屏幕大小排版。', '有手机设置，但写法不对，手机上可能显示成缩小的电脑版。', '没有手机设置，手机上会显示成缩小的电脑版，字小得看不清。', '在网页里加上 viewport 设置，并做手机版的排版。'],
      icon: ['网站图标', '有网站图标，浏览器标签和手机桌面上看得到你的标志。', '', '没有网站图标，浏览器标签上是一张空白。', '加上 favicon 和 apple-touch-icon。'],
      lang: ['网页语言', '标明了网页语言（{v}），翻译和读屏软件知道怎么处理。', '', '没有标明网页语言。', '在 html 标签上写清楚 lang，例如 zh 或 en。'],
      title: ['标题', '标题：{v}', '标题“{v}”太长或太短，Google 搜索结果里显示得不好。', '没有标题，Google 不知道这一页叫什么。', '写一个 10 到 70 个字、带店名和主要服务的标题。'],
      desc: ['搜索简介', '有搜索简介（{v} 个字），Google 结果里会显示。', '有搜索简介，但长度（{v} 个字）不太合适。', '没有搜索简介，Google 会自己从页面里随便抓一段。', '写一段 50 到 160 个字的简介：你是谁、做什么、在哪里。'],
      h1: ['主标题', '有 1 个主标题，结构清楚。', '有 {v} 个主标题，Google 分不清哪个最重要。', '没有主标题（h1）。', '每一页留一个 h1，写最重要的那句话。'],
      alt: ['图片说明', '图片都有文字说明。', '{v} 张图片没有文字说明。', '{v} 张图片没有文字说明，Google 看不懂这些图。', '给每张图片写上 alt 文字说明。'],
      canonical: ['正式网址', '标明了正式网址。', '', '没有标明正式网址，同一页可能被当成好几页。', '加上 canonical 链接。'],
      indexable: ['允许 Google 收录', '允许 Google 收录。', '', '这一页设置了不让 Google 收录，搜索不到你。', '去掉 noindex 设置。'],
      share: ['分享预览', '分享到 WhatsApp、Facebook 时有标题和图片。', '分享时只有标题，或者只有图片。', '分享到 WhatsApp、Facebook 时没有标题和预览图。', '加上 og:title 和 og:image。'],
      schema: ['结构化资料', '有结构化资料，Google 能直接读到店名、地址这些。', '', '没有结构化资料。', '加上 JSON-LD（例如 LocalBusiness），Google 结果里能显示更多资料。'],
      https: ['https 加密', '用了 https，客户填的资料是加密传送的。', '', '没有 https，浏览器会标示“不安全”。', '装上 SSL 证书（很多主机免费送），全站改用 https。'],
      to_https: ['自动转到 https', '打 http:// 也会自动转到 https://。', '没办法确认打 http:// 会不会转到 https://。', '打 http:// 不会转到 https://，客户可能停在不加密的版本。', '在主机上设置：http 自动跳转到 https。'],
      hsts: ['强制加密', '有 HSTS，浏览器以后只会用加密连接。', '', '没有 HSTS。', '加上 Strict-Transport-Security 设置。'],
      frame: ['防止被嵌入', '别人不能把你的网站偷偷嵌进他们的网页。', '', '别人可以把你的网站嵌进他们的网页，骗客户点按钮。', '加上 X-Frame-Options 或 frame-ancestors 设置。'],
      nosniff: ['文件类型保护', '有 nosniff 保护。', '', '没有 nosniff 保护，浏览器可能把文件当成别的类型来执行。', '加上 X-Content-Type-Options: nosniff。'],
      mixed: ['混合内容', '图片和脚本都走 https。', '', '有 {v} 个图片或脚本还在用 http://，浏览器会挡掉，或者标示不安全。', '把这些地址都改成 https://。'],
      version: ['软件版本外露', '没有对外显示服务器的软件版本。', '对外显示了软件版本（{v}），别人更容易找到能攻击的漏洞。', '', '在服务器设置里关掉版本号显示。'],
    },
    en: {
      ttfb: ['Response time', 'Answered in {v} ms. Fast.', 'Took {v} ms to answer. A little slow.', 'Took {v} ms to answer. Too slow: customers will think the site is broken.', 'Move to a faster host, or use a CDN (such as Cloudflare) to serve the site close to your customers.'],
      weight: ['Home page size', 'The home page file is {v} KB. Light.', 'The home page file is {v} KB. On the heavy side for phone networks.', 'The home page file is {v} KB. Too heavy.', 'Move large blocks of code and data out of the page, and don’t put pictures inside the page file itself.'],
      compress: ['Compression', 'Compressed ({v}), so it arrives fast.', '', 'Not compressed: the same page takes several times longer to send.', 'Turn on gzip or Brotli compression on your host.'],
      blocking: ['Scripts that hold up the page', 'No scripts hold up the page.', '{v} scripts make the page appear later.', '{v} scripts hold up the page.', 'Add defer or async to these scripts so the page appears first.'],
      redirects: ['Redirects', 'Opens straight away, with no extra redirects.', 'It redirects {v} times before reaching the home page.', 'It redirects {v} times before reaching the home page, wasting time.', 'Make the address go straight to the final page, for example the https:// version.'],
      viewport: ['Phone layout', 'It has a phone setting, so it lays out to fit the screen.', 'It has a phone setting, but written wrongly: phones may show a shrunken desktop page.', 'No phone setting: phones show a shrunken desktop page with text too small to read.', 'Add the viewport setting and a phone layout.'],
      icon: ['Site icon', 'It has an icon, shown on browser tabs and phone home screens.', '', 'No icon: browser tabs show a blank.', 'Add a favicon and an apple-touch-icon.'],
      lang: ['Page language', 'The page says its language ({v}), so translation and screen readers know what to do.', '', 'The page doesn’t say its language.', 'Set lang on the html tag, e.g. en or zh.'],
      title: ['Title', 'Title: {v}', 'The title “{v}” is too long or too short to show well in Google.', 'No title: Google doesn’t know what this page is called.', 'Write a title of 10 to 70 characters with your name and main service.'],
      desc: ['Search description', 'It has a search description ({v} characters) that Google can show.', 'It has a search description, but its length ({v} characters) isn’t ideal.', 'No search description: Google will pick any text from the page.', 'Write 50 to 160 characters on who you are, what you do and where.'],
      h1: ['Main heading', 'One main heading. Clear structure.', '{v} main headings: Google can’t tell which matters most.', 'No main heading (h1).', 'Keep one h1 per page, with the most important sentence.'],
      alt: ['Picture descriptions', 'Every picture has a text description.', '{v} pictures have no text description.', '{v} pictures have no text description, so Google can’t understand them.', 'Give every picture alt text.'],
      canonical: ['Main address', 'It names its main address.', '', 'It doesn’t name its main address, so one page may be counted as several.', 'Add a canonical link.'],
      indexable: ['Open to Google', 'Google is allowed to list it.', '', 'This page tells Google not to list it, so nobody can find it by searching.', 'Remove the noindex setting.'],
      share: ['Share preview', 'Shared on WhatsApp or Facebook, it shows a title and a picture.', 'Shared, it shows only a title or only a picture.', 'Shared on WhatsApp or Facebook, it shows no title and no picture.', 'Add og:title and og:image.'],
      schema: ['Structured data', 'It has structured data, so Google can read your name, address and so on.', '', 'No structured data.', 'Add JSON-LD (e.g. LocalBusiness) so Google can show more about you.'],
      https: ['https', 'Uses https, so what customers type is sent encrypted.', '', 'No https: browsers mark it “Not secure”.', 'Install an SSL certificate (many hosts include one free) and use https everywhere.'],
      to_https: ['Sends http to https', 'Typing http:// takes people to https://.', 'We couldn’t tell whether http:// goes to https://.', 'http:// doesn’t go to https://, so customers may stay on the unencrypted version.', 'Set your host to redirect http to https.'],
      hsts: ['HSTS', 'It has HSTS, so browsers only use encrypted connections from now on.', '', 'No HSTS.', 'Add a Strict-Transport-Security header.'],
      frame: ['Framing protection', 'Other sites can’t secretly put your site inside theirs.', '', 'Other sites can put your site inside theirs and trick customers into clicking.', 'Add X-Frame-Options or frame-ancestors.'],
      nosniff: ['File type protection', 'It has nosniff protection.', '', 'No nosniff protection: browsers may treat files as a different type.', 'Add X-Content-Type-Options: nosniff.'],
      mixed: ['Mixed content', 'Pictures and scripts all load over https.', '', '{v} pictures or scripts still load over http://, so browsers block them or warn.', 'Change those addresses to https://.'],
      version: ['Software version shown', 'The server doesn’t show its software version.', 'The server shows its software version ({v}), which makes known holes easier to find.', '', 'Turn off the version number in your server settings.'],
    },
  };
  const text = (c, i) => {
    const row = (CK[DN.lang] || CK.zh)[c.id] || [c.id, '', '', '', ''];
    let v = c.val ?? '';
    if (c.id === 'alt') v = String(v).split('/')[0];
    return (row[i] || row[1]).replace('{v}', String(v));
  };
  const nice = u => { try { const x = new URL(u); return x.host + (x.pathname === '/' ? '' : x.pathname); } catch (e) { return u; } };

  let run = 0, last = null;
  async function check(raw) {
    const me = ++run; err.textContent = ''; btn.disabled = true; btn.textContent = t('working');
    const steps = h('ol', { cls: 'fr-steps' }, ['st1', 'st2', 'st3', 'st4', 'st5'].map(k => h('li', {}, t(k))));
    put(out, steps); put(up);
    let i = 0; const tick = setInterval(() => { [...steps.children].forEach((li, k) => li.className = k < i ? 'fr-done' : k === i ? 'fr-now' : ''); i = Math.min(i + 1, 4); }, 650);
    const r = await api('/api/free/check', { method: 'POST', body: { url: raw } });
    clearInterval(tick); if (me !== run) return;
    btn.disabled = false; btn.textContent = t('go_check');
    if (!r.ok) {
      put(out); last = null;
      const e = r.error || '';
      err.textContent = e === 'network' ? t('e_net') : e === 'slow_down' ? t('e_slow') : e === 'url' ? t('e_url') : e === 'timeout' ? t('e_timeout') : e === 'unreachable' ? t('e_unreachable')
        : e === 'redirect_blocked' ? t('e_redirect') : e === 'too_many_redirects' ? t('e_redirects') : e === 'not_html' ? t('e_not_html') : /^http_\d+$/.test(e) ? tf('e_http', { code: e.slice(5) }) : t('e_server');
      input.focus(); return;
    }
    last = r; history.replaceState(null, '', '?url=' + encodeURIComponent(nice(r.url)) + (DN.lang === 'en' ? '&lang=en' : ''));
    draw(true); speed(r.url);
  }

  // the score, the four parts, every finding
  function draw(animate) {
    const r = last; if (!r) return;
    const b = band(r.score), ring = h('div', { cls: 'fr-ring', style: `--p:${animate ? 0 : r.score};--c:${COL[b]}` }, h('b', {}, animate ? '0' : String(r.score)));
    const cats = h('div', { cls: 'fr-cats' }, CATS.map(c => h('div', { cls: 'fr-cat' }, h('span', {}, t('c_' + c)),
      h('div', { cls: 'fr-bar' }, h('i', { style: `--p:${animate ? 0 : r.cats[c]};--c:${COL[band(r.cats[c])]}`, 'data-p': r.cats[c] })), h('span', {}, String(r.cats[c])))));
    const groups = CATS.map(c => {
      const xs = r.checks.filter(x => x.cat === c).sort((a, z) => ['bad', 'warn', 'good'].indexOf(a.level) - ['bad', 'warn', 'good'].indexOf(z.level));
      const item = x => h('li', { cls: 'fr-check' }, h('span', { cls: 'fr-dot fr-' + x.level, 'aria-label': t('lv_' + x.level) }, x.level === 'good' ? '✓' : x.level === 'warn' ? '!' : '✕'),
        h('div', {}, h('b', {}, text(x, 0)), h('p', {}, text(x, x.level === 'good' ? 1 : x.level === 'warn' ? 2 : 3)), x.level === 'good' ? null : h('p', { cls: 'fr-fix' }, t('fix') + text(x, 4))));
      const todo = xs.filter(x => x.level !== 'good'), fine = xs.filter(x => x.level === 'good');
      return h('section', { cls: 'fr-group' }, h('h3', {}, t('c_' + c), h('span', {}, String(r.cats[c]))),
        todo.length ? h('ul', { cls: 'fr-checks' }, todo.map(item)) : null,
        fine.length ? h('details', { cls: 'fr-fine', open: !todo.length }, h('summary', {}, tf('good_n', { n: fine.length })), h('ul', { cls: 'fr-checks' }, fine.map(item))) : null);
    });
    const when = new Date().toLocaleString(DN.lang === 'en' ? 'en-GB' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
    put(out,
      h('div', { cls: 'fr-rhead' }, h('h2', {}, t('r_for')), h('p', {}, h('a', { href: r.url, target: '_blank', rel: 'noopener nofollow' }, nice(r.url))), h('p', { cls: 'note' }, r.cached ? t('r_cached') : tf('r_at', { t: when }))),
      h('div', { cls: 'fr-score' }, h('div', { cls: 'fr-ringwrap' }, ring, h('span', {}, t('r_total'))), h('div', {}, h('p', { cls: 'fr-verdict' }, t('v_' + (b === 'warn' ? 'ok' : b))), cats)),
      h('div', { cls: 'fr-psi', id: 'ck-psi' }), groups,
      h('div', { cls: 'fr-btns' }, h('button', { type: 'button', cls: 'btn ghost', onclick: () => copy(location.origin + '/free/check?url=' + encodeURIComponent(nice(r.url))) }, t('share_link')),
        h('button', { type: 'button', cls: 'btn ghost', onclick: () => { input.value = ''; input.focus(); scrollTo({ top: 0, behavior: 'smooth' }); } }, t('again'))));
    drawPsi();
    put(up, F.upsell('check', r.score >= 85 ? 'checkhigh' : r.score >= 60 ? 'checkmid' : 'check'));
    if (animate) countUp(ring, r.score, out.querySelectorAll('.fr-bar i'));
  }
  function countUp(ring, to, bars) {
    if (DN.RM && DN.RM.matches) { ring.style.setProperty('--p', to); ring.firstChild.textContent = to; bars.forEach(i => i.style.setProperty('--p', i.dataset.p)); return; }
    const t0 = performance.now(), D = 1100, ease = x => 1 - Math.pow(1 - x, 3);
    requestAnimationFrame(function f(now) {
      const k = Math.min(1, (now - t0) / D), e = ease(k);
      ring.style.setProperty('--p', (to * e).toFixed(1)); ring.firstChild.textContent = Math.round(to * e);
      bars.forEach(i => i.style.setProperty('--p', (i.dataset.p * e).toFixed(1)));
      if (k < 1) requestAnimationFrame(f);
    });
  }

  // Google's mobile test: slow, so it runs after the main results are on screen
  let psi = null, psiRun = 0;
  async function speed(url) {
    const me = ++psiRun; psi = { busy: true, url }; drawPsi();
    const r = await api('/api/free/speed', { method: 'POST', body: { url } });
    if (me !== psiRun) return;
    psi = r.ok ? { url, ...r } : { url, error: r.error || 'busy' }; drawPsi();
  }
  function drawPsi() {
    const box = $('#ck-psi'); if (!box || !last) return;
    if (!psi || psi.url !== last.url) return put(box, h('h3', {}, t('psi_h')), h('button', { type: 'button', cls: 'btn ghost', onclick: () => speed(last.url) }, t('psi_go')));
    if (psi.busy) return put(box, h('h3', {}, t('psi_h')), h('p', { cls: 'fr-wait' }, h('span', { cls: 'fr-spin', 'aria-hidden': 'true' }), t('psi_run')));
    if (psi.error) return put(box, h('h3', {}, t('psi_h')), h('p', {}, t(psi.error === 'slow_down' ? 'e_slow' : 'psi_busy')), h('button', { type: 'button', cls: 'btn ghost', onclick: () => speed(last.url) }, t('psi_again')));
    const b = band(psi.score);
    put(box, h('h3', {}, t('psi_h')),
      h('div', { cls: 'fr-psirow' }, h('div', { cls: 'fr-ring fr-ring-s', style: `--p:${psi.score};--c:${COL[b]}` }, h('b', {}, String(psi.score))),
        h('dl', {}, [['m_fcp', psi.fcp], ['m_lcp', psi.lcp], ['m_tbt', psi.tbt], ['m_cls', psi.cls]].map(([k, v]) => h('div', {}, h('dt', {}, t(k)), h('dd', {}, v || '—'))))),
      h('p', { cls: 'note' }, t('psi_note')));
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const v = input.value.trim(); if (!v) { err.textContent = t('e_url'); input.focus(); return; }
    check(v);
  });
  const about = () => h('section', { cls: 'fr-about' }, h('h2', {}, t('ab_h')), h('div', {}, CATS.map(c => h('div', {}, h('b', {}, t('c_' + c)), h('p', {}, t('ab_' + c))))));
  DN.on(() => { input.placeholder = t('url_ph'); if (!btn.disabled) btn.textContent = t('go_check'); if (last) draw(false); else if (!btn.disabled) put(out, about()); });
  const q = new URLSearchParams(location.search).get('url');
  if (q) { input.value = q; check(q); }
})();
