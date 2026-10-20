// ════════════════════════════════════════════
// 设置页
// ════════════════════════════════════════════
function syncInfoHTML() {
  if (!connected()) return '';
  const last = LOCAL.lastSync ? new Date(LOCAL.lastSync).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
  return `上次同步 ${last}${OUTBOX.length ? ` · 待上传 ${OUTBOX.length}` : ''}${syncState === 'err' ? ` · <span style="color:var(--bad)">${esc(syncMsg)}</span>` : ''}`;
}

function renderSettings() {
  const s = cfg();
  const order = Array.from({ length: 7 }, (_, i) => (num(s.weekStart) + i) % 7);
  const weekDef = sum(order, i => num(s.tdee) - num(s.dayKcal[i]));
  const sv = LOCAL.server;
  const numRow = (label, key, step) => `<label class="srow"><span>${label}</span><input class="in sm" type="number" ${step ? `step="${step}" inputmode="decimal"` : 'inputmode="numeric"'} value="${s[key]}" onchange="setNum('${key}',this.value)"></label>`;
  const dateRow = (label, key) => `<label class="srow"><span>${label}</span><input class="in sm" type="date" value="${s[key]}" onchange="setStr('${key}',this.value)" style="max-width:160px"></label>`;
  const curTheme = themeConf();
  const avgDay = Math.round(sum(order, i => num(s.dayKcal[i])) / 7);
  const curModel = aiModels().find(m => m.id === s.aiModel);
  const dv = deficitOf(s), lv = DEFICITS.find(x => x.v === dv);
  const formula = !!s.formulaFrom;
  $('#s-content').innerHTML =
  fcard('set:theme', '主题', curTheme.name, `
    <div class="themes">${THEMES.filter(t => !t.group).map(t => themePreviewHTML(t, document.documentElement.dataset.theme === t.id)).join('')}</div>
    <label class="lbl" style="margin-top:16px">游戏风</label>
    <div class="themes">${THEMES.filter(t => t.group === 'game').map(t => themePreviewHTML(t, document.documentElement.dataset.theme === t.id)).join('')}</div>`)
  + (formula ? fcard('set:goals', '每日目标', `缺口 ${fmt(dv)} · 今天 ${fmt(dayInfo(today()).target)}`, `
    <label class="lbl" style="margin-top:0">每日缺口</label>
    <div class="seg" id="s-int">${DEFICITS.map(x => `<button type="button" class="${dv === x.v ? 'on' : ''}" onclick="setDeficit(${x.v})">${x.name} ${x.v}</button>`).join('')}</div>
    ${deficitPreviewHTML()}
    ${numRow('缺口 kcal', 'deficit')}
    ${numRow('蛋白质 g', 'protein')}
    ${numRow('脂肪 g', 'fat')}
    <div class="sub-fold ${isFolded('set:adv') ? 'folded' : ''}" data-fold="set:adv">
      <div class="sub-fold-t fold-t" ${foldAttrs('set:adv')}><span>参数</span><span class="muted">基础代谢 ${fmt(s.bmr)}</span>${FOLD_IC}</div>
      <div class="fold"><div class="fold-in">
        ${numRow('基础代谢', 'bmr')}
        ${numRow('日常系数', 'restFactor', 0.01)}
        ${numRow('每千步 kcal', 'stepKcal')}
        ${numRow('力量 kcal', 'strengthKcal')}
        <label class="srow"><span>有氧计入 %</span><input class="in sm" type="number" inputmode="numeric" value="${Math.round(pf(s.cardioFactor) * 100)}" onchange="setNum('cardioFactor', (parseFloat(this.value) || 70) / 100)"></label>
        ${numRow('默认步数', 'stepsDefault')}
        ${numRow('每周力量次数', 'strengthPerWeek')}
      </div></div>
    </div>
    <label class="srow" style="margin-top:6px"><span>每周开始</span>
      <select class="in sm" onchange="setNum('weekStart',this.value)" style="max-width:110px">
        <option value="0" ${num(s.weekStart) === 0 ? 'selected' : ''}>周日</option>
        <option value="1" ${num(s.weekStart) === 1 ? 'selected' : ''}>周一</option>
      </select></label>`)
  : fcard('set:goals', '每日目标', `平均 ${fmt(avgDay)}`, `
    ${numRow('维持热量 kcal', 'tdee')}
    ${numRow('蛋白质 g', 'protein')}
    ${numRow('脂肪 g', 'fat')}
    <label class="lbl">热量 kcal</label>
    <div class="wk">${order.map(i => `<div><label>${WD[i]}</label>
      <input type="number" inputmode="numeric" value="${s.dayKcal[i]}" onchange="setDayKcal(${i},this.value)">
      <div class="c">C${carbFor(num(s.dayKcal[i]))}</div></div>`).join('')}</div>
    <div class="hint">每周 −${fmt(weekDef)} ≈ ${(weekDef / 7700).toFixed(2)} kg</div>
    <label class="srow" style="margin-top:6px"><span>每周开始</span>
      <select class="in sm" onchange="setNum('weekStart',this.value)" style="max-width:110px">
        <option value="0" ${num(s.weekStart) === 0 ? 'selected' : ''}>周日</option>
        <option value="1" ${num(s.weekStart) === 1 ? 'selected' : ''}>周一</option>
      </select></label>`))
  + fcard('set:watch', '手表步数', watchSummary(), watchCardHTML())
  + fcard('set:periods', '特殊时段', (s.overrides || []).length ? `${(s.overrides || []).length} 个` : '', `
    ${(s.overrides || []).map(o => `<div class="ov"><span class="grow">${md(o.from)}–${md(o.to)} · <b>${fmt(o.kcal)}</b> kcal · ${esc(o.label || '')}</span>
      <button class="icon-btn" onclick="delOverride('${o.id}')" aria-label="删除">🗑</button></div>`).join('')}
    <div class="grid2" style="margin-top:10px">
      <input class="in sm" type="date" id="ov-from" aria-label="开始">
      <input class="in sm" type="date" id="ov-to" aria-label="结束">
      <input class="in sm" type="number" inputmode="numeric" id="ov-kcal" placeholder="kcal">
      <input class="in sm" id="ov-label" placeholder="名称">
    </div>
    <button class="btn block" style="margin-top:10px" onclick="addOverride()">添加</button>`)
  + fcard('set:plan', '减脂计划', `${s.planStartWeight} → ${s.planEndWeight} kg`, `
    ${dateRow('开始', 'planStart')}
    ${dateRow('结束', 'planEnd')}
    ${numRow('开始体重 kg', 'planStartWeight', 0.1)}
    ${numRow('目标体重 kg', 'planEndWeight', 0.1)}
    ${numRow('开始体脂 %', 'planStartBf', 0.1)}
    ${numRow('目标体脂 %', 'planEndBf', 0.1)}`)
  + fcard('set:ai', 'AI 模型', curModel ? esc(curModel.name) : '', `
    ${sv && !sv.aiReady ? '<div class="hint" style="color:var(--bad);margin:0 0 6px">未设置 API Key</div>' : ''}
    ${aiModels().map(m => `<label class="srow" style="cursor:pointer"><span><input type="radio" name="ai-model" value="${m.id}" ${s.aiModel === m.id ? 'checked' : ''}
        onchange="setStr('aiModel',this.value)" style="accent-color:var(--accent);margin-right:8px">${esc(m.name)}</span>
        <span class="muted" style="font-size:12px">≈ ${usd(estCost(m).photo)} / 次</span></label>`).join('')}
    <div class="hint" id="s-usage">${connected() ? (USAGE.html || '<span class="spin"></span>') : ''}</div>`)
  + fcard('set:sync', '同步', connected() ? (sv ? '已连接' : '连接中') : '本机预览', `
    ${connected() ? `<div class="muted">${sv ? pingHTML(sv) : '连接中…'}</div>
      <div class="hint" id="s-syncinfo">${syncInfoHTML()}</div>
      <div class="actions"><button class="btn" onclick="syncNow(true)">立即同步</button><button class="btn" onclick="reloadFromSheet()">重新载入</button></div>`
      : '<div class="muted">本机预览模式</div>'}
    ${IN_APP && LOCAL.apiUrl ? `<div class="hint" style="word-break:break-all">${esc(LOCAL.apiUrl.replace(/\/s\/(.{6}).+(.{4})\/exec$/, '/s/$1…$2/exec'))}</div>` : ''}
    <div class="actions" style="margin-top:8px">
      ${connected() ? `<button class="btn" onclick="lockNow()">${IN_APP ? '换网址 / 密码' : '退出'}</button>` : ''}
      <button class="btn danger" onclick="clearLocal()">清除缓存</button>
    </div>`);
  loadPreviewFonts();
  if (connected() && Date.now() - USAGE.at > 60000) loadUsage();
}

