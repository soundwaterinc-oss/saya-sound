/**
 * scheduler.js — ルックアヘッド scheduler (tick 25ms / schedule-ahead 0.1s)。
 * scanner（鎖走査）または canon を時間化し、voice発音・MIDI・ハイライトを駆動。
 */

import { buildScanners } from './polyrhythm.js';
import { CanonReader } from './canon.js';
import { makeRhythm } from './rhythms.js';
import { buildScaleHz, transposeInScale } from './scales.js';
import { mapSegment } from '../geometry/mapping.js';
import { playVoice } from './voices/index.js';

const TICK = 25; // ms
const AHEAD = 0.1; // s

export class Scheduler {
  /**
   * @param engine Engine
   * @param state
   * @param midi MidiOut
   * @param onFire (seg, when) => void  ハイライト用
   */
  constructor(engine, state, midi, onFire) {
    this.engine = engine;
    this.state = state;
    this.midi = midi;
    this.onFire = onFire;
    this._timer = null;
    this.scanners = [];
    this.canon = null;
    this._nextTimes = []; // scanner毎の次発音時刻
    this._rhythms = [];
    this._canonNext = 0;
    this._canonRhythm = null;
    this.scaleHz = [];
  }

  start() {
    const ctx = this.engine.ctx;
    this.rebuild();
    const t = ctx.currentTime + 0.08;
    this._nextTimes = this.scanners.map(() => t);
    this._canonNext = t;
    this._timer = setInterval(() => this._tick(), TICK);
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (this.midi) this.midi.allOff();
  }

  /** state変更時に scanner/canon/scale/rhythm を作り直す */
  rebuild() {
    const s = this.state;
    this.scaleHz = buildScaleHz(s.scaleKey, s.root, s.octaves);
    this.scanners = buildScanners(s.scanners);
    const spb = 60 / s.tempo;
    this._rhythms = this.scanners.map(() => makeRhythm(s.rhythmKey, spb));
    this.canon = new CanonReader(s.canon);
    this._canonRhythm = makeRhythm(s.rhythmKey, spb);
    // 既存スケジュールはそのまま継続（位相維持）
    if (this._nextTimes.length !== this.scanners.length) {
      const now = this.engine.ctx ? this.engine.ctx.currentTime : 0;
      this._nextTimes = this.scanners.map(() => now + 0.05);
    }
  }

  _tick() {
    const ctx = this.engine.ctx;
    const horizon = ctx.currentTime + AHEAD;
    const s = this.state;
    const chains = s._chains;
    const segments = s._segments;
    if (!chains || !chains.length) return;

    const spb = 60 / s.tempo;
    const refRate = 4;

    if (s.canon.enabled) {
      this.canon.update(s.canon);
      const mainChain = chains[0]; // 最長鎖を主鎖に
      while (this._canonNext < horizon) {
        const voices = this.canon.step(mainChain, segments);
        for (const { seg, transpose } of voices) {
          if (seg) this._fire(seg, this._canonNext, transpose, 'mid');
        }
        const dur = this._canonRhythm.next();
        this._canonNext += Math.max(0.04, dur);
      }
      return;
    }

    // 通常: 各scannerが独立クロック（rateでポリリズム）
    for (let i = 0; i < this.scanners.length; i++) {
      const sc = this.scanners[i];
      if (!sc.enabled) continue;
      while (this._nextTimes[i] < horizon) {
        const seg = sc.step(chains, segments);
        if (seg) this._fire(seg, this._nextTimes[i], 0, null);
        const base = this._rhythms[i].next();
        const interval = base * (refRate / sc.rate);
        this._nextTimes[i] += Math.max(0.04, interval);
      }
    }
  }

  _fire(seg, when, transposeSteps, forceLayer) {
    const s = this.state;
    if (!seg.feat) return;
    const note = mapSegment(seg, s, this.scaleHz);
    let hz = note.hz;
    if (transposeSteps) hz = transposeInScale(hz, transposeSteps, this.scaleHz);
    const layer = forceLayer || note.layer;
    const cfg = s.synth[layer];

    // panner
    const ctx = this.engine.ctx;
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    let dest = this.engine.dest(layer);
    if (panner) { panner.pan.value = note.pan; panner.connect(dest); dest = panner; }

    playVoice(ctx, dest, { ...note, hz }, cfg, when);

    // MIDI
    if (this.midi && this.midi.enabled) {
      const n = this.midi.noteOn(layer, hz, note.vel, seg.feat.turns);
      if (n != null) this.midi.noteOff(layer, n, note.dur * 1000);
    }

    // ハイライト
    if (this.onFire) {
      const delayMs = Math.max(0, (when - ctx.currentTime) * 1000);
      setTimeout(() => this.onFire(seg, note), delayMs);
    }
  }
}
