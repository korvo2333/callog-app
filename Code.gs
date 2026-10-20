/**
 * CalLog —— 绑定在 Google 表格上的 Apps Script
 * 它同时负责：① 提供 App 网页（读取 Google Drive 里的 callog.html）② 读写表格 ③ 调用 Claude API
 *
 * 用法：新建 Google 表格 → 扩展程序 → Apps Script → 把这个文件全部粘贴进去 → 填好下面两行
 *      → 把 callog.html 上传到 Google Drive（任意位置）
 *      → 部署 → 新建部署 → 网页应用 → 执行身份「我」→ 访问权限「任何人」
 *      → 手机浏览器打开得到的网址，输入密码，添加到主屏幕。
 *
 * 安卓 App（可选）：装好 APK 后，第一次打开时填这个网页应用的网址（…/exec）和密码，读写走下面的 doPost。
 *
 * 手表步数（可选）：手机装 HC Webhook，网址填「App 设置 → 手表步数」里显示的那一串（就是本网页应用的网址 + ?token=你的密码），
 *      步数分辨率选「每日」(Daily)。更新这个文件后要「管理部署 → 编辑 → 版本：新版本 → 部署」才会生效。
 */

// ════════ 只需要改这两行 ════════
const TOKEN = '';            // App 密码：自己定一串字母数字，第一次打开 App 时输入。一定要设，否则拿到网址的人都能看你的数据、花你的 API 额度
const CLAUDE_API_KEY = '';   // Claude API Key（sk-ant- 开头）

// ════════ 其他配置（一般不用改） ════════
const HTML_FILE_NAME = 'callog.html';   // Google Drive 里网页文件的名字
const DEFAULT_MODEL = 'claude-haiku-5-5';

// 可用模型和价格（美元 / 百万 token，用于估算费用；以 Anthropic 官网价格为准）
const MODELS = {
  'claude-haiku-5-5':  { name: 'Haiku 5.5',  input: 0.10, output: 0.50 },
  'claude-sonnet-5-5': { name: 'Sonnet 5.5', input: 2,    output: 10 },
  'claude-opus-5-5':   { name: 'Opus 5.5',   input: 4,    output: 20 }
};

// ════════ 表结构 ════════
const TABLES = {
  Log:         ['id', 'date', 'time', 'meal', 'name', 'kcal', 'protein', 'fat', 'carb', 'type', 'foodId', 'note', 'updatedAt', 'ratio'],
  Foods:       ['id', 'name', 'category', 'serving', 'kcal', 'protein', 'fat', 'carb', 'uses', 'sort', 'updatedAt'],
  Categories:  ['id', 'name', 'sort'],
  Body:        ['id', 'date', 'weight', 'bodyfat', 'muscle', 'note', 'updatedAt'],
  Settings:    ['key', 'value'],
  AI_Requests: ['id', 'createdAt', 'status', 'model', 'text', 'hasImage', 'result', 'inputTokens', 'outputTokens', 'costUSD', 'error'],
  // 手表步数：每天一行。watch* 是 HC Webhook 推过来的，manual 是你在 App 里手动改的（有手动值时以手动为准）
  Steps:       ['date', 'watch', 'watchFull', 'watchEnd', 'manual', 'updatedAt'],
  HC_Log:      ['at', 'size', 'summary', 'raw']
};
const KEY_COL = { Settings: 'key', Steps: 'date' };   // 其余表用 id
const WRITABLE = ['Log', 'Foods', 'Categories', 'Body', 'Settings', 'Steps'];
const TEXT_COLS = ['id', 'date', 'time', 'meal', 'name', 'type', 'foodId', 'note', 'updatedAt', 'category', 'serving',
                   'key', 'value', 'createdAt', 'status', 'model', 'text', 'result', 'error', 'watchFull', 'watchEnd', 'at', 'summary', 'raw'];

const AI_SYSTEM = [
  '你是专业营养师，根据用户的食物照片和/或文字描述，估算这一餐的热量和三大营养素。',
  '规则：',
  '1. 把一餐拆成独立的食物条目（米饭、主菜、汤、饮料分开），每条给出名称、估计份量、热量 kcal、蛋白质 g、脂肪 g、碳水 g。',
  '2. 用户写明的重量、数量、品牌优先采用；照片里有营养成分表或包装信息时，按成分表和实际份量计算。',
  '3. 没写份量时，按照片里的餐具、包装或常见一人份估计，并在 amount 里写出你假设的份量（如「约200g」「1个」）。',
  '4. 热量要和三大营养素大致吻合（蛋白质、碳水 4kcal/g，脂肪 9kcal/g），烹调用油要算进去。',
  '5. 用户住在日本，常吃便利店、外卖、日式定食、中餐，按对应地区的常见做法估算。',
  '6. name 用简短的中文；note 只在有重要不确定时写，10 个字以内，否则填空字符串。',
  '7. 图片里没有食物、或描述不是食物时，items 返回空数组，并在 note 里说明。'
].join('\n');

