"""下载 0609x/CET46-Resources 四级真题（2014.06–2026.06）到本地 library 目录。

用法：
    python tools/fetch_library.py                # 只下载 真题PDF
    python tools/fetch_library.py --with-ans     # 同时下载 答案解析
    python tools/fetch_library.py --with-audio   # 同时下载 听力音频
    python tools/fetch_library.py --all          # 全都要

特性：断点续传（已存在且大小一致的文件跳过）、多线程、生成 library/manifest.json
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

REPO = "0609x/CET46-Resources"
BRANCH = "main"
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "library")


def http_get(url, timeout=60, retries=6):
    last = None
    for i in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            return urllib.request.urlopen(req, timeout=timeout).read()
        except Exception as e:  # noqa: BLE001
            last = e
            time.sleep(2 * (i + 1))
    raise last


CACHE = os.path.join(ROOT, "tools", "_dl", "_tree_cache.json")


def _load_cache():
    try:
        with open(CACHE, encoding="utf-8") as f:
            return json.load(f)
    except Exception:  # noqa: BLE001
        return {}


def _save_cache(c):
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    with open(CACHE, "w", encoding="utf-8") as f:
        json.dump(c, f, ensure_ascii=False, indent=1)


def list_dir(repo_path):
    """通过 GitHub tree 页面 HTML 解析目录内文件路径（结果缓存，避免重复翻页）。"""
    cache = _load_cache()
    if repo_path in cache:
        return [tuple(x) for x in cache[repo_path]]
    url = f"https://github.com/{REPO}/tree/{BRANCH}/" + urllib.parse.quote(repo_path)
    html = http_get(url).decode("utf-8", "ignore")
    paths = set()
    for m in re.finditer(r'"path":"([^"]+)","contentType":"(file|directory)"', html):
        p, kind = m.group(1), m.group(2)
        if p.startswith(repo_path + "/"):
            rel = p[len(repo_path) + 1:]
            if "/" not in rel:
                paths.add((rel, kind))
    result = sorted(paths)
    cache[repo_path] = [list(x) for x in result]
    _save_cache(cache)
    return result


def raw_url(repo_path):
    return f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/" + urllib.parse.quote(repo_path)


def download(repo_path, dest):
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return dest, os.path.getsize(dest), True
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    data = http_get(raw_url(repo_path), timeout=300)
    tmp = dest + ".part"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, dest)
    return dest, len(data), False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--with-ans", action="store_true")
    ap.add_argument("--with-audio", action="store_true")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    with_ans = args.with_ans or args.all
    with_audio = args.with_audio or args.all

    years_dir = "四级真题"
    year_dirs = [d for d, k in list_dir(years_dir) if k == "directory"]
    year_dirs = sorted([d for d in year_dirs if re.match(r"20\d\d\.\d\d", d)])
    print(f"发现 {len(year_dirs)} 个考次: {year_dirs[0]} .. {year_dirs[-1]}")

    want_dirs = {"真题PDF"}
    if with_ans:
        want_dirs.add("答案解析")
    if with_audio:
        want_dirs.add("听力音频")

    tasks = []
    manifest = {}
    for yd in year_dirs:
        base = f"{years_dir}/{yd}"
        for sub, kind in list_dir(base):
            if kind != "directory" or sub not in want_dirs:
                continue
            for fname, fkind in list_dir(f"{base}/{sub}"):
                if fkind != "file":
                    continue
                if not fname.lower().endswith((".pdf", ".mp3", ".doc", ".docx", ".md")):
                    continue
                repo_path = f"{base}/{sub}/{fname}"
                dest = os.path.join(LIB, "四级真题", yd, sub, fname)
                tasks.append((repo_path, dest, yd, sub, fname))
                manifest.setdefault(yd, {}).setdefault(sub, []).append(fname)

    print(f"待处理文件 {len(tasks)} 个")
    done = 0
    total_bytes = 0
    failures = []
    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        futs = {ex.submit(download, t[0], t[1]): t for t in tasks}
        for fut in as_completed(futs):
            t = futs[fut]
            try:
                dest, size, skipped = fut.result()
                done += 1
                total_bytes += size
                flag = "skip" if skipped else "ok"
                print(f"[{done}/{len(tasks)}] {flag} {t[2]}/{t[4]} {size/1e6:.1f}MB")
            except Exception as e:  # noqa: BLE001
                failures.append((t[0], str(e)))
                print(f"[{done}/{len(tasks)}] FAIL {t[2]}/{t[4]}: {e}")

    mf = os.path.join(LIB, "manifest.json")
    with open(mf, "w", encoding="utf-8") as f:
        json.dump({"repo": REPO, "branch": BRANCH, "grade": "CET4", "years": manifest},
                  f, ensure_ascii=False, indent=2)
    print(f"\n完成 {done}/{len(tasks)}，累计 {total_bytes/1e9:.2f}GB，失败 {len(failures)}")
    if failures:
        print("失败清单：")
        for p, e in failures[:20]:
            print(" -", p, e)


if __name__ == "__main__":
    sys.exit(main())
