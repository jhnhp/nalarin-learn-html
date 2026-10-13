/* Nalarin Kuis: inti aplikasi dan halaman mengerjakan kuis.
   Urutan muat: kuis.js → laporan.js → daftar.js (daftar.js menjalankan aplikasi). */

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwD3dPZLvKoetvCoANn6TFnqKzhD982gNIIVnCd7ZlbAjRg70iBj41eNAklrqJyZtgl/exec';
const _P = new URLSearchParams(location.search);
const JSON_PATH = _P.get('kuis') || _P.get('data') || '';
const BROWSE = !JSON_PATH;
const BASE_DIR = JSON_PATH.includes('/') ? JSON_PATH.slice(0, JSON_PATH.lastIndexOf('/') + 1) : '';
const KEY = 'nalarin:' + JSON_PATH;
const $ = id => document.getElementById(id);

let data = null, name = '', idx = 0, answers = [], flags = [], review = false, startedAt = null, timerId = null, lastPayload = null, doneAt = null;

/* ---------- storage (safe) ---------- */
const store = {
  get(){ try{ return JSON.parse(localStorage.getItem(KEY)); }catch(e){ return null; } },
  set(v){ try{ localStorage.setItem(KEY, JSON.stringify(v)); }catch(e){} },
  del(){ try{ localStorage.removeItem(KEY); }catch(e){} }
};
function persist(){ if(!review) store.set({name, idx, answers, flags, startedAt}); }

/* ---------- theme ---------- */
const THEME_COLOR = {light: '#2447F9', dark: '#060a1c'};
function setTheme(t){
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').content = THEME_COLOR[t];
}
(function(){
  let t = null; try{ t = localStorage.getItem('nalarin:theme'); }catch(e){}
  if(!t) t = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  setTheme(t);
})();
$('theme').onclick = () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(t);
  try{ localStorage.setItem('nalarin:theme', t); }catch(e){}
};

