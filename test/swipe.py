"""左右滑动换页 + 不缩放：手机模拟（360×780, 触屏），用 CDP 发真实触摸事件。
先用带密码 abc 的 Code.gs 启动 test/server.js（CODE_PATH=...），再运行：python3 test/swipe.py"""
import sys, json
from playwright.sync_api import sync_playwright
SHIM = '''
function mk(s, f) { return { withSuccessHandler: fn => mk(fn, f), withFailureHandler: fn => mk(s, fn),
  api: arg => { fetch('http://localhost:8787/exec', {method: 'POST', body: arg}).then(r => r.json()).then(s, e => f(e)); } }; }
if (location.port === '8787') window.google = { script: { get run() { return mk(() => {}, () => {}); } } };
'''
ok = bad = 0
def check(c, msg):
    global ok, bad
    print(('PASS ' if c else 'FAIL ') + msg); ok += bool(c); bad += (not c)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=3, is_mobile=True, has_touch=True)
    ctx.add_init_script(SHIM)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8787/app'); pg.wait_for_timeout(1500)
    if pg.is_visible('#lock'):
        pg.fill('#lock-in', 'abc'); pg.click('#lock .btn.pri'); pg.wait_for_timeout(2500)
    cdp = ctx.new_cdp_session(pg)

    def swipe(x0, y0, x1, y1, steps=10, dt=16, hold=None):
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x0, 'y': y0}]})
        for i in range(1, steps + 1):
            pg.wait_for_timeout(dt)
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x0 + (x1 - x0) * i / steps, 'y': y0 + (y1 - y0) * i / steps}]})
        r = hold() if hold else None
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
        pg.wait_for_timeout(1900)
        return r
    tab = lambda: pg.evaluate('VIEW.tab')

    for th in ['lime', 'neon', 'ios', 'nature', 'academy']:
        pg.evaluate(f"LOCAL.theme = '{th}'; applyTheme(); go('today')"); pg.wait_for_timeout(1900)
        print('--', th)
        # 拉到一半看提示钮
        st = swipe(300, 420, 120, 430, hold=lambda: pg.evaluate("(() => { const h = document.getElementById('swipe-hint'); return h && { cls: h.className, label: h.querySelector('b').textContent, p: h.style.getPropertyValue('--p'), r: h.getBoundingClientRect().right }; })()"))
        check(tab() == 'train', f'swipe left → train ({tab()})')
        check(st and 'show' in st['cls'] and 'ready' in st['cls'] and 'r' in st['cls'].split() and st['label'] == '训练' and st['r'] <= 360, f'hint shown on right, ready, label 训练 {st}')
        check(pg.evaluate("!document.getElementById('swipe-hint').classList.contains('show')"), 'hint hidden after release')
        swipe(300, 420, 120, 420); check(tab() == 'week', 'swipe left again → week')
        swipe(60, 420, 260, 420); check(tab() == 'train', 'swipe right → train')
        swipe(60, 420, 260, 420); check(tab() == 'today', 'swipe right → today')
        st = swipe(60, 420, 300, 420, hold=lambda: pg.evaluate("document.getElementById('swipe-hint').className"))
        check(tab() == 'today' and 'end' in st and 'ready' not in st, f'first page: no wrap, hint dimmed ({st})')
        if th != 'lime': continue
        # 不该换页的情况
        swipe(250, 420, 215, 420, steps=8, dt=40); check(tab() == 'today', 'short slow drag ignored')
        swipe(200, 600, 190, 250); check(tab() == 'today', 'vertical scroll ignored')
        swipe(10, 420, 220, 420); check(tab() == 'today', 'edge start (system back gesture) ignored')
        nb = pg.evaluate("(() => { const r = document.querySelector('.nav').getBoundingClientRect(); return r.top + r.height / 2; })()")
        swipe(300, nb, 100, nb); check(tab() == 'today', 'swipe on bottom nav ignored')
        pg.evaluate("Object.assign(SWIPE, {on: true, h: true, x0: 300, y0: 420, t0: 1000, dx: -48, dy: 4}); swipeEnd(false, 1090)"); pg.wait_for_timeout(1900)
        check(tab() == 'train', 'quick flick (48px in 90ms) → train')
        pg.evaluate("Object.assign(SWIPE, {on: true, h: true, x0: 300, y0: 420, t0: 1000, dx: -48, dy: 4}); swipeEnd(false, 1500)"); pg.wait_for_timeout(1900)
        check(tab() == 'train', 'slow 48px drag → stays')
        pg.evaluate("go('today')"); pg.wait_for_timeout(1900)
        pg.evaluate("openManual()"); pg.wait_for_timeout(800)
        swipe(300, 300, 80, 300); check(tab() == 'today' and pg.evaluate("document.getElementById('sheet-bg').classList.contains('open')"), 'sheet open: swipe ignored')
        box = pg.evaluate("(() => { const r = document.getElementById('m-name').getBoundingClientRect(); return [r.left + r.width - 20, r.top + r.height / 2]; })()")
        pg.evaluate("closeSheet()"); pg.wait_for_timeout(600)
        pg.evaluate("go('week')"); pg.wait_for_timeout(1900)
        ch = pg.evaluate("(() => { const c = document.querySelector('#scr-week .chart'); if (!c) return null; const r = c.getBoundingClientRect(); return r.height ? [r.left + r.width * .8, r.top + r.height / 2] : null; })()")
        if ch and 60 < ch[1] < 700:
            swipe(ch[0], ch[1], ch[0] - 200, ch[1]); check(tab() == 'week', 'swipe on chart ignored (chart scrub)')
        else: print('skip chart', ch)
        pg.evaluate("go('foods')"); pg.wait_for_timeout(1900)
        fs = pg.evaluate("(() => { const e = document.querySelector('#scr-foods .chips.scroll, #scr-foods .f-sort'); if (!e || e.scrollWidth <= e.clientWidth + 2) return null; const r = e.getBoundingClientRect(); return [r.right - 40, r.top + r.height / 2]; })()")
        if fs: swipe(fs[0], fs[1], fs[0] - 200, fs[1]); check(tab() == 'foods', 'swipe on horizontal scroller ignored')
        else: print('skip scroller (nothing overflows at 360px)')
        # 吸顶顶栏还在
        pg.evaluate("go('today')"); pg.wait_for_timeout(1900)
        pg.evaluate("window.scrollTo(0, 600)"); pg.wait_for_timeout(300)
        top = pg.evaluate("document.querySelector('#scr-today .hd').getBoundingClientRect().top")
        check(abs(top) < 2 and pg.evaluate('scrollY') > 100, f'sticky header still sticks (top={top})')
        pg.evaluate("window.scrollTo(0, 0)")
        # 页面不横向超出，也没被缩放
        check(pg.evaluate("document.documentElement.scrollWidth") == 360 and pg.evaluate("visualViewport.scale") == 1, 'no horizontal overflow, scale 1')
        nav_w = pg.evaluate("document.querySelector('.nav').getBoundingClientRect().width")
        check(abs(nav_w - 360) < 1, f'fixed nav = screen width ({nav_w})')
    check(not errs, 'no page errors ' + str(errs[:3]))
    b.close()
print(f'{ok} pass, {bad} fail')
