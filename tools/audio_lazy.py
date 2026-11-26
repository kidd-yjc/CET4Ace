"""Download happynchubby listening audio for 2015-2018 (sets 1/2) and transcode to mono mp3."""
import json
import os
import subprocess
import urllib.parse
import urllib.request

import imageio_ffmpeg

LINKS = json.load(open(r"tools\_dl\hnc_links.json", encoding="utf-8"))
RAW = r"tools\_dl\audio18"
OUT = r"app\audio"
FF = imageio_ffmpeg.get_ffmpeg_exe()
os.makedirs(RAW, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

WANT = {"2015.06", "2015.12", "2016.06", "2016.12", "2017.06", "2017.12", "2018.06", "2018.12"}

for s in LINKS:
    if s["session"] not in WANT:
        continue
    urls = s["audio"][:2]
    for idx, url in enumerate(urls, start=1):
        dec = urllib.parse.unquote(os.path.basename(url))
        setno = 2 if "第2套" in dec else 1
        name = f"{s['session'].replace('.', '_')}_{setno}"
        raw = os.path.join(RAW, name + ".m4a")
        mp3 = os.path.join(OUT, name + ".mp3")
        if not (os.path.exists(raw) and os.path.getsize(raw) > 100000):
            try:
                r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
                data = urllib.request.urlopen(r, timeout=180).read()
                open(raw, "wb").write(data)
                print("dl", name, len(data) // 1024, "KB")
            except Exception as e:  # noqa: BLE001
                print("DLERR", name, type(e).__name__, str(e)[:50])
                continue
        if os.path.exists(mp3) and os.path.getsize(mp3) > 100000:
            print("skip mp3", name, os.path.getsize(mp3) // 1024, "KB")
        else:
            cmd = [FF, "-y", "-loglevel", "error", "-i", raw, "-ac", "1", "-ar", "44100", "-b:a", "32k", mp3]
            p = subprocess.run(cmd, capture_output=True, text=True)
            if p.returncode != 0:
                print("FFERR", name, p.stderr[-200:])
                continue
            print("mp3", name, os.path.getsize(mp3) // 1024, "KB")
        # 回写 bank
        bank = os.path.join(r"app\data\bank_raw", f"cet4_{s['session'].replace('.', '_')}_{setno}.json")
        if os.path.exists(bank):
            d = json.load(open(bank, encoding="utf-8"))
            d["hasAudio"] = True
            d["audioFile"] = name + ".mp3"
            d["readingOnly"] = False
            json.dump(d, open(bank, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
            print("bank updated", os.path.basename(bank))
print("done")
