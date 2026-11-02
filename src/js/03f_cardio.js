// ════════════════════════════════════════════
// 有氧表单：选种类 → 填看得到的数字（或拍照让 AI 填）→ 预览计入多少 → 保存
// 算法见 02b_cardio.js
// ════════════════════════════════════════════
// 当前打开的表单：种类 + 没时长时的比例（编辑旧记录先沿用它存的比例）+ 走/跑 + 拳击强度 + AI 填的来源
let BURN = { k: 'ell', pct: 70, k0: 'ell' };
// 输入框：[字段, id, 标签（按种类）, inputmode, placeholder]
const CD_FIELDS = [
  ['mins', 'x-mins', () => '时长（分钟）', 'decimal', '0'],
  ['speed', 'x-speed', () => '速度 km/h', 'decimal', '5.0'],
  ['grade', 'x-grade', () => '坡度 %', 'decimal', '0'],
  ['dist', 'x-dist', () => '距离 km（选填）', 'decimal', '—'],
  ['kcal', 'x-kcal', k => ({ ell: '机器 / 手表 kcal', tread: '机器 kcal（选填）', run: '手表 kcal（选填）', box: '手表 kcal（戴了才填）' }[k] || '手表 kcal'), 'numeric', '0'],
  ['met', 'x-met', () => '平均 MET（屏幕有就填）', 'decimal', '—'],
  ['steps', 'x-steps', () => '手表记到的步数', 'numeric', '']
];
const CD_HINT = {
  ell: '步数：看手表这段时间记了多少步；空着就按设置里的步频估',
  tread: '按速度和坡度用 ACSM 公式算；尽量别扶扶手（扶着走实际消耗会少两到三成）',
  run: '填了距离按 ACSM 跑步公式算，比手表的 kcal 稳定；没距离就按手表',
  box: '没戴手表：选强度就行，步数按 0。讲解、休息多的课选低一档',
  other: '手表的 kcal 含基础代谢，填上时长会扣掉这部分'
};
const burnDate = () => BURN.date || VIEW.date;

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
  const fd = editing ? cardioFormData(e) : { k: CARDIO_KINDS.some(c => c.k === LOCAL.cardioKind) ? LOCAL.cardioKind : 'ell' };
  const k0 = fd.k;
  BURN = { k: k0, k0, pct: editing ? cardioPct(e) : cardioKindPct(k0), date: editing ? e.date : VIEW.date,
    gait: fd.gait || '', kt: fd.kt || 'total', met: k0 === 'box' ? num(fd.met) || BOX_LV[1].met : 0, mf: fd.mf || '', aiMet: fd.mf === 'estimate' ? String(fd.met) : '', ai: fd.ai || '' };
  CDAI = null;
  const val = { mins: fd.min, speed: fd.sp, grade: fd.gr, dist: fd.dist, kcal: fd.kcal, met: k0 !== 'box' ? fd.met : '', steps: fd.st };
  openSheet('有氧', `
    ${connected() ? cdAiHTML() : ''}
    <div class="cd-opts" role="radiogroup" aria-label="种类">
      ${CARDIO_KINDS.map(c => `<button class="cd-opt" data-k="${c.k}" role="radio" onclick="pickCardio('${c.k}')">
        <span class="act-ic">${cardioIcon(c.k)}</span><span class="cd-l">${c.name}</span></button>`).join('')}
    </div>
    <input class="in" id="x-name" value="${esc(editing && k0 === 'other' && e.name !== '其他' && e.name !== '有氧' ? e.name : '')}" placeholder="名称（选填）：游泳、单车、划船…" style="margin-top:10px">
    <div class="cd-f cd-wide" data-f="lvl" id="x-lvl"></div>
    <div class="grid2 cd-in" id="x-in">
      ${CD_FIELDS.map(([f, id, lb, im, ph]) => `<div class="cd-f" data-f="${f}"><label class="lbl" for="${id}" id="${id}-l">${lb(k0)}</label>
        <input class="in" id="${id}" type="number" inputmode="${im}" value="${hasVal(val[f]) ? val[f] : ''}" placeholder="${ph}" oninput="burnInput('${f}')"></div>`).join('')}
    </div>
    <div class="cd-f cd-wide cd-gait" data-f="gait" id="x-gait"></div>
    <label class="cd-f cd-kt" data-f="kcal"><input type="checkbox" id="x-kt" ${BURN.kt === 'active' ? 'checked' : ''} onchange="BURN.kt=this.checked?'active':'total';burnPreview()"> 这个数是「活动消耗」（不含基础代谢）</label>
    <div class="preview cd-prev" id="x-prev" aria-live="polite"></div>
    <div class="hint" id="x-hint"></div>
    <div class="actions">
      ${editing ? `<button class="btn danger" style="flex:0 0 auto" onclick="delEntry('${e.id}')">删除</button>` : ''}
      <button class="btn pri" onclick="saveBurn('${editing ? e.id : ''}')">保存</button>
    </div>`);
  pickCardio(k0, true);
  if (!editing) setTimeout(() => { const el = $(k0 === 'box' || k0 === 'tread' ? '#x-mins' : '#x-kcal'); if (el && !CDAI) el.focus(); }, 300);
}

