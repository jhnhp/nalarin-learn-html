/* Perkakas bersama untuk simulasi: tema, tinggi otomatis, bidang koordinat, panah, dan titik yang bisa digeser.
   Dimuat oleh file simulasi di materi/.../sim/*.html. */
const Sim = (() => {
  /* tema: dari ?theme=, pesan halaman induk, atau pilihan tersimpan */
  const qs = new URLSearchParams(location.search);
  let saved = null; try{ saved = localStorage.getItem('nalarin:theme'); }catch(e){}
  const setTheme = t => { document.documentElement.dataset.theme = t; listeners.forEach(f => f(t)); };
  const listeners = [];
  setTheme(qs.get('theme') || saved || 'light');
  addEventListener('message', e => { if(e.data && e.data.theme) setTheme(e.data.theme); });
  addEventListener('storage', e => { if(e.key === 'nalarin:theme' && e.newValue) setTheme(e.newValue); });

  /* laporkan tinggi ke halaman induk agar iframe pas */
  if(parent !== window && window.ResizeObserver){
    let last = 0;
    new ResizeObserver(() => {
      const h = Math.ceil(document.body.getBoundingClientRect().height);
      if(Math.abs(h - last) > 2){ last = h; parent.postMessage({simHeight: h}, '*'); }
    }).observe(document.body);
  }

  /* angka gaya Indonesia: 2.50 → "2,5" */
  const fmt = (v, d = 2) => {
    if(!isFinite(v)) return '–';
    let s = (Math.round(v * 10 ** d) / 10 ** d).toFixed(d);
    if(s.includes('.')) s = s.replace(/\.?0+$/, '');
    if(s === '-0') s = '0';
    return s.replace('.', ',').replace('-', '−');
  };
  const deg = (x, y) => { let a = Math.atan2(y, x) * 180 / Math.PI; if(a < 0) a += 360; return Math.abs(x) < 1e-9 && Math.abs(y) < 1e-9 ? 0 : a; };
  const rad = d => d * Math.PI / 180;
  const len = (x, y) => Math.hypot(x, y);

  /* bidang koordinat dalam SVG */
  function plane(svg, o){
    const S = o.scale || 36;
    const W = (o.xmax - o.xmin) * S, H = (o.ymax - o.ymin) * S;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const X = x => (x - o.xmin) * S, Y = y => (o.ymax - y) * S;
    const P = Object.assign({S, W, H, X, Y}, o);

    P.toWorld = evt => {
      const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
      const p = pt.matrixTransform(svg.getScreenCTM().inverse());
      return {x: p.x / S + o.xmin, y: o.ymax - p.y / S};
    };
    P.grid = (opt = {}) => {
      const step = opt.step || 1, lab = opt.labels !== false;
      let g = '<g class="grid">';
      for(let x = Math.ceil(o.xmin / step) * step; x <= o.xmax; x += step) g += `<line x1="${X(x)}" y1="0" x2="${X(x)}" y2="${H}"/>`;
      for(let y = Math.ceil(o.ymin / step) * step; y <= o.ymax; y += step) g += `<line x1="0" y1="${Y(y)}" x2="${W}" y2="${Y(y)}"/>`;
      g += '</g><g class="axis">';
      if(o.ymin <= 0 && o.ymax >= 0) g += `<line x1="0" y1="${Y(0)}" x2="${W}" y2="${Y(0)}"/>`;
      if(o.xmin <= 0 && o.xmax >= 0) g += `<line x1="${X(0)}" y1="0" x2="${X(0)}" y2="${H}"/>`;
      if(lab){
        const ls = opt.labelStep || 2;
        for(let x = Math.ceil(o.xmin / ls) * ls; x <= o.xmax; x += ls) if(x) g += `<text x="${X(x)}" y="${Y(0) + 15}" text-anchor="middle">${fmt(x)}</text>`;
        for(let y = Math.ceil(o.ymin / ls) * ls; y <= o.ymax; y += ls) if(y) g += `<text x="${X(0) - 6}" y="${Y(y) + 4}" text-anchor="end">${fmt(y)}</text>`;
        if(opt.xname) g += `<text x="${W - 6}" y="${Y(0) - 8}" text-anchor="end" font-weight="700">${opt.xname}</text>`;
        if(opt.yname) g += `<text x="${X(0) + 8}" y="14" font-weight="700">${opt.yname}</text>`;
      }
      return g + '</g>';
    };
    /* panah dari (x1,y1) ke (x2,y2), koordinat dunia */
    P.arrow = (x1, y1, x2, y2, color, opt = {}) => {
      const a = [X(x1), Y(y1)], b = [X(x2), Y(y2)];
      const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
      if(L < 1) return '';
      const w = opt.width || 4, hl = Math.min(opt.head || 15, L * .6), hw = hl * .55;
      const ux = dx / L, uy = dy / L;
      const base = [b[0] - ux * hl, b[1] - uy * hl];
      const p1 = [base[0] - uy * hw, base[1] + ux * hw], p2 = [base[0] + uy * hw, base[1] - ux * hw];
      let s = `<g opacity="${opt.opacity || 1}"><line x1="${a[0]}" y1="${a[1]}" x2="${base[0] + ux * 2}" y2="${base[1] + uy * 2}" style="stroke:${color}" stroke-width="${w}" stroke-linecap="round"${opt.dash ? ' class="dash"' : ''}/>`;
      s += `<polygon points="${b[0]},${b[1]} ${p1[0]},${p1[1]} ${p2[0]},${p2[1]}" style="fill:${color}"/>`;
      if(opt.label){
        // label di samping tengah panah
        const side = opt.side || 1, off = opt.off || 16;
        const mx = (a[0] + b[0]) / 2 - uy * off * side, my = (a[1] + b[1]) / 2 + ux * off * side;
        s += `<text class="vlabel" x="${mx}" y="${my + 6}" text-anchor="middle" style="fill:${color}">${opt.label}</text>`;
      }
      return s + '</g>';
    };
    P.handle = (name, x, y, color) =>
      `<g class="handle" data-h="${name}"><circle class="hit" cx="${X(x)}" cy="${Y(y)}" r="22"/><circle class="dot" cx="${X(x)}" cy="${Y(y)}" r="8" style="fill:${color}"/></g>`;
    /* busur sudut di (cx,cy) dari a1 ke a2 (derajat, berlawanan jarum jam) */
    P.arc = (cx, cy, r, a1, a2, color, label) => {
      let sweep = a2 - a1; while(sweep < 0) sweep += 360; while(sweep >= 360) sweep -= 360;
      if(sweep < 0.5) return '';
      const p = a => [X(cx + r * Math.cos(rad(a))), Y(cy + r * Math.sin(rad(a)))];
      const s = p(a1), e = p(a1 + sweep), large = sweep > 180 ? 1 : 0;
      let out = `<path d="M${s[0]},${s[1]} A${r * S},${r * S} 0 ${large} 0 ${e[0]},${e[1]}" fill="none" style="stroke:${color}" stroke-width="2"/>`;
      if(label){ const m = p(a1 + sweep / 2), c = [X(cx), Y(cy)]; const k = 1 + 14 / (r * S);
        out += `<text class="vlabel" x="${c[0] + (m[0] - c[0]) * k}" y="${c[1] + (m[1] - c[1]) * k + 4}" text-anchor="middle" style="font-size:13px;fill:${color}">${label}</text>`; }
      return out;
    };

    /* geser titik: elemen dengan data-h memanggil onDrag(nama, x, y) */
    P.draggable = onDrag => {
      let active = null;
      svg.addEventListener('pointerdown', e => {
        const h = e.target.closest('[data-h]'); if(!h) return;
        active = h.dataset.h; svg.setPointerCapture(e.pointerId); e.preventDefault();
        const w = P.toWorld(e); onDrag(active, w.x, w.y);
      });
      svg.addEventListener('pointermove', e => { if(!active) return; const w = P.toWorld(e); onDrag(active, w.x, w.y); });
      const end = () => { active = null; };
      svg.addEventListener('pointerup', end); svg.addEventListener('pointercancel', end);
    };
    P.clamp = (x, y) => ({x: Math.min(o.xmax, Math.max(o.xmin, x)), y: Math.min(o.ymax, Math.max(o.ymin, y))});
    return P;
  }

  const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return {fmt, deg, rad, len, plane, css, onTheme: f => listeners.push(f)};
})();
