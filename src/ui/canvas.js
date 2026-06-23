/**
 * canvas.js — 格子レンダリング＋発音ハイライト。
 * 漆黒地に金線で紗綾形を描き、発音セグメントを金→白へフラッシュ。
 */
import { THEME, LAYER_COLOR } from './theme.js';

export class CanvasView {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.segments = [];
    this.bounds = { width: 720, height: 540 };
    this.flashes = new Map(); // segId → { t0, layer }
    this._raf = null;
    this._dpr = Math.min(2, window.devicePixelRatio || 1);
    this._loop = this._loop.bind(this);
  }

  setGeometry(segments, bounds) {
    this.segments = segments;
    this.bounds = bounds;
    this.resize();
  }

  resize() {
    const cssW = this.canvas.clientWidth || 720;
    const cssH = this.canvas.clientHeight || 540;
    this.canvas.width = cssW * this._dpr;
    this.canvas.height = cssH * this._dpr;
    this._cssW = cssW; this._cssH = cssH;
  }

  flash(seg, note) {
    this.flashes.set(seg.id, { t0: performance.now(), layer: note.layer });
  }

  start() {
    if (!this._raf) this._loop();
  }
  stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = null;
  }

  _loop() {
    this._render();
    this._raf = requestAnimationFrame(this._loop);
  }

  _render() {
    const ctx = this.ctx;
    const { width, height } = this.bounds;
    // レイアウト確定が遅れて 0サイズで初期化された場合に追従
    const wantW = Math.round((this.canvas.clientWidth || 0) * this._dpr);
    if (wantW && this.canvas.width !== wantW) this.resize();
    const cw = this.canvas.width, ch = this.canvas.height;
    if (!cw || !ch) return;
    ctx.save();
    ctx.fillStyle = THEME.bg;
    ctx.fillRect(0, 0, cw, ch);

    // fit geometry into canvas
    const pad = 16 * this._dpr;
    const scale = Math.min((cw - pad * 2) / width, (ch - pad * 2) / height);
    const offX = (cw - width * scale) / 2;
    const offY = (ch - height * scale) / 2;
    ctx.translate(offX, offY);
    ctx.scale(scale, scale);

    const now = performance.now();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const s of this.segments) {
      const fl = this.flashes.get(s.id);
      let color = THEME.goldDim;
      let lw = (s.strokeW || 2) * 0.6;
      let alpha = 0.55;
      if (fl) {
        const age = (now - fl.t0) / 450; // 450ms フラッシュ
        if (age >= 1) {
          this.flashes.delete(s.id);
        } else {
          const k = 1 - age;
          color = age < 0.2 ? THEME.flash : (LAYER_COLOR[fl.layer] || THEME.gold);
          lw = (s.strokeW || 2) * (0.6 + k * 1.8);
          alpha = 0.55 + k * 0.45;
        }
      }
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = color;
      ctx.lineWidth = lw;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
    }
    ctx.restore();
  }
}
