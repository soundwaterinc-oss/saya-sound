/**
 * modal.js — モーダル合成（共鳴バンドパス・バンク）。SAYA の音色アイデンティティ。
 * インパルス励起 → 非整数倍音に同調した並列バンドパス(高Q) → 個別減衰。
 * 籠目の Karplus-Strong（整数倍音）と明確に音色を分ける。
 */

// 部分音テーブル: [ratio, gain, decay係数, Q]
export const PRESETS = {
  bell:    { // 古典的な鐘 (hum/strike/quint/nominal)
    partials: [
      [0.56, 1.0, 1.0, 80], [0.92, 0.7, 0.9, 90], [1.19, 0.8, 0.8, 110],
      [1.71, 0.5, 0.65, 130], [2.00, 0.7, 0.6, 150], [2.74, 0.4, 0.45, 170],
      [3.00, 0.45, 0.4, 180], [3.76, 0.3, 0.3, 200], [4.07, 0.25, 0.25, 220],
    ],
    decayBase: 2.6,
  },
  glass:   { // 透明・グラスハーモニカ寄り（≈ストレッチ整数）
    partials: [
      [1.0, 1.0, 1.0, 120], [2.01, 0.6, 0.8, 160], [3.03, 0.4, 0.62, 200],
      [4.06, 0.28, 0.5, 240], [5.10, 0.18, 0.4, 280],
    ],
    decayBase: 2.2,
  },
  lacquer: { // 漆鼓: 膜＋胴の中域寄り、短decay
    partials: [
      [1.0, 1.0, 1.0, 26], [1.59, 0.7, 0.7, 34], [2.14, 0.5, 0.55, 40],
      [2.30, 0.45, 0.5, 42], [2.65, 0.35, 0.4, 46], [2.92, 0.3, 0.34, 50],
    ],
    decayBase: 0.9,
  },
  tine:    { // Mbira/金属タイン: 倍音まばら
    partials: [
      [1.0, 1.0, 1.0, 60], [6.27, 0.35, 0.45, 220], [17.1, 0.12, 0.2, 320],
    ],
    decayBase: 1.4,
  },
};

let _impulseCache = new WeakMap();
function impulseBuffer(ctx, ms = 2) {
  if (!_impulseCache.has(ctx)) _impulseCache.set(ctx, {});
  const cache = _impulseCache.get(ctx);
  const k = Math.round(ms * 10);
  if (cache[k]) return cache[k];
  const len = Math.max(1, Math.floor((ms / 1000) * ctx.sampleRate));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 99173;
  for (let i = 0; i < len; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    const env = 1 - i / len;
    d[i] = (((seed >>> 0) / 4294967296) * 2 - 1) * env;
  }
  cache[k] = buf;
  return buf;
}

/**
 * 一打。
 * @param ctx AudioContext
 * @param dest 出力先（pan/gainを噛ませた先）
 * @param freq 基本周波数
 * @param presetName 'bell'|'glass'|'lacquer'|'tine'
 * @param t0 開始時刻
 * @param opts { gain, decayMul }
 */
export function strikeModal(ctx, dest, freq, presetName, t0, opts = {}) {
  const preset = PRESETS[presetName] || PRESETS.bell;
  const gain = opts.gain ?? 0.8;
  const decayMul = (opts.decayMul ?? 1) * preset.decayBase;

  const exciter = ctx.createBufferSource();
  exciter.buffer = impulseBuffer(ctx, opts.exciteMs ?? 2);
  const mix = ctx.createGain();
  mix.gain.value = gain;

  let maxDecay = 0;
  for (const [ratio, g, decF, q] of preset.partials) {
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    const f = freq * ratio;
    if (f > ctx.sampleRate * 0.48) continue; // ナイキスト超は捨てる
    bp.frequency.value = f;
    bp.Q.value = q;
    const ge = ctx.createGain();
    const decay = Math.max(0.05, decF * decayMul);
    ge.gain.setValueAtTime(g, t0);
    ge.gain.exponentialRampToValueAtTime(1e-4, t0 + decay);
    exciter.connect(bp).connect(ge).connect(mix);
    maxDecay = Math.max(maxDecay, decay);
  }
  mix.connect(dest);
  exciter.start(t0);
  exciter.stop(t0 + 0.05);
  // GCのため接続は減衰後に切れる（exciter終了 + フィルタ余韻はGC任せ）
  return maxDecay;
}
