// ════════════════════════════════════════════
// 今日：今天建议练的部位（按周几），用正面 / 背面人体图标出主要部位和次要部位
// 人体图是自己画的：右半边的轮廓和肌肉块，左半边镜像；颜色全部用主题变量
// ════════════════════════════════════════════
// 0 = 周日 … 6 = 周六
const WEEK_PARTS = [
  { title: '下肢 · 深蹲日', items: '深蹲 · 股四头 · 腘绳肌 · 二头 ×2 · 三头', main: ['股四头', '腘绳肌', '二头', '三头'], sub: ['臀', '内收', '下背', '前臂'] },
  { title: '有氧', items: '椭圆机或跑步，低强度', main: [], sub: [] },
  { title: '上肢 · 肩推日', items: '肩推 · 背下拉 · 背后拉 · 哑铃卧推 · 下胸 · 中束', main: ['前束', '中束', '背阔', '斜方', '中胸', '下胸'], sub: ['三头', '二头', '后束'] },
  { title: '下肢 · 硬拉日', items: '硬拉 · 臀 ×2 · 三头 ×2 · 二头', main: ['臀', '三头', '二头'], sub: ['腘绳肌', '下背', '外展', '前臂'] },
  { title: '上肢 · 卧推日', items: '卧推 · 上胸 · 背宽 · 背厚 · 中束 · 后束', main: ['中胸', '上胸', '背阔', '斜方', '中束', '后束'], sub: ['前束', '三头', '二头'] },
  { title: '拳击', items: '全身，肩和核心为主', main: ['核心', '前束', '中束'], sub: ['股四头', '小腿', '臀', '三头', '后束'] },
  { title: '休息', items: '好好恢复', main: [], sub: [] }
];

