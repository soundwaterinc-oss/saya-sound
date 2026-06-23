/**
 * controls.js — コントロールパネル構築。
 * 籠目のパネル語彙を流用 + CANON パネル追加。EN/JP トグル。
 */
import { scaleOptions } from '../audio/scales.js';
import { rhythmOptions } from '../audio/rhythms.js';
import { PRESETS } from '../audio/voices/modal.js';

const T = {
  ja: {
    play: '再生', stop: '停止', source: 'ソース', procedural: 'プロシージャル', image: '画像',
    drop: '画像をドロップ / クリックで選択', regen: '再生成',
    gridSize: '格子間隔', cols: '列', rows: '行', hand: '巴の向き', checker: '市松',
    armLen: 'アーム長', jitter: 'ゆらぎ', stroke: '線幅',
    minVotes: 'MinVotes', minLen: 'MinLen',
    weights: 'マッピング重み', octaves: 'オクターブ域',
    scale: 'スケール', rhythm: 'リズム', tempo: 'テンポ', root: 'ルート音',
    scanners: 'ポリリズム スキャナ', rate: 'レート', dir: '方向', on: 'ON',
    canon: 'カノン / 輪奏', voices: '声部数', mode: 'モード', interval: '移調',
    unison: '同度', intervalC: '度数', spiral: '螺旋',
    synth: 'シンセエンジン', macro: 'MACRO', mid: 'MID', micro: 'MICRO',
    voice: '音源', preset: 'プリセット', gain: '音量',
    fx: 'FX', revWet: 'Reverb Wet', revSize: 'Reverb Size', delWet: 'Delay Wet', delTime: 'Delay Time', delFb: 'Delay FB',
    midi: 'MIDI 出力', midiOn: 'MIDI ON', save: 'プリセット保存', load: '読込',
  },
  en: {
    play: 'Play', stop: 'Stop', source: 'Source', procedural: 'Procedural', image: 'Image',
    drop: 'Drop image / click to choose', regen: 'Regenerate',
    gridSize: 'Grid Size', cols: 'Cols', rows: 'Rows', hand: 'Handedness', checker: 'Checker',
    armLen: 'Arm Len', jitter: 'Jitter', stroke: 'Stroke',
    minVotes: 'MinVotes', minLen: 'MinLen',
    weights: 'Mapping Weights', octaves: 'Octave Range',
    scale: 'Scale', rhythm: 'Rhythm', tempo: 'Tempo', root: 'Root',
    scanners: 'Polyrhythm Scanners', rate: 'Rate', dir: 'Dir', on: 'ON',
    canon: 'Canon', voices: 'Voices', mode: 'Mode', interval: 'Interval',
    unison: 'Unison', intervalC: 'Interval', spiral: 'Spiral',
    synth: 'Synth Engine', macro: 'MACRO', mid: 'MID', micro: 'MICRO',
    voice: 'Voice', preset: 'Preset', gain: 'Gain',
    fx: 'FX', revWet: 'Reverb Wet', revSize: 'Reverb Size', delWet: 'Delay Wet', delTime: 'Delay Time', delFb: 'Delay FB',
    midi: 'MIDI Out', midiOn: 'MIDI ON', save: 'Save Preset', load: 'Load',
  },
};

const VOICE_OPTS = [
  ['modal', 'Modal'], ['glass', 'Bowed Glass'], ['prepared', 'Prepared Piano'],
  ['noiseburst', 'Noise Burst'], ['karplus', 'Karplus-Strong'],
];
const PRESET_OPTS = Object.keys(PRESETS).map((k) => [k, k]);

