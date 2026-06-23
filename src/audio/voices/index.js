/**
 * voices/index.js — 層設定 → 適切なボイスを発音。
 */
import { strikeModal } from './modal.js';
import { bowGlass } from './glass.js';
import { strikeNoise } from './noiseburst.js';
import { strikePrepared } from './prepared.js';
import { pluckKS } from './karplus.js';

/**
 * @param ctx
 * @param dest 出力ノード（panner）
 * @param note { hz, dur, vel }
 * @param layerCfg state.synth[layer]  { voice, preset, gain, a,d,s,r }
 * @param t0
 */
export function playVoice(ctx, dest, note, layerCfg, t0) {
  const adsr = { a: layerCfg.a, d: layerCfg.d, s: layerCfg.s, r: layerCfg.r };
  const gain = (layerCfg.gain ?? 0.7) * (note.vel ?? 0.8);
  const opts = { gain, adsr, decayMul: 0.5 + (layerCfg.r || 1) };

  switch (layerCfg.voice) {
    case 'modal':
      return strikeModal(ctx, dest, note.hz, layerCfg.preset, t0, opts);
    case 'glass':
      return bowGlass(ctx, dest, note.hz, layerCfg.preset, t0, note.dur, opts);
    case 'prepared':
      return strikePrepared(ctx, dest, note.hz, layerCfg.preset, t0, opts);
    case 'noiseburst':
      return strikeNoise(ctx, dest, note.hz, layerCfg.preset, t0, opts);
    case 'karplus':
      return pluckKS(ctx, dest, note.hz, t0, opts);
    default:
      return strikeModal(ctx, dest, note.hz, layerCfg.preset, t0, opts);
  }
}
