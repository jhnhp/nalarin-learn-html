/* Perkakas bersama simulasi bab Transformasi Geometri: menggambar bangun, label titik, dan rumus transformasi.
   Dimuat setelah js/sim.js. Titik ditulis sebagai {x, y} dalam koordinat dunia. */
const Bangun = (() => {
  const {fmt} = Sim;
  const r2 = v => Math.round(v * 100) / 100;

  // (2, −3) untuk bilangan bulat, (2,5 ; −3) jika ada desimal agar koma tidak rancu
  const pt = (x, y) => {
    x = r2(x); y = r2(y);
    return Number.isInteger(x) && Number.isInteger(y) ? `(${fmt(x)}, ${fmt(y)})` : `(${fmt(x)} ; ${fmt(y)})`;
  };

  const poly = (P, pts, color, o = {}) =>
    `<polygon points="${pts.map(p => P.X(p.x) + ',' + P.Y(p.y)).join(' ')}" style="fill:${color};stroke:${color}"` +
    ` fill-opacity="${o.fill ?? .18}" stroke-width="${o.width || 2.5}" stroke-linejoin="round" opacity="${o.opacity || 1}"${o.dash ? ' class="dash"' : ''}/>`;

  // label di luar bangun: digeser menjauhi titik berat
  const labels = (P, pts, names, color) => {
    const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length, cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
    return pts.map((p, i) => {
      const dx = p.x - cx, dy = p.y - cy, L = Math.hypot(dx, dy) || 1;
      return `<text class="vlabel" x="${P.X(p.x) + dx / L * 15}" y="${P.Y(p.y) - dy / L * 15 + 6}" text-anchor="middle" style="fill:${color};font-size:15px">${names[i]}</text>`;
    }).join('');
  };

  const seg = (P, a, b, color, o = {}) =>
    `<line x1="${P.X(a.x)}" y1="${P.Y(a.y)}" x2="${P.X(b.x)}" y2="${P.Y(b.y)}" style="stroke:${color}" stroke-width="${o.width || 1.6}"${o.dash ? ' class="dash"' : ''} opacity="${o.opacity || 1}"/>`;

  const dot = (P, p, color, r = 5) => `<circle cx="${P.X(p.x)}" cy="${P.Y(p.y)}" r="${r}" style="fill:${color}"/>`;

  // garis tak hingga lewat dua titik, dipotong ke tepi bidang
  const fullLine = (P, a, b, color, o = {}) => {
    const dx = b.x - a.x, dy = b.y - a.y, t = 100;
    return seg(P, {x: a.x - dx * t, y: a.y - dy * t}, {x: a.x + dx * t, y: a.y + dy * t}, color, o);
  };

  // tanda luas: > 0 berarti urutan titik berlawanan arah jarum jam
  const signedArea = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + p.x * q.y - q.x * p.y; }, 0) / 2;

  /* transformasi dasar, mengembalikan titik baru */
  const T = {
    translasi: (p, a, b) => ({x: p.x + a, y: p.y + b}),
    refleksi: (p, jenis, k = 0) => ({
      'x': {x: p.x, y: -p.y}, 'y': {x: -p.x, y: p.y}, 'O': {x: -p.x, y: -p.y},
      'y=x': {x: p.y, y: p.x}, 'y=-x': {x: -p.y, y: -p.x},
      'x=k': {x: 2 * k - p.x, y: p.y}, 'y=h': {x: p.x, y: 2 * k - p.y},
    })[jenis],
    rotasi: (p, deg, c = {x: 0, y: 0}) => {
      const t = deg * Math.PI / 180, dx = p.x - c.x, dy = p.y - c.y;
      return {x: r2(c.x + dx * Math.cos(t) - dy * Math.sin(t)), y: r2(c.y + dx * Math.sin(t) + dy * Math.cos(t))};
    },
    dilatasi: (p, k, c = {x: 0, y: 0}) => ({x: r2(k * (p.x - c.x) + c.x), y: r2(k * (p.y - c.y) + c.y)}),
  };

  // tanda minus tipografis untuk teks rumus
  const m = s => String(s).replace(/-/g, '−');

  return {pt, poly, labels, seg, dot, fullLine, signedArea, T, m, r2};
})();
