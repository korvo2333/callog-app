"""有氧：5 种入口的公式（MET / ACSM / 手表 kcal / Compendium）+ 拍照 / 文字 AI 识别。
先用带密码 abc 的 Code.gs 启动 test/server.js（CODE_PATH=...），再运行：python3 test/cardio.py [截图目录]"""
import json, math, os, sys, urllib.request
from playwright.sync_api import sync_playwright
from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/cardio'
os.makedirs(OUT, exist_ok=True)
SHIM = '''
function mk(s, f) { return { withSuccessHandler: fn => mk(fn, f), withFailureHandler: fn => mk(s, fn),
  api: arg => { fetch('http://localhost:8787/exec', {method: 'POST', body: arg}).then(r => r.json()).then(s, e => f(e)); } }; }
if (location.port === '8787') window.google = { script: { get run() { return mk(() => {}, () => {}); } } };
'''
ok = bad = 0
def check(c, msg):
    global ok, bad
    print(('PASS ' if c else 'FAIL ') + msg); ok += bool(c); bad += (not c)

# ── 期望值（和 App 用同样的标准公式，独立算一遍）──
BMR, RF, SK, KG = 1650, 1.15, 30, 77.2
jr = lambda x: math.floor(x + 0.5)            # JS Math.round
rest = lambda m: BMR * RF / 1440 * m
def acsm(kmh, gr, gait):
    S, G = kmh * 1000 / 60, gr / 100
    return 0.2 * S + 0.9 * S * G + 3.5 if gait == 'run' else 0.1 * S + 1.8 * S * G + 3.5
