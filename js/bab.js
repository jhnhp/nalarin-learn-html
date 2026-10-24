/* Halaman bab: daftar pelajaran di samping, isi pelajaran di tengah.
   Isi dibaca dari materi/<bab>/bab.json. Format blok dijelaskan di README.md. */

const BAB = P.get('bab') || '';
const BASE = 'materi/' + enc(BAB) + '/';
// alamat relatif di bab.json dihitung dari folder bab
const asset = src => /^(https?:)?\/\//.test(src) || src.startsWith('/') ? src : BASE + enc(src);

Promise.all([
  loadKatalog().catch(() => ({bab: []})),
  fetch(BASE + 'bab.json', {cache: 'no-cache'}).then(r => { if(!r.ok) throw new Error(r.status); return r.json(); }),
]).then(([kat, bab]) => {
  const meta = (kat.bab || []).find(b => b.id === BAB) || {};
  render(Object.assign({kelas: meta.kelas, mapel: meta.mapel, no: meta.no, kuis: meta.kuis || []}, bab));
}).catch(() => {
  $('side').classList.add('hidden');
  showError($('lesson'), 'Bab ini tidak ditemukan atau <code>bab.json</code> rusak.');
});

$('menu-btn').onclick = () => document.body.classList.toggle('side-open');
document.addEventListener('click', e => {
  if(document.body.classList.contains('side-open') && !e.target.closest('.side, #menu-btn')) document.body.classList.remove('side-open');
});

function render(b){
  const lessons = b.lessons || [];
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
    case 'text': { const d = mk('div', 'prose'); d.innerHTML = bl.html; fixLinks(d); return d; }
    case 'image': {
      const f = mk('figure', 'img'), im = mk('img');
      im.src = asset(bl.src); im.alt = bl.alt || ''; im.loading = 'lazy';
      if(bl.width) im.style.width = typeof bl.width === 'number' ? bl.width + 'px' : bl.width;
      f.appendChild(im);
      if(bl.caption){ const c = mk('figcaption'); c.innerHTML = bl.caption; f.appendChild(c); }
      return f;
    }
    case 'callout': {
      const v = {rumus: ['sigma', 'Rumus'], tips: ['bulb', 'Tips'], awas: ['alert', 'Hati-hati'], info: ['info', 'Ingat']}[bl.variant] || ['info', 'Ingat'];
      const d = mk('div', 'callout prose ' + (bl.variant || 'info'));
      d.innerHTML = `<div class="ct">${ic(v[0], 'width:16px;height:16px')}<span></span></div>${bl.html}`;
      d.querySelector('.ct span').textContent = bl.title || v[1];
      return d;
    }
    case 'video': return video(bl);
    case 'sim': return sim(bl);
    case 'check': return check(bl);
    case 'example': return example(bl);
    case 'kuis': return quizCard(b, bl.text);
    default: console.warn('Blok tidak dikenal:', bl); return null;
  }
}

// video YouTube dimuat setelah diklik (youtube-nocookie), jadi halaman tidak memuat pemutar sebelum dibutuhkan
function video(bl){
  const wrap = mk('div');
  const v = mk('div', 'video'), btn = mk('button');
  btn.style.backgroundImage = `url(https://i.ytimg.com/vi/${bl.youtube}/hqdefault.jpg)`;
  btn.setAttribute('aria-label', 'Putar video: ' + (bl.title || ''));
  btn.innerHTML = `<span class="play"><svg class="i"><use href="#i-playfill"/></svg></span><span class="vt"><span></span><small></small></span>`;
  btn.querySelector('.vt span').textContent = bl.title || '';
  btn.querySelector('.vt small').textContent = bl.channel ? 'YouTube · ' + bl.channel : 'YouTube';
  btn.onclick = () => {
    const f = mk('iframe');
    f.src = `https://www.youtube-nocookie.com/embed/${bl.youtube}?autoplay=1&rel=0${bl.start ? '&start=' + bl.start : ''}`;
    f.title = bl.title || 'Video'; f.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'; f.allowFullscreen = true;
    btn.replaceWith(f);
  };
  v.appendChild(btn); wrap.appendChild(v);
  if(bl.note){ const n = mk('p', 'vnote'); n.innerHTML = bl.note; wrap.appendChild(n); wrap.lastChild.style.marginTop = '8px'; }
  return wrap;
}

function sim(bl){
  const c = mk('section', 'card sim');
  c.innerHTML = `<div class="sim-h"><span class="kind">${ic('sim')}</span><b></b><button class="btn sm" aria-label="Layar penuh">${ic('max', 'width:16px;height:16px')}</button></div>`;
  c.querySelector('b').textContent = bl.title || 'Simulasi';
  const f = mk('iframe', 'simframe');
  f.src = asset(bl.src) + '?theme=' + document.documentElement.dataset.theme;
  f.title = bl.title || 'Simulasi'; f.loading = 'lazy';
  f.style.height = (bl.height || 480) + 'px';
  c.appendChild(f);
  c.querySelector('button').onclick = () => (f.requestFullscreen || f.webkitRequestFullscreen || (() => {})).call(f);
  if(bl.caption){ const p = mk('div', 'cap'); p.innerHTML = bl.caption; c.appendChild(p); }
  return c;
}
// simulasi boleh meminta tinggi sendiri: parent.postMessage({simHeight: 600}, '*')
addEventListener('message', e => {
  if(!e.data || !e.data.simHeight) return;
  document.querySelectorAll('iframe.simframe').forEach(f => { if(f.contentWindow === e.source) f.style.height = e.data.simHeight + 'px'; });
});

function check(bl){
  const c = mk('section', 'card check');
  c.innerHTML = `<div class="ct">${ic('check', 'width:16px;height:16px')}${bl.title || 'Cek pemahaman'}</div><div class="qq prose"></div><div class="opts"></div>`;
  c.querySelector('.qq').innerHTML = bl.question;
  const opts = c.querySelector('.opts');
  let done = false, fb = null;
  Object.entries(bl.options).forEach(([k, v]) => {
    const o = mk('button', 'opt'); o.innerHTML = `<span class="k"></span><span></span>`;
    o.firstChild.textContent = k; o.lastChild.innerHTML = v;
    o.onclick = () => {
      if(done) return;
      if(fb) fb.remove();
      fb = mk('div', 'fb prose');
      if(k === bl.answer){
        done = true; o.classList.add('right');
        fb.classList.add('ok'); fb.innerHTML = '<b>Benar!</b> ' + (bl.explanation || '');
      } else {
        o.classList.add('wrong');
        fb.classList.add('no'); fb.innerHTML = '<b>Belum tepat.</b> ' + (bl.hint || 'Coba pilih jawaban lain.');
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
  c.querySelector('.qq').innerHTML = bl.question;
  const ol = c.querySelector('.steps'), ans = c.querySelector('.ans'), btn = c.querySelector('button');
  const steps = bl.steps || [];
  let n = 0;
  if(bl.answer) ans.innerHTML = 'Jawaban: ' + bl.answer;
  const next = () => {
    if(n < steps.length){
      const li = mk('li'), d = mk('div', 'prose'); d.innerHTML = steps[n]; li.appendChild(d); ol.appendChild(li); renderMath(li); n++;
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
