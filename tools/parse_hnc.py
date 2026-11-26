"""Parse 2014-2018 CET-4 question PDFs + explanation PDFs into bank_raw JSON.

题目来自 happynchubby 真题 PDF（统一排版），答案/解析来自同站「解析」PDF。
输出 app/data/bank_raw/cet4_<year>_<month>_<set>.json
"""
import json
import os
import re
import sys

import pymupdf

QDIR = r"tools\_dl\hnc"
OUT = r"app\data\bank_raw"

SESSIONS = ["2014.06", "2014.12", "2015.06", "2015.12", "2016.06", "2016.12",
            "2017.06", "2017.12", "2018.06", "2018.12"]

LIG = {"ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl"}


def pdf_text(path):
    doc = pymupdf.open(path)
    t = "\n".join(page.get_text() for page in doc)
    doc.close()
    for k, v in LIG.items():
        t = t.replace(k, v)
    t = t.replace("\u00ad", "")
    t = t.replace("Ⅱ", "II").replace("Ⅲ", "III").replace("Ⅳ", "IV")
    t = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", t)
    t = re.sub(r"[ \t]+", " ", t)
    return t


def norm(s):
    return re.sub(r"\s+", " ", s).strip()


def split_options(block):
    marks = [(m.start(), m.group(1)) for m in re.finditer(r"[\s(（]?([A-D])\s*[)）.．]\s*", block)]
    opts = {}
    for i, (pos, lab) in enumerate(marks):
        if lab in opts:
            continue
        end = marks[i + 1][0] if i + 1 < len(marks) else len(block)
        seg = block[pos:end]
        seg = re.sub(r"^[\s(（]?[A-D]\s*[)）.．]\s*", "", seg)
        seg = norm(seg)
        if len(seg) < 2:
            continue
        if re.match(r"^[A-D]\s*[)）.．]", seg):
            continue
        opts[lab] = seg[:400]
    return opts


def question_blocks(text, lo, hi):
    out = {}
    starts = list(re.finditer(r"(?m)^\s*(\d{1,2})\s*[.．、]\s*(?=\S)", text))
    for i, m in enumerate(starts):
        no = int(m.group(1))
        if no < lo or no > hi:
            continue
        end = starts[i + 1].start() if i + 1 < len(starts) else len(text)
        block = text[m.end():min(end, m.end() + 1200)]
        block = re.split(r"(?m)^\s*(?:Section|Part)\s+[A-ZIVX]+\s*$", block)[0]
        opts = split_options(block)
        first = re.search(r"[\s(（]?[A-D]\s*[)）.．]", block)
        stem = norm(block[:first.start()] if first else block)
        stem = re.sub(r"^[A-D]\s*[)）.．]\s*", "", stem)
        cand = {"no": no, "stem": stem, "options": opts}
        if no not in out or len(opts) > len(out[no]["options"]):
            out[no] = cand
    return [out[k] for k in sorted(out)]


def parse_answers(ans_text):
    ans = {}
    starts = list(re.finditer(r"(?m)^\s*(\d{1,2})\s*[.．、]\s*(?=\S)", ans_text))
    for i, m in enumerate(starts):
        no = int(m.group(1))
        if no in ans or no > 55:
            continue
        end = starts[i + 1].start() if i + 1 < len(starts) else len(ans_text)
        block = ans_text[m.end():end]
        am = re.search(r"答案\s*[:：]\s*([A-O])", block)
        if not am:
            am = re.search(r"(?:故答案为|故选|答案为)\s*([A-O])", block)
        if not am:
            continue
        a = am.group(1)
        expl = block[am.end():]
        parts = re.split(r"(?m)^\s*(?:详解|解析|【解析】)\s*[:：]", expl, maxsplit=1)
        expl = parts[1] if len(parts) > 1 else parts[0]
        expl = norm(expl)
        expl = re.sub(r"第\s*\d+\s*题.*?$", "", expl)
        ans[no] = (a, expl[:400])
    return ans


def between(text, start_pat, end_pat, default_end=None):
    m = re.search(start_pat, text)
    if not m:
        return ""
    rest = text[m.end():]
    e = re.search(end_pat, rest)
    return rest[:e.start()] if e else (rest[:default_end] if default_end else rest)


