// ════════════════════════════════════════════
// 训练：部位 / 器材 / 预置动作库 / 预置计划 / 动作示意动画
// 动画是原创的火柴人（侧面或正面），两个关键姿势之间来回，器材按选中的那种画；颜色全部跟主题走
// ════════════════════════════════════════════
const PART_GROUPS = [
  ['胸', ['上胸', '中胸', '下胸']],
  ['背', ['背阔', '斜方中下+菱形', '下背']],
  ['肩', ['前束', '中束', '后束']],
  ['腿', ['股四头', '腘绳肌', '内收', '小腿']],
  ['臀', ['臀', '外展']],
  ['手臂', ['二头', '三头', '前臂']],
  ['核心', ['核心']]
];
const ALL_PARTS = PART_GROUPS.flatMap(g => g[1]);
const groupOfPart = p => (PART_GROUPS.find(g => g[1].includes(p)) || ['其他'])[0];
// 计划里的叫法 → 细部位
const PART_ALIAS = { 背下拉: '背阔', 背宽: '背阔', 背后拉: '斜方中下+菱形', 背厚: '斜方中下+菱形', 斜方中下: '斜方中下+菱形', 菱形: '斜方中下+菱形',
  腿四头: '股四头', 四头: '股四头', 腿弯举: '腘绳肌', 腿弯折: '腘绳肌', 腿后侧: '腘绳肌', 臀部: '臀', 臀大肌: '臀', 臀中肌: '外展',
  肱二头: '二头', 肱三头: '三头', 腹: '核心', 腹肌: '核心', 小臂: '前臂', 下背部: '下背', 前三角: '前束', 中三角: '中束', 后三角: '后束' };
const partOf = label => { const s = String(label || '').trim(); return ALL_PARTS.includes(s) ? s : PART_ALIAS[s] || null; };
const EQUIPS = ['杠铃', '哑铃', '固定器械', '绳索', '史密斯', 'EZ杆', '自重', '壶铃', '弹力带'];
const EQ_SHORT = { 杠铃: '杠铃', 哑铃: '哑铃', 固定器械: '器械', 绳索: '绳索', 史密斯: '史密斯', EZ杆: 'EZ杆', 壶铃: '壶铃', 弹力带: '弹力带', 自重: '' };
const MODES = ['重量', '自重', '计时'];
const DAY_TYPES = ['有氧', '拳击', '休息'];
const WEEK_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const splitList = v => String(v || '').split(/[、，,\/\s]+/).map(s => s.trim()).filter(Boolean);

