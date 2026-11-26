"""盘点 library 里每份 PDF 的可机读性：页数、字符数、是否含听力原文。

    python tools/probe_library.py
"""
import json
import os
import re

import fitz  # PyMuPDF

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "library", "四级真题")

SCRIPT_HINT = re.compile(r"(tape\s*script|listening\s*script|听力原文|听力材料|Script)", re.I)
ANS_HINT = re.compile(r"[1-9][0-9]?\s*[．.\-、]?\s*[A-D]\b")


def probe(path):
    doc = fitz.open(path)
    chars = 0
    text = []
    for p in doc:
        t = p.get_text()
        chars += len(t.strip())
        text.append(t)
    doc.close()
    joined = "\n".join(text)
    return {
        "pages": len(text),
        "chars": chars,
        "perPage": round(chars / max(len(text), 1)),
        "script": bool(SCRIPT_HINT.search(joined)),
        "ansPairs": len(ANS_HINT.findall(joined)),
        "head": joined[:0],
    }


def main():
    rows = []
    for mon in sorted(os.listdir(LIB)):
        mdir = os.path.join(LIB, mon)
        if not os.path.isdir(mdir):
            continue
        for dp, _, fns in os.walk(mdir):
            for f in fns:
                if not f.lower().endswith(".pdf"):
                    continue
                full = os.path.join(dp, f)
                rel = os.path.relpath(full, LIB).replace("\\", "/")
                try:
                    r = probe(full)
                except Exception as e:  # noqa: BLE001
                    r = {"error": type(e).__name__}
                r["file"] = rel
                r["month"] = mon
                r["size"] = round(os.path.getsize(full) / 1e6, 2)
                rows.append(r)
    with open(os.path.join(ROOT, "tools", "_dl", "_probe.json"), "w", encoding="utf-8") as f:
        json.dump(rows, f, ensure_ascii=False, indent=1)

    print("%-46s %5s %7s %6s %5s %5s" % ("file", "pages", "chars", "perPg", "scr", "ans"))
    for r in sorted(rows, key=lambda x: x["file"]):
        if "error" in r:
            print("%-46s ERR %s" % (r["file"], r["error"]))
            continue
        print("%-46s %5d %7d %6d %5s %5d" % (
            r["file"][-46:], r["pages"], r["chars"], r["perPage"],
            "Y" if r["script"] else "-", r["ansPairs"]))


if __name__ == "__main__":
    main()
