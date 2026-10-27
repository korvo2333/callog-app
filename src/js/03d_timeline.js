// ════════════════════════════════════════════
// 今日：摄入时间（热量 + 蛋白质 / 脂肪 / 碳水，各一张）
// 柱 = 那个时间吃了多少（左轴），线 = 吃到那时为止的累计（右轴），虚线 = 当天目标
// ════════════════════════════════════════════
const MEAL_HM = { '早餐': '08:00', '午餐': '12:30', '加餐': '15:30', '晚餐': '19:00' };   // 没有时间的记录按餐次估
const TL_K = [
  { k: 'kcal', name: '热量', unit: 'kcal', color: 'var(--kcal)', t: 'target' },
  { k: 'protein', name: '蛋白质', unit: 'g', color: 'var(--protein)', t: 'proteinT' },
  { k: 'fat', name: '脂肪', unit: 'g', color: 'var(--fat)', t: 'fatT' },
  { k: 'carb', name: '碳水', unit: 'g', color: 'var(--carb)', t: 'carbT' }
];
const hm2h = s => { const m = /^(\d{1,2}):(\d{2})/.exec(s || ''); return m ? +m[1] + +m[2] / 60 : null; };
const TL_RAMP = 1;   // 累计线每次升上去用的时长（小时）
// 颜色是不是深色（按亮度）
function tlDark(c) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(c), r = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c);
  let v;
  if (m) { const x = m[1].length === 3 ? m[1].replace(/./g, '$&$&') : m[1]; v = [0, 2, 4].map(i => parseInt(x.substr(i, 2), 16)); }
  else if (r) v = [+r[1], +r[2], +r[3]];
  else return false;
  return 0.299 * v[0] + 0.587 * v[1] + 0.114 * v[2] < 128;
}
const h2hm = h => { const m = Math.round(h * 60); return `${pad2(Math.floor(m / 60) % 24)}:${pad2(m % 60)}`; };

// 按时间排好，20 分钟以内的算同一次
function tlGroups(foods) {
  const pts = foods.map(e => {
    const h = hm2h(e.time);
    return { h: h !== null ? h : hm2h(MEAL_HM[e.meal] || MEAL_HM['加餐']), est: h === null, e };
  }).sort((a, b) => a.h - b.h);
  const g = [];
  pts.forEach(p => {
    const last = g[g.length - 1];
    if (last && p.h - last.h <= 1 / 3) { last.items.push(p.e); last.est = last.est && p.est; }
    else g.push({ h: p.h, est: p.est, items: [p.e] });
  });
  g.forEach(x => TL_K.forEach(({ k }) => { x[k] = sum(x.items, k); }));
  return g;
}

function renderTimeline() {
  const el = $('#t-time');
  if (!el) return;
  const info = dayInfo(VIEW.date), isToday = VIEW.date === today();
  const g = tlGroups(info.foods.filter(e => num(e.kcal) > 0 || num(e.protein) > 0 || num(e.fat) > 0 || num(e.carb) > 0));
  el.dataset.fold = 'today:tl';
  el.classList.toggle('folded', isFolded('today:tl'));
  const right = g.length ? `${g.length} 次 · 最后 ${h2hm(g[g.length - 1].h)}` : '';
  let body;
  if (!g.length) body = `<div class="empty">还没有记录</div>`;
  else {
    body = TL_K.map(o => {
      const key = 'tl:' + o.k, tot = sum(g, o.k), tg = num(info[o.t]);
      return `<div class="tl-sec ${isFolded(key) ? 'folded' : ''}" data-fold="${key}">
        <div class="tl-h fold-t" ${foldAttrs(key)}><span class="tl-n"><i style="background:${o.color}"></i>${o.name}</span>
          <span class="num">${fmt(tot)}<small> / ${fmt(tg)} ${o.unit}</small></span>${FOLD_IC}</div>
        <div class="fold"><div class="fold-in"><div class="chart tl-ch" id="tl-${o.k}"></div></div></div></div>`;
    }).join('');
    if (g.some(x => x.est)) body += `<div class="tl-note">虚线框的柱子没有记时间，按餐次估：早餐 8:00 · 午餐 12:30 · 加餐 15:30 · 晚餐 19:00。点记录可以改时间。</div>`;
  }
  el.innerHTML = `<div class="card-t fold-t" ${foldAttrs('today:tl')}>摄入时间<span>${right}</span>${FOLD_IC}</div>
    <div class="fold"><div class="fold-in">${body}</div></div>`;
  if (!g.length) return;
  const d = new Date(), now = isToday ? d.getHours() + d.getMinutes() / 60 : null;
  TL_K.forEach(o => tlChart($('#tl-' + o.k), g, o, num(info[o.t]), now));
}

