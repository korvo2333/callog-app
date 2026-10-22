// ════════════════════════════════════════════
// 今日页
// ════════════════════════════════════════════
const COMPOSE = { meal: mealByTime(), file: null, url: '' };

function shiftDay(n) {
  VIEW.date = addDays(VIEW.date, n);
  if (VIEW.date > today()) VIEW.date = today();
  renderToday();
}
function gotoToday() { VIEW.date = today(); COMPOSE.meal = mealByTime(); renderToday(); }
function gotoDay(d) { VIEW.date = d; go('today'); }

function renderToday() {
  placeMods($('#scr-today'), 'today');
  const d = VIEW.date, isToday = d === today();
  $('#t-date').textContent = isToday ? '今天' : dateLabel(d);
  $('#t-sub').textContent = isToday ? dateLabel(d) : '回到今天';
  renderComposeMeal();
  renderHero();
  renderActivity();
  renderMuscles();
  renderBodyQuick();
  renderAI();
  renderList();
  renderTimeline();
  setSync(syncState);
}

function macroRow(label, val, target, color, w0) {
  const pct = target > 0 ? Math.min(100, val / target * 100) : 0;
  return `<div>
    <div class="mrow-top"><span><i class="dot" style="background:var(${color})"></i>${label}</span>
      <span><b class="num">${Math.round(val)}</b> / ${target}g</span></div>
    <div class="bar"><i style="width:${w0 === undefined ? pct : w0}%;background:var(${color})" data-w="${pct}"></i></div>
  </div>`;
}
function macroMini(label, val, target, color, w0) {
  const pct = target > 0 ? Math.min(100, val / target * 100) : 0;
  return `<div class="mm"><div class="mm-t"><span>${label}</span><b class="num">${Math.round(val)}</b><small>/${target}</small></div>
    <div class="bar"><i style="width:${w0 === undefined ? pct : w0}%;background:var(${color})" data-w="${pct}"></i></div></div>`;
}

