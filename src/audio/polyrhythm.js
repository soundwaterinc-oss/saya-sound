/**
 * polyrhythm.js — scanner（鎖を走査するポインタ群）。
 * 各 scanner は割り当てられた鎖を弧長 t 順に走査 → 連続パスが旋律線になる。
 * rate(3:4:5等) と dir(順/逆) を持つ。
 */

export class Scanner {
  /**
   * @param {object} cfg  { rate, dir, enabled }
   * @param {number} index
   */
  constructor(cfg, index) {
    this.rate = cfg.rate;
    this.dir = cfg.dir;
    this.enabled = cfg.enabled;
    this.index = index;
    this.pos = 0; // 鎖内セグメント位置
    this.chainIdx = index; // 担当する鎖
  }

  /** 次に発音するセグメントを返し、ポインタを進める */
  step(chains, segments) {
    if (!chains.length) return null;
    const chain = chains[this.chainIdx % chains.length];
    const order = chain.segments;
    if (!order.length) return null;

    const i = ((this.pos % order.length) + order.length) % order.length;
    const segIdx = this.dir >= 0 ? order[i] : order[order.length - 1 - i];
    this.pos += 1;
    return segments[segIdx];
  }

  reset() { this.pos = 0; }
}

export function buildScanners(scannerCfgs) {
  return scannerCfgs.map((c, i) => new Scanner(c, i));
}
