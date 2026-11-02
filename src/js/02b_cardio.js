// ════════════════════════════════════════════
// 有氧：计入多少（标准做法）
//   计入 = 这段运动的总消耗 − 这段时间本来就有的消耗（基础代谢 × 日常系数）− 步数里已经算过的部分
//   总消耗按手上最可靠的数据算（从上往下）：
//     ① 屏幕上的平均 MET × 体重 × 小时（Compendium 的定义：1 MET ≈ 1 kcal/kg/h）
//     ② 跑步机的速度、坡度 / 跑步的距离 → ACSM 代谢公式（每升氧约 5 kcal）
//        走：VO2 = 0.1·S + 1.8·S·G + 3.5　跑：VO2 = 0.2·S + 0.9·S·G + 3.5（ml/kg/min，S 米/分，G 坡度）
//     ③ 手表 / 器械显示的 kcal × 90%（这类数字普遍偏高；「活动消耗」不含基础代谢，先加回来）
//     ④ 都没有：2024 Adult Compendium 的 MET（拳击课按强度选；AI 也可以按心率等估一个）
//   体重用近 7 天平均（没有就用最近一次称重）。没填时长时只能按种类的比例（设置里可改）。
//   每条记录把算的过程存在 detail 里：以后改设置、体重变了，旧记录不变。
// ════════════════════════════════════════════
const WATCH_ACC = 0.9;
const CARDIO_KINDS = [
  { k: 'ell', name: '椭圆机', key: 'cardioEll', def: 0.2, why: '椭圆机的步数也算进了步数消耗', f: ['kcal', 'met', 'steps'] },
  { k: 'tread', name: '跑步机', f: ['speed', 'grade', 'gait', 'kcal', 'steps'] },
  { k: 'run', name: '跑步', key: 'cardioRun', def: 0.5, why: '跑步的步数也算进了步数消耗', f: ['dist', 'kcal', 'steps'] },
  { k: 'box', name: '拳击', title: '拳击课', f: ['lvl', 'kcal', 'steps'] },
  { k: 'other', name: '其他', key: 'cardioFactor', def: 0.7, why: '手表的数字含基础代谢，而且偏高', f: ['name', 'kcal', 'met', 'steps'] }
];
// 拳击课强度（2024 Adult Compendium of Physical Activities）
const BOX_LV = [
  { met: 5.8, name: '轻松', d: '沙袋、技术练习', code: '15110' },
  { met: 7.8, name: '普通', d: '手靶、对练', code: '15120' },
  { met: 9.3, name: '高强度', d: '连续模拟回合', code: '15125' }
];
const cardioDef = k => CARDIO_KINDS.find(x => x.k === k) || CARDIO_KINDS[CARDIO_KINDS.length - 1];
const cardioKindPct = (k, s) => { const c = cardioDef(k); s = s || cfg(); return c.key ? Math.round(pf(s[c.key] != null ? s[c.key] : c.def) * 100) : 0; };

// 每条记录算的过程（JSON 字符串，存在表格的 detail 列）
const CD_CACHE = new Map();
function cardioDetail(e) {
  const v = e && e.detail;
  if (!v) return null;
  if (typeof v === 'object') return v;
  if (CD_CACHE.has(v)) return CD_CACHE.get(v);
  let d = null;
  try { d = JSON.parse(v); } catch (err) { d = null; }
  if (!d || typeof d !== 'object' || !d.k) d = null;
  CD_CACHE.set(v, d);
  return d;
}
const cardioKind = e => {
  const d = cardioDetail(e);
  if (d && CARDIO_KINDS.some(c => c.k === d.k)) return d.k;
  const n = e && e.name || '';
  return /椭圆|elliptical|クロストレーナー/i.test(n) ? 'ell' : /跑步机|treadmill|トレッドミル/i.test(n) ? 'tread' : /跑|run|ラン/i.test(n) ? 'run' : 'other';
};
const burnMins = e => { const d = cardioDetail(e); if (d && d.min > 0) return d.min; const m = /([\d.]+)\s*分钟/.exec(e && e.note || ''); return m ? +m[1] : 0; };
// 每条记录存了自己的比例（以后改设置不影响旧记录）；没存的按种类的默认值。按时长算的记录比例可能是 0
const cardioPct = (e, s) => { const r = parseFloat(e.ratio) || 0; return r > 0 || burnMins(e) ? r : cardioKindPct(cardioKind(e), s); };
function cardioCounted(e, s) {
  const d = cardioDetail(e);
  if (d && isFinite(d.cnt)) return Math.max(0, Math.round(d.cnt));
  return Math.round(num(e.kcal) * cardioPct(e, s) / 100);
}

// 体重：这天为止近 7 天的平均；没有就用这天之前最近一次称重；再没有用计划的开始体重
function bodyKg(date) {
  const ws = weightsSorted().filter(b => b.date <= date);
  const from = addDays(date, -6), w7 = ws.filter(b => b.date >= from);
  if (w7.length) return { kg: Math.round(sum(w7, 'weight') / w7.length * 10) / 10, src: '7d', n: w7.length };
  const last = ws[ws.length - 1];
  if (last) return { kg: r1(last.weight), src: 'last', date: last.date };
  return { kg: num(cfg().planStartWeight) || 75, src: 'plan' };
}
const bodyKgText = b => b.src === '7d' ? `近 7 天平均（${b.n} 次）` : b.src === 'last' ? `${md(b.date)} 的体重` : '计划开始体重（还没记体重）';