// 主卡：圆环 + 数字。进入页面 / 数值变化时，圆环和数字从旧值动画到新值（各主题的圆环会跟着「生长」）
const HERO = { date: '', shown: null, raf: 0 };
function heroTop(info, k) {
  const view = Object.assign({}, info, { intake: k });
  const remain = Math.round(info.target - k.kcal);
  const over = remain < 0;
  const def = Math.round(info.tdee - k.kcal);
  const big = fmt(Math.abs(remain));
  return `<div class="ring">${ringSVG(view)}
        <div class="ring-c"><div class="hero-num${big.length >= 5 ? ' long' : ''}">${big}</div>
          <div class="hero-lb">${over ? '超出' : '剩余'} kcal</div></div>
      </div>
      <div class="hero-side">
        <div class="hero-big"><b class="num">${big}</b><span>${over ? '超出' : '剩余'} kcal</span></div>
        <div class="kv"><span>目标</span><b class="num">${fmt(info.target)}</b></div>
        <div class="kv"><span>已摄入</span><b class="num">${fmt(k.kcal)}</b></div>
        ${info.mode === 'formula' ? `<div class="kv"><span>消耗</span><b class="num">${fmt(info.tdee)}</b></div>`
          : info.burn ? `<div class="kv"><span>消耗</span><b class="num">${fmt(info.burn)}</b></div>` : ''}
        <div class="kv"><span>${def >= 0 ? '缺口' : '盈余'}</span><b class="num">${fmt(Math.abs(def))}</b></div>
        ${info.label ? `<div><span class="tag">${esc(info.label)}</span></div>` : ''}
      </div>`;
}
function renderHero() {
  const info = dayInfo(VIEW.date);
  const to = info.intake;
  const K = ['kcal', 'protein', 'fat', 'carb'];
  let from = null;
  if (!REDUCED()) {
    if (ANIM.enter || HERO.date !== VIEW.date || !HERO.shown) from = { kcal: 0, protein: 0, fat: 0, carb: 0 };
    else if (K.some(k => Math.abs(HERO.shown[k] - to[k]) >= 0.5)) from = Object.assign({}, HERO.shown);
    if (from && K.every(k => Math.abs(from[k] - to[k]) < 0.5)) from = null;
  }
  ANIM.enter = false;
  HERO.date = VIEW.date;
  cancelAnimationFrame(HERO.raf);
  const start = from || to;
  const w0 = (v, t) => from ? (t > 0 ? Math.min(100, v / t * 100) : 0) : undefined;
  const mf = isFolded('today:macros');
  $('#t-hero-in').innerHTML = `
    <div class="hero">${heroTop(info, start)}</div>
    <div class="mac-wrap ${mf ? 'folded' : ''}" data-fold="today:macros">
      <div class="fold mac-full"><div class="fold-in"><div class="macros" ${foldAttrs('today:macros')} aria-label="收起营养素">
        ${macroRow('蛋白质', to.protein, info.proteinT, '--protein', w0(start.protein, info.proteinT))}
        ${macroRow('脂肪', to.fat, info.fatT, '--fat', w0(start.fat, info.fatT))}
        ${macroRow('碳水', to.carb, info.carbT, '--carb', w0(start.carb, info.carbT))}
      </div></div></div>
      <div class="fold mac-mini"><div class="fold-in"><div class="macros-mini" ${foldAttrs('today:macros')} aria-label="展开营养素">
        ${macroMini('蛋白', to.protein, info.proteinT, '--protein', w0(start.protein, info.proteinT))}
        ${macroMini('脂肪', to.fat, info.fatT, '--fat', w0(start.fat, info.fatT))}
        ${macroMini('碳水', to.carb, info.carbT, '--carb', w0(start.carb, info.carbT))}
      </div></div></div>
      <button class="mac-tog" onclick="toggleFold(this)" aria-label="展开 / 收起营养素">${FOLD_IC}</button>
    </div>`;
  if (ANIM.react) setTimeout(heroReact, 30);
  if (!from) { HERO.shown = Object.assign({}, to); return; }
  // 营养条：先画旧宽度，下一帧换成新宽度，由 CSS 过渡
  requestAnimationFrame(() => $('#t-hero-in').querySelectorAll('.bar i[data-w]').forEach(i => { i.style.width = i.dataset.w + '%'; }));
  const top = $('#t-hero-in .hero'), t0 = performance.now(), D = 950;
  const ease = t => 1 - Math.pow(1 - t, 3);
  const step = now => {
    const t = Math.min(1, (now - t0) / D), e = ease(t);
    const k = {}; K.forEach(x => { k[x] = from[x] + (to[x] - from[x]) * e; });
    HERO.shown = k;
    top.innerHTML = heroTop(info, k);
    if (t < 1) HERO.raf = requestAnimationFrame(step);
    else HERO.shown = Object.assign({}, to);
  };
  HERO.raf = requestAnimationFrame(step);
}

// 本周剩余：今天之后的天平均每天可吃多少（今天按目标算，吃超了才摊到后面）
function weekLeftHTML(w, detail) {
  const t = w.todayD;
  if (!t) return '';
  if (!w.future.length) {
    const x = Math.round(w.lastDayLeft);
    return x >= 0 ? `本周还可吃 <b>${fmt(x)}</b>` : `本周超出 <b>${fmt(-x)}</b>`;
  }
  const diff = Math.round(w.futureDiff / 10) * 10;
  return `剩余 ${w.future.length} 天 日均 <b>${fmt(w.futurePerDay)}</b>` + (diff ? `（${diff > 0 ? '+' : '−'}${fmt(Math.abs(diff))}）` : '');
}

