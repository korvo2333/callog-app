'use strict';
// ════════════════════════════════════════════
// 工具
// ════════════════════════════════════════════
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r1 = n => Math.round(n * 10) / 10;
const num = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? r1(n) : 0; };
const pf = v => { const n = parseFloat(v); return isFinite(n) && n > 0 ? n : 0; };   // 不取整（系数、百分比用）
const numOrNull = v => { if (v === '' || v === null || v === undefined) return null; const n = parseFloat(v); return isFinite(n) ? r1(n) : null; };
const fmt = n => Math.round(n || 0).toLocaleString('en-US');
const fmtS = n => (n > 0 ? '+' : n < 0 ? '−' : '') + fmt(Math.abs(n));
const signed1 = n => { const v = Math.round(n * 10) / 10; return (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v).toFixed(1); };
const sum = (arr, f) => arr.reduce((s, x) => s + (typeof f === 'function' ? f(x) : (x[f] || 0)), 0);
const pad2 = n => String(n).padStart(2, '0');
const ymd = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseYmd = s => { const [y, m, d] = String(s).split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); };
const dow = s => parseYmd(s).getDay();
const diffDays = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);   // b - a
const today = () => ymd(new Date());
const nowHM = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
const WD = ['日', '一', '二', '三', '四', '五', '六'];
const md = s => { const d = parseYmd(s); return `${d.getMonth() + 1}/${d.getDate()}`; };
const dateLabel = s => { const d = parseYmd(s); return `${d.getMonth() + 1}月${d.getDate()}日 周${WD[d.getDay()]}`; };
const uid = p => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const aiId = () => 'AI-' + Date.now().toString(36).slice(-4) + Math.random().toString(36).slice(2, 4);

function linreg(pts) {   // [{x,y}] → {slope, icpt}
  const n = pts.length;
  if (n < 2) return null;
  const mx = sum(pts, 'x') / n, my = sum(pts, 'y') / n;
  let a = 0, b = 0;
  pts.forEach(p => { a += (p.x - mx) * (p.y - my); b += (p.x - mx) ** 2; });
  if (b === 0) return null;
  const slope = a / b;
  return { slope, icpt: my - slope * mx };
}

// ════════════════════════════════════════════
// 默认值
// ════════════════════════════════════════════
const DEFAULT_SETTINGS = {
  tdee: 2500, protein: 165, fat: 62,
  dayKcal: [2050, 2050, 2000, 2050, 2050, 2050, 1750],   // 周日 → 周六，平均 2000
  weekStart: 0,
  overrides: [{ id: 'o_break1', from: '2026-11-15', to: '2026-11-21', kcal: 2500, label: '维持周' }],
  planStart: '2026-10-10', planStartWeight: 80, planStartBf: 17,
  planEnd: '2027-01-02', planEndWeight: 74.1, planEndBf: 10.4,
  aiModel: 'claude-haiku-5-5',
  // 每日目标（从 formulaFrom 这天开始用；之前的日子仍按上面的 dayKcal / tdee，不会被重算）
  // 消耗 = 基础代谢 × 日常系数 + 步数 × 每千步 / 1000 + 力量（勾了才算）+ 有氧（手表数字 × 比例）；目标 = 消耗 − 每日缺口，最低 = 基础代谢
  formulaFrom: '', bmr: 1650, restFactor: 1.15, stepKcal: 30, strengthKcal: 200, cardioFactor: 0.7, cardioEll: 0.2, cardioRun: 0.5, deficit: 700,   // 有氧计入比例：其他 / 椭圆机（没填时长时）/ 跑步
  ellCadence: 106,   // 椭圆机步频（步/分钟）：手表把这些步也算进了步数
  stepsDefault: 7000, strengthPerWeek: 4
};

const MEALS = ['早餐', '午餐', '晚餐', '加餐'];
function mealByTime() {
  const h = new Date().getHours() + new Date().getMinutes() / 60;
  if (h >= 4 && h < 10.5) return '早餐';
  if (h >= 10.5 && h < 14.5) return '午餐';
  if (h >= 17 && h < 21.5) return '晚餐';
  return '加餐';
}

// ════════════════════════════════════════════
// 本机存储
// ════════════════════════════════════════════
const LS = { db: 'callog_db_v1', outbox: 'callog_outbox_v1', local: 'callog_local_v1' };
function lsLoad(key, fb) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
function lsSave(key, v) {
  try { localStorage.setItem(key, JSON.stringify(v)); }
  catch (e) { toast('本机存储空间不足，请到设置里清理'); }
}

function seedDB() {
  return { log: [], body: [], settings: {}, ai: [], cats: [], foods: [] };   // 不预置任何食物和分类
}

