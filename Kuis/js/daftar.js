/* Daftar kuis (Kelas > Mapel > Kuis) dan titik mulai aplikasi. */

/* ---------- daftar kuis: Kelas > Mapel > Kuis ---------- */
let LIST = [], QRY = '', LIMIT = 40;
const mk = (tag, cls, text) => { const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; };
const nat = (a, b) => a.localeCompare(b, 'id', {numeric: true});
const goto = (kelas, mapel, kel) => '?' + (kelas ? 'kelas=' + encodeURIComponent(kelas) : '') + (kel ? '&kelompok=' + encodeURIComponent(kel) : '') + (mapel ? '&mapel=' + encodeURIComponent(mapel) : '');
// TKA SMA dibagi: mapel wajib dan mapel pilihan (kelas lain tidak dibagi)
const TKA_WAJIB = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris'];
const kelompokOf = (kelas, mapel) => kelas === 'TKA SMA' ? (TKA_WAJIB.includes(mapel) ? 'Wajib' : 'Pilihan') : '';
const CHEV = '<svg class="i" style="width:20px;height:20px"><use href="#i-right"/></svg>';
// isi kotak kecil di kartu: angka kelas ("Kelas 10" → 10), singkatan ("TKA SMA" → TKA), "Olimpiade Matematika" → OM, atau dua huruf awal
const tileOf = s => {
  const m = s.match(/\d+/); if(m) return m[0];
  const w = s.split(/\s+/)[0]; if(/^[A-Z]{2,4}$/.test(w)) return w;
  if(/^Olimpiade \S/.test(s)) return 'O' + s.split(/\s+/)[1][0].toUpperCase();   // "Olimpiade Matematika" → OM
  return s.replace(/[^A-Za-z]/g, '').slice(0, 2) || '?';
};

// "Kelas 11" → jenjang untuk pengelompokan di beranda (sama dengan Nalarin Learn)
const JENJANG_ORDER = ['SMP', 'SMA', 'Olimpiade', 'Lainnya'];
function jenjang(kelas){
  if(/^Olimpiade/i.test(kelas)) return 'Olimpiade';
  if(/\bSMP\b/i.test(kelas)) return 'SMP';      // "TKA SMP" ikut grup SMP
  if(/\bSMA\b/i.test(kelas)) return 'SMA';      // "TKA SMA" ikut grup SMA
  const n = parseInt((kelas.match(/\d+/) || [0])[0], 10);
  if(n >= 10) return 'SMA';
  if(n >= 7) return 'SMP';
  return 'Lainnya';
}

// Kuis bisa berdiri sendiri atau berada di dalam Nalarin Learn (folder Kuis/).
// Jika ada ../katalog.json, tampilkan tautan Belajar dan Kelas, dan arahkan "Dukung" ke halaman dukung.html.
fetch('../katalog.json', {method: 'HEAD'}).then(r => {
  if(!r.ok) return;
  $('nav-belajar').classList.remove('hidden');
  $('nav-kelas').classList.remove('hidden');
  document.querySelectorAll('a[data-dukung]').forEach(a => { a.href = '../dukung.html'; a.removeAttribute('target'); });
}).catch(() => {});

function setBack(){
  fetch('daftar.json').then(r => r.json()).then(d => {
    const e = (d.kuis || []).find(k => k.path === JSON_PATH);
    if(e){
      document.querySelectorAll('a[data-back]').forEach(a => a.href = goto(e.kelas, e.mapel));
      if(!review) $('badge').textContent = (e.kelas + ' ' + kelompokOf(e.kelas, e.mapel)).trim() + ' · ' + e.mapel;
    }
  }).catch(() => {});
}