function renderBodyQuick() {
  const d = VIEW.date;
  const rec = DB.body.find(b => b.date === d && b.weight);
  const plan = planAt(d, 'Weight');
  if (!rec) {
    $('#t-body').innerHTML = `<div class="bq">
      <span class="bq-v">体重${plan ? `<span class="muted" style="font-size:12px"> · 计划 ${plan.toFixed(1)}</span>` : ''}</span>
      <input class="in sm" id="bq-w" type="number" step="0.1" inputmode="decimal" placeholder="kg"
        onkeydown="if(event.key==='Enter')quickWeight()">
      <button class="btn pri" onclick="quickWeight()">记录</button></div>`;
  } else {
    const a = avg7(d, weightsSorted());
    $('#t-body').innerHTML = `<div class="bq" onclick="go('body')" style="cursor:pointer">
      <span class="bq-v">体重 <b class="num">${rec.weight.toFixed(1)}</b> kg
        <span class="muted">· 7日均 ${a ? a.toFixed(1) : '—'}${plan ? ` · 计划 ${plan.toFixed(1)}` : ''}</span></span>
      <span class="muted">›</span></div>`;
  }
}

function quickWeight() {
  const w = num($('#bq-w').value);
  if (!w || w < 20 || w > 300) { toast('体重数值不对'); return; }
  const ex = DB.body.find(b => b.date === VIEW.date);
  upsertRow('body', Object.assign({ id: ex ? ex.id : uid('b_'), date: VIEW.date, bodyfat: null, muscle: null, note: '' }, ex || {}, { weight: w }));
  toast(`已记录 ${w} kg`);
  renderBodyQuick();
  if (VIEW.tab === 'body') renderBody();
}

// 常吃的食物（食物库选择器里的「常吃」分组用）
function topFoods(n) {   // 只显示吃过的，按次数排序
  return DB.foods.filter(f => (f.uses || 0) > 0).sort((a, b) => (b.uses || 0) - (a.uses || 0) || (a.sort || 0) - (b.sort || 0)).slice(0, n);
}
function addFoodLog(f, mult, meal, date) {
  date = date || VIEW.date;
  const e = {
    id: uid('l_'), date, time: date === today() ? nowHM() : '', meal: meal || COMPOSE.meal,
    name: f.name, kcal: r1(f.kcal * mult), protein: r1(f.protein * mult), fat: r1(f.fat * mult), carb: r1(f.carb * mult),
    type: 'food', foodId: f.id, note: (mult !== 1 ? `×${mult} · ` : '') + (f.serving || '')
  };
  upsertRow('log', e);
  upsertRow('foods', { id: f.id, uses: (f.uses || 0) + 1 });
  return e;
}

