/**
 * rhythms.js — リズムバンク。
 * 紗綾形はグリッド性が強いので Gridded(直交均等) を既定にする。
 * 各パターン beats[] は相対デュレーション、unit はステップの最小単位。
 */

export const RHYTHMS = {
  // ── Gridded（新・SAYA既定） ──
  'gridded.even16': { label: 'Gridded 16 (均等)', beats: Array(16).fill(0.25), unit: 0.25 },
  'gridded.even8':  { label: 'Gridded 8',         beats: Array(8).fill(0.5), unit: 0.5 },
  'gridded.even12': { label: 'Gridded 12',        beats: Array(12).fill(1/3), unit: 1/3 },

  // ── Western ──
  'west.44':   { label: '4/4 標準',  beats: [1, 1, 1, 1], unit: 1 },
  'west.34':   { label: '3/4 ワルツ', beats: [1, 1, 1], unit: 1 },
  'west.68':   { label: '6/8',       beats: [1, 0.5, 0.5, 1, 0.5, 0.5], unit: 0.5 },

  // ── Balkan ──
  'balkan.78a': { label: '7/8 (3+2+2)', beats: [1, 0.5, 0.5, 1, 0.5, 1, 0.5], unit: 0.5 },
  'balkan.98':  { label: '9/8 (2+2+2+3)', beats: [1, 0.5, 1, 0.5, 1, 0.5, 1, 0.5, 0.5], unit: 0.5 },

  // ── Physics ──
  'physics.pink': { label: '1/f ピンク', fn: 'pink' },
  'physics.levy': { label: 'Lévy α=1.5', fn: 'levy', alpha: 1.5 },
};

/** physics系の動的ステップ生成器 */
function makePhysics(def) {
  let prev = 0.25;
  if (def.fn === 'pink') {
    // 1/f風: ゆっくり変動するステップ
    let s = [0, 0, 0];
    return () => {
      s = s.map((v, i) => 0.99 * v + 0.01 * (rand() - 0.5));
      const v = 0.18 + 0.22 * (0.5 + s.reduce((a, b) => a + b, 0));
      return clamp(v, 0.08, 0.6);
    };
  }
  // levy flight
  return () => {
    const u = rand() || 1e-6;
    const step = Math.pow(u, -1 / def.alpha) * 0.06;
    prev = clamp(step, 0.06, 0.8);
    return prev;
  };
}

let _seed = 0x2545;
function rand() {
  _seed ^= _seed << 13; _seed ^= _seed >>> 17; _seed ^= _seed << 5;
  return ((_seed >>> 0) % 100000) / 100000;
}
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

/**
 * リズムから「次のステップ秒数」を返すイテレータを生成。
 * @param {string} key
 * @param {number} secPerBeat  1ビートの秒数（テンポ由来）
 */
export function makeRhythm(key, secPerBeat) {
  const def = RHYTHMS[key] || RHYTHMS['gridded.even16'];
  if (def.fn) {
    const gen = makePhysics(def);
    return { next: () => gen() * secPerBeat * 4 };
  }
  let i = 0;
  return {
    next: () => {
      const dur = def.beats[i % def.beats.length] * secPerBeat;
      i++;
      return dur;
    },
  };
}

export function rhythmOptions() {
  return Object.entries(RHYTHMS).map(([k, v]) => ({ key: k, label: v.label }));
}
