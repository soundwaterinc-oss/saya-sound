/**
 * mapping.js — 特徴 → ノートイベント（重み付き写像）。
 *
 * pitch = quantizeToScale( wx*gridX + wy*gridY + wcp*chainPos + wd*depth*oct )
 * dur   = lerp(durMin, durMax, length)
 * vel   = clamp(base + turns*k + strokeW*k2)
 * pan   = orient==='H' ? -spread : +spread
 * layer = depth>θ ? MACRO : (length>θ2 ? MID : MICRO)
 */

import { quantizeToScale } from '../audio/scales.js';

const DUR_MIN = 0.12;
const DUR_MAX = 1.8;

/**
 * @param {object} seg  feat付きセグメント
 * @param {object} state
 * @param {number[]} scaleHz  量子化先の周波数配列
 * @returns {object} note { hz, dur, vel, pan, layer }
 */
export function mapSegment(seg, state, scaleHz) {
  const f = seg.feat;
  const w = state.weights;
  const octs = state.octaves;

  // スカラ化 (0–1) → スケール量子化
  const scalar =
    w.gridX * f.gridX +
    w.gridY * f.gridY +
    w.chainPos * f.chainPos +
    w.depth * (f.depth ? 1 : 0) * (octs / Math.max(1, octs)) +
    w.length * f.length;

  // depthでオクターブ補正（armの折れ先を高く）
  const octShift = f.depth ? 1 : 0;
  const hz = quantizeToScale(scalar, scaleHz, octShift, octs);

  const dur = lerp(DUR_MIN, DUR_MAX, f.length);
  const vel = clamp(0.35 + f.turns * 0.4 + (f.strokeW / 6) * 0.25 + f.junction * 0.15, 0.05, 1);
  const spread = 0.6;
  const pan = f.orient === 'H' ? -spread : +spread;

  // 層判定: 長く低屈曲→MACRO、中→MID、短く細かい→MICRO。
  // プロシージャル紗綾形はアーム長が均一なので、卍の構造（depth/arm）も併用して
  // 3層を確実に分配する（内側アーム＝主鳴体、外側＝旋律/装飾）。
  let layer;
  if (seg.depth === 1) {
    // 折れた先（外側）: 偶アーム→MID旋律、奇アーム→MICRO装飾
    layer = (seg.arm % 2 === 0) ? 'mid' : 'micro';
  } else if (f.length > 0.6) {
    layer = 'macro';
  } else if (f.length > 0.3) {
    layer = 'mid';
  } else {
    layer = 'micro';
  }

  // junction（交差）は和音化トリガ
  const chord = f.junction > 0.6;

  return { hz, dur, vel, pan, layer, chord };
}

function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
