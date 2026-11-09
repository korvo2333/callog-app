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
 *      步数分辨率选「完整」(Full)（「每日」也能用，但白天只算到一部分，见下面 ingestHC_ 的说明）。
 *      更新这个文件后要「管理部署 → 编辑 → 版本：新版本 → 部署」才会生效。
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
  // ratio：有氧计入占 kcal 的 %；detail：有氧怎么算的（JSON：种类、时长、MET / 速度、体重、静息、步数…）
  Log:         ['id', 'date', 'time', 'meal', 'name', 'kcal', 'protein', 'fat', 'carb', 'type', 'foodId', 'note', 'updatedAt', 'ratio', 'detail'],
  Foods:       ['id', 'name', 'category', 'serving', 'kcal', 'protein', 'fat', 'carb', 'uses', 'sort', 'updatedAt'],
  Categories:  ['id', 'name', 'sort'],
  Body:        ['id', 'date', 'weight', 'bodyfat', 'muscle', 'note', 'updatedAt'],
  Settings:    ['key', 'value'],
  AI_Requests: ['id', 'createdAt', 'status', 'model', 'text', 'hasImage', 'result', 'inputTokens', 'outputTokens', 'costUSD', 'error'],
  // 手表步数：每天一行。watch* 是 HC Webhook 推过来的（watchSrc：用的是哪个 App 写的步数），manual 是你在 App 里手动填的
  Steps:       ['date', 'watch', 'watchFull', 'watchEnd', 'manual', 'updatedAt', 'watchSrc'],
  // HC Webhook「完整」分辨率推来的每条 Health Connect 步数记录（按记录 id 存；只留最近 35 天）
  StepRecs:    ['id', 'date', 'origin', 'device', 'start', 'end', 'count', 'modified', 'updatedAt'],
  HC_Log:      ['at', 'size', 'summary', 'raw']
};
const KEY_COL = { Settings: 'key', Steps: 'date' };   // 其余表用 id
const WRITABLE = ['Log', 'Foods', 'Categories', 'Body', 'Settings', 'Steps'];
const TEXT_COLS = ['id', 'date', 'time', 'meal', 'name', 'type', 'foodId', 'note', 'updatedAt', 'category', 'serving',
                   'key', 'value', 'createdAt', 'status', 'model', 'text', 'result', 'error', 'watchFull', 'watchEnd', 'at', 'summary', 'raw', 'detail',
                   'watchSrc', 'origin', 'device', 'start', 'end', 'modified'];

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

