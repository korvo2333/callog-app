// ════════════════════════════════════════════
// 有氧拍照识别：手表的运动截图 / 器械屏幕的照片（+ 一句补充）→ AI 读出数据、判断种类 → 填进有氧表单
// AI 只读数和判断（种类、是不是活动消耗、没数据时按 Compendium 估 MET），热量由 App 按固定公式算，预览里能核对
// 发给 AI 的还有你最新的状态：近 7 天平均体重、体脂、体重趋势、基础代谢等参数、平时步数
// ════════════════════════════════════════════
let CDAI = null;   // { image, thumb, text, status: 'reading' | 'done' | 'error', err, res, usage, t0 }
let cdAiTimer = null;

function cdAiHTML() {
  return `<div class="cd-ai" id="cd-ai">
    <div class="cd-ai-row">
      <button class="btn cd-ai-b" onclick="$('#cd-cam').click()">${icon('camera')}<span>拍照识别</span></button>
      <button class="btn cd-ai-b" onclick="$('#cd-gal').click()">${icon('image')}<span>选截图</span></button>
      <button class="btn cd-ai-b cd-ai-w" onclick="cdAiWrite()" aria-expanded="false" aria-controls="cd-ai-tx">${icon('cd_pen')}<span>写一句</span></button>
    </div>
    <div class="cd-ai-tx" id="cd-ai-tx" hidden><input class="in sm" id="cd-ai-text" maxlength="200" placeholder="拳击课 1 小时，没戴手表…（拍照时也会一起发）" aria-label="给 AI 的说明"
      onkeydown="if(event.key==='Enter'){event.preventDefault();cdAiText()}"><button class="btn" onclick="cdAiText()">识别</button></div>
    <div id="cd-ai-st" aria-live="polite"></div>
  </div>`;
}
function cdAiWrite() {
  const tx = $('#cd-ai-tx'), b = document.querySelector('.cd-ai-w');
  if (!tx) return;
  tx.hidden = !tx.hidden;
  if (b) b.setAttribute('aria-expanded', !tx.hidden);
  if (!tx.hidden) $('#cd-ai-text').focus();
}

async function cdAiPick(ev) {
  const file = ev.target.files && ev.target.files[0];
  ev.target.value = '';
  if (!file || !$('#cd-ai')) return;
  let r;
  try { r = await labelImage(file); } catch (e) { toast(e.message); return; }   // 屏幕上的小字要看清：和成分表一样长边 1600px
  cdAiSend(r.image, r.thumb);
}
function cdAiText() {
  const el = $('#cd-ai-text');
  if (!el || !el.value.trim()) { if (el) el.focus(); toast('先写一句，比如「拳击课 1 小时，没戴手表」'); return; }
  cdAiSend(null, '');
}

async function cdAiSend(image, thumb) {
  if (!connected()) { toast('本机模式不能用 AI'); return; }
  const text = $('#cd-ai-text') ? $('#cd-ai-text').value.trim() : '';
  const mine = CDAI = { image, thumb, text, status: 'reading', err: '', t0: Date.now() };
  renderCdAi();
  try {
    const r = await api('aiCardio', { id: aiId(), image, text, model: cfg().aiModel, state: cardioState(burnDate()) }, 90000);
    if (CDAI !== mine) return;
    Object.assign(mine, { status: 'done', res: r.cardio || {}, usage: r.usage || null });
    USAGE.at = 0;
    if (navigator.vibrate) navigator.vibrate(30);
    if ($('#cd-ai') && mine.res.ok) cdAiApply(mine.res);
  } catch (e) {
    if (CDAI !== mine) return;
    mine.status = 'error';
    mine.err = /未知操作/.test(e.message) ? '服务器上的 Code.gs 还是旧版：换成新的 Code.gs，再「管理部署 → 编辑 → 新版本」' : e.message;
  }
  renderCdAi();
}
function cdAiRetry() { if (CDAI) cdAiSend(CDAI.image, CDAI.thumb); }

