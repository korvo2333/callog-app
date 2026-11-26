// ════════════════════════════════════════════
// 设置 → 训练计划：每周七天各练什么（数据和自动标部位见 03b_muscle.js）
// 一天点开在弹层里改：类型、名称、动作（个数、顺序）、人体图上的部位（按动作自动标，可以手动调）
// 点「保存」才写进 Settings 表的 weekPlan；和默认安排一样时删掉这一项（以后默认安排更新了也能跟上）
// ════════════════════════════════════════════
let PD = null;   // 正在改的那天：{ w: 周几, d: 草稿 }
// 加动作的快捷按钮（部位按钮另外一排：只练这个部位的动作）
const PD_EX = ['深蹲', '硬拉', '罗马尼亚硬拉', '腿举', '臀推', '卧推', '哑铃卧推', '上斜卧推', '肩推', '侧平举', '背宽', '背厚', '面拉', '弯举', '臂屈伸'];
const planCustom = () => Array.isArray(DB.settings.weekPlan) && DB.settings.weekPlan.length === 7;
const planTypeName = t => (PLAN_TYPES.find(x => x[0] === t) || PLAN_TYPES[3])[1];
const clone = o => JSON.parse(JSON.stringify(o));

function planSummary() {
  return `力量 ${weekPlanRaw().filter(d => planDayOf(d).type === 'str').length} 天`;
}
function planCardHTML() {
  const raw = weekPlanRaw(), td = parseYmd(today()).getDay();
  const order = Array.from({ length: 7 }, (_, i) => (num(cfg().weekStart) + i) % 7);
  return `<div class="tp-list">${order.map(w => {
    const p = planDayOf(raw[w]);
    return `<button type="button" class="tp-row${w === td ? ' on' : ''}" data-w="${w}" onclick="openPlanDay(${w})" aria-label="周${WD[w]}：${esc(p.title)}，${esc(p.text)}">
      <span class="tp-d">周${WD[w]}</span>
      <span class="tp-m"><b>${esc(p.title)}</b><small>${esc(p.text)}</small></span>
      <span class="tp-k t-${p.type}">${planTypeName(p.type)}</span></button>`;
  }).join('')}</div>
    <div class="hint">点一天改动作和顺序。今日页人体图上的主要 / 次要部位按动作自动标，也能在里面手动调；训练窗口默认选的种类也按这里（力量日 → 力量，拳击日 → 拳击，有氧日 → 上次用的有氧）</div>
    ${planCustom() ? '<div class="actions"><button class="btn" onclick="resetWeekPlan()">全部恢复默认</button></div>' : ''}`;
}