// 有氧：从手表截图 / 器械屏幕读数据、判断种类；热量由 App 按公式算（AI 不算最终热量）
const CARDIO_SYSTEM = [
  '你从运动截图（手表或手机的运动记录）或健身器械屏幕的照片里，读出这一次有氧运动的数据。热量由 App 按固定公式计算（总消耗 − 静息 − 步数里已算），你只负责读数和判断，不要自己算最终热量。',
  '规则：',
  '1. kind：椭圆机 / 交叉训练机（クロストレーナー）→ ell；跑步机（トレッドミル，走或跑，含爬坡）→ tread；户外或没说明器械的跑步 → run；拳击、踢拳、搏击类课程或练习 → box；其他（单车、划船、游泳、爬楼机、HIIT 等）→ other。',
  '2. 只读屏幕上真实显示的数字，看不清或没有就填 0，不要猜：minutes（换算成分钟，49:47 → 49.8）、deviceKcal、speedKmh（mph × 1.609；只有配速时 60 ÷ 每公里分钟数）、inclinePct、distanceKm（英里 × 1.609）、avgHr、maxHr、watts、steps（这段运动里记到的步数）。器械屏幕上的平均速度优先于最高速度。',
  '3. deviceKcal：这次运动的消耗（消費 / 消费 / 总消耗 / Total / Calories）。只有「活动 / Active / アクティブ」消耗时 kcalType = active；是总消耗或看不出时 total；没有消耗数字时 unknown、deviceKcal = 0。',
  '4. met：屏幕显示平均 MET（METs）时照抄，metFrom = screen。屏幕没有 MET，也没有消耗 kcal、速度、距离可用时，按 2024 Adult Compendium of Physical Activities 估一个 MET（结合心率、功率和用户的描述），metFrom = estimate；其他情况 met = 0、metFrom = none。参考：椭圆机中等 5.0 / 高强度 9.0；拳击沙袋 5.8、手靶或对练 7.8、连续模拟回合 9.3；踢拳 7.3；跳绳 11.0；划船机 <100 W 5.0、100–149 W 7.5；爬楼机 9.3；HIIT 中等 7.0。',
  '5. gait（只对跑步机 / 跑步）：走 walk、跑 run，看不出 unknown。',
  '6. watchWorn：截图是手表 / 手机的运动记录 → yes；用户说没戴手表 → no；只有器械屏幕、看不出 → unknown。',
  '7. name：简短中文名，如「椭圆机」「跑步机爬坡」「拳击课」「动感单车」。',
  '8. ok：能读出（或用户写明了）时长，并且有消耗 kcal、MET、速度、距离中的至少一种，或能按描述估 MET 时为 true；不是运动记录、或连时长都不知道时为 false。',
  '9. note：40 字以内，写需要用户核对的地方。屏幕上同时有 kcal/h（或 kcal 和时长）和 MET 时，算一下机器假设的体重（kcal/h ÷ MET），和用户体重差 3 kg 以上就写出来，如「机器按约 85 kg 计算，App 会按你的体重换算」。没有要说的就填空字符串。'
].join('\n');
const CARDIO_SCHEMA = {
  type: 'object',
  properties: {
    ok: { type: 'boolean' },
    kind: { type: 'string', enum: ['ell', 'tread', 'run', 'box', 'other'] },
    name: { type: 'string' },
    minutes: { type: 'number' },
    deviceKcal: { type: 'number' },
    kcalType: { type: 'string', enum: ['total', 'active', 'unknown'] },
    met: { type: 'number' },
    metFrom: { type: 'string', enum: ['screen', 'estimate', 'none'] },
    speedKmh: { type: 'number' },
    inclinePct: { type: 'number' },
    gait: { type: 'string', enum: ['walk', 'run', 'unknown'] },
    distanceKm: { type: 'number' },
    avgHr: { type: 'number' },
    maxHr: { type: 'number' },
    watts: { type: 'number' },
    steps: { type: 'number' },
    watchWorn: { type: 'string', enum: ['yes', 'no', 'unknown'] },
    note: { type: 'string' }
  },
  required: ['ok', 'kind', 'name', 'minutes', 'deviceKcal', 'kcalType', 'met', 'metFrom', 'speedKmh', 'inclinePct', 'gait',
             'distanceKm', 'avgHr', 'maxHr', 'watts', 'steps', 'watchWorn', 'note'],
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
      case 'aiCardio':  return aiCardio_(req);
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
 * HC Webhook 推来的步数。两种分辨率：
 *
 * 「完整」(Full，推荐)：每条 Health Connect 记录原样推来，带 metadata（id、写入的 App、设备、修改时间）。
 *   三星健康把一天的步数写成「0:00 到 24:00」的一条记录，白天不停更新这一条的数。这里按 id 存下每条记录，
 *   自己按天加总，所以白天也是三星健康上的数。见 ingestHCRecords_。
 *
 * 「每日」(Daily)：每个本地日一条 {count, start_time, end_time}，是 Health Connect 从 0:00 到同步那一刻的合计。
 *   问题：Health Connect 合计时，跨过查询结束时间的记录只按落在范围里的时间比例算。三星健康那条记录要到 24:00 才结束，
 *   所以白天同步到的只有「已过时间 / 24 小时」那么多（中午约一半），要到第二天整天查询才是全数。
 *   start_time 正好是当天 0:00 的是「整天」的累计；最早那条可能只覆盖半天（start_time 不是 0:00），只当下限用。
 *
 * 「N 分钟」：一小段一小段的合计，没有记录 id，没法去重，不写入，只提示改成「完整」。
 */
function ingestHC_(body, raw) {
  const tz = tz_();
  const now = new Date();
  const list = Array.isArray(body && body.steps) ? body.steps : [];
  const dels = (Array.isArray(body && body.deleted) ? body.deleted : [])
    .filter(d => d && d.type === 'steps' && d.id).map(d => String(d.id));
  const withId = list.filter(s => s && s.metadata && s.metadata.id);
  if (withId.length || (dels.length && !list.length)) return ingestHCRecords_(withId, dels, raw, tz, now);

  const ts = new Date(body && body.timestamp);
  const ref = isNaN(ts) ? now : ts;   // 手机发出这次同步的时间
  const recs = [];
  list.forEach(s => {
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
      if (old.watchSrc && old.watchSrc !== 'daily') return;   // 这天已经有「完整」模式按记录算出的数，以它为准
      const oldFull = old.watchFull === 'yes', oldEnd = old.watchEnd ? new Date(old.watchEnd) : null, oldCount = Number(old.watch) || 0;
      let take = false;
      if (nw.full) take = !oldFull || !oldEnd || nw.end > oldEnd || (+nw.end === +oldEnd && nw.count !== oldCount);   // 整天累计：取时间更晚的那次
      else if (!oldFull) take = nw.count > oldCount;                                                                 // 只有半天：取较大的
      if (!take) return;
      ops.push({ op: 'upsert', table: 'Steps', row: {
        date: date, watch: nw.count, watchFull: nw.full ? 'yes' : '', watchEnd: nw.end.toISOString(), watchSrc: 'daily', updatedAt: now.toISOString()
      } });
    });
    if (ops.length) batch_(ops);
  }

  const summary = !recs.length ? '没有步数'
    : ok ? dates.map(d => d.slice(5) + ' ' + byDate[d].count + (byDate[d].full ? '' : '*')).join('，') + '（每日）'
    : '没写入：按 N 分钟分段的步数（HC Webhook 步数分辨率要选「完整」）';
  logHC_(now, raw, summary);
  PropertiesService.getScriptProperties().setProperty('HC_LAST', JSON.stringify({
    at: now.toISOString(), summary: summary, mode: ok ? 'daily' : 'bucket', warn: recs.length && !ok ? 'bucket' : '' }));
  return { steps: recs.length, updated: ops.length, daily: ok, mode: ok ? 'daily' : 'bucket' };
}

