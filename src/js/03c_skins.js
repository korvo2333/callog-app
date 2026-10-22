// ════════════════════════════════════════════
// 训练部位图的「主题人物」：同一副人体，按主题加上几样标志性的服装 / 道具（全部原创图形）
//   走简约风：不画五官，每个主题只留 2～4 个能认出主题的元素
//   back(side)：画在人体后面；over(side)：画在肌肉上面；side = 'f' 正面 / 'b' 背面
//   坐标和人体一样：中线 x = 0，右半边 x > 0（正面是人物的左手边），头顶 y = 0，脚底 y ≈ 400
//   pad：帽子 / 羽饰高出头顶时，图上方要多留的高度
// ════════════════════════════════════════════
const MIR = s => s + `<g transform="scale(-1 1)">${s}</g>`;
const SIDE = (s, x) => s === 'f' ? x : -x;   // 人物左手边：正面在右、背面在左
function skArc(cx, cy, r, a0, a1) {   // 圆弧（角度，0 = 3 点钟方向，顺时针）
  const p = a => [r1(cx + r * Math.cos(a * Math.PI / 180)), r1(cy + r * Math.sin(a * Math.PI / 180))];
  const [x0, y0] = p(a0), [x1, y1] = p(a1);
  return `M${x0} ${y0}A${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}
function skGear(cx, cy, r, n, h) {   // 齿轮外形
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2, w = Math.PI / n * 0.55;
    [[a - w * 1.25, r], [a - w * 0.7, r + h], [a + w * 0.7, r + h], [a + w * 1.25, r]].forEach(([b, rr], j) => {
      d += (i || j ? 'L' : 'M') + r1(cx + rr * Math.cos(b)) + ' ' + r1(cy + rr * Math.sin(b));
    });
  }
  return d + 'Z';
}
// 常用部件（右半边）
const SK_HELMET = 'M-21.4 30C-22.4 10 -12.4 -3 0 -3C12.4 -3 22.4 10 21.4 30C21 40 18.4 48 14.6 54.4H-14.6C-18.4 48 -21 40 -21.4 30Z';
const SK_SHOE = (fill, stripe) => MIR(`<path d="M7.6 384C7.6 381 9.2 379.6 11.6 379.6H19.4C21 379.6 22 381 22.2 383.6L23.6 395C23.8 398.4 22.2 400.6 19.4 400.6H9.6C7.6 400.6 6.6 399.2 6.6 396.8Z" fill="${fill}"/>${stripe ? `<path d="M6.7 396.4H23.7" stroke="${stripe}" stroke-width="2.4"/>` : ''}`);
// 靴子从小腿肌肉下面开始（不盖住肌肉）
const SK_BOOT = (fill, stroke) => MIR(`<path d="M8.4 377H22.2L22.6 384L23.8 395C24 398.4 22.4 400.6 19.4 400.6H9.6C7.6 400.6 6.6 399.2 6.6 396.8L7.6 384C7.8 381.4 8.1 379 8.4 377Z" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width=".9"` : ''}/>`);
// 护腕戴在手腕上（前臂肌肉下面）
const SK_WRIST = fill => MIR(`<path d="M56 201.8L66.9 200.6L67.6 208.4L56.1 209.6Z" fill="${fill}"/>`);
function skCleaver(x0, y0, x1, y1, w) {   // 大剑：又宽又直的刀身，剑尖斜切
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, px = -uy * w, py = ux * w;
  const P = (x, y) => `${r1(x)} ${r1(y)}`;
  return `M${P(x0 + px, y0 + py)}L${P(x1 + px, y1 + py)}L${P(x1 - px - ux * w * 1.4, y1 - py - uy * w * 1.4)}L${P(x0 - px, y0 - py)}Z`;
}
const SK_FIRE = (x, y) => `<path d="M${x - 12} ${y + 8}L${x + 12} ${y - 2}M${x - 12} ${y - 2}L${x + 12} ${y + 8}" stroke="#6b4a2b" stroke-width="3" stroke-linecap="round"/>`
  + `<path class="sk-flame" d="M${x} ${y - 28}C${x + 6} ${y - 18} ${x + 10} ${y - 10} ${x + 6} ${y}C${x + 4} ${y + 4} ${x - 4} ${y + 4} ${x - 6} ${y}C${x - 10} ${y - 8} ${x - 4} ${y - 16} ${x} ${y - 28}Z" fill="#ff8f45"/>`
  + `<path d="M${x} ${y - 16}C${x + 3} ${y - 10} ${x + 4} ${y - 4} ${x + 1} ${y + 1}C${x - 1} ${y + 2} ${x - 3} ${y + 1} ${x - 3} ${y - 2}C${x - 4} ${y - 7} ${x - 2} ${y - 11} ${x} ${y - 16}Z" fill="#f5c85a"/>`;

