/**
 * features.js — セグメント特徴ベクトル化（0–1正規化）。
 * sayagata/chains が付与した生値を正規化して feat を焼き込む。
 */

export function computeFeatures(segments, chains, bounds) {
  const { width, height } = bounds;
  // 鎖turnsの最大（正規化用）
  const maxTurns = Math.max(1, ...chains.map((c) => c.turns));
  // セグメント長の最大
  let maxLen = 1, maxJunc = 1;
  for (const s of segments) {
    maxLen = Math.max(maxLen, Math.hypot(s.x2 - s.x1, s.y2 - s.y1));
    maxJunc = Math.max(maxJunc, s.junction || 1);
  }
  const chainTurns = new Map(chains.map((c) => [c.chainId, c.turns]));

  for (const s of segments) {
    const mx = (s.x1 + s.x2) / 2;
    const my = (s.y1 + s.y2) / 2;
    const len = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
    s.feat = {
      gridX: clamp01(mx / width),
      gridY: clamp01(my / height),
      chainPos: s.chainPos ?? 0,
      depth: s.depth ?? 0, // 0/1 → そのまま（armネスト）
      length: clamp01(len / maxLen),
      turns: clamp01((chainTurns.get(s.chainId) || 0) / maxTurns),
      junction: clamp01((s.junction || 1) / maxJunc),
      orient: s.orient, // 'H'|'V'
      strokeW: s.strokeW || 2,
    };
  }
  return segments;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