// 预置动作：[id 后缀, 名称, 器材(第一个是默认), 记录方式, 大部位, 主练, 顺带, 动画]
const EX_SEED = [
  ['bench', '卧推', '杠铃、哑铃、史密斯', '重量', '胸', '中胸', '前束、三头'],
  ['incline', '上斜卧推', '哑铃、杠铃、史密斯', '重量', '胸', '上胸', '前束、三头'],
  ['decline', '下斜卧推', '杠铃、哑铃、史密斯', '重量', '胸', '下胸', '三头、前束'],
  ['chestpress', '器械推胸', '固定器械', '重量', '胸', '中胸', '前束、三头'],
  ['inclinepress', '上斜器械推胸', '固定器械', '重量', '胸', '上胸', '前束、三头'],
  ['fly', '飞鸟', '固定器械、哑铃、绳索', '重量', '胸', '中胸', '前束'],
  ['cabledown', '高位绳索夹胸', '绳索', '重量', '胸', '下胸', '前束'],
  ['cableup', '低位绳索夹胸', '绳索', '重量', '胸', '上胸', '前束'],
  ['dip', '双杠臂屈伸', '自重、固定器械', '自重', '胸', '下胸', '三头、前束'],
  ['pushup', '俯卧撑', '自重', '自重', '胸', '中胸', '三头、前束、核心'],
  ['pulldown', '高位下拉', '绳索、固定器械', '重量', '背', '背阔', '二头、后束'],
  ['pullup', '引体向上', '自重、固定器械', '自重', '背', '背阔', '二头'],
  ['straightpull', '直臂下拉', '绳索', '重量', '背', '背阔', '后束'],
  ['onearm', '单臂划船', '哑铃、绳索', '重量', '背', '背阔', '斜方中下+菱形、二头'],
  ['seatedrow', '坐姿划船', '绳索、固定器械', '重量', '背', '斜方中下+菱形', '背阔、二头、后束'],
  ['bentrow', '俯身划船', '杠铃、哑铃', '重量', '背', '斜方中下+菱形', '背阔、二头、下背'],
  ['chestrow', '胸托划船', '固定器械、哑铃、杠铃', '重量', '背', '斜方中下+菱形', '背阔、二头、后束'],
  ['backext', '山羊挺身', '自重、哑铃', '重量', '背', '下背', '臀、腘绳肌'],
  ['ohp', '肩推', '哑铃、杠铃、史密斯、固定器械', '重量', '肩', '前束', '中束、三头'],
  ['frontraise', '前平举', '哑铃、杠铃、绳索', '重量', '肩', '前束', ''],
  ['lateral', '侧平举', '哑铃、绳索、固定器械', '重量', '肩', '中束', ''],
  ['uprow', '直立划船', '杠铃、EZ杆、哑铃、绳索', '重量', '肩', '中束', '斜方中下+菱形、二头'],
  ['yraise', 'Y 字上举', '哑铃、绳索', '重量', '肩', '中束', '斜方中下+菱形'],
  ['reversefly', '反向飞鸟', '固定器械、哑铃、绳索', '重量', '肩', '后束', '斜方中下+菱形'],
  ['facepull', '面拉', '绳索、弹力带', '重量', '肩', '后束', '斜方中下+菱形'],
  ['squat', '深蹲', '杠铃、史密斯、哑铃', '重量', '腿', '股四头', '臀、内收、下背'],
  ['frontsquat', '前蹲', '杠铃、史密斯', '重量', '腿', '股四头', '臀、核心'],
  ['legpress', '腿举', '固定器械', '重量', '腿', '股四头', '臀'],
  ['hack', '哈克深蹲', '固定器械', '重量', '腿', '股四头', '臀'],
  ['legext', '腿屈伸', '固定器械', '重量', '腿', '股四头', ''],
  ['bulgarian', '保加利亚分腿蹲', '哑铃、自重、史密斯', '重量', '腿', '股四头', '臀'],
  ['lunge', '箭步蹲', '哑铃、杠铃、自重', '重量', '腿', '股四头', '臀'],
  ['lyingcurl', '俯卧腿弯举', '固定器械', '重量', '腿', '腘绳肌', '小腿'],
  ['seatedcurl', '坐姿腿弯举', '固定器械', '重量', '腿', '腘绳肌', ''],
  ['rdl', '罗马尼亚硬拉', '杠铃、哑铃', '重量', '腿', '腘绳肌', '臀、下背'],
  ['adduct', '髋内收', '固定器械、绳索', '重量', '腿', '内收', ''],
  ['calf', '提踵', '固定器械、哑铃、史密斯、自重', '重量', '腿', '小腿', ''],
  ['seatedcalf', '坐姿提踵', '固定器械', '重量', '腿', '小腿', ''],
  ['deadlift', '硬拉', '杠铃、哑铃', '重量', '臀', '臀', '腘绳肌、下背、前臂'],
  ['sumo', '相扑硬拉', '杠铃、壶铃、哑铃', '重量', '臀', '臀', '内收、股四头、下背'],
  ['hipthrust', '臀推', '杠铃、史密斯、固定器械', '重量', '臀', '臀', '腘绳肌'],
  ['bridge', '臀桥', '自重、杠铃、哑铃', '重量', '臀', '臀', '腘绳肌'],
  ['kickback', '绳索后踢腿', '绳索、固定器械', '重量', '臀', '臀', '腘绳肌'],
  ['abduct', '髋外展', '固定器械、绳索、弹力带', '重量', '臀', '外展', '臀'],
  ['curl', '弯举', 'EZ杆、杠铃、哑铃、绳索', '重量', '手臂', '二头', '前臂'],
  ['hammer', '锤式弯举', '哑铃、绳索', '重量', '手臂', '二头', '前臂', 'curl'],
  ['inclinecurl', '上斜哑铃弯举', '哑铃', '重量', '手臂', '二头', ''],
  ['preacher', '牧师凳弯举', 'EZ杆、哑铃、固定器械', '重量', '手臂', '二头', '前臂'],
  ['pushdown', '绳索下压', '绳索', '重量', '手臂', '三头', ''],
  ['overhead', '过头臂屈伸', '绳索、哑铃、EZ杆', '重量', '手臂', '三头', ''],
  ['skull', '仰卧臂屈伸', 'EZ杆、杠铃、哑铃', '重量', '手臂', '三头', ''],
  ['closebench', '窄距卧推', '杠铃、史密斯', '重量', '手臂', '三头', '中胸、前束', 'bench'],
  ['trikick', '俯身臂屈伸', '哑铃、绳索', '重量', '手臂', '三头', ''],
  ['wristcurl', '腕弯举', '哑铃、杠铃', '重量', '手臂', '前臂', ''],
  ['crunch', '卷腹', '自重、绳索', '重量', '核心', '核心', ''],
  ['hangleg', '悬垂举腿', '自重', '重量', '核心', '核心', ''],
  ['plank', '平板支撑', '自重', '计时', '核心', '核心', '']
];
const exSeedRows = () => EX_SEED.map((r, i) => ({
  id: 'x_' + r[0], name: r[1], equip: r[2], mode: r[3], group: r[4], main: r[5], sub: r[6], anim: r[7] || r[0], sort: i + 1
}));
// 预置计划（按你给的周计划）：器材只给固定动作写默认值
const PLAN_SEED = {
  周日: ['深蹲|杠铃', '股四头', '腘绳肌', '二头', '二头', '三头'],
  周一: ['有氧'],
  周二: ['肩推|哑铃', '背下拉', '背后拉', '卧推|哑铃', '下胸', '中束'],
  周三: ['硬拉|杠铃', '臀', '臀', '三头', '三头', '二头'],
  周四: ['卧推|杠铃', '上胸', '背宽', '背厚', '中束', '后束'],
  周五: ['拳击'],
  周六: ['休息']
};
const planSeedRows = () => WEEK_NAMES.flatMap((d, di) => PLAN_SEED[d].map((s, i) => {
  const [item, equip] = s.split('|');
  return { id: `p_${di}_${i + 1}`, day: d, ord: i + 1, item, equip: equip || '', ss: '' };
}));
// 第一次做某个部位时默认选的动作（之后按上次在这个位置做的）
const PART_DEFAULT = {
  股四头: ['腿屈伸', '腿举'], 腘绳肌: ['俯卧腿弯举', '坐姿腿弯举'], 二头: ['弯举|EZ杆', '锤式弯举|哑铃'], 三头: ['绳索下压', '过头臂屈伸|绳索'],
  臀: ['臀推|杠铃', '绳索后踢腿'], 背阔: ['高位下拉', '引体向上'], '斜方中下+菱形': ['坐姿划船', '胸托划船'], 下胸: ['双杠臂屈伸', '高位绳索夹胸'],
  中束: ['侧平举|哑铃', '侧平举|绳索'], 上胸: ['上斜卧推|哑铃', '上斜器械推胸'], 后束: ['反向飞鸟', '面拉']
};