export function buildControls(root, state, cb) {
  let L = T[state.lang];

  function render() {
    L = T[state.lang];
    root.innerHTML = '';

    // transport + lang
    const top = section('');
    top.classList.add('saya-transport');
    const playBtn = btn(state.running ? L.stop : L.play, () => cb.togglePlay());
    playBtn.classList.add('primary');
    top.append(playBtn);
    top.append(btn(state.lang === 'ja' ? 'EN' : 'JP', () => { state.lang = state.lang === 'ja' ? 'en' : 'ja'; cb.emit('lang'); }));
    top.append(btn(L.save, () => cb.savePreset()));
    const loadBtn = btn(L.load, () => fileIn.click());
    const fileIn = document.createElement('input');
    fileIn.type = 'file'; fileIn.accept = 'application/json'; fileIn.style.display = 'none';
    fileIn.onchange = (e) => e.target.files[0] && cb.loadPreset(e.target.files[0]);
    top.append(loadBtn, fileIn);
    root.append(top);

    // ── SOURCE ──
    const src = section(L.source);
    src.append(segmented([[ 'procedural', L.procedural], ['image', L.image]], state.geo.source, (v) => { state.geo.source = v; cb.emit('geo.source'); render(); }));
    if (state.geo.source === 'procedural') {
      src.append(
        slider(L.gridSize, 24, 96, 1, state.geo.gridSize, (v) => set('geo.gridSize', v, cb.regen)),
        slider(L.cols, 4, 24, 1, state.geo.cols, (v) => set('geo.cols', v, cb.regen)),
        slider(L.rows, 4, 24, 1, state.geo.rows, (v) => set('geo.rows', v, cb.regen)),
        select(L.hand, [['卍', '卍'], ['逆', '逆'], ['checker', L.checker]], state.geo.handedness, (v) => set('geo.handedness', v, cb.regen)),
        slider(L.armLen, 0.4, 0.6, 0.01, state.geo.armLen, (v) => set('geo.armLen', v, cb.regen)),
        slider(L.jitter, 0, 6, 0.1, state.geo.jitter, (v) => set('geo.jitter', v, cb.regen)),
        slider(L.stroke, 1, 6, 0.1, state.geo.strokeW, (v) => set('geo.strokeW', v, cb.regen)),
        btn(L.regen, () => cb.regen()),
      );
    } else {
      const drop = document.createElement('div');
      drop.className = 'saya-drop';
      drop.textContent = L.drop;
      const f = document.createElement('input');
      f.type = 'file'; f.accept = 'image/*,.svg'; f.style.display = 'none';
      f.onchange = (e) => e.target.files[0] && cb.loadImage(e.target.files[0]);
      drop.onclick = () => f.click();
      drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = () => drop.classList.remove('over');
      drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); e.dataTransfer.files[0] && cb.loadImage(e.dataTransfer.files[0]); };
      src.append(drop, f,
        slider(L.minVotes, 6, 60, 1, state.geo.minVotes, (v) => { state.geo.minVotes = v; }),
        slider(L.minLen, 8, 60, 1, state.geo.minLen, (v) => { state.geo.minLen = v; }),
      );
    }
    root.append(src);

    // ── MAPPING WEIGHTS ──
    const w = section(L.weights);
    for (const k of ['gridX', 'gridY', 'chainPos', 'depth', 'length']) {
      w.append(slider(k, 0, 1, 0.01, state.weights[k], (v) => { state.weights[k] = v; cb.emit('weights'); }));
    }
    w.append(slider(L.octaves, 1, 5, 1, state.octaves, (v) => { state.octaves = v; cb.rebuild(); }));
    root.append(w);

    // ── SCALE / RHYTHM / TEMPO ──
    const sr = section(L.scale + ' / ' + L.rhythm);
    sr.append(
      select(L.scale, scaleOptions().map((o) => [o.key, o.label]), state.scaleKey, (v) => { state.scaleKey = v; cb.rebuild(); }),
      select(L.rhythm, rhythmOptions().map((o) => [o.key, o.label]), state.rhythmKey, (v) => { state.rhythmKey = v; cb.rebuild(); }),
      slider(L.tempo, 40, 180, 1, state.tempo, (v) => { state.tempo = v; cb.rebuild(); }),
      slider(L.root + ' (Hz)', 110, 440, 1, state.root, (v) => { state.root = v; cb.rebuild(); }),
    );
    root.append(sr);

    // ── SCANNERS ──
    const sc = section(L.scanners);
    state.scanners.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'saya-scanner';
      row.append(
        toggle(`${L.on}${i + 1}`, s.enabled, (v) => { s.enabled = v; cb.rebuild(); }),
        miniSlider(L.rate, 2, 9, 1, s.rate, (v) => { s.rate = v; cb.rebuild(); }),
        select(L.dir, [['1', '→'], ['-1', '←']], String(s.dir), (v) => { s.dir = +v; cb.rebuild(); }),
      );
      sc.append(row);
    });
    root.append(sc);

    // ── CANON ──
    const cn = section(L.canon);
    cn.append(
      toggle(L.canon, state.canon.enabled, (v) => { state.canon.enabled = v; cb.rebuild(); }),
      slider(L.voices, 2, 6, 1, state.canon.voices, (v) => { state.canon.voices = v; cb.rebuild(); }),
      select(L.mode, [['unison', L.unison], ['interval', L.intervalC], ['spiral', L.spiral]], state.canon.mode, (v) => { state.canon.mode = v; cb.rebuild(); }),
      slider(L.interval, 1, 6, 1, state.canon.interval, (v) => { state.canon.interval = v; cb.rebuild(); }),
    );
    root.append(cn);

    // ── SYNTH 3層 ──
    for (const layer of ['macro', 'mid', 'micro']) {
      const cfg = state.synth[layer];
      const sec = section(L.synth + ' · ' + L[layer]);
      sec.append(
        select(L.voice, VOICE_OPTS, cfg.voice, (v) => { cfg.voice = v; cb.emit('synth'); }),
        select(L.preset, PRESET_OPTS, cfg.preset, (v) => { cfg.preset = v; cb.emit('synth'); }),
        slider(L.gain, 0, 1.2, 0.01, cfg.gain, (v) => { cfg.gain = v; cb.emit('synth'); }),
        miniSlider('A', 0.001, 0.2, 0.001, cfg.a, (v) => { cfg.a = v; }),
        miniSlider('D', 0.02, 2, 0.01, cfg.d, (v) => { cfg.d = v; }),
        miniSlider('S', 0, 1, 0.01, cfg.s, (v) => { cfg.s = v; }),
        miniSlider('R', 0.05, 4, 0.01, cfg.r, (v) => { cfg.r = v; }),
      );
      root.append(sec);
    }

    // ── FX ──
    const fx = section(L.fx);
    fx.append(
      slider(L.revWet, 0, 1, 0.01, state.fx.reverb.wet, (v) => { state.fx.reverb.wet = v; cb.updateFX(); }),
      slider(L.revSize, 0.5, 8, 0.1, state.fx.reverb.size, (v) => { state.fx.reverb.size = v; cb.updateFX(true); }),
      slider(L.delWet, 0, 1, 0.01, state.fx.delay.wet, (v) => { state.fx.delay.wet = v; cb.updateFX(); }),
      slider(L.delTime, 0.02, 1, 0.005, state.fx.delay.time, (v) => { state.fx.delay.time = v; cb.updateFX(); }),
      slider(L.delFb, 0, 0.9, 0.01, state.fx.delay.feedback, (v) => { state.fx.delay.feedback = v; cb.updateFX(); }),
    );
    root.append(fx);

    // ── MIDI ──
    const md = section(L.midi);
    md.append(toggle(L.midiOn, state.midi.enabled, (v) => cb.toggleMidi(v)));
    const status = document.createElement('div');
    status.className = 'saya-status'; status.id = 'saya-midi-status';
    md.append(status);
    root.append(md);
  }

  function set(path, v, after) {
    const keys = path.split('.'); let o = state;
    for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
    o[keys[keys.length - 1]] = v;
    if (typeof after === 'function') after();
  }

  render();
  return { render };
}

