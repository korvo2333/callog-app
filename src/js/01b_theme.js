// ════════════════════════════════════════════
// 主题：颜色 / 字体 / logo / 图标 / 环形图画法
// ════════════════════════════════════════════
const GF = 'https://fonts.googleapis.com/css2?';
const ICONS = {   // 线条图标（stroke 跟随文字颜色）
  today: '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="4.2"/>',
  week: '<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  body: '<path d="M3.5 18.5l5.5-6 4 3.5 7.5-9"/><path d="M15.5 7h5v5"/>',
  foods: '<path d="M3 11.5h18a9 9 0 0 1-18 0z"/><path d="M9 8c-1.2-1.4 1.2-2.4 0-4M14 8c-1.2-1.4 1.2-2.4 0-4"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2.2"/><circle cx="10" cy="17" r="2.2"/>',
  camera: '<path d="M4 8.5h3l1.6-2.5h6.8L17 8.5h3v10.5H4z"/><circle cx="12" cy="13.5" r="3.4"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.7"/><path d="M4 17l5-4.5 3.5 3 3-2.5 4.5 4"/>',
  // 有氧种类：椭圆机（飞轮 + 踏板杆 + 扶手）/ 跑步（奔跑的小人）/ 其他（火苗）
  cd_ell: '<circle cx="7" cy="15" r="3.4"/><circle cx="7" cy="15" r=".6"/><path d="M3.5 20.5h17M17.2 20.5l1.6-14.3M18.8 6.2l-3.4-2.6M7 15l9.6-4.2M13.2 12.5h3.6"/>',
  cd_run: '<circle cx="15.2" cy="4.6" r="1.9"/><path d="M13.7 8.2L11 13.6M13.3 8.9l-3.6 1.3-2.4-1.7M13.3 8.9l2.9 2.5 2.7-.7M11 13.6l3.6 2-1.1 4.9M11 13.6l-2.3 3.4-3.7.4"/>',
  cd_other: '<path d="M12 21c-3.9 0-6.4-2.6-6.4-6.1 0-3.6 2.6-5.5 3.5-8.9 2.6 1.5 3.5 3.8 3.1 5.6 1-.6 1.8-1.7 2.1-3 1.8 1.6 4.1 4 4.1 6.6 0 3.4-2.6 5.8-6.4 5.8z"/><path d="M12 21c-1.5 0-2.5-1-2.5-2.4 0-1.5 1.1-2.2 1.5-3.6 1.1.7 1.4 1.6 1.3 2.4.5-.3.8-.7.9-1.3.8.7 1.3 1.6 1.3 2.6 0 1.3-1 2.3-2.5 2.3z"/>'
};
// 部分主题有自己的导航图标
const MAGIC_ICONS = {
  today: '<circle cx="12" cy="10" r="6.3"/><path d="M8.6 9.2a3.6 3.6 0 0 1 2.6-2.7"/><path d="M6.5 20.5h11l-2-4.2h-7z"/>',
  week: '<path d="M7 4.5h11a2 2 0 0 1 0 4h-1.5v9a2.5 2.5 0 0 1-2.5 2.5H5.5a2 2 0 0 1 0-4H7z"/><path d="M7 16.5V4.5a2 2 0 0 0-2 2v0M10 9.5h4M10 13h4"/>',
  body: '<path d="M12 3.2l7.3 2.6v5.6c0 4.6-3.1 7.7-7.3 9.4-4.2-1.7-7.3-4.8-7.3-9.4V5.8z"/><path d="M12 7.5v9M8.5 11h7"/>',
  foods: '<path d="M9.5 3.5h5M10.5 3.5v5.2L5.6 17.2a2.2 2.2 0 0 0 1.9 3.3h9a2.2 2.2 0 0 0 1.9-3.3l-4.9-8.5V3.5"/><path d="M7.4 14h9.2"/>',
  settings: '<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5A2.5 2.5 0 0 1 5 20.5z"/><path d="M12 6.8l1 2.1 2.3.3-1.7 1.6.4 2.3-2-1.1-2 1.1.4-2.3-1.7-1.6 2.3-.3z"/>',
  cd_ell: '<circle cx="12" cy="12" r="3"/><ellipse cx="12" cy="12" rx="9" ry="3.8" transform="rotate(-24 12 12)"/><path d="M19 3.6l.6 1.5 1.5.6-1.5.6-.6 1.5-.6-1.5-1.5-.6 1.5-.6z"/>',
  cd_run: '<path d="M9 4h4.5v8.2l5.4 3.4c.9.6 1.4 1.4 1.4 2.4v1H7v-5.2z"/><path d="M9 7.2C6.9 7 5 5.8 4.2 4c1.7.1 3.3.6 4.8 1.4M9 10.4c-2.4 0-4.4-1-5.5-2.7 1.9-.1 3.7.3 5.5 1.1"/><path d="M7 16.5h13.3"/>',
  cd_other: '<path d="M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z"/><path d="M18.6 16.6l.5 1.3 1.3.5-1.3.5-.5 1.3-.5-1.3-1.3-.5 1.3-.5z"/><path d="M5.4 3.6l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4z"/>'
};
const NATURE_ICONS = {
  today: '<circle cx="12" cy="12" r="4.3"/><path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M5.5 18.5l1.6-1.6M16.9 7.1l1.6-1.6"/>',
  body: '<path d="M12 21v-8.5"/><path d="M12 13c0-4.2-3-6.8-7.6-6.8 0 4.2 3 6.8 7.6 6.8z"/><path d="M12 11.3c0-3.7 2.7-6.1 6.9-6.1 0 3.7-2.8 6.1-6.9 6.1z"/><path d="M7.5 21h9"/>',
  foods: '<path d="M12 7.6c-1.8-1.3-4.6-1.4-6.3.4-2.2 2.3-1.6 6.6.4 9.6 1.4 2.1 3 3.3 4.4 2.7.6-.3 1-.4 1.5-.4s.9.1 1.5.4c1.4.6 3-.6 4.4-2.7 2-3 2.6-7.3.4-9.6-1.7-1.8-4.5-1.7-6.3-.4z"/><path d="M12 7.6c0-2 .8-3.7 2.7-4.6"/>',
  cd_ell: '<circle cx="12" cy="12" r="7.6"/><circle cx="12" cy="12" r="1.9"/><path d="M12 4.4v5.7M12 13.9v5.7M4.4 12h5.7M13.9 12h5.7"/><path d="M6.6 6.6l1.4 1.4M16 16l1.4 1.4"/>',
  cd_run: '<path d="M3 9h8.5a2.5 2.5 0 1 0-2.5-2.5M3 13.2h12.5a2.5 2.5 0 1 1-2.5 2.5M3 17.2h5"/><path d="M15.2 8.6c2.7-1.7 5.6-1 6.5 1.2-2.3 1.7-5.1 1.4-6.5-1.2z"/>',
  cd_other: '<path d="M12 16.4c-2.3 0-3.8-1.5-3.8-3.6 0-2.1 1.6-3.2 2.1-5.2 1.5.9 2 2.3 1.8 3.4.6-.4 1-1 1.2-1.8 1 .9 2.5 2.3 2.5 3.8 0 2-1.6 3.4-3.8 3.4z"/><path d="M5 20.5l14-3.2M19 20.5L5 17.3"/>'
};
const icon = (name, w, set) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${(set && set[name]) || ICONS[name]}</svg>`;
const NAV_KEYS = ['today', 'week', 'body', 'foods', 'settings'];
// 有氧种类的图标：跟当前主题走（线宽、魔法 / 自然自己的画法；墨主题用汉字）
const CARDIO_KANJI = { ell: '踏', run: '走', other: '動' };
function cardioIcon(k) {
  const t = THEMES.find(x => x.id === document.documentElement.dataset.theme) || THEMES[0];
  if (t.nav === 'kanji') return `<span class="kj">${CARDIO_KANJI[k] || CARDIO_KANJI.other}</span>`;
  return icon('cd_' + k, t.navW || 1.8, t.icons);
}

const THEMES = [
  {
    id: 'sport', name: '竞技', desc: '转播记分板', ring: 'tick', nav: 'line',
    fonts: 'family=Barlow+Condensed:ital,wght@0,600;0,700;1,700;1,800', pvFont: 'family=Barlow+Condensed:ital,wght@1,800',
    pv: { bg: '#19243b', fg: '#edf1f8', acc: '#f26a2a', font: '"Barlow Condensed"', style: 'italic', weight: 800 },
    mark: '<svg width="20" height="24" viewBox="0 0 20 24"><path d="M11 1H19L13 10H18L5 23L8.5 13H2Z" fill="var(--accent)"/></svg>',
    word: 'CALLOG'
  },
  {
    id: 'planner', name: '手帐', desc: '方格本、胶带、荧光笔', ring: 'marker', nav: 'line', navW: 2,
    fonts: 'family=Caveat:wght@600;700&family=ZCOOL+XiaoWei', pvFont: 'family=Caveat:wght@700',
    pv: { bg: '#f7f8fa', fg: '#22304a', acc: '#ffe45c', font: 'Caveat', weight: 700 },
    mark: '<svg width="28" height="24" viewBox="0 0 28 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12.5c.3 5 4.6 8.8 11 8.8s10.6-3.8 11-8.9"/><path d="M2.5 12.2c7.8-.6 15.6-.5 23 .2"/><path d="M10 8.5c-1.3-1.6 1.4-2.6 0-4.4M15 8c-1.3-1.6 1.4-2.6 0-4.4"/></svg>',
    word: 'callog'
  },
  {
    id: 'terminal', name: '终端', desc: '琥珀色显像管', ring: 'seg', nav: 'text',
    fonts: 'family=JetBrains+Mono:wght@400;600;800', pvFont: 'family=JetBrains+Mono:wght@800',
    pv: { bg: '#14100a', fg: '#f0c272', acc: '#ffb000', font: '"JetBrains Mono"', weight: 800, box: 'border-radius:0;' },
    mark: '',
    word: '&gt;_callog<span class="cursor">▍</span>'
  },
  {
    id: 'candy', name: '糖果', desc: '圆滚滚、糖果色', ring: 'outline', nav: 'line', navW: 2.3,
    fonts: 'family=Fredoka:wght@500;600;700&family=Nunito:wght@500;700;800&family=ZCOOL+KuaiLe', pvFont: 'family=Fredoka:wght@600',
    pv: { bg: '#efeaff', fg: '#1f1b3a', acc: '#ff8a3d', font: 'Fredoka', weight: 600, box: 'border:2.5px solid #1f1b3a;box-shadow:3px 3px 0 #1f1b3a;border-radius:18px;' },
    mark: '<svg width="26" height="28" viewBox="0 0 28 28"><path d="M14 8c-3-2.5-9-1.5-9.5 5.2C4 19.5 8.5 25 12 25c1 0 1.4-.6 2-.6s1 .6 2 .6c3.5 0 8-5.5 7.5-11.8C23 6.5 17 5.5 14 8z" fill="#ff5c8a" stroke="#1f1b3a" stroke-width="2"/><path d="M14 8c0-2 .8-4 3-5" stroke="#1f1b3a" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M15.5 4.6c2.5-1.6 5-1 5.8.2-1.8 1.6-4.3 1.4-5.8-.2z" fill="#2fbf71" stroke="#1f1b3a" stroke-width="1.6"/><circle cx="11" cy="15" r="1.4" fill="#1f1b3a"/><circle cx="17" cy="15" r="1.4" fill="#1f1b3a"/><path d="M11.5 18.5c1.4 1.3 3.6 1.3 5 0" stroke="#1f1b3a" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'ios', name: '极简', desc: '跟随系统深浅色', ring: 'rings', nav: 'line',
    fonts: '',
    pv: { bg: '#f2f2f7', fg: '#000000', acc: '#fa114f', font: 'ui-rounded, system-ui', weight: 700, rings: true },
    mark: '<svg width="24" height="24" viewBox="0 0 26 26" fill="none" stroke-linecap="round" stroke-width="3"><circle cx="13" cy="13" r="11" stroke="var(--kcal)" stroke-dasharray="52 70" transform="rotate(-90 13 13)"/><circle cx="13" cy="13" r="7" stroke="var(--protein)" stroke-dasharray="30 44" transform="rotate(-90 13 13)"/><circle cx="13" cy="13" r="3" stroke="var(--carb)" stroke-dasharray="14 19" transform="rotate(-90 13 13)"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'sumi', name: '墨', desc: '远山、朱印、圆相', ring: 'enso', nav: 'kanji',
    fonts: 'family=Noto+Serif+SC:wght@400;600;700', pvFont: 'family=Noto+Serif+SC:wght@600',
    pv: { bg: '#ebe5d9', fg: '#1e1c19', acc: '#b7282e', font: '"Noto Serif SC", serif', weight: 600, box: 'border-radius:0;' },
    mark: '<svg width="24" height="24" viewBox="0 0 26 26"><rect x="1" y="1" width="24" height="24" rx="2" fill="var(--accent)"/><rect x="3.2" y="3.2" width="19.6" height="19.6" fill="none" stroke="#f4efe5" stroke-width="1"/><text x="13" y="18.6" text-anchor="middle" font-size="15" font-weight="700" fill="#f4efe5" style="font-family:\'Noto Serif SC\',serif">食</text></svg>',
    word: 'CalLog', kanji: ['日', '周', '身', '食', '设']
  },
  {
    id: 'neon', name: '霓虹', desc: '赛博朋克 HUD', ring: 'hud', nav: 'line',
    fonts: 'family=Rajdhani:wght@500;600;700&family=Share+Tech+Mono', pvFont: 'family=Rajdhani:wght@700',
    pv: { bg: '#0f1218', fg: '#e6edf7', acc: '#f3e600', font: 'Rajdhani', weight: 700,
      box: 'border-radius:0;background:linear-gradient(225deg,#f3e600 0 11px,transparent 11px),#0f1218;border-color:#2a3140;border-top:3px solid #f3e600;',
      num: 'color:#f3e600;' },
    mark: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M3.6 2h14l5 5v15h-14l-5-5z" fill="#00e5ff" opacity=".9"/><path d="M1.6 2h14l5 5v15h-14l-5-5z" fill="#fcee0a"/><path d="M14.4 7.4H7.8v9.2h6.6" fill="none" stroke="#0a0b0f" stroke-width="2.6"/></svg>',
    word: 'CALLOG'
  },
  {
    id: 'steam', name: '蒸汽', desc: '黄铜、齿轮、压力表', ring: 'gauge', nav: 'line',
    fonts: 'family=Zilla+Slab:wght@600;700&family=Noto+Serif+SC:wght@700;900', pvFont: 'family=Zilla+Slab:wght@700',
    pv: { bg: '#241b13', fg: '#f0e3c6', acc: '#d9a84e', font: '"Zilla Slab"', weight: 700,
      box: 'border-radius:10px;border:1px solid #5a4229;',
      num: 'color:#ffbd6e;font-variant-numeric:lining-nums;' },
    mark: '<svg width="26" height="26" viewBox="0 0 26 26"><circle cx="13" cy="13" r="9.6" fill="none" stroke="#b8862f" stroke-width="5" stroke-dasharray="3.77 3.77"/><circle cx="13" cy="13" r="8" fill="#2a1d12" stroke="#e2bd6c" stroke-width="2"/><path d="M13 13l3.9-3.6" stroke="#e0573f" stroke-width="1.7" stroke-linecap="round"/><circle cx="13" cy="13" r="1.8" fill="#e2bd6c"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'magic', name: '魔法', desc: '星夜、金框、魔法阵', ring: 'arcane', nav: 'line', icons: MAGIC_ICONS,
    fonts: 'family=Cinzel:wght@600;700&family=Noto+Serif+SC:wght@600;700', pvFont: 'family=Cinzel:wght@700',
    pv: { bg: '#1e1938', fg: '#efe7d3', acc: '#dcb65a', font: 'Cinzel', weight: 700,
      box: 'border-radius:6px;border:1px solid rgba(220,182,90,.4);',
      num: 'color:#e9cd85;' },
    mark: '<svg width="24" height="24" viewBox="0 0 24 24" style="filter:drop-shadow(0 0 3px rgba(227,187,87,.7))"><path d="M12 1L13.11 9.32L16.38 7.62L14.68 10.89L23 12L14.68 13.11L16.38 16.38L13.11 14.68L12 23L10.89 14.68L7.62 16.38L9.32 13.11L1 12L9.32 10.89L7.62 7.62L10.89 9.32Z" fill="#e3bb57"/><circle cx="12" cy="12" r="2.4" fill="#15112b"/><circle cx="12" cy="12" r="1.1" fill="#9fd0ff"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'nature', name: '自然', desc: '森林、陶土、藤蔓', ring: 'vine', nav: 'line', icons: NATURE_ICONS,
    fonts: 'family=Fraunces:ital,wght@0,500;0,600;1,600&family=Noto+Serif+SC:wght@600', pvFont: 'family=Fraunces:wght@600',
    pv: { bg: '#f1efe3', fg: '#283628', acc: '#5b8c4e', font: 'Fraunces', weight: 600, box: 'border-radius:22px;' },
    mark: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 22V11.5" stroke="#4d7a46" stroke-width="2" stroke-linecap="round"/><path d="M12 12.5C12 7 8.2 4.3 3 4.3c0 5.2 3.7 8.2 9 8.2z" fill="#8db36f"/><path d="M12 10.6c0-4.8 3.4-7.4 8.8-7.4 0 4.8-3.6 7.4-8.8 7.4z" fill="#4d7a46"/></svg>',
    word: 'CalLog'
  },
  // ── 游戏风（原创图形，不使用任何游戏的 logo、角色或界面原图） ──
  {
    id: 'hunt', group: 'game', name: '狩猎', desc: '任务板、羊皮纸、爪痕', ring: 'strap', nav: 'line',
    fonts: 'family=Ma+Shan+Zheng&family=Vollkorn:wght@600;700&family=Noto+Serif+SC:wght@700', pvFont: 'family=Vollkorn:wght@700',
    pv: { bg: '#d5c29a', fg: '#2e1d0e', acc: '#8f2817', font: 'Vollkorn', weight: 700,
      box: 'border-radius:3px;border:3px solid #3b2b1e;box-shadow:inset 0 0 14px rgba(110,75,35,.25);', num: 'font-variant-numeric:lining-nums;' },
    mark: '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" fill="#eadcbc" stroke="#6b4a2b" stroke-width="1.5"/><path d="M7.2 17.5L11.6 5.8M10.6 19L15.2 7.2M14.2 19.8L18 10.2" stroke="#a8321f" stroke-width="2.2" stroke-linecap="round"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'academy', group: 'game', name: '学园', desc: '晴空、斜切、清爽蓝', ring: 'sky', nav: 'line',
    fonts: 'family=Montserrat:ital,wght@0,700;0,800;1,700;1,800', pvFont: 'family=Montserrat:ital,wght@1,800',
    pv: { bg: '#eef6ff', fg: '#23324a', acc: '#1a96f0', font: 'Montserrat', style: 'italic', weight: 800,
      box: 'border-radius:10px;background:linear-gradient(160deg,#d6ecff,#ffffff 70%);', num: 'color:#1a6fd6;' },
    mark: '<svg width="26" height="24" viewBox="0 0 26 24"><path d="M7 2h18l-5 20H2z" fill="#1a96f0"/><path d="M13.6 6.4l1.2 3.2 3.4.2-2.6 2.1.9 3.3-2.9-1.9-2.8 1.9.9-3.3-2.6-2.1 3.4-.2z" fill="#fff"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'industry', group: 'game', name: '工业', desc: '工业科幻、黑白黄', ring: 'tech', nav: 'line',
    fonts: 'family=Saira+Condensed:wght@500;600;700&family=IBM+Plex+Mono:wght@500', pvFont: 'family=Saira+Condensed:wght@600',
    pv: { bg: '#efefec', fg: '#161616', acc: '#ffd400', font: '"Saira Condensed"', weight: 600,
      box: 'border-radius:0;border:1px solid #161616;background:linear-gradient(#ffd400,#ffd400) left top/4px 100% no-repeat,#efefec;' },
    mark: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M2 2h16l4 4v16H2z" fill="#161616"/><path d="M2 2h8v3.2H2z" fill="#ffd400"/><circle cx="12" cy="13" r="4" fill="none" stroke="#ffd400" stroke-width="1.5"/><path d="M12 7.5v11M6.5 13h11" stroke="#fff" stroke-width="1.2"/></svg>',
    word: 'CALLOG'
  },
  {
    id: 'expedition', group: 'game', name: '远征', desc: '暗色奇幻、余烬、深红', ring: 'iron', nav: 'line',
    fonts: 'family=Cormorant+Garamond:wght@600;700&family=Noto+Serif+SC:wght@600;700', pvFont: 'family=Cormorant+Garamond:wght@700',
    pv: { bg: '#201d19', fg: '#e8e0d0', acc: '#c9463b', font: '"Cormorant Garamond"', weight: 700,
      box: 'border-radius:2px;border:1px solid #3d362e;', num: 'font-variant-numeric:lining-nums;' },
    mark: '<svg width="22" height="24" viewBox="0 0 22 24"><path d="M11 1l9.5 11L11 23 1.5 12z" fill="#b02a2a"/><path d="M11 1l9.5 11L11 23 1.5 12z" fill="none" stroke="#d8c39a" stroke-width="1"/><path d="M11 5.5v13M8 9.5h6" stroke="#f3e9d8" stroke-width="1.6" stroke-linecap="round"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'starwild', group: 'game', name: '星野', desc: '深空、篝火、行星轨道', ring: 'orbit', nav: 'line',
    fonts: 'family=Space+Grotesk:wght@500;700&family=Space+Mono:wght@400;700', pvFont: 'family=Space+Grotesk:wght@700',
    pv: { bg: '#18203a', fg: '#eef1f8', acc: '#ff8f45', font: '"Space Grotesk"', weight: 700,
      box: 'border-radius:14px;background:radial-gradient(130px 90px at 0 0,rgba(255,140,50,.2),transparent 70%),#18203a;' },
    mark: '<svg width="26" height="24" viewBox="0 0 26 24"><ellipse cx="13" cy="12" rx="11.5" ry="3.8" fill="none" stroke="#ff8a3c" stroke-width="1.6" transform="rotate(-18 13 12)"/><circle cx="13" cy="12" r="6.2" fill="#5fd3c4"/><path d="M9.2 9.6a4.5 4.5 0 0 1 4.6-2.1" stroke="#dffaf6" stroke-width="1.3" fill="none" stroke-linecap="round"/><path d="M2.6 15.4c2.8 1.3 9.2.2 15.4-2.6" fill="none" stroke="#ff8a3c" stroke-width="1.6" stroke-linecap="round"/></svg>',
    word: 'CalLog'
  },
  {
    id: 'skyward', group: 'game', name: '苍穹', desc: '天空、金边、宝珠', ring: 'gems', nav: 'line',
    fonts: 'family=Marcellus&family=Noto+Serif+SC:wght@600;700', pvFont: 'family=Noto+Serif+SC:wght@600',
    pv: { bg: '#fffaf0', fg: '#1f3358', acc: '#d29a2e', font: '"Noto Serif SC", serif', weight: 600,
      box: 'border-radius:10px;border:1px solid #d8bf86;box-shadow:inset 0 0 0 3px rgba(255,250,240,.9),inset 0 0 0 4px rgba(201,154,58,.45);background:linear-gradient(180deg,#d4eafb,#fffaf0 75%);' },
    mark: '<svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 1.5l9 5.2v10.6l-9 5.2-9-5.2V6.7z" fill="#c99a3a"/><path d="M12 5l6 3.5v7L12 19l-6-3.5v-7z" fill="#2f62c9"/><path d="M12 5l6 3.5L12 12 6 8.5z" fill="#7aa5ee"/></svg>',
    word: 'CalLog'
  }
];
const OLD_THEME = { lime: 'sport', graphite: 'ios', ocean: 'neon', paper: 'planner', sakura: 'candy', auto: 'ios' };
const themeConf = () => THEMES.find(t => t.id === document.documentElement.dataset.theme) || THEMES.find(t => t.id === 'ios');
const brandHTML = (t, withWord) => `${t.mark}${withWord || !t.mark ? `<span class="wm">${t.word}</span>` : ''}`;

const darkMQ = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

function loadFont(id, query) {
  let link = document.getElementById(id);
  if (!query) { if (link) link.remove(); return; }
  const href = GF + query + '&display=swap';
  if (link && link.getAttribute('href') === href) return;
  if (!link) { link = document.createElement('link'); link.id = id; link.rel = 'stylesheet'; document.head.appendChild(link); }
  link.href = href;
}

function applyTheme() {
  let id = OLD_THEME[LOCAL.theme] || LOCAL.theme || 'ios';
  if (!THEMES.some(t => t.id === id)) id = 'ios';
  const t = THEMES.find(x => x.id === id);
  const root = document.documentElement;
  root.dataset.theme = id;
  root.dataset.mode = darkMQ && darkMQ.matches ? 'dark' : 'light';
  loadFont('font-theme', t.fonts);
  // logo
  document.querySelectorAll('.brand').forEach(el => { el.innerHTML = brandHTML(t, el.dataset.word === '1'); });
  // 底部导航图标
  document.querySelectorAll('.nav button').forEach((b, i) => {
    const ic = b.querySelector('.ic');
    if (t.nav === 'emoji') ic.textContent = t.emoji[i];
    else if (t.nav === 'kanji') ic.textContent = t.kanji[i];
    else ic.innerHTML = icon(NAV_KEYS[i], t.navW || 1.8, t.icons);
  });
  document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon, 1.8); });
  const bg = getComputedStyle(root).getPropertyValue('--bg').trim();
  const meta = document.querySelector('meta[name=theme-color]');
  if (meta && bg) meta.setAttribute('content', bg);
  if (window.appStatusBar) appStatusBar();
}
if (darkMQ && darkMQ.addEventListener) darkMQ.addEventListener('change', () => { applyTheme(); if (window.rerender) rerender(); });

// ── 环形图：每套主题一种画法 ──
function ringSVG(info) {
  const pct = info.target ? info.intake.kcal / info.target : 0;
  const p = Math.max(0, Math.min(1, pct));
  const over = pct > 1;
  const col = over ? 'var(--bad)' : 'var(--kcal)';
  const C = r => 2 * Math.PI * r;
  const arc = (r, w, color, frac, extra) => `<circle cx="78" cy="78" r="${r}" fill="none" stroke="${color}" stroke-width="${w}"
    stroke-dasharray="${C(r).toFixed(2)}" stroke-dashoffset="${(C(r) * (1 - frac)).toFixed(2)}" ${extra || ''}/>`;
  const track = (r, w, color, extra) => `<circle cx="78" cy="78" r="${r}" fill="none" stroke="${color}" stroke-width="${w}" ${extra || ''}/>`;
  const pos = (r, f) => [78 + r * Math.cos(f * 2 * Math.PI), 78 + r * Math.sin(f * 2 * Math.PI)];
  // SVG 内的持续动画（SMIL）；系统开启「减少动态效果」时不输出
  const M = !REDUCED();
  const S = x => M ? x : '';
  const spin = (dur, rev, cx, cy) => S(`<animateTransform attributeName="transform" type="rotate" from="0 ${cx || 78} ${cy || 78}" to="${rev ? -360 : 360} ${cx || 78} ${cy || 78}" dur="${dur}s" repeatCount="indefinite"/>`);
  let body = '';
  switch (themeConf().ring) {
    case 'tick': {   // 秒表刻度 + 绕圈跑的「计时光点」
      let ticks = '';
      for (let i = 0; i < 60; i++) {
        const a = i / 60 * 2 * Math.PI, on = i / 60 < p;
        const r1 = i % 5 === 0 ? 70 : 72, r2 = 77;
        ticks += `<line x1="${(78 + r1 * Math.cos(a)).toFixed(2)}" y1="${(78 + r1 * Math.sin(a)).toFixed(2)}" x2="${(78 + r2 * Math.cos(a)).toFixed(2)}" y2="${(78 + r2 * Math.sin(a)).toFixed(2)}" stroke="${on ? col : 'var(--track)'}" stroke-width="${i % 5 === 0 ? 2.4 : 1.6}"/>`;
      }
      const [x1, y1] = pos(50, p), [x2, y2] = pos(66, p);
      body = ticks + track(58, 12, 'var(--track)') + arc(58, 12, col, p, 'stroke-linecap="butt"')
        + (p > 0 ? `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="var(--text)" stroke-width="2.5"/>` : '')
        + S(`<circle cx="78" cy="78" r="74.5" fill="none" stroke="var(--text)" stroke-width="2.4" stroke-dasharray="9 459.1" stroke-linecap="round" opacity=".8">${spin(2.6)}</circle>`);
      break;
    }
    case 'marker':   // 铅笔圈（线条会像手绘动画一样「抖」）+ 荧光笔
      body = `<filter id="rg-rough"><feTurbulence type="fractalNoise" baseFrequency=".04" numOctaves="2" seed="3">${S('<animate attributeName="seed" values="3;8;13" dur=".75s" calcMode="discrete" repeatCount="indefinite"/>')}</feTurbulence><feDisplacementMap in="SourceGraphic" scale="3.5"/></filter>`
        + track(64, 1.6, 'var(--muted)', 'filter="url(#rg-rough)"')
        + arc(64, 20, over ? 'var(--bad)' : 'var(--marker)', p, 'stroke-linecap="round" opacity=".85"');
      break;
    case 'seg': {    // 分段方块 + 下一格闪烁（像在加载）
      const C64 = C(64), L = Math.ceil(p * C64 / 7) * 7;
      body = `<mask id="rg-m">${arc(64, 14, '#fff', p, 'stroke-linecap="butt"')}</mask>`
        + track(64, 12, 'var(--track)', 'stroke-dasharray="4 3"')
        + track(64, 12, col, 'stroke-dasharray="4 3" mask="url(#rg-m)"')
        + (p < 1 && L < C64 - 4 ? S(`<circle cx="78" cy="78" r="64" fill="none" stroke="${col}" stroke-width="12" stroke-dasharray="4 ${C64.toFixed(2)}" stroke-dashoffset="${-L}" opacity="0"><animate attributeName="opacity" values="0;.9" dur="1.1s" calcMode="discrete" repeatCount="indefinite"/></circle>`) : '');
      break;
    }
    case 'outline': { // 粗描边 + 会弹动的糖球
      const [bx, by] = pos(64, p);
      body = track(73, 2.5, 'var(--border)') + track(55, 2.5, 'var(--border)')
        + track(64, 16, 'var(--track)') + arc(64, 16, col, p, 'stroke-linecap="round"')
        + (p > 0 ? `<g transform="translate(${bx.toFixed(2)} ${by.toFixed(2)})"><g>${S('<animateTransform attributeName="transform" type="scale" values="1;1.16 .86;.9 1.1;1.04 .97;1" keyTimes="0;.16;.4;.68;1" dur="1.9s" repeatCount="indefinite"/>')}
          <circle r="9.5" fill="${col}" stroke="var(--border)" stroke-width="2.5"/><circle cx="-2.6" cy="-2.6" r="2.6" fill="#fff" fill-opacity=".85"/></g></g>` : '');
      break;
    }
    case 'rings': {  // 三层活动圆环：热量 / 蛋白质 / 碳水，末端高光轻轻闪
      const pp = info.proteinT ? info.intake.protein / info.proteinT : 0;
      const cp = info.carbT ? info.intake.carb / info.carbT : 0;
      const grad = (id, c) => `<linearGradient id="${id}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color:color-mix(in srgb, ${c} 82%, #000)"/><stop offset="1" style="stop-color:color-mix(in srgb, ${c} 72%, #fff)"/></linearGradient>`;
      const ring = (r, c, id, f, k) => {
        const ff = Math.max(0.001, Math.min(1, f)), [tx, ty] = pos(r, ff);
        return track(r, 13, c, 'stroke-opacity=".2"') + arc(r, 13, `url(#${id})`, ff, 'stroke-linecap="round"')
          + (f > .03 ? S(`<circle cx="${tx.toFixed(2)}" cy="${ty.toFixed(2)}" r="3.4" fill="#fff" opacity="0"><animate attributeName="opacity" values="0;.6;0" dur="2.8s" begin="${k * .6}s" repeatCount="indefinite"/></circle>`) : '');
      };
      body = `<defs>${grad('rg-ik', 'var(--kcal)')}${grad('rg-ip', 'var(--protein)')}${grad('rg-ic', 'var(--carb)')}</defs>`
        + ring(70, 'var(--kcal)', 'rg-ik', p, 0) + ring(54, 'var(--protein)', 'rg-ip', pp, 1) + ring(38, 'var(--carb)', 'rg-ic', cp, 2);
      break;
    }
    case 'enso':     // 圆相：毛笔笔触，墨迹会缓慢「洇开」
      body = `<filter id="rg-brush" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".9 .05" numOctaves="2" seed="7">${S('<animate attributeName="baseFrequency" values=".9 .05;.9 .075;.9 .05" dur="7s" repeatCount="indefinite"/>')}</feTurbulence><feDisplacementMap in="SourceGraphic" scale="5">${S('<animate attributeName="scale" values="4.2;6.6;4.2" dur="5s" repeatCount="indefinite"/>')}</feDisplacementMap></filter>`
        + track(62, 9, 'var(--track)', 'filter="url(#rg-brush)" opacity=".7"')
        + arc(62, 13, over ? 'var(--bad)' : 'var(--text)', p, 'stroke-linecap="round" filter="url(#rg-brush)"');
      break;
    case 'hud': {   // 赛博 HUD：外圈刻度慢转、内圈反转，红色故障残影偶尔跳动
      let ticks = '';
      for (let i = 0; i < 72; i++) {
        const a = i / 72 * 2 * Math.PI, big = i % 6 === 0, r1 = big ? 69 : 72.5;
        ticks += `<line x1="${(78 + r1 * Math.cos(a)).toFixed(2)}" y1="${(78 + r1 * Math.sin(a)).toFixed(2)}" x2="${(78 + 76 * Math.cos(a)).toFixed(2)}" y2="${(78 + 76 * Math.sin(a)).toFixed(2)}" stroke="var(--text)" stroke-opacity="${big ? .85 : .35}" stroke-width="${big ? 1.6 : 1}"/>`;
      }
      const seg = 'stroke-dasharray="9.4 2.38"';
      const [x1, y1] = pos(50, p), [x2, y2] = pos(70, p);
      body = `<mask id="rg-hm">${arc(60, 18, '#fff', p, 'stroke-linecap="butt"')}</mask>`
        + `<g>${spin(90)}${ticks}</g><g>${spin(45, true)}${track(47, 1, 'var(--text)', 'stroke-opacity=".35" stroke-dasharray="2 4"')}</g>`
        + track(60, 14, 'var(--track)', seg)
        + (p > 0 ? `<circle cx="78" cy="78" r="60" fill="none" stroke="${over ? 'var(--bad)' : 'var(--glitch)'}" stroke-width="14" ${seg} mask="url(#rg-hm)" transform="translate(0 -2.6)" opacity=".8">`
            + S('<animateTransform attributeName="transform" type="translate" values="0 -2.6;3 -1;0 -2.6;-2 -3.4;0 -2.6" keyTimes="0;.03;.06;.62;.65" dur="3.3s" calcMode="discrete" repeatCount="indefinite"/><animate attributeName="opacity" values=".8;0;.8;.35;.8" keyTimes="0;.02;.05;.63;.66" dur="3.3s" calcMode="discrete" repeatCount="indefinite"/>') + '</circle>'
          + track(60, 14, col, seg + ' mask="url(#rg-hm)"')
          + `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="var(--text)" stroke-width="2.4"/>` : '');
      break;
    }
    case 'gauge': {  // 压力表：270° 刻度盘 + 红区 + 指针（指针会不规律地轻微抖动）
      const A0 = 135, SW = 270;
      const pt = (deg, r) => { const a = deg * Math.PI / 180; return `${(78 + r * Math.cos(a)).toFixed(2)} ${(78 + r * Math.sin(a)).toFixed(2)}`; };
      const ap = (r, f0, f1) => `M${pt(A0 + SW * f0, r)}A${r} ${r} 0 ${SW * (f1 - f0) > 180 ? 1 : 0} 1 ${pt(A0 + SW * f1, r)}`;
      let ticks = '';
      for (let i = 0; i <= 40; i++) {
        const f = i / 40, big = i % 5 === 0;
        ticks += `<path d="M${pt(A0 + SW * f, big ? 55 : 59)}L${pt(A0 + SW * f, 64)}" stroke="${p > 0 && f <= p + 1e-6 ? 'var(--text)' : 'var(--muted)'}" stroke-width="${big ? 2.2 : 1.1}"/>`;
      }
      const jitter = S('<animateTransform attributeName="transform" type="rotate" values="0 78 78;1.8 78 78;-.7 78 78;2.6 78 78;.4 78 78;3.4 78 78;-.5 78 78;1.1 78 78;2.2 78 78;0 78 78" keyTimes="0;.06;.14;.27;.35;.47;.6;.72;.86;1" dur="2.7s" repeatCount="indefinite"/>');
      body = `<g transform="rotate(90 78 78)">
        <circle cx="78" cy="78" r="74" fill="var(--dial)" stroke="#b8862f" stroke-width="5"/>
        <circle cx="78" cy="78" r="76" fill="none" stroke="#f0d48a" stroke-width="1" stroke-opacity=".7"/>
        <circle cx="78" cy="78" r="70.5" fill="none" stroke="#5a3d17" stroke-width="1.5"/>
        <path d="${ap(66.5, .88, 1)}" fill="none" stroke="var(--bad)" stroke-width="4" stroke-opacity=".8"/>
        ${ticks}
        <path d="${ap(46, 0, 1)}" fill="none" stroke="var(--track)" stroke-width="5" stroke-linecap="round"/>
        ${p > .004 ? `<path d="${ap(46, 0, p)}" fill="none" stroke="${col}" stroke-width="5" stroke-linecap="round"/>` : ''}
        <path d="M${pt(A0 + SW * p + 180, 11)}L${pt(A0 + SW * p, 58)}" stroke="var(--needle)" stroke-width="2.6" stroke-linecap="round">${jitter}</path>
        <circle cx="78" cy="78" r="6.5" fill="#d9a84e" stroke="#5a3d17" stroke-width="1.2"/>
        <circle cx="78" cy="78" r="2" fill="#5a3d17"/></g>`;
      break;
    }
    case 'arcane': { // 魔法阵：符文圈和六芒星反向旋转，魔力弧末端的光球在「呼吸」
      const RUNE = ['M0-4v8M0-4l3 2.4M0-.4l3 2.4', 'M-1.6-4v8M-1.6-4l3.4 3.2-3.4 3.2', 'M0-4v8M-3-1.4l6 2.8', 'M-2.4-4l4.8 8M2.4-4l-4.8 8',
        'M0-4v8M0-.8l-2.8-3M0-.8l2.8-3', 'M-2-4v8M2-4v8M-2-1.4l4 2.6', 'M0-4l2.8 4L0 4l-2.8-4z', 'M-2.6-4h5.2M0-4v8M-2.6 4h5.2', 'M-2 4V-4l4 4-4 4'];
      let runes = '';
      for (let i = 0; i < 26; i++) runes += `<path d="${RUNE[(i * 7) % RUNE.length]}" transform="rotate(${(i * 360 / 26).toFixed(2)} 78 78) translate(78 9)"/>`;
      const tri = off => [0, 1, 2].map(k => { const a = (off + k * 120) * Math.PI / 180; return `${(78 + 47 * Math.cos(a)).toFixed(2)} ${(78 + 47 * Math.sin(a)).toFixed(2)}`; }).join('L');
      const [ox, oy] = pos(56, p);
      body = `<defs><linearGradient id="rg-mana" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--carb)"/><stop offset="1" style="stop-color:var(--kcal)"/></linearGradient>
        <filter id="rg-aura" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
        <g fill="none" stroke="var(--accent)">
          <circle cx="78" cy="78" r="76" stroke-opacity=".55" stroke-width="1"/><circle cx="78" cy="78" r="73.5" stroke-opacity=".3" stroke-width=".7"/>
          <g stroke-width="1.1" stroke-opacity=".7" stroke-linecap="round" stroke-linejoin="round">${spin(80)}${runes}</g>
          <circle cx="78" cy="78" r="64.5" stroke-opacity=".55" stroke-width="1"/>
          <g>${spin(130, true)}<path d="M${tri(-90)}Z M${tri(90)}Z" stroke="var(--carb)" stroke-opacity=".28" stroke-width="1"/></g>
          <circle cx="78" cy="78" r="47" stroke-opacity=".3" stroke-width=".8"/>
        </g>`
        + track(56, 5, 'var(--track)')
        + (p > 0 ? arc(56, 5, over ? 'var(--bad)' : 'url(#rg-mana)', p, 'stroke-linecap="round" filter="url(#rg-aura)"')
          + `<circle cx="${ox.toFixed(2)}" cy="${oy.toFixed(2)}" r="3.6" fill="#fff8e0" filter="url(#rg-aura)">${S('<animate attributeName="r" values="3.2;5;3.2" dur="2.2s" repeatCount="indefinite"/>')}</circle>` : '');
      break;
    }
    case 'vine': {   // 藤蔓：沿进度长出叶子，叶子随风摆动；超标时叶子变成秋色
      const LEAF = 'M0 0C3.3-2.7 3.7-8.8 0-12.6C-3.7-8.8-3.3-2.7 0 0Z';
      const deg = p * 360;
      let leaves = '';
      for (let a = 7, k = 0; a <= deg - 4; a += 13, k++) {
        const out = k % 2 === 0, grow = Math.min(1, (deg - 4 - a) / 13 + .2);
        const sc = ((0.78 + ((k * 37) % 10) / 40) * grow).toFixed(2);
        const c = over ? (k % 3 ? 'var(--bad)' : 'var(--fat)') : (k % 3 ? 'var(--leaf)' : 'var(--leaf2)');
        const sway = S(`<animateTransform attributeName="transform" type="rotate" values="0;${out ? 9 : -9};${out ? -5 : 5};0" dur="${(2.6 + (k % 4) * .45).toFixed(2)}s" begin="-${(k * .41).toFixed(2)}s" repeatCount="indefinite"/>`);
        leaves += `<g transform="rotate(${a} 78 78) translate(142 78) rotate(${out ? 128 : 232}) scale(${sc})"><g>${sway}<path d="${LEAF}" fill="${c}"/><path d="M0 -1.5V-10" stroke="var(--surface)" stroke-opacity=".55" stroke-width=".8"/></g></g>`;
      }
      const [fx, fy] = pos(64, p);
      const flower = p > .02 && !over ? `<g>${spin(9, false, fx.toFixed(2), fy.toFixed(2))}${[0, 72, 144, 216, 288].map(d => `<circle cx="${(fx + 3.4 * Math.cos(d * Math.PI / 180)).toFixed(2)}" cy="${(fy + 3.4 * Math.sin(d * Math.PI / 180)).toFixed(2)}" r="2.7" fill="var(--fat)"/>`).join('')}</g><circle cx="${fx.toFixed(2)}" cy="${fy.toFixed(2)}" r="2" fill="#7a4b1c"/>` : '';
      body = track(72, 1, 'var(--track)', 'stroke-dasharray="1 5" stroke-linecap="round" stroke-width="2"')
        + track(64, 3, 'var(--track)') + track(55, 1, 'var(--track)')
        + (p > 0 ? arc(64, 3, over ? 'var(--bad)' : 'var(--leaf)', p, 'stroke-linecap="round"') : '') + leaves + flower;
      break;
    }
    case 'strap': {  // 皮带：缝线缓缓走动，皮带末端的铆钉一闪一闪
      const [rx, ry] = pos(62, p);
      const stitch = (r, rev) => `<circle cx="78" cy="78" r="${r}" fill="none" stroke="var(--stitch)" stroke-width="1.3" stroke-dasharray="4 3">${S(`<animate attributeName="stroke-dashoffset" from="0" to="${rev ? 7 : -7}" dur="1.8s" repeatCount="indefinite"/>`)}</circle>`;
      body = track(62, 18, 'var(--strap)') + (p > 0 ? arc(62, 10, col, p, 'stroke-linecap="butt"') : '')
        + stitch(54.5) + stitch(69.5, true)
        + '<rect x="128.5" y="72" width="23" height="12" rx="2.5" fill="none" stroke="var(--rivet)" stroke-width="3"/>'
        + (p > 0 ? `<circle cx="${rx.toFixed(2)}" cy="${ry.toFixed(2)}" r="4.6" fill="var(--rivet)" stroke="#3a2617" stroke-width="1.2"/>
          <circle cx="${(rx - 1.4).toFixed(2)}" cy="${(ry - 1.4).toFixed(2)}" r="1.6" fill="#fff" opacity="0">${S('<animate attributeName="opacity" values="0;0;.95;0" keyTimes="0;.7;.8;1" dur="3.4s" repeatCount="indefinite"/>')}</circle>` : '');
      break;
    }
    case 'sky': {    // 晴空：外圈虚线慢转、一个小三角沿外圈绕行，进度上一道光流过，末端白点在「心跳」，外圈几颗小星一闪一闪
      const [tx, ty] = pos(62, p), C62 = C(62);
      const twinkle = (f, k) => { const [x, y] = pos(70, f); return S(`<g transform="translate(${x.toFixed(2)} ${y.toFixed(2)})"><path d="M0-3.6L.8-.8 3.6 0 .8.8 0 3.6-.8.8-3.6 0-.8-.8Z" fill="${k % 2 ? '#ffd84a' : '#6fd8ff'}" transform="scale(0)"><animateTransform attributeName="transform" type="scale" values="0;1;0;0" keyTimes="0;.15;.32;1" dur="3.4s" begin="${(k * 1.1).toFixed(1)}s" repeatCount="indefinite"/></path></g>`); };
      body = `<defs><linearGradient id="rg-sky" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:#6fd8ff"/><stop offset="1" style="stop-color:var(--kcal)"/></linearGradient>
          <mask id="rg-sm">${arc(62, 17, '#fff', p, 'stroke-linecap="round"')}</mask></defs>`
        + `<g>${spin(40)}${track(74, 1.6, 'var(--accent)', 'stroke-opacity=".35" stroke-dasharray="7 5"')}</g>`
        + S(`<g>${spin(16)}<path d="M0-5L4.4 2.8H-4.4Z" transform="translate(152 78) rotate(180)" fill="#fff" stroke="var(--accent)" stroke-width="1.4" stroke-linejoin="round"/></g>`)
        + track(62, 15, 'var(--track)') + track(50, 1, 'var(--accent)', 'stroke-opacity=".25"')
        + (p > 0 ? arc(62, 15, over ? 'var(--bad)' : 'url(#rg-sky)', p, 'stroke-linecap="round"')
          + S(`<circle cx="78" cy="78" r="62" fill="none" stroke="#fff" stroke-width="15" stroke-opacity=".5" stroke-dasharray="12 ${(C62 - 12).toFixed(2)}" mask="url(#rg-sm)"><animate attributeName="stroke-dashoffset" from="${C62.toFixed(2)}" to="0" dur="2.6s" repeatCount="indefinite"/></circle>`)
          + `<circle cx="${tx.toFixed(2)}" cy="${ty.toFixed(2)}" r="3.6" fill="#fff">${S('<animate attributeName="r" values="3.4;5.2;3.4" dur="1.6s" repeatCount="indefinite"/>')}</circle>` : '')
        + twinkle(.13, 0) + twinkle(.47, 1) + twinkle(.79, 2);
      break;
    }
    case 'tech': {   // 工业：外圈像机械一样每隔几秒转 90°，黄色方块标记自转
      const C74 = 2 * Math.PI * 74, q = C74 / 4;
      const [mx, my] = pos(59, p);
      let marks = '';
      [0, 1, 2, 3].forEach(k => { const a = k * Math.PI / 2; marks += `<line x1="${(78 + 69 * Math.cos(a)).toFixed(2)}" y1="${(78 + 69 * Math.sin(a)).toFixed(2)}" x2="${(78 + 79 * Math.cos(a)).toFixed(2)}" y2="${(78 + 79 * Math.sin(a)).toFixed(2)}" stroke="var(--text)" stroke-width="1.6"/>`; });
      for (let i = 0; i < 40; i++) { if (i % 10 === 0) continue; const a = i / 40 * 2 * Math.PI; marks += `<line x1="${(78 + 70 * Math.cos(a)).toFixed(2)}" y1="${(78 + 70 * Math.sin(a)).toFixed(2)}" x2="${(78 + 72.5 * Math.cos(a)).toFixed(2)}" y2="${(78 + 72.5 * Math.sin(a)).toFixed(2)}" stroke="var(--muted)" stroke-width="1"/>`; }
      const step = S('<animateTransform attributeName="transform" type="rotate" values="0 78 78;90 78 78;90 78 78" keyTimes="0;.16;1" calcMode="spline" keySplines=".7 0 .2 1;0 0 1 1" dur="5s" repeatCount="indefinite"/>');
      body = `<g>${step}${track(76, 1, 'var(--text)', `stroke-opacity=".5" stroke-dasharray="${(q - 14).toFixed(2)} 14" stroke-dashoffset="-7"`)}${marks}</g>`
        + track(59, 11, 'var(--track)') + (p > 0 ? arc(59, 11, over ? 'var(--bad)' : 'var(--kcal)', p, 'stroke-linecap="butt"') : '')
        + track(48, 1, 'var(--muted)', 'stroke-dasharray="2 3"')
        + (p > 0 ? `<g transform="translate(${mx.toFixed(2)} ${my.toFixed(2)}) rotate(${(p * 360).toFixed(1)})"><rect x="-5" y="-5" width="10" height="10" fill="var(--hi)" stroke="var(--text)" stroke-width="1.2">${S('<animateTransform attributeName="transform" type="rotate" values="0;90;90" keyTimes="0;.3;1" dur="2.5s" repeatCount="indefinite"/>')}</rect></g>` : '');
      break;
    }
    case 'iron': {   // 远征：铁环 + 菱形刻记，点亮的刻记像火光一样明暗；深红进度缓慢「发热」
      let dia = '';
      for (let i = 0; i < 12; i++) {
        const [x, y] = pos(71, i / 12), lit = p > 0 && i / 12 <= p + 1e-6;
        dia += `<rect x="-2.6" y="-2.6" width="5.2" height="5.2" transform="translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${i * 30 + 45})" fill="${lit ? 'var(--text)' : 'var(--bg)'}" stroke="${lit ? 'var(--text)' : 'var(--muted)'}" stroke-width="1">`
          + (lit ? S(`<animate attributeName="opacity" values="1;.55;.9;.6;1" dur="${(1.9 + (i % 3) * .55).toFixed(2)}s" begin="-${(i * .37).toFixed(2)}s" repeatCount="indefinite"/>`) : '') + '</rect>';
      }
      body = track(76, 1, 'var(--muted)', 'stroke-opacity=".6"') + track(62, 9, 'var(--track)') + track(56.5, .8, 'var(--muted)', 'stroke-opacity=".5"')
        + (p > 0 ? `<circle cx="78" cy="78" r="62" fill="none" stroke="${col}" stroke-width="9" stroke-dasharray="${C(62).toFixed(2)}" stroke-dashoffset="${(C(62) * (1 - p)).toFixed(2)}">${S('<animate attributeName="stroke-opacity" values="1;.72;1" dur="3.4s" repeatCount="indefinite"/>')}</circle>` : '') + dia;
      break;
    }
    case 'orbit': {  // 星野：恒星在呼吸，小卫星沿内轨道绕行，进度行星的光环在摆动
      const [px, py] = pos(62, p), ma = 3.9;
      body = `<defs><radialGradient id="rg-sun"><stop offset="0" stop-color="#ffb066" stop-opacity=".32"/><stop offset="1" stop-color="#ffb066" stop-opacity="0"/></radialGradient></defs>
        <circle cx="78" cy="78" r="46" fill="url(#rg-sun)">${S('<animate attributeName="r" values="42;50;42" dur="4.5s" repeatCount="indefinite"/>')}</circle>`
        + track(75, .8, 'var(--muted)', 'stroke-opacity=".35"') + `<g>${spin(70, true)}${track(62, 1.2, 'var(--muted)', 'stroke-dasharray="2 4" stroke-opacity=".8"')}</g>` + track(47, .8, 'var(--muted)', 'stroke-dasharray="1 4" stroke-opacity=".7"')
        + `<g>${spin(16)}<circle cx="${(78 + 47 * Math.cos(ma)).toFixed(2)}" cy="${(78 + 47 * Math.sin(ma)).toFixed(2)}" r="2.6" fill="var(--text2)"/></g>`
        + (p > 0 ? arc(62, 3, col, p, 'stroke-linecap="round"')
          + `<g transform="translate(${px.toFixed(2)} ${py.toFixed(2)})"><circle r="7.5" fill="var(--protein)"/><path d="M-4.2-2.6a5 5 0 0 1 4.6-2.6" stroke="#e6fffb" stroke-width="1.4" fill="none" stroke-linecap="round"/><ellipse rx="12" ry="3.4" fill="none" stroke="var(--kcal)" stroke-width="1.4" transform="rotate(-25)">${S('<animateTransform attributeName="transform" type="rotate" values="-25;-12;-25" dur="5s" repeatCount="indefinite"/>')}</ellipse></g>` : '');
      break;
    }
    case 'gems': {   // 苍穹：点亮的宝珠轮流闪光，金色进度上有一道光流过
      const GEM = ['#d6574e', '#e58b3a', '#e2c045', '#3f9f6b', '#3f7fd0', '#7a5bc4', '#a7b3c4'];
      let sock = '';
      for (let k = 0; k < 7; k++) {
        const [x, y] = pos(64, (k + .5) / 7), lit = p >= (k + .5) / 7;
        const hex = [0, 1, 2, 3, 4, 5].map(j => { const b = j * Math.PI / 3 + Math.PI / 6; return `${(x + 8.4 * Math.cos(b)).toFixed(2)} ${(y + 8.4 * Math.sin(b)).toFixed(2)}`; }).join('L');
        sock += `<path d="M${hex}Z" fill="${lit ? GEM[k] : 'var(--surface)'}" stroke="var(--gold)" stroke-width="1.6"/>`
          + (lit ? `<circle cx="${(x - 2.2).toFixed(2)}" cy="${(y - 2.4).toFixed(2)}" r="1.8" fill="#fff" fill-opacity=".8"/>`
            + S(`<g transform="translate(${(x + 3.2).toFixed(2)} ${(y - 3.6).toFixed(2)})"><path d="M0-4.2L.9-.9 4.2 0 .9.9 0 4.2-.9.9-4.2 0-.9-.9Z" fill="#fff" transform="scale(0)"><animateTransform attributeName="transform" type="scale" values="0;1.1;0;0" keyTimes="0;.12;.26;1" dur="3.2s" begin="${(k * .46).toFixed(2)}s" repeatCount="indefinite"/></path></g>`) : '');
      }
      const C64 = C(64);
      // 两颗光点沿内外金线反向绕行
      const mote = (r, dur, rev, k) => S(`<g>${spin(dur, rev)}<circle cx="${78 + r}" cy="78" r="${k ? 1.8 : 2.4}" fill="#fff6d8" filter="url(#rg-gl)"/></g>`);
      body = `<defs><filter id="rg-gl" x="-300%" y="-300%" width="700%" height="700%"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`
        + `<mask id="rg-gm">${arc(64, 8, '#fff', p, 'stroke-linecap="round"')}</mask>`
        + track(75, 1, 'var(--gold)') + track(53, 1, 'var(--gold)') + track(64, 6, 'var(--track)')
        + mote(75, 11, false, 0) + mote(53, 17, true, 1)
        + (p > 0 ? arc(64, 6, over ? 'var(--bad)' : 'var(--kcal)', p, 'stroke-linecap="round"')
          + S(`<circle cx="78" cy="78" r="64" fill="none" stroke="#fff" stroke-width="6" stroke-opacity=".7" stroke-dasharray="16 ${(C64 - 16).toFixed(2)}" mask="url(#rg-gm)"><animate attributeName="stroke-dashoffset" from="${C64.toFixed(2)}" to="0" dur="3.4s" repeatCount="indefinite"/></circle>`) : '') + sock;
      break;
    }
    default:
      body = track(64, 13, 'var(--track)') + arc(64, 13, col, p, 'stroke-linecap="round"');
  }
  return `<svg viewBox="0 0 156 156" aria-hidden="true">${body}</svg>`;
}

