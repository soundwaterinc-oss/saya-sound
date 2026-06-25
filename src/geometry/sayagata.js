/**
 * sayagata.js — 紗綾形（卍崩し）のプロシージャル生成。
 *
 * 卍 = C4回転対称の風車。1本の「階段アーム（spoke→flag→hook）」を
 * 90°ずつ4回転して構成する。hook が隣の卍へ伸びて噛み合い、
 * 連続した斜めのキーフレット帯（不断長久）になる。
 *
 *   spoke : 中心オフセット q から外へ伸びる縦棒
 *   flag  : エッジで90°折れる横棒
 *   hook  : さらに折れて隣セルへ食い込む縦棒（崩しの伸長＝複雑性の源）
 *
 * 出力: セグメント配列。連結は chains.js が端点ハッシュで行う。
 */

// 90° CCW 回転を k 回（原点中心）
function rot(p, k) {
  let [x, y] = p;
  for (let i = 0; i < (k & 3); i++) { const nx = -y, ny = x; x = nx; y = ny; }
  return [x, y];
}

function rng(seed) {
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
  const rand = rng(0xa17 ^ (cols << 8) ^ (rows << 2) ^ Math.round(armLen * 100));
  const jit = () => (jitter > 0 ? (rand() - 0.5) * 2 * jitter : 0);

  // 階段アーム（中心原点・単位 s）。armLen で hook の伸び＝噛み合い量を制御。
  const q = 0.16;        // 中心オフセット（風車の正方）
  const m = 0.5;         // エッジまでの reach
  const hook = m + armLen; // hook の到達点（隣セルへ）
  // 基準アーム頂点列（spoke→flag→hook の3セグメント）
  const baseArm = [
    [q, -q],   // 起点（中心付近）
    [q, m],    // spoke: 上へ
    [-m, m],   // flag: 左へ
    [-m, hook],// hook: さらに上へ（隣へ食い込む）
  ];

  const margin = s;
  const segments = [];
  let id = 0;

  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      const cx = margin + i * s + s / 2;
      const cy = margin + j * s + s / 2;
      let mirror = false;
      if (handedness === '逆') mirror = true;
      else if (handedness === 'checker') mirror = (i + j) % 2 === 1;
      const sx = mirror ? -1 : 1;

      for (let a = 0; a < 4; a++) {
        // ミラー → 90°回転 でアームを配置
        const pts = baseArm.map((p) => {
          const mp = [sx * p[0], p[1]];
          const rp = rot(mp, a);
          return [cx + rp[0] * s, cy + rp[1] * s];
        });
        for (let k = 0; k < pts.length - 1; k++) {
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
            depth: k,   // 0=spoke, 1=flag, 2=hook
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
