/* Beranda (daftar kelas & mapel) dan halaman kursus (semua bab satu mapel). */

const KELAS = P.get('kelas') || '', MAPEL = P.get('mapel') || '';
const JENJANG_ORDER = ['SMP', 'SMA', 'Lainnya'];
const KELOMPOK = P.get('kelompok') || (MAPEL ? kelompokOf(KELAS, MAPEL) : '');
const KELAS_LABEL = KELAS + (KELOMPOK ? ' ' + KELOMPOK : '');   // "TKA SMA Wajib"

// ilustrasi bab unggulan
const FEAT_ART = `<svg viewBox="0 0 300 200" aria-hidden="true">
  <defs><marker id="fa" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="context-stroke"/></marker></defs>
  <g stroke="currentColor" opacity=".15">${Array.from({length: 13}, (_, i) => `<line x1="${i * 25}" y1="0" x2="${i * 25}" y2="200"/>`).join('')}${Array.from({length: 9}, (_, i) => `<line x1="0" y1="${i * 25}" x2="300" y2="${i * 25}"/>`).join('')}</g>
  <g stroke-width="5" stroke-linecap="round" fill="none">
    <line x1="50" y1="175" x2="175" y2="125" stroke="#2447f9" marker-end="url(#fa)"/>
    <line x1="175" y1="125" x2="225" y2="25" stroke="#e0344b" marker-end="url(#fa)"/>
    <line x1="50" y1="175" x2="225" y2="25" stroke="var(--c)" stroke-dasharray="2 10" marker-end="url(#fa)"/>
  </g>
  <g font-family="Inter Tight,sans-serif" font-weight="800" font-size="22">
    <text x="100" y="172" fill="#2447f9">A</text><text x="210" y="90" fill="#e0344b">B</text><text x="105" y="88" fill="var(--c)">R</text>
  </g></svg>`;

loadKatalog().then(d => {
  const bab = d.bab || [];
  if(KELAS) renderCourse(bab);
  else renderHome(bab, d);
}).catch(() => {
  const m = $('home'); m.classList.remove('hidden');
  showError($('levels'), 'Katalog materi belum bisa dimuat.');
});

