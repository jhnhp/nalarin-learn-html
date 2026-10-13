# Nalarin Kuis

**Versi 0.5**

Satu halaman `index.html` untuk semuanya: menu pilihan kuis **dan** halaman mengerjakan kuis. Tampilan ada di `css/`, logika di `js/`. Menu bekerja dalam tiga langkah: **pilih kelas → pilih mata pelajaran → pilih kuis**. Setiap kuis cukup berupa folder berisi `soal.json` (dan folder `gambar/` jika perlu).

## Struktur folder

Pola: **`Kelas / Mapel / Kuis / soal.json`**

```
Kuis/
├── index.html          ← satu-satunya file HTML (menu + kuis)
├── css/style.css       ← tampilan (warna merek ada di bagian :root)
├── js/kuis.js          ← mengerjakan kuis, nilai, pembahasan
├── js/laporan.js       ← unduh laporan PDF
├── js/daftar.js        ← menu Kelas › Mapel › Kuis (dimuat terakhir, menjalankan aplikasi)
├── Assets/Nalarin/     ← logo asli; versi web (transparan, favicon) ada di web/
├── daftar.json         ← daftar kuis (dibuat otomatis)
├── buat-daftar.py      ← pembuat daftar.json
├── migrasi.py          ← pemindah struktur lama (Mapel/Kelas/Kuis) ke struktur baru
├── README.md
│
├── Kelas7/
│   └── Matematika/
│       └── Perbandingan/soal.json
├── Kelas9/
│   ├── Biologi/DiagnosticTest/soal.json
│   ├── Fisika/DiagnosticTest/soal.json
│   └── Matematika/DiagnosticTest/soal.json
├── Kelas11/
│   └── Fisika/
│       ├── Kinematika dan Dinamika/soal_gerak_dan_gaya.json
│       ├── Kinematika dan Dinamika 2/
│       │   ├── soal.json
│       │   └── gambar/            ← gambar kuis ini (jika ada)
│       └── Vektor/soal_vektor.json
├── TKA/
│   ├── Ekonomi/Latihan1/soal.json
│   └── Fisika/Fluida dan Gelombang/soal_fluida_bunyi_cahaya.json
│
└── _template/          ← contoh soal teks, bergambar, dan bahasa (tidak tampil di menu)
```

- Folder tingkat pertama adalah **kelas**. Folder yang bukan kelas, seperti `TKA`, juga boleh dipakai di tingkat ini dan akan tampil sebagai kartu sendiri.
- Folder tingkat kedua adalah **mata pelajaran**, tingkat ketiga adalah **kuis**.
- Nama file soal bebas (`soal.json`, `soal_vektor.json`, dan seterusnya). Setiap file `.json` yang punya kunci `"questions"` dianggap satu kuis.
- Nama folder dirapikan otomatis di menu (`Kelas9` → Kelas 9, `DiagnosticTest` → Diagnostic Test). Nama yang ditulis dengan spasi dipakai apa adanya.

## Cara kerja

1. `buat-daftar.py` memindai semua file soal lalu menulis `daftar.json`.
2. Tanpa parameter, `index.html` membaca `daftar.json` dan menampilkan:
   - **Langkah 1:** kartu kelas (misalnya "Kelas 9, 3 mapel · 3 kuis").
   - **Langkah 2:** kartu mata pelajaran di kelas itu.
   - **Langkah 3:** daftar kuis untuk kelas dan mapel tersebut.
   - **Jejak** di atas ("Semua kelas › Kelas 11 › Fisika") untuk kembali satu langkah.
   - **Kolom pencarian** di setiap langkah. Pencarian dilakukan di dalam cakupan yang sedang dibuka: di halaman kelas mencari ke semua kelas, di halaman mapel mencari hanya di mapel itu.
3. Setiap langkah punya alamat sendiri sehingga bisa dibagikan, dan tombol Back browser berfungsi:

```
index.html?kelas=Kelas%2011                      ← mapel di Kelas 11
index.html?kelas=Kelas%2011&mapel=Fisika         ← kuis Fisika Kelas 11
index.html?kuis=Kelas11/Fisika/Vektor/soal_vektor.json   ← langsung membuka satu kuis
```

Setelah selesai mengerjakan, tombol **Kembali ke daftar kuis** membawa siswa ke daftar kelas dan mapel kuis itu.

Di halaman hasil, tombol **Unduh laporan (PDF)** membuat laporan berisi nilai, kunci jawaban, pembahasan, dan tanda benar/salah setiap soal (termasuk gambar dan teks bacaan). PDF dibuat di browser siswa memakai jsPDF dan html2canvas yang dimuat dari cdnjs saat tombol ditekan, jadi perlu koneksi internet.

