#!/usr/bin/env python3
"""Perbaikan otomatis materi Nalarin Learn. Setiap perintah aman dijalankan ulang.

  python3 scripts/rapikan_materi.py meta        kind dan durasi pelajaran dihitung dari isinya
  python3 scripts/rapikan_materi.py kunci       urutan opsi cek diacak ulang sampai kunci merata per bab
  python3 scripts/rapikan_materi.py templat     kalimat dan judul templat dihapus
  python3 scripts/rapikan_materi.py judul-card  judul "Catatan buku" dan "Kesalahan yang sering terjadi" diseragamkan
  python3 scripts/rapikan_materi.py sapaan      sapaan "Anda" diganti "kamu"
  python3 scripts/rapikan_materi.py duplikat    card, contoh, atau cek yang sama disimpan sekali saja

Tambahkan --coba untuk melihat jumlah perubahan tanpa menulis berkas. Setelah mengubah isi
pelajaran, jalankan `meta`, lalu `python3 buat-katalog.py`.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter

from cek_kualitas import MATERI, batas_kunci, hitung_meta, kunci_duplikat, polos

ACUAN_OPSI = re.compile(r"^\s*(semua|seluruh)\b.*\b(benar|salah)\b|\btidak ada (jawaban )?yang benar\b|"
                        r"\b(opsi|pilihan|jawaban)\s+[A-E]\b|^\s*[A-E]\s*(,|dan)\s*[A-E]\b", re.I)
HURUF_JAWABAN = re.compile(r"(\b[Jj]awaban yang (?:tepat|benar) adalah\s+|\b[Jj]awaban\s+)([A-E])\b")
HURUF_OPSI = re.compile(r"(\b(?:[Oo]psi|[Pp]ilihan)\s+)([A-E](?:\s*(?:,|dan|serta|atau)\s*[A-E])*)\b")


def petakan_huruf(teks: str, peta: dict[str, str]) -> str:
    """Sesuaikan rujukan huruf opsi di pembahasan ("Jawaban yang tepat adalah B", "opsi C serta D")."""
    teks = HURUF_JAWABAN.sub(lambda m: m.group(1) + peta.get(m.group(2), m.group(2)), teks)
    return HURUF_OPSI.sub(lambda m: m.group(1) + re.sub(r"[A-E]", lambda x: peta.get(x.group(0), x.group(0)), m.group(2)), teks)


def tulis(path, data, raw: str) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")


def semua_bab():
    for f in sorted(MATERI.glob("**/bab.json")):
        raw = f.read_text(encoding="utf-8")
        yield str(f.parent.relative_to(MATERI)), f, raw, json.loads(raw)


# ---------- meta ----------
def rapikan_meta(data: dict) -> int:
    ubah = 0
    for i, p in enumerate(data.get("lessons", [])):
        jenis, menit = hitung_meta(p)
        durasi = f"{menit} menit"
        if p.get("kind") == jenis and p.get("duration") == durasi:
            continue
        baru = {}
        for k in ("id", "title"):
            if k in p:
                baru[k] = p[k]
        baru["kind"], baru["duration"] = jenis, durasi
        baru.update({k: v for k, v in p.items() if k not in baru})
        data["lessons"][i] = baru
        ubah += 1
    return ubah


# ---------- kunci ----------
def rapikan_kunci(bab: str, data: dict) -> int:
    cek = [b for p in data.get("lessons", []) for b in p.get("blocks", [])
           if b.get("type") == "check" and isinstance(b.get("options"), dict) and b.get("answer") in b["options"]]
    if not cek:
        return 0
    tetap = [b for b in cek if any(ACUAN_OPSI.search(polos(v)) for v in b["options"].values())]
    tetap_id = {id(b) for b in tetap}
    jatah = -(-len(cek) // 4)  # ceil(n/4): kunci yang sudah ada dipertahankan selama di bawah jatah ini
    hitung = Counter(b["answer"] for b in tetap)
    ubah = 0
    for b in cek:
        if id(b) in tetap_id:
            continue
        huruf = sorted(b["options"])
        sekarang = b["answer"]
        if hitung[sekarang] < jatah:
            target = sekarang
        else:
            urut = sorted(huruf, key=lambda h: hashlib.sha1(f"{bab}|{polos(b.get('question'))}|{h}".encode()).hexdigest())
            target = min(urut, key=lambda h: hitung[h])
        hitung[target] += 1
        if target == sekarang:
            continue
        lama_pengecoh = [h for h in huruf if h != sekarang]
        baru_pengecoh = [h for h in huruf if h != target]
        peta = dict(zip(lama_pengecoh, baru_pengecoh), **{sekarang: target})
        b["options"] = {h: b["options"][lama] for lama, h in sorted(peta.items(), key=lambda x: x[1])}
        b["answer"] = target
        for k in ("explanation", "hint"):
            if isinstance(b.get(k), str):
                b[k] = petakan_huruf(b[k], peta)
        ubah += 1
    akhir = Counter(b["answer"] for b in cek)
    if max(akhir.values()) > batas_kunci(len(cek)):
        print(f"PERINGATAN {bab}: kunci masih menumpuk {dict(akhir)}")
    return ubah


# ---------- templat ----------
PENUTUP = re.compile(r"Setelah menuntaskan seluruh subbab pada bab ini, (?:uji kemahiran dan pemahaman mendalam Anda melalui "
                     r"kuis evaluasi \d+ soal terpadu|ujilah penguasaan komprehensif Anda melalui kuis \d+ soal terpadu) di bawah ini\.")
PEMBUKA_CONTOH = re.compile(r"^\s*<p>Dalam evaluasi pemahaman materi .*?berikut ini:</p>\s*", re.S)
JUDUL_EVALUASI = re.compile(r"^Contoh Soal Evaluasi: \d{2} .*$")


def rapikan_templat(data: dict) -> int:
    ubah = 0
    for p in data.get("lessons", []):
        for b in p.get("blocks", []):
            h = b.get("html")
            if isinstance(h, str) and PENUTUP.search(h):
                h = PENUTUP.sub("Setelah menyelesaikan semua pelajaran di bab ini, uji pemahamanmu dengan kuis bab di bawah ini.", h)
                b["html"] = h.replace("Kerjakan tanpa kalkulator untuk melatih ketangkasan hitungan manual standar ujian.",
                                      "Kerjakan tanpa kalkulator untuk melatih hitungan manual seperti di ujian.")
                ubah += 1
            q = b.get("question")
            if b.get("type") == "example" and isinstance(q, str) and PEMBUKA_CONTOH.match(q):
                sisa = PEMBUKA_CONTOH.sub("", q, count=1)
                if polos(sisa):
                    b["question"] = sisa
                    ubah += 1
            if JUDUL_EVALUASI.match(b.get("title") or ""):
                b["title"] = "Contoh Soal Evaluasi"
                ubah += 1
    return ubah


# ---------- judul card ----------
def rapikan_judul_card(data: dict) -> int:
    ubah = 0
    for p in data.get("lessons", []):
        for b in p.get("blocks", []):
            judul = b.get("title")
            if b.get("type") != "callout" or not isinstance(judul, str):
                continue
            baru = re.sub(r"^(catatan buku|koreksi buku)", "Catatan buku", judul, flags=re.I)
            baru = re.sub(r"^kesalahan yang sering terjadi", "Kesalahan yang sering terjadi", baru, flags=re.I)
            if baru != judul:
                b["title"] = baru
                ubah += 1
    return ubah


# ---------- sapaan ----------
# Kata sebelum "Anda" yang membuat "Anda" menjadi subjek klausa berikutnya: ditulis "kamu", bukan "-mu".
SUBJEK = set("""jika bila apabila kalau ketika saat sewaktu sebelum setelah sesudah selama hingga sampai sejak
agar supaya sehingga bahwa karena sebab maka dan atau tetapi namun lalu kemudian sedangkan padahal kini sekarang
pernahkah sudahkah tahukah maukah bisakah dapatkah mampukah apakah mengapa kenapa bagaimana kapan mana apa siapa
bayangkan andaikan seandainya misalkan coba mari pastikan yang dapat bisa akan harus perlu boleh mampu sudah
sedang telah masih pun juga hanya seperti sebagaimana selagi asalkan walaupun meskipun biarpun
kali artinya tersebut selesai jauh batal memastikan real-time""".split())
ASING = {"smartphone", "laptop"}  # kata asing: akhiran ditulis dengan tanda hubung
ANDA = re.compile(r"\bAnda\b")


def ganti_sapaan(s: str) -> tuple[str, int]:
    s, n = re.subn(r"\s+Anda(?=\s+melalui kuis)", "", s)  # "Uji ... Anda melalui kuis": cukup dihapus
    keluar, pos = [], 0
    for m in ANDA.finditer(s):
        if s.rfind("<", 0, m.start()) > s.rfind(">", 0, m.start()):
            continue  # di dalam tag atau atribut
        kiri = s[pos:m.start()]
        polos_kiri = re.sub(r"<[a-zA-Z/!][^>]*>", "", s[:m.start()]).rstrip()
        kata = re.search(r"([A-Za-zÀ-ÿ]+(?:-[A-Za-zÀ-ÿ]+)*)\s+$", kiri)
        if not polos_kiri or polos_kiri[-1] in ".!?\"'“‘":
            keluar.append(kiri + "Kamu")
        elif kata and kata.group(1).lower() not in SUBJEK:
            w = kata.group(1)
            sambung = "-mu" if (w.isupper() and len(w) > 1) or w.lower() in ASING else "mu"
            keluar.append(kiri[:kata.end(1)] + sambung)
        else:
            keluar.append(kiri + "kamu")
        pos = m.end()
        n += 1
    keluar.append(s[pos:])
    return "".join(keluar), n


def rapikan_sapaan(data: dict) -> int:
    ubah = 0
    for p in data.get("lessons", []):
        for b in p.get("blocks", []):
            t = b.get("type")
            medan = ["html", "title"] if t in ("text", "callout", "cheatsheet") else ["caption"] if t in ("sim", "image") else []
            for k in medan:
                if isinstance(b.get(k), str) and ANDA.search(b[k]):
                    b[k], n = ganti_sapaan(b[k])
                    ubah += n
    return ubah


# ---------- duplikat ----------
def _kata_kunci(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-zà-ÿ]{4,}", polos(s).lower())}


def rapikan_duplikat(semua: list) -> int:
    """Simpan satu salinan per kelompok. Urutan prioritas: pelajaran yang tidak punya latihan lain,
    pelajaran biasa (bukan Rangkuman), lalu pelajaran yang isinya paling mirip."""
    kelompok = {}
    for bab, _, _, data in semua:
        for p in data.get("lessons", []):
            konteks = _kata_kunci(p.get("title", "") + " " + " ".join(
                b.get("html") or "" for b in p.get("blocks", []) if b.get("type") in ("text", "callout")))
            rangkuman = p.get("id", "").startswith(("ringkasan", "rangkuman")) or p.get("title", "").startswith("Rangkuman")
            latihan = sum(b.get("type") in ("example", "check") for b in p.get("blocks", []))
            for b in p.get("blocks", []):
                k = kunci_duplikat(b)
                if k:
                    isi = _kata_kunci(json.dumps({x: y for x, y in b.items() if x not in ("type", "title")}, ensure_ascii=False))
                    satu_satunya = b.get("type") in ("example", "check") and latihan == 1
                    skor = (satu_satunya, not rangkuman, len(konteks & isi) / (len(isi) ** 0.5 + 1))
                    kelompok.setdefault(k, []).append((skor, id(b)))
    buang = set()
    for anggota in kelompok.values():
        if len(anggota) > 1:
            simpan = max(anggota, key=lambda x: x[0])[1]  # max() memilih yang pertama bila seri
            buang.update(i for _, i in anggota if i != simpan)
    ubah = 0
    for _, _, _, data in semua:
        for p in data.get("lessons", []):
            sebelum = len(p.get("blocks", []))
            p["blocks"] = [b for b in p.get("blocks", []) if id(b) not in buang]
            ubah += sebelum - len(p["blocks"])
    return ubah


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("perintah", choices=("meta", "kunci", "templat", "judul-card", "sapaan", "duplikat"))
    ap.add_argument("--coba", action="store_true", help="hitung perubahan tanpa menulis berkas")
    args = ap.parse_args()
    total = berkas = 0
    if args.perintah == "duplikat":
        semua = list(semua_bab())
        before = {path: json.dumps(data, sort_keys=True) for _, path, _, data in semua}
        total = rapikan_duplikat(semua)
        for _, path, raw, data in semua:
            if json.dumps(data, sort_keys=True) != before[path]:
                berkas += 1
                if not args.coba:
                    tulis(path, data, raw)
        print(f"duplikat: {total} salinan dibuang di {berkas} bab{' (coba, tidak ditulis)' if args.coba else ''}.")
        return 0
    for bab, path, raw, data in semua_bab():
        if args.perintah == "meta":
            n = rapikan_meta(data)
        elif args.perintah == "kunci":
            n = rapikan_kunci(bab, data)
        elif args.perintah == "templat":
            n = rapikan_templat(data)
        elif args.perintah == "judul-card":
            n = rapikan_judul_card(data)
        else:
            n = rapikan_sapaan(data)
        if n:
            total += n
            berkas += 1
            if not args.coba:
                tulis(path, data, raw)
    print(f"{args.perintah}: {total} perubahan di {berkas} bab{' (coba, tidak ditulis)' if args.coba else ''}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
