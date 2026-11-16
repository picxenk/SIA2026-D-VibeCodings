// 아주 작은 Web Audio 효과음 합성기
(function () {
  let ac = null;

  function unlock() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) ac = new AC();
    }
    if (ac && ac.state === 'suspended') ac.resume();
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ac) return;
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideTo), t0 + dur);
    }
    gain.gain.setValueAtTime(vol == null ? 0.045 : vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  function seq(notes) {
    notes.forEach(([freq, delay, dur]) => {
      setTimeout(() => tone(freq, dur, 'triangle', 0.05), delay * 1000);
    });
  }

  window.SFX = {
    unlock,
    jump() { tone(420, 0.09, 'square', 0.04, 720); },
    jump2() { tone(640, 0.09, 'square', 0.035, 940); },
    coin() { tone(1050, 0.07, 'sine', 0.05, 1500); },
    hurt() { tone(220, 0.18, 'sawtooth', 0.05, 105); },
    attack() { tone(320, 0.06, 'square', 0.035, 170); },
    light() { tone(600, 0.25, 'sine', 0.05, 1250); },
    switch() { tone(300, 0.1, 'square', 0.045, 620); },
    gate() { tone(170, 0.2, 'triangle', 0.05, 85); },
    checkpoint() { seq([[660, 0, 0.08], [880, 0.08, 0.12]]); },
    star() { seq([[660, 0, 0.08], [880, 0.08, 0.08], [1320, 0.16, 0.2]]); },
    clear() { seq([[523, 0, 0.12], [659, 0.12, 0.12], [784, 0.24, 0.18], [1046, 0.44, 0.3]]); },
    enemy() { tone(150, 0.1, 'square', 0.04, 80); },
    boss() { tone(90, 0.4, 'sawtooth', 0.04, 48); },
  };
})();
