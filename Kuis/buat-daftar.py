#!/usr/bin/env python3
"""
Memindai semua file soal (.json) di bawah folder ini dan menulis daftar.json
untuk menu di index.html.

Pakai:  python3 buat-daftar.py

Pola folder:   Kelas / Mapel / Kuis / soal.json
  contoh:      Kelas9/Fisika/DiagnosticTest/soal.json
Setiap file .json yang punya kunci "questions" dianggap sebuah kuis.
"""
import json, os, re, sys, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))

# Folder yang dilewati (nama folder, di kedalaman mana pun).
# Folder berawalan "." atau "_" selalu dilewati.
EXCLUDE = {"htmlTemplate", "gambar", "node_modules"}

# Nama tampilan khusus. Tanpa ini, nama folder dirapikan otomatis
# (Kelas9 -> Kelas 9, DiagnosticTest -> Diagnostic Test).
LABELS = {
}


def pretty(name):
    if name in LABELS:
        return LABELS[name]
    if " " in name:                       # nama yang ditulis dengan spasi dipakai apa adanya
        return name
    s = re.sub(r"[_\-]+", " ", name)
    s = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", s)
    s = re.sub(r"(?<=[A-Za-z])(?=\d)", " ", s)
    s = re.sub(r"(?<=\d)(?=[A-Za-z])", " ", s)
    return " ".join(w[:1].upper() + w[1:] for w in s.split())


def natural(text):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", text)]


def validate(d):
    problems = []
    qs = d["questions"]
    if d.get("total_questions") and d["total_questions"] != len(qs):
        problems.append(f"total_questions={d['total_questions']} tetapi ada {len(qs)} soal")
    for i, q in enumerate(qs, 1):
        no = q.get("number", i)
        opts = q.get("options")
        if not q.get("question"):
            problems.append(f"soal {no}: teks soal kosong")
        if not isinstance(opts, dict) or len(opts) < 2:
            problems.append(f"soal {no}: pilihan jawaban kurang dari 2")
        elif q.get("answer") not in opts:
            problems.append(f"soal {no}: answer '{q.get('answer')}' tidak ada di options")
    return problems


def main():
    entries, warnings = [], []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = sorted(d for d in dirnames
                             if d not in EXCLUDE and not d.startswith((".", "_")))
        rel = os.path.relpath(dirpath, ROOT)
        parts = [] if rel == "." else rel.replace(os.sep, "/").split("/")
        for fn in sorted(filenames):
            if not fn.lower().endswith(".json") or fn == "daftar.json":
                continue
            where = "/".join(parts + [fn])
            try:
                with open(os.path.join(dirpath, fn), encoding="utf-8") as f:
                    d = json.load(f)
            except Exception as e:
                if fn.lower().startswith("soal"):
                    warnings.append(f"{where}: JSON rusak ({e})")
                continue
            if not (isinstance(d, dict) and isinstance(d.get("questions"), list)):
                continue

            # Kelas / Mapel / Topik...
            kelas_f = parts[0] if len(parts) >= 1 else "Umum"
            mapel_f = parts[1] if len(parts) >= 2 else "Umum"
            topik = [pretty(t) for t in parts[2:]]
            stem = os.path.splitext(fn)[0]
            if len(parts) < 3:
                warnings.append(f"{where}: lokasi kurang dalam, pola yang diharapkan Kelas/Mapel/Kuis/{fn}")

            kelas = d.get("kelas") or pretty(kelas_f)
            mapel = d.get("mapel") or pretty(mapel_f)
            if d.get("topik"):
                topik = [d["topik"]]
            entries.append({
                "title": d.get("title") or d.get("topic") or (topik[-1] if topik else mapel),
                "topic": d.get("topic") or "",
                "summary": d.get("difficulty_summary") or d.get("subtitle") or "",
                "questions": d.get("total_questions") or len(d["questions"]),
                "kelas": kelas,
                "mapel": mapel,
                "topik": topik,
                "path": where,
            })
            for p in validate(d):
                warnings.append(f"{where}: {p}")

    entries.sort(key=lambda e: (natural(e["kelas"]), natural(e["mapel"]),
                                natural(" ".join(e["topik"])), natural(e["path"])))

    target = os.path.join(ROOT, "daftar.json")
    old = None
    try:
        with open(target, encoding="utf-8") as f:
            old = json.load(f)
    except Exception:
        pass
    if old and old.get("kuis") == entries:
        print("daftar.json sudah terbaru, tidak ada perubahan.")
    else:
        out = {"generated": datetime.datetime.now().isoformat(timespec="seconds"), "kuis": entries}
        with open(target, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f"daftar.json diperbarui: {len(entries)} kuis")

    print()
    for e in entries:
        print(f"  {e['kelas']:<9} {e['mapel']:<12} {' › '.join(e['topik']) or '-':<28} {e['questions']:>3} soal")
    if warnings:
        print("\nPerhatian:")
        for w in warnings:
            print("  -", w)


if __name__ == "__main__":
    sys.exit(main())
