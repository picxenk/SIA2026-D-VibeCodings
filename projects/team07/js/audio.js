/* WebAudio로 만드는 칩튠 BGM과 효과음 (외부 오디오 파일 없음) */
(function () {
  'use strict';

  const SOUND_KEY = 'monster-arena.sound';
  const MELODY = [
    72, 76, 79, 76,  74, 77, 81, 77,
    72, 76, 79, 84,  83, 79, 76, 74,
    72, 76, 79, 76,  74, 77, 81, 84,
    79, 76, 74, 71,  72, 0,  76, 0
  ];
  const BASS = [
    48, 0, 0, 0,  45, 0, 0, 0,
    41, 0, 0, 0,  43, 0, 0, 0,
    48, 0, 0, 0,  45, 0, 0, 0,
    41, 0, 0, 0,  43, 0, 0, 0
  ];

  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  let bgmTimer = null;
  let bgmStep = 0;
  let bgmNextTime = 0;
  let enabled = true;

  try {
    if (localStorage.getItem(SOUND_KEY) === '0') enabled = false;
  } catch (e) { /* noop */ }

  function midi(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = enabled ? 0.5 : 0;
    master.connect(ctx.destination);

    const length = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    if (enabled) startBgm();
  }

  function toneAt(freq, when, duration, type, volume, slideTo) {
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, when);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), when + duration);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), when + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(when);
    osc.stop(when + duration + 0.02);
  }

  function noiseAt(when, duration, volume) {
    if (!ctx || !noiseBuffer) return;
    const src = ctx.createBufferSource();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 2200;
    src.buffer = noiseBuffer;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(when);
    src.stop(when + duration);
  }

  function scheduleBgm() {
    if (!ctx || !enabled) return;
    const stepDuration = 0.24;
    while (bgmNextTime < ctx.currentTime + 0.16) {
      const melody = MELODY[bgmStep % MELODY.length];
      if (melody) toneAt(midi(melody), bgmNextTime, 0.2, 'triangle', 0.045);
      const bass = BASS[bgmStep % BASS.length];
      if (bass) toneAt(midi(bass), bgmNextTime, 0.42, 'square', 0.018);
      if (bgmStep % 4 === 0) noiseAt(bgmNextTime, 0.05, 0.008);
      bgmNextTime += stepDuration;
      bgmStep += 1;
    }
  }

  function startBgm() {
    if (!ctx || !enabled || bgmTimer) return;
    bgmStep = 0;
    bgmNextTime = ctx.currentTime + 0.1;
    bgmTimer = setInterval(scheduleBgm, 60);
  }

  function stopBgm() {
    if (bgmTimer) clearInterval(bgmTimer);
    bgmTimer = null;
  }

  function setEnabled(value) {
    enabled = !!value;
    try { localStorage.setItem(SOUND_KEY, enabled ? '1' : '0'); } catch (e) { /* noop */ }
    if (master && ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(enabled ? 0.5 : 0.0001, ctx.currentTime, 0.02);
    }
    if (enabled) {
      init();
      startBgm();
    } else {
      stopBgm();
    }
    return enabled;
  }

  function sfx(name) {
    if (!ctx || !enabled) return;
    const now = ctx.currentTime + 0.01;
    switch (name) {
      case 'select':
        toneAt(660, now, 0.05, 'square', 0.035, 780);
        break;
      case 'confirm':
        toneAt(660, now, 0.06, 'square', 0.035);
        toneAt(880, now + 0.06, 0.09, 'square', 0.03);
        break;
      case 'error':
        toneAt(150, now, 0.12, 'square', 0.04, 110);
        break;
      case 'hit':
        noiseAt(now, 0.1, 0.13);
        toneAt(160, now, 0.12, 'square', 0.05, 90);
        break;
      case 'crit':
        noiseAt(now, 0.14, 0.18);
        toneAt(220, now, 0.16, 'sawtooth', 0.055, 70);
        break;
      case 'effective':
        toneAt(880, now, 0.07, 'square', 0.035);
        toneAt(1320, now + 0.06, 0.1, 'square', 0.03);
        break;
      case 'miss':
        toneAt(500, now, 0.16, 'triangle', 0.04, 180);
        break;
      case 'faint':
        toneAt(420, now, 0.45, 'square', 0.05, 70);
        break;
      case 'win':
        [523, 659, 784, 1046].forEach((f, i) => toneAt(f, now + i * 0.11, 0.18, 'square', 0.045));
        break;
      case 'lose':
        [392, 330, 262, 196].forEach((f, i) => toneAt(f, now + i * 0.15, 0.24, 'triangle', 0.05));
        break;
      case 'levelup':
        [659, 784, 988, 1318].forEach((f, i) => toneAt(f, now + i * 0.08, 0.16, 'square', 0.04));
        break;
      case 'unlock':
        [784, 988, 1174, 1568].forEach((f, i) => toneAt(f, now + i * 0.07, 0.2, 'triangle', 0.04));
        break;
      case 'encounter':
        toneAt(330, now, 0.09, 'square', 0.04);
        toneAt(440, now + 0.1, 0.09, 'square', 0.04);
        toneAt(660, now + 0.2, 0.16, 'square', 0.045);
        break;
      default:
        toneAt(660, now, 0.05, 'square', 0.03);
    }
  }

  window.AudioSys = {
    init,
    sfx,
    setEnabled,
    isEnabled: () => enabled,
    startBgm,
    stopBgm
  };
})();
