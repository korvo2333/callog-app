// ════════════════════════════════════════════
// 数据写入：先改本机，再进同步队列
// ════════════════════════════════════════════
const T2S = { log: 'Log', foods: 'Foods', cats: 'Categories', body: 'Body' };
const S2T = { Log: 'log', Foods: 'foods', Categories: 'cats', Body: 'body' };

function upsertRow(t, row) {
  const list = DB[t];
  const i = list.findIndex(x => x.id === row.id);
  const stamp = t !== 'cats' ? { updatedAt: new Date().toISOString() } : {};
  const merged = Object.assign({}, i >= 0 ? list[i] : {}, row, stamp);
  if (i >= 0) list[i] = merged; else list.push(merged);
  if (t === 'log' && i < 0 && isFoodEntry(merged) && num(merged.kcal) > 0) ANIM.react = { date: merged.date, kcal: num(merged.kcal), t: Date.now() };
  saveDB();
  // 已有的行只上传改动的字段，不会覆盖你直接在表格里做的其他修改
  queue({ op: 'upsert', table: T2S[t], row: i >= 0 ? Object.assign({}, row, stamp) : merged });
  return merged;
}
function deleteRow(t, id) {
  DB[t] = DB[t].filter(x => x.id !== id);
  saveDB();
  queue({ op: 'delete', table: T2S[t], id });
}
function setSetting(key, value) {
  DB.settings[key] = value;
  saveDB();
  queue({ op: 'upsert', table: 'Settings', row: { key, value: JSON.stringify(value) } });
}

// 步数：手动改的值（有手动值时以手动为准，清空则回到手表的数）
function setStepsManual(date, n) {
  const v = n === null || n === '' || !isFinite(+n) ? '' : Math.max(0, Math.round(+n));
  const i = DB.steps.findIndex(r => r.date === date);
  const row = { date, manual: v, updatedAt: new Date().toISOString() };
  if (i >= 0) DB.steps[i] = Object.assign({}, DB.steps[i], row); else DB.steps.push(Object.assign({ watch: '', watchFull: '', watchEnd: '' }, row));
  saveDB();
  queue({ op: 'upsert', table: 'Steps', row });
}

// 拉取后把还没发出去的修改重新叠加上去
function applyOpLocal(o) {
  if (o.table === 'Steps') {
    if (o.op !== 'upsert') return;
    const i = DB.steps.findIndex(r => r.date === o.row.date);
    if (i >= 0) DB.steps[i] = Object.assign({}, DB.steps[i], o.row); else DB.steps.push(Object.assign({}, o.row));
    return;
  }
  if (o.table === 'Settings') {
    if (o.op === 'upsert') { try { DB.settings[o.row.key] = JSON.parse(o.row.value); } catch (e) { } }
    else delete DB.settings[o.id];
    return;
  }
  const t = S2T[o.table];
  if (!t) return;
  if (o.op === 'upsert') {
    const i = DB[t].findIndex(x => x.id === o.row.id);
    if (i >= 0) DB[t][i] = Object.assign({}, DB[t][i], o.row); else DB[t].push(Object.assign({}, o.row));
  } else {
    DB[t] = DB[t].filter(x => x.id !== o.id);
  }
}

// ════════════════════════════════════════════
// 和 Google 表格通信
//   网页版：页面由 Apps Script 提供，用 google.script.run 调用后端
//   安卓 App：页面在手机本地，直接往 Apps Script 网址（…/exec）发请求，由 Code.gs 的 doPost 处理
// ════════════════════════════════════════════
const IN_GAS = !!(window.google && google.script && google.script.run);
const IN_APP = !IN_GAS && !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const connected = () => IN_GAS || (IN_APP && !!LOCAL.apiUrl);
// 网址：去掉 ?token= 之类的参数；粘贴的是手表用的那串网址时，顺便取出密码
function parseApiUrl(v) {
  const m = String(v || '').trim().match(/^(https?:\/\/[^\s?#]+?\/exec)(?:[?#](.*))?$/);
  if (!m) return null;
  const tk = new URLSearchParams(m[2] || '').get('token');
  return { url: m[1], token: tk || '' };
}
function httpCall(req, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('连接超时')), timeoutMs);
    fetch(LOCAL.apiUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(req) })
      .then(r => r.text().then(txt => {
        try { return JSON.parse(txt); } catch (e) { throw new Error(r.ok ? '网址不对' : '网络错误 ' + r.status); }
      }))
      .then(j => {
        clearTimeout(t);
        if (j && j.ok === false && j.error === 'token') j.error = '后台是旧版：更新 Code.gs 后部署新版本';
        resolve(j);
      }, e => { clearTimeout(t); reject(e && e.message ? e : new Error('网络错误')); });
  });
}

