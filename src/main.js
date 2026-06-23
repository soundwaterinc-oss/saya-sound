/**
 * main.js — 起動・配線。
 * geometry pipeline → state → scheduler / canvas / midi。
 */
import { state, emit, subscribe } from './state.js';
import { generateSayagata } from './geometry/sayagata.js';
import { parseImage } from './geometry/hough.js';
import { traceChains } from './geometry/chains.js';
import { computeFeatures } from './geometry/features.js';
import { Engine } from './audio/engine.js';
import { MidiOut } from './audio/midi.js';
import { Scheduler } from './audio/scheduler.js';
import { CanvasView } from './ui/canvas.js';
import { buildControls } from './ui/controls.js';

const engine = new Engine();
const midi = new MidiOut();
const canvasEl = document.getElementById('saya-canvas');
const view = new CanvasView(canvasEl);
let scheduler = null;
let controls = null;

// ── geometry pipeline ───────────────────────────
function regen() {
  let result;
  if (state.geo.source === 'image' && state._lastImage) {
    runImage(state._lastImage);
    return;
  }
  result = generateSayagata(state.geo);
  applyGeometry(result);
}

async function runImage(file) {
  try {
    const res = await parseImage(file, { minVotes: state.geo.minVotes, minLen: state.geo.minLen });
    applyGeometry(res);
  } catch (e) {
    console.error(e);
    setStatus('画像解析エラー: ' + e.message);
  }
}

function applyGeometry({ segments, width, height }) {
  const eps = Math.max(2, state.geo.jitter + 2);
  const chains = traceChains(segments, eps);
  computeFeatures(segments, chains, { width, height });
  state._segments = segments;
  state._chains = chains;
  view.setGeometry(segments, { width, height });
  if (scheduler) scheduler.rebuild();
}

// ── transport ───────────────────────────────────
async function togglePlay() {
  if (!engine.ctx) {
    await engine.init(state.fx);
    scheduler = new Scheduler(engine, state, midi, (seg, note) => view.flash(seg, note));
  }
  engine.resume();
  if (state.running) {
    scheduler.stop();
    state.running = false;
  } else {
    if (!state._chains.length) regen();
    scheduler.start();
    state.running = true;
  }
  controls.render();
}

async function toggleMidi(on) {
  if (on) {
    if (!midi._access) { midi.onStatus = setStatus; await midi.init(); }
    midi.enabled = !!midi._access; // 初期化失敗時は false のまま
  } else {
    midi.enabled = false;
    midi.allOff();
  }
  state.midi.enabled = midi.enabled;
  controls.render();
}

function updateFX(rebuildIR) {
  engine.setReverb(state.fx.reverb.wet, rebuildIR ? state.fx.reverb.size : null);
  engine.setDelay(state.fx.delay.wet, state.fx.delay.time, state.fx.delay.feedback);
}

function loadImage(file) {
  state._lastImage = file;
  state.geo.source = 'image';
  runImage(file);
}

function savePreset() {
  const snap = JSON.parse(JSON.stringify(state));
  delete snap._segments; delete snap._chains; delete snap._lastImage; delete snap.running;
  const blob = new Blob([JSON.stringify(snap, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'saya-preset.json';
  a.click();
}

async function loadPreset(file) {
  try {
    const txt = await file.text();
    const data = JSON.parse(txt);
    Object.assign(state, data, { _segments: [], _chains: [] });
    regen();
    if (scheduler) scheduler.rebuild();
    updateFX(true);
    controls.render();
  } catch (e) {
    setStatus('プリセット読込エラー: ' + e.message);
  }
}

function setStatus(msg) {
  const el = document.getElementById('saya-midi-status');
  if (el) el.textContent = msg;
}

// ── controls 配線 ───────────────────────────────
const cb = {
  togglePlay,
  toggleMidi,
  updateFX,
  loadImage,
  savePreset,
  loadPreset,
  regen,
  rebuild: () => scheduler && scheduler.rebuild(),
  emit: (r) => emit(r),
};

const panel = document.getElementById('saya-controls');
controls = buildControls(panel, state, cb);

// lang等の再描画
subscribe((_, reason) => {
  if (reason === 'lang' || reason === 'geo.source') controls.render();
});

// 初期生成 & 描画開始
regen();
view.start();
window.addEventListener('resize', () => view.resize());

// デバッグ用
window.__saya = { state, engine, regen };
