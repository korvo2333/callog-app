// ════════════════════════════════════════════
// 图表（内联 SVG，颜色全部取主题变量）
// ════════════════════════════════════════════
const CHARTS = {};   // 容器 id → 重绘函数（窗口尺寸变化时用）

function niceTicks(min, max, count) {
  if (!(max > min)) { min -= 1; max += 1; }
  const raw = (max - min) / (count || 4);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= raw * 0.999) || 10 * mag;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(6));
  return { lo, hi, ticks, step };
}
const tickLabel = v => Math.abs(v) >= 1000 ? (v / 1000).toFixed(v % 1000 ? 1 : 0) + 'K' : String(+v.toFixed(2));

function legendHTML(series) {
  if (series.length < 2) return '';
  return `<div class="legend">${series.map(s => {
    const cls = s.kind === 'dots' ? 'sw dot' : s.kind === 'dash' ? 'sw dash' : s.kind === 'sq' ? 'sw sq' : 'sw';
    const st = (s.kind === 'dots' || s.kind === 'sq') ? `background:${s.color}` : `border-color:${s.color}`;
    return `<span><i class="${cls}" style="${st}"></i>${esc(s.name)}</span>`;
  }).join('')}</div>`;
}

/**
 * 折线/散点图
 * o = { from, to, height, unit, decimals, minSpan, empty,
 *       series: [{ name, color, kind:'line'|'dots'|'dash', markers, endDot, points:[{d,v}], valueAt(d) }] }
 */
