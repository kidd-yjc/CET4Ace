"""Download lazynote CET4 whole-paper pages (2015-06 ~ 2018-12, 2026-06) and parse to bank_raw."""
import html as H
import json
import os
import re
import sys
import time
import urllib.request

BASE = "https://english-exam.lazynote.cn/cet4/paper/"
UA = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
RAWDIR = r"tools\_dl\lazy"
OUT = r"app\data\bank_raw"

SESSIONS = [("2015", "06"), ("2015", "12"), ("2016", "06"), ("2016", "12"),
            ("2017", "06"), ("2017", "12"), ("2018", "06"), ("2018", "12"), ("2026", "06")]


def fetch(y, m, s):
    fn = os.path.join(RAWDIR, f"{y}-{m}-{s}.html")
    if os.path.exists(fn) and os.path.getsize(fn) > 30000:
        return fn
    url = f"{BASE}{y}-{m}-{s}/"
    for attempt in range(3):
        try:
            r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60)
            data = r.read()
            open(fn, "wb").write(data)
            print("dl", y, m, s, len(data))
            return fn
        except Exception as e:  # noqa: BLE001
            print("retry", y, m, s, type(e).__name__, str(e)[:40])
            time.sleep(2)
    return None


def to_lines(path):
    src = open(path, encoding="utf-8").read()
    t = re.sub(r"<!--[\s\S]*?-->", " ", src)
    t = re.sub(r"<(script|style)[\s\S]*?</\1>", " ", t, flags=re.I)
    t = re.sub(r"<br[^>]*>", "\n", t, flags=re.I)
    t = re.sub(r"</(?:div|p|li|tr|h[1-6]|section|table|td|th|blockquote)>", "\n", t, flags=re.I)
    t = re.sub(r"</span>", " ", t, flags=re.I)
    t = re.sub(r"<[^>]+>", "", t)
    t = H.unescape(t).replace("\u00a0", " ")
    t = re.sub(r"[ \t]+", " ", t)
    return [x.strip() for x in t.split("\n") if x.strip()]


def opt_split(block):
    marks = [(m.start(), m.group(1)) for m in re.finditer(r"[\s(（]?([A-D])\s*[)）.．]\s*", block)]
    opts, first = {}, None
    for i, (pos, lab) in enumerate(marks):
        if first is None:
            first = pos
        if lab in opts:
            continue
        end = marks[i + 1][0] if i + 1 < len(marks) else len(block)
        seg = re.sub(r"^[\s(（]?[A-D]\s*[)）.．]\s*", "", block[pos:end]).strip()
        if len(seg) > 1:
            opts[lab] = re.sub(r"\s+", " ", seg)[:400]
    stem = re.sub(r"\s+", " ", block[:first]).strip() if first is not None else block.strip()
    return stem, opts