function tlChart(el, g, o, target, now) {
  if (!el) return;
  CHARTS[el.id] = () => tlChart(el, g, o, target, now);
  const k = o.k, W = Math.max(260, Math.round(el.clientWidth || 320)), H = 156;
  const m = { l: 36, r: 38, t: 14, b: 22 };
  const hs = g.map(x => x.h);
  const lo = Math.max(0, Math.min(6, ...hs.map(h => Math.floor(h - 0.5))));
  const hi = Math.min(24, Math.max(22, ...hs.map(h => Math.ceil(h + 0.5)), now !== null ? Math.ceil(now) : 0));
  const iw = W - m.l - m.r;
  const X = h => m.l + (h - lo) / (hi - lo) * iw;
  let acc = 0;
  const cum = g.map(x => (acc += x[k]));
  const total = acc;
  // 左轴：柱，按当天单次最多的那次；右轴：累计和目标
  const t = niceTicks(0, Math.max(...g.map(x => x[k]), 1) * 1.08, 3);
  const t2 = niceTicks(0, Math.max(target, total, 1) * 1.08, 3);
  const Y = v => m.t + (1 - v / t.hi) * (H - m.t - m.b);
  const Y2 = v => m.t + (1 - v / t2.hi) * (H - m.t - m.b);
  const fv = v => k === 'kcal' ? fmt(v) : String(r1(v));
  // 累计线：浅色背景用黑色，深色背景用白色
  const bg = getComputedStyle(el).getPropertyValue('--surface').trim() || getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
  const lc = tlDark(bg) ? '#fff' : '#000';
  let svg = '';
  t.ticks.forEach(v => {
    svg += `<line class="gl" x1="${m.l}" x2="${W - m.r}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}"/>`;
    svg += `<text class="ax" x="${m.l - 6}" y="${(Y(v) + 3).toFixed(1)}" text-anchor="end">${tickLabel(v)}</text>`;
  });
  t2.ticks.forEach(v => {
    svg += `<text class="ax" x="${W - m.r + 6}" y="${(Y2(v) + 3).toFixed(1)}" text-anchor="start">${tickLabel(v)}</text>`;
  });
  for (let h = Math.ceil(lo / 3) * 3; h <= hi; h += 3) {
    const a = h === lo ? 'start' : h === hi ? 'end' : 'middle';
    svg += `<text class="ax" x="${X(h).toFixed(1)}" y="${H - 6}" text-anchor="${a}">${h}:00</text>`;
  }
  // 目标
  if (target > 0) {
    const y = Y2(target).toFixed(1);
    svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${y}" y2="${y}" stroke="var(--muted)" stroke-width="1.3" stroke-dasharray="5 4"/>`;
    svg += `<text x="${m.l + 4}" y="${(Y2(target) - 4).toFixed(1)}" class="ax">目标 ${fv(target)}</text>`;
  }
  // 现在
  if (now !== null && now > lo && now < hi) {
    const x = X(now).toFixed(1);
    svg += `<line x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}" stroke="var(--border)" stroke-width="1.3" stroke-dasharray="2 3"/>`;
  }
  // 柱：那个时间吃了多少
  const bw = Math.max(6, Math.min(13, iw / (hi - lo) * 0.5));
  g.forEach(x => {
    const v = x[k];
    if (!(v > 0)) return;
    const x0 = X(x.h) - bw / 2, x1 = x0 + bw, y0 = Y(v), yb = Y(0), r = Math.min(3, bw / 2, yb - y0);
    const d = `M${x0.toFixed(1)},${yb}V${(y0 + r).toFixed(1)}Q${x0.toFixed(1)},${y0.toFixed(1)} ${(x0 + r).toFixed(1)},${y0.toFixed(1)}H${(x1 - r).toFixed(1)}Q${x1.toFixed(1)},${y0.toFixed(1)} ${x1.toFixed(1)},${(y0 + r).toFixed(1)}V${yb}Z`;
    svg += x.est ? `<path d="${d}" fill="color-mix(in srgb, ${o.color} 22%, transparent)" stroke="${o.color}" stroke-width="1.2" stroke-dasharray="3 2"/>`
      : `<path d="${d}" fill="color-mix(in srgb, ${o.color} 55%, transparent)"/>`;
  });
  // 线：累计（平滑：每次摄入在记录时间前后各半小时里按 S 形升上去）
  const end = now !== null ? Math.max(now, g[g.length - 1].h) : Math.max(hi - 0.5, g[g.length - 1].h);
  const cumAt = h => g.reduce((s, x) => {
    const u = Math.min(1, Math.max(0, (h - x.h + TL_RAMP / 2) / TL_RAMP));
    return s + x[k] * u * u * (3 - 2 * u);
  }, 0);
  const x1 = Math.min(hi, end), n = Math.max(2, Math.ceil((X(x1) - X(lo)) / 2));
  let p = '';
  for (let i = 0; i <= n; i++) {
    const h = lo + (x1 - lo) * i / n;
    p += `${i ? 'L' : 'M'}${X(h).toFixed(1)},${Y2(cumAt(h)).toFixed(1)}`;
  }
  svg += `<path d="${p}" fill="none" stroke="${lc}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
  svg += `<g class="xh"></g>`;
  el.innerHTML = `<div class="ch-read"></div><svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${o.name}按时间：共 ${fv(total)} ${o.unit}">${svg}</svg>`;
  const read = el.querySelector('.ch-read'), hx = el.querySelector('.xh'), svgEl = el.querySelector('svg');
  const readFor = i => {
    const x = g[i], names = x.items.map(e => e.name).join('、');
    return `<b>${h2hm(x.h)}</b>${x.est ? '（估）' : ''} · 这次 <b>${fv(x[k])}</b> · 累计 <b>${fv(cum[i])}</b>${target > 0 ? ` / ${fv(target)}` : ''} ${o.unit}<span class="tl-what">${esc(names)}</span>`;
  };
  const show = i => {
    const x = X(g[i].h).toFixed(1);
    hx.innerHTML = `<line x1="${x}" x2="${x}" y1="${m.t}" y2="${H - m.b}" stroke="var(--muted)" stroke-width="1"/>`;
    read.innerHTML = readFor(i);
  };
  read.innerHTML = '最近 · ' + readFor(g.length - 1);
  const onMove = ev => {
    const r = svgEl.getBoundingClientRect(), h = lo + ((ev.clientX - r.left) * W / r.width - m.l) / iw * (hi - lo);
    let best = 0;
    g.forEach((x, i) => { if (Math.abs(x.h - h) < Math.abs(g[best].h - h)) best = i; });
    show(best);
  };
  svgEl.addEventListener('pointermove', onMove);
  svgEl.addEventListener('pointerdown', onMove);
}