// 「完整」分辨率：按记录 id 存（编辑过的记录同 id 覆盖，deleted 里的删掉），再按天重算这天的步数
function ingestHCRecords_(list, dels, raw, tz, now) {
  const day = d => Utilities.formatDate(d, tz, 'yyyy-MM-dd');
  const byId = {};
  readTable_('StepRecs').forEach(r => { byId[String(r.id)] = r; });
  const touched = {};
  let n = 0;
  list.forEach(s => {
    const count = Math.round(Number(s.count));
    const start = new Date(s.start_time), end = new Date(s.end_time);
    if (!isFinite(count) || count < 0 || isNaN(start) || isNaN(end)) return;
    const m = s.metadata || {}, dv = m.device || {}, id = String(m.id);
    const old = byId[id], date = day(start), mod = new Date(m.last_modified_time);
    if (old && old.date !== date) touched[old.date] = true;
    byId[id] = { id: id, date: date, origin: String(m.data_origin || ''), device: String(dv.model || dv.manufacturer || dv.type || ''),
      start: start.toISOString(), end: end.toISOString(), count: count, modified: isNaN(mod) ? '' : mod.toISOString(), updatedAt: now.toISOString() };
    touched[date] = true; n++;
  });
  dels.forEach(id => { if (byId[id]) { touched[byId[id].date] = true; delete byId[id]; } });

  const all = Object.keys(byId).map(k => byId[k]);
  const onDay = {};
  all.forEach(r => { (onDay[r.date] = onDay[r.date] || []).push(r); });
  const t = day(now);
  const ops = [];
  Object.keys(touched).sort().forEach(date => {
    const best = stepsOfDay_(onDay[date] || []);
    const end = date < t ? Utilities.parseDate(nextDay_(date), tz, 'yyyy-MM-dd')   // 过完的日子：整天
      : (best.modified ? new Date(best.modified) : now);                            // 今天：写入的 App 最后一次更新的时间
    ops.push({ op: 'upsert', table: 'Steps', row: { date: date, watch: best.count, watchFull: 'yes', watchEnd: (end > now ? now : end).toISOString(),
      watchSrc: best.origin || 'records', updatedAt: now.toISOString() } });
    touched[date] = best;
  });

  // 表不越变越大：只留 35 天；3 天前的日子只留算出步数的那一组（其他来源的零碎记录不再需要）
  const keepFrom = addDay_(t, -35), slimBefore = addDay_(t, -2);
  const winner = {};
  Object.keys(onDay).forEach(date => { if (date < slimBefore) winner[date] = stepsOfDay_(onDay[date]).key; });
  const kept = all.filter(r => r.date >= keepFrom && (r.date >= slimBefore || groupKey_(r) === winner[r.date]))
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
  writeTable_('StepRecs', kept);
  if (ops.length) batch_(ops);

  const dates = Object.keys(touched).sort();
  const summary = (dates.length ? dates.map(d => d.slice(5) + ' ' + touched[d].count + ' ' + shortOrigin_(touched[d].origin)).join('，') : '没有步数')
    + '（完整，' + n + ' 条' + (dels.length ? '，删 ' + dels.length + ' 条' : '') + '）';
  logHC_(now, raw, summary);
  PropertiesService.getScriptProperties().setProperty('HC_LAST', JSON.stringify({ at: now.toISOString(), summary: summary, mode: 'records', warn: '' }));
  return { steps: n, updated: ops.length, daily: false, mode: 'records' };
}

