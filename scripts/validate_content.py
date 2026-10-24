#!/usr/bin/env python3
"""Validasi struktur materi Nalarin Learn tanpa dependensi pihak ketiga."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "katalog.json"
ALLOWED_BLOCKS = {
    "h", "heading", "text", "image", "callout", "video", "sim",
    "check", "example", "cheatsheet", "kuis",
}
VIDEO_ID = re.compile(r"^[A-Za-z0-9_-]{11}$")
DANGEROUS_HTML = re.compile(
    r"<\s*(script|iframe|object|embed|form|input|button|base|meta)\b|"
    r"\bon[a-z]+\s*=|javascript\s*:",
    re.IGNORECASE,
)


class Validator:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []

    def error(self, where: str, message: str) -> None:
        self.errors.append(f"ERROR {where}: {message}")

    def warn(self, where: str, message: str) -> None:
        self.warnings.append(f"WARN  {where}: {message}")

    def read_json(self, path: Path, where: str):
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except FileNotFoundError:
            self.error(where, f"file tidak ditemukan: {path.relative_to(ROOT)}")
        except (OSError, json.JSONDecodeError) as exc:
            self.error(where, f"JSON tidak dapat dibaca: {exc}")
        return None

    @staticmethod
    def is_external(path: str) -> bool:
        return urlparse(path).scheme in {"http", "https"} or path.startswith("//")

    def validate(self) -> int:
        catalog = self.read_json(CATALOG, "katalog")
        if not isinstance(catalog, dict) or not isinstance(catalog.get("bab"), list):
            self.error("katalog", 'struktur harus berupa objek dengan array "bab"')
            return self.finish()

        seen_ids: set[str] = set()
        for entry in catalog["bab"]:
            if not isinstance(entry, dict):
                self.error("katalog", "setiap item bab harus berupa objek")
                continue
            bab_id = entry.get("id")
            where = str(bab_id or "(tanpa id)")
            if not isinstance(bab_id, str) or not bab_id.strip():
                self.error("katalog", "ID bab harus berupa string yang tidak kosong")
                continue
            if bab_id in seen_ids:
                self.error(where, "ID bab duplikat di katalog")
                continue
            seen_ids.add(bab_id)

            folder = ROOT / "materi" / bab_id
            path = folder / "bab.json"
            data = self.read_json(path, where)
            if not isinstance(data, dict):
                continue

            lessons = data.get("lessons")
            if not isinstance(lessons, list):
                self.error(where, '"lessons" harus berupa array')
                continue

            lesson_ids: set[str] = set()
            for index, lesson in enumerate(lessons, start=1):
                lesson_where = f"{where} / pelajaran {index}"
                if not isinstance(lesson, dict):
                    self.error(lesson_where, "pelajaran harus berupa objek")
                    continue
                lesson_id = lesson.get("id")
                if not isinstance(lesson_id, str) or not lesson_id.strip():
                    self.error(lesson_where, 'field "id" wajib berupa string')
                elif lesson_id in lesson_ids:
                    self.error(lesson_where, f"ID pelajaran duplikat: {lesson_id}")
                else:
                    lesson_ids.add(lesson_id)

                blocks = lesson.get("blocks", [])
                if not isinstance(blocks, list):
                    self.error(lesson_where, '"blocks" harus berupa array')
                    continue
                for block_index, block in enumerate(blocks, start=1):
                    block_where = f"{lesson_where} / blok {block_index}"
                    if not isinstance(block, dict):
                        self.error(block_where, "blok harus berupa objek")
                        continue
                    kind = block.get("type")
                    if kind not in ALLOWED_BLOCKS:
                        self.error(block_where, f"jenis blok tidak dikenal: {kind!r}")
                        continue

                    if kind == "check":
                        options = block.get("options")
                        if not isinstance(options, dict) or not options:
                            self.error(block_where, '"options" harus berupa objek berisi pilihan')
                        elif block.get("answer") not in options:
                            self.error(block_where, "jawaban tidak cocok dengan kunci pada options")
                        if not isinstance(block.get("question"), str):
                            self.error(block_where, '"question" wajib berupa string')

                    if kind == "video" and not VIDEO_ID.fullmatch(str(block.get("youtube", ""))):
                        self.error(block_where, "ID video YouTube harus terdiri dari 11 karakter valid")

                    if kind in {"image", "sim"}:
                        src = block.get("src")
                        if not isinstance(src, str) or not src.strip():
                            self.error(block_where, '"src" wajib diisi')
                        elif not self.is_external(src) and not src.startswith("/"):
                            asset_path = (folder / src).resolve()
                            if not asset_path.is_relative_to(folder.resolve()):
                                self.error(block_where, "path aset keluar dari folder materi")
                            elif not asset_path.is_file():
                                self.error(block_where, f"aset tidak ditemukan: {src}")

                    for field in ("html", "question", "hint", "explanation", "answer", "caption", "note"):
                        value = block.get(field)
                        if isinstance(value, str) and DANGEROUS_HTML.search(value):
                            self.warn(block_where, f'field "{field}" mengandung markup/atribut yang perlu ditinjau; runtime akan menyaring HTML')

            catalog_lessons = entry.get("lessons")
            if isinstance(catalog_lessons, list):
                catalog_ids = [x.get("id") for x in catalog_lessons if isinstance(x, dict)]
                if catalog_ids and catalog_ids != [x.get("id") for x in lessons if isinstance(x, dict)]:
                    self.warn(where, "daftar pelajaran katalog berbeda dari bab.json; jalankan buat-katalog.py")

            quizzes = data.get("kuis", entry.get("kuis", []))
            if isinstance(quizzes, list):
                for quiz in quizzes:
                    if not isinstance(quiz, dict) or not isinstance(quiz.get("path"), str):
                        self.error(where, "setiap kuis harus memiliki field path")
                        continue
                    quiz_path = ROOT / "Kuis" / quiz["path"]
                    if not quiz_path.is_file():
                        self.warn(where, f"file kuis tidak ditemukan: Kuis/{quiz['path']}")

        return self.finish()

    def finish(self) -> int:
        for message in self.errors:
            print(message)
        for message in self.warnings:
            print(message)
        print(f"\nHasil validasi: {len(self.errors)} error, {len(self.warnings)} peringatan.")
        return 1 if self.errors else 0


if __name__ == "__main__":
    sys.exit(Validator().validate())
