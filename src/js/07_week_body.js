// ════════════════════════════════════════════
// 本周页
// ════════════════════════════════════════════
function shiftWeek(n) {
  VIEW.weekOffset = n === 0 ? 0 : Math.min(0, VIEW.weekOffset + n);
  renderWeek();
}

function renderWeek() {
  const s = cfg();
  const start = addDays(weekStartOf(today()), VIEW.weekOffset * 7);
  const end = addDays(start, 6);
  const w = weekSummary(start);
  $('#w-title').textContent = `${md(start)} – ${md(end)}`;
  $('#w-sub').textContent = w.isCurrent ? '本周' : `${-VIEW.weekOffset} 周前`;

  const ratio = w.planDef > 0 ? w.actualDef / w.planDef : 0;
  const st = !w.done.length ? '' : ratio >= 0.9
    ? `<span class="status good">✓ ${Math.round(ratio * 100)}%</span>`
    : `<span class="status ${ratio >= 0.6 ? 'warn' : 'bad'}">△ ${Math.round(ratio * 100)}%</span>`;
  const td = w.todayD;
  const proteinOk = w.avgProtein >= s.protein * 0.9;

  let html = fcard('week:def', '热量缺口', `${w.done.length} 天`, `
    ${w.done.length ? `<div class="big num">${fmt(w.actualDef)} <span class="muted" style="font-size:14px;font-weight:500">kcal</span></div>
      <div style="margin-top:4px;font-size:13px">${st} <span class="muted">· 计划 ${fmt(w.planDef)}</span></div>`
      : `<div class="muted">—</div>`}
    <div class="stats" style="margin-top:14px">
      <div class="stat"><div class="stat-l">≈ 减掉脂肪</div><div class="stat-v num">${(w.actualDef / 7700).toFixed(2)}<small>kg</small></div></div>
      <div class="stat"><div class="stat-l">日均摄入</div><div class="stat-v num">${w.logged.length ? fmt(w.avgIntake) : '—'}<small>kcal</small></div></div>
      <div class="stat"><div class="stat-l">日均蛋白质</div><div class="stat-v num">${w.logged.length ? Math.round(w.avgProtein) : '—'}<small>g</small></div>
        <div class="stat-d">${w.logged.length ? `<span class="status ${proteinOk ? 'good' : 'warn'}">${proteinOk ? '✓' : '△'}</span> 目标 ${s.protein}g` : `目标 ${s.protein}g`}</div></div>
      <div class="stat"><div class="stat-l">平均体重</div><div class="stat-v num">${w.avgWeight ? w.avgWeight.toFixed(1) : '—'}<small>kg</small></div></div>
    </div>
    ${w.isCurrent && w.todayD ? `<div class="hint week-left" style="font-size:13px;color:var(--text2)">${weekLeftHTML(w)}</div>` : ''}
    ${w.missed.length ? `<div class="hint">未记 ${w.missed.map(d => md(d.date)).join('、')}</div>` : ''}`);

  html += fcard('week:chart', '每天摄入', '', `<div class="chart" id="ch-week"></div>`);

  html += fcard('week:daily', '每日明细', w.logged.length ? `日均 ${fmt(w.avgIntake)}` : '', `<table class="tbl"><thead><tr><th>日期</th><th>摄入</th><th>目标</th><th>缺口</th><th>蛋白</th></tr></thead><tbody>
    ${w.days.map(d => {
      const fut = d.date > today();
      return `<tr class="click ${d.date === today() ? 'today' : ''}" onclick="gotoDay('${d.date}')">
        <td>${md(d.date)} 周${WD[dow(d.date)]}${d.label ? `<div class="sub">${esc(d.label)}</div>` : ''}</td>
        <td>${d.logged ? fmt(d.intake.kcal) : '<span class="sub">' + (fut ? '' : '未记') + '</span>'}</td>
        <td>${fmt(d.target)}</td>
        <td>${d.logged ? fmt(d.tdee - d.intake.kcal) : ''}</td>
        <td>${d.logged ? Math.round(d.intake.protein) : ''}</td></tr>`;
    }).join('')}
  </tbody></table>`);

  // 近 8 周
  const cur = weekStartOf(today());
  const weeks = Array.from({ length: 8 }, (_, k) => weekSummary(addDays(cur, -7 * k)));
  html += fcard('week:w8', '近 8 周', '', `<table class="tbl"><thead><tr><th>周</th><th>日均摄入</th><th>缺口</th><th>均重</th><th>变化</th></tr></thead><tbody>
    ${weeks.map((x, k) => {
      const prev = weeks[k + 1];
      const dW = x.avgWeight && prev && prev.avgWeight ? x.avgWeight - prev.avgWeight : null;
      return `<tr class="click" onclick="VIEW.weekOffset=${-k};renderWeek();window.scrollTo(0,0)">
        <td>${md(x.start)}${k === 0 ? '<div class="sub">本周</div>' : ''}</td>
        <td>${x.logged.length ? fmt(x.avgIntake) : '—'}</td>
        <td>${x.done.length ? fmt(x.actualDef) : '—'}</td>
        <td>${x.avgWeight ? x.avgWeight.toFixed(1) : '—'}</td>
        <td>${dW === null ? '—' : (dW > 0 ? '+' : '') + dW.toFixed(1)}</td></tr>`;
    }).join('')}
  </tbody></table>`);

  // 实测维持热量
  const e = estimateTDEE();
  html += fcard('week:tdee', '实测维持热量', e.ok ? fmt(e.est) : '', `
    ${e.ok ? `<div class="big num">${fmt(e.est)} <span class="muted" style="font-size:14px;font-weight:500">kcal/天</span></div>
      <div class="hint">体重 ${e.perWeek > 0 ? '+' : ''}${e.perWeek.toFixed(2)} kg/周${s.formulaFrom ? (e.model ? ` · 公式 ${fmt(e.model)}（${e.est >= e.model ? '+' : '−'}${fmt(Math.abs(e.est - e.model))}）` : '') : ` · 设置 ${fmt(s.tdee)}`}</div>
      ${!s.formulaFrom && Math.abs(e.est - s.tdee) >= 100 ? `<div class="actions"><button class="btn" onclick="applyTDEE(${e.est})">改为 ${fmt(e.est)}</button></div>` : ''}`
      : `<div class="muted">${esc(e.msg)}</div>`}`);

  $('#w-content').innerHTML = html;
  placeMods($('#w-content'), 'week');
  weekChart($('#ch-week'), w);
}
async function applyTDEE(v) {
  if (!await ask(`维持热量改为 ${fmt(v)}？`)) return;
  setSetting('tdee', v);
  rerender();
  toast('已更新维持热量');
}