// 走 / 跑：没选时按速度（7 km/h 以上按跑）
const treadGait = d => d.gait === 'run' || d.gait === 'walk' ? d.gait : num(d.sp) >= 7 ? 'run' : 'walk';
function acsmVO2(kmh, gradePct, gait) {
  const S = kmh * 1000 / 60, G = (parseFloat(gradePct) || 0) / 100;
  return gait === 'run' ? 0.2 * S + 0.9 * S * G + 3.5 : 0.1 * S + 1.8 * S * G + 3.5;
}
const clampN = (v, a, b) => Math.min(b, Math.max(a, v));
// 没填手表步数时估的步频（步/分）：椭圆机按设置；走路约 70 + 8×速度；跑步约 140 + 2.5×速度；拳击 / 其他按 0
function cardioCadence(d, s) {
  s = s || cfg();
  if (d.k === 'ell') return num(s.ellCadence) || 106;
  const runCad = v => Math.round(clampN(140 + 2.5 * v, 150, 185));
  if (d.k === 'tread') { const v = num(d.sp); return treadGait(d) === 'run' ? runCad(v || 9) : Math.round(clampN(70 + 8 * (v || 5), 95, 130)); }
  if (d.k === 'run') { const v = num(d.dist) && num(d.min) ? num(d.dist) / (num(d.min) / 60) : 0; return runCad(v || 9.6); }
  return 0;
}
const hasVal = v => v !== '' && v !== null && v !== undefined && isFinite(parseFloat(v));

/**
 * d：{ k 种类, min 分钟, kcal 手表/器械 kcal, kt 'total'|'active', met, mf 'screen'|'estimate'（MET 从哪来）,
 *      sp 速度 km/h, gr 坡度 %, gait, dist 距离 km, st 手表记到的步数（空 = 按步频估）, pct 没时长时的比例 }
 * 返回 { src: 'met'|'acsm'|'device'|'ratio'|'none', gross 总消耗, rest, stN, stEst, stK, cnt 计入, base 存进 kcal 列的数, pct, kg… }
 */
function cardioCalc(d, s, date) {
  s = s || cfg();
  const min = num(d.min), kcal = num(d.kcal), met = num(d.met);
  const o = { k: d.k, min, kcal, src: 'none', gross: 0, met: 0, rest: 0, stN: 0, stEst: false, stK: 0, cnt: 0, base: kcal, pct: 0, kg: 0, kgSrc: null };
  if (!(min > 0)) {
    if (!cardioDef(d.k).key || !kcal) return o;
    o.src = 'ratio';
    o.pct = d.pct != null ? d.pct : cardioKindPct(d.k, s);
    o.cnt = Math.round(kcal * o.pct / 100);
    return o;
  }
  const b = bodyKg(date || VIEW.date), kg = b.kg, h = min / 60;
  const useMet = m => { o.src = 'met'; o.met = m; o.kg = kg; o.kgSrc = b; o.gross = m * kg * h; };
  if (met > 0 && d.mf !== 'estimate' && d.k !== 'box') useMet(met);                          // ① 屏幕上的 MET
  else if (d.k === 'tread' && num(d.sp) > 0 || d.k === 'run' && num(d.dist) > 0) {              // ② ACSM
    const tr = d.k === 'tread', sp = tr ? num(d.sp) : num(d.dist) / h, gait = tr ? treadGait(d) : 'run';
    const vo2 = acsmVO2(sp, tr ? d.gr : 0, gait);
    Object.assign(o, { src: 'acsm', sp: r1(sp), gr: tr ? parseFloat(d.gr) || 0 : 0, gait, met: r1(vo2 / 3.5), kg, kgSrc: b, gross: vo2 * kg * min * 5 / 1000 });
  } else if (kcal > 0) {                                                                       // ③ 手表 / 器械（拳击课戴了手表也按手表）
    o.src = 'device'; o.kt = d.kt === 'active' ? 'active' : 'total';
    o.bmrAdd = o.kt === 'active' ? pf(s.bmr) / 1440 * min : 0;
    o.gross = kcal * WATCH_ACC + o.bmrAdd;
  } else if (met > 0) useMet(met);                                                               // ④ Compendium / AI 估的 MET
  if (o.src === 'none') return o;
  o.rest = pf(s.bmr) * pf(s.restFactor) / 1440 * min;
  o.stEst = !hasVal(d.st);
  o.cad = cardioCadence(d, s);
  o.stN = o.stEst ? Math.round(min * o.cad) : Math.max(0, Math.round(parseFloat(d.st)));
  o.stK = o.stN * pf(s.stepKcal) / 1000;
  o.cnt = Math.max(0, Math.round(o.gross - o.rest - o.stK));
  o.base = kcal > 0 ? kcal : Math.round(o.gross);
  o.pct = o.base ? Math.round(o.cnt / o.base * 10000) / 100 : 0;
  return o;
}
// 兼容旧的椭圆机算法（测试和旧代码用）
function ellCalc(kcal, min, s) {
  const r = cardioCalc({ k: 'ell', kcal, min }, s);
  return { rest: Math.round(r.rest), steps: Math.round(r.stK), stepsN: r.stN, counted: r.cnt, pct: Math.round(r.pct * 10) / 10 };
}