function card(href, title, meta, mapel){
  const a = mk('a', 'b-card'); a.href = href; if(mapel) a.dataset.mapel = mapel;
  a.appendChild(mk('div', 'b-tile', tileOf(title)));
  a.appendChild(mk('b', '', title)); a.appendChild(mk('span', '', meta));
  a.insertAdjacentHTML('beforeend', `<span class="b-go">${CHEV}</span>`);
  return a;
}
function row(k, withCtx){
  const a = mk('a', 'b-item'); a.dataset.mapel = k.mapel;
  a.href = '?kuis=' + k.path.split('/').map(encodeURIComponent).join('/');
  const n = mk('div', 'b-n', k.questions || '–'); n.appendChild(mk('small', '', 'soal')); a.appendChild(n);
  const main = mk('div', 'b-main');
  if(withCtx){ const c = mk('div', 'b-ctx'); c.appendChild(mk('span', '', k.kelas)); c.appendChild(mk('span', '', k.mapel)); main.appendChild(c); }
  main.appendChild(mk('div', 'b-title', k.title));
  const meta = k.topic && !k.title.toLowerCase().includes(k.topic.toLowerCase()) ? k.topic : '';
  if(meta) main.appendChild(mk('div', 'b-meta', meta));
  a.appendChild(main);
  a.insertAdjacentHTML('beforeend', `<span class="b-go">${CHEV}</span>`);
  return a;
}

