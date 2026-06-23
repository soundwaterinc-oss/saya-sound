/**
 * hough.js — 画像 (SVG/PNG/JPG) → 線分（フォールバック）。
 * 紗綾形の性格に寄せ、Hough を 0°/90°（直交）に限定し、
 * 検出線を H/V に最近接スナップして SAYA セグメント schema で返す。
 * （籠目 image_import.js を直交特化で書き直したもの）
 */

function loadImageElement(source) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = (source instanceof Blob) ? URL.createObjectURL(source) : source;
  });
}

const idx = (x, y, W) => y * W + x;

function toBinary(rgba, W, H) {
  const gray = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    gray[i] = Math.round(0.299 * rgba[i*4] + 0.587 * rgba[i*4+1] + 0.114 * rgba[i*4+2]);
  }
  const hist = new Int32Array(256);
  for (const v of gray) hist[v]++;
  const N = W * H;
  let sumB = 0, wB = 0, total = 0;
  for (let i = 0; i < 256; i++) total += i * hist[i];
  let maxVar = 0, thresh = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]; if (!wB) continue;
    const wF = N - wB; if (!wF) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (total - sumB) / wF;
    const v = wB * wF * (mB - mF) ** 2;
    if (v > maxVar) { maxVar = v; thresh = t; }
  }
  const bin = new Uint8Array(W * H);
  for (let i = 0; i < gray.length; i++) bin[i] = gray[i] <= thresh ? 1 : 0;
  return bin;
}

function boundaryPixels(bin, W, H) {
  const pts = [];
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (!bin[idx(x, y, W)]) continue;
      if (!bin[idx(x-1,y,W)] || !bin[idx(x+1,y,W)] ||
          !bin[idx(x,y-1,W)] || !bin[idx(x,y+1,W)]) pts.push([x, y]);
    }
  }
  return pts;
}

/** 0°/90° 限定 Hough */
function houghOrtho(pts, W, H, minVotes, peakGap, minLen) {
  if (!pts.length) return [];
  const ANGLES = [0, 90]; // 直交のみ
  const RADS = ANGLES.map((d) => (d * Math.PI) / 180);
  const diagLen = Math.ceil(Math.hypot(W, H));
  const rhoSize = diagLen * 2 + 2;
  const out = [];

  for (const theta of RADS) {
    const cosT = Math.cos(theta), sinT = Math.sin(theta);
    const cosP = -sinT, sinP = cosT;
    const acc = new Int32Array(rhoSize);
    const pixByRho = Array.from({ length: rhoSize }, () => []);
    for (const [x, y] of pts) {
      const rho = Math.round(x * cosT + y * sinT) + diagLen;
      if (rho < 0 || rho >= rhoSize) continue;
      acc[rho]++;
      pixByRho[rho].push([x, y]);
    }
    const peaks = [];
    for (let r = peakGap; r < rhoSize - peakGap; r++) {
      if (acc[r] < minVotes) continue;
      let isMax = true;
      for (let dr = -peakGap; dr <= peakGap; dr++) {
        if (dr && acc[r + dr] >= acc[r]) { isMax = false; break; }
      }
      if (isMax) peaks.push(r);
    }
    for (const rhoIdx of peaks) {
      const linePts = pixByRho[rhoIdx];
      if (!linePts.length) continue;
      const proj = linePts.map(([x, y]) => ({ t: x * cosP + y * sinP, x, y }))
        .sort((a, b) => a.t - b.t);
      const GAP = 8;
      let runStart = 0;
      for (let i = 1; i <= proj.length; i++) {
        const gap = i < proj.length ? proj[i].t - proj[i-1].t : GAP + 1;
        if (gap > GAP || i === proj.length) {
          const run = proj.slice(runStart, i);
          if (run.length >= 2) {
            const a = run[0], b = run[run.length - 1];
            if (Math.hypot(b.x - a.x, b.y - a.y) >= minLen) {
              out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, votes: acc[rhoIdx] });
            }
          }
          runStart = i;
        }
      }
    }
  }
  return out;
}

function fitToCanvas(segs, W, H, pad = 24) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of segs) {
    minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
    minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
  }
  const sw = maxX - minX || 1, sh = maxY - minY || 1;
  const scale = Math.min((W - pad * 2) / sw, (H - pad * 2) / sh);
  const offX = (W - sw * scale) / 2 - minX * scale;
  const offY = (H - sh * scale) / 2 - minY * scale;
  return segs.map((s) => ({
    x1: s.x1 * scale + offX, y1: s.y1 * scale + offY,
    x2: s.x2 * scale + offX, y2: s.y2 * scale + offY,
    votes: s.votes,
  }));
}

/**
 * @returns {{segments:Array, width:number, height:number}}
 */
export async function parseImage(source, { minVotes = 20, minLen = 18, working = 540, target = 720 } = {}) {
  const img = await loadImageElement(source);
  const wc = document.createElement('canvas');
  wc.width = working; wc.height = working;
  const wctx = wc.getContext('2d');
  wctx.fillStyle = '#fff';
  wctx.fillRect(0, 0, working, working);
  wctx.drawImage(img, 0, 0, working, working);
  const data = wctx.getImageData(0, 0, working, working).data;

  const bin = toBinary(data, working, working);
  const bpts = boundaryPixels(bin, working, working);
  if (!bpts.length) throw new Error('エッジピクセルが検出されませんでした');

  const raw = houghOrtho(bpts, working, working, minVotes, 6, minLen);
  if (!raw.length) throw new Error('直交ラインが検出されませんでした');

  const fitted = fitToCanvas(raw, target, target);
  let maxV = 1;
  for (const s of fitted) maxV = Math.max(maxV, s.votes);

  let id = 0;
  const segments = fitted.map((s) => {
    // H/V に最近接スナップ（紗綾形の直交性に寄せる）
    const dx = Math.abs(s.x2 - s.x1), dy = Math.abs(s.y2 - s.y1);
    let { x1, y1, x2, y2 } = s;
    let orient;
    if (dx >= dy) { orient = 'H'; const my = (y1 + y2) / 2; y1 = y2 = my; }
    else { orient = 'V'; const mx = (x1 + x2) / 2; x1 = x2 = mx; }
    return {
      id: id++, x1, y1, x2, y2, orient,
      tile: [0, 0], glyph: '卍', depth: 0, arm: 0,
      strokeW: 1 + (s.votes / maxV) * 5,
    };
  });

  return { segments, width: target, height: target };
}