// ════════ 动作示意动画 ════════
const RAD = Math.PI / 180;
const xpt = p => r1(p[0]) + ' ' + r1(p[1]);
// 侧面骨架：[起点, 终点, 角度名, 长度]。角度是绝对角度（0 = 朝右，90 = 朝下），人面朝右；带 2 的是远侧的手脚
const SIDE_BONES = [['H', 'K', 'th', 19], ['K', 'A', 'sh', 18], ['A', 'T', 'ft', 6], ['H', 'N', 'to', 26], ['N', 'E', 'ua', 15], ['E', 'W', 'fa', 14],
  ['H', 'K2', 'th2', 19], ['K2', 'A2', 'sh2', 18], ['A2', 'T2', 'ft2', 6], ['N', 'E2', 'ua2', 15], ['E2', 'W2', 'fa2', 14]]
  .map(([a, b, k, L]) => ({ a, b, ang: p => p[k], len: () => L }));
// 正面骨架：P = 骨盆中点、N = 颈；左右对称（L 侧角度默认是 R 侧的镜像）。al/tl/sl/bl 是手臂/大腿/小腿/躯干的透视缩短
const FRONT_BONES = [
  ['P', 'N', p => p.to, p => 26 * p.bl], ['N', 'SR', p => p.to + 90, () => 8], ['N', 'SL', p => p.to - 90, () => 8],
  ['P', 'HR', p => p.to + 90, () => 5], ['P', 'HL', p => p.to - 90, () => 5],
  ['SR', 'ER', p => p.ua, p => 15 * p.al], ['ER', 'WR', p => p.fa, p => 14 * p.al], ['SL', 'EL', p => p.uaL, p => 15 * p.al], ['EL', 'WL', p => p.faL, p => 14 * p.al],
  ['HR', 'KR', p => p.th, p => 19 * p.tl], ['KR', 'AR', p => p.sh, p => 18 * p.sl], ['HL', 'KL', p => p.thL, p => 19 * p.tl], ['KL', 'AL', p => p.shL, p => 18 * p.sl],
  ['AR', 'TR', () => 0, () => 3], ['AL', 'TL', () => 180, () => 3]
].map(([a, b, ang, len]) => ({ a, b, ang, len }));
const SIDE_BASE = { to: -90, th: 90, sh: 90, ft: 0, ua: 90, fa: 90 };
const FRONT_BASE = { to: -90, ua: 80, fa: 85, th: 92, sh: 90, al: 1, tl: 1, sl: 1, bl: 1 };