/* ---------- beranda ---------- */
function renderHome(bab, d){
  $('home').classList.remove('hidden');

  // bab unggulan: dari "unggulan" di katalog, atau bab lengkap pertama
  const f = bab.find(b => b.id === d.unggulan) || bab.find(b => b.status === 'lengkap');
  if(f){
    const a = mk('a', 'card feat'); a.href = babUrl(f.id); a.dataset.mapel = f.mapel;
    a.innerHTML = `<div class="art" style="color:var(--ink)">${FEAT_ART}</div>
      <div class="txt"><span class="eb">Bab unggulan · ${kelasLabel(f.kelas, f.mapel)} · ${f.mapel}</span><h3></h3><p class="muted"></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><span class="pill">${f.lessons.length} pelajaran</span>${simCount(f) ? `<span class="pill">${simCount(f)} simulasi</span>` : ''}</div>
      <span class="btn primary" style="justify-self:start;margin-top:4px">Mulai belajar ${ic('arrow')}</span></div>`;
    a.querySelector('h3').textContent = f.title;
    a.querySelector('p').textContent = f.summary || '';
    $('featured').appendChild(a);
  }

  // jenjang › kelas › mapel
  const groups = {};
  bab.forEach(b => {
    const j = jenjang(b.kelas);
    ((groups[j] = groups[j] || {})[b.kelas] = groups[j][b.kelas] || {});
    (groups[j][b.kelas][b.mapel] = groups[j][b.kelas][b.mapel] || []).push(b);
  });
  const box = $('levels');
  JENJANG_ORDER.filter(j => groups[j]).forEach(j => {
    box.appendChild(mk('h2', 'sec-h', j));
    const grid = mk('div', 'kelas-grid');
    const cardDefs = [];
    Object.keys(groups[j]).sort(nat).forEach(k => {
      const subjects = Object.keys(groups[j][k]).sort(nat);
      if(k === 'TKA SMA'){
        ['Wajib', 'Pilihan'].forEach(kp => cardDefs.push({label:k + ' ' + kp, kelas:k, kp, subjects:subjects.filter(m => kelompokOf(k, m) === kp)}));
      } else {
        cardDefs.push({label:k, kelas:k, subjects});
      }
    });
    cardDefs.forEach(def => {
      const c = mk('section', 'card kelas');
      const h = mk('h3'); h.innerHTML = `<span class="n"></span>`; h.firstChild.textContent = def.kp ? def.kp[0] : tileOf(def.label);
      const ha = mk('a', '', def.label); ha.href = courseUrl(def.kelas, '', def.kp); ha.style.cssText = 'color:inherit;text-decoration:none'; h.appendChild(ha);
      c.appendChild(h);
      const ul = mk('ul');
      def.subjects.forEach(m => {
        const list = groups[j][def.kelas][m];
        const li = mk('li'), a = mk('a'); a.href = courseUrl(def.kelas, m); a.dataset.mapel = m;
        a.innerHTML = `<span class="dot"></span><span></span><small>${list.length} bab</small>`;
        a.children[1].textContent = m;
        li.appendChild(a); ul.appendChild(li);
      });
      c.appendChild(ul); grid.appendChild(c);
    });
    box.appendChild(grid);
  });

  // pencarian bab dan pelajaran
  const res = $('sres');
  $('search').addEventListener('input', e => {
    const q = e.target.value.trim().toLowerCase();
    res.innerHTML = '';
    $('featured').classList.toggle('hidden', !!q);
    $('levels').classList.toggle('hidden', !!q);
    if(!q) return;
    const hits = [];
    bab.forEach(b => {
      if((b.title + ' ' + b.mapel + ' ' + kelasLabel(b.kelas, b.mapel)).toLowerCase().includes(q)) hits.push({b});
      b.lessons.forEach(l => { if(l.title.toLowerCase().includes(q)) hits.push({b, l}); });
    });
    if(!hits.length){ res.appendChild(mk('p', 'muted', 'Tidak ada materi yang cocok.')); return; }
    hits.slice(0, 30).forEach(({b, l}) => {
      const a = mk('a', 'card'); a.href = babUrl(b.id, l && l.id); a.dataset.mapel = b.mapel;
      a.innerHTML = `<span class="kind">${ic(l ? kindOf(l.kind).icon : 'book')}</span><div><b></b><small></small></div>`;
      a.querySelector('b').textContent = l ? l.title : 'Bab: ' + b.title;
      a.querySelector('small').textContent = kelasLabel(b.kelas, b.mapel) + ' · ' + b.mapel + (l ? ' · ' + b.title : '');
      res.appendChild(a);
    });
  });
}

