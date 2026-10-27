#!/usr/bin/env python3
"""Pemeriksa kualitas isi materi Nalarin Learn, pelengkap validate_content.py.

Dua jenis pemeriksaan:
- "nol": harus selalu kosong. Card tanpa html, card/contoh/cek yang sama di dua tempat,
  rumus yang gagal di KaTeX, karakter kontrol, pembatas rumus bersarang atau tanpa pasangan.
- "rem": jumlahnya tidak boleh naik dari scripts/baseline-kualitas.json. Dipakai untuk
  masalah lama yang sedang dicicil (pelajaran tipis, kunci cek menumpuk, dan seterusnya).

Pakai:
  python3 scripts/cek_kualitas.py                      periksa semua bab
  python3 scripts/cek_kualitas.py --rinci tipis        tampilkan semua lokasi satu pemeriksaan
  python3 scripts/cek_kualitas.py --perbarui-baseline  simpan jumlah sekarang sebagai baseline
  python3 scripts/cek_kualitas.py --daftar hiperbola   kalimat untuk ditinjau (hiperbola, seru)

Rumus diperiksa dengan node dan KaTeX 0.16.9 (versi yang dimuat situs). Berkas KaTeX diambil
sekali dari cdnjs ke ~/.cache/nalarin, atau dibaca dari variabel lingkungan KATEX_JS.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import math
import os
import re
import shutil
import subprocess
import sys
import urllib.request
from collections import Counter, defaultdict
from datetime import date
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MATERI = ROOT / "materi"
CATALOG = ROOT / "katalog.json"
BASELINE = ROOT / "scripts" / "baseline-kualitas.json"
KATEX_VERSION = "0.16.9"
KATEX_URL = f"https://cdnjs.cloudflare.com/ajax/libs/KaTeX/{KATEX_VERSION}/katex.min.js"
KATEX_SHA256 = "dc84b296ec3e884de093158f760fd9d45b6c7abe58b5381557f4e138f46a58ae"

TIPIS = 60  # kata materi minimum sebelum pelajaran dianggap tipis
FRAME = ("konteks", "sejarah", "definisi", "rumus")

CEK = {
    "card_tanpa_html": ("nol", "callout tanpa field html (body/content tidak dibaca renderer)"),
    "duplikat": ("nol", "card, contoh, atau cek yang sama di lebih dari satu tempat"),
    "katex": ("nol", "rumus gagal diproses KaTeX"),
    "karakter_kontrol": ("nol", "karakter kontrol di teks (biasanya \\t, \\f, \\a dari LaTeX yang tidak di-escape)"),
    "pembatas_bersarang": ("nol", "\\( atau \\[ di dalam rumus lain, atau tanpa penutup"),
    "pembatas_tanpa_pasangan": ("nol", "pembuka rumus ($, \\(, \\[) tanpa penutup di satu potong teks"),
    "rumus_berisi_kata": ("nol", "rumus berisi kata biasa di luar \\text (tanda pembatas salah pasang)"),
    "kunci_menumpuk": ("rem", "bab yang kunci cek-nya menumpuk di satu huruf"),
    "jenis_tidak_sesuai": ("rem", "kind pelajaran tidak sesuai isinya"),
    "durasi_tidak_sesuai": ("rem", "durasi pelajaran jauh dari perkiraan isinya"),
    "teks_templat": ("rem", "kalimat atau judul templat"),
    "klaim_jumlah_soal": ("rem", "kalimat menyebut jumlah soal kuis yang berbeda dari katalog"),
    "judul_card_tidak_baku": ("rem", 'judul card tidak baku (pakai "Catatan buku", "Kesalahan yang sering terjadi")'),
    "sapaan_anda": ("rem", 'sapaan "Anda" (pakai "kamu")'),
    "tipis": ("rem", f"pelajaran dengan kurang dari {TIPIS} kata materi"),
    "tanpa_latihan": ("rem", "pelajaran tanpa contoh, cek, atau tautan kuis"),
    "contoh_generik": ("rem", "contoh soal dengan langkah templat"),
    "latihan_templat": ("rem", "contoh atau cek templat (\"... dalam materi '...'?\")"),
    "bagan_latex": ("rem", "bagan alir yang ditulis dengan \\begin{cases} (terpotong di layar)"),
    "tumpukan_card": ("rem", "pelajaran yang memuat tiga atau empat card kerangka"),
    "sejarah_tanpa_sumber": ("rem", "card Sejarah tanpa tautan sumber"),
    "cheatsheet_kembar": ("rem", "cheat sheet yang sama di lebih dari satu bab"),
}

TAG = re.compile(r"<[a-zA-Z/!][^>]*>")
TEMPLAT = re.compile(
    r"Dalam evaluasi pemahaman materi|Pada tinjauan menyeluruh materi|Setelah menuntaskan seluruh subbab|"
    r"Analisis langkah sistematis penyelesaian permasalahan", re.I)
JUDUL_TEMPLAT = re.compile(r"^(Contoh Soal Evaluasi|Uji Kemahiran|Cek Pemahaman|Contoh Soal|Konsep Esensial): \d{2} ")
KLAIM_SOAL = re.compile(r"\bkuis\b[^.]{0,60}?\b(\d+)\s*(?:butir\s*)?soal", re.I)
LANGKAH_TEMPLAT = re.compile(
    r"^(Langkah \d \((Identifikasi Informasi|Pilih Prinsip|Substitusi dan Komputasi|Evaluasi Fisis)"
    r"|Identifikasi Unsur dan Konteks Wacana|Analisis Hubungan Logis antarelemen|Sintesis Simpulan dan Verifikasi"
    r"|Identifikasi Variabel dan Parameter yang Diketahui|Substitusi ke Persamaan / Model|Interpretasi Makna dan Validasi"
    r"|Identifikasi besaran, data yang diketahui|Terapkan konsep atau formula)")
LATIHAN_TEMPLAT = re.compile(r"(dalam|pada) materi '[^']+'|dikemukakan oleh [^.?]+ (dalam|diterapkan)", re.I)
KATA_DI_RUMUS = re.compile(r"(?<![\\A-Za-z])(atau|dan|dengan|yang|adalah|untuk|pada|dari|sehingga|maka|jika|karena|"
                          r"bila|tidak|akan|ini|itu|oleh|setiap|sebesar|menjadi)(?![A-Za-z])")
TEKS_RUMUS = re.compile(r"\\(text|mathrm|textbf|mathbf|operatorname|textit)\{[^{}]*\}")
PEMBUKA_MATERI = ("setelah menuntaskan seluruh subbab", "materi bab ini disusun berdasarkan buku siswa")
HIPERBOLA = re.compile(r"\b(luar biasa|mutlak|revolusioner|tak terbantahkan|mematikan|laksana|menakjubkan|"
                       r"sangat dahsyat|legendaris|abadi|jenius|ajaib|keajaiban)\b", re.I)
KONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]|\t(?=[A-Za-z])|\r")
PEMBATAS = re.compile(r"(?<!\\)\\[()\[\]]")
KIRI = re.compile(r"\\\[|\$\$|\\\(|\$")
KANAN = {"\\[": "\\]", "$$": "$$", "\\(": "\\)", "$": "$"}
LEWATI = {"type", "variant", "src", "youtube", "id"}


def teks(nilai) -> str:
    """Semua string di dalam nilai (dict, list, atau str), digabung dengan spasi."""
    if isinstance(nilai, str):
        return nilai
    if isinstance(nilai, dict):
        return " ".join(teks(v) for v in nilai.values())
    if isinstance(nilai, list):
        return " ".join(teks(v) for v in nilai)
    return ""


def polos(nilai) -> str:
    return re.sub(r"\s+", " ", html.unescape(TAG.sub(" ", teks(nilai)))).strip()


def kata(nilai) -> int:
    return len(polos(nilai).split())


def string_blok(blok: dict, jalur: str = ""):
    """(jalur field, string) untuk setiap string di blok yang ikut dirender."""
    for k, v in blok.items():
        if k in LEWATI and not jalur:
            continue
        sub = f"{jalur}.{k}" if jalur else k
        if isinstance(v, str):
            yield sub, v
        elif isinstance(v, dict):
            yield from string_blok(v, sub)
        elif isinstance(v, list):
            for i, x in enumerate(v):
                if isinstance(x, str):
                    yield f"{sub}[{i}]", x
                elif isinstance(x, dict):
                    yield from string_blok(x, f"{sub}[{i}]")


class _PotongTeks(HTMLParser):
    """Memecah HTML menjadi potongan teks seperti yang dilihat KaTeX auto-render."""
    ABAI = {"script", "noscript", "style", "textarea", "pre", "code", "option"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.potongan: list[str] = []
        self._buf: list[str] = []
        self._abai = 0

    def _simpan(self) -> None:
        if self._buf:
            self.potongan.append("".join(self._buf))
            self._buf = []

    def handle_starttag(self, tag, attrs):
        self._simpan()
        if tag in self.ABAI:
            self._abai += 1

    def handle_endtag(self, tag):
        self._simpan()
        if tag in self.ABAI and self._abai:
            self._abai -= 1

    def handle_startendtag(self, tag, attrs):
        self._simpan()

    def handle_data(self, data):
        if not self._abai:
            self._buf.append(data)

    def close(self):
        super().close()
        self._simpan()


def potongan_teks(s: str) -> list[str]:
    p = _PotongTeks()
    p.feed(s)
    p.close()
    return p.potongan


def _akhir_rumus(kanan: str, s: str, mulai: int) -> int:
    i, kurung = mulai, 0
    while i < len(s):
        if kurung <= 0 and s.startswith(kanan, i):
            return i
        if s[i] == "\\":
            i += 1
        elif s[i] == "{":
            kurung += 1
        elif s[i] == "}":
            kurung -= 1
        i += 1
    return -1


def rumus_di(potong: str):
    """Rumus dalam satu potongan teks, mengikuti splitAtDelimiters KaTeX: (tex, display) dan pembuka tanpa penutup."""
    hasil, yatim = [], None
    while True:
        m = KIRI.search(potong)
        if not m:
            break
        kiri = m.group(0)
        potong = potong[m.start():]
        akhir = _akhir_rumus(KANAN[kiri], potong, len(kiri))
        if akhir < 0:
            yatim = kiri
            break
        hasil.append((potong[len(kiri):akhir], kiri in ("\\[", "$$")))
        potong = potong[akhir + len(KANAN[kiri]):]
    return hasil, yatim


def pembatas_salah(s: str) -> bool:
    tumpuk = 0
    for m in PEMBATAS.finditer(s):
        if m.group(0) in ("\\(", "\\["):
            if tumpuk:
                return True
            tumpuk += 1
        elif tumpuk:
            tumpuk -= 1
        else:
            return True
    return tumpuk != 0


def batas_kunci(n: int) -> int:
    """Banyak cek maksimum per huruf di satu bab: sekitar 35%, tetapi selalu bisa dipenuhi."""
    return max(math.ceil(n / 4), int(0.35 * n + 0.5))


def kata_materi(pelajaran: dict) -> int:
    total = 0
    for b in pelajaran.get("blocks", []):
        if b.get("type") not in ("text", "callout") or b.get("title") == "Konsep Esensial":
            continue
        isi = polos(b.get("html"))
        if any(p in isi.lower() for p in PEMBUKA_MATERI):
            continue
        total += len(isi.split())
    return total


def hitung_meta(pelajaran: dict) -> tuple[str, int]:
    """Jenis (kind) dan durasi dalam menit, dihitung dari isi pelajaran."""
    bl = pelajaran.get("blocks", [])
    sims = sum(b.get("type") == "sim" for b in bl)
    videos = sum(b.get("type") == "video" for b in bl)
    gambar = sum(b.get("type") == "image" for b in bl)
    contoh = [b for b in bl if b.get("type") == "example"]
    cek = [b for b in bl if b.get("type") == "check"]
    materi = sum(kata(b.get("html")) for b in bl if b.get("type") in ("text", "callout", "cheatsheet"))
    latihan = sum(kata({k: v for k, v in b.items() if k not in ("type", "title")}) for b in contoh + cek)
    kuis = any(b.get("type") == "kuis" for b in bl)
    if sims:
        jenis = "simulasi"
    elif videos:
        jenis = "video"
    elif kuis or ((contoh or cek) and materi < TIPIS) or (len(contoh) + len(cek) >= 3 and latihan > materi):
        jenis = "latihan"
    else:
        jenis = "artikel"
    menit = (materi + latihan) / 120 + 2 * sims + len(contoh) + 0.5 * len(cek) + 0.5 * gambar
    return jenis, min(20, max(2, int(menit + 0.5)))


def durasi_menit(durasi) -> int | None:
    m = re.search(r"(\d+)\s*menit", str(durasi or ""))
    return int(m.group(1)) if m else None


def kunci_duplikat(b: dict):
    t = b.get("type")
    if t == "callout":
        isi = polos(b.get("html") or b.get("body") or b.get("content")).lower()
        return ("callout", b.get("variant"), isi) if isi else None
    if t == "example":
        return ("example", polos(b.get("question")).lower(), polos(b.get("steps")).lower())
    if t == "check":
        return ("check", polos(b.get("question")).lower(), polos(json.dumps(b.get("options"), ensure_ascii=False, sort_keys=True)).lower())
    return None


def muat_bab():
    for f in sorted(MATERI.glob("**/bab.json")):
        yield str(f.parent.relative_to(MATERI)), f, json.loads(f.read_text(encoding="utf-8"))


def jumlah_soal_katalog() -> dict[str, set[int]]:
    try:
        katalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {}
    return {b["id"]: {k.get("questions") for k in b.get("kuis", []) if isinstance(k, dict)} for b in katalog.get("bab", [])}


def katex_js(wajib: bool, catatan: list[str]) -> str | None:
    """Path katex.min.js: dari KATEX_JS, cache, atau diunduh sekali dari cdnjs (sha256 dicek)."""
    if os.environ.get("KATEX_JS"):
        return os.environ["KATEX_JS"]
    cache = Path.home() / ".cache" / "nalarin" / f"katex-{KATEX_VERSION}.min.js"
    if cache.is_file() and hashlib.sha256(cache.read_bytes()).hexdigest() == KATEX_SHA256:
        return str(cache)
    try:
        with urllib.request.urlopen(KATEX_URL, timeout=30) as r:
            data = r.read()
    except OSError as exc:
        catatan.append(f"KaTeX tidak dapat diunduh ({exc}); rumus tidak diperiksa.")
        return None
    if hashlib.sha256(data).hexdigest() != KATEX_SHA256:
        catatan.append("KaTeX yang diunduh tidak cocok dengan sha256 yang dikunci; rumus tidak diperiksa.")
        return None
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_bytes(data)
    return str(cache)


def periksa_katex(rumus: list[tuple[str, str, bool]], wajib: bool, catatan: list[str]) -> list[tuple[str, str]]:
    """rumus: (lokasi, tex, display). Kembali: (lokasi, pesan) untuk rumus yang gagal."""
    node = shutil.which("node")
    if not node:
        catatan.append("node tidak ditemukan; rumus tidak diperiksa.")
        return []
    js = katex_js(wajib, catatan)
    if not js:
        return []
    proses = subprocess.run([node, str(ROOT / "scripts" / "cek_katex.js"), js],
                            input=json.dumps([[t, d] for _, t, d in rumus]), capture_output=True, text=True)
    if proses.returncode:
        catatan.append(f"cek_katex.js gagal: {proses.stderr.strip()[:200]}")
        return []
    return [(lok, f"{pesan} :: {tex[:80]}") for (lok, tex, _), pesan in zip(rumus, json.loads(proses.stdout)) if pesan]


def kumpulkan(wajib_katex: bool = False):
    """Jalankan semua pemeriksaan. Kembali: {kode: [lokasi/pesan, ...]}, catatan, daftar kalimat tinjauan."""
    temuan: dict[str, list[str]] = defaultdict(list)
    catatan: list[str] = []
    tinjau = {"hiperbola": [], "seru": []}
    soal = jumlah_soal_katalog()
    tempat = defaultdict(list)
    cheatsheet = defaultdict(set)
    semua_rumus: list[tuple[str, str, bool]] = []

    for bab, _, data in muat_bab():
        kunci = Counter()
        for p in data.get("lessons", []):
            pid = p.get("id", "?")
            bl = p.get("blocks", [])
            lok_p = f"{bab} › {pid}"
            if kata_materi(p) < TIPIS:
                temuan["tipis"].append(lok_p)
            if not any(b.get("type") in ("example", "check", "kuis") for b in bl):
                temuan["tanpa_latihan"].append(lok_p)
            if len({b.get("variant") for b in bl if b.get("type") == "callout"} & set(FRAME)) >= 3:
                temuan["tumpukan_card"].append(lok_p)
            jenis, menit = hitung_meta(p)
            if p.get("kind") != jenis:
                temuan["jenis_tidak_sesuai"].append(f"{lok_p}: {p.get('kind')} → {jenis}")
            tertulis = durasi_menit(p.get("duration"))
            if tertulis is None or abs(tertulis - menit) > max(2, 0.3 * menit):
                temuan["durasi_tidak_sesuai"].append(f"{lok_p}: {p.get('duration')} → {menit} menit")
            for s in (p.get("title") or "",):
                if KONTROL.search(s):
                    temuan["karakter_kontrol"].append(f"{lok_p} judul")

            for i, b in enumerate(bl, start=1):
                lok = f"{lok_p} › blok {i}"
                t = b.get("type")
                if t == "callout":
                    if not isinstance(b.get("html"), str) or "body" in b or "content" in b:
                        temuan["card_tanpa_html"].append(lok)
                    judul = (b.get("title") or "").strip()
                    rendah = judul.lower()
                    if (rendah.startswith("catatan buku") and not judul.startswith("Catatan buku")) or rendah.startswith("koreksi buku") or (
                            rendah.startswith("kesalahan yang sering terjadi") and not judul.startswith("Kesalahan yang sering terjadi")):
                        temuan["judul_card_tidak_baku"].append(f"{lok}: {judul}")
                    if "\\begin{cases}" in (b.get("html") or "") and "\\text" in (b.get("html") or ""):
                        temuan["bagan_latex"].append(f"{lok}: {judul[:60]}")
                    if b.get("variant") == "sejarah" and "<a " not in (b.get("html") or ""):
                        temuan["sejarah_tanpa_sumber"].append(lok)
                if t in ("example", "check") and LATIHAN_TEMPLAT.search(polos(b.get("question"))):
                    temuan["latihan_templat"].append(lok)
                if t == "example":
                    langkah = b.get("steps") or []
                    if sum(bool(LANGKAH_TEMPLAT.match(polos(s))) for s in langkah) >= 2:
                        temuan["contoh_generik"].append(lok)
                if t == "check" and isinstance(b.get("options"), dict) and b.get("answer") in b["options"]:
                    kunci[b["answer"]] += 1
                if t == "cheatsheet":
                    isi = polos(b.get("html")).lower()
                    if isi:
                        cheatsheet[isi].add(bab)
                k = kunci_duplikat(b)
                if k:
                    tempat[k].append(lok)
                if JUDUL_TEMPLAT.match(b.get("title") or ""):
                    temuan["teks_templat"].append(f"{lok}: judul {b['title'][:60]}")

                for jalur, s in string_blok(b):
                    if KONTROL.search(s):
                        temuan["karakter_kontrol"].append(f"{lok} {jalur}")
                    if "\\" in s and pembatas_salah(s):
                        temuan["pembatas_bersarang"].append(f"{lok} {jalur}")
                    for potong in potongan_teks(s):
                        rumus, yatim = rumus_di(potong)
                        if yatim:
                            temuan["pembatas_tanpa_pasangan"].append(f"{lok} {jalur}: {yatim} … {potong.strip()[:60]}")
                        semua_rumus.extend((f"{lok} {jalur}", tex, disp) for tex, disp in rumus)
                        for tex, _ in rumus:
                            if KATA_DI_RUMUS.search(TEKS_RUMUS.sub("", tex)):
                                temuan["rumus_berisi_kata"].append(f"{lok} {jalur}: {tex[:70]}")
                    isi = polos(s)
                    if TEMPLAT.search(isi):
                        temuan["teks_templat"].append(f"{lok} {jalur}: {TEMPLAT.search(isi).group(0)}")
                    if t in ("text", "callout", "cheatsheet", "sim", "image") and jalur in ("html", "title", "caption"):
                        for _ in re.finditer(r"\bAnda\b", isi):
                            temuan["sapaan_anda"].append(f"{lok} {jalur}")
                        if t in ("text", "callout") and jalur == "html":
                            m = KLAIM_SOAL.search(isi)
                            if m and soal.get(bab) and int(m.group(1)) not in soal[bab]:
                                temuan["klaim_jumlah_soal"].append(f"{lok}: menyebut {m.group(1)} soal, katalog {sorted(soal[bab])}")
                            for kal in re.split(r"(?<=[.!?])\s+", isi):
                                if HIPERBOLA.search(kal):
                                    tinjau["hiperbola"].append(f"{lok}: {kal}")
                                if kal.endswith("!"):
                                    tinjau["seru"].append(f"{lok}: {kal}")
        n = sum(kunci.values())
        if n and max(kunci.values()) > batas_kunci(n):
            huruf, banyak = kunci.most_common(1)[0]
            temuan["kunci_menumpuk"].append(f"{bab}: {banyak} dari {n} cek berkunci {huruf} (batas {batas_kunci(n)})")

    for k, lokasi in tempat.items():
        if len(lokasi) > 1:
            temuan["duplikat"].append(f"{k[0]} sama di {len(lokasi)} tempat: " + "; ".join(lokasi[:4]))
    for isi, babs in cheatsheet.items():
        if len(babs) > 1:
            temuan["cheatsheet_kembar"].append(" ; ".join(sorted(babs)))
    for lok, pesan in periksa_katex(semua_rumus, wajib_katex, catatan):
        temuan["katex"].append(f"{lok}: {pesan}")
    if wajib_katex and catatan:
        temuan["katex"].extend(catatan)
    return temuan, catatan, tinjau, len(semua_rumus)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--rinci", metavar="KODE", help="tampilkan semua lokasi untuk satu kode pemeriksaan")
    ap.add_argument("--perbarui-baseline", action="store_true", help="simpan jumlah sekarang ke baseline")
    ap.add_argument("--izinkan-naik", action="store_true", help="bersama --perbarui-baseline: boleh menaikkan angka")
    ap.add_argument("--daftar", choices=("hiperbola", "seru"), help="cetak kalimat untuk ditinjau")
    ap.add_argument("--wajib-katex", action="store_true", help="gagal bila rumus tidak dapat diperiksa (untuk CI)")
    args = ap.parse_args()

    temuan, catatan, tinjau, banyak_rumus = kumpulkan(args.wajib_katex)
    if args.daftar:
        print("\n".join(tinjau[args.daftar]))
        print(f"\n{len(tinjau[args.daftar])} kalimat.")
        return 0

    baseline = json.loads(BASELINE.read_text(encoding="utf-8")).get("metrik", {}) if BASELINE.is_file() else {}
    jumlah = {k: len(temuan.get(k, [])) for k in CEK}

    if args.perbarui_baseline:
        naik = [k for k, (jenis, _) in CEK.items() if jenis == "rem" and k in baseline and jumlah[k] > baseline[k]]
        if naik and not args.izinkan_naik:
            print("Baseline tidak diperbarui karena angka ini naik: " + ", ".join(f"{k} {baseline[k]} → {jumlah[k]}" for k in naik))
            return 1
        BASELINE.write_text(json.dumps({"diperbarui": date.today().isoformat(),
                                        "metrik": {k: jumlah[k] for k, (jenis, _) in CEK.items() if jenis == "rem"}},
                                       ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Baseline disimpan di {BASELINE.relative_to(ROOT)}.")
        return 0

    if args.rinci:
        print("\n".join(temuan.get(args.rinci, [])) or "(tidak ada)")
        return 0

    gagal = 0
    for kode, (jenis, ket) in CEK.items():
        daftar = temuan.get(kode, [])
        if jenis == "nol" and daftar:
            gagal += 1
            print(f"\nERROR {kode}: {len(daftar)} temuan, {ket}")
            for x in daftar[:20]:
                print(f"  {x}")
            if len(daftar) > 20:
                print(f"  … dan {len(daftar) - 20} lagi (--rinci {kode})")
        elif jenis == "rem" and kode in baseline and len(daftar) > baseline[kode]:
            gagal += 1
            print(f"\nERROR {kode}: naik dari {baseline[kode]} menjadi {len(daftar)} ({ket}); lihat --rinci {kode}")

    print(f"\n{'Pemeriksaan':26} {'Jumlah':>7} {'Batas':>7}")
    for kode, (jenis, _) in CEK.items():
        batas = 0 if jenis == "nol" else baseline.get(kode, "-")
        print(f"{kode:26} {jumlah[kode]:>7} {batas:>7}")
    for c in catatan:
        print(f"PERINGATAN: {c}")
    print(f"\n{banyak_rumus} rumus diperiksa. Hasil: {'GAGAL' if gagal else 'lolos'} ({gagal} pemeriksaan bermasalah).")
    return 1 if gagal else 0


if __name__ == "__main__":
    sys.exit(main())
