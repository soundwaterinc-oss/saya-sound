/**
 * canon.js — カノン/輪奏（SAYA固有の華）。
 * 紗綾形＝閉じて絡むループ＝カノン。同一鎖を N 声部が位相オフセットで読む。
 *   offset = chainLength / voices
 *   transpose[v] = scaleStep * v
 * モード:
 *   unison-canon   : 同度カノン（純粋な絡み）
 *   interval-canon : 声部ごとに移調
 *   spiral-canon   : 移調量を累積（Shepard的・上昇し続ける錯覚）
 */

export class CanonReader {
  /**
   * @param {object} cfg state.canon { voices, mode, interval }
   */
  constructor(cfg) {
    this.update(cfg);
    this.pos = 0;
  }

  update(cfg) {
    this.voices = Math.max(2, cfg.voices | 0);
    this.mode = cfg.mode;
    this.interval = cfg.interval;
  }

  /**
   * 主鎖の現在位置を進め、全声部のセグメント＋移調量を返す。
   * @returns {Array<{seg, transpose}>}
   */
  step(chain, segments) {
    if (!chain || !chain.segments.length) return [];
    const order = chain.segments;
    const n = order.length;
    const out = [];
    const offset = Math.floor(n / this.voices);

    for (let v = 0; v < this.voices; v++) {
      const i = (this.pos + v * offset) % n;
      const seg = segments[order[i]];
      let transpose = 0;
      if (this.mode === 'interval') transpose = this.interval * v;
      else if (this.mode === 'spiral') transpose = this.interval * v + this.interval * Math.floor(this.pos / n);
      out.push({ seg, transpose });
    }
    this.pos = (this.pos + 1) % n;
    return out;
  }

  reset() { this.pos = 0; }
}