let DB = Object.assign({ log: [], foods: [], cats: [], body: [], steps: [], settings: {}, ai: [], exercises: [], plan: [], sets: [] }, lsLoad(LS.db, null) || seedDB());
let OUTBOX = lsLoad(LS.outbox, []);
let LOCAL = Object.assign({ sheetsUrl: '', apiUrl: '', token: '', theme: 'lime', lastSync: '', lastPull: 0, server: null, folds: {} }, lsLoad(LS.local, {}));
const saveDB = () => lsSave(LS.db, DB);
const saveOutbox = () => lsSave(LS.outbox, OUTBOX);
const saveLocal = () => lsSave(LS.local, LOCAL);
const cfg = () => Object.assign({}, DEFAULT_SETTINGS, DB.settings);

const VIEW = { tab: 'today', date: today(), weekOffset: 0, bodyRange: 'plan', foodCat: 'all' };

// ════════════════════════════════════════════
// 动效开关 / 折叠卡片
// ════════════════════════════════════════════
const RM = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
const REDUCED = () => !!(RM && RM.matches);
const ANIM = { enter: true };   // 下一次画今日主卡时播放入场动画

// 滚动驱动的装饰：把滚动位置 / 速度 / 进度写进 CSS 变量（只写在装饰层和当前页顶栏上，不触发全页重算）
const SCROLL = { y: 0, v: 0, raf: 0 };
function scrollTick() {
  SCROLL.raf = 0;
  const y = window.scrollY, dy = y - SCROLL.y;
  SCROLL.y = y;
  SCROLL.v = SCROLL.v * .8 + dy * .2;
  if (dy) SCROLL.d = dy > 0 ? 1 : -1;
  if (Math.abs(SCROLL.v) < .05) SCROLL.v = 0;
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  const vars = { '--sy': y.toFixed(1), '--sv': SCROLL.v.toFixed(2), '--sp': Math.min(1, y / max).toFixed(4), '--sd': y < 2 ? 1 : (SCROLL.d || 1) };
  [document.getElementById('decor'), document.querySelector('.scr.on .hd')].forEach(el => { if (el) for (const k in vars) el.style.setProperty(k, vars[k]); });
  if (SCROLL.v !== 0) SCROLL.raf = requestAnimationFrame(scrollTick);
}
window.addEventListener('scroll', () => { if (!REDUCED() && !SCROLL.raf) SCROLL.raf = requestAnimationFrame(scrollTick); }, { passive: true });

// 记录了新的食物：今日主卡播放一次主题「反应」动画
function heroReact() {
  const r = ANIM.react;
  ANIM.react = null;
  if (!r || REDUCED() || r.date !== VIEW.date || VIEW.tab !== 'today' || Date.now() - r.t > 4000) return;
  const hero = document.getElementById('t-hero'), rx = hero && hero.querySelector('.rx');
  if (!rx) return;
  rx.dataset.n = `+${fmt(r.kcal)}`;
  hero.classList.remove('react');
  void hero.offsetWidth;
  hero.classList.add('react');
  clearTimeout(hero._rt);
  hero._rt = setTimeout(() => hero.classList.remove('react'), 1800);
}

// 默认收起的次要卡片（用户点过之后以用户的选择为准，存在本机）
const FOLD_DEFAULT = {
  'week:daily': 1, 'week:w8': 1, 'week:tdee': 1,
  'body:bf': 1, 'body:lean': 1, 'body:muscle': 1, 'body:recs': 1,
  'set:periods': 1, 'set:plan': 1, 'set:ai': 1, 'set:sync': 1, 'set:watch': 1, 'set:adv': 1, 'today:why': 1, 'tr:week': 1, 'tr:lib': 1
};
const isFolded = k => { const f = (LOCAL.folds || {})[k]; return f === undefined ? !!FOLD_DEFAULT[k] : !!f; };
const foldAttrs = key => `role="button" tabindex="0" aria-expanded="${!isFolded(key)}" onclick="toggleFold(this)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleFold(this)}"`;
const FOLD_IC = '<i class="fold-ic" aria-hidden="true"></i>';
// 可折叠卡片：标题行一直显示（右侧放一个摘要），内容可收起
function fcard(key, title, right, body, cls) {
  return `<div class="card ${cls || ''} ${isFolded(key) ? 'folded' : ''}" data-fold="${key}">
    <div class="card-t fold-t" ${foldAttrs(key)}>${title}<span>${right || ''}</span>${FOLD_IC}</div>
    <div class="fold"><div class="fold-in">${body}</div></div></div>`;
}
function toggleFold(el) {
  const box = el.closest('[data-fold]');
  if (!box) return;
  const key = box.dataset.fold, f = !box.classList.contains('folded');
  LOCAL.folds = Object.assign({}, LOCAL.folds, { [key]: f });
  saveLocal();
  if (!f) { box.classList.add('opening'); clearTimeout(box._ot); box._ot = setTimeout(() => box.classList.remove('opening'), 380); }
  box.classList.toggle('folded', f);
  box.querySelectorAll('[aria-expanded]').forEach(b => { if (b.closest('[data-fold]') === box) b.setAttribute('aria-expanded', String(!f)); });
}
function applyStaticFolds() {
  document.querySelectorAll('[data-fold][data-static]').forEach(box => {
    const f = isFolded(box.dataset.fold);
    box.classList.toggle('folded', f);
    const t = box.querySelector('.fold-t'); if (t) t.setAttribute('aria-expanded', String(!f));
  });
}

