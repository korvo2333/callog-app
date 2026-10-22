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
function skBlade(x0, y0, x1, y1, w) {   // 剑身：从护手到剑尖
  const L = Math.hypot(x1 - x0, y1 - y0), ux = (x1 - x0) / L, uy = (y1 - y0) / L, px = -uy * w, py = ux * w;
  const bx = x1 - ux * w * 2.4, by = y1 - uy * w * 2.4;
  return `M${r1(x0 + px)} ${r1(y0 + py)}L${r1(bx + px)} ${r1(by + py)}L${r1(x1)} ${r1(y1)}L${r1(bx - px)} ${r1(by - py)}L${r1(x0 - px)} ${r1(y0 - py)}Z`;
}
function skVine(pts, amp, waves, seed) {   // 沿着一条折线绕的藤蔓 + 几片叶子
  const seg = [];
  let L = 0;
  for (let i = 1; i < pts.length; i++) { const l = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(l); L += l; }
  const at = s => {
    let d = s * L, i = 0;
    while (i < seg.length - 1 && d > seg[i]) { d -= seg[i]; i++; }
    const a = pts[i], b = pts[i + 1], t = d / seg[i], dx = (b[0] - a[0]) / seg[i], dy = (b[1] - a[1]) / seg[i];
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, -dy, dx];
  };
  let d = '', leaves = '';
  const N = 60;
  for (let k = 0; k <= N; k++) {
    const s = k / N, [x, y, nx, ny] = at(s), o = Math.sin(s * Math.PI * 2 * waves + seed) * amp;
    d += (k ? 'L' : 'M') + r1(x + nx * o) + ' ' + r1(y + ny * o);
    if (k % 12 === 6) {
      const ang = Math.atan2(ny, nx) * 180 / Math.PI + (o > 0 ? 0 : 180) + (k % 24 ? 25 : -25);
      leaves += `<path transform="translate(${r1(x + nx * o)} ${r1(y + ny * o)}) rotate(${r1(ang)})" d="M0 0C2.5-3 6-3.5 9 0C6 3.5 2.5 3 0 0Z" fill="#5b8c4e"/>`;
    }
  }
  return `<path d="${d}" fill="none" stroke="#3d6b37" stroke-width="1.5" stroke-linecap="round"/>` + leaves;
}
// 常用部件（右半边）
const SK_HELMET = 'M-21.4 30C-22.4 10 -12.4 -3 0 -3C12.4 -3 22.4 10 21.4 30C21 40 18.4 48 14.6 54.4H-14.6C-18.4 48 -21 40 -21.4 30Z';
const SK_SHOE = (fill, stripe) => MIR(`<path d="M7.6 384C7.6 381 9.2 379.6 11.6 379.6H19.4C21 379.6 22 381 22.2 383.6L23.6 395C23.8 398.4 22.2 400.6 19.4 400.6H9.6C7.6 400.6 6.6 399.2 6.6 396.8Z" fill="${fill}"/>${stripe ? `<path d="M6.7 396.4H23.7" stroke="${stripe}" stroke-width="2.4"/>` : ''}`);
const SK_BOOT = (fill, stroke) => MIR(`<path d="M8.2 364H23.4C23 372 22.4 378 22.6 384L23.8 395C24 398.4 22.4 400.6 19.4 400.6H9.6C7.6 400.6 6.6 399.2 6.6 396.8L7.6 384C7.8 377 7.6 370 8.2 364Z" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width=".9"` : ''}/>`);
const SK_WRIST = fill => MIR(`<path d="M54.6 192.4L66.4 191.2L67 200.6L55.8 202Z" fill="${fill}"/>`);
const SK_BELT = fill => MIR(`<path d="M0 180.4H33.5L34.8 188.6H0Z" fill="${fill}"/>`);

const MM_SKIN = {
  ios: {},

  // 竞技：运动员（发带、护腕、短裤腰带和侧条、跑鞋）
  sport: {
    over: () => `<path d="M-16.8 10.6C-6 8 6 8 16.8 10.6L18.4 17C6 14.6 -6 14.6 -18.4 17Z" fill="var(--accent)"/>`
      + SK_WRIST('var(--accent)') + SK_BELT('var(--accent)') + MIR(`<path d="M39.4 204L37.6 252" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>`)
      + SK_SHOE('#edf1f8', 'var(--accent)')
  },

  // 手帐：贴纸小人（白边贴纸 + 铅笔描边 + 两段纸胶带）
  planner: {
    back: () => `<path d="${MM_OUTLINE}" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round" filter="url(#mmf-shadow)"/>`,
    over: s => `<path d="${MM_OUTLINE}" fill="none" stroke="#22304a" stroke-width="1.6" stroke-linejoin="round" opacity=".8" filter="url(#mmf-wob)"/>`
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><rect x="-44" y="-4" width="38" height="11" transform="rotate(-32 -25 1.5)" fill="#ffe45c" opacity=".8"/><rect x="4" y="376" width="38" height="11" transform="rotate(-16 23 381.5)" fill="#9fd3f5" opacity=".8"/></g>`
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

  // 墨：武者（发髻、红头巾、黑腰带，身后一笔圆相）
  sumi: {
    pad: 6,
    back: () => `<path d="${skArc(0, 170, 96, -62, 252)}" fill="none" stroke="#1e1c19" stroke-width="10" stroke-linecap="round" opacity=".1" filter="url(#mmf-ink)"/>`,
    over: s => (s === 'f'
      ? `<path d="M-19.2 17C-19.4 5 -11 -1.4 0 -1.4C11 -1.4 19.4 5 19.2 17C15 11 8 9 0 9C-8 9 -15 11 -19.2 17Z" fill="#1e1c19"/>`
      : `<path d="M-19.4 22C-20 7 -11 -1.4 0 -1.4C11 -1.4 20 7 19.4 22C19 32 16 40 11 44C4 41.4 -4 41.4 -11 44C-16 40 -19 32 -19.4 22Z" fill="#1e1c19"/>`)
      + `<path d="M-5 -1C-7 -9 -3.6 -14.6 0 -14.6C3.6 -14.6 7 -9 5 -1Z" fill="#1e1c19"/>`
      + `<path d="M-18.2 9.6C-6 7 6 7 18.2 9.6L18.9 15.6C6 13 -6 13 -18.9 15.6Z" fill="#b7282e"/>`
      + (s === 'b' ? `<path d="M2 12C10 17 18 20 31 19C27 24 18 26 9 22.5L1 15.5ZM2 13C7 22 12 30 23 37C16 38 9 33 3.5 21Z" fill="#b7282e"/>` : '')
      + MIR(`<path d="M0 179.4H33.4L34.9 190H0Z" fill="#1e1c19"/>`)
      + (s === 'f' ? `<path d="M-3.4 190L-7.4 208L-3.4 209.4L0 193ZM3.4 190L8 206.6L4.2 208.4L0 193Z" fill="#1e1c19"/>` : '')
  },

  // 霓虹：赛博义体人（头盔 + 发光面罩、关节发光环）
  neon: {
    over: s => `<path d="${SK_HELMET}" fill="#232a36" stroke="#4a5568" stroke-width="1.4"/>`
      + (s === 'f' ? `<path d="M-17.6 17H17.6L15.6 27.4H-15.6Z" fill="#00e5ff" filter="url(#mmf-glow)"/>` : `<path d="M-13 22H13" stroke="#00e5ff" stroke-width="2" opacity=".7"/>`)
      + MIR(`<g fill="none" stroke="#00e5ff" stroke-width="1.6"><circle cx="52.4" cy="152" r="4.2"/><circle cx="19.4" cy="296" r="4.6"/></g>`)
  },

  // 蒸汽：机械师（高礼帽 + 护目镜、黄铜护腕、皮靴，头后一个齿轮）
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

  // 自然：森灵（叶冠，手臂和腿上各绕一条藤蔓）
  nature: {
    pad: 4,
    over: s => [200, 222, 244, 266, 288, 310, 332].map((a, i) => {
        const x = r1(Math.cos(a * Math.PI / 180) * 19), y = r1(22 + Math.sin(a * Math.PI / 180) * 19);
        return `<path transform="translate(${x} ${y}) rotate(${a + (i % 2 ? 14 : -14)})" d="M0 0C2.8-4.2 7.4-4.6 11 0C7.4 4.6 2.8 4.2 0 0Z" fill="${i % 2 ? '#8db36f' : '#4d7a46'}"/>`;
      }).join('')
      + skVine(s === 'f' ? [[46, 76], [52, 150], [62, 203]] : [[-46, 76], [-52, 150], [-62, 203]], 6, 3, 0.4)
      + skVine(s === 'f' ? [[-30, 214], [-20, 296], [-15, 376]] : [[30, 214], [20, 296], [15, 376]], 6.5, 3, 2)
  },

  // 狩猎：猎人（兜帽、毛领、背后大剑、皮带和皮靴）
  hunt: {
    pad: 8,
    back: s => `<path d="${skBlade(SIDE(s, 40), 16, SIDE(s, -26), 196, 6.5)}" fill="#7a756c" stroke="#3b2b1e" stroke-width="1.2"/>`
      + `<path d="M${SIDE(s, 27)} 9L${SIDE(s, 55)} 21" stroke="#3b2b1e" stroke-width="5" stroke-linecap="round"/><path d="M${SIDE(s, 40)} 14L${SIDE(s, 48)} -8" stroke="#5a3a22" stroke-width="5" stroke-linecap="round"/>`,
    over: s => (s === 'f'
      ? `<path d="M-23 32C-25 12 -15 -6 0 -7C15 -6 25 12 23 32C23 44 19.4 54 16 60.4C10 55.4 -10 55.4 -16 60.4C-19.4 54 -23 44 -23 32Z" fill="#6b4a2b"/><path d="M-13.4 22C-13.4 12 -7.4 7 0 7C7.4 7 13.4 12 13.4 22C13.4 33 8.4 42 0 43C-8.4 42 -13.4 33 -13.4 22Z" fill="#e3cfa3"/>`
      : `<path d="M-23 32C-25 12 -15 -6 0 -7C15 -6 25 12 23 32C23 44 18 54 14 60L0 64L-14 60C-18 54 -23 44 -23 32Z" fill="#6b4a2b"/>`)
      + `<path d="M-37 64.4C-26 56 26 56 37 64.4C33 70.4 28.6 67.4 24.6 72.4C20.6 67.4 14.6 70.4 10.6 67.4C6 71.4 -6 71.4 -10.6 67.4C-14.6 70.4 -20.6 67.4 -24.6 72.4C-28.6 67.4 -33 70.4 -37 64.4Z" fill="#eadcbc"/>`
      + SK_BELT('#5a3a22') + SK_BOOT('#5a3a22')
  },

  // 学园：学生（短发、衬衫领 + 领带、袖章、白袜运动鞋，身后一块斜切的天空）
  academy: {
    pad: 4,
    back: () => `<path d="M-52 22H94L56 386H-90Z" fill="#d6ecff" opacity=".75"/>`,
    over: s => (s === 'f'
      ? `<path d="M-20 24C-21 8 -11 -2 0 -2C11 -2 21 8 20 24C18.4 17 14.4 13 9.4 12L7.4 17L4.4 11.4C1.4 13 -3.6 14 -6.6 12L-8.6 16L-10.6 11.4C-14.6 13 -18 18 -20 24Z" fill="#2b3a57"/>`
        + MIR(`<path d="M12.6 58.6L1.6 64.6L6.6 71.6Z" fill="#fff" stroke="#22324b" stroke-width="1"/>`)
        + `<path d="M-3.6 63H3.6L4.6 68L2 70L4 94L0 99L-4 94L-2 70L-4.6 68Z" fill="#1a96f0"/>`
      : `<path d="M-20 24C-21 8 -11 -2 0 -2C11 -2 21 8 20 24C19.6 32 17 39 12.6 44H-12.6C-17 39 -19.6 32 -20 24Z" fill="#2b3a57"/>`)
      + `<path d="M1 -2C2 -9 7 -12 11 -10C7 -10 5 -7 3 -2Z" fill="#2b3a57"/>`
      + `<path d="M42.6 113.4L54.6 112L55.6 120.4L43.4 121.6Z" fill="#1a96f0" transform="scale(${s === 'f' ? 1 : -1} 1)"/>`
      + MIR(`<path d="M7.4 362H24L22.4 376H8.4Z" fill="#fff" stroke="#c9d9ea" stroke-width=".8"/>`) + SK_SHOE('#1a96f0', '#fff')
  },

  // 工业：外骨骼作业员（护目头盔、警示条腰带、外骨骼支架 + 黄色关节）
  industry: {
    over: s => `<path d="${SK_HELMET}" fill="#161616"/>`
      + (s === 'f' ? `<path d="M-16 15.6H16V25C16 28 14 29.6 11 29.6H-11C-14 29.6 -16 28 -16 25Z" fill="#ffd400"/>` : `<path d="M-20.8 18H20.8V24.4H-20.8Z" fill="url(#mmp-haz)"/>`)
      + `<path d="M-34.6 180.4H34.6L35.8 188.8H-35.8Z" fill="url(#mmp-haz)" stroke="#161616" stroke-width=".8"/>`
      + MIR(`<path d="M61.4 80L64.4 150L72 200M46 212L36.4 294L26.6 378" fill="none" stroke="#161616" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/><g fill="#ffd400" stroke="#161616" stroke-width="1.6"><circle cx="61.4" cy="80" r="4.4"/><circle cx="64.4" cy="150" r="4.4"/><circle cx="46" cy="212" r="4.4"/><circle cx="36.4" cy="294" r="4.4"/></g>`)
      + SK_SHOE('#161616', '#ffd400')
  },

  // 远征：暗色骑士（桶盔 + 红羽、破斗篷、长剑）
  expedition: {
    pad: 22,
    back: () => `<path d="M-42 68C-56 146 -66 262 -74 374L-60 364L-50 378L-36 366L-22 380L-7 368L7 380L22 368L36 380L50 366L60 378L74 372C66 262 56 146 42 68C28 62 -28 62 -42 68Z" fill="#4a1714"/>`,
    over: s => `<path d="M0 -5C2 -19 14 -31 30 -27C24 -25 20 -23 17 -18C24 -19 28 -15 30 -11C22 -13 14 -11 6 -3Z" fill="#b02a2a" transform="scale(${s === 'f' ? 1 : -1} 1)"/>`
      + `<path d="M-20.4 38C-22 14 -15 -4 0 -5C15 -4 22 14 20.4 38L15.6 55H-15.6Z" fill="#5a554d"/>`
      + (s === 'f' ? `<path d="M-15.4 20H15.4L14.4 24H-14.4Z" fill="#0d0c0a"/>` : '')
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><path d="M58.8 236H65.2L64.8 368L62 378L59.2 368Z" fill="#9a958c"/><path d="M62 210V232" stroke="#3b2b1e" stroke-width="4"/><path d="M50 234.4H74" stroke="#8a8070" stroke-width="3.6" stroke-linecap="round"/></g>`
  },

  // 星野：宇航员（玻璃头盔、维生背包、手套和靴子、绕身的轨道环）
  starwild: {
    back: () => `<rect x="-32" y="42" width="64" height="98" rx="9" fill="#c9d3ea"/><g transform="rotate(-10 0 206)"><path d="M-80 206A80 18 0 0 1 80 206" fill="none" stroke="#ff8f45" stroke-width="1.8" opacity=".75"/></g>`,
    over: s => `<circle cx="0" cy="24" r="29.4" fill="#5fd3c4" fill-opacity=".14" stroke="#d9e1f2" stroke-width="2.4"/><path d="M-19 7A22 22 0 0 1 -5 -1" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/><rect x="-21" y="50" width="42" height="9" rx="4.5" fill="#d9e1f2"/>`
      + MIR(`<path d="M55.6 205.4C58 201.4 65.6 200.4 67.6 204.4L69.4 224C69.6 236 66 245.6 61.2 245.6C57.6 245.6 55.8 238 55.8 230Z" fill="#e6ebf5"/><path d="M54.6 196.4L66.6 195.2L67 202.2L55.4 203.4Z" fill="#ff8f45"/>`)
      + SK_BOOT('#e6ebf5') + MIR(`<path d="M8 370H23" stroke="#ff8f45" stroke-width="2.4"/>`)
      + `<g transform="rotate(-10 0 206)"><path d="M-80 206A80 18 0 0 0 80 206" fill="none" stroke="#ff8f45" stroke-width="1.8"/><circle cx="${SIDE(s, 56)}" cy="218.8" r="5" fill="#5fd3c4"/></g>`
  },

  // 苍穹：有翼的天空骑士（羽翼、金冠 + 宝石、金腰带）
  skyward: {
    back: () => MIR(`<path d="M20 86C38 60 60 38 88 22C86 33 82 41 76 47C82 49 84 55 80 61C74 61 70 63 66 67C72 71 72 77 66 81C60 81 56 83 52 87C56 93 54 99 48 101C42 99 38 101 34 105C36 113 32 119 26 121Z" fill="#fffaf0" stroke="#d29a2e" stroke-width="1.4" stroke-linejoin="round"/>`),
    over: s => `<path d="M-17.4 9.6C-6 7 6 7 17.4 9.6L17.8 13.8C6 11.4 -6 11.4 -17.8 13.8Z" fill="#d29a2e"/>`
      + (s === 'f' ? `<path d="M0 5.4L3.6 10.6L0 15.8L-3.6 10.6Z" fill="#2f62c9" stroke="#fffaf0" stroke-width=".7"/>` : '')
      + SK_BELT('#d29a2e')
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
