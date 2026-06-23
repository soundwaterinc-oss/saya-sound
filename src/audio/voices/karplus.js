/**
 * karplus.js — Karplus-Strong 撥弦（籠目資産・互換オプション）。
 * AudioWorklet を使わず Scriptに頼らない簡易版: 短いノイズ→コムフィルタ的ディレイ＋LP。
 * 整数倍音・空気感。SAYA では互換として MACRO/MID/MICRO に残す。
 */

export function pluckKS(ctx, dest, freq, t0, opts = {}) {
  const gain = opts.gain ?? 0.6;
  const decay = opts.adsr?.r ?? 1.4;
  const period = 1 / freq;

  // 励起ノイズ
  const len = Math.max(1, Math.floor(period * ctx.sampleRate * 2));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 22153;
  for (let i = 0; i < len; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    d[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;

  // フィードバックディレイ＝弦
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = period;
  const fb = ctx.createGain();
  fb.gain.value = Math.min(0.99, Math.pow(0.001, period / decay));
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = Math.min(freq * 6, ctx.sampleRate * 0.45);

  const out = ctx.createGain();
  out.gain.value = gain;

  src.connect(delay);
  delay.connect(lp).connect(fb).connect(delay);
  delay.connect(out).connect(dest);

  src.start(t0);
  src.stop(t0 + 0.02);
  return decay;
}