// ── DOM ヘルパ ────────────────────────────────
function section(title) {
  const s = document.createElement('div');
  s.className = 'saya-section';
  if (title) { const h = document.createElement('h3'); h.textContent = title; s.append(h); }
  return s;
}
function btn(label, onClick) {
  const b = document.createElement('button');
  b.className = 'saya-btn'; b.textContent = label; b.onclick = onClick;
  return b;
}
function row(label, control) {
  const r = document.createElement('label'); r.className = 'saya-row';
  const t = document.createElement('span'); t.className = 'saya-label'; t.textContent = label;
  r.append(t, control);
  return r;
}
function slider(label, min, max, step, val, onInput) {
  const wrap = document.createElement('div'); wrap.className = 'saya-slider';
  const head = document.createElement('div'); head.className = 'saya-slider-head';
  const t = document.createElement('span'); t.textContent = label;
  const out = document.createElement('span'); out.className = 'saya-val'; out.textContent = fmt(val);
  head.append(t, out);
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = val;
  inp.oninput = () => { out.textContent = fmt(+inp.value); onInput(+inp.value); };
  wrap.append(head, inp);
  return wrap;
}
function miniSlider(label, min, max, step, val, onInput) {
  const s = slider(label, min, max, step, val, onInput);
  s.classList.add('mini');
  return s;
}
function select(label, opts, val, onChange) {
  const sel = document.createElement('select'); sel.className = 'saya-select';
  for (const [v, t] of opts) {
    const o = document.createElement('option'); o.value = v; o.textContent = t;
    if (String(v) === String(val)) o.selected = true;
    sel.append(o);
  }
  sel.onchange = () => onChange(sel.value);
  return row(label, sel);
}
function segmented(opts, val, onChange) {
  const wrap = document.createElement('div'); wrap.className = 'saya-seg';
  for (const [v, t] of opts) {
    const b = document.createElement('button');
    b.textContent = t; b.className = 'saya-segbtn' + (v === val ? ' active' : '');
    b.onclick = () => onChange(v);
    wrap.append(b);
  }
  return wrap;
}
function toggle(label, val, onChange) {
  const wrap = document.createElement('label'); wrap.className = 'saya-toggle';
  const inp = document.createElement('input'); inp.type = 'checkbox'; inp.checked = val;
  inp.onchange = () => onChange(inp.checked);
  const t = document.createElement('span'); t.textContent = label;
  wrap.append(inp, t);
  return wrap;
}
function fmt(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(v < 1 ? 3 : 2);
}