function pickCardio(k, init) {
  if (!init) BURN.pct = k === BURN.k0 && BURN.keep ? BURN.keep : cardioKindPct(k);
  if (init) BURN.keep = BURN.pct;
  if (!init && k === 'box' && !BURN.met) BURN.met = BOX_LV[1].met;
  BURN.k = k;
  const c = cardioDef(k);
  document.querySelectorAll('.cd-opt').forEach(b => {
    const on = b.dataset.k === k;
    b.classList.toggle('on', on); b.setAttribute('aria-checked', on);
  });
  const nm = $('#x-name');
  if (nm) nm.style.display = c.f.includes('name') ? '' : 'none';
  document.querySelectorAll('#sheet-body .cd-f').forEach(el => { const f = el.dataset.f; el.style.display = f === 'mins' || c.f.includes(f) ? '' : 'none'; });
  const kt = $('#x-kt');   // 「活动消耗」只有手表会给；器械屏幕上的都是总消耗
  if (kt) kt.parentElement.style.display = c.f.includes('kcal') && (['run', 'box', 'other'].includes(k) || BURN.kt === 'active') ? '' : 'none';
  CD_FIELDS.forEach(([f, id, lb]) => { const l = $('#' + id + '-l'); if (l) l.textContent = lb(k); });
  const h = $('#x-hint');
  if (h) h.textContent = (CD_HINT[k] || '') + '。平路走路不用记：步数里已经算过了';
  renderLvl(); renderGait(); burnPreview();
}

// 拳击课强度
function renderLvl() {
  const el = $('#x-lvl');
  if (!el) return;
  const m = BURN.met, custom = m && !BOX_LV.some(x => x.met === m);
  el.innerHTML = `<label class="lbl">强度（2024 Compendium）</label><div class="chips cd-lv">${BOX_LV.map(x =>
    `<button class="chip ${m === x.met ? 'on' : ''}" onclick="pickLvl(${x.met})" aria-pressed="${m === x.met}"><b>${x.name}</b> <span class="num">${x.met}</span><small>${x.d}</small></button>`).join('')}
    ${custom ? `<button class="chip on" aria-pressed="true"><b>${BURN.mf === 'estimate' ? 'AI 估' : 'MET'}</b> <span class="num">${m}</span></button>` : ''}</div>`;
}
function pickLvl(m) { BURN.met = m; BURN.mf = ''; renderLvl(); burnPreview(); }

// 走 / 跑（没选时按速度）
function renderGait() {
  const el = $('#x-gait');
  if (!el) return;
  const g = treadGait({ gait: BURN.gait, sp: $('#x-speed') ? $('#x-speed').value : '' });
  el.innerHTML = `<div class="seg" role="radiogroup" aria-label="走还是跑">${[['walk', '走'], ['run', '跑']].map(([v, t]) =>
    `<button type="button" role="radio" aria-checked="${g === v}" class="${g === v ? 'on' : ''}" onclick="BURN.gait='${v}';renderGait();burnPreview()">${t}${!BURN.gait && g === v ? '<small>（按速度）</small>' : ''}</button>`).join('')}</div>`;
}

function burnInput(f) {
  if (f === 'met' && $('#x-met').value !== BURN.aiMet) BURN.mf = '';   // 自己改了 AI 估的 MET → 按屏幕上的数算
  if (f === 'speed') renderGait();
  burnPreview();
}
function burnData() {
  const c = cardioDef(BURN.k), v = id => { const el = $('#' + id); return el ? el.value.trim() : ''; }, has = f => c.f.includes(f);
  return {
    k: BURN.k, min: v('x-mins'), kcal: has('kcal') ? v('x-kcal') : '', kt: BURN.kt,
    met: BURN.k === 'box' ? BURN.met : has('met') ? v('x-met') : '', mf: BURN.k === 'box' || has('met') && v('x-met') ? BURN.mf : '',
    sp: has('speed') ? v('x-speed') : '', gr: has('grade') ? v('x-grade') : '', gait: BURN.gait,
    dist: has('dist') ? v('x-dist') : '', st: v('x-steps'), pct: BURN.pct
  };
}

