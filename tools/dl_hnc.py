"""Download 解析 PDFs (and 真题 PDFs where useful) from happynchubby CDN."""
import json
import os
import urllib.parse
import urllib.request

LINKS = json.load(open(r"tools\_dl\hnc_links.json", encoding="utf-8"))
DST = r"tools\_dl\hnc"
os.makedirs(DST, exist_ok=True)

targets = []
for s in LINKS:
    if s["session"] > "2018.12" or s["session"] < "2014.06":
        continue
    for p in s["pdfs"]:
        if p["kind"] == "解析":
            targets.append((s["session"], p["set"], "ans", p["url"]))
        elif p["kind"] == "真题":
            targets.append((s["session"], p["set"], "q", p["url"]))

print("targets", len(targets))
for sess, st, kind, url in targets:
    fn = os.path.join(DST, f"{sess}_s{st}_{kind}.pdf")
    if os.path.exists(fn) and os.path.getsize(fn) > 50000:
        print("skip", fn, os.path.getsize(fn))
        continue
    try:
        r = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        data = urllib.request.urlopen(r, timeout=120).read()
        open(fn, "wb").write(data)
        print("ok", os.path.basename(fn), len(data))
    except Exception as e:  # noqa: BLE001
        print("ERR", sess, st, kind, type(e).__name__, str(e)[:60])
print("done")
print(sorted(os.listdir(DST)))
