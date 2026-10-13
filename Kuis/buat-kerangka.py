#!/usr/bin/env python3
"""
Membuat kerangka folder kuis dari file teks kerangka.

  python3 buat-kerangka.py kerangka-matematika.txt

Hasil, per topik:   Kelas7/Matematika/01 Bilangan/soal.json   (draf kosong)
- Angka di depan nama folder ("01 ") hanya untuk mengatur urutan; tidak tampil di menu.
- Folder atau soal.json yang sudah ada TIDAK ditimpa.
- Draf kosong (questions: []) tidak tampil di menu sampai diisi soal.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def folder_name(text):
    t = text.replace("&", "dan")
    t = re.sub(r'[\\/:*?"<>|]+', " ", t)
    return re.sub(r"\s+", " ", t).strip()


def parse(path):
    mapel, kelas_list = None, []
    for raw in open(path, encoding="utf-8"):
        line = raw.rstrip("\n")
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        if line.lower().startswith("mapel:"):
            mapel = line.split(":", 1)[1].strip()
            continue
        if line[0] not in " \t":                       # kelas
            m = re.match(r"^\s*kelas\s*(\d+|[ivx]+)\s*(?:[—–-]+\s*(.*))?$", line.strip(), re.I)
            if not m:
                sys.exit(f"Baris kelas tidak dikenali: '{line}'. Contoh: Kelas 7 — Fondasi")
            kelas_list.append({"no": m.group(1), "sub": (m.group(2) or "").strip(), "topik": []})
        else:                                          # topik
            if not kelas_list:
                sys.exit(f"Topik '{line.strip()}' muncul sebelum ada kelas")
            kelas_list[-1]["topik"].append(line.strip())
    if not mapel:
        sys.exit("Tambahkan baris 'mapel: NamaMapel' di file kerangka")
    return mapel, kelas_list


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    mapel, kelas_list = parse(sys.argv[1])
    dibuat = dilewati = 0
    for k in kelas_list:
        for i, topik in enumerate(k["topik"], 1):
            folder = os.path.join(ROOT, f"Kelas{k['no']}", folder_name(mapel), f"{i:02d} {folder_name(topik)}")
            target = os.path.join(folder, "soal.json")
            rel = os.path.relpath(folder, ROOT)
            if os.path.exists(target):
                print(f"  [ada]    {rel}")
                dilewati += 1
                continue
            os.makedirs(folder, exist_ok=True)
            data = {
                "title": f"Latihan {mapel} Kelas {k['no']} - {topik}",
                "topic": topik,
                "subtitle": f"Kelas {k['no']}" + (f" — {k['sub']}" if k["sub"] else ""),
                "difficulty_summary": "30% Mudah | 50% Sedang | 20% Sulit. Kerjakan dengan jujur dan teliti.",
                "total_questions": 0,
                "questions": [],
            }
            with open(target, "w", encoding="utf-8") as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  [baru]   {rel}")
            dibuat += 1
    print(f"\n{dibuat} folder dibuat, {dilewati} sudah ada. Isi soal di soal.json masing-masing,")
    print("lalu jalankan: python3 buat-daftar.py")


if __name__ == "__main__":
    main()
