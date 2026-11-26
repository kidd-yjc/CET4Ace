"""把听力音频转成语音码率（64kbps 单声道），按内容哈希去重后放进 app/audio。"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

import imageio_ffmpeg

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CACHE = os.path.join(ROOT, "tools", "_dl", "audio")
TMP = os.path.join(ROOT, "tools", "_dl", "audio_small")
APP_AUDIO = os.path.join(ROOT, "app", "audio")
RAW = os.path.join(ROOT, "app", "data", "bank_raw")
FF = imageio_ffmpeg.get_ffmpeg_exe()


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for c in iter(lambda: f.read(1 << 20), b""):
            h.update(c)
    return h.hexdigest()


def compress(src, dest):
    cmd = [FF, "-y", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", "32000",
           "-b:a", "56k", dest]
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0 or not os.path.exists(dest):
        return False
    return True


def main():
    os.makedirs(TMP, exist_ok=True)
    os.makedirs(APP_AUDIO, exist_ok=True)
    mp3s = [f for f in os.listdir(CACHE) if f.endswith(".mp3")]
    mapping = {}
    keep = {}
    total_before = total_after = 0
    for f in sorted(mp3s):
        src = os.path.join(CACHE, f)
        small = os.path.join(TMP, f)
        total_before += os.path.getsize(src)
        if not os.path.exists(small) or os.path.getsize(small) < 20000:
            if not compress(src, small):
                print("压缩失败", f)
                continue
        total_after += os.path.getsize(small)
        h = md5(small)[:8]
        if h not in keep:
            keep[h] = small
            shutil.copy2(small, os.path.join(APP_AUDIO, h + ".mp3"))
        mapping[f.replace(".mp3", ".pdf")] = h

    # 清理旧命名音频
    for f in os.listdir(APP_AUDIO):
        if f.startswith("cet4_"):
            os.remove(os.path.join(APP_AUDIO, f))

    for fn in os.listdir(RAW):
        if fn.startswith("cet4_") and fn.endswith(".json"):
            p = os.path.join(RAW, fn)
            d = json.load(open(p, encoding="utf-8"))
            h = mapping.get(d.get("source"))
            d["audioFile"] = (h + ".mp3") if h else ""
            json.dump(d, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))

    size = sum(os.path.getsize(os.path.join(APP_AUDIO, f)) for f in os.listdir(APP_AUDIO))
    print(f"源 {len(mp3s)} 个 {total_before/1e6:.0f}MB -> 压缩 {total_after/1e6:.0f}MB -> "
          f"去重 {len(keep)} 个, {size/1e6:.0f}MB")


if __name__ == "__main__":
    sys.exit(main())