Browser tidak bisa membaca isi folder sendiri, jadi `daftar.json` perlu dibuat ulang setiap kali ada kuis yang ditambah, dihapus, atau diganti namanya.

## Menambah kuis baru

1. Buat folder sesuai pola, misalnya `Kelas10/Kimia/Stoikiometri/`.
2. Letakkan file soal (`soal.json`) di dalamnya. Mulai dari contoh di `_template/`:
   - `SoalTeks/`: soal teks biasa
   - `SoalBergambar/`: soal dengan gambar
   - `SoalBahasa/`: teks bacaan bersama, gambar opsional
3. Jika ada gambar, taruh di `gambar/` di sebelah file soal, lalu tulis `"image": "nama-file.png"` pada soal yang memakainya.
4. Perbarui daftar:

```bash
python3 buat-daftar.py
```

Skrip menampilkan ringkasan kuis yang ditemukan dan **memeriksa isi soal**: jumlah pilihan kurang dari dua, kunci `answer` yang tidak ada di `options`, teks soal kosong, atau `total_questions` yang tidak cocok. Bagian *Perhatian* di akhir hasil menunjukkan file dan nomor soal yang bermasalah. Folder yang kurang dalam dari pola `Kelas/Mapel/Kuis` juga diberi peringatan.

Satu folder boleh berisi beberapa file soal. Masing-masing menjadi satu kuis.

## Pindah dari struktur lama (Mapel/Kelas/Kuis)

`migrasi.py` memindahkan folder lama ke struktur baru, termasuk `gambar/` dan semua isinya. Jalankan dari folder `Kuis/`:

```bash
python3 migrasi.py             # simulasi: hanya menampilkan rencana
python3 migrasi.py --jalankan  # benar-benar memindahkan
python3 buat-daftar.py
```

Aturannya:

| Struktur lama | Struktur baru |
|---|---|
| `Biologi/Kelas9/DiagnosticTest` | `Kelas9/Biologi/DiagnosticTest` |
| `Fisika/Kelas11/Vektor` | `Kelas11/Fisika/Vektor` |
| `Ekonomi/TKA Ekonomi/Latihan1` | `TKA/Ekonomi/Latihan1` |

Folder berawalan `TKA` dipindahkan ke `TKA/`. Jika kamu lebih suka TKA menjadi bagian dari kelas tertentu, ganti nama foldernya (misalnya `TKA` → `Kelas12`) lalu jalankan `buat-daftar.py` lagi.

Tujuan yang sudah ada tidak ditimpa (dilewati), dan folder lama yang kosong dihapus setelah dipindah. Tautan lama seperti `?kuis=Fisika/Kelas11/Vektor/soal_vektor.json` tidak berlaku lagi setelah pindah.

## Pengaturan menu

Label menu diambil dari nama folder: kelas dari folder tingkat pertama, mapel dari tingkat kedua, dan judul kuis dari `title` di JSON (jika kosong: `topic`, lalu nama folder).

Untuk menimpa dari dalam file soal, tambahkan kolom opsional `"kelas"`, `"mapel"`, atau `"topik"`.

Pengaturan di bagian atas `buat-daftar.py`:

| Pengaturan | Fungsi |
|---|---|
| `LABELS` | Nama tampilan khusus per folder, misalnya `"TKA": "TKA SMA"` |
| `EXCLUDE` | Folder yang dilewati. Bawaan: `htmlTemplate`, `gambar`, `node_modules` |

Folder berawalan `_` atau `.` selalu dilewati. Untuk menyembunyikan kuis yang belum siap, ganti nama foldernya menjadi `_Stoikiometri`.

## Format `soal.json`

```json
{
  "title": "Diagnostic Test Biologi",
  "topic": "Sel dan Jaringan",
  "difficulty_summary": "3 soal mudah, 4 sedang, 3 sulit.",
  "total_questions": 10,
  "questions": [
    {
      "number": 1,
      "difficulty": "Mudah",
      "question": "Organ yang menghasilkan empedu adalah ...",
      "options": { "A": "Lambung", "B": "Hati", "C": "Pankreas", "D": "Usus halus" },
      "answer": "B",
      "explanation": "Empedu dihasilkan oleh hati."
    }
  ]
}
```

