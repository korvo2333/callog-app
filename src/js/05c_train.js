// ════════════════════════════════════════════
// 训练页：按周几推荐计划 → 选动作和器材（自动填上次的数据）→ 每组打 ✓ → 完成写进表格
// 进行中的训练存在本机（LOCAL.workout），关掉 App 再打开也能接着练；只有打了 ✓ 的组会写进「训练记录」
// ════════════════════════════════════════════
const TRAIN = { day: null, libQ: '', libG: '全部', pick: null, tick: 0, pickG: '全部', pickQ: '' };
const snum = v => { const n = parseFloat(v); return isFinite(n) ? r1(n) : 0; };   // 可以是负数（辅助引体的助力）
const todayWeek = () => WEEK_NAMES[new Date().getDay()];
const exByName = n => DB.exercises.find(e => e.name === n);
const exEq = ex => splitList(ex && ex.equip);
const exLabel = (name, equip) => { const sh = EQ_SHORT[equip] || ''; return !sh || String(name).startsWith(sh) ? name : sh + name; };
const planOf = day => DB.plan.filter(r => r.day === day).sort((a, b) => num(a.ord) - num(b.ord));
function dayType(day) {
  const rows = planOf(day);
  if (!rows.length) return '休息';
  return rows.some(r => !DAY_TYPES.includes(r.item)) ? '力量' : rows[0].item;
}
const slotPicks = () => { const v = DB.settings.trainSlot; return v && typeof v === 'object' ? v : {}; };
const sortedEx = () => DB.exercises.slice().sort((a, b) => num(a.sort) - num(b.sort) || a.name.localeCompare(b.name, 'zh'));

// 某个部位能选的动作：主练是它的在前，顺带练到的在后
function candidates(part) {
  const all = sortedEx();
  return all.filter(e => e.main === part).map(e => ({ ex: e, sec: false }))
    .concat(all.filter(e => e.main !== part && splitList(e.sub).includes(part)).map(e => ({ ex: e, sec: true })));
}
function defaultFor(part, used) {
  for (const s of PART_DEFAULT[part] || []) {
    const [n, eq] = s.split('|'), ex = exByName(n);
    if (ex && !used[ex.name]) return { ex, equip: exEq(ex).includes(eq) ? eq : exEq(ex)[0] };
  }
  const c = candidates(part).find(x => !used[x.ex.name]) || candidates(part)[0];
  return c ? { ex: c.ex, equip: exEq(c.ex)[0] } : { ex: null, equip: '' };
}
// 计划里的一天 → 每一行选好的动作和器材（固定动作只选器材；部位默认上次在这个位置做的）
function resolveSlots(day) {
  const rows = planOf(day).filter(r => !DAY_TYPES.includes(r.item)), picks = slotPicks(), used = {};
  const out = rows.map(r => {
    const fixed = exByName(r.item), part = fixed ? null : partOf(r.item), pk = picks[r.id];
    let ex = null, equip = '';
    if (fixed) {
      ex = fixed;
      const eqs = exEq(fixed);
      equip = pk && pk.ex === fixed.name && eqs.includes(pk.equip) ? pk.equip : eqs.includes(r.equip) ? r.equip : eqs[0];
    } else if (part && pk && exByName(pk.ex)) {
      ex = exByName(pk.ex); equip = exEq(ex).includes(pk.equip) ? pk.equip : exEq(ex)[0];
    }
    if (ex) used[ex.name] = 1;
    return { row: r, fixed: !!fixed, part, label: r.item, ex, equip, ss: r.ss };
  });
  out.forEach(s => { if (!s.ex && s.part) { const d = defaultFor(s.part, used); s.ex = d.ex; s.equip = d.equip; if (d.ex) used[d.ex.name] = 1; } });
  return out;
}

// 上次同一动作 + 同一器材的那次训练
function lastSets(name, equip, exceptWid) {
  let best = null;
  for (const s of DB.sets) {
    if (s.ex !== name || s.equip !== equip || (exceptWid && s.wid === exceptWid)) continue;
    if (!best || s.date > best.date || (s.date === best.date && s.wid > best.wid)) best = s;
  }
  if (!best) return null;
  return { date: best.date, sets: DB.sets.filter(s => s.wid === best.wid && s.ex === name && s.equip === equip).sort((a, b) => num(a.set) - num(b.set)) };
}
function setText(s, mode) {
  if (mode === '计时') return `${fmt(s.reps)}秒`;
  const kg = snum(s.kg);
  if (mode === '自重') return `${kg > 0 ? '+' + kg : kg < 0 ? kg : '自重'}×${fmt(s.reps)}`;
  return `${kg}×${fmt(s.reps)}`;
}
function lastLine(name, equip) {
  const l = lastSets(name, equip), ex = exByName(name), mode = ex ? ex.mode : '重量';
  if (!l) return '第一次做';
  return `上次 ${l.date.slice(5).replace('-', '/')}：` + l.sets.map(s => (s.kind === '热身' ? '热 ' : s.kind === '递减' ? '递 ' : '') + setText(s, mode)).join(' · ');
}

