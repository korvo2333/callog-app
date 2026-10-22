// ════════════════════════════════════════════
// 板块排序：每个页面的卡片顺序，在「设置 → 板块排序」里调整（存在本机）
// 每个板块用 data-mod（或可折叠卡片的 data-fold）标识
// ════════════════════════════════════════════
const MODS = {
  today: [['today:hero', '热量概览'], ['today:act', '活动'], ['today:mm', '训练部位'], ['today:body', '体重'],
    ['today:composer', '记录饮食'], ['today:ai', 'AI 识别结果'], ['today:list', '今日记录'], ['today:time', '摄入时间']],
  week: [['week:def', '热量缺口'], ['week:chart', '每天摄入'], ['week:daily', '每日明细'], ['week:w8', '近 8 周'], ['week:tdee', '实测维持热量']],
  body: [['body:form', '记录'], ['body:stats', '概览'], ['body:w', '体重'], ['body:bf', '体脂率'], ['body:lean', '去脂体重'],
    ['body:muscle', '肌肉量'], ['body:recs', '全部记录']],
  settings: [['set:theme', '主题'], ['set:order', '板块排序'], ['set:goals', '每日目标'], ['set:watch', '手表步数'], ['set:periods', '特殊时段'],
    ['set:plan', '减脂计划'], ['set:ai', 'AI 模型'], ['set:sync', '同步']]
};
const MOD_PAGES = [['today', '今日'], ['week', '本周'], ['body', '身体'], ['settings', '设置']];
// 当前顺序：存过的顺序 + 以后新加的板块
function modOrder(page) {
  const def = MODS[page].map(m => m[0]);
  const o = ((LOCAL.order || {})[page] || []).filter((k, i, a) => def.includes(k) && a.indexOf(k) === i);
  def.forEach((k, i) => { if (!o.includes(k)) o.splice(i ? o.indexOf(def[i - 1]) + 1 : 0, 0, k); });   // 新板块排在它默认的前一个板块后面
  return o;
}
const modKey = el => (el && el.dataset && (el.dataset.mod || el.dataset.fold)) || '';
// 把容器里的板块按顺序排好；extra：要一起排进来的固定节点（身体页的「记录」卡）
function placeMods(box, page, extra) {
  if (!box) return;
  const order = modOrder(page);
  const mods = [...box.children, ...(extra || [])].filter(el => el && order.includes(modKey(el)));
  mods.sort((a, b) => order.indexOf(modKey(a)) - order.indexOf(modKey(b)));
  const cur = [...box.children].filter(el => order.includes(modKey(el)));
  if (cur.length === mods.length && cur.every((el, i) => el === mods[i])) return;   // 顺序没变就不动（不打断正在输入的框）
  mods.forEach(el => box.appendChild(el));
}
function applyOrder(page) {
  if (page === 'today') placeMods($('#scr-today'), 'today');
  else if (page === 'settings') placeMods($('#s-content'), 'settings');
  // 本周 / 身体：下次打开时按新顺序画
}

// ── 设置里的排序卡 ──
const ORD_IC = d => `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d < 0 ? 'M6 14l6-6 6 6' : 'M6 10l6 6 6-6'}"/></svg>`;
function orderCardHTML() {
  const pg = VIEW.orderPage || 'today';
  return `<div class="hint" style="margin:0 0 10px">调整每个页面里卡片的上下顺序，只影响这台手机。</div>
    ${segHTML('ord-page', MOD_PAGES.map(p => p[1]), MOD_PAGES.find(p => p[0] === pg)[1], 'pickOrderPage')}
    <div class="ord-list" id="ord-list">${orderListHTML(pg)}</div>
    <div class="actions"><button class="btn" onclick="resetOrder()">恢复默认顺序</button></div>`;
}
function orderListHTML(pg) {
  const names = Object.fromEntries(MODS[pg]), o = modOrder(pg);
  return o.map((k, i) => `<div class="ord-row" data-k="${k}"><span class="ord-i num">${i + 1}</span><span class="ord-n">${names[k]}</span>
    <button class="ord-b" onclick="moveMod('${k}',-1)" aria-label="${names[k]}上移"${i ? '' : ' disabled'}>${ORD_IC(-1)}</button>
    <button class="ord-b" onclick="moveMod('${k}',1)" aria-label="${names[k]}下移"${i < o.length - 1 ? '' : ' disabled'}>${ORD_IC(1)}</button></div>`).join('');
}
function pickOrderPage(label) {
  VIEW.orderPage = (MOD_PAGES.find(p => p[1] === label) || MOD_PAGES[0])[0];
  $('#ord-list').innerHTML = orderListHTML(VIEW.orderPage);
}
function moveMod(k, d) {
  const pg = VIEW.orderPage || 'today', o = modOrder(pg), i = o.indexOf(k), j = i + d;
  if (i < 0 || j < 0 || j >= o.length) return;
  [o[i], o[j]] = [o[j], o[i]];
  LOCAL.order = Object.assign({}, LOCAL.order, { [pg]: o });
  saveLocal();
  applyOrder(pg);
  const list = $('#ord-list');
  if (!list) return;
  list.innerHTML = orderListHTML(pg);
  const row = list.querySelector(`[data-k="${k}"]`);
  if (row) {
    row.classList.add('moved');
    const b = row.querySelectorAll('.ord-b')[d < 0 ? 0 : 1];
    (b && !b.disabled ? b : row.querySelector('.ord-b:not([disabled])') || row).focus({ preventScroll: true });
  }
}
function resetOrder() {
  const pg = VIEW.orderPage || 'today', o = Object.assign({}, LOCAL.order);
  delete o[pg];
  LOCAL.order = o;
  saveLocal();
  applyOrder(pg);
  if ($('#ord-list')) $('#ord-list').innerHTML = orderListHTML(pg);
  toast('已恢复默认顺序');
}