// 营养成分表：只读不估
const LABEL_SYSTEM = [
  '你从食品包装上的营养成分表（日本的「栄養成分表示」、中国的「营养成分表」等）照片里读取数值。只读照片上印的数字，不要估算。',
  '规则：',
  '1. basis：成分表写的基准，翻成简短中文，如「每100g」「每1袋(45g)」「每1个」「每1本(200ml)」。',
  '2. basisAmount：基准对应的重量或容量数字（每100g→100；每1袋(45g)→45；每1本(200ml)→200；基准只写了「1个」没写重量→0）。basisUnit：g、ml，或没有重量时为空字符串。',
  '3. kcal、protein、fat、carb：基准量对应的数值。エネルギー只写了 kJ 时换算成 kcal（÷4.184）。只写了糖質和食物繊維、没写炭水化物时，carb = 糖質 + 食物繊維。',
  '4. packageAmount：包装上写的内容量（g 或 ml 的数字，如「内容量 120g」→120），看不到就是 0。packageCount：一包里有几袋 / 几个（如「6本入り」→6），看不到就是 0。',
  '5. name：照片里能看到商品名就用商品名（可保留日文），看不到就写食物种类（如「饼干」）。',
  '6. ok：照片里能清楚读到热量和三大营养素时为 true；看不清或不是营养成分表时为 false，看不清的数字不要猜，填 0。',
  '7. note：只在 ok 为 false 或有看不清的地方时写，10 个字以内，否则填空字符串。'
].join('\n');
const LABEL_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    name: { type: 'string' },
    basis: { type: 'string' },
    basisAmount: { type: 'number' },
    basisUnit: { type: 'string', enum: ['g', 'ml', ''] },
    packageAmount: { type: 'number' },
    packageCount: { type: 'number' },
    kcal: { type: 'number' },
    protein: { type: 'number' },
    fat: { type: 'number' },
    carb: { type: 'number' },
    note: { type: 'string' }
  },
  required: ['ok', 'name', 'basis', 'basisAmount', 'basisUnit', 'packageAmount', 'packageCount', 'kcal', 'protein', 'fat', 'carb', 'note'],
  additionalProperties: false
};

const AI_SCHEMA = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'string' },
          kcal: { type: 'number' },
          protein: { type: 'number' },
          fat: { type: 'number' },
          carb: { type: 'number' }
        },
        required: ['name', 'amount', 'kcal', 'protein', 'fat', 'carb'],
        additionalProperties: false
      }
    },
    note: { type: 'string' }
  },
  required: ['items', 'note'],
  additionalProperties: false
};

// ════════ 入口 ════════
// 打开网址时：返回 App 网页
function doGet() {
  return HtmlService.createHtmlOutput(loadHtml_())
    .setTitle('CalLog')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover')   // 不让手机浏览器缩放页面
    .addMetaTag('apple-mobile-web-app-capable', 'yes')
    .addMetaTag('mobile-web-app-capable', 'yes');
}

// 手表步数：HC Webhook 每隔一段时间把 Health Connect 的步数 POST 到这里（网址后面带 ?token=App 密码）
function doPost(e) {
  const out = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
  try {
    const q = (e && e.parameter) || {};
    const raw = (e && e.postData && e.postData.contents) || '';
    let body;
    try { body = JSON.parse(raw || '{}'); } catch (err) { return out({ ok: false, error: 'bad json' }); }
    // 安卓 App 的读写请求：网址后面不带 token，密码放在请求内容里（和网页版走同一个 handle_）
    if (!q.token && body && typeof body.action === 'string') {
      if (!TOKEN) return out({ ok: false, error: '先在 Code.gs 里设置 TOKEN（密码）' });
      return out(handle_(body));
    }
    // 手表步数（HC Webhook）：密码在网址的 ?token= 里
    if (!TOKEN || q.token !== TOKEN) return out({ ok: false, error: 'token' });   // 没设密码时不接收，防止别人往表里写
    return out(Object.assign({ ok: true }, withLock_(() => ingestHC_(body, raw))));
  } catch (err) {
    return out({ ok: false, error: String((err && err.message) || err) });
  }
}