function gasCall(req, timeoutMs) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('连接超时')), timeoutMs);
    google.script.run
      .withSuccessHandler(r => { clearTimeout(t); resolve(r); })
      .withFailureHandler(e => { clearTimeout(t); reject(new Error((e && e.message) || String(e) || '网络错误')); })
      .api(JSON.stringify(req));
  });
}

async function api(action, payload, timeoutMs) {
  if (!connected()) throw new Error('现在是本机模式');
  const req = Object.assign({ action, token: LOCAL.token || '' }, payload || {});
  const j = await (IN_GAS ? gasCall(req, timeoutMs || 30000) : httpCall(req, timeoutMs || 30000));
  if (!j || !j.ok) {
    const err = new Error((j && j.error) || '服务器错误');
    if (/密码不正确/.test(err.message)) { err.auth = true; showLock(); }
    throw err;
  }
  return j;
}

let syncState = 'idle', syncMsg = '', flushing = false, flushTimer = null, retryTimer = null;

function setSync(state, msg) {
  syncState = state; syncMsg = msg || '';
  const el = $('#sync-pill');
  if (!el) return;
  let text, sym, cls = '';
  if (!connected()) { text = '仅本机'; sym = '–'; }
  else if (state === 'ing') { text = '同步中'; sym = ''; cls = 'ing'; }
  else if (state === 'err') { text = '同步失败'; sym = '!'; cls = 'err'; }
  else if (OUTBOX.length) { text = `${OUTBOX.length} 条待同步`; sym = ''; cls = 'ing'; }
  else { text = '已同步'; sym = '✓'; cls = 'ok'; }
  el.innerHTML = `<span>${sym}</span>`;
  el.className = 'pill ' + cls;
  el.setAttribute('aria-label', text);
  el.title = msg ? text + '：' + msg : text;
  const s = $('#s-syncinfo');
  if (s) s.innerHTML = syncInfoHTML();
}

function queue(op) {
  OUTBOX.push(op);
  saveOutbox();
  setSync(syncState === 'ing' ? 'ing' : 'idle');
  clearTimeout(flushTimer);
  flushTimer = setTimeout(flush, 500);
}

async function flush() {
  if (!connected() || flushing || !OUTBOX.length) { setSync(syncState === 'err' ? 'err' : 'idle'); return; }
  flushing = true;
  const ops = OUTBOX.slice(0, 150);
  setSync('ing');
  try {
    await api('batch', { ops }, 45000);
    OUTBOX.splice(0, ops.length);
    saveOutbox();
    LOCAL.lastSync = new Date().toISOString();
    saveLocal();
    setSync('ok');
    if (OUTBOX.length) setTimeout(flush, 100);
  } catch (e) {
    setSync('err', e.message);
    clearTimeout(retryTimer);
    retryTimer = setTimeout(flush, 20000);
  } finally {
    flushing = false;
  }
}