function draw(){
  const kelas = _P.get('kelas') || '', mapel = _P.get('mapel') || '';
  const kp = _P.get('kelompok') || (mapel ? kelompokOf(kelas, mapel) : '');
  const kLabel = kelas + (kp ? ' ' + kp : '');      // "TKA SMA Wajib"
  const scope = LIST.filter(k => (!kelas || k.kelas === kelas) && (!mapel || k.mapel === mapel) && (!kp || kelompokOf(k.kelas, k.mapel) === kp));
  const term = QRY.trim().toLowerCase();
  const box = $('blist'); box.innerHTML = '';
  $('more').classList.add('hidden'); $('bempty').classList.add('hidden'); $('bcount').classList.add('hidden');
  $('support').classList.toggle('hidden', !!(kelas || term));
  const hero = $('hero'); hero.classList.toggle('banner', !!kelas);
  if(mapel) hero.dataset.mapel = mapel; else delete hero.dataset.mapel;

  // jejak
  const cr = $('crumbs'); cr.innerHTML = '';
  cr.classList.toggle('hidden', !kelas);
  if(kelas){
    const add = (t, href) => { if(cr.children.length) cr.appendChild(mk('span', '', '›')); if(href){ const a = mk('a', '', t); a.href = href; cr.appendChild(a); } else cr.appendChild(mk('span', 'cur', t)); };
    add('Semua kelas', '?');
    add(kLabel, mapel ? goto(kelas, '', kp) : null);
    if(mapel) add(mapel, null);
  }
  if(!kelas) $('b-h1').innerHTML = 'Mau latihan apa <em>hari ini?</em>';
  else $('b-h1').textContent = mapel ? mapel + ' · ' + kLabel : kLabel;
  $('b-lead').textContent = !kelas ? 'Pilih kelas, lalu mata pelajaran, lalu kuis yang ingin dikerjakan.'
    : !mapel ? 'Pilih mata pelajaran.' : `Pilih kuis ${mapel} ${kLabel} yang ingin dikerjakan.`;
  $('search').placeholder = !kelas ? 'Cari kuis di semua kelas…' : 'Cari kuis di ' + (mapel ? kLabel + ' · ' + mapel : kLabel) + '…';

  if(kelas && !scope.length){
    $('bempty').textContent = 'Belum ada kuis untuk pilihan ini.'; $('bempty').classList.remove('hidden'); return;
  }

  // pencarian: daftar datar di dalam cakupan yang sedang dibuka
  if(term){
    const hits = scope.filter(k => [k.title, k.topic, k.summary, k.kelas, k.mapel, ...(k.topik || [])].join(' ').toLowerCase().includes(term));
    $('bcount').textContent = hits.length + ' kuis ditemukan'; $('bcount').classList.remove('hidden');
    if(!hits.length){ $('bempty').textContent = 'Tidak ada kuis yang cocok.'; $('bempty').classList.remove('hidden'); return; }
    const ul = mk('div', 'b-list'); ul.style.marginTop = '12px';
    hits.slice(0, LIMIT).forEach(k => ul.appendChild(row(k, !mapel)));
    box.appendChild(ul);
    $('more').classList.toggle('hidden', hits.length <= LIMIT);
    return;
  }

  if(!kelas){                               // langkah 1: jenjang › kelas › mapel
    const groups = {};
    scope.forEach(k => {
      const j = jenjang(k.kelas);
      const nama = (k.kelas + ' ' + kelompokOf(k.kelas, k.mapel)).trim();      // TKA SMA → "TKA SMA Wajib" / "TKA SMA Pilihan"
      const kel = (groups[j] = groups[j] || {})[nama] = groups[j][nama] || {kelas: k.kelas, kp: kelompokOf(k.kelas, k.mapel), m: {}};
      kel.m[k.mapel] = (kel.m[k.mapel] || 0) + 1;
    });
    JENJANG_ORDER.filter(j => groups[j]).forEach(j => {
      box.appendChild(mk('h2', 'sec-h', j));
      const grid = mk('div', 'kelas-grid');
      const G = groups[j];
      Object.keys(G).sort((a, b) => nat(G[a].kelas, G[b].kelas) || (G[a].kp === 'Wajib' ? -1 : G[b].kp === 'Wajib' ? 1 : 0)).forEach(kel => {
        const c = mk('section', 'card kelas');
        const def = groups[j][kel];
        const h = mk('h3'); h.appendChild(mk('span', 'n', def.kp ? def.kp[0] : tileOf(kel)));
        const ha = mk('a', '', kel); ha.href = goto(def.kelas, '', def.kp); h.appendChild(ha);
        c.appendChild(h);
        const ul = mk('ul');
        Object.keys(def.m).sort(nat).forEach(m => {
          const li = mk('li'), a = mk('a'); a.href = goto(def.kelas, m); a.dataset.mapel = m;
          a.appendChild(mk('span', 'md')); a.appendChild(mk('span', '', m)); a.appendChild(mk('small', '', def.m[m] + ' kuis'));
          li.appendChild(a); ul.appendChild(li);
        });
        c.appendChild(ul); grid.appendChild(c);
      });
      box.appendChild(grid);
    });
  } else if(!mapel){                        // langkah 2: mapel
    const g = new Map();
    scope.forEach(k => g.set(k.mapel, (g.get(k.mapel) || 0) + 1));
    const grid = mk('div', 'b-cards');
    [...g.keys()].sort(nat).forEach(m => grid.appendChild(card(goto(kelas, m, kp), m, g.get(m) + ' kuis', m)));
    box.appendChild(grid);
  } else {                                  // langkah 3: kuis
    $('bcount').textContent = scope.length + ' kuis'; $('bcount').classList.remove('hidden');
    const ul = mk('div', 'b-list'); ul.style.marginTop = '12px';
    scope.slice(0, LIMIT).forEach(k => ul.appendChild(row(k, false)));
    box.appendChild(ul);
    $('more').classList.toggle('hidden', scope.length <= LIMIT);
  }
}

function browse(){
  $('title').textContent = 'Pilih kuis';
  document.title = 'Nalarin Kuis';
  show('browse');
  $('search').oninput = e => { QRY = e.target.value; LIMIT = 40; draw(); };
  $('more').onclick = () => { LIMIT += 40; draw(); };
  fetch('daftar.json', {cache: 'no-cache'})
    .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(d => { LIST = d.kuis || []; if(!LIST.length) throw new Error('kosong'); draw(); })
    .catch(() => {
      ['b-lead','b-h1'].forEach(i => $(i).classList.add('hidden'));
      document.querySelector('.sbox').classList.add('hidden');
      const e = $('berr'); e.classList.remove('hidden');
      e.innerHTML = 'Daftar kuis belum bisa dimuat. Jalankan <code>python3 buat-daftar.py</code> di folder ini, lalu buka halaman lewat server (bukan langsung dari file).';
    });
}

/* ---------- mulai ---------- */
BROWSE ? browse() : load();