/* ---------- kursus ---------- */
function renderCourse(bab){
  $('course').classList.remove('hidden');
  const inKelas = bab.filter(b => b.kelas === KELAS && (!KELOMPOK || kelompokOf(b.kelas, b.mapel) === KELOMPOK));
  const list = inKelas.filter(b => !MAPEL || b.mapel === MAPEL);
  const main = $('course'); main.dataset.mapel = MAPEL;

  const cr = $('crumbs');
  const crumb = (t, href) => { if(cr.children.length) cr.appendChild(mk('span', '', '›')); const e = mk(href ? 'a' : 'span', '', t); if(href) e.href = href; cr.appendChild(e); };
  crumb('Beranda', 'index.html'); crumb(KELAS_LABEL, MAPEL ? courseUrl(KELAS, '', KELOMPOK) : null); if(MAPEL) crumb(MAPEL);
  document.title = (MAPEL ? MAPEL + ' ' : '') + KELAS_LABEL + ' · Nalarin Learn';

  const lessons = list.reduce((n, b) => n + b.lessons.length, 0);
  const sims = list.reduce((n, b) => n + simCount(b), 0);
  const quizzes = list.reduce((n, b) => n + b.kuis.length, 0);
  const bn = $('banner');
  bn.innerHTML = `<h1></h1><p></p><div class="stats"><span><b>${list.length}</b>bab</span><span><b>${lessons}</b>pelajaran</span><span><b>${sims}</b>simulasi</span><span><b>${quizzes}</b>kuis latihan</span></div>`;
  bn.querySelector('h1').textContent = MAPEL ? MAPEL + ' · ' + KELAS_LABEL : KELAS_LABEL;
  bn.querySelector('p').textContent = MAPEL ? 'Kurikulum Merdeka. Pelajari tiap bab, lalu uji pemahamanmu lewat kuis.' : 'Pilih mata pelajaran.';

  const units = $('units'), toc = $('toc');
  if(!list.length){ units.innerHTML = '<div class="card empty">Belum ada materi untuk pilihan ini.</div>'; toc.classList.add('hidden'); return; }

  // tanpa mapel: tampilkan kartu mapel di kelas ini
  if(!MAPEL){
    toc.classList.add('hidden'); $('course').querySelector('.course').style.gridTemplateColumns = '1fr';
    const grid = mk('div', 'kelas-grid');
    [...new Set(list.map(b => b.mapel))].sort(nat).forEach(m => {
      const c = mk('section', 'card kelas'); c.dataset.mapel = m;
      const items = list.filter(b => b.mapel === m);
      c.innerHTML = `<h3><span class="n" style="background:color-mix(in srgb,var(--c) 14%,transparent);color:var(--c)"></span><a style="color:inherit;text-decoration:none"></a></h3><ul></ul>`;
      c.querySelector('.n').textContent = m.slice(0, 2);
      const h = c.querySelector('h3 a'); h.textContent = m; h.href = courseUrl(KELAS, m, KELOMPOK);
      items.forEach(b => {
        const li = mk('li'), a = mk('a'); a.href = babUrl(b.id);
        a.innerHTML = `<span class="dot"></span><span></span>`; a.children[1].textContent = b.title;
        li.appendChild(a); c.querySelector('ul').appendChild(li);
      });
      grid.appendChild(c);
    });
    units.appendChild(grid);
    return;
  }

  toc.appendChild(mk('div', 'muted', 'Daftar bab')).style.cssText = 'font-size:12px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;padding:6px 10px';
  list.forEach((b, i) => {
    const anchor = 'bab-' + (i + 1);
    const t = mk('a'); t.href = '#' + anchor; t.innerHTML = `<small>Bab ${b.no || i + 1}</small>`; t.append(b.title); toc.appendChild(t);

    const u = mk('section', 'card unit'); u.id = anchor;
    u.innerHTML = `<div class="unit-h"><div><small>Bab ${b.no || i + 1}</small><h2><a></a></h2></div>
      <span class="pill ${b.status === 'lengkap' ? 'ok' : 'draf'}">${b.status === 'lengkap' ? ic('check', 'width:13px;height:13px') + 'Materi lengkap' : 'Draf'}</span></div>
      <p class="sum"></p><ul class="lessons"></ul><div class="unit-f"></div>`;
    const h = u.querySelector('h2 a'); h.textContent = b.title; h.href = babUrl(b.id);
    u.querySelector('.sum').textContent = b.summary || '';
    const ul = u.querySelector('.lessons');
    b.lessons.forEach(l => {
      const li = mk('li'), a = mk('a'); a.href = babUrl(b.id, l.id);
      a.innerHTML = `<span class="kind" title="${kindOf(l.kind).label}">${ic(kindOf(l.kind).icon)}</span><span></span>`;
      a.lastChild.textContent = l.title; li.appendChild(a); ul.appendChild(li);
    });
    const f = u.querySelector('.unit-f');
    const go = mk('a', 'btn primary sm'); go.href = babUrl(b.id); go.innerHTML = `Mulai belajar ${ic('arrow', 'width:16px;height:16px')}`;
    f.appendChild(go);
    b.kuis.forEach(k => {
      const q = mk('a', 'quizlink'); q.href = quizUrl(k.path);
      q.innerHTML = `<span class="kind">${ic('quiz')}</span><div><b>Latihan: kuis bab ini</b><small></small></div>`;
      q.querySelector('small').textContent = k.title + ' · ' + k.questions + ' soal';
      f.appendChild(q);
    });
    units.appendChild(u);
  });
  if(location.hash){ const el = document.querySelector(location.hash); if(el) el.scrollIntoView(); }
}

function simCount(b){ return b.sims || 0; }   // jumlah blok simulasi, dihitung buat-katalog.py
// isi kotak kecil: angka kelas ("Kelas 10" → 10), singkatan ("TKA SMA" → TKA)
function tileOf(s){
  const m = s.match(/\d+/); if(m) return m[0];
  const w = s.split(/\s+/)[0]; if(/^[A-Z]{2,4}$/.test(w)) return w;
  return s.slice(0, 2);
}
