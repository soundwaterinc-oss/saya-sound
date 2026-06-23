/**
 * midi.js — Web MIDI 出力（出力のみ）。
 * 層 → MIDIチャンネル: macro=1, mid=2, micro=3。
 * velocity = vel×127、CC1 にエネルギー（turns）を送る。
 */

const LAYER_CH = { macro: 0, mid: 1, micro: 2 };

export class MidiOut {
  constructor() {
    this._access = null;
    this._output = null;
    this.enabled = false;
    this.onStatus = null;
  }

  async init() {
    if (!navigator.requestMIDIAccess) {
      this._status('Web MIDI 非対応ブラウザ');
      return false;
    }
    try {
      this._access = await navigator.requestMIDIAccess({ sysex: false });
      this._pick();
      this._access.onstatechange = () => this._pick();
      this.enabled = true;
      this._status(`MIDI準備完了: ${this._output?.name ?? 'none'}`);
      return true;
    } catch (e) {
      this._status(`MIDIアクセス失敗: ${e.message}`);
      return false;
    }
  }

  _pick() {
    if (!this._access) return;
    const outs = [...this._access.outputs.values()];
    this._output = outs[0] || null;
    this._status(this._output ? `MIDI出力: ${this._output.name}` : 'MIDI出力ポートなし');
  }

  _status(m) { if (this.onStatus) this.onStatus(m); }

  hzToNote(hz) {
    return Math.round(69 + 12 * Math.log2(hz / 440));
  }

  noteOn(layer, hz, vel = 0.8, energy = 0) {
    if (!this.enabled || !this._output) return;
    const ch = LAYER_CH[layer] ?? 0;
    const note = Math.max(0, Math.min(127, this.hzToNote(hz)));
    const v = Math.max(1, Math.min(127, Math.round(vel * 127)));
    this._output.send([0xb0 | ch, 1, Math.round(energy * 127)]); // CC1 energy
    this._output.send([0x90 | ch, note, v]);
    return note;
  }

  noteOff(layer, note, delayMs = 200) {
    if (!this.enabled || !this._output) return;
    const ch = LAYER_CH[layer] ?? 0;
    this._output.send([0x80 | ch, note, 0], performance.now() + delayMs);
  }

  allOff() {
    if (!this._output) return;
    for (let ch = 0; ch < 3; ch++) this._output.send([0xb0 | ch, 123, 0]);
  }
}
