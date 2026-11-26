import html
import json
import os
import re
import sys

sys.path.insert(0, r"tools")
import import_lazy as I

HTML_DIR = r"tools\_dl\lazy\listen"
BANK_DIR = r"app\data\bank_raw"
PAIRS = [("2026-06-1", "2026_06_1"), ("2026-06-2", "2026_06_2")]


def clean(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^\d{1,2}(?=[A-Z])", "", s)
    return s


def parse_modules(t):
    anchors = [(m.start(), int(m.group(1))) for m in re.finditer(r'id="lt-(\d+)"', t)]
    by_no, modules = {}, []
    for i, (pos, first) in enumerate(anchors):
        end = anchors[i + 1][0] if i + 1 < len(anchors) else len(t)
        block = t[pos:end]
        hm = re.search(r"Questions?\s+(\d+)\s*(?:and\s+(\d+)|to\s+(\d+))\s+are based", block)
        if not hm:
            continue
        last = int(hm.group(2) or hm.group(3) or hm.group(1))
        en = [clean(x) for x in re.findall(r'<p[^>]*class="lt-en"[^>]*>(.*?)</p>', block, re.S)]
        zh = [clean(x) for x in re.findall(r'<p[^>]*class="lt-zh"[^>]*>(.*?)</p>', block, re.S)]
        if not en:
            continue
        m = {"first": first, "last": last, "script": "\n\n".join(en), "scriptCn": "\n\n".join(zh)}
        modules.append(m)
        for no in range(first, last + 1):
            by_no[no] = m
    return by_no, modules


def parse_questions(lines):
    out = {}
    for idx, line in enumerate(lines):
        m = re.match(r"^(\d{1,2})\.$", line.strip())
        if not m:
            continue
        no = int(m.group(1))
        if not (1 <= no <= 25) or no in out:
            continue
        opts = {}
        j = idx + 1
        while j < len(lines) and len(opts) < 4:
            om = re.match(r"^([A-D])\)\s*(.*)$", lines[j].strip())
            if om:
                opts[om.group(1)] = om.group(2).strip()
            elif opts:
                break
            j += 1
        stem = ""
        answer = ""
        expl = ""
        for k in range(idx + 1, min(len(lines), idx + 45)):
            s = lines[k].strip()
            if s.startswith("【题目】") and not stem:
                stem = s[len("【题目】"):].strip()
            if s.startswith("【答案】") and not answer:
                am = re.search(r"\b([A-D])\b", s)
                if am:
                    answer = am.group(1)
                expl = s[len("【答案】"):].strip()
            if stem and answer:
                break
        if len(opts) == 4 and answer:
            out[no] = {"no": no, "part": "listening", "kind": "mcq",
                      "stem": stem or ("第 %d 题" % no), "options": opts,
                      "answer": answer, "expl": expl}
    return out


for pid, bid in PAIRS:
    p = os.path.join(HTML_DIR, f"sec_{pid}.html")
    t = open(p, encoding="utf-8").read()
    lines = I.to_lines(p)
    by_no, modules = parse_modules(t)
    newq = parse_questions(lines)
    print(bid, "modules", len(modules), "questions", len(newq), "answers", sum(1 for q in newq.values() if q.get("answer")))
    bp = os.path.join(BANK_DIR, f"cet4_{bid}.json")
    d = json.load(open(bp, encoding="utf-8"))
    for no, q in newq.items():
        if no in by_no:
            q["script"] = by_no[no]["script"]
            q["scriptCn"] = by_no[no]["scriptCn"]
    keep = [q for q in d["questions"] if q["part"] != "listening" and q["no"] not in newq]
    d["questions"] = sorted(keep + list(newq.values()), key=lambda q: q["no"])
    d["listening"] = modules
    d["hasAudio"] = False
    d.pop("audioFile", None)
    d.pop("readingOnly", None)
    d["audioMissing"] = True
    d["counts"] = {
        "total": len(d["questions"]),
        "listening": 25,
        "cloze": sum(1 for q in d["questions"] if q["kind"] == "cloze"),
        "matching": sum(1 for q in d["questions"] if q["kind"] == "matching"),
        "reading": sum(1 for q in d["questions"] if q["kind"] == "mcq" and q["part"] == "reading"),
    }
    d.setdefault("warnings", []).append("2026.06 源站未提供听力音频，听力题可读原文但无法播放")
    json.dump(d, open(bp, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print("  ->", d["counts"])
