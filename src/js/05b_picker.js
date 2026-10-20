// ════════════════════════════════════════════
// 食物库选择器：在「今日」输入卡里点「食物库」弹出
// 先选分类 → 点食物展开份量 → 添加，直接记入当前这一餐；弹层不关，可以连着加好几样
// ════════════════════════════════════════════
let PICK = { cat: null, open: '', mult: 1, custom: false, q: '', added: [], anim: '' };
const PICK_MULTS = [0.5, 1, 1.5, 2, 3];
const byUse = (a, b) => (b.uses || 0) - (a.uses || 0) || (a.sort || 0) - (b.sort || 0);

function openPicker() {
  PICK = { cat: null, open: '', mult: 1, custom: false, q: '', added: [], anim: '' };
  openSheet('从食物库添加', `
    ${segHTML('pk-meal', MEALS, COMPOSE.meal, 'pickMeal')}
    <input class="in pk-q" id="pk-q" type="search" enterkeyhint="search" placeholder="搜索"
      oninput="PICK.q=this.value.trim();PICK.open='';PICK.anim='';renderPicker()">
    <div id="pk-body"></div>
    <div class="pk-foot" id="pk-foot"></div>`);
  $('#sheet-bg .sheet').classList.add('tall');
  renderPicker();
}
function pickMeal(v) { COMPOSE.meal = v; renderComposeMeal(); renderPickFoot(); }

// 分类：常吃（吃过的）在最前，然后是自己建的分类，最后是未分类
function pickerGroups() {
  const cats = catsSorted(), by = foodSorter();
  const out = [];
  const top = topFoods(12);
  if (top.length) out.push({ key: '__top', name: '常吃', list: top });
  cats.forEach(c => out.push({ key: c.name, name: c.name, list: DB.foods.filter(f => f.category === c.name).sort(by) }));
  const un = DB.foods.filter(f => !f.category || !cats.some(c => c.name === f.category)).sort(by);
  if (un.length) out.push({ key: '', name: '未分类', list: un });
  return out;
}

function renderPicker() {
  const body = $('#pk-body');
  if (!body) return;
  let html;
  if (!DB.foods.length) {
    html = `<div class="empty"><button class="link" onclick="editFood('')">＋ 新建食物</button></div>`;
  } else if (PICK.q) {
    const q = PICK.q.toLowerCase();
    const list = DB.foods.filter(f => (f.name + ' ' + (f.serving || '') + ' ' + (f.category || '')).toLowerCase().includes(q)).sort(foodSorter());
    html = `<div class="pk-bar"><b>搜索结果</b><span class="muted">${list.length} 种</span></div>`
      + (list.length ? list.map(pickRow).join('') : `<div class="empty">没有找到「${esc(PICK.q)}」</div>`);
  } else if (PICK.cat === null) {
    html = `<div class="pk-cats">${pickerGroups().map(g => `
      <button class="pk-cat ${g.key === '__top' ? 'top' : ''}" ${g.list.length ? '' : 'disabled'} data-k="${esc(g.key)}" onclick="pickCat(this.dataset.k)">
        <span class="pk-cat-h"><b>${esc(g.name)}</b><span class="pk-n num">${g.list.length}</span></span>
        <small>${g.list.length ? esc(g.list.slice(0, 3).map(f => f.name).join('、')) : '还没有食物'}</small>
      </button>`).join('')}</div>`;
  } else {
    const g = pickerGroups().find(x => x.key === PICK.cat);
    const list = g ? g.list : [];
    html = `<div class="pk-bar"><button class="link pk-back" onclick="pickCat(null)">‹ 分类</button><b>${esc(g ? g.name : '')}</b><span class="muted">${list.length} 种</span></div>`
      + (list.length ? list.map(pickRow).join('') : `<div class="empty">这个分类里没有食物</div>`);
  }
  body.innerHTML = `<div class="pk-step ${PICK.anim}">${html}</div>`;
  PICK.anim = '';
  renderPickFoot();
}

