"""整仓归档补齐：下 codeload 的 tar.gz，只补 library 里缺的真题文件。

    python tools/fetch_archive.py

有些网络环境 github.com 的 tree 页与 API 都不可用，但 codeload + raw 可用，
所以用整包下载 + 只取需要路径的方式补齐。
"""
import os
import sys
import tarfile
import time
import urllib.request

REPO = "0609x/CET46-Resources"
UA = "Mozilla/5.0"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "library")
DL = os.path.join(ROOT, "tools", "_dl")
TAR = os.path.join(DL, "repo.tar.gz")


def download():
    if os.path.exists(TAR) and os.path.getsize(TAR) > 50 * 1024 * 1024:
        print(f"已有归档 {os.path.getsize(TAR)/1e6:.0f}MB")
        return TAR
    os.makedirs(DL, exist_ok=True)
    url = f"https://codeload.github.com/{REPO}/tar.gz/refs/heads/main"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    r = urllib.request.urlopen(req, timeout=60)
    tmp = TAR + ".part"
    got = 0
    t0 = time.time()
    with open(tmp, "wb") as f:
        while True:
            b = r.read(1024 * 512)
            if not b:
                break
            f.write(b)
            got += len(b)
            if got % (30 * 1024 * 1024) < 1024 * 512:
                print(f"  归档 {got/1e6:.0f}MB  {got/1e6/max(time.time()-t0,1):.2f}MB/s")
    os.replace(tmp, TAR)
    print(f"归档完成 {got/1e6:.0f}MB")
    return TAR


def main():
    tar = download()
    root_prefix = None
    added = 0
    with tarfile.open(tar, "r:gz") as tf:
        members = [m for m in tf.getmembers() if m.isfile()]
        for m in members:
            name = m.name
            if "四级真题/" not in name:
                continue
            rel = name.split("四级真题/", 1)[1]
            if rel.startswith("/") or ".." in rel:
                continue
            dest = os.path.join(LIB, "四级真题", rel.replace("/", os.sep))
            if os.path.exists(dest) and os.path.getsize(dest) >= m.size:
                continue
            os.makedirs(os.path.dirname(dest), exist_ok=True)
            f = tf.extractfile(m)
            if f is None:
                continue
            with open(dest, "wb") as out:
                out.write(f.read())
            added += 1
            print(f"  + {rel} {m.size/1e6:.1f}MB")
    print("补齐文件数:", added)
    return added


if __name__ == "__main__":
    sys.exit(main())