// ════════════════════════════════════════════
// 提示 / 底部弹层
// ════════════════════════════════════════════
let toastTimer;
function toast(msg, actLabel, act) {
  const el = $('#toast');
  $('#toast-msg').textContent = msg;
  const b = $('#toast-act');
  b.style.display = actLabel ? '' : 'none';
  b.textContent = actLabel || '';
  b.onclick = () => { el.classList.remove('on'); act && act(); };
  el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), actLabel ? 5000 : 2400);
}

// 页面内的确认 / 输入框（代替 confirm / prompt，App 模式下系统弹窗可能被拦截）
function ask(msg, opt) {
  opt = opt || {};
  return new Promise(resolve => {
    const bg = $('#dlg-bg'), inp = $('#dlg-in'), ok = $('#dlg-ok');
    $('#dlg-msg').textContent = msg;
    inp.style.display = opt.input ? '' : 'none';
    inp.value = opt.value || '';
    inp.placeholder = opt.placeholder || '';
    ok.textContent = opt.ok || '确定';
    ok.className = 'btn ' + (opt.danger ? 'danger' : 'pri');
    const done = v => { bg.classList.remove('open'); inp.onkeydown = null; resolve(v); };
    ok.onclick = () => done(opt.input ? inp.value.trim() : true);
    $('#dlg-cancel').onclick = () => done(opt.input ? null : false);
    inp.onkeydown = e => { if (e.key === 'Enter') ok.onclick(); };
    bg.classList.add('open');
    if (opt.input) setTimeout(() => inp.focus(), 60);
  });
}

function openSheet(title, html) {
  $('#sheet-bg .sheet').className = 'sheet';   // 清掉上一个弹层加的样式（如食物选择器的 tall）
  $('#sheet-title').textContent = title;
  $('#sheet-body').innerHTML = html;
  $('#sheet-bg').classList.add('open');
  $('#sheet-bg .sheet').scrollTop = 0;
}
function closeSheet() { $('#sheet-bg').classList.remove('open'); }

function segHTML(id, options, value, onpick) {
  return `<div class="seg" id="${id}">${options.map(o =>
    `<button type="button" data-v="${esc(o)}" class="${o === value ? 'on' : ''}" onclick="segPick(this${onpick ? `,'${onpick}'` : ''})">${esc(o)}</button>`).join('')}</div>`;
}
function segPick(btn, cb) {
  btn.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn));
  if (cb && window[cb]) window[cb](btn.dataset.v);
}
const segVal = id => { const b = document.querySelector(`#${id} button.on`); return b ? b.dataset.v : ''; };

function macroInputs(p, o) {
  o = o || {};
  const v = k => (o[k] || o[k] === 0) && o[k] !== '' ? o[k] : '';
  return `<div class="grid4">
    <div><label>热量 kcal</label><input class="mi" id="${p}-kcal" type="number" inputmode="decimal" value="${v('kcal')}" placeholder="自动"></div>
    <div><label>蛋白质 g</label><input class="mi" id="${p}-protein" type="number" inputmode="decimal" value="${v('protein')}" placeholder="0"></div>
    <div><label>脂肪 g</label><input class="mi" id="${p}-fat" type="number" inputmode="decimal" value="${v('fat')}" placeholder="0"></div>
    <div><label>碳水 g</label><input class="mi" id="${p}-carb" type="number" inputmode="decimal" value="${v('carb')}" placeholder="0"></div>
  </div>`;
}
function readMacros(p) {
  const g = k => num($(`#${p}-${k}`).value);
  const m = { kcal: g('kcal'), protein: g('protein'), fat: g('fat'), carb: g('carb') };
  if (!m.kcal) m.kcal = Math.round(m.protein * 4 + m.fat * 9 + m.carb * 4);
  return m;
}
function scaleInputs(p, f) {
  ['kcal', 'protein', 'fat', 'carb'].forEach(k => {
    const el = $(`#${p}-${k}`);
    const v = parseFloat(el.value);
    if (isFinite(v)) el.value = r1(v * f);
  });
}