function renderCdAi() {
  const el = $('#cd-ai-st'), a = CDAI;
  if (!el) return;
  clearInterval(cdAiTimer); cdAiTimer = null;
  if (!a) { el.innerHTML = ''; return; }
  const th = a.thumb ? `<img class="cd-ai-th" src="${a.thumb}" alt="">` : '';
  if (a.status === 'reading') {
    el.innerHTML = `<div class="cd-ai-res">${th}<div><span class="spin"></span>识别中 <span class="num" id="cd-ai-el">0 秒</span></div></div>`;
    cdAiTimer = setInterval(() => { const t = $('#cd-ai-el'); if (!t || !CDAI || CDAI.status !== 'reading') { clearInterval(cdAiTimer); return; } t.textContent = Math.round((Date.now() - CDAI.t0) / 1000) + ' 秒'; }, 1000);
    return;
  }
  if (a.status === 'error') {
    el.innerHTML = `<div class="cd-ai-res">${th}<div class="cd-ai-msg"><span class="cd-ai-err">失败：${esc(a.err)}</span>
      <button class="link" onclick="cdAiRetry()">重试</button></div></div>`;
    return;
  }
  const c = a.res || {};
  const facts = [c.minutes > 0 && `${fmt1(c.minutes)} 分钟`, c.deviceKcal > 0 && `${fmt(c.deviceKcal)} kcal${c.kcalType === 'active' ? '（活动）' : ''}`,
    c.met > 0 && `MET ${fmt1(c.met)}${c.metFrom === 'estimate' ? '（估）' : ''}`, c.speedKmh > 0 && `${fmt1(c.speedKmh)} km/h`, c.inclinePct > 0 && `坡度 ${fmt1(c.inclinePct)}%`,
    c.distanceKm > 0 && `${fmt1(c.distanceKm)} km`, c.avgHr > 0 && `心率 ${fmt(c.avgHr)}`, c.steps > 0 && `${fmt(c.steps)} 步`].filter(Boolean);
  el.innerHTML = `<div class="cd-ai-res">${th}<div class="cd-ai-msg">
    ${c.ok ? `<b>AI 已填好：${esc(c.name || cardioDef(c.kind).name)}</b><span class="cd-ai-f num">${esc(facts.join(' · '))}</span>` : `<b>没认出运动记录</b>`}
    ${c.note ? `<span class="cd-ai-note">${esc(c.note)}</span>` : ''}
    ${c.ok ? '<span class="cd-ai-note">核对下面的数字后保存</span>' : ''}
    ${usageLine(a.usage)}</div></div>`;
}

// AI 结果 → 表单
// AI 的种类里没有「力量」（Code.gs 不变）：名字像力量训练的「其他」转成力量，强度取最接近 AI 估的 MET 的那档
const STR_NAME = /力量|重量|举铁|撸铁|无氧|器械|筋トレ|ウエイト|ウェイト|weight|strength|resistance/i;
const nearestLv = (lv, m) => lv.reduce((a, x) => (Math.abs(x.met - m) < Math.abs(a.met - m) ? x : a)).met;
function cdAiApply(c) {
  let k = CARDIO_KINDS.some(x => x.k === c.kind) ? c.kind : 'other';
  if (k === 'other' && STR_NAME.test(c.name || '')) k = 'str';
  const set = (id, v) => { const el = $('#' + id); if (el) el.value = v > 0 ? String(v) : ''; };
  set('x-mins', c.minutes); set('x-kcal', c.deviceKcal); set('x-speed', c.speedKmh); set('x-dist', c.distanceKm);
  const gr = $('#x-grade');
  if (gr) gr.value = c.inclinePct > 0 ? String(c.inclinePct) : k === 'tread' && c.speedKmh > 0 ? '0' : '';
  BURN.kt = c.kcalType === 'active' && c.deviceKcal > 0 ? 'active' : 'total';
  const kt = $('#x-kt');
  if (kt) kt.checked = BURN.kt === 'active';
  BURN.gait = c.gait === 'walk' || c.gait === 'run' ? c.gait : '';
  BURN.mf = c.met > 0 ? (c.metFrom === 'estimate' ? 'estimate' : 'screen') : '';
  if (k === 'box') { BURN.met = c.met > 0 ? c.met : BURN.metK === 'box' && BURN.met || BOX_LV[1].met; BURN.metK = 'box'; }
  if (k === 'str') { BURN.met = c.met > 0 ? nearestLv(STR_LV, c.met) : lvDefault('str'); BURN.metK = 'str'; BURN.mf = ''; }
  const met = $('#x-met');
  if (met) { met.value = !LV_OF[k] && c.met > 0 ? String(c.met) : ''; BURN.aiMet = met.value; }
  const st = $('#x-steps');
  if (st) st.value = c.steps > 0 ? String(Math.round(c.steps)) : c.watchWorn === 'no' ? '0' : '';
  const nm = $('#x-name');
  if (nm && k === 'other') nm.value = c.name || '';
  BURN.ai = (CDAI && CDAI.usage && CDAI.usage.model) || 'ai';
  pickCardio(k);
  renderGait();
}
