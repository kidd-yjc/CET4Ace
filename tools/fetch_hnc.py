"""Scrape happynchubby CET-4 catalog: per-session PDF (真题/解析) + audio links."""
import html
import json
import os
import re
import urllib.parse
import urllib.request

URL = "https://www.happynchubby.xyz/%E8%80%8D%E5%8D%80%E5%B0%88%E5%8D%80/cet-4/"
OUT = r"tools\_dl\hnc_links.json"

req = urllib.request.Request(URL, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
raw = urllib.request.urlopen(req, timeout=90).read().decode("utf-8", "replace")

parts = raw.split('class="hnc-cet4-exam-title"')
sessions = []
for chunk in parts[1:]:
    m = re.match(r'>\s*(\d{4})年(\d{1,2})月', chunk)
    if not m:
        continue
    session = {"session": f"{m.group(1)}.{int(m.group(2)):02d}", "pdfs": [], "audio": []}
    body = chunk.split('class="hnc-cet4-exam"')[0]
    for a in re.finditer(r'<a[^>]+href="([^"]+\.pdf)"[^>]*>(.*?)</a>', body, re.S):
        url = html.unescape(a.group(1))
        label = html.unescape(re.sub(r'<[^>]+>', '', a.group(2))).strip()
        dec = urllib.parse.unquote(url)
        name = re.search(r'CET4_\d{6}_(.+?)_第(\d)套\.pdf', dec)
        kind = "解析" if ("%E8%A7%A3%E6%9E%8B" in url or "解析" in label) else "真题"
        session["pdfs"].append({"kind": kind, "set": int(name.group(2)) if name else 0,
                                "label": label, "url": url})
    for a in re.finditer(r'data-audio-url="([^"]+)"', body):
        session["audio"].append(html.unescape(a.group(1)))
    sessions.append(session)

sessions.sort(key=lambda s: s["session"], reverse=True)
dup = []
for s in sessions:
    seen = set()
    for p in s["pdfs"]:
        k = p["url"]
        if k in seen:
            dup.append((s["session"], k))
        seen.add(k)
    s["pdfs"] = [p for p in s["pdfs"] if p["url"] in seen]
    s["audio"] = sorted(set(s["audio"]))
json.dump(sessions, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("sessions", len(sessions), "dups", dup[:5])
for s in sessions:
    a = sorted(p["set"] for p in s["pdfs"] if p["kind"] == "真题")
    e = sorted(p["set"] for p in s["pdfs"] if p["kind"] == "解析")
    print(s["session"], "真题", a, "解析", e, "音", len(s["audio"]))
