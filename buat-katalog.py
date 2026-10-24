#!/usr/bin/env python3
"""
Menyamakan bab materi dengan kuis, lalu menulis katalog.json untuk index.html.

Pakai:  python3 buat-katalog.py

1. Membaca Kuis/daftar.json (jalankan dulu  python3 Kuis/buat-daftar.py  jika ada kuis baru).
2. Setiap folder kuis (misalnya Kuis/Kelas11/Fisika/01 Vektor/) menjadi satu bab
   dengan folder yang sama di materi/ (materi/Kelas11/Fisika/01 Vektor/bab.json).
3. Bab yang belum punya bab.json dibuatkan isi contoh (status "draf").
4. Memeriksa bab.json: jenis blok, file gambar dan simulasi yang dirujuk.
5. Menulis katalog.json.
"""
import json, os, re, sys, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
KUIS = os.path.join(ROOT, "Kuis")
MATERI = os.path.join(ROOT, "materi")
BLOCKS = {"h", "heading", "text", "image", "callout", "video", "sim", "check", "example", "cheatsheet", "kuis"}
KINDS = {"artikel", "video", "simulasi", "latihan"}


def natural(text):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", text)]


def pretty(name):
    if " " in name:
        return name
    s = re.sub(r"[_\-]+", " ", name)
    s = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", s)
    return " ".join(w[:1].upper() + w[1:] for w in s.split())


def split_no(folder):
    """'01 Vektor' -> (1, 'Vektor'); 'DiagnosticTest' -> (None, 'Diagnostic Test')"""
    m = re.match(r"^(\d+)[\s._-]+(.+)$", folder)
    return (int(m.group(1)), m.group(2)) if m else (None, pretty(folder))


def dummy(title, kuis):
    """Isi contoh untuk bab yang belum ditulis."""
    topic = kuis[0].get("topic") or title
    return {
        "title": title,
        "summary": f"Ringkasan bab {title} akan ditulis di sini.",
        "status": "draf",
        "lessons": [
            {"id": "pengantar", "title": f"Pengantar {title}", "kind": "artikel", "duration": "5 menit", "blocks": [
                {"type": "text", "html": f"<p>Bagian ini akan berisi pengantar tentang <b>{topic}</b>: mengapa topik ini penting dan di mana kita menjumpainya dalam kehidupan sehari-hari.</p><p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus.</p>"},
                {"type": "callout", "variant": "info", "title": "Tujuan pembelajaran", "html": "<ul><li>Tujuan pertama</li><li>Tujuan kedua</li><li>Tujuan ketiga</li></ul>"},
            ]},
            {"id": "konsep-utama", "title": "Konsep utama", "kind": "artikel", "duration": "10 menit", "blocks": [
                {"type": "h", "text": "Subjudul konsep"},
                {"type": "text", "html": "<p>Penjelasan konsep, gambar, video, dan simulasi akan ditambahkan di sini.</p>"},
                {"type": "callout", "variant": "rumus", "html": "<p>Rumus penting bab ini akan ditulis di sini.</p>"},
            ]},
            {"id": "contoh-soal", "title": "Contoh soal dan pembahasan", "kind": "latihan", "duration": "10 menit", "blocks": [
                {"type": "text", "html": "<p>Contoh soal bertahap akan ditambahkan di sini. Sementara itu, kamu sudah bisa berlatih lewat kuis bab ini.</p>"},
            ]},
        ],
    }


def check(rel, bab, warn):
    folder = os.path.join(MATERI, rel)
    ids = set()
    for i, l in enumerate(bab.get("lessons") or [], 1):
        where = f"materi/{rel}/bab.json pelajaran {i}"
        if not l.get("id") or not l.get("title"):
            warn.append(f"{where}: perlu 'id' dan 'title'")
        if l.get("id") in ids:
            warn.append(f"{where}: id '{l.get('id')}' dipakai dua kali")
        ids.add(l.get("id"))
        if l.get("kind", "artikel") not in KINDS:
            warn.append(f"{where}: kind '{l.get('kind')}' tidak dikenal ({', '.join(sorted(KINDS))})")
        for j, b in enumerate(l.get("blocks") or [], 1):
            t = b.get("type")
            if t not in BLOCKS:
                warn.append(f"{where} blok {j}: type '{t}' tidak dikenal")
            if t in ("image", "sim"):
                src = b.get("src", "")
                if not src.startswith(("http:", "https:", "//")) and not os.path.isfile(os.path.join(folder, src)):
                    warn.append(f"{where} blok {j}: file '{src}' tidak ada")
            if t == "check" and b.get("answer") not in (b.get("options") or {}):
                warn.append(f"{where} blok {j}: answer '{b.get('answer')}' tidak ada di options")