// 最近 7 天的平均体重（没有就用最近一次，再没有用计划起始体重）
function bw7(d) {
  d = d || today();
  const from = addDays(d, -6), ws = DB.body.filter(b => num(b.weight) && b.date >= from && b.date <= d);
  if (ws.length) return sum(ws, b => num(b.weight)) / ws.length;
  const last = DB.body.filter(b => num(b.weight) && b.date <= d).sort((a, b) => a.date < b.date ? 1 : -1)[0];
  return last ? num(last.weight) : num(cfg().planStartWeight) || 70;
}
// 容量：重量 × 次数；哑铃填单只（×2，单臂动作除外）；自重 = (7 天平均体重 + 附加) × 次；热身和计时不算
function setVolume(ex, equip, s, d) {
  if (s.kind === '热身') return 0;
  const mode = ex ? ex.mode : '重量';
  if (mode === '计时') return 0;
  if (mode === '自重') return Math.max(0, Math.round((bw7(d) + snum(s.kg)) * num(s.reps)));
  const k = snum(s.kg) * (equip === '哑铃' && !/单臂|单手/.test(ex ? ex.name : '') ? 2 : 1);
  return Math.max(0, Math.round(k * num(s.reps)));
}
const strengthKcalFor = (mins, d) => Math.round(bw7(d) * mins / 60 * 2.5);   // 力量训练约 3.5 MET，扣掉已经算进基础消耗的 1 MET

// 第一次打开：放入预置的动作库和计划（id 固定，多台设备同时放也不会重复）
function ensureTrainSeed() {
  if (DB.settings.trainSeed) return;
  if (!DB.exercises.length) exSeedRows().forEach(r => upsertRow('exercises', r));
  if (!DB.plan.length) planSeedRows().forEach(r => upsertRow('plan', r));
  setSetting('trainSeed', 1);
}

// ════════ 页面 ════════
function renderTrain() {
  const el = $('#tr-content');
  if (!el) return;
  if (!DB.exercises.length && !DB.settings.trainSeed) ensureTrainSeed();
  el.innerHTML = LOCAL.workout ? workoutHTML() : trainHomeHTML();
  $('#tr-hd-act').innerHTML = LOCAL.workout ? '' : `<button class="hd-btn" onclick="editExercise('')" style="color:var(--accent-text);font-weight:700">＋ 动作</button>`;
  updateTrainBar();
}
function dayBrief(d) {
  const t = dayType(d);
  if (t !== '力量') return t;
  const f = planOf(d).map(r => exByName(r.item)).find(Boolean);
  return f ? f.name.slice(0, 2) : '力量';
}
function trainHomeHTML() {
  const td = todayWeek(), day = TRAIN.day || td, type = dayType(day);
  let h = `<div class="tr-days">${WEEK_NAMES.map(d => `<button class="chip ${d === day ? 'on' : ''} ${d === td ? 'is-today' : ''}" onclick="trDay('${d}')"><b>${d.slice(1)}</b><small>${esc(dayBrief(d))}</small></button>`).join('')}</div>`;
  const title = (day === td ? '今天 · ' : '') + day;
  if (type === '力量') {
    const slots = resolveSlots(day);
    h += `<div class="card tr-plan"><div class="card-t">${title}<span>${slots.length} 个动作</span></div>
      ${slots.map((s, i) => `<button class="tr-slot" onclick="trPickSlot(${i})">
        <span class="exa tr-thumb">${s.ex ? exArt(s.ex, s.equip, true) : ''}</span>
        <span class="tr-slot-i"><b>${s.ex ? esc(exLabel(s.ex.name, s.equip)) : '选择动作'}</b>
          <small>${s.fixed ? '固定' : esc(s.label) + (s.part && s.part !== s.label ? ' · ' + esc(s.part) : '')}${s.ex ? ' · ' + esc(lastLine(s.ex.name, s.equip)) : ''}</small></span>
        ${s.ss ? `<span class="tr-ss">${esc(s.ss)}</span>` : ''}<i class="tr-chev" aria-hidden="true">›</i></button>`).join('')}
      <div class="actions"><button class="btn" style="flex:0 0 auto" onclick="openPlanDay('${day}')">改计划</button><button class="btn pri" onclick="startWorkout('${day}')">开始训练</button></div></div>`;
  } else {
    const isT = day === td, ic = type === '有氧' ? cardioIcon('ell') : type === '拳击' ? cardioIcon('other') : icon('today', 1.8);
    h += `<div class="card tr-off"><span class="act-ic">${ic}</span><div class="tr-off-i"><b>${isT ? '今天' : day}：${esc(type)}</b>
        <small>${type === '休息' ? '好好恢复' : isT ? '练完在这里记一下手表的数字' : '这天不练力量'}</small></div>
      ${isT && type !== '休息' ? `<button class="btn pri" onclick="trLogCardio('${type}')">记${esc(type)}</button>` : ''}
      <button class="btn" onclick="openPlanDay('${day}')">改计划</button></div>`;
  }
  h += fcard('tr:week', '一周计划', '', `<div class="tr-week">${WEEK_NAMES.map(d => `<button class="tr-wrow" onclick="openPlanDay('${d}')">
      <b>${d}</b><span>${planOf(d).length ? planOf(d).map(r => esc(r.item)).join(' · ') : '休息'}</span><i class="tr-chev" aria-hidden="true">›</i></button>`).join('')}</div>`);
  h += fcard('tr:lib', '动作库', `${DB.exercises.length} 个`, libHTML());
  return h;
}
function libHTML() {
  const q = TRAIN.libQ.trim(), g = TRAIN.libG;
  const list = sortedEx().filter(e => (g === '全部' || e.group === g) && (!q || e.name.includes(q) || e.main.includes(q) || e.equip.includes(q)));
  return `<input class="in" type="search" placeholder="搜索动作、部位、器材" value="${esc(q)}" oninput="TRAIN.libQ=this.value;$('#tr-lib').innerHTML=libListHTML()">
    <div class="chips scroll tr-groups">${['全部'].concat(PART_GROUPS.map(x => x[0])).map(x => `<button class="chip ${x === g ? 'on' : ''}" onclick="TRAIN.libG='${x}';renderTrain()">${x}</button>`).join('')}</div>
    <div id="tr-lib">${libListHTML(list)}</div>
    <button class="btn block" style="margin-top:12px" onclick="editExercise('')">＋ 新增动作</button>`;
}
function libListHTML(list) {
  if (!list) { const q = TRAIN.libQ.trim(), g = TRAIN.libG; list = sortedEx().filter(e => (g === '全部' || e.group === g) && (!q || e.name.includes(q) || e.main.includes(q) || e.equip.includes(q))); }
  if (!list.length) return '<div class="muted" style="padding:12px 0">没有找到</div>';
  return list.map(e => `<button class="tr-lrow" onclick="editExercise('${e.id}')"><span class="exa tr-thumb">${exArt(e, '', true)}</span>
    <span class="tr-slot-i"><b>${esc(e.name)}</b><small>${esc(e.main)}${e.sub ? ' · 顺带 ' + esc(e.sub) : ''}</small><small>${esc(e.equip)}${e.mode !== '重量' ? ' · ' + esc(e.mode) : ''}</small></span></button>`).join('');
}
function trDay(d) { TRAIN.day = d; renderTrain(); }
function trLogCardio(type) {
  VIEW.date = today();
  openBurn(null, type === '拳击' ? { k: 'other', name: '拳击' } : null);
}

