/**
 * prepared.js — プリペアドピアノ（金属付加）。
 * 倍音的な短い撥音に、ボルト/金属を模した非整数共鳴を1〜2本付加。
 * MID層の選択肢。
 */

export function strikePrepared(ctx, dest, freq, presetName, t0, opts = {}) {
  const gain = opts.gain ?? 0.6;
  const decay = (opts.adsr?.r ?? 1.2);

  const mix = ctx.createGain();
  mix.gain.value = gain;

  // 基音 + 弱い整数倍音（弦）
  const fund = [1, 2, 3].map((h, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq * h;
    const g = ctx.createGain();
    const a = [1, 0.4, 0.2][i];
    g.gain.setValueAtTime(a, t0);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + decay * (1 - i * 0.2));
    osc.connect(g).connect(mix);
    osc.start(t0);
    osc.stop(t0 + decay + 0.05);
    return osc;
  });

  // 金属付加: 非整数高Q共鳴（ボルトのびびり）
  const buzz = ctx.createOscillator();
  buzz.type = 'square';
  buzz.frequency.value = freq * 5.4;
  const bf = ctx.createBiquadFilter();
  bf.type = 'bandpass'; bf.frequency.value = freq * 5.4; bf.Q.value = 40;
  const bg = ctx.createGain();
  bg.gain.setValueAtTime(0.18, t0);
  bg.gain.exponentialRampToValueAtTime(1e-4, t0 + decay * 0.5);
  buzz.connect(bf).connect(bg).connect(mix);
  buzz.start(t0); buzz.stop(t0 + decay * 0.5 + 0.05);

  mix.connect(dest);
  return decay;
}
