// Pizza Rush v2 - 초간단 피자 만들기 미니 게임
// 의존성 없음. index.html에서 바로 실행.
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const W = 960;
  const H = 640;

  const C = {
    bg: '#FFF3E0',
    panel: '#FFFFFF',
    soft: '#FFF8EE',
    panelBorder: '#E0C9A6',
    text: '#3E2723',
    sub: '#7A5C45',
    accent: '#E53935',
    orange: '#FB8C00',
    green: '#43A047',
  };

  // ---------- 재료 ----------
  const DOUGHS = {
    basic: { label: '기본 도우', color: '#E0B27A' },
    thin: { label: '씬 도우', color: '#C9975B' },
    cheeseCrust: { label: '치즈 크러스트', color: '#F0C060' },
  };

  const SAUCES = {
    tomato: { label: '토마토 소스', color: '#E53935' },
    white: { label: '화이트 소스', color: '#FFF8E1' },
    pesto: { label: '바질 페스토', color: '#7CB342' },
  };

  const CHEESES = {
    mozzarella: { label: '모차렐라', color: '#FFE9A8' },
    cheddar: { label: '체다', color: '#FFB300' },
    gorgonzola: { label: '고르곤졸라', color: '#ECEFF1' },
  };

  const TOPPINGS = {
    pepperoni: { label: '페퍼로니', color: '#C62828', value: 10 },
    mushroom: { label: '버섯', color: '#8D6E63', value: 8 },
    olive: { label: '올리브', color: '#33691E', value: 8 },
    pineapple: { label: '파인애플', color: '#FDD835', value: 8 },
    onion: { label: '양파', color: '#B39DDB', value: 7 },
    bellpepper: { label: '피망', color: '#43A047', value: 7 },
    bacon: { label: '베이컨', color: '#A1442B', value: 12 },
    shrimp: { label: '새우', color: '#FF8A65', value: 14 },
  };

  const TOPPING_IDS = Object.keys(TOPPINGS);
  const MAX_TOPPINGS = 12;

  const DIFFICULTIES = {
    easy: { label: '쉬움', patience: 60, minToppings: 1, maxToppings: 2, scoreMult: 1.0 },
    normal: { label: '보통', patience: 42, minToppings: 2, maxToppings: 3, scoreMult: 1.1 },
    hard: { label: '어려움', patience: 30, minToppings: 3, maxToppings: 4, scoreMult: 1.25 },
  };

  const BAKE_LABEL = { perfect: '완벽!', under: '덜 익음', burnt: '탐' };
  const BAKE_MULT = { perfect: 1, under: 0.55, burnt: 0.3 };
  const PIZZA = { cx: 330, cy: 258, r: 118 };
  const MAX_CUSTOMERS = 3;

  // ---------- 사운드 ----------
  const Sound = {
    ctx: null,
    muted: false,
    musicTimer: null,
    step: 0,

    ensure() {
      if (!this.ctx) {
        try {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
          this.ctx = null;
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return this.ctx;
    },

    note(freq, dur = 0.12, type = 'sine', vol = 0.05, delay = 0) {
      if (this.muted) return;
      const ac = this.ensure();
      if (!ac) return;
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t0);
      o.stop(t0 + dur + 0.03);
    },

    noise(dur = 0.15, vol = 0.03) {
      if (this.muted) return;
      const ac = this.ensure();
      if (!ac) return;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ac.createBufferSource();
      src.buffer = buf;
      const filter = ac.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2200;
      const g = ac.createGain();
      g.gain.value = vol;
      src.connect(filter);
      filter.connect(g);
      g.connect(ac.destination);
      src.start();
    },

    startMusic() {
      if (this.musicTimer || this.muted) return;
      if (!this.ensure()) return;
      this.step = 0;
      this.musicTimer = setInterval(() => {
        if (this.muted) return;
        this.musicStep();
      }, 240);
    },

    stopMusic() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
    },

    musicStep() {
      const bass = [130.81, 0, 196.0, 0, 220.0, 0, 174.61, 0, 130.81, 0, 196.0, 0, 220.0, 0, 174.61, 0];
      const mel = [523.25, 659.25, 783.99, 659.25, 587.33, 698.46, 880.0, 698.46, 523.25, 659.25, 783.99, 1046.5, 880.0, 783.99, 659.25, 587.33];
      const i = this.step;
      if (bass[i]) this.note(bass[i], 0.22, 'triangle', 0.035);
      if (i % 2 === 0) this.note(mel[i], 0.15, 'square', 0.011);
      if (i === 0 || i === 8) this.note(261.63, 0.1, 'sine', 0.012);
      this.step = (i + 1) % 16;
    },
  };

  const sfx = {
    click: () => Sound.note(620, 0.05, 'square', 0.03),
    select: () => Sound.note(520, 0.07, 'triangle', 0.04),
    sauce: () => {
      Sound.note(300, 0.12, 'sawtooth', 0.025);
      Sound.note(430, 0.1, 'sine', 0.02, 0.06);
    },
    cheese: () => {
      Sound.noise(0.18, 0.03);
      Sound.note(920, 0.08, 'sine', 0.02);
    },
    place: (i) => Sound.note(620 + i * 42, 0.08, 'triangle', 0.04),
    oven: () => {
      Sound.note(180, 0.25, 'sawtooth', 0.03);
      Sound.note(260, 0.3, 'sine', 0.025, 0.1);
    },
    done: () => {
      Sound.note(880, 0.12, 'sine', 0.05);
      Sound.note(1174.66, 0.16, 'sine', 0.04, 0.1);
    },
    serve: () => [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => Sound.note(f, 0.14, 'sine', 0.05, i * 0.08)),
    fail: () => [330, 247, 196].forEach((f, i) => Sound.note(f, 0.18, 'square', 0.04, i * 0.1)),
    arrive: () => {
      Sound.note(987.77, 0.09, 'sine', 0.04);
      Sound.note(1318.51, 0.12, 'sine', 0.035, 0.08);
    },
    leave: () => Sound.note(190, 0.3, 'sawtooth', 0.045),
    level: () => [659.25, 783.99, 1046.5].forEach((f, i) => Sound.note(f, 0.16, 'triangle', 0.045, i * 0.1)),
  };

  // ---------- 상태 ----------
  const game = {
    phase: 'title', // title | playing | baking | ready | result | gameover
    difficulty: 'normal',
    score: 0,
    best: Number(localStorage.getItem('pizza_best') || 0),
    muted: localStorage.getItem('pizza_muted') === '1',
    lives: 3,
    combo: 0,
    stage: 1,
    served: 0,
    customers: [],
    dough: 'basic',
    sauce: null,
    cheese: null,
    placed: [],
    slices: 8,
    bakeProgress: 0,
    bakeQuality: null,
    result: null,
    resultTimer: 0,
    message: '',
    messageTime: 0,
  };
  Sound.muted = game.muted;

  let nextCustomerId = 1;

  function setMessage(text, seconds = 2) {
    game.message = text;
    game.messageTime = seconds;
  }

  function randInt(n) {
    return Math.floor(Math.random() * n);
  }

  function pickOne(arr) {
    return arr[randInt(arr.length)];
  }

  function sample(arr, count) {
    const pool = arr.slice();
    const out = [];
    while (out.length < count && pool.length) out.push(pool.splice(randInt(pool.length), 1)[0]);
    return out;
  }

  // ---------- 주문 / 손님 ----------
  function basePatience() {
    const d = DIFFICULTIES[game.difficulty];
    const stageFactor = Math.max(0.75, 1 - (game.stage - 1) * 0.04);
    return Math.round(d.patience * stageFactor);
  }

  function makeOrder() {
    const d = DIFFICULTIES[game.difficulty];
    const count = d.minToppings + randInt(d.maxToppings - d.minToppings + 1);
    return {
      dough: pickOne(Object.keys(DOUGHS)),
      sauce: pickOne(Object.keys(SAUCES)),
      cheese: pickOne(Object.keys(CHEESES)),
      toppings: sample(TOPPING_IDS, Math.min(count, TOPPING_IDS.length)),
      slices: pickOne([4, 6, 8]),
    };
  }

  function makeCustomer() {
    const patience = basePatience();
    return {
      id: nextCustomerId++,
      order: makeOrder(),
      patience,
      maxPatience: patience,
    };
  }

  function ensureQueue() {
    while (game.customers.length < MAX_CUSTOMERS) game.customers.push(makeCustomer());
  }

  function startGame() {
    Sound.ensure();
    game.score = 0;
    game.lives = 3;
    game.combo = 0;
    game.stage = 1;
    game.served = 0;
    game.result = null;
    game.resultTimer = 0;
    game.message = '';
    game.messageTime = 0;
    game.customers = [];
    ensureQueue();
    resetPizza();
    game.phase = 'playing';
    Sound.startMusic();
    sfx.arrive();
  }

  function resetPizza() {
    game.dough = 'basic';
    game.sauce = null;
    game.cheese = null;
    game.placed = [];
    game.slices = 8;
    game.bakeProgress = 0;
    game.bakeQuality = null;
  }

  function gameOver() {
    game.phase = 'gameover';
    game.result = null;
    Sound.stopMusic();
    sfx.fail();
    if (game.score > game.best) {
      game.best = game.score;
      localStorage.setItem('pizza_best', String(game.best));
    }
  }

  function goTitle() {
    game.phase = 'title';
    game.result = null;
    Sound.stopMusic();
  }

  function toggleMute() {
    game.muted = !game.muted;
    Sound.muted = game.muted;
    localStorage.setItem('pizza_muted', game.muted ? '1' : '0');
    if (game.muted) {
      Sound.stopMusic();
    } else if (
      game.phase === 'playing' ||
      game.phase === 'baking' ||
      game.phase === 'ready' ||
      game.phase === 'result'
    ) {
      Sound.startMusic();
    }
  }

  // ---------- 재료 조작 ----------
  function canBuild() {
    return game.phase === 'playing';
  }

  function setDough(id) {
    if (!canBuild()) return;
    game.dough = id;
    sfx.select();
  }

  function setSauce(id) {
    if (!canBuild()) return;
    game.sauce = id;
    sfx.sauce();
  }

  function setCheese(id) {
    if (!canBuild()) return;
    game.cheese = id;
    sfx.cheese();
  }

  function addTopping(id) {
    if (!canBuild()) return;
    if (game.placed.length >= MAX_TOPPINGS) {
      setMessage('토핑이 너무 많아요! (최대 ' + MAX_TOPPINGS + '개)');
      sfx.fail();
      return;
    }
    const a = Math.random() * Math.PI * 2;
    const d = Math.sqrt(Math.random()) * (PIZZA.r - 38);
    game.placed.push({ id, a, d });
    sfx.place(game.placed.length);
  }

  function clearToppings() {
    if (!canBuild() || game.placed.length === 0) return;
    game.placed = [];
    sfx.leave();
  }

  // ---------- 오븐 ----------
  function startBake() {
    if (game.phase !== 'playing') return;
    if (!game.sauce) {
      setMessage('소스를 먼저 발라주세요!');
      sfx.fail();
      return;
    }
    if (!game.cheese) {
      setMessage('치즈를 먼저 뿌려주세요!');
      sfx.fail();
      return;
    }
    game.phase = 'baking';
    game.bakeProgress = 0;
    setMessage('오븐에 넣었다! 초록 구간에서 꺼내자');
    sfx.oven();
  }

  function takeOut() {
    if (game.phase !== 'baking') return;
    const p = game.bakeProgress;
    game.bakeQuality = p < 35 ? 'under' : p <= 75 ? 'perfect' : 'burnt';
    game.phase = 'ready';
    setMessage('굽기 결과: ' + BAKE_LABEL[game.bakeQuality] + ' · 조각을 고르고 서빙하세요');
    if (game.bakeQuality === 'perfect') sfx.done();
    else sfx.fail();
  }

  // ---------- 서빙 & 점수 ----------
  function serve() {
    if (game.phase !== 'ready' || !game.bakeQuality) return;

    const o = game.customers[0].order;
    const doughOk = game.dough === o.dough;
    const sauceOk = game.sauce === o.sauce;
    const cheeseOk = game.cheese === o.cheese;

    const req = {};
    o.toppings.forEach((t) => (req[t] = (req[t] || 0) + 1));
    const got = {};
    game.placed.forEach((p) => (got[p.id] = (got[p.id] || 0) + 1));

    const totalReq = o.toppings.length;
    const totalGot = game.placed.length;
    let matched = 0;
    Object.keys(req).forEach((t) => {
      matched += Math.min(req[t], got[t] || 0);
    });
    const toppingAcc = totalReq === 0 ? 1 : matched / Math.max(totalReq, totalGot);

    const accuracy =
      0.22 * (doughOk ? 1 : 0) +
      0.18 * (sauceOk ? 1 : 0) +
      0.18 * (cheeseOk ? 1 : 0) +
      0.42 * toppingAcc;

    const bakeMult = BAKE_MULT[game.bakeQuality];
    const sliceOk = game.slices === o.slices;
    const sliceMult = sliceOk ? 1 : 0.85;
    const diff = DIFFICULTIES[game.difficulty];

    const base = Math.round(100 * accuracy * bakeMult * sliceMult * diff.scoreMult);
    // 토핑을 많이 올릴수록 보너스가 커진다.
    const toppingBonus = game.placed.reduce((sum, p) => sum + TOPPINGS[p.id].value, 0);

    if (accuracy >= 0.8) game.combo++;
    else game.combo = 0;
    const points = Math.round((base + toppingBonus) * (1 + 0.1 * game.combo));
    const tip = accuracy >= 0.999 ? 20 : 0;
    game.score += points + tip;

    const failed = accuracy < 0.5 || game.bakeQuality === 'burnt';
    if (failed) {
      game.lives--;
      game.combo = 0;
    }

    game.served++;
    game.stage = 1 + Math.floor(game.served / 5);
    if (game.score > game.best) {
      game.best = game.score;
      localStorage.setItem('pizza_best', String(game.best));
    }

    game.result = {
      timeout: false,
      removedFront: true,
      accuracy,
      doughOk,
      sauceOk,
      cheeseOk,
      toppingAcc,
      bakeQuality: game.bakeQuality,
      sliceOk,
      base,
      toppingBonus,
      points,
      tip,
      failed,
    };
    game.phase = 'result';
    game.resultTimer = 3.0;
    if (failed) sfx.fail();
    else sfx.serve();
    if (game.combo >= 3) sfx.level();
  }

  function frontTimeout() {
    game.lives--;
    game.combo = 0;
    game.result = { timeout: true, removedFront: true, failed: true };
    game.phase = 'result';
    game.resultTimer = 2.0;
    setMessage('손님이 기다리다 떠났습니다...', 2.4);
    sfx.leave();
  }

  function resolveResult() {
    if (game.phase !== 'result') return;
    if (game.lives <= 0) {
      gameOver();
      return;
    }
    if (game.result && game.result.removedFront) game.customers.shift();
    ensureQueue();
    game.result = null;
    resetPizza();
    game.phase = 'playing';
  }

  // ---------- 업데이트 ----------
  function update(dt) {
    if (game.messageTime > 0) game.messageTime -= dt;

    if (game.phase === 'result') {
      game.resultTimer -= dt;
      if (game.resultTimer <= 0) resolveResult();
      return;
    }

    if (game.phase !== 'playing' && game.phase !== 'baking' && game.phase !== 'ready') return;

    // 손님 인내심: 맨 앞 손님은 1배, 뒤 손님은 0.5배로 줄어든다.
    game.customers.forEach((c, i) => {
      c.patience -= dt * (i === 0 ? 1 : 0.5);
    });

    // 대기 중인 손님이 지치면 떠난다.
    for (let i = game.customers.length - 1; i >= 1; i--) {
      if (game.customers[i].patience <= 0) {
        game.customers.splice(i, 1);
        game.lives--;
        game.combo = 0;
        sfx.leave();
        setMessage('기다리다 지친 손님이 떠났습니다 (-1)', 2.2);
        if (game.lives <= 0) {
          gameOver();
          return;
        }
      }
    }
    ensureQueue();

    if (game.customers[0] && game.customers[0].patience <= 0) {
      game.customers[0].patience = 0;
      frontTimeout();
      return;
    }

    if (game.phase === 'baking') {
      game.bakeProgress = Math.min(100, game.bakeProgress + dt * (100 / 5));
      if (game.bakeProgress >= 100) {
        game.bakeQuality = 'burnt';
        game.phase = 'ready';
        setMessage('앗, 태워버렸다! 조각을 고르고 서빙하세요');
        sfx.fail();
      }
    }
  }

  // ---------- 버튼 ----------
  function addMuteButton(btns) {
    btns.push({
      x: 852,
      y: 12,
      w: 92,
      h: 32,
      label: game.muted ? '소리 OFF' : '소리 ON',
      size: 13,
      action: toggleMute,
    });
  }

  function getButtons() {
    const btns = [];

    if (game.phase === 'title') {
      ['easy', 'normal', 'hard'].forEach((id, i) => {
        btns.push({
          x: 286 + i * 134,
          y: 370,
          w: 120,
          h: 46,
          label: DIFFICULTIES[id].label,
          active: game.difficulty === id,
          action: () => {
            game.difficulty = id;
            sfx.select();
          },
        });
      });
      btns.push({ x: 380, y: 456, w: 200, h: 52, label: '시작하기', action: startGame });
      addMuteButton(btns);
      return btns;
    }

    if (game.phase === 'gameover') {
      btns.push({ x: 290, y: 420, w: 180, h: 52, label: '다시 시작', action: startGame });
      btns.push({ x: 490, y: 420, w: 180, h: 52, label: '메뉴로', action: goTitle });
      addMuteButton(btns);
      return btns;
    }

    if (game.phase === 'result') {
      btns.push({ x: 230, y: 414, w: 200, h: 44, label: '다음 손님', action: resolveResult });
      addMuteButton(btns);
      return btns;
    }

    const rows = [];
    Object.keys(DOUGHS).forEach((id) => {
      rows.push({ label: DOUGHS[id].label, size: 13, active: game.dough === id, action: () => setDough(id) });
    });
    Object.keys(SAUCES).forEach((id) => {
      rows.push({ label: SAUCES[id].label, size: 13, active: game.sauce === id, action: () => setSauce(id) });
    });
    Object.keys(CHEESES).forEach((id) => {
      rows.push({ label: CHEESES[id].label, size: 13, active: game.cheese === id, action: () => setCheese(id) });
    });
    rows.forEach((b, i) => {
      btns.push({ x: 16 + i * 102, y: 490, w: 96, h: 40, size: 13, ...b, disabled: game.phase !== 'playing' });
    });

    const toppingButtons = TOPPING_IDS.map((id, i) => ({
      label: TOPPINGS[id].label,
      size: 13,
      action: () => addTopping(id),
      active: false,
      disabled: game.phase !== 'playing',
    }));
    toppingButtons.push({
      label: '토핑 비우기',
      size: 13,
      action: clearToppings,
      active: false,
      disabled: game.phase !== 'playing' || game.placed.length === 0,
    });
    toppingButtons.forEach((b, i) => {
      btns.push({ x: 16 + i * 102, y: 536, w: 96, h: 40, ...b });
    });

    if (game.phase === 'playing') {
      btns.push({ x: 16, y: 582, w: 170, h: 46, label: '오븐에 넣기', action: startBake });
    } else if (game.phase === 'baking') {
      btns.push({ x: 16, y: 582, w: 170, h: 46, label: '꺼내기', action: takeOut });
    } else {
      btns.push({ x: 16, y: 582, w: 170, h: 46, label: '오븐 완료', disabled: true });
    }

    [4, 6, 8].forEach((n, i) => {
      btns.push({
        x: 196 + i * 90,
        y: 582,
        w: 82,
        h: 46,
        label: n + '조각',
        active: game.slices === n,
        disabled: game.phase === 'baking',
        action: () => {
          if (game.phase === 'baking') return;
          game.slices = n;
          sfx.click();
        },
      });
    });

    btns.push({
      x: 470,
      y: 582,
      w: 150,
      h: 46,
      label: '서빙하기',
      action: serve,
      disabled: game.phase !== 'ready',
    });

    addMuteButton(btns);
    return btns;
  }

  // ---------- 그리기 도우미 ----------
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(str, x, y, size = 16, color = C.text, align = 'left', bold = false, maxWidth) {
    ctx.fillStyle = color;
    ctx.font = `${bold ? 'bold ' : ''}${size}px "Apple SD Gothic Neo", "Malgun Gothic", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    if (maxWidth) ctx.fillText(str, x, y, maxWidth);
    else ctx.fillText(str, x, y);
  }

  function wrapText(str, maxWidth, font) {
    ctx.font = font;
    const words = str.split(' ');
    const lines = [];
    let line = '';
    words.forEach((w) => {
      const test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function drawButton(b) {
    ctx.save();
    ctx.globalAlpha = b.disabled ? 0.38 : 1;
    roundRect(b.x, b.y, b.w, b.h, 9);
    ctx.fillStyle = b.active ? '#FFE0B2' : '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = b.active ? 3 : 1.5;
    ctx.strokeStyle = b.active ? C.orange : '#C9A77C';
    ctx.stroke();
    text(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1, b.size || 15, C.text, 'center', true);
    ctx.restore();
  }

  function drawTopping(id, x, y) {
    if (id === 'pepperoni') {
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fillStyle = '#C62828';
      ctx.fill();
      ctx.fillStyle = '#8E1B1B';
      ctx.beginPath();
      ctx.arc(x - 4, y - 3, 2, 0, Math.PI * 2);
      ctx.arc(x + 4, y + 2, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'mushroom') {
      ctx.beginPath();
      ctx.arc(x, y - 2, 10, Math.PI, 0);
      ctx.fillStyle = '#8D6E63';
      ctx.fill();
      ctx.fillRect(x - 3, y - 2, 6, 9);
      ctx.fillStyle = '#A1887F';
      ctx.beginPath();
      ctx.arc(x - 2, y - 5, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (id === 'olive') {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.strokeStyle = '#33691E';
      ctx.lineWidth = 5;
      ctx.stroke();
    } else if (id === 'pineapple') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = '#FDD835';
      ctx.fillRect(-7, -7, 14, 14);
      ctx.strokeStyle = '#F9A825';
      ctx.lineWidth = 2;
      ctx.strokeRect(-7, -7, 14, 14);
      ctx.restore();
    } else if (id === 'onion') {
      ctx.beginPath();
      ctx.arc(x, y, 8, 0.2, Math.PI * 1.8);
      ctx.strokeStyle = '#B39DDB';
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (id === 'bellpepper') {
      ctx.beginPath();
      ctx.arc(x, y, 8, Math.PI * 0.15, Math.PI * 0.95);
      ctx.strokeStyle = '#43A047';
      ctx.lineWidth = 4;
      ctx.stroke();
    } else if (id === 'bacon') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.4);
      ctx.fillStyle = '#A1442B';
      ctx.fillRect(-10, -5, 20, 10);
      ctx.fillStyle = '#E8B4A0';
      ctx.fillRect(-10, -2, 20, 2);
      ctx.restore();
    } else if (id === 'shrimp') {
      ctx.beginPath();
      ctx.arc(x, y, 7, -0.4, Math.PI * 1.1);
      ctx.strokeStyle = '#FF8A65';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x + 5, y + 5, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#F4511E';
      ctx.fill();
    }
  }

  function drawPatienceBar(x, y, w, h, ratio) {
    const r = Math.max(0, Math.min(1, ratio));
    roundRect(x, y, w, h, h / 2);
    ctx.fillStyle = '#E8DFD2';
    ctx.fill();
    if (r > 0) {
      roundRect(x, y, Math.max(h, w * r), h, h / 2);
      ctx.fillStyle = r > 0.5 ? C.green : r > 0.25 ? C.orange : C.accent;
      ctx.fill();
    }
  }

  // ---------- 화면 ----------
  function drawBackground() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
  }

  function drawHUD() {
    text(`점수 ${game.score}`, 20, 30, 20, C.text, 'left', true);
    text(`콤보 x${game.combo}`, 165, 30, 16, C.sub, 'left', true);
    text(`스테이지 ${game.stage}`, 280, 30, 16, C.sub, 'left', true);
    text(`난이도 ${DIFFICULTIES[game.difficulty].label}`, 395, 30, 16, C.sub, 'left', true);
    text('❤'.repeat(Math.max(0, game.lives)), 530, 30, 18, C.accent, 'left', true);
    text(`서빙 ${game.served}`, 620, 30, 15, C.sub, 'left', true);
    text(`최고 ${game.best}`, 730, 30, 15, C.sub, 'left', true);
  }

  function drawStepChips() {
    const steps = ['도우', '소스', '치즈', '토핑', '굽기', '서빙'];
    let cur = 0;
    if (game.phase === 'playing') {
      cur = !game.sauce ? 1 : !game.cheese ? 2 : game.placed.length === 0 ? 3 : 4;
    } else if (game.phase === 'baking') cur = 4;
    else if (game.phase === 'ready') cur = 5;

    steps.forEach((s, i) => {
      const x = 130 + i * 82;
      roundRect(x, 74, 76, 26, 7);
      ctx.fillStyle = i < cur ? '#E8F5E9' : i === cur ? '#FFE0B2' : '#F5EFE6';
      ctx.fill();
      ctx.lineWidth = i === cur ? 2.5 : 1;
      ctx.strokeStyle = i === cur ? C.orange : '#E0D3C0';
      ctx.stroke();
      text((i + 1) + ' ' + s, x + 38, 88, 12, i === cur ? C.text : C.sub, 'center', i === cur);
    });
  }

  function drawPizza() {
    ctx.save();
    ctx.translate(PIZZA.cx, PIZZA.cy);

    ctx.beginPath();
    ctx.arc(0, 6, PIZZA.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, PIZZA.r, 0, Math.PI * 2);
    ctx.fillStyle = DOUGHS[game.dough].color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#A9784A';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, PIZZA.r - 12, 0, Math.PI * 2);
    ctx.fillStyle = '#F5D9A8';
    ctx.fill();

    if (game.sauce) {
      ctx.beginPath();
      ctx.arc(0, 0, PIZZA.r - 24, 0, Math.PI * 2);
      ctx.globalAlpha = 0.92;
      ctx.fillStyle = SAUCES[game.sauce].color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (game.cheese) {
      ctx.beginPath();
      ctx.arc(0, 0, PIZZA.r - 18, 0, Math.PI * 2);
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = CHEESES[game.cheese].color;
      ctx.fill();
      ctx.globalAlpha = 1;

      // 치즈 가루 느낌의 작은 점
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      for (let i = 0; i < 18; i++) {
        const a = i * 2.399;
        const d = 18 + ((i * 17) % 80);
        ctx.beginPath();
        ctx.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    game.placed.forEach((p) => {
      drawTopping(p.id, Math.cos(p.a) * p.d, Math.sin(p.a) * p.d);
    });

    // 굽는 정도에 따라 색이 진해진다.
    if (game.phase === 'baking' || game.phase === 'ready') {
      const alpha = Math.min(0.4, (game.bakeProgress / 100) * 0.4);
      ctx.beginPath();
      ctx.arc(0, 0, PIZZA.r - 14, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(90,45,10,${alpha})`;
      ctx.fill();
    }

    // 커팅 선
    if (game.phase === 'ready') {
      const n = game.slices;
      ctx.strokeStyle = 'rgba(70,45,25,0.55)';
      ctx.lineWidth = 2;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * (PIZZA.r - 10), Math.sin(a) * (PIZZA.r - 10));
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  function drawOvenFlames() {
    const t = performance.now() / 180;
    for (let i = 0; i < 7; i++) {
      const x = PIZZA.cx - 90 + i * 30;
      const h = 18 + Math.sin(t + i) * 6;
      const y = PIZZA.cy + PIZZA.r + 8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 8, y - h * 0.6, x + 4, y - h);
      ctx.quadraticCurveTo(x + 12, y - h * 0.4, x + 10, y);
      ctx.fillStyle = i % 2 ? 'rgba(255,152,0,0.85)' : 'rgba(229,57,53,0.8)';
      ctx.fill();
    }
  }

  function drawBakeGauge() {
    if (game.phase !== 'baking' && game.phase !== 'ready') return;
    const bx = 180;
    const by = 410;
    const bw = 300;
    const bh = 16;

    text('오븐 온도', 330, 398, 12, C.sub, 'center', true);
    ctx.fillStyle = 'rgba(251,140,0,0.28)';
    ctx.fillRect(bx, by, bw * 0.35, bh);
    ctx.fillStyle = 'rgba(67,160,71,0.4)';
    ctx.fillRect(bx + bw * 0.35, by, bw * 0.4, bh);
    ctx.fillStyle = 'rgba(198,40,40,0.35)';
    ctx.fillRect(bx + bw * 0.75, by, bw * 0.25, bh);

    if (game.phase === 'baking') {
      const mx = bx + (bw * game.bakeProgress) / 100;
      ctx.beginPath();
      ctx.moveTo(mx, by - 4);
      ctx.lineTo(mx, by + bh + 4);
      ctx.strokeStyle = C.text;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else {
      text(`결과: ${BAKE_LABEL[game.bakeQuality]}`, 330, 438, 13, C.sub, 'center', true);
    }
  }

  function drawWorkArea() {
    roundRect(16, 62, 628, 420, 14);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.panelBorder;
    ctx.stroke();

    text('작업대', 40, 88, 18, C.text, 'left', true);
    drawStepChips();
    drawPizza();

    if (game.phase === 'baking') {
      drawOvenFlames();
      if (game.bakeQuality === 'burnt') {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(PIZZA.cx - 40 + i * 40, PIZZA.cy - PIZZA.r - 10 - i * 8, 10 + i * 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(120,120,120,0.18)';
          ctx.fill();
        }
      }
    }

    drawBakeGauge();

    const hint =
      game.phase === 'playing'
        ? '소스 → 치즈 → 토핑 순서로 올리고 오븐에 넣으세요'
        : game.phase === 'baking'
        ? '초록 구간에서 꺼내면 완벽!'
        : game.phase === 'ready'
        ? '조각 수를 고르고 서빙하세요'
        : '';
    text(hint, PIZZA.cx, 462, 12, C.sub, 'center');
  }

  function drawCustomerPanel() {
    roundRect(656, 62, 288, 420, 14);
    ctx.fillStyle = C.panel;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = C.panelBorder;
    ctx.stroke();

    text('손님 대기열', 678, 88, 18, C.text, 'left', true);
    text(`${game.customers.length}명 대기`, 922, 88, 12, C.sub, 'right');

    const cur = game.customers[0];
    if (!cur) return;
    const o = cur.order;

    roundRect(672, 104, 256, 236, 10);
    ctx.fillStyle = C.soft;
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#EFE2D2';
    ctx.stroke();

    text('지금 손님', 686, 122, 12, C.sub, 'left', true);
    text(`도우  ${DOUGHS[o.dough].label}`, 686, 146, 14, C.text);
    text(`소스  ${SAUCES[o.sauce].label}`, 686, 170, 14, C.text);
    text(`치즈  ${CHEESES[o.cheese].label}`, 686, 194, 14, C.text);

    text('토핑', 686, 218, 14, C.text);
    const toppingStr = o.toppings.map((t) => TOPPINGS[t].label).join(', ');
    wrapText(toppingStr, 190, '14px "Apple SD Gothic Neo", sans-serif').forEach((line, i) => {
      text(line, 722, 238 + i * 19, 14, C.text);
    });

    text(`커팅  ${o.slices}조각`, 686, 286, 14, C.text);

    const ratio = cur.patience / cur.maxPatience;
    text('인내심', 686, 312, 11, C.sub, 'left', true);
    text(`${Math.ceil(cur.patience)}초`, 914, 312, 11, ratio < 0.25 ? C.accent : C.sub, 'right', true);
    drawPatienceBar(686, 322, 228, 12, ratio);

    ctx.beginPath();
    ctx.moveTo(678, 352);
    ctx.lineTo(922, 352);
    ctx.strokeStyle = C.panelBorder;
    ctx.lineWidth = 1;
    ctx.stroke();

    text('다음 손님', 678, 370, 13, C.sub, 'left', true);

    for (let i = 1; i < game.customers.length; i++) {
      const c = game.customers[i];
      const y = 390 + (i - 1) * 42;
      const names = c.order.toppings.map((t) => TOPPINGS[t].label).join(', ');
      const short = names.length > 15 ? names.slice(0, 14) + '…' : names;
      text(`${i}. ${short}`, 678, y, 12, C.text, 'left', false, 210);
      text(`${Math.ceil(c.patience)}초`, 914, y, 11, C.sub, 'right');
      const r = c.patience / c.maxPatience;
      drawPatienceBar(678, y + 12, 150, 7, r);
    }
  }

  function drawMessage() {
    if (game.messageTime <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.messageTime);
    roundRect(150, 104, 360, 32, 8);
    ctx.fillStyle = 'rgba(62,39,35,0.86)';
    ctx.fill();
    text(game.message, 330, 120, 13, '#FFFFFF', 'center', true, 340);
    ctx.restore();
  }

  function drawResultCard() {
    const r = game.result;
    if (!r) return;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 18;
    roundRect(80, 110, 500, 360, 16);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.restore();
    ctx.lineWidth = 3;
    ctx.strokeStyle = C.panelBorder;
    roundRect(80, 110, 500, 360, 16);
    ctx.stroke();

    const cx = 330;
    if (r.timeout) {
      text('⏰ 시간 초과!', cx, 160, 28, C.accent, 'center', true);
      text('손님이 기다리다 떠났습니다.', cx, 218, 17, C.text, 'center');
      text('목숨 -1', cx, 256, 16, C.sub, 'center');
      text(`현재 점수 ${game.score}`, cx, 312, 20, C.text, 'center', true);
    } else {
      const mood = r.failed ? '😡' : r.accuracy >= 0.999 ? '😍' : '😊';
      text(`${mood}  서빙 완료!`, cx, 150, 26, C.text, 'center', true);
      text(
        `정확도 ${Math.round(r.accuracy * 100)}%  ·  굽기 ${BAKE_LABEL[r.bakeQuality]}  ·  조각 ${
          r.sliceOk ? '✓' : '✗'
        }`,
        cx,
        188,
        14,
        C.sub,
        'center'
      );
      text(
        `도우 ${r.doughOk ? '✓' : '✗'}  소스 ${r.sauceOk ? '✓' : '✗'}  치즈 ${
          r.cheeseOk ? '✓' : '✗'
        }  토핑 ${Math.round(r.toppingAcc * 100)}%`,
        cx,
        214,
        14,
        C.sub,
        'center'
      );
      text(`기본 ${r.base} + 토핑 보너스 ${r.toppingBonus}`, cx, 252, 15, C.text, 'center');
      text(
        `콤보 x${game.combo}${r.tip ? `  ·  팁 +${r.tip}` : ''}`,
        cx,
        278,
        14,
        C.sub,
        'center'
      );
      text(`+${r.points + r.tip}점`, cx, 318, 28, C.green, 'center', true);
      text(`총점 ${game.score}`, cx, 350, 15, C.text, 'center', true);
      if (r.failed) text('손님이 실망했습니다. 목숨 -1', cx, 376, 12, C.accent, 'center');
    }

    text('자동으로 다음 손님이 들어옵니다...', cx, 398, 11, C.sub, 'center');
  }

  function drawTitle() {
    text('PIZZA RUSH', W / 2, 140, 56, C.accent, 'center', true);
    text('초간단 피자 만들기 미니 게임', W / 2, 188, 18, C.sub, 'center');

    ctx.save();
    ctx.translate(W / 2, 262);
    ctx.beginPath();
    ctx.arc(0, 0, 52, 0, Math.PI * 2);
    ctx.fillStyle = DOUGHS.basic.color;
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#A9784A';
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 42, 0, Math.PI * 2);
    ctx.fillStyle = '#F5D9A8';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 36, 0, Math.PI * 2);
    ctx.fillStyle = SAUCES.tomato.color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.globalAlpha = 0.72;
    ctx.fillStyle = CHEESES.mozzarella.color;
    ctx.fill();
    ctx.globalAlpha = 1;
    drawTopping('pepperoni', -15, -10);
    drawTopping('olive', 14, 12);
    drawTopping('mushroom', 8, -20);
    drawTopping('shrimp', -14, 16);
    ctx.restore();

    text('난이도 선택', W / 2, 340, 15, C.text, 'center', true);
    const d = DIFFICULTIES[game.difficulty];
    text(
      `손님 인내심 ${d.patience}초 · 요구 토핑 ${d.minToppings}~${d.maxToppings}개 · 점수 x${d.scoreMult}`,
      W / 2,
      432,
      13,
      C.sub,
      'center'
    );
    text('주문대로 만들고, 오븐에서 알맞게 구워 서빙하세요.', W / 2, 534, 14, C.sub, 'center');
    text(`최고 점수 ${game.best}`, W / 2, 560, 15, C.sub, 'center', true);
  }

  function drawGameOver() {
    text('GAME OVER', W / 2, 190, 50, C.accent, 'center', true);
    text(`최종 점수 ${game.score}`, W / 2, 265, 26, C.text, 'center', true);
    text(`최고 점수 ${game.best}`, W / 2, 308, 17, C.sub, 'center');
    text(
      `서빙 ${game.served}개 · 난이도 ${DIFFICULTIES[game.difficulty].label}`,
      W / 2,
      345,
      15,
      C.sub,
      'center'
    );
  }

  function render() {
    drawBackground();

    if (game.phase === 'title') {
      drawTitle();
    } else if (game.phase === 'gameover') {
      drawGameOver();
    } else {
      drawHUD();
      drawWorkArea();
      drawCustomerPanel();
      drawMessage();
      if (game.phase === 'result') drawResultCard();
    }

    getButtons().forEach(drawButton);
  }

  // ---------- 입력 ----------
  canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) * W) / rect.width;
    const y = ((e.clientY - rect.top) * H) / rect.height;

    for (const b of getButtons()) {
      if (b.disabled) continue;
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
        b.action();
        return;
      }
    }
  });

  // ---------- 루프 ----------
  let last = performance.now();
  function loop(t) {
    const dt = Math.min((t - last) / 1000, 0.05);
    last = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