// ════════ 选动作 / 器材（弹层两步：先动作、再器材） ════════
// mode：slot 计划里的位置 / add 训练中加动作 / swap 训练中换动作 / plan 往计划里加固定动作
function trPickSlot(i) {
  const day = TRAIN.day || todayWeek(), s = resolveSlots(day)[i];
  if (!s) return;
  openExPicker({ mode: 'slot', rowId: s.row.id, part: s.part, fixed: s.fixed ? s.ex.name : '', ex: s.ex ? s.ex.name : '', equip: s.equip, title: s.fixed ? s.ex.name : s.label });
}
function openExPicker(ctx) {
  TRAIN.pick = ctx; TRAIN.pickQ = '';
  if (ctx.fixed) pickerEquip(ctx.fixed); else pickerList();
}
function pickerItems() {
  const c = TRAIN.pick;
  if (c.part) return candidates(c.part);
  const q = TRAIN.pickQ.trim(), g = TRAIN.pickG;
  return sortedEx().filter(e => (g === '全部' || e.group === g) && (!q || e.name.includes(q) || e.main.includes(q))).map(e => ({ ex: e, sec: false }));
}
function pickerList() {
  const c = TRAIN.pick, items = pickerItems();
  TRAIN.pickList = items.map(x => x.ex.name);
  const head = c.part ? `<div class="muted" style="margin:-4px 0 10px">${esc(c.title || c.part)}${c.part !== c.title ? ' · ' + esc(c.part) : ''}：主练的在前，顺带练到的在后</div>`
    : `<input class="in" type="search" placeholder="搜索" value="${esc(TRAIN.pickQ)}" oninput="TRAIN.pickQ=this.value;$('#pk-grid').innerHTML=pickerGridHTML()">
       <div class="chips scroll tr-groups">${['全部'].concat(PART_GROUPS.map(x => x[0])).map(x => `<button class="chip ${x === TRAIN.pickG ? 'on' : ''}" onclick="TRAIN.pickG='${x}';pickerList()">${x}</button>`).join('')}</div>`;
  openSheet(c.title ? '选动作 · ' + c.title : '选动作', head + `<div class="tr-grid" id="pk-grid">${pickerGridHTML(items)}</div>`);
  $('#sheet-bg .sheet').classList.add('tall');
}
function pickerGridHTML(items) {
  items = items || pickerItems();
  TRAIN.pickList = items.map(x => x.ex.name);
  const still = items.length > 12;   // 一次列很多时只画静止的一帧，选中后的那一步再动
  if (!items.length) return '<div class="muted" style="padding:12px 0">动作库里还没有这个部位的动作，先在训练页的动作库里加一个</div>';
  return items.map((x, i) => `<button class="tr-card ${x.ex.name === TRAIN.pick.ex ? 'on' : ''}" onclick="pickerEquip(TRAIN.pickList[${i}])">
    <span class="exa">${exArt(x.ex, exEq(x.ex)[0], still)}</span><b>${esc(x.ex.name)}</b><small>${x.sec ? '顺带 · ' : ''}${esc(x.ex.main)}</small></button>`).join('');
}
function pickerEquip(name) {
  const c = TRAIN.pick, ex = exByName(name);
  if (!ex) return;
  const eqs = exEq(ex);
  if (c.ex !== name || !eqs.includes(c.equip)) {   // 换了动作：器材默认上次用这个动作时的那种
    const last = DB.sets.filter(s => s.ex === name).sort((a, b) => a.date < b.date ? 1 : -1)[0];
    c.equip = last && eqs.includes(last.equip) ? last.equip : eqs[0];
  }
  c.ex = name;
  openSheet(exLabel(name, c.equip), pickerEquipHTML());
  $('#sheet-bg .sheet').classList.add('tall');
}
function pickerEquipHTML() {
  const c = TRAIN.pick, ex = exByName(c.ex), eqs = exEq(ex);
  return `<div class="exa tr-big">${exArt(ex, c.equip)}</div>
    <div class="tr-pk-n"><b>${esc(c.ex)}</b><small>${esc(ex.main)}${ex.sub ? ' · 顺带 ' + esc(ex.sub) : ''}</small></div>
    <label class="lbl">器材</label>
    <div class="chips">${eqs.map(e => `<button class="chip ${e === c.equip ? 'on' : ''}" onclick="TRAIN.pick.equip='${e}';pickerEquip(TRAIN.pick.ex)">${e}</button>`).join('')}</div>
    <div class="preview tr-pk-last">${esc(lastLine(c.ex, c.equip))}</div>
    <div class="actions">${c.fixed ? '' : `<button class="btn" style="flex:0 0 auto" onclick="pickerList()">‹ 换动作</button>`}<button class="btn pri" onclick="pickerDone()">${c.mode === 'add' ? '加进这次训练' : c.mode === 'plan' ? '加进计划' : '确定'}</button></div>`;
}
function pickerDone() {
  const c = TRAIN.pick, W = LOCAL.workout;
  if (c.mode === 'slot') {
    setSetting('trainSlot', Object.assign({}, slotPicks(), { [c.rowId]: { ex: c.ex, equip: c.equip } }));
  } else if (c.mode === 'add' && W) {
    W.items.splice(W.cur + 1, 0, newItem(c.ex, c.equip, '', '', ''));
    W.cur += 1; saveLocal();
  } else if (c.mode === 'swap' && W) {
    const it = W.items[W.cur], fresh = !it.sets.some(s => s.done);
    it.ex = c.ex; it.equip = c.equip;
    if (fresh) it.sets = prefill(c.ex, c.equip);
    saveLocal();
  } else if (c.mode === 'plan') {
    const rows = planOf(c.day);
    upsertRow('plan', { id: uid('p_'), day: c.day, ord: rows.length ? num(rows[rows.length - 1].ord) + 1 : 1, item: c.ex, equip: c.equip, ss: '' });
    closeSheet(); renderTrain(); openPlanDay(c.day); return;
  }
  closeSheet(); renderTrain();
}

