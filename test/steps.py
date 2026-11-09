"""手表步数：HC Webhook「完整」分辨率（按 Health Connect 记录存、按天加总）+「每日」/「N 分钟」的提示。
先用带密码 abc 的 Code.gs 启动 test/server.js（CODE_PATH=...），再运行：python3 test/steps.py"""
import json, sys, urllib.request
import datetime as dt
from playwright.sync_api import sync_playwright

ok = bad = 0
def check(c, msg):
    global ok, bad
    print(('PASS ' if c else 'FAIL ') + msg); ok += bool(c); bad += (not c)

SHIM = '''
function mk(s, f) { return { withSuccessHandler: fn => mk(fn, f), withFailureHandler: fn => mk(s, fn),
  api: arg => { fetch('http://localhost:8787/exec', {method: 'POST', body: arg}).then(r => r.json()).then(s, e => f(e)); } }; }
if (location.port === '8787') window.google = { script: { get run() { return mk(() => {}, () => {}); } } };
'''
JST = dt.timezone(dt.timedelta(hours=9))
now = dt.datetime.now(JST); d0 = dt.datetime(now.year, now.month, now.day, tzinfo=JST)
iso = lambda t: t.astimezone(dt.timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z')
day = lambda k: (d0 + dt.timedelta(days=k)).strftime('%Y-%m-%d')
SH = 'com.sec.android.app.shealth'
def hook(body):
    rq = urllib.request.Request('http://localhost:8787/exec?token=abc', data=json.dumps(body).encode(), method='POST')
    return json.loads(urllib.request.urlopen(rq).read())
def rec(id, count, start, end, origin=SH, model='SM-R960', mod=None):
    m = {'data_origin': origin, 'recording_method': 'automatically_recorded', 'id': id, 'last_modified_time': iso(mod or now)}
    if model: m['device'] = {'manufacturer': 'samsung', 'model': model, 'type': 1}
    return {'count': count, 'start_time': iso(start), 'end_time': iso(end), 'metadata': m}
def whole(id, count, k=0, **kw):   # 三星健康：一天一条，0:00 到 23:59:59.999
    return rec(id, count, d0 + dt.timedelta(days=k), d0 + dt.timedelta(days=k + 1) - dt.timedelta(milliseconds=1), **kw)
def dump(): return json.loads(urllib.request.urlopen('http://localhost:8787/dump').read())
def steps_rows():
    d = dump()['Steps']; h = d[0]; return {r[h.index('date')]: dict(zip(h, r)) for r in d[1:] if r and r[0]}

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, timezone_id='Asia/Tokyo')
    ctx.add_init_script(SHIM)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8787/app'); pg.wait_for_timeout(1500)
    if pg.is_visible('#lock'):
        pg.fill('#lock-in', 'abc'); pg.click('#lock .btn.pri'); pg.wait_for_timeout(2500)
    ev = pg.evaluate
    ev("LOCAL.folds = {}; ensureFormula(); go('today')"); pg.wait_for_timeout(500)
    ev("api('ping', {tz: 'Asia/Tokyo'})"); pg.wait_for_timeout(500)

    # ── 「每日」：中午的合计只有一半（Health Connect 按已过时间算三星健康那条），写入但提示改「完整」──
    r = hook({'timestamp': iso(now), 'steps': [{'count': 4500, 'start_time': iso(d0), 'end_time': iso(now)}]})
    check(r.get('mode') == 'daily' and r.get('updated') == 1, f'daily payload stored, mode daily {r}')
    ev("pollSteps(true)"); pg.wait_for_function("STEPS.last && STEPS.last.mode === 'daily'", timeout=8000); ev("renderToday()")
    check('改「完整」才准' in pg.inner_text('.act-steps'), 'daily mode: today shows 改「完整」才准')
    pg.click('.act-steps'); pg.wait_for_timeout(300)
    check('0:00–24:00' in pg.inner_text('#sheet-body .st-hint') and pg.locator('#sheet-body .st-hint.info').count() == 1, 'steps sheet explains why daily is low')
    ev("closeSheet()")

    # ── 「完整」：三星健康整天那条 + 手机自己记的零碎记录 → 取三星健康（不相加）──
    phone = [rec(f'ph{i}', 500, d0 + dt.timedelta(hours=8, minutes=10 * i), d0 + dt.timedelta(hours=8, minutes=10 * i + 9), origin='android', model='SM-S921') for i in range(8)]
    r = hook({'timestamp': iso(now), 'steps': [whole('sh-y', 15000, -1), whole('sh-t', 9000, mod=now - dt.timedelta(minutes=12))] + phone})
    rows = steps_rows()
    check(r.get('mode') == 'records' and r.get('steps') == 10, f'records mode: 10 records {r}')
    check(int(rows[day(0)]['watch']) == 9000 and rows[day(0)]['watchSrc'] == SH, f'today = Samsung Health 9000, not prorated, not + phone 4000 ({rows[day(0)]["watch"]})')
    check(int(rows[day(-1)]['watch']) == 15000 and rows[day(-1)]['watchFull'] == 'yes', 'yesterday = 15000, whole day')
    y_end = dt.datetime.fromisoformat(rows[day(-1)]['watchEnd'].replace('Z', '+00:00')).astimezone(JST)
    check(y_end == d0, f'yesterday ends at local midnight ({y_end})')
    # 同一条记录更新了（三星健康白天不停改这条）→ 覆盖，不重复加；同一次推送重发也不重复
    r = hook({'timestamp': iso(now), 'steps': [whole('sh-t', 9800, mod=now - dt.timedelta(minutes=2))]})
    hook({'timestamp': iso(now), 'steps': [whole('sh-t', 9800, mod=now - dt.timedelta(minutes=2))]})
    check(int(steps_rows()[day(0)]['watch']) == 9800, 'same record id updated → 9800 (replaced, retries not double counted)')
    # 同一个 App 写了时间重叠的两条（手机一条、手表一条，又没带设备）→ 取大的，不相加
    r = hook({'steps': [whole('a', 7000, -2, model=None), whole('b', 9000, -2, model=None)]})
    check(int(steps_rows()[day(-2)]['watch']) == 9000, 'overlapping records from one app → max 9000, not 16000')
    # 「每日」的推送不再覆盖「完整」算出的日子
    hook({'timestamp': iso(now), 'steps': [{'count': 5000, 'start_time': iso(d0), 'end_time': iso(now)}]})
    check(int(steps_rows()[day(0)]['watch']) == 9800, 'a later daily push does not overwrite a records-mode day')

    # ── App：用同步的 9800，显示来源和更新时间，没有提示 ──
    hook({'timestamp': iso(now), 'steps': [whole('sh-t', 9800, mod=now - dt.timedelta(minutes=2))]})   # 最后一次是「完整」
    ev("pollSteps(true)"); pg.wait_for_function("STEPS.last && STEPS.last.mode === 'records' && stepsFor(today()).n === 9800", timeout=8000); ev("renderToday()")
    check(ev("stepsFor(today())")['src'] == 'watch' and '改「完整」' not in pg.inner_text('.act-steps'), 'app uses 9,800 from watch, no hint')
    pg.click('.act-steps'); pg.wait_for_timeout(300)
    at = pg.inner_text('#sheet-body .st-why').replace('\n', ' ')
    check('三星健康' in at and '更新' in at and pg.locator('#sheet-body .st-hint').count() == 0, f'steps sheet: 三星健康 HH:MM 更新 ({at})')
    ev("closeSheet()"); pg.wait_for_timeout(200); ev("VIEW.date = addDays(today(), -1); openSteps()"); pg.wait_for_timeout(300)   # 昨天在新公式开始前，卡片不显示，直接打开
    check('三星健康 · 整天' in pg.inner_text('#sheet-body .st-why'), 'yesterday: 三星健康 · 整天')
    ev("closeSheet(); VIEW.date = today(); renderToday()")

    # ── 删除：deleted 里的记录去掉，这天重算（剩下手机的 4000）──
    r = hook({'timestamp': iso(now), 'steps': [], 'deleted': [{'type': 'steps', 'id': 'sh-t'}, {'type': 'sleep', 'id': 'x'}]})
    check(r.get('mode') == 'records' and int(steps_rows()[day(0)]['watch']) == 4000, f'deleted record removed → today falls back to phone 4000 {r}')

    # ── 表不越变越大：35 天前的删掉；3 天前只留算出步数的那组 ──
    old = [rec('old1', 8000, d0 - dt.timedelta(days=40), d0 - dt.timedelta(days=40) + dt.timedelta(hours=1))]
    five = [whole('sh5', 12000, -5), rec('ph-5d', 300, d0 - dt.timedelta(days=5) + dt.timedelta(hours=9), d0 - dt.timedelta(days=5) + dt.timedelta(hours=9, minutes=5), origin='android', model='SM-S921')]
    hook({'steps': old + five})
    d = dump()['StepRecs']; ids = {r[0] for r in d[1:] if r and r[0]}
    check('old1' not in ids and 'sh5' in ids and 'ph-5d' not in ids and 'ph5' in ids, f'StepRecs pruned (40-day-old and losing groups from 5 days ago gone): {sorted(ids)}')
    check(int(steps_rows()[day(-5)]['watch']) == 12000, 'day −5 still 12000 after pruning')
    log = dump()['HC_Log']
    check('三星健康' in str(log[-1][2]) and '完整' in str(log[-1][2]), f'HC_Log summary names the source and the mode ({log[-1][2]})')

    # ── 「N 分钟」：没有记录 id，不写入，提示改「完整」──
    r = hook({'timestamp': iso(now), 'steps': [{'count': 78, 'start_time': iso(now - dt.timedelta(minutes=30)), 'end_time': iso(now - dt.timedelta(minutes=15))},
                                               {'count': 90, 'start_time': iso(now - dt.timedelta(minutes=15)), 'end_time': iso(now)}]})
    check(r.get('updated') == 0 and r.get('mode') == 'bucket', f'N-minute payload not written {r}')
    ev("pollSteps(true)"); pg.wait_for_function("STEPS.last && STEPS.last.warn === 'bucket'", timeout=8000); ev("renderToday()")
    check('分辨率要选「完整」' in pg.inner_text('.act-steps'), 'N-minute → 分辨率要选「完整」')
    ev("go('settings')"); pg.wait_for_timeout(400)
    check('分辨率要选「完整」' in pg.inner_text('#s-content') and '步数分辨率「完整」' in pg.inner_text('#s-content'), 'settings: summary + setup hint say 完整')
    # 旧版后台（warn daily）：提示更新 Code.gs
    check(ev("hcHint({warn: 'daily'}).short") == '后台是旧版', 'old server warning → 后台是旧版')
    check(not errs, 'no page errors ' + str(errs))
    b.close()
print(f'\n{ok} passed, {bad} failed')
sys.exit(1 if bad else 0)