const h2 = min => String(Math.round(min / 60 * 100) / 100);
function burnPreview() {
  const el = $('#x-prev');
  if (!el || !$('#x-mins')) return;
  const s = cfg(), d = burnData(), r = cardioCalc(d, s, burnDate()), c = cardioDef(d.k);
  BURN.calc = r; BURN.d = d;
  const st = $('#x-steps');
  if (st) st.placeholder = r.src !== 'none' && r.src !== 'ratio' ? `约 ${fmt(Math.round(r.min * r.cad))}` : d.k === 'box' || d.k === 'other' ? '0' : '';
  if (r.src === 'ratio') {
    const def = cardioKindPct(d.k);   // 旧记录按当时的比例存的；和现在的默认不同时，给一个一键改成现在比例的按钮
    el.innerHTML = `<div class="cd-prev-r"><span>计入</span><b class="num">+${fmt(r.cnt)}</b><span>kcal</span></div>
      <div class="cd-prev-s"><span class="num">${fmt(r.kcal)} × ${r.pct}%</span> · ${c.why}；填上时长会算得更准</div>
      ${BURN.pct !== def ? `<button class="link cd-redo" onclick="burnUseDefault()">这条是按 ${BURN.pct}% 记的，改成现在的 ${def}%</button>` : ''}`;
    return;
  }
  if (r.src === 'none') {
    const need = !num(d.min) ? '时长' : d.k === 'tread' ? '速度' : d.k === 'run' ? '距离或手表 kcal' : d.k === 'box' ? '强度' : 'kcal 或 MET';
    el.innerHTML = `<div class="cd-prev-r"><span>计入</span><b class="num muted">—</b></div><div class="cd-prev-s">填上${need}就能算</div>`;
    return;
  }
  const kgT = r.kg ? `<div class="cd-prev-s">体重 <b class="num">${fmt1(r.kg)}</b> kg：${bodyKgText(r.kgSrc)}</div>` : '';
  let g;
  if (r.src === 'device') g = `${fmt(r.kcal)}${r.kt === 'active' ? '（活动）' : ''} × 90%${r.kt === 'active' ? ` + 基础代谢 ${fmt(r.bmrAdd)}` : ''}`;
  else if (r.src === 'acsm') g = `ACSM ${r.gait === 'run' ? '跑步' : '走路'}公式 ${fmt1(r.sp)} km/h${d.k === 'tread' ? ` · 坡度 ${fmt1(r.gr)}%` : ''} ≈ MET ${fmt1(r.met)} × ${fmt1(r.kg)} kg × ${h2(r.min)} h`;
  else g = `MET ${fmt1(r.met)}${d.mf === 'estimate' ? '（AI 估）' : ''} × ${fmt1(r.kg)} kg × ${h2(r.min)} h`;
  el.innerHTML = `<div class="cd-prev-r"><span>计入</span><b class="num">+${fmt(r.cnt)}</b><span>kcal</span></div>
    <div class="cd-prev-s num">总消耗 ${fmt(r.gross)} = ${g}</div>
    <div class="cd-prev-s num">− 静息 ${fmt(r.rest)} − 步数里已算 ${fmt(r.stK)}（${fmt(r.stN)} 步${r.stEst ? r.cad ? `，按 ${fmt(r.cad)} 步/分估` : '' : ''}）</div>${kgT}`;
}
function burnUseDefault() {
  BURN.pct = BURN.keep = cardioKindPct(BURN.k);
  burnPreview();
}

function saveBurn(id) {
  const old = id ? DB.log.find(x => x.id === id) : null;
  if (!$('.cd-opts')) {   // 旧日子
    const k = num($('#x-kcal').value);
    if (!k) { toast('填写 kcal'); return; }
    upsertRow('log', { id: id || uid('l_'), date: old ? old.date : VIEW.date, time: old ? old.time : VIEW.date === today() ? nowHM() : '', meal: '', type: 'burn',
      name: $('#x-name').value.trim() || '额外消耗', kcal: k, protein: 0, fat: 0, carb: 0, note: '', foodId: '', ratio: 0 });
    closeSheet(); renderToday();
    return;
  }
  const d = burnData(), r = cardioCalc(d, cfg(), burnDate()), c = cardioDef(d.k);
  const bad = (v, lo, hi) => hasVal(v) && (parseFloat(v) < lo || parseFloat(v) > hi);
  if (bad(d.min, 0, 600)) { toast('时长不对'); return; }
  if (bad(d.kcal, 0, 5000)) { toast('kcal 不对'); return; }
  if (bad(d.sp, 0, 30) || bad(d.gr, -10, 40)) { toast('速度或坡度不对'); return; }
  if (bad(d.dist, 0, 100) || bad(d.met, 0, 25) || bad(d.st, 0, 100000)) { toast('数字不对'); return; }
  if (r.src === 'none') { toast(!num(d.min) ? (c.key ? '填写 kcal' : '填写时长') : '还缺数字，看预览里的提示'); return; }
  const row = cardioRow(d, r, BURN.ai ? { ai: BURN.ai } : null);
  const name = c.k === 'other' ? ($('#x-name').value.trim() || '其他')
    : c.k === 'tread' ? (r.src === 'acsm' && r.gait === 'walk' && r.gr >= 3 ? '跑步机爬坡' : '跑步机') : c.title || c.name;
  LOCAL.cardioKind = c.k; saveLocal();   // 下次默认选上次的种类
  const e = upsertRow('log', {
    id: id || uid('l_'), date: old ? old.date : VIEW.date, time: old ? old.time : VIEW.date === today() ? nowHM() : '', meal: '', type: 'burn',
    name, kcal: row.kcal, protein: 0, fat: 0, carb: 0, note: row.note, foodId: '', ratio: row.ratio, detail: row.detail
  });
  CDAI = null;
  closeSheet(); renderToday();
  if (!id) toast(`有氧 +${fmt(cardioCounted(e))}`, '撤销', () => { deleteRow('log', e.id); renderToday(); });
}