function loadHtml_() {
  // 优先用项目里名为 index 的 HTML 文件（如果你是直接粘贴进来的）
  try { return HtmlService.createHtmlOutputFromFile('index').getContent(); } catch (err) { /* 没有就用 Drive 里的 */ }
  // 在 Drive 里按文件名找：跳过垃圾桶里的；有多个同名文件时，用最近更新的那个
  let best = null;
  const it = DriveApp.getFilesByName(HTML_FILE_NAME);
  while (it.hasNext()) {
    const f = it.next();
    if (f.isTrashed()) continue;
    if (!best || f.getLastUpdated() > best.getLastUpdated()) best = f;
  }
  if (best) return best.getBlob().getDataAsString('UTF-8');
  return '<meta name="viewport" content="width=device-width"><div style="font:16px sans-serif;padding:24px;line-height:1.7">' +
    '<h3>还差一步</h3>没有在 Google Drive 里找到 <b>' + HTML_FILE_NAME + '</b>。<br>' +
    '请把 callog.html 上传到 Google Drive（文件名保持 callog.html），然后刷新这个页面。</div>';
}

// 网页通过 google.script.run.api(...) 调用这里
function api(reqJson) {
  let req;
  try {
    req = typeof reqJson === 'string' ? JSON.parse(reqJson) : (reqJson || {});
  } catch (err) {
    return { ok: false, error: '请求格式错误' };
  }
  return handle_(req);
}

function handle_(req) {
  try {
    if (TOKEN && req.token !== TOKEN) return { ok: false, error: '密码不正确（检查网页设置里的密码）' };
    if (req.tz && (req.action === 'ping' || req.action === 'steps')) rememberTz_(req.tz);
    switch (req.action) {
      case 'ping':      return ping_();
      case 'bootstrap': return bootstrap_();
      case 'batch':     return withLock_(() => batch_(req.ops || []));
      case 'aiSubmit':  return aiSubmit_(req);
      case 'aiUsage':   return aiUsage_();
      case 'aiLabel':   return aiLabel_(req);
      case 'steps':     return stepsInfo_(req.days);
      default:          return { ok: false, error: '未知操作：' + req.action };
    }
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  }
}

function withLock_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try { return fn(); } finally { lock.releaseLock(); }
}

// ════════ 工作表 ════════
const sheetCache_ = {};

function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheet_(name) {
  if (sheetCache_[name]) return sheetCache_[name];
  const ss = ss_();
  let sh = ss.getSheetByName(name);
  const headers = TABLES[name];
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    headers.forEach((h, i) => {
      if (TEXT_COLS.indexOf(h) >= 0) sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@');
    });
  } else {
    // 补上缺失的列（旧版本表格或用户手动改过表头时）
    const lastCol = Math.max(sh.getLastColumn(), 1);
    const have = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    const missing = headers.filter(h => have.indexOf(h) < 0);
    if (missing.length) {
      const start = have.filter(String).length + 1;
      sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
    }
  }
  sheetCache_[name] = sh;
  return sh;
}

function headers_(sh) {
  const lastCol = Math.max(sh.getLastColumn(), 1);
  return sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
}

function norm_(v, col) {
  if (v instanceof Date) {
    const tz = Session.getScriptTimeZone();
    if (col === 'date') return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
    if (col === 'time') return Utilities.formatDate(v, tz, 'HH:mm');
    return v.toISOString();
  }
  return v;
}

function readTable_(name) {
  const sh = sheet_(name);
  const last = sh.getLastRow();
  if (last <= 1) return [];
  const heads = headers_(sh);
  const values = sh.getRange(2, 1, last - 1, heads.length).getValues();
  const keyCol = KEY_COL[name] || 'id';
  const ki = heads.indexOf(keyCol);
  const rows = [];
  values.forEach(r => {
    if (ki >= 0 && (r[ki] === '' || r[ki] === null)) return;
    const o = {};
    heads.forEach((h, i) => { if (h) o[h] = norm_(r[i], h); });
    rows.push(o);
  });
  return rows;
}

// ════════ 动作 ════════
function apiKey_() {
  const p = PropertiesService.getScriptProperties().getProperty('CLAUDE_API_KEY');
  return String(p || CLAUDE_API_KEY || '').trim();
}