// 每个动画：v 视角（s 侧面 / f 正面）、r 固定不动的关节和位置、A/B 两个姿势、st 场景（凳子、杆子…）、
// hold 负重在哪（hands 手 / back 背 / ankle 脚踝 / feet 脚底 / knee 膝盖）、an 绳索滑轮位置、pv 器械转轴、pl 杠铃片半径、eq 按器材改姿势
const EXA = {
  // ── 胸 ──
  bench: { v: 's', r: ['H', 40, 55], st: ['M28 58H86', 'M36 58V83M78 58V83'], still: 0.15,
    A: { to: 0, th: 150, sh: 80, ft: -10, ua: -90, fa: -90 }, B: { to: 0, th: 150, sh: 80, ft: -10, ua: 118, fa: -78 } },
  incline: { v: 's', r: ['H', 44, 60], st: ['M40 64L70 43', 'M30 64H46', 'M46 64V83'], still: 0.2,
    A: { to: -35, th: 165, sh: 95, ft: -10, ua: -108, fa: -108 }, B: { to: -35, th: 165, sh: 95, ft: -10, ua: 135, fa: -75 } },
  decline: { v: 's', r: ['H', 44, 50], st: ['M38 54L84 72', 'M22 59a3 3 0 1 0 .1 0', 'M46 57V83M76 70V83'], still: 0.2,
    A: { to: 22, th: -150, sh: 95, ft: 0, ua: -90, fa: -90 }, B: { to: 22, th: -150, sh: 95, ft: 0, ua: 140, fa: -80 } },
  chestpress: { v: 's', r: ['H', 40, 60], pv: [26, 8], st: ['M28 62H52', 'M32 62L30 26', 'M40 62V83'],
    A: { to: -92, th: 0, sh: 90, ua: -4, fa: -4 }, B: { to: -92, th: 0, sh: 90, ua: 168, fa: -8 } },
  inclinepress: { v: 's', r: ['H', 40, 60], pv: [24, 4], st: ['M28 62H52', 'M32 62L30 26', 'M40 62V83'],
    A: { to: -92, th: 0, sh: 90, ua: -40, fa: -40 }, B: { to: -92, th: 0, sh: 90, ua: 160, fa: -58 } },
  fly: { v: 'f', r: ['P', 60, 58], pv: [60, -4], an: [6, 34], st: ['M44 60H76', 'M60 60V83'],
    A: { ua: 2, fa: 8, al: 1, th: 100, tl: 0.35 }, B: { ua: 2, fa: 8, al: -0.22, th: 100, tl: 0.35 } },
  cabledown: { v: 'f', r: ['P', 60, 44], an: [8, 2],
    A: { ua: -28, fa: -24 }, B: { ua: 112, fa: 118, al: 0.75 } },
  cableup: { v: 'f', r: ['P', 60, 44], an: [8, 80],
    A: { ua: 50, fa: 46 }, B: { ua: -140, fa: -150, al: 0.45 } },
  dip: { v: 's', r: ['W', 60, 46], st: ['M50 47H72', 'M68 47V83'],
    A: { to: -80, ua: 90, fa: 90, th: 100, sh: 150, ft: 120 }, B: { to: -62, ua: 153, fa: 39, th: 105, sh: 160, ft: 130 } },
  pushup: { v: 's', r: ['W', 84, 80], still: 0.3,
    A: { to: -27, th: 153, sh: 153, ft: 100, ua: 90, fa: 90 }, B: { to: -6, th: 174, sh: 174, ft: 95, ua: 175, fa: 20 } },
  // ── 背 ──
  pulldown: { v: 'f', r: ['P', 60, 58], an: [60, -6], mid: 1, st: ['M46 60H74', 'M52 61H68', 'M60 60V83'],
    A: { ua: -62, fa: -80, th: 100, tl: 0.35 }, B: { ua: 58, fa: -98, th: 100, tl: 0.35 } },
  pullup: { v: 'f', r: ['WR', 78, 6], st: ['M24 6H96', 'M28 6V83M92 6V83'], nofloor: 1,
    A: { ua: -70, fa: -75, th: 92, sh: 92 }, B: { ua: 29, fa: -110, th: 96, sh: 100 } },
  straightpull: { v: 's', r: ['A', 46, 80], an: [106, -2],
    A: { to: -72, ua: -40, fa: -40 }, B: { to: -72, ua: 82, fa: 82 } },
  onearm: { v: 's', r: ['A', 38, 80], st: ['M10 67H78', 'M14 67V83M74 67V83'], one: 1, an: [100, 82],
    A: { to: -8, th: 60, sh: 95, th2: 85, sh2: 180, ft2: 180, ua: 90, fa: 90, ua2: 50, fa2: 50 },
    B: { to: -8, th: 60, sh: 95, th2: 85, sh2: 180, ft2: 180, ua: 205, fa: 92, ua2: 50, fa2: 50 } },
  seatedrow: { v: 's', r: ['H', 36, 62], an: [102, 44], pv: [96, 30], st: ['M24 64H46V83', 'M76 50V72'],
    A: { to: -70, th: -8, sh: 12, ft: -80, ua: -2, fa: -2 }, B: { to: -95, th: -8, sh: 12, ft: -80, ua: 165, fa: 4 } },
  bentrow: { v: 's', r: ['A', 46, 80],
    A: { to: -22, th: 68, sh: 96, ua: 90, fa: 90 }, B: { to: -22, th: 68, sh: 96, ua: 205, fa: 92 } },
  chestrow: { v: 's', r: ['H', 38, 62], pv: [92, 70], st: ['M56 26L58 50', 'M58 50V83', 'M28 64H48', 'M38 64V83'],
    A: { to: -68, th: 2, sh: 90, ua: 8, fa: 8 }, B: { to: -68, th: 2, sh: 90, ua: 172, fa: -2 } },
  backext: { v: 's', r: ['H', 58, 50], st: ['M53 54L65 46', 'M60 52L42 83', 'M28 83L40 75'],
    A: { to: 68, th: 128, sh: 128, ft: 160, ua: 'to+172', fa: 'to+176' }, B: { to: -48, th: 128, sh: 128, ft: 160, ua: 'to+172', fa: 'to+176' } },
  // ── 肩 ──
  ohp: { v: 'f', r: ['P', 60, 58], pv: [60, 74], st: ['M46 60H74', 'M60 60V83'],
    A: { ua: 16, fa: -88, th: 100, tl: 0.35 }, B: { ua: -68, fa: -86, th: 100, tl: 0.35 } },
  frontraise: { v: 's', r: ['A', 46, 80], an: [30, 82],
    A: { ua: 86, fa: 86 }, B: { ua: -4, fa: -4 } },
  lateral: { v: 'f', r: ['P', 60, 44], an: [34, 82], pv: [60, 60],
    A: { ua: 78, fa: 82 }, B: { ua: -4, fa: 4 } },
  uprow: { v: 'f', r: ['P', 60, 44], an: [60, 84], mid: 1,
    A: { ua: 100, fa: 96 }, B: { ua: -14, fa: 150 } },
  yraise: { v: 'f', r: ['P', 60, 44], an: [34, 82],
    A: { ua: 82, fa: 84 }, B: { ua: -56, fa: -58 } },
  reversefly: { v: 'f', r: ['P', 60, 58], pv: [60, -4], an: [6, 34], st: ['M44 60H76', 'M60 60V83'],
    A: { ua: 2, fa: -4, al: -0.22, th: 100, tl: 0.35 }, B: { ua: 2, fa: -4, al: 1, th: 100, tl: 0.35 } },
  facepull: { v: 's', r: ['A', 40, 80], an: [106, 14],
    A: { to: -90, ua: -12, fa: -12 }, B: { to: -92, ua: 178, fa: -32 } },
  // ── 腿 ──
  squat: { v: 's', r: ['A', 52, 80], hold: 'back',
    A: { to: -88, th: 92, sh: 88, ua: 125, fa: -72 }, B: { to: -55, th: 8, sh: 118, ua: 160, fa: -38 },
    eq: { 哑铃: { hold: 'hands', A: { ua: 92, fa: 90 }, B: { ua: 90, fa: 90 } } } },
  frontsquat: { v: 's', r: ['A', 52, 80],
    A: { to: -90, th: 92, sh: 88, ua: -8, fa: 172 }, B: { to: -68, th: 8, sh: 118, ua: 14, fa: 194 } },
  legpress: { v: 's', r: ['H', 36, 58], hold: 'feet', ax: -60, st: ['M38 62L12 47', 'M30 62H44', 'M44 72L104 18'],
    A: { to: -150, th: -72, sh: 28, ft: -62, ua: 70, fa: 10 }, B: { to: -150, th: -42, sh: -38, ft: -128, ua: 70, fa: 10 } },
  hack: { v: 's', r: ['A', 66, 80], hold: 'back', st: ['M36 82L64 10'],
    A: { to: -112, th: 100, sh: 80, ua: 'to+190', fa: 'to+40' }, B: { to: -112, th: 2, sh: 122, ua: 'to+190', fa: 'to+40' } },
  legext: { v: 's', r: ['H', 40, 58], hold: 'ankle', st: ['M28 60H60', 'M32 60L29 26', 'M44 60V83'],
    A: { to: -96, th: 0, sh: 92, ft: -5, ua: 84, fa: 20 }, B: { to: -96, th: 0, sh: -4, ft: -90, ua: 84, fa: 20 } },
  bulgarian: { v: 's', r: ['A', 68, 80], st: ['M18 66H46', 'M22 66V83M42 66V83'],
    A: { to: -90, th: 95, sh: 85, th2: 115, sh2: 160, ft2: 200, ua: 92, fa: 90 },
    B: { to: -80, th: 10, sh: 110, th2: 100, sh2: 234, ft2: 200, ua: 92, fa: 90 } },
  lunge: { v: 's', r: ['A', 72, 80],
    A: { to: -90, th: 98, sh: 84, th2: 118, sh2: 112, ft2: 20, ua: 92, fa: 90 },
    B: { to: -86, th: 12, sh: 108, th2: 96, sh2: 176, ft2: 60, ua: 92, fa: 90 } },
  lyingcurl: { v: 's', r: ['H', 44, 54], hold: 'ankle', pad: 1, st: ['M14 58H84', 'M20 58V83M78 58V83'],
    A: { to: 2, hd: -18, th: 178, sh: 178, ft: 180, ua: 40, fa: 0 }, B: { to: 2, hd: -18, th: 178, sh: 300, ft: 350, ua: 40, fa: 0 } },
  seatedcurl: { v: 's', r: ['H', 40, 56], hold: 'ankle', pad: 1, st: ['M28 58H58', 'M32 58L29 24', 'M42 58V83', 'M48 49H62'],
    A: { to: -96, th: 0, sh: -6, ft: -90, ua: 84, fa: 20 }, B: { to: -96, th: 0, sh: 112, ft: 20, ua: 84, fa: 20 } },
  rdl: { v: 's', r: ['A', 52, 80], still: 0.9,
    A: { to: -90, ua: 90, fa: 90 }, B: { to: -14, th: 66, sh: 84, ua: 90, fa: 90 } },
  adduct: { v: 'f', r: ['P', 60, 56], hold: 'knee', st: ['M44 58H76', 'M60 58V83'],
    A: { th: 58, tl: 0.4, sh: 84, ua: 70, fa: 60 }, B: { th: 93, tl: 0.4, sh: 90, ua: 70, fa: 60 } },
  calf: { v: 's', r: ['T', 66, 78], st: ['M62 80H88V83'], hold: 'hands',
    A: { ft: -14 }, B: { ft: 36 }, eq: { 固定器械: { hold: 'back' }, 史密斯: { hold: 'back' } } },
  seatedcalf: { v: 's', r: ['T', 70, 78], hold: 'knee', st: ['M28 60H54', 'M40 60V83', 'M66 80H84V83'],
    A: { to: -92, th: 2, ft: -14, ua: 60, fa: 10 }, B: { to: -92, th: 2, ft: 36, ua: 60, fa: 10 } },
  // ── 臀 ──
  deadlift: { v: 's', r: ['A', 50, 80], pl: 9, still: 0,
    A: { to: -34, th: 30, sh: 104 }, B: { to: -90, th: 90, sh: 90 } },
  sumo: { v: 'f', r: ['AR', 82, 80], still: 0,
    A: { th: 30, sh: 88, ua: 96, fa: 92, bl: 0.72 }, B: { th: 70, sh: 54, ua: 93, fa: 91, bl: 1 } },
  hipthrust: { v: 's', r: ['N', 34, 58], st: ['M8 61H38', 'M12 61V83M34 61V83'], still: 1,
    A: { to: 210, hd: 200, th: -32, sh: 74, ua: 30, fa: 30 }, B: { to: 180, hd: 180, th: 10, sh: 92, ua: 0, fa: 0 } },
  bridge: { v: 's', r: ['N', 28, 78], still: 1,
    A: { to: 180, hd: 185, th: -48, sh: 72, ua: 0, fa: 0 }, B: { to: 155, hd: 170, th: -10, sh: 95, ua: 0, fa: 0 } },
  kickback: { v: 's', r: ['A2', 56, 80], hold: 'ankle', an: [104, 80], st: ['M88 18V83'],
    A: { to: -68, th2: 92, sh2: 88, ft2: 0, th: 96, sh: 100, ft: 60, ua: 22, fa: 22 }, B: { to: -68, th2: 92, sh2: 88, ft2: 0, th: 152, sh: 158, ft: 150, ua: 22, fa: 22 } },
  abduct: { v: 'f', r: ['P', 60, 56], hold: 'knee', st: ['M44 58H76', 'M60 58V83'],
    A: { th: 93, tl: 0.4, sh: 90, ua: 70, fa: 60 }, B: { th: 58, tl: 0.4, sh: 84, ua: 70, fa: 60 } },
  // ── 手臂 ──
  curl: { v: 's', r: ['A', 50, 80], an: [76, 82],
    A: { ua: 92, fa: 90 }, B: { ua: 80, fa: -72 } },
  inclinecurl: { v: 's', r: ['H', 52, 62], st: ['M55 65L37 34', 'M46 65H62', 'M54 65V83'],
    A: { to: -122, th: 0, sh: 92, ua: 96, fa: 96 }, B: { to: -122, th: 0, sh: 92, ua: 96, fa: -62 } },
  preacher: { v: 's', r: ['H', 36, 62], st: ['M42 41L56 52', 'M56 52V83', 'M26 64H46', 'M36 64V83'],
    A: { to: -80, th: 0, sh: 90, ua: 40, fa: 42 }, B: { to: -80, th: 0, sh: 90, ua: 40, fa: -84 } },
  pushdown: { v: 's', r: ['A', 44, 80], an: [66, -2],
    A: { to: -84, ua: 84, fa: -12 }, B: { to: -84, ua: 84, fa: 88 } },
  overhead: { v: 's', r: ['A', 46, 82], an: [6, 76], still: 0.3,
    A: { to: -86, ua: -76, fa: 150 }, B: { to: -86, ua: -76, fa: -78 } },
  skull: { v: 's', r: ['H', 40, 55], st: ['M28 58H86', 'M36 58V83M78 58V83'], still: 0.3,
    A: { to: 0, th: 150, sh: 80, ft: -10, ua: -80, fa: -80 }, B: { to: 0, th: 150, sh: 80, ft: -10, ua: -80, fa: 22 } },
  trikick: { v: 's', r: ['A', 44, 80], one: 1,
    A: { to: -18, th: 70, sh: 95, ua: 160, fa: 90, ua2: 60, fa2: 60 }, B: { to: -18, th: 70, sh: 95, ua: 160, fa: 162, ua2: 60, fa2: 60 } },
  wristcurl: { v: 's', r: ['H', 36, 60], st: ['M26 62H46', 'M36 62V83'],
    A: { to: -62, th: 0, sh: 90, ua: 80, fa: 8 }, B: { to: -62, th: 0, sh: 90, ua: 80, fa: -12 } },
  // ── 核心 ──
  crunch: { v: 's', r: ['H', 56, 78], hold: 'none',
    A: { to: 180, hd: 185, th: -52, sh: 52, ua: 'to+176', fa: 'to+178' }, B: { to: 214, hd: 230, th: -52, sh: 52, ua: 'to+190', fa: 'to+192' } },
  hangleg: { v: 's', r: ['W', 52, -2], st: ['M30 -2H90'], nofloor: 1, still: 1,
    A: { to: -90, ua: -90, fa: -90, th: 95, sh: 140, ft: 60 }, B: { to: -84, ua: -90, fa: -90, th: -4, sh: -2, ft: -80 } },
  plank: { v: 's', r: ['W', 86, 80], hold: 'none', d: 3.6,
    A: { to: -16, th: 164, sh: 164, ft: 95, ua: 90, fa: 0 }, B: { to: -13, th: 166, sh: 162, ft: 95, ua: 90, fa: 0 } },
  _generic: { v: 's', r: ['A', 52, 80], A: { ua: 92, fa: 90 }, B: { ua: 70, fa: -60 } }
};
const EQ_KIND = { 杠铃: 'bar', EZ杆: 'ez', 史密斯: 'smith', 哑铃: 'db', 壶铃: 'kb', 绳索: 'cable', 弹力带: 'band', 固定器械: 'mc', 自重: 'bw' };

