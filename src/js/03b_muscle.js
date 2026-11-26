// ════════════════════════════════════════════
// 今日：今天建议练的部位（按周几），用正面 / 背面人体图标出主要部位和次要部位
// 人体图是自己画的（参考解剖图的肌肉形状）：右半边的轮廓和肌肉，左半边镜像；颜色全部用主题变量
// ════════════════════════════════════════════
// 每周训练安排：在「设置 → 训练计划」里改（存在 Settings 表的 weekPlan，几台手机同步）；没改过就用下面的默认安排
// 一天：type 力量 str / 有氧 cardio / 拳击 box / 休息 rest；title 名称；items 动作（力量日，「臀 ×2」＝两个练臀的动作，「中束 + 后束」＝连着做）；
// note 说明（其他日子）；adj 手动改过的部位 { 部位: 0 不练 / 1 主要 / 2 次要 }
// 0 = 周日 … 6 = 周六
const PLAN_TYPES = [['str', '力量'], ['cardio', '有氧'], ['box', '拳击'], ['rest', '休息']];
const PLAN_NOTE = { cardio: '椭圆机或跑步，低强度', box: '全身，肩和核心为主', rest: '好好恢复' };
const DEFAULT_WEEK_PLAN = [
  { type: 'str', title: '下肢 · 硬拉日', items: ['硬拉', '臀 ×2', '股四头', '中束 + 后束', '核心'] },
  { type: 'cardio', title: '有氧', note: '低强度：椭圆机或跑步' },
  { type: 'str', title: '上肢 · 肩推日', items: ['肩推', '背宽', '哑铃卧推', '背厚', '二头 ×2'] },
  { type: 'str', title: '下肢 · 深蹲日', items: ['深蹲', '股四头', '腘绳肌', '臀', '中束', '小腿'] },
  { type: 'str', title: '上肢 · 卧推日', items: ['卧推', '背厚', '上胸', '背宽', '下胸', '三头 ×1'] },
  { type: 'box', title: '拳击', note: '全身，肩和核心为主' },
  { type: 'rest', title: '休息', note: '好好恢复' }
];
// 人体图上能标的部位（顺序 = 设置里部位按钮的顺序）
const MM_PARTS = ['上胸', '中胸', '下胸', '前束', '中束', '后束', '斜方', '背阔', '下背', '二头', '三头', '前臂', '核心', '臀', '外展', '内收', '股四头', '腘绳肌', '小腿'];
// 动作 → [主要部位, 次要部位]。部位名本身也能当动作写（只练这个部位）；写法里包含这些词就认得（「杠铃划船」→ 划船）
const EX_PARTS = {
  深蹲: [['股四头', '臀'], ['内收', '下背', '核心']], 前蹲: [['股四头'], ['臀', '核心']], 腿举: [['股四头', '臀'], ['内收']],
  哈克深蹲: [['股四头'], ['臀', '内收']], 弓步: [['股四头', '臀'], ['内收', '腘绳肌']], 分腿蹲: [['股四头', '臀'], ['内收', '腘绳肌']],
  硬拉: [['臀', '腘绳肌', '下背'], ['股四头', '斜方', '前臂', '核心']], 罗马尼亚硬拉: [['腘绳肌', '臀'], ['下背', '前臂']], 直腿硬拉: [['腘绳肌', '臀'], ['下背', '前臂']],
  臀推: [['臀'], ['腘绳肌', '外展']], 臀桥: [['臀'], ['腘绳肌']], 腿屈伸: [['股四头'], []], 腿弯举: [['腘绳肌'], ['小腿']], 提踵: [['小腿'], []],
  卧推: [['中胸'], ['前束', '三头']], 哑铃卧推: [['中胸'], ['前束', '三头']], 上斜: [['上胸'], ['前束', '三头']], 下斜: [['下胸'], ['三头']],
  飞鸟: [['中胸'], ['前束']], 夹胸: [['中胸'], ['前束']], 俯卧撑: [['中胸'], ['前束', '三头', '核心']], 双杠臂屈伸: [['下胸', '三头'], ['前束']],
  肩推: [['前束'], ['中束', '三头', '斜方']], 推举: [['前束'], ['中束', '三头', '斜方']], 侧平举: [['中束'], ['斜方']], 前平举: [['前束'], []],
  面拉: [['后束'], ['斜方']], 反向飞鸟: [['后束'], ['斜方']], 耸肩: [['斜方'], []],
  背宽: [['背阔'], ['二头', '后束']], 下拉: [['背阔'], ['二头', '后束']], 引体: [['背阔'], ['二头', '后束']],
  背厚: [['斜方', '背阔'], ['后束', '二头']], 划船: [['斜方', '背阔'], ['后束', '二头']],
  弯举: [['二头'], ['前臂']], 二头: [['二头'], ['前臂']], 臂屈伸: [['三头'], []], 下压: [['三头'], []],
  卷腹: [['核心'], []], 平板: [['核心'], []], 举腿: [['核心'], []], 拳击: [['核心', '前束', '中束'], ['股四头', '小腿', '臀', '三头', '后束']]
};
const PART_ALIAS = { 胸: '中胸', 股四: '股四头', 腘绳: '腘绳肌', 小臂: '前臂', 腹: '核心', 腹部: '核心', 臀部: '臀', 臀中: '外展', 背阔肌: '背阔', 斜方肌: '斜方', 竖脊: '下背' };
const EX_KEYS = [...new Set([...Object.keys(EX_PARTS), ...MM_PARTS, ...Object.keys(PART_ALIAS)])].sort((a, b) => b.length - a.length);
function exParts(k) {
  if (EX_PARTS[k]) return EX_PARTS[k];
  const p = PART_ALIAS[k] || k;
  return EX_PARTS[p] || [[p], []];
}
// 「臀 ×2」→ { name: '臀', n: 2, x: true }
function parseItem(s) {
  const m = String(s || '').trim().match(/^(.*?)\s*[×xX*]\s*(\d+)$/);
  return m && m[1] ? { name: m[1].trim(), n: Math.max(1, +m[2]), x: true } : { name: String(s || '').trim(), n: 1, x: false };
}
const fmtItem = (name, n, x) => n > 1 || x ? `${name} ×${n}` : name;
// 一个动作练到哪些部位：按「+」拆成几个动作，每个里面从长到短找认得的词；一个都没认出的放进 unknown
function itemParts(s) {
  const main = new Set(), sub = new Set(), unknown = [];
  parseItem(s).name.split(/\s*[+＋、,，/]\s*/).filter(Boolean).forEach(piece => {
    let rest = piece, hit = false;
    EX_KEYS.forEach(k => {
      if (!rest.includes(k)) return;
      rest = rest.split(k).join('\u0000');
      hit = true;
      const [m, sb] = exParts(k);
      m.forEach(p => main.add(p)); sb.forEach(p => sub.add(p));
    });
    if (!hit) unknown.push(piece);
  });
  return { main, sub, unknown };
}
// 一天的安排：动作 → 自动标的部位（autoLv），再叠上手动改的（adj）
function planDayOf(d) {
  d = d || {};
  const type = PLAN_TYPES.some(t => t[0] === d.type) ? d.type : 'rest';
  const items = type === 'str' ? (Array.isArray(d.items) ? d.items : []).map(s => String(s).trim()).filter(Boolean) : [];
  const autoLv = {}, unknown = [];
  (type === 'box' ? ['拳击'] : items).forEach(s => {
    const r = itemParts(s);
    r.main.forEach(p => { autoLv[p] = 1; });
    r.sub.forEach(p => { if (!autoLv[p]) autoLv[p] = 2; });
    if (type === 'str') unknown.push(...r.unknown);
  });
  const adj = type === 'rest' ? {} : Object.assign({}, d.adj), lv = {};
  MM_PARTS.forEach(p => { const v = p in adj ? +adj[p] : autoLv[p] || 0; if (v) lv[p] = v; });
  const name = PLAN_TYPES.find(t => t[0] === type)[1];
  return {
    type, items, adj, autoLv, lv, unknown,
    title: String(d.title || '').trim() || name,
    note: type === 'str' ? '' : String(d.note || '').trim(),
    text: type === 'str' ? (items.length ? items.join(' · ') : '还没安排动作') : String(d.note || '').trim() || PLAN_NOTE[type],
    main: MM_PARTS.filter(p => lv[p] === 1), sub: MM_PARTS.filter(p => lv[p] === 2)
  };
}
// 保存的安排（7 天）；没有或格式不对就用默认
function weekPlanRaw() {
  const p = DB.settings.weekPlan;
  return Array.isArray(p) && p.length === 7 ? p : DEFAULT_WEEK_PLAN;
}
const planOf = date => planDayOf(weekPlanRaw()[parseYmd(date).getDay()]);