// 设置页：主题卡片，用各自的颜色和数字字体预览
function themePreviewHTML(t, on) {
  const v = t.pv;
  const numStyle = `font-family:${v.font.replace(/"/g, "'")};font-weight:${v.weight};${v.style ? 'font-style:' + v.style + ';' : ''}${v.num || ''}`;
  const bar = v.rings
    ? `<div class="t-bar" style="background:rgba(250,17,79,.18)"><i style="background:${v.acc};border-radius:4px"></i></div>`
    : `<div class="t-bar" style="background:${v.fg}22"><i style="background:${v.acc}"></i></div>`;
  return `<button class="theme ${on ? 'on' : ''}" style="background:${v.bg};color:${v.fg};${v.box || 'border-radius:14px;'}" onclick="setTheme('${t.id}')" aria-pressed="${on}">
    <div class="t-top">${t.mark ? `<span style="display:inline-flex;--accent:${v.acc};--kcal:#fa114f;--protein:#4cc63f;--carb:#00b8d4">${t.mark}</span>` : ''}<span class="t-name">${t.name}</span></div>
    <div class="t-num" style="${numStyle}">1,918</div>
    ${bar}
    <div class="t-desc">${t.desc}</div>
  </button>`;
}
// 只加载数字子集；跳过当前主题已经完整加载的字体，避免同名字体被子集覆盖
function loadPreviewFonts() {
  const cur = themeConf().fonts || '';
  const q = THEMES.map(t => t.pvFont).filter(f => f && !cur.includes(f.split(':')[0])).join('&');
  loadFont('font-preview', q ? q + '&text=' + encodeURIComponent('0123456789,') : '');
}