function ping_() {
  Object.keys(TABLES).forEach(sheet_);
  return {
    ok: true,
    sheetUrl: ss_().getUrl(),
    aiReady: !!apiKey_(),
    models: Object.keys(MODELS).map(id => ({ id: id, name: MODELS[id].name, input: MODELS[id].input, output: MODELS[id].output })),
    defaultModel: DEFAULT_MODEL,
    hookUrl: hookUrl_(),
    serverTime: new Date().toISOString()
  };
}

function hookUrl_() {
  try { return ScriptApp.getService().getUrl() || ''; } catch (err) { return ''; }
}

function bootstrap_() {
  const data = {};
  WRITABLE.forEach(t => { data[t] = readTable_(t); });
  return { ok: true, data: data, serverTime: new Date().toISOString() };
}

/**
 * ops: [{op:'upsert', table, row}, {op:'delete', table, id}]
 * upsert 按主键合并：只覆盖传入的字段。
 */
function batch_(ops) {
  const byTable = {};
  ops.forEach(o => {
    if (WRITABLE.indexOf(o.table) < 0) throw new Error('不能写入表：' + o.table);
    (byTable[o.table] = byTable[o.table] || []).push(o);
  });

  Object.keys(byTable).forEach(table => {
    const sh = sheet_(table);
    const heads = headers_(sh);
    const keyCol = KEY_COL[table] || 'id';
    const ki = heads.indexOf(keyCol);
    const last = sh.getLastRow();
    const data = last > 1 ? sh.getRange(2, 1, last - 1, heads.length).getValues() : [];
    const origLen = data.length;
    const index = {};
    data.forEach((r, i) => { if (r[ki] !== '') index[String(r[ki])] = i; });
    const dirty = {};
    const deleted = {};

    byTable[table].forEach(o => {
      if (o.op === 'upsert') {
        const row = o.row || {};
        const key = String(row[keyCol] || '');
        if (!key) return;
        let i = index[key];
        if (i === undefined) {
          i = data.length;
          data.push(heads.map(() => ''));
          index[key] = i;
        }
        heads.forEach((h, c) => {
          if (h && Object.prototype.hasOwnProperty.call(row, h)) {
            const v = row[h];
            data[i][c] = (v === null || v === undefined) ? '' : v;
          }
        });
        dirty[i] = true;
      } else if (o.op === 'delete') {
        const i = index[String(o.id)];
        if (i !== undefined) { deleted[i] = true; delete index[String(o.id)]; }
      }
    });

    // 1) 改动的旧行
    Object.keys(dirty).map(Number).filter(i => i < origLen && !deleted[i]).forEach(i => {
      sh.getRange(i + 2, 1, 1, heads.length).setValues([data[i]]);
    });
    // 2) 新行一次追加
    const appended = [];
    for (let i = origLen; i < data.length; i++) if (!deleted[i]) appended.push(data[i]);
    if (appended.length) sh.getRange(origLen + 2, 1, appended.length, heads.length).setValues(appended);
    // 3) 删除旧行（从下往上）
    Object.keys(deleted).map(Number).filter(i => i < origLen).sort((a, b) => b - a).forEach(i => sh.deleteRow(i + 2));
  });

  return { ok: true, applied: ops.length };
}

// ════════ 手表步数（HC Webhook → Health Connect 的每日步数） ════════
// 步数按手机的时区分天（HC Webhook 也是按手机时区算每天的累计）。App 连接时把手机时区告诉后台，没有时用脚本的时区
function tz_() {
  return PropertiesService.getScriptProperties().getProperty('TZ') || Session.getScriptTimeZone();
}
function rememberTz_(tz) {
  tz = String(tz || '');
  if (tz !== 'UTC' && !/^[A-Za-z]+(\/[A-Za-z0-9_+\-]+){1,2}$/.test(tz)) return;
  const props = PropertiesService.getScriptProperties();
  if (props.getProperty('TZ') !== tz) props.setProperty('TZ', tz);
}

/**
 * HC Webhook 的步数（步数分辨率 =「每日」Daily）：每个本地日一条 {count, start_time, end_time}，count 是这一天到 end_time 为止的累计步数。
 * start_time 正好是当天 0:00 的是「整天」的累计；最早那条可能只覆盖半天（start_time 不是 0:00），只当下限用。
 * 选了「完整」或「N 分钟」时推过来的是一小段一小段的步数，不是每天的累计（而且手机和手表的会重复），这种不写入，只提示改设置。
 */
