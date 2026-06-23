/**
 * state.js — 全パラメータの単一ストア。
 * UI / audio / geometry はすべてここを読み書きする。
 * subscribe() で変更を購読、set(path, value) で更新。
 */

const listeners = new Set();

export const state = {
  // ── 再生 ──────────────────────────────────
  running: false,
  tempo: 72, // BPM

  // ── 幾何生成 (sayagata) ──────────────────
  geo: {
    source: 'procedural', // 'procedural' | 'image'
    gridSize: 48, // px, 卍の密度
    cols: 10,
    rows: 7,
    handedness: 'checker', // '卍' | '逆' | 'checker'
    armLen: 0.5, // ×s
    jitter: 1.5, // px
    strokeW: 2.5,
    // 画像フォールバック
    minVotes: 28,
    minLen: 24,
  },

  // ── マッピング重み (合計1.0) ───────────────
  weights: {
    gridX: 0.3,
    gridY: 0.3,
    chainPos: 0.2, // 籠目のangleを置換
    depth: 0.15,
    length: 0.05,
  },
  octaves: 3, // depth → octave 量

  // ── スケール / リズム ─────────────────────
  scaleKey: 'world.slendro',
  rhythmKey: 'gridded.even16',
  root: 261.63, // Hz (C4) ベース

  // ── ポリリズム scanner ────────────────────
  scanners: [
    { rate: 3, dir: 1, enabled: true },
    { rate: 4, dir: 1, enabled: true },
    { rate: 5, dir: -1, enabled: false },
  ],

  // ── カノン (SAYA固有) ─────────────────────
  canon: {
    enabled: false,
    voices: 3,
    mode: 'unison', // 'unison' | 'interval' | 'spiral'
    interval: 2, // scale steps per voice
  },

  // ── シンセ 3層 ────────────────────────────
  synth: {
    macro: {
      voice: 'modal', // 'modal' | 'glass' | 'karplus'
      preset: 'bell', // 部分音テーブル
      gain: 0.9,
      a: 0.002, d: 0.4, s: 0.0, r: 2.4,
    },
    mid: {
      voice: 'glass',
      preset: 'glass',
      gain: 0.7,
      a: 0.01, d: 0.6, s: 0.2, r: 1.6,
    },
    micro: {
      voice: 'noiseburst',
      preset: 'tine',
      gain: 0.5,
      a: 0.001, d: 0.12, s: 0.0, r: 0.18,
    },
  },

  // ── FX ────────────────────────────────────
  fx: {
    reverb: { wet: 0.35, size: 4.0 },
    delay: { wet: 0.25, time: 0.375, feedback: 0.4 },
  },

  // ── MIDI ──────────────────────────────────
  midi: { enabled: false },

  // ── 言語 ──────────────────────────────────
  lang: 'ja', // 'ja' | 'en'

  // ── 派生データ (geometryパイプラインが書き込む) ─
  _segments: [],
  _chains: [],
};

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function emit(reason = '') {
  for (const fn of listeners) fn(state, reason);
}

/** ドット区切りパスで深い値を設定し emit する。例: set('geo.gridSize', 64) */
export function set(path, value, reason = path) {
  const keys = path.split('.');
  let o = state;
  for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
  o[keys[keys.length - 1]] = value;
  emit(reason);
}

export function get(path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), state);
}
