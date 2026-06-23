/**
 * scales.js — 音律。
 * 非整数倍音の金属音には ガムラン系(slendro/pelog) / stretched-JI が整合
 * （うなりが musical になる）。各スケールは「ルートからの比率（1オクターブ分）」。
 * stretch > 1 でオクターブを引き伸ばし、インハーモニックな部分音と整合させる。
 */

export const SCALES = {
  // ── ガムラン系（非整数・うなり前提） ──
  'world.slendro':   { label: 'スレンドロ (Java)', ratios: [1, 1.1487, 1.3195, 1.5157, 1.7411], stretch: 1.0 },
  'world.pelog5':    { label: 'ペログ5 (Bali)',    ratios: [1, 1.0667, 1.2706, 1.5157, 1.6018], stretch: 1.0 },
  'world.pelog7':    { label: 'ペログ7 (Bali)',    ratios: [1, 1.0667, 1.1259, 1.2706, 1.4286, 1.6018, 1.6555], stretch: 1.0 },

  // ── stretched / JI ──
  'ji.stretched':    { label: 'ストレッチJI',       ratios: [1, 9/8, 5/4, 3/2, 5/3, 15/8], stretch: 1.022 },
  'ji.just_penta':   { label: '純正ペンタ',         ratios: [1, 9/8, 5/4, 3/2, 5/3], stretch: 1.0 },
  'ji.harmonic':     { label: '自然倍音列',          ratios: [1, 9/8, 5/4, 11/8, 3/2, 13/8, 7/4], stretch: 1.0 },

  // ── 日本 ──
  'jp.miyakobushi':  { label: '都節音階',           ratios: [1, 16/15, 4/3, 3/2, 8/5], stretch: 1.0 },
  'jp.ritsu':        { label: '律音階',             ratios: [1, 9/8, 4/3, 3/2, 5/3], stretch: 1.0 },
  'jp.insen':        { label: '陰音階',             ratios: [1, 16/15, 4/3, 3/2, 9/5], stretch: 1.0 },

  // ── 西洋・微分音 ──
  'west.major_penta':{ label: '長五音',             ratios: [1, 9/8, 5/4, 3/2, 27/16], stretch: 1.0 },
  'micro.19tet':     { label: '19TET', ratios: Array.from({ length: 8 }, (_, i) => Math.pow(2, [0,3,6,8,11,14,16,19][i] / 19)), stretch: 1.0 },
  'micro.24tet':     { label: '24TET', ratios: Array.from({ length: 8 }, (_, i) => Math.pow(2, [0,3,6,10,14,18,20,24][i] / 24)), stretch: 1.0 },
};

/**
 * ルート・オクターブ数からHz配列を生成。
 * @returns {number[]} 低→高にソートされた周波数
 */
export function buildScaleHz(key, root = 261.63, octaves = 3) {
  const sc = SCALES[key] || SCALES['world.slendro'];
  const base = root / Math.pow(sc.stretch, 1); // 1オクターブ下から開始
  const hz = [];
  for (let o = -1; o < octaves; o++) {
    const octMul = Math.pow(2 * sc.stretch, o); // stretchで各オクターブを拡張
    for (const r of sc.ratios) hz.push(base * r * octMul);
  }
  return hz.sort((a, b) => a - b);
}

/**
 * スカラ(0–1) → スケール上の周波数へ量子化。
 * @param {number} scalar    0–1
 * @param {number[]} scaleHz buildScaleHz の出力
 * @param {number} octShift  追加オクターブシフト（depth由来）
 * @param {number} octaves   レンジ
 */
export function quantizeToScale(scalar, scaleHz, octShift = 0, octaves = 3) {
  const n = scaleHz.length;
  const per = n / Math.max(1, octaves + 1);
  let idx = Math.round(scalar * (n - 1) + octShift * per);
  idx = Math.max(0, Math.min(n - 1, idx));
  return scaleHz[idx];
}

/** ある周波数を、スケール上で steps 度ずらした周波数に。 */
export function transposeInScale(hz, steps, scaleHz) {
  if (!steps) return hz;
  // 最近接インデックス
  let best = 0, bd = Infinity;
  for (let i = 0; i < scaleHz.length; i++) {
    const d = Math.abs(scaleHz[i] - hz);
    if (d < bd) { bd = d; best = i; }
  }
  const idx = Math.max(0, Math.min(scaleHz.length - 1, best + steps));
  return scaleHz[idx];
}

export function scaleOptions() {
  return Object.entries(SCALES).map(([k, v]) => ({ key: k, label: v.label }));
}
