"""下载 ShepiTT 题库配套听力音频，按内容哈希去重后放进 app/audio。

    python tools/fetch_audio.py [--workers 3]

产出：
  app/audio/<hash8>.mp3            去重后的音频
  app/data/bank_raw/*.json         写入 audioFile 字段
"""
import hashlib
import json
import os
import re
import shutil
import sqlite3
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(ROOT, "tools", "_dl", "shepi.db")
CACHE = os.path.join(ROOT, "tools", "_dl", "audio")
APP_AUDIO = os.path.join(ROOT, "app", "audio")
RAW = os.path.join(ROOT, "app", "data", "bank_raw")
BASE = "https://cdn.jsdelivr.net/gh/ShepiTT/CET_practice_questions@main/data/audio/"


def fetch_one(src):
    name = src.replace(".pdf", ".mp3")
    dest = os.path.join(CACHE, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 100_000:
        return name, "skip"
    os.makedirs(CACHE, exist_ok=True)
    last = None
    for attempt in range(4):
        try:
            r = urllib.request.urlopen(
                urllib.request.Request(BASE + name, headers={"User-Agent": "Mozilla/5.0"}),
                timeout=180)
            data = r.read()
            if len(data) < 100_000:
                raise IOError("too small")
            tmp = dest + ".part"
            with open(tmp, "wb") as f:
                f.write(data)
            os.replace(tmp, dest)
            return name, f"ok {len(data)/1e6:.1f}MB"
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(3 * (attempt + 1))
    return name, f"fail {type(last).__name__}"


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main():
    con = sqlite3.connect(DB)
    srcs = [r[0] for r in con.execute(
        "select distinct source_file from question where source_file like '%CET4%' order by source_file")]
    con.close()
    print(f"待下载 {len(srcs)} 个音频")

    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = {ex.submit(fetch_one, s): s for s in srcs}
        for i, fut in enumerate(as_completed(futs), 1):
            name, st = fut.result()
            print(f"[{i}/{len(srcs)}] {name} {st}")

    # 去重
    os.makedirs(APP_AUDIO, exist_ok=True)
    hashes = {}
    mapping = {}
    for src in srcs:
        name = src.replace(".pdf", ".mp3")
        p = os.path.join(CACHE, name)
        if not os.path.exists(p):
            mapping[src] = None
            continue
        h = md5(p)[:8]
        if h not in hashes:
            hashes[h] = p
            shutil.copy2(p, os.path.join(APP_AUDIO, f"{h}.mp3"))
        mapping[src] = h

    # 写回 bank_raw
    files = {}
    for fn in os.listdir(RAW):
        if fn.startswith("cet4_") and fn.endswith(".json"):
            with open(os.path.join(RAW, fn), encoding="utf-8") as f:
                d = json.load(f)
            files[d.get("source")] = (fn, d)

    updated = 0
    for src, h in mapping.items():
        if src not in files:
            continue
        fn, d = files[src]
        d["audioFile"] = f"{h}.mp3" if h else ""
        with open(os.path.join(RAW, fn), "w", encoding="utf-8") as f:
            json.dump(d, f, ensure_ascii=False, separators=(",", ":"))
        updated += 1

    uniq = len(hashes)
    size = sum(os.path.getsize(os.path.join(APP_AUDIO, f)) for f in os.listdir(APP_AUDIO))
    print(f"\n音频: {len(mapping)} 套 -> 去重后 {uniq} 个文件, {size/1e6:.1f}MB")
    print("缺音频的套:", [s for s, h in mapping.items() if not h])


if __name__ == "__main__":
    main()
