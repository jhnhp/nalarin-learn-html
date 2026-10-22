# Catatan untuk Claude

Repo ini berisi dua produk: **Nalarin Learn** (materi, `index.html`, `bab.html`, `materi/`) dan **Nalarin Kuis** (`Kuis/`). Jangan menulis "Nalarin Belajar", itu nama lama.

## Hubungan dengan repo Kuis

- Kuis di repo ini **hanya yang fokus ke pelajaran sekolah** (terhubung dengan materi Learn). Kuis lain (misalnya Olimpiade) masuk ke repo terpisah `jhnhp/Kuis` (`/home/jhn/projects/Nalarin/Kuis`), jangan ditambahkan di sini.
- Folder kuis pelajaran sekolah (misalnya `TKA SMA`) ada di kedua repo. Setelah mengubahnya di sini, salin ke `Kuis/` (`rsync -a`), jalankan `buat-daftar.py` di sana, lalu commit dan push ke `main` di tiap repo.

## Aturan kuis (wajib)

- **Kuis bab: 20 soal.** **Evaluasi Akhir / Simulasi TKA: 40 soal.** Tidak ada 15, 25, atau jumlah lain.
- Komposisi tingkat kesulitan **30% Mudah / 50% Sedang / 20% Sulit**: 6 / 10 / 4 untuk 20 soal, 12 / 20 / 8 untuk 40 soal.
- Kunci jawaban harus merata (A–D, tidak menumpuk di satu huruf). Jawaban hitungan dicek ulang (sympy atau Python), bukan dari ingatan.
- Soal berteks bacaan atau gambar: `passages` di berkas yang sama, tiap soal memakai `"passage": "<id>"`; soal dengan teks yang sama berurutan.
- Sebelum commit, periksa jumlah soal semua kuis:
  `python3 Kuis/buat-daftar.py` lalu pastikan tidak ada kuis yang jumlahnya selain 20 atau 40 di `Kuis/daftar.json`.

## Struktur dan alur kerja

- Satu folder di `Kuis/<Kelas>/<Mapel>/<Bab>/` = satu bab di Learn. Kuis tambahan boleh ditaruh sebagai berkas `.json` lain di folder bab yang sama (tidak membuat bab draf baru). Folder kuis tanpa `materi/<...>/bab.json` akan dibuatkan bab draf oleh `buat-katalog.py`.
- Setelah menambah atau mengubah kuis: `python3 Kuis/buat-daftar.py` lalu `python3 buat-katalog.py`, dan commit `Kuis/daftar.json` serta `katalog.json`.
- Format berkas soal dan cara menambah kuis: lihat `Kuis/README.md`.

## Alat bantu (tidak ikut git)

- `_gen/` (generator bab dan kuis, skrip pemeriksa), `_jsons/` (kerangka TKA Pusmendik), dan `_buku/` **tidak pernah di-`git add`**.
- Generator ada di `_gen/gen/` (satu berkas per bab; pustaka bersama `lib.py`, kelas `Quiz`). Jalankan dengan `python3`.
- Pemeriksa: `_gen/cekbab.sh`, `_gen/jserr.sh`, `_gen/kuis.sh`.

## Gaya materi

- Tanpa video (pemilik akan menambah sendiri). Kesalahan di buku sumber diperbaiki di pelajaran dengan callout "Catatan buku".
- Contoh di pelajaran tidak boleh sama dengan soal di Evaluasi Akhir bab-bab sebelumnya.