// ════════════════════════════════════════════
// 身体数据页
// ════════════════════════════════════════════
function loadBodyForm() {
  const d = $('#b-date').value || today();
  const r = DB.body.find(b => b.date === d);
  $('#b-w').value = r && r.weight ? r.weight : '';
  $('#b-bf').value = r && r.bodyfat ? r.bodyfat : '';
  $('#b-muscle').value = r && r.muscle ? r.muscle : '';
  $('#b-note').value = r ? r.note || '' : '';
  $('#b-del').style.display = r ? '' : 'none';
  $('#b-state').textContent = r ? '已有记录' : '';
}
function saveBody() {
  const d = $('#b-date').value || today();
  const w = numOrNull($('#b-w').value), bf = numOrNull($('#b-bf').value), mu = numOrNull($('#b-muscle').value);
  if (w === null && bf === null && mu === null) { toast('至少填一项'); return; }
  if (w !== null && (w < 20 || w > 300)) { toast('体重不对'); return; }
  if (bf !== null && (bf < 2 || bf > 70)) { toast('体脂不对'); return; }
  if (mu !== null && (mu < 5 || mu > 150)) { toast('肌肉量不对'); return; }
  const ex = DB.body.find(b => b.date === d);
  const row = { id: ex ? ex.id : uid('b_'), date: d, note: $('#b-note').value.trim() };
  // 留空的项保留原值
  row.weight = w !== null ? w : (ex ? ex.weight : null);
  row.bodyfat = bf !== null ? bf : (ex ? ex.bodyfat : null);
  row.muscle = mu !== null ? mu : (ex ? ex.muscle : null);
  upsertRow('body', row);
  toast('已保存');
  loadBodyForm();
  renderBody();
}
async function deleteBody() {
  const d = $('#b-date').value;
  const ex = DB.body.find(b => b.date === d);
  if (!ex || !await ask(`删除 ${md(d)} 的身体数据？`, { ok: '删除', danger: true })) return;
  deleteRow('body', ex.id);
  loadBodyForm(); renderBody();
}
function editBodyDate(d) {
  $('#b-date').value = d;
  loadBodyForm();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function setBodyRange(v) { VIEW.bodyRange = v; renderBody(); }

function bodyRangeDates() {
  const s = cfg(), t = today();
  const first = DB.body.map(b => b.date).sort()[0] || t;
  const planOk = s.planStart && s.planEnd && s.planEnd > s.planStart;
  switch (VIEW.bodyRange) {
    case 'w4': return { from: addDays(t, -27), to: t };
    case 'w12': return { from: addDays(t, -83), to: t };
    case 'all': {
      const from = planOk && s.planStart < first ? s.planStart : first;
      const to = planOk && s.planEnd > t ? s.planEnd : t;
      return { from: diffDays(from, to) < 7 ? addDays(to, -7) : from, to };
    }
    default: return planOk ? { from: s.planStart, to: s.planEnd } : { from: addDays(t, -83), to: t };
  }
}

function renderBody() {
  if (!$('#b-date').value) { $('#b-date').value = today(); loadBodyForm(); }
  const s = cfg(), t = today(), ws = weightsSorted();
  const { from, to } = bodyRangeDates();
  const lastW = ws[ws.length - 1];
  const cur = lastW ? avg7(lastW.date, ws) : null;
  const rate = trendPerWeek(14);
  const planWeeks = diffDays(s.planStart, s.planEnd) / 7;
  const planRate = planWeeks > 0 ? (num(s.planEndWeight) - num(s.planStartWeight)) / planWeeks : null;
  const planNow = planAt(t, 'Weight');
  const bfRec = latestBody('bodyfat');
  const muRec = latestBody('muscle');
  const leanOf = b => { const w = b.weight || weightNear(b.date, ws); return w ? w * (1 - b.bodyfat / 100) : null; };
  const lean = bfRec ? leanOf(bfRec) : null;
  const lean0 = num(s.planStartWeight) * (1 - num(s.planStartBf) / 100);

  let proj = '';
  if (cur && rate !== null) {
    const target = num(s.planEndWeight);
    if (cur <= target) proj = `✓ 已达到目标 ${target} kg`;
    else if (rate < -0.05) {
      const days = Math.round((cur - target) / -rate * 7);
      const eta = addDays(t, days);
      const vs = s.planEnd ? diffDays(s.planEnd, eta) : 0;
      proj = `预计 <b>${md(eta)}</b> 到 ${target} kg${s.planEnd ? `（${vs <= 0 ? '早 ' + (-vs) : '晚 ' + vs} 天）` : ''}`;
    } else proj = '近 2 周未下降';
  }

  const rateCls = rate === null || planRate === null ? '' : rate <= planRate * 0.7 && rate >= planRate * 1.4 ? 'good' : rate > planRate * 0.7 ? 'warn' : 'bad';
  let html = `<div data-mod="body:stats"><div style="padding:12px 16px 0">${segHTML('b-range', ['4周', '12周', '计划期', '全部'],
    { w4: '4周', w12: '12周', plan: '计划期', all: '全部' }[VIEW.bodyRange], 'pickBodyRange')}</div>
  <div class="card">
    <div class="stats">
      <div class="stat"><div class="stat-l">体重 7日均</div><div class="stat-v num">${cur ? cur.toFixed(1) : '—'}<small>kg</small></div>
        <div class="stat-d">${cur && planNow ? `计划 ${planNow.toFixed(1)}` : ''}</div></div>
      <div class="stat"><div class="stat-l">每周变化</div><div class="stat-v num">${rate !== null ? (rate > 0 ? '+' : '') + rate.toFixed(2) : '—'}<small>kg</small></div>
        <div class="stat-d">${planRate !== null ? `计划 ${planRate.toFixed(2)}` : ''}${rate !== null && rateCls ? ` <span class="status ${rateCls}">${rateCls === 'good' ? '✓' : rateCls === 'warn' ? '偏慢' : '偏快'}</span>` : ''}</div></div>
      <div class="stat"><div class="stat-l">体脂率</div><div class="stat-v num">${bfRec ? bfRec.bodyfat.toFixed(1) : '—'}<small>%</small></div>
        <div class="stat-d">${bfRec ? `计划 ${(planAt(bfRec.date, 'Bf') || 0).toFixed(1)}` : ''}</div></div>
      <div class="stat"><div class="stat-l">去脂体重</div><div class="stat-v num">${lean ? lean.toFixed(1) : '—'}<small>kg</small></div>
        <div class="stat-d">${lean ? `起点 ${signed1(lean - lean0)}` : ''}</div></div>
    </div>
    ${proj ? `<div class="hint" style="font-size:13px;color:var(--text2)">${proj}</div>` : ''}
  </div></div>`;

  html += fcard('body:w', '体重 kg', cur ? cur.toFixed(1) : '', `<div class="chart" id="ch-w"></div>`)
    + fcard('body:bf', '体脂率 %', bfRec ? bfRec.bodyfat.toFixed(1) : '', `<div class="chart" id="ch-bf"></div>`)
    + fcard('body:lean', '去脂体重 kg', lean ? lean.toFixed(1) : '', `<div class="chart" id="ch-lean"></div>`)
    + fcard('body:muscle', '肌肉量 kg', muRec ? muRec.muscle.toFixed(1) : '', `<div class="chart" id="ch-mu"></div>`);

  const recs = DB.body.slice().sort((a, b) => a.date < b.date ? 1 : -1);
  html += fcard('body:recs', '全部记录', `${recs.length}`, `
    ${recs.length ? `<table class="tbl"><thead><tr><th>日期</th><th>体重</th><th>体脂%</th><th>肌肉</th></tr></thead><tbody>
      ${recs.slice(0, 60).map(b => `<tr class="click" onclick="editBodyDate('${b.date}')"><td>${md(b.date)} 周${WD[dow(b.date)]}${b.note ? `<div class="sub">${esc(b.note)}</div>` : ''}</td>
        <td>${b.weight ? b.weight.toFixed(1) : ''}</td><td>${b.bodyfat ? b.bodyfat.toFixed(1) : ''}</td><td>${b.muscle ? b.muscle.toFixed(1) : ''}</td></tr>`).join('')}
    </tbody></table>`
    : '<div class="empty">还没有记录</div>'}`);

  const form = document.querySelector('[data-fold="body:form"]');   // 「记录」卡是固定的节点（输入框里的内容要留着），先拿出来再排回去
  if (form) form.remove();
  $('#b-content').innerHTML = html;
  placeMods($('#b-content'), 'body', [form]);

  const planW = { name: '计划', color: 'var(--plan)', kind: 'dash', points: planLine('Weight', from, to), valueAt: d => planAt(d, 'Weight') };
  lineChart($('#ch-w'), {
    from, to, unit: ' kg', minSpan: 2, empty: '暂无数据',
    series: [
      { name: '每日', color: 'var(--dots)', kind: 'dots', points: ws.map(b => ({ d: b.date, v: b.weight })) },
      { name: '7日均', color: 'var(--accent)', kind: 'line', endDot: true, points: ws.map(b => ({ d: b.date, v: avg7(b.date, ws) })) },
      planW
    ]
  });
  const bfs = DB.body.filter(b => b.bodyfat).sort((a, b) => a.date < b.date ? -1 : 1);
  lineChart($('#ch-bf'), {
    from, to, unit: '%', minSpan: 2, empty: '暂无数据',
    series: [
      { name: '体脂率', color: 'var(--accent)', kind: 'line', markers: true, endDot: true, points: bfs.map(b => ({ d: b.date, v: b.bodyfat })) },
      { name: '计划', color: 'var(--plan)', kind: 'dash', points: planLine('Bf', from, to), valueAt: d => planAt(d, 'Bf') }
    ]
  });
  const leans = bfs.map(b => ({ d: b.date, v: leanOf(b) })).filter(p => p.v);
  lineChart($('#ch-lean'), {
    from, to, unit: ' kg', minSpan: 2, empty: '暂无数据',
    series: [
      { name: '去脂体重', color: 'var(--accent)', kind: 'line', markers: true, endDot: true, points: leans },
      { name: '起点', color: 'var(--plan)', kind: 'dash', points: lean0 ? [{ d: from, v: lean0 }, { d: to, v: lean0 }] : [], valueAt: () => lean0 || null }
    ]
  });
  const mus = DB.body.filter(b => b.muscle).sort((a, b) => a.date < b.date ? -1 : 1);
  const mu0 = mus.length ? mus[0].muscle : null;
  lineChart($('#ch-mu'), {
    from, to, unit: ' kg', minSpan: 1, empty: '暂无数据',
    series: [
      { name: '肌肉量', color: 'var(--accent)', kind: 'line', markers: true, endDot: true, points: mus.map(b => ({ d: b.date, v: b.muscle })) },
      { name: '起点', color: 'var(--plan)', kind: 'dash', points: mu0 ? [{ d: from, v: mu0 }, { d: to, v: mu0 }] : [], valueAt: () => mu0 }
    ]
  });
}
function pickBodyRange(label) { setBodyRange({ '4周': 'w4', '12周': 'w12', '计划期': 'plan', '全部': 'all' }[label]); }
function planLine(key, from, to) {
  const s = cfg();
  if (!s.planStart || !s.planEnd || s.planEnd <= s.planStart) return [];
  const a = from > s.planStart ? from : s.planStart;
  const b = to < s.planEnd ? to : s.planEnd;
  if (b < a) return [];
  return [{ d: a, v: planAt(a, key) }, { d: b, v: planAt(b, key) }];
}