| Kolom | Wajib | Keterangan |
|---|---|---|
| `title` | disarankan | Judul kuis |
| `topic` | tidak | Judul besar di halaman awal dan data topik yang dikirim ke spreadsheet |
| `difficulty_summary` | tidak | Keterangan singkat di halaman awal |
| `total_questions` | tidak | Jika kosong, dihitung dari jumlah soal |
| `questions[].number` | disarankan | Nomor soal |
| `questions[].image` | tidak | Nama file gambar di folder `gambar/` (lihat bagian Gambar) |
| `questions[].difficulty` | tidak | `Mudah`, `Sedang`, atau `Sulit` |
| `questions[].question` | ya | Teks soal |
| `questions[].options` | ya | Pilihan jawaban. Kuncinya bebas (A–D, boleh lebih) |
| `questions[].answer` | ya | Harus sama persis dengan salah satu kunci di `options` |
| `questions[].explanation` | tidak | Pembahasan di mode review |

**Format teks.** Semua teks (soal, pilihan, pembahasan, teks bacaan) menerima tag dasar `<b> <i> <u> <em> <strong> <sub> <sup> <br> <code> <mark> <small>`. Tag lain ditampilkan apa adanya sebagai teks, sehingga simbol seperti `a < b` aman ditulis langsung. Entitas HTML seperti `&lt;` dan `&amp;` tetap berfungsi. Baris baru (`\n`) dihormati.

## Gambar

Gambar **hanya dimuat jika soal punya atribut `"image"`**. Soal tanpa atribut itu tidak memicu permintaan apa pun ke server, jadi log server tetap bersih. Gambar disimpan di folder `gambar/` di samping `soal.json`.

| Di JSON | Hasil |
|---|---|
| (tidak ada atribut `image`) | Soal tanpa gambar, tidak ada permintaan ke server |
| `"image": "1.png"` | Memuat `gambar/1.png`. **Disarankan**: satu permintaan, tanpa menebak ekstensi |
| `"image": "1"` atau `"image": true` | Mencari gambar bernama nomor soal (atau nama itu) dengan mencoba ekstensi satu per satu (`jpg`, `png`, `jpeg`, `webp`, `gif`, `svg`, `avif`). Berguna jika lupa ekstensinya, tetapi menghasilkan beberapa 404 di log sampai file ditemukan |

Contoh:

```json
{ "number": 4, "image": "4.webp", "question": "Perhatikan gambar di atas ...", ... }
```

- Subfolder boleh dipakai: `"image": "bangun/segitiga.png"`.
- Gambar yang sama boleh dipakai oleh beberapa soal.
- Jika file yang disebut tidak ditemukan, muncul kotak merah berisi nama file yang dicari, supaya salah ketik mudah ketahuan.
- Gunakan ekstensi huruf kecil, karena GitHub Pages membedakan huruf besar dan kecil.
- Gambar bisa diketuk atau diklik untuk diperbesar (tutup dengan ketuk lagi atau `Esc`).
- Gambar soal berikutnya dimuat lebih dulu agar perpindahan soal terasa cepat.

Pengaturan tingkat kuis:

| Di JSON | Hasil |
|---|---|
| `"image_folder": "img"` | Folder gambar selain `gambar/` (relatif terhadap `soal.json`) |

## Teks bacaan (soal bahasa)

Tulis teks sekali di `passages`, lalu panggil dari soal dengan `passage`:

```json
{
  "passages": [
    {
      "id": "teks1",
      "title": "Bank Sampah di Sekolah Kami",
      "text": ["Paragraf pertama ...", "Paragraf kedua ..."],
      "image": "poster-lomba.png"
    }
  ],
  "questions": [
    { "number": 1, "passage": "teks1", "question": "...", "options": {}, "answer": "B" },
    { "number": 2, "passage": "teks1", "question": "...", "options": {}, "answer": "C" },
    { "number": 3, "question": "Soal tanpa teks bacaan ...", "options": {}, "answer": "A" }
  ]
}
```

| Kolom `passages` | Wajib | Keterangan |
|---|---|---|
| `id` | ya | Nama pengenal, dipanggil lewat `"passage"` |
| `title` | tidak | Judul di atas teks |
| `text` | ya | Array paragraf, atau satu string dengan paragraf dipisah baris kosong |
| `image` | tidak | Gambar milik teks, tulis nama file lengkap (`"poster-lomba.png"`). Disimpan di folder `gambar/` |

Di PC, teks bacaan tampil di kolom kiri dan tetap terlihat saat halaman digulir. Di HP, teks tampil di atas soal dengan tombol **Sembunyikan teks**. Keterangan "Teks ini dipakai untuk soal 1–4" muncul otomatis.

## Menyimpan nilai ke Google Sheets

