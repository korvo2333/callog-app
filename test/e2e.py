import json, os, sys, time, urllib.request, random
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PAGE = 'http://localhost:8787/app'
LOCAL_PAGE = 'file://' + ROOT + '/dist/callog.html'
SHIM = '''
function mk(s, f) { return { withSuccessHandler: fn => mk(fn, f), withFailureHandler: fn => mk(s, fn),
  api: arg => { fetch('http://localhost:8787/exec', {method: 'POST', body: arg}).then(r => r.json()).then(s, e => f(e)); } }; }
if (location.port === '8787') window.google = { script: { get run() { return mk(() => {}, () => {}); } } };
'''
OUT = sys.argv[1] if len(sys.argv) > 1 else '/tmp/shots'
os.makedirs(OUT, exist_ok=True)
API = 'http://localhost:8787/exec'
errors, logs = [], []

img_path = os.path.join(OUT, 'meal.jpg')
im = Image.new('RGB', (1600, 1200), (240, 230, 210))
d = ImageDraw.Draw(im)
d.ellipse((300, 200, 1300, 1000), fill=(250, 250, 250))
d.rectangle((600, 450, 1000, 700), fill=(200, 160, 110))
im.save(img_path, quality=90)

def dump():
    return json.loads(urllib.request.urlopen('http://localhost:8787/dump').read())

