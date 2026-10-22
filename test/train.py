"""训练功能测试：表格三页、预置动作库和计划、选动作/器材、逐组记录、superset、最小化、续练、完成写表、热量联动、改计划、改动作库、旧后台兼容。
先用带密码 abc 的 Code.gs 启动 test/server.js（CODE_PATH=...，全新的进程），再运行：python3 test/train.py"""
import json, urllib.request, datetime
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
dump = lambda: json.loads(urllib.request.urlopen('http://localhost:8787/dump').read())
WEEK = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    ctx.add_init_script(SHIM)
    ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(status=200, body='', content_type='text/css'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('http://localhost:8787/app'); pg.wait_for_timeout(1500)
    if pg.is_visible('#lock'):
        pg.fill('#lock-in', 'abc'); pg.click('#lock .btn.pri'); pg.wait_for_timeout(3000)
    pg.wait_for_function('OUTBOX.length === 0', timeout=20000)

    # ── 表格三页 + 预置
    d = dump()
    check(all(k in d for k in ['动作库', '计划', '训练记录']), 'sheets 动作库 / 计划 / 训练记录 created')
    check(d['动作库'][0][:7] == ['id', '动作', '器材', '记录方式', '大部位', '主练', '顺带'], 'exercise sheet has Chinese headers: ' + str(d['动作库'][0]))
    check(d['训练记录'][0][:10] == ['id', '日期', '计划', '动作', '器材', '组', '类型', 'kg', '次', '容量'], 'sets sheet headers: ' + str(d['训练记录'][0]))
    check(len(d['动作库']) - 1 == 57 and len(d['计划']) - 1 == 27, f"seeded 57 exercises / 27 plan rows ({len(d['动作库']) - 1} / {len(d['计划']) - 1})")
    row = next(r for r in d['动作库'] if r[1] == '侧平举')
    check(row[2] == '哑铃、绳索、固定器械' and row[5] == '中束', 'lateral raise row: ' + str(row[:7]))
    check(pg.evaluate("[dayType('周一'), dayType('周二'), dayType('周五'), dayType('周六')]") == ['有氧', '力量', '拳击', '休息'], 'day types')

    # ── 训练页：按今天周几推荐
    pg.click('#nav-train'); pg.wait_for_timeout(1800)
    tw = WEEK[(datetime.date.today().weekday() + 1) % 7]
    check(pg.locator('.tr-days .chip.on').inner_text().startswith(tw[1]), 'suggests today\'s plan ' + tw)
    pg.evaluate("trDay('周二')"); pg.wait_for_timeout(300)
    names = pg.evaluate("[...document.querySelectorAll('.tr-slot b')].map(e => e.textContent)")
    check(names == ['哑铃肩推', '绳索高位下拉', '绳索坐姿划船', '哑铃卧推', '双杠臂屈伸', '哑铃侧平举'], 'Tuesday slots with defaults: ' + str(names))
    check(pg.locator('.tr-slot .exa svg').count() == 6, 'each slot has an exercise picture')
    # 两个同部位的位置默认选不同的动作
    sun = pg.evaluate("resolveSlots('周日').map(s => s.ex.name + '|' + s.equip)")
    check(sun[3] != sun[4] and sun[3].startswith('弯举') and sun[4].startswith('锤式弯举'), 'two biceps slots get different exercises: ' + str(sun))
    # 换部位位置的动作：先动作后器材，记住
    pg.locator('.tr-slot').nth(1).click(); pg.wait_for_timeout(400)
    cards = pg.evaluate("[...document.querySelectorAll('.tr-card b')].map(e => e.textContent)")
    check(cards[:4] == ['高位下拉', '引体向上', '直臂下拉', '单臂划船'], 'picker lists 背阔 exercises first: ' + str(cards[:5]))
    check(pg.locator('.tr-card .exa svg animate').count() > 0, 'picker cards are animated')
    pg.locator('.tr-card', has_text='引体向上').click(); pg.wait_for_timeout(300)
    check(pg.locator('.tr-big svg').count() == 1 and pg.locator('#sheet-body .chip').count() == 2, 'equipment step: big animation + 2 equipment')
    pg.locator('#sheet-body .chip', has_text='固定器械').click(); pg.wait_for_timeout(200)
    check(pg.evaluate("TRAIN.pick.equip") == '固定器械' and '固定器械' not in pg.inner_text('#sheet-title'), 'switch equipment: ' + pg.inner_text('#sheet-title'))
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    check(pg.locator('.tr-slot b').nth(1).inner_text() == '器械引体向上', 'slot now 器械引体向上')
    check(pg.evaluate("Object.values(DB.settings.trainSlot).some(v => v.ex === '引体向上' && v.equip === '固定器械')"), 'pick saved to settings (synced)')
    # 固定动作：只换器材
    pg.locator('.tr-slot').nth(0).click(); pg.wait_for_timeout(300)
    check(pg.locator('.tr-big').count() == 1 and '换动作' not in pg.inner_text('#sheet-body'), 'fixed exercise: equipment only')
    pg.evaluate("closeSheet()")

    # ── 开始训练（周二）
    pg.click('.tr-plan .btn.pri'); pg.wait_for_timeout(500)
    W = pg.evaluate("LOCAL.workout")
    check(W and W['day'] == '周二' and len(W['items']) == 6 and all(len(i['sets']) == 4 for i in W['items']), 'workout started: 6 exercises × 4 sets')
    check(pg.locator('#tw-time').count() == 1 and '0/24' in pg.inner_text('.tr-prog').replace(' ', ''), 'top shows timer and 0/24 sets')
    check('第一次做' in pg.inner_text('.tr-last'), 'first time: no last data')
    pg.locator('.tr-set').nth(0).locator('.tr-ok').click(); pg.wait_for_timeout(150)
    check(not pg.evaluate("LOCAL.workout.items[0].sets[0].done"), 'cannot ✓ without reps')
    for i, (kg, r) in enumerate([(10, 12), (20, 10), (20, 9), (20, 8)]):
        row = pg.locator('.tr-set').nth(i)
        row.locator('input').nth(0).fill(str(kg)); row.locator('input').nth(1).fill(str(r))
    pg.locator('.tr-set').nth(0).locator('.tr-k').click(); pg.wait_for_timeout(150)
    check(pg.evaluate("LOCAL.workout.items[0].sets[0].kind") == '热身' and pg.locator('.tr-set').nth(0).locator('.tr-k').inner_text() == '热', 'tap set number → 热身')
    for i in range(3): pg.locator('.tr-set').nth(i).locator('.tr-ok').click(); pg.wait_for_timeout(120)
    check(pg.evaluate("LOCAL.workout.items[0].sets.filter(s => s.done).length") == 3 and '3/24' in pg.inner_text('.tr-prog').replace(' ', ''), '3 sets done')
    pg.locator('.tr-set').nth(3).locator('.tr-x').click(); pg.wait_for_timeout(150)
    check(pg.locator('.tr-set').count() == 3, 'delete an unfinished set')
    pg.click('.tr-add'); pg.wait_for_timeout(150)
    check(pg.locator('.tr-set').count() == 4 and pg.locator('.tr-set').nth(3).locator('input').nth(0).input_value() == '20', 'add set copies last values')
    # 左右滑：切动作（不是切页面）
    pg.evaluate("Object.assign(SWIPE, {on: true, h: true, x0: 300, y0: 400, t0: 0, dx: -120, dy: 5}); swipeEnd(false, 400)"); pg.wait_for_timeout(400)
    check(pg.evaluate("VIEW.tab") == 'train' and pg.evaluate("LOCAL.workout.cur") == 1, 'swipe left → next exercise')
    check(pg.inner_text('.tr-ex-n') == '器械引体向上' and pg.evaluate("exByName('引体向上').mode") == '自重', 'exercise 2 is the picked pull-up (bodyweight mode)')
    check('附加kg' in pg.inner_text('.tr-set'), 'bodyweight exercise labels kg as 附加kg')
    row = pg.locator('.tr-set').nth(0); row.locator('input').nth(0).fill('-20'); row.locator('input').nth(1).fill('8'); row.locator('.tr-ok').click(); pg.wait_for_timeout(150)
    check(pg.evaluate("LOCAL.workout.items[1].sets[0].kg") == -20, 'assisted pull-up keeps negative kg')
    # 换器材（还没做的动作会按新器材重填）
    pg.evaluate("trGoto(2)"); pg.wait_for_timeout(300)
    pg.locator('.tr-eqs .chip', has_text='固定器械').click(); pg.wait_for_timeout(200)
    check(pg.evaluate("LOCAL.workout.items[2].equip") == '固定器械' and pg.inner_text('.tr-ex-n') == '器械坐姿划船', 'change equipment in workout')
    # superset：2 和 3 配对，做完一组自动跳过去
    pg.click('.tr-acts .chip >> text=和下一个配 superset'); pg.wait_for_timeout(200)
    check(pg.evaluate("LOCAL.workout.items[2].ss") == 'A' and pg.evaluate("LOCAL.workout.items[3].ss") == 'A', 'superset A paired')
    row = pg.locator('.tr-set').nth(0); row.locator('input').nth(0).fill('45'); row.locator('input').nth(1).fill('10'); row.locator('.tr-ok').click(); pg.wait_for_timeout(250)
    check(pg.evaluate("LOCAL.workout.cur") == 3, 'superset: ✓ jumps to partner')
    row = pg.locator('.tr-set').nth(0); row.locator('input').nth(0).fill('24'); row.locator('input').nth(1).fill('10'); row.locator('.tr-ok').click(); pg.wait_for_timeout(250)
    check(pg.evaluate("LOCAL.workout.cur") == 2, 'superset: ✓ jumps back')
    # 前移 / 删除 / 加动作
    pg.evaluate("trGoto(5)"); pg.wait_for_timeout(200)
    pg.click('.tr-acts .chip >> text=前移'); pg.wait_for_timeout(150)
    check(pg.evaluate("LOCAL.workout.items[4].ex") == '侧平举' and pg.evaluate("LOCAL.workout.cur") == 4, 'move exercise forward')
    pg.click('.tr-acts .chip >> text=删除动作'); pg.wait_for_timeout(200)
    check(len(pg.evaluate("LOCAL.workout.items")) == 5, 'remove unstarted exercise without asking')
    pg.click('.tr-addex'); pg.wait_for_timeout(300)
    pg.locator('#sheet-body .chip', has_text='手臂').click(); pg.wait_for_timeout(200)
    pg.locator('.tr-card', has_text='绳索下压').click(); pg.wait_for_timeout(200); pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    check(len(pg.evaluate("LOCAL.workout.items")) == 6 and pg.inner_text('.tr-ex-n') == '绳索下压', 'add exercise mid-workout')
    # 最小化：去别的页，小条；关掉再打开接着练
    pg.click('#nav-today'); pg.wait_for_timeout(1500)
    check(pg.is_visible('#train-bar') and '训练中' in pg.inner_text('#train-bar'), 'mini bar on other tabs')
    pg.reload(); pg.wait_for_timeout(2500)
    check(pg.evaluate("!!LOCAL.workout && LOCAL.workout.items.length === 6") and pg.is_visible('#train-bar'), 'workout survives reload')
    pg.click('#train-bar'); pg.wait_for_timeout(1500)
    check(pg.evaluate("VIEW.tab") == 'train' and pg.locator('.tr-ex').count() == 1, 'tap bar → back to workout')
    # 完成：写表 + 力量
    pg.evaluate("LOCAL.workout.start = Date.now() - 50 * 60000; saveLocal()")
    pg.click('.tr-fin'); pg.wait_for_timeout(300)
    check(pg.input_value('#tw-mins') == '50', 'finish sheet: duration 50 min')
    bw = pg.evaluate("bw7(today())")
    exp_k = round(bw * 50 / 60 * 2.5)
    check(f'+{exp_k}' in pg.inner_text('#tw-kcal').replace(',', ''), f'kcal preview {exp_k} (bw {bw:.1f})')
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(500)
    check(pg.evaluate("LOCAL.workout") is None, 'workout cleared after save')
    sets = pg.evaluate("DB.sets.filter(s => s.plan === '周二')")
    check(len(sets) == 6, f'only ✓ sets saved ({len(sets)})')
    sp = sorted([s for s in sets if s['ex'] == '肩推'], key=lambda s: s['set'])
    check([(s['set'], s['kind'], s['kg'], s['reps'], s['vol']) for s in sp] == [(1, '热身', 10, 12, 0), (2, '正式', 20, 10, 400), (3, '正式', 20, 9, 360)],
          'shoulder press rows: warm-up vol 0, dumbbell ×2: ' + str([(s['set'], s['kind'], s['kg'], s['reps'], s['vol']) for s in sp]))
    pu = next(s for s in sets if s['ex'] == '引体向上')
    check(pu['equip'] == '固定器械' and pu['vol'] == round((bw - 20) * 8), f"assisted pull-up volume (bw−20)×8 = {pu['vol']}")
    st = pg.evaluate("DB.log.find(e => e.date === today() && e.type === 'strength')")
    check(st and st['kcal'] == exp_k and st['note'] == '50 分钟', 'strength entry with kcal from duration: ' + str(st and (st['kcal'], st['note'])))
    check(pg.evaluate("dayInfo(today()).parts.strengthK") == exp_k, 'today target uses workout kcal')
    pg.wait_for_function('OUTBOX.length === 0', timeout=20000)
    rows = [r for r in dump()['训练记录'][1:] if r[2] == '周二']
    check(len(rows) == 6 and any(r[3] == '肩推' and r[4] == '哑铃' and r[6] == '热身' for r in rows), 'sets written to the 训练记录 sheet')
    # 第二次：上次的数据预填
    pg.evaluate("trDay('周二')"); pg.wait_for_timeout(200)
    check('上次' in pg.locator('.tr-slot small').nth(0).inner_text(), 'plan list shows last data')
    pg.click('.tr-plan .btn.pri'); pg.wait_for_timeout(400)
    s0 = pg.evaluate("LOCAL.workout.items[0].sets")
    check([(s['kind'], s['kg'], s['reps']) for s in s0] == [('热身', 10, 12), ('正式', 20, 10), ('正式', 20, 9), ('正式', 20, 9)], 'second time prefilled from last time: ' + str([(s['kind'], s['kg'], s['reps']) for s in s0]))
    check(pg.evaluate("LOCAL.workout.items[1].ex") == '引体向上' and pg.evaluate("LOCAL.workout.items[1].equip") == '固定器械', 'slot remembers last exercise + equipment')
    pg.click('.tr-quit'); pg.wait_for_timeout(200); pg.click('#dlg-ok'); pg.wait_for_timeout(300)
    check(pg.evaluate("LOCAL.workout") is None, 'discard workout')

    # ── 改计划
    pg.evaluate("openPlanDay('周四')"); pg.wait_for_timeout(300)
    n0 = pg.evaluate("planOf('周四').length")
    pg.locator('#sheet-body .chip', has_text='小腿').first.click(); pg.wait_for_timeout(300)
    check(pg.evaluate("planOf('周四').length") == n0 + 1 and pg.evaluate("planOf('周四').slice(-1)[0].item") == '小腿', 'add part to plan')
    last_id = pg.evaluate("planOf('周四').slice(-1)[0].id")
    pg.evaluate(f"planMove('{last_id}', -1)"); pg.wait_for_timeout(200)
    check(pg.evaluate(f"planOf('周四').findIndex(r => r.id === '{last_id}')") == n0 - 1, 'move plan row up')
    pg.evaluate(f"planSS('{last_id}')"); pg.wait_for_timeout(200)
    check(pg.evaluate(f"planOf('周四').filter(r => r.ss).length") == 2, 'superset in plan')
    pg.evaluate(f"planDel('{last_id}')"); pg.wait_for_timeout(200)
    check(pg.evaluate("planOf('周四').length") == n0 and pg.evaluate("planOf('周四').every(r => !r.ss)"), 'delete plan row clears its superset')
    pg.evaluate("closeSheet()")
    # 有氧日 / 拳击日
    pg.evaluate("trDay('周一')"); pg.wait_for_timeout(200)
    check('有氧' in pg.inner_text('.tr-off'), 'cardio day card')
    pg.evaluate("trLogCardio('拳击')"); pg.wait_for_timeout(300)
    check(pg.evaluate("BURN.k") == 'other' and pg.input_value('#x-name') == '拳击', 'boxing opens cardio sheet with 拳击 preset')
    pg.evaluate("closeSheet()")

    # ── 动作库
    pg.evaluate("editExercise('')"); pg.wait_for_timeout(300)
    pg.fill('#ex-name', '测试动作')
    pg.evaluate("TRAIN.edit.main = '中束'; exEditRender()")
    pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(300)
    check(pg.evaluate("!!exByName('测试动作') && exByName('测试动作').group === '肩'"), 'add exercise to library')
    check(pg.evaluate("candidates('中束').some(x => x.ex.name === '测试动作')"), 'new exercise appears for its part')
    xid = pg.evaluate("exByName('测试动作').id")
    pg.evaluate(f"editExercise('{xid}')"); pg.wait_for_timeout(200); pg.fill('#ex-name', '测试动作2'); pg.click('#sheet-body .btn.pri'); pg.wait_for_timeout(200)
    check(pg.evaluate("!exByName('测试动作') && !!exByName('测试动作2')"), 'rename exercise')
    pg.evaluate(f"editExercise('{xid}')"); pg.wait_for_timeout(200); pg.click('#sheet-body .btn.danger'); pg.wait_for_timeout(200); pg.click('#dlg-ok'); pg.wait_for_timeout(300)
    check(pg.evaluate("!exByName('测试动作2')"), 'delete exercise')
    # 在表格里直接改：拉取后 App 跟着变
    pg.wait_for_function('OUTBOX.length === 0', timeout=20000)
    pg.evaluate("api('batch', {ops: [{op: 'upsert', table: 'Exercises', row: {id: 'x_sheet1', name: '表格里加的动作', equip: '绳索,哑铃', mode: '重量', group: '手臂', main: '三头', sub: '', anim: '', sort: 99}}]})")
    pg.evaluate("syncNow()"); pg.wait_for_timeout(2500)
    check(pg.evaluate("exEq(exByName('表格里加的动作')).join('|')") == '绳索|哑铃', 'exercise added in the sheet appears in the app (equip split by comma)')

    # ── 旧版后台（没有这三页）：训练数据先留在本机
    pg.evaluate("LOCAL.server.tables = ['Log','Foods','Categories','Body','Settings','Steps']")
    pg.evaluate("upsertRow('sets', {id: 's_hold', date: today(), plan: '周二', ex: '侧平举', equip: '哑铃', set: 1, kind: '正式', kg: 8, reps: 15, vol: 240, wid: 'w_x'}); upsertRow('log', {id: 'l_hold', date: today(), time: '', meal: '加餐', type: 'food', name: '测试', kcal: 1, protein: 0, fat: 0, carb: 0, foodId: '', note: ''})")
    pg.evaluate("flush()"); pg.wait_for_timeout(2500)
    check(pg.evaluate("OUTBOX.length === 1 && OUTBOX[0].table === 'Sets'") and pg.evaluate("trainWaiting()"), 'old backend: training op held, others sent')
    pg.evaluate("LOCAL.server.tables.push('Exercises','Plan','Sets'); flush()"); pg.wait_for_timeout(2500)
    check(pg.evaluate("OUTBOX.length") == 0, 'after backend update: held op uploaded')

    # 每个主题下训练页都能画出来
    for th in pg.evaluate("THEMES.map(t => t.id)"):
        pg.evaluate(f"LOCAL.theme = '{th}'; applyTheme(); renderTrain()")
    check(not errs, 'no page errors ' + str(errs[:3]))
    b.close()
print(f'{ok} pass, {bad} fail')
