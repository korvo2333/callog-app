// 用模拟的 Google 服务运行真实的 Code.gs，并提供 HTTP 接口给网页测试
const fs = require('fs');
const vm = require('vm');
const http = require('http');
const path = require('path');

// ── 模拟 SpreadsheetApp ──
class Sheet {
  constructor(name) { this.name = name; this.data = []; this.formats = {}; }
  trim() { while (this.data.length && this.data[this.data.length - 1].every(v => v === '' || v === null || v === undefined)) this.data.pop(); }
  getLastRow() { this.trim(); return this.data.length; }
  getLastColumn() { return Math.max(0, ...this.data.map(r => { let n = r.length; while (n && (r[n - 1] === '' || r[n - 1] === undefined)) n--; return n; })); }
  getMaxRows() { return 1000; }
  setFrozenRows() { return this; }
  getRange(r, c, nr = 1, nc = 1) { return new Range(this, r, c, nr, nc); }
  getDataRange() { return new Range(this, 1, 1, Math.max(1, this.getLastRow()), Math.max(1, this.getLastColumn())); }
  deleteRow(r) { this.data.splice(r - 1, 1); }
  deleteRows(r, n) { this.data.splice(r - 1, n); }
  appendRow(arr) { this.trim(); this.data.push(arr.slice()); }
}
class Range {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = this.sh.data[this.r - 1 + i] || [];
      const o = [];
      for (let j = 0; j < this.nc; j++) { const v = row[this.c - 1 + j]; o.push(v === undefined || v === null ? '' : v); }
      out.push(o);
    }
    return out;
  }
  setValues(vals) {
    if (vals.length !== this.nr || vals[0].length !== this.nc) throw new Error(`setValues 尺寸不符 ${vals.length}x${vals[0].length} vs ${this.nr}x${this.nc}`);
    vals.forEach((row, i) => {
      const ri = this.r - 1 + i;
      while (this.sh.data.length <= ri) this.sh.data.push([]);
      row.forEach((v, j) => {
        // 模拟 Sheets：数字字符串变数字（文本格式列除外）
        const col = this.c + j;
        if (typeof v === 'string' && !this.sh.formats[col] && /^-?\d+(\.\d+)?$/.test(v)) v = parseFloat(v);
        this.sh.data[ri][this.c - 1 + j] = v;
      });
    });
    return this;
  }
  setFontWeight() { return this; }
  setNumberFormat(f) { if (f === '@') this.sh.formats[this.c] = '@'; return this; }
}
const sheets = {};
const SS = {
  getSheetByName: n => sheets[n] || null,
  getDataRange: undefined,
  insertSheet: n => (sheets[n] = new Sheet(n)),
  getUrl: () => 'https://docs.google.com/spreadsheets/d/MOCK/edit'
};
const files = [];
const folder = {
  getId: () => 'FOLDER1', getUrl: () => 'https://drive.google.com/drive/folders/FOLDER1', getName: () => 'CalLog AI 收件箱', isTrashed: () => false,
  createFile: blob => { const f = mkFile(blob.name, blob.bytes); return f; }
};
function mkFile(name, bytes) {
  const f = { name, bytes, id: 'F' + files.length, getName: () => name, getUrl: () => 'https://drive.google.com/file/d/' + name, getId: () => f.id, moveTo: () => f };
  files.push(f);
  return f;
}
const props = {};
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => SS },
  ContentService: { createTextOutput: s => ({ s, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  LockService: { getScriptLock: () => ({ waitLock() { }, releaseLock() { } }) },
  Utilities: {
    formatDate: (d, tz, f) => {   // 按时区格式化（和 Apps Script 一样）
      const p = {};
      new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(d).forEach(x => { p[x.type] = x.value; });
      return f.replace('yyyy', p.year).replace('MM', p.month).replace('dd', p.day).replace('HH', p.hour).replace('mm', p.minute);
    },
    base64Decode: s => Buffer.from(s, 'base64'),
    newBlob: (bytes, type, name) => ({ bytes, type, name })
  },
  Session: {
    getScriptTimeZone: () => process.env.SCRIPT_TZ || 'Asia/Tokyo',
    getActiveUser: () => ({ getEmail: () => process.env.ACTIVE_USER || '' }),
    getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' })
  },
  HtmlService: {
    createHtmlOutputFromFile: () => { throw new Error('No HTML file named index was found.'); },
    createHtmlOutput: html => {
      const o = { html, title: '', metas: {} };
      o.setTitle = t => { o.title = t; return o; };
      o.addMetaTag = (k, v) => { o.metas[k] = v; return o; };
      o.getContent = () => o.html;
      return o;
    }
  },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] || null, setProperty: (k, v) => { props[k] = v; } }) },
  DriveApp: {
    getFolderById: () => folder,
    getFoldersByName: () => ({ hasNext: () => false }),
    createFolder: () => folder,
    getFileById: id => files.find(f => f.id === id),
    getFilesByName: name => {
      const ok = name === 'callog.html' && !process.env.NO_HTML;
      const htmlPath = process.env.HTML_PATH || path.join(__dirname, '..', 'dist', 'callog.html');
      const mk = (trashed, updated, read) => ({ isTrashed: () => trashed, getLastUpdated: () => new Date(updated), getBlob: () => ({ getDataAsString: read }) });
      // 模拟：垃圾桶里的旧文件 + 一个较旧的同名文件 + 最新的文件
      const list = !ok ? [] : [
        mk(true, '2026-10-11T12:00:00Z', () => 'OLD-TRASHED'),
        mk(false, '2026-10-01T00:00:00Z', () => 'OLD-COPY'),
        mk(false, '2026-10-11T01:00:00Z', () => fs.readFileSync(htmlPath, 'utf8'))
      ];
      let i = 0;
      return { hasNext: () => i < list.length, next: () => list[i++] };
    }
  },
  DocumentApp: {
    create: name => {
      const paras = [];
      const f = mkFile(name, null);
      return { getId: () => f.id, getBody: () => ({ appendParagraph: t => paras.push(t) }), saveAndClose: () => { f.text = paras.join('\n'); } };
    }
  },
  UrlFetchApp: { fetch: () => { throw new Error('no network in mock'); } },
  ScriptApp: { getService: () => ({ getUrl: () => 'https://script.google.com/macros/s/MOCK/exec' }) },
  Logger: { log: console.log },
  console
};
if (process.env.PRESET_COMMONFOOD) {
  const sh = SS.insertSheet('commonfood');
  sh.data = [
    ['food_name', 'protein', 'fat', 'carb', 'carlories', 'category'],
    ['SAVAS 可可味牛奶 330ml', 30, 0, 18.1, 191, 'SAVAS'],
    ['SAVAS 草莓味酸奶 200g', 20, 0, 15.3, 140, 'SAVAS'],
    ['SAVAS 可可味蛋白粉 1勺', 20, 0.9, 4.1, 102, 'SAVAS'],
    ['やきとり棒', 10, 2.6, 6, 87, '便利店'],
    ['公司温泉蛋', 5.8, 4.7, 1.4, 71, '公司'],
    ['香蕉', 0, 0, 27, 105, 'Common'],
    ['吐司', 2, 1, 14, 75, 'Common'],
    ['饭团', 4, 2, 40, 200, 'Common'],
    ['鸡胸肉', 24, 2, 0, 120, 'Common'],
    ['oikos杏仁巧克力蛋白酸奶', 18, 0, 12, 120, 'Oikos'],
    ['oikos杏仁巧克力蛋白酸奶', 18, 0, 12, 120, 'Oikos'],
    ['', '', '', '', '', '']
  ];
  SS.insertSheet('工作表2');
}
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.env.CODE_PATH || path.join(__dirname, '..', 'Code.gs'), 'utf8'), ctx);