function lineChart(el, o) {
  CHARTS[el.id] = () => lineChart(el, o);
  const series = o.series.map(s => Object.assign({}, s, {
    points: s.points.filter(p => p.d >= o.from && p.d <= o.to && isFinite(p.v)).sort((a, b) => a.d < b.d ? -1 : 1)
  }));
  if (!series.some(s => s.kind !== 'dash' && s.points.length)) {
    el.innerHTML = `<div class="empty">${o.empty || '这个时间段还没有数据'}</div>`;
    return;
  }
  const W = Math.max(260, Math.round(el.clientWidth || 320)), H = o.height || 190;
  const m = { l: 36, r: 14, t: 12, b: 22 };
  const span = Math.max(1, diffDays(o.from, o.to));
  const iw = W - m.l - m.r;
  const X = d => m.l + diffDays(o.from, d) / span * iw;
  const vals = series.flatMap(s => s.points.map(p => p.v));
  let mn = Math.min(...vals), mx = Math.max(...vals);
  const ms = o.minSpan || 1;
  if (mx - mn < ms) { const c = (mx + mn) / 2; mn = c - ms / 2; mx = c + ms / 2; }
  const pv = (mx - mn) * 0.08;
  const t = niceTicks(mn - pv, mx + pv, 4);
  const Y = v => m.t + (1 - (v - t.lo) / (t.hi - t.lo)) * (H - m.t - m.b);
  const dec = o.decimals === undefined ? 1 : o.decimals;
  const fv = v => Number(v).toFixed(dec);

  let svg = '';
  t.ticks.forEach(v => {
    svg += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>`;
    svg += `<text class="ax" x="${m.l - 6}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${tickLabel(v)}</text>`;
  });
  const nx = Math.min(4, span + 1);
  for (let i = 0; i < nx; i++) {
    const d = addDays(o.from, Math.round(span * i / Math.max(1, nx - 1)));
    const anchor = i === 0 ? 'start' : i === nx - 1 ? 'end' : 'middle';
    svg += `<text class="ax" x="${X(d).toFixed(1)}" y="${H - 6}" text-anchor="${anchor}">${md(d)}</text>`;
  }
  const td = today();
  if (td > o.from && td < o.to) svg += `<line x1="${X(td)}" x2="${X(td)}" y1="${m.t}" y2="${H - m.b}" stroke="var(--border)" stroke-width="1"/>`;

  series.forEach(s => {
    if (!s.points.length) return;
    if (s.kind === 'dots') {
      svg += s.points.map(p => `<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="3.5" fill="${s.color}" stroke="var(--surface)" stroke-width="1.5"/>`).join('');
      return;
    }
    const path = s.points.map((p, i) => `${i ? 'L' : 'M'}${X(p.d).toFixed(1)},${Y(p.v).toFixed(1)}`).join('');
    const dash = s.kind === 'dash';
    svg += `<path d="${path}" fill="none" stroke="${s.color}" stroke-width="${dash ? 1.5 : 2}" ${dash ? 'stroke-dasharray="6 5"' : ''} stroke-linejoin="round" stroke-linecap="round"/>`;
    if (s.markers || s.points.length === 1) {
      svg += s.points.map(p => `<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="4" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`).join('');
    }
    if (s.endDot) {
      const p = s.points[s.points.length - 1];
      svg += `<circle cx="${X(p.d).toFixed(1)}" cy="${Y(p.v).toFixed(1)}" r="5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`;
      const x = X(p.d), y = Y(p.v);
      const right = x > W - 60;
      svg += `<text x="${(right ? x - 9 : x + 9).toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="${right ? 'end' : 'start'}" style="fill:var(--text);font-size:12px;font-weight:700">${fv(p.v)}</text>`;
    }
  });
  svg += `<g class="xh"></g>`;

  el.innerHTML = `<div class="ch-read"></div>${legendHTML(series)}<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img">${svg}</svg>`;
  const read = el.querySelector('.ch-read'), g = el.querySelector('.xh'), svgEl = el.querySelector('svg');
  const maps = series.map(s => new Map(s.points.map(p => [p.d, p.v])));
  const dates = [...new Set(series.filter(s => s.kind !== 'dash').flatMap(s => s.points.map(p => p.d)))].sort();
  const valueOf = (i, d) => { const v = maps[i].get(d); return v !== undefined ? v : (series[i].valueAt ? series[i].valueAt(d) : undefined); };
  const readFor = d => `<b>${md(d)}</b>` + series.map((s, i) => {
    const v = valueOf(i, d);
    return (v === undefined || v === null) ? '' : ` · ${esc(s.name)} <b>${fv(v)}</b>${o.unit || ''}`;
  }).join('');
  const show = d => {
    const x = X(d).toFixed(1);
    g.innerHTML = `<line x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}" stroke="var(--muted)" stroke-width="1"/>` +
      series.map((s, i) => { const v = maps[i].get(d); return v === undefined ? '' : `<circle cx="${x}" cy="${Y(v).toFixed(1)}" r="5.5" fill="${s.color}" stroke="var(--surface)" stroke-width="2"/>`; }).join('');
    read.innerHTML = readFor(d);
  };
  read.innerHTML = dates.length ? '最新 · ' + readFor(dates[dates.length - 1]) : '';
  const onMove = ev => {
    if (!dates.length) return;
    const r = svgEl.getBoundingClientRect();
    const x = (ev.clientX - r.left) * W / r.width;
    const d = addDays(o.from, Math.round((x - m.l) / iw * span));
    let best = dates[0];
    dates.forEach(dd => { if (Math.abs(diffDays(dd, d)) < Math.abs(diffDays(best, d))) best = dd; });
    show(best);
  };
  svgEl.addEventListener('pointermove', onMove);
  svgEl.addEventListener('pointerdown', onMove);
}