def parse_page(path):
    L = to_lines(path)
    try:
        start = L.index("整卷试卷排版")
    except ValueError:
        start = 0
    try:
        end = next(i for i in range(start, len(L)) if L[i].startswith("全卷客观题答案速查"))
    except StopIteration:
        end = len(L)

    def find_line(pred, lo=start, hi=end):
        for i in range(lo, hi):
            if pred(L[i]):
                return i
        return -1

    qidx = {}
    for n in range(1, 56):
        i = find_line(lambda x, n=n: re.fullmatch(rf"{n}\s*[.．、]?", x) is not None)
        if i >= 0:
            qidx[n] = i

    questions = []
    for n in range(1, 56):
        if n not in qidx:
            continue
        nxt = min([v for k, v in qidx.items() if k > n] + [end])
        block = "\n".join(L[qidx[n] + 1:nxt])
        block = re.split(r"(?m)^\s*(?:Section|Part|Passage)\b", block)[0]
        stem, opts = opt_split(block)
        stem = re.sub(r"^播放本篇\s*", "", stem)
        stem = re.sub(r"Questions?\s+\d+ (?:and|to) \d+.*?(?:heard\.|\.)\s*", "", stem)
        stem = stem.strip()
        if n <= 25 and len(opts) == 4:
            questions.append({"no": n, "part": "listening", "kind": "mcq", "stem": stem or f"第 {n} 题", "options": opts})
        elif 46 <= n <= 55 and len(opts) == 4:
            p = "passage1" if n <= 50 else "passage2"
            questions.append({"no": n, "part": "reading", "kind": "mcq", "stem": stem or f"第 {n} 题",
                              "options": opts, "passage": p})
        elif 36 <= n <= 45 and len(opts) == 0:
            questions.append({"no": n, "part": "reading", "kind": "matching", "stem": stem, "options": {}, "passage": "matching"})
    # 选词填空 26-35 统一补题
    have = {q["no"] for q in questions}
    for n in range(26, 36):
        if n not in have:
            questions.append({"no": n, "part": "reading", "kind": "cloze", "stem": f"第 {n} 空", "options": {}, "passage": "cloze"})

    #  Passage III 各段
    part3 = find_line(lambda x: re.match(r"^Part\s*(?:III|Ⅲ)", x) is not None)
    sec_a = find_line(lambda x: x == "Section A", lo=part3 if part3 > 0 else start)
    sec_b = find_line(lambda x: x == "Section B", lo=sec_a)
    sec_c = find_line(lambda x: x == "Section C", lo=sec_b)
    q26 = find_line(lambda x: x.startswith("Questions 26 to 35"), lo=sec_a)
    clo_start = q26 + 1 if q26 > 0 else sec_a + 1
    bank_at = find_line(lambda x: re.match(r"^[A-O]\)\s*\w", x) is not None, lo=clo_start)
    cloze_lines = [x for x in L[clo_start:bank_at if bank_at > 0 else sec_b]
                   if not re.match(r"^(?:Directions|英语四级)", x)]
    cloze_text = re.sub(r"\s+", " ", " ".join(cloze_lines)).strip()
    bank = {}
    for x in L[bank_at:sec_b] if bank_at > 0 else []:
        m = re.match(r"^([A-O])\)\s*([A-Za-z][A-Za-z'\-]*)", x)
        if m:
            bank.setdefault(m.group(1), m.group(2))

    paras = {}
    for x in L[sec_b + 1:sec_c]:
        m = re.match(r"^([A-K])\)\s+([\s\S]+)", x)
        if m and m.group(1) not in paras and len(m.group(2)) > 25:
            paras[m.group(1)] = m.group(2)[:1600]

    p1 = find_line(lambda x: x.strip().lower() == "passage one", lo=sec_c)
    p2 = find_line(lambda x: x.strip().lower() == "passage two", lo=p1 if p1 > 0 else sec_c)
    def pas(a, b, qno):
        stop = qidx.get(qno, b)
        lines_ = []
        for x in L[a + 1:stop]:
            if re.match(r"^(?:Directions|Questions?|Passage|Section|Part)\b", x):
                continue
            if re.match(r"^\d{1,2}\s*[.．、]$", x) or re.match(r"^[A-D]\)\s", x):
                continue
            lines_.append(x)
        return re.sub(r"\s+", " ", " ".join(lines_)).strip()[:3000]
    passage1 = pas(p1, p2 if p2 > 0 else end, 46) if p1 > 0 else ""
    passage2 = pas(p2, end, 51) if p2 > 0 else ""

    # 答案表
    ans = {}
    tail = "\n".join(L[end:end + 120])
    for m in re.finditer(r"(\d{1,2})\s+([A-O])(?=[\s·（(]|$)", tail):
        no = int(m.group(1))
        if 1 <= no <= 55 and no not in ans:
            ans[no] = m.group(2)

    for q in questions:
        if q["no"] in ans:
            q["answer"] = ans[q["no"]]

    passages = {"passage1": {"kind": "passage", "text": passage1},
                "passage2": {"kind": "passage", "text": passage2},
                "cloze": {"kind": "cloze", "text": cloze_text, "wordBank": bank},
                "matching": {"kind": "matching", "text": "", "paragraphs": paras, "letters": sorted(paras)}}
    questions.sort(key=lambda x: x["no"])
    return questions, passages, ans


def build(y, m, s):
    fn = fetch(y, m, s)
    if not fn:
        return None
    qs, ps, ans = parse_page(fn)
    yy, mm, st = int(y), int(m), s
    d = {"level": "CET4", "id": f"{yy}_{mm:02d}_{st}", "title": f"{yy}年{mm}月 第{st}套",
         "year": yy, "month": mm, "set": str(st), "source": f"lazynote {y}-{m}-{st}",
         "hasAudio": False, "readingOnly": False,
         "counts": {"total": len(qs),
                    "listening": sum(1 for q in qs if q["part"] == "listening"),
                    "cloze": sum(1 for q in qs if q["kind"] == "cloze"),
                    "matching": sum(1 for q in qs if q["kind"] == "matching"),
                    "reading": sum(1 for q in qs if q["kind"] == "mcq" and q["part"] == "reading")},
         "passages": ps, "questions": qs, "warnings": []}
    miss = [q["no"] for q in qs if "answer" not in q]
    if miss:
        d["warnings"].append("缺答案题号：" + ",".join(map(str, miss)))
    return d


def main():
    os.makedirs(RAWDIR, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    only = sys.argv[1] if len(sys.argv) > 1 else None
    for y, m in SESSIONS:
        for s in (1, 2, 3):
            key = f"{y}-{m}-{s}"
            if only and only != key:
                continue
            d = build(y, m, s)
            if not d:
                print("FAIL dl", key)
                continue
            fn = os.path.join(OUT, f"cet4_{d['id']}.json")
            json.dump(d, open(fn, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
            c = d["counts"]
            print(f"OK {key}: total={c['total']} L={c['listening']} cloze={c['cloze']} match={c['matching']} "
                  f"read={c['reading']} ans={sum(1 for q in d['questions'] if q.get('answer'))} bank={len(d['passages']['cloze']['wordBank'])} "
                  f"paras={len(d['passages']['matching']['paragraphs'])} p1={len(d['passages']['passage1']['text'])}")


if __name__ == "__main__":
    main()