// ════════ 训练中 ════════
function newItem(name, equip, slot, part, ss) { return { id: uid('i'), ex: name, equip, slot: slot || '', part: part || '', ss: ss || '', sets: prefill(name, equip) }; }
// 固定先列 4 组，按上次同一动作 + 器材逐组填好；上次组数少的，后面几组照最后一组填
function prefill(name, equip) {
  const last = lastSets(name, equip), out = [];
  for (let i = 0; i < 4; i++) {
    const l = last ? last.sets[Math.min(i, last.sets.length - 1)] : null;
    out.push({ kg: l ? snum(l.kg) : '', reps: l ? num(l.reps) : '', kind: l && i < last.sets.length && l.kind ? l.kind : '正式', done: false });
  }
  return out;
}
function startWorkout(day) {
  const slots = resolveSlots(day).filter(s => s.ex);
  if (!slots.length) { toast('这天还没有动作'); return; }
  LOCAL.workout = { id: uid('w_'), day, start: Date.now(), cur: 0, items: slots.map(s => newItem(s.ex.name, s.equip, s.row.id, s.part, s.ss)) };
  saveLocal(); startTrainTick(); renderTrain();
  window.scrollTo(0, 0);
}
const wDone = W => sum(W.items, it => it.sets.filter(s => s.done).length);
const wTotal = W => sum(W.items, it => it.sets.length);
function fmtDur(ms) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = s % 60;
  return (h ? h + ':' + pad2(m) : m) + ':' + pad2(ss);
}
function workoutHTML() {
  const W = LOCAL.workout;
  if (W.cur >= W.items.length) W.cur = Math.max(0, W.items.length - 1);
  const it = W.items[W.cur];
  let h = `<div class="tr-top"><div class="tr-time num" id="tw-time">${fmtDur(Date.now() - W.start)}</div>
    <div class="tr-prog"><span>${esc(W.day)}</span><span><b class="num" id="tw-done">${wDone(W)}</b>/<span class="num">${wTotal(W)}</span> 组</span><span>动作 <b class="num">${W.items.length ? W.cur + 1 : 0}</b>/<span class="num">${W.items.length}</span></span></div>
    <button class="btn pri tr-fin" onclick="finishWorkout()">完成</button></div>`;
  if (!it) return h + `<div class="card"><div class="muted">还没有动作</div></div><button class="btn block tr-addex" onclick="trAddExercise()">＋ 加动作</button>`;
  const ex = exByName(it.ex) || { name: it.ex, equip: it.equip, mode: '重量', main: it.part };
  const mode = ex.mode || '重量';
  let n = 0;
  h += `<div class="card tr-ex" id="tw-card">
    <div class="tr-ex-h"><span class="tr-ex-n">${esc(exLabel(it.ex, it.equip))}</span>${it.ss ? `<span class="tr-ss">superset ${esc(it.ss)}</span>` : ''}</div>
    <div class="tr-ex-sub">${it.part ? esc(it.part) + ' · ' : ''}${esc(ex.main || '')}${ex.sub ? ' · 顺带 ' + esc(ex.sub) : ''}</div>
    <div class="exa tr-anim">${exArt(ex, it.equip)}</div>
    <div class="chips tr-eqs">${exEq(ex).map(e => `<button class="chip ${e === it.equip ? 'on' : ''}" onclick="trSetEquip('${e}')">${e}</button>`).join('')}</div>
    <div class="tr-last">${esc(lastLine(it.ex, it.equip))}</div>
    <div class="tr-sets">${it.sets.map((s, i) => {
      const lab = s.kind === '热身' ? '热' : s.kind === '递减' ? '递' : String(++n);
      return `<div class="tr-set ${s.done ? 'done' : ''}">
        <button class="tr-k ${s.kind === '正式' ? '' : 'alt'}" onclick="trKind(${i})" aria-label="${s.kind}（点一下切换 正式 / 热身 / 递减）">${lab}</button>
        <label class="tr-f"><small>${mode === '自重' ? '附加kg' : 'kg'}</small><input class="mi num" type="number" inputmode="decimal" step="0.5" value="${s.kg}" oninput="trVal(${i},'kg',this.value)"></label>
        <label class="tr-f"><small>${mode === '计时' ? '秒' : '次'}</small><input class="mi num" type="number" inputmode="numeric" value="${s.reps}" oninput="trVal(${i},'reps',this.value)"></label>
        <button class="tr-ok" onclick="trDone(${i})" aria-pressed="${s.done}" aria-label="完成这一组">✓</button>
        <button class="tr-x" onclick="trDelSet(${i})" aria-label="删除这一组">×</button></div>`;
    }).join('')}</div>
    <button class="link tr-add" onclick="trAddSet()">＋ 加一组</button>
    <div class="tr-acts">
      <button class="chip" onclick="trSwap()">换动作</button>
      <button class="chip" onclick="trMove(-1)" ${W.cur === 0 ? 'disabled' : ''}>前移</button>
      <button class="chip" onclick="trMove(1)" ${W.cur >= W.items.length - 1 ? 'disabled' : ''}>后移</button>
      <button class="chip" onclick="trSuperset()" ${!it.ss && W.cur >= W.items.length - 1 ? 'disabled' : ''}>${it.ss ? '取消 superset' : '和下一个配 superset'}</button>
      <button class="chip danger" onclick="trRemoveItem()">删除动作</button>
    </div></div>
    <div class="tr-nav"><button class="hd-btn" onclick="trGo(-1)" ${W.cur === 0 ? 'disabled' : ''} aria-label="上一个动作">‹</button>
      <div class="tr-dots">${W.items.map((x, i) => `<button class="tr-dot ${i === W.cur ? 'on' : ''} ${x.sets.length && x.sets.every(s => s.done) ? 'ok' : x.sets.some(s => s.done) ? 'part' : ''}" onclick="trGoto(${i})" aria-label="${esc(x.ex)}"></button>`).join('')}</div>
      <button class="hd-btn" onclick="trGo(1)" ${W.cur >= W.items.length - 1 ? 'disabled' : ''} aria-label="下一个动作">›</button></div>
    <button class="btn block tr-addex" onclick="trAddExercise()">＋ 加动作</button>
    <button class="link tr-quit" onclick="discardWorkout()">放弃这次训练</button>`;
  return h;
}
const curItem = () => LOCAL.workout && LOCAL.workout.items[LOCAL.workout.cur];
function trVal(i, k, v) {   // 输入时只改数据，不重画（不打断输入）
  const it = curItem();
  if (!it || !it.sets[i]) return;
  it.sets[i][k] = v === '' ? '' : k === 'kg' ? snum(v) : num(v);
  clearTimeout(TRAIN.saveT); TRAIN.saveT = setTimeout(saveLocal, 300);
}
function trDone(i) {
  const W = LOCAL.workout, it = curItem(), s = it && it.sets[i];
  if (!s) return;
  if (!s.done && !num(s.reps)) { toast(ex_mode(it) === '计时' ? '先填秒数' : '先填次数'); return; }
  s.done = !s.done;
  saveLocal();
  if (s.done && it.ss) {   // superset：跳到配对的那个动作，做同一组
    const j = W.items.findIndex((x, k) => k !== W.cur && x.ss === it.ss && x.sets.some(y => !y.done));
    if (j >= 0) { W.cur = j; saveLocal(); renderTrain(); return; }
  }
  renderTrain();
}
const ex_mode = it => { const e = exByName(it.ex); return e ? e.mode : '重量'; };
function trKind(i) {
  const s = curItem().sets[i], order = ['正式', '热身', '递减'];
  s.kind = order[(order.indexOf(s.kind) + 1) % order.length];
  saveLocal(); renderTrain();
}
function trAddSet() {
  const it = curItem(), l = it.sets[it.sets.length - 1];
  it.sets.push({ kg: l ? l.kg : '', reps: l ? l.reps : '', kind: '正式', done: false });
  saveLocal(); renderTrain();
}
function trDelSet(i) { const it = curItem(); it.sets.splice(i, 1); saveLocal(); renderTrain(); }
function trSetEquip(e) {
  const it = curItem();
  if (it.equip === e) return;
  it.equip = e;
  if (!it.sets.some(s => s.done)) it.sets = prefill(it.ex, e);   // 还没开始做：按这种器材上次的数据重填
  saveLocal(); renderTrain();
}
function trGo(d) { trGoto(LOCAL.workout.cur + d); }
function trGoto(i) {
  const W = LOCAL.workout;
  if (!W || i < 0 || i >= W.items.length || i === W.cur) return;
  const dir = i > W.cur ? 1 : -1;
  W.cur = i; saveLocal(); renderTrain();
  const c = $('#tw-card');
  if (c && !REDUCED()) { c.classList.remove('slide-f', 'slide-b'); void c.offsetWidth; c.classList.add(dir > 0 ? 'slide-f' : 'slide-b'); }
}
function trMove(d) {
  const W = LOCAL.workout, j = W.cur + d;
  if (j < 0 || j >= W.items.length) return;
  [W.items[W.cur], W.items[j]] = [W.items[j], W.items[W.cur]];
  W.cur = j; saveLocal(); renderTrain();
}
function trSuperset() {
  const W = LOCAL.workout, it = curItem();
  if (it.ss) { const l = it.ss; W.items.forEach(x => { if (x.ss === l) x.ss = ''; }); }
  else {
    const nx = W.items[W.cur + 1];
    if (!nx) return;
    const used = new Set(W.items.map(x => x.ss).filter(Boolean));
    const l = 'ABCDEFGH'.split('').find(c => !used.has(c)) || 'A';
    it.ss = l; nx.ss = l;
  }
  saveLocal(); renderTrain();
}
async function trRemoveItem() {
  const W = LOCAL.workout, it = curItem();
  if (it.sets.some(s => s.done) && !(await ask(`删除「${it.ex}」？已经打勾的组也会一起删掉`, { danger: true, ok: '删除' }))) return;
  W.items.splice(W.cur, 1);
  if (W.cur >= W.items.length) W.cur = Math.max(0, W.items.length - 1);
  saveLocal(); renderTrain();
}
function trSwap() { const it = curItem(); openExPicker({ mode: 'swap', part: it.part || '', ex: it.ex, equip: it.equip, title: it.part || '' }); }
function trAddExercise() { TRAIN.pickG = '全部'; openExPicker({ mode: 'add', part: '', ex: '', equip: '', title: '' }); }

