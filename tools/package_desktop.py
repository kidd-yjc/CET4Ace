"""把成果打包放到桌面：APK + 完整源码 ZIP + 真题资料 ZIP。

    python tools/package_desktop.py
"""
import os
import shutil
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESKTOP = os.path.join(os.environ["USERPROFILE"], "Desktop")
OUT = os.path.join(DESKTOP, "四级通关")

# 源码 ZIP 里要排除的东西（体积大、调试用、或可再生成）
EXCLUDE_DIRS = {"build", "dist", "library", "resources", "tools/_dl", "tools/sdk", "tools/jdk",
                "tools/__pycache__", "tools/keystore"}
EXCLUDE_FILES = {"app/data/vocab_raw.jsonl"}


def add_zip(zf, path, arc):
    zf.write(path, arc)


def make_source_zip(dst):
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for dp, dns, fns in os.walk(ROOT):
            rel = os.path.relpath(dp, ROOT).replace("\\", "/")
            if rel == ".":
                rel = ""
            if any(rel == e or rel.startswith(e + "/") for e in EXCLUDE_DIRS):
                dns[:] = []
                continue
            dns[:] = [d for d in dns if not any(
                (os.path.join(rel, d) if rel else d) == e or
                (os.path.join(rel, d) if rel else d).startswith(e + "/")
                for e in EXCLUDE_DIRS)]
            for f in fns:
                full = os.path.join(dp, f)
                relfile = (rel + "/" if rel else "") + f
                if relfile in EXCLUDE_FILES or relfile.startswith("tools/_"):
                    continue
                if os.path.getsize(full) > 60 * 1024 * 1024:
                    continue
                arc = ("CET4Ace/" + relfile)
                z.write(full, arc)
    return dst


def make_library_zip(dst):
    lib = os.path.join(ROOT, "library")
    if not os.path.isdir(lib):
        return None
    with zipfile.ZipFile(dst, "w", zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for dp, _, fns in os.walk(lib):
            for f in fns:
                full = os.path.join(dp, f)
                arc = "四级真题资料/" + os.path.relpath(full, lib).replace("\\", "/")
                z.write(full, arc)
    return dst


def main():
    os.makedirs(OUT, exist_ok=True)

    apk = os.path.join(ROOT, "dist", "CET4Ace.apk")
    if os.path.exists(apk):
        shutil.copy2(apk, os.path.join(OUT, "CET4Ace.apk"))
        print("APK ->", os.path.join(OUT, "CET4Ace.apk"),
              f"{os.path.getsize(apk)/1e6:.1f}MB")
    else:
        print("!! 还没打 APK，先运行 tools/build_apk.py")

    src = make_source_zip(os.path.join(OUT, "CET4Ace-完整源码.zip"))
    print("源码 ZIP ->", src, f"{os.path.getsize(src)/1e6:.1f}MB")

    libz = make_library_zip(os.path.join(OUT, "四级真题资料2014-2026.zip"))
    if libz:
        print("资料 ZIP ->", libz, f"{os.path.getsize(libz)/1e6:.1f}MB")
    else:
        print("!! library 目录不存在，跳过资料 ZIP")

    readme = os.path.join(ROOT, "README.md")
    if os.path.exists(readme):
        shutil.copy2(readme, os.path.join(OUT, "使用说明.md"))
    print("\n桌面输出目录:", OUT)


if __name__ == "__main__":
    main()