function resolvePose(base, p, front) {
  const o = Object.assign({}, base);
  for (const k in p) if (typeof p[k] === 'number') o[k] = p[k];
  for (const k in p) if (typeof p[k] === 'string') { const m = /^(\w+)([+-]\d+(?:\.\d+)?)$/.exec(p[k]); if (m) o[k] = o[m[1]] + parseFloat(m[2]); }
  if (front) ['ua', 'fa', 'th', 'sh'].forEach(k => { if (o[k + 'L'] === undefined) o[k + 'L'] = 180 - o[k]; });
  else {
    ['th', 'sh', 'ft', 'ua', 'fa'].forEach(k => { if (o[k + '2'] === undefined) o[k + '2'] = o[k]; });
    if (o.hd === undefined) o.hd = o.to;
  }
  return o;
}
function solveJoints(bones, p, root) {
  const J = { [root[0]]: [root[1], root[2]] };
  let changed = true;
  while (changed) {
    changed = false;
    for (const b of bones) {
      const ja = J[b.a], jb = J[b.b];
      if (ja && jb) continue;
      if (!ja && !jb) continue;
      const a = b.ang(p) * RAD, L = b.len(p), dx = L * Math.cos(a), dy = L * Math.sin(a);
      if (ja) J[b.b] = [ja[0] + dx, ja[1] + dy]; else J[b.a] = [jb[0] - dx, jb[1] - dy];
      changed = true;
    }
  }
  return J;
}
const xadd = (a, ang, L) => [a[0] + L * Math.cos(ang * RAD), a[1] + L * Math.sin(ang * RAD)];
const xmid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// 一帧：身体的几条线 + 头 + 器材（每一帧的结构完全一样，方便做 SVG 补间）
function exFrame(def, kind, hold, A, B, e) {
  const front = def.v === 'f';
  const p = {};
  for (const k in A) p[k] = A[k] + ((B[k] === undefined ? A[k] : B[k]) - A[k]) * e;
  const J = solveJoints(front ? FRONT_BONES : SIDE_BONES, p, def.r);
  const out = { el: [] };
  if (front) {
    out.far = '';
    out.body = `M${xpt(J.TL)}L${xpt(J.AL)}L${xpt(J.KL)}L${xpt(J.HL)}L${xpt(J.HR)}L${xpt(J.KR)}L${xpt(J.AR)}L${xpt(J.TR)}M${xpt(J.P)}L${xpt(J.N)}M${xpt(J.WL)}L${xpt(J.EL)}L${xpt(J.SL)}L${xpt(J.SR)}L${xpt(J.ER)}L${xpt(J.WR)}`;
    out.head = xadd(J.N, p.to, 8);
  } else {
    out.far = `M${xpt(J.H)}L${xpt(J.K2)}L${xpt(J.A2)}L${xpt(J.T2)}M${xpt(J.N)}L${xpt(J.E2)}L${xpt(J.W2)}`;
    out.body = `M${xpt(J.T)}L${xpt(J.A)}L${xpt(J.K)}L${xpt(J.H)}L${xpt(J.N)}M${xpt(J.N)}L${xpt(J.E)}L${xpt(J.W)}`;
    out.head = xadd(J.N, p.hd, 8);
  }
  const el = out.el;   // [类型, 类名, 值]：c = 圆心，d = 路径
  const hands = front ? [J.WR, J.WL] : def.one ? [J.W] : [J.W, J.W2];
  const plate = def.pl || (kind === 'ez' ? 5 : 6.5);
  const anchorR = def.an || [front ? 8 : 104, 40];
  if (hold === 'none' || kind === 'bw') return out;
  if (hold === 'back' && !front) {   // 杠铃扛在背上 / 器械肩垫
    const at = xadd(J.N, p.to - 90, 4.5);
    if (kind === 'mc') el.push(['c', 'xpad', at]); else { el.push(['c', 'xplate', at, plate]); el.push(['c', 'xhub', at]); }
    return out;
  }
  if (hold === 'feet') {   // 腿举的踏板
    const a = (def.ax || -60) + 90;
    el.push(['d', 'xbar', `M${xpt(xadd(J.A, a, 10))}L${xpt(xadd(J.A, a + 180, 10))}`]);
    return out;
  }
  if (hold === 'ankle') {
    if (kind === 'cable' || kind === 'band') { el.push(['d', kind === 'band' ? 'xband' : 'xcab', `M${xpt(anchorR)}L${xpt(J.A)}`]); el.push(['c', 'xgrip', J.A]); }
    else el.push(['c', 'xpad', xadd(J.A, p.sh + (def.pad ? 90 : -90), 4)]);
    return out;
  }
  if (hold === 'knee') {
    if (front) { el.push(['c', 'xpad', [J.KR[0] + 4, J.KR[1]]]); el.push(['c', 'xpad', [J.KL[0] - 4, J.KL[1]]]); }
    else el.push(['c', 'xpad', xadd(J.K, -90, 4)]);
    return out;
  }
  // 拿在手上
  if (kind === 'cable' || kind === 'band') {
    const cls = kind === 'band' ? 'xband' : 'xcab';
    if (front && def.mid) el.push(['d', cls, `M${xpt(anchorR)}L${xpt(xmid(J.WR, J.WL))}`]);
    else if (front) el.push(['d', cls, `M${xpt([120 - anchorR[0], anchorR[1]])}L${xpt(J.WR)}M${xpt(anchorR)}L${xpt(J.WL)}`]);
    else el.push(['d', cls, `M${xpt(anchorR)}L${xpt(hands[0])}`]);
    if (front && def.mid) el.push(['d', 'xbar', `M${xpt([J.WL[0] - 7, (J.WL[1] + J.WR[1]) / 2])}H${r1(J.WR[0] + 7)}`]);
    hands.forEach(h => el.push(['c', 'xgrip', h]));
    return out;
  }
  if (kind === 'mc') {
    const pv = def.pv;
    if (pv && front) el.push(['d', 'xlever', `M${xpt(pv)}L${xpt(J.WR)}M${xpt(pv)}L${xpt(J.WL)}`]);
    else if (pv) el.push(['d', 'xlever', `M${xpt(pv)}L${xpt(J.W)}`]);
    else if (front) el.push(['d', 'xbar', `M${xpt([J.WL[0] - 4, J.WL[1]])}H${r1(J.WL[0] + 4)}M${xpt([J.WR[0] - 4, J.WR[1]])}H${r1(J.WR[0] + 4)}`]);
    hands.forEach(h => el.push(['c', 'xgrip', h]));
    return out;
  }
  if (kind === 'db') {
    if (front) el.push(['d', 'xbar', hands.map(h => `M${xpt([h[0] - 5, h[1]])}H${r1(h[0] + 5)}M${xpt([h[0] - 5, h[1] - 3])}V${r1(h[1] + 3)}M${xpt([h[0] + 5, h[1] - 3])}V${r1(h[1] + 3)}`).join('')]);
    else hands.forEach(h => { el.push(['c', 'xdb', h]); el.push(['c', 'xhub', h]); });
    return out;
  }
  if (kind === 'kb') {
    const h = front ? xmid(J.WR, J.WL) : hands[0];
    el.push(['c', 'xkb', [h[0], h[1] + 5]]);
    el.push(['d', 'xbar', `M${xpt([h[0] - 3, h[1] + 2])}Q${xpt([h[0], h[1] - 3])} ${xpt([h[0] + 3, h[1] + 2])}`]);
    return out;
  }
  // 杠铃 / EZ 杆 / 史密斯
  if (front) {
    const y = (J.WR[1] + J.WL[1]) / 2, xl = Math.min(J.WL[0], J.WR[0]) - 10, xr = Math.max(J.WL[0], J.WR[0]) + 10;
    el.push(['d', 'xbar', `M${xpt([xl, y])}H${r1(xr)}M${xpt([xl + 2, y - 6])}V${r1(y + 6)}M${xpt([xr - 2, y - 6])}V${r1(y + 6)}`]);
  } else { el.push(['c', 'xplate', hands[0], plate]); el.push(['c', 'xhub', hands[0]]); }
  return out;
}

