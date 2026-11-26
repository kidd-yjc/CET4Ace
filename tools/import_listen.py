import html
import json
import os
import re
import subprocess

import imageio_ffmpeg

HTML_DIR = r"tools\_dl\lazy\listen"
BANK_DIR = r"app\data\bank_raw"
AUDIO_DIR = r"app\audio"
PAIRS = []
for s in ["2016.06", "2016.12", "2017.06", "2017.12", "2018.06", "2018.12"]:
    for n in (1, 2):
        PAIRS.append((f"{s.replace('.', '-')}-{n}", f"{s.replace('.', '_')}_{n}"))


def clean(s):
    s = re.sub(r"<[^>]+>", "", s)
    s = html.unescape(s)
    s = s.replace("\u00a0", " ")
    s = re.sub(r"\s+", " ", s).strip()
    s = re.sub(r"^\d{1,2}(?=[A-Z])", "", s)
    return s


def duration(path):
    ff = imageio_ffmpeg.get_ffmpeg_exe()
    r = subprocess.run([ff, "-i", path], capture_output=True, text=True, errors="ignore")
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", r.stderr)
    if not m:
        return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def parse_page(pid):
    t = open(os.path.join(HTML_DIR, f"sec_{pid}.html"), encoding="utf-8").read()
    anchors = [(m.start(), int(m.group(1))) for m in re.finditer(r'id="lt-(\d+)"', t)]
    by_no = {}
    modules = []
    for i, (pos, first) in enumerate(anchors):
        end = anchors[i + 1][0] if i + 1 < len(anchors) else len(t)
        block = t[pos:end]
        hm = re.search(r"Questions?\s+(\d+)\s*(?:and\s+(\d+)|to\s+(\d+))\s+are based", block)
        if not hm:
            continue
        last = int(hm.group(2) or hm.group(3) or hm.group(1))
        sm = re.search(r'data-listen-seek="([0-9.]+)"', block)
        start = float(sm.group(1)) if sm else None
        en = [clean(x) for x in re.findall(r'<p[^>]*class="lt-en"[^>]*>(.*?)</p>', block, re.S)]
        zh = [clean(x) for x in re.findall(r'<p[^>]*class="lt-zh"[^>]*>(.*?)</p>', block, re.S)]
        if not en:
            continue
        m = {
            "first": first,
            "last": last,
            "start": start,
            "script": "\n\n".join(en),
            "scriptCn": "\n\n".join(zh),
        }
        modules.append(m)
        for no in range(first, last + 1):
            by_no[no] = m
    return by_no, modules


total = 0
for pid, bid in PAIRS:
    by_no, modules = parse_page(pid)
    p = os.path.join(BANK_DIR, f"cet4_{bid}.json")
    if not os.path.exists(p):
        print("missing bank", bid)
        continue
    d = json.load(open(p, encoding="utf-8"))
    for q in d["questions"]:
        if q["part"] != "listening":
            continue
        m = by_no.get(q["no"])
        if m:
            q["script"] = m["script"]
            q["scriptCn"] = m["scriptCn"]
            q["audioStart"] = m["start"]
            total += 1
    d["listening"] = modules
    ap = os.path.join(AUDIO_DIR, f"{bid}.mp3")
    if os.path.exists(ap):
        sec = duration(ap)
        if sec:
            d["audioDuration"] = round(sec, 1)
    json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(bid, "mods", len(modules), "dur", d.get("audioDuration"), "scripted", sum(1 for q in d["questions"] if q.get("script")))
print("total scripted", total)