// 右半边轮廓：从头顶中点出发，一段段三次贝塞尔曲线 [控制点1, 控制点2, 终点]，到裆部结束
// 比例按 7.5 头身：头高 53，肩宽约 2 个头高，肘在腰线、手腕在裆部高度、指尖到大腿中段，膝盖在 292 左右
const MM_OUT = [
  [11, 0, 19, 9, 19, 22], [19, 31, 18, 37, 16, 42], [14.5, 46, 12.8, 48, 12, 50], [11.6, 54, 11.8, 58, 12.6, 61],
  [20, 64, 33, 65, 42, 69], [51, 70.6, 57, 77, 57.6, 87], [58.2, 97, 56.8, 105, 54.6, 112], [55.5, 126, 58, 140, 58.5, 150],
  [61.5, 166, 66, 186, 66.8, 203], [68.4, 211, 68.8, 224, 67, 234], [65.6, 241, 63.6, 245, 61.2, 245], [58.4, 245, 56.6, 238, 56.4, 230],
  [56, 220, 56.6, 212, 56.2, 206], [53, 186, 48, 168, 46, 154], [44, 138, 42, 118, 40, 106], [39, 128, 34, 150, 33, 170],
  [32, 186, 39, 198, 40.5, 212], [41, 240, 36, 272, 30.5, 292], [28.5, 302, 32, 312, 31.5, 326], [30.5, 346, 23, 364, 21, 380],
  [20.5, 388, 23, 392, 23.2, 397], [21.5, 401, 11.5, 401, 8, 399.5], [6, 394, 8.4, 388, 8.6, 380], [7, 358, 5, 326, 8, 296],
  [9, 280, 5, 258, 3, 240], [2, 230, 1, 224, 0, 220]
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
// 肌肉（右半边，左半边镜像）：[细部位, 路径, 点开后显示的肌肉（ATLAS 里的 id，冒号后是默认动作）]。形状按解剖图：一块块分开、带弧度，不是规则几何形
// 细部位为空的是不单独训练的肌肉（缝匠肌、胫骨前肌），只画出来让人体看起来完整
const MM_FRONT = [
  ['背阔', 'M36.5 106C38.6 110 39.2 118 38.4 126C37.6 133 36.4 138 35.2 141C34.4 132 34.2 120 35 110Z', 'lat'],
  ['上胸', 'M2.6 72.6C9 70.4 19 69.6 30 70.4C35 71.2 39.6 74 43 78.6C43.8 79.8 44.2 80.8 44.2 81.6C31 80 16 80.6 2.6 84.2Z', 'pec'],
  ['中胸|下胸', 'M2.6 86.8C14 84 28 82.6 39 82.6C42 82.6 44.4 83.6 45 85.6C42.6 90 39.6 95 36 100C30 107.4 21 113 12 114C7.4 114.4 4 113 2.6 110Z', 'pec:1'],
  ['前束', 'M33.6 69.6C39 67.4 45 68.4 48.6 72C50.4 80 50.4 94 51.4 109.6C47.6 104.6 44.4 98 42.4 91C40.6 84 37.6 75.6 33.6 69.6Z', 'delt:1'],
  ['中束', 'M46.6 69.2C52.4 70.6 56.2 76.4 57 85.6C57.6 95.4 55.6 104 52 111C51.6 98 51.4 85 50.2 77C49.6 73.4 48.4 70.8 46.6 69.2Z', 'delt:0'],
  ['二头', 'M45 112.6C49 109.6 53 111.4 54.8 118C56.8 129 56.8 141 54.8 149C52 151 49 150.4 47 147C44.4 137 43.4 123 45 112.6Z', 'biceps'],
  ['前臂', 'M52.4 153.4C56.4 151.6 59.4 154.4 61.2 161C63.8 172 65.6 186 65.8 198.6C64.8 201 63 201 61.6 199C59.4 185 56 169 52.4 157Z', 'extensors'],
  ['前臂', 'M48.4 157.4C50 154.6 51.6 154.6 52.4 158C55.2 171 58 185 60 199.4C59.2 202 57.4 202 56.4 200.6C53.4 188 50.4 175 48.6 163Z', 'flexors'],
  ['核心', 'M37.2 104C36 106.6 32.6 109 29.2 109.8C28.6 108.4 30.4 106 33.6 104.6C35 104 36.2 103.8 37.2 104Z', 'serr'],
  ['核心', 'M36.8 111C35.6 113.6 32 116 28.4 116.8C27.8 115.4 29.8 113 33 111.6C34.6 111 35.8 110.8 36.8 111Z', 'serr'],
  ['核心', 'M36 118C34.8 120.6 31.2 123 27.4 123.8C26.8 122.4 28.8 120 32.2 118.6C33.8 118 35 117.8 36 118Z', 'serr'],
  ['核心', 'M2.6 118.4C8 117.2 14 117.8 18 120C19 126 19 131 18.6 135C13 136 8 136.2 2.6 136Z', 'rectus'],
  ['核心', 'M2.6 139C8 139 13.6 139 19 138C19.8 144 19.8 150 19.4 155C13.6 156 8 156.2 2.6 156Z', 'rectus'],
  ['核心', 'M2.6 159C8 159 13.6 159 19.4 158C19.8 164 19.6 170 18.8 175C13.6 176 8 176.2 2.6 176Z', 'rectus'],
  ['核心', 'M2.6 179C8 179 13 179 18.6 178C18.2 190 15.2 201 10.4 208.6C7.4 212 4.6 213 2.6 213Z', 'rectus'],
  ['核心', 'M22 127C27 125.6 31.6 127.6 34.4 132.4C33.6 146 33 159 32.8 171C33.6 181 34.6 189 33 195.4C29 200.6 24.4 204.6 20.4 207.6C21.4 196 22 186 22 176C22 160 21.6 143 22 127Z', 'oblique'],
  ['外展', 'M34.6 191.6C38.4 194 40.2 202 40.2 212C40.2 220 38.6 226 36.6 230C34.4 222 32.6 210 32.4 200.4C32.4 196 33.2 192.8 34.6 191.6Z', 'tfl'],
  ['内收', 'M3 221C9 215 17 211 25.4 208.4C22 220 18 236 14.2 251C12.4 257 10.4 262 8.4 264.6C6.4 254 4.4 240 3 228.6Z', 'adductors'],
  ['股四头', 'M31.6 211.6C34.6 222 34.6 240 31.6 258C29.6 270 26.4 280 23.2 286.6C20.2 284.6 18.4 278 18.4 270C18.4 254 22.4 236 27.4 220C28.6 216 30 213 31.6 211.6Z', 'quads'],
  ['股四头', 'M35.4 221C39.4 232 39.4 250 36.6 266C34.6 278 31.6 286.6 28.6 290.6C25.4 288 24.4 281 25 271C26.4 254 30.4 236 35.4 221Z', 'quads'],
  ['股四头', 'M13.4 258.4C17.4 260.4 21.2 268.4 22 278.4C22.4 287 19.4 292.4 15.4 292.4C12.6 290.4 12 284 12 276C12 268 12.2 262 13.4 258.4Z', 'quads'],
  ['', 'M30.6 199C32 201 32 204 30.6 208C26.2 222 21 238 16.2 252C13 262 10.4 276 9.2 292C7.6 288 7.2 282 7.6 274C9 262 12.2 248 17 234C21 222 26 210 30.6 199Z', 'sartorius'],
  ['', 'M22.4 300.6C26.2 304.6 28 314.6 27.2 328.6C26.2 344.6 23.4 360.6 21.2 372C19.4 367 18.4 356 18.4 344C18.4 328 19.6 312.6 22.4 300.6Z', 'tibant'],
  ['小腿', 'M9.2 302.6C12.4 304.6 14 314.6 14 328.6C14 340.6 12.4 350.6 10.4 356.6C8.4 350.6 7.2 340.6 7.2 328.6C7.2 316.6 7.6 306.6 9.2 302.6Z', 'gastroc'],
  ['小腿', 'M29.2 304.6C31.2 312.6 31.2 324.6 29.4 336.6C28.4 342.6 26.4 346.6 25.4 348.6C25.2 338.6 26 326.6 27 316.6C27.4 310.6 28.2 306.6 29.2 304.6Z', 'gastroc']
];
const MM_BACK = [
  ['斜方', 'M0 46.6C4 46.4 8.4 47 10.8 48.6C11 52.6 11.4 56.6 12.2 60.4C20 63.2 31 66.2 41 69.2C37 73.2 31.4 77 25.6 80.6C20 92 14.2 110 8.6 126C5.6 136 2.6 144 0 150Z', 'trap'],
  ['后束', 'M40.6 70.6C46.6 68.8 52 71.6 54.2 78.6C55.4 88 53.6 99 50.8 108.6C46.8 101 42.6 93.6 38.4 88.4C35.6 82 36 75.4 40.6 70.6Z', 'delt:2'],
  ['中束', 'M50.6 71.4C54.6 74 56.8 80 57.2 88C57.6 97 55.6 105 52.2 111C53.6 100 54.2 86 50.6 71.4Z', 'delt:0'],
  ['斜方', 'M18.6 92C25 86.6 33 85.6 39.4 88.6C40.4 93 39 97.6 35.6 101.4C29.6 103.4 23.4 102.6 18.4 99.6C17.8 97 17.8 94.4 18.6 92Z', 'trap:1'],
  ['斜方', 'M33.6 106.6C37.4 104.6 40.6 105.4 41.4 108.4C40.4 112.4 37 116 33 118C31 115 31.4 109.6 33.6 106.6Z', 'trap:1'],
  ['背阔', 'M20.4 103.6C26 107.6 32.4 110 37.8 110.6C39.8 113 40.2 118 39.4 124C37.8 138 35.4 154 33.2 167.6C28.8 175.6 21.8 180 15.2 180.6C13 172 12.4 162 12.4 152C11.6 144 10.4 136 9.8 129.6C13 121 16.6 111.6 20.4 103.6Z', 'lat'],
  ['下背', 'M2.6 134.6C6 134.6 9.4 137 11 143C12.6 160 13.6 178 12.6 196C10 202 6 205 2.6 205.4Z', 'erector'],
  ['三头', 'M43.4 110.4C48 108 53 110 55.4 117C57 128 57 140 55 148C52 150.4 48 150.4 46 146.4C44 136 43.2 122 43.4 110.4Z', 'triceps'],
  ['前臂', 'M51.4 153.4C55.4 151.6 58.8 154.4 61 161C63.8 172 65.6 186 65.8 198.6C64.8 201 63 201 61.6 199C59.4 185 55.4 170 51.4 158.6Z', 'extensors'],
  ['前臂', 'M47.6 157.4C49.4 154.4 51 155 52 158C55 171 58 185 60 199.4C59.2 202 57.4 202 56.4 200.6C53.4 189 50.2 175 48.2 163.4Z', 'flexors'],
  ['外展', 'M18.4 182.4C26 179.4 34 182 38 190C39.2 196 38.4 201 36.4 204.2C30.4 199.2 23.4 194.2 16.4 191.2C16.2 187.2 17 184 18.4 182.4Z', 'glutmed'],
  ['臀', 'M3 194.4C11 189.4 22 191 31 198C37 204 40 214 39.2 226C37.4 236 30.4 242 20.4 243C12.4 243.2 6.4 240.4 3 236.4Z', 'glutmax'],
  ['内收', 'M3.2 240.4C6 243.4 8 250.4 8.6 260C8.6 268 7.2 274 5.6 278C4.2 270 3.4 258 3.2 240.4Z', 'adductors'],
  ['腘绳肌', 'M8.6 245.4C13.4 244.4 18 246.4 20 252.4C21 266 20.2 280 17.4 292.4C14.4 292.6 11.4 289.6 10.2 284.4C9 272 8.8 258 8.6 245.4Z', 'hams'],
  ['腘绳肌', 'M23.2 245.4C29 246.4 34 252.4 35.2 264C35.2 276 32.4 287 28.2 294C25.2 291 23.2 283 22.4 274C22 264 22.2 254 23.2 245.4Z', 'hams'],
  ['小腿', 'M8.4 302.4C13 299.4 18 303 19.2 313C20 327 18.2 341 14.4 350C11.4 350.4 9.2 346.4 8.4 338.4C7.2 326 7.2 312 8.4 302.4Z', 'gastroc'],
  ['小腿', 'M21.2 303.4C26 299.4 31 304 31.2 316C31.2 328 28.2 338 23.4 344C21.2 341 20.2 334 20.2 324C20.2 316 20.4 309 21.2 303.4Z', 'gastroc'],
  ['小腿', 'M10.4 352.4C14.4 354.4 20.2 351.4 25 346.4C26 356 24.2 366 21.2 374C18.2 376.2 14.2 376.2 12.2 372.2C11 366 10.4 358 10.4 352.4Z', 'soleus']
];
// 三头肌长头和外侧头的分界线
const MM_LINES = { f: '', b: 'M49.4 113.4C50.6 124 50.6 136 49.6 146' };
// 标注：[文字, 细部位, 指向的点（人体坐标，负数是左半边）, 文字所在的高度]
const MM_LABELS = {
  fl: [['上胸', '上胸', [-22, 76], 80], ['中下胸', '中胸|下胸', [-22, 100], 106], ['二头', '二头', [-50, 132], 136],
    ['腹部', '核心', [-11, 148], 166], ['内收', '内收', [-12, 232], 214], ['股四', '股四头', [-27, 252], 250]],
  fr: [['前束', '前束', [44, 86], 66], ['中束', '中束', [53, 90], 90], ['小臂', '前臂', [58, 178], 160], ['外展', '外展', [37, 212], 206], ['小腿', '小腿', [10.6, 330], 316]],
  bl: [['后束', '后束', [-46, 86], 66], ['中束', '中束', [-54, 94], 90], ['三头', '三头', [-50, 130], 136], ['下背', '下背', [-7, 176], 186]],
  br: [['斜方', '斜方', [14, 86], 66], ['背阔', '背阔', [29, 140], 128], ['臀部', '臀|外展', [22, 218], 200], ['腘绳', '腘绳肌', [22, 270], 256], ['小腿', '小腿', [20, 322], 316]]
};
const MM_S = 0.93, MM_Y = 9, MM_FX = 118, MM_BX = 382;   // 缩放、顶部留白、正面 / 背面的中线位置

function mmLevel(parts, plan) {
  const ps = parts.split('|');
  return ps.some(p => plan.main.includes(p)) ? 1 : ps.some(p => plan.sub.includes(p)) ? 2 : 0;
}
function mmFigure(cx, regions, lines, plan) {
  const sh = (d, lv, mid, parts, mirror) => {
    const [id, ai] = mid.split(':');
    return `<path class="mm-m l${lv}" d="${d}" data-m="${id}" data-ai="${ai || 0}" data-p="${parts}"${mirror ? ' transform="scale(-1 1)"' : ''}/>`;
  };
  let s = `<g transform="translate(${cx} ${MM_Y}) scale(${MM_S})"><path class="mm-body" d="${MM_OUTLINE}"/><g class="mm-ms">`;
  regions.forEach(([parts, d, mid]) => { const lv = mmLevel(parts, plan); s += sh(d, lv, mid, parts) + sh(d, lv, mid, parts, 1); });
  s += '</g>';
  if (lines) s += `<path class="mm-ln" d="${lines}"/><path class="mm-ln" d="${lines}" transform="scale(-1 1)"/>`;
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
    const reg = (side[0] === 'f' ? MM_FRONT : MM_BACK).find(r => r[0] === parts || parts.split('|').includes(r[0])) || ['', '', ''];
    const [id, ai] = reg[2].split(':');
    return `<g class="mm-lb l${lv}" data-m="${id}" data-ai="${ai || 0}" data-p="${parts}"><path d="M${x0} ${ly}H${x1}M${ex} ${ly}L${ax} ${ay}"/><circle cx="${ax}" cy="${ay}" r="2"/>
      <text x="${tx}" y="${y}"${side === 'bl' ? ' text-anchor="end"' : ''}>${text}</text></g>`;
  }).join('');
}
let MM_OUTLINE = '';
function musclesSVG(plan) {
  if (!MM_OUTLINE) MM_OUTLINE = mmOutline();
  return `<svg class="mm-svg" viewBox="0 0 500 392" role="img" aria-label="训练部位：主要 ${plan.main.join('、') || '无'}；次要 ${plan.sub.join('、') || '无'}。点肌肉看它怎么发力">`
    + mmFigure(MM_FX, MM_FRONT, MM_LINES.f, plan)
    + mmFigure(MM_BX, MM_BACK, MM_LINES.b, plan)
    + mmLabels(MM_LABELS.fl, MM_FX, 'fl', plan) + mmLabels(MM_LABELS.fr, MM_FX, 'fr', plan)
    + mmLabels(MM_LABELS.bl, MM_BX, 'bl', plan) + mmLabels(MM_LABELS.br, MM_BX, 'br', plan)
    + '</svg>';
}
// 点肌肉（或标注）→ 弹出这块肌肉的原理动画
function mmTap(e) {
  const t = e.target.closest('[data-m]');
  if (!t || !t.dataset.m) return;
  const plan = planOf(VIEW.date), parts = t.dataset.p || '';
  t.classList.add('tap');
  setTimeout(() => t.classList.remove('tap'), 260);
  ATLAS.open(t.dataset.m, +t.dataset.ai || 0, parts, parts ? mmLevel(parts, plan) : 0);
}
function renderMuscles() {
  const el = $('#t-mm');
  if (!el) return;
  const d = VIEW.date, w = parseYmd(d).getDay(), plan = planOf(d);
  const rest = !plan.main.length && !plan.sub.length;
  el.dataset.fold = 'today:mm';
  el.classList.toggle('folded', isFolded('today:mm'));
  el.classList.toggle('mm-rest', rest);
  el.classList.toggle('mm-anim', el.dataset.mmFor !== d);   // 换了日子才播放亮起来的动画（今日页经常重画，不每次都闪）
  el.dataset.mmFor = d;
  el.innerHTML = `<div class="card-t fold-t" ${foldAttrs('today:mm')}>训练部位<span>周${WD[w]} · ${esc(plan.title)}</span>${FOLD_IC}</div>
    <div class="fold"><div class="fold-in">
      <div class="mm-plan">${esc(plan.text)}</div>
      ${musclesSVG(plan)}
      <div class="mm-leg"><span class="mm-hint">点肌肉看它怎么发力</span>${rest ? '' : '<span><i class="l1"></i>主要部位</span><span><i class="l2"></i>次要部位</span>'}</div>
    </div></div>`;
  el.querySelector('.mm-svg').onclick = mmTap;
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
