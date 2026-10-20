// ════════════════════════════════════════════
// 营养成分表：拍包装上的成分表 → AI 只读数字（不估算）→ 选吃了多少 → 记录 / 存入食物库
// ════════════════════════════════════════════
let LABEL = null;   // { thumb, image, status, label, err, mult, grams }
let LABEL_MODE = 'log';   // log = 今日：记一条 + 可存入食物库；food = 食物库：只存成食物

function openLabel(mode) {
  if (!connected()) { toast('本机模式不能用 AI'); return; }
  if (mode) LABEL_MODE = mode;
  LABEL = null;
  openSheet('营养成分表', `
    <div class="lb-tip">
      <div class="lb-demo" aria-hidden="true"><b>栄養成分表示</b><span>1袋(45g)当たり</span><i></i><i></i><i></i><i></i></div>
      <div>拍清楚整张成分表</div>
    </div>
    <div class="actions">
      <button class="btn" onclick="$('#lb-gal').click()">从相册选</button>
      <button class="btn pri" onclick="$('#lb-cam').click()">拍照</button>
    </div>`);
}

// 成分表的小字要看清：长边压到 1600px（比拍饭菜的 1024px 大）
async function labelImage(file) {
  const img = await loadImg(file);
  const s = Math.min(1, 1600 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const t = document.createElement('canvas'), ts = 160 / Math.max(img.width, img.height);
  t.width = Math.round(img.width * ts); t.height = Math.round(img.height * ts);
  t.getContext('2d').drawImage(img, 0, 0, t.width, t.height);
  return { image: c.toDataURL('image/jpeg', 0.88).split(',')[1], thumb: t.toDataURL('image/jpeg', 0.75) };
}

async function pickLabel(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  try {
    const r = await labelImage(file);
    LABEL = { thumb: r.thumb, image: r.image, status: 'reading', label: null, err: '', mult: 1, grams: '', meal: COMPOSE.meal };
  } catch (e) { toast(e.message); return; }
  readLabel();
}

async function readLabel() {
  if (!LABEL) return;
  LABEL.status = 'reading'; LABEL.err = '';
  renderLabel();
  const mine = LABEL;
  try {
    const r = await api('aiLabel', { id: aiId(), image: mine.image, model: cfg().aiModel }, 90000);
    if (LABEL !== mine) return;
    mine.label = r.label; mine.usage = r.usage; mine.status = 'done';
    const L = r.label;
    if (L.packageCount > 1 && L.packageAmount > 0 && L.basisAmount > 0 && Math.abs(L.packageAmount / L.packageCount - L.basisAmount) < 1) mine.mult = 1;
    USAGE.at = 0;
    if (navigator.vibrate) navigator.vibrate(30);
  } catch (e) {
    if (LABEL !== mine) return;
    mine.status = 'error'; mine.err = e.message;
  }
  if ($('#lb-form') || $('#lb-wait') || $('#lb-err')) renderLabel();
}

function labelAmounts(L) {
  const u = L.basisUnit || '';
  const out = [0.5, 1, 2].map(m => ({ m, t: m === 1 ? `1 份` : `×${m}` }));
  if (L.packageAmount > 0 && L.basisAmount > 0 && Math.abs(L.packageAmount - L.basisAmount) > 0.5) {
    const m = Math.round(L.packageAmount / L.basisAmount * 100) / 100;
    if (m !== 0.5 && m !== 1 && m !== 2) out.push({ m, t: `整包 ${fmt(L.packageAmount)}${u}`, pack: true });
  }
  return out;
}

function renderLabel() {
  const S = LABEL;
  if (!S) return;
  if (S.status === 'reading') {
    openSheet('营养成分表', `<div class="lb-head" id="lb-wait"><img class="lb-thumb" src="${S.thumb}" alt=""><div><span class="spin"></span> 读取中</div></div>`);
    return;
  }
  if (S.status === 'error') {
    openSheet('营养成分表', `<div class="lb-head" id="lb-err"><img class="lb-thumb" src="${S.thumb}" alt=""><div style="color:var(--bad)">${esc(S.err)}</div></div>
      <div class="actions"><button class="btn" onclick="openLabel()">重新拍</button><button class="btn pri" onclick="readLabel()">重试</button></div>`);
    return;
  }
  const L = S.label;
  const u = L.basisUnit || '';
  const exist = DB.foods.find(f => f.name === L.name);
  openSheet('营养成分表', `
    <div class="lb-head"><img class="lb-thumb" src="${S.thumb}" alt="">
      <div class="lb-meta">
        <input class="in sm" id="lb-name" value="${esc(L.name)}" placeholder="名称">
        <div class="lb-basis">${L.ok ? '' : '⚠ '}<b>${esc(L.basis || '基准不明')}</b></div>
      </div></div>
    ${!L.ok ? `<div class="hint lb-warn">${esc(L.note || '没读清楚')}</div>` : ''}
    <label class="lbl">${esc(L.basis || '每份')}</label>
    <div id="lb-form">${macroInputs('lb', L)}</div>
    ${LABEL_MODE === 'food' ? `<label class="row lb-save"><span>分类</span>
      <select class="in sm" id="lb-cat" style="margin-left:auto;max-width:150px">${catOptions(exist ? exist.category : (VIEW.foodCat !== 'all' ? VIEW.foodCat : '')).replace(/<option value="__new">.*?<\/option>/, '')}</select></label>
    <div class="actions"><button class="btn" style="flex:0 0 auto" onclick="openLabel()">重拍</button><button class="btn pri" onclick="saveLabel()">${exist ? '更新食物库' : '存入食物库'}</button></div>
` : `
    <label class="lbl">吃了</label>
    <div class="chips lb-amt">${labelAmounts(L).map(a => `<button class="chip ${!S.grams && a.m === S.mult ? 'on' : ''}" data-m="${a.m}" onclick="labelMult(${a.m})">${esc(a.t)}</button>`).join('')}
      ${L.basisAmount > 0 ? `<span class="lb-g"><input class="in sm" id="lb-grams" type="number" inputmode="decimal" placeholder="" value="${S.grams}" oninput="labelGrams(this.value)"><span>${u || 'g'}</span></span>` : ''}</div>
    <div style="margin-top:12px">${segHTML('lb-meal', MEALS, S.meal)}</div>
    <div class="preview" id="lb-prev"></div>
    <label class="row lb-save">
      <input type="checkbox" id="lb-save" checked style="width:18px;height:18px;accent-color:var(--accent)">
      ${exist ? '更新食物库里的同名食物' : '存入食物库'}
      <select class="in sm" id="lb-cat" style="margin-left:auto;max-width:130px">${catOptions(exist ? exist.category : (catNames().includes('便利店') ? '便利店' : '')).replace(/<option value="__new">.*?<\/option>/, '')}</select>
    </label>
    <div class="actions"><button class="btn" style="flex:0 0 auto" onclick="openLabel()">重拍</button><button class="btn pri" onclick="saveLabel()">添加</button></div>
`}`);
  ['kcal', 'protein', 'fat', 'carb'].forEach(k => { const el = $('#lb-' + k); if (el) el.addEventListener('input', labelPreview); });
  labelPreview();
}
function labelMult(m) {
  LABEL.mult = m; LABEL.grams = '';
  const g = $('#lb-grams'); if (g) g.value = '';
  document.querySelectorAll('.lb-amt .chip').forEach(c => c.classList.toggle('on', parseFloat(c.dataset.m) === m));
  labelPreview();
}
function labelGrams(v) {
  const L = LABEL.label, g = parseFloat(v);
  LABEL.grams = v;
  if (isFinite(g) && g > 0 && L.basisAmount > 0) LABEL.mult = g / L.basisAmount;
  document.querySelectorAll('.lb-amt .chip').forEach(c => c.classList.toggle('on', !(isFinite(g) && g > 0) && parseFloat(c.dataset.m) === LABEL.mult));
  labelPreview();
}
function labelPreview() {
  const el = $('#lb-prev');
  if (!el || !LABEL) return;
  const m = readMacros('lb'), k = LABEL.mult, L = LABEL.label;
  const g = parseFloat(LABEL.grams);
  const amt = isFinite(g) && g > 0 ? `${fmt(g)}${L.basisUnit || 'g'}` : L.basisAmount > 0 ? `${fmt(L.basisAmount * k)}${L.basisUnit || 'g'}` : `${k} 份`;
  el.innerHTML = `<b class="num">${fmt(m.kcal * k)}</b> kcal · P${r1(m.protein * k)} F${r1(m.fat * k)} C${r1(m.carb * k)}<div class="muted" style="font-size:12px;margin-top:3px">${esc(amt)}</div>`;
}
function saveLabel() {
  const S = LABEL, L = S.label;
  const m = readMacros('lb');
  if (!m.kcal) { toast('热量为 0'); return; }
  const name = $('#lb-name').value.trim() || L.name || '包装食品';
  if (LABEL_MODE === 'food') {   // 只存成食物（食物库页面里拍的）
    const ex = DB.foods.find(f => f.name === name);
    const u0 = L.basisUnit || 'g';
    const serving0 = (L.basis || '').replace(/^每/, '') || (L.basisAmount > 0 ? fmt(L.basisAmount) + u0 : '1份');
    upsertRow('foods', Object.assign({ id: ex ? ex.id : uid('f_'), name, category: $('#lb-cat').value, serving: serving0, uses: ex ? ex.uses || 0 : 0, sort: ex ? ex.sort : DB.foods.length + 1 }, m));
    LABEL = null; LABEL_MODE = 'log';
    closeSheet(); renderFoods();
    toast(ex ? '已更新食物库' : '已存入食物库');
    return;
  }
  const k = S.mult, meal = segVal('lb-meal') || COMPOSE.meal;
  const g = parseFloat(S.grams);
  const u = L.basisUnit || 'g';
  const serving = L.basisAmount > 0 ? `${(L.basis || '').replace(/^每/, '') || fmt(L.basisAmount) + u}` : (L.basis || '').replace(/^每/, '') || '1份';
  let foodId = '';
  if ($('#lb-save').checked) {
    const ex = DB.foods.find(f => f.name === name);
    const f = upsertRow('foods', Object.assign({ id: ex ? ex.id : uid('f_'), name, category: $('#lb-cat').value, serving, uses: ex ? (ex.uses || 0) + 1 : 1, sort: ex ? ex.sort : DB.foods.length + 1 }, m));
    foodId = f.id;
  }
  const note = (isFinite(g) && g > 0 ? `${fmt(g)}${u}` : k !== 1 ? `×${k}` + (L.basisAmount > 0 ? ` · ${fmt(L.basisAmount * k)}${u}` : '') : serving);
  COMPOSE.meal = meal;
  const e = upsertRow('log', {
    id: uid('l_'), date: VIEW.date, time: VIEW.date === today() ? nowHM() : '', meal, name, type: 'food', foodId, note,
    kcal: r1(m.kcal * k), protein: r1(m.protein * k), fat: r1(m.fat * k), carb: r1(m.carb * k)
  });
  LABEL = null;
  closeSheet(); renderToday();
  toast(`已记入${meal}：${name}`, '撤销', () => { deleteRow('log', e.id); renderToday(); });
}