function ingestHC_(body, raw) {
  const tz = tz_();
  const now = new Date();
  const ts = new Date(body && body.timestamp);
  const ref = isNaN(ts) ? now : ts;   // 手机发出这次同步的时间
  const recs = [];
  (Array.isArray(body && body.steps) ? body.steps : []).forEach(s => {
    const count = Math.round(Number(s && s.count));
    const start = new Date(s && s.start_time), end = new Date(s && s.end_time);
    if (!isFinite(count) || count < 0 || isNaN(start) || isNaN(end)) return;
    recs.push({ count: count, start: start, end: end });
  });
  recs.sort((a, b) => a.start - b.start);
  const hm = d => Utilities.formatDate(d, tz, 'HH:mm');
  // 每日累计的样子：从当天 0:00 开始（最早那条可以不是），到第二天 0:00 或同步的那一刻结束
  const dailyShape = recs.every((r, i) => (i === 0 || hm(r.start) === '00:00')
    && (hm(r.end) === '00:00' || r.end >= ref || ref - r.end < 10 * 60000));

  const byDate = {};
  recs.forEach(r => {
    const date = Utilities.formatDate(r.start, tz, 'yyyy-MM-dd');
    const full = hm(r.start) === '00:00';
    const end = r.end > now ? now : r.end;   // 结束时间在将来（手动选日期同步时）按现在算
    const cur = byDate[date];
    if (!cur) byDate[date] = { count: r.count, full: full, end: end, n: 1 };
    else { cur.count += r.count; cur.full = false; if (end > cur.end) cur.end = end; cur.n++; }
  });
  const dates = Object.keys(byDate).sort();
  const ok = dailyShape && !dates.some(d => byDate[d].n > 1);

  const ops = [];
  if (ok) {
    const have = {};
    readTable_('Steps').forEach(r => { have[r.date] = r; });
    dates.forEach(date => {
      const nw = byDate[date], old = have[date] || {};
      const oldFull = old.watchFull === 'yes', oldEnd = old.watchEnd ? new Date(old.watchEnd) : null, oldCount = Number(old.watch) || 0;
      let take = false;
      if (nw.full) take = !oldFull || !oldEnd || nw.end > oldEnd || (+nw.end === +oldEnd && nw.count !== oldCount);   // 整天累计：取时间更晚的那次
      else if (!oldFull) take = nw.count > oldCount;                                                                 // 只有半天：取较大的
      if (!take) return;
      ops.push({ op: 'upsert', table: 'Steps', row: {
        date: date, watch: nw.count, watchFull: nw.full ? 'yes' : '', watchEnd: nw.end.toISOString(), updatedAt: now.toISOString()
      } });
    });
    if (ops.length) batch_(ops);
  }

  const summary = !recs.length ? '没有步数'
    : ok ? dates.map(d => d.slice(5) + ' ' + byDate[d].count + (byDate[d].full ? '' : '*')).join('，')
    : '没写入：不是每日累计（HC Webhook 步数分辨率要选「每日」）';
  logHC_(now, raw, summary);
  PropertiesService.getScriptProperties().setProperty('HC_LAST', JSON.stringify({ at: now.toISOString(), summary: summary, warn: recs.length && !ok ? 'daily' : '' }));
  return { steps: recs.length, updated: ops.length, daily: ok };
}

function logHC_(now, raw, summary) {
  const sh = sheet_('HC_Log');
  sh.appendRow([now.toISOString(), raw.length, summary, String(raw).slice(0, 40000)]);
  const extra = sh.getLastRow() - 1 - 60;   // 只留最近 60 次
  if (extra > 0) sh.deleteRows(2, extra);
}

function stepsInfo_(days) {
  const n = Math.min(Math.max(Number(days) || 21, 1), 120);
  const tz = tz_();
  const from = Utilities.formatDate(new Date(Date.now() - n * 86400000), tz, 'yyyy-MM-dd');
  let last = null;
  try { last = JSON.parse(PropertiesService.getScriptProperties().getProperty('HC_LAST') || 'null'); } catch (err) { /* 忽略 */ }
  return { ok: true, rows: readTable_('Steps').filter(r => r.date >= from), last: last };
}

// ════════ AI（Claude API） ════════
function costOf_(model, inTok, outTok) {
  const m = MODELS[model] || MODELS[DEFAULT_MODEL];
  return (inTok * m.input + outTok * m.output) / 1e6;
}