function fromServer(data) {
  const n = v => { const x = parseFloat(v); return isFinite(x) ? x : 0; };
  const s = v => (v === null || v === undefined) ? '' : String(v);
  const settings = {};
  (data.Settings || []).forEach(r => { try { settings[r.key] = JSON.parse(r.value); } catch (e) { settings[r.key] = r.value; } });
  return {
    log: (data.Log || []).filter(r => r.date).map(r => ({
      id: s(r.id), date: s(r.date), time: s(r.time), meal: s(r.meal), name: s(r.name),
      kcal: n(r.kcal), protein: n(r.protein), fat: n(r.fat), carb: n(r.carb),
      type: s(r.type) || 'food', foodId: s(r.foodId), note: s(r.note), updatedAt: s(r.updatedAt),
      ratio: n(r.ratio)
    })),
    foods: (data.Foods || []).filter(r => r.name).map(r => ({
      id: s(r.id), name: s(r.name), category: s(r.category), serving: s(r.serving),
      kcal: n(r.kcal), protein: n(r.protein), fat: n(r.fat), carb: n(r.carb),
      uses: n(r.uses), sort: n(r.sort), updatedAt: s(r.updatedAt)
    })),
    cats: (data.Categories || []).filter(r => r.name).map(r => ({ id: s(r.id), name: s(r.name), sort: n(r.sort) })),
    body: (data.Body || []).filter(r => r.date).map(r => ({
      id: s(r.id), date: s(r.date), weight: numOrNull(r.weight), bodyfat: numOrNull(r.bodyfat),
      muscle: numOrNull(r.muscle), note: s(r.note), updatedAt: s(r.updatedAt)
    })),
    steps: stepsFromServer(data.Steps),
    settings
  };
}
function stepsFromServer(rows) {
  const s = v => (v === null || v === undefined) ? '' : String(v);
  return (rows || []).filter(r => r.date).map(r => ({
    date: s(r.date).slice(0, 10), watch: s(r.watch), watchFull: s(r.watchFull), watchEnd: s(r.watchEnd), manual: s(r.manual), updatedAt: s(r.updatedAt)
  }));
}

async function pull() {
  if (!connected()) return;
  const j = await api('bootstrap', {}, 45000);
  const fresh = fromServer(j.data || {});
  DB.log = fresh.log; DB.foods = fresh.foods; DB.cats = fresh.cats; DB.body = fresh.body; DB.steps = fresh.steps; DB.settings = fresh.settings;
  OUTBOX.forEach(applyOpLocal);
  saveDB();
  LOCAL.lastPull = Date.now();
  LOCAL.lastSync = new Date().toISOString();
  saveLocal();
}

let syncing = false;
async function syncNow(manual) {
  if (!connected()) {
    if (manual) toast('本机模式');
    setSync('idle');
    return;
  }
  if (syncing) return;
  syncing = true;
  setSync('ing');
  try {
    await flush();
    if (OUTBOX.length && syncState === 'err') throw new Error(syncMsg || '上传失败');
    await pull();
    ensureFormula();
    setSync('ok');
    rerender();
    pollSteps(true);
    if (manual) toast('已同步');
  } catch (e) {
    setSync('err', e.message);
    if (manual) toast('同步失败：' + e.message);
  } finally {
    syncing = false;
  }
}

// 手表步数：App 开着时每 5 分钟、以及切回 App 时拉一次（只拉最近 3 周的步数，很轻）
const STEPS = { at: 0, busy: false, last: null, sig: '' };
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } })();   // 后台按这个时区给手表步数分天
async function pollSteps(force) {
  if (!connected() || STEPS.busy || document.hidden) return;
  if (!force && Date.now() - STEPS.at < 4.5 * 60000) return;
  STEPS.busy = true;
  try {
    const r = await api('steps', { days: 21, tz: TZ }, 20000);
    STEPS.at = Date.now();
    STEPS.last = r.last || null;
    LOCAL.stepsLast = STEPS.last; saveLocal();
    const fresh = stepsFromServer(r.rows);
    const keep = DB.steps.filter(x => !fresh.some(f => f.date === x.date));
    DB.steps = keep.concat(fresh);
    OUTBOX.filter(o => o.table === 'Steps').forEach(applyOpLocal);
    const sig = JSON.stringify(fresh.map(f => [f.date, f.watch, f.manual]));
    saveDB();
    if (sig !== STEPS.sig) { STEPS.sig = sig; if (VIEW.tab === 'today') { renderHero(); renderActivity(); } else if (VIEW.tab === 'week') renderWeek(); }
    else if (VIEW.tab === 'today') renderActivity();
    STEPS.err = '';
  } catch (e) { STEPS.err = /未知操作|后台是旧版/.test(e.message) ? 'old' : e.message; }   // old = 后台还是旧版 Code.gs
  finally { STEPS.busy = false; }
  return STEPS.err;
}
setInterval(() => pollSteps(), 60000);

