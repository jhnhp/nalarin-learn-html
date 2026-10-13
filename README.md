# Nalarin Belajar

Situs belajar Matematika dan IPA Kurikulum Merdeka, bergaya Khan Academy. Cukup HTML, CSS, JS, dan JSON: tanpa database, tanpa akun, tanpa pelacakan. Kuis latihan memakai **Nalarin Kuis** di folder `Kuis/`.

## Struktur

```
nalarin-learn/
├── index.html            ← beranda (jenjang › kelas › mapel) dan halaman kursus (?kelas=…&mapel=…)
├── bab.html              ← halaman bab: daftar pelajaran di kiri, isi di tengah (?bab=…&p=…)
├── css/learn.css         ← tampilan situs (warna sama dengan Nalarin Kuis, warna per mapel)
├── css/sim.css           ← tampilan bersama untuk simulasi
├── js/umum.js            ← tema, ikon, tautan, pemuat katalog
├── js/beranda.js         ← beranda, pencarian, halaman kursus
├── js/bab.js             ← halaman bab dan semua jenis blok
├── js/sim.js             ← perkakas simulasi (bidang koordinat, panah, titik geser)
├── assets/               ← logo Nalarin
├── katalog.json          ← daftar semua bab (dibuat otomatis)
├── buat-katalog.py       ← pembuat katalog.json
├── materi/               ← isi materi, folder sama persis dengan Kuis/
│   └── Kelas11/Fisika/01 Vektor/
│       ├── bab.json      ← isi bab
│       ├── gambar/       ← gambar bab
│       └── sim/          ← simulasi HTML bab
└── Kuis/                 ← Nalarin Kuis (aplikasi terpisah, repositori git sendiri)
```

## Bab materi = bab kuis

Setiap folder kuis di `Kuis/` menjadi satu bab dengan folder yang **sama** di `materi/`:

```
Kuis/Kelas11/Fisika/01 Vektor/soal.json   →   materi/Kelas11/Fisika/01 Vektor/bab.json
```

Setelah menambah atau mengganti kuis:

```bash
python3 Kuis/buat-daftar.py   # perbarui daftar kuis
python3 buat-katalog.py       # samakan bab materi dan tulis katalog.json
```

`buat-katalog.py` membuat `bab.json` berisi contoh (status `"draf"`) untuk kuis yang belum punya materi. Bab draf memiliki pemberitahuan "Materi masih draf". Skrip juga memeriksa jenis blok, file gambar dan simulasi yang dirujuk, kunci jawaban cek pemahaman, serta folder materi yang kuisnya sudah tidak ada.

Bab unggulan di beranda diatur lewat `"unggulan"` di `katalog.json` (bawaan: `Kelas11/Fisika/01 Vektor`).

## Format `bab.json`

```json
{
  "title": "Vektor",
  "summary": "Ringkasan satu kalimat untuk halaman kursus.",
  "status": "lengkap",
  "lessons": [
    { "id": "komponen-vektor", "title": "Komponen vektor", "kind": "simulasi", "duration": "15 menit",
      "blocks": [ { "type": "text", "html": "<p>…</p>" } ] }
  ]
}
```

| Kolom | Keterangan |
|---|---|
| `status` | `"lengkap"` atau `"draf"` |
| `no` | opsional, nomor bab. Bawaan: angka di depan nama folder (`01 Vektor` → 1) |
| `lessons[].id` | dipakai di alamat (`bab.html?bab=…&p=komponen-vektor`), harus unik |
| `lessons[].kind` | ikon pelajaran: `artikel`, `video`, `simulasi`, atau `latihan` |

### Jenis blok

| `type` | Kolom | Hasil |
|---|---|---|
| `h` | `text`, `level` (2/3) | subjudul |
| `text` | `html` | paragraf, daftar, tabel (HTML bebas) |
| `image` | `src`, `alt`, `caption`, `width` | gambar dari folder bab, misalnya `"gambar/komponen.svg"` |
| `callout` | `variant` (`rumus`, `info`, `tips`, `awas`), `title`, `html` | kotak berwarna |
| `video` | `youtube` (ID video), `title`, `channel`, `start` | video YouTube, baru dimuat (youtube-nocookie) setelah diklik |
| `sim` | `src`, `title`, `height`, `caption` | simulasi HTML dalam bingkai, ada tombol layar penuh |
| `check` | `question`, `options`, `answer`, `hint`, `explanation` | cek pemahaman; siswa mencoba sampai benar |
| `example` | `title`, `question`, `steps` (array), `answer` | contoh soal, langkah dibuka satu per satu |
| `kuis` | `text` | kartu ajakan mengerjakan kuis bab ini |

Kartu kuis otomatis muncul di akhir pelajaran terakhir, dan tombol **Uji pemahaman** selalu ada di daftar pelajaran.

**Rumus** ditulis dengan KaTeX: `\( … \)` di dalam baris, `\[ … \]` di baris sendiri. Di JSON, garis miring terbalik ditulis dua kali: `"\\(A_x = A\\cos\\theta\\)"`.

## Membuat simulasi

Satu simulasi = satu file HTML di `sim/` milik bab. Muat perkakas bersama (lima tingkat ke atas dari `materi/Kelas/Mapel/Bab/sim/`):

```html
<link rel="stylesheet" href="../../../../../css/sim.css">
<script src="../../../../../js/sim.js"></script>
```

`sim.js` menyediakan:

- **Tema otomatis**: mengikuti terang/gelap halaman induk.
- **Tinggi otomatis**: bingkai menyesuaikan tinggi isi simulasi.
- `Sim.plane(svg, {xmin, xmax, ymin, ymax, scale})`: bidang koordinat dengan `grid()`, `arrow()`, `arc()`, `handle()`, dan `draggable()`.
- `Sim.fmt(angka)` untuk format angka Indonesia (`2,5`, `−3`).

Contoh lengkap ada di `materi/Kelas11/Fisika/01 Vektor/sim/`: `komponen.html`, `penjumlahan.html`, `misi-drone.html` (permainan), `keseimbangan.html`, dan `perkalian.html`.

## Menjalankan

Browser tidak bisa membaca JSON dari file lokal, jadi jalankan server dari folder ini:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`. Untuk GitHub Pages, unggah seluruh folder termasuk `Kuis/`.

Rumus (KaTeX), huruf (Google Fonts), dan video (YouTube) dimuat dari internet. Tanpa koneksi, rumus tampil sebagai teks mentah.