/* ---------- teks: HTML aman (hanya tag format dasar) ---------- */
function rich(t){
  return String(t == null ? '' : t)
    .replace(/&(?!#?\w+;)/g, '&amp;')
    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/&lt;(\/?)(b|i|u|em|strong|sub|sup|br|code|mark|small)\s*\/?&gt;/gi, '<$1$2>');
}

/* ---------- load ---------- */
async function load(){
  try{
    if(/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(JSON_PATH) || JSON_PATH.includes('..')) throw new Error('path');
    const r = await fetch(encodeURI(JSON_PATH));
    if(!r.ok) throw new Error(r.status);
    data = await r.json();
    data.total_questions = data.total_questions || data.questions.length;
    answers = new Array(data.total_questions).fill(null);
    flags = new Array(data.total_questions).fill(false);
    $('title').textContent = data.title || 'Nalarin Kuis';
    document.title = (data.title || 'Kuis') + ' | Nalarin Kuis';
    $('s-title').textContent = data.topic || data.title || 'Kuis';
    $('s-sub').textContent = data.difficulty_summary || data.subtitle || 'Pastikan koneksi internet stabil sebelum mulai.';
    $('s-count').textContent = data.total_questions + ' soal';
    setBack();
    try{ $('name').value = localStorage.getItem('nalarin:nama') || ''; }catch(e){}
    const saved = store.get();
    if(saved && saved.name && saved.answers && saved.answers.length === data.total_questions){
      $('name').value = saved.name;
      const n = saved.answers.filter(a => a !== null).length;
      $('resume').textContent = `Ada pengerjaan sebelumnya (${n} soal terjawab). Tekan "Lanjutkan" untuk meneruskan.`;
      $('resume').classList.remove('hidden');
      $('go-t').textContent = 'Lanjutkan mengerjakan';
    }
  }catch(e){
    $('s-title').textContent = 'Kuis tidak bisa dimuat';
    $('s-sub').textContent = `File ${JSON_PATH} tidak terbaca. Periksa nama file dan pastikan sudah ter-upload ke GitHub Pages atau folder lokal.`;
    $('go').disabled = true;
  }
}

/* ---------- dialogs ---------- */
function say(msg){ $('alert-msg').textContent = msg; $('alert').classList.remove('hidden'); $('a-ok').focus(); }
$('a-ok').onclick = () => $('alert').classList.add('hidden');

/* ---------- start ---------- */
function start(){
  const n = $('name').value.trim();
  if(!n) return say('Tulis nama lengkapmu dulu sebelum mulai.');
  name = n;
  try{ localStorage.setItem('nalarin:nama', n); }catch(e){}
  const saved = store.get();
  if(saved && saved.name === n && saved.answers && saved.answers.length === data.total_questions){
    answers = saved.answers; flags = saved.flags || flags; idx = Math.min(saved.idx || 0, data.total_questions - 1);
    startedAt = saved.startedAt || Date.now();
  } else { startedAt = Date.now(); idx = 0; }
  show('quiz');
  $('who').textContent = name; $('who').classList.remove('hidden');
  $('timer').classList.remove('hidden');
  tick(); timerId = setInterval(tick, 1000);
  render();
}
function tick(){
  const s = Math.floor((Date.now() - startedAt) / 1000);
  $('timer-t').textContent = String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}
function show(which){
  ['browse','start','quiz','result'].forEach(s => $(s).classList.add('hidden'));
  $(which).classList.remove('hidden');
  document.body.dataset.view = which;
  window.scrollTo(0,0);
}

/* ---------- gambar ---------- */
const EXTS = ['jpg','png','jpeg','webp','gif','svg','avif','JPG','PNG','JPEG'];
const imgCache = {};
const folder = () => BASE_DIR + (data.image_folder || 'gambar').replace(/\/+$/, '');
function baseOf(q, i){
  if(typeof q.image === 'string' && q.image.trim()) return q.image.trim();
  if(q.image === true) return String(q.number || i + 1);
  return null;   // tidak ada atribut "image" = tidak ada gambar, tidak ada permintaan ke server
}
function loadImg(base){
  return new Promise(res => {
    if(base in imgCache) return res(imgCache[base]);
    const names = /\.(jpe?g|png|webp|gif|avif|svg|bmp)$/i.test(base) ? [base] : EXTS.map(e => base + '.' + e);
    let n = 0;
    (function next(){
      if(n >= names.length){ imgCache[base] = null; return res(null); }
      const url = encodeURI(folder()) + '/' + encodeURI(names[n++]);
      const im = new Image();
      im.onload = () => { imgCache[base] = url; res(url); };
      im.onerror = next;
      im.src = url;
    })();
  });
}
function drawFigure(el, base, loud){
  el.innerHTML = ''; el.classList.add('hidden');
  if(!base) return;
  const tok = el._t = (el._t || 0) + 1;
  const put = url => {
    if(el._t !== tok) return;
    el.innerHTML = '';
    if(url){
      const im = new Image(); im.src = url; im.alt = 'Gambar pendukung soal';
      im.onclick = () => zoom(url); el.appendChild(im);
    } else if(loud){
      const d = document.createElement('div'); d.className = 'miss';
      d.textContent = `Gambar "${base}" tidak ditemukan di folder ${folder()}/`; el.appendChild(d);
    } else { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
  };
  if(base in imgCache) return put(imgCache[base]);
  el.innerHTML = '<div class="skel"></div>'; el.classList.remove('hidden');
  loadImg(base).then(put);
}
function zoom(url){ $('lb-img').src = url; $('lb').classList.remove('hidden'); }
$('lb').onclick = () => $('lb').classList.add('hidden');
document.addEventListener('keydown', e => { if(e.key === 'Escape') $('lb').classList.add('hidden'); });

/* ---------- teks bacaan ---------- */
let psgCollapsed = false;
function applyPsg(){
  $('psg').classList.toggle('collapsed', psgCollapsed);
  $('psg-toggle').textContent = psgCollapsed ? 'Tampilkan teks' : 'Sembunyikan teks';
}
$('psg-toggle').onclick = () => { psgCollapsed = !psgCollapsed; applyPsg(); };
function renderPassage(q){
  const p = q.passage && (data.passages || []).find(x => x.id === q.passage);
  const box = $('psg'), qb = $('qbody');
  if(!p){ box.classList.add('hidden'); qb.classList.remove('split'); return; }
  const nums = data.questions.map((x, i) => x.passage === p.id ? (x.number || i + 1) : null).filter(Boolean);
  const contiguous = nums.every((n, i) => i === 0 || n === nums[i-1] + 1);
  $('psg-title').textContent = p.title || 'Bacalah teks berikut';
  const paras = Array.isArray(p.text) ? p.text : String(p.text || '').split(/\n\s*\n/);
  $('psg-text').innerHTML = paras.map(t => `<p>${rich(t)}</p>`).join('');
  $('psg-for').textContent = nums.length > 1
    ? 'Teks ini dipakai untuk soal ' + (contiguous ? `${nums[0]}–${nums[nums.length-1]}` : nums.join(', ')) + '.'
    : '';
  drawFigure($('psg-fig'), p.image || null, true);
  box.classList.remove('hidden'); qb.classList.add('split');
  applyPsg();
}

function renderMedia(q){
  drawFigure($('fig'), baseOf(q, idx), true);
  renderPassage(q);
  const nx = data.questions[idx + 1];
  if(nx){ const b = baseOf(nx, idx + 1); if(b) loadImg(b); }
}

/* ---------- render ---------- */
function render(){
  const q = data.questions[idx], N = data.total_questions;
  $('qn').textContent = `Soal ${q.number || idx+1} dari ${N}`;
  $('qt').innerHTML = rich(q.question);
  renderMedia(q);
  const d = (q.difficulty || '').toLowerCase();
  $('qd').textContent = q.difficulty || '';
  $('qd').className = 'diff ' + (['mudah','sedang'].includes(d) ? d : 'sulit');
  $('qd').classList.toggle('hidden', !q.difficulty);

  const box = $('opts'); box.innerHTML = '';
  Object.entries(q.options).forEach(([k, v]) => {
    const b = document.createElement('button');
    b.className = 'opt';
    b.innerHTML = `<span class="k">${k}</span><span class="t">${rich(v)}</span>`;
    const mine = answers[idx] === k;
    if(review){
      b.disabled = true;
      if(k === q.answer){ b.classList.add('right'); b.insertAdjacentHTML('beforeend', `<span class="tag" style="color:var(--ok)">${mine?'Jawabanmu · benar':'Kunci'}</span>`); }
      else if(mine){ b.classList.add('wrong'); b.insertAdjacentHTML('beforeend', '<span class="tag" style="color:var(--bad)">Jawabanmu</span>'); }
      else b.classList.add('dim');
    } else {
      if(mine) b.classList.add('sel');
      b.setAttribute('aria-pressed', mine);
      b.onclick = () => choose(k);
    }
    box.appendChild(b);
  });

  $('expl').classList.toggle('hidden', !review);
  if(review) $('expl-t').innerHTML = rich(q.explanation || 'Tidak ada pembahasan tambahan.');

  const f = $('flag');
  f.classList.toggle('hidden', review);
  f.classList.toggle('on', flags[idx]);
  f.setAttribute('aria-pressed', flags[idx]);

  // di soal terakhir, tombol "Selanjutnya" menjadi "Kumpulkan"
  const submitHere = !review && idx === N - 1;
  $('prev').disabled = idx === 0;
  $('next').disabled = review && idx === N - 1;
  $('next').classList.toggle('primary', !submitHere);
  $('next').classList.toggle('finish', submitHere);
  $('next-t').textContent = submitHere ? 'Kumpulkan' : 'Selanjutnya';
  window.scrollTo({top:0});
  drawNav();
}

function drawNav(){
  const N = data.total_questions;
  const done = answers.filter(a => a !== null).length;
  ['grid','grid-m'].forEach(id => {
    const g = $(id); g.innerHTML = '';
    for(let i = 0; i < N; i++){
      const c = document.createElement('button');
      c.className = 'cell'; c.textContent = i + 1;
      c.setAttribute('aria-label', 'Soal ' + (i+1));
      if(review){
        if(answers[i] === null) c.classList.add('skip');
        else c.classList.add(answers[i] === data.questions[i].answer ? 'ok' : 'no');
        if(i === idx) c.style.boxShadow = '0 0 0 2px var(--surface), 0 0 0 4px var(--brand)';
      } else {
        if(answers[i] !== null) c.classList.add('done');
        if(flags[i]) c.classList.add('flagged');
        if(i === idx) c.classList.add('cur');
      }
      c.onclick = () => { go(i); closeSheet(); };
      g.appendChild(c);
    }
  });
  const nf = flags.filter(Boolean).length;
  $('cnt').textContent = $('cnt-m').textContent = `${done} / ${N}`;
  const st = review
    ? `<span><i class="dot" style="background:var(--ok)"></i>Benar</span><span><i class="dot" style="background:var(--bad)"></i>Salah</span><span><i class="dot" style="background:var(--line-2)"></i>Kosong</span>`
    : `<span>${N - done} belum dijawab</span>${nf ? `<span><i class="dot" style="background:var(--flag)"></i>${nf} ragu-ragu</span>` : ''}`;
  $('stats').innerHTML = $('stats-m').innerHTML = st;
  $('bar').style.width = (review ? (idx+1)/N : done/N) * 100 + '%';
  $('finish').classList.toggle('hidden', review);
  $('finish-m').classList.toggle('hidden', review);
}

/* ---------- actions ---------- */
function go(i){ if(i >= 0 && i < data.total_questions){ idx = i; persist(); render(); } }
function choose(k){
  if(review) return;
  answers[idx] = k;
  persist(); render();
  if(idx < data.total_questions - 1) setTimeout(() => { if(!review) go(idx + 1); }, 220);
}
$('flag').onclick = () => { flags[idx] = !flags[idx]; persist(); render(); };
$('prev').onclick = () => go(idx - 1);
$('next').onclick = () => (!review && idx === data.total_questions - 1) ? askSubmit() : go(idx + 1);
$('go').onclick = start;
$('name').addEventListener('keydown', e => { if(e.key === 'Enter') start(); });

function openSheet(){ $('sheet-wrap').classList.remove('hidden'); }
function closeSheet(){ $('sheet-wrap').classList.add('hidden'); }
$('open-pal').onclick = openSheet;
$('sheet-wrap').onclick = e => { if(e.target === $('sheet-wrap')) closeSheet(); };

function askSubmit(){
  closeSheet();
  const left = answers.filter(a => a === null).length;
  const nf = flags.filter(Boolean).length;
  let m = 'Semua soal sudah terjawab. Nilaimu akan dihitung dan disimpan.';
  if(left) m = `Masih ada ${left} soal yang belum dijawab. Yakin ingin mengumpulkan sekarang?`;
  else if(nf) m = `Ada ${nf} soal yang kamu tandai ragu-ragu. Yakin ingin mengumpulkan sekarang?`;
  $('confirm-msg').textContent = m;
  $('confirm').classList.remove('hidden');
  $('c-yes').focus();
}
$('finish').onclick = $('finish-m').onclick = askSubmit;
$('c-no').onclick = () => $('confirm').classList.add('hidden');
$('c-yes').onclick = submit;

/* keyboard (desktop) */
document.addEventListener('keydown', e => {
  if($('quiz').classList.contains('hidden') || e.target.tagName === 'INPUT' || e.metaKey || e.ctrlKey) return;
  if(!$('confirm').classList.contains('hidden') || !$('alert').classList.contains('hidden')) return;
  const k = e.key.toUpperCase();
  if(e.key === 'ArrowRight') go(idx + 1);
  else if(e.key === 'ArrowLeft') go(idx - 1);
  else if(k === 'F' && !review){ flags[idx] = !flags[idx]; persist(); render(); }
  else if(!review && Object.keys(data.questions[idx].options).includes(k)) choose(k);
  else if(!review && /^[1-9]$/.test(k)){ const keys = Object.keys(data.questions[idx].options); if(keys[+k-1]) choose(keys[+k-1]); }
});

/* ---------- submit ---------- */
function submit(){
  $('confirm').classList.add('hidden');
  clearInterval(timerId);
  const s = Math.floor((Date.now() - startedAt) / 1000);
  const durasi = `${Math.floor(s/60)} menit ${s%60} detik`;
  let benar = 0, kosong = 0;
  const detail = data.questions.map((q, i) => {
    const a = answers[i], ok = a === q.answer;
    if(ok) benar++; if(a === null) kosong++;
    return { jawaban: a || '-', benar: ok };
  });
  const N = data.total_questions;
  const skor = Number(((benar / N) * 100).toFixed(1));
  doneAt = new Date();
  lastPayload = { nama: name, topik: data.topic || data.title || 'Nalarin Quiz', durasi, skor, benar, salah: N - benar, detailJawaban: detail };

  $('r-head').textContent = skor >= 85 ? 'Luar biasa!' : skor >= 70 ? 'Kerja bagus!' : skor >= 50 ? 'Lumayan, terus berlatih!' : 'Ayo pelajari lagi!';
  $('r-score').textContent = skor;
  $('ring').style.setProperty('--p', skor);
  $('r-ok').textContent = benar; $('r-no').textContent = N - benar - kosong; $('r-skip').textContent = kosong;
  $('r-sub').textContent = `${name} · selesai dalam ${durasi}`;
  show('result');
  $('timer').classList.add('hidden');
  save();
}

let saving = false;
function save(){
  if(saving) return; saving = true;
  $('saving-t').textContent = 'Menyimpan nilai…';
  $('saving').classList.remove('hidden');
  fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(lastPayload) })
    .then(r => r.json())
    .then(() => { setSave('ok', 'Nilai sudah tersimpan ke spreadsheet.'); store.del(); })
    .catch(() => setSave('fail', 'Nilai belum terkirim ke spreadsheet. Pastikan internet aktif, lalu', true))
    .finally(() => { saving = false; $('saving').classList.add('hidden'); });
}
function setSave(type, msg, retry){
  const el = $('save'); el.className = 'save ' + type; el.textContent = msg;
  if(retry){ const b = document.createElement('button'); b.textContent = 'coba kirim lagi'; b.onclick = save; el.appendChild(b); }
}

/* ---------- review ---------- */
$('review').onclick = () => {
  review = true; idx = 0;
  $('badge').textContent = 'Mode pembahasan';
  $('who').textContent = name; $('who').classList.remove('hidden');
  show('quiz'); render();
};
