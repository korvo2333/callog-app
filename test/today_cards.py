"""今日页的两张卡：训练部位（各主题的人物）+ 摄入时间（热量 / 蛋白质 / 脂肪 / 碳水）。
先用带密码 abc 的 Code.gs 启动 test/server.js（CODE_PATH=...），再运行：python3 test/today_cards.py"""
import re
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
    ctx = b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)
    ctx.add_init_script(SHIM)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8787/app'); pg.wait_for_timeout(1500)
    if pg.is_visible('#lock'):
        pg.fill('#lock-in', 'abc'); pg.click('#lock .btn.pri'); pg.wait_for_timeout(2500)
    ev = pg.evaluate
    ev("LOCAL.folds = {}; LOCAL.theme = 'ios'; applyTheme(); go('today')"); pg.wait_for_timeout(1500)

    # ── 摄入时间 ──
    # 造一天：三顿都没记时间（按餐次估）
    d = ev("""(() => { const d = addDays(today(), -400);
      [['早餐', 520, 30, 15, 60], ['午餐', 780, 45, 25, 90], ['晚餐', 940, 60, 30, 100]].forEach(([meal, kcal, protein, fat, carb], i) =>
        upsertRow('log', { id: 'l_tc' + i, date: d, time: '', meal, name: '测试' + meal, kcal, protein, fat, carb, type: 'food', foodId: '', note: '' }));
      return d; })()""")
    check(d is not None, f'found a past day without times ({d})')
    ev(f"VIEW.date = '{d}'; renderToday()"); pg.wait_for_timeout(600)
    check(ev("document.querySelectorAll('#t-time .tl-sec').length") == 4, 'timeline: 4 sections')
    check(ev("[...document.querySelectorAll('#t-time .tl-n')].map(e => e.textContent).join()") == '热量,蛋白质,脂肪,碳水', 'timeline: kcal / protein / fat / carb')
    check(ev("document.querySelectorAll('#t-time .tl-ch svg').length") == 4, 'timeline: 4 charts drawn')
    n_est = ev("document.querySelectorAll('#tl-kcal path[stroke-dasharray=\"3 2\"]').length")
    groups = ev(f"tlGroups(dayInfo('{d}').foods.filter(e => e.kcal > 0)).length")
    check(n_est == groups and n_est >= 2, f'untimed meals drawn as estimated bars ({n_est}/{groups})')
    check(ev("!!document.querySelector('#t-time .tl-note')"), 'note explains estimated times')
    tot = ev(f"Math.round(dayInfo('{d}').intake.kcal)")
    head = ev("document.querySelector('[data-fold=\"tl:kcal\"] .tl-h .num').textContent")
    check(head.replace(',', '').startswith(str(tot)), f'kcal header shows the day total ({head} vs {tot})')
    # 线：最后一个点 = 当天合计
    last_cy = ev("(() => { const c = [...document.querySelectorAll('#tl-kcal svg > circle')]; return +c[c.length - 1].getAttribute('cy'); })()")
    lbl = ev("(() => { const t = [...document.querySelectorAll('#tl-kcal svg > text')].pop(); return t.textContent; })()")
    check(lbl.replace(',', '') == str(tot), f'cumulative line ends at the total ({lbl})')
    # 点图表看那一次
    box = ev("(() => { const r = document.querySelector('#tl-kcal svg').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()")
    ev(f"document.querySelector('#tl-kcal svg').dispatchEvent(new PointerEvent('pointerdown', {{clientX: {box[0] + box[2] * 0.12}, clientY: {box[1] + box[3] / 2}, bubbles: true}}))")
    rd = ev("document.querySelector('#tl-kcal .ch-read').textContent")
    check('这次' in rd and '累计' in rd and '08:00' in rd, f'tap shows that meal: {rd[:40]}')
    # 折叠：单张 + 整张卡，记在本机
    ev("document.querySelector('[data-fold=\"tl:protein\"] .tl-h').click()"); pg.wait_for_timeout(400)
    check(ev("document.querySelector('[data-fold=\"tl:protein\"]').classList.contains('folded') && LOCAL.folds['tl:protein'] === true"), 'protein chart folds')
    ev("renderToday()"); pg.wait_for_timeout(300)
    check(ev("document.querySelector('[data-fold=\"tl:protein\"]').classList.contains('folded')"), 'fold kept after re-render')
    check(ev("!document.querySelector('[data-fold=\"tl:kcal\"]').classList.contains('folded')"), 'other charts stay open')
    ev("document.querySelector('[data-fold=\"tl:protein\"] .tl-h').click()"); pg.wait_for_timeout(400)
    check(ev("!document.querySelector('[data-fold=\"tl:protein\"]').classList.contains('folded')"), 'protein chart opens again')
    ev("document.querySelector('#t-time > .card-t').click()"); pg.wait_for_timeout(400)
    check(ev("document.getElementById('t-time').classList.contains('folded') && LOCAL.folds['today:tl'] === true"), 'whole card folds')
    ev("document.querySelector('#t-time > .card-t').click()"); pg.wait_for_timeout(400)
    check(ev("!document.getElementById('t-time').classList.contains('folded')"), 'whole card opens')
    # 编辑记录里改时间 → 不再是估的
    fid = ev(f"dayInfo('{d}').foods.filter(e => e.kcal > 0)[0].id")
    ev(f"editEntry('{fid}')"); pg.wait_for_timeout(500)
    check(ev("document.getElementById('e-time').type === 'time' && document.getElementById('e-time').value === ''"), 'edit sheet has an empty time field')
    check(ev("parseFloat(getComputedStyle(document.getElementById('e-time')).fontSize)") >= 16, 'time field ≥ 16px (no zoom)')
    ev("window.__q = []; const _q = queue; queue = o => { __q.push(o); return _q(o); }")
    ev("document.getElementById('e-time').value = '07:15'; saveEntry('" + fid + "')"); pg.wait_for_timeout(600)
    check(ev(f"DB.log.find(e => e.id === '{fid}').time") == '07:15', 'time saved to the entry')
    check(ev(f"__q.some(o => o && o.table === 'Log' && o.row && o.row.id === '{fid}' && o.row.time === '07:15')"), 'time change queued for the sheet')
    check(ev("document.querySelectorAll('#tl-kcal path[stroke-dasharray=\"3 2\"]').length") == n_est - 1, 'that bar is no longer estimated')
    check('07:15' in ev("document.querySelector('#t-time > .card-t').textContent") or ev("tlGroups(dayInfo(VIEW.date).foods)[0].h") == 7.25, 'timeline uses the new time')
    # 手动添加：今天默认现在，过去的日子留空
    ev("openManual()"); pg.wait_for_timeout(400)
    check(ev("document.getElementById('m-time').value") == '', 'manual add on a past day: time empty')
    ev("closeSheet(); gotoToday()"); pg.wait_for_timeout(500)
    ev("openManual()"); pg.wait_for_timeout(400)
    check(re.match(r'^\d\d:\d\d$', ev("document.getElementById('m-time').value") or '') is not None, 'manual add today: time = now')
    ev("document.getElementById('m-name').value = '测试香蕉'; document.getElementById('m-kcal').value = '90'; document.getElementById('m-time').value = '10:05'; saveManual()"); pg.wait_for_timeout(600)
    check(ev("DB.log.some(e => e.name === '测试香蕉' && e.time === '10:05' && e.date === today())"), 'manual add saves the picked time')
    check(ev("tlGroups(dayInfo(today()).foods.filter(e => e.kcal > 0)).some(g => Math.abs(g.h - (10 + 5 / 60)) < 1e-6)"), 'manual entry appears at 10:05')
    # 没有记录的日子
    ev("VIEW.date = addDays(today(), 40); renderToday()"); pg.wait_for_timeout(400)
    check(ev("!!document.querySelector('#t-time .empty') && !document.querySelector('#t-time svg')"), 'empty day: one message, no charts')
    # 20 分钟内的算一次
    g = ev("tlGroups([{time:'12:00',kcal:300,protein:1,fat:1,carb:1,meal:'午餐'},{time:'12:15',kcal:200,protein:1,fat:1,carb:1,meal:'午餐'},{time:'12:40',kcal:100,protein:0,fat:0,carb:0,meal:'午餐'},{time:'',kcal:50,protein:0,fat:0,carb:0,meal:'晚餐'}]).map(x => [h2hm(x.h), x.kcal, x.est])")
    check(g == [['12:00', 500, False], ['12:40', 100, False], ['19:00', 50, True]], f'grouping within 20 min + meal fallback {g}')

    # ── 训练部位：每个主题的人物 ──
    themes = ev("THEMES.map(t => t.id)")
    thu = ev("(() => { const t = parseYmd(today()); while (t.getDay() !== 4) t.setDate(t.getDate() + 1); return ymd(t); })()")
    sat = ev(f"addDays('{thu}', 2)")
    seen = set()
    for th in themes:
        ev(f"LOCAL.theme = '{th}'; applyTheme(); VIEW.date = '{thu}'; renderToday()"); pg.wait_for_timeout(250)
        sk = ev(f"(() => {{ const s = MM_SKIN['{th}'] || MM_SKIN.ios; const t = document.createElement('i'); t.innerHTML = s.title; return {{ title: t.textContent, leg: s.leg, pad: s.pad || 0, rest: s.rest }}; }})()")
        title = ev("document.querySelector('#t-mm > .card-t').childNodes[0].textContent")
        leg = ev("[...document.querySelectorAll('#t-mm .mm-leg span')].map(e => e.textContent)")
        vb = ev("document.querySelector('#t-mm .mm-svg').getAttribute('viewBox')")
        costume = ev("document.querySelectorAll('#t-mm .sk-over, #t-mm .sk-back').length")
        labels = ev("document.querySelectorAll('#t-mm .mm-lb').length")
        main = ev("document.querySelectorAll('#t-mm .mm-m.l1').length")
        good = title == sk['title'] and leg == sk['leg'] and vb == f"0 {-sk['pad']} 500 {392 + sk['pad']}" and labels == 19 and main > 0 and (th == 'ios' or costume >= 2)
        check(good, f"{th}: {title} · {'/'.join(leg)} · costume layers {costume}")
        seen.add(sk['title'])
        ev(f"VIEW.date = '{sat}'; renderToday()"); pg.wait_for_timeout(200)
        check(ev("document.querySelector('#t-mm .mm-plan').textContent") == sk['rest'] and ev("document.getElementById('t-mm').classList.contains('mm-rest')"), f"{th}: rest day says “{sk['rest']}”")
        check(ev("document.documentElement.scrollWidth") == 360, f'{th}: no horizontal overflow')
    check(len(seen) == len(themes), f'every theme has its own title ({len(seen)}/{len(themes)})')
    check(not errs, 'no page errors ' + str(errs[:3]))
    b.close()
print(f'{ok} pass, {bad} fail')
