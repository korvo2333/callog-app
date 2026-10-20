import pathlib
"""学园 / 苍穹 第四轮：素材 + 把 themes4.src.css 里的 __NAME__ 换成 data URI，输出 src/themes4.css"""
import re, pathlib
S = str(pathlib.Path(__file__).resolve().parent)

def uri(svg):
    s = svg.replace('"', "'").replace('#', '%23').replace('<', '%3C').replace('>', '%3E')
    return 'url("data:image/svg+xml,' + s + '")'

def svg(w, h, body, vb=None):
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='{vb or f'0 0 {w} {h}'}'>{body}</svg>"

A = {}
# ── 学园 ──
# 纸飞机（机头朝右、微微上扬）+ 身后一段虚线航迹
A['PLANE'] = uri(svg(104, 34,
    "<path d='M3 27C22 30 42 26 62 19' fill='none' stroke='#1a96f0' stroke-opacity='.45' stroke-width='1.6' stroke-dasharray='4 5' stroke-linecap='round'/>"
    "<path d='M64 18L100 5 78 22z' fill='#ffffff' stroke='#1a96f0' stroke-width='1.6' stroke-linejoin='round'/>"
    "<path d='M78 22L100 5 82 30z' fill='#cfe8ff' stroke='#1a96f0' stroke-width='1.6' stroke-linejoin='round'/>"
    "<path d='M78 22l-3 4' stroke='#1a96f0' stroke-width='1.4' stroke-linecap='round'/>"))
# 滚动时在边距里飘的小几何（三角 / 十字 / 圆圈）
A['AC_TRI'] = uri(svg(16, 14, "<path d='M8 1.5l6.2 11H1.8z' fill='none' stroke='#1a96f0' stroke-opacity='.55' stroke-width='1.6' stroke-linejoin='round'/>"))
A['AC_PLUS'] = uri(svg(12, 12, "<path d='M6 1v10M1 6h10' stroke='#ffb400' stroke-opacity='.75' stroke-width='2' stroke-linecap='round'/>"))
A['AC_RING'] = uri(svg(12, 12, "<circle cx='6' cy='6' r='4.2' fill='none' stroke='#22bfa8' stroke-opacity='.6' stroke-width='1.8'/>"))

# ── 苍穹 ──
# 卡片四角的小金钉
A['SK_STUD'] = uri(svg(9, 9, "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f3dc95'/><stop offset='1' stop-color='#b98a2e'/></linearGradient></defs>"
    "<path d='M4.5 .3L8.7 4.5 4.5 8.7 .3 4.5z' fill='url(#g)'/><path d='M4.5 2.2L6.8 4.5 4.5 6.8 2.2 4.5z' fill='#fffaf0' fill-opacity='.55'/>"))
# 导航上滑动的宝石
A['SK_GEM'] = uri(svg(16, 16, "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#f6e29f'/><stop offset='1' stop-color='#b4862c'/></linearGradient>"
    "<linearGradient id='b' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='#8fb6f5'/><stop offset='1' stop-color='#244fa8'/></linearGradient></defs>"
    "<path d='M8 .5L15.5 8 8 15.5.5 8z' fill='url(#g)'/><path d='M8 3.4L12.6 8 8 12.6 3.4 8z' fill='url(#b)'/>"
    "<path d='M8 3.4L12.6 8 8 8z' fill='#fff' fill-opacity='.45'/><circle cx='6.6' cy='6.4' r='1' fill='#fff'/>"))
# 一小群鸟：两帧（翅膀上 / 下），横向排成精灵图
def birds(up):
    w = "M0 6Q3 0 6 5Q9 0 12 6" if up else "M0 3Q3 7 6 4.5Q9 7 12 3"
    g = ''.join(f"<path transform='translate({x} {y}) scale({s})' d='{w}' />" for x, y, s in [(2, 8, 1), (18, 3, .85), (31, 10, .75)])
    return g
A['SK_BIRDS'] = uri(svg(88, 22, "<g fill='none' stroke='#3c5a86' stroke-opacity='.75' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'>"
    + birds(True) + "<g transform='translate(44 0)'>" + birds(False) + "</g></g>"))
# 滚动视差的细长云丝
A['SK_WISP'] = uri(svg(240, 46, "<g fill='#ffffff'>"
    "<ellipse cx='70' cy='28' rx='62' ry='9' fill-opacity='.75'/><ellipse cx='118' cy='22' rx='44' ry='11' fill-opacity='.8'/>"
    "<ellipse cx='168' cy='29' rx='60' ry='8' fill-opacity='.7'/><ellipse cx='96' cy='33' rx='80' ry='6' fill-opacity='.55'/></g>"))

src = open(f'{S}/themes4.src.css', encoding='utf-8').read()
for k in sorted(A, key=len, reverse=True): src = src.replace('__' + k + '__', A[k])
left = re.findall(r'__[A-Z_0-9]+__', src); assert not left, left
pathlib.Path(str(pathlib.Path(__file__).resolve().parent.parent / 'src') + '/themes4.css').write_text(src, encoding='utf-8')
print('themes4 ok', len(src))
