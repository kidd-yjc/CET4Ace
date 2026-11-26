"""生成应用图标（无需外部素材）。"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RES = os.path.join(ROOT, "android", "res")
APP = os.path.join(ROOT, "app")

BRAND = (15, 118, 110)
BRAND_DARK = (10, 92, 85)
WHITE = (255, 255, 255)

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\arialbd.ttf",
    r"C:\Windows\Fonts\segoeuib.ttf",
    r"C:\Windows\Fonts\msyhbd.ttc",
]


def font(size):
    for p in FONT_CANDIDATES:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def make(size):
    S = size * 4  # 超采样后缩小，边缘更干净
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # 圆角底
    radius = int(S * 0.22)
    d.rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=BRAND)

    # 顶部柔和渐变（垂直，无接缝）
    grad = Image.new("RGBA", (1, S))
    for y in range(S):
        t = y / max(1, S - 1)
        a = int(34 * (1 - t) ** 1.6)
        grad.putpixel((0, y), (255, 255, 255, a))
    grad = grad.resize((S, S))
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1], radius=radius, fill=255)
    img = Image.composite(Image.alpha_composite(img, grad), img, mask)
    d = ImageDraw.Draw(img)

    # 圆环
    pad = int(S * 0.12)
    d.ellipse([pad, pad, S - pad, S - pad], outline=(255, 255, 255, 55), width=int(S * 0.012))

    # 大数字 4
    f = font(int(S * 0.46))
    txt = "4"
    bbox = d.textbbox((0, 0), txt, font=f)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text(((S - tw) / 2 - bbox[0], (S - th) / 2 - bbox[1] - int(S * 0.03)), txt, font=f, fill=WHITE)

    # 底部小字 CET
    f2 = font(int(S * 0.115))
    t2 = "CET"
    b2 = d.textbbox((0, 0), t2, font=f2)
    w2 = b2[2] - b2[0]
    d.text(((S - w2) / 2 - b2[0], int(S * 0.70)), t2, font=f2, fill=(235, 250, 247))

    return img.resize((size, size), Image.LANCZOS)


def main():
    targets = [
        ("mipmap-mdpi", 48), ("mipmap-hdpi", 72), ("mipmap-xhdpi", 96),
        ("mipmap-xxhdpi", 144), ("mipmap-xxxhdpi", 192),
    ]
    for folder, size in targets:
        out_dir = os.path.join(RES, folder)
        os.makedirs(out_dir, exist_ok=True)
        make(size).save(os.path.join(out_dir, "ic_launcher.png"))
        print(f"{folder}/ic_launcher.png {size}x{size}")

    make(512).save(os.path.join(APP, "icon-512.png"))
    make(192).save(os.path.join(APP, "icon-192.png"))
    print("app/icon-512.png, app/icon-192.png")


if __name__ == "__main__":
    main()
