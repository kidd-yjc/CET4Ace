"""按命名规律直接尝试 raw 下载补齐 2025.06 / 2025.12 的真题 PDF。

    python tools/fetch_guess.py
"""
import os
import urllib.parse
import urllib.request

REPO = "0609x/CET46-Resources"
BRANCH = "main"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "library", "四级真题")
UA = {"User-Agent": "Mozilla/5.0"}

CANDIDATES = []
for mon, tag in [("2025.06", "2025_06"), ("2025.12", "2025_12")]:
    for i in (1, 2, 3):
        CANDIDATES.append((
            mon,
            f"真题PDF/cet4_{tag}_{i}.pdf",
        ))

EXTRA = [
    ("2025.06", "真题PDF/2025年6月英语四级真题（第1套）.pdf"),
    ("2025.06", "真题PDF/2025年6月英语四级真题（第2套）.pdf"),
    ("2025.06", "真题PDF/2025年6月英语四级真题（第3套）.pdf"),
]


def try_get(mon, rel):
    repo_path = f"四级真题/{mon}/{rel}"
    url = f"https://raw.githubusercontent.com/{REPO}/{BRANCH}/" + urllib.parse.quote(repo_path)
    dest = os.path.join(LIB, mon, rel.replace("/", os.sep))
    if os.path.exists(dest) and os.path.getsize(dest) > 0:
        return "skip"
    try:
        r = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60)
        data = r.read()
    except Exception as e:  # noqa: BLE001
        return f"miss {type(e).__name__}"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, "wb") as f:
        f.write(data)
    return f"OK {len(data)/1e6:.2f}MB"


def main():
    hit = 0
    for mon, rel in CANDIDATES + EXTRA:
        res = try_get(mon, rel)
        print(f"{mon} {rel} -> {res}")
        if res.startswith("OK"):
            hit += 1
    print("新增", hit, "个")


if __name__ == "__main__":
    main()
