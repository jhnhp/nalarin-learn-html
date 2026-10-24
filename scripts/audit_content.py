#!/usr/bin/env python3
"""Audit lesson JSON files for likely generated placeholders and basic content issues.

Usage: python3 scripts/audit_content.py
This is a diagnostic triage tool that evaluates academic content quality,
identifying placeholders, generic boilerplate, and structural schema issues.
"""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
MATERIALS = ROOT / "materi"

PATTERNS = {
    "generic_example": (
        re.compile(
            r"Perhatikan permasalahan kontekstual terkait|Perhatikan permasalahan mendalam terkait|"
            r"Analisislah berdasarkan kaidah|Solusi terverifikasi sesuai langkah pemecahan masalah",
            re.I
        ),
        "High",
        "Contains generic boilerplate problem statement or verified solution placeholder"
    ),
    "generic_check": (
        re.compile(
            r"berlaku secara konsisten sesuai kaidah|Variasi parameter tidak akan memengaruhi",
            re.I
        ),
        "High",
        "Contains boilerplate multiple-choice options with generic consistency assertions"
    ),
    "placeholder_answer": (
        re.compile(
            r"Solusi terverifikasi|sesuai langkah pemecahan masalah|\b(?:TODO|PLACEHOLDER|TBD|FIXME)\b",
            re.I
        ),
        "High",
        "Contains unresolved placeholder marker or unworked answer placeholder"
    ),
}

GENERIC_STEPS_PATTERN = re.compile(
    r"identifikasi besaran,\s*data yang diketahui|"
    r"periksa kembali kesesuaian satuan dan konsistensi logika|"
    r"terapkan konsep atau formula .* untuk menyusun tahapan solusi sistematis",
    re.I
)

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
    total_issues = 0
    defective_blocks = 0
    findings = []

    for path in files:
        rel_path = path.relative_to(ROOT)
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as exc:
            findings.append(("High", "corrupt_json", rel_path, "$", str(exc)))
            total_issues += 1
            continue

        for location, obj in walk(data):
            if not isinstance(obj, dict):
                continue
            btype = obj.get("type")
            if btype not in {"example", "check"}:
                continue

            block_issues = []
            serialized = json.dumps(obj, ensure_ascii=False)

            # Check regex patterns
            for label, (pattern, confidence, desc) in PATTERNS.items():
                if pattern.search(serialized):
                    block_issues.append((confidence, label, desc))

            # Specific checks for example blocks
            if btype == "example":
                if not obj.get("question") or not obj.get("answer"):
                    block_issues.append(("High", "incomplete_example", "Example block missing question or answer"))
                
                steps = obj.get("steps")
                if isinstance(steps, list):
                    for step in steps:
                        if GENERIC_STEPS_PATTERN.search(str(step)):
                            block_issues.append(("High", "generic_steps", "Step contains uninstantiated generic instructions"))
                            break

            # Specific checks for check blocks
            elif btype == "check":
                options = obj.get("options")
                if not isinstance(options, dict) or len(options) < 2:
                    block_issues.append(("High", "invalid_options", "Check block options missing or fewer than 2 choices"))
                elif obj.get("answer") not in options:
                    block_issues.append(("High", "invalid_answer_key", f"Answer key '{obj.get('answer')}' not found in options"))

            if block_issues:
                defective_blocks += 1
                for conf, cat, desc in block_issues:
                    findings.append((conf, cat, rel_path, location, desc))
                    total_issues += 1

    # Print structured actionable report
    if findings:
        print(f"{'CONF':<6} {'CATEGORY':<20} {'LOCATION':<60} {'DESCRIPTION'}")
        print("-" * 110)
        for conf, cat, rel_path, location, desc in findings:
            loc_str = f"{rel_path} {location}"
            print(f"{conf:<6} {cat:<20} {loc_str:<60} {desc}")
        print("-" * 110)

    print(f"\nScanned {len(files)} lesson JSON files; found {total_issues} candidate issues across {defective_blocks} blocks.")
    if total_issues == 0:
        print("✓ All learning content blocks meet repository quality standards.")
    else:
        print("Review each result manually; some matches may be legitimate wording.")

if __name__ == "__main__":
    main()
