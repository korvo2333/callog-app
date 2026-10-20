// ════════════════════════════════════════════
// 食物库 & 分类
// ════════════════════════════════════════════
const catsSorted = () => DB.cats.slice().sort((a, b) => (a.sort || 0) - (b.sort || 0));
const catNames = () => catsSorted().map(c => c.name);

// 分类里的排序：常用 / 最近吃 / 新添加 / 名称 / 热量 / 蛋白质；再点一次反过来。这台设备记住选择，食物库选择器也用同一个排序
const FOOD_SORTS = [
  { k: 'use', name: '常用', asc: false, v: f => f.uses || 0 },
  { k: 'ate', name: '最近吃', asc: false, v: (f, c) => c.ate[f.id] || null },
  { k: 'new', name: '新添加', asc: false, v: f => foodCreated(f) || null },
  { k: 'name', name: '名称', asc: true, v: f => f.name || '' },
  { k: 'kcal', name: '热量', asc: true, v: f => num(f.kcal) },
  { k: 'pro', name: '蛋白质', asc: false, v: f => num(f.protein) }
];
const NAME_COLL = (() => { try { return new Intl.Collator(['zh-Hans-CN', 'ja'], { numeric: true, sensitivity: 'base' }); } catch (e) { return null; } })();
function foodCreated(f) {   // id 里带着创建时间（uid）；没有的（旧数据）按不知道处理，排在最后
  const t = parseInt(String(f.id || '').slice(2, -4), 36);
  return t > 1.5e12 && t < Date.now() + 864e5 ? t : 0;
}
function lastAteMap() {
  const m = {};
  DB.log.forEach(e => { if (e.foodId) { const k = e.date + ' ' + (e.time || ''); if (!m[e.foodId] || k > m[e.foodId]) m[e.foodId] = k; } });
  return m;
}
function foodSortState() {
  const st = LOCAL.foodSort || {};
  const S = FOOD_SORTS.find(x => x.k === st.k) || FOOD_SORTS[0];
  return { S, asc: st.k === S.k && typeof st.asc === 'boolean' ? st.asc : S.asc };
}
function foodSorter() {
  const { S, asc } = foodSortState();
  const c = { ate: S.k === 'ate' ? lastAteMap() : {} };
  const memo = new Map();
  const get = f => { if (!memo.has(f)) memo.set(f, S.v(f, c)); return memo.get(f); };
  const tie = (a, b) => (b.uses || 0) - (a.uses || 0) || (a.sort || 0) - (b.sort || 0);
  return (a, b) => {
    const x = get(a), y = get(b);
    if (x === null || y === null) return x === y ? tie(a, b) : x === null ? 1 : -1;   // 没有数据的总在最后
    const d = typeof x === 'string' ? (NAME_COLL ? NAME_COLL.compare(x, y) : x.localeCompare(y)) : x - y;
    return (asc ? d : -d) || tie(a, b);
  };
}
function setFoodSort(k) {
  const S = FOOD_SORTS.find(x => x.k === k);
  if (!S) return;
  const cur = foodSortState();
  LOCAL.foodSort = { k, asc: cur.S.k === k ? !cur.asc : S.asc };
  saveLocal();
  renderFoods();
  const l = $('#f-list'); if (l && !REDUCED()) { l.classList.remove('resort'); void l.offsetWidth; l.classList.add('resort'); }
}
function foodSortHTML() {
  const { S, asc } = foodSortState();
  return `<span class="f-sort-l" aria-hidden="true">⇅</span>` + FOOD_SORTS.map(x => `<button class="${x.k === S.k ? 'on' : ''}" aria-pressed="${x.k === S.k}" onclick="setFoodSort('${x.k}')">${x.name}${x.k === S.k ? `<i aria-label="${asc ? '升序' : '降序'}">${asc ? '↑' : '↓'}</i>` : ''}</button>`).join('');
}