/** req: {id, text, image: base64 jpeg（可选）, model} */
function aiSubmit_(req) {
  const id = String(req.id || '');
  if (!/^AI-[a-z0-9]{4,12}$/i.test(id)) throw new Error('请求编号格式不对');
  const text = String(req.text || '').slice(0, 2000);
  if (!text && !req.image) throw new Error('没有图片也没有描述');
  const model = MODELS[req.model] ? req.model : DEFAULT_MODEL;
  const key = apiKey_();
  if (!key) throw new Error('还没有设置 Claude API Key（在 Code.gs 里填 CLAUDE_API_KEY 后重新部署）');

  const log = { id: id, createdAt: new Date().toISOString(), model: model, text: text, hasImage: req.image ? 'yes' : '' };
  let r;
  try {
    r = callClaude_(key, model, text, req.image);
  } catch (err) {
    log.status = 'error';
    log.error = String(err.message || err);
    if (err.usage) {
      log.inputTokens = err.usage.input_tokens || 0;
      log.outputTokens = err.usage.output_tokens || 0;
      log.costUSD = costOf_(model, log.inputTokens, log.outputTokens);
    }
    appendAI_(log);
    throw err;
  }
  const cost = costOf_(model, r.inputTokens, r.outputTokens);
  const parsed = parseAI_(r.text);
  Object.assign(log, { status: 'done', result: r.text, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUSD: cost });
  appendAI_(log);
  return {
    ok: true, id: id, status: 'done', items: parsed.items, note: parsed.note, raw: parsed.ok ? '' : r.text,
    usage: { model: model, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUSD: cost }
  };
}

/** 营养成分表照片 → 基准量的热量和三大营养素。req: {id, image: base64 jpeg, model} */
function aiLabel_(req) {
  const id = String(req.id || '');
  if (!/^AI-[a-z0-9]{4,12}$/i.test(id)) throw new Error('请求编号格式不对');
  if (!req.image) throw new Error('没有照片');
  const model = MODELS[req.model] ? req.model : DEFAULT_MODEL;
  const key = apiKey_();
  if (!key) throw new Error('还没有设置 Claude API Key（在 Code.gs 里填 CLAUDE_API_KEY 后重新部署）');
  const log = { id: id, createdAt: new Date().toISOString(), model: model, text: '[营养成分表]', hasImage: 'yes' };
  let r;
  try {
    r = callClaude_(key, model, '请读取这张营养成分表。', req.image, LABEL_SYSTEM, LABEL_SCHEMA);
  } catch (err) {
    log.status = 'error'; log.error = String(err.message || err);
    if (err.usage) { log.inputTokens = err.usage.input_tokens || 0; log.outputTokens = err.usage.output_tokens || 0; log.costUSD = costOf_(model, log.inputTokens, log.outputTokens); }
    appendAI_(log);
    throw err;
  }
  const cost = costOf_(model, r.inputTokens, r.outputTokens);
  Object.assign(log, { status: 'done', result: r.text, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUSD: cost });
  appendAI_(log);
  let o = {};
  try { const t = String(r.text).replace(/```(json)?/gi, ''); o = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1)); } catch (err) { o = { ok: false, note: '没能读出结果' }; }
  const label = {
    ok: !!o.ok, name: String(o.name || '').trim(), basis: String(o.basis || '').trim(),
    basisAmount: toNum_(o.basisAmount), basisUnit: o.basisUnit === 'g' || o.basisUnit === 'ml' ? o.basisUnit : '',
    packageAmount: toNum_(o.packageAmount), packageCount: toNum_(o.packageCount),
    kcal: toNum_(o.kcal), protein: toNum_(o.protein), fat: toNum_(o.fat), carb: toNum_(o.carb), note: String(o.note || '')
  };
  return { ok: true, id: id, label: label, usage: { model: model, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUSD: cost } };
}

function appendAI_(row) {
  try {
    withLock_(() => {
      const sh = sheet_('AI_Requests');
      sh.appendRow(headers_(sh).map(h => (row[h] === undefined ? '' : row[h])));
    });
  } catch (err) { /* 记录失败不影响返回结果 */ }
}

function callClaude_(key, model, text, imageB64, system, schema) {
  const content = [];
  if (imageB64) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageB64 } });
  content.push({ type: 'text', text: system ? text : (text ? '这一餐：' + text : '请识别照片里的食物并估算营养。') });

  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    muteHttpExceptions: true,
    payload: JSON.stringify({
      model: model,
      max_tokens: 2048,
      system: system || AI_SYSTEM,
      messages: [{ role: 'user', content: content }],
      output_config: { format: { type: 'json_schema', schema: schema || AI_SCHEMA } }
    })
  });
  const code = res.getResponseCode();
  let data = {};
  try { data = JSON.parse(res.getContentText() || '{}'); } catch (err) { /* 非 JSON */ }
  if (code !== 200) {
    const msg = (data.error && data.error.message) || ('HTTP ' + code);
    if (code === 401) throw new Error('Claude API Key 无效，检查 Code.gs 里的 CLAUDE_API_KEY');
    if (/credit balance/i.test(msg)) throw new Error('Claude API 余额不足，去 Claude Console 的 Billing 充值');
    if (code === 429) throw new Error('请求太频繁，稍等一下再试');
    if (code === 529 || code === 503) throw new Error('Claude 暂时繁忙，稍后再试');
    throw new Error('Claude API：' + msg);
  }
  const usage = data.usage || {};
  const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  if (data.stop_reason === 'refusal' || data.stop_reason === 'max_tokens' || !out) {
    const e = new Error(data.stop_reason === 'max_tokens' ? '结果太长被截断，试着拆成几次识别' : 'Claude 没有返回结果（' + data.stop_reason + '）');
    e.usage = usage;
    throw e;
  }
  return { text: out, inputTokens: usage.input_tokens || 0, outputTokens: usage.output_tokens || 0 };
}

function toNum_(v) {
  if (typeof v === 'number') return isFinite(v) ? Math.max(0, Math.round(v * 10) / 10) : 0;
  const m = String(v || '').replace(/[,，]/g, '').match(/-?\d+(\.\d+)?/);
  return m ? Math.max(0, Math.round(parseFloat(m[0]) * 10) / 10) : 0;
}

function parseAI_(raw) {
  const s = String(raw || '').replace(/```(json)?/gi, '');
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a < 0 || b <= a) return { ok: false, items: [], note: '' };
  let obj;
  try {
    obj = JSON.parse(s.slice(a, b + 1));
  } catch (err) {
    return { ok: false, items: [], note: '' };
  }
  let items = Array.isArray(obj.items) ? obj.items : (obj.name ? [obj] : []);
  items = items.map(it => ({
    name: String(it.name || '食物').trim(),
    amount: String(it.amount || '').trim(),
    kcal: toNum_(it.kcal), protein: toNum_(it.protein), fat: toNum_(it.fat), carb: toNum_(it.carb)
  }));
  return { ok: true, items: items, note: String(obj.note || '') };
}

