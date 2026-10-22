// ════════════════════════════════════════════
// 训练部位图的「主题角色」：同一副人体，按主题换上服装和道具（全部原创图形）
//   back(side)：画在人体后面；over(side)：画在肌肉上面；side = 'f' 正面 / 'b' 背面
//   坐标和人体一样：中线 x = 0，右半边 x > 0（正面是人物的左手边），头顶 y = 0，脚底 y ≈ 400
//   pad：头上的帽子 / 天线要多留的高度；title / leg / rest：卡片标题、图例、休息日文案
// ════════════════════════════════════════════
const MIR = s => s + `<g transform="scale(-1 1)">${s}</g>`;
const SPARK = (x, y, r, a) => `<path ${a || ''} d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z"/>`;
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
function skVine(pts, amp, waves, seed) {   // 沿着一条折线绕的藤蔓 + 叶子
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
    if (k % 9 === 4) {
      const ang = Math.atan2(ny, nx) * 180 / Math.PI + (o > 0 ? 0 : 180) + (k % 2 ? 25 : -25);
      leaves += `<path transform="translate(${r1(x + nx * o)} ${r1(y + ny * o)}) rotate(${r1(ang)})" d="M0 0C2.5-3 6-3.5 9 0C6 3.5 2.5 3 0 0Z" fill="${k % 18 === 4 ? '#8db36f' : '#5b8c4e'}"/>`;
    }
  }
  return `<path d="${d}" fill="none" stroke="#3d6b37" stroke-width="1.5" stroke-linecap="round"/>` + leaves;
}
const SK_SHOE = (fill, stripe) => MIR(`<path d="M8 380C8 377 10 376 13 376H21.5C23.5 376 24.5 378 25 381L27 393C27.5 397.5 25.5 400 21.5 400H10C7.5 400 6.5 398 6.5 395Z" fill="${fill}"/><path d="M6.6 395.6H27.2" stroke="${stripe}" stroke-width="2.6"/>`);

