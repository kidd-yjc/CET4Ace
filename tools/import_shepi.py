"""把 ShepiTT/CET_practice_questions 的 SQLite 题库转成 App 的 bank_raw JSON。

    python tools/import_shepi.py

数据源（MIT 之外，题库为整理者人工校对，见 README 版权说明）：
  https://github.com/ShepiTT/CET_practice_questions  instance/cet4_v2.db

输出：app/data/bank_raw/cet4_<YYYY>_<MM>_<N>.json
  questions[] 增加 expl（解析）、script（听力原文）、audioStart（该段音频起点秒数）
"""
import io
import json
import os
import re
import sqlite3

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "tools", "_dl", "shepi.db")
RAW = os.path.join(ROOT, "app", "data", "bank_raw")

MARK = re.compile(r"(?<![A-Za-z0-9])(?:[\[\(]([A-L])[\]\)]|([A-L])\))")
DIR_TAIL = re.compile(r".*?(?:more than once\.|Answer Sheet 2\.|Answer Sheet 2\s*)", re.S)


def split_paragraphs(text):
    """把 'A) ...  [A] ...' 两种标号的段落切成 {letter: text}，要求 A 起连续。"""
    text = text.strip()
    cand = []
    for m in MARK.finditer(text):
        letter = m.group(1) or m.group(2)
        cand.append((m.start(), m.end(), letter))
    if not cand:
        return {}, text

    # 从第一个 A 开始，按字母顺序取
    start_idx = next((i for i, c in enumerate(cand) if c[2] == "A"), None)
    if start_idx is None:
        return {}, text
    keep = []
    expect = ord("A")
    for pos, end, letter in cand[start_idx:]:
        if ord(letter) == expect:
            keep.append((pos, end, letter))
            expect += 1
        elif ord(letter) < expect - 3:  # 明显跑偏，停止
            break
    if not keep:
        return {}, text

    out = {}
    for i, (pos, end, letter) in enumerate(keep):
        stop = keep[i + 1][0] if i + 1 < len(keep) else len(text)
        body = text[end:stop].strip()
        out[letter] = re.sub(r"\s+", " ", body).strip()
    return out, text[:keep[0][0]].strip()


def parse_name(fn):
    m = re.match(r"(20\d\d)-(\d\d)-CET4-([\d\-]+)\.pdf", fn)
    if not m:
        return None
    return int(m.group(1)), int(m.group(2)), m.group(3)


