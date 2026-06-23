/**
 * noiseburst.js — MICRO層: 清音(struck ceramic) / 金属ノイズバースト / Tine click。
 * 短い帯域ノイズ + 急速減衰。グリッド粒・装飾。
 */

function burstBuffer(ctx, sec) {
  const len = Math.max(1, Math.floor(sec * ctx.sampleRate));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 7919;
  for (let i = 0; i < len; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    d[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
  }
  return buf;
}

export function strikeNoise(ctx, dest, freq, presetName, t0, opts = {}) {
  const gain = opts.gain ?? 0.5;
  const r = opts.adsr?.r ?? 0.16;
  const src = ctx.createBufferSource();
  src.buffer = burstBuffer(ctx, r + 0.05);

  // 清音=高Qバンドパス、metalは複数の高次共鳴を足す
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = Math.min(freq * (presetName === 'tine' ? 4 : 2), ctx.sampleRate * 0.45);
  bp.Q.value = presetName === 'ceramic' ? 18 : 8;

  const env = ctx.createGain();
  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(1e-4, t0 + r);

  src.connect(bp).connect(env).connect(dest);
  src.start(t0);
  src.stop(t0 + r + 0.05);
  return r;
}