function finishWorkout() {
  const W = LOCAL.workout, done = wDone(W);
  if (!done) {
    openSheet('还没有打勾的组', `<div class="muted">只有打了 ✓ 的组会记进表格。</div>
      <div class="actions"><button class="btn danger" style="flex:0 0 auto" onclick="closeSheet();discardWorkout()">放弃这次训练</button><button class="btn pri" onclick="closeSheet()">继续练</button></div>`);
    return;
  }
  const mins = Math.max(1, Math.round((Date.now() - W.start) / 60000)), d = ymd(new Date(W.start));
  const vol = sum(W.items, it => { const ex = exByName(it.ex); return sum(it.sets.filter(s => s.done), s => setVolume(ex, it.equip, s, d)); });
  const nEx = W.items.filter(it => it.sets.some(s => s.done)).length;
  openSheet('完成训练', `
    <div class="tr-sum"><div><b class="num">${nEx}</b><small>个动作</small></div><div><b class="num">${done}</b><small>组</small></div><div><b class="num">${fmt(vol)}</b><small>kg 容量</small></div></div>
    <label class="lbl">训练时长（分钟）</label>
    <input class="in" id="tw-mins" type="number" inputmode="numeric" value="${mins}" oninput="finPreview()">
    <div class="preview" id="tw-kcal"></div>
    <div class="actions"><button class="btn" style="flex:0 0 auto" onclick="closeSheet()">继续练</button><button class="btn pri" onclick="saveWorkout()">保存</button></div>`);
  finPreview();
}
function finPreview() {
  const W = LOCAL.workout, el = $('#tw-kcal');
  if (!W || !el) return;
  const m = num($('#tw-mins').value), d = ymd(new Date(W.start)), w = bw7(d);
  el.innerHTML = `力量 <b class="num">+${fmt(strengthKcalFor(m, d))}</b> kcal<div class="cd-prev-s num">体重 ${r1(w)} kg × ${r1(m / 60)} 小时 × 2.5</div>`;
}
function saveWorkout() {
  const W = LOCAL.workout;
  if (!W) return;
  const mins = num($('#tw-mins') && $('#tw-mins').value) || Math.max(1, Math.round((Date.now() - W.start) / 60000));
  const d = ymd(new Date(W.start));
  W.items.forEach(it => {
    const ex = exByName(it.ex);
    let n = 0;
    it.sets.forEach(s => {
      if (!s.done) return;
      n++;
      upsertRow('sets', { id: uid('s_'), date: d, plan: W.day, ex: it.ex, equip: it.equip, set: n, kind: s.kind || '正式',
        kg: snum(s.kg), reps: num(s.reps), vol: setVolume(ex, it.equip, s, d), wid: W.id });
    });
  });
  // 记住这次每个计划位置用的动作，下次默认还是它
  const picks = Object.assign({}, slotPicks());
  W.items.forEach(it => { if (it.slot && it.sets.some(s => s.done)) picks[it.slot] = { ex: it.ex, equip: it.equip }; });
  setSetting('trainSlot', picks);
  // 今天的「力量」：按时长算消耗（同一天练了两次就加起来）
  const kcal = strengthKcalFor(mins, d), st = DB.log.find(e => e.date === d && e.type === 'strength');
  if (st) {
    const prevMin = (/(\d+)\s*分钟/.exec(st.note || '') || [])[1];
    upsertRow('log', { id: st.id, kcal: (num(st.kcal) > 0 ? num(st.kcal) : 0) + kcal, note: (num(prevMin) + mins) + ' 分钟' });
  } else {
    const t = new Date(W.start);
    upsertRow('log', { id: uid('l_'), date: d, time: `${pad2(t.getHours())}:${pad2(t.getMinutes())}`, meal: '', type: 'strength', name: '力量训练',
      kcal, protein: 0, fat: 0, carb: 0, note: mins + ' 分钟', foodId: '' });
  }
  LOCAL.workout = null; saveLocal(); stopTrainTick();
  closeSheet(); renderTrain();
  toast(`已保存 · 力量 +${fmt(kcal)} kcal`);
}
async function discardWorkout() {
  if (!(await ask('放弃这次训练？打勾的组也不会保存', { danger: true, ok: '放弃' }))) return;
  LOCAL.workout = null; saveLocal(); stopTrainTick(); renderTrain();
}