// ════════════════════════════════════════════
// 业务计算
// ════════════════════════════════════════════
const isFoodEntry = e => e.type !== 'burn' && e.type !== 'strength';
const formulaOn = date => { const f = cfg().formulaFrom; return !!f && date >= f; };
const DEFICITS = [{ v: 400, name: '温和' }, { v: 550, name: '标准' }, { v: 700, name: '激进' }];
const deficitOf = s => num((s || cfg()).deficit);

function stepsActual(date) {
  const r = (DB.steps || []).find(x => x.date === date);
  if (!r) return null;
  if (r.manual !== '' && r.manual !== null && r.manual !== undefined && isFinite(+r.manual)) return { n: +r.manual, src: 'manual' };
  if (r.watch !== '' && r.watch !== null && r.watch !== undefined && isFinite(+r.watch)) return { n: +r.watch, src: 'watch', full: r.watchFull === 'yes' };
  return null;
}
// 平时步数：这天之前 14 天里（不含今天）完整的日子（手动填的或手表整天的）取中位数，最多 7 天；不到 3 天就用设置里的默认步数
// 用中位数：偶尔一天走特别多（或第一次同步只拿到半天）不会把「平时」带偏
function stepsAvg(date) {
  const vals = [], t = today();
  for (let i = 1; i <= 14 && vals.length < 7; i++) {
    const d = addDays(date, -i);
    if (d >= t) continue;   // 今天还没走完，不算
    const a = stepsActual(d);
    if (a && a.n > 0 && (a.src === 'manual' || a.full)) vals.push(a.n);
  }
  if (vals.length < 3) return null;
  vals.sort((x, y) => x - y);
  const m = vals.length >> 1;
  return vals.length % 2 ? vals[m] : Math.round((vals[m - 1] + vals[m]) / 2);
}
// 最近 3 天手表推过步数 = 接上了手表
const watchLinked = () => (DB.steps || []).some(r => r.watch !== '' && r.watch !== null && r.date >= addDays(today(), -3));
// 用哪个步数算：过去和今天都用实际步数（今天随手表同步实时变）；今天还没同步到时，接了手表按 0 算，没接按平时；以后的天按平时
function stepsFor(date) {
  const t = today(), a = stepsActual(date);
  const avg = stepsAvg(date), usual = avg === null ? num(cfg().stepsDefault) : avg;
  const o = { usual, hasAvg: avg !== null };
  if (date > t) return Object.assign({ n: usual, src: 'usual', actual: null }, o);
  if (a) return Object.assign({ n: a.n, src: a.src, actual: a.n }, o);
  if (date === t && watchLinked()) return Object.assign({ n: 0, src: 'wait', actual: 0 }, o);
  return Object.assign({ n: usual, src: date < t ? 'none' : 'usual', actual: null }, o);
}
// 有氧：手表数字 × 计入比例。比例按种类：椭圆机 / 跑步（手表把这段的步数也算进了步数，步数消耗里已经有一部分，所以更低）/ 其他
const CARDIO_KINDS = [
  { k: 'ell', name: '椭圆机', key: 'cardioEll', why: '椭圆机的步数也算进了步数消耗' },
  { k: 'run', name: '跑步', key: 'cardioRun', why: '跑步的步数也算进了步数消耗' },
  { k: 'other', name: '其他', key: 'cardioFactor', why: '手表的数字含基础代谢，而且偏高' }
];
const cardioKind = e => /椭圆|elliptical|クロストレーナー/i.test(e && e.name || '') ? 'ell' : /跑|run|ラン/i.test(e && e.name || '') ? 'run' : 'other';
const cardioKindPct = (k, s) => { const c = CARDIO_KINDS.find(x => x.k === k) || CARDIO_KINDS[2]; s = s || cfg(); return Math.round(pf(s[c.key] != null ? s[c.key] : s.cardioFactor) * 100); };
// 每条记录存了自己的比例（以后改设置不影响旧记录）；没存的按种类的默认值
const cardioPct = (e, s) => { const r = num(e.ratio); return r > 0 ? r : cardioKindPct(cardioKind(e), s); };
function cardioCounted(e, s) { return Math.round(num(e.kcal) * cardioPct(e, s) / 100); }
function strengthRate() {   // 以后几天的预估：最近 14 天练了几次力量；新公式刚开始时用设置里的每周次数
  const s = cfg(), t = today();
  if (s.formulaFrom && diffDays(s.formulaFrom, t) >= 14) {
    const from = addDays(t, -14);
    const days = new Set(DB.log.filter(e => e.type === 'strength' && e.date >= from && e.date < t).map(e => e.date));
    return days.size / 14;
  }
  return pf(s.strengthPerWeek) / 7;
}
function overrideFor(date) {
  return (cfg().overrides || []).find(o => o.from && o.to && date >= o.from && date <= o.to) || null;
}
function baseTarget(date) {
  const o = overrideFor(date);
  if (o) return num(o.kcal);
  const k = cfg().dayKcal || DEFAULT_SETTINGS.dayKcal;
  return num(k[dow(date)]) || 2100;
}
const carbFor = kcal => { const s = cfg(); return Math.max(0, Math.round((kcal - s.protein * 4 - s.fat * 9) / 4)); };

