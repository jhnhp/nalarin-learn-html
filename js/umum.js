/* Bagian bersama untuk semua halaman: tema, ikon, tautan, dan katalog. */

const $ = id => document.getElementById(id);
const P = new URLSearchParams(location.search);
const mk = (tag, cls, text) => { const e = document.createElement(tag); if(cls) e.className = cls; if(text != null) e.textContent = text; return e; };
const nat = (a, b) => a.localeCompare(b, 'id', {numeric: true});
const enc = path => path.split('/').map(encodeURIComponent).join('/');

/* ---------- tautan ---------- */
const KUIS_DIR = 'Kuis/';                       // lokasi aplikasi Nalarin Kuis
const quizUrl = path => KUIS_DIR + 'index.html?kuis=' + enc(path);
const babUrl = (id, lesson) => 'bab.html?bab=' + encodeURIComponent(id) + (lesson ? '&p=' + encodeURIComponent(lesson) : '');
const courseUrl = (kelas, mapel, kel) => 'index.html?kelas=' + encodeURIComponent(kelas) + (kel ? '&kelompok=' + encodeURIComponent(kel) : '') + (mapel ? '&mapel=' + encodeURIComponent(mapel) : '');
// TKA SMA dibagi: mapel wajib dan mapel pilihan (kelas lain tidak dibagi)
const TKA_WAJIB = ['Matematika', 'Bahasa Indonesia', 'Bahasa Inggris'];
const kelompokOf = (kelas, mapel) => kelas === 'TKA SMA' ? (TKA_WAJIB.includes(mapel) ? 'Wajib' : 'Pilihan') : '';
const kelasLabel = (kelas, mapel) => (kelas + ' ' + kelompokOf(kelas, mapel)).trim();   // "TKA SMA Wajib"

/* ---------- tema (kunci yang sama dengan Nalarin Kuis) ---------- */
const THEME_COLOR = {light: '#2447F9', dark: '#060a1c'};
function setTheme(t){
  document.documentElement.dataset.theme = t;
  const m = document.querySelector('meta[name="theme-color"]'); if(m) m.content = THEME_COLOR[t];
  document.querySelectorAll('iframe.simframe').forEach(f => { try{ f.contentWindow.postMessage({theme: t}, '*'); }catch(e){} });
}
(function(){
  let t = null; try{ t = localStorage.getItem('nalarin:theme'); }catch(e){}
  setTheme(t || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
})();
document.addEventListener('DOMContentLoaded', () => {
  const b = $('theme'); if(!b) return;
  b.onclick = () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    setTheme(t); try{ localStorage.setItem('nalarin:theme', t); }catch(e){}
  };
});

/* ---------- ikon ---------- */
document.body.insertAdjacentHTML('afterbegin', `<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></symbol>
  <symbol id="i-moon" viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></symbol>
  <symbol id="i-search" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></symbol>
  <symbol id="i-right" viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></symbol>
  <symbol id="i-left" viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></symbol>
  <symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></symbol>
  <symbol id="i-book" viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5"/></symbol>
  <symbol id="i-play" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z"/></symbol>
  <symbol id="i-playfill" viewBox="0 0 24 24"><path d="M7 4.5v15l13-7.5z"/></symbol>
  <symbol id="i-sim" viewBox="0 0 24 24"><path d="M6 12h4M8 10v4M15 11h.01M18 13h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/></symbol>
  <symbol id="i-pencil" viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4"/></symbol>
  <symbol id="i-check" viewBox="0 0 24 24"><path d="M4 12l5 5L20 6"/></symbol>
  <symbol id="i-bulb" viewBox="0 0 24 24"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></symbol>
  <symbol id="i-alert" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></symbol>
  <symbol id="i-sigma" viewBox="0 0 24 24"><path d="M18 5H6l6 7-6 7h12"/></symbol>
  <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></symbol>
  <symbol id="i-menu" viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></symbol>
  <symbol id="i-max" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></symbol>
  <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></symbol>
  <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7.5-4.6-9.2-9.4C1.7 7.3 4 4 7.4 4c2 0 3.6 1.1 4.6 2.7C13 5.1 14.6 4 16.6 4 20 4 22.3 7.3 21.2 10.6 19.5 15.4 12 20 12 20z"/></symbol>
  <symbol id="i-ext" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></symbol>
  <symbol id="i-quiz" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></symbol>
  <symbol id="i-users" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></symbol>
  <symbol id="i-printer" viewBox="0 0 24 24"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></symbol>
</svg>`);
const ic = (name, style) => `<svg class="i"${style ? ` style="${style}"` : ''}><use href="#i-${name}"/></svg>`;

// jenis pelajaran: ikon dan label
const KIND = {
  artikel:  {icon: 'book',   label: 'Artikel'},
  video:    {icon: 'play',   label: 'Video'},
  simulasi: {icon: 'sim',    label: 'Simulasi'},
  latihan:  {icon: 'pencil', label: 'Latihan'},
};
const kindOf = k => KIND[k] || KIND.artikel;

/* ---------- katalog ---------- */
let _katalog = null;
function loadKatalog(){
  return _katalog || (_katalog = fetch('katalog.json', {cache: 'no-cache'}).then(r => {
    if(!r.ok) throw new Error('katalog.json tidak ditemukan');
    return r.json();
  }));
}
// "Kelas 11" → jenjang untuk pengelompokan di beranda
function jenjang(kelas){
  if(/\bSMP\b/i.test(kelas)) return 'SMP';      // "TKA SMP" ikut grup SMP
  if(/\bSMA\b/i.test(kelas)) return 'SMA';      // "TKA SMA" ikut grup SMA
  const n = parseInt((kelas.match(/\d+/) || [0])[0], 10);
  if(n >= 10) return 'SMA';
  if(n >= 7) return 'SMP';
  return 'Lainnya';
}
function showError(box, msg){
  box.innerHTML = `<div class="card empty">${ic('alert', 'width:28px;height:28px')}<p style="margin-top:8px">${msg}</p>
    <p style="font-size:14px;margin-top:6px">Jalankan <code>python3 buat-katalog.py</code> lalu buka situs lewat server (misalnya <code>python3 -m http.server</code>).</p></div>`;
}