/** 本月和累计的 AI 用量 */
function aiUsage_() {
  const tz = tz_();
  const month = Utilities.formatDate(new Date(), tz, 'yyyy-MM');
  const rows = readTable_('AI_Requests');
  const sum = list => ({
    count: list.filter(r => r.status === 'done').length,
    inputTokens: list.reduce((s, r) => s + (Number(r.inputTokens) || 0), 0),
    outputTokens: list.reduce((s, r) => s + (Number(r.outputTokens) || 0), 0),
    costUSD: list.reduce((s, r) => s + (Number(r.costUSD) || 0), 0)
  });
  const thisMonth = rows.filter(r => {
    const d = new Date(r.createdAt);
    return !isNaN(d) && Utilities.formatDate(d, tz, 'yyyy-MM') === month;
  });
  return { ok: true, month: month, thisMonth: sum(thisMonth), total: sum(rows) };
}

// 只允许在编辑器里由你本人运行（防止别人通过网页调用）
function ownerOnly_() {
  const me = Session.getEffectiveUser().getEmail();
  if (!me || Session.getActiveUser().getEmail() !== me) throw new Error('只能在 Apps Script 编辑器里运行');
}

/** 在编辑器里运行：检查表格、Drive 里的网页文件和 API Key，并完成授权 */
function setup() {
  ownerOnly_();
  const r = ping_();
  Logger.log('表格：' + r.sheetUrl);
  Logger.log('网页文件 ' + HTML_FILE_NAME + '：' + (DriveApp.getFilesByName(HTML_FILE_NAME).hasNext() ? '找到了 ✓' : '还没上传'));
  Logger.log('App 密码：' + (TOKEN ? '已设置 ✓' : '未设置（不安全）'));
  Logger.log('Claude API Key：' + (r.aiReady ? '已设置 ✓' : '未设置'));
  Logger.log('手表步数网址（填进 HC Webhook）：' + (TOKEN && r.hookUrl ? r.hookUrl + '?token=' + TOKEN : '部署成网页应用并设好 TOKEN 后会显示在这里'));
}

