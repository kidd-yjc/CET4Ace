"""下载并解压 Android 构建工具（走国内可访问镜像，不依赖 Google 域名）。

    python tools/fetch_android_tools.py

产出：
    tools/jdk/                      完整 JDK（含 javac）
    tools/sdk/build-tools/34.0.0/   aapt2 / d8 / apksigner / zipalign
    tools/sdk/platforms/android-34/android.jar
"""
import os
import shutil
import time
import urllib.request
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
DL = os.path.join(TOOLS, "_dl")
JDK_DIR = os.path.join(TOOLS, "jdk")
SDK = os.path.join(TOOLS, "sdk")

# 每个文件给多个可尝试的地址（按顺序）
SOURCES = {
    "jdk": [
        "https://mirrors.huaweicloud.com/openjdk/17.0.2/openjdk-17.0.2_windows-x64_bin.zip",
        "https://aka.ms/download-jdk/microsoft-jdk-17-windows-x64.zip",
        "https://github.com/adoptium/temurin17-binaries/releases/download/"
        "jdk-17.0.13%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.zip",
    ],
    "buildtools": [
        "https://mirrors.cloud.tencent.com/AndroidSDK/build-tools_r34-windows.zip",
        "https://mirrors.huaweicloud.com/android/repository/build-tools_r34-windows.zip",
    ],
    "platform": [
        "https://mirrors.cloud.tencent.com/AndroidSDK/platform-34-ext12_r01.zip",
        "https://mirrors.cloud.tencent.com/AndroidSDK/platform-34_r03.zip",
    ],
}


def fetch(urls, dest, label, expect_min_mb=1):
    if os.path.exists(dest) and os.path.getsize(dest) > expect_min_mb * 1024 * 1024:
        print(f"  {label} 已存在 {os.path.getsize(dest)/1e6:.1f}MB，跳过")
        return dest
    for url in urls:
        for attempt in range(4):
            tmp = dest + ".part"
            have = os.path.getsize(tmp) if os.path.exists(tmp) else 0
            try:
                headers = {"User-Agent": "Mozilla/5.0"}
                if have:
                    headers["Range"] = f"bytes={have}-"
                req = urllib.request.Request(url, headers=headers)
                r = urllib.request.urlopen(req, timeout=60)
                if have and r.status != 206:
                    have = 0  # 服务器不支持断点，从头来
                total = int(r.headers.get("Content-Length") or 0) + have
                got = have
                mode = "ab" if have else "wb"
                t0 = time.time()
                with open(tmp, mode) as f:
                    while True:
                        chunk = r.read(1024 * 256)
                        if not chunk:
                            break
                        f.write(chunk)
                        got += len(chunk)
                        if got % (20 * 1024 * 1024) < 1024 * 256:
                            print(f"    {label} {got/1e6:.1f}MB / {total/1e6:.0f}MB")
                if total and got < total * 0.995:
                    raise IOError(f"未下完 {got}/{total}")
                os.replace(tmp, dest)
                print(f"  {label} 完成 {got/1e6:.1f}MB ({got/1e6/max(time.time()-t0,0.1):.2f}MB/s)")
                return dest
            except Exception as e:  # noqa: BLE001
                print(f"  {label} 源失败({type(e).__name__}: {str(e)[:60]})，重试/换源")
                time.sleep(3)
    raise RuntimeError(label + " 所有下载源都失败")


def unzip_to(src, dst):
    os.makedirs(dst, exist_ok=True)
    with zipfile.ZipFile(src) as z:
        z.extractall(dst)


def pick_single_dir(path, expect_marker):
    """解压目录里通常有一个外层文件夹，取含指定标记的那个。"""
    if os.path.exists(os.path.join(path, expect_marker)):
        return path
    for d in sorted(os.listdir(path)):
        full = os.path.join(path, d)
        if os.path.isdir(full) and os.path.exists(os.path.join(full, expect_marker)):
            return full
    return path


def main():
    os.makedirs(DL, exist_ok=True)
    print("[JDK]")
    if not os.path.exists(os.path.join(JDK_DIR, "bin", "javac.exe")):
        z = fetch(SOURCES["jdk"], os.path.join(DL, "jdk.zip"), "JDK", 60)
        tmp = os.path.join(DL, "_jdk_x")
        shutil.rmtree(tmp, ignore_errors=True)
        unzip_to(z, tmp)
        src = pick_single_dir(tmp, os.path.join("bin", "javac.exe"))
        shutil.rmtree(JDK_DIR, ignore_errors=True)
        shutil.move(src, JDK_DIR)
        shutil.rmtree(tmp, ignore_errors=True)
    print("  javac:", os.path.exists(os.path.join(JDK_DIR, "bin", "javac.exe")))

    print("[build-tools]")
    bt_final = os.path.join(SDK, "build-tools", "34.0.0")
    if not os.path.exists(os.path.join(bt_final, "aapt2.exe")):
        z = fetch(SOURCES["buildtools"], os.path.join(DL, "buildtools.zip"), "build-tools", 20)
        tmp = os.path.join(DL, "_bt")
        shutil.rmtree(tmp, ignore_errors=True)
        unzip_to(z, tmp)
        src = pick_single_dir(tmp, "aapt2.exe")
        shutil.rmtree(os.path.join(SDK, "build-tools"), ignore_errors=True)
        os.makedirs(os.path.join(SDK, "build-tools"), exist_ok=True)
        shutil.move(src, bt_final)
        shutil.rmtree(tmp, ignore_errors=True)
    print("  aapt2:", os.path.exists(os.path.join(bt_final, "aapt2.exe")))

    print("[platform]")
    jar = os.path.join(SDK, "platforms", "android-34", "android.jar")
    if not os.path.exists(jar):
        z = fetch(SOURCES["platform"], os.path.join(DL, "platform.zip"), "platform", 20)
        tmp = os.path.join(DL, "_plat")
        shutil.rmtree(tmp, ignore_errors=True)
        unzip_to(z, tmp)
        src = pick_single_dir(tmp, "android.jar")
        shutil.rmtree(os.path.join(SDK, "platforms"), ignore_errors=True)
        os.makedirs(os.path.join(SDK, "platforms"), exist_ok=True)
        shutil.move(src, os.path.join(SDK, "platforms", "android-34"))
        shutil.rmtree(tmp, ignore_errors=True)
    print("  android.jar:", os.path.exists(jar),
          f"{os.path.getsize(jar)/1e6:.1f}MB" if os.path.exists(jar) else "")

    for p in ["build-tools/34.0.0/aapt2.exe", "build-tools/34.0.0/d8.bat",
              "build-tools/34.0.0/apksigner.bat", "build-tools/34.0.0/zipalign.exe"]:
        full = os.path.join(SDK, p.replace("/", os.sep))
        print(("OK   " if os.path.exists(full) else "MISS ") + p)


if __name__ == "__main__":
    main()