function pickRow(f) {
  const n = PICK.added.filter(a => a.foodId === f.id).length;
  return `<div class="pk-food" data-id="${f.id}">
    <div class="pk-row" onclick="pickFood('${f.id}')">
      <div class="food-i"><div class="food-n">${esc(f.name)}${n ? `<span class="pk-done">✓${n > 1 ? ' ×' + n : ''}</span>` : ''}</div>
        <div class="food-s">${f.serving ? esc(f.serving) + ' · ' : ''}P${r1(f.protein)} F${r1(f.fat)} C${r1(f.carb)}</div></div>
      <div class="food-k num">${fmt(f.kcal)}</div>
    </div>
    <div class="pk-more"><div class="pk-more-in">
      <div class="chips pk-mults">${PICK_MULTS.map(x => `<button class="chip" data-m="${x}" onclick="pickMult(${x})">${x === 1 ? '1 份' : '×' + x}</button>`).join('')}
        <input class="in sm pk-custom" type="number" step="0.1" inputmode="decimal" placeholder="其他" oninput="pickMult(this.value, true)"></div>
      <div class="pk-act"><span class="pk-prev"></span><button class="btn pri pk-add" onclick="pickAdd('${f.id}')">添加</button></div>
    </div></div>
  </div>`;
}

function pickCat(k) {
  PICK.anim = k === null ? 'back' : 'fwd';
  PICK.cat = k; PICK.open = '';
  renderPicker();
  $('#sheet-bg .sheet').scrollTop = 0;
}
// 点食物：展开份量（同时收起别的），再点一次收起
function pickFood(id) {
  const opening = PICK.open !== id;
  document.querySelectorAll('.pk-food.open').forEach(e => e.classList.remove('open'));
  PICK.open = opening ? id : '';
  PICK.mult = 1; PICK.custom = false;
  const el = opening && document.querySelector(`.pk-food[data-id="${id}"]`);
  if (!el) return;
  el.querySelector('.pk-custom').value = '';
  el.classList.add('open');
  syncPickRow(el);
}
function pickMult(v, custom) {
  const x = parseFloat(v);
  PICK.mult = isFinite(x) && x > 0 ? x : 1;
  PICK.custom = !!custom && isFinite(x) && x > 0;
  const el = document.querySelector(`.pk-food[data-id="${PICK.open}"]`);
  if (el && !custom) el.querySelector('.pk-custom').value = '';
  syncPickRow(el);
}
function syncPickRow(el) {
  const f = DB.foods.find(x => x.id === PICK.open);
  if (!f || !el) return;
  const m = PICK.mult;
  el.querySelectorAll('.pk-mults .chip').forEach(c => c.classList.toggle('on', !PICK.custom && parseFloat(c.dataset.m) === m));
  el.querySelector('.pk-prev').innerHTML = `<b class="num">${fmt(f.kcal * m)}</b> kcal · P${r1(f.protein * m)} F${r1(f.fat * m)} C${r1(f.carb * m)}`;
}

function pickAdd(id) {
  const f = DB.foods.find(x => x.id === id);
  if (!f) return;
  const meal = segVal('pk-meal') || COMPOSE.meal, mult = PICK.mult;
  const e = addFoodLog(f, mult, meal);
  PICK.added.push(e);
  PICK.open = ''; PICK.mult = 1; PICK.custom = false;
  const sh = $('#sheet-bg .sheet'), y = sh.scrollTop;
  renderPicker();
  sh.scrollTop = y;
  renderToday();
  toast(`已记入${meal}：${f.name}${mult !== 1 ? ' ×' + mult : ''}`, '撤销', () => {
    deleteRow('log', e.id);
    const ff = DB.foods.find(x => x.id === id);
    if (ff) upsertRow('foods', { id, uses: Math.max(0, (ff.uses || 1) - 1) });
    PICK.added = PICK.added.filter(a => a.id !== e.id);
    if ($('#pk-body') && $('#sheet-bg').classList.contains('open')) { const yy = sh.scrollTop; renderPicker(); sh.scrollTop = yy; }
    renderToday();
  });
}

// 底部：这次加了什么 + 今天还剩多少
function renderPickFoot() {
  const ft = $('#pk-foot');
  if (!ft) return;
  const info = dayInfo(VIEW.date);
  const left = Math.round(info.target - info.intake.kcal);
  const leftTxt = left >= 0 ? `剩 <b class="num">${fmt(left)}</b>` : `超 <b class="num">${fmt(-left)}</b>`;
  const n = PICK.added.length;
  ft.innerHTML = n
    ? `<span class="pk-sum"><span><b class="num">${n}</b> 项 · <b class="num">${fmt(sum(PICK.added, 'kcal'))}</b> kcal</span><small>${leftTxt}</small></span><button class="btn pri" onclick="closeSheet()">完成</button>`
    : `<span class="pk-sum"><span>${esc(segVal('pk-meal') || COMPOSE.meal)}</span><small>${leftTxt}</small></span>`;
}