/** 一周 7 天的摄入柱状图 */
function weekChart(el, w) {
  CHARTS[el.id] = () => weekChart(el, w);
  const W = Math.max(260, Math.round(el.clientWidth || 320)), H = 196;
  const m = { l: 36, r: 8, t: 16, b: 26 };
  const base = num(cfg().tdee);
  const maxV = Math.max(base, ...w.days.map(d => Math.max(d.intake.kcal, d.target, d.tdee))) * 1.05;
  const t = niceTicks(0, maxV, 4);
  const Y = v => m.t + (1 - v / t.hi) * (H - m.t - m.b);
  const slot = (W - m.l - m.r) / 7, bw = Math.min(24, slot * 0.5);
  const td = today();
  let svg = '';
  t.ticks.forEach(v => {
    svg += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>`;
    svg += `<text class="ax" x="${m.l - 6}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${tickLabel(v)}</text>`;
  });
  // 维持热量线（新公式的日子每天的消耗不同：每天画一小段）
  const perDay = w.days.some(d => d.mode === 'formula');
  if (!perDay) svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(base).toFixed(1)}" y2="${Y(base).toFixed(1)}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="2 4"/>`;
  else w.days.forEach((d, i) => {
    const x0 = m.l + slot * i + 3, x1 = m.l + slot * (i + 1) - 3, y = Y(d.tdee).toFixed(1);
    svg += `<line x1="${x0.toFixed(1)}" x2="${x1.toFixed(1)}" y1="${y}" y2="${y}" stroke="var(--muted)" stroke-width="1.5" stroke-dasharray="2 4"/>`;
  });
  w.days.forEach((d, i) => {
    const cx = m.l + slot * (i + 0.5);
    const isToday = d.date === td, future = d.date > td;
    if (d.intake.kcal > 0) {
      const v = d.intake.kcal;
      const col = v <= d.target ? 'var(--good)' : v <= d.tdee ? 'var(--warn)' : 'var(--bad)';
      const x0 = cx - bw / 2, x1 = cx + bw / 2, y0 = Y(v), yb = Y(0);
      const r = Math.min(4, bw / 2, yb - y0);
      svg += `<path d="M${x0},${yb}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${yb}Z" fill="${col}" ${isToday ? 'opacity=".55"' : ''}/>`;
      if (v > d.target) {   // 超目标的柱子标出超了多少（不只靠颜色区分）
        const top = Math.min(y0, Y(d.target)) - 6;
        svg += `<text x="${cx}" y="${top.toFixed(1)}" text-anchor="middle" style="fill:var(--text2);font-size:10px;font-weight:600">+${fmt(v - d.target)}</text>`;
      }
    } else if (!future) {
      svg += `<text x="${cx}" y="${Y(0) - 6}" text-anchor="middle" class="ax">未记</text>`;
    }
    if (!future || d.intake.kcal > 0) {
      svg += `<line x1="${cx - bw / 2 - 5}" x2="${cx + bw / 2 + 5}" y1="${Y(d.target).toFixed(1)}" y2="${Y(d.target).toFixed(1)}" stroke="var(--text)" stroke-width="2" stroke-linecap="round"/>`;
    }
    svg += `<text x="${cx}" y="${H - 8}" text-anchor="middle" class="ax" style="${isToday ? 'fill:var(--text);font-weight:700' : ''}">${isToday ? '今天' : '周' + WD[dow(d.date)]}</text>`;
    svg += `<rect x="${cx - slot / 2}" y="0" width="${slot}" height="${H}" fill="transparent" data-i="${i}"/>`;
  });
  el.innerHTML = `<div class="ch-read">&nbsp;</div>
    <div class="legend">
      <span><i class="sw sq" style="background:var(--good)"></i>≤ 目标</span>
      <span><i class="sw sq" style="background:var(--warn)"></i>超目标</span>
      <span><i class="sw sq" style="background:var(--bad)"></i>超维持</span>
      <span><i class="sw" style="border-color:var(--text)"></i>当天目标</span>
      <span><i class="sw dash" style="border-color:var(--muted)"></i>${perDay ? '当天消耗' : '维持 ' + fmt(base)}</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" height="${H}" role="img">${svg}</svg>`;
  const read = el.querySelector('.ch-read');
  el.querySelectorAll('rect[data-i]').forEach(r => r.addEventListener('pointerdown', () => {
    const d = w.days[+r.dataset.i];
    read.innerHTML = d.intake.kcal > 0
      ? `<b>${md(d.date)} 周${WD[dow(d.date)]}</b> · 摄入 <b>${fmt(d.intake.kcal)}</b> / 目标 ${fmt(d.target)} · 缺口 <b>${fmt(d.tdee - d.intake.kcal)}</b>${d.date === td ? '（进行中）' : ''}`
      : `<b>${md(d.date)} 周${WD[dow(d.date)]}</b> · ${d.date > td ? '还没到' : '没有记录'} · 目标 ${fmt(d.target)}`;
  }));
}

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => Object.keys(CHARTS).forEach(id => { const el = document.getElementById(id); if (el && el.offsetParent) CHARTS[id](); }), 200);
});