const EX_SVG_CACHE = new Map();
// key：动画名；equip：器材中文名；still：只画一帧（列表里的小图、或者系统设置了减少动态效果）
function exSVG(key, equip, still, eAt) {
  still = still || eAt !== undefined || REDUCED();
  const ck = key + '|' + equip + '|' + (still ? 1 : 0) + '|' + (eAt === undefined ? '' : eAt);
  if (EX_SVG_CACHE.has(ck)) return EX_SVG_CACHE.get(ck);
  const def = EXA[key] || EXA._generic, front = def.v === 'f';
  const kind = EQ_KIND[equip] || 'bw';
  const ov = (def.eq && def.eq[equip]) || {};
  const hold = ov.hold || def.hold || 'hands';
  const base = front ? FRONT_BASE : SIDE_BASE;
  const A = resolvePose(base, Object.assign({}, def.A, ov.A), front);
  const B = resolvePose(base, Object.assign({}, def.A, def.B, ov.B), front);
  const N = still ? 1 : 20;
  const frames = [];
  for (let i = 0; i <= N; i++) {
    const t = still ? 0 : i / N;
    const e = eAt !== undefined ? eAt : still ? (def.still === undefined ? 1 : def.still) : 0.5 - 0.5 * Math.cos(2 * Math.PI * t);
    frames.push(exFrame(def, kind, hold, A, B, e));
  }
  const dur = (def.d || 2.6) + 's';
  const anim = (attr, vals) => still ? '' : `<animate attributeName="${attr}" dur="${dur}" repeatCount="indefinite" values="${vals.join(';')}"/>`;
  const path = (cls, get) => { const v = frames.map(get); return `<path class="${cls}" d="${v[0]}">${anim('d', v)}</path>`; };
  const circ = (cls, get, r) => {
    const v = frames.map(get);
    return `<circle class="${cls}" cx="${r1(v[0][0])}" cy="${r1(v[0][1])}"${r ? ` r="${r}"` : ''}>${anim('cx', v.map(p => r1(p[0])))}${anim('cy', v.map(p => r1(p[1])))}</circle>`;
  };
  let s = `<svg class="exs" viewBox="0 -6 120 94" aria-hidden="true">`;
  (def.st || []).forEach(d => { s += `<path class="xst" d="${d}"/>`; });
  if (kind === 'smith' && front) s += `<path class="xst xrail" d="M14 -6V83M106 -6V83"/>`;
  if (kind === 'smith' && !front) {   // 史密斯的两根立柱：画在杠铃（背上或手上）一开始的位置
    const f0 = frames[0], bar = f0.el.find(x => x[1] === 'xplate');
    if (bar) s += `<path class="xst xrail" d="M${r1(bar[2][0])} -6V83"/>`;
  }
  if (!def.nofloor) s += `<path class="xfl" d="M4 83H116"/>`;
  if (!front) s += path('xfar', f => f.far);
  s += path('xbody', f => f.body);
  s += circ('xhead', f => f.head, 5.4);
  frames[0].el.forEach((e0, i) => {
    if (e0[0] === 'd') s += path(e0[1], f => f.el[i][2]);
    else s += circ(e0[1], f => f.el[i][2], e0[3] || '');
  });
  if (kind === 'cable' || kind === 'band') {   // 滑轮
    const an = def.an || [front ? 8 : 104, 40];
    s += `<circle class="xpul" cx="${an[0]}" cy="${an[1]}" r="2.2"/>`;
    if (front && !def.mid) s += `<circle class="xpul" cx="${120 - an[0]}" cy="${an[1]}" r="2.2"/>`;
  }
  s += '</svg>';
  EX_SVG_CACHE.set(ck, s);
  return s;
}
const exAnimKey = ex => (ex && (EXA[ex.anim] ? ex.anim : null)) || 'generic_' + ((ex && ex.main) || '');
// 自己加的动作没有对应动画时，按主练部位找一个相近的
const PART_ANIM = { 上胸: 'incline', 中胸: 'bench', 下胸: 'decline', 背阔: 'pulldown', '斜方中下+菱形': 'seatedrow', 下背: 'backext', 前束: 'frontraise',
  中束: 'lateral', 后束: 'reversefly', 股四头: 'squat', 腘绳肌: 'lyingcurl', 内收: 'adduct', 小腿: 'calf', 臀: 'hipthrust', 外展: 'abduct',
  二头: 'curl', 三头: 'pushdown', 前臂: 'wristcurl', 核心: 'crunch' };
function exArt(ex, equip, still) {
  const key = ex && EXA[ex.anim] ? ex.anim : PART_ANIM[ex && ex.main] || '_generic';
  return exSVG(key, equip || (ex ? splitList(ex.equip)[0] : ''), still);
}
