import random, json
def uri(svg):
    s = svg.replace('"', "'").replace('#', '%23').replace('<', '%3C').replace('>', '%3E')
    return 'url("data:image/svg+xml,' + s + '")'
random.seed(11)
def stars(size, n, sparkles):
    out = []
    for i in range(n):
        x, y = random.uniform(0, size), random.uniform(0, size)
        r = random.choice([.5, .6, .7, .8, 1.0, 1.2]); o = random.choice([.35, .45, .55, .7, .85])
        out.append(f"<circle cx='{x:.0f}' cy='{y:.0f}' r='{r}' fill='#fff6dc' fill-opacity='{o}'/>")
    for i in range(sparkles):
        x, y = random.uniform(10, size-10), random.uniform(10, size-10); s = random.choice([3.5, 4.5])
        out.append(f"<path d='M{x:.0f} {y-s:.1f}L{x+s*.22:.1f} {y-s*.22:.1f}L{x+s:.1f} {y:.0f}L{x+s*.22:.1f} {y+s*.22:.1f}L{x:.0f} {y+s:.1f}L{x-s*.22:.1f} {y+s*.22:.1f}L{x-s:.1f} {y:.0f}L{x-s*.22:.1f} {y-s*.22:.1f}Z' fill='#ffe9a8' fill-opacity='.6'/>")
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{size}' height='{size}'>" + ''.join(out) + '</svg>'
A = {}
A['STARS1'] = uri(stars(230, 16, 1)); A['STARS2'] = uri(stars(170, 9, 1))
corner = "<path d='M1 15V6.5Q1 1 6.5 1H15' fill='none' stroke='#e3bb57' stroke-width='1.2'/><path d='M4.5 2.2L6.3 4 4.5 5.8 2.7 4z' fill='#e3bb57'/><circle cx='9.5' cy='4' r='.9' fill='#e3bb57'/><circle cx='4' cy='9.5' r='.9' fill='#e3bb57'/>"
for name, tf in [('TL', ''), ('TR', " transform='translate(16 0) scale(-1 1)'"), ('BL', " transform='translate(0 16) scale(1 -1)'"), ('BR', " transform='rotate(180 8 8)'")]:
    A['CORNER_' + name] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><g{tf}>{corner}</g></svg>")
A['GEARS'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='420' height='620'><g fill='none' stroke='#d9a84e' stroke-opacity='.07'>"
  "<circle cx='350' cy='86' r='64' stroke-width='14' stroke-dasharray='11.17 8.94'/><circle cx='350' cy='86' r='52' stroke-width='3'/><circle cx='350' cy='86' r='15' stroke-width='7'/>"
  "<path d='M350 38v96M302 86h96M316 52l68 68M384 52l-68 68' stroke-width='3'/>"
  "<circle cx='258' cy='176' r='36' stroke-width='11' stroke-dasharray='8.55 6.53'/><circle cx='258' cy='176' r='10' stroke-width='5'/>"
  "<circle cx='36' cy='470' r='86' stroke-width='16' stroke-dasharray='12.65 10.95'/><circle cx='36' cy='470' r='70' stroke-width='3'/><circle cx='36' cy='470' r='22' stroke-width='8'/>"
  "<path d='M36 404v132M-30 470h132M-11 423l94 94M83 423l-94 94' stroke-width='3'/>"
  "<circle cx='150' cy='575' r='30' stroke-width='10' stroke-dasharray='7.85 5.24'/><circle cx='150' cy='575' r='8' stroke-width='4'/></g></svg>")
