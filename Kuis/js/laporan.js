/* Laporan PDF hasil kuis (memakai variabel dari kuis.js). */

/* ---------- laporan PDF ---------- */
const PDF_LIBS = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];
let libsP = null;
function loadLibs(){
  return libsP = libsP || Promise.all(PDF_LIBS.map(src => new Promise((ok, no) => {
    const s = document.createElement('script'); s.src = src; s.onload = ok;
    s.onerror = () => { libsP = null; no(new Error(src)); };
    document.head.appendChild(s);
  })));
}
const esc = t => String(t == null ? '' : t).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Satu blok = satu potongan yang tidak dipisah antarhalaman.
async function buildReport(){
  const qs = data.questions, N = data.total_questions, P = lastPayload;
  const st = i => answers[i] === null ? 'skip' : answers[i] === qs[i].answer ? 'ok' : 'no';
  const kosong = answers.filter(a => a === null).length;
  const blocks = [];
  blocks.push(`<div class="rp-head">
    <div class="rp-brand"><img src="Assets/Nalarin/web/wordmark-kuis-blue.png" alt=""><span class="k">Laporan hasil kuis</span></div>
    <h1>${esc(data.title || data.topic || 'Kuis')}</h1>
    <div class="rp-info">
      ${data.topic && data.topic !== data.title ? `<span>Topik</span><b>${esc(data.topic)}</b>` : ''}
      <span>Nama</span><b>${esc(name)}</b>
      <span>Tanggal</span><b>${esc(doneAt.toLocaleString('id-ID', {dateStyle: 'long', timeStyle: 'short'}))}</b>
      <span>Durasi</span><b>${esc(P.durasi)}</b>
    </div>
    <div class="rp-sum">
      <div class="s"><b>${P.skor}</b>Nilai</div>
      <div class="a"><b>${P.benar}</b>Benar</div>
      <div class="b"><b>${N - P.benar - kosong}</b>Salah</div>
      <div class="c"><b>${kosong}</b>Kosong</div>
    </div>
    <div class="rp-grid">${qs.map((q, i) => `<i class="rp-${st(i)}">${q.number || i + 1}</i>`).join('')}</div>
  </div>`);

  const imgs = await Promise.all(qs.map((q, i) => { const b = baseOf(q, i); return b ? loadImg(b) : null; }));
  const seen = new Set();
  for(let i = 0; i < qs.length; i++){
    const q = qs[i], s = st(i);
    const p = q.passage && (data.passages || []).find(x => x.id === q.passage);
    if(p && !seen.has(p.id)){
      seen.add(p.id);
      const pimg = p.image ? await loadImg(p.image) : null;
      const paras = Array.isArray(p.text) ? p.text : String(p.text || '').split(/\n\s*\n/);
      blocks.push(`<div class="rp-psg"><b>${esc(p.title || 'Teks bacaan')}</b>
        ${pimg ? `<img src="${esc(pimg)}" alt="" style="max-width:100%;max-height:260px;display:block;margin:0 auto 8px">` : ''}
        ${paras.map(t => `<p>${rich(t)}</p>`).join('')}</div>`);
    }
    const opts = Object.entries(q.options).map(([k, v]) => {
      const mine = answers[i] === k, key = k === q.answer;
      const cls = key ? 'right' : mine ? 'wrong' : '';
      const tag = key ? (mine ? 'Jawabanmu · benar' : 'Kunci') : mine ? 'Jawabanmu' : '';
      return `<div class="rp-o ${cls}"><span class="l">${esc(k)}</span><span class="t">${rich(v)}</span>${tag ? `<small>${tag}</small>` : ''}</div>`;
    }).join('');
    const label = {ok: ['Benar', '#0b9a6a'], no: ['Salah', '#e0344b'], skip: ['Tidak dijawab', '#8a91ad']}[s];
    blocks.push(`<div class="rp-q">
      <div class="rp-qh"><strong>Soal ${q.number || i + 1}</strong>${q.difficulty ? `<em>${esc(q.difficulty)}</em>` : ''}${p ? `<em>· ${esc(p.title || 'Teks bacaan')}</em>` : ''}
        <span class="rp-st" style="background:${label[1]}">${label[0]}</span></div>
      ${imgs[i] ? `<img src="${esc(imgs[i])}" alt="">` : ''}
      <div class="rp-qt">${rich(q.question)}</div>
      ${opts}
      <div class="rp-ex"><b>Pembahasan</b><p>${rich(q.explanation || 'Tidak ada pembahasan tambahan.')}</p></div>
    </div>`);
  }
  const box = $('report');
  box.innerHTML = blocks.join('');
  await Promise.all([...box.querySelectorAll('img')].map(im => im.decode().catch(() => {})));
  if(document.fonts) await document.fonts.ready;
  return [...box.children];
}

async function downloadPdf(){
  $('saving-t').textContent = 'Menyiapkan laporan PDF…';
  $('saving').classList.remove('hidden');
  try{
    await loadLibs();
    const els = await buildReport();
    const pdf = new window.jspdf.jsPDF({unit: 'mm', format: 'a4'});
    const M = 12, W = 210 - 2 * M, H = 297 - 2 * M - 6, GAP = 3;   // 6 mm untuk nomor halaman
    let y = M;
    for(const el of els){
      const c = await html2canvas(el, {scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false});
      let w = W, h = c.height * W / c.width;
      if(h > H){ w = w * H / h; h = H; }               // blok lebih tinggi dari satu halaman: perkecil
      if(y > M && y + h > M + H){ pdf.addPage(); y = M; }
      pdf.addImage(c.toDataURL('image/jpeg', 0.9), 'JPEG', M + (W - w) / 2, y, w, h);
      y += h + GAP;
    }
    const n = pdf.getNumberOfPages();
    for(let i = 1; i <= n; i++){
      pdf.setPage(i); pdf.setFontSize(8); pdf.setTextColor(120);
      pdf.text('Nalarin Kuis', M, 297 - 8);
      pdf.text(`Halaman ${i} dari ${n}`, 210 - M, 297 - 8, {align: 'right'});
    }
    const fn = `Laporan ${data.title || data.topic || 'Kuis'} - ${name}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
    pdf.save(fn + '.pdf');
  }catch(e){
    say('Laporan PDF gagal dibuat. Pastikan internet aktif, lalu coba lagi.');
  }finally{
    $('report').innerHTML = '';
    $('saving').classList.add('hidden');
  }
}
$('pdf').onclick = downloadPdf;
