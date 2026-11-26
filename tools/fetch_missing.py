"""补齐缺失考次（2025.06 / 2025.12 / 2026.06 等）并生成本地资料库清单。

    python tools/fetch_missing.py

只补 GitHub 上确实存在的文件；raw.githubusercontent 直连，html tree 页用于枚举。
"""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

REPO = "0609x/CET46-Resources"
BRANCH = "main"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "library")
SUBDIRS = ["真题PDF", "听力音频", "答案解析"]
MONTHS = ["2025.06", "2025.12", "2026.06"]
FILL = ["2020.07", "2022.09", "2023.03"]


def get(url, timeout=40, retries=5, binary=False):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            r = urllib.request.urlopen(req, timeout=timeout)
            return r.read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise last


def list_html(repo_path):
    url = f"https://github.com/{REPO}/tree/{BRANCH}/" + urllib.parse.quote(repo_path)
    html = get(url).decode("utf-8", "ignore")
    out = []
    for m in re.finditer(r'"path":"([^"]+)","contentType":"(file|directory)"', html):
        p, k = m.group(1), m.group(2)
        if p.startswith(repo_path + "/"):
            rel = p[len(repo_path) + 1:]
            if "/" not in rel:
                out.append((rel, k))
    return sorted(set(out))


def raw_get(repo_path):
    url = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/" + urllib.parse.quote(repo_path)
    return get(url, timeout=600)


def dest_of(repo_path, month):
    rel = repo_path.split(month + "/", 1)[1]
    return os.path.join(LIB, "四级真题", month, rel.replace("/", os.sep))


def fetch_month(month):
    base = "四级真题/" + month
    dirs = list_html(base)
    print(f"[{month}] 目录: {[d for d, k in dirs if k == 'directory']}")
    todo = []
    for sub in SUBDIRS:
        p = base + "/" + sub
        try:
            items = list_html(p)
        except Exception as e:  # noqa: BLE001
            print(f"  {sub} 枚举失败: {type(e).__name__}")
            continue
        for name, kind in items:
            if kind == "file":
                todo.append(p + "/" + name)
    got = miss = 0
    for repo_path in todo:
        d = dest_of(repo_path, month)
        if os.path.exists(d) and os.path.getsize(d) > 0:
            continue
        try:
            data = raw_get(repo_path)
        except Exception as e:  # noqa: BLE001
            print(f"  失败 {repo_path} {type(e).__name__}")
            miss += 1
            continue
        os.makedirs(os.path.dirname(d), exist_ok=True)
        with open(d, "wb") as f:
            f.write(data)
        got += 1
        print(f"  + {os.path.relpath(d, LIB)} {len(data)/1e6:.1f}MB")
    return got, miss, len(todo)


def write_manifest():
    root = os.path.join(LIB, "四级真题")
    months = {}
    for mon in sorted(os.listdir(root)):
        mdir = os.path.join(root, mon)
        if not os.path.isdir(mdir):
            continue
        subs = {}
        n = 0
        for sub in os.listdir(mdir):
            sdir = os.path.join(mdir, sub)
            if not os.path.isdir(sdir):
                continue
            files = []
            for dp, _, fns in os.walk(sdir):
                for f in fns:
                    if f.endswith(".part"):
                        continue
                    full = os.path.join(dp, f)
                    rel = os.path.relpath(full, mdir).replace("\\", "/")
                    files.append({
                        "name": f,
                        "rel": rel,
                        "size": os.path.getsize(full),
                        "url": f"https://github.com/{REPO}/blob/{BRANCH}/"
                               + urllib.parse.quote("四级真题/" + mon + "/" + rel),
                    })
                    n += 1
            if files:
                subs[sub] = sorted(files, key=lambda x: x["name"])
        if subs:
            has_audio = "听力音频" in subs
            months[mon] = {"month": mon, "hasAudio": has_audio,
                           "files": n, "size": sum(f["size"] for s in subs.values() for f in s),
                           "groups": subs}
    out = {"repo": REPO, "count": len(months),
           "totalFiles": sum(m["files"] for m in months.values()),
           "totalSize": sum(m["size"] for m in months.values()),
           "months": months}
    path = os.path.join(LIB, "manifest.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)
    print(f"manifest: {len(months)} 考次 {out['totalFiles']} 文件 "
          f"{out['totalSize']/1e6:.1f}MB -> {path}")
    return out


def main():
    total_got = 0
    for m in MONTHS + FILL:
        try:
            g, miss, todo = fetch_month(m)
            print(f"[{m}] 新下载 {g} 个 / 共 {todo} 个，失败 {miss}")
            total_got += g
        except Exception as e:  # noqa: BLE001
            print(f"[{m}] 整批失败: {type(e).__name__} {str(e)[:60]}")
    print("新增文件:", total_got)
    write_manifest()


if __name__ == "__main__":
    sys.exit(main())