// 计时：训练页顶部 + 其他页面底部的「训练中」小条
function startTrainTick() {
  if (TRAIN.tick) return;
  TRAIN.tick = setInterval(() => {
    const W = LOCAL.workout;
    if (!W) { stopTrainTick(); return; }
    const t = fmtDur(Date.now() - W.start), el = $('#tw-time');
    if (el) el.textContent = t;
    const b = $('#tb-time');
    if (b) b.textContent = t;
  }, 1000);
}
function stopTrainTick() { clearInterval(TRAIN.tick); TRAIN.tick = 0; updateTrainBar(); }
function updateTrainBar() {
  const b = $('#train-bar'), W = LOCAL.workout;
  if (!b) return;
  const show = !!W && VIEW.tab !== 'train';
  b.classList.toggle('on', show);
  document.body.classList.toggle('has-tbar', show);
  if (!W) return;
  const it = W.items[W.cur];
  b.innerHTML = `<span class="tb-dot" aria-hidden="true"></span><span class="tb-t">训练中 <b class="num" id="tb-time">${fmtDur(Date.now() - W.start)}</b></span>
    <span class="tb-n">${it ? esc(exLabel(it.ex, it.equip)) : ''} · ${wDone(W)}/${wTotal(W)} 组</span><b class="tb-go" aria-hidden="true">›</b>`;
}