function renderFoods() {
  const q = ($('#f-q').value || '').trim().toLowerCase();
  const cats = catsSorted();
  const hasUncat = DB.foods.some(f => !f.category || !cats.some(c => c.name === f.category));
  if (VIEW.foodCat !== 'all' && VIEW.foodCat !== '' && !cats.some(c => c.name === VIEW.foodCat)) VIEW.foodCat = 'all';
  const chip = (v, label, n) => `<button class="chip ${VIEW.foodCat === v ? 'on' : ''}" data-v="${esc(v)}" onclick="setFoodCat(this.dataset.v)">${esc(label)}<span class="k">${n}</span></button>`;
  $('#f-cats').innerHTML = chip('all', '全部', DB.foods.length)
    + cats.map(c => chip(c.name, c.name, DB.foods.filter(f => f.category === c.name).length)).join('')
    + (hasUncat ? chip('', '未分类', DB.foods.filter(f => !f.category || !cats.some(c => c.name === f.category)).length) : '')
    + `<button class="chip" onclick="openCats()">⚙ 管理分类</button>`;

  let foods = DB.foods.slice();
  if (q) foods = foods.filter(f => (f.name + ' ' + (f.serving || '') + ' ' + (f.category || '')).toLowerCase().includes(q));
  if (VIEW.foodCat !== 'all') {
    foods = VIEW.foodCat === ''
      ? foods.filter(f => !f.category || !cats.some(c => c.name === f.category))
      : foods.filter(f => f.category === VIEW.foodCat);
  }
  foods.sort(foodSorter());
  $('#f-sort').innerHTML = DB.foods.length > 1 ? foodSortHTML() : '';

  const row = f => `<div class="food">
    <div class="food-i" onclick="openPortion('${f.id}')"><div class="food-n">${esc(f.name)}</div>
      <div class="food-s">${f.serving ? esc(f.serving) + ' · ' : ''}P${r1(f.protein)} F${r1(f.fat)} C${r1(f.carb)}</div></div>
    <div class="food-k num" onclick="openPortion('${f.id}')">${fmt(f.kcal)}</div>
    <button class="icon-btn" onclick="editFood('${f.id}')" aria-label="编辑">✎</button></div>`;

  if (!foods.length) {
    $('#f-list').innerHTML = `<div class="empty">${q ? '没有找到' : '暂无食物'}</div>`;
    return;
  }
  if (VIEW.foodCat === 'all' && !q) {
    const groups = cats.map(c => ({ name: c.name, list: foods.filter(f => f.category === c.name) }));
    groups.push({ name: '未分类', list: foods.filter(f => !f.category || !cats.some(c => c.name === f.category)) });
    $('#f-list').innerHTML = groups.filter(g => g.list.length).map(g => {
      const key = 'cat:' + g.name;
      return `<div class="fgroup ${isFolded(key) ? 'folded' : ''}" data-fold="${esc(key)}"><div class="cat-h fold-t" ${foldAttrs(key)}>${esc(g.name)}<span>${g.list.length}</span>${FOLD_IC}</div>
        <div class="fold"><div class="fold-in">${g.list.map(row).join('')}</div></div></div>`;
    }).join('');
  } else {
    $('#f-list').innerHTML = foods.map(row).join('');
  }
}
function setFoodCat(v) { VIEW.foodCat = v; renderFoods(); }

