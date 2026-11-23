/* Dinamics · QR code for a short text (byte mode, error level M, versions 1-10), drawn as an SVG. */
(() => {
  const ECC = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];   // error-correction codewords per block, level M
  const BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];           // number of blocks, level M
  const mul = (x, y) => { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z; };
  const rawModules = v => { let r = (16 * v + 128) * v + 64; if (v >= 2) { const a = Math.floor(v / 7) + 2; r -= (25 * a - 10) * a - 55; if (v >= 7) r -= 36; } return r; };
  const dataCap = v => Math.floor(rawModules(v) / 8) - ECC[v] * BLOCKS[v];
  function divisor(d) {
    const r = new Array(d).fill(0); r[d - 1] = 1; let root = 1;
    for (let i = 0; i < d; i++) { for (let j = 0; j < d; j++) { r[j] = mul(r[j], root); if (j + 1 < d) r[j] ^= r[j + 1]; } root = mul(root, 2); }
    return r;
  }
  function remainder(data, div) {
    const r = new Array(div.length).fill(0);
    for (const b of data) { const f = b ^ r.shift(); r.push(0); div.forEach((c, i) => { r[i] ^= mul(c, f); }); }
    return r;
  }
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => x * y % 2 + x * y % 3 === 0,
    (x, y) => (x * y % 2 + x * y % 3) % 2 === 0, (x, y) => ((x + y) % 2 + x * y % 3) % 2 === 0];

  function matrix(text, mask) {
    const bytes = Array.from(new TextEncoder().encode(String(text)));
    let v = 1; while (v <= 10 && 4 + (v < 10 ? 8 : 16) + bytes.length * 8 > dataCap(v) * 8) v++;
    if (v > 10) throw new Error('text too long for a QR code here');
    // data bits: mode, length, bytes, terminator, then pad bytes
    const bits = [], add = (val, k) => { for (let i = k - 1; i >= 0; i--) bits.push((val >>> i) & 1); }, cap = dataCap(v) * 8;
    add(4, 4); add(bytes.length, v < 10 ? 8 : 16); bytes.forEach(b => add(b, 8));
    add(0, Math.min(4, cap - bits.length)); add(0, (8 - bits.length % 8) % 8);
    for (let p = 0xEC; bits.length < cap; p ^= 0xEC ^ 0x11) add(p, 8);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => a * 2 + b, 0));
    // error correction per block, then interleave
    const nb = BLOCKS[v], ec = ECC[v], raw = Math.floor(rawModules(v) / 8), short = nb - raw % nb, sl = Math.floor(raw / nb), div = divisor(ec), blocks = [];
    for (let i = 0, k = 0; i < nb; i++) { const d = data.slice(k, k + sl - ec + (i < short ? 0 : 1)); k += d.length; const e = remainder(d, div); if (i < short) d.push(0); blocks.push(d.concat(e)); }
    const cw = []; for (let i = 0; i < blocks[0].length; i++) blocks.forEach((b, j) => { if (i !== sl - ec || j >= short) cw.push(b[i]); });
    // fixed patterns
    const n = v * 4 + 17, M = Array.from({ length: n }, () => new Array(n).fill(false)), F = Array.from({ length: n }, () => new Array(n).fill(false));
    const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
    for (let i = 0; i < n; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
      const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy)); if (x >= 0 && x < n && y >= 0 && y < n) set(x, y, d !== 2 && d !== 4); } };
    finder(3, 3); finder(n - 4, 3); finder(3, n - 4);
    if (v >= 2) {
      const na = Math.floor(v / 7) + 2, step = Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2, pos = [6];
      for (let p = n - 7; pos.length < na; p -= step) pos.splice(1, 0, p);
      pos.forEach((a, i) => pos.forEach((b, j) => {
        if ((i === 0 && j === 0) || (i === 0 && j === na - 1) || (i === na - 1 && j === 0)) return;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(a + dx, b + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
      }));
    }
    const format = m => {   // level M is 00, so the five data bits are just the mask number
      let r = m; for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((m << 10) | r) ^ 0x5412, g = i => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, g(i)); set(8, 7, g(6)); set(8, 8, g(7)); set(7, 8, g(8)); for (let i = 9; i < 15; i++) set(14 - i, 8, g(i));
      for (let i = 0; i < 8; i++) set(n - 1 - i, 8, g(i)); for (let i = 8; i < 15; i++) set(8, n - 15 + i, g(i)); set(8, n - 8, true);
    };
    if (v >= 7) {
      let r = v; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25);
      const b = (v << 12) | r; for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = n - 11 + i % 3, c = Math.floor(i / 3); set(a, c, d); set(c, a, d); }
    }
    format(0);
    // data, in two-column zigzags from the bottom right
    let i = 0;
    for (let right = n - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < n; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, y = ((right + 1) & 2) === 0 ? n - 1 - vert : vert;
        if (!F[y][x] && i < cw.length * 8) { M[y][x] = ((cw[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
      }
    }
    const flip = m => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!F[y][x] && MASKS[m](x, y)) M[y][x] = !M[y][x]; };
    const score = () => {
      let s = 0, dark = 0;
      const line = at => { let run = 0, prev = null, str = '';
        for (let k = 0; k < n; k++) { const c = at(k); str += c ? '1' : '0'; if (c === prev) { run++; s += run === 5 ? 3 : run > 5 ? 1 : 0; } else { prev = c; run = 1; } }
        for (const pat of ['10111010000', '00001011101']) for (let at2 = str.indexOf(pat); at2 >= 0; at2 = str.indexOf(pat, at2 + 1)) s += 40; };
      for (let k = 0; k < n; k++) { line(x => M[k][x]); line(y => M[y][k]); }
      for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) s += 3; }
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (M[y][x]) dark++;
      return s + (Math.ceil(Math.abs(dark * 20 - n * n * 10) / (n * n)) - 1) * 10;
    };
    let best = mask;
    if (best === undefined) { let low = Infinity; for (let m = 0; m < 8; m++) { flip(m); format(m); const s = score(); if (s < low) { low = s; best = m; } flip(m); } }
    flip(best); format(best);
    return M;
  }
  function svg(text, { quiet = 4, dark = '#000', light = '#fff' } = {}) {
    const M = matrix(text), w = M.length + quiet * 2; let d = '';
    M.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x + quiet} ${y + quiet}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${w}" shape-rendering="crispEdges" aria-hidden="true"><rect width="${w}" height="${w}" fill="${light}"/><path d="${d}" fill="${dark}"/></svg>`;
  }
  window.QR = { matrix, svg };
})();