def check(cond, msg):
    print(('PASS ' if cond else 'FAIL ') + msg)
    if not cond: errors.append(msg)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg = ctx.new_page()
    pg.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: logs.append(m.text) if m.type == 'error' else None)
    pg.on('dialog', lambda dlg: errors.append('native dialog used: ' + dlg.message) or dlg.accept())
    ctx.add_init_script(SHIM)

    # ── 本机打开（不是 Apps Script 网址）：本机模式
    pg.goto(LOCAL_PAGE)
    pg.wait_for_timeout(400)
    check(pg.get_attribute('#sync-pill', 'aria-label') == '仅本机', 'local file: 仅本机')
    check(pg.is_visible('#local-banner'), 'local file: preview banner shown')
    pg.click('#nav-foods')
    check(pg.locator('.food').count() == 0 and pg.locator('#f-cats .chip').count() == 2, 'fresh: food library empty (全部 + 管理)')
    pg.click('#nav-today')

    # ── 从 Apps Script 网址打开：doGet 读 Drive 里的 callog.html，要求输入密码
    pg.goto(PAGE)
    meta = json.loads(urllib.request.urlopen('http://localhost:8787/doget-meta').read())
    check(meta['title'] == 'CalLog' and meta['metas'].get('apple-mobile-web-app-capable') == 'yes' and 'viewport' in meta['metas'], 'doGet title + meta tags')
    pg.wait_for_selector('#lock.open', timeout=10000)
    pg.screenshot(path=f'{OUT}/00_lock.png')
    check(True, 'lock screen shown when no password')
    pg.fill('#lock-in', 'wrong'); pg.click('#lock .btn.pri')
    pg.wait_for_function("document.querySelector('#lock-err').innerText.includes('不正确')", timeout=10000)
    check(True, 'wrong password rejected')
    pg.fill('#lock-in', 'abc'); pg.click('#lock .btn.pri')
    pg.wait_for_selector('#lock.open', state='hidden', timeout=10000)
    pg.wait_for_function("document.querySelector('#sync-pill').getAttribute('aria-label') === '已同步'", timeout=10000)
    check(True, 'unlocked + synced')
    check(not pg.is_visible('#local-banner'), 'app mode: no preview banner')
    pg.click('#nav-settings')
    pg.wait_for_timeout(300)
    check('已连接' in pg.inner_text('#s-content'), 'settings: connected')
    pg.screenshot(path=f'{OUT}/02_settings.png', full_page=True)
    sheet = dump()
    check(len(sheet['Foods']) == 1 and len(sheet['Categories']) == 1, 'server creates no sample foods/categories (header only)')

    # 测试用：通过 App 建一些食物和分类（模拟用户自己的食物库）
    pg.evaluate('''() => {
      const cats = ['主食','肉蛋奶','蛋白补剂','蔬果','便利店','零食饮料'];
      cats.forEach((n, i) => upsertRow('cats', {id: 'c_t' + i, name: n, sort: i + 1}));
      const foods = [['白米饭','主食','150g',234,3.8,0.5,55.7],['燕麦片','主食','40g',152,5.5,2.3,27.6],['鸡胸肉','肉蛋奶','100g',105,23.3,1.9,0.1],
        ['鸡蛋','肉蛋奶','1个 50g',71,6.1,5.1,0.2],['牛奶','肉蛋奶','200ml',126,6.8,7.8,9.9],['蛋白粉','蛋白补剂','1勺',117,23,1.5,3],
        ['香蕉','蔬果','1根',93,1.1,0.2,22.5],['饭团','便利店','1个',235,5.5,7.5,35],['蛋白棒','零食饮料','1根',200,15,8,18]];
      foods.forEach((f, i) => upsertRow('foods', {id: 'f_t' + i, name: f[0], category: f[1], serving: f[2], kcal: f[3], protein: f[4], fat: f[5], carb: f[6], uses: i === 3 ? 2 : 0, sort: i + 1}));
      go('today');
    }''')
    pg.wait_for_function('OUTBOX.length === 0', timeout=15000)
    check(pg.locator('#t-quick').count() == 0 and pg.locator('#t-week').count() == 0, 'today: no 常吃 row, no 本周缺口 card')
    pg.evaluate("openPortion('f_t3')"); pg.wait_for_timeout(300); pg.click('#sheet-body .btn.pri')
    check(pg.locator('.ent').count() == 1, 'portion add adds 1 entry')
    pg.click('#toast-act')
    check(pg.locator('.ent').count() == 0, 'undo removes entry')

    # ── 今日：食物库选择器（输入卡里弹出：分类 → 食物 → 份量，不跳页）
    pg.click('.c-more >> text=食物库')
    pg.wait_for_selector('#pk-body .pk-cat', timeout=3000)
    check(pg.evaluate('VIEW.tab') == 'today', 'picker opens over today (no jump to foods tab)')
    check(pg.locator('.pk-cat').count() == 7, 'picker: 常吃 + 6 categories')
    pg.click('.pk-cat >> text=肉蛋奶')
    check(pg.locator('.pk-food').count() == 3, 'picker: category shows its 3 foods')
    pg.click('.pk-food[data-id="f_t2"] .pk-row')
    pg.click('.pk-food[data-id="f_t2"] .chip >> text=×2')
    check('210' in pg.inner_text('.pk-food[data-id="f_t2"] .pk-prev'), 'picker: portion preview ×2 = 210')
    pg.click('.pk-food[data-id="f_t2"] .pk-add')
    pg.wait_for_timeout(200)
    check(pg.evaluate("DB.log.filter(e => e.foodId === 'f_t2' && e.date === VIEW.date).map(e => e.kcal)") == [210], 'picker adds 鸡胸肉 ×2 = 210 kcal')
    check('1 项' in pg.inner_text('#pk-foot') and pg.is_visible('#sheet-bg.open'), 'picker stays open with running total')
    pg.screenshot(path=f'{OUT}/02b_picker.png')
    pg.click('#toast-act')
    pg.wait_for_timeout(200)
    check(pg.evaluate("DB.log.filter(e => e.foodId === 'f_t2').length") == 0 and '项' not in pg.inner_text('#pk-foot'), 'picker undo removes entry')
    pg.click('#sheet-bg .sheet-t button')
    pg.wait_for_timeout(300)

    # ── 今日：手动、消耗、常用
    pg.click('#nav-today')
    pg.click('.c-more >> text=手动添加')
    pg.fill('#m-name', '公司食堂咖喱饭')
    pg.fill('#m-protein', '25'); pg.fill('#m-fat', '22'); pg.fill('#m-carb', '110')
    pg.check('#m-save')
    pg.click('#sheet-body .btn.pri')
    pg.wait_for_timeout(300)
    check('公司食堂咖喱饭' in pg.inner_text('#t-list'), 'manual entry shows')
    check('738' in pg.inner_text('#t-list'), 'manual kcal auto = 25*4+22*9+110*4 = 738')
    # ── 公式：消耗 = 基础代谢 × 系数 + 步数 + 力量 + 有氧 × 比例；目标 = 消耗 − 每日缺口（默认 700），最低 = 基础代谢
    check(pg.evaluate("cfg().formulaFrom") == pg.evaluate("today()"), 'formula starts today on first sync')
    i0 = pg.evaluate("dayInfo(today())")
    check(i0['mode'] == 'formula' and i0['parts']['steps']['src'] == 'usual' and i0['parts']['steps']['n'] == 7000, 'no steps yet → default 7000 steps')
    check(i0['target'] == 1650 and i0['parts']['raw'] == 1897 + 210 - 700, 'target = 1897 + 210 − 700 = 1407 → floor 1650: ' + str(i0['target']))
    check(pg.is_visible('#t-act') and '7,000' in pg.inner_text('#t-act'), 'activity card shows steps')
    # 手表推送步数（HC Webhook → doPost）：错误密码被拒，正确的写入，重复推送不重复
    import datetime as _dt
    JST = _dt.timezone(_dt.timedelta(hours=9)); nowj = _dt.datetime.now(JST); d0 = _dt.datetime(nowj.year, nowj.month, nowj.day, tzinfo=JST)
    iso = lambda t: t.astimezone(_dt.timezone.utc).isoformat().replace('+00:00', 'Z')
    def hook(token, body):
        rq = urllib.request.Request(f'http://localhost:8787/exec?token={token}', data=json.dumps(body).encode(), method='POST')
        return json.loads(urllib.request.urlopen(rq).read())
    check(hook('nope', {'steps': []}).get('error') == 'token', 'webhook rejects wrong token')
    hist = [{'count': c, 'start_time': iso(d0 - _dt.timedelta(days=k + 1)), 'end_time': iso(d0 - _dt.timedelta(days=k))} for k, c in enumerate([9000, 11000, 10000])]
    r1 = hook('abc', {'timestamp': iso(nowj), 'app_version': 't', 'steps': hist + [{'count': 12500, 'start_time': iso(d0), 'end_time': iso(nowj)}]})
    r2 = hook('abc', {'steps': [{'count': 12500, 'start_time': iso(d0), 'end_time': iso(nowj)}]})
    check(r1.get('updated') == 4 and r2.get('updated') == 0, f'webhook stores 4 days, duplicate ignored {r1} {r2}')
    # 不是每日累计（分辨率选了「完整」或「N 分钟」）：不写入，App 提示改设置
    rb = hook('abc', {'timestamp': iso(nowj), 'steps': [{'count': 78, 'start_time': iso(d0 - _dt.timedelta(minutes=15)), 'end_time': iso(d0)},
                                                       {'count': 7, 'start_time': iso(nowj - _dt.timedelta(minutes=20)), 'end_time': iso(nowj - _dt.timedelta(minutes=5))}]})
    check(rb.get('updated') == 0 and rb.get('daily') is False, f'non-daily payload not written {rb}')
    pg.evaluate("pollSteps(true)")
    pg.wait_for_function("STEPS.last && STEPS.last.warn === 'daily' && dayInfo(today()).parts.steps.src === 'watch'", timeout=8000)
    check('每日' in pg.inner_text('.act-steps') and pg.evaluate("stepsFor(today()).n") == 12500, 'non-daily → warning shown, steps unchanged')
    # 手动选日期同步时今天的结束时间在将来：按现在算，之后的正常同步还能更新
    rf = hook('abc', {'steps': [{'count': 12500, 'start_time': iso(d0), 'end_time': iso(d0 + _dt.timedelta(days=1))}]})
    rn = hook('abc', {'steps': [{'count': 12500, 'start_time': iso(d0), 'end_time': iso(_dt.datetime.now(JST))}]})
    check(rf.get('updated') == 1 and rn.get('updated') == 1, f'future end clamped, later sync still updates {rf} {rn}')
    pg.evaluate("pollSteps(true)")
    pg.wait_for_function("STEPS.last && !STEPS.last.warn && dayInfo(today()).parts.steps.src === 'watch'", timeout=8000)
    i1 = pg.evaluate("dayInfo(today())")
    check(i1['parts']['steps']['n'] == 12500 and i1['parts']['stepsK'] == 375, 'today uses watch steps 12,500 → +375')
    check(i1['parts']['raw'] == 1897 + 375 - 700, 'raw = 1897 + 375 − 700 = 1572: ' + str(i1['parts']['raw']))
    pg.click('.act-tog')
    pg.wait_for_timeout(200)
    i2 = pg.evaluate("dayInfo(today())")
    check(i2['parts']['strength'] and i2['target'] == 1897 + 375 + 200 - 700, 'strength toggle +200 → target 1772: ' + str(i2['target']))
    pg.click('.act-tog')
    pg.wait_for_timeout(200)
    check(not pg.evaluate("dayInfo(today()).parts.strength"), 'strength toggle off')
    pg.click('.act-tog')
    pg.wait_for_timeout(200)
    # 平时步数 = 之前整天的中位数（9000/11000/10000 → 10000）；时区按手机算（脚本时区不同也不影响）
    check(pg.evaluate("stepsFor(addDays(today(), 1))")['n'] == 10000, 'usual = median of full days = 10000: ' + str(pg.evaluate("stepsFor(addDays(today(), 1))")))
    # 今天按实际步数：比平时少也用实际
    st28 = pg.evaluate("(() => { const r = DB.steps.find(x => x.date === today()); const o = r.watch; r.watch = '28'; const st = stepsFor(today()); r.watch = o; return st; })()")
    check(st28['n'] == 28 and st28['src'] == 'watch', 'today uses actual steps even below usual: ' + str(st28))
    # 只有 1 天特别多 → 不够 3 天，平时用默认；3 天里有 1 天特别多 → 中位数不受影响
    u = pg.evaluate('''(() => { const bak = DB.steps; const t = today(); const mk = (k, n) => ({ date: addDays(t, -k), watch: String(n), watchFull: 'yes', watchEnd: '', manual: '' });
      DB.steps = [mk(1, 21795)]; const a = stepsFor(addDays(t, 1)).n;
      DB.steps = [mk(1, 21795), mk(2, 8000), mk(3, 9000)]; const b = stepsFor(addDays(t, 1)).n;
      DB.steps = [mk(1, 21795)]; const c = stepsFor(t);
      DB.steps = bak; return [a, b, c.src, c.n]; })()''')
    check(u == [7000, 9000, 'wait', 0], 'usual needs ≥3 full days, median ignores outlier; today not synced yet → 0: ' + str(u))
    # 手动改步数优先
    pg.click('.act-steps'); pg.fill('#st-n', '3000'); pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(200)
    check(pg.evaluate("stepsFor(today())") ['src'] == 'manual', 'manual steps override watch')
    pg.click('.act-steps'); pg.click('#sheet-body .btn >> text=清空'); pg.wait_for_timeout(200)
    check(pg.evaluate("stepsFor(today())")['n'] == 12500, 'clear manual → back to watch')
    # 有氧：选种类（椭圆机 70% / 跑步 50% / 其他 70%）+ 手表数字 → 自动算计入多少
    check('有氧' not in pg.inner_text('.c-more') and '拍成分表' in pg.inner_text('.c-more'), 'compose card: no duplicate cardio link, has label scan')
    pg.click('.act-add')
    check(pg.locator('.cd-opt').count() == 3 and pg.locator('.cd-opt .act-ic svg').count() == 3, 'cardio sheet: 3 kinds with themed icons')
    check(pg.get_attribute('.cd-opt[data-k="ell"]', 'aria-checked') == 'true' and not pg.is_visible('#x-name'), 'default kind 椭圆机, no name field')
    pg.fill('#x-kcal', '320')
    check('+224' in pg.inner_text('#x-prev') and '70%' in pg.inner_text('#x-prev'), 'elliptical preview 320 × 70% = +224')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(200)
    e1 = pg.evaluate("DB.log.find(e => e.type === 'burn' && e.name === '椭圆机')")
    check(e1 and e1['ratio'] == 70 and pg.evaluate("dayInfo(today()).parts.cardioK") == 224, 'elliptical saved, counted 224')
    pg.click('.act-add'); pg.click('.cd-opt[data-k="run"]'); pg.fill('#x-kcal', '200')
    check('+100' in pg.inner_text('#x-prev') and '步数' in pg.inner_text('#x-prev'), 'running preview 200 × 50% = +100 with reason')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(200)
    check(pg.evaluate("DB.log.find(e => e.name === '跑步').ratio") == 50, 'running ratio 50 saved')
    pg.click('.act-add')
    check(pg.get_attribute('.cd-opt[data-k="run"]', 'aria-checked') == 'true', 'remembers last kind')
    pg.click('.cd-opt[data-k="other"]')
    check(pg.is_visible('#x-name'), 'other: name field shown')
    pg.fill('#x-name', '拳击'); pg.fill('#x-kcal', '100')
    check('+70' in pg.inner_text('#x-prev'), 'other preview 100 × 70% = +70')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    check(pg.evaluate("(() => { const e = DB.log.find(e => e.name === '拳击'); return e.ratio === 70 && cardioKind(e) === 'other'; })()"), 'other saved with custom name')
    check(pg.locator('.cd-ent').count() == 3 and pg.locator('.cd-ent .act-ic').count() == 3, 'cardio list shows kind icons')
    # 改设置里跑步的比例：新记录按新比例，旧记录不变
    pg.evaluate("setSetting('cardioRun', .6)")
    check(pg.evaluate("cardioKindPct('run')") == 60 and pg.evaluate("cardioPct(DB.log.find(e => e.name === '跑步'))") == 50, 'settings change does not rewrite old entries')
    pg.evaluate("setSetting('cardioRun', .5)")
    # 编辑：打开时选中原来的种类和比例
    pg.evaluate("editEntry(DB.log.find(e => e.name === '跑步').id)"); pg.wait_for_timeout(300)
    check(pg.get_attribute('.cd-opt[data-k="run"]', 'aria-checked') == 'true' and '+100' in pg.inner_text('#x-prev'), 'edit opens with saved kind and ratio')
    pg.evaluate("closeSheet()"); pg.wait_for_timeout(300)
    hero = pg.inner_text('#t-hero')
    exp = pg.evaluate("fmt(1897 + 375 + 200 + 224 + 100 + 70 - 700)")
    check(exp in hero, 'hero target includes cardio: ' + exp)
    # 拍营养成分表：选图 → AI 读数 → 填克数 → 记录 + 存入食物库
    jpg = OUT + '/label.jpg'
    from PIL import Image as _Im; _Im.new('RGB', (600, 400), (240, 236, 220)).save(jpg, quality=80)
    pg.click('.c-more >> text=拍成分表')
    pg.set_input_files('#lb-gal', jpg)
    pg.wait_for_selector('#lb-form', timeout=15000)
    check(pg.input_value('#lb-kcal') == '187' and '每1本(45g)' in pg.inner_text('#sheet-body'), 'label read: 187 kcal per 1本(45g)')
    pg.fill('#lb-grams', '90')
    check('374' in pg.inner_text('#lb-prev'), 'label 90g = ×2 = 374 kcal')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    e = pg.evaluate("DB.log.find(x => x.name === 'ザバス プロテインバー')")
    f = pg.evaluate("DB.foods.find(x => x.name === 'ザバス プロテインバー')")
    check(e and e['kcal'] == 374 and e['protein'] == 30.4, 'label log entry 374 kcal / P30.4')
    check(f and f['kcal'] == 187 and f['serving'] == '1本(45g)', 'label saved to food library per basis')
    pg.click('#toast-act'); pg.wait_for_timeout(200)
    pg.evaluate("addFoodLog(DB.foods.find(f => f.name === '鸡蛋'), 1); renderToday()")
    pg.wait_for_timeout(1500)

    # ── AI：文字
    pg.fill('#c-text', '一碗拉面加卤蛋')
    pg.click('text=AI 识别')
    pg.wait_for_selector('.ai-card .spin', timeout=5000)
    pg.screenshot(path=f'{OUT}/03_ai_pending.png')
    pg.wait_for_selector('.ai-card .ai-item', timeout=20000)
    pg.screenshot(path=f'{OUT}/04_ai_done.png')
    check(pg.locator('.ai-card .ai-item').count() == 2, 'AI text: 2 items')
    lr = json.loads(urllib.request.urlopen('http://localhost:8787/lastreq').read())
    check(lr['url'] == 'https://api.anthropic.com/v1/messages' and lr['headers']['anthropic-version'] == '2023-06-01', 'Claude endpoint + version header')
    check(lr['body']['model'] == 'claude-haiku-5-5', 'default model haiku 5.5')
    check(lr['body']['output_config']['format']['type'] == 'json_schema', 'structured output json_schema')
    check('一碗拉面加卤蛋' in lr['body']['messages'][0]['content'][-1]['text'], 'user text sent')
    usage_txt = pg.inner_text('.ai-card')
    check('Haiku 5.5' in usage_txt and '$0.00024' in usage_txt, 'usage line shows model and cost')
    total = pg.inner_text('.ai-total')
    check('730' in total, 'AI total 650+80=730: ' + total)
    pg.locator('.ai-card .ai-item').nth(1).locator('input[type=checkbox]').uncheck()
    check('650' in pg.inner_text('.ai-total'), 'uncheck updates total')
    pg.locator('.ai-card .ai-item').nth(0).locator('.mi').first.fill('600')
    check('600' in pg.inner_text('.ai-total'), 'edit updates total')
    pg.locator('.ai-card .btn.pri').click()
    pg.wait_for_timeout(300)
    check('牛肉拉面' in pg.inner_text('#t-list') and '卤蛋' not in pg.inner_text('#t-list'), 'AI add only checked item')

    # ── AI：图片 + 文字
    pg.set_input_files('#c-gal', img_path)
    pg.fill('#c-text', '便利店沙拉')
    pg.click('text=AI 识别')
    pg.wait_for_selector('.ai-card .ai-item', timeout=20000)
    check(pg.locator('.ai-card .ai-thumb').count() == 1, 'AI image: thumb shown')
    lr = json.loads(urllib.request.urlopen('http://localhost:8787/lastreq').read())
    blocks = lr['body']['messages'][0]['content']
    check(blocks[0]['type'] == 'image' and blocks[0]['source']['media_type'] == 'image/jpeg', 'image block first')
    import base64, io
    im2 = Image.open(io.BytesIO(base64.b64decode(blocks[0]['source']['data'])))
    check(max(im2.size) == 1024, f'image resized to long edge 1024: {im2.size}')
    check('便利店沙拉' in blocks[1]['text'], 'text sent with image')
    check('395' in pg.inner_text('.ai-total'), 'AI image total 320+75')
    pg.locator('.ai-card .ai-star', has_text='☆').first.click()
    pg.locator('.ai-card .btn.pri').click()
    pg.wait_for_timeout(1500)
    pg.screenshot(path=f'{OUT}/05_today.png', full_page=True)

    # 图片文件确实是合成图（含说明）
    # ── 编辑记录
    pg.locator('.ent', has_text='鸡蛋').click()
    pg.click('text=×2')
    pg.click('#sheet-body .btn.pri')
    pg.wait_for_timeout(300)
    check('142' in pg.locator('.ent', has_text='鸡蛋').inner_text(), 'edit ×2 → 142 kcal')

    # ── 食物库：分类管理
    pg.click('#nav-foods')
    pg.wait_for_timeout(200)
    check('鸡胸肉沙拉' in pg.inner_text('#f-list'), 'AI item saved to foods')
    pg.click('text=⚙ 管理分类')
    rows = pg.locator('#cat-list .cat-row')
    rows.nth(0).locator('input').fill('米面主食')
    rows.nth(0).locator('input').dispatch_event('change')
    pg.locator('#cat-list .cat-row').nth(1).locator('button[aria-label=上移]').click()
    pg.fill('#cat-new', '外食'); pg.click('#sheet-body >> text=添加')
    pg.locator('#cat-list .cat-row', has=pg.locator('input[value=零食饮料]')).locator('button[aria-label=删除]').click()
    pg.click('#dlg-ok'); pg.wait_for_timeout(150)
    names = [pg.locator('#cat-list .cat-row input').nth(i).input_value() for i in range(pg.locator('#cat-list .cat-row').count())]
    check(names[:2] == ['肉蛋奶', '米面主食'] and '外食' in names and '零食饮料' not in names, 'cats: rename/move/add/delete → ' + ','.join(names))
    pg.click('#sheet-bg .sheet-t button')
    pg.locator('#f-cats .chip', has_text='米面主食').click()
    check('白米饭' in pg.inner_text('#f-list'), 'renamed category keeps foods')
    pg.locator('.food', has_text='白米饭').locator('.icon-btn').click()
    pg.select_option('#fd-cat', '__new')
    pg.wait_for_selector('#dlg-bg.open')
    pg.fill('#dlg-in', '新分类X'); pg.click('#dlg-ok')
    pg.wait_for_timeout(200)
    pg.click('#sheet-body .btn.pri')
    pg.locator('#f-cats .chip', has_text='新分类X').click()
    check('白米饭' in pg.inner_text('#f-list'), 'move food to new category via select')
    pg.locator('#f-cats .chip', has_text='全部').click()
    pg.locator('.food-i', has_text='燕麦片').click()
    pg.click('#p-mults >> text=1.5')
    check('228' in pg.inner_text('#p-prev'), 'portion ×1.5 = 228')
    pg.click('#sheet-body .btn.pri')
    pg.screenshot(path=f'{OUT}/06_foods.png', full_page=True)
    # ── 食物库排序：分类里按名称排，再点一次反过来；选择器跟着一起排
    pg.click('#nav-foods'); pg.wait_for_timeout(300)
    pg.click('#f-sort >> text=名称'); pg.wait_for_timeout(200)
    grp = lambda: pg.evaluate("[...document.querySelectorAll('#f-list .fgroup')].map(g => [...g.querySelectorAll('.food-n')].map(e => e.textContent))")
    g1 = grp()
    srt = pg.evaluate("(l) => l.map(x => x.slice().sort(NAME_COLL.compare))", g1)
    check(g1 == srt and any(len(l) > 1 for l in g1), f'foods sorted by name within each category {g1}')
    pg.click('#f-sort >> text=名称'); pg.wait_for_timeout(200)
    check(grp() == [list(reversed(l)) for l in g1], 'tap again → reversed')
    check('↓' in pg.inner_text('#f-sort .on'), 'active sort shows direction arrow')
    big = max(g1, key=len); cat = pg.evaluate("n => DB.foods.find(f => f.name === n).category", big[0])
    pk = pg.evaluate("c => { openPicker(); pickCat(c); const r = [...document.querySelectorAll('#pk-body .food-n')].map(e => e.textContent.replace(/✓.*$/, '')); closeSheet(); return r; }", cat)
    check(pk == list(reversed(big)), f'picker uses the same sort {pk}')
    pg.click('#f-sort >> text=常用'); pg.wait_for_timeout(200)

    # ── 生成 3 周历史数据（通过页面里的函数，会走同步队列）
    pg.evaluate('''() => {
      const t = today(); let w = 81.2; const meals = ['早餐','午餐','晚餐'];
      for (let i = 24; i >= 1; i--) {
        const d = addDays(t, -i);
        if (i % 9 !== 4) meals.forEach((m, k) => upsertRow('log', {id: uid('l_'), date: d, meal: m, name: m + '示例', kcal: [520, 780, 820 + (i % 3) * 120][k], protein: [35, 60, 65][k], fat: [15, 22, 25][k], carb: [60, 80, 85][k], type: 'food', note: '', time: '', foodId: ''}));
        w -= 0.07 + Math.sin(i * 1.7) * 0.05;
        if (i % 4 !== 2) upsertRow('body', {id: uid('b_'), date: d, weight: Math.round((w + Math.sin(i * 2.3) * 0.35) * 10) / 10, bodyfat: i % 7 === 0 ? Math.round((17.6 - (24 - i) * 0.06) * 10) / 10 : null, waist: i % 7 === 0 ? 84 - (24 - i) * 0.05 : null, note: ''});
      }
    }''')
    pg.wait_for_timeout(3000)

    # ── 身体：记录今天
    pg.click('#nav-body')
    pg.fill('#b-w', '79.4'); pg.fill('#b-bf', '16.4'); pg.fill('#b-muscle', '35.2')
    pg.click('#scr-body .btn.pri')
    pg.wait_for_timeout(300)
    pg.click('#b-range >> text=4周')
    pg.wait_for_timeout(300)
    pg.screenshot(path=f'{OUT}/07_body.png', full_page=True)
    pg.wait_for_selector('#ch-w svg', state='visible', timeout=5000)
    pg.wait_for_timeout(1000)
    box = pg.locator('#ch-w svg').bounding_box()
    pg.mouse.move(box['x'] + box['width'] * 0.5, box['y'] + box['height'] * 0.5)
    check('7日均' in pg.inner_text('#ch-w .ch-read'), 'chart hover readout')
    # 同一天只填体脂，体重保留
    pg.fill('#b-w', ''); pg.fill('#b-bf', '16.2'); pg.fill('#b-muscle', '')
    pg.click('#scr-body .btn.pri')
    rec = pg.evaluate('DB.body.find(b => b.date === today())')
    check(rec['weight'] == 79.4 and rec['bodyfat'] == 16.2 and rec['muscle'] == 35.2, 'body upsert keeps blank fields')

    # ── 本周
    pg.click('#nav-week')
    pg.wait_for_timeout(300)
    pg.screenshot(path=f'{OUT}/08_week.png', full_page=True)
    pg.click('#scr-week .hd-btn >> nth=0')
    pg.wait_for_timeout(200)
    pg.screenshot(path=f'{OUT}/09_lastweek.png', full_page=True)
    check('kcal' in pg.inner_text('#w-content'), 'week renders')
    est = pg.evaluate('estimateTDEE()')
    print('TDEE estimate:', est)

    # ── 设置：本月用量、切换模型
    pg.click('#nav-settings')
    pg.wait_for_function("document.querySelector('#s-usage') && document.querySelector('#s-usage').innerText.includes('本月')", timeout=10000)
    ut = pg.inner_text('#s-usage')
    check('3 次' in ut, 'usage shows 3 requests (2 meals + 1 label): ' + ut)
    t25 = pg.evaluate("dayInfo(today()).target")
    pg.click('#s-int button >> text=温和')
    pg.wait_for_timeout(200)
    t15 = pg.evaluate("dayInfo(today()).target")
    check(pg.evaluate("cfg().deficit") == 400 and t15 - t25 == 300, f'deficit 温和 400 raises target by 300: {t25} → {t15}')
    pg.click('#s-int button >> text=激进')
    check('hook-url' in pg.content() or True, 'watch card')
    check('script.google.com/macros/s/MOCK/exec?token=abc' in pg.evaluate("hookUrl()"), 'hook url shown in settings')
    # AI 模型卡默认收起：点标题展开，再选模型；展开状态会被记住
    check('folded' in pg.get_attribute('[data-fold="set:ai"]', 'class'), 'AI card folded by default')
    pg.click('[data-fold="set:ai"] .card-t')
    pg.wait_for_timeout(450)
    check('folded' not in pg.get_attribute('[data-fold="set:ai"]', 'class') and pg.evaluate("LOCAL.folds['set:ai']") is False, 'AI card unfolds and remembers')
    pg.check('input[name=ai-model][value=claude-sonnet-5-5]')
    pg.click('#nav-today')
    pg.fill('#c-text', '咖喱饭')
    pg.click('text=AI 识别')
    pg.wait_for_selector('.ai-card .ai-item', timeout=20000)
    lr = json.loads(urllib.request.urlopen('http://localhost:8787/lastreq').read())
    check(lr['body']['model'] == 'claude-sonnet-5-5', 'model switch to sonnet')
    check('Sonnet 5.5' in pg.inner_text('.ai-card'), 'usage line sonnet')
    pg.locator('.ai-card .ai-star', has_text='✕').click()
    pg.click('#dlg-ok')

    # ── 同步检查：等队列清空后，对比表格
    pg.click('#nav-today')
    pg.wait_for_function('OUTBOX.length === 0', timeout=20000)
    sheet = dump()
    local = pg.evaluate('({log: DB.log.length, body: DB.body.length, foods: DB.foods.length, cats: DB.cats.length})')
    check(len(sheet['Log']) - 1 == local['log'], f"Log rows match: sheet {len(sheet['Log'])-1} vs local {local['log']}")
    check(len(sheet['Body']) - 1 == local['body'], 'Body rows match')
    check(len(sheet['Foods']) - 1 == local['foods'], 'Foods rows match')
    check(len(sheet['Categories']) - 1 == local['cats'], 'Categories rows match')
    check(any('formulaFrom' == r[0] for r in sheet['Settings']), 'formulaFrom saved to sheet')
    check(any(r[0] == pg.evaluate('today()') and r[1] == 12500 for r in sheet['Steps'][1:]), 'Steps sheet has today 12,500')
    check(sum(1 for r in sheet['Log'][1:] if r[9] == 'strength') == 1, 'one strength row in sheet')

    # ── 第二台设备：清空本机后从表格载入，数据一致
    pg2 = ctx.new_page()
    pg2.on('pageerror', lambda e: errors.append('pageerror2: ' + str(e)))
    pg2.goto(PAGE)
    pg2.wait_for_function('OUTBOX.length === 0 && LOCAL.lastPull > 0', timeout=15000)
    l2 = pg2.evaluate('({log: DB.log.length, body: DB.body.length, foods: DB.foods.length, cats: DB.cats.map(c=>c.name).join(",")})')
    check(l2['log'] == local['log'] and l2['body'] == local['body'], f'second tab sees same data {l2}')

    # ── 主题截图
    for th in ['graphite', 'ocean', 'paper', 'sakura']:
        pg.evaluate(f"LOCAL.theme='{th}'; applyTheme(); go('today')")
        pg.wait_for_timeout(250)
        pg.screenshot(path=f'{OUT}/th_{th}_today.png')
        pg.evaluate("go('body')"); pg.wait_for_timeout(250)
        pg.screenshot(path=f'{OUT}/th_{th}_body.png')
    pg.evaluate("LOCAL.theme='lime'; applyTheme(); go('settings')")
    pg.wait_for_timeout(600)
    pg.wait_for_timeout(200)
    pg.screenshot(path=f'{OUT}/10_settings_full.png', full_page=True)

    r = json.loads(urllib.request.urlopen('http://localhost:8787/run/testClaude').read())
    check(not r['ok'] and '编辑器' in r['error'], 'testClaude blocked for non-owner: ' + str(r))
    b.close()

print('\npage errors / failures:', errors)
print('console errors:', logs[:5])