const MM_SKIN = {
  ios: {},

  // 竞技：运动员（发带、护腕、跑鞋）
  sport: {
    over: () => `<path d="M-16.8 10.6C-6 8 6 8 16.8 10.6L18.4 17C6 14.6 -6 14.6 -18.4 17Z" fill="var(--accent)"/>`
      + SK_WRIST('var(--accent)') + SK_SHOE('#edf1f8', 'var(--accent)')
  },

  // 手帐：贴纸小人（白边贴纸 + 铅笔描边 + 两段纸胶带）
  planner: {
    back: () => `<path d="${MM_OUTLINE}" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round" filter="url(#mmf-shadow)"/>`,
    over: s => `<path d="${MM_OUTLINE}" fill="none" stroke="#22304a" stroke-width="1.6" stroke-linejoin="round" opacity=".8" filter="url(#mmf-wob)"/>`
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><rect x="-44" y="-4" width="38" height="11" transform="rotate(-32 -25 1.5)" fill="#ffe45c" opacity=".8"/><rect x="4" y="383" width="38" height="11" transform="rotate(-16 23 388.5)" fill="#9fd3f5" opacity=".8"/></g>`
  },

  // 终端：显示器脑袋（屏幕上一个提示符和闪烁的光标）+ 扫描线 + 虚线轮廓
  terminal: {
    over: s => `<path d="${MM_OUTLINE}" fill="url(#mmp-scan)"/>`
      + `<path d="M-13 47H13L13.6 62H-13.6Z" fill="#1d160c" stroke="#ffb000" stroke-width="1.4"/><rect x="-25" y="-3" width="50" height="50" rx="6" fill="#1d160c" stroke="#ffb000" stroke-width="2"/>`
      + (s === 'f'
        ? `<rect x="-19.4" y="3" width="38.8" height="36" rx="3" fill="#0b0805" stroke="#ffb000" stroke-opacity=".5"/><text x="-14.6" y="26" fill="#ffb000" font-size="14" font-weight="800" font-family="JetBrains Mono, monospace">&gt;</text><rect class="sk-blink" x="-2.4" y="14" width="7.5" height="13" fill="#ffb000"/>`
        : `<path d="M-15 12H15M-15 18H15M-15 24H15M-15 30H15" stroke="#ffb000" stroke-opacity=".55" stroke-width="1.8"/>`)
  },

  // 糖果：软糖小人（粗描边 + 投影、头上一个蝴蝶结）
  candy: {
    back: () => `<path d="${MM_OUTLINE}" transform="translate(3.5 3.5)" fill="#1f1b3a"/>`,
    over: s => `<g transform="translate(${SIDE(s, 11)} 1) rotate(${SIDE(s, 20)})"><path d="M0 0L-10.5 -7.5C-12.6 -2.5 -12.6 2.5 -10.5 7.5ZM0 0L10.5 -7.5C12.6 -2.5 12.6 2.5 10.5 7.5Z" fill="#ff5c8a" stroke="#1f1b3a" stroke-width="1.8" stroke-linejoin="round"/><circle r="3.3" fill="#ff8fb0" stroke="#1f1b3a" stroke-width="1.8"/></g>`
  },

  // 墨：武者（发髻、红头巾，身后一笔圆相）
  sumi: {
    pad: 6,
    back: () => `<path d="${skArc(0, 170, 96, -62, 252)}" fill="none" stroke="#1e1c19" stroke-width="10" stroke-linecap="round" opacity=".1" filter="url(#mmf-ink)"/>`,
    over: s => (s === 'f'
      ? `<path d="M-19.2 17C-19.4 5 -11 -1.4 0 -1.4C11 -1.4 19.4 5 19.2 17C15 11 8 9 0 9C-8 9 -15 11 -19.2 17Z" fill="#1e1c19"/>`
      : `<path d="M-19.4 22C-20 7 -11 -1.4 0 -1.4C11 -1.4 20 7 19.4 22C19 32 16 40 11 44C4 41.4 -4 41.4 -11 44C-16 40 -19 32 -19.4 22Z" fill="#1e1c19"/>`)
      + `<path d="M-5 -1C-7 -9 -3.6 -14.6 0 -14.6C3.6 -14.6 7 -9 5 -1Z" fill="#1e1c19"/>`
      + `<path d="M-18.2 9.6C-6 7 6 7 18.2 9.6L18.9 15.6C6 13 -6 13 -18.9 15.6Z" fill="#b7282e"/>`
      + (s === 'b' ? `<path d="M2 12C10 17 18 20 31 19C27 24 18 26 9 22.5L1 15.5ZM2 13C7 22 12 30 23 37C16 38 9 33 3.5 21Z" fill="#b7282e"/>` : '')
  },

  // 霓虹：赛博义体人（头盔 + 发光面罩、关节处的小光环）
  neon: {
    over: s => `<path d="${SK_HELMET}" fill="#232a36" stroke="#4a5568" stroke-width="1.4"/>`
      + (s === 'f' ? `<path d="M-17.6 17H17.6L15.6 27.4H-15.6Z" fill="#00e5ff" filter="url(#mmf-glow)"/>` : `<path d="M-13 22H13" stroke="#00e5ff" stroke-width="2" opacity=".7"/>`)
      + MIR(`<g fill="none" stroke="#00e5ff" stroke-width="1.4"><circle cx="52.4" cy="152" r="2.6"/><circle cx="19.4" cy="296.4" r="3"/></g>`)
  },

  // 蒸汽：机械师（高礼帽 + 护目镜、头后一个齿轮、黄铜护腕、皮靴）
  steam: {
    pad: 22,
    back: () => `<path d="${skGear(0, 42, 36, 12, 7)}" fill="#3a2a1a" stroke="#b8862f" stroke-width="1.6"/>`,
    over: s => `<ellipse cx="0" cy="5" rx="27" ry="5.4" fill="#2a1d12" stroke="#e2bd6c" stroke-width="1.2"/><path d="M-16 5V-26C-16 -29.6 -13 -31 0 -31C13 -31 16 -29.6 16 -26V5Z" fill="#2a1d12" stroke="#e2bd6c" stroke-width="1.2"/><rect x="-16" y="-7" width="32" height="6" fill="#b8862f"/>`
      + (s === 'f' ? MIR(`<circle cx="7.4" cy="-4" r="5.6" fill="#3a2a1a" stroke="#e2bd6c" stroke-width="2"/><circle cx="7.4" cy="-4" r="3" fill="#8fb2cc" opacity=".85"/>`) : '')
      + SK_WRIST('#b8862f') + SK_BOOT('#3a2716', '#e2bd6c')
  },

  // 魔法：法师（尖帽、斗篷、法杖）
  magic: {
    pad: 38,
    back: () => `<path d="M-40 66C-52 126 -64 254 -78 388C-44 398 44 398 78 388C64 254 52 126 40 66C26 61 -26 61 -40 66Z" fill="#2f2758" stroke="#dcb65a" stroke-width="1.2"/><path d="M-78 388C-44 398 44 398 78 388" fill="none" stroke="#dcb65a" stroke-width="2.4"/>`,
    over: s => `<ellipse cx="0" cy="10" rx="32" ry="6.4" fill="#2f2758" stroke="#dcb65a" stroke-width="1.2"/><path d="M-17.6 9C-13.6 -6 -6.6 -24 1.6 -37C6 -43.6 12 -47.6 22.4 -45.6C15.4 -41.6 12.4 -35.6 11.4 -27.6C11.4 -15 14.4 -2 18.4 9Z" fill="#3a2d6b" stroke="#dcb65a" stroke-width="1.2" transform="scale(${s === 'f' ? 1 : -1} 1)"/><path d="M-17.8 3.6C-6 6 6 6 17.8 3.6L18.4 9C6 11.4 -6 11.4 -18.4 9Z" fill="#dcb65a"/>`
      + `<path d="M${SIDE(s, 66)} -16V398" stroke="#8a6a3a" stroke-width="3.4" stroke-linecap="round"/><circle cx="${SIDE(s, 66)}" cy="-23" r="6.5" fill="#9fd0ff" filter="url(#mmf-glow)"/>`
  },

  // 自然：森灵（叶冠，肩后长出来的枝叶，脚下草丛）
  nature: {
    pad: 4,
    back: () => MIR(`<path d="M30 72C40 60 52 50 66 44M48 54C50 46 54 40 60 36" fill="none" stroke="#7a5f3c" stroke-width="2" stroke-linecap="round"/>`
        + [[66, 44, -20], [58, 50, 40], [60, 36, -60], [44, 58, 50]].map(([x, y, a], i) => `<path transform="translate(${x} ${y}) rotate(${a})" d="M0 0C3-4.4 8-5 12 0C8 5 3 4.4 0 0Z" fill="${i % 2 ? '#8db36f' : '#4d7a46'}"/>`).join('')
        + `<path d="M24 402C25 395 28 392 31 389M32 402C32 396 35 393 39 391M14 402C14 397 16 394 19 392" fill="none" stroke="#5b8c4e" stroke-width="1.6" stroke-linecap="round"/>`),
    over: () => [200, 222, 244, 266, 288, 310, 332].map((a, i) => {
      const x = r1(Math.cos(a * Math.PI / 180) * 19), y = r1(22 + Math.sin(a * Math.PI / 180) * 19);
      return `<path transform="translate(${x} ${y}) rotate(${a + (i % 2 ? 14 : -14)})" d="M0 0C2.8-4.2 7.4-4.6 11 0C7.4 4.6 2.8 4.2 0 0Z" fill="${i % 2 ? '#8db36f' : '#4d7a46'}"/>`;
    }).join('')
  },

  // ── 游戏风：按各自参照的游戏画人物（原创图形，不画任何游戏里的具体角色） ──
  // 狩猎（参照怪物猎人）：带角的猎人头盔、背后一把骨质大剑、毛边靴
  hunt: {
    pad: 30,
    back: s => `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><path d="${skCleaver(34, 2, -18, 204, 15)}" fill="#7a756c" stroke="#3b2b1e" stroke-width="1.4" stroke-linejoin="round"/>`
      + `<path d="M31 14L-14 190" stroke="#c9c1b0" stroke-width="2.4"/>`
      + `<path d="M14 -4L54 8" stroke="#5a3a22" stroke-width="7" stroke-linecap="round"/><path d="M35 1L43 -27" stroke="#3b2b1e" stroke-width="5.4" stroke-linecap="round"/><circle cx="44" cy="-30" r="4.4" fill="#c9a24a" stroke="#3b2b1e"/></g>`,
    over: s => MIR(`<path d="M9 4C17 -2 25 -12 27 -28C31.6 -13 26 -1 16 7Z" fill="#eadcbc" stroke="#7a6243" stroke-width="1.2" stroke-linejoin="round"/>`)
      + `<path d="${SK_HELMET}" fill="#5a3a22" stroke="#2e1d0e" stroke-width="1.2"/>`
      + (s === 'f' ? `<path d="M-17 18.4H17L15.4 26.4H-15.4Z" fill="#2e1d0e"/>` : `<path d="M0 -3V54" stroke="#2e1d0e" stroke-width="1.2"/>`)
      + SK_BOOT('#5a3a22') + MIR(`<path d="M7.8 378C11.8 373.6 21.6 373.6 23.4 378C23.4 382 20 383.6 15.8 383C11.6 383.6 7.8 382 7.8 378Z" fill="#eadcbc"/>`)
  },

  // 学园（参照蔚蓝档案）：头上的光环、手里一把枪、白色运动鞋，身后一块斜切的天空
  academy: {
    pad: 12,
    back: () => `<path d="M-52 22H94L56 386H-90Z" fill="#d6ecff" opacity=".75"/>`,
    over: s => `<g filter="url(#mmf-glow)" transform="rotate(${SIDE(s, -8)} 0 -11)"><ellipse cx="0" cy="-11" rx="16" ry="4.6" fill="none" stroke="#1a96f0" stroke-width="2"/><ellipse cx="0" cy="-11" rx="10" ry="2.6" fill="none" stroke="#7cc6ff" stroke-width="1.2"/>`
        + [[-16, -11], [16, -11], [0, -15.6]].map(([x, y]) => `<path d="M${x} ${y - 3}L${x + 2.2} ${y}L${x} ${y + 3}L${x - 2.2} ${y}Z" fill="#1a96f0"/>`).join('') + `</g>`
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><path d="M58.6 214H67L67.4 276H59Z" fill="#2b3a57"/><path d="M55 236H58.8V256L55.6 257Z" fill="#2b3a57"/><path d="M61.8 276H64.6V334H61.8Z" fill="#2b3a57"/><path d="M60.8 330H65.6V334H60.8Z" fill="#2b3a57"/><path d="M60 244H66" stroke="#7cc6ff" stroke-width="1.4"/></g>`
      + SK_SHOE('#fff', '#1a96f0')
  },

  // 工业（参照明日方舟：终末地）：带黄边的机能兜帽、背包和天线、外骨骼支架 + 黄色关节、身边一架小无人机
  industry: {
    pad: 4,
    back: s => `<rect x="-24" y="42" width="48" height="58" rx="4" fill="#3c3c3a"/><path d="M${SIDE(s, 16)} 44L${SIDE(s, 22)} 20" stroke="#161616" stroke-width="2"/><circle cx="${SIDE(s, 22.4)}" cy="18" r="2.6" fill="#ffd400"/>`
      + `<g transform="translate(${SIDE(s, -48)} 16)"><path d="M-12 -3H-5M5 -3H12" stroke="#161616" stroke-width="1.8" stroke-linecap="round"/><path d="M0 -6L8 0L0 6L-8 0Z" fill="#161616"/><circle r="2.2" fill="#ffd400"/></g>`,
    over: s => `<path d="M-22 36L-21 14L-13 -1L0 -5L13 -1L21 14L22 36L17.6 55H-17.6Z" fill="#232323"/>`
      + (s === 'f'
        ? `<path d="M-13 16L0 10L13 16L12 34L0 42L-12 34Z" fill="#0f0f0f" stroke="#ffd400" stroke-width="1.2" stroke-linejoin="round"/><path d="M-10 23H10" stroke="#ffd400" stroke-width="2"/>`
        : `<path d="M-1.6 2H1.6V44H-1.6Z" fill="#ffd400"/><path d="M5 20H11M5 24H9M5 28H11" stroke="#f7f7f5" stroke-width="1"/>`)
      + MIR(`<path d="M61.4 80L64.4 150L72 200M46 212L36.4 294L26.6 378" fill="none" stroke="#161616" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><g fill="#ffd400" stroke="#161616" stroke-width="1.6"><circle cx="61.4" cy="80" r="4.4"/><circle cx="64.4" cy="150" r="4.4"/><circle cx="46" cy="212" r="4.4"/><circle cx="36.4" cy="294" r="4.4"/></g>`)
      + SK_SHOE('#161616', '#ffd400')
  },

  // 远征（参照龙之信条 2）：T 字开口的中世纪头盔 + 红羽、破旧的红斗篷、单手剑
  expedition: {
    pad: 22,
    back: () => `<path d="M-42 68C-56 146 -66 262 -74 374L-60 364L-50 378L-36 366L-22 380L-7 368L7 380L22 368L36 380L50 366L60 378L74 372C66 262 56 146 42 68C28 62 -28 62 -42 68Z" fill="#4a1714"/>`,
    over: s => `<path d="M0 -5C2 -19 14 -31 30 -27C24 -25 20 -23 17 -18C24 -19 28 -15 30 -11C22 -13 14 -11 6 -3Z" fill="#b02a2a" transform="scale(${s === 'f' ? 1 : -1} 1)"/>`
      + `<path d="M-20 38C-21.6 14 -14 -4 0 -5C14 -4 21.6 14 20 38L17 55H-17Z" fill="#5a554d"/>`
      + (s === 'f' ? `<path d="M-13 20H13V24.6H2.6V40H-2.6V24.6H-13Z" fill="#0d0c0a"/>` : `<path d="M0 -5V55" stroke="#2a2723" stroke-width="1"/>`)
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><path d="M58.8 236H65.2L64.8 368L62 378L59.2 368Z" fill="#9a958c"/><path d="M62 210V232" stroke="#3b2b1e" stroke-width="4"/><path d="M50 234.4H74" stroke="#8a8070" stroke-width="3.6" stroke-linecap="round"/></g>`
  },

  // 星野（参照星际拓荒）：玻璃头盔、喷气背包、手套靴子，手里一根烤棉花糖的树枝，脚边一堆篝火
  starwild: {
    back: s => `<rect x="-30" y="44" width="60" height="94" rx="10" fill="#c9d3ea"/>` + MIR(`<path d="M34 116H43L41.6 134H35.4Z" fill="#8a96b8"/>`)
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)">${SK_FIRE(94, 392)}</g>`,
    over: s => `<circle cx="0" cy="24" r="29.4" fill="#5fd3c4" fill-opacity=".14" stroke="#d9e1f2" stroke-width="2.4"/><path d="M-19 7A22 22 0 0 1 -5 -1" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/><rect x="-21" y="50" width="42" height="9" rx="4.5" fill="#d9e1f2"/>`
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><path d="M64 236L90 334" stroke="#8a6a3a" stroke-width="2" stroke-linecap="round"/><rect x="86" y="332" width="9" height="11" rx="3" transform="rotate(-15 90.5 337.5)" fill="#fff" stroke="#d9c7a8"/></g>`
      + MIR(`<path d="M55.6 205.4C58 201.4 65.6 200.4 67.6 204.4L69.4 224C69.6 236 66 245.6 61.2 245.6C57.6 245.6 55.8 238 55.8 230Z" fill="#e6ebf5"/><path d="M56 201.8L66.9 200.6L67.4 206.4L56.1 207.6Z" fill="#ff8f45"/>`)
      + SK_BOOT('#e6ebf5') + MIR(`<path d="M8.2 380H22.4" stroke="#ff8f45" stroke-width="2.4"/>`)
  },

  // 苍穹（参照空之轨迹）：身边浮着一块镶七色结晶回路的导力器、天上一艘小飞艇、白色长靴
  skyward: {
    back: s => `<g transform="translate(${SIDE(s, 58)} 18) scale(${s === 'f' ? 1.25 : -1.25} 1.25)"><ellipse rx="14" ry="5.4" fill="#fffaf0" stroke="#c9a35a" stroke-width="1"/><path d="M11 -1L18 -5V4L11 1Z" fill="#c9a35a"/><path d="M-6 5H5L3 9H-4Z" fill="#405579"/></g>`,
    over: s => `<g transform="translate(${SIDE(s, -50)} 22) scale(1.2)"><circle r="11.6" fill="#fffaf0" stroke="#d29a2e" stroke-width="2"/>`
        + ['#d6574e', '#3f7fd0', '#3f9f6b', '#d29a2e', '#8a5fd0', '#3fb4c9'].map((c, i) => {
          const a = (i * 60 - 90) * Math.PI / 180;
          return `<circle cx="${r1(Math.cos(a) * 7)}" cy="${r1(Math.sin(a) * 7)}" r="2.2" fill="${c}"/>`;
        }).join('') + `<path d="M0 -2.6L2.2 0L0 2.6L-2.2 0Z" fill="#2f62c9"/></g>`
      + SK_BOOT('#fffaf0', '#d29a2e')
  }
};
const MM_DEFS = `<defs>
  <filter id="mmf-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="mmf-ink" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".8" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3.2"/></filter>
  <filter id="mmf-wob" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="7"/><feDisplacementMap in="SourceGraphic" scale="4.5"/></filter>
  <filter id="mmf-shadow" x="-15%" y="-10%" width="130%" height="125%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#22304a" flood-opacity=".22"/></filter>
  <pattern id="mmp-scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.5" fill="#000" opacity=".35"/></pattern>
  <pattern id="mmp-haz" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#ffd400"/><rect width="4.5" height="9" fill="#161616"/></pattern>
</defs>`;
const mmSkin = () => MM_SKIN[document.documentElement.dataset.theme] || MM_SKIN.ios;
