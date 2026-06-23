/**
 * glass.js — Bowed Glass / Glass Harmonica。
 * モーダルバンクをインパルスでなく低レベルノイズで「持続励起」→ 弓擦り的サステイン。
 * note の dur ぶんノイズを流し、ADSR でフェード。
 */

import { PRESETS } from './modal.js';

function noiseBuffer(ctx, sec) {
  const len = Math.max(1, Math.floor(sec * ctx.sampleRate));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let seed = 4451;
  for (let i = 0; i < len; i++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    d[i] = ((seed >>> 0) / 4294967296) * 2 - 1;
  }
  return buf;
}

/**
 * @param adsr {a,d,s,r}
 */
export function bowGlass(ctx, dest, freq, presetName, t0, dur, opts = {}) {
  const preset = PRESETS[presetName] || PRESETS.glass;
  const gain = opts.gain ?? 0.6;
  const adsr = opts.adsr || { a: 0.08, d: 0.2, s: 0.6, r: 0.5 };
  const sustain = Math.max(0.05, dur);

  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx, sustain + adsr.r + 0.1);
  src.loop = true;

  const env = ctx.createGain();
  env.gain.setValueAtTime(0, t0);
  env.gain.linearRampToValueAtTime(gain, t0 + adsr.a);
  env.gain.linearRampToValueAtTime(gain * adsr.s, t0 + adsr.a + adsr.d);
  const relStart = t0 + sustain;
  env.gain.setValueAtTime(gain * adsr.s, relStart);
  env.gain.exponentialRampToValueAtTime(1e-4, relStart + adsr.r);

  const mix = ctx.createGain();
  for (const [ratio, g, , q] of preset.partials) {
    const f = freq * ratio;
    if (f > ctx.sampleRate * 0.48) continue;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f;
    bp.Q.value = q * 1.4; // 持続なのでQ高め
    const pg = ctx.createGain();
    pg.gain.value = g;
    src.connect(bp).connect(pg).connect(mix);
  }
  mix.connect(env).connect(dest);
  src.start(t0);
  src.stop(relStart + adsr.r + 0.05);
  return sustain + adsr.r;
}
