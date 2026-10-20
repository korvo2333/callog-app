// ════════════════════════════════════════════
// AI 识别（Apps Script 代为调用 Claude API，API Key 不出现在网页里）
// ════════════════════════════════════════════
const AI_PAYLOAD = {};   // 本次打开页面期间的图片，用于失败重试（不存本机，太大）
const AI_MODELS = [      // 价格：美元 / 百万 token（服务器连上后以服务器返回为准）
  { id: 'claude-haiku-5-5', name: 'Haiku 5.5', input: 0.10, output: 0.50, desc: '便宜、快，日常够用' },
  { id: 'claude-sonnet-5-5', name: 'Sonnet 5.5', input: 2, output: 10, desc: '更准，复杂的饭菜可以用' },
  { id: 'claude-opus-5-5', name: 'Opus 5.5', input: 4, output: 20, desc: '最强，一般用不到' }
];
const aiModels = () => (LOCAL.server && LOCAL.server.models && LOCAL.server.models.length ? LOCAL.server.models : AI_MODELS);
const aiModelInfo = id => aiModels().find(m => m.id === id) || aiModels()[0];
const usd = v => '$' + (v >= 1 ? v.toFixed(2) : v >= 0.01 ? v.toFixed(3) : v >= 0.001 ? v.toFixed(4) : v.toFixed(5));

function renderComposeMeal() {
  $('#c-meal').outerHTML = segHTML('c-meal', MEALS, COMPOSE.meal, 'setComposeMeal');
}
function setComposeMeal(v) { COMPOSE.meal = v; }

function pickImage(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file) return;
  if (COMPOSE.url) URL.revokeObjectURL(COMPOSE.url);
  COMPOSE.file = file;
  COMPOSE.url = URL.createObjectURL(file);
  $('#c-img-el').src = COMPOSE.url;
  $('#c-img').classList.add('on');
}
function clearComposeImage() {
  if (COMPOSE.url) URL.revokeObjectURL(COMPOSE.url);
  COMPOSE.file = null; COMPOSE.url = '';
  $('#c-img').classList.remove('on');
  $('#c-img-el').removeAttribute('src');
}