// ════════ 改计划（一天） ════════
function openPlanDay(day) {
  TRAIN.planDay = day;
  const rows = planOf(day);
  openSheet(day + ' 计划', `
    <div class="tr-prows">${rows.length ? rows.map((r, i) => {
      const fx = exByName(r.item), part = fx ? null : partOf(r.item), type = DAY_TYPES.includes(r.item);
      return `<div class="tr-prow"><span class="tr-pi num">${i + 1}</span>
        <span class="tr-pn"><b>${esc(fx ? exLabel(r.item, r.equip || exEq(fx)[0]) : r.item)}</b><small>${fx ? '固定动作' : part ? (part !== r.item ? '部位 · ' + esc(part) : '部位') : type ? '这天的类型' : '动作库里没有，也不是部位'}</small></span>
        <button class="chip ${r.ss ? 'on' : ''}" onclick="planSS('${r.id}')" ${type ? 'disabled' : ''} aria-label="superset">${r.ss ? esc(r.ss) : 'SS'}</button>
        <button class="hd-btn ghost" onclick="planMove('${r.id}',-1)" ${i === 0 ? 'disabled' : ''} aria-label="上移">↑</button>
        <button class="hd-btn ghost" onclick="planMove('${r.id}',1)" ${i === rows.length - 1 ? 'disabled' : ''} aria-label="下移">↓</button>
        <button class="hd-btn ghost" onclick="planDel('${r.id}')" aria-label="删除">×</button></div>`;
    }).join('') : '<div class="muted">这天还没有内容（算休息）</div>'}</div>
    <label class="lbl">加一个部位（每次训练时从动作库选）</label>
    <div class="chips">${ALL_PARTS.map(p => `<button class="chip" onclick="planAdd('${p}')">${p}</button>`).join('')}</div>
    <label class="lbl">加一个固定动作</label>
    <button class="btn block" onclick="TRAIN.pickG='全部';openExPicker({mode:'plan',day:'${day}',part:'',ex:'',equip:'',title:''})">从动作库选…</button>
    <label class="lbl">或者这天是</label>
    <div class="chips">${DAY_TYPES.map(t => `<button class="chip" onclick="planSetType('${t}')">${t}</button>`).join('')}</div>
    <div class="hint">固定动作的器材可以在训练前点那一项换；superset：点两个相邻动作的 SS 配成一对。</div>`);
}
function planRenumber(day) {
  planOf(day).forEach((r, i) => { if (num(r.ord) !== i + 1) upsertRow('plan', { id: r.id, ord: i + 1 }); });
}
function planAdd(item) {
  const day = TRAIN.planDay, rows = planOf(day);
  rows.filter(r => DAY_TYPES.includes(r.item)).forEach(r => deleteRow('plan', r.id));   // 加了动作就不再是有氧 / 休息日
  upsertRow('plan', { id: uid('p_'), day, ord: (rows.length ? num(rows[rows.length - 1].ord) : 0) + 1, item, equip: '', ss: '' });
  planRenumber(day); openPlanDay(day); renderTrain();
}
async function planSetType(t) {
  const day = TRAIN.planDay, rows = planOf(day);
  if (rows.some(r => !DAY_TYPES.includes(r.item)) && !(await ask(`把${day}改成「${t}」？这天的动作会清空`, { ok: '改' }))) return;
  rows.forEach(r => deleteRow('plan', r.id));
  upsertRow('plan', { id: uid('p_'), day, ord: 1, item: t, equip: '', ss: '' });
  openPlanDay(day); renderTrain();
}
function planMove(id, d) {
  const day = TRAIN.planDay, rows = planOf(day), i = rows.findIndex(r => r.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  rows.forEach((r, k) => { if (num(r.ord) !== k + 1) upsertRow('plan', { id: r.id, ord: k + 1 }); });
  openPlanDay(day); renderTrain();
}
function planDel(id) {
  const day = TRAIN.planDay, r = DB.plan.find(x => x.id === id);
  if (r && r.ss) DB.plan.filter(x => x.day === day && x.ss === r.ss && x.id !== id).forEach(x => upsertRow('plan', { id: x.id, ss: '' }));
  deleteRow('plan', id); planRenumber(day); openPlanDay(day); renderTrain();
}
// superset：先点一个，再点相邻的另一个（只有一个时自动和下一个配对）
function planSS(id) {
  const day = TRAIN.planDay, rows = planOf(day), i = rows.findIndex(r => r.id === id), r = rows[i];
  if (!r) return;
  if (r.ss) { const l = r.ss; rows.filter(x => x.ss === l).forEach(x => upsertRow('plan', { id: x.id, ss: '' })); }
  else {
    const nb = [rows[i + 1], rows[i - 1]].find(x => x && !x.ss && !DAY_TYPES.includes(x.item));
    if (!nb) { toast('旁边没有能配对的动作'); return; }
    const used = new Set(rows.map(x => x.ss).filter(Boolean)), l = 'ABCDEFGH'.split('').find(c => !used.has(c)) || 'A';
    upsertRow('plan', { id: r.id, ss: l }); upsertRow('plan', { id: nb.id, ss: l });
  }
  openPlanDay(day); renderTrain();
}

// ════════ 动作库：新增 / 修改 ════════
function editExercise(id) {
  const e = id ? DB.exercises.find(x => x.id === id) : null;
  TRAIN.edit = e ? { id: e.id, name: e.name, equip: exEq(e), mode: e.mode || '重量', main: e.main, sub: splitList(e.sub), anim: e.anim || '' }
    : { id: '', name: '', equip: ['哑铃'], mode: '重量', main: '中胸', sub: [], anim: '' };
  exEditRender();
}
function exEditRender() {
  const t = TRAIN.edit, seeds = EX_SEED.filter(r => !r[7]);
  const prev = { anim: t.anim, main: t.main, equip: t.equip.join('、') };
  openSheet(t.id ? '修改动作' : '新增动作', `
    <div class="exa tr-big" id="ex-prev">${exArt(prev, t.equip[0])}</div>
    <input class="in" id="ex-name" value="${esc(t.name)}" placeholder="动作名称" oninput="TRAIN.edit.name=this.value" style="margin-top:12px">
    <label class="lbl">器材（可多选，第一个是默认）</label>
    <div class="chips">${EQUIPS.map(q => `<button class="chip ${t.equip.includes(q) ? 'on' : ''}" onclick="exEditToggle('equip','${q}')">${q}</button>`).join('')}</div>
    <label class="lbl">记录方式</label>
    <div class="seg">${MODES.map(m => `<button type="button" class="${m === t.mode ? 'on' : ''}" onclick="TRAIN.edit.mode='${m}';exEditRender()">${m === '重量' ? '重量 × 次数' : m === '自重' ? '自重（填附加 / 助力）' : '计时（秒）'}</button>`).join('')}</div>
    <label class="lbl">主练</label>
    <select class="in" onchange="TRAIN.edit.main=this.value;exEditRender()">${PART_GROUPS.map(g => `<optgroup label="${g[0]}">${g[1].map(p => `<option ${p === t.main ? 'selected' : ''}>${p}</option>`).join('')}</optgroup>`).join('')}</select>
    <label class="lbl">顺带练到</label>
    <div class="chips">${ALL_PARTS.filter(p => p !== t.main).map(p => `<button class="chip ${t.sub.includes(p) ? 'on' : ''}" onclick="exEditToggle('sub','${p}')">${p}</button>`).join('')}</div>
    <label class="lbl">动画</label>
    <select class="in" onchange="TRAIN.edit.anim=this.value;exEditRender()"><option value="">按主练部位自动选</option>${seeds.map(r => `<option value="${r[0]}" ${r[0] === t.anim ? 'selected' : ''}>${r[1]}</option>`).join('')}</select>
    <div class="actions">${t.id ? `<button class="btn danger" style="flex:0 0 auto" onclick="exDelete()">删除</button>` : ''}<button class="btn pri" onclick="exSave()">保存</button></div>`);
  $('#sheet-bg .sheet').classList.add('tall');
}
function exEditToggle(k, v) {
  const a = TRAIN.edit[k], i = a.indexOf(v);
  if (i >= 0) a.splice(i, 1); else a.push(v);
  TRAIN.edit.name = $('#ex-name').value;
  exEditRender();
}
function exSave() {
  const t = TRAIN.edit, name = $('#ex-name').value.trim();
  if (!name) { toast('写个动作名称'); return; }
  if (!t.equip.length) { toast('至少选一种器材'); return; }
  if (DB.exercises.some(x => x.name === name && x.id !== t.id)) { toast('已经有同名的动作'); return; }
  const old = t.id ? DB.exercises.find(x => x.id === t.id) : null;
  upsertRow('exercises', { id: t.id || uid('x_'), name, equip: t.equip.join('、'), mode: t.mode, group: groupOfPart(t.main), main: t.main,
    sub: t.sub.filter(p => p !== t.main).join('、'), anim: t.anim, sort: old ? num(old.sort) : DB.exercises.length + 1 });
  if (old && old.name !== name) DB.plan.filter(r => r.item === old.name).forEach(r => upsertRow('plan', { id: r.id, item: name }));   // 改名：计划里的也跟着改
  closeSheet(); renderTrain(); toast('已保存');
}
async function exDelete() {
  const t = TRAIN.edit;
  if (!(await ask(`删除「${t.name}」？已有的训练记录不受影响`, { danger: true, ok: '删除' }))) return;
  deleteRow('exercises', t.id); closeSheet(); renderTrain();
}