const MM_SKIN = {
  ios: { title: '训练部位', leg: ['主要部位', '次要部位'], rest: '休息日，好好恢复' },

  // 竞技：运动员（发带、护腕、短裤腰带、跑鞋、奖牌、速度线）
  sport: {
    title: '今日赛程', leg: ['主力', '替补'], rest: '休赛日 · 恢复',
    back: () => `<g stroke="var(--accent)" stroke-width="4" stroke-linecap="round" opacity=".32"><path d="M-30 8H-70M-34 22H-58M-30 36H-78"/></g>`,
    over: s => `<path d="M-16.6 12.2C-6 9.4 6 9.4 16.6 12.2L17.7 19C6 16.4 -6 16.4 -17.7 19Z" fill="var(--accent)"/>`
      + (s === 'b' ? `<path d="M-1 16L-12 33L-7 35L2 18ZM1 16L5 36L10 34L3 16Z" fill="var(--accent)"/>` : '')
      + MIR(`<path d="M68 210L83 206L85.5 216.5L70.5 220.5Z" fill="var(--accent)"/><path d="M0 193H36.2L38 201.5H0Z" fill="var(--accent)"/><path d="M40.4 207L37.6 256" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>`)
      + SK_SHOE('#edf1f8', 'var(--accent)')
      + (s === 'f' ? `<path d="M-9 50L0 71L9 50" fill="none" stroke="#36d39f" stroke-width="3"/><circle cx="0" cy="77" r="7" fill="#ffc23d" stroke="#b8860b" stroke-width="1.2"/><text x="0" y="80.5" font-size="9" font-weight="800" text-anchor="middle" fill="#7a5200">1</text>` : '')
  },

  // 手帐：贴纸小人（白边贴纸、铅笔描边、涂鸦头发和脸、纸胶带、小星星）
  planner: {
    title: '今天练哪儿', leg: ['重点', '顺便'], rest: '休息日 · 盖个章',
    back: s => `<path d="${MM_OUTLINE}" fill="#fff" stroke="#fff" stroke-width="12" stroke-linejoin="round" filter="url(#mmf-shadow)"/>`
      + (s === 'f' ? `<path d="M-48 26l3 6.2 6.8 1-5 4.7 1.2 6.7-6-3.2-6 3.2 1.2-6.7-5-4.7 6.8-1z" fill="none" stroke="#2f5fd0" stroke-width="1.5" stroke-linejoin="round"/>`
        : `<path d="M58 186c-3-4.5-10-1.5-6.5 4.2L58 196l6.5-5.8c3.5-5.7-3.5-8.7-6.5-4.2z" fill="none" stroke="#e5638a" stroke-width="1.5" stroke-linejoin="round"/>`),
    over: s => `<path d="${MM_OUTLINE}" fill="none" stroke="#22304a" stroke-width="1.6" stroke-linejoin="round" opacity=".85" filter="url(#mmf-wob)"/>`
      + (s === 'f'
        ? `<path d="M-17.4 17C-19 5 -10 -3 0 -2C9 -4 19 3 17.6 16C15 11 12 9.4 8.4 9.6C9 7.2 7 5.4 5 6.4C3 8.4 -1 9.2 -4 8C-6.4 10.2 -10 10 -12.4 11.2C-14.6 12.4 -16.4 14.4 -17.4 17Z" fill="#22304a"/><path d="M3 -2.4C3.4 -8 7 -11 10.6 -10" fill="none" stroke="#22304a" stroke-width="1.6" stroke-linecap="round"/>`
          + `<circle cx="-6" cy="23" r="1.8" fill="#22304a"/><circle cx="6" cy="23" r="1.8" fill="#22304a"/><path d="M-4.4 30.6Q0 34.6 4.4 30.6" fill="none" stroke="#22304a" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="-11" cy="28.4" rx="3" ry="1.8" fill="#e5638a" opacity=".5"/><ellipse cx="11" cy="28.4" rx="3" ry="1.8" fill="#e5638a" opacity=".5"/>`
          + `<rect x="-46" y="-6" width="40" height="12" transform="rotate(-32 -26 0)" fill="#ffe45c" opacity=".8"/><rect x="2" y="377" width="40" height="12" transform="rotate(-16 22 383)" fill="#9fd3f5" opacity=".8"/>`
        : `<path d="M-17.6 20C-19 6 -10 -2.4 0 -2.4C10 -2.4 19 6 17.6 20C17 28 14 34 9 37.4C3 34.6 -3 34.6 -9 37.4C-14 34 -17 28 -17.6 20Z" fill="#22304a"/><path d="M3 -2.4C3.4 -8 7 -11 10.6 -10" fill="none" stroke="#22304a" stroke-width="1.6" stroke-linecap="round"/>`
          + `<rect x="6" y="-6" width="40" height="12" transform="rotate(30 26 0)" fill="#ffb4c8" opacity=".8"/><rect x="-42" y="377" width="40" height="12" transform="rotate(14 -22 383)" fill="#ffe45c" opacity=".8"/>`)
  },

  // 终端：显示器脑袋的老电脑人（琥珀色、扫描线、闪烁光标）
  terminal: {
    title: 'train --today', leg: ['主进程', '子进程'], rest: 'sleep 24h · 休息',
    over: s => `<path d="${MM_OUTLINE}" fill="url(#mmp-scan)"/>`
      + `<path d="M-10 36H10L12 52H-12Z" fill="#1d160c" stroke="#ffb000" stroke-width="1.4"/><rect x="-26" y="-4" width="52" height="42" rx="6" fill="#1d160c" stroke="#ffb000" stroke-width="2"/>`
      + (s === 'f'
        ? `<rect x="-20" y="1.5" width="40" height="29" rx="3" fill="#0b0805" stroke="#ffb000" stroke-opacity=".5"/><text x="-15.5" y="21.5" fill="#ffb000" font-size="14" font-weight="800" font-family="JetBrains Mono, monospace">&gt;</text><rect class="sk-blink" x="-3" y="10" width="7.5" height="12.5" fill="#ffb000"/><circle cx="19.5" cy="34.4" r="1.4" fill="#a6e36a"/>`
        : `<path d="M-15 8H15M-15 13.5H15M-15 19H15M-15 24.5H15" stroke="#ffb000" stroke-opacity=".55" stroke-width="1.8"/><path d="M14 38C22 48 30 50 36 60" fill="none" stroke="#ffb000" stroke-opacity=".7" stroke-width="1.6"/>`)
      + `<text x="0" y="414" text-anchor="middle" font-size="12" fill="#ffb000" opacity=".75" font-family="JetBrains Mono, monospace">[${s === 'f' ? 'front' : 'back'}]</text>`
  },

  // 糖果：软糖小人（粗描边 + 投影、大眼睛腮红、蝴蝶结、棒棒糖）
  candy: {
    title: '今日甜度', leg: ['全糖', '半糖'], rest: '今天无糖 · 休息',
    back: () => `<path d="${MM_OUTLINE}" transform="translate(3.5 3.5)" fill="#1f1b3a"/>`,
    over: s => `<g transform="translate(${SIDE(s, 10)} 1.5) rotate(${SIDE(s, 20)})"><path d="M0 0L-10.5 -7.5C-12.6 -2.5 -12.6 2.5 -10.5 7.5ZM0 0L10.5 -7.5C12.6 -2.5 12.6 2.5 10.5 7.5Z" fill="#ff5c8a" stroke="#1f1b3a" stroke-width="1.8" stroke-linejoin="round"/><circle r="3.3" fill="#ff8fb0" stroke="#1f1b3a" stroke-width="1.8"/></g>`
      + (s === 'f'
        ? MIR(`<ellipse cx="6.5" cy="22" rx="2.6" ry="3.5" fill="#1f1b3a"/><circle cx="7.4" cy="20.6" r=".95" fill="#fff"/><ellipse cx="11.4" cy="29" rx="3.4" ry="2.1" fill="#ff5c8a" opacity=".55"/>`)
          + `<path d="M-3.2 30Q0 33.4 3.2 30" fill="none" stroke="#1f1b3a" stroke-width="1.7" stroke-linecap="round"/>`
          + `<path d="M80 244L92 214" stroke="#1f1b3a" stroke-width="5" stroke-linecap="round"/><path d="M80 244L92 214" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/><circle cx="94" cy="206" r="10.5" fill="#ff8a3d" stroke="#1f1b3a" stroke-width="2"/><path d="M94 206m-6.2 0a6.2 6.2 0 1 1 6.2 6.2a4.2 4.2 0 1 1 -4.2 -4.2a2 2 0 1 1 2 2" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/>`
        : '')
  },

  // 墨：武者（发髻、红头巾、黑腰带、绑手，圆相和朱印）
  sumi: {
    title: '今日之修', leg: ['主修', '辅修'], rest: '静养', pad: 4,
    back: s => `<path d="${skArc(0, 168, 98, -62, 252)}" fill="none" stroke="#1e1c19" stroke-width="10" stroke-linecap="round" opacity=".1" filter="url(#mmf-ink)"/>`
      + (s === 'f' ? `<g transform="translate(-102 354) rotate(-5)"><rect x="-13" y="-13" width="26" height="26" rx="2" fill="#b7282e"/><rect x="-10.5" y="-10.5" width="21" height="21" fill="none" stroke="#f4efe5" stroke-width=".9"/><text y="6.2" text-anchor="middle" font-size="16.5" font-weight="700" fill="#f4efe5" font-family="Noto Serif SC, serif">修</text></g>` : ''),
    over: s => (s === 'f'
      ? `<path d="M-17.5 16C-18 5 -10 -1 0 -1C10 -1 18 5 17.5 16C14 11 8 9 0 9C-8 9 -14 11 -17.5 16Z" fill="#1e1c19"/><path d="M-9 25Q-6 27.4 -3 25M3 25Q6 27.4 9 25" fill="none" stroke="#1e1c19" stroke-width="1.4" stroke-linecap="round"/>`
      : `<path d="M-17.6 20C-19 6 -10 -1.4 0 -1.4C10 -1.4 19 6 17.6 20C17 28 14 34 9 37.4C3 34.6 -3 34.6 -9 37.4C-14 34 -17 28 -17.6 20Z" fill="#1e1c19"/>`)
      + `<path d="M-4.5 -1C-6.5 -8 -3.2 -13.5 0 -13.5C3.2 -13.5 6.5 -8 4.5 -1Z" fill="#1e1c19"/><path d="M-4.6 -3.4H4.6" stroke="#b7282e" stroke-width="1.8"/>`
      + `<path d="M-17.2 10C-6 7.4 6 7.4 17.2 10L17.6 15.4C6 12.8 -6 12.8 -17.6 15.4Z" fill="#b7282e"/>`
      + (s === 'b' ? `<path d="M2 12C10 17 18 20 31 19C27 24 18 26 9 22.5L1 15.5ZM2 13C7 22 12 30 23 37C16 38 9 33 3.5 21Z" fill="#b7282e"/><circle cx="2" cy="13" r="2.8" fill="#b7282e"/>` : '')
      + MIR(`<path d="M0 190.5H35.4L37.8 202.5H0Z" fill="#1e1c19"/><path d="M68 207L83 203L86 217.5L70.8 221.5Z" fill="#f4efe5" stroke="#1e1c19" stroke-width="1"/><path d="M69 212L84.4 208.4M69.8 216.6L85.2 212.8" stroke="#1e1c19" stroke-width=".7"/>`)
      + (s === 'f' ? `<path d="M-3.4 202L-8 222L-3.6 223.4L0 205ZM3.4 202L8.6 220.6L4.4 222.4L0 205Z" fill="#1e1c19"/><rect x="-4.4" y="190" width="8.8" height="13" rx="1.5" fill="#1e1c19" stroke="#f4efe5" stroke-width=".8"/>` : '')
  },

  // 霓虹：赛博义体人（头盔 + 发光面罩、关节发光环、天线、HUD 框）
  neon: {
    title: '今日模块', leg: ['主驱动', '辅驱动'], rest: '待机充电中', pad: 8,
    back: () => `<g fill="none" stroke="#00e5ff" stroke-opacity=".6" stroke-width="1.6"><path d="M-82 8V-6H-66M82 8V-6H66M-82 392V406H-66M82 392V406H66"/><ellipse cx="0" cy="401" rx="38" ry="5.5"/><ellipse cx="0" cy="401" rx="24" ry="3.4" stroke-dasharray="3 3"/></g>`
      + `<text x="-80" y="24" font-size="10" fill="#00e5ff" opacity=".75" font-family="Share Tech Mono, monospace">ID-07</text>`,
    over: s => `<path d="M-19.5 30C-20.5 10 -11 -2.4 0 -2.4C11 -2.4 20.5 10 19.5 30L15 45H-15Z" fill="#232a36" stroke="#4a5568" stroke-width="1.4"/>`
      + MIR(`<rect x="17" y="16" width="5.5" height="13" rx="1.6" fill="#f3e600"/>`)
      + `<path d="M${SIDE(s, 20)} 17L${SIDE(s, 29)} -8" stroke="#4a5568" stroke-width="2"/><circle class="sk-blink" cx="${SIDE(s, 29.4)}" cy="-9.6" r="2.6" fill="#ff5c86"/>`
      + (s === 'f'
        ? `<path d="M-16.5 14.5H16.5L14.5 25H-14.5Z" fill="#00e5ff" filter="url(#mmf-glow)"/><path d="M-6.5 33.5H6.5M-5 37.5H5" stroke="#4a5568" stroke-width="1.6"/>`
        : `<path d="M-10 13H10M-10 18H10M-10 23H10" stroke="#00e5ff" stroke-opacity=".6" stroke-width="1.6"/><circle cx="0" cy="33" r="3" fill="none" stroke="#f3e600" stroke-width="1.4"/>`)
      + MIR(`<g fill="#0f1218" stroke="#00e5ff" stroke-width="1.6"><circle cx="65" cy="162" r="4.4"/><circle cx="78.6" cy="230" r="3.2"/><circle cx="20" cy="306" r="5"/></g><path d="M56 70L63 66" stroke="#00e5ff" stroke-opacity=".7" stroke-width="1.4"/>`)
  },

  // 蒸汽：机械师（高礼帽 + 护目镜、八字胡 + 单片镜、黄铜护腕、皮靴，背后齿轮和烟囱）
  steam: {
    title: '今日锻造', leg: ['主动力', '副动力'], rest: '停炉保养', pad: 18,
    back: () => `<path d="${skGear(0, 40, 34, 12, 6.5)}" fill="#3a2a1a" stroke="#b8862f" stroke-width="1.6"/><circle cx="0" cy="40" r="27" fill="none" stroke="#b8862f" stroke-width="1.2" opacity=".6"/>`
      + MIR(`<path d="M38 64V30" stroke="#8a6a3a" stroke-width="6"/><rect x="33.5" y="24" width="9" height="6" rx="1" fill="#b8862f"/><g fill="#f0e3c6" opacity=".22"><circle cx="38" cy="15" r="6"/><circle cx="44" cy="8" r="5"/><circle cx="35" cy="3" r="4"/></g>`),
    over: s => `<ellipse cx="0" cy="5" rx="25" ry="5" fill="#2a1d12" stroke="#e2bd6c" stroke-width="1.2"/><path d="M-15 5V-25C-15 -28.5 -12 -30 0 -30C12 -30 15 -28.5 15 -25V5Z" fill="#2a1d12" stroke="#e2bd6c" stroke-width="1.2"/><rect x="-15" y="-7" width="30" height="6" fill="#b8862f"/><path d="M-25 5A25 5 0 0 0 25 5L23 6.5A24 4.4 0 0 1 -23 6.5Z" fill="#2a1d12"/>`
      + (s === 'f'
        ? MIR(`<circle cx="7" cy="-4" r="5.6" fill="#3a2a1a" stroke="#e2bd6c" stroke-width="2"/><circle cx="7" cy="-4" r="3.1" fill="#8fb2cc" opacity=".85"/><path d="M0 31.5C3 29 8 28 11 30C14 32 16 31 17 28C17 33.4 12 35.4 8 34.4C5 33.6 2 33.2 0 33.8Z" fill="#6b4a2b"/>`)
          + `<circle cx="6" cy="21" r="4.2" fill="none" stroke="#e2bd6c" stroke-width="1.4"/><path d="M10 22C14 30 12 40 17 50" fill="none" stroke="#e2bd6c" stroke-width=".8"/>`
        : '')
      + MIR(`<path d="M68 207.5L83 203.5L85.8 216L70.6 220Z" fill="#b8862f" stroke="#e2bd6c" stroke-width=".8"/><circle cx="76.5" cy="212" r="1.2" fill="#f0e3c6"/><path d="M9 368H24.8L27.2 393C27.6 397.5 25.6 400 21.2 400H9.6C7.6 400 6.6 398 6.6 395L8.4 372Z" fill="#3a2716" stroke="#e2bd6c" stroke-width=".8"/><rect x="12.5" y="378" width="8" height="5.5" fill="none" stroke="#e2bd6c" stroke-width="1"/>`)
  },

  // 魔法：法师（尖帽、阴影里发光的眼睛、白胡子、斗篷、法杖、脚下魔法阵、星光）
  magic: {
    title: '今日修炼', leg: ['主修', '辅修'], rest: '冥想回魔', pad: 34,
    back: s => `<g fill="none" stroke="#dcb65a"><ellipse cx="0" cy="396" rx="60" ry="11.5" stroke-opacity=".75" stroke-width="1.4"/><ellipse cx="0" cy="396" rx="47" ry="8.4" stroke-opacity=".5" stroke-dasharray="3 3"/></g>`
      + `<path d="M-40 58C-52 120 -66 250 -86 386C-50 397 50 397 86 386C66 250 52 120 40 58C26 54 -26 54 -40 58Z" fill="#2f2758" stroke="#dcb65a" stroke-width="1.2"/><path d="M-86 386C-50 397 50 397 86 386" fill="none" stroke="#dcb65a" stroke-width="2.4"/>`
      + MIR(`<path d="M26 60C34 46 32 30 24 22L14 46Z" fill="#3a2d6b" stroke="#dcb65a" stroke-width="1"/>`)
      + `<g fill="#efe7d3" class="sk-tw">${SPARK(-70, 40, 6)}${SPARK(64, 26, 4)}${SPARK(-64, 172, 4)}${SPARK(72, 300, 5)}${SPARK(-60, 320, 3.5)}</g>`,
    over: s => (s === 'b' ? `<path d="M-16 10C-17 24 -16 38 -13 49C-10 46.5 -8 49.5 -5 47.5C-2 50.5 2 50.5 5 47.5C8 49.5 10 46.5 13 49C16 38 17 24 16 10Z" fill="#efe7d3"/><path d="M-8 22V44M0 24V47M8 22V44" stroke="#bdb197" stroke-width=".9"/>` : '')
      + `<ellipse cx="0" cy="7" rx="30" ry="6" fill="#2f2758" stroke="#dcb65a" stroke-width="1.2"/><path d="M-16 6C-12 -8 -6 -26 2 -38C6 -44 12 -48 22 -46C15 -42 12 -36 11 -28C11 -16 14 -4 17 6Z" fill="#3a2d6b" stroke="#dcb65a" stroke-width="1.2"/><path d="M-16.5 1C-6 3.5 6 3.5 16.5 1L17 6C6 8.5 -6 8.5 -17 6Z" fill="#dcb65a"/><g fill="#dcb65a">${SPARK(3, -16, 4.5)}</g>`
      + (s === 'f'
        ? `<path d="M-15.5 10C-15 24 -9 34 0 36C9 34 15 24 15.5 10Z" fill="#14112a"/><g fill="#9fd0ff" filter="url(#mmf-glow)"><circle cx="-5.5" cy="20.5" r="1.8"/><circle cx="5.5" cy="20.5" r="1.8"/></g><path d="M-13 28C-12 40 -7 54 0 72C7 54 12 40 13 28C9 33 5 35 0 35C-5 35 -9 33 -13 28Z" fill="#efe7d3"/>`
        : '')
      + `<path d="M${SIDE(s, 88)} -20V397" stroke="#8a6a3a" stroke-width="3.4" stroke-linecap="round"/><path d="M${SIDE(s, 82)} -17C${SIDE(s, 80)} -26 ${SIDE(s, 83)} -33 ${SIDE(s, 88)} -35M${SIDE(s, 94)} -17C${SIDE(s, 96)} -26 ${SIDE(s, 93)} -33 ${SIDE(s, 88)} -35" fill="none" stroke="#dcb65a" stroke-width="1.6"/><circle cx="${SIDE(s, 88)}" cy="-25" r="6.5" fill="#9fd0ff" filter="url(#mmf-glow)"/>`
  },

  // 自然：森灵（叶冠、手臂和腿上绕着藤蔓、脚下草丛和小花、飘落的叶子）
  nature: {
    title: '今日生长', leg: ['主干', '枝叶'], rest: '休眠 · 积蓄养分', pad: 6,
    back: () => `<g fill="none" stroke="#5b8c4e" stroke-width="1.6" stroke-linecap="round"><path d="M-40 401C-39 394 -37 390 -34 386M-34 401C-34 395 -31 392 -27 389M24 401C25 394 28 391 31 388M32 401C32 395 35 392 39 390M-6 402C-6 396 -4 393 -1 391"/></g>`
      + `<g fill="#dfa22c"><circle cx="-31" cy="384" r="2.2"/><circle cx="35" cy="386" r="2"/></g><g fill="#c66a3d"><circle cx="-31" cy="384" r=".9"/></g>`
      + `<path transform="translate(-70 70) rotate(30)" d="M0 0C3-4 8-4.5 12 0C8 4.5 3 4 0 0Z" fill="#8db36f" opacity=".8"/><path transform="translate(68 120) rotate(-140)" d="M0 0C3-4 8-4.5 12 0C8 4.5 3 4 0 0Z" fill="#5b8c4e" opacity=".7"/><path transform="translate(-66 280) rotate(70)" d="M0 0C3-4 8-4.5 12 0C8 4.5 3 4 0 0Z" fill="#c66a3d" opacity=".6"/>`,
    over: s => `<path d="M-8 3C-10 -5 -14 -11 -20 -15M-14 -9L-20 -7M8 3C10 -5 14 -11 20 -15M14 -9L20 -7" fill="none" stroke="#7a5f3c" stroke-width="2" stroke-linecap="round"/>`
      + [200, 222, 244, 266, 288, 310, 332].map((a, i) => {
        const x = r1(Math.cos(a * Math.PI / 180) * 17.5), y = r1(20 + Math.sin(a * Math.PI / 180) * 17.5);
        return `<path transform="translate(${x} ${y}) rotate(${a + (i % 2 ? 14 : -14)})" d="M0 0C2.8-4.2 7.4-4.6 11 0C7.4 4.6 2.8 4.2 0 0Z" fill="${i % 2 ? '#8db36f' : '#4d7a46'}"/>`;
      }).join('')
      + `<g transform="translate(${SIDE(s, -13)} 5)">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-3" rx="2" ry="3" transform="rotate(${a})" fill="#f2a6a0"/>`).join('')}<circle r="1.8" fill="#dfa22c"/></g>`
      + skVine(s === 'f' ? [[54, 70], [64, 158], [80, 228]] : [[-54, 70], [-64, 158], [-80, 228]], 6.5, 3, 0.4)
      + skVine(s === 'f' ? [[-32, 212], [-24, 300], [-18, 372]] : [[32, 212], [24, 300], [18, 372]], 7, 3, 2)
  },

  // 狩猎：猎人（兜帽 + 毛边、毛领、背后大剑、腰带和皮包、毛边靴、爪痕）
  hunt: {
    title: '今日任务', leg: ['主目标', '副目标'], rest: '营地休整', pad: 20,
    back: s => `<g stroke="#8f2817" stroke-opacity=".26" stroke-width="5" stroke-linecap="round"><path d="M${SIDE(s, -46)} 30L${SIDE(s, -72)} -6M${SIDE(s, -56)} 42L${SIDE(s, -84)} 4M${SIDE(s, -66)} 54L${SIDE(s, -92)} 16"/></g>`
      + `<path d="${skBlade(SIDE(s, 44), 18, SIDE(s, -54), 264, 6.5)}" fill="#7a756c" stroke="#3b2b1e" stroke-width="1.2"/><path d="M${SIDE(s, 44)} 18L${SIDE(s, -50)} 254" stroke="#b8b0a0" stroke-width="1.2"/>`
      + `<path d="M${SIDE(s, 30)} 10L${SIDE(s, 58)} 22" stroke="#3b2b1e" stroke-width="5" stroke-linecap="round"/><path d="M${SIDE(s, 44)} 16L${SIDE(s, 52)} -6" stroke="#5a3a22" stroke-width="5" stroke-linecap="round"/><circle cx="${SIDE(s, 53)}" cy="-9" r="3.6" fill="#c9a24a"/>`,
    over: s => (s === 'f'
      ? `<path d="M-21 34C-23 12 -14 -6 0 -7C14 -6 23 12 21 34L17 48C10 42 -10 42 -17 48Z" fill="#6b4a2b" stroke="#3b2b1e" stroke-width="1.2"/><path d="M-12.5 19C-12.5 10 -7 5 0 5C7 5 12.5 10 12.5 19C12.5 29 7 36 0 37C-7 36 -12.5 29 -12.5 19Z" fill="#e3cfa3" stroke="#eadcbc" stroke-width="3.6" stroke-dasharray="2 1.4"/><path d="M-8 20.5H-3M3 20.5H8" stroke="#2e1d0e" stroke-width="1.8" stroke-linecap="round"/>`
      : `<path d="M-21 34C-23 12 -14 -6 0 -7C14 -6 23 12 21 34L14 50L0 56L-14 50Z" fill="#6b4a2b" stroke="#3b2b1e" stroke-width="1.2"/><path d="M0 -6V54" stroke="#3b2b1e" stroke-width="1"/>`)
      + `<path d="M-34 58C-24 50 24 50 34 58C30 64 26 61 22 66C18 61 13 64 9 61C5 65 -5 65 -9 61C-13 64 -18 61 -22 66C-26 61 -30 64 -34 58Z" fill="#eadcbc" stroke="#a08a62" stroke-width=".8"/>`
      + MIR(`<path d="M0 192H36.2L38 201H0Z" fill="#5a3a22"/><path d="M70 217L84.6 213L85.8 219.4L71.2 223.2Z" fill="#5a3a22"/><path d="M9 370H25L27 393C27.5 397.5 25.5 400 21 400H9.5C7.5 400 6.5 398 6.5 395Z" fill="#5a3a22"/><path d="M8 368C12 364 22 364 26 368C26 373 22 375 17 374C12 375 8 373 8 368Z" fill="#eadcbc"/>`)
      + (s === 'f' ? `<rect x="-4.6" y="191" width="9.2" height="11" rx="1" fill="none" stroke="#c9a24a" stroke-width="1.6"/><rect x="37" y="198" width="10" height="13" rx="2" fill="#6b4a2b" stroke="#3b2b1e"/>` : '')
  },

  // 学园：学生（短发呆毛、星星发夹、衬衫领 + 领带、袖章、白袜运动鞋、斜切天空）
  academy: {
    title: '今日课程', leg: ['必修', '选修'], rest: '放学啦 · 休息', pad: 10,
    back: () => `<path d="M-50 18H96L58 384H-90Z" fill="#d6ecff" opacity=".75"/><g fill="#fff">${SPARK(-62, 60, 6)}${SPARK(70, 40, 4)}${SPARK(54, 330, 5)}</g><path d="M-80 300H-40M-70 312H-50" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`,
    over: s => (s === 'f'
      ? `<path d="M-18.5 21C-19.5 6 -11 -2 0 -2C11 -2 19.5 6 18.5 21C17 15 14 11.5 10 10.5L8 15L5 10C2 12 -3 13 -6 11L-8 15L-10 10.5C-14 12 -17 16 -18.5 21Z" fill="#2b3a57"/>`
        + `<ellipse cx="-6" cy="24.5" rx="1.9" ry="2.7" fill="#22324b"/><ellipse cx="6" cy="24.5" rx="1.9" ry="2.7" fill="#22324b"/><path d="M-3 32Q0 34.4 3 32" fill="none" stroke="#22324b" stroke-width="1.4" stroke-linecap="round"/>`
        + MIR(`<path d="M12 49L1 56L6 63Z" fill="#fff" stroke="#22324b" stroke-width="1"/>`)
        + `<path d="M-3.5 55H3.5L4.6 60L2 62L4 84L0 89L-4 84L-2 62L-4.6 60Z" fill="#1a96f0"/>`
      : `<path d="M-18.5 21C-19.5 6 -11 -2 0 -2C11 -2 19.5 6 18.5 21C18 29 15 36 11 40H-11C-15 36 -18 29 -18.5 21Z" fill="#2b3a57"/>`)
      + `<path d="M1 -2C2 -9 7 -12 11 -10C7 -10 5 -7 3 -2Z" fill="#2b3a57"/><g fill="#ffb400" transform="translate(${SIDE(s, 12)} 7)"><path d="M0 -4L1.2 -1.2L4 -1L1.8 .8L2.5 3.6L0 2L-2.5 3.6L-1.8 .8L-4 -1L-1.2 -1.2Z"/></g>`
      + `<g transform="scale(${s === 'f' ? 1 : -1} 1)"><path d="M46.5 102.5L65 100.6L66.6 110L49.4 113Z" fill="#1a96f0"/><path d="M56.5 103.4l.7 1.6 1.7.2-1.3 1.1.4 1.7-1.5-.9-1.5.9.4-1.7-1.3-1.1 1.7-.2z" fill="#fff"/></g>`
      + MIR(`<path d="M10 364H26.2L24 376H9.6Z" fill="#fff" stroke="#c9d9ea" stroke-width=".8"/>`) + SK_SHOE('#1a96f0', '#fff')
  },

  // 工业：外骨骼作业员（护目头盔、外骨骼支架 + 黄色关节、警示条腰带、背包天线）
  industry: {
    title: '作业指令', leg: ['一级', '二级'], rest: '检修停机', pad: 14,
    back: s => `<rect x="-27" y="42" width="54" height="44" rx="3" fill="#3c3c3a"/><path d="M${SIDE(s, -22)} 46L${SIDE(s, -30)} -6" stroke="#161616" stroke-width="2.2"/><circle cx="${SIDE(s, -30.4)}" cy="-8" r="2.8" fill="#ffd400" stroke="#161616"/>`,
    over: s => `<path d="M-19.5 28C-20.5 8 -11 -3 0 -3C11 -3 20.5 8 19.5 28L18 36H-18Z" fill="#161616"/>`
      + (s === 'f'
        ? `<path d="M-15 13H15V23.5C15 26 13 27.5 10.5 27.5H-10.5C-13 27.5 -15 26 -15 23.5Z" fill="#ffd400"/><path d="M-2 -3H2V9H-2Z" fill="#ffd400"/><path d="M-12 36H12L9 47H-9Z" fill="#3c3c3a"/><path d="M-6 40H6M-5 43.5H5" stroke="#161616" stroke-width="1"/>`
        : `<path d="M-19 15H19V21H-19Z" fill="url(#mmp-haz)"/><path d="M-8 26V33M-6 26V33M-3 26V33M-2 26V33M1 26V33M4 26V33M5 26V33M8 26V33" stroke="#f7f7f5" stroke-width="1"/><path d="M-12 36H12L9 47H-9Z" fill="#3c3c3a"/>`)
      + `<path d="M-38.2 192H38.2L39.2 201.5H-39.2Z" fill="url(#mmp-haz)" stroke="#161616" stroke-width=".8"/>`
      + MIR(`<path d="M67 76L78 156L90 222M48 215L37 302L31 376" fill="none" stroke="#161616" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/><g fill="#ffd400" stroke="#161616" stroke-width="1.6"><circle cx="67" cy="76" r="4.6"/><circle cx="78" cy="156" r="4.6"/><circle cx="90" cy="222" r="3.6"/><circle cx="48" cy="215" r="4.6"/><circle cx="37" cy="302" r="4.6"/></g><path d="M6 376H27.5L29.4 395C29.4 398 27.8 400.4 25 400.4H6.6C5.2 400.4 4.6 399.4 4.8 398Z" fill="#161616"/><path d="M5 395.5H29" stroke="#ffd400" stroke-width="2.2"/>`)
  },

  // 远征：暗色骑士（桶盔 + 红羽、眼缝里的余烬光、破斗篷、铁手套和铁靴、长剑、飘起的火星）
  expedition: {
    title: '今日征程', leg: ['主战', '支援'], rest: '篝火休憩', pad: 16,
    back: () => `<path d="M-44 60C-58 140 -70 260 -78 372L-64 362L-53 377L-39 364L-25 379L-9 366L7 379L23 366L37 379L52 364L64 377L78 370C70 260 58 140 44 60C28 54 -28 54 -44 60Z" fill="#4a1714" stroke="#2a0d0b" stroke-width="1"/>`
      + `<g fill="#ff8f45" class="sk-ember"><circle cx="-62" cy="300" r="1.8"/><circle cx="58" cy="250" r="1.4"/><circle cx="-70" cy="180" r="1.2"/><circle cx="66" cy="120" r="1.6"/><circle cx="-50" cy="60" r="1.2"/></g>`,
    over: s => `<path d="M0 -4C2 -18 14 -30 30 -26C24 -24 20 -22 17 -17C24 -18 28 -14 30 -10C22 -12 14 -10 6 -2Z" fill="#b02a2a" transform="scale(${s === 'f' ? 1 : -1} 1)"/>`
      + `<path d="M-18.5 36C-20 14 -14 -3 0 -4C14 -3 20 14 18.5 36L14 46H-14Z" fill="#5a554d" stroke="#2a2723" stroke-width="1.2"/><path d="M0 -4V46" stroke="#2a2723" stroke-width=".9"/>`
      + (s === 'f'
        ? `<path d="M-14 17.5H14L13 21.5H-13Z" fill="#0d0c0a"/><g fill="#de6253" filter="url(#mmf-glow)"><circle cx="-6" cy="19.6" r="1.2"/><circle cx="6" cy="19.6" r="1.2"/></g><g fill="#0d0c0a"><circle cx="-6" cy="31" r="1"/><circle cx="-6" cy="36" r="1"/><circle cx="6" cy="31" r="1"/><circle cx="6" cy="36" r="1"/></g>`
          + `<path d="M76.6 248H83.4L83 366L80 377L77 366Z" fill="#9a958c" stroke="#4a4640" stroke-width=".8"/><path d="M80 252V360" stroke="#6e6a62" stroke-width=".8"/><path d="M80 228V244" stroke="#3b2b1e" stroke-width="4"/><path d="M67 246.5H93" stroke="#8a8070" stroke-width="3.6" stroke-linecap="round"/><circle cx="80" cy="226" r="3" fill="#8a8070"/>`
        : `<path d="M-12 24H12" stroke="#2a2723" stroke-width="1"/>`
          + `<path d="M-76.6 248H-83.4L-83 366L-80 377L-77 366Z" fill="#9a958c" stroke="#4a4640" stroke-width=".8"/><path d="M-80 228V244" stroke="#3b2b1e" stroke-width="4"/><path d="M-67 246.5H-93" stroke="#8a8070" stroke-width="3.6" stroke-linecap="round"/><circle cx="-80" cy="226" r="3" fill="#8a8070"/>`)
      + MIR(`<path d="M69.5 222L85 218L88.5 244C88.5 252 84 257 79 256C74.5 254 72 247 71 240Z" fill="#5a554d" stroke="#2a2723" stroke-width="1"/><path d="M73.6 239.6L87.4 236.4" stroke="#2a2723" stroke-width=".8"/><path d="M8 372H25L27.5 393C28 397.5 26 400 21.5 400H9.5C7.5 400 6.5 398 6.5 395Z" fill="#5a554d" stroke="#2a2723" stroke-width="1"/><path d="M8 384H26.3M7 391H27.2" stroke="#2a2723" stroke-width=".8"/>`)
  },

  // 星野：宇航员（玻璃头盔、维生背包 + 天线、手套和靴子、绕身的轨道环和小行星）
  starwild: {
    title: '今日航线', leg: ['主引擎', '副引擎'], rest: '补给停泊', pad: 6,
    back: () => `<g fill="#eef1f8"><circle cx="-66" cy="40" r="1.4"/><circle cx="70" cy="90" r="1.1"/><circle cx="-74" cy="250" r="1.2"/><circle cx="62" cy="340" r="1.5"/><circle cx="-40" cy="-6" r="1"/></g>`
      + `<rect x="-31" y="36" width="62" height="96" rx="9" fill="#c9d3ea" stroke="#8a96b8" stroke-width="1.2"/><path d="M24 38L32 4" stroke="#8a96b8" stroke-width="2"/><circle class="sk-blink" cx="32.4" cy="2" r="2.6" fill="#ff8f45"/>`
      + `<g transform="rotate(-10 0 212)"><path d="M-86 212A86 19 0 0 1 86 212" fill="none" stroke="#ff8f45" stroke-width="1.8" opacity=".75"/></g>`,
    over: s => `<circle cx="0" cy="22" r="27" fill="#5fd3c4" fill-opacity=".14" stroke="#d9e1f2" stroke-width="2.4"/><path d="M-18 6A21 21 0 0 1 -5 -1" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".75"/>`
      + (s === 'f' ? `<circle cx="-6" cy="23" r="1.7" fill="#18203a"/><circle cx="6" cy="23" r="1.7" fill="#18203a"/>` : '')
      + `<rect x="-19" y="44" width="38" height="9" rx="4.5" fill="#d9e1f2" stroke="#8a96b8" stroke-width="1"/>`
      + MIR(`<path d="M70 226C74 221 84 219 87 224L89 246C89 254 84 258 79 257C74 255 71 248 70.5 240Z" fill="#e6ebf5" stroke="#8a96b8" stroke-width="1"/><path d="M69.5 221.6L85.5 218L86.6 224L70.6 227.6Z" fill="#ff8f45"/><path d="M7 366H26.5L28.5 394C28.5 398 26.5 400.5 22.5 400.5H8.5C6 400.5 5 398.5 5.5 395Z" fill="#e6ebf5" stroke="#8a96b8" stroke-width="1"/><path d="M7 372.5H27" stroke="#ff8f45" stroke-width="2.4"/>`)
      + `<g transform="rotate(-10 0 212)"><path d="M-86 212A86 19 0 0 0 86 212" fill="none" stroke="#ff8f45" stroke-width="1.8"/><circle cx="${SIDE(s, 60)}" cy="225.6" r="5" fill="#5fd3c4" stroke="#18203a" stroke-width="1"/></g>`
  },

  // 苍穹：有翼的天空骑士（羽翼、金冠 + 蓝宝石、身后光芒、金腰带、浮空宝珠）
  skyward: {
    title: '今日试炼', leg: ['主属性', '副属性'], rest: '休憩 · 回复', pad: 6,
    back: () => `<g stroke="#d29a2e" stroke-opacity=".4" stroke-width="1.5" stroke-linecap="round">${[-150, -126, -102, -78, -54, -30].map(a => {
        const c = Math.cos(a * Math.PI / 180), n = Math.sin(a * Math.PI / 180);
        return `<path d="M${r1(c * 27)} ${r1(22 + n * 27)}L${r1(c * 40)} ${r1(22 + n * 40)}"/>`;
      }).join('')}</g>`
      + MIR(`<path d="M22 84C40 58 64 36 94 18C92 30 88 38 82 44C88 46 90 52 86 58C80 58 76 60 72 64C78 68 78 74 72 78C66 78 62 80 58 84C62 90 60 96 54 98C48 96 44 98 40 102C42 110 38 116 32 118Z" fill="#fffaf0" stroke="#d29a2e" stroke-width="1.4" stroke-linejoin="round"/><path d="M40 70L80 42M44 84L72 64M44 98L58 84" stroke="#d8bf86" stroke-width="1"/>`)
      + [[-84, 150], [86, 282], [-70, 340]].map(([x, y]) => `<path transform="translate(${x} ${y})" d="M0 -6L5.2 -3V3L0 6L-5.2 3V-3Z" fill="#2f62c9" stroke="#d29a2e" stroke-width="1.2"/>`).join(''),
    over: s => `<path d="M-17 9.5C-6 6.6 6 6.6 17 9.5L17.3 13.6C6 11 -6 11 -17.3 13.6Z" fill="#d29a2e"/>`
      + (s === 'f'
        ? `<path d="M0 5.4L3.6 10.6L0 15.8L-3.6 10.6Z" fill="#2f62c9" stroke="#fffaf0" stroke-width=".7"/><ellipse cx="-6" cy="24" rx="1.7" ry="2.4" fill="#1f3358"/><ellipse cx="6" cy="24" rx="1.7" ry="2.4" fill="#1f3358"/>`
        : '')
      + MIR(`<path d="M0 193H36.4L38 200.4H0Z" fill="#d29a2e"/><path d="M9 368H25L27 393C27.5 397.5 25.5 400 21 400H9.5C7.5 400 6.5 398 6.5 395Z" fill="#fffaf0" stroke="#d29a2e" stroke-width="1.2"/>`)
      + (s === 'f' ? `<path d="M0 191.6L4.4 196.7L0 201.8L-4.4 196.7Z" fill="#2f62c9" stroke="#fffaf0" stroke-width=".7"/>` : '')
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