// 右半边轮廓：从头顶中点出发，一段段三次贝塞尔曲线 [控制点1, 控制点2, 终点]，到裆部结束
const MM_OUT = [
  [10, 0, 17, 8, 17, 22], [17, 34, 12, 44, 9, 47], [9.3, 50, 9.7, 53, 10, 56], [22, 58, 40, 59, 50, 64], [60, 68, 64, 80, 64, 94],
  [66, 112, 70, 132, 72, 156], [76, 178, 82, 202, 84, 226], [87, 238, 88, 250, 83, 256], [78, 260, 73, 254, 73, 244], [72, 232, 66, 206, 60, 182],
  [56, 162, 54, 138, 50, 116], [48, 108, 46, 104, 45, 102], [44, 130, 36, 160, 34, 178], [33, 190, 40, 202, 41, 214], [42, 250, 34, 282, 30, 302],
  [28, 318, 30, 340, 26, 362], [23, 378, 22, 386, 24, 394], [25, 400, 10, 400, 8, 396], [8, 386, 10, 372, 10, 360], [8, 336, 8, 318, 9, 304],
  [9, 286, 6, 252, 3, 222], [2, 218, 1, 216, 0, 214]
];
function mmOutline() {
  let d = 'M0 0', pts = [[0, 0]];
  MM_OUT.forEach(s => { d += `C${s[0]} ${s[1]} ${s[2]} ${s[3]} ${s[4]} ${s[5]}`; pts.push([s[4], s[5]]); });
  for (let i = MM_OUT.length - 1; i >= 0; i--) {   // 左半边：镜像后倒着走回头顶
    const s = MM_OUT[i], p = pts[i];
    d += `C${-s[2]} ${s[3]} ${-s[0]} ${s[1]} ${-p[0]} ${p[1]}`;
  }
  return d + 'Z';
}
// 肌肉块（右半边）：[细部位, 路径]
const MM_FRONT = [
  ['上胸', 'M3 66C16 62 32 63 42 69C44 73 44 78 43 82C30 84 14 84 3 82Z'],
  ['中胸|下胸', 'M3 84C16 86 32 86 43 84C47 92 47 101 42 107C34 116 18 119 3 116Z'],
  ['前束', 'M44 70C50 68 54 70 56 74C57 84 55 96 50 104C47 96 45 86 44 80Z'],
  ['中束', 'M54 66C60 68 64 78 64 92C64 98 62 102 59 105C58 94 58 82 56 74C56 70 55 68 54 66Z'],
  ['二头', 'M52 110C58 114 64 126 66 140C67 150 64 156 60 158C56 150 52 132 51 118Z'],
  ['前臂', 'M62 166C68 168 76 186 80 206C82 218 80 226 77 228C72 220 66 200 62 180Z'],
  ['核心', 'M3 120C14 120 26 122 30 126C32 150 31 172 28 190C20 198 10 202 3 204Z'],
  ['核心', 'M32 124C37 130 40 150 38 170C36 178 34 184 31 187C33 168 34 146 32 124Z'],
  ['股四头', 'M11 224C20 216 36 216 40 228C42 252 36 282 30 296C24 302 16 302 12 296C10 270 9 246 11 224Z'],
  ['内收', 'M3 224C6 224 8 226 9 230C8 248 9 266 10 282C6 268 4 248 3 232Z'],
  ['小腿', 'M12 312C18 308 26 312 28 324C30 340 26 356 22 366C18 368 14 364 13 356C11 340 11 324 12 312Z']
];
const MM_BACK = [
  ['斜方', 'M2 54C12 58 28 62 44 66C36 74 26 86 18 98C12 108 6 118 2 126Z'],
  ['后束', 'M45 68C51 66 56 68 58 74C59 84 57 96 53 104C50 94 47 82 45 72Z'],
  ['中束', 'M58 68C63 72 65 80 65 92C65 98 63 102 60 105C60 94 60 82 58 74Z'],
  ['背阔', 'M18 102C26 92 38 84 46 98C46 120 42 146 34 170C26 168 18 158 13 148C13 130 15 114 18 102Z'],
  ['下背', 'M2 134C8 136 12 146 13 158C14 174 14 188 12 200C8 202 4 202 2 200Z'],
  ['三头', 'M54 110C60 114 65 126 67 142C67 152 65 158 61 160C57 150 54 132 53 118Z'],
  ['前臂', 'M62 166C68 168 76 186 80 206C82 218 80 226 77 228C72 220 66 200 62 180Z'],
  ['外展', 'M24 196C32 194 38 198 40 206C38 210 34 210 30 208C28 204 26 200 24 196Z'],
  ['臀', 'M4 206C16 200 32 202 38 214C42 230 36 244 26 248C16 250 8 246 3 240Z'],
  ['腘绳肌', 'M10 254C18 252 30 254 36 260C36 278 32 292 28 302C22 306 16 304 12 298C10 282 9 268 10 254Z'],
  ['小腿', 'M12 310C18 304 28 308 30 322C32 336 28 350 22 360C18 362 14 358 13 350C10 336 10 322 12 310Z']
];
// 腹肌分块线、脊柱线
const MM_LINES = { f: 'M4 145H29M4 165H30M4 184H28', fc: 'M0 120V204', b: '', bc: 'M0 56V204' };
// 标注：[文字, 细部位, 指向的点（人体坐标，负数是左半边）, 文字所在的高度]
const MM_LABELS = {
  fl: [['上胸', '上胸', [-24, 74], 92], ['中下胸', '中胸|下胸', [-22, 100], 114], ['二头', '二头', [-58, 134], 170],
    ['腹部', '核心', [-16, 160], 214], ['内收', '内收', [-6, 250], 262], ['股四', '股四头', [-24, 264], 306]],
  fr: [['前束', '前束', [50, 84], 66], ['中束', '中束', [61, 88], 88], ['小臂', '前臂', [72, 196], 150], ['小腿', '小腿', [21, 336], 330]],
  bl: [['后束', '后束', [-52, 84], 66], ['中束', '中束', [-62, 88], 88], ['三头', '三头', [-62, 136], 150], ['下背', '下背', [-7, 170], 214]],
  br: [['斜方', '斜方', [14, 78], 66], ['背阔', '背阔', [32, 128], 128], ['臀部', '臀|外展', [24, 224], 214], ['腘绳', '腘绳肌', [22, 280], 280], ['小腿', '小腿', [22, 334], 336]]
};
const MM_S = 0.9, MM_Y = 14, MM_FX = 118, MM_BX = 382;   // 缩放、顶部留白、正面 / 背面的中线位置