function dayInfo(date) {
  const s = cfg();
  const entries = DB.log.filter(e => e.date === date);
  const foods = entries.filter(isFoodEntry);
  const burns = entries.filter(e => e.type === 'burn');
  const o = overrideFor(date);
  const common = {
    date, entries, foods, burns,
    proteinT: s.protein, fatT: s.fat,
    intake: { kcal: sum(foods, 'kcal'), protein: sum(foods, 'protein'), fat: sum(foods, 'fat'), carb: sum(foods, 'carb') },
    logged: foods.length > 0,
    label: o ? (o.label || '特殊目标') : ''
  };
  if (!formulaOn(date)) {   // 旧方式：每周固定的 7 个数 + 额外消耗
    const burn = sum(burns, 'kcal');
    const base = baseTarget(date);
    return Object.assign(common, { mode: 'plan', burn, base, target: base + burn, carbT: carbFor(base) + Math.round(burn / 4), tdee: num(s.tdee) + burn });
  }
  const st = stepsFor(date);
  const strength = entries.some(e => e.type === 'strength');
  const future = date > today();
  const rest = Math.round(num(s.bmr) * pf(s.restFactor));
  const stepsK = Math.round(st.n * pf(s.stepKcal) / 1000);
  const strengthK = strength ? num(s.strengthKcal) : future ? Math.round(strengthRate() * num(s.strengthKcal)) : 0;
  const cardioK = sum(burns, e => cardioCounted(e, s));
  const E = rest + stepsK + strengthK + cardioK;
  const raw = E - deficitOf(s);
  const target = o ? num(o.kcal) + cardioK : Math.max(num(s.bmr), raw);
  return Object.assign(common, {
    mode: 'formula', burn: cardioK, base: target - cardioK, target, carbT: carbFor(target), tdee: E,
    parts: { rest, steps: st, stepsK, strength, strengthK, cardioK, E, raw, floorHit: !o && raw < num(s.bmr), future, deficit: deficitOf(s) }
  });
}
function weekStartOf(date) {
  const ws = num(cfg().weekStart) || 0;
  const back = (dow(date) - ws + 7) % 7;
  return addDays(date, -back);
}

function weekSummary(start) {
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => dayInfo(addDays(start, i)));
  const done = days.filter(d => d.date < t && d.logged);
  const todayD = days.find(d => d.date === t);
  const actualDef = sum(done, d => d.tdee - d.intake.kcal);
  const planDef = sum(done, d => d.tdee - d.target);
  const weekTarget = sum(days, 'target');
  const missed = days.filter(d => d.date < t && !d.logged);
  const logged = days.filter(d => d.logged);
  const weights = DB.body.filter(b => b.weight && b.date >= start && b.date <= addDays(start, 6));
  // 本周剩余预算（只分给今天之后的天）：
  // 之前的天按实际摄入，没记录的按目标；今天按「已吃」和「目标」中较大的算。
  // 所以一天之内早上、晚上打开，之后几天的数字都不变；只有今天吃超了，超出的部分才摊到之后几天。
  const future = days.filter(d => d.date > t);
  const pastUsed = sum(days.filter(d => d.date < t), d => d.logged ? d.intake.kcal : d.target);
  const todayUsed = todayD ? Math.max(todayD.intake.kcal, todayD.target) : 0;
  const futureBudget = weekTarget - pastUsed - todayUsed;
  const futurePlan = sum(future, 'target');
  return {
    start, days, done, todayD, actualDef, planDef, weekTarget, missed, logged, future,
    avgIntake: logged.length ? sum(logged, d => d.intake.kcal) / logged.length : 0,
    avgProtein: logged.length ? sum(logged, d => d.intake.protein) / logged.length : 0,
    avgWeight: weights.length ? sum(weights, 'weight') / weights.length : null,
    futurePerDay: future.length ? futureBudget / future.length : 0,
    futureDiff: future.length ? (futureBudget - futurePlan) / future.length : 0,   // 和计划相比，每天多/少
    lastDayLeft: todayD ? weekTarget - pastUsed - todayD.intake.kcal : 0,          // 本周最后一天：按周预算今天还能吃多少
    isCurrent: start <= t && t <= addDays(start, 6)
  };
}

