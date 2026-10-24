#!/usr/bin/env python3
"""Audit lesson JSON files for likely generated placeholders and basic content issues.

Usage: python3 scripts/audit_content.py
This is a triage tool, not an automatic academic fact-checker.
"""
from pathlib import Path
import json
import re

ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "materi"
PATTERNS = {
    "generic_example": re.compile(
        r"Perhatikan permasalahan kontekstual terkait|Analisislah berdasarkan kaidah|"
        r"Solusi terverifikasi sesuai langkah pemecahan masalah", re.I
    ),
    "generic_check": re.compile(
        r"manakah pernyataan berikut yang paling tepat|berlaku secara konsisten sesuai kaidah|"
        r"Variasi parameter tidak akan memengaruhi", re.I
    ),
    "placeholder_answer": re.compile(
        r"Solusi terverifikasi|sesuai langkah pemecahan masalah|TODO|PLACEHOLDER", re.I
    ),
}
def walk(value, location="$"):
    if isinstance(value, dict):
        yield location, value
        for key, child in value.items():
            yield from walk(child, f"{location}.{key}")
    elif isinstance(value, list):
        for index, child in enumerate(value):
            yield from walk(child, f"{location}[{index}]")

def main():
    files = sorted(MATERIALS.rglob("bab.json"))
    issues = 0
    for path in files:
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            print(f"ERROR\t{path.relative_to(ROOT)}\t{exc}")
            issues += 1
            continue
        for location, obj in walk(data):
            if obj.get("type") not in {"example", "check"}:
                continue
            serialized = json.dumps(obj, ensure_ascii=False)
            for label, pattern in PATTERNS.items():
                if pattern.search(serialized):
                    print(f"{label}\t{path.relative_to(ROOT)}\t{location}")
                    issues += 1
                    break
            if obj.get("type") == "example":
                if not obj.get("question") or not obj.get("answer"):
                    print(f"incomplete_example\t{path.relative_to(ROOT)}\t{location}")
                    issues += 1
                if isinstance(obj.get("steps"), list) and any(
                    "identifikasi besaran" in str(step).lower()
                    or "periksa kembali kesesuaian satuan" in str(step).lower()
                    for step in obj["steps"]
                ):
                    print(f"generic_steps\t{path.relative_to(ROOT)}\t{location}")
                    issues += 1
            if obj.get("type") == "check":
                options = obj.get("options")
                if not isinstance(options, dict) or len(options) < 2:
                    print(f"invalid_options\t{path.relative_to(ROOT)}\t{location}")
                    issues += 1
                elif obj.get("answer") not in options:
                    print(f"invalid_answer_key\t{path.relative_to(ROOT)}\t{location}")
                    issues += 1
    print(f"\nScanned {len(files)} lesson JSON files; found {issues} candidate issues.")
    print("Review each result manually; some matches may be legitimate wording.")

if __name__ == "__main__":
    main()