/** 在编辑器里运行：测试 Claude API 能不能通（会花约 0.0003 美元） */
function testClaude() {
  ownerOnly_();
  const r = aiSubmit_({ id: 'AI-test01', text: '一个金枪鱼蛋黄酱饭团和一杯 200ml 无糖豆浆' });
  Logger.log(JSON.stringify(r, null, 2));
}

/**
 * 在编辑器里运行一次：把「commonfood」工作表里的食物导入 App 的食物库（Foods），
 * 同时按 category 列建好分类（如果旧版本建过示例食物，也会一并删掉）。可以重复运行，已有的同名食物会跳过。
 */
function importCommonFood() {
  ownerOnly_();
  const src = ss_().getSheetByName('commonfood');
  if (!src) throw new Error('找不到名为 commonfood 的工作表');
  const values = src.getDataRange().getValues();
  const heads = values.shift().map(h => String(h).trim().toLowerCase());
  const col = names => heads.findIndex(h => names.indexOf(h) >= 0);
  const ci = {
    name: col(['food_name', 'name', '食物', '名称']),
    kcal: col(['carlories', 'calories', 'calorie', 'kcal', '热量', '卡路里']),
    protein: col(['protein', '蛋白质']),
    fat: col(['fat', '脂肪']),
    carb: col(['carb', 'carbs', '碳水']),
    category: col(['category', '分类']),
    serving: col(['serving', '份量'])
  };
  if (ci.name < 0) throw new Error('commonfood 第一行里没有 food_name 列');
  const num = v => { const n = parseFloat(v); return isFinite(n) ? Math.round(n * 10) / 10 : 0; };
  const get = (r, k) => (ci[k] >= 0 ? r[ci[k]] : '');

  const rows = [];
  const seen = {};
  values.forEach(r => {
    const name = String(get(r, 'name') || '').trim();
    if (!name || seen[name]) return;   // 跳过空行和重复行
    seen[name] = true;
    const f = {
      name: name, category: String(get(r, 'category') || '').trim(), serving: String(get(r, 'serving') || '').trim(),
      kcal: num(get(r, 'kcal')), protein: num(get(r, 'protein')), fat: num(get(r, 'fat')), carb: num(get(r, 'carb'))
    };
    if (!f.kcal) f.kcal = Math.round(f.protein * 4 + f.fat * 9 + f.carb * 4);
    rows.push(f);
  });

  const foods = readTable_('Foods');
  const cats = readTable_('Categories');
  const keep = foods.filter(f => !/^f_seed_/.test(String(f.id)));
  const have = {};
  keep.forEach(f => { have[f.name] = true; });
  const ops = [];
  foods.filter(f => /^f_seed_/.test(String(f.id))).forEach(f => ops.push({ op: 'delete', table: 'Foods', id: f.id }));

  const now = new Date().toISOString();
  const stamp = Date.now().toString(36);
  let sort = keep.length, added = 0, skipped = 0;
  rows.forEach((f, i) => {
    if (have[f.name]) { skipped++; return; }
    ops.push({ op: 'upsert', table: 'Foods', row: Object.assign({ id: 'f_imp_' + stamp + '_' + i, uses: 0, sort: ++sort, updatedAt: now }, f) });
    added++;
  });

  // 分类：去掉没用到的示例分类，按出现顺序加上新的
  const used = {};
  keep.concat(rows).forEach(f => { if (f.category) used[f.category] = true; });
  const catNames = {};
  cats.forEach(c => {
    if (/^c_[1-6]$/.test(String(c.id)) && !used[c.name]) ops.push({ op: 'delete', table: 'Categories', id: c.id });
    else catNames[c.name] = true;
  });
  let csort = cats.length;
  Object.keys(used).forEach((name, i) => {
    if (catNames[name]) return;
    ops.push({ op: 'upsert', table: 'Categories', row: { id: 'c_imp_' + stamp + '_' + i, name: name, sort: ++csort } });
    catNames[name] = true;
  });

  withLock_(() => batch_(ops));
  Logger.log('导入 ' + added + ' 个食物' + (skipped ? '，跳过已存在的 ' + skipped + ' 个' : '') + '；分类：' + Object.keys(used).join('、'));
}