// 体重相关
function weightsSorted() { return DB.body.filter(b => b.weight).sort((a, b) => a.date < b.date ? -1 : 1); }
function avg7(date, ws) {
  ws = ws || weightsSorted();
  const from = addDays(date, -6);
  const w = ws.filter(b => b.date >= from && b.date <= date);
  return w.length ? sum(w, 'weight') / w.length : null;
}
function trendPerWeek(days) {   // 近 N 天体重线性趋势，kg/周
  const end = today(), start = addDays(end, -(days || 14));
  const ws = weightsSorted().filter(b => b.date >= start && b.date <= end);
  if (ws.length < 4 || diffDays(ws[0].date, ws[ws.length - 1].date) < 7) return null;
  const lr = linreg(ws.map(b => ({ x: diffDays(start, b.date), y: b.weight })));
  return lr ? lr.slope * 7 : null;
}
function planAt(date, key) {   // key: 'Weight' | 'Bf'
  const s = cfg();
  const a = s.planStart, b = s.planEnd;
  const va = num(s['planStart' + key]), vb = num(s['planEnd' + key]);
  if (!a || !b || !va || !vb || b <= a) return null;
  const span = diffDays(a, b);
  const t = Math.min(Math.max(diffDays(a, date), 0), span);
  return va + (vb - va) * t / span;
}
function latestBody(field) {
  const rows = DB.body.filter(b => b[field] !== null && b[field] !== undefined && b[field] !== '').sort((a, b) => a.date < b.date ? 1 : -1);
  return rows[0] || null;
}
function weightNear(date, ws) {
  ws = ws || weightsSorted();
  let best = null;
  ws.forEach(b => { const d = Math.abs(diffDays(b.date, date)); if (d <= 3 && (!best || d < best.d)) best = { d, w: b.weight }; });
  return best ? best.w : null;
}

// 用实际饮食和体重变化反推维持热量
function estimateTDEE() {
  const end = addDays(today(), -1), start = addDays(end, -27);
  const days = [];
  for (let d = start; d <= end; d = addDays(d, 1)) { const i = dayInfo(d); if (i.logged) days.push(i); }
  if (days.length < 14) return { ok: false, msg: `记录 ${days.length}/14 天` };
  const ws = weightsSorted().filter(b => b.date >= start && b.date <= end);
  if (ws.length < 6 || diffDays(ws[0].date, ws[ws.length - 1].date) < 14) return { ok: false, msg: '体重不足 2 周' };
  const lr = linreg(ws.map(b => ({ x: diffDays(start, b.date), y: b.weight })));
  if (!lr) return { ok: false, msg: '体重不足' };
  const avgIn = sum(days, d => d.intake.kcal) / days.length;
  const avgBurn = sum(days, 'burn') / days.length;
  const est = avgIn - avgBurn - lr.slope * 7700;
  // 公式模式的日子：公式算出的平均消耗（不含有氧），用来对比公式是偏保守还是偏高
  const fd = days.filter(d => d.mode === 'formula');
  const model = fd.length >= 7 ? sum(fd, d => d.tdee - d.burn) / fd.length : null;
  return { ok: true, est: Math.round(est / 10) * 10, days: days.length, n: ws.length, perWeek: lr.slope * 7, avgIn, model: model === null ? null : Math.round(model / 10) * 10, modelDays: fd.length };
}

function ensureFormula() {   // 第一次用新版本：从今天开始按新公式算（之前的日子不变）
  if (!cfg().formulaFrom) setSetting('formulaFrom', today());
}
