#!/usr/bin/env python3
"""
Memindahkan struktur lama  Mapel/Kelas/Kuis  ->  struktur baru  Kelas/Mapel/Kuis.

  python3 migrasi.py             simulasi (hanya menampilkan rencana, tidak memindahkan apa pun)
  python3 migrasi.py --jalankan  memindahkan folder

Aturan:
  Biologi/Kelas9/DiagnosticTest      ->  Kelas9/Biologi/DiagnosticTest
  Ekonomi/TKA Ekonomi/Latihan1       ->  TKA/Ekonomi/Latihan1     (folder berawalan "TKA")
Seluruh isi folder kuis (soal.json, gambar/, dst.) ikut pindah.
"""
import os, re, shutil, sys

ROOT = os.path.dirname(os.path.abspath(__file__))
SKIP = {"_template", "htmlTemplate", "gambar", "node_modules"}
KELAS_RE = re.compile(r"^(kelas|kls|class|grade|fase|tingkat)[\s_-]*(\d+|[ivx]+)$", re.I)


def level_kelas(name):
    """Nama folder tingkat-kelas yang sah, atau None."""
    if KELAS_RE.match(name):
        return name
    if name.upper().startswith("TKA"):
        return "TKA"
    return None


def main():
    run = "--jalankan" in sys.argv
    plan, warn = [], []
    for mapel in sorted(os.listdir(ROOT)):
        mp = os.path.join(ROOT, mapel)
        if not os.path.isdir(mp) or mapel in SKIP or mapel.startswith((".", "_")):
            continue
        if level_kelas(mapel):      # sudah berupa folder kelas (struktur baru)
            continue
        for sub in sorted(os.listdir(mp)):
            sp = os.path.join(mp, sub)
            if not os.path.isdir(sp) or sub in SKIP:
                continue
            kelas = level_kelas(sub)
            if kelas is None:
                warn.append(f"{mapel}/{sub}: bukan folder kelas, dilewati")
                continue
            for kuis in sorted(os.listdir(sp)):
                src = os.path.join(sp, kuis)
                if os.path.isdir(src):
                    plan.append((src, os.path.join(ROOT, kelas, mapel, kuis)))
                else:
                    warn.append(f"{mapel}/{sub}/{kuis}: file lepas, dilewati")

    for src, dst in plan:
        a, b = os.path.relpath(src, ROOT), os.path.relpath(dst, ROOT)
        if os.path.exists(dst):
            print(f"  [LEWATI, sudah ada]  {a}  ->  {b}")
            continue
        print(f"  {'[PINDAH]' if run else '[simulasi]'}  {a}  ->  {b}")
        if run:
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.move(src, dst)

    if run:   # bersihkan folder lama yang sudah kosong
        for mapel in os.listdir(ROOT):
            mp = os.path.join(ROOT, mapel)
            if os.path.isdir(mp) and not level_kelas(mapel) and mapel not in SKIP and not mapel.startswith((".", "_")):
                for sub in os.listdir(mp):
                    try: os.rmdir(os.path.join(mp, sub))
                    except OSError: pass
                try: os.rmdir(mp); print(f"  [hapus folder kosong] {mapel}")
                except OSError: pass

    for w in warn:
        print("  Perhatian:", w)
    if not plan:
        print("Tidak ada yang perlu dipindahkan.")
    elif not run:
        print("\nIni hanya simulasi. Jalankan dengan --jalankan untuk memindahkan.")
    else:
        print("\nSelesai. Jalankan: python3 buat-daftar.py")


if __name__ == "__main__":
    main()
