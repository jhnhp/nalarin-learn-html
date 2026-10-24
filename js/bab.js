/* Halaman bab: daftar pelajaran di samping, isi pelajaran di tengah.
   Isi dibaca dari materi/<bab>/bab.json. Format blok dijelaskan di README.md. */

const BAB = P.get('bab') || '';
const BASE = 'materi/' + enc(BAB) + '/';
// alamat relatif di bab.json dihitung dari folder bab
const asset = src => {
  const value = String(src || '');
  if(/^https?:\/\//i.test(value)) return value;
  if(value.startsWith('/')) return value;
  return BASE + enc(value);
};

loadKatalog().then(kat => {
  const daftar = Array.isArray(kat.bab) ? kat.bab : [];
  // Hanya izinkan ID bab yang terdaftar di katalog; jangan jadikan query URL
  // sebagai path file bebas.
  const meta = daftar.find(item => item && item.id === BAB);
  if(!meta) throw new Error('ID bab tidak terdaftar');
  return fetch('materi/' + enc(meta.id) + '/bab.json', {cache: 'no-cache'})
    .then(r => { if(!r.ok) throw new Error(r.status); return r.json(); })
    .then(bab => render(Object.assign({kelas: meta.kelas, mapel: meta.mapel, no: meta.no, kuis: meta.kuis || []}, bab)));
}).catch(() => {
  $('side').classList.add('hidden');
  showError($('lesson'), 'Bab ini tidak ditemukan atau <code>bab.json</code> rusak.');
});

$('menu-btn').onclick = () => document.body.classList.toggle('side-open');
document.addEventListener('click', e => {
  if(document.body.classList.contains('side-open') && !e.target.closest('.side, #menu-btn')) document.body.classList.remove('side-open');
});

function render(b){
  const lessons = Array.isArray(b.lessons) ? b.lessons : [];
  b.kuis = Array.isArray(b.kuis) ? b.kuis.filter(k => k && typeof k.path === 'string') : [];
  const idx = Math.max(0, lessons.findIndex(l => l.id === P.get('p')));
  const L = lessons[idx];
  document.body.dataset.mapel = b.mapel || '';
  document.title = (L ? L.title + ' · ' : '') + b.title + ' · Nalarin Learn';
  if(b.kuis[0]) $('nav-kuis').href = quizUrl(b.kuis[0].path);

  /* samping */
  const side = $('side');
  const up = mk('a', 'up'); up.href = b.kelas ? courseUrl(b.kelas, b.mapel, kelompokOf(b.kelas, b.mapel)) : 'index.html';
  up.innerHTML = ic('left', 'width:15px;height:15px'); up.append((b.mapel || '') + ' ' + (b.kelas ? kelasLabel(b.kelas, b.mapel) : ''));
  side.appendChild(up);
  side.appendChild(mk('div', 'ctx', 'Bab ' + (b.no || '')));
  side.appendChild(mk('h2', '', b.title));
  const ol = mk('ol');
  lessons.forEach((l, i) => {
    const li = mk('li'), a = mk('a'); a.href = babUrl(BAB, l.id);
    if(i === idx){ a.className = 'on'; a.setAttribute('aria-current', 'page'); }
    a.innerHTML = `<span class="kind">${ic(kindOf(l.kind).icon)}</span><div><span></span><small></small></div>`;
    a.querySelector('span:not(.kind)').textContent = l.title;
    a.querySelector('small').textContent = kindOf(l.kind).label + (l.duration ? ' · ' + l.duration : '');
    li.appendChild(a); ol.appendChild(li);
  });
  side.appendChild(ol);
  if(b.kuis.length){
    const q = mk('div', 'q');
    b.kuis.forEach(k => {
      const a = mk('a'); a.href = quizUrl(k.path);
      a.innerHTML = `${ic('quiz')}<div>Uji pemahaman<small></small></div>`;
      a.querySelector('small').textContent = k.questions + ' soal di Nalarin Kuis';
      q.appendChild(a);
    });
    side.appendChild(q);
  }

  /* isi */
  const art = $('lesson'); art.innerHTML = '';
  if(!L){ art.appendChild(mk('p', 'muted', 'Bab ini belum punya pelajaran.')); return; }
  const h = mk('div', 'lesson-h');
  h.innerHTML = `<small>${ic(kindOf(L.kind).icon, 'width:15px;height:15px')}<span></span></small><h1></h1><div class="meta"></div>`;
  h.querySelector('small span').textContent = 'Bab ' + (b.no || '') + ' · ' + b.title + ' · Pelajaran ' + (idx + 1) + ' dari ' + lessons.length;
  h.querySelector('h1').textContent = L.title;
  const meta = h.querySelector('.meta');
  meta.innerHTML = `<span class="pill">${kindOf(L.kind).label}</span>` + (L.duration ? `<span class="pill">${ic('clock', 'width:13px;height:13px')}${L.duration}</span>` : '');
  art.appendChild(h);

  if(b.status !== 'lengkap'){
    const d = mk('div', 'draft');
    d.innerHTML = `${ic('info')}<div><b>Materi masih draf.</b> Isi halaman ini adalah contoh sementara dan akan diganti. Kuis bab ini sudah bisa dikerjakan.</div>`;
    art.appendChild(d); d.style.marginBottom = '20px';
  }

  const blocks = mk('div', 'blocks');
  (L.blocks || []).forEach(bl => { const el = block(bl, b); if(el) blocks.appendChild(el); });
  // akhir bab: ajak mengerjakan kuis
  if(idx === lessons.length - 1 && b.kuis.length && !(L.blocks || []).some(x => x.type === 'kuis')) blocks.appendChild(quizCard(b));
  art.appendChild(blocks);

  /* sebelumnya / berikutnya */
  const pg = mk('nav', 'pager');
  const link = (l, cls, label) => { const a = mk('a', cls); a.href = babUrl(BAB, l.id); a.innerHTML = `<small>${label}</small><b></b>`; a.querySelector('b').textContent = l.title; return a; };
  pg.appendChild(idx > 0 ? link(lessons[idx - 1], 'prev', '← Sebelumnya') : mk('span'));
  if(idx < lessons.length - 1) pg.appendChild(link(lessons[idx + 1], 'next', 'Berikutnya →'));
  else if(b.kuis[0]){ const a = mk('a', 'next'); a.href = quizUrl(b.kuis[0].path); a.innerHTML = '<small>Selesai membaca? →</small><b>Kerjakan kuis bab ini</b>'; pg.appendChild(a); }
  art.appendChild(pg);

  renderMath(art);
}

/* ---------- blok ---------- */
function block(bl, b){
  switch(bl.type){
    case 'h': case 'heading': return mk(bl.level === 3 ? 'h3' : 'h2', '', bl.text);
    case 'text': { const d = mk('div', 'prose'); setSafeHTML(d, bl.html); fixLinks(d); return d; }
    case 'image': {
      const f = mk('figure', 'img'), im = mk('img');
      im.src = asset(bl.src); im.alt = bl.alt || ''; im.loading = 'lazy';
      if(bl.width) im.style.width = typeof bl.width === 'number' ? bl.width + 'px' : bl.width;
      f.appendChild(im);
      if(bl.caption){ const c = mk('figcaption'); setSafeHTML(c, bl.caption); f.appendChild(c); }
      return f;
    }
    case 'callout': {
      const v = {rumus: ['sigma', 'Rumus'], tips: ['bulb', 'Tips'], awas: ['alert', 'Hati-hati'], info: ['info', 'Ingat']}[bl.variant] || ['info', 'Ingat'];
      const d = mk('div', 'callout prose ' + (bl.variant || 'info'));
      d.innerHTML = `<div class="ct">${ic(v[0], 'width:16px;height:16px')}<span></span></div>`;
      d.querySelector('.ct span').textContent = bl.title || v[1];
      const body = mk('div', 'prose'); setSafeHTML(body, bl.html); d.appendChild(body);
      return d;
    }
    case 'video': return video(bl);
    case 'sim': return sim(bl);
    case 'check': return check(bl);
    case 'example': return example(bl);
    case 'cheatsheet': return cheatSheet(bl, b);
    case 'kuis': return quizCard(b, bl.text);
    default: console.warn('Blok tidak dikenal:', bl); return null;
  }
}

// video YouTube dimuat setelah diklik (youtube-nocookie), jadi halaman tidak memuat pemutar sebelum dibutuhkan
function video(bl){
  const wrap = mk('div');
  const v = mk('div', 'video'), btn = mk('button');
  const videoId = /^[A-Za-z0-9_-]{11}$/.test(String(bl.youtube || '')) ? bl.youtube : '';
  if(!videoId) return mk('p', 'muted', 'ID video YouTube tidak valid.');
  btn.style.backgroundImage = `url(https://i.ytimg.com/vi/${videoId}/hqdefault.jpg)`;
  btn.setAttribute('aria-label', 'Putar video: ' + (bl.title || ''));
  btn.innerHTML = `<span class="play"><svg class="i"><use href="#i-playfill"/></svg></span><span class="vt"><span></span><small></small></span>`;
  btn.querySelector('.vt span').textContent = bl.title || '';
  btn.querySelector('.vt small').textContent = bl.channel ? 'YouTube · ' + bl.channel : 'YouTube';
  btn.onclick = () => {
    const f = mk('iframe');
    const start = Number.isFinite(Number(bl.start)) && Number(bl.start) >= 0 ? Math.floor(Number(bl.start)) : 0;
    f.src = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0${start ? '&start=' + start : ''}`;
    f.title = bl.title || 'Video'; f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen = true;
    btn.replaceWith(f);
  };
  v.appendChild(btn); wrap.appendChild(v);
  if(bl.note){ const n = mk('p', 'vnote'); setSafeHTML(n, bl.note); wrap.appendChild(n); wrap.lastChild.style.marginTop = '8px'; }
  return wrap;
}

function sim(bl){
  const c = mk('section', 'card sim');
  c.innerHTML = `<div class="sim-h"><span class="kind">${ic('sim')}</span><b></b><button class="btn sm" aria-label="Layar penuh">${ic('max', 'width:16px;height:16px')}</button></div>`;
  c.querySelector('b').textContent = bl.title || 'Simulasi';
  const f = mk('iframe', 'simframe');
  f.src = asset(bl.src) + '?theme=' + document.documentElement.dataset.theme;
  f.title = bl.title || 'Simulasi'; f.loading = 'lazy';
  const requestedHeight = Number(bl.height);
  const height = Number.isFinite(requestedHeight) ? Math.max(240, Math.min(2000, Math.round(requestedHeight))) : 480;
  f.style.height = height + 'px';
  c.appendChild(f);
  c.querySelector('button').onclick = () => (f.requestFullscreen || f.webkitRequestFullscreen || (() => {})).call(f);
  if(bl.caption){ const p = mk('div', 'cap'); setSafeHTML(p, bl.caption); c.appendChild(p); }
  return c;
}
// simulasi boleh meminta tinggi sendiri: parent.postMessage({simHeight: 600}, '*')
addEventListener('message', e => {
  if(e.origin !== location.origin || !e.data || !Number.isFinite(e.data.simHeight)) return;
  const height = Math.max(240, Math.min(2000, Math.round(e.data.simHeight)));
  document.querySelectorAll('iframe.simframe').forEach(f => {
    if(f.contentWindow === e.source && new URL(f.src, location.href).origin === location.origin) f.style.height = height + 'px';
  });
});

function check(bl){
  const c = mk('section', 'card check');
  c.innerHTML = `<div class="ct">${ic('check', 'width:16px;height:16px')}<span></span></div><div class="qq prose"></div><div class="opts"></div>`;
  c.querySelector('.ct span').textContent = bl.title || 'Cek pemahaman';
  setSafeHTML(c.querySelector('.qq'), bl.question);
  const opts = c.querySelector('.opts');
  let done = false, fb = null;
  Object.entries(bl.options).forEach(([k, v]) => {
    const o = mk('button', 'opt'); o.innerHTML = `<span class="k"></span><span></span>`;
    o.firstChild.textContent = k; setSafeHTML(o.lastChild, v);
    o.onclick = () => {
      if(done) return;
      if(fb) fb.remove();
      fb = mk('div', 'fb prose');
      if(k === bl.answer){
        done = true; o.classList.add('right');
        fb.classList.add('ok'); fb.innerHTML = '<b>Benar!</b> '; const explanation = mk('span'); setSafeHTML(explanation, bl.explanation || ''); fb.appendChild(explanation);
      } else {
        o.classList.add('wrong');
        fb.classList.add('no'); fb.innerHTML = '<b>Belum tepat.</b> '; const hint = mk('span'); setSafeHTML(hint, bl.hint || 'Coba pilih jawaban lain.'); fb.appendChild(hint);
      }
      c.appendChild(fb); renderMath(fb);
    };
    opts.appendChild(o);
  });
  return c;
}

// contoh soal: langkah dibuka satu per satu
function example(bl){
  const c = mk('section', 'card example');
  c.innerHTML = `<div class="ct"></div><div class="qq prose"></div><ol class="steps"></ol><div class="ans prose hidden"></div>
    <button class="btn sm" style="margin-top:12px">${ic('bulb', 'width:16px;height:16px')}<span>Tampilkan langkah 1</span></button>`;
  c.querySelector('.ct').textContent = bl.title || 'Contoh soal';
  setSafeHTML(c.querySelector('.qq'), bl.question);
  const ol = c.querySelector('.steps'), ans = c.querySelector('.ans'), btn = c.querySelector('button');
  const steps = bl.steps || [];
  let n = 0;
  if(bl.answer){ ans.textContent = 'Jawaban: '; const answer = mk('span'); setSafeHTML(answer, bl.answer); ans.appendChild(answer); }
  const next = () => {
    if(n < steps.length){
      const li = mk('li'), d = mk('div', 'prose'); setSafeHTML(d, steps[n]); li.appendChild(d); ol.appendChild(li); renderMath(li); n++;
    }
    if(n >= steps.length){ if(bl.answer){ ans.classList.remove('hidden'); renderMath(ans); } btn.remove(); }
    else btn.querySelector('span').textContent = 'Langkah ' + (n + 1);
  };
  btn.onclick = next;
  if(!steps.length) btn.querySelector('span').textContent = 'Tampilkan jawaban';
  return c;
}

function quizCard(b, text){
  const k = b.kuis[0]; if(!k) return null;
  const c = mk('section', 'card quizcard');
  c.innerHTML = `<img src="assets/icon.png" alt=""><div><h3>Siap menguji pemahamanmu?</h3><p></p></div><a class="btn">Kerjakan kuis ${ic('arrow')}</a>`;
  c.querySelector('p').textContent = text || `${k.questions} soal tentang ${b.title} di Nalarin Kuis. Ada pembahasan untuk setiap soal.`;
  c.querySelector('a').href = quizUrl(k.path);
  return c;
}

function cheatSheet(bl, b){
  const c = mk('section', 'card cheatsheet-card');
  const isMega = !!bl.isMega;
  c.innerHTML = `
    <div class="cs-header">
      <div class="cs-titles">
        <span class="cs-badge">${ic('sigma', 'width:12px;height:12px;vertical-align:-1px;margin-right:4px')}${isMega ? 'MEGA CHEAT SHEET TKA' : 'CHEAT SHEET UJIAN'}</span>
        <h3 class="cs-title"></h3>
        <p class="cs-sub"></p>
      </div>
      <button class="btn cs-print-btn" type="button" title="Cetak atau simpan sebagai PDF">
        ${ic('printer', 'width:16px;height:16px')}
        <span>Cetak Cheat Sheet (PDF)</span>
      </button>
    </div>
    <div class="cs-body prose">
      ${bl.html || ''}
    </div>
  `;
  c.querySelector('.cs-title').textContent = bl.title || (isMega ? `Mega Cheat Sheet: Ringkasan Lengkap Materi TKA` : `Cheat Sheet: ${b.title}`);
  c.querySelector('.cs-sub').textContent = bl.subtitle || (isMega ? 'Rangkuman terpadu rumus kunci, konsep esensial, dan jalan pintas cepat untuk seluruh bab TKA.' : 'Rangkuman cepat rumus inti, definisi variabel, dan tips eliminasi kilat.');
  const printBtn = c.querySelector('.cs-print-btn');
  printBtn.onclick = () => printCheatSheet(c);
  fixLinks(c);
  return c;
}

function printCheatSheet(cardEl){
  cardEl.classList.add('is-printing-target');
  document.body.classList.add('print-cheatsheet-only');
  const cleanup = () => {
    cardEl.classList.remove('is-printing-target');
    document.body.classList.remove('print-cheatsheet-only');
    window.removeEventListener('afterprint', cleanup);
  };
  window.addEventListener('afterprint', cleanup);
  setTimeout(() => {
    window.print();
    setTimeout(cleanup, 1200);
  }, 100);
}

// tautan dan gambar di teks: alamat relatif dihitung dari folder bab, tautan luar dibuka di tab baru
function fixLinks(el){
  el.querySelectorAll('a[href]').forEach(a => {
    const h = a.getAttribute('href');
    if(!/^(https?:|mailto:|#|\/|bab\.html|index\.html)/.test(h)) a.href = asset(h);
    if(/^https?:/.test(h)){ a.target = '_blank'; a.rel = 'noopener'; }
  });
  el.querySelectorAll('img[src]').forEach(im => { im.src = asset(im.getAttribute('src')); im.loading = 'lazy'; });
}

// rumus: \( ... \) untuk dalam baris, \[ ... \] atau $$ ... $$ untuk baris sendiri
function renderMath(el){
  // Pastikan sel tabel satuan / simbol yang memuat ekspresi LaTeX otomatis terbungkus \( ... \)
  el.querySelectorAll('.var-table td, td.unit, td.sym').forEach(td => {
    const txt = td.innerHTML.trim();
    if((txt.includes('\\') || txt.includes('^') || txt.includes('_')) && !txt.includes('\\(') && !txt.includes('\\[') && !txt.includes('$')){
      td.innerHTML = '\\(' + txt + '\\)';
    }
  });

  const go = () => window.renderMathInElement && renderMathInElement(el, {
    delimiters: [
      {left: '\\[', right: '\\]', display: true},
      {left: '$$', right: '$$', display: true},
      {left: '\\(', right: '\\)', display: false},
      {left: '$', right: '$', display: false}
    ],
    throwOnError: false,
  });
  if(window.renderMathInElement) go(); else addEventListener('load', go, {once: true});
}
