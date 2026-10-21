/* Soal PDF untuk dicetak: kop Nalarin Kuis, kolom nama/tanggal, dua soal per halaman,
   pilihan jawaban dua kolom, dan kotak coretan (memakai loadLibs, rich, loadImg, baseOf dari berkas lain). */

async function buildSheet(){
  const qs = data.questions, title = data.title || data.topic || 'Kuis';
  const imgs = await Promise.all(qs.map((q, i) => { const b = baseOf(q, i); return b ? loadImg(b) : null; }));
  const blocks = [{kind: 'head', html: `<div class="sp-head">
    <div class="sp-top"><img src="Assets/Nalarin/web/wordmark-kuis-blue.png" alt=""><b>${esc(title)}</b></div>
    <div class="sp-who"><span>Nama:</span><i></i><span>Tanggal:</span><i></i></div>
  </div>`}];
  const seen = new Set();
  for(let i = 0; i < qs.length; i++){
    const q = qs[i];
    const p = q.passage && (data.passages || []).find(x => x.id === q.passage);
    if(p && !seen.has(p.id)){
      seen.add(p.id);
      const pimg = p.image ? await loadImg(p.image) : null;
      const paras = Array.isArray(p.text) ? p.text : String(p.text || '').split(/\n\s*\n/);
      blocks.push({kind: 'psg', html: `<div class="sp-psg"><b>${esc(p.title || 'Teks bacaan')}</b>
        ${pimg ? `<img src="${esc(pimg)}" alt="">` : ''}
        ${paras.map(t => `<p>${rich(t)}</p>`).join('')}</div>`});
    }
    const opts = Object.entries(q.options);
    const wide = opts.some(([, v]) => String(v).length > 28);
    blocks.push({kind: 'q', html: `<div class="sp-q">
      <span class="sp-n">${q.number || i + 1}</span>
      <div class="sp-b">
        <div class="sp-t">${rich(q.question)}</div>
        ${imgs[i] ? `<img class="sp-i" src="${esc(imgs[i])}" alt="">` : ''}
        <div class="sp-o${wide ? ' w' : ''}">${opts.map(([k, v]) => `<div><b>${esc(k)}.</b> ${rich(v)}</div>`).join('')}</div>
      </div>
    </div>`});
  }
  const box = $('report');
  box.innerHTML = blocks.map(b => b.html).join('');
  await Promise.all([...box.querySelectorAll('img')].map(im => im.decode().catch(() => {})));
  if(document.fonts) await document.fonts.ready;
  blocks.forEach((b, i) => b.el = box.children[i]);
  return blocks;
}

async function downloadSoalPdf(){
  $('saving-t').textContent = 'Menyiapkan soal PDF…';
  $('saving').classList.remove('hidden');
  try{
    await loadLibs();
    const blocks = await buildSheet();
    const M = 15, W = 210 - 2 * M, FOOT = 12, GAP = 5, BMIN = 40, BMAX = 86, PER_PAGE = 2;
    for(const b of blocks){
      const c = await html2canvas(b.el, {scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false});
      b.img = c.toDataURL('image/jpeg', 0.85);
      b.w = W; b.h = c.height * W / c.width;
    }
    const head = blocks.shift();
    const HP = 297 - M - FOOT - (M + head.h + GAP);          // tinggi isi per halaman
    const fit = b => { if(b.h > HP){ b.w = b.w * HP / b.h; b.h = HP; } };
    blocks.forEach(fit);

    // Teks bacaan selalu satu halaman dengan soal pertamanya (jika muat).
    const pages = [];
    let cur = null;
    const room = (pg, need) => pg.used + need <= HP;
    const place = (items, nq) => {
      const need = items.reduce((s, b) => s + b.h + GAP, 0) + nq * BMIN;
      if(!cur || cur.nq + nq > PER_PAGE || !room(cur, need)){ cur = {items: [], nq: 0, used: 0}; pages.push(cur); }
      cur.items.push(...items); cur.nq += nq; cur.used += need;
    };
    for(let i = 0; i < blocks.length; i++){
      const b = blocks[i], nxt = blocks[i + 1];
      if(b.kind === 'psg' && nxt && nxt.kind === 'q'){
        const need = b.h + nxt.h + 2 * GAP + BMIN;
        if(need <= HP){ place([b, nxt], 1); i++; } else place([b], 0);
      } else place([b], b.kind === 'q' ? 1 : 0);
    }

    const pdf = new window.jspdf.jsPDF({unit: 'mm', format: 'a4'});
    pdf.setLineWidth(0.25);
    pages.forEach((pg, pi) => {
      if(pi) pdf.addPage();
      pdf.addImage(head.img, 'JPEG', M, M, W, head.h);
      let y = M + head.h + GAP;
      const free = HP - pg.items.reduce((s, b) => s + b.h + GAP, 0);
      const bh = pg.nq ? Math.min(BMAX, Math.max(BMIN, free / pg.nq)) : 0;
      pg.items.forEach((b, k) => {
        pdf.addImage(b.img, 'JPEG', M + (W - b.w) / 2, y, b.w, b.h);
        y += b.h + 2;
        if(b.kind === 'q'){
          const ix = 10;                                         // sejajar dengan teks soal
          pdf.setDrawColor(190, 195, 215); pdf.setLineDashPattern([1, 1], 0);
          pdf.roundedRect(M + ix, y, W - ix, bh - 4.5, 2, 2);
          pdf.setFont('helvetica', 'italic'); pdf.setFontSize(7); pdf.setTextColor(160, 165, 185);
          pdf.text('Ruang coretan / catatan', M + ix + 2, y + 4);
          y += bh;
          const lastOnPage = pg.items.slice(k + 1).every(x => x.kind !== 'q');
          if(!lastOnPage){
            pdf.setDrawColor(200, 204, 220); pdf.setLineDashPattern([2, 2], 0);
            pdf.line(M, y - 2, M + W, y - 2);
            pdf.setLineDashPattern([], 0);
          }
        } else y += GAP - 2;
      });
    });
    const n = pdf.getNumberOfPages();
    for(let i = 1; i <= n; i++){
      pdf.setPage(i); pdf.setFont('helvetica', 'normal'); pdf.setFontSize(8); pdf.setTextColor(120);
      pdf.text(`Halaman ${i} dari ${n}`, 105, 297 - 8, {align: 'center'});
    }
    const title = data.title || data.topic || 'Kuis';
    pdf.setProperties({title, author: 'Nalarin Kuis'});
    pdf.save(`Soal ${title}`.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + '.pdf');
  }catch(e){
    say('Soal PDF gagal dibuat. Pastikan internet aktif, lalu coba lagi.');
  }finally{
    $('report').innerHTML = '';
    $('saving').classList.add('hidden');
  }
}
$('soal-pdf').onclick = downloadSoalPdf;