// 记录里的说明（以「N 分钟」开头，旧版本也能读出时长）
function cardioNote(d, r) {
  if (!(r.min > 0)) return '';
  const p = [`${fmt1(r.min)} 分钟`];
  if (d.k === 'tread' && r.src === 'acsm') p.push(`${fmt1(r.sp)} km/h`, `坡度 ${fmt1(r.gr)}%`, r.gait === 'run' ? '跑' : '走');
  else if (d.k === 'run' && r.src === 'acsm') p.push(`${fmt1(num(d.dist))} km`, `配速 ${pace(r.sp)}`);
  else if (r.src === 'met') {
    const lv = d.k === 'box' && BOX_LV.find(x => x.met === r.met);
    p.push(lv ? `${lv.name}强度` : `MET ${fmt1(r.met)}${d.mf === 'estimate' ? '（估）' : ''}`);
  } else if (r.src === 'device') p.push(`${d.k === 'ell' || d.k === 'tread' ? '机器' : '手表'} ${fmt(r.kcal)}${r.kt === 'active' ? '（活动）' : ''}`);
  if (!r.stEst && r.stN > 0) p.push(`${fmt(r.stN)} 步`);
  return p.join(' · ');
}
const fmt1 = v => { const x = Math.round(v * 10) / 10; return Number.isInteger(x) ? String(x) : x.toFixed(1); };
const pace = kmh => { if (!(kmh > 0)) return '—'; const s = Math.round(3600 / kmh); return `${Math.floor(s / 60)}:${pad2(s % 60)}`; };

// 存进表格的一行（kcal = 手表 / 器械的数，没有就是估的总消耗；ratio = 计入占 kcal 的 %）
function cardioRow(d, r, extra) {
  const det = { v: 1, k: d.k, min: r.min, kcal: r.kcal, src: r.src, gross: Math.round(r.gross), rest: Math.round(r.rest),
    stN: r.stN, stEst: r.stEst, stK: Math.round(r.stK), cnt: r.cnt };
  if (r.src === 'device') det.kt = r.kt;
  if (r.met) det.met = r.met;
  if (d.mf) det.mf = d.mf;
  if (r.kg) det.kg = r.kg;
  if (d.k === 'tread') Object.assign(det, { sp: num(d.sp), gr: parseFloat(d.gr) || 0, gait: d.gait || '' });
  if (d.k === 'run' && num(d.dist)) det.dist = num(d.dist);
  if (hasVal(d.st)) det.st = Math.round(parseFloat(d.st));
  if (r.src === 'ratio') det.pct = r.pct;
  Object.assign(det, extra || {});
  return { kcal: r.base, ratio: r.pct, note: cardioNote(d, r), detail: r.src === 'ratio' ? '' : JSON.stringify(det) };
}
// 记录 → 表单的数据
function cardioFormData(e) {
  const d = cardioDetail(e), k = cardioKind(e);
  if (!d) return { k, min: burnMins(e) || '', kcal: num(e.kcal) || '', pct: cardioPct(e) };
  return { k, min: d.min || '', kcal: d.kcal || '', kt: d.kt || 'total', met: d.met || '', mf: d.mf || '', sp: d.sp || '', gr: hasVal(d.gr) ? d.gr : '',
    gait: d.gait || '', dist: d.dist || '', st: hasVal(d.st) ? d.st : '', ai: d.ai || '' };
}
// 列表里的一行说明
function cardioSub(e) {
  if (cardioDetail(e) && e.note) return e.note;
  return burnMins(e) ? `${fmt(burnMins(e))} 分钟 · 手表 ${fmt(e.kcal)}` : `手表 ${fmt(e.kcal)} × ${cardioPct(e)}%`;
}

// 给 AI 的「最新状态」：近 7 天体重、体脂、趋势、代谢参数、平时步数
function cardioState(date) {
  const s = cfg(), b = bodyKg(date), bf = latestBody('bodyfat'), lw = latestBody('weight'), st = stepsFor(date);
  const tr = trendPerWeek(14);
  return {
    date, kg: b.kg, kgSrc: b.src, kgN: b.n || 0,
    lastKg: lw ? r1(lw.weight) : 0, lastKgDate: lw ? lw.date : '',
    bf: bf ? r1(bf.bodyfat) : 0, bfDate: bf ? bf.date : '',
    trend: tr === null ? null : Math.round(tr * 100) / 100,
    bmr: num(s.bmr), restFactor: pf(s.restFactor), stepKcal: num(s.stepKcal), ellCadence: num(s.ellCadence) || 106,
    usualSteps: st.usual
  };
}