Nilai dikirim ke Google Apps Script lewat konstanta `SCRIPT_URL` di baris pertama `js/kuis.js`. Ganti nilainya dengan alamat web app milikmu. Data yang dikirim (`POST`, isi JSON):

```json
{
  "nama": "Nama siswa",
  "topik": "Sel dan Jaringan",
  "durasi": "12 menit 30 detik",
  "skor": 80,
  "benar": 8,
  "salah": 2,
  "detailJawaban": [ { "jawaban": "B", "benar": true }, { "jawaban": "-", "benar": false } ]
}
```

Skor = jumlah benar ÷ total soal × 100. Soal kosong dicatat `"-"` dan dihitung salah. Jika pengiriman gagal, layar hasil menampilkan tombol **coba kirim lagi**.

## Fitur siswa

- Timer, tanda **Ragu-ragu**, navigasi nomor soal, mode gelap, dan mode review (kunci, jawaban sendiri, pembahasan).
- Di soal terakhir, tombol **Selanjutnya** berubah menjadi **Kumpulkan**.
- Halaman hasil menampilkan nilai, jumlah benar/salah/kosong, dan tombol **Unduh laporan (PDF)**.
- Progres tersimpan otomatis di browser per kuis. Jika halaman dimuat ulang, siswa bisa melanjutkan dengan nama yang sama. Progres dihapus setelah nilai berhasil terkirim.
- Nama siswa diingat untuk kuis berikutnya.
- Pintasan PC: `A`–`E` atau `1`–`9` memilih jawaban, `←` `→` pindah soal, `F` tandai ragu-ragu, `Esc` tutup gambar.

## Tampilan dan logo

- Warna mengikuti logo Nalarin (biru `#2447F9`). Semua warna diatur sebagai variabel di bagian `:root` pada `css/style.css` (tema terang) dan `:root[data-theme="dark"]` (tema gelap).
- Logo asli ada di `Assets/Nalarin/`. Halaman memakai versi web di `Assets/Nalarin/web/`: `icon.png` (ikon "n."), `wordmark-kuis-blue.png` dan `wordmark-kuis-white.png` (tulisan "nalarin. Kuis" untuk tema terang dan gelap), serta `favicon.png` dan `apple-touch-icon.png`.
- Jika logo diganti, buat ulang file di `web/` dengan latar transparan dan nama file yang sama.
- Huruf: Inter Tight untuk judul dan Inter untuk teks, dimuat dari Google Fonts.

## Menjalankan

**Lokal.** Browser memblokir pembacaan JSON jika halaman dibuka langsung dari file, jadi jalankan server sederhana di folder `Kuis/`:

```bash
python3 buat-daftar.py
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000`.

**Online.** Unggah folder ke GitHub Pages, termasuk `css/`, `js/`, dan `Assets/`. Folder `_template` boleh ikut diunggah tetapi tidak tampil di menu.

## Pemecahan masalah

| Masalah | Penyebab dan solusi |
|---|---|
| Halaman tampil polos tanpa warna atau tidak berfungsi | Folder `css/`, `js/`, atau `Assets/` belum ikut diunggah |
| "Daftar kuis belum bisa dimuat" | `daftar.json` belum ada, atau halaman dibuka langsung dari file. Jalankan `buat-daftar.py` dan buka lewat server |
| Kuis baru tidak muncul di menu | Daftar belum diperbarui. Jalankan `python3 buat-daftar.py` dan lihat bagian *Perhatian* |
| Kuis yang sudah dihapus masih muncul | Jalankan ulang `buat-daftar.py`, lalu segarkan browser (Ctrl+F5) |
| Kuis muncul di kelas atau mapel yang salah | Periksa urutan folder (Kelas/Mapel/Kuis), atau isi `"kelas"` dan `"mapel"` di JSON |
| "Kuis tidak bisa dimuat" setelah memilih | JSON rusak (koma atau kurung salah). Skrip menampilkan file yang rusak |
| Gambar tidak muncul | Pastikan soalnya punya atribut `"image"`, nama file (termasuk ekstensi) sama persis, dan filenya ada di `gambar/` di samping `soal.json` |
| Banyak 404 di log server | Terjadi jika memakai `"image": true` atau nama tanpa ekstensi. Tulis nama file lengkap, misalnya `"image": "16.png"` |
| Jawaban benar dianggap salah | `answer` harus sama persis dengan kunci di `options` (huruf besar/kecil berpengaruh) |
| Nilai tidak masuk spreadsheet | Periksa `SCRIPT_URL` dan akses web app Apps Script, lalu gunakan **coba kirim lagi** |

## Kredit

Dibuat oleh Johan Herdi Putra, 2026.
