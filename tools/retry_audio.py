import os
import shutil
import time
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "_dl", "audio")
OLDROOT = os.path.join(ROOT, "tools", "_dl")
BASES = [
    "https://fastly.jsdelivr.net/gh/ShepiTT/CET_practice_questions@main/data/audio/",
    "https://cdn.jsdelivr.net/gh/ShepiTT/CET_practice_questions@main/data/audio/",
    "https://raw.githubusercontent.com/ShepiTT/CET_practice_questions/main/data/audio/",
]
MISSING = [
    "2019-06-CET4-1", "2019-06-CET4-2", "2019-06-CET4-3",
    "2020-07-CET4-1", "2020-09-CET4-1", "2020-09-CET4-2", "2020-09-CET4-3",
    "2020-12-CET4-1", "2020-12-CET4-2", "2020-12-CET4-3",
    "2021-06-CET4-1", "2021-06-CET4-2", "2021-06-CET4-3",
    "2021-12-CET4-1", "2021-12-CET4-3",
    "2022-12-CET4-1", "2022-12-CET4-2", "2022-12-CET4-3",
    "2024-12-CET4-1",
]

os.makedirs(CACHE, exist_ok=True)
ok, fail = [], []
for base in MISSING:
    name = base + ".mp3"
    dest = os.path.join(CACHE, name)
    if os.path.exists(dest) and os.path.getsize(dest) > 100_000:
        ok.append(name)
        continue
    src_root = os.path.join(OLDROOT, name)
    if os.path.exists(src_root) and os.path.getsize(src_root) > 100_000:
        shutil.copy2(src_root, dest)
        ok.append(name)
        print(name, "复用已下载文件")
        continue
    for attempt in range(len(BASES) * 2):
        url = BASES[attempt % len(BASES)] + name
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            data = urllib.request.urlopen(req, timeout=240).read()
            if len(data) < 100_000:
                raise IOError("too small")
            tmp = dest + ".part"
            open(tmp, "wb").write(data)
            os.replace(tmp, dest)
            ok.append(name)
            print(name, f"OK {len(data)/1e6:.1f}MB", url.split("/")[2])
            break
        except Exception as e:  # noqa: BLE001
            print(name, f"try{attempt+1} {type(e).__name__} {str(e)[:50]}")
            time.sleep(6)
    else:
        fail.append(name)

print(f"\n成功 {len(ok)} / {len(MISSING)}，失败 {len(fail)}: {fail}")