// 选份量
let PORTION = { fid: '', mult: 1 };
function openPortion(fid) {
  const f = DB.foods.find(x => x.id === fid);
  if (!f) return;
  PORTION = { fid, mult: 1 };
  openSheet(f.name, `
    <div class="muted">${f.serving ? esc(f.serving) + ' · ' : ''}${fmt(f.kcal)} kcal · P${r1(f.protein)} F${r1(f.fat)} C${r1(f.carb)}</div>
    <label class="lbl">份量</label>
    <div class="chips" id="p-mults">${[0.5, 1, 1.5, 2, 3].map(m => `<button class="chip ${m === 1 ? 'on' : ''}" data-m="${m}" onclick="setMult(${m})">${m}</button>`).join('')}
      <input class="in sm" id="p-custom" type="number" step="0.1" inputmode="decimal" placeholder="其他" style="width:84px" oninput="setMult(this.value, true)"></div>
    <div style="margin-top:12px">${segHTML('p-meal', MEALS, COMPOSE.meal)}</div>
    <div class="preview" id="p-prev"></div>
    <div class="actions">
      <button class="btn" style="flex:0 0 auto" onclick="editFood('${fid}')">编辑</button>
      <button class="btn pri" onclick="confirmPortion()">添加</button>
    </div>`);
  updatePortion();
}
function setMult(m, custom) {
  const v = parseFloat(m);
  PORTION.mult = isFinite(v) && v > 0 ? v : 1;
  document.querySelectorAll('#p-mults .chip').forEach(c => c.classList.toggle('on', !custom && parseFloat(c.dataset.m) === PORTION.mult));
  if (!custom) $('#p-custom').value = '';
  updatePortion();
}
function updatePortion() {
  const f = DB.foods.find(x => x.id === PORTION.fid);
  if (!f) return;
  const m = PORTION.mult;
  $('#p-prev').innerHTML = `<b class="num">${fmt(f.kcal * m)}</b> kcal · P${r1(f.protein * m)} F${r1(f.fat * m)} C${r1(f.carb * m)}`;
}
function confirmPortion() {
  const f = DB.foods.find(x => x.id === PORTION.fid);
  if (!f) return;
  const meal = segVal('p-meal');
  COMPOSE.meal = meal;
  const e = addFoodLog(f, PORTION.mult, meal);
  closeSheet();
  renderFoods();
  if (VIEW.tab === 'today') renderToday();
  toast(`已记入${meal}：${f.name}${PORTION.mult !== 1 ? ' ×' + PORTION.mult : ''}`, '撤销', () => { deleteRow('log', e.id); rerender(); });
}

// 编辑 / 新建食物
function catOptions(sel) {
  const names = catNames();
  return `<option value="" ${!sel ? 'selected' : ''}>未分类</option>`
    + names.map(n => `<option value="${esc(n)}" ${n === sel ? 'selected' : ''}>${esc(n)}</option>`).join('')
    + `<option value="__new">＋ 新分类…</option>`;
}
function editFood(fid) {
  const f = fid ? DB.foods.find(x => x.id === fid) : null;
  const defCat = f ? f.category : (VIEW.foodCat !== 'all' ? VIEW.foodCat : '');
  openSheet(f ? '编辑食物' : '新建食物', `
    ${f ? '' : `<button class="btn block lb-scan" onclick="openLabel('food')">${ACT_IC.label}拍成分表</button>`}
    <input class="in" id="fd-name" value="${esc(f ? f.name : '')}" placeholder="名称">
    <div class="grid2" style="margin-top:8px">
      <input class="in" id="fd-serving" value="${esc(f ? f.serving : '')}" placeholder="份量">
      <select class="in" id="fd-cat" onchange="if(this.value==='__new')newCatFromSelect(this)">${catOptions(defCat)}</select>
    </div>
    <div style="margin-top:12px">${macroInputs('fd', f || {})}</div>
    <div class="actions">
      ${f ? `<button class="btn danger" style="flex:0 0 auto" onclick="deleteFood('${f.id}')">删除</button>` : ''}
      <button class="btn pri" onclick="saveFood('${f ? f.id : ''}')">保存</button>
    </div>`);
  if (!f) setTimeout(() => $('#fd-name') && $('#fd-name').focus(), 300);
}
async function newCatFromSelect(sel) {
  const name = (await ask('新分类', { input: true, placeholder: '名称' }) || '').trim();
  if (!name) { sel.value = ''; return; }
  if (!DB.cats.some(c => c.name === name)) upsertRow('cats', { id: uid('c_'), name, sort: DB.cats.length + 1 });
  sel.innerHTML = catOptions(name);
}
function saveFood(fid) {
  const name = $('#fd-name').value.trim();
  if (!name) { toast('填写名称'); return; }
  const m = readMacros('fd');
  let cat = $('#fd-cat').value;
  if (cat === '__new') cat = '';
  const old = fid ? DB.foods.find(x => x.id === fid) : null;
  upsertRow('foods', Object.assign({
    id: fid || uid('f_'), name, serving: $('#fd-serving').value.trim(), category: cat,
    uses: old ? old.uses || 0 : 0, sort: old ? old.sort : DB.foods.length + 1
  }, m));
  closeSheet();
  renderFoods();
  toast('已保存');
}
async function deleteFood(fid) {
  const f = DB.foods.find(x => x.id === fid);
  if (!f || !await ask(`删除「${f.name}」？`, { ok: '删除', danger: true })) return;
  deleteRow('foods', fid);
  closeSheet(); renderFoods();
}

