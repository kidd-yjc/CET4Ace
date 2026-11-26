"""把原始数据整理成 App 直接读取的 JSON。

输入：
  app/data/vocab_raw.jsonl      四级词库（KyleBing/english-vocabulary）
  app/data/bank_raw/*.json      结构化真题（couldyyy9/cet-website, MIT）
  app/audio/*.mp3               听力音频
  library/manifest.json         0609x/CET46-Resources 全量真题索引（可选）

输出：
  app/data/vocab.json           [ [word, us, uk, trans, exEn, exCn], ... ]
  app/data/bank/<id>.json       单套题库（补 audio 字段）
  app/data/bank/manifest.json   套题索引
  app/data/library.json         2014–2026 全量资料库索引（含在线链接）
"""
import io
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APP = os.path.join(ROOT, "app")
DATA = os.path.join(APP, "data")


def build_vocab():
    src = os.path.join(DATA, "vocab_raw.jsonl")
    out = []
    with io.open(src, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                continue
            w = (d.get("word") or "").strip()
            if not w:
                continue
            trans = "；".join(
                (t.get("type") + ". " if t.get("type") else "") + t.get("translation", "")
                for t in (d.get("translations") or [])[:2]
            ).strip("；")
            sen = d.get("sentences") or []
            ex_en = sen[0].get("sentence", "") if sen else ""
            ex_cn = sen[0].get("translation", "") if sen else ""
            out.append([w, d.get("us") or d.get("uk") or "", d.get("uk") or "", trans, ex_en, ex_cn])
    dst = os.path.join(DATA, "vocab.json")
    with io.open(dst, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print(f"vocab: {len(out)} 条 -> {os.path.getsize(dst)/1e6:.2f}MB")
    return out


def build_bank():
    bank_dir = os.path.join(DATA, "bank")
    os.makedirs(bank_dir, exist_ok=True)
    raw = os.path.join(DATA, "bank_raw")
    items = []
    for fn in sorted(os.listdir(raw)):
        if not re.match(r"cet4_\d{4}_\d{2}_\d\.json$", fn):
            continue
        with io.open(os.path.join(raw, fn), encoding="utf-8") as f:
            d = json.load(f)

        # 音频（可能多套共用同一个去重文件）
        af = d.get("audioFile") or ""
        audio_rel = "audio/" + af if af and os.path.exists(os.path.join(APP, "audio", af)) else ""

        qs = d.get("questions", [])
        if not audio_rel and not d.get("audioMissing"):
            # 没有音频就不放听力题，避免“点开没声音”；2026.06 第1/2套是“只有原文没有音频”的例外
            qs = [q for q in qs if q.get("part") != "listening"]

        counts = {
            "total": len(qs),
            "listening": sum(1 for q in qs if q.get("part") == "listening"),
            "cloze": sum(1 for q in qs if q.get("kind") == "cloze"),
            "matching": sum(1 for q in qs if q.get("kind") == "matching"),
            "reading": sum(1 for q in qs if q.get("kind") == "mcq" and q.get("part") == "reading"),
        }
        paper = {
            "id": d["id"],
            "title": d["title"],
            "year": d["year"],
            "month": d["month"],
            "set": d["set"],
            "readingOnly": counts["listening"] == 0,
            "hasAudio": bool(audio_rel),
            "audio": audio_rel,
            "audioDuration": d.get("audioDuration") or 0,
            "audioMissing": bool(d.get("audioMissing")),
            "counts": counts,
            "passages": d.get("passages", {}),
            "questions": qs,
            "warnings": d.get("warnings", []),
        }
        with io.open(os.path.join(bank_dir, d["id"] + ".json"), "w", encoding="utf-8") as f:
            json.dump(paper, f, ensure_ascii=False, separators=(",", ":"))
        items.append({
            "id": d["id"],
            "title": d["title"],
            "year": d["year"],
            "month": d["month"],
            "set": d["set"],
            "readingOnly": paper["readingOnly"],
            "hasAudio": paper["hasAudio"],
            "counts": counts,
        })
    items.sort(key=lambda x: (-x["year"], -x["month"], int(x["set"])))
    with io.open(os.path.join(bank_dir, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump({"exams": items}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"bank: {len(items)} 套（含音频 {sum(1 for i in items if i['hasAudio'])} 套）")
    return items


LABELS = {
    "真题PDF": "真题试卷",
    "真题Word": "真题 Word",
    "答案解析": "答案解析",
    "听力音频": "听力音频",
}


def build_library():
    mf = os.path.join(ROOT, "library", "manifest.json")
    years = []
    if os.path.exists(mf):
        with io.open(mf, encoding="utf-8") as f:
            data = json.load(f)
        ymap = data.get("years", {})
        for y, subs in sorted(ymap.items(), reverse=True):
            entry = {"year": y, "dirs": {}}
            for sub, files in subs.items():
                entry["dirs"][sub] = {
                    "label": LABELS.get(sub, sub),
                    "files": sorted(files),
                    "count": len(files),
                }
            entry["total"] = sum(v["count"] for v in entry["dirs"].values())
            years.append(entry)
    dst = os.path.join(DATA, "library.json")
    with io.open(dst, "w", encoding="utf-8") as f:
        json.dump({
            "source": "https://github.com/0609x/CET46-Resources",
            "repo": "0609x/CET46-Resources",
            "branch": "main",
            "years": years,
        }, f, ensure_ascii=False, separators=(",", ":"))
    print(f"library: {len(years)} 个考次, {sum(y['total'] for y in years)} 个文件")


def _q_brief(q):
    item = {"no": q["no"], "stem": q.get("stem") or "", "options": q.get("options") or {}}
    if q.get("answer"):
        item["answer"] = q["answer"]
    if q.get("answerText"):
        item["answerText"] = q["answerText"]
    if q.get("expl"):
        item["expl"] = q["expl"]
    if q.get("groupNote"):
        item["groupNote"] = q["groupNote"]
    return item


def build_drill():
    """按题型把 74 套拆成可单独练的「题组」，供专项训练页直接加载。"""
    bank_dir = os.path.join(DATA, "bank")
    with io.open(os.path.join(bank_dir, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    groups = {"listening": [], "cloze": [], "matching": [], "reading": []}
    for e in manifest["exams"]:
        with io.open(os.path.join(bank_dir, e["id"] + ".json"), encoding="utf-8") as f:
            d = json.load(f)
        pid, title = d["id"], d["title"]
        pz = d.get("passages") or {}
        qs = d["questions"]

        # ---------- 听力：按音频时间点切成篇目 ----------
        if d.get("hasAudio"):
            lis = [q for q in qs if q.get("part") == "listening"]
            starts = sorted({q["audioStart"] for q in lis if q.get("audioStart") is not None})
            for i, st in enumerate(starts):
                mod = [q for q in lis if q.get("audioStart") == st]
                if not mod:
                    continue
                end = starts[i + 1] if i + 1 < len(starts) else (d.get("audioDuration") or (st + 200))
                first = mod[0].get("script") or ""
                groups["listening"].append({
                    "id": "%s|L|%d" % (pid, mod[0]["no"]),
                    "pid": pid, "title": title, "type": "listening",
                    "no1": mod[0]["no"], "no2": mod[-1]["no"],
                    "audio": d.get("audio"), "start": st, "end": end,
                    "dur": d.get("audioDuration") or 0,
                    "text": first, "textCn": mod[0].get("scriptCn") or "",
                    "qs": [_q_brief(q) for q in mod],
                    "note": mod[0].get("groupNote") or "",
                })

        # ---------- 选词填空 ----------
        cz = pz.get("cloze") or {}
        czq = [q for q in qs if q.get("kind") == "cloze"]
        if cz.get("text") and czq:
            bank = cz.get("wordBank") or {}
            for q in czq:
                if not q.get("answerText") and q.get("answer"):
                    q["answerText"] = bank.get(q["answer"], "")
            groups["cloze"].append({
                "id": "%s|C|1" % pid, "pid": pid, "title": title, "type": "cloze",
                "no1": czq[0]["no"], "no2": czq[-1]["no"],
                "text": cz["text"], "bank": bank,
                "qs": [_q_brief(q) for q in czq],
            })

        # ---------- 长篇匹配 ----------
        mt = pz.get("matching") or {}
        mtq = [q for q in qs if q.get("kind") == "matching"]
        if (mt.get("paragraphs") or {}) and mtq:
            groups["matching"].append({
                "id": "%s|M|1" % pid, "pid": pid, "title": title, "type": "matching",
                "no1": mtq[0]["no"], "no2": mtq[-1]["no"],
                "paras": mt.get("paragraphs") or {}, "letters": mt.get("letters") or [],
                "qs": [_q_brief(q) for q in mtq],
            })

        # ---------- 仔细阅读：按 passage1 / passage2 分组 ----------
        for key in ("passage1", "passage2"):
            pg = pz.get(key) or {}
            if not pg.get("text"):
                continue
            rq = [q for q in qs if q.get("part") == "reading" and q.get("passage") == key]
            if not rq and key == "passage1":
                # 少数源库残缺套：阅读题没写 passage 字段，但只有 passage1 正文
                rq = [q for q in qs if q.get("part") == "reading"
                      and q.get("kind") == "mcq" and not q.get("passage")]
            if not rq:
                continue
            groups["reading"].append({
                "id": "%s|R|%s" % (pid, key), "pid": pid, "title": title, "type": "reading",
                "no1": rq[0]["no"], "no2": rq[-1]["no"],
                "text": pg["text"], "qs": [_q_brief(q) for q in rq],
            })

    out = {"groups": groups,
           "counts": {k: {"groups": len(v), "questions": sum(len(g["qs"]) for g in v)}
                      for k, v in groups.items()}}
    with io.open(os.path.join(DATA, "drill.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("drill: " + " · ".join("%s %d组/%d题" % (k, v["groups"], v["questions"]) for k, v in out["counts"].items()) +
          " -> %.2fMB" % (os.path.getsize(os.path.join(DATA, "drill.json")) / 1e6))
    return out


TOKEN_RE = re.compile(r"[a-z]+")

TOP_STOP = set((
    "a an the and or but if because so that this these those of to in on at by for from with without "
    "as than then there here it its is are was were be been being do does did have has had will would "
    "can could may might must not no yes you your we our they their he she his her him them i me my us "
    "who whom whose which what when where why how all any some more most other another such only very "
    "just also too both each few many much own same up out over under again further once about into "
    "through during before after above below between"
).split())


def _tokens(text):
    low = text.lower().replace("\u2019", "'")
    out = set()
    for w in TOKEN_RE.findall(low):
        out.add(w)
        if len(w) > 4:
            if w.endswith("ies"):
                out.add(w[:-3] + "y")
            if w.endswith("ves"):
                out.add(w[:-3] + "f")
            if w.endswith("es"):
                out.add(w[:-2])
            if w.endswith("s"):
                out.add(w[:-1])
            if w.endswith("ing"):
                out.add(w[:-3])
                out.add(w[:-3] + "e")
            if w.endswith("ed"):
                out.add(w[:-2])
                out.add(w[:-1])
    return out


def build_wordindex():
    """词 → 出现在哪些套真题；套题 → 本套的四级词（按全库出现频率排序）。"""
    bank_dir = os.path.join(DATA, "bank")
    with io.open(os.path.join(bank_dir, "manifest.json"), encoding="utf-8") as f:
        manifest = json.load(f)
    with io.open(os.path.join(DATA, "vocab.json"), encoding="utf-8") as f:
        vocab = json.load(f)

    papers = []
    toks = {}
    for e in manifest["exams"]:
        with io.open(os.path.join(bank_dir, e["id"] + ".json"), encoding="utf-8") as f:
            d = json.load(f)
        papers.append({"id": d["id"], "title": d["title"]})
        pz = d.get("passages") or {}
        parts = []
        if (pz.get("cloze") or {}).get("text"):
            parts.append(pz["cloze"]["text"])
        parts += list(((pz.get("matching") or {}).get("paragraphs") or {}).values())
        for k in ("passage1", "passage2"):
            if (pz.get(k) or {}).get("text"):
                parts.append(pz[k]["text"])
        for q in d["questions"]:
            if q.get("part") == "listening" and q.get("script"):
                parts.append(q["script"])
        toks[d["id"]] = _tokens("\n".join(parts))

    index = {}
    for row in vocab:
        w = str(row[0]).lower()
        if not w or " " in w:
            continue
        hits = [i for i, p in enumerate(papers) if w in toks[p["id"]]]
        if hits:
            index[w] = hits

    top = {}
    ids = [p["id"] for p in papers]
    for i, pid in enumerate(ids):
        words = [w for w, hs in index.items() if i in hs and w not in TOP_STOP]
        words.sort(key=lambda w: (-len(index[w]), w))
        top[pid] = words[:60]

    out = {"papers": papers, "index": index, "top": top}
    with io.open(os.path.join(DATA, "wordindex.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
    print("wordindex: %d 词有真题出处 · 平均 %.1f 套/词 -> %.2fMB" % (
        len(index), sum(len(v) for v in index.values()) / max(1, len(index)),
        os.path.getsize(os.path.join(DATA, "wordindex.json")) / 1e6))
    return out


def emit_js(name, obj):
    """同时输出 .js 版本，便于 file:// / WebView 下用 <script> 加载（避开 fetch 的跨源限制）。"""
    dst = os.path.join(DATA, name + ".js")
    with io.open(dst, "w", encoding="utf-8") as f:
        f.write("window.__DATA=window.__DATA||{};window.__DATA['%s']=" % name)
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";")


def emit_all_js():
    for fn in os.listdir(DATA):
        if fn.endswith(".json"):
            with io.open(os.path.join(DATA, fn), encoding="utf-8") as f:
                emit_js(fn[:-5], json.load(f))
    bank_dir = os.path.join(DATA, "bank")
    for fn in os.listdir(bank_dir):
        if fn.endswith(".json"):
            with io.open(os.path.join(bank_dir, fn), encoding="utf-8") as f:
                emit_js("bank/" + fn[:-5], json.load(f))
    print("js 版本已输出")


if __name__ == "__main__":
    build_vocab()
    build_bank()
    build_library()
    build_drill()
    build_wordindex()
    emit_all_js()
