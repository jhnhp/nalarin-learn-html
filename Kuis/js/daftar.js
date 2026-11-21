/* Daftar kuis (Kelas > Mapel > Bab > Paket) dan titik mulai aplikasi. */

/* ---------- daftar kuis: Kelas > Mapel > Bab > Paket ---------- */
let LIST = [], QRY = '', LIMIT = 40;
const mk = (tag, cls, text) => { const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; };
const nat = (a, b) => a.localeCompare(b, 'id', {numeric: true});
const goto = (kelas, mapel, kel) => '?' + (kelas ? 'kelas=' + encodeURIComponent(kelas) : '') + (kel ? '&kelompok=' + encodeURIComponent(kel) : '') + (mapel ? '&mapel=' + encodeURIComponent(mapel) : '');
// Bab = folder tempat file soal berada (misalnya "TKA SMP/Matematika/01 Bilangan"); satu bab boleh berisi beberapa paket soal.
const encPath = p => p.split('/').map(encodeURIComponent).join('/');
const dirOf = k => k.path.split('/').slice(0, -1).join('/');
const babHref = dir => '?bab=' + encPath(dir);
const kuisHref = k => '?kuis=' + encPath(k.path);
const babFolder = k => (k.topik && k.topik[0]) || dirOf(k).split('/').pop();
const babName = k => babFolder(k).replace(/^\d+\s+/, '');      // "01 Bilangan" → "Bilangan"
const babNo = k => (babFolder(k).match(/^(\d+)\s/) || [])[1];
const PAKET_RE = /\s*\(Paket (\d+)\)\s*$/i;
const paketNo = k => +((k.title.match(PAKET_RE) || [])[1] || 0);
const shortTitle = t => t.includes(' - ') ? t.slice(t.indexOf(' - ') + 3) : t;   // buang awalan "Mapel Kelas - "
// Urutan dan label kuis dalam satu bab. Jika semua kuis bab itu berjudul sama, labelnya "Paket 1", "Paket 2", dst.
// (kuis tanpa "(Paket n)" dianggap Paket 1); jika judulnya berbeda-beda, pakai judulnya sendiri.
const samaJudul = list => list.every(k => k.title.replace(PAKET_RE, '') === list[0].title.replace(PAKET_RE, ''));
const jenisIsi = list => samaJudul(list) ? 'paket soal' : 'kuis';            // "3 paket soal" atau "7 kuis"
function paketList(list){
  const base = k => k.title.replace(PAKET_RE, '');
  const sorted = [...list].sort((a, b) => nat(base(a), base(b)) || paketNo(a) - paketNo(b) || nat(a.path, b.path));
  const same = sorted.every(k => base(k) === base(sorted[0]));
  const polos = sorted.filter(k => !paketNo(k)).length, ada1 = sorted.some(k => paketNo(k) === 1);
  return sorted.map(k => ({k, label: !same ? shortTitle(k.title) : paketNo(k) ? 'Paket ' + paketNo(k) : (polos === 1 && !ada1 ? 'Paket 1' : shortTitle(k.title))}));
}
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
      // kembali ke pilihan paket jika bab ini punya beberapa paket, selain itu ke daftar bab
      const paket = (d.kuis || []).filter(k => dirOf(k) === dirOf(e)).length;
      document.querySelectorAll('a[data-back]').forEach(a => a.href = paket > 1 ? babHref(dirOf(e)) : goto(e.kelas, e.mapel));
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
function row(k, withCtx, label){
  const a = mk('a', 'b-item'); a.dataset.mapel = k.mapel;
  a.href = kuisHref(k);
  const n = mk('div', 'b-n', k.questions || '–'); n.appendChild(mk('small', '', 'soal')); a.appendChild(n);
  const main = mk('div', 'b-main');
  if(withCtx){ const c = mk('div', 'b-ctx'); c.appendChild(mk('span', '', k.kelas)); c.appendChild(mk('span', '', k.mapel)); main.appendChild(c); }
  main.appendChild(mk('div', 'b-title', label || k.title));
  const meta = label ? (k.summary || '').split('. ')[0] : k.topic && !k.title.toLowerCase().includes(k.topic.toLowerCase()) ? k.topic : '';
  if(meta) main.appendChild(mk('div', 'b-meta', meta));
  a.appendChild(main);
  a.insertAdjacentHTML('beforeend', `<span class="b-go">${CHEV}</span>`);
  return a;
}

