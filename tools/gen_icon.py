"""生成安卓 App 图标和启动图（原创图形：暖色渐变底 + 白色进度环 + 叉子）。
用法：python3 tools/gen_icon.py   （写入 android-app/android/app/src/main/res/）"""
import pathlib
from PIL import Image, ImageDraw

ROOT = pathlib.Path(__file__).resolve().parent.parent
RES = ROOT / 'android-app' / 'android' / 'app' / 'src' / 'main' / 'res'
C1, C2 = (255, 138, 61), (244, 63, 94)   # 渐变：橙 → 玫红
SS = 4                                    # 超采样，边缘更平滑


def gradient(n):
    g = Image.new('RGBA', (n, n))
    px = g.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            px[x, y] = tuple(round(C1[i] + (C2[i] - C1[i]) * t) for i in range(3)) + (255,)
    return g


def mark(n, scale):
    """透明底上的白色图形：3/4 进度环 + 环末端的圆点 + 中间一把叉子。scale = 图形占画布的比例"""
    N = n * SS
    im = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = N / 2
    r = N * .30 * scale
    w = N * .085 * scale
    box = [c - r, c - r, c + r, c + r]
    d.arc(box, 0, 360, fill=(255, 255, 255, 80), width=round(w))           # 底环
    d.arc(box, -90, 180, fill=(255, 255, 255, 255), width=round(w))        # 进度 3/4
    for a in (-90, 180):                                                   # 圆头
        import math
        x, y = c + (r - w / 2) * math.cos(math.radians(a)), c + (r - w / 2) * math.sin(math.radians(a))
        d.ellipse([x - w / 2, y - w / 2, x + w / 2, y + w / 2], fill=(255, 255, 255, 255))
    # 叉子
    fw = N * .15 * scale; top = c - N * .15 * scale; bot = c + N * .17 * scale
    tine = N * .022 * scale
    for k in range(4):
        x = c - fw / 2 + k * (fw - tine) / 3
        d.rounded_rectangle([x, top, x + tine, c - N * .02 * scale], radius=tine / 2, fill=(255, 255, 255, 255))
    d.rounded_rectangle([c - fw / 2, c - N * .045 * scale, c + fw / 2, c + N * .005 * scale], radius=N * .025 * scale, fill=(255, 255, 255, 255))
    hw = N * .036 * scale
    d.rounded_rectangle([c - hw / 2, c - N * .02 * scale, c + hw / 2, bot], radius=hw / 2, fill=(255, 255, 255, 255))
    return im.resize((n, n), Image.LANCZOS)


def legacy(n, round_):
    N = n * SS
    bg = gradient(N)
    m = Image.new('L', (N, N), 0)
    dm = ImageDraw.Draw(m)
    if round_:
        dm.ellipse([0, 0, N - 1, N - 1], fill=255)
    else:
        dm.rounded_rectangle([0, 0, N - 1, N - 1], radius=N * .22, fill=255)
    out = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    out.paste(bg, (0, 0), m)
    out = out.resize((n, n), Image.LANCZOS)
    out.alpha_composite(mark(n, 1.0))
    return out


DENS = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, k in DENS.items():
    d = RES / f'mipmap-{name}'
    d.mkdir(parents=True, exist_ok=True)
    legacy(round(48 * k), False).save(d / 'ic_launcher.png')
    legacy(round(48 * k), True).save(d / 'ic_launcher_round.png')
    mark(round(108 * k), .78).save(d / 'ic_launcher_foreground.png')   # 自适应图标：图形留在中间安全区

# 启动图（安卓 12 以下用；12 以上系统会自动用图标）
for f in RES.glob('drawable*/splash.png'):
    w, h = Image.open(f).size
    bg = Image.new('RGBA', (w, h))
    g = gradient(64).resize((w, h), Image.BILINEAR)
    bg.alpha_composite(g)
    s = round(min(w, h) * .32)
    bg.alpha_composite(mark(s, 1.0), ((w - s) // 2, (h - s) // 2))
    bg.convert('RGB').save(f)
print('icons ok')