function pingHTML(sv) {
  return `✓ 已连接 · <a class="link" style="font-size:13px" href="${esc(sv.sheetUrl)}" target="_blank" rel="noopener">打开表格 ↗</a>`;
}

// 估算单次费用：提示词约 1000 token，照片（长边 1024px）约 1050 token，回答约 300 token
function estCost(m) {
  const out = 300 * m.output / 1e6;
  return { text: 1000 * m.input / 1e6 + out, photo: 2050 * m.input / 1e6 + out };
}
const USAGE = { at: 0, html: '' };
async function loadUsage() {
  if (!connected()) return;
  USAGE.at = Date.now();
  try {
    const r = await api('aiUsage');
    const t = r.thisMonth, a = r.total;
    USAGE.html = `本月 ${t.count} 次 · ${usd(t.costUSD)}　累计 ${a.count} 次 · ${usd(a.costUSD)}`;
    if ($('#s-usage')) $('#s-usage').innerHTML = USAGE.html;
  } catch (e) {
    USAGE.at = 0;
    if ($('#s-usage')) $('#s-usage').textContent = '';
  }
}

function setTheme(id) {
  LOCAL.theme = id; saveLocal(); applyTheme(); renderSettings();
  const el = $('#scr-settings');
  playTx(null, el, 0, 'settings', 1, 'theme ' + id);   // 换主题时也播放新主题的转场
  enterScreen(el, 1);
}
function setNum(k, v) { setSetting(k, parseFloat(v) || 0); renderSettings(); if (k !== 'weekStart') renderToday(); }
function setDeficit(v) { setSetting('deficit', v); renderSettings(); renderToday(); toast(`缺口 ${v}`); }

