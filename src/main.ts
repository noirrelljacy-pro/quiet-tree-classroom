import './style.css';
import { DEFAULTS, RULES, normalizeSettings } from './config';
import { initialState, advance, smooth } from './engine';
import { Calibration } from './calibration';
import { Microphone, microphoneError } from './audio';
import { loadSettings, saveSettings } from './preferences';
import { treeMarkup, createTreeRenderer, speciesPreview } from './tree';
import { SPECIES, DEFAULT_SPECIES, speciesById, isSpecies, type SpeciesId } from './species';
import {
  browserCollectionStore,
  emptyCollection,
  demoFromCollection,
  applyCollectionAction,
  ECONOMY,
  COLLECTION_KEY,
  RoundReward,
  type CollectionAction,
} from './collection';
import { createVolumeView, setText, setStyle, setAttribute } from './dom';
import { STAGES, treeVisual, feedback, elapsedLabel } from './visual-model';
import { phaseText } from './strings';
import { FrameClock } from './timing';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header class="topbar"><a class="brand" href="./" aria-label="安静小树首页"><span class="brand-icon" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 33V15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M20 23C6 24 7 8 18 7c5 3 6 10 2 16Z" fill="currentColor"/><path d="M21 27c-2-11 8-17 14-13 1 9-5 14-14 13Z" fill="#98b77c"/></svg></span><span>安静小树<small>QUIET TREE</small></span></a>
    <nav aria-label="页面操作"><span class="local-tag">声音留在此刻，也留在本地</span><button id="help" class="text-button">使用指南 <span aria-hidden="true">↗</span></button></nav></header>
  <main>
    <div class="page-heading"><div><p class="intro-kicker">课堂里的小小森林</p><h1>把安静，种成一棵树。</h1><p class="subtitle">陪伴专注的课堂，让每一份安静都看得见。</p></div><button id="present" class="outline">⛶ <span>课堂展示</span></button></div>
    <div class="workspace">
      <section class="garden" aria-label="小树课堂">
        <div class="garden-top"><span id="mode" class="badge">尚未开始</span><span class="round-label">第 <b id="round">01</b> 轮 <span aria-hidden="true">·</span> <time id="elapsed" aria-label="本轮有效运行时长">00:00</time></span></div>
        <div class="garden-collection"><span class="species-label"><i aria-hidden="true">⌁</i> <b id="planted-name">香樟</b><span id="next-species"></span></span><button id="open-shop" class="wallet-button" aria-haspopup="dialog"><span class="coin-icon" aria-hidden="true">●</span> <b id="wallet-coins">0</b><span id="wallet-kind">金币</span><span class="shop-link">树种商店 ↗</span></button></div>
        <div class="tree-message"><p class="eyebrow" id="stage">一颗种子，一点期待</p><h2 id="headline" aria-live="polite" aria-atomic="true"></h2><p id="reason"></p></div>
        <div id="tree" class="tree">${treeMarkup()}</div>
        <div id="reward" class="reward-banner" role="status" hidden><span class="coin-icon" aria-hidden="true">●</span><span id="reward-copy"></span></div>
        <div class="growth"><div class="growth-caption"><span>本轮成长 <b id="growth-value">0%</b></span><span id="remaining">等待开始</span></div><div class="growth-track" aria-hidden="true"><div id="growth-fill"></div></div><progress id="growth-progress" class="sr-only" value="0" max="100" aria-label="本轮成长进度"></progress><ol class="stages" aria-label="成长阶段"><li data-step="0"><span aria-hidden="true">1</span>幼苗</li><li data-step="1"><span aria-hidden="true">2</span>小树</li><li data-step="2"><span aria-hidden="true">3</span>成熟树</li><li data-step="3"><span aria-hidden="true">4</span>果实</li></ol></div>
        <div class="presentation-controls"><button id="present-pause" class="outline">暂停</button><button id="exit-present" class="outline">退出展示</button></div>
      </section>
      <aside class="teacher-panel" aria-label="教师控制台">
        <div class="panel-title"><h2>课堂照料台</h2><span class="little-leaf" aria-hidden="true">⌁</span></div>
        <section class="volume-section" aria-labelledby="volume-title"><div class="label-line"><h3 id="volume-title">此刻的声音</h3><span id="input-label">等待声音输入</span></div><div class="volume-number"><strong id="level">—</strong><span>/ 100<small>相对音量 · 非真实分贝</small></span><span id="volume-word" class="volume-word">未监测</span></div>
          <div id="volume-meter" class="meter" role="meter" aria-label="相对音量" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div id="meter-fill"></div><i id="threshold-marker"></i></div><div class="meter-labels"><span>安静</span><span>阈值 <b id="threshold-label">35</b></span><span>嘈杂</span></div>
        </section>
        <section id="feedback" class="feedback" aria-labelledby="feedback-label"><h3 id="feedback-label">等待开始</h3><p id="feedback-detail">给课堂一点安静，小树就会慢慢长大。</p><div class="feedback-track" aria-hidden="true"><span id="feedback-fill"></span></div></section>
        <div id="notice" class="notice" role="status" aria-live="polite">准备好了吗？让小树陪大家专注一会儿。</div>
        <section id="calibration" class="calibration" hidden><h3 id="calibration-title">先听听教室的底噪</h3><p id="calibration-copy">请保持期望的安静状态，采样 5 秒。此时不会推进游戏。</p><progress id="calibration-progress" value="0" max="5" aria-label="环境校准进度"></progress><button id="skip" class="text-button">跳过，使用当前阈值</button></section>
        <div class="primary-actions"><button id="start" class="primary">开启麦克风 <span aria-hidden="true">→</span></button><button id="pause" class="primary" hidden>暂停</button><button id="stop" class="outline" hidden>结束监测</button></div>
        <button id="demo" class="demo-button">先体验演示模式 <span aria-hidden="true">↗</span></button>
        <section id="demo-controls" class="demo-controls" hidden><div class="label-line"><label for="simulation">模拟音量</label><output id="simulation-value">20</output></div><input id="simulation" type="range" min="0" max="100" value="20"/><div class="demo-presets"><button data-level="20">安静</button><button data-level="75">持续嘈杂</button><button id="pulse">短暂声音</button></div><p>演示输入 · 没有采集真实课堂声音</p><button id="real-input" class="text-button">切换到真实麦克风 →</button></section>
        <details id="settings"><summary>照料设置 <span aria-hidden="true">＋</span></summary><div class="settings-body">
          <label class="setting-label" for="threshold">安静阈值 <output id="threshold-value"></output></label><input id="threshold" type="range" min="10" max="90" step="1"/><p>高于阈值才开始累计嘈杂时长。</p>
          <label class="setting-label" for="growthSeconds">安静结果时长 <output id="growthSeconds-value"></output></label><input id="growthSeconds" type="range" min="30" max="600" step="10"/><p>累计安静的目标时间，越短长得越快。</p>
          <label class="setting-label" for="tolerance">嘈杂容忍时长 <output id="tolerance-value"></output></label><input id="tolerance" type="range" min="4" max="20" step="1"/><p>持续嘈杂 3 秒先提醒，达到此时长才下垂。</p>
          <div class="settings-actions"><button id="recalibrate" class="outline">重新校准</button><button id="defaults" class="text-button">恢复默认</button></div><p id="storage-note">偏好仅保存在这台设备的浏览器中。</p></div></details>
        <button id="reset" class="reset-button">↻ 重新开始本轮</button>
        <p class="privacy"><span aria-hidden="true">◇</span> 只感知音量，不录音、不上传<br/>不识别说话内容，无账号与排名</p>
      </aside>
    </div>
    <footer><span>一棵小树，一段专注的时光。</span><span>温和反馈 · 没有声音惩罚</span></footer>
  </main>
  <dialog id="guide"><form method="dialog"><button class="dialog-close" aria-label="关闭使用指南">×</button></form><p class="eyebrow">HELLO, LITTLE TREE</p><h2>用一点安静，照料一棵树。</h2><ol><li><b>开启麦克风</b><p>允许浏览器使用麦克风，用 5 秒校准环境底噪，也可以跳过。</p></li><li><b>选择适合课堂的节奏</b><p>默认累计安静 3 分钟结果。持续嘈杂 3 秒提醒，8 秒开始下垂；短暂咳嗽不会清空成长。</p></li><li><b>让小树陪伴课堂</b><p>恢复安静 2 秒后，叶片逐渐舒展，再继续成长。课堂展示模式可突出小树，按 Esc 退出。</p></li></ol><p>需要 HTTPS 或 localhost 与新版浏览器。手机和平板可使用；具体设备增益会影响相对音量，请先校准。暂停和切到后台会释放麦克风，回到页面后需手动继续。</p><p>声音只在本地内存里计算强弱，不录音、不上传、不转写。每棵完整结果奖励 2 金币，120 金币解锁新树种；收藏仅存本机。演示模式完全不使用麦克风，体验金币独立且不保存。</p><form method="dialog"><button class="primary">开始照料小树</button></form></dialog>
  <dialog id="shop" class="shop-dialog" aria-labelledby="shop-title"><form method="dialog"><button class="dialog-close" aria-label="关闭树种商店">×</button></form><p class="eyebrow">A LITTLE FOREST TO GROW</p><h2 id="shop-title">把安静，收进小小森林。</h2><p class="shop-intro">每养成一棵完整小树，获得 <b>2 金币</b>。新树种每种 <b>120 金币</b>，解锁后可反复种植。</p><div class="shop-wallet"><span><span class="coin-icon" aria-hidden="true">●</span> <b id="shop-coins">0</b> <span id="shop-currency">金币</span></span><span id="shop-distance"></span></div><p id="shop-context" class="shop-context"></p><div class="species-grid">${SPECIES.map((s) => `<article class="species-card" data-species-card="${s.id}"><div class="species-preview">${speciesPreview(s.id)}</div><div class="species-card-heading"><h3>${s.name}</h3><span id="owned-${s.id}" class="owned-tag"></span></div><p>${s.description}</p><button id="choose-${s.id}" class="outline" data-choose="${s.id}"></button><button id="buy-${s.id}" class="primary" data-buy="${s.id}"></button><p id="cost-${s.id}" class="species-cost"></p></article>`).join('')}</div><p id="shop-status" class="shop-status" role="status" aria-live="polite">选一棵喜欢的树，让下一段安静有新的期待。</p><p id="collection-storage" class="shop-footnote"></p><form method="dialog"><button class="outline shop-close-bottom">返回照料台</button></form></dialog>
  <dialog id="confirm"><h2>重新种下这棵小树？</h2><p>本轮成长会归零，金币、已解锁树种和设置都保留。你也可以取消，继续照料。</p><div class="dialog-actions"><button id="cancel-reset" class="outline" autofocus>取消</button><button id="confirm-reset" class="primary">确认重新开始</button></div></dialog>`;

const nodes = new Map<string, HTMLElement>();
function el<T extends HTMLElement = HTMLElement>(id: string): T {
  if (!nodes.has(id)) nodes.set(id, document.getElementById(id)!);
  return nodes.get(id) as T;
}
function text(id: string, value: string) {
  setText(el(id), value);
}
type Session =
  'idle' | 'connecting' | 'calibrating' | 'ready' | 'running' | 'paused' | 'ended' | 'completed';
let session: Session = 'idle';
let source: 'mic' | 'demo' | null = null;
let state = initialState();
let settings = loadSettings();
let calibration: Calibration | null = null;
let level = 0,
  demoLevel = 20,
  round = 1,
  frame = 0,
  lastRender = 0,
  operation = 0;
let presentation = false;
let demoPulseRemaining = 0;
let controlsKey = '';
const mic = new Microphone();
const clock = new FrameClock();
const collectionStore = browserCollectionStore();
let demoCollection = emptyCollection();
let demoInitialized = false;
let plantedSpecies: SpeciesId = collectionStore.value.selected;
let renderTree = createTreeRenderer(el('tree'));
let roundReward = new RoundReward();
let rewardMessage = '';
let rewardPending = false;
let shopPending = false;
let collectionUIKey = '';
applyTreeSpecies(plantedSpecies);
const drawVolume = createVolumeView(el('meter-fill'), el('level'), el('volume-meter'));
const stageNodes = [...document.querySelectorAll<HTMLElement>('[data-step]')];
function notice(message: string) {
  text('notice', message);
}
function save() {
  if (!saveSettings(settings)) text('storage-note', '浏览器无法保存偏好，本次设置仍然有效。');
}
function cancelLoop() {
  demoPulseRemaining = 0;
  cancelAnimationFrame(frame);
  frame = 0;
  clock.reset();
}
function schedule() {
  cancelLoop();
  frame = requestAnimationFrame(tick);
}
function tick(now: number) {
  frame = 0;
  const timing = clock.step(now);
  if (timing.interrupted) {
    pause('页面运行曾中断，已暂停。请手动继续，成长不会突跳。');
    return;
  }
  const dt = timing.seconds;
  const input = source === 'demo' ? (demoPulseRemaining > 0 ? 80 : demoLevel) : mic.read();
  level = smooth(level, input, dt);
  if (source === 'demo') demoPulseRemaining = Math.max(0, demoPulseRemaining - dt);
  if (session === 'calibrating' && calibration) {
    if (calibration.add(level, dt)) {
      settings.threshold = calibration.result()!;
      save();
      settingsUI();
      calibration = null;
      session = 'ready';
      mic.stop();
      cancelLoop();
      notice(`校准完成，建议阈值 ${settings.threshold}。可调整设置，再点击开始本轮。`);
    }
  } else if (session === 'running') {
    const previous = state;
    state = advance(state, level, dt, settings);
    const reward = roundReward.complete(previous, state);
    if (reward) void grantReward(reward);
    if (state.phase === 'fruit') {
      session = 'completed';
      mic.stop();
      notice('小树结果了！谢谢大家的专注，可以开始下一轮。');
    }
  }
  drawVolume(session === 'running' || session === 'calibrating' ? level : null);
  if (now - lastRender >= 100 || session === 'ready' || session === 'completed') {
    render();
    lastRender = now;
  }
  if (session === 'running' || session === 'calibrating') frame = requestAnimationFrame(tick);
}
async function connect(calibrate: boolean) {
  const op = ++operation;
  cancelLoop();
  mic.stop();
  source = 'mic';
  updatePlantedIfEmpty();
  session = 'connecting';
  notice('请在浏览器中允许麦克风。也可以结束等待或进入演示模式。');
  render();
  try {
    const started = await mic.start();
    if (!started || op !== operation) return;
    if (document.hidden) {
      pause('页面已转入后台，已释放麦克风。返回后请手动继续。');
      return;
    }
    level = 0;
    if (calibrate) {
      calibration = new Calibration();
      session = 'calibrating';
      notice('正在校准环境，请保持期望的安静状态。');
    } else {
      session = 'running';
      notice('麦克风已开启，声音仅在本地处理。');
    }
    render();
    schedule();
  } catch (error) {
    if (op !== operation) return;
    session = 'paused';
    mic.stop();
    cancelLoop();
    notice(microphoneError(error));
    render();
  }
}
function pause(message?: string) {
  message ??=
    source === 'demo'
      ? '演示已暂停，成长与嘈杂计时冻结。'
      : '已暂停，成长与嘈杂计时冻结，麦克风已释放。';
  operation++;
  cancelLoop();
  mic.stop();
  if (session === 'calibrating') {
    calibration = null;
    message += ' 校准已取消，当前阈值保留，可重新校准。';
  }
  session = 'paused';
  notice(message);
  render();
}
function resume() {
  if (source === 'demo') {
    session = 'running';
    level = demoLevel;
    notice('演示模式正在运行，没有采集真实声音。');
    render();
    schedule();
  } else void connect(false);
}
function startDemo() {
  operation++;
  cancelLoop();
  mic.stop();
  calibration = null;
  if (!demoInitialized) {
    demoCollection = demoFromCollection(collectionStore.refresh());
    demoInitialized = true;
  }
  source = 'demo';
  if (state.phase === 'fruit') {
    newRound();
    round++;
  }
  roundReward.useDemo();
  updatePlantedIfEmpty();
  session = 'running';
  level = demoLevel;
  notice('演示模式 · 用下方模拟音量，体验安静、嘈杂与恢复。');
  render();
  schedule();
}
function stop() {
  operation++;
  cancelLoop();
  mic.stop();
  calibration = null;
  session = 'ended';
  level = 0;
  notice('监测已结束，麦克风已释放。本轮进度保留。');
  render();
}
mic.onLost = () => {
  if (session === 'running' || session === 'calibrating')
    pause('声音输入中断，已暂停并释放设备。请检查连接与系统输入权限，再点击继续。');
};
function settingsUI() {
  for (const key of ['threshold', 'growthSeconds', 'tolerance'] as const) {
    el<HTMLInputElement>(key).value = String(settings[key]);
    text(`${key}-value`, `${settings[key]}${key === 'threshold' ? '' : ' 秒'}`);
  }
  text('threshold-label', String(settings.threshold));
  el('threshold-marker').style.left = `${settings.threshold}%`;
}
function render() {
  const active = session === 'running' || session === 'calibrating';
  const demo = source === 'demo';
  text(
    'mode',
    `${demo ? '演示模式 · ' : ''}${{ idle: '尚未开始', connecting: '等待麦克风授权', calibrating: '环境校准中', ready: '准备就绪', running: demo ? '模拟音量输入' : '麦克风监测中', paused: '已暂停', ended: '监测已结束', completed: '本轮已结果' }[session]}`,
  );
  el('mode').classList.toggle('demo-badge', demo);
  text('round', String(round).padStart(2, '0'));
  text('elapsed', elapsedLabel(state.elapsed));
  const [headline, reason] =
    phaseText[state.phase === 'idle' && session === 'running' ? 'growing' : state.phase];
  text('headline', session === 'paused' ? '休息一下，小树会等你' : headline);
  text(
    'reason',
    session === 'paused'
      ? '成长已暂停，准备好后再继续。'
      : session === 'ended'
        ? '本轮进度已保留，可以继续，或重新开始。'
        : state.noisy && state.noiseSeconds < 3
          ? '听到了一点声音，先等等看。成长保留，不会立即惩罚。'
          : reason,
  );
  text(
    'stage',
    state.phase === 'fruit'
      ? '一份安静，一份收获'
      : state.progress >= 0.65
        ? '枝叶舒展，果实将至'
        : state.progress >= 0.25
          ? '向上生长，向光而行'
          : '一颗种子，一点期待',
  );
  const value = Math.floor(state.progress * 100);
  text('growth-value', `${value}%`);
  if (el<HTMLProgressElement>('growth-progress').value !== value)
    el<HTMLProgressElement>('growth-progress').value = value;
  setStyle(el('growth-fill'), 'transform', `scaleX(${state.progress.toFixed(4)})`);
  const stage = treeVisual(state).stage;
  for (const [index, node] of stageNodes.entries()) {
    setAttribute(
      node,
      'data-status',
      index < stage ? 'done' : index === stage ? 'current' : 'future',
    );
    if (index === stage) setAttribute(node, 'aria-current', 'step');
    else if (node.hasAttribute('aria-current')) node.removeAttribute('aria-current');
    setAttribute(node, 'title', `${STAGES[index]}${index === stage ? '，当前阶段' : ''}`);
  }
  const info =
    session === 'calibrating'
      ? {
          label: '正在聆听环境',
          detail: '只用于设置阈值，校准期间小树不会成长。',
          amount: (calibration?.elapsed ?? 0) / RULES.calibrationSeconds,
          tone: 'quiet',
        }
      : feedback(state, settings);
  text(
    'feedback-label',
    active || session === 'completed'
      ? info.label
      : session === 'idle'
        ? '准备种下一点安静'
        : '本轮已休息',
  );
  text(
    'feedback-detail',
    active || session === 'completed'
      ? info.detail
      : session === 'idle'
        ? '开始后可以在这里看到反馈原因与等待进度。'
        : '成长与嘈杂计时已冻结，继续后从这里接着长。',
  );
  setStyle(
    el('feedback-fill'),
    'transform',
    `scaleX(${active || session === 'completed' ? Math.max(0, Math.min(1, info.amount)).toFixed(3) : 0})`,
  );
  setAttribute(el('feedback'), 'data-tone', active ? info.tone : 'quiet');
  setAttribute(el('tree'), 'data-phase', state.phase);
  text(
    'remaining',
    session === 'idle'
      ? '等待开始'
      : state.phase === 'fruit'
        ? '果实已达成'
        : `还需约 ${Math.ceil((1 - state.progress) * settings.growthSeconds)} 秒安静`,
  );
  drawVolume(active ? level : null);
  text('input-label', demo ? '模拟输入' : active ? '本地麦克风输入' : '当前未采集');
  text(
    'volume-word',
    !active ? '未监测' : session === 'calibrating' ? '校准中' : state.noisy ? '请轻一点' : '很安静',
  );

  el('meter-fill').classList.toggle('loud', state.noisy);
  const calibrationProgress = calibration?.elapsed ?? 0;
  if (el<HTMLProgressElement>('calibration-progress').value !== calibrationProgress)
    el<HTMLProgressElement>('calibration-progress').value = calibrationProgress;
  text(
    'calibration-title',
    `环境校准 ${Math.min(5, Math.floor(calibration?.elapsed ?? 0))} / 5 秒`,
  );
  const nextControls = `${session}|${source}`;
  if (controlsKey !== nextControls) {
    controlsKey = nextControls;
    el<HTMLButtonElement>('pulse').disabled = session !== 'running' || source !== 'demo';
    el('start').hidden = !['idle', 'ready', 'ended', 'completed'].includes(session);
    text(
      'start',
      session === 'completed'
        ? '开始下一轮 →'
        : session === 'ready'
          ? '开始本轮 →'
          : session === 'ended'
            ? '继续本轮 →'
            : '开启麦克风 →',
    );
    el('pause').hidden = !['running', 'paused'].includes(session);
    text('pause', session === 'paused' ? '继续本轮' : '暂停');
    el('stop').hidden = ['idle', 'ended', 'completed', 'ready'].includes(session);
    el('demo-controls').hidden = !demo;
    el('demo').hidden = demo && !['ended', 'completed'].includes(session);
    text('demo', session === 'completed' ? '演示下一轮 ↗' : '先体验演示模式 ↗');
    el('calibration').hidden = session !== 'calibrating';
    el<HTMLButtonElement>('recalibrate').disabled =
      source !== 'mic' ||
      session === 'connecting' ||
      session === 'calibrating' ||
      session === 'completed';
    el<HTMLButtonElement>('reset').disabled = session === 'idle';
    el<HTMLButtonElement>('present-pause').disabled = !['running', 'paused'].includes(session);
    text('present-pause', session === 'paused' ? '继续' : '暂停');
  }
  el('tree').classList.toggle('is-paused', !active);
  renderTree(state);
  renderCollection();
  el('reward').hidden = !rewardMessage;
  text('reward-copy', rewardMessage);
  setAttribute(el('headline'), 'data-phase', state.phase);
}
el('start').onclick = () => {
  if (session === 'completed') {
    newRound();
    round++;
  }
  if (session === 'idle') void connect(true);
  else resume();
};
el('pause').onclick = () => (session === 'paused' ? resume() : pause());
el('present-pause').onclick = () => (session === 'paused' ? resume() : pause());
el('pulse').onclick = () => {
  if (session === 'running' && source === 'demo') demoPulseRemaining = RULES.demoPulseSeconds;
};
el('stop').onclick = stop;
el('demo').onclick = startDemo;
el('real-input').onclick = () => {
  if (state.phase === 'fruit') {
    source = 'mic';
    newRound();
    round++;
  }
  void connect(true);
};
el('skip').onclick = () => {
  calibration = null;
  session = 'running';
  notice('已跳过校准，使用当前阈值。可随时在照料设置中重新校准。');
  render();
};
el('recalibrate').onclick = () => void connect(true);
el<HTMLInputElement>('simulation').oninput = (e) => {
  demoLevel = Number((e.target as HTMLInputElement).value);
  text('simulation-value', String(demoLevel));
};
document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(
  (b) =>
    (b.onclick = () => {
      demoLevel = Number(b.dataset.level);
      el<HTMLInputElement>('simulation').value = String(demoLevel);
      text('simulation-value', String(demoLevel));
    }),
);
for (const key of ['threshold', 'growthSeconds', 'tolerance'] as const) {
  el<HTMLInputElement>(key).oninput = (e) => {
    settings = normalizeSettings({
      ...settings,
      [key]: Number((e.target as HTMLInputElement).value),
    });
    settingsUI();
    save();
    render();
  };
}
el('defaults').onclick = () => {
  settings = { ...DEFAULTS };
  settingsUI();
  save();
  notice('已恢复默认设置。现有成长进度保留。');
  render();
};
el('help').onclick = () => el<HTMLDialogElement>('guide').showModal();
el('reset').onclick = () => el<HTMLDialogElement>('confirm').showModal();
el('cancel-reset').onclick = () => el<HTMLDialogElement>('confirm').close();
el('confirm-reset').onclick = () => {
  el<HTMLDialogElement>('confirm').close();
  pause('已重新种下幼苗。点击继续开始本轮。');
  newRound();
  level = 0;
  render();
};

function usingDemoCollection() {
  return source === 'demo' || roundReward.isDemo;
}
function currentCollection() {
  return usingDemoCollection() ? demoCollection : collectionStore.value;
}
function applyTreeSpecies(id: SpeciesId) {
  plantedSpecies = id;
  el('tree').innerHTML = treeMarkup(id);
  renderTree = createTreeRenderer(el('tree'), id);
}
function updatePlantedIfEmpty() {
  if (state.progress === 0 && plantedSpecies !== currentCollection().selected)
    applyTreeSpecies(currentCollection().selected);
}
function newRound() {
  state = initialState();
  roundReward = new RoundReward();
  if (source === 'demo') roundReward.useDemo();
  rewardMessage = '';
  applyTreeSpecies(currentCollection().selected);
}
async function grantReward(kind: 'classroom' | 'demo') {
  rewardPending = true;
  rewardMessage = '正在收好这份安静…';
  const roundAtCompletion = roundReward;
  let message: string;
  if (kind === 'demo') {
    demoCollection = applyCollectionAction(demoCollection, { type: 'reward' }).collection;
    message = '+2 体验金币 · 演示收获，不计入课堂金币';
  } else {
    const outcome = await collectionStore.dispatch({ type: 'reward' });
    message = outcome.saved
      ? '+2 金币 · 这份专注，已收入小小森林'
      : '+2 临时金币 · 本次有效，浏览器未能保存';
  }
  rewardPending = false;
  if (roundAtCompletion === roundReward) rewardMessage = message;
  render();
}
function renderCollection() {
  const c = currentCollection();
  const demo = usingDemoCollection();
  const key = JSON.stringify([
    c,
    demo,
    plantedSpecies,
    state.progress === 0,
    collectionStore.persistent,
    shopPending,
    rewardPending,
  ]);
  if (key === collectionUIKey) return;
  collectionUIKey = key;
  const currency = demo ? '体验金币' : collectionStore.persistent ? '金币' : '临时金币';
  text('planted-name', speciesById(plantedSpecies).name);
  text(
    'next-species',
    c.selected === plantedSpecies ? '' : '下轮 · ' + speciesById(c.selected).name,
  );
  text('wallet-coins', String(c.coins));
  text('wallet-kind', currency);
  text('shop-coins', String(c.coins));
  text('shop-currency', currency);
  text(
    'shop-distance',
    c.unlocked.length === SPECIES.length
      ? '小小森林，已经集齐'
      : c.coins >= ECONOMY.price
        ? '可以解锁一棵新树了'
        : '再养成 ' + Math.ceil((ECONOMY.price - c.coins) / ECONOMY.reward) + ' 棵，可解锁新树种',
  );
  text(
    'shop-context',
    demo
      ? '演示商店 · 体验金币与体验解锁仅在本页有效，可体验已拥有树种，与课堂钱包分开。本轮使用过模拟输入，切换麦克风后也只结算体验金币。'
      : '课堂收藏 · 本轮未完成前切换树种，将在下一轮生效。打开商店会暂停照料，返回后请手动继续。',
  );
  text(
    'collection-storage',
    demo
      ? '刷新会清空演示收藏，课堂金币不受影响。'
      : collectionStore.persistent
        ? '金币、已解锁树种与选择仅保存在此浏览器；清理网站数据会清除收藏，无账号与云同步。'
        : '当前无法安全保存收藏（存储或浏览器锁不可用），金币与解锁仅在此页有效。',
  );
  for (const species of SPECIES) {
    const owned = c.unlocked.includes(species.id);
    const selected = c.selected === species.id;
    const choose = el<HTMLButtonElement>('choose-' + species.id);
    const buy = el<HTMLButtonElement>('buy-' + species.id);
    choose.hidden = !owned;
    choose.disabled = selected || shopPending || rewardPending;
    choose.textContent = selected ? '已选择' : state.progress > 0 ? '下一轮种这棵' : '种这棵';
    buy.hidden = owned;
    buy.disabled = c.coins < ECONOMY.price || shopPending || rewardPending;
    buy.textContent = '120 ' + currency + ' · 解锁';
    text(
      'cost-' + species.id,
      owned
        ? species.id === DEFAULT_SPECIES
          ? '初始赠送 · 可反复种植'
          : '已解锁 · 可反复种植'
        : c.coins >= ECONOMY.price
          ? '解锁后点击选择种植'
          : '还差 ' + (ECONOMY.price - c.coins) + ' ' + currency,
    );
    text('owned-' + species.id, selected ? '已选择' : owned ? '已拥有' : '待解锁');
    setAttribute(
      document.querySelector<HTMLElement>('[data-species-card="' + species.id + '"]')!,
      'data-selected',
      String(selected),
    );
    setAttribute(choose, 'aria-label', species.name + '，' + choose.textContent);
    setAttribute(buy, 'aria-label', '解锁' + species.name + '，120 ' + currency);
  }
}
el('open-shop').onclick = () => {
  if (['running', 'calibrating', 'connecting'].includes(session))
    pause('打开树种商店，已暂停照料并释放麦克风。返回后请点击继续。');
  collectionStore.refresh();
  renderCollection();
  text('shop-status', '选一棵喜欢的树，让下一段安静有新的期待。');
  el<HTMLDialogElement>('shop').showModal();
};
async function collectionAction(action: CollectionAction) {
  if (shopPending || rewardPending) return;
  const demo = usingDemoCollection();
  shopPending = true;
  renderCollection();
  const outcome = demo
    ? applyCollectionAction(demoCollection, action)
    : await collectionStore.dispatch(action);
  if (demo) demoCollection = outcome.collection;
  shopPending = false;
  if (action.type === 'purchase') {
    const name = speciesById(action.id).name;
    text(
      'shop-status',
      outcome.result === 'unlocked'
        ? name + '已解锁！花费 120 ' + (demo ? '体验金币' : '金币') + '，现在可以选择种植。'
        : outcome.result === 'owned'
          ? name + '已经拥有，不会重复扣款。'
          : '金币不足，再照料几棵小树吧。',
    );
    // Move focus off a now-hidden purchase button to the newly available choice.
    renderCollection();
    if (outcome.result === 'unlocked') el('choose-' + action.id).focus();
  } else if (action.type === 'select') {
    updatePlantedIfEmpty();
    text(
      'shop-status',
      speciesById(action.id).name +
        (state.progress > 0 ? '将在下一轮种下，本轮小树继续保留。' : '已种下，准备好后开始照料。'),
    );
  }
  render();
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-buy], [data-choose]')) {
  button.onclick = () => {
    const id = button.dataset.buy ?? button.dataset.choose;
    if (isSpecies(id))
      void collectionAction({ type: button.dataset.buy ? 'purchase' : 'select', id });
  };
}
window.addEventListener('storage', (event) => {
  if (event.key === COLLECTION_KEY || event.key === null) {
    collectionStore.refresh();
    updatePlantedIfEmpty();
    render();
  }
});

function setPresentation(value: boolean) {
  presentation = value;
  document.body.classList.toggle('presenting', value);
  text('present', value ? '退出展示' : '⛶ 课堂展示');
  if (value) {
    el<HTMLDetailsElement>('settings').open = false;
    el('exit-present').focus();
  } else el('present').focus();
}
el('present').onclick = async () => {
  if (presentation) {
    setPresentation(false);
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
  } else {
    setPresentation(true);
    if (document.documentElement.requestFullscreen)
      await document.documentElement
        .requestFullscreen()
        .catch(() => notice('浏览器未允许全屏，已进入页面内课堂展示。可用退出展示按钮返回。'));
  }
};
el('exit-present').onclick = () => {
  setPresentation(false);
  if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
};
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && presentation) setPresentation(false);
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && presentation) setPresentation(false);
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && ['running', 'calibrating', 'connecting'].includes(session))
    pause('页面进入后台，已暂停并释放麦克风。返回后请手动继续。');
});
window.addEventListener('pagehide', () => {
  if (['running', 'calibrating', 'connecting'].includes(session))
    pause('离开页面时已暂停并释放麦克风，请手动继续。');
  else {
    operation++;
    cancelLoop();
    mic.stop();
  }
});
settingsUI();
render();