def main():
    try:
        with open(os.path.join(KUIS, "daftar.json"), encoding="utf-8") as f:
            daftar = json.load(f)["kuis"]
    except Exception as e:
        sys.exit(f"Kuis/daftar.json tidak bisa dibaca ({e}). Jalankan dulu: python3 Kuis/buat-daftar.py")

    # kelompokkan kuis per folder: satu folder = satu bab
    chapters = {}
    for k in daftar:
        rel = os.path.dirname(k["path"])
        c = chapters.setdefault(rel, {"kelas": k["kelas"], "mapel": k["mapel"], "kuis": []})
        c["kuis"].append({"title": k["title"], "topic": k.get("topic", ""), "path": k["path"], "questions": k["questions"]})

    out, warn, created = [], [], []
    pos = {}
    for rel in sorted(chapters, key=lambda r: (natural(chapters[r]["kelas"]), natural(chapters[r]["mapel"]), natural(r))):
        c = chapters[rel]
        folder = os.path.basename(rel)
        no, title = split_no(folder)
        if no is None and c["kuis"][0]["topic"] and len(c["kuis"]) == 1:
            title = c["kuis"][0]["topic"]
        key = (c["kelas"], c["mapel"])
        pos[key] = pos.get(key, 0) + 1

        path = os.path.join(MATERI, rel, "bab.json")
        if not os.path.exists(path):
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w", encoding="utf-8") as f:
                json.dump(dummy(title, c["kuis"]), f, ensure_ascii=False, indent=2)
            created.append(rel)
        try:
            with open(path, encoding="utf-8") as f:
                bab = json.load(f)
        except Exception as e:
            warn.append(f"materi/{rel}/bab.json: JSON rusak ({e})")
            continue
        check(rel, bab, warn)

        lessons = bab.get("lessons") or []
        out.append({
            "id": rel.replace(os.sep, "/"),
            "kelas": c["kelas"],
            "mapel": c["mapel"],
            "no": bab.get("no") or no or pos[key],
            "title": bab.get("title") or title,
            "summary": bab.get("summary", ""),
            "status": bab.get("status", "draf"),
            "sims": sum(1 for l in lessons for b in l.get("blocks") or [] if b.get("type") == "sim"),
            "lessons": [{"id": l.get("id"), "title": l.get("title"), "kind": l.get("kind", "artikel"),
                         "duration": l.get("duration", "")} for l in lessons],
            "kuis": [{"title": k["title"], "path": k["path"], "questions": k["questions"]} for k in c["kuis"]],
        })

    # folder materi yang kuisnya sudah tidak ada
    known = set(chapters)
    for dirpath, dirnames, filenames in os.walk(MATERI):
        dirnames[:] = [d for d in dirnames if not d.startswith((".", "_"))]
        if "bab.json" in filenames:
            rel = os.path.relpath(dirpath, MATERI).replace(os.sep, "/")
            if rel not in known:
                warn.append(f"materi/{rel}: tidak ada kuis dengan folder yang sama di Kuis/, bab ini tidak ditampilkan")

    old = {}
    try:
        with open(os.path.join(ROOT, "katalog.json"), encoding="utf-8") as f:
            old = json.load(f)
    except Exception:
        pass
    data = {"unggulan": old.get("unggulan", "Kelas11/Fisika/01 Vektor"), "bab": out}
    if {k: old.get(k) for k in data} == data:
        print("katalog.json sudah terbaru, tidak ada perubahan.")
    else:
        data = {"generated": datetime.datetime.now().isoformat(timespec="seconds"), **data}
        with open(os.path.join(ROOT, "katalog.json"), "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"katalog.json diperbarui: {len(out)} bab")

    done = [b for b in out if b["status"] == "lengkap"]
    print(f"  {len(done)} bab lengkap, {len(out) - len(done)} draf")
    for b in done:
        print(f"  ✓ {b['kelas']} {b['mapel']} › {b['title']} ({len(b['lessons'])} pelajaran, {b['sims']} simulasi)")
    if created:
        print(f"\nBab baru dibuatkan isi contoh ({len(created)}):")
        for r in created:
            print("  +", r)
    if warn:
        print("\nPerhatian:")
        for w in warn:
            print("  -", w)


if __name__ == "__main__":
    sys.exit(main())