A['GEARMASK'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='8.2' fill='none' stroke='#000' stroke-width='4.6' stroke-dasharray='3.22 3.22'/><circle cx='12' cy='12' r='6.4' fill='none' stroke='#000' stroke-width='3.4'/></svg>")
A['LEAFMASK'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M4 20C4 10 10 4 21 3c0 11-6 17-16 17z' fill='#000'/></svg>")
A['SPRIG'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'>"
  "<path d='M120 4C96 10 78 26 66 50' fill='none' stroke='#5b8c4e' stroke-width='1.6' stroke-linecap='round'/>"
  "<path d='M102 10c-2-9 3-16 13-17-1 9-5 15-13 17z' fill='#8db36f'/><path d='M88 19c-8-4-10-12-6-21 8 4 10 12 6 21z' fill='#5b8c4e'/>"
  "<path d='M84 26c4-8 12-11 21-8-4 8-12 11-21 8z' fill='#8db36f'/><path d='M74 36c-8-2-12-9-10-18 8 2 12 9 10 18z' fill='#5b8c4e'/>"
  "<path d='M71 42c5-7 13-9 21-5-5 7-13 9-21 5z' fill='#8db36f'/><circle cx='64' cy='53' r='3.2' fill='#dfa22c'/></svg>")
A['BGLEAF'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='260' height='300' viewBox='0 0 260 300'><g fill='none' stroke='#4d7a46' stroke-opacity='.10' stroke-width='1.6' stroke-linecap='round'>"
  "<path d='M262 -6C170 30 120 110 112 214'/><path d='M248 4c-42 4-70 26-82 60 36-2 66-22 82-60z'/><path d='M240 10C206 28 182 46 166 64'/>"
  "<path d='M196 44c-34-14-66-6-86 22 34 14 64 6 86-22z'/><path d='M196 44c-30 4-58 12-86 22'/><path d='M160 96c-4-38 14-64 46-78 4 38-14 64-46 78z'/>"
  "<path d='M160 96c10-28 26-54 46-78'/><path d='M134 146c-32-20-64-18-90 4 32 20 62 18 90-4z'/><path d='M134 146c-30-2-60 0-90 4'/>"
  "<path d='M124 182c4-36 26-58 60-66-4 36-26 58-60 66z'/><path d='M124 182c14-24 34-46 60-66'/></g></svg>")
json.dump(A, open('assets.json', 'w'))

# ── 旧主题升级用的素材 ──
A['SWIPE'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 20' preserveAspectRatio='none'><path d='M2 6.5C20 4.2 55 3.6 97 5.2l1 9.6C70 16.6 30 17 3 15.4z' fill='#ffe45c' fill-opacity='.75'/></svg>")
A['CLIP'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='16' height='38' viewBox='0 0 16 38'><path d='M11.5 12V30a4.5 4.5 0 0 1-9 0V7a3.5 3.5 0 0 1 7 0v21a1.6 1.6 0 0 1-3.2 0V12' fill='none' stroke='#8a94a9' stroke-width='1.8' stroke-linecap='round'/></svg>")
A['SPRINKLES'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='84' height='56' viewBox='0 0 84 56'><g stroke='#1f1b3a' stroke-width='1.6'>"
  "<rect x='8' y='20' width='16' height='6' rx='3' fill='#ff5c8a' transform='rotate(-30 16 23)'/>"
  "<rect x='34' y='8' width='16' height='6' rx='3' fill='#ffe066' transform='rotate(20 42 11)'/>"
  "<rect x='58' y='22' width='16' height='6' rx='3' fill='#4d96ff' transform='rotate(-55 66 25)'/>"
  "<rect x='30' y='36' width='16' height='6' rx='3' fill='#2fbf71' transform='rotate(35 38 39)'/>"
  "<circle cx='66' cy='46' r='4' fill='#ff8a3d'/><circle cx='12' cy='44' r='3' fill='#b8f2d6'/></g></svg>")
A['MOUNTAINS'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='390' height='260' viewBox='0 0 390 260'>"
  "<defs><linearGradient id='a' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1e1c19' stop-opacity='.16'/><stop offset='1' stop-color='#1e1c19' stop-opacity='0'/></linearGradient>"
  "<linearGradient id='b' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1e1c19' stop-opacity='.09'/><stop offset='1' stop-color='#1e1c19' stop-opacity='0'/></linearGradient></defs>"
  "<path d='M120 260C170 210 196 150 238 118c18-14 26-40 44-52 14 18 22 40 44 50 26 12 44 34 64 52V260z' fill='url(#b)'/>"
  "<path d='M196 260c30-30 52-66 84-82 16-8 22-30 36-34 10 14 16 30 34 38 16 8 28 22 40 34V260z' fill='url(#a)'/>"
  "<circle cx='300' cy='44' r='16' fill='#b7282e' fill-opacity='.10'/></svg>")
A['BRUSHLINE'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 8' preserveAspectRatio='none'><path d='M0 4.6C40 3 120 2.2 210 3.2c40 .4 70 1.4 90 2.6-60 1.6-150 1.8-220 1.2C40 6.6 14 5.8 0 4.6z' fill='#1e1c19' fill-opacity='.28'/></svg>")
A['BRUSHDAB'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 8 20'><path d='M3.2 0.6C5.6 1 6.8 4 6.6 9c-.2 5-1 9.4-3.2 10.4C1.6 19.6.8 14.6 1 9.6 1.2 4 1.4.4 3.2.6z' fill='#000'/></svg>")
json.dump(A, open('assets.json', 'w'))
A['RIDGE'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='48' viewBox='0 0 400 48' preserveAspectRatio='none'>"
  "<defs><linearGradient id='g' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1e1c19' stop-opacity='.13'/><stop offset='1' stop-color='#1e1c19' stop-opacity='0'/></linearGradient>"
  "<linearGradient id='h' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#1e1c19' stop-opacity='.07'/><stop offset='1' stop-color='#1e1c19' stop-opacity='0'/></linearGradient></defs>"
  "<path d='M0 48V34c30-4 52-16 78-14 22 2 30 12 52 10 30-3 40-22 70-24 22-1 34 14 54 15 26 1 40-18 66-20 30-2 50 16 80 22V48z' fill='url(#h)'/>"
  "<path d='M0 48V42c40-2 70-12 100-10 26 2 36 8 62 6 34-3 52-18 84-16 24 2 34 12 58 12 34 0 60-10 96-8V48z' fill='url(#g)'/></svg>")
json.dump(A, open('assets.json', 'w'))

# ── 游戏风主题素材（全部原创图形） ──
A['CLAWS'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='76' height='64' viewBox='0 0 76 64'><g fill='#3a2617'>"
  "<path d='M22 2c4 14 6 30 2 52 4-20 4-36 0-50z'/><path d='M40 0c5 16 7 34 1 60 6-24 6-42-1-58z'/><path d='M58 4c4 14 5 28 0 48 6-18 6-32 0-46z'/></g></svg>")
A['CLAWMASK'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><g fill='#000'><path d='M5 3c2.4 6 2.8 12 .6 19 3.2-7 3.4-13 .4-19z'/><path d='M11 1.5c2.6 6.5 3 13 .6 21 3.4-8 3.6-14.5.4-21z'/><path d='M17 3c2.4 6 2.8 12 .6 19 3.2-7 3.4-13 .4-19z'/></g></svg>")
A['TRIS'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='70' height='46' viewBox='0 0 70 46'>"
  "<path d='M40 4l14 24H26z' fill='none' stroke='#1a96f0' stroke-width='2' stroke-linejoin='round' opacity='.55'/>"
  "<path d='M58 20l9 15H49z' fill='#ffd84a'/><path d='M14 26l7 12H7z' fill='#7cc8ff' opacity='.7'/></svg>")
random.seed(5)
emb = ''.join(f"<circle cx='{random.uniform(0,240):.0f}' cy='{random.uniform(0,240):.0f}' r='{random.choice([.6,.8,1,1.3])}' fill='#ff8a4a' fill-opacity='{random.choice([.18,.25,.35,.5])}'/>" for _ in range(14))
A['EMBERS'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>{emb}</svg>")
A['DRULE'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='26' height='10' viewBox='0 0 26 10'><path d='M0 5h17' stroke='#8c7a5b' stroke-width='1'/><path d='M21 1l4 4-4 4-4-4z' fill='#b02a2a'/></svg>")
A['ORBITMASK'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><circle cx='12' cy='12' r='8.5' fill='none' stroke='#000' stroke-width='1.6'/><circle cx='12' cy='12' r='3' fill='#000'/><circle cx='20' cy='9.6' r='2.2' fill='#000'/></svg>")
A['HEXMASK'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M12 2l8.7 5v10L12 22l-8.7-5V7z' fill='#000'/></svg>")
A['ORBITS'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='420' height='320' viewBox='0 0 420 320'><g fill='none' stroke='#9aa8d8' stroke-opacity='.10' stroke-width='1'>"
  "<ellipse cx='420' cy='40' rx='150' ry='60' transform='rotate(-14 420 40)'/><ellipse cx='420' cy='40' rx='230' ry='96' transform='rotate(-14 420 40)'/>"
  "<ellipse cx='420' cy='40' rx='320' ry='136' transform='rotate(-14 420 40)' stroke-dasharray='3 6'/></g>"
  "<circle cx='296' cy='62' r='3' fill='#5fd3c4' fill-opacity='.45'/><circle cx='214' cy='118' r='2.2' fill='#ffcf5c' fill-opacity='.4'/></svg>")
A['STARS_W1'] = A['STARS1'].replace('fff6dc', 'e8eeff').replace('ffe9a8', 'cfe0ff')
A['STARS_W2'] = A['STARS2'].replace('fff6dc', 'e8eeff').replace('ffe9a8', 'cfe0ff')
json.dump(A, open('assets.json', 'w'))

# ── 游戏风主题第二轮：更多原创装饰 ──
import math
random.seed(21)
# 狩猎：撕边（纸张下沿的锯齿）
pts = ['0 0', '80 0']; x = 80; jag = []
xs = [0]
while xs[-1] < 80: xs.append(min(80, xs[-1] + random.uniform(3, 7)))
jag = ' '.join(f'L{xx:.1f} {random.uniform(2.5, 7.5):.1f}' for xx in reversed(xs))
A['TORN'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='80' height='8' viewBox='0 0 80 8' preserveAspectRatio='none'><path d='M0 0H80V4 {jag} Z' fill='#e2d1aa'/></svg>")
# 狩猎：三趾脚印（木板背景上一串足迹）
def foot(cx, cy, rot, s=1):
    g = f"<g transform='translate({cx} {cy}) rotate({rot}) scale({s})'>"
    g += "<ellipse cx='0' cy='6' rx='6' ry='5'/><ellipse cx='-6.5' cy='-5' rx='2.4' ry='6' transform='rotate(-22 -6.5 -5)'/><ellipse cx='0' cy='-8' rx='2.4' ry='6.5'/><ellipse cx='6.5' cy='-5' rx='2.4' ry='6' transform='rotate(22 6.5 -5)'/></g>"
    return g
prints = ''.join(foot(60 + i * 46 + (12 if i % 2 else -12), 470 - i * 78, 28 + (8 if i % 2 else -6), .9) for i in range(6)).replace('scale(0.9)', 'scale(1.5)')
A['TRACKS'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='340' height='520'><g fill='#f0e2c2' fill-opacity='.07'>{prints}</g></svg>")
# 狩猎：交叉的大剑和斧（锁屏水印，原创简笔）
A['CROSSED'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220' viewBox='0 0 220 220'><g fill='#f0e2c2' fill-opacity='.07'>"
  "<g transform='rotate(-40 110 110)'><path d='M104 20h12v128h-12z'/><path d='M110 6l8 14h-16z'/><path d='M84 148h52v9H84z'/><path d='M105 157h10v36h-10z'/><circle cx='110' cy='199' r='7'/></g>"
  "<g transform='rotate(40 110 110)'><path d='M106 28h8v170h-8z'/><path d='M114 34c30 4 44 22 44 46-14-8-30-10-44-6z'/><path d='M106 34c-22 6-30 20-30 38 10-6 20-8 30-6z'/></g></g></svg>")

# 学园：漂浮的几何小图形
shapes = ("<path d='M40 120l14 24H26z' fill='none' stroke='#1a96f0' stroke-width='2' stroke-opacity='.35' stroke-linejoin='round'/>"
  "<circle cx='340' cy='230' r='9' fill='none' stroke='#22bfa8' stroke-width='2' stroke-opacity='.35'/>"
  "<path d='M356 420v14M349 427h14' stroke='#ffb400' stroke-width='2.4' stroke-linecap='round' stroke-opacity='.55'/>"
  "<path d='M24 520l10 17H14z' fill='#ffd84a' fill-opacity='.45'/>"
  "<circle cx='70' cy='330' r='4' fill='#1a96f0' fill-opacity='.3'/>"
  "<path d='M300 600l12 20h-24z' fill='none' stroke='#ff6f91' stroke-width='2' stroke-opacity='.35' stroke-linejoin='round'/>"
  "<path d='M18 760v12M12 766h12' stroke='#1a96f0' stroke-width='2.2' stroke-linecap='round' stroke-opacity='.35'/>"
  "<circle cx='360' cy='820' r='6' fill='none' stroke='#1a96f0' stroke-width='2' stroke-opacity='.3'/>")
A['SHAPES'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='390' height='900'>{shapes}</svg>")
A['SPARK4'] = uri("<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'><path d='M10 0c.8 5 4.2 8.6 10 10-5.8 1.4-9.2 5-10 10-.8-5-4.2-8.6-10-10 5.8-1.4 9.2-5 10-10z' fill='#ffd84a'/></svg>")
A['PLANE'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='240' height='120' viewBox='0 0 240 120'>"
  "<path d='M6 100C50 96 70 60 110 64s60 30 92-6' fill='none' stroke='#1a96f0' stroke-opacity='.45' stroke-width='2' stroke-dasharray='6 7' stroke-linecap='round'/>"
  "<g transform='translate(204 52) rotate(-28)'><path d='M0 0L34 -14 22 14z' fill='#ffffff' stroke='#1a96f0' stroke-width='1.8' stroke-linejoin='round'/><path d='M0 0L22 14 18 4z' fill='#d7ecff' stroke='#1a96f0' stroke-width='1.8' stroke-linejoin='round'/></g></svg>")

# 工业：技术图纸圆 + 条形码
tk = ''.join(f"<line x1='{180 + 150 * math.cos(a):.1f}' y1='{180 + 150 * math.sin(a):.1f}' x2='{180 + (142 if i % 6 else 132) * math.cos(a):.1f}' y2='{180 + (142 if i % 6 else 132) * math.sin(a):.1f}'/>" for i, a in enumerate([k * math.pi / 36 for k in range(72)]))
A['BLUEPRINT'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='360' height='360'><g fill='none' stroke='#161616' stroke-opacity='.09' stroke-width='1'>"
  "<circle cx='180' cy='180' r='150'/><circle cx='180' cy='180' r='110' stroke-dasharray='4 4'/><circle cx='180' cy='180' r='60'/>"
  "<path d='M180 10v340M10 180h340'/><path d='M74 74l212 212M286 74L74 286' stroke-dasharray='2 6'/>" + tk + "</g>"
  "<g fill='#161616' fill-opacity='.14' font-family='monospace' font-size='9'><text x='186' y='26'>000</text><text x='330' y='176'>090</text><text x='186' y='346'>180</text><text x='16' y='176'>270</text></g></svg>")
bars = ''; bx = 0
for w in [2,1,1,3,1,2,1,1,2,3,1,1,2,1,3,1,2,1,1,2]:
    bars += f"<rect x='{bx}' y='0' width='{w}' height='10'/>"; bx += w + random.choice([1, 2])
A['BARCODE'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='{bx}' height='10'><g fill='#161616'>{bars}</g></svg>")
A['HATCH'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><defs><pattern id='h' width='8' height='8' patternUnits='userSpaceOnUse' patternTransform='rotate(45)'><line x1='0' y1='0' x2='0' y2='8' stroke='#161616' stroke-opacity='.08' stroke-width='2'/></pattern></defs><path d='M0 200V60L60 0h140v200z' fill='url(#h)'/><path d='M0 60L60 0' stroke='#161616' stroke-opacity='.15'/></svg>")

# 远征：铁角件（带铆钉）、深红三角旗、远山
ic = "<path d='M1 17V5L5 1h12' fill='none' stroke='#6e6253' stroke-width='2'/><path d='M4 14V6.5L6.5 4H14' fill='none' stroke='#3d362e' stroke-width='1'/><circle cx='5' cy='5' r='1.6' fill='#bfae8e'/>"
for name, tf in [('TL', ''), ('TR', " transform='translate(18 0) scale(-1 1)'"), ('BL', " transform='translate(0 18) scale(1 -1)'"), ('BR', " transform='rotate(180 9 9)'")]:
    A['IRON_' + name] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='18' height='18'><g{tf}>{ic}</g></svg>")
A['PENNANT'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='30' height='54' viewBox='0 0 30 54'>"
  "<path d='M1 3h28' stroke='#8c7a5b' stroke-width='2.4' stroke-linecap='round'/>"
  "<path d='M4 4h22v44l-11-8-11 8z' fill='#8e1f1d'/><path d='M4 4h22v44l-11-8-11 8z' fill='none' stroke='#c9a46a' stroke-width='1'/>"
  "<path d='M15 13c4 5 4 9 0 13-4-4-4-8 0-13z' fill='#e8e0d0'/><path d='M10 30h10' stroke='#e8e0d0' stroke-width='1.4'/></svg>")
A['RANGE'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='400' height='140' viewBox='0 0 400 140' preserveAspectRatio='none'>"
  "<path d='M0 140V92l34-22 22 12 40-40 26 24 30-34 44 46 30-18 38 28 34-40 30 30 36-20 36 24v58z' fill='#0b0a09' fill-opacity='.85'/>"
  "<path d='M0 140v-26l48-14 40 12 52-20 46 18 60-16 52 14 52-12 50 16v28z' fill='#070605'/></svg>")

# 星野：星座线、篝火
A['CONSTEL'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='120' height='70' viewBox='0 0 120 70'><g stroke='#b9c2dc' stroke-opacity='.35' stroke-width='.8' fill='none'><path d='M8 52L34 30 62 38 88 12 112 22M62 38L74 62'/></g>"
  "<g fill='#eef1f8'><circle cx='8' cy='52' r='1.6'/><circle cx='34' cy='30' r='2.1'/><circle cx='62' cy='38' r='1.6'/><circle cx='88' cy='12' r='2.4'/><circle cx='112' cy='22' r='1.4'/><circle cx='74' cy='62' r='1.5'/></g></svg>")
A['CAMPFIRE'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='120' height='110' viewBox='0 0 120 110'>"
  "<path d='M60 18c14 18 22 30 16 48-4 10-12 14-16 14s-12-4-16-14c-6-18 2-30 16-48z' fill='#ff8a3c'/>"
  "<path d='M60 44c7 9 10 16 7 24-2 5-5 7-7 7s-5-2-7-7c-3-8 0-15 7-24z' fill='#ffcf5c'/>"
  "<path d='M22 92l76-16' stroke='#8a5a34' stroke-width='9' stroke-linecap='round'/><path d='M98 92L22 76' stroke='#6e4528' stroke-width='9' stroke-linecap='round'/>"
  "<g fill='#ffcf5c'><circle cx='40' cy='26' r='1.6'/><circle cx='84' cy='14' r='1.3'/><circle cx='74' cy='6' r='1'/><circle cx='46' cy='8' r='1.1'/></g></svg>")

# 苍穹：云层、飞艇、金色卷草角花
cl = ''
for (cx, cy, s) in [(80, 70, 1.0), (330, 40, .7), (560, 90, 1.2), (760, 50, .8)]:
    cl += (f"<g transform='translate({cx} {cy}) scale({s})' fill='#ffffff'><ellipse cx='0' cy='0' rx='46' ry='16'/><circle cx='-18' cy='-10' r='16'/><circle cx='8' cy='-16' r='20'/><circle cx='30' cy='-6' r='13'/></g>")
birds = "<g fill='none' stroke='#5a7fa8' stroke-opacity='.45' stroke-width='1.4' stroke-linecap='round'><path d='M200 30q5-5 10 0q5-5 10 0'/><path d='M228 44q4-4 8 0q4-4 8 0'/><path d='M640 26q4-4 8 0q4-4 8 0'/></g>"
A['CLOUDS'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='840' height='140'><g fill-opacity='.8'>{cl}</g>{birds}</svg>")
A['AIRSHIP'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='84' height='48' viewBox='0 0 84 48'>"
  "<path d='M70 16l12-9v22l-12-6z' fill='#c99a3a'/><path d='M70 16l9 2-9 4z' fill='#a97f2a'/>"
  "<ellipse cx='40' cy='18' rx='32' ry='13' fill='#f7f2e6' stroke='#c99a3a' stroke-width='1.6'/>"
  "<path d='M14 18h52M20 10c8 2 32 2 42 0M20 26c8-2 32-2 42 0' stroke='#d8bf86' stroke-width='1' fill='none'/>"
  "<path d='M28 30l-2 6M52 30l2 6' stroke='#8a6a2a' stroke-width='1'/><rect x='24' y='36' width='32' height='7' rx='3' fill='#2f62c9' stroke='#1f3358' stroke-width='1'/>"
  "<path d='M10 38v8M7 42h6' stroke='#8a6a2a' stroke-width='1.2'/><path d='M56 40h8' stroke='#8a6a2a' stroke-width='1'/></svg>")
fil = "<path d='M2 20V9C2 5 5 2 9 2h11' fill='none' stroke='#c99a3a' stroke-width='1.3'/><path d='M7 15c0-5 3-8 8-8' fill='none' stroke='#c99a3a' stroke-width='1'/><circle cx='15' cy='7' r='1.6' fill='#c99a3a'/><circle cx='7' cy='15' r='1.6' fill='#c99a3a'/><path d='M2 2l3.2 3.2' stroke='#c99a3a' stroke-width='1.3'/>"
for name, tf in [('TL', ''), ('TR', " transform='translate(22 0) scale(-1 1)'"), ('BL', " transform='translate(0 22) scale(1 -1)'"), ('BR', " transform='rotate(180 11 11)'")]:
    A['FIL_' + name] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='22' height='22'><g{tf}>{fil}</g></svg>")
json.dump(A, open('assets.json', 'w'))

A['CLAWS_F'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='76' height='64' viewBox='0 0 76 64'><g fill='#3a2617' fill-opacity='.15' transform='rotate(18 38 32)'>"
  "<path d='M22 2c4 14 6 30 2 52 4-20 4-36 0-50z'/><path d='M40 0c5 16 7 34 1 60 6-24 6-42-1-58z'/><path d='M58 4c4 14 5 28 0 48 6-18 6-32 0-46z'/></g></svg>")
A['WAXSEAL'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'>"
  "<path d='M20 2c5 0 7 3 10 4s7 1 8 6-1 6 0 9 2 7-2 10-6 2-9 4-5 4-8 3-5-3-8-4-6-2-7-6 1-6 0-9-2-6 1-9 6-2 8-4 5-4 7-4z' fill='#9b2a1c'/>"
  "<circle cx='20' cy='20' r='11.5' fill='none' stroke='#c2513c' stroke-width='1.6'/>"
  "<path d='M15 27l4-13M19.5 28l4-13M24 28l3-10' stroke='#e07a5f' stroke-width='2' stroke-linecap='round'/></svg>")
A['SIGNAL'] = uri("<svg xmlns='http://www.w3.org/2000/svg' width='300' height='10' viewBox='0 0 300 10' preserveAspectRatio='none'><path d='" + 'M0 5 ' + ' '.join(f'L{x} {5 + 3.6 * math.sin(x / 6) * math.exp(-((x - 150) / 70) ** 2):.2f}' for x in range(0, 301, 3)) + "' fill='none' stroke='#ff8a3c' stroke-opacity='.55' stroke-width='1.2'/></svg>")
json.dump(A, open('assets.json', 'w'))
A['TORN2'] = A['TORN'].replace('%23e2d1aa', '%23c6b186')
json.dump(A, open('assets.json', 'w'))

# ═══ 第三轮：主题转场 / 反应 / 滚动装饰 ═══
def svg(w, h, body, vb=None):
    return f"<svg xmlns='http://www.w3.org/2000/svg' width='{w}' height='{h}' viewBox='{vb or f'0 0 {w} {h}'}'>{body}</svg>"
# 蒸汽：转场用的大齿轮圈（画在 200×200 的边缘）
A['GEAR_RING'] = uri(svg(200, 200, "<circle cx='100' cy='100' r='94' fill='none' stroke='#b8862f' stroke-width='8' stroke-dasharray='6.15 6.15'/>"
  "<circle cx='100' cy='100' r='89' fill='none' stroke='#d9a84e' stroke-width='4'/><circle cx='100' cy='100' r='86.5' fill='none' stroke='#5a3d17' stroke-width='1.2'/>"
  + ''.join(f"<circle cx='{100 + 89 * math.cos(a):.2f}' cy='{100 + 89 * math.sin(a):.2f}' r='1.1' fill='#5a3d17'/>" for a in [k * math.pi / 12 for k in range(24)])))
def gear(cx, cy, r, teeth, col, op, spokes=6):
    t = 2 * math.pi * r / (teeth * 2)
    g = f"<g fill='none' stroke='{col}' stroke-opacity='{op}'><circle cx='{cx}' cy='{cy}' r='{r}' stroke-width='{r*.16:.1f}' stroke-dasharray='{t:.2f} {t:.2f}'/>"
    g += f"<circle cx='{cx}' cy='{cy}' r='{r*.86:.1f}' stroke-width='{r*.09:.1f}'/><circle cx='{cx}' cy='{cy}' r='{r*.2:.1f}' stroke-width='{r*.12:.1f}'/>"
    for k in range(spokes):
        a = k * math.pi * 2 / spokes
        g += f"<path d='M{cx + r*.26*math.cos(a):.1f} {cy + r*.26*math.sin(a):.1f}L{cx + r*.8*math.cos(a):.1f} {cy + r*.8*math.sin(a):.1f}' stroke-width='{r*.08:.1f}' stroke-linecap='round'/>"
    return g + '</g>'
A['GEAR_BIG'] = uri(svg(240, 240, gear(120, 120, 100, 24, '#d9a84e', .16)))
A['GEAR_MID'] = uri(svg(160, 160, gear(80, 80, 64, 16, '#d9a84e', .13, 5)))
A['GEAR_SMALL'] = uri(svg(60, 60, gear(30, 30, 24, 10, '#e6c47e', 1, 4)))
# 自然：叶环 / 悬挂藤蔓
lf = "M0 0C3.3-2.7 3.7-8.8 0-12.6C-3.7-8.8-3.3-2.7 0 0Z"
ring = ''.join(f"<g transform='rotate({k * 10} 100 100) translate(100 8) rotate({160 if k % 2 else 200}) scale(1.05)'><path d='{lf}' fill='{'#5b8c4e' if k % 3 else '#8db36f'}'/></g>" for k in range(36))
A['LEAF_RING'] = uri(svg(200, 200, "<circle cx='100' cy='100' r='93' fill='none' stroke='#4d7a46' stroke-width='1.6'/>" + ring))
vine = "<path d='M60 0C58 60 70 110 52 170C40 210 50 250 46 300' fill='none' stroke='#4d7a46' stroke-width='2' stroke-linecap='round'/>"
for k, (x, y, r, s) in enumerate([(58, 40, 120, 1.3), (63, 80, 230, 1.1), (64, 118, 125, 1.4), (55, 160, 240, 1.2), (47, 200, 118, 1.3), (48, 240, 235, 1.1), (46, 282, 130, 1.0)]):
    vine += f"<g transform='translate({x} {y}) rotate({r}) scale({s})'><path d='{lf}' fill='{'#5b8c4e' if k % 2 else '#8db36f'}'/></g>"
A['VINE'] = uri(svg(100, 300, vine))
fern = "<path d='M10 260C40 200 70 140 120 70' fill='none' stroke='#4d7a46' stroke-width='2.2' stroke-linecap='round'/>"
for k in range(9):
    t = k / 9; x = 10 + 110 * t; y = 260 - 190 * t + 20 * t * t
    for sgn in (1, -1):
        fern += f"<g transform='translate({x:.1f} {y:.1f}) rotate({(-35 if sgn > 0 else 95) - 10 * t:.0f}) scale({1.5 - .8 * t:.2f})'><path d='{lf}' fill='{'#5b8c4e' if sgn > 0 else '#8db36f'}'/></g>"
A['FERN'] = uri(svg(140, 270, fern))
# 魔法：符文法阵圈
runes = ''.join(f"<path d='M0-4v8M0-4l3 2.4M0-.4l3 2.4' transform='rotate({k * 15} 100 100) translate(100 9)'/>" if k % 3 == 0 else (f"<path d='M-2.4-4l4.8 8M2.4-4l-4.8 8' transform='rotate({k * 15} 100 100) translate(100 9)'/>" if k % 3 == 1 else f"<path d='M0-4l2.8 4L0 4l-2.8-4z' transform='rotate({k * 15} 100 100) translate(100 9)'/>") for k in range(24))
A['RUNE_RING'] = uri(svg(200, 200, f"<g fill='none' stroke='#e9cd85' stroke-linecap='round'><circle cx='100' cy='100' r='97' stroke-width='1.4'/><circle cx='100' cy='100' r='83' stroke-width='1'/><g stroke-width='1.2'>{runes}</g></g>"))
A['MAGIC_CIRCLE'] = uri(svg(300, 300, "<g fill='none' stroke='#dcb65a' stroke-opacity='.12' stroke-width='1.4'><circle cx='150' cy='150' r='140'/><circle cx='150' cy='150' r='124'/><circle cx='150' cy='150' r='70'/>"
  "<path d='M150 26L257 212H43zM150 274L43 88h214z'/>" + ''.join(f"<path d='M0-5v10M0-5l4 3' transform='rotate({k * 20} 150 150) translate(150 18)'/>" for k in range(18)) + "</g>"))
# 星野：轨道圈 + 行星；远处大行星
A['ORBIT_RING'] = uri(svg(200, 200, "<circle cx='100' cy='100' r='96' fill='none' stroke='#b9c2dc' stroke-opacity='.6' stroke-width='1' stroke-dasharray='3 5'/>"
  "<g transform='translate(167.9 32.1)'><circle r='6' fill='#5fd3c4'/><ellipse rx='10' ry='3' fill='none' stroke='#ff8f45' stroke-width='1.3' transform='rotate(-25)'/></g>"))
A['PLANET_BIG'] = uri(svg(220, 160, "<defs><radialGradient id='g' cx='35%' cy='35%'><stop offset='0' stop-color='#9a8cff'/><stop offset='1' stop-color='#3d3484'/></radialGradient></defs>"
  "<ellipse cx='110' cy='80' rx='104' ry='22' fill='none' stroke='#ff8f45' stroke-opacity='.35' stroke-width='3' transform='rotate(-14 110 80)'/>"
  "<circle cx='110' cy='80' r='50' fill='url(#g)' fill-opacity='.55'/>"
  "<path d='M14 92C60 108 160 88 206 64' fill='none' stroke='#ff8f45' stroke-opacity='.45' stroke-width='3' transform='rotate(-4 110 80)'/>"))
A['MOON'] = uri(svg(40, 40, "<circle cx='20' cy='20' r='14' fill='#b9c2dc' fill-opacity='.35'/><circle cx='15' cy='16' r='3' fill='#0f1527' fill-opacity='.25'/><circle cx='24' cy='25' r='2' fill='#0f1527' fill-opacity='.25'/>"))
# 墨：墨迹晕开（遮罩）+ 墨点
random.seed(9)
pts = []
for k in range(48):
    a = k / 48 * 2 * math.pi; r = 92 + 6 * math.sin(k * 1.7) + random.uniform(-5, 4)
    if k % 7 == 0: r += 7
    pts.append((100 + r * math.cos(a), 100 + r * math.sin(a)))
d = 'M' + ' '.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'
A['INKBLOT'] = uri(svg(200, 200, f"<path d='{d}' fill='#000'/>"))
A['INKDROP'] = uri(svg(30, 30, "<path d='M15 3c5 8 9 12 9 17a9 9 0 0 1-18 0c0-5 4-9 9-17z' fill='#1e1c19'/>"))
A['SPLASH'] = uri(svg(80, 80, "<g fill='#1e1c19'><circle cx='40' cy='40' r='12'/><circle cx='18' cy='30' r='4'/><circle cx='64' cy='26' r='3'/><circle cx='60' cy='60' r='5'/><circle cx='22' cy='62' r='3'/><circle cx='40' cy='12' r='2.5'/><circle cx='70' cy='44' r='2'/></g>"))
# 苍穹：云墙（左右）
def cloudbank(flip):
    random.seed(3 if flip else 4)
    sh = ''; wh = ''; puff = ''; tex = ''
    for y in range(-30, 960, 54):
        r = random.uniform(40, 64); cx = 172 + random.uniform(-14, 20)
        sh += f"<circle cx='{cx + 4:.0f}' cy='{y + 11:.0f}' r='{r:.0f}'/>"
        wh += f"<circle cx='{cx:.0f}' cy='{y:.0f}' r='{r:.0f}'/>"
        if random.random() < .55:
            pr = random.uniform(16, 26); px = cx + r * .72; py = y + random.uniform(-18, 18)
            puff += f"<circle cx='{px + 2:.0f}' cy='{py + 6:.0f}' r='{pr:.0f}' fill='#cfe1f3'/><circle cx='{px:.0f}' cy='{py:.0f}' r='{pr:.0f}' fill='#fff'/>"
    for k in range(7):
        y = random.uniform(40, 860); x = random.uniform(30, 130); r = random.uniform(26, 44)
        tex += f"<path d='M{x - r:.0f} {y:.0f}a{r:.0f} {r:.0f} 0 0 1 {2 * r:.0f} 0' fill='none' stroke='#e3eef9' stroke-width='3' stroke-linecap='round'/>"
    g = ("<defs><linearGradient id='cg' x1='0' x2='1'><stop offset='0' stop-color='#f3f8fd'/><stop offset='1' stop-color='#ffffff'/></linearGradient></defs>"
         f"<g fill='#cfe1f3'>{sh}</g>{puff}<rect x='0' y='-40' width='174' height='1000' fill='url(#cg)'/><g fill='#ffffff'>{wh}</g>")
    body = f"<g{' transform=\"translate(260 0) scale(-1 1)\"' if flip else ''}>{g}</g>".replace('"', "'")
    return svg(260, 900, body)
A['CLOUD_L'] = uri(cloudbank(False)); A['CLOUD_R'] = uri(cloudbank(True))
# 糖果：背景糖果
A['LOLLY'] = uri(svg(60, 90, "<path d='M30 50v38' stroke='#1f1b3a' stroke-width='3' stroke-linecap='round'/><circle cx='30' cy='28' r='24' fill='#ff8fb1' stroke='#1f1b3a' stroke-width='2.5'/>"
  "<path d='M30 28m-15 0a15 15 0 1 1 30 0a10 10 0 1 1-20 0a5 5 0 1 1 10 0' fill='none' stroke='#fff' stroke-width='3' stroke-linecap='round'/>"))
A['WRAPPED'] = uri(svg(80, 44, "<path d='M14 22L2 10v24zM66 22l12-12v24z' fill='#ffe066' stroke='#1f1b3a' stroke-width='2.2' stroke-linejoin='round'/>"
  "<rect x='14' y='8' width='52' height='28' rx='14' fill='#7048e8' stroke='#1f1b3a' stroke-width='2.5'/><path d='M26 12l-6 20M38 12l-6 20M50 12l-6 20' stroke='#fff' stroke-opacity='.5' stroke-width='3'/>"))
A['GUMMY'] = uri(svg(50, 56, "<path d='M25 6c-8 0-12 6-11 12-6 2-8 10-4 15-4 6-1 15 6 16 2 5 16 5 18 0 7-1 10-10 6-16 4-5 2-13-4-15 1-6-3-12-11-12z' fill='#2fbf71' stroke='#1f1b3a' stroke-width='2.5'/><circle cx='20' cy='18' r='2' fill='#1f1b3a'/><circle cx='30' cy='18' r='2' fill='#1f1b3a'/>"))
# 霓虹：城市天际线 + 窗灯
random.seed(12); sk = ''; win = ''; x = 0
while x < 520:
    w = random.choice([28, 36, 44, 52]); h = random.choice([70, 96, 120, 150, 180, 110]); sk += f"<rect x='{x}' y='{200 - h}' width='{w}' height='{h}'/>"
    if random.random() < .35: sk += f"<rect x='{x + w / 2 - 1}' y='{200 - h - 18}' width='2' height='18'/>"
    for wy in range(200 - h + 10, 196, 12):
        for wx in range(x + 5, x + w - 6, 9):
            if random.random() < .22: win += f"<rect x='{wx}' y='{wy}' width='4' height='5'/>"
    x += w + random.choice([2, 4, 6])
A['SKYLINE'] = uri(svg(520, 200, f"<g fill='#0a0d13'>{sk}</g>"))
A['WINDOWS'] = uri(svg(520, 200, f"<g fill='#f3e600' fill-opacity='.55'>{win}</g>"))
# 狩猎：吊灯 + 爪痕（红）
A['LANTERN'] = uri(svg(46, 120, "<path d='M23 0v34' stroke='#7a5a36' stroke-width='2'/><path d='M14 34h18l-2 6H16z' fill='#5e4026'/>"
  "<path d='M15 40h16l3 34H12z' fill='#ffcf7a' fill-opacity='.35' stroke='#5e4026' stroke-width='2.4' stroke-linejoin='round'/><path d='M23 40v34' stroke='#5e4026' stroke-width='1.6'/>"
  "<path d='M11 74h24l-3 7H14z' fill='#5e4026'/><circle cx='23' cy='34' r='3' fill='none' stroke='#7a5a36' stroke-width='2'/>"))
A['CLAWS_R'] = uri(svg(76, 64, "<g fill='#8f2817' fill-opacity='.55' transform='rotate(18 38 32)'><path d='M22 2c4 14 6 30 2 52 4-20 4-36 0-50z'/><path d='M40 0c5 16 7 34 1 60 6-24 6-42-1-58z'/><path d='M58 4c4 14 5 28 0 48 6-18 6-32 0-46z'/></g>"))
# 手帐：铅笔 + 手绘勾 + 小星星
A['PENCIL'] = uri(svg(18, 60, "<path d='M5 4h8v40l-4 10-4-10z' fill='#ffd23f' stroke='#22304a' stroke-width='1.4' stroke-linejoin='round'/><path d='M5 44h8l-4 10z' fill='#f6d7a7' stroke='#22304a' stroke-width='1.2'/><path d='M8 51l1 3 1-3z' fill='#22304a'/><rect x='5' y='1' width='8' height='5' fill='#e5638a' stroke='#22304a' stroke-width='1.2'/>"))
A['CHECK'] = uri(svg(60, 50, "<path d='M6 26c6 4 10 10 14 16C28 26 38 14 54 4' fill='none' stroke='#e0454f' stroke-width='4.5' stroke-linecap='round' stroke-linejoin='round'/>"))
A['DOODLE_STAR'] = uri(svg(24, 24, "<path d='M12 2l2.6 6.6 7 .6-5.3 4.6 1.6 6.9L12 17l-5.9 3.7 1.6-6.9L2.4 9.2l7-.6z' fill='none' stroke='#2f5fd0' stroke-width='1.6' stroke-linejoin='round'/>"))
# 竞技：闪电标志
A['BOLT'] = uri(svg(40, 48, "<path d='M22 2H38L26 20H36L10 46L17 26H4Z' fill='#f26a2a'/>"))
# 学园：白星
A['STAR_W'] = uri(svg(40, 40, "<path d='M20 2l5 12.5 13.5 1-10.3 8.8 3.2 13.2L20 30.3 8.6 37.5l3.2-13.2L1.5 15.5l13.5-1z' fill='#fff'/>"))
json.dump(A, open('assets.json', 'w'))

# ───────── 3.1 细节修正 ─────────
import math
# 苍穹：朝右飞的飞艇，尾部螺旋桨在转（ANIM），静态版给滚动装饰在减少动态时用
def airship(anim):
    prop = ("<ellipse cx='30' cy='42' rx='1.6' ry='7' fill='#5b4a2a'>"
            + ("<animate attributeName='ry' values='7;1.2;7' dur='0.18s' repeatCount='indefinite'/>" if anim else '') + "</ellipse>")
    return svg(96, 54,
      "<path d='M22 14L8 3H5l6 14z M22 26L8 37H5l6-14z' fill='#c99a3a'/><path d='M20 20L3 16v8z' fill='#a97f2a'/>"
      "<ellipse cx='50' cy='20' rx='34' ry='14' fill='#f7f2e6' stroke='#c99a3a' stroke-width='1.6'/>"
      "<path d='M17 20h66M24 11c10 2 36 2 50 0M24 29c10-2 36-2 50 0' stroke='#d8bf86' stroke-width='1' fill='none'/>"
      "<path d='M78 13c3 2 4 5 4 7' stroke='#fff' stroke-width='2' fill='none' stroke-linecap='round' opacity='.8'/>"
      "<path d='M40 33l-3 6M62 33l3 6' stroke='#8a6a2a' stroke-width='1'/>"
      "<rect x='34' y='39' width='34' height='8' rx='3' fill='#2f62c9' stroke='#1f3358' stroke-width='1'/>"
      "<g fill='#ffe9a8'><rect x='40' y='41.5' width='4' height='3' rx='1'/><rect x='48' y='41.5' width='4' height='3' rx='1'/><rect x='56' y='41.5' width='4' height='3' rx='1'/></g>"
      "<path d='M34 43h-4' stroke='#5b4a2a' stroke-width='1.4'/>" + prop)
A['AIRSHIP2'] = uri(airship(True)); A['AIRSHIP2S'] = uri(airship(False))

# 狩猎：真实一点的爪痕——两头尖、先深后浅、边缘毛糙；外圈是被翻起的浅色纸纤维，里面是深色划槽
random.seed(77)
def bez(p, t):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = p; u = 1 - t
    return (u**3*x0 + 3*u*u*t*x1 + 3*u*t*t*x2 + t**3*x3, u**3*y0 + 3*u*u*t*y1 + 3*u*t*t*y2 + t**3*y3)
def prof(t, peak=.28):
    return (t / peak) ** .55 if t < peak else ((1 - t) / (1 - peak)) ** .85
def gouge(p, W, n=46, scale=1.0, shift=0.0, jit=1.0, seed=0):
    rnd = random.Random(seed)
    L, R = [], []
    for i in range(n + 1):
        t = i / n; x, y = bez(p, t); x2, y2 = bez(p, min(1, t + .01)) if t < 1 else bez(p, t)
        if t >= 1: xa, ya = bez(p, t - .01); dx, dy = x - xa, y - ya
        else: dx, dy = x2 - x, y2 - y
        d = math.hypot(dx, dy) or 1; nx, ny = -dy / d, dx / d
        w = W * prof(t) * scale / 2
        j1 = rnd.uniform(-1, 1) * jit * (.4 + w / 6); j2 = rnd.uniform(-1, 1) * jit * (.4 + w / 6)
        if rnd.random() < .12: j1 += rnd.choice([-1, 1]) * jit * 2.2
        if rnd.random() < .12: j2 += rnd.choice([-1, 1]) * jit * 2.2
        cx, cy = x + nx * shift * w, y + ny * shift * w
        L.append((cx + nx * (w + j1), cy + ny * (w + j1))); R.append((cx - nx * (w + j2), cy - ny * (w + j2)))
    pts = L + R[::-1]
    return 'M' + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + 'Z'
def claw_set(claws, W, rim, mid, core, flecks):
    g = ''
    for k, p in enumerate(claws):
        js = min(1, W / 24); g += f"<path d='{gouge(p, W * 1.0 + 5 * js, jit=1.6 * js, seed=k * 3)}' fill='{rim}' fill-opacity='.95'/>"
        g += f"<path d='{gouge(p, W, jit=1.1 * js, seed=k * 3 + 1)}' fill='{mid}'/>"
        g += f"<path d='{gouge(p, W * .48, shift=.25, jit=.6 * js, seed=k * 3 + 2)}' fill='{core}'/>"
    rnd = random.Random(5)
    for k, p in enumerate(claws):      # 细小的平行刮痕 + 翻起的纸屑
        for s in (-1, 1):
            if rnd.random() < .7:
                a, b = rnd.uniform(.15, .4), rnd.uniform(.5, .8); off = s * W * rnd.uniform(.75, 1.1); seg = []
                for i in range(13):
                    t = a + (b - a) * i / 12; x, y = bez(p, t); xa, ya = bez(p, t + .005)
                    d = math.hypot(xa - x, ya - y) or 1; seg.append((x - (ya - y) / d * off, y + (xa - x) / d * off))
                g += "<path d='M" + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in seg) + f"' fill='none' stroke='{mid}' stroke-opacity='.5' stroke-width='{W * .05:.2f}' stroke-linecap='round'/>"
        for _ in range(flecks):
            t = rnd.uniform(.1, .85); x, y = bez(p, t); r = rnd.uniform(1, 2.6) * W / 22
            x += rnd.uniform(-1, 1) * W * 1.1; y += rnd.uniform(-1, 1) * W * .8
            ang = rnd.uniform(0, 6.28)
            pts = [(x + math.cos(ang + i * 2.1) * r * rnd.uniform(.6, 1.3), y + math.sin(ang + i * 2.1) * r * rnd.uniform(.6, 1.3)) for i in range(3)]
            g += "<path d='M" + ' L'.join(f'{a:.1f} {b:.1f}' for a, b in pts) + f"Z' fill='{rnd.choice([rim, mid])}'/>"
    return g
CLAW_TX = [((300, 70), (262, 290), (150, 540), (52, 770)),
           ((356, 118), (318, 350), (206, 610), (110, 830)),
           ((402, 196), (366, 420), (262, 660), (170, 880))]
A['CLAW_TX'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 390 844' preserveAspectRatio='none'>{claw_set(CLAW_TX, 28, '#f3e3bd', '#5b1d0e', '#250b04', 7)}</svg>")
# 沿中间那道爪痕把纸撕成两半：clip-path 多边形（x 用元素宽度百分比，y 相对当前视口 = var(--y0) + vh）
rnd = random.Random(9); tear = []
P = CLAW_TX[1]
for i in range(29):
    t = i / 28; x, y = bez(P, t)
    x += rnd.uniform(-2.5, 2.5) + (rnd.choice([-1, 1]) * 4 if rnd.random() < .25 else 0)
    tear.append((x, y))
top = (bez(P, 0)[0] + 6, -10); bot = (bez(P, 1)[0] - 6, 854)
tear = [top] + tear + [bot]
fx = lambda x: f'{x / 390 * 100:.2f}%'
fy = lambda y: f'calc(var(--y0, 0px) + {y / 844 * 100:.2f}vh)'
seq = [f'{fx(x)} {fy(y)}' for x, y in tear]
A['TEAR_L'] = f"polygon(0 0, {fx(top[0])} 0, " + ', '.join(seq) + f", {fx(bot[0])} 100%, 0 100%)"
A['TEAR_R'] = f"polygon({fx(top[0])} 0, 100% 0, 100% 100%, {fx(bot[0])} 100%, " + ', '.join(seq[::-1]) + ")"
# 记录反应用的小爪痕（同样的画法）
CLAW_S = [((60, 6), (52, 30), (36, 60), (22, 86)), ((80, 4), (72, 32), (56, 62), (44, 90)), ((98, 10), (92, 36), (78, 64), (66, 88))]
A['CLAWS_R'] = uri(f"<svg xmlns='http://www.w3.org/2000/svg' width='110' height='92' viewBox='0 0 110 92'>{claw_set(CLAW_S, 8, '#f3e3bd', '#7a2412', '#2a0c05', 2)}</svg>")
json.dump(A, open('assets.json', 'w'))