// 三档缺口对比：按最近的平均步数、力量频率估一个「平时的一天」
function deficitPreviewHTML() {
  const s = cfg();
  const avg = stepsAvg(addDays(today(), 1));
  const steps = avg === null ? num(s.stepsDefault) : avg;
  const E = Math.round(num(s.bmr) * pf(s.restFactor)) + Math.round(steps * pf(s.stepKcal) / 1000) + Math.round(strengthRate() * num(s.strengthKcal));
  const cols = DEFICITS.map(x => {
    const tg = Math.max(num(s.bmr), E - x.v);
    return { x, tg, kg: (E - tg) * 7 / 7700, on: x.v === deficitOf(s) };
  });
  return `<table class="int-tbl"><tr><td></td>${cols.map(c => `<th class="${c.on ? 'on' : ''}">${c.x.name}</th>`).join('')}</tr>
    <tr><td>平时吃</td>${cols.map(c => `<td class="num ${c.on ? 'on' : ''}">${fmt(c.tg)}</td>`).join('')}</tr>
    <tr><td>每周</td>${cols.map(c => `<td class="num ${c.on ? 'on' : ''}">−${c.kg.toFixed(2)} kg</td>`).join('')}</tr></table>`;
}

// 手表步数（HC Webhook）
function watchSummary() {
  const last = STEPS.last || LOCAL.stepsLast;
  return !last || !last.at ? '未连接' : last.warn === 'daily' ? '分辨率要选「每日」' : agoText(last.at);
}
function hookUrl() {
  const sv = LOCAL.server;
  return sv && sv.hookUrl && LOCAL.token ? sv.hookUrl + '?token=' + encodeURIComponent(LOCAL.token) : '';
}
function watchCardHTML() {
  const url = hookUrl();
  return `<label class="lbl" style="margin-top:0">HC Webhook 网址</label>
    ${url ? `<div class="row"><input class="in sm grow" id="hook-url" readonly value="${esc(url)}" onclick="this.select()"><button class="btn" onclick="copyHook()">复制</button></div>`
      : `<div class="hint" style="margin-top:0;color:var(--warn)">${!connected() ? '—'
          : LOCAL.server && LOCAL.server.v2 && STEPS.err !== 'old' ? '浏览器地址栏的网址（…/exec）后面加 ?token=密码'
          : '后台是旧版：部署 → 管理部署 → ✎ → 版本：新版本 → 部署'}</div>`}
    ${(STEPS.last || LOCAL.stepsLast || {}).warn === 'daily' ? `<div class="hint" style="color:var(--warn)">上次推送不是每日累计，没写入</div>` : ''}
    <div class="hint">HC Webhook：步数 · 步数分辨率「每日」· 间隔 30 分钟 · 电池不受限制</div>
    ${connected() ? `<div class="actions"><button class="btn" onclick="refreshWatch()">刷新</button></div>` : ''}`;
}
async function refreshWatch() {
  try { const r = await api('ping', { tz: TZ }, 30000); LOCAL.server = serverInfo(r); saveLocal(); } catch (e) { /* 下面一起提示 */ }
  const err = await pollSteps(true);
  renderSettings();
  toast(err === 'old' ? '后台是旧版' : err ? err : '已刷新');
}
async function copyHook() {
  const el = $('#hook-url');
  if (!el) return;
  try { await navigator.clipboard.writeText(el.value); toast('已复制'); return; } catch (e) { /* iframe 里可能不允许，退回到选中复制 */ }
  el.focus(); el.select();
  try { document.execCommand('copy'); toast('已复制'); } catch (e) { toast('已选中，长按复制'); }
}
function setStr(k, v) { setSetting(k, v); renderSettings(); }
function setDayKcal(i, v) {
  const arr = (cfg().dayKcal || DEFAULT_SETTINGS.dayKcal).slice();
  arr[i] = num(v) || arr[i];
  setSetting('dayKcal', arr);
  renderSettings();
}
function addOverride() {
  const from = $('#ov-from').value, to = $('#ov-to').value, kcal = num($('#ov-kcal').value);
  if (!from || !to || to < from || !kcal) { toast('填写日期和热量'); return; }
  const list = (cfg().overrides || []).concat([{ id: uid('o_'), from, to, kcal, label: $('#ov-label').value.trim() }]);
  setSetting('overrides', list);
  renderSettings();
  toast('已添加');
}
function delOverride(id) {
  setSetting('overrides', (cfg().overrides || []).filter(o => o.id !== id));
  renderSettings();
}