function openPlanDay(w) {
  PD = { w, d: planDraft(weekPlanRaw()[w]) };
  openSheet(`周${WD[w]} · 训练安排`, '<div id="pd-box"></div>');
  pdRender();
}
// 草稿：留着全部字段（换了类型再换回来，动作还在）
function planDraft(r) {
  r = r || {};
  return { type: planDayOf(r).type, title: String(r.title || ''), items: Array.isArray(r.items) ? r.items.map(String) : [],
    note: String(r.note || ''), adj: Object.assign({}, r.adj) };
}
function pdRender() {
  const box = $('#pd-box');
  if (box) box.innerHTML = planDayHTML();
}
function planDayHTML() {
  const d = PD.d, p = planDayOf(d);
  const ib = (fn, label, html, dis) => `<button type="button" class="ord-b" onclick="${fn}" aria-label="${label}"${dis ? ' disabled' : ''}>${html}</button>`;
  const rows = d.items.map((s, i) => {
    const it = parseItem(s);
    return `<div class="pd-it">
      <input class="in sm" value="${esc(it.name)}" aria-label="第 ${i + 1} 个动作" onchange="pdName(${i},this.value)">
      <span class="pd-n">${ib(`pdCount(${i},-1)`, `${esc(it.name)}少一个`, '−', it.n < 2)}<b class="num">×${it.n}</b>${ib(`pdCount(${i},1)`, `${esc(it.name)}多一个`, '+')}</span>
      ${ib(`pdMove(${i},-1)`, `${esc(it.name)}上移`, ORD_IC(-1), !i)}${ib(`pdMove(${i},1)`, `${esc(it.name)}下移`, ORD_IC(1), i === d.items.length - 1)}${ib(`pdDel(${i})`, `删除${esc(it.name)}`, '×')}
    </div>`;
  }).join('');
  const chip = x => `<button type="button" class="chip" onclick="pdAdd('${x}')">${x}</button>`;
  const body = d.type === 'str' ? `
    <label class="lbl">动作<span class="muted pd-sub">×2 = 这个部位做两个动作</span></label>
    <div class="pd-items">${rows || '<div class="hint" style="margin:0">还没有动作，从下面加</div>'}</div>
    <div class="row pd-new"><input class="in sm grow" id="pd-new" placeholder="自己写，例：中束 + 后束" enterkeyhint="done" onkeydown="if(event.key==='Enter'){event.preventDefault();pdAdd(this.value)}">
      <button type="button" class="btn" onclick="pdAdd($('#pd-new').value)">添加</button></div>
    <div class="pd-cap">常用动作</div>
    <div class="chips pd-sug" role="group" aria-label="常用动作">${PD_EX.map(chip).join('')}</div>
    <div class="pd-cap">只写部位（练这个部位的动作）</div>
    <div class="chips pd-sug" role="group" aria-label="只写部位">${MM_PARTS.map(chip).join('')}</div>
    ${p.unknown.length ? `<div class="hint st-hint info">没认出：${p.unknown.map(esc).join('、')}。它们不会标在人体图上，需要的话在下面手动点部位</div>` : ''}`
    : `<label class="lbl">说明</label>
    <input class="in" id="pd-note" value="${esc(d.note)}" placeholder="${PLAN_NOTE[d.type]}" oninput="PD.d.note=this.value">`;
  const parts = d.type === 'rest' ? '' : `<div class="mm pd-mm">
    <label class="lbl">人体图<span class="muted pd-sub">点部位换：主要 → 次要 → 不标</span></label>
    ${musclesSVG(p)}
    <div class="pd-parts">${MM_PARTS.map(x => {
      const lv = p.lv[x] || 0;
      return `<button type="button" class="pd-p l${lv}${x in p.adj ? ' adj' : ''}" data-p="${x}" onclick="pdPart('${x}')" aria-label="${x}：${['不标', '主要', '次要'][lv]}${x in p.adj ? '（手动）' : ''}">${x}</button>`;
    }).join('')}</div>
    <div class="mm-leg pd-leg"><span><i class="l1"></i>主要</span><span><i class="l2"></i>次要</span><span><i class="adj"></i>手动改过</span></div>
    ${Object.keys(p.adj).length ? '<button type="button" class="link pd-auto" onclick="pdAuto()">部位改回按动作自动标</button>' : ''}</div>`;
  return `${segHTML('pd-type', PLAN_TYPES.map(t => t[1]), planTypeName(d.type), 'pdType')}
    <label class="lbl">名称</label>
    <input class="in" id="pd-title" value="${esc(d.title)}" placeholder="${planTypeName(d.type)}" oninput="PD.d.title=this.value">
    ${body}${parts}
    <div class="actions">
      <button type="button" class="btn" style="flex:0 0 auto" onclick="pdDefault()">用默认</button>
      <button type="button" class="btn pri" onclick="pdSave()">保存</button>
    </div>`;
}
// 重画弹层但不跳动：记住滚动位置
function pdUpdate(fn) {
  fn(PD.d);
  const sh = $('#sheet-bg .sheet'), y = sh ? sh.scrollTop : 0;
  pdRender();
  if (sh) sh.scrollTop = y;
}
function pdType(label) {
  const t = (PLAN_TYPES.find(x => x[1] === label) || PLAN_TYPES[0])[0];
  pdUpdate(d => {
    if (d.title.trim() === planTypeName(d.type)) d.title = '';   // 名称还是类型名的话跟着换
    d.type = t;
  });
}
function pdName(i, v) {
  pdUpdate(d => {
    const nv = parseItem(v), old = parseItem(d.items[i]);
    if (!nv.name) d.items.splice(i, 1);
    else d.items[i] = nv.x ? fmtItem(nv.name, nv.n, true) : fmtItem(nv.name, old.n, old.x);
  });
}
function pdCount(i, dn) {
  pdUpdate(d => { const it = parseItem(d.items[i]), n = Math.max(1, Math.min(9, it.n + dn)); d.items[i] = fmtItem(it.name, n, n > 1); });
}
function pdMove(i, dn) {
  pdUpdate(d => { const j = i + dn; if (j < 0 || j >= d.items.length) return; [d.items[i], d.items[j]] = [d.items[j], d.items[i]]; });
}
function pdDel(i) { pdUpdate(d => d.items.splice(i, 1)); }
// 加动作：已经有同名的就 ×N 加一
function pdAdd(v) {
  const nv = parseItem(v);
  if (!nv.name) return;
  pdUpdate(d => {
    const i = d.items.findIndex(s => parseItem(s).name === nv.name);
    if (i >= 0 && !nv.x) { const it = parseItem(d.items[i]); d.items[i] = fmtItem(it.name, Math.min(9, it.n + 1), true); }
    else d.items.push(nv.x ? fmtItem(nv.name, nv.n, true) : nv.name);
  });
}
// 部位：主要 → 次要 → 不标 → 主要；和按动作自动标的一样时不算手动改
function pdPart(x) {
  pdUpdate(d => {
    const p = planDayOf(d), cur = p.lv[x] || 0, next = cur === 1 ? 2 : cur === 2 ? 0 : 1;
    if (next === (p.autoLv[x] || 0)) delete d.adj[x]; else d.adj[x] = next;
  });
}
function pdAuto() { pdUpdate(d => { d.adj = {}; }); }
function pdDefault() { pdUpdate(d => Object.assign(d, planDraft(DEFAULT_WEEK_PLAN[PD.w]))); }
function pdSave() {
  const nw = $('#pd-new');
  if (nw && parseItem(nw.value).name) pdAdd(nw.value);   // 写了没点「添加」也算上
  const d = PD.d, out = { type: d.type, title: d.title.trim() };
  if (d.type === 'str') out.items = d.items.map(s => s.trim()).filter(Boolean);
  else out.note = d.note.trim();
  const adj = {};
  if (d.type !== 'rest') Object.keys(d.adj).filter(k => MM_PARTS.includes(k)).forEach(k => { adj[k] = +d.adj[k]; });
  if (Object.keys(adj).length) out.adj = adj;
  const plan = clone(weekPlanRaw());
  plan[PD.w] = out;
  savePlan(plan);
  closeSheet();
  toast('已保存');
}
function savePlan(plan) {
  if (JSON.stringify(plan) === JSON.stringify(DEFAULT_WEEK_PLAN)) delSetting('weekPlan');
  else setSetting('weekPlan', plan);
  renderSettings();
  renderToday();
}
async function resetWeekPlan() {
  if (!await ask('训练计划全部恢复成默认安排？')) return;
  savePlan(clone(DEFAULT_WEEK_PLAN));
  toast('已恢复默认安排');
}
