"""无 Gradle 打包 APK：aapt2 → javac → d8 → zipalign → apksigner。

    python tools/build_apk.py

产物：dist/CET4Ace.apk（已签名，可直接安装）
"""
import glob
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS = os.path.join(ROOT, "tools")
SDK = os.path.join(TOOLS, "sdk")
BUILD = os.path.join(ROOT, "build")
DIST = os.path.join(ROOT, "dist")
ANDROID = os.path.join(ROOT, "android")
APP = os.path.join(ROOT, "app")


def java_home():
    for cand in [os.path.join(TOOLS, "jdk")] + glob.glob(os.path.join(TOOLS, "jdk", "*")):
        if os.path.exists(os.path.join(cand, "bin", "javac.exe")):
            return cand
    raise RuntimeError("找不到 JDK，请先运行 python tools/get_sdk.py")


def tool(name):
    p = os.path.join(SDK, "build-tools", "34.0.0", name)
    if not os.path.exists(p):
        raise RuntimeError("缺少构建工具: " + p)
    return p


ENV = None


def run(cmd, env=None, cwd=None, quiet=False):
    r = subprocess.run(cmd, shell=True, cwd=cwd, env=env or ENV,
                       capture_output=True, text=True, encoding="utf-8",
                       errors="replace")
    if r.returncode != 0:
        print("命令失败:", cmd)
        print((r.stdout or "")[-3000:])
        print((r.stderr or "")[-3000:])
        raise SystemExit(1)
    if not quiet and (r.stdout or "").strip():
        print((r.stdout or "").strip()[-1200:])
    return r


def main():
    global ENV
    jh = java_home()
    env = dict(os.environ)
    env["JAVA_HOME"] = jh
    env["PATH"] = os.path.join(jh, "bin") + os.pathsep + env.get("PATH", "")
    ENV = env

    android_jar = os.path.join(SDK, "platforms", "android-34", "android.jar")
    if not os.path.exists(android_jar):
        raise RuntimeError("缺少 android.jar: " + android_jar)

    print("[1/8] 准备构建目录与静态资源")
    shutil.rmtree(BUILD, ignore_errors=True)
    os.makedirs(BUILD, exist_ok=True)
    assets = os.path.join(BUILD, "assets", "www")
    shutil.copytree(APP, assets)
    # 清理不需要进包的调试文件
    for junk in ["_probe.html"]:
        p = os.path.join(assets, junk)
        if os.path.exists(p):
            os.remove(p)
    size = sum(os.path.getsize(os.path.join(dp, f))
               for dp, _, fs in os.walk(assets) for f in fs)
    print(f"    assets/www = {size/1e6:.1f} MB")

    print("[2/8] aapt2 compile 资源")
    flat = os.path.join(BUILD, "res.zip")
    run(f'"{tool("aapt2.exe")}" compile --dir "{os.path.join(ANDROID, "res")}" -o "{flat}"')

    print("[3/8] aapt2 link 生成基础 APK")
    base = os.path.join(BUILD, "base.apk")
    gen = os.path.join(BUILD, "gen")
    os.makedirs(gen, exist_ok=True)
    run(f'"{tool("aapt2.exe")}" link -o "{base}" '
        f'-I "{android_jar}" '
        f'--manifest "{os.path.join(ANDROID, "AndroidManifest.xml")}" '
        f'-R "{flat}" '
        f'-A "{os.path.join(BUILD, "assets")}" '
        f'--java "{gen}" '
        f'--min-sdk-version 21 --target-sdk-version 34 '
        f'--version-code 5 --version-name 1.5 '
        f'--auto-add-overlay')

    print("[4/8] javac 编译 Java 源码")
    srcs = glob.glob(os.path.join(ANDROID, "java", "**", "*.java"), recursive=True)
    srcs += glob.glob(os.path.join(gen, "**", "*.java"), recursive=True)
    classes = os.path.join(BUILD, "classes")
    os.makedirs(classes, exist_ok=True)
    run('"%s" -encoding UTF-8 -source 1.8 -target 1.8 -nowarn '
        '-cp "%s" -d "%s" %s'
        % (os.path.join(jh, "bin", "javac.exe"), android_jar, classes,
           " ".join('"%s"' % s for s in srcs)))

    print("[5/8] d8 转换为 dex")
    dexdir = os.path.join(BUILD, "dex")
    os.makedirs(dexdir, exist_ok=True)
    cls = glob.glob(os.path.join(classes, "**", "*.class"), recursive=True)
    run(f'"{tool("d8.bat")}" --release --min-api 21 --lib "{android_jar}" '
        f'--output "{dexdir}" ' + " ".join('"%s"' % c for c in cls))

    print("[6/8] 把 classes.dex 写入 APK")
    dex = os.path.join(dexdir, "classes.dex")
    with zipfile.ZipFile(base, "a", zipfile.ZIP_DEFLATED) as z:
        z.write(dex, "classes.dex")
    print(f"    classes.dex = {os.path.getsize(dex)/1e3:.1f} KB")

    print("[7/8] zipalign 对齐")
    aligned = os.path.join(BUILD, "aligned.apk")
    run(f'"{tool("zipalign.exe")}" -f -p 4 "{base}" "{aligned}"')

    print("[8/8] 生成签名并 apksigner 签名")
    # keystore 放在 tools/keystore，不跟 build/ 一起被清空，保证每次升级签名一致
    ksdir = os.path.join(TOOLS, "keystore")
    os.makedirs(ksdir, exist_ok=True)
    ks = os.path.join(ksdir, "release.keystore")
    legacy = os.path.join(BUILD, "release.keystore")
    if not os.path.exists(ks) and os.path.exists(legacy):
        shutil.copy2(legacy, ks)
    if not os.path.exists(ks):
        run(f'"{os.path.join(jh, "bin", "keytool.exe")}" -genkeypair -v '
            f'-keystore "{ks}" -storepass android -keypass android '
            f'-alias cet4ace -keyalg RSA -keysize 2048 -validity 10000 '
            f'-dname "CN=CET4Ace, OU=Self, O=Self, L=China, S=China, C=CN"')
    os.makedirs(DIST, exist_ok=True)
    out = os.path.join(DIST, "CET4Ace.apk")
    run(f'"{tool("apksigner.bat")}" sign --ks "{ks}" --ks-pass pass:android '
        f'--key-pass pass:android --min-sdk-version 21 --v1-signing-enabled true '
        f'--v2-signing-enabled true --out "{out}" "{aligned}"')
    run(f'"{tool("apksigner.bat")}" verify --print-certs "{out}"', quiet=True)

    print("\n完成:", out, f"{os.path.getsize(out)/1e6:.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
