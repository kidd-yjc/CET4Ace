"""清洗题库解析文本：去掉粘连英文题干、页眉页码，选项按字母排序分行。"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "app", "data", "bank_raw")

CJK = re.compile(r"[\u4e00-\u9fff]")
HEADER = re.compile(r"\d*\s*四级\s*\d{4}\s*[.．]\s*\d+\s*第\s*[一二三]\s*套")
LONGWORD = re.compile(r"[A-Za-z]{10,}")
OPTMARK = re.compile(r"\s([A-O])\s*[）)．.]\s*")   # 前面必须有空白，避免误切单词

stats = {"total": 0, "ascii_drop": 0, "header": 0, "sorted": 0}


def clean(text):
    t = (text or "").replace("\r", "").strip()
    if not t:
        return t
    if HEADER.search(t):
        t = HEADER.sub("", t)
        stats["header"] += 1

    m = CJK.search(t)
    if m and m.start() > 8:
        head = t[:m.start()]
        if LONGWORD.search(head):
            t = t[m.start():]
            stats["ascii_drop"] += 1

    parts = OPTMARK.split(t)
    if len(parts) >= 5:
        lead = parts[0].strip()
        items = {}
        tail = []
        for i in range(1, len(parts) - 1, 2):
            letter = parts[i]
            body = parts[i + 1].strip()
            if body:
                items[letter] = body
        # 最后一个字母之后若还挂着解析说明，拆出来放末尾
        order = sorted(items)
        if order and order != [p for p in parts[1::2] if p in items]:
            stats["sorted"] += 1
        out = [lead] if lead else []
        for k in order:
            out.append(f"{k}）{items[k]}")
        t = "\n".join(out)
    return re.sub(r"[ \t]{2,}", " ", t).strip()


for fn in glob.glob(os.path.join(RAW, "cet4_*.json")):
    d = json.load(open(fn, encoding="utf-8"))
    for q in d.get("questions", []):
        if q.get("expl"):
            stats["total"] += 1
            q["expl"] = clean(q["expl"])
    json.dump(d, open(fn, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

print(f"解析 {stats['total']} 条：去粘连英文 {stats['ascii_drop']}，去页眉 {stats['header']}，"
      f"选项排序 {stats['sorted']}")