async function reloadFromSheet() {
  if (OUTBOX.length && !await ask(`先上传 ${OUTBOX.length} 条修改？`)) return;
  await syncNow(true);
}

async function clearLocal() {
  const warn = OUTBOX.length ? `${OUTBOX.length} 条未同步的修改会丢失\n` : '';
  if (!await ask(warn + '清除本机缓存？', { ok: '清除', danger: true })) return;
  const keepAI = DB.ai;
  DB = seedDB(); DB.ai = keepAI; OUTBOX = [];
  saveDB(); saveOutbox();
  if (connected()) syncNow(true); else rerender();
  toast('已清除');
}

// ════════════════════════════════════════════
// 导航 & 启动
// ════════════════════════════════════════════
const TAB_ORDER = ['today', 'week', 'body', 'foods', 'settings'];
let BOOTED = false;
function go(tab) {
  const prev = VIEW.tab, prevEl = $('#scr-' + prev), y0 = window.scrollY;
  VIEW.tab = tab;
  document.querySelectorAll('.scr').forEach(el => el.classList.toggle('on', el.id === 'scr-' + tab));
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('on', b.id === 'nav-' + tab));
  document.querySelector('.nav').style.setProperty('--nav-i', TAB_ORDER.indexOf(tab));   // 滑动指示器的位置
  window.scrollTo(0, 0);
  const el = $('#scr-' + tab), dir = Math.sign(TAB_ORDER.indexOf(tab) - TAB_ORDER.indexOf(prev)) || 1;
  if (BOOTED && prev !== tab) playTx(prevEl, el, y0, tab, dir);
  BOOTED = true;
  enterScreen(el, dir);
  rerender();
  staggerCards(el);
  SCROLL.y = 0; scrollTick();
}
// 主题转场：旧页面留在下面（固定在原来的滚动位置），新页面按主题的方式盖上来；#tx 是转场装饰层
const TX_CMD = { today: 'cd ~/today', week: 'cd ~/week', body: 'cd ~/body', foods: 'cd ~/foods', settings: 'cd ~/settings' };
function playTx(prevEl, el, y0, tab, dir, cmd) {
  if (REDUCED()) return;
  document.querySelectorAll('.scr-clone').forEach(e => e.remove());
  document.querySelectorAll('.scr.leaving').forEach(e => { e.classList.remove('leaving', 'tear-l'); e.style.top = ''; });
  const btn = $('#nav-' + tab).getBoundingClientRect(), box = el.getBoundingClientRect();
  const x = btn.left + btn.width / 2, y = btn.top + btn.height / 2;
  const R = Math.ceil(Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))) + 40;
  const set = (e, vars) => { for (const k in vars) e.style.setProperty(k, vars[k]); };
  const D = dir > 0 ? 'f' : 'b';           // f = 点了右边的标签，b = 点了左边的（决定翻页 / 横扫 / 飞艇的方向）
  el.dataset.dir = D;
  el.classList.toggle('solo', !prevEl);   // 没有旧页面垫底（换主题时）：遮罩型转场不先把页面藏起来
  set(el, { '--tx-x': (x - box.left) + 'px', '--tx-y': (y - box.top) + 'px', '--tx-r': R + 'px', '--dir': dir });
  if (prevEl) {
    set(prevEl, { '--tx-x': (x - box.left) + 'px', '--tx-y': (y + y0) + 'px', '--tx-r': R + 'px', '--dir': dir, '--y0': y0 + 'px' });
    prevEl.dataset.dir = D;
    prevEl.style.top = -y0 + 'px';
    prevEl.classList.remove('entering');
    prevEl.classList.add('leaving');
    // 狩猎这类「撕开」的转场：复制一份旧页面，两份各裁一半（CSS 里的 tear-l / tear-r）
    if (getComputedStyle(document.documentElement).getPropertyValue('--tx-split').trim() === '1') {
      const c = prevEl.cloneNode(true);
      c.removeAttribute('id'); c.querySelectorAll('[id]').forEach(n => n.removeAttribute('id'));
      c.classList.add('scr-clone', 'tear-r'); c.setAttribute('aria-hidden', 'true'); c.inert = true;
      prevEl.classList.add('tear-l');
      prevEl.after(c);
      setTimeout(() => c.remove(), 950);
    }
    clearTimeout(prevEl._lt);
    prevEl._lt = setTimeout(() => { prevEl.classList.remove('leaving', 'tear-l'); prevEl.style.top = ''; }, 950);
  }
  const tx = $('#tx');
  set(tx, { '--tx-x': (x - box.left) + 'px', '--tx-y': y + 'px', '--tx-r': R + 'px', '--dir': dir });
  tx.dataset.dir = D;
  tx.classList.toggle('solo', !prevEl);
  tx.dataset.cmd = cmd || TX_CMD[tab] || '';
  tx.style.setProperty('--cmd-n', tx.dataset.cmd.length + 3);
  tx.classList.remove('run');
  void tx.offsetWidth;
  tx.classList.add('run');
  clearTimeout(tx._t);
  tx._t = setTimeout(() => tx.classList.remove('run'), 1000);
}
// 页面切换动画：每个主题有自己的进场方式（CSS 里的 --page-in）
function enterScreen(el, dir) {
  ANIM.enter = true;
  if (!el || REDUCED()) return;
  el.style.setProperty('--dir', dir);
  el.classList.remove('entering');
  void el.offsetWidth;
  el.classList.add('entering');
  staggerCards(el);
  clearTimeout(el._et);
  const ms = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--enter-ms')) || 950;   // 有错落进场的主题留得久一点
  el._et = setTimeout(() => el.classList.remove('entering'), ms);
}
// 进场时卡片的先后顺序：--ci 从上往下数第几张（看不到的放最后）；
// --cr 离刚点的导航按钮有多远（0 = 最近，1 = 最远），给「从按钮处圆形展开」的主题用，让卡片跟着展开的边缘依次落定
function staggerCards(el) {
  if (!el || REDUCED()) return;
  const b = document.getElementById('nav-' + VIEW.tab), r = b ? b.getBoundingClientRect() : null;
  const x = r ? r.left + r.width / 2 : innerWidth / 2, y = r ? r.top + r.height / 2 : innerHeight;
  const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) || 1;
  let i = 0;
  el.querySelectorAll('.card').forEach(c => {
    const q = c.getBoundingClientRect(), vis = q.top < innerHeight + 40;
    const dx = Math.max(q.left - x, 0, x - q.right), dy = Math.max(q.top - y, 0, y - q.bottom);
    c.style.setProperty('--ci', vis ? Math.min(i++, 7) : 8);
    c.style.setProperty('--cr', vis ? Math.min(1, Math.hypot(dx, dy) / R).toFixed(2) : 1);
  });
}
function rerender() {
  const t = VIEW.tab;
  if (t === 'today') renderToday();
  else if (t === 'week') renderWeek();
  else if (t === 'body') renderBody();
  else if (t === 'foods') renderFoods();
  else if (t === 'settings') renderSettings();
  setSync(syncState);
}

