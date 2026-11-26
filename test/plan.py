"""训练计划：默认安排、自动标部位、设置里改一天（动作 / 个数 / 顺序 / 部位 / 类型）、保存同步、恢复默认。
先用带密码 abc 的 Code.gs 启动 test/server.js（CODE_PATH=...），再运行：python3 test/plan.py"""
import json, urllib.request
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
def server_plan():
    rows = json.loads(urllib.request.urlopen('http://localhost:8787/dump').read())['Settings']
    r = [x for x in rows[1:] if x[0] == 'weekPlan']
    return json.loads(r[0][1]) if r else None

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=1, is_mobile=True, has_touch=True)
    ctx.add_init_script(SHIM)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8787/app'); pg.wait_for_timeout(1500)
    if pg.is_visible('#lock'):
        pg.fill('#lock-in', 'abc'); pg.click('#lock .btn.pri'); pg.wait_for_timeout(2500)
    ev = pg.evaluate
    ev("LOCAL.folds = {}; LOCAL.theme = 'ios'; applyTheme(); delSetting('weekPlan'); setSetting('weekStart', 0); go('today')"); pg.wait_for_timeout(1200)
    day = lambda w: ev(f"(() => {{ const t = parseYmd(today()); while (t.getDay() !== {w}) t.setDate(t.getDate() + 1); return ymd(t); }})()")

    # ── 默认安排（截图里的新计划） ──
    want = {0: ('str', '硬拉 · 臀 ×2 · 股四头 · 中束 + 后束 · 核心'), 1: ('cardio', '低强度：椭圆机或跑步'), 2: ('str', '肩推 · 背宽 · 哑铃卧推 · 背厚 · 二头 ×2'),
            3: ('str', '深蹲 · 股四头 · 腘绳肌 · 臀 · 中束 · 小腿'), 4: ('str', '卧推 · 背厚 · 上胸 · 背宽 · 下胸 · 三头 ×1'), 5: ('box', '全身，肩和核心为主'), 6: ('rest', '好好恢复')}
    for w, (t, text) in want.items():
        pl = ev(f"(() => {{ const p = planDayOf(DEFAULT_WEEK_PLAN[{w}]); return [p.type, p.text, p.unknown]; }})()")
        check(pl == [t, text, []], f'default day {w}: {pl[0]} · {pl[1]}')
    lv = lambda w: ev(f"planDayOf(DEFAULT_WEEK_PLAN[{w}]).lv")
    sun, tue, wed, thu = lv(0), lv(2), lv(3), lv(4)
    check(all(sun.get(x) == 1 for x in ['臀', '腘绳肌', '下背', '股四头', '中束', '后束', '核心']) and sun.get('斜方') == 2, f'Sunday (deadlift day) parts {sun}')
    check(all(tue.get(x) == 1 for x in ['前束', '背阔', '斜方', '中胸', '二头']) and all(tue.get(x) == 2 for x in ['中束', '三头', '后束']), f'Tuesday (press day) parts {tue}')
    check(all(wed.get(x) == 1 for x in ['股四头', '臀', '腘绳肌', '中束', '小腿']) and wed.get('内收') == 2 and '二头' not in wed, f'Wednesday (squat day) parts {wed}')
    check(all(thu.get(x) == 1 for x in ['中胸', '上胸', '下胸', '背阔', '斜方', '三头']) and thu.get('前束') == 2, f'Thursday (bench day) parts {thu}')
    check(ev("planDayOf(DEFAULT_WEEK_PLAN[1]).main.length + planDayOf(DEFAULT_WEEK_PLAN[6]).main.length") == 0, 'cardio / rest days: nothing highlighted')
    # 认词：写法里包含动作名就认得；「+」连着做的拆开算；×N 不影响部位
    r = ev("(() => { const f = s => { const r = itemParts(s); return [[...r.main].sort(), [...r.sub].sort(), r.unknown]; }; return [f('杠铃划船'), f('上斜哑铃卧推'), f('中束 + 后束 ×2'), f('高位下拉'), f('罗马尼亚硬拉'), f('跳绳'), f('腹部')]; })()")
    check(r[0][0] == ['斜方', '背阔'] and r[1][0] == ['上胸', '中胸'] and r[2][0] == ['中束', '后束'] and r[3][0] == ['背阔'], f'keywords inside names are recognised {r[:4]}')
    check(r[4][0] == ['腘绳肌', '臀'] and '下背' in r[4][1] and r[5] == [[], [], ['跳绳']] and r[6][0] == ['核心'], f'longest name wins, unknown kept, aliases {r[4:]}')
    check(ev("[parseItem('臀 ×2'), parseItem('三头 x1'), parseItem('深蹲')].map(i => [i.name, i.n, i.x])") == [['臀', 2, True], ['三头', 1, True], ['深蹲', 1, False]], 'parse ×N')

    # ── 今日页的训练部位卡跟着安排 ──
    for w in [0, 3, 5]:
        ev(f"VIEW.date = '{day(w)}'; renderToday()"); pg.wait_for_timeout(200)
        sub = ev("document.querySelector('#t-mm > .card-t span').textContent")
        check(ev("document.querySelector('#t-mm .mm-plan').textContent") == want[w][1] and sub == f"周{'日一二三四五六'[w]} · {ev(f'planDayOf(DEFAULT_WEEK_PLAN[{w}]).title')}", f'today card day {w}: {sub}')
    ev(f"VIEW.date = '{day(0)}'; renderToday()"); pg.wait_for_timeout(200)
    lit = ev("[...new Set([...document.querySelectorAll('#t-mm .mm-m.l1')].map(e => e.dataset.p))].sort()")
    check('腘绳肌' in lit and '臀' in lit and '中束' in lit and '后束' in lit, f'Sunday figure lights the deadlift-day parts {lit}')
    # 训练窗口默认种类
    ev("LOCAL.cardioKind = 'run'")
    dk = ev("(() => { const r = {}; for (let i = 0; i < 7; i++) { const d = addDays(today(), i); r[parseYmd(d).getDay()] = defaultTrainKind(d); } return r; })()")
    check(dk == {'0': 'str', '1': 'run', '2': 'str', '3': 'str', '4': 'str', '5': 'box', '6': 'run'}, f'default training kind by plan {dk}')

    # ── 设置：训练计划卡 ──
    ev("VIEW.date = today(); go('settings')"); pg.wait_for_timeout(1000)
    card = '[data-fold="set:train"]'
    check(pg.is_visible(card) and ev(f"document.querySelector('{card} > .card-t span').textContent") == '力量 4 天', 'settings: 训练计划 card, 力量 4 天')
    check(ev("modOrder('settings').indexOf('set:train')") == ev("modOrder('settings').indexOf('set:goals')") + 1, 'card sits after 每日目标 in the order list')
    rows = ev(f"[...document.querySelectorAll('{card} .tp-row')].map(r => +r.dataset.w)")
    check(rows == [0, 1, 2, 3, 4, 5, 6], f'7 days, week starts Sunday {rows}')
    check(ev(f"document.querySelector('{card} .tp-row.on').dataset.w") == str(ev("parseYmd(today()).getDay()")), 'today highlighted')
    check(not ev(f"!!document.querySelector('{card} .actions')"), 'no reset button while using the default plan')
    ev("setSetting('weekStart', 1); renderSettings()"); pg.wait_for_timeout(200)
    check(ev(f"[...document.querySelectorAll('{card} .tp-row')].map(r => +r.dataset.w)") == [1, 2, 3, 4, 5, 6, 0], 'week starting Monday reorders the list')
    ev("setSetting('weekStart', 0); renderSettings()"); pg.wait_for_timeout(200)

    # ── 改周六：休息 → 力量 ──
    pg.click(f'{card} .tp-row[data-w="6"]'); pg.wait_for_timeout(400)
    check(ev("document.getElementById('sheet-title').textContent") == '周六 · 训练安排' and ev("segVal('pd-type')") == '休息', 'editor opens on 周六 · 休息')
    check(not ev("!!document.querySelector('#pd-box .pd-parts')") and pg.is_visible('#pd-note'), 'rest day: note only, no parts')
    pg.click('#pd-type button[data-v="力量"]'); pg.wait_for_timeout(200)
    check(ev("document.getElementById('pd-title').value") == '' and ev("document.getElementById('pd-title').placeholder") == '力量', 'title that was just the type name follows the type')
    pg.click('.pd-sug .chip >> text=臀推'); pg.click('.pd-sug .chip >> text=臀推'); pg.wait_for_timeout(100)
    pg.locator('.pd-sug').nth(1).locator('.chip', has_text='小腿').click()
    check(ev("PD.d.items") == ['臀推 ×2', '小腿'], f'chips add items, same one twice → ×2 {ev("PD.d.items")}')
    pg.fill('#pd-new', '跳绳'); pg.press('#pd-new', 'Enter'); pg.wait_for_timeout(100)
    check(ev("PD.d.items[2]") == '跳绳' and '没认出：跳绳' in pg.inner_text('#pd-box'), 'custom item added with Enter; unknown ones are flagged')
    pg.fill('.pd-it:nth-child(3) input', '腿弯举 ×3'); pg.press('.pd-it:nth-child(3) input', 'Tab'); pg.wait_for_timeout(100)
    check(ev("PD.d.items[2]") == '腿弯举 ×3' and '没认出' not in pg.inner_text('#pd-box'), 'rename with ×3 typed in')
    pg.click('.pd-it:nth-child(3) [aria-label="腿弯举少一个"]'); pg.click('.pd-it:nth-child(3) [aria-label="腿弯举少一个"]'); pg.wait_for_timeout(100)
    check(ev("PD.d.items[2]") == '腿弯举' and ev("document.querySelector('.pd-it:nth-child(3) [aria-label=\"腿弯举少一个\"]').disabled"), 'count down to 1 drops the ×, − disabled at 1')
    pg.click('[aria-label="腿弯举上移"]'); pg.wait_for_timeout(100)
    check(ev("PD.d.items") == ['臀推 ×2', '腿弯举', '小腿'], 'move up')
    pg.click('[aria-label="删除小腿"]'); pg.wait_for_timeout(100)
    check(ev("PD.d.items") == ['臀推 ×2', '腿弯举'], 'delete')
    auto = ev("(() => { const l = {}; document.querySelectorAll('.pd-p').forEach(b => { const m = b.className.match(/l(\\d)/); if (m[1] !== '0') l[b.dataset.p] = +m[1]; }); return l; })()")
    check(auto == {'臀': 1, '腘绳肌': 1, '外展': 2, '小腿': 2}, f'parts auto-marked from the exercises {auto}')
    check(ev("document.querySelectorAll('#pd-box .mm-m.l1').length") > 0, 'figure preview lights them')
    # 部位手动改：不标 → 主要 → 次要 → 不标；和自动一样就不算手动
    pg.click('.pd-p[data-p="核心"]'); pg.wait_for_timeout(80)
    check(ev("PD.d.adj") == {'核心': 1} and 'adj' in ev("document.querySelector('.pd-p[data-p=\"核心\"]').className"), 'tap 核心 → main, marked as manual')
    pg.click('.pd-p[data-p="外展"]'); pg.wait_for_timeout(80); pg.click('.pd-p[data-p="外展"]'); pg.wait_for_timeout(80)
    check(ev("PD.d.adj") == {'核心': 1, '外展': 1}, f'外展 次要 → 不标 → 主要 {ev("PD.d.adj")}')
    pg.click('.pd-p[data-p="外展"]'); pg.wait_for_timeout(80)
    check(ev("PD.d.adj") == {'核心': 1}, 'back to its automatic level → not manual any more')
    check(pg.is_visible('.pd-auto'), 'reset-to-auto link shown')
    pg.fill('#pd-title', '下肢 · 臀日')
    # 换类型再换回来，动作还在
    pg.click('#pd-type button[data-v="有氧"]'); pg.wait_for_timeout(100)
    check(pg.is_visible('#pd-note') and not ev("!!document.querySelector('.pd-it')"), 'cardio: note field instead of exercises')
    pg.click('#pd-type button[data-v="力量"]'); pg.wait_for_timeout(100)
    check(ev("PD.d.items") == ['臀推 ×2', '腿弯举'] and ev("document.getElementById('pd-title').value") == '下肢 · 臀日', 'switching back keeps items and title')
    n0 = ev("OUTBOX.length")
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    sat = ev("DB.settings.weekPlan && DB.settings.weekPlan[6]")
    check(sat == {'type': 'str', 'title': '下肢 · 臀日', 'items': ['臀推 ×2', '腿弯举'], 'adj': {'核心': 1}}, f'saved Saturday {sat}')
    check(ev("DB.settings.weekPlan[0]") == ev("DEFAULT_WEEK_PLAN[0]"), 'other days untouched')
    check(not ev("document.getElementById('sheet-bg').classList.contains('open')") and ev(f"document.querySelector('{card} > .card-t span').textContent") == '力量 5 天', 'sheet closes, card shows 力量 5 天')
    check(ev(f"document.querySelector('{card} .tp-row[data-w=\"6\"] .tp-m b').textContent") == '下肢 · 臀日' and pg.is_visible(f'{card} .actions'), 'row updated, reset button appears')
    check(ev("defaultTrainKind(addDays(today(), (6 - parseYmd(today()).getDay() + 7) % 7))") == 'str', 'Saturday now defaults to strength in the training sheet')
    ev(f"VIEW.date = '{day(6)}'; go('today')"); pg.wait_for_timeout(800)
    check(ev("document.querySelector('#t-mm .mm-plan').textContent") == '臀推 ×2 · 腿弯举' and not ev("document.getElementById('t-mm').classList.contains('mm-rest')"), 'today card shows the new Saturday')
    check(ev("[...document.querySelectorAll('#t-mm .mm-m.l1')].some(e => e.dataset.p === '核心')"), 'manual part shows on the figure')
    ev("document.querySelector('#t-mm .mm-lb[data-p=\"核心\"]').dispatchEvent(new MouseEvent('click', {bubbles: true}))"); pg.wait_for_timeout(500)
    check(ev("document.querySelector('#sheet-body .kx-tag').textContent") == '今天的主要部位', 'muscle sheet knows 核心 is a main part today')
    ev("closeSheet()"); pg.wait_for_timeout(200)
    # 同步到表格；重新载入后还在
    ev("syncNow(true)"); pg.wait_for_timeout(2500)
    sp = server_plan()
    check(sp and sp[6]['title'] == '下肢 · 臀日' and len(sp) == 7, 'synced to the Settings sheet as weekPlan')
    ev("DB.settings.weekPlan = null; syncNow(true)"); pg.wait_for_timeout(2500)
    check((ev("DB.settings.weekPlan") or [None] * 7)[6] == sat, 'reload from sheet brings the plan back')

    # ── 「用默认」只改草稿；不改动保存 = 不写 ──
    ev("go('settings')"); pg.wait_for_timeout(800)
    pg.click(f'{card} .tp-row[data-w="6"]'); pg.wait_for_timeout(300)
    pg.click('#sheet-body .actions .btn:not(.pri)'); pg.wait_for_timeout(100)
    check(ev("segVal('pd-type')") == '休息' and ev("DB.settings.weekPlan[6].type") == 'str', '用默认 resets the draft only')
    ev("closeSheet()"); pg.wait_for_timeout(200)
    # ── 全部恢复默认：删掉 weekPlan（以后默认安排更新也能跟上） ──
    pg.click(f'{card} .actions .btn'); pg.wait_for_timeout(300)
    pg.click('#dlg-ok'); pg.wait_for_timeout(400)
    check(ev("'weekPlan' in DB.settings") is False and ev("OUTBOX.some(o => o.op === 'delete' && o.table === 'Settings' && o.id === 'weekPlan')"), 'reset all → weekPlan deleted (queued delete)')
    check(ev(f"document.querySelector('{card} > .card-t span').textContent") == '力量 4 天' and not ev(f"!!document.querySelector('{card} .actions')"), 'card back to the default plan')
    ev("syncNow(true)"); pg.wait_for_timeout(2500)
    check(server_plan() is None, 'deleted from the sheet too')
    # 打开、不改、保存：和默认一样，不写设置
    pg.click(f'{card} .tp-row[data-w="2"]'); pg.wait_for_timeout(300)
    n1 = ev("OUTBOX.length")
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    check('weekPlan' not in ev("Object.keys(DB.settings)") and ev("OUTBOX.length") == n1, 'saving an unchanged default day writes nothing')
    # 力量日把动作删光：还是力量日
    pg.click(f'{card} .tp-row[data-w="2"]'); pg.wait_for_timeout(300)
    for _ in range(5):
        pg.locator('.pd-it [aria-label^="删除"]').first.click(); pg.wait_for_timeout(60)
    check('还没有动作' in pg.inner_text('#pd-box') and ev("document.querySelectorAll('.pd-p.l1, .pd-p.l2').length") == 0, 'all exercises removed → empty list, nothing marked')
    pg.fill('#pd-new', '中束 + 后束')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    check(ev("DB.settings.weekPlan[2].items") == ['中束 + 后束'], 'text typed but not added is saved too')
    ev("delSetting('weekPlan'); renderSettings()")

    # ── 各主题：设置卡和编辑弹层不溢出，部位按钮的字看得清 ──
    themes = ev("THEMES.map(t => t.id)")
    worst = []
    for th in themes:
        ev(f"LOCAL.theme = '{th}'; applyTheme(); renderSettings(); openPlanDay(0)"); pg.wait_for_timeout(250)
        ov = ev("document.documentElement.scrollWidth")
        wide = ev("[...document.querySelectorAll('#pd-box .pd-it, #pd-box .pd-parts, .tp-row')].filter(e => e.scrollWidth > e.clientWidth + 1).length")
        con = ev("""(() => { const L = c => { const m = c.match(/[\\d.]+/g).map(Number); const f = v => (v /= 255) <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; return .2126 * f(m[0]) + .7152 * f(m[1]) + .0722 * f(m[2]); };
          const cs = getComputedStyle(document.querySelector('.pd-p.l1')), a = L(cs.color), b = L(cs.backgroundColor); return (Math.max(a, b) + .05) / (Math.min(a, b) + .05); })()""")
        worst.append((round(con, 1), th))
        check(ov == 360 and wide == 0 and con >= 3, f'{th}: no overflow ({ov}, {wide} clipped rows), main-part chip contrast {con:.1f}')
        ev("closeSheet()")
    print('lowest contrast', sorted(worst)[:3])
    check(not errs, f'no page errors {errs[:3]}')
    b.close()
print(f'\n{ok} passed, {bad} failed')
