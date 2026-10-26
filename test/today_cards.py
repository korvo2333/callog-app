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

    # ── 训练部位：每个主题只换配色（不再有主题人物） ──
    themes = ev("THEMES.map(t => t.id)")
    thu = ev("(() => { const t = parseYmd(today()); while (t.getDay() !== 4) t.setDate(t.getDate() + 1); return ymd(t); })()")
    sat = ev(f"addDays('{thu}', 2)")
    fills = set()
    for th in themes:
        ev(f"LOCAL.theme = '{th}'; applyTheme(); VIEW.date = '{thu}'; renderToday()"); pg.wait_for_timeout(250)
        title = ev("document.querySelector('#t-mm > .card-t').childNodes[0].textContent")
        leg = ev("[...document.querySelectorAll('#t-mm .mm-leg span')].map(e => e.textContent)")
        vb = ev("document.querySelector('#t-mm .mm-svg').getAttribute('viewBox')")
        extra = ev("document.querySelectorAll('#t-mm .sk-over, #t-mm .sk-back, #t-mm defs').length")
        labels = ev("document.querySelectorAll('#t-mm .mm-lb').length")
        main = ev("document.querySelectorAll('#t-mm .mm-m.l1').length")
        fills.add(ev("getComputedStyle(document.querySelector('#t-mm .mm-m.l1')).fill"))
        good = title == '训练部位' and leg == ['点肌肉看它怎么发力', '主要部位', '次要部位'] and vb == '0 0 500 392' and labels == 20 and main > 0 and extra == 0
        check(good, f"{th}: {title} · {'/'.join(leg)} · costume layers {extra} · labels {labels}")
        ev(f"VIEW.date = '{sat}'; renderToday()"); pg.wait_for_timeout(200)
        check(ev("document.querySelector('#t-mm .mm-plan').textContent") == '好好恢复' and ev("document.getElementById('t-mm').classList.contains('mm-rest')"), f"{th}: rest day")
        check(ev("document.documentElement.scrollWidth") == 360, f'{th}: no horizontal overflow')
    check(len(fills) >= 8, f'main-muscle colour follows the theme ({len(fills)} different colours)')
    # ── 点肌肉 → 弹出原理动画 ──
    ev(f"LOCAL.theme = 'ios'; applyTheme(); VIEW.date = '{thu}'; renderToday()"); pg.wait_for_timeout(400)
    bad = ev("[...document.querySelectorAll('#t-mm .mm-m, #t-mm .mm-lb')].filter(e => !ATLAS.AM[e.dataset.m]).length")
    check(bad == 0, f'every muscle and label opens a known muscle ({bad} unknown)')
    acts = ev("Object.values(ATLAS.AM).flatMap(m => m.a.map(a => a[0])).filter(k => !ATLAS.ACT[k])")
    check(not acts, f'every action has an animation {acts}')
    # 每个动画里，主动肌从放松到收缩一路变短
    mono = ev("""(() => { const fake = { setAttribute() {}, querySelector() { return { innerHTML: '', setAttribute() {} }; } }, out = [];
      for (const k in ATLAS.ACT) { const A = ATLAS.loadAct(k, fake);
        for (const m of A.M) { let prev = 1e9; for (let i = 0; i <= 40; i++) { const L = ATLAS.plen(ATLAS.mPts(ATLAS.rigAt(A, i / 40), m)); if (L > prev + 1e-6) { out.push(k); break; } prev = L; } } }
      return out; })()""")
    check(not mono, f'muscles always shorten while contracting {mono}')
    def tap(view, part):
        ev(f"[...document.querySelectorAll('#t-mm .mm-svg > g')[{view}].querySelectorAll('.mm-m')].find(p => p.dataset.p === '{part}' && !p.getAttribute('transform')).dispatchEvent(new MouseEvent('click', {{bubbles: true}}))")
        pg.wait_for_timeout(700)
    tap(0, '前束')
    check(ev("document.getElementById('sheet-bg').classList.contains('open') && document.getElementById('sheet-title').textContent") == '三角肌 · 前束', 'tap front delt → 三角肌 · 前束')
    check(ev("document.querySelector('#sheet-body .kx-tag').textContent") == '今天的次要部位', 'shows it is a secondary part today')
    check(ev("document.querySelector('#sheet-body .kx-acts [aria-selected=\"true\"]').textContent") == '肩前屈（前束）', 'front delt opens on shoulder flexion')
    f1 = ev("document.querySelector('#sheet-body .kx-g3').innerHTML"); pg.wait_for_timeout(500)
    f2 = ev("document.querySelector('#sheet-body .kx-g3').innerHTML")
    check(f1 != f2 and 'kx-ma' in f2 and 'kx-pa' in f2, 'animation is playing (muscle + pull arrow drawn)')
    check('收缩时：肩前屈' in ev("document.getElementById('kx-move').textContent") and ev("document.querySelectorAll('#sheet-body .kx-tr .chip').length") == 3, 'action line + 3 exercises')
    check(ev("!document.querySelector('#sheet-body').textContent.includes('起点与止点') && !document.querySelector('#sheet-body').textContent.includes('拉伸')"), 'details kept to the basics')
    ev("document.querySelectorAll('#sheet-body .kx-acts button')[0].click()"); pg.wait_for_timeout(400)
    check('肩外展' in ev("document.getElementById('kx-move').textContent") and ev("document.querySelector('#sheet-body .kx-svg').getAttribute('viewBox')") != '0 0 300 300', 'switch action → new animation')
    ev("ATLAS.toggle()"); f1 = ev("document.querySelector('#sheet-body .kx-g3').innerHTML"); pg.wait_for_timeout(400)
    check(f1 == ev("document.querySelector('#sheet-body .kx-g3').innerHTML") and '已暂停' in ev("document.getElementById('kx-state').textContent"), 'tap the picture to pause')
    ev("closeSheet()"); pg.wait_for_timeout(300)
    tap(1, '背阔')
    check(ev("document.getElementById('sheet-title').textContent") == '背阔肌' and ev("document.querySelector('#sheet-body .kx-tag').textContent") == '今天的主要部位', 'tap lats (back) → 背阔肌, main part today')
    ev("closeSheet()"); pg.wait_for_timeout(300)
    tap(0, '')
    check(ev("document.getElementById('sheet-title').textContent") in ('缝匠肌', '胫骨前肌') and not ev("document.querySelector('#sheet-body .kx-tag')"), 'muscle not in the plan: no 今天 tag')
    ev("closeSheet()"); pg.wait_for_timeout(300)
    ev("document.querySelector('#t-mm .mm-lb[data-p=\"腘绳肌\"]').dispatchEvent(new MouseEvent('click', {bubbles: true}))"); pg.wait_for_timeout(500)
    check(ev("document.getElementById('sheet-title').textContent") == '腘绳肌', 'tapping a label works too')
    ev("closeSheet()"); pg.wait_for_timeout(300)
    check(not ev("document.getElementById('t-mm').classList.contains('folded')"), 'tapping a muscle does not fold the card')
    # 人体比例：7.5 头身左右、肩宽约 2 个头高、手腕在裆部高度附近、膝盖在 70% 高度附近
    pr = ev("""(() => { const P = MM_OUT.map(s => [s[4], s[5]]); const ys = P.map(p => p[1]); const H = Math.max(...ys);
      const head = P.find(p => p[0] === 12)[1] + 3, sh = Math.max(...P.filter(p => p[1] < 120).map(p => p[0])) * 2;
      const wrist = P.find(p => p[0] === 66.8)[1], crotch = P[P.length - 1][1], knee = P.find(p => p[0] === 30.5)[1];
      return { heads: H / head, shoulder: sh / head, wrist: wrist / H, crotch: crotch / H, knee: knee / H }; })()""")
    check(7 <= pr['heads'] <= 8 and 1.9 <= pr['shoulder'] <= 2.3 and abs(pr['wrist'] - pr['crotch']) < 0.05 and 0.68 <= pr['knee'] <= 0.76, f'realistic proportions {pr}')
    # ── 板块排序（设置里调，存在本机） ──
    ev("LOCAL.order = {}; LOCAL.theme = 'ios'; applyTheme(); go('settings')"); pg.wait_for_timeout(1500)
    check(ev("document.querySelector('[data-fold=\"set:order\"]').classList.contains('folded')"), 'order card folded by default')
    ev("document.querySelector('[data-fold=\"set:order\"] .card-t').click()"); pg.wait_for_timeout(500)
    rows = ev("[...document.querySelectorAll('#ord-list .ord-row')].map(r => r.dataset.k)")
    check(rows == ev("MODS.today.map(m => m[0])"), f'today modules listed in default order ({len(rows)})')
    check(ev("document.querySelector('#ord-list .ord-row:first-child .ord-b').disabled && document.querySelector('#ord-list .ord-row:last-child .ord-b:last-child').disabled"), 'first ↑ / last ↓ disabled')
    for i in range(7): ev("document.querySelector('#ord-list [data-k=\"today:time\"] .ord-b').click()")
    check(ev("modOrder('today')[0]") == 'today:time' and ev("JSON.parse(localStorage.getItem(LS.local)).order.today[0]") == 'today:time', 'moved 摄入时间 to the top, saved')
    ev("go('today')"); pg.wait_for_timeout(1500)
    dom = ev("[...document.querySelectorAll('#scr-today > [data-mod]')].map(e => e.dataset.mod)")
    check(dom == ev("modOrder('today')"), f'today page follows the order ({dom[:2]})')
    check(ev("document.querySelector('#scr-today > .hd') === document.querySelector('#scr-today').firstElementChild"), 'header stays on top')
    top = ev("document.getElementById('t-time').getBoundingClientRect().top < document.getElementById('t-hero').getBoundingClientRect().top")
    check(top, '摄入时间 now shows above 热量概览')
    # 身体页：「记录」卡（固定节点）也能排，输入框内容不丢
    ev("go('settings')"); pg.wait_for_timeout(1200)
    ev("pickOrderPage('身体')"); pg.wait_for_timeout(200)
    for i in range(2): ev("document.querySelector('#ord-list [data-k=\"body:form\"] .ord-b:last-child').click()")
    check(ev("modOrder('body').indexOf('body:form')") == 2, 'body: 记录 moved down 2')
    ev("go('body')"); pg.wait_for_timeout(1500)
    ev("document.getElementById('b-note').value = '排序测试'")
    dom = ev("[...document.querySelectorAll('#b-content > *')].map(e => modKey(e)).filter(Boolean)")
    check(dom == ev("modOrder('body')"), f'body page follows the order {dom[:3]}')
    ev("renderBody()"); pg.wait_for_timeout(500)
    check(ev("document.getElementById('b-note').value") == '排序测试' and ev("document.querySelectorAll('[data-fold=\"body:form\"]').length") == 1, 'form keeps its input after re-render, only one copy')
    # 本周
    ev("go('settings')"); pg.wait_for_timeout(1200)
    ev("pickOrderPage('本周')"); ev("document.querySelector('#ord-list [data-k=\"week:tdee\"] .ord-b').click()")
    ev("go('week')"); pg.wait_for_timeout(1500)
    check(ev("[...document.querySelectorAll('#w-content > [data-fold]')].map(e => e.dataset.fold)") == ev("modOrder('week')"), 'week page follows the order')
    # 设置页本身：马上生效
    ev("go('settings')"); pg.wait_for_timeout(1200)
    ev("pickOrderPage('设置')")
    for i in range(7): ev("const b = document.querySelector('#ord-list [data-k=\"set:sync\"] .ord-b'); if (!b.disabled) b.click()")
    check(ev("document.querySelector('#s-content > [data-fold]').dataset.fold") == 'set:sync', 'settings reorders right away')
    ev("resetOrder()"); pg.wait_for_timeout(300)
    check(ev("document.querySelector('#s-content > [data-fold]').dataset.fold") == 'set:theme' and not ev("(LOCAL.order || {}).settings"), 'reset restores default')
    ev("LOCAL.order = { today: ['today:time', 'nope', 'today:time', 'today:hero', 'today:list', 'today:mm'] }")
    got = ev("modOrder('today')")
    check(got == ['today:time', 'today:hero', 'today:act', 'today:list', 'today:mm', 'today:body', 'today:composer', 'today:ai'], f'unknown / duplicate keys ignored, missing ones go after their default neighbour {got}')
    ev("LOCAL.order = {}; saveLocal()")
    check(not errs, 'no page errors ' + str(errs[:3]))
    b.close()
print(f'{ok} pass, {bad} fail')
