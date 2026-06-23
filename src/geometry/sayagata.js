/**
 * sayagata.js — 紗綾形（卍つなぎ）のプロシージャル生成。
 *
 * 卍 = 4本のL字アーム。各アーム = 2セグメント（直進→90°折れ）。
 * 中心原点・単位 s の基準座標（armReach = 0.5 が標準）:
 *   arm0 (右→上): (0,0)->(R,0)->(R,R)
 *   arm1 (上→左): (0,0)->(0,R)->(-R,R)
 *   arm2 (左→下): (0,0)->(-R,0)->(-R,-R)
 *   arm3 (下→右): (0,0)->(0,-R)->(R,-R)
 * 逆卍は x を反転。s 倍して各格子点へ平行移動。
 *
 * 出力: セグメント配列。連結は chains.js が端点ハッシュで行う。
 */

// 標準卍の正規化アーム頂点列（[ [vx,vy], ... ] 単位）
const ARMS = [
  [[0, 0], [0.5, 0], [0.5, 0.5]],
  [[0, 0], [0, 0.5], [-0.5, 0.5]],
  [[0, 0], [-0.5, 0], [-0.5, -0.5]],
  [[0, 0], [0, -0.5], [0.5, -0.5]],
];

function rng(seed) {
  // 決定論的擬似乱数（jitter用、Math.random非依存で再現可能）
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {object} geo  state.geo
 * @returns {{segments: Array, width:number, height:number}}
 */
export function generateSayagata(geo) {
  const { gridSize: s, cols, rows, handedness, armLen, jitter, strokeW } = geo;
  const reach = armLen; // ×s（0.4–0.6）
  const rand = rng(0xa17 ^ (cols << 8) ^ (rows << 2) ^ Math.round(armLen * 100));
  const jit = () => (jitter > 0 ? (rand() - 0.5) * 2 * jitter : 0);

  const margin = s; // 盤面端の余白
  const segments = [];
  let id = 0;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const cx = margin + i * s + s / 2;
      const cy = margin + j * s + s / 2;
      // 反転判定
      let mirror = false;
      if (handedness === '逆') mirror = true;
      else if (handedness === 'checker') mirror = (i + j) % 2 === 1;
      const sx = mirror ? -1 : 1;

      for (let a = 0; a < ARMS.length; a++) {
        const arm = ARMS[a];
        // 頂点を絶対座標へ（reachでスケール）
        const pts = arm.map(([vx, vy]) => [
          cx + sx * vx * 2 * reach * s,
          cy + vy * 2 * reach * s,
        ]);
        // 2セグメント（depth 0=内側, 1=折れた先＝外側）
        for (let k = 0; k < 2; k++) {
          const [x1, y1] = pts[k];
          const [x2, y2] = pts[k + 1];
          const orient = Math.abs(x2 - x1) >= Math.abs(y2 - y1) ? 'H' : 'V';
          segments.push({
            id: id++,
            x1: x1 + jit(), y1: y1 + jit(),
            x2: x2 + jit(), y2: y2 + jit(),
            orient,
            tile: [i, j],
            glyph: mirror ? '逆' : '卍',
            depth: k, // アーム内ネスト深度（0/1）
            arm: a,
            strokeW,
          });
        }
      }
    }
  }

  return {
    segments,
    width: margin * 2 + cols * s,
    height: margin * 2 + rows * s,
  };
}