// 记录列表
function renderList() {
  const info = dayInfo(VIEW.date);
  if (!info.entries.length) {
    $('#t-list').innerHTML = `<div class="empty">还没有记录</div>`;
    return;
  }
  const byTime = (a, b) => (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0;
  let html = '';
  MEALS.concat(['']).forEach(m => {
    const list = info.foods.filter(e => (m ? e.meal === m : !MEALS.includes(e.meal))).sort(byTime);
    if (!list.length) return;
    const key = 'meal:' + (m || '其他');
    html += `<div class="meal ${isFolded(key) ? 'folded' : ''}" data-fold="${key}"><div class="meal-h fold-t" ${foldAttrs(key)}><span>${m || '其他'}<small class="meal-n">${list.length}</small></span><span class="num">${fmt(sum(list, 'kcal'))} kcal</span>${FOLD_IC}</div>
      <div class="fold"><div class="fold-in">${list.map(e => `<div class="ent" onclick="editEntry('${e.id}')">
        <div class="ent-i"><div class="ent-n">${esc(e.name)}</div>
          <div class="ent-s">${e.note ? esc(e.note) + ' · ' : ''}P${r1(e.protein)} F${r1(e.fat)} C${r1(e.carb)}</div></div>
        <div class="ent-k num">${fmt(e.kcal)}</div></div>`).join('')}</div></div></div>`;
  });
  const burns = info.entries.filter(e => e.type === 'burn');
  if (burns.length && info.mode === 'formula') {
    html += `<div class="meal ${isFolded('meal:burn') ? 'folded' : ''}" data-fold="meal:burn"><div class="meal-h fold-t" ${foldAttrs('meal:burn')}><span>有氧<small class="meal-n">${burns.length}</small></span><span class="num">+${fmt(info.burn)} kcal</span>${FOLD_IC}</div>
      <div class="fold"><div class="fold-in">${burns.map(e => `<div class="ent cd-ent" onclick="editEntry('${e.id}')">
        <span class="act-ic sm" aria-hidden="true">${cardioIcon(cardioKind(e))}</span>
        <div class="ent-i"><div class="ent-n">${esc(e.name)}</div><div class="ent-s">${burnMins(e) ? `${fmt(burnMins(e))} 分钟 · 手表 ${fmt(e.kcal)}` : `手表 ${fmt(e.kcal)} × ${cardioPct(e)}%`}</div></div>
        <div class="ent-k burn num">+${fmt(cardioCounted(e))}</div></div>`).join('')}</div></div></div>`;
  } else if (burns.length) {
    html += `<div class="meal ${isFolded('meal:burn') ? 'folded' : ''}" data-fold="meal:burn"><div class="meal-h fold-t" ${foldAttrs('meal:burn')}><span>消耗<small class="meal-n">${burns.length}</small></span><span class="num">${fmt(info.burn)} kcal</span>${FOLD_IC}</div>
      <div class="fold"><div class="fold-in">${burns.map(e => `<div class="ent" onclick="editEntry('${e.id}')">
        <div class="ent-i"><div class="ent-n">${esc(e.name)}</div></div>
        <div class="ent-k burn num">−${fmt(e.kcal)}</div></div>`).join('')}</div></div></div>`;
  }
  $('#t-list').innerHTML = html;
}

// ════════════════════════════════════════════
// 编辑记录 / 手动添加 / 消耗
// ════════════════════════════════════════════
function editEntry(id) {
  const e = DB.log.find(x => x.id === id);
  if (!e) return;
  if (e.type === 'burn') return openBurn(e);
  if (e.type === 'strength') return toggleStrength();
  openSheet('编辑记录', `
    <input class="in" id="e-name" value="${esc(e.name)}" placeholder="名称">
    <input class="in" id="e-note" value="${esc(e.note)}" placeholder="份量" style="margin-top:8px">
    <label class="tm-row"><span>时间</span><input class="in" type="time" id="e-time" value="${esc(e.time)}"></label>
    <div style="margin-top:10px">${segHTML('e-meal', MEALS, e.meal)}</div>
    <div style="margin-top:12px">${macroInputs('e', e)}</div>
    <div class="chips" style="margin-top:10px">
      <button class="chip" onclick="scaleInputs('e',0.5)">×0.5</button>
      <button class="chip" onclick="scaleInputs('e',1.5)">×1.5</button>
      <button class="chip" onclick="scaleInputs('e',2)">×2</button>
      <button class="chip" onclick="entryToFood('${id}')">☆ 存入食物库</button>
    </div>
    <div class="actions">
      <button class="btn danger" style="flex:0 0 auto" onclick="delEntry('${id}')">删除</button>
      <button class="btn pri" onclick="saveEntry('${id}')">保存</button>
    </div>`);
}
function saveEntry(id) {
  const m = readMacros('e');
  upsertRow('log', Object.assign({ id, name: $('#e-name').value.trim() || '未命名', note: $('#e-note').value.trim(), time: $('#e-time').value || '', meal: segVal('e-meal') }, m));
  closeSheet(); renderToday();
}
function delEntry(id) {
  const e = DB.log.find(x => x.id === id);
  deleteRow('log', id);
  closeSheet(); renderToday();
  if (e) toast('已删除', '撤销', () => { upsertRow('log', e); renderToday(); });
}
function entryToFood(id) {
  const e = DB.log.find(x => x.id === id);
  if (!e) return;
  const m = readMacros('e');
  const name = $('#e-name').value.trim() || e.name;
  if (DB.foods.some(f => f.name === name)) { toast('已有同名食物'); return; }
  upsertRow('foods', Object.assign({ id: uid('f_'), name, category: '', serving: $('#e-note').value.trim(), uses: 1, sort: DB.foods.length + 1 }, m));
  toast('已存入食物库');
}

function openManual() {
  openSheet('手动添加', `
    <input class="in" id="m-name" placeholder="名称">
    <input class="in" id="m-note" placeholder="份量" style="margin-top:8px">
    <label class="tm-row"><span>时间</span><input class="in" type="time" id="m-time" value="${VIEW.date === today() ? nowHM() : ''}"></label>
    <div style="margin-top:10px">${segHTML('m-meal', MEALS, COMPOSE.meal)}</div>
    <div style="margin-top:12px">${macroInputs('m')}</div>
    <label class="row" style="margin-top:12px;font-size:14px;gap:8px">
      <input type="checkbox" id="m-save" style="width:18px;height:18px;accent-color:var(--accent)"> 存入食物库
    </label>
    <div class="actions"><button class="btn pri" onclick="saveManual()">添加</button></div>`);
  setTimeout(() => $('#m-name') && $('#m-name').focus(), 300);
}
function saveManual() {
  const m = readMacros('m');
  if (!m.kcal) { toast('填写热量'); return; }
  const name = $('#m-name').value.trim() || '未命名食物';
  const note = $('#m-note').value.trim();
  const meal = segVal('m-meal');
  let foodId = '';
  if ($('#m-save').checked) {
    const f = upsertRow('foods', Object.assign({ id: uid('f_'), name, category: '', serving: note, uses: 1, sort: DB.foods.length + 1 }, m));
    foodId = f.id;
  }
  upsertRow('log', Object.assign({ id: uid('l_'), date: VIEW.date, time: $('#m-time').value || '', meal, name, note, type: 'food', foodId }, m));
  closeSheet(); renderToday();
  toast('已添加');
}

// ════════════════════════════════════════════
// 活动：步数（手表）+ 力量（只选练没练）+ 有氧（手填手表数字）→ 今天的目标
// ════════════════════════════════════════════
const ACT_IC = {
  steps: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 3.5c1.7 0 2.6 1.8 2.6 4.2 0 2-1 3.3-1.1 4.8H6.6C6.2 10.6 5.6 9.3 5.6 7.4 5.6 5 6.8 3.5 8.5 3.5z"/><path d="M6.7 15.3h3.4v1.4a1.7 1.7 0 0 1-3.4 0z"/><path d="M15.5 7.5c1.7 0 2.9 1.5 2.9 3.9 0 1.9-.6 3.2-1 5.1H14c-.1-1.5-1.1-2.8-1.1-4.8 0-2.4.9-4.2 2.6-4.2z"/><path d="M13.9 19.3h3.4v1.4a1.7 1.7 0 0 1-3.4 0z"/></svg>',
  lift: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/></svg>',
  label: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M8 9h8M8 12h8M8 15h5"/></svg>',
  cardio: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h4l2-5 4 10 2-5h6"/></svg>'
};
function agoText(iso) {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (!isFinite(m)) return '';
  if (m < 1) return '刚刚';
  if (m < 60) return m + ' 分钟前';
  if (m < 60 * 24) return Math.floor(m / 60) + ' 小时前';
  return Math.floor(m / 1440) + ' 天前';
}
function renderActivity() {
  const el = $('#t-act');
  if (!el) return;
  const d = VIEW.date, info = dayInfo(d);
  if (info.mode !== 'formula') { el.style.display = 'none'; el.innerHTML = ''; return; }
  el.style.display = '';
  const s = cfg(), p = info.parts, st = p.steps, isT = d === today();
  const last = STEPS.last || LOCAL.stepsLast;
  let sub;
  if (st.src === 'manual') sub = '手动';
  else if (isT && last && last.warn === 'daily') sub = '<span class="act-warn">分辨率要选「每日」</span>';
  else if (st.src === 'watch') sub = isT && last && last.at ? agoText(last.at) : '手表';
  else if (st.src === 'wait') sub = '未同步';
  else sub = `按平时 ${fmt(st.usual)}`;
  const shown = st.actual !== null ? st.actual : st.n;
  el.innerHTML = `
    <button class="act-steps" onclick="openSteps()">
      <span class="act-ic">${ACT_IC.steps}</span>
      <span class="act-v"><span><b class="num">${fmt(shown)}</b> 步</span><small>${sub}</small></span>
      <span class="act-k num">+${fmt(p.stepsK)}</span>
    </button>
    <div class="act-two">
      <button class="act-tog ${p.strength ? 'on' : ''}" role="switch" aria-checked="${p.strength}" onclick="toggleStrength()">
        <span class="act-sw" aria-hidden="true"><i></i></span>
        <span class="act-txt"><span class="act-lb">力量</span><span class="act-k num">${p.strength ? '+' + fmt(p.strengthK) : '—'}</span></span>
      </button>
      <button class="act-add" onclick="openBurn()">
        <span class="act-txt"><span class="act-lb">${ACT_IC.cardio}有氧</span><span class="act-k num">${p.cardioK ? '+' + fmt(p.cardioK) : '—'}</span></span>
        <span class="act-plus" aria-hidden="true">＋</span></button>
    </div>
    <div class="act-why ${isFolded('today:why') ? 'folded' : ''}" data-fold="today:why">
      <div class="act-why-t fold-t" ${foldAttrs('today:why')}><span>消耗 <b class="num">${fmt(p.E)}</b> − 缺口 <b class="num">${fmt(p.deficit)}</b> = <b class="num">${fmt(info.target)}</b></span>${FOLD_IC}</div>
      <div class="fold"><div class="fold-in"><table class="why">
        <tr><td>基础</td><td class="num">${fmt(p.rest)}</td></tr>
        <tr><td>步数${st.src === 'usual' || st.src === 'none' ? '（平时）' : ''}</td><td class="num">+${fmt(p.stepsK)}</td></tr>
        ${p.strengthK ? `<tr><td>力量${p.future ? '（预估）' : ''}</td><td class="num">+${fmt(p.strengthK)}</td></tr>` : ''}
        ${p.cardioK ? `<tr><td>有氧</td><td class="num">+${fmt(p.cardioK)}</td></tr>` : ''}
        <tr class="sum"><td>消耗</td><td class="num">${fmt(p.E)}</td></tr>
        <tr><td>缺口</td><td class="num">−${fmt(p.deficit)}</td></tr>
        ${p.floorHit ? `<tr><td>下限</td><td class="num">${fmt(s.bmr)}</td></tr>` : ''}
        ${info.label ? `<tr><td>${esc(info.label)}</td><td class="num">${fmt(info.target)}</td></tr>` : ''}
        <tr class="sum"><td>目标</td><td class="num">${fmt(info.target)}</td></tr>
      </table></div></div>
    </div>`;
}

function toggleStrength() {
  const d = VIEW.date;
  const ex = DB.log.find(e => e.date === d && e.type === 'strength');
  if (ex) deleteRow('log', ex.id);
  else upsertRow('log', { id: uid('l_'), date: d, time: d === today() ? nowHM() : '', meal: '', type: 'strength', name: '力量训练', kcal: 0, protein: 0, fat: 0, carb: 0, note: '', foodId: '' });
  renderToday();
  if (!ex) toast(`力量 +${fmt(num(cfg().strengthKcal))}`);
}

function openSteps() {
  const d = VIEW.date, st = stepsFor(d), a = stepsActual(d);
  const row = (DB.steps || []).find(r => r.date === d);
  const watch = row && row.watch !== '' ? +row.watch : null;
  const last = STEPS.last || LOCAL.stepsLast;
  openSheet('步数', `
    ${last && last.warn === 'daily' ? `<div class="hint" style="margin:0 0 8px;color:var(--warn)">HC Webhook → 步数分辨率 → 每日</div>` : ''}
    <div class="muted">手表 ${watch !== null ? `<b class="num">${fmt(watch)}</b>` : '—'}${last && last.at ? ` · ${agoText(last.at)}` : ''} · 平时 ${fmt(st.usual)}</div>
    <input class="in" id="st-n" type="number" inputmode="numeric" placeholder="手动" value="${a && a.src === 'manual' ? a.n : ''}" style="margin-top:10px">
    <div class="actions">
      ${a && a.src === 'manual' ? `<button class="btn" style="flex:0 0 auto" onclick="saveSteps(true)">清空</button>` : ''}
      ${connected() ? `<button class="btn" style="flex:0 0 auto" onclick="pollSteps(true).then(()=>{closeSheet();toast('已刷新')})">刷新</button>` : ''}
      <button class="btn pri" onclick="saveSteps()">保存</button>
    </div>`);
}
function saveSteps(clear) {
  const v = clear ? '' : $('#st-n').value.trim();
  if (!clear && (v === '' || !isFinite(+v) || +v < 0 || +v > 100000)) { toast('步数不对'); return; }
  setStepsManual(VIEW.date, clear ? null : +v);
  closeSheet(); renderToday();
}

// 有氧：名称 + 手表显示的消耗 + 计入 %（默认用设置里的比例）
function openBurn(e) {
  const editing = e && e.id;
  const legacy = !formulaOn(editing ? e.date : VIEW.date);
  if (legacy) {   // 旧日子（新公式之前）：保持原来的「额外消耗」
    openSheet('消耗', `
      <input class="in" id="x-name" value="${esc(editing ? e.name : '')}" placeholder="名称">
      <input class="in" id="x-kcal" type="number" inputmode="numeric" value="${editing ? e.kcal : ''}" placeholder="kcal" style="margin-top:8px">
      <div class="actions">
        ${editing ? `<button class="btn danger" style="flex:0 0 auto" onclick="delEntry('${e.id}')">删除</button>` : ''}
        <button class="btn pri" onclick="saveBurn('${editing ? e.id : ''}')">保存</button>
      </div>`);
    return;
  }
  const k0 = editing ? cardioKind(e) : (LOCAL.cardioKind || 'ell');
  BURN = { k: k0, pct: editing ? cardioPct(e) : cardioKindPct(k0), k0 };
  openSheet('有氧', `
    <div class="cd-opts" role="radiogroup" aria-label="种类">
      ${CARDIO_KINDS.map(c => `<button class="cd-opt" data-k="${c.k}" role="radio" onclick="pickCardio('${c.k}')">
        <span class="act-ic">${cardioIcon(c.k)}</span><span class="cd-l">${c.name}</span><small class="num" data-pct="${c.k}">${c.mins ? '按时长' : cardioKindPct(c.k) + '%'}</small></button>`).join('')}
    </div>
    <input class="in" id="x-name" value="${esc(editing && k0 === 'other' && e.name !== '其他' && e.name !== '有氧' ? e.name : '')}" placeholder="名称（选填）：游泳、单车、拳击…" style="margin-top:10px">
    <div class="grid2 cd-in" id="x-in">
      <div><label class="lbl">手表显示的 kcal</label><input class="in" id="x-kcal" type="number" inputmode="numeric" value="${editing ? e.kcal : ''}" placeholder="0" oninput="burnPreview()"></div>
      <div class="cd-mins"><label class="lbl">时长（分钟）</label><input class="in" id="x-mins" type="number" inputmode="decimal" value="${editing && burnMins(e) ? burnMins(e) : ''}" placeholder="0" oninput="burnPreview()"></div>
    </div>
    <div class="preview cd-prev" id="x-prev"></div>
    <div class="hint">走路不用记：步数里已经算过了</div>
    <div class="actions">
      ${editing ? `<button class="btn danger" style="flex:0 0 auto" onclick="delEntry('${e.id}')">删除</button>` : ''}
      <button class="btn pri" onclick="saveBurn('${editing ? e.id : ''}')">保存</button>
    </div>`);
  pickCardio(k0, true);
  if (!editing) setTimeout(() => $('#x-kcal') && $('#x-kcal').focus(), 300);
}
// 当前打开的有氧表单：种类 + 计入 %（编辑旧记录时先沿用它自己存的比例，换了种类才按新种类的比例）
let BURN = { k: 'ell', pct: 70, k0: 'ell' };
function pickCardio(k, init) {
  if (!init) BURN.pct = k === BURN.k0 && BURN.keep ? BURN.keep : cardioKindPct(k);
  if (init) BURN.keep = BURN.pct;
  BURN.k = k;
  document.querySelectorAll('.cd-opt').forEach(b => {
    const on = b.dataset.k === k;
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
  });
  const c = CARDIO_KINDS.find(x => x.k === k) || CARDIO_KINDS[2];
  const pe = document.querySelector(`.cd-opt[data-k="${k}"] [data-pct]`);
  if (pe && !c.mins) pe.textContent = BURN.pct + '%';
  const nm = $('#x-name');
  if (nm) nm.style.display = k === 'other' ? '' : 'none';
  const xin = $('#x-in');
  if (xin) xin.classList.toggle('one', !c.mins);   // 只有椭圆机要填时长
  burnPreview();
}
function burnPreview() {
  const el = $('#x-prev');
  if (!el) return;
  const k = num($('#x-kcal').value), c = CARDIO_KINDS.find(x => x.k === BURN.k) || CARDIO_KINDS[2];
  const mins = c.mins && $('#x-mins') ? num($('#x-mins').value) : 0;
  BURN.calc = mins > 0 ? ellCalc(k, mins) : null;
  const r = BURN.calc;
  const def = cardioKindPct(BURN.k);   // 旧记录按当时的比例存的；和现在的默认不同时，给一个一键改成现在比例的按钮
  el.innerHTML = r
    ? `<div class="cd-prev-r"><span>计入</span><b class="num">+${fmt(r.counted)}</b><span>kcal</span></div>
      <div class="cd-prev-s num">${fmt(k)} × 90% − 静息 ${fmt(r.rest)} − 步数里已算 ${fmt(r.steps)}（${fmt(r.stepsN)} 步）</div>`
    : `<div class="cd-prev-r"><span>计入</span><b class="num">+${fmt(Math.round(k * BURN.pct / 100))}</b><span>kcal</span></div>
      <div class="cd-prev-s"><span class="num">${fmt(k)} × ${BURN.pct}%</span> · ${c.why}${c.mins ? '；填上时长会算得更准' : ''}</div>
      ${BURN.pct !== def ? `<button class="link cd-redo" onclick="burnUseDefault()">这条是按 ${BURN.pct}% 记的，改成现在的 ${def}%</button>` : ''}`;
}
function burnUseDefault() {
  BURN.pct = BURN.keep = cardioKindPct(BURN.k);
  const pe = document.querySelector(`.cd-opt[data-k="${BURN.k}"] [data-pct]`);
  if (pe) pe.textContent = BURN.pct + '%';
  burnPreview();
}
function saveBurn(id) {
  const k = num($('#x-kcal').value);
  if (!k) { toast('填写手表的 kcal'); return; }
  const mins = $('#x-mins') && BURN.k === 'ell' ? num($('#x-mins').value) : 0;
  if (mins < 0 || mins > 600) { toast('时长不对'); return; }
  if (mins > 0) burnPreview();   // 确保用最新的时长算
  const legacy = !$('.cd-opts');
  const old = id ? DB.log.find(x => x.id === id) : null;
  const c = CARDIO_KINDS.find(x => x.k === BURN.k) || CARDIO_KINDS[2];
  const name = legacy ? ($('#x-name').value.trim() || '额外消耗') : c.k === 'other' ? ($('#x-name').value.trim() || '其他') : c.name;
  if (!legacy) { LOCAL.cardioKind = c.k; saveLocal(); }   // 下次默认选上次的种类
  upsertRow('log', {
    id: id || uid('l_'), date: old ? old.date : VIEW.date, time: old ? old.time : VIEW.date === today() ? nowHM() : '', meal: '', type: 'burn',
    name, kcal: k, protein: 0, fat: 0, carb: 0, note: mins > 0 ? mins + ' 分钟' : '', foodId: '', ratio: legacy ? 0 : mins > 0 && BURN.calc ? BURN.calc.pct : BURN.pct
  });
  closeSheet(); renderToday();
}