def parse_set(sess, st):
    yy, mm = sess.split(".")
    text = pdf_text(os.path.join(QDIR, f"{sess}_s{st}_q.pdf"))
    apath = os.path.join(QDIR, f"{sess}_s{st}_ans.pdf")
    year, month = int(yy), int(mm)
    old = sess <= "2015.12"

    blocks = question_blocks(text, 1, 25)
    listening = [q for q in blocks if len(q["options"]) == 4]

    # 选词填空正文
    cloze_text = between(text, r"Questions?\s*26\s*to\s*35\s*(?:are|is)\s*based\s*on[\s\S]{0,40}?passage\.?",
                         r"(?m)^\s*(?:Section\s*B|Questions?\s*36)")
    bank = {}
    for m in re.finditer(r"(?m)^\s*([A-O])\s*[)）]\s*([A-Za-z][A-Za-z'\-]*)", text):
        bank.setdefault(m.group(1), m.group(2))
    if len(bank) < 12:
        for m in re.finditer(r"([A-O])\s*[)）]\s*([A-Za-z][A-Za-z'\-]*)", text):
            bank.setdefault(m.group(1), m.group(2))
    cloze_text = re.sub(r"(?m)^\s*[A-O]\s*[)）]\s*[A-Za-z][A-Za-z'\-]*(?:\s+[A-O]\s*[)）]\s*[A-Za-z][A-Za-z'\-]*)?\s*$", "", cloze_text)
    cloze_text = re.sub(r"(?is)Directions:.+?(?:more\s+than\s+once\.|once\.)", "", cloze_text, count=1)
    cloze_text = norm(cloze_text)

    # 匹配段落
    mbody = between(text, r"(?m)^\s*Section\s*B\s*$", r"(?m)^\s*Section\s*C\s*$")
    paras = {}
    for m in re.finditer(r"(?m)^\s*(?:\[([A-J])\]|([A-J])\s*[)）])\s*", mbody):
        lab = m.group(1) or m.group(2)
        if lab in paras:
            continue
        nxt = re.search(r"(?m)^\s*(?:\[[A-J]\]|[A-J]\s*[)）])\s*", mbody[m.end():])
        end = m.end() + nxt.start() if nxt else len(mbody)
        body = norm(mbody[m.end():end])
        if len(body) > 25:
            paras[lab] = body[:1500]

    # 阅读短文
    p1 = re.search(r"(?i)Passage\s*One", text)
    p2 = re.search(r"(?i)Passage\s*Two", text)
    def pas(start, end):
        seg = text[start:end]
        seg = re.sub(r"(?is)Directions:.+?(?:each\s+question\.|marked\s+[A-D]\).)", "", seg, count=1)
        keep = []
        for ln in seg.split("\n"):
            s = ln.strip()
            if not s or re.match(r"^\d{1,2}\s*[.．、]", s) or re.match(r"^[A-D]\s*[)）.．]", s):
                continue
            keep.append(s)
        return norm(" ".join(keep))[:3000]
    passage1 = pas(p1.end() if p1 else len(text) // 2, p2.start() if p2 else len(text))
    passage2 = pas(p2.end(), len(text)) if p2 else ""

    ans = parse_answers(pdf_text(apath)) if os.path.exists(apath) else {}

    def mk(no, part, kind, stem, options, passage=None):
        q = {"no": no, "part": part, "kind": kind, "stem": stem, "options": options}
        if passage:
            q["passage"] = passage
        if no in ans:
            q["answer"], q["expl"] = ans[no][0], ans[no][1]
        return q

    questions = []
    for q in listening:
        questions.append(mk(q["no"], "listening", "mcq", q["stem"] or f"第 {q['no']} 题", q["options"]))
    for i in range(26, 36):
        questions.append(mk(i, "reading", "cloze", f"第 {i} 空", {}, "cloze"))
    for q in question_blocks(text, 36, 45):
        if q["options"]:
            continue
        questions.append(mk(q["no"], "reading", "matching", q["stem"], {}, "matching"))
    for q in question_blocks(text, 46, 55):
        if len(q["options"]) != 4:
            continue
        questions.append(mk(q["no"], "reading", "mcq", q["stem"] or f"第 {q['no']} 题",
                            q["options"], "passage1" if q["no"] <= 50 else "passage2"))

    passages = {"passage1": {"kind": "passage", "text": passage1},
                "passage2": {"kind": "passage", "text": passage2},
                "cloze": {"kind": "cloze", "text": cloze_text, "wordBank": bank},
                "matching": {"kind": "matching", "text": "", "paragraphs": paras,
                             "letters": sorted(paras)}}

    d = {"level": "CET4", "id": f"{year}_{month}_{st}", "title": f"{year}年{month}月 第{st}套",
         "year": year, "month": month, "set": str(st), "source": f"{sess} s{st} (happynchubby)",
         "hasAudio": False, "readingOnly": old,
         "counts": {"total": len(questions),
                    "listening": sum(1 for q in questions if q["part"] == "listening"),
                    "cloze": sum(1 for q in questions if q["kind"] == "cloze"),
                    "matching": sum(1 for q in questions if q["kind"] == "matching"),
                    "reading": sum(1 for q in questions if q["kind"] == "mcq" and q["part"] == "reading")},
         "passages": passages, "questions": sorted(questions, key=lambda x: x["no"]), "warnings": []}
    if not os.path.exists(apath):
        d["warnings"].append("该套暂无答案文件（仅有试卷）")
    miss = [q["no"] for q in d["questions"] if "answer" not in q]
    if miss:
        d["warnings"].append("缺答案题号：" + ",".join(map(str, miss)))
    return d


def main():
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for sess in SESSIONS:
        for st in (1, 2, 3):
            if only and only != f"{sess}_s{st}":
                continue
            try:
                d = parse_set(sess, st)
            except Exception as e:  # noqa: BLE001
                print("FAIL", sess, st, type(e).__name__, e)
                continue
            with open(os.path.join(OUT, f"cet4_{d['id']}.json"), "w", encoding="utf-8") as f:
                json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
            c = d["counts"]
            n_ans = sum(1 for q in d["questions"] if q.get("answer"))
            print(f"OK {sess} s{st}: total={c['total']} L={c['listening']} cloze={c['cloze']} "
                  f"match={c['matching']} read={c['reading']} ans={n_ans} bank={len(d['passages']['cloze']['wordBank'])} "
                  f"paras={len(d['passages']['matching']['paragraphs'])} txt={len(d['passages']['cloze']['text'])}")


if __name__ == "__main__":
    main()
