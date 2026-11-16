"use strict";

/* ─────────────────────────────────────────────
 * WebAudio 효과음 (외부 파일 없이 합성)
 * ───────────────────────────────────────────── */
class Sfx {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.noiseBuf = null;
  }

  init() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  get ready() {
    return this.ctx && this.enabled;
  }

  tone(freq, dur, opt = {}) {
    if (!this.ready) return;
    const { type = "sine", vol = 0.08, slide = null, at = 0 } = opt;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + at;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + dur);
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  noise(dur, opt = {}) {
    if (!this.ready) return;
    const { vol = 0.08, freq = 1200, q = 0.8, at = 0, type = "lowpass" } = opt;
    const ctx = this.ctx;
    if (!this.noiseBuf) {
      const len = Math.floor(ctx.sampleRate * 0.5);
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    const t0 = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(ctx.destination);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  click() {
    this.tone(660, 0.05, { type: "square", vol: 0.04 });
  }

  cast() {
    this.noise(0.28, { vol: 0.06, freq: 2600, at: 0, type: "highpass" });
    this.tone(520, 0.18, { type: "sine", vol: 0.04, slide: 900 });
    this.noise(0.12, { vol: 0.05, freq: 900, at: 0.28 });
  }

  splash() {
    this.noise(0.22, { vol: 0.07, freq: 700, q: 1.2 });
    this.tone(240, 0.12, { type: "sine", vol: 0.04, slide: 140 });
  }

  bite() {
    this.tone(880, 0.07, { type: "triangle", vol: 0.09 });
    this.tone(1320, 0.1, { type: "triangle", vol: 0.07, at: 0.07 });
    this.noise(0.08, { vol: 0.04, freq: 1600, at: 0.03 });
  }

  catchFish() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((n, i) => this.tone(n, 0.22, { type: "triangle", vol: 0.07, at: i * 0.09 }));
    this.noise(0.3, { vol: 0.03, freq: 3200, type: "highpass", at: 0.1 });
  }

  fail() {
    this.tone(400, 0.2, { type: "sine", vol: 0.07, slide: 200 });
    this.tone(260, 0.28, { type: "sine", vol: 0.06, slide: 130, at: 0.16 });
  }

  page() {
    this.tone(740, 0.06, { type: "triangle", vol: 0.04, slide: 980 });
  }

  coin() {
    this.tone(1046, 0.09, { type: "square", vol: 0.05 });
    this.tone(1568, 0.16, { type: "square", vol: 0.045, at: 0.07 });
  }

  buy() {
    this.tone(659, 0.08, { type: "triangle", vol: 0.06 });
    this.tone(880, 0.1, { type: "triangle", vol: 0.06, at: 0.08 });
    this.tone(1318, 0.18, { type: "triangle", vol: 0.05, at: 0.17 });
  }
}
