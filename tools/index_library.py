"""从 library/四级真题 目录生成本地索引 library/manifest.json（供 build_data.py 使用）。

    python tools/index_library.py
"""
import io
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LIB = os.path.join(ROOT, "library", "四级真题")


def main():
    years = {}
    for mon in sorted(os.listdir(LIB)):
        mdir = os.path.join(LIB, mon)
        if not os.path.isdir(mdir):
            continue
        subs = {}
        for sub in sorted(os.listdir(mdir)):
            sdir = os.path.join(mdir, sub)
            if not os.path.isdir(sdir):
                continue
            names = []
            for dp, _, fns in os.walk(sdir):
                for f in fns:
                    if f.endswith(".part"):
                        continue
                    names.append(os.path.relpath(os.path.join(dp, f), sdir).replace("\\", "/"))
            if names:
                subs[sub] = sorted(names)
        if subs:
            years[mon] = subs

    size = sum(os.path.getsize(os.path.join(dp, f))
               for dp, _, fs in os.walk(LIB) for f in fs if not f.endswith(".part"))
    out = {"repo": "0609x/CET46-Resources", "branch": "main",
           "count": len(years), "totalSize": size, "years": years}
    with io.open(os.path.join(ROOT, "library", "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False)

    total = sum(len(v) for s in years.values() for v in s.values())
    print(f"{len(years)} 个考次 / {total} 个文件 / {size/1e6:.1f}MB")
    for mon in sorted(years):
        print(f"  {mon}: " + ", ".join(f"{k}({len(v)})" for k, v in years[mon].items()))


if __name__ == "__main__":
    main()