def cnt(gross, m, steps): return max(0, jr(gross - rest(m) - steps * SK / 1000))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SHIM)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('dialog', lambda d: errs.append('native dialog: ' + d.message) or d.accept())
    pg.goto('http://localhost:8787/app'); pg.wait_for_timeout(1500)
    if pg.is_visible('#lock'):
        pg.fill('#lock-in', 'abc'); pg.click('#lock .btn.pri'); pg.wait_for_timeout(2500)
    ev = pg.evaluate
    ev("LOCAL.folds = {}; LOCAL.theme = 'ios'; applyTheme(); ensureFormula(); VIEW.date = today(); go('today')"); pg.wait_for_timeout(800)
    ev("""[77.4, 77.0, 77.2, 77.2].forEach((w, i) => upsertRow('body', {id: 'b_cd' + i, date: addDays(today(), -i), weight: w, bodyfat: i ? null : 17, muscle: null, note: ''}));
      upsertRow('body', {id: 'b_old', date: addDays(today(), -20), weight: 80, bodyfat: null, muscle: null, note: ''});
      setSetting('bmr', 1650); setSetting('restFactor', 1.15); setSetting('stepKcal', 30); setSetting('ellCadence', 20); renderToday()""")
    check(ev("bodyKg(today())") == {'kg': 77.2, 'src': '7d', 'n': 4}, 'weight = 7-day average (older weights ignored)')
    check(ev("bodyKg(addDays(today(), -10)).kg") == 80 and ev("bodyKg(addDays(today(), -10)).src") == 'last', 'no weights in that week → last weigh-in before it')

    def prev(): return pg.inner_text('#x-prev').replace('\n', ' ')
    def plus(): return int(pg.inner_text('#x-prev .cd-prev-r b').replace('+', '').replace(',', ''))
    def opn():
        ev("closeSheet()"); pg.wait_for_timeout(250); pg.click('.act-add'); pg.wait_for_timeout(350)
    def fill(**kw):
        for k, v in kw.items(): pg.fill('#x-' + k, str(v))

    # ── 表单：5 种、图标、无障碍 ──
    opn()
    check(ev("[...document.querySelectorAll('.cd-opt')].map(b => b.dataset.k).join()") == 'ell,tread,run,box,other', 'five kinds: 椭圆机 跑步机 跑步 拳击 其他')
    check(ev("[...document.querySelectorAll('.cd-opt')].every(b => b.getAttribute('role') === 'radio' && b.querySelector('.act-ic svg'))"), 'tiles are radios with icons')
    check(ev("[...document.querySelectorAll('.cd-ai-b')].every(b => b.getBoundingClientRect().height >= 44)") and ev("document.querySelectorAll('.cd-ai-b').length") == 3, 'AI strip: 拍照识别 / 选截图 / 写一句, ≥44px tall')
    check(not pg.is_visible('#cd-ai-text'), 'text box hidden until 写一句')
    pg.click('.cd-ai-w'); check(pg.is_visible('#cd-ai-text') and ev("document.querySelector('.cd-ai-w').getAttribute('aria-expanded')") == 'true', '写一句 opens the text box'); pg.click('.cd-ai-w')
    vis = lambda: ev("[...document.querySelectorAll('#sheet-body .cd-f:not(.cd-kt)')].filter(e => e.offsetParent).map(e => e.dataset.f).join()")

    # ① 椭圆机：机器 kcal × 90% − 静息 − 步数（按设置的步频 20）
    pg.click('.cd-opt[data-k="ell"]')
    check(vis() == 'mins,kcal,met,steps', 'ell fields: 时长 / kcal / MET / 步数 (' + vis() + ')')
    fill(mins=49.8, kcal=400)
    e1 = cnt(400 * .9, 49.8, jr(49.8 * 20))
    check(plus() == e1 and '400 × 90%' in prev() and '996 步，按 20 步/分估' in prev(), f'ell device: +{e1} ({prev()})')
    check(pg.get_attribute('#x-steps', 'placeholder') == '约 996', 'steps placeholder shows the estimate')
    fill(steps=1500)
    check(plus() == cnt(360, 49.8, 1500) and '1,500 步）' in prev(), 'ell with real watch steps')
    fill(steps='', met=5.7)
    e1m = cnt(5.7 * KG * 49.8 / 60, 49.8, 996)
    check(plus() == e1m and 'MET 5.7 × 77.2 kg × 0.83 h' in prev() and '近 7 天平均（4 次）' in prev(), f'ell screen MET × 7-day weight: +{e1m}')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(400)
    e = ev("DB.log.filter(e => e.type === 'burn').pop()")
    d = json.loads(e['detail'])
    check(e['name'] == '椭圆机' and e['kcal'] == 400 and d['src'] == 'met' and d['cnt'] == e1m and d['kg'] == 77.2 and d['met'] == 5.7, f'ell saved with detail ({e["note"]})')
    check(abs(e['ratio'] - e1m / 400 * 100) < .01 and ev(f"cardioCounted(DB.log.find(x => x.id === '{e['id']}'))") == e1m, 'ratio = counted / machine kcal')
    check(e['note'] == '49.8 分钟 · MET 5.7', 'note: 49.8 分钟 · MET 5.7')
    check(ev("dayInfo(today()).parts.cardioK") == e1m, 'day total includes it')

    # ② 跑步机：ACSM（走 / 跑按速度自动，也能手动换）
    opn(); pg.click('.cd-opt[data-k="tread"]')
    check(vis() == 'mins,speed,grade,kcal,steps,gait', 'tread fields: 时长 / 速度 / 坡度 / kcal / 步数 / 走跑 (' + vis() + ')')
    pg.fill('#x-mins', '49.8'); pg.fill('#x-kcal', '')
    fill(speed=5, grade=12)
    g = acsm(5, 12, 'walk') * KG * 49.8 * 5 / 1000
    e2 = cnt(g, 49.8, jr(49.8 * 110))
    check(plus() == e2 and 'ACSM 走路公式 5 km/h · 坡度 12%' in prev() and '按 110 步/分估' in prev(), f'incline walk 5 km/h 12%: +{e2} ({prev()})')
    check('（按速度）' in pg.inner_text('#x-gait') and ev("document.querySelector('#x-gait [aria-checked=true]').textContent").startswith('走'), 'gait auto = 走')
    fill(speed=9, grade=1)
    e2r = cnt(acsm(9, 1, 'run') * KG * 49.8 * 5 / 1000, 49.8, jr(49.8 * 163))
    check(plus() == e2r and 'ACSM 跑步公式' in prev(), f'9 km/h auto → run equation: +{e2r}')
    pg.click('#x-gait button >> text=走')
    check(plus() == cnt(acsm(9, 1, 'walk') * KG * 49.8 * 5 / 1000, 49.8, jr(49.8 * 130)) and '（按速度）' not in pg.inner_text('#x-gait'), 'tap 走 overrides auto gait')
    pg.click('#x-gait button >> text=跑')   # 回到跑，换速度
    fill(speed=5, grade=12); pg.click('#x-gait button >> text=走')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(400)
    e = ev("DB.log.filter(e => e.type === 'burn').pop()")
    check(e['name'] == '跑步机爬坡' and e['note'] == '49.8 分钟 · 5 km/h · 坡度 12% · 走' and json.loads(e['detail'])['cnt'] == e2, f'tread saved as 跑步机爬坡 ({e["note"]})')
    ev(f"editEntry('{e['id']}')"); pg.wait_for_timeout(350)
    check(ev("BURN.k") == 'tread' and pg.input_value('#x-speed') == '5' and pg.input_value('#x-grade') == '12' and plus() == e2, 'edit restores treadmill speed / grade')

    # ③ 跑步：距离 → ACSM；没距离按手表；「活动消耗」加回基础代谢
    opn(); pg.click('.cd-opt[data-k="run"]')
    check(vis() == 'mins,dist,kcal,steps', 'run fields: 时长 / 距离 / kcal / 步数 (' + vis() + ')')
    fill(mins=30, dist=5, kcal='')
    e3 = cnt(acsm(10, 0, 'run') * KG * 30 * 5 / 1000, 30, jr(30 * 165))
    check(plus() == e3 and 'ACSM 跑步公式 10 km/h' in prev(), f'run 5 km / 30 min: +{e3}')
    fill(dist='', kcal=300)
    check(plus() == cnt(270, 30, jr(30 * 164)), 'run without distance → watch kcal × 90%')
    pg.check('#x-kt')
    check(plus() == cnt(270 + BMR / 1440 * 30, 30, jr(30 * 164)) and '基础代谢 34' in prev(), 'active kcal: adds BMR back before subtracting rest')
    pg.uncheck('#x-kt')
    fill(mins='')
    check(plus() == 150 and '300 × 50%' in prev(), 'no minutes → falls back to the 50% ratio')

    # ④ 拳击课：没戴手表，按强度（Compendium）
    opn(); pg.click('.cd-opt[data-k="box"]')
    check(vis() == 'lvl,mins,kcal,steps', 'box fields: 时长 / 强度 / kcal / 步数 (' + vis() + ')')
    check(ev("[...document.querySelectorAll('.cd-lv .chip')].map(c => c.textContent.replace(/\\s+/g, ' ').trim()).join(' | ')").startswith('轻松 5.8'), 'levels: 轻松 5.8 / 普通 7.8 / 高强度 9.3')
    check(ev("document.querySelector('.cd-lv .chip.on b').textContent") == '普通', 'default 普通')
    fill(mins=60, kcal='', steps='')
    e4 = cnt(7.8 * KG, 60, 0)
    check(plus() == e4 and '（0 步）' in prev(), f'box 60 min 普通 (7.8): +{e4}, no step overlap')
    pg.click('.cd-lv .chip >> text=高强度')
    check(plus() == cnt(9.3 * KG, 60, 0), 'box 高强度 9.3')
    fill(kcal=600)
    check(plus() == cnt(540, 60, 0) and '600 × 90%' in prev(), 'box with a watch number uses the watch')
    fill(kcal='')
    pg.click('.cd-lv .chip >> text=普通')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(400)
    e = ev("DB.log.filter(e => e.type === 'burn').pop()")
    check(e['name'] == '拳击课' and e['note'] == '60 分钟 · 普通强度' and json.loads(e['detail'])['cnt'] == e4 and abs(e['kcal'] - jr(7.8 * KG)) < 1, f'box saved ({e["note"]}, kcal {e["kcal"]})')
    check(e['note'] in pg.inner_text('#t-list') and pg.locator('.cd-ent').count() == 3, 'list shows the note line')
    ev(f"editEntry('{e['id']}')"); pg.wait_for_timeout(350)
    check(ev("BURN.k") == 'box' and ev("document.querySelector('.cd-lv .chip.on b').textContent") == '普通' and pg.input_value('#x-mins') == '60', 'edit restores box level and minutes')
    # 设置、体重变了，旧记录不变
    ev("setSetting('bmr', 1800); upsertRow('body', {id: 'b_cd9', date: today(), weight: 70, bodyfat: null, muscle: null, note: ''})")
    check(ev(f"cardioCounted(DB.log.find(x => x.id === '{e['id']}'))") == e4, 'saved entries keep their numbers when BMR / weight change')
    ev("setSetting('bmr', 1650); deleteRow('body', 'b_cd9'); renderToday()")

    # ⑤ 其他：名称 + 手表 kcal；没时长按 70%
    opn(); pg.click('.cd-opt[data-k="other"]')
    check(pg.is_visible('#x-name') and vis() == 'mins,kcal,met,steps' and pg.is_visible('#x-kt'), 'other: name + 时长 / kcal / MET / 步数 + 活动消耗')
    fill(mins='', kcal=100, met='', steps='')
    check(plus() == 70, 'other without minutes: 100 × 70%')
    fill(mins=45, kcal=500)
    check(plus() == cnt(450, 45, 0), 'other with minutes: × 90% − rest, steps 0 unless entered')
    ev("closeSheet()")

    # ── AI：拍器械屏幕 ──
    jpg = OUT + '/machine.jpg'; Image.new('RGB', (900, 1200), (30, 32, 40)).save(jpg, quality=80)
    opn()
    pg.set_input_files('#cd-gal', jpg)
    pg.wait_for_selector('.cd-ai-msg b', timeout=15000); pg.wait_for_timeout(250)
    st = pg.inner_text('#cd-ai-st').replace('\n', ' ')
    check('AI 已填好：椭圆机' in st and '机器按约 85 kg' in st and '$' in st and ev("!!document.querySelector('.cd-ai-th')"), 'AI result card: name, note, cost, thumbnail')
    check(ev("BURN.k") == 'ell' and pg.input_value('#x-mins') == '49.8' and pg.input_value('#x-kcal') == '400' and pg.input_value('#x-met') == '5.7' and pg.input_value('#x-steps') == '', 'AI filled the elliptical form (steps left to the estimate)')
    check(plus() == e1m, f'AI result goes through the same formula (+{e1m})')
    req = json.loads(urllib.request.urlopen('http://localhost:8787/lastreq').read())
    txt = req['body']['messages'][0]['content'][-1]['text']
    check(any(c['type'] == 'image' for c in req['body']['messages'][0]['content']), 'photo sent to Claude')
    check('近 7 天平均 77.2 kg（4 次称重）' in txt and '体脂率：17%' in txt and '基础代谢 1650' in txt and '20 步/分' in txt, 'latest averaged state included in the prompt')
    sch = req['body']['output_config']['format']['schema']
    check(sch['properties']['kind']['enum'] == ['ell', 'tread', 'run', 'box', 'other'] and 'Compendium' in req['body']['system'], 'structured output schema + Compendium guidance')
    pg.screenshot(path=OUT + '/ai_photo.png')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(400)
    e = ev("DB.log.filter(e => e.type === 'burn').pop()")
    d = json.loads(e['detail'])
    check(d.get('ai') == 'claude-haiku-5-5' and d.get('mf') == 'screen' and d['cnt'] == e1m, 'saved with AI model in detail')

    # ── AI：只写一句（拳击课，没戴手表）──
    opn(); pg.click('.cd-ai-w'); pg.fill('#cd-ai-text', '拳击课 60 分钟，没戴手表')
    pg.press('#cd-ai-text', 'Enter')
    pg.wait_for_selector('.cd-ai-msg b', timeout=15000); pg.wait_for_timeout(250)
    check(ev("BURN.k") == 'box' and pg.input_value('#x-mins') == '60' and pg.input_value('#x-steps') == '0' and 'MET 7.8（AI 估）' in prev(), 'text-only AI → box, MET estimate, steps 0')
    req = json.loads(urllib.request.urlopen('http://localhost:8787/lastreq').read())
    check(not any(c['type'] == 'image' for c in req['body']['messages'][0]['content']) and '用户补充：拳击课 60 分钟' in req['body']['messages'][0]['content'][-1]['text'], 'text sent without an image')
    pg.screenshot(path=OUT + '/ai_text.png')
    # 旧版 Code.gs：提示更新
    ev("window._api = api; api = () => Promise.reject(new Error('未知操作：aiCardio')); 0")
    pg.fill('#cd-ai-text', '跑步 30 分钟'); pg.click('#cd-ai-tx .btn'); pg.wait_for_timeout(400)
    check('Code.gs 还是旧版' in pg.inner_text('#cd-ai-st') and pg.locator('#cd-ai-st .link').count() == 1, 'old server → tells you to redeploy Code.gs, offers retry')
    ev("api = window._api; closeSheet(); 0"); pg.wait_for_timeout(300)

    # ── 服务器：detail 列 ──
    pg.wait_for_timeout(2500); ev("flush && flush()"); pg.wait_for_timeout(2500)
    dump = json.loads(urllib.request.urlopen('http://localhost:8787/dump').read())
    log = dump['Log']; hd = log[0]
    rows = [dict(zip(hd, r)) for r in log[1:]]
    box = [r for r in rows if r.get('name') == '拳击课']
    check('detail' in hd and box and json.loads(box[0]['detail'])['cnt'] == e4, 'Log sheet has a detail column with the calculation')
    ai_rows = [r for r in dump['AI_Requests'][1:] if '[有氧]' in str(r)]
    check(len(ai_rows) >= 2, 'AI requests logged as [有氧]')

    # ── 设置、主题 ──
    ev("go('settings')"); pg.wait_for_timeout(500)
    ev("LOCAL.folds['set:goals'] = false; LOCAL.folds['set:adv'] = false; renderSettings && renderSettings()"); pg.wait_for_timeout(400)
    txt = pg.inner_text('#s-content')
    check(txt.count('没填时长 %') == 3 and '体重用 77.2 kg' in txt, 'settings: 3 fallback ratios + formula hint with weight')
    ev("LOCAL.theme = 'sumi'; applyTheme()")
    check(ev("cardioIcon('tread') + cardioIcon('box')").count('kj') == 2 and '坂' in ev("cardioIcon('tread')") and '拳' in ev("cardioIcon('box')"), 'sumi theme: 坂 / 拳')
    ev("LOCAL.theme = 'ios'; applyTheme(); go('today')")
    check(not errs, 'no page errors ' + str(errs))
    b.close()
print(f'\n{ok} passed, {bad} failed')
sys.exit(1 if bad else 0)