function mmLevel(parts, plan) {
  const ps = parts.split('|');
  return ps.some(p => plan.main.includes(p)) ? 1 : ps.some(p => plan.sub.includes(p)) ? 2 : 0;
}
function mmFigure(cx, regions, lines, center, plan, side, sk) {
  const sh = (d, lv, mirror) => `<path class="mm-m l${lv}" d="${d}"${mirror ? ' transform="scale(-1 1)"' : ''}/>`;
  let s = `<g transform="translate(${cx} ${MM_Y}) scale(${MM_S})">`;
  if (sk.back) s += `<g class="sk-back">${sk.back(side)}</g>`;
  s += `<path class="mm-body" d="${MM_OUTLINE}"/><g class="mm-ms">`;
  regions.forEach(([parts, d]) => { const lv = mmLevel(parts, plan); s += sh(d, lv) + sh(d, lv, 1); });
  s += '</g>';
  if (lines) s += `<path class="mm-ln" d="${lines}"/><path class="mm-ln" d="${lines}" transform="scale(-1 1)"/>`;
  s += `<path class="mm-ln" d="${center}"/>`;
  if (sk.over) s += `<g class="sk-over">${sk.over(side)}</g>`;
  return s + '</g>';
}
function mmLabels(list, cx, side, plan) {
  // side：L 文字在人体左边（文字右端连线），R 文字在右边（文字左端连线）
  return list.map(([text, parts, a, y]) => {
    const lv = mmLevel(parts, plan), w = text.length * 15 + 4;
    let tx, x0, x1, ex;
    if (side === 'fl') { tx = 2; x0 = 0; x1 = w; ex = x1; }
    else if (side === 'fr') { tx = 206; x0 = 202; x1 = 206 + w; ex = x0; }
    else if (side === 'bl') { tx = 298; x0 = 298 - w; x1 = 302; ex = x1; }
    else { tx = 466; x0 = 462; x1 = 466 + w; ex = x0; }
    const ax = r1(cx + a[0] * MM_S), ay = r1(MM_Y + a[1] * MM_S), ly = y + 5;
    return `<g class="mm-lb l${lv}"><path d="M${x0} ${ly}H${x1}M${ex} ${ly}L${ax} ${ay}"/><circle cx="${ax}" cy="${ay}" r="2"/>
      <text x="${tx}" y="${y}"${side === 'bl' ? ' text-anchor="end"' : ''}>${text}</text></g>`;
  }).join('');
}
let MM_OUTLINE = '';
function musclesSVG(plan, sk) {
  if (!MM_OUTLINE) MM_OUTLINE = mmOutline();
  const pad = sk.pad || 0;
  return `<svg class="mm-svg" viewBox="0 ${-pad} 500 ${392 + pad}" role="img" aria-label="训练部位：主要 ${plan.main.join('、') || '无'}；次要 ${plan.sub.join('、') || '无'}">${MM_DEFS}`
    + mmFigure(MM_FX, MM_FRONT, MM_LINES.f, MM_LINES.fc, plan, 'f', sk)
    + mmFigure(MM_BX, MM_BACK, '', MM_LINES.bc, plan, 'b', sk)
    + mmLabels(MM_LABELS.fl, MM_FX, 'fl', plan) + mmLabels(MM_LABELS.fr, MM_FX, 'fr', plan)
    + mmLabels(MM_LABELS.bl, MM_BX, 'bl', plan) + mmLabels(MM_LABELS.br, MM_BX, 'br', plan)
    + '</svg>';
}
function renderMuscles() {
  const el = $('#t-mm');
  if (!el) return;
  const d = VIEW.date, w = parseYmd(d).getDay(), plan = WEEK_PARTS[w];
  const rest = !plan.main.length && !plan.sub.length, sk = mmSkin();
  el.dataset.fold = 'today:mm';
  el.classList.toggle('folded', isFolded('today:mm'));
  el.classList.toggle('mm-rest', rest);
  el.classList.toggle('mm-anim', el.dataset.mmFor !== d);   // 换了日子才播放亮起来的动画（今日页经常重画，不每次都闪）
  el.dataset.mmFor = d;
  el.innerHTML = `<div class="card-t fold-t" ${foldAttrs('today:mm')}>${sk.title}<span>${['周日', '周一', '周二', '周三', '周四', '周五', '周六'][w]} · ${plan.title}</span>${FOLD_IC}</div>
    <div class="fold"><div class="fold-in">
      <div class="mm-plan">${w === 6 ? sk.rest : plan.items}</div>
      ${musclesSVG(plan, sk)}
      ${rest ? '' : `<div class="mm-leg"><span><i class="l1"></i>${sk.leg[0]}</span><span><i class="l2"></i>${sk.leg[1]}</span></div>`}
    </div></div>`;
}

// 旧版「训练」页留在手机里的东西：本机数据、没上传的操作、两个设置项，一起清掉
(function cleanupOldTraining() {
  const gone = ['Exercises', 'Plan', 'Sets'], n = OUTBOX.length;
  OUTBOX = OUTBOX.filter(o => !gone.includes(o.table));
  let db = false;
  ['exercises', 'plan', 'sets'].forEach(k => { if (k in DB) { delete DB[k]; db = true; } });
  ['trainSlot', 'trainSeed'].forEach(k => { if (k in DB.settings) { delete DB.settings[k]; db = true; OUTBOX.push({ op: 'delete', table: 'Settings', id: k }); } });
  if (db) saveDB();
  if (db || OUTBOX.length !== n) saveOutbox();
  if ('workout' in LOCAL) { delete LOCAL.workout; saveLocal(); }
})();
