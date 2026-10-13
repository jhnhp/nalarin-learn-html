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
const courseUrl = (kelas, mapel) => 'index.html?kelas=' + encodeURIComponent(kelas) + (mapel ? '&mapel=' + encodeURIComponent(mapel) : '');

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
  <symbol id="i-quiz" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></symbol>
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
  if(/^TKA/i.test(kelas)) return 'Persiapan TKA';
  const n = parseInt((kelas.match(/\d+/) || [0])[0], 10);
  if(n >= 10) return 'SMA';
  if(n >= 7) return 'SMP';
  return 'Lainnya';
}
function showError(box, msg){
  box.innerHTML = `<div class="card empty">${ic('alert', 'width:28px;height:28px')}<p style="margin-top:8px">${msg}</p>
    <p style="font-size:14px;margin-top:6px">Jalankan <code>python3 buat-katalog.py</code> lalu buka situs lewat server (misalnya <code>python3 -m http.server</code>).</p></div>`;
}