// ── 模拟 Anthropic Messages API ──
let lastReq = null;
const sleepSync = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
ctx.UrlFetchApp = {
  fetch: (url, opt) => {
    const body = JSON.parse(opt.payload);
    lastReq = { url, headers: opt.headers, body };
    sleepSync(+(process.env.API_DELAY || 900));
    const resp = (code, obj) => ({ getResponseCode: () => code, getContentText: () => JSON.stringify(obj) });
    if (opt.headers['x-api-key'] === 'bad') return resp(401, { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } });
    if (opt.headers['x-api-key'] === 'poor') return resp(400, { type: 'error', error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } });
    if (String(body.system).includes('只读照片上印的数字')) {   // 读成分表
      const label = { ok: true, name: 'ザバス プロテインバー', basis: '每1本(45g)', basisAmount: 45, basisUnit: 'g', packageAmount: 0, packageCount: 0, kcal: 187, protein: 15.2, fat: 8.1, carb: 14.3, note: '按每1本(45g)读取' };
      return resp(200, { id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn',
        content: [{ type: 'text', text: JSON.stringify(label) }], usage: { input_tokens: 2600, output_tokens: 140 } });
    }
    const hasImg = body.messages[0].content.some(c => c.type === 'image');
    const items = hasImg
      ? [{ name: '鸡胸肉沙拉', amount: '约250g', kcal: 320, protein: 38, fat: 12, carb: 14 }, { name: '溏心蛋', amount: '1个', kcal: 75, protein: 6.3, fat: 5, carb: 0.4 }]
      : [{ name: '牛肉拉面', amount: '1碗', kcal: 650, protein: 30, fat: 20, carb: 85 }, { name: '卤蛋', amount: '1个', kcal: 80, protein: 6.5, fat: 5.5, carb: 1 }];
    return resp(200, {
      id: 'msg_mock', type: 'message', role: 'assistant', model: body.model, stop_reason: 'end_turn',
      content: [{ type: 'text', text: JSON.stringify({ items, note: hasImg ? '按便利店常见规格估算' : '按日式拉面一人份估算，汤没算全部喝完' }) }],
      usage: { input_tokens: hasImg ? 2063 : 1012, output_tokens: 287 }
    });
  }
};
props.CLAUDE_API_KEY = process.env.CLAUDE_KEY || 'sk-ant-test';