// satu baris bab: langsung ke kuisnya jika hanya satu, ke pilihan paket jika lebih dari satu
function babRow(list, i){
  const k0 = list[0], a = mk('a', 'b-item'); a.dataset.mapel = k0.mapel;
  a.href = list.length > 1 ? babHref(dirOf(k0)) : kuisHref(k0);
  const no = babNo(k0);
  const n = mk('div', 'b-n', no ? String(+no) : String(i + 1)); n.appendChild(mk('small', '', 'bab')); a.appendChild(n);
  const main = mk('div', 'b-main');
  main.appendChild(mk('div', 'b-title', babName(k0)));
  const qs = [...new Set(list.map(k => k.questions))];
  main.appendChild(mk('div', 'b-meta', list.length > 1
    ? list.length + ' ' + jenisIsi(list) + (qs.length === 1 && qs[0] ? ' · ' + qs[0] + ' soal per ' + (samaJudul(list) ? 'paket' : 'kuis') : '')
    : (k0.questions || '–') + ' soal'));
  a.appendChild(main);
  a.insertAdjacentHTML('beforeend', `<span class="b-go">${CHEV}</span>`);
  return a;
}

function draw(){
  let kelas = _P.get('kelas') || '', mapel = _P.get('mapel') || '';
  const bab = _P.get('bab') || '';
  const babList = bab ? LIST.filter(k => dirOf(k) === bab) : [];
  if(babList.length){ kelas = kelas || babList[0].kelas; mapel = mapel || babList[0].mapel; }
  const kp = _P.get('kelompok') || (mapel ? kelompokOf(kelas, mapel) : '');
  const kLabel = kelas + (kp ? ' ' + kp : '');      // "TKA SMA Wajib"
  const bName = babList.length ? babName(babList[0]) : '';
  const scope = bab ? babList : LIST.filter(k => (!kelas || k.kelas === kelas) && (!mapel || k.mapel === mapel) && (!kp || kelompokOf(k.kelas, k.mapel) === kp));
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
    if(mapel) add(mapel, bab ? goto(kelas, mapel, kp) : null);
    if(bab) add(bName, null);
  }
  if(!kelas) $('b-h1').innerHTML = 'Mau latihan apa <em>hari ini?</em>';
  else $('b-h1').textContent = bab ? bName + ' · ' + mapel + ' ' + kLabel : mapel ? mapel + ' · ' + kLabel : kLabel;
  $('b-lead').textContent = !kelas ? 'Pilih kelas, lalu mata pelajaran, bab, dan paket soal yang ingin dikerjakan.'
    : !mapel ? 'Pilih mata pelajaran.'
    : !bab ? `Pilih bab ${mapel} ${kLabel}.`
    : babList.length > 1 && samaJudul(babList) ? 'Pilih paket soal. Setiap paket berisi soal yang berbeda, jadi kamu bisa berlatih lebih dari sekali.' : 'Pilih kuis yang ingin dikerjakan.';
  $('search').placeholder = !kelas ? 'Cari kuis di semua kelas…' : 'Cari kuis di ' + (bab ? bName : mapel ? kLabel + ' · ' + mapel : kLabel) + '…';

  if((kelas || bab) && !scope.length){
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
  } else if(!bab){                          // langkah 3: bab
    const g = new Map();
    scope.forEach(k => { const d = dirOf(k); if(!g.has(d)) g.set(d, []); g.get(d).push(k); });
    const dirs = [...g.keys()].sort(nat);
    $('bcount').textContent = dirs.length + ' bab · ' + scope.length + ' kuis'; $('bcount').classList.remove('hidden');
    const ul = mk('div', 'b-list'); ul.style.marginTop = '12px';
    dirs.slice(0, LIMIT).forEach((d, i) => ul.appendChild(babRow(g.get(d), i)));
    box.appendChild(ul);
    $('more').classList.toggle('hidden', dirs.length <= LIMIT);
  } else {                                  // langkah 4: paket soal dalam satu bab
    $('bcount').textContent = scope.length + ' ' + (scope.length > 1 ? jenisIsi(scope) : 'kuis'); $('bcount').classList.remove('hidden');
    const ul = mk('div', 'b-list'); ul.style.marginTop = '12px';
    paketList(scope).forEach(({k, label}) => ul.appendChild(row(k, false, scope.length > 1 ? label : '')));
    box.appendChild(ul);
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