let lastSeenDay = today();
function onWake() {
  const t = today();
  if (t !== lastSeenDay) {
    if (VIEW.date === lastSeenDay) VIEW.date = t;
    lastSeenDay = t;
    COMPOSE.meal = mealByTime();
    rerender();
  }
  if (connected() && Date.now() - (LOCAL.lastPull || 0) > 60000) syncNow();
  else pollSteps(true);
}

// ════════════════════════════════════════════
// 密码锁屏
// ════════════════════════════════════════════
function showLock(msg) {
  $('#lock').classList.add('open');
  const u = $('#lock-url');
  u.style.display = IN_APP ? '' : 'none';
  if (IN_APP && !u.value) u.value = LOCAL.apiUrl || '';
  $('#lock-err').textContent = msg || (LOCAL.token ? '密码不正确，请重新输入' : '');
  setTimeout(() => (IN_APP && !u.value ? u : $('#lock-in')).focus(), 100);
}
async function unlock() {
  if (IN_APP) {   // App 里先填网址
    const p = parseApiUrl($('#lock-url').value);
    if (!p) { $('#lock-err').textContent = '网址要以 /exec 结尾'; return; }
    LOCAL.apiUrl = p.url;
    if (p.token && !$('#lock-in').value.trim()) $('#lock-in').value = p.token;
    $('#local-banner').style.display = 'none';
  }
  const v = $('#lock-in').value.trim();
  if (!v) return;
  LOCAL.token = v; saveLocal();
  $('#lock-err').innerHTML = '<span class="spin"></span>验证中…';
  try {
    await connectServer();
    $('#lock').classList.remove('open');
    $('#lock-in').value = '';
  } catch (e) {
    $('#lock-err').textContent = e.auth ? '密码不正确，请重新输入' : e.message;
  }
}
async function lockNow() {
  if (!await ask(IN_APP ? '重新填写网址和密码？' : '退出后需要重新输入密码', { ok: IN_APP ? '重新填写' : '退出' })) return;
  LOCAL.token = ''; saveLocal();
  showLock(' ');
}