const handle = req => JSON.parse(vm.runInContext(`JSON.stringify(handle_(${JSON.stringify(req)}))`, ctx));

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url.startsWith('/lastreq')) { res.end(JSON.stringify(lastReq)); return; }
  if (req.url.startsWith('/app')) {   // 相当于打开 Apps Script 网址：doGet()
    const o = vm.runInContext('doGet()', ctx);
    global.lastDoGet = { title: o.title, metas: o.metas };
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(o.getContent());
    return;
  }
  if (req.url.startsWith('/doget-meta')) { res.end(JSON.stringify(global.lastDoGet || null)); return; }
  if (req.url.startsWith('/run/')) {   // 直接调用某个公开函数（模拟 google.script.run 调 testClaude 之类）
    const fn = req.url.slice(5).replace(/[^\w]/g, '');
    let out;
    try { out = JSON.stringify({ ok: true, r: vm.runInContext(fn + '()', ctx) || null }); }
    catch (e) { out = JSON.stringify({ ok: false, error: e.message }); }
    res.end(out); return;
  }
  if (req.url.startsWith('/apk/')) {   // 模拟安卓 App：页面是本地文件（不经过 doGet），所有读写都 POST 到 /apk/exec → doPost
    if (req.method === 'POST') {
      let body = '';
      req.on('data', c => body += c);
      req.on('end', () => {
        const u = new URL(req.url, 'http://x');
        const e = { parameter: Object.fromEntries(u.searchParams), postData: { contents: body, type: 'text/plain' } };
        let out;
        try { out = vm.runInContext(`doPost(${JSON.stringify(e)})`, ctx).s; }
        catch (err) { out = JSON.stringify({ ok: false, error: 'MOCK CRASH ' + err.message }); console.error(err); }
        res.setHeader('Content-Type', 'application/json');
        res.end(out);
      });
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(fs.readFileSync(process.env.HTML_PATH || path.join(__dirname, '..', 'dist', 'callog.html'), 'utf8'));
    return;
  }
  if (req.method === 'POST' && req.url.startsWith('/exec?')) {   // 带 ?token= 的才是手表推送；不带的是网页的 api 调用   // 模拟 HC Webhook 推送：doPost(e)
    const u = new URL(req.url, 'http://x');
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      const e = { parameter: Object.fromEntries(u.searchParams), postData: { contents: body, type: 'application/json' } };
      let out;
      try { out = vm.runInContext(`doPost(${JSON.stringify(e)})`, ctx).s; }
      catch (err) { out = JSON.stringify({ ok: false, error: 'MOCK CRASH ' + err.message }); console.error(err); }
      res.setHeader('Content-Type', 'application/json');
      res.end(out);
    });
    return;
  }
  if (req.url.startsWith('/dump')) {
    res.end(JSON.stringify(Object.fromEntries(Object.entries(sheets).map(([k, s]) => [k, s.data])), null, 1));
    return;
  }
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    let out;
    try {
      out = JSON.stringify(vm.runInContext(`api(${JSON.stringify(body)})`, ctx));
    } catch (e) { out = JSON.stringify({ ok: false, error: 'MOCK CRASH ' + e.message }); console.error(e); }
    res.setHeader('Content-Type', 'application/json');
    res.end(out);
  });
}).listen(+(process.env.PORT || 8787), () => console.log('mock server on', process.env.PORT || 8787));

module.exports = { handle };
