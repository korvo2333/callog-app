import pathlib
"""霓虹 / 蒸汽 / 魔法 / 自然 / 工业 第五轮：新素材 + 已有素材（assets.json），替换 themes5.src.css 里的 __NAME__，输出 src/themes5.css"""
import re, json, random, pathlib
S = str(pathlib.Path(__file__).resolve().parent)
A = json.load(open(f'{S}/assets.json'))

def uri(svg):
    s = svg.replace('"', "'").replace('#', '%23').replace('<', '%3C').replace('>', '%3E')
    return 'url("data:image/svg+xml,' + s + '")'
def svg(w, h, body):
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='0 0 {w} {h}'>{body}</svg>"

# 霓虹：边距里的数据流（一列小字，480px 一个循环）
def digits(seed, color):
    rnd = random.Random(seed)
    rows = []
    for k in range(40):
        t = rnd.choice(['0', '1', '0', '1', 'A', 'F', '7', '3', 'E', '0', '1', '·'])
        o = rnd.choice([.35, .5, .65, .9])
        rows.append(f"<text x='5' y='{k * 12 + 9}' fill-opacity='{o}'>{t}</text>")
    return svg(10, 480, f"<g fill='{color}' font-family='monospace' font-size='8' text-anchor='middle'>" + ''.join(rows) + '</g>')
A['NE_DIG_C'] = uri(digits(3, '#3ad6f0')); A['NE_DIG_M'] = uri(digits(9, '#ff5c86'))

# 魔法：导航上的四芒星；顶栏里闪烁的小星
STAR4 = "M8 0L9.6 6.4 16 8 9.6 9.6 8 16 6.4 9.6 0 8 6.4 6.4Z"
A['MG_STAR'] = uri(svg(16, 16, "<defs><radialGradient id='g'><stop offset='0' stop-color='#fffbe8'/><stop offset='.45' stop-color='#f6e3a6'/><stop offset='1' stop-color='#c9a24a'/></radialGradient></defs>"
    f"<path d='{STAR4}' fill='url(#g)'/>"))
def sparkles(pts):
    return ''.join(f"<path transform='translate({x} {y}) scale({s})' d='{STAR4}' fill='#f6e3a6' fill-opacity='{o}'/>" for x, y, s, o in pts)
A['MG_TWINKLE'] = uri(svg(180, 54, sparkles([(14, 8, .45, .9), (70, 30, .3, .7), (118, 6, .38, .85), (160, 28, .26, .6), (96, 40, .22, .5)])))
A['MG_SPARK'] = uri(svg(12, 12, f"<path transform='translate(-2 -2) scale(1)' d='{STAR4}' fill='#f6e3a6' fill-opacity='.8'/>"))

# 自然：导航上滑动的圆角底块、底块旁的小叶子、顶栏里扇翅膀的蝴蝶（两帧精灵图）
A['NA_PILL'] = uri(svg(54, 28, "<rect width='54' height='28' rx='14' fill='#4d7a46' fill-opacity='.13'/>"))
A['NA_LEAF'] = uri(svg(12, 12, "<path d='M1 11C1 5 5 1 11 1c0 6-4 10-10 10z' fill='#8db36f'/><path d='M2 10L8 4' stroke='#fbfaf3' stroke-opacity='.7' stroke-width='.8'/>"))
def fly(open_):
    sx = 1 if open_ else .32
    wing = (f"<g transform='translate(14 11) scale({sx} 1)'>"
            "<path d='M0 0C-3-8-12-9-12-3C-12 1-6 2 0 0Z' fill='#dfa22c'/><path d='M0 0C-2 5-9 8-10 4C-10 1-5 0 0 0Z' fill='#c66a3d'/>"
            "<path d='M0 0C3-8 12-9 12-3C12 1 6 2 0 0Z' fill='#dfa22c'/><path d='M0 0C2 5 9 8 10 4C10 1 5 0 0 0Z' fill='#c66a3d'/></g>")
    return wing + "<path d='M14 6v11' stroke='#3d3424' stroke-width='1.6' stroke-linecap='round'/><path d='M14 6l-2-3M14 6l2-3' stroke='#3d3424' stroke-width='.8' stroke-linecap='round'/>"
A['NA_FLY'] = uri(svg(56, 22, fly(True) + "<g transform='translate(28 0)'>" + fly(False) + "</g>"))

src = open(f'{S}/themes5.src.css', encoding='utf-8').read()
for k in sorted(A, key=len, reverse=True): src = src.replace('__' + k + '__', A[k])
left = re.findall(r'__[A-Z_0-9]+__', src); assert not left, left
pathlib.Path(str(pathlib.Path(__file__).resolve().parent.parent / 'src') + '/themes5.css').write_text(src, encoding='utf-8')
print('themes5 ok', len(src))
