/**
 * chains.js — 鎖トレース（SAYA固有）。
 *
 * セグメント端点を ε で量子化して隣接グラフを構築し、
 * DFS で連結成分 = 鎖（chain）を抽出。鎖内のセグメントは
 * 走査順（弧長パラメータ t）で並べる。turns = 90°屈曲回数。
 */

function key(x, y, eps) {
  return `${Math.round(x / eps)},${Math.round(y / eps)}`;
}

/**
 * @param {Array} segments  sayagata/hough のセグメント配列
 * @param {number} eps      量子化グリッド（≈ jitter+2px）
 * @returns {Array} chains  [{ chainId, segments:[seg...], length, bbox, turns }]
 */
export function traceChains(segments, eps = 4) {
  // 端点 → そこに触れるセグメントindex群
  const nodes = new Map();
  const touch = (k, idx) => {
    if (!nodes.has(k)) nodes.set(k, []);
    nodes.get(k).push(idx);
  };
  segments.forEach((s, idx) => {
    touch(key(s.x1, s.y1, eps), idx);
    touch(key(s.x2, s.y2, eps), idx);
  });

  // 接続数（junction）をセグメントに付与
  segments.forEach((s) => {
    const a = nodes.get(key(s.x1, s.y1, eps)) || [];
    const b = nodes.get(key(s.x2, s.y2, eps)) || [];
    s.junction = Math.max(a.length, b.length); // 端点での交差数
  });

  // 隣接: あるセグメントと端点を共有する別セグメント
  const adj = (idx) => {
    const s = segments[idx];
    const set = new Set();
    for (const k of [key(s.x1, s.y1, eps), key(s.x2, s.y2, eps)]) {
      for (const o of nodes.get(k) || []) if (o !== idx) set.add(o);
    }
    return set;
  };

  const visited = new Uint8Array(segments.length);
  const chains = [];
  let chainId = 0;

  for (let start = 0; start < segments.length; start++) {
    if (visited[start]) continue;
    // BFSで連結成分を集める
    const comp = [];
    const stack = [start];
    visited[start] = 1;
    while (stack.length) {
      const idx = stack.pop();
      comp.push(idx);
      for (const n of adj(idx)) {
        if (!visited[n]) { visited[n] = 1; stack.push(n); }
      }
    }

    // 走査順に並べる（端点連結で経路を辿る、簡易版: 近接連鎖）
    const ordered = orderByPath(comp, segments, nodes, eps);

    let length = 0, turns = 0;
    let prevOrient = null;
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    for (const idx of ordered) {
      const s = segments[idx];
      length += Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      if (prevOrient && prevOrient !== s.orient) turns++;
      prevOrient = s.orient;
      minx = Math.min(minx, s.x1, s.x2); miny = Math.min(miny, s.y1, s.y2);
      maxx = Math.max(maxx, s.x1, s.x2); maxy = Math.max(maxy, s.y1, s.y2);
    }

    // 鎖内位置 t を各セグメントに焼き込む
    let acc = 0;
    for (const idx of ordered) {
      const s = segments[idx];
      const segLen = Math.hypot(s.x2 - s.x1, s.y2 - s.y1);
      s.chainId = chainId;
      s.chainPos = length > 0 ? acc / length : 0; // 0–1
      acc += segLen;
    }

    chains.push({
      chainId,
      segments: ordered,
      length,
      bbox: [minx, miny, maxx, maxy],
      turns,
    });
    chainId++;
  }

  // 鎖を長い順にソート（主旋律が先頭に来やすい）
  chains.sort((a, b) => b.length - a.length);
  return chains;
}

/** 連結成分を端点でつなぎ走査順に並べる（貪欲法） */
function orderByPath(comp, segments, nodes, eps) {
  if (comp.length <= 1) return comp.slice();
  const inComp = new Set(comp);
  const used = new Set();
  // 開始点: 端点接続数が最少（端っこ）のセグメント
  let start = comp[0], best = Infinity;
  for (const idx of comp) {
    const s = segments[idx];
    const a = (nodes.get(key(s.x1, s.y1, eps)) || []).filter((x) => inComp.has(x)).length;
    const b = (nodes.get(key(s.x2, s.y2, eps)) || []).filter((x) => inComp.has(x)).length;
    const deg = Math.min(a, b);
    if (deg < best) { best = deg; start = idx; }
  }
  const out = [];
  let cur = start;
  let curEndKey = key(segments[cur].x2, segments[cur].y2, eps);
  out.push(cur); used.add(cur);
  while (out.length < comp.length) {
    let next = -1;
    for (const o of nodes.get(curEndKey) || []) {
      if (inComp.has(o) && !used.has(o)) { next = o; break; }
    }
    if (next === -1) {
      // 経路途切れ: 未使用を適当に継ぐ
      next = comp.find((x) => !used.has(x));
      if (next === undefined) break;
    }
    const s = segments[next];
    // 接続側の逆端を次の探索キーに
    const k1 = key(s.x1, s.y1, eps);
    curEndKey = k1 === curEndKey ? key(s.x2, s.y2, eps) : k1;
    out.push(next); used.add(next);
    cur = next;
  }
  return out;
}