def build_paper(cur, src):
    ym = parse_name(src)
    if not ym:
        return None
    year, month, setpart = ym
    setno = setpart.split("-")[0]
    pid = f"{year}_{month:02d}_{setno}"

    groups = cur.execute(
        "select id,title,group_type,audio_start,passage,coalesce(transcript,'') "
        "from question_group where source_file=? order by id", (src,)).fetchall()

    passages = {}
    listening = []
    qmeta = {}
    read_idx = 0
    for gid, title, gtype, astart, passage, transcript in groups:
        if gtype == "reading":
            read_idx += 1
            key = "passage1" if read_idx == 1 else ("passage2" if read_idx == 2 else f"passage{read_idx}")
            passages[key] = {"kind": "passage", "text": re.sub(r"\s+", " ", passage or "").strip()}
        elif gtype == "cloze":
            body = passage or ""
            cut = DIR_TAIL.match(body)
            body = body[cut.end():] if cut else body
            passages["cloze"] = {"kind": "cloze", "text": body.strip(), "wordBank": {}}
        elif gtype == "matching":
            body = passage or ""
            cut = DIR_TAIL.match(body)
            body = body[cut.end():] if cut else body
            paras, _ = split_paragraphs(body)
            passages["matching"] = {"kind": "matching", "text": "", "paragraphs": paras,
                                    "letters": sorted(paras.keys())}
        elif gtype == "listening":
            listening.append({
                "group": gid, "title": title, "start": round(float(astart or 0), 1),
                "script": re.sub(r"[ \t]+", " ", transcript or "").strip(),
            })
        qmeta[gid] = gtype

    qs = cur.execute(
        "select id,group_id,section,content,q_number,correct_answer,explanation "
        "from question where source_file=? order by q_number", (src,)).fetchall()
    if not qs:
        return None

    # 词库
    first_cloze = next((q for q in qs if q[4] >= 26 and q[4] <= 35), None)
    bank = {}
    if first_cloze:
        for label, text in cur.execute(
                "select label,text from option where question_id=? order by label",
                (first_cloze[0],)).fetchall():
            bank[label] = text

    questions = []
    for qid, gid, section, content, no, ans, expl in qs:
        gtype = qmeta.get(gid, "")
        opts = {}
        for label, text in cur.execute(
                "select label,text from option where question_id=? order by label", (qid,)).fetchall():
            if gtype != "cloze":
                opts[label] = re.sub(r"\s+", " ", text or "").strip()
        stem_txt = re.sub(r"\s+", " ", (content or "")).strip()
        item = {"no": no}
        if section.startswith("Listening"):
            item["part"] = "listening"
            item["kind"] = "mcq"
            item["stem"] = str(no)
            item["options"] = opts
            grp = next((g for g in listening if g["group"] == gid), None)
            if grp:
                item["script"] = grp["script"]
                item["audioStart"] = grp["start"]
                item["groupNote"] = re.sub(r"Listening:\s*", "", grp["title"])
        elif gtype == "cloze":
            item["part"] = "reading"
            item["kind"] = "cloze"
            item["stem"] = f"第 {no} 空"
            item["options"] = {}
            item["passage"] = "cloze"
            item["answerText"] = bank.get(ans, "")
        elif gtype == "matching":
            item["part"] = "reading"
            item["kind"] = "matching"
            item["stem"] = f"{no}. {stem_txt}"
            item["options"] = {}
            item["passage"] = "matching"
        else:
            item["part"] = "reading"
            item["kind"] = "mcq"
            item["stem"] = f"{no}. {stem_txt}"
            item["options"] = opts
            key = "passage1" if 46 <= no <= 50 else "passage2"
            if key in passages:
                item["passage"] = key
        item["answer"] = (ans or "").strip()[:1]
        if expl:
            item["expl"] = re.sub(r"\s+", " ", expl).strip()
        questions.append(item)

    passages.setdefault("cloze", {"kind": "cloze", "text": "", "wordBank": bank})
    if bank:
        passages["cloze"]["wordBank"] = bank
    if "matching" not in passages:
        passages["matching"] = {"kind": "matching", "text": "", "paragraphs": {}, "letters": []}

    counts = {"total": len(questions),
              "listening": sum(1 for q in questions if q["part"] == "listening"),
              "cloze": sum(1 for q in questions if q["kind"] == "cloze"),
              "matching": sum(1 for q in questions if q["kind"] == "matching"),
              "reading": sum(1 for q in questions if q["kind"] == "mcq" and q["part"] == "reading")}
    title = f"{year}年{month}月 第{setpart.replace('-', '/')}套"
    return {
        "level": "CET4",
        "id": pid,
        "title": title,
        "year": year,
        "month": month,
        "set": setno,
        "source": src,
        "hasAudio": bool(listening),
        "readingOnly": counts["listening"] == 0,
        "counts": counts,
        "passages": passages,
        "questions": questions,
        "listening": [{"no1": None, "start": g["start"], "script": g["script"]} for g in listening],
        "warnings": [],
    }


def main():
    con = sqlite3.connect(DB)
    cur = con.cursor()
    files = [r[0] for r in cur.execute(
        "select distinct source_file from question where source_file like '%CET4%' order by source_file")]
    os.makedirs(RAW, exist_ok=True)
    made = 0
    for src in files:
        p = build_paper(cur, src)
        if not p:
            print("skip", src)
            continue
        fn = os.path.join(RAW, f"cet4_{p['id']}.json")
        with io.open(fn, "w", encoding="utf-8") as f:
            json.dump(p, f, ensure_ascii=False, separators=(",", ":"))
        made += 1
        print(f"{p['id']:12s} q={p['counts']['total']:3d} "
              f"L{p['counts']['listening']:2d} C{p['counts']['cloze']:2d} "
              f"M{p['counts']['matching']:2d} R{p['counts']['reading']:2d} "
              f"paras={len(p['passages']['matching']['paragraphs'])}")
    con.close()
    print("共导出", made, "套 ->", RAW)


if __name__ == "__main__":
    main()