// 分类管理
function openCats() {
  openSheet('管理分类', `<div id="cat-list"></div>
    <div class="row" style="margin-top:6px"><input class="in grow" id="cat-new" placeholder="新分类" onkeydown="if(event.key==='Enter')addCat()">
      <button class="btn pri" onclick="addCat()">添加</button></div>`);
  renderCatList();
}
function renderCatList() {
  const cats = catsSorted();
  $('#cat-list').innerHTML = cats.length ? cats.map((c, i) => `<div class="cat-row">
    <input class="in sm grow" value="${esc(c.name)}" onchange="renameCat('${c.id}', this.value)">
    <span class="cnt">${DB.foods.filter(f => f.category === c.name).length} 个</span>
    <button class="icon-btn" ${i === 0 ? 'disabled' : ''} onclick="moveCat('${c.id}',-1)" aria-label="上移">↑</button>
    <button class="icon-btn" ${i === cats.length - 1 ? 'disabled' : ''} onclick="moveCat('${c.id}',1)" aria-label="下移">↓</button>
    <button class="icon-btn" onclick="delCat('${c.id}')" aria-label="删除" style="color:var(--bad)">🗑</button></div>`).join('')
    : '<div class="empty">还没有分类</div>';
}
function addCat() {
  const el = $('#cat-new');
  const name = el.value.trim();
  if (!name) return;
  if (DB.cats.some(c => c.name === name)) { toast('已有此分类'); return; }
  upsertRow('cats', { id: uid('c_'), name, sort: Math.max(0, ...DB.cats.map(c => c.sort || 0)) + 1 });
  el.value = '';
  renderCatList(); renderFoods();
}
function renameCat(id, v) {
  const name = v.trim();
  const c = DB.cats.find(x => x.id === id);
  if (!c || !name || name === c.name) { renderCatList(); return; }
  if (DB.cats.some(x => x.name === name)) { toast('已有此分类'); renderCatList(); return; }
  const old = c.name;
  upsertRow('cats', { id, name });
  DB.foods.filter(f => f.category === old).forEach(f => upsertRow('foods', { id: f.id, category: name }));
  if (VIEW.foodCat === old) VIEW.foodCat = name;
  renderCatList(); renderFoods();
}
function moveCat(id, d) {
  const cats = catsSorted();
  const i = cats.findIndex(c => c.id === id), j = i + d;
  if (i < 0 || j < 0 || j >= cats.length) return;
  [cats[i], cats[j]] = [cats[j], cats[i]];
  cats.forEach((c, k) => { if (c.sort !== k + 1) upsertRow('cats', { id: c.id, sort: k + 1 }); });
  renderCatList(); renderFoods();
}
async function delCat(id) {
  const c = DB.cats.find(x => x.id === id);
  if (!c) return;
  const n = DB.foods.filter(f => f.category === c.name).length;
  if (!await ask(`删除分类「${c.name}」？${n ? `\n${n} 个食物变为未分类` : ''}`, { ok: '删除', danger: true })) return;
  DB.foods.filter(f => f.category === c.name).forEach(f => upsertRow('foods', { id: f.id, category: '' }));
  deleteRow('cats', id);
  if (VIEW.foodCat === c.name) VIEW.foodCat = 'all';
  renderCatList(); renderFoods();
}