// 一天的步数：按「写入的 App + 设备」分组。同一组里时间重叠的记录是同一段步数（比如整天那条和它的旧版本），取大的；
// 不重叠的相加。不同组记的是同一批步数（手机、手表、三星健康的合并数），相加会重复，所以取步数最多的那一组
function stepsOfDay_(rows) {
  const groups = {};
  rows.forEach(r => { const k = groupKey_(r); (groups[k] = groups[k] || []).push(r); });
  let best = { count: 0, key: '', origin: '', modified: '' };
  Object.keys(groups).forEach(k => {
    const g = groups[k].slice().sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    let total = 0, cEnd = '', cMax = 0, mod = '';
    g.forEach(r => {
      const c = Number(r.count) || 0;
      if (cEnd && r.start < cEnd) { cMax = Math.max(cMax, c); if (r.end > cEnd) cEnd = r.end; }
      else { total += cMax; cMax = c; cEnd = r.end; }
      if (r.modified > mod) mod = r.modified;
    });
    total += cMax;
    if (total > best.count) best = { count: total, key: k, origin: g[0].origin, modified: mod };
  });
  return best;
}
const groupKey_ = r => String(r.origin) + '|' + String(r.device);
const nextDay_ = d => addDay_(d, 1);
function addDay_(d, n) { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function shortOrigin_(o) {
  return { 'com.sec.android.app.shealth': '三星健康', 'com.google.android.apps.fitness': 'Google Fit', 'com.google.android.apps.healthdata': '手机', android: '手机' }[o] || o;
}
// 整张表重写（StepRecs 每次都整体读写，比一行一行删快）
function writeTable_(name, rows) {
  const sh = sheet_(name), heads = headers_(sh), last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, heads.length).clearContent();
  if (rows.length) sh.getRange(2, 1, rows.length, heads.length).setValues(rows.map(r => heads.map(h => (r[h] === undefined || r[h] === null ? '' : r[h]))));
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

/** 有氧：运动截图 / 器械屏幕照片（和 / 或一句描述）→ 读出的数据。req: {id, image: base64 jpeg（可选）, text, model, state: App 发来的最新状态} */
function aiCardio_(req) {
  const id = String(req.id || '');
  if (!/^AI-[a-z0-9]{4,12}$/i.test(id)) throw new Error('请求编号格式不对');
  const text = String(req.text || '').slice(0, 500);
  if (!text && !req.image) throw new Error('没有图片也没有描述');
  const model = MODELS[req.model] ? req.model : DEFAULT_MODEL;
  const key = apiKey_();
  if (!key) throw new Error('还没有设置 Claude API Key（在 Code.gs 里填 CLAUDE_API_KEY 后重新部署）');
  const prompt = cardioStateText_(req.state) + '\n\n' + (req.image ? '请读取照片里的这次运动。' : '没有照片，按用户的描述判断。') + (text ? '\n用户补充：' + text : '');
  const log = { id: id, createdAt: new Date().toISOString(), model: model, text: '[有氧] ' + text, hasImage: req.image ? 'yes' : '' };
  let r;
  try {
    r = callClaude_(key, model, prompt, req.image, CARDIO_SYSTEM, CARDIO_SCHEMA);
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
  const pick = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  const cardio = {
    ok: !!o.ok, kind: pick(o.kind, ['ell', 'tread', 'run', 'box', 'other'], 'other'), name: String(o.name || '').trim().slice(0, 20),
    minutes: toNum_(o.minutes), deviceKcal: toNum_(o.deviceKcal), kcalType: pick(o.kcalType, ['total', 'active', 'unknown'], 'unknown'),
    met: toNum_(o.met), metFrom: pick(o.metFrom, ['screen', 'estimate', 'none'], 'none'),
    speedKmh: toNum_(o.speedKmh), inclinePct: toNum_(o.inclinePct), gait: pick(o.gait, ['walk', 'run', 'unknown'], 'unknown'),
    distanceKm: toNum_(o.distanceKm), avgHr: toNum_(o.avgHr), maxHr: toNum_(o.maxHr), watts: toNum_(o.watts), steps: toNum_(o.steps),
    watchWorn: pick(o.watchWorn, ['yes', 'no', 'unknown'], 'unknown'), note: String(o.note || '').slice(0, 80)
  };
  return { ok: true, id: id, cardio: cardio, usage: { model: model, inputTokens: r.inputTokens, outputTokens: r.outputTokens, costUSD: cost } };
}

// App 发来的「最新状态」→ 给 AI 的一段说明（只取数字，防止塞进别的内容）
function cardioStateText_(st) {
  st = st && typeof st === 'object' ? st : {};
  const n = v => { const x = Number(v); return isFinite(x) ? Math.round(x * 100) / 100 : 0; };
  const d = v => (/^\d{4}-\d{2}-\d{2}/.test(String(v || '')) ? String(v).slice(0, 10) : '');
  const lines = ['用户的最新状态（App 用这些数字按公式计算热量；你用来判断强度、核对机器设定的体重）：'];
  if (n(st.kg)) lines.push('- 体重：' + (st.kgSrc === '7d' ? '近 7 天平均 ' + n(st.kg) + ' kg（' + n(st.kgN) + ' 次称重）' : n(st.kg) + ' kg') +
    (n(st.lastKg) && d(st.lastKgDate) ? '；最近一次 ' + n(st.lastKg) + ' kg（' + d(st.lastKgDate) + '）' : ''));
  if (n(st.bf)) lines.push('- 体脂率：' + n(st.bf) + '%' + (d(st.bfDate) ? '（' + d(st.bfDate) + '）' : ''));
  if (st.trend !== null && st.trend !== undefined && st.trend !== '' && isFinite(Number(st.trend))) lines.push('- 近 2 周体重趋势：每周 ' + (Number(st.trend) > 0 ? '+' : '') + n(st.trend) + ' kg（在减脂）');
  if (n(st.bmr)) lines.push('- 基础代谢 ' + n(st.bmr) + ' kcal/天，日常系数 ' + n(st.restFactor) + '，每千步 ' + n(st.stepKcal) + ' kcal');
  if (n(st.usualSteps)) lines.push('- 平时每天约 ' + n(st.usualSteps) + ' 步；在椭圆机上手表大约记 ' + n(st.ellCadence) + ' 步/分');
  if (d(st.date)) lines.push('- 运动日期：' + d(st.date));
  lines.push('- 住在日本，健身房器械多是日文界面（消費カロリー、経過時間、傾斜、速度、平均METs 等）');
  return lines.join('\n');
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

/** 在编辑器里运行：测试有氧识别（文字，会花约 0.001 美元） */
function testCardio() {
  ownerOnly_();
  const r = aiCardio_({ id: 'AI-test02', text: '拳击课 60 分钟，没戴手表，手靶和沙袋', state: { kg: 77, kgSrc: '7d', kgN: 5, bmr: 1650, restFactor: 1.15, stepKcal: 30, usualSteps: 8000, ellCadence: 20 } });
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