function loadImg(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { res(img); setTimeout(() => URL.revokeObjectURL(url), 1000); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('图片无法读取（格式不支持？）')); };
    img.src = url;
  });
}
// 长边压到 1024px：食物照片足够清楚，图片约 1000 token，省钱也快
async function resizeImage(file) {
  const img = await loadImg(file);
  const s = Math.min(1, 1024 / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  const full = c.toDataURL('image/jpeg', 0.85);
  const t = document.createElement('canvas');
  const ts = 120 / Math.max(img.width, img.height);
  t.width = Math.round(img.width * ts); t.height = Math.round(img.height * ts);
  t.getContext('2d').drawImage(img, 0, 0, t.width, t.height);
  return { full, thumb: t.toDataURL('image/jpeg', 0.7), w: c.width, h: c.height };
}

async function sendAI() {
  const text = $('#c-text').value.trim();
  const file = COMPOSE.file;
  if (!text && !file) { $('#c-text').focus(); return; }
  if (!connected()) { toast('本机模式不能用 AI'); return; }
  const id = aiId();
  const req = { id, createdAt: Date.now(), date: VIEW.date, meal: COMPOSE.meal, text, thumb: '', status: 'sending', items: [], note: '', raw: '', error: '', usage: null };
  let image = null;
  if (file) {
    try {
      const r = await resizeImage(file);
      req.thumb = r.thumb;
      image = r.full.split(',')[1];
    } catch (e) { toast(e.message); return; }
  }
  AI_PAYLOAD[id] = { text, image };
  DB.ai.unshift(req);
  DB.ai = DB.ai.slice(0, 20);
  saveDB();
  $('#c-text').value = '';
  $('#c-text').style.height = '';
  clearComposeImage();
  renderAI();
  submitAI(req);
}

async function submitAI(req) {
  const p = AI_PAYLOAD[req.id];
  if (!p) { req.status = 'error'; req.error = '原始图片已不在，请重新拍照发送'; saveDB(); renderAI(); return; }
  req.status = 'sending'; req.error = ''; req.createdAt = Date.now();
  renderAI();
  try {
    const r = await api('aiSubmit', { id: req.id, text: p.text, image: p.image, model: cfg().aiModel }, 90000);
    applyAIResult(req, r);
    USAGE.at = 0;
    if (navigator.vibrate) navigator.vibrate(30);
  } catch (e) {
    req.status = 'error'; req.error = e.message;
  }
  saveDB();
  renderAI();
  const card = document.querySelector('#t-ai .ai-card');
  if (card && VIEW.tab === 'today') card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function applyAIResult(req, r) {
  req.items = (r.items || []).map(it => Object.assign({ on: true }, it));
  req.note = r.note || '';
  req.raw = r.raw || '';
  req.usage = r.usage || null;
  req.status = req.items.length ? 'done' : 'empty';
  delete AI_PAYLOAD[req.id];
}

function elapsedText(a) {
  const s = Math.max(0, Math.round((Date.now() - a.createdAt) / 1000));
  return `${s} 秒`;
}
let elapsedTimer = null;
function tickElapsed() {
  const els = document.querySelectorAll('[data-elapsed]');
  els.forEach(el => {
    const a = DB.ai.find(x => x.id === el.dataset.elapsed);
    if (a) el.textContent = elapsedText(a);
  });
  if (!els.length) { clearInterval(elapsedTimer); elapsedTimer = null; }
}

function aiItemsTotal(a) {
  const on = a.items.filter(i => i.on);
  return { n: on.length, kcal: sum(on, 'kcal'), protein: sum(on, 'protein'), fat: sum(on, 'fat'), carb: sum(on, 'carb') };
}
function usageLine(u) {
  if (!u) return '';
  const m = aiModelInfo(u.model);
  return `<div class="hint" style="margin-top:6px">${esc(m ? m.name : u.model)} · ${usd(u.costUSD || 0)}</div>`;
}

function renderAI() {
  const list = DB.ai.filter(a => ['sending', 'done', 'empty', 'error'].includes(a.status));
  $('#t-ai').innerHTML = list.map(a => {
    const head = `<div class="ai-head">
      ${a.thumb ? `<img class="ai-thumb" src="${a.thumb}" alt="">` : ''}
      <div class="ai-meta"><b>${esc(a.meal)}</b> · ${md(a.date)}${a.date === today() ? '（今天）' : ''}
        <div class="ai-text">${esc(a.text)}</div></div>
      ${a.status === 'sending' ? '' : `<button class="ai-star" onclick="dismissAI('${a.id}')" aria-label="关闭">✕</button>`}</div>`;
    let body = '';
    if (a.status === 'sending') body = `<div class="hint"><span class="spin"></span>识别中 <span class="num" data-elapsed="${a.id}">${elapsedText(a)}</span></div>`;
    else if (a.status === 'error') body = `<div class="hint" style="color:var(--bad)">失败：${esc(a.error)}</div>
      <div class="actions">${AI_PAYLOAD[a.id] ? `<button class="btn" onclick="retryAI('${a.id}')">重试</button>` : ''}
      <button class="btn" onclick="manualFromAI('${a.id}')">手动填写</button></div>`;
    else if (a.status === 'empty') body = `<div class="ai-note">${esc(a.note || '没有识别出食物')}</div>
      ${a.raw ? `<div class="raw">${esc(a.raw)}</div>` : ''}
      <div class="actions"><button class="btn" onclick="manualFromAI('${a.id}')">手动填写</button></div>${usageLine(a.usage)}`;
    else if (a.status === 'done') {
      const t = aiItemsTotal(a);
      body = `
        ${a.items.map((it, i) => `<div class="ai-item ${it.on ? '' : 'off'}" id="ai-${a.id}-${i}">
          <div class="ai-item-top">
            <input type="checkbox" ${it.on ? 'checked' : ''} onchange="aiToggle('${a.id}',${i},this.checked)">
            <input class="ai-name" value="${esc(it.name)}" oninput="aiEdit('${a.id}',${i},'name',this.value)">
            <span class="ai-amt">${esc(it.amount)}</span>
            <button class="ai-star" title="存入食物库" onclick="aiSaveFood('${a.id}',${i})">☆</button>
          </div>
          <div class="grid4">${[['kcal', 'kcal'], ['protein', '蛋白质'], ['fat', '脂肪'], ['carb', '碳水']].map(([k, l]) =>
            `<div><label style="text-align:center">${l}</label><input class="mi" type="number" inputmode="decimal" value="${it[k]}" oninput="aiEdit('${a.id}',${i},'${k}',this.value)"></div>`).join('')}</div>
        </div>`).join('')}
        <div class="ai-total num" id="ai-total-${a.id}">${aiTotalText(t)}</div>
        <div class="actions"><button class="btn pri" id="ai-add-${a.id}" ${t.n ? '' : 'disabled'} onclick="aiAdd('${a.id}')">添加</button></div>
        ${usageLine(a.usage)}`;
    }
    return `<div class="card ai-card">${head}${body}</div>`;
  }).join('');
  if (list.some(a => a.status === 'sending') && !elapsedTimer) elapsedTimer = setInterval(tickElapsed, 1000);
}
const aiTotalText = t => t.n ? `合计 ${fmt(t.kcal)} kcal · P${Math.round(t.protein)} F${Math.round(t.fat)} C${Math.round(t.carb)}` : '未选择';

let aiSaveTimer;
function aiPersistSoon() { clearTimeout(aiSaveTimer); aiSaveTimer = setTimeout(saveDB, 400); }
function aiToggle(id, i, on) {
  const a = DB.ai.find(x => x.id === id); if (!a) return;
  a.items[i].on = on;
  $(`#ai-${id}-${i}`).classList.toggle('off', !on);
  aiRefreshTotal(a); aiPersistSoon();
}
function aiEdit(id, i, k, v) {
  const a = DB.ai.find(x => x.id === id); if (!a) return;
  a.items[i][k] = k === 'name' ? v : num(v);
  aiRefreshTotal(a); aiPersistSoon();
}
function aiRefreshTotal(a) {
  const t = aiItemsTotal(a);
  $(`#ai-total-${a.id}`).textContent = aiTotalText(t);
  $(`#ai-add-${a.id}`).disabled = !t.n;
}
function aiAdd(id) {
  const a = DB.ai.find(x => x.id === id); if (!a) return;
  const on = a.items.filter(i => i.on);
  on.forEach(it => upsertRow('log', {
    id: uid('l_'), date: a.date, time: a.date === today() ? nowHM() : '', meal: a.meal,
    name: it.name || '食物', note: it.amount || '', kcal: num(it.kcal), protein: num(it.protein), fat: num(it.fat), carb: num(it.carb),
    type: 'food', foodId: ''
  }));
  a.status = 'added';
  saveDB();
  if (VIEW.date !== a.date) VIEW.date = a.date;
  renderToday();
  toast(`已添加 ${on.length} 项到${a.meal}`);
}
function aiSaveFood(id, i) {
  const a = DB.ai.find(x => x.id === id); if (!a) return;
  const it = a.items[i];
  if (DB.foods.some(f => f.name === it.name)) { toast('已有同名食物'); return; }
  upsertRow('foods', { id: uid('f_'), name: it.name, category: '', serving: it.amount || '', kcal: num(it.kcal), protein: num(it.protein), fat: num(it.fat), carb: num(it.carb), uses: 0, sort: DB.foods.length + 1 });
  toast('已存入食物库');
}
async function dismissAI(id) {
  const a = DB.ai.find(x => x.id === id); if (!a) return;
  if (a.status === 'done' && !await ask('还没添加，确定关闭？', { ok: '关闭' })) return;
  a.status = 'dismissed';
  delete AI_PAYLOAD[id];
  saveDB(); renderAI();
}
function retryAI(id) { const a = DB.ai.find(x => x.id === id); if (a) submitAI(a); }
function manualFromAI(id) {
  const a = DB.ai.find(x => x.id === id);
  if (a) { a.status = 'dismissed'; saveDB(); renderAI(); COMPOSE.meal = a.meal; }
  openManual();
  if (a && a.text) $('#m-name').value = a.text.slice(0, 40);
}
