/**
 * engine.js — AudioContext / master / FX bus。
 * 信号: voices → busDry ┐
 *                        ├→ master(limiter) → destination
 *       voices → reverb ┘ + delay
 * 金属は残響長め推奨。
 */

export class Engine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.busDry = null;
    this.reverb = null;
    this.reverbWet = null;
    this.delay = null;
    this.delayWet = null;
    this.delayFb = null;
    this.layerGains = {}; // macro/mid/micro 入力
  }

  async init(fx) {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const ctx = this.ctx;

    // master limiter
    this.master = ctx.createDynamicsCompressor();
    this.master.threshold.value = -6;
    this.master.knee.value = 6;
    this.master.ratio.value = 12;
    this.master.attack.value = 0.003;
    this.master.release.value = 0.25;
    const outGain = ctx.createGain();
    outGain.gain.value = 0.9;
    this.master.connect(outGain).connect(ctx.destination);

    // dry bus
    this.busDry = ctx.createGain();
    this.busDry.connect(this.master);

    // reverb (synth IR)
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this._makeIR(fx.reverb.size);
    this.reverbWet = ctx.createGain();
    this.reverbWet.gain.value = fx.reverb.wet;
    this.reverb.connect(this.reverbWet).connect(this.master);

    // delay
    this.delay = ctx.createDelay(2.0);
    this.delay.delayTime.value = fx.delay.time;
    this.delayFb = ctx.createGain();
    this.delayFb.gain.value = fx.delay.feedback;
    this.delayWet = ctx.createGain();
    this.delayWet.gain.value = fx.delay.wet;
    this.delay.connect(this.delayFb).connect(this.delay);
    this.delay.connect(this.delayWet).connect(this.master);

    // 層ごとの入力ゲイン → 全FXへ送る
    for (const layer of ['macro', 'mid', 'micro']) {
      const g = ctx.createGain();
      g.gain.value = 1;
      g.connect(this.busDry);
      g.connect(this.reverb);
      g.connect(this.delay);
      this.layerGains[layer] = g;
    }
  }

  /** voiceの出力先ノード（層に応じて） */
  dest(layer) {
    return this.layerGains[layer] || this.busDry;
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  setReverb(wet, size) {
    if (!this.ctx) return;
    this.reverbWet.gain.value = wet;
    if (size != null) this.reverb.buffer = this._makeIR(size);
  }
  setDelay(wet, time, fb) {
    if (!this.ctx) return;
    this.delayWet.gain.value = wet;
    this.delay.delayTime.value = time;
    this.delayFb.gain.value = fb;
  }
  setLayerGain(layer, v) {
    if (this.layerGains[layer]) this.layerGains[layer].gain.value = v;
  }

  /** 合成インパルスレスポンス（指数減衰ノイズ + 軽い金属的色付け） */
  _makeIR(seconds = 4) {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(seconds * rate));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      let seed = 12345 + ch * 777;
      const rnd = () => {
        seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
        return ((seed >>> 0) / 4294967296) * 2 - 1;
      };
      for (let i = 0; i < len; i++) {
        const env = Math.pow(1 - i / len, 2.2);
        d[i] = rnd() * env;
      }
    }
    return buf;
  }
}