const serverInfo = r => ({ sheetUrl: r.sheetUrl, aiReady: !!r.aiReady, hookUrl: r.hookUrl || '', v2: 'hookUrl' in r, models: (r.models || []).map(m => Object.assign({}, AI_MODELS.find(x => x.id === m.id) || {}, m)) });
async function connectServer() {
  const r = await api('ping', { tz: TZ }, 60000);
  LOCAL.server = serverInfo(r);
  if (r.defaultModel && !DB.settings.aiModel) DB.settings.aiModel = r.defaultModel;
  saveLocal();
  await syncNow();
  if (VIEW.tab === 'settings') renderSettings();
}

// 安卓 App：返回键先关弹层、再回今日、最后退出；状态栏颜色跟主题走
function appSetup() {
  const P = (window.Capacitor && Capacitor.Plugins) || {};
  if (P.App && P.App.addListener) P.App.addListener('backButton', () => {
    if ($('#dlg-bg').classList.contains('open')) $('#dlg-cancel').click();
    else if ($('#sheet-bg').classList.contains('open')) closeSheet();
    else if ($('#lock').classList.contains('open') || VIEW.tab === 'today') P.App.exitApp();
    else go('today');
  });
  appStatusBar();
}
function appStatusBar() {
  const P = IN_APP && window.Capacitor.Plugins;
  if (!P) return;
  const cs = getComputedStyle(document.documentElement);
  const c = document.createElement('canvas').getContext('2d');
  c.fillStyle = '#000000'; c.fillStyle = cs.getPropertyValue('--bg').trim();   // 任意颜色写法 → #rrggbb
  const hex = /^#[0-9a-f]{6}$/i.test(c.fillStyle) ? c.fillStyle : '#000000';
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  const style = r * .299 + g * .587 + b * .114 > 150 ? 'LIGHT' : 'DARK';   // LIGHT = 深色图标（浅色背景用）
  // 新系统（安卓 15+）状态栏是透明的，页面顶栏直接延伸上去，只需要换图标深浅；旧系统再把状态栏涂成主题底色
  [P.SystemBars, P.StatusBar].forEach(x => { try { if (x && x.setStyle) x.setStyle({ style }).catch(() => {}); } catch (e) { /* 不支持就算了 */ } });
  try { if (P.StatusBar && P.StatusBar.setBackgroundColor) P.StatusBar.setBackgroundColor({ color: hex }).catch(() => {}); } catch (e) { /* 同上 */ }
}

function init() {
  applyTheme();
  applyStaticFolds();
  $('#local-banner').style.display = connected() ? 'none' : '';
  DB.ai.forEach(a => { if (a.status === 'sending' || a.status === 'pending') { a.status = 'error'; a.error = '上次没有完成，请重新发送'; } });
  DB.ai = DB.ai.filter(a => !['added', 'dismissed'].includes(a.status) || Date.now() - a.createdAt < 86400000);
  saveDB();
  if (!connected()) ensureFormula();
  go('today');
  if (connected()) {
    connectServer().catch(e => { if (!e.auth) setSync('err', e.message); });   // 密码不对时 api() 会弹出锁屏
  } else if (IN_APP) showLock(' ');   // App 第一次打开：填网址和密码
  if (IN_APP) appSetup();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) onWake(); });
  window.addEventListener('online', () => flush());
  window.addEventListener('pageshow', e => { if (e.persisted) onWake(); });
}
init();
