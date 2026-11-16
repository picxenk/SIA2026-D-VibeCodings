/* =========================================================
   전쟁시대 MVP — 게임 로직
   ========================================================= */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const DPR = Math.min(window.devicePixelRatio || 1, 2);
canvas.width = W * DPR;
canvas.height = H * DPR;
canvas.style.width = W + 'px';
canvas.style.height = H + 'px';
ctx.scale(DPR, DPR);

const SIDES = ['player', 'enemy'];
const GAME_TIMEOUT = 480; // 8분 — 기지 HP 비율로 승패
let world = null;

/* ---------------- 오디오 (절차적 BGM / SFX) ---------------- */

const audio = { ctx: null, muted: false, beatTimer: 0, step: 0 };

function ensureAudio() {
  if (!audio.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) audio.ctx = new AC();
  }
  if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume();
}

function playTone(freq, dur, type, vol, when) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime + (when || 0);
  const o = audio.ctx.createOscillator();
  const g = audio.ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g);
  g.connect(audio.ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function playNoise(dur, vol, when) {
  if (!audio.ctx || audio.muted) return;
  const t = audio.ctx.currentTime + (when || 0);
  const len = Math.max(1, Math.floor(audio.ctx.sampleRate * dur));
  const buf = audio.ctx.createBuffer(1, len, audio.ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = audio.ctx.createBufferSource();
  const g = audio.ctx.createGain();
  src.buffer = buf;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(g);
  g.connect(audio.ctx.destination);
  src.start(t);
}

function bgmTick(dt) {
  const w = world;
  if (!w || !w.started || w.paused || w.over) return;
  ensureAudio();
  if (audio.muted || !audio.ctx) return;

  const bgm = AGES[w.age.player - 1].bgm;
  const spb = 60 / bgm.tempo / 2; // 8분음표
  audio.beatTimer += dt;

  while (audio.beatTimer >= spb) {
    audio.beatTimer -= spb;
    audio.step++;
    const s = audio.step;

    // 베이스: 4스텝마다
    if (s % 4 === 0) {
      playTone(bgm.base, 0.32, bgm.wave, 0.05);
    }
    // 아르페지오: 스케일을 오르내리며
    const scale = bgm.scale;
    const idx = Math.floor(s / 2) % (scale.length * 2);
    const deg = idx < scale.length ? scale[idx] : scale[scale.length * 2 - 1 - idx];
    const oct = s % 16 < 8 ? 2 : 3;
    playTone(bgm.base * oct * Math.pow(2, deg / 12), 0.16, bgm.wave, 0.026);
    // 타악: 북소리
    if (s % 4 === 2) playNoise(0.09, 0.035);
    if (s % 2 === 1) playNoise(0.03, 0.012);
  }
}

function sfxEvolve() {
  for (let i = 0; i < 4; i++) {
    playTone(330 * Math.pow(2, i / 3), 0.3, 'triangle', 0.06, i * 0.08);
  }
}

function sfxCast() {
  playNoise(0.4, 0.06);
  playTone(70, 0.5, 'sawtooth', 0.07);
}

function sfxBoom() {
  if (audio.boomAt && audio.ctx && audio.ctx.currentTime - audio.boomAt < 0.07) return;
  audio.boomAt = audio.ctx ? audio.ctx.currentTime : 0;
  playNoise(0.22, 0.05);
  playTone(58, 0.32, 'sawtooth', 0.045);
}

function sfxEnd(win) {
  const notes = win ? [523, 659, 784, 1047] : [400, 340, 280, 200];
  notes.forEach((f, i) => playTone(f, 0.5, 'triangle', 0.07, i * 0.16));
}

/* ---------------- 상태 생성 ---------------- */

function makeBase(side) {
  return {
    kind: 'base',
    side,
    x: side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X,
    hp: BALANCE.baseHp,
    maxHp: BALANCE.baseHp,
    radius: 45,
    dead: false,
  };
}

function newWorld(difficulty) {
  const d = DIFF[difficulty] || DIFF.normal;
  return {
    difficulty,
    started: false,
    paused: false,
    over: false,
    result: null,
    time: 0,

    gold: { player: BALANCE.startGold, enemy: d.startGold },
    age: { player: 1, enemy: 1 },
    evolving: { player: 0, enemy: 0 },
    evolveTotal: { player: 0, enemy: 0 },
    evolveBuff: { player: 0, enemy: 0 },
    spawnCd: { player: {}, enemy: {} },

    units: [],
    turrets: [],
    projectiles: [],
    effects: [],
    strikes: [],
    shake: 0,
    flash: 0,
    specialCd: { player: 15, enemy: 20 },

    kills: { player: 0, enemy: 0 },

    playerBase: makeBase('player'),
    enemyBase: makeBase('enemy'),

    aiTimer: 0,
    idleTimer: 0,
    unitCap: { player: BALANCE.unitCap, enemy: (DIFF[difficulty] || DIFF.normal).aiCap },
  };
}

/* ---------------- 조회 / 자원 ---------------- */

function countUnits(side) {
  return world.units.filter((u) => !u.dead && u.side === side).length;
}

function countTurrets(side) {
  return world.turrets.filter((t) => !t.dead && t.side === side).length;
}

function addGold(side, amount) {
  world.gold[side] = Math.min(BALANCE.maxGold, world.gold[side] + amount);
}

function unitCapFor(side) {
  const base =
    side === 'player' ? BALANCE.unitCap : (DIFF[world.difficulty] || DIFF.normal).aiCap;
  return base + (world.age[side] - 1) * 2; // 시대가 오를수록 대형 부대
}

function canSpawn(side, cfg) {
  const w = world;
  return (
    w.started &&
    !w.over &&
    !w.paused &&
    w.evolving[side] <= 0 &&
    w.gold[side] >= cfg.cost &&
    (w.spawnCd[side][cfg.id] || 0) <= 0 &&
    countUnits(side) < unitCapFor(side)
  );
}

function trySpawn(side, cfg) {
  if (!canSpawn(side, cfg)) return false;
  const w = world;
  w.gold[side] -= cfg.cost;
  w.spawnCd[side][cfg.id] = cfg.spawnCooldown;
  spawnUnit(side, cfg);
  return true;
}

function spawnUnit(side, cfg) {
  const w = world;
  w.units.push({
    kind: 'unit',
    side,
    cfg,
    x: SPAWN_X[side] + (Math.random() * 16 - 8),
    dir: side === 'player' ? 1 : -1,
    speed: cfg.speed * (0.95 + Math.random() * 0.1),
    hp: cfg.hp,
    maxHp: cfg.hp,
    radius: cfg.radius,
    attackCd: 0.3 + Math.random() * 0.3,
    dead: false,
  });
  w.effects.push({ type: 'spawn', x: SPAWN_X[side], y: GROUND - 6, life: 0.3, max: 0.3 });
}

function tryEvolve(side) {
  const w = world;
  if (!w || !w.started || w.over) return false;
  const age = w.age[side];
  if (age >= AGES.length || w.evolving[side] > 0) return false;
  const cost = AGES[age - 1].evolveCost;
  if (w.gold[side] < cost) return false;

  w.gold[side] -= cost;
  applyEvolution(side);
  return true;
}

function applyEvolution(side) {
  const w = world;
  const age = w.age[side];
  if (age >= AGES.length || w.evolving[side] > 0) return;
  w.evolving[side] = AGES[age - 1].evolveTime;
  w.evolveTotal[side] = AGES[age - 1].evolveTime;
}

function buildTurret(side) {
  const w = world;
  if (!w || !w.started || w.over) return false;

  const slots = TURRET_SLOTS[side];
  const used = w.turrets.filter((t) => t.side === side && !t.dead).map((t) => t.x);
  const x = slots.find((s) => !used.includes(s));
  if (x === undefined) return false;

  const cfg = TURRETS[w.age[side] - 1];
  if (w.gold[side] < cfg.cost) return false;

  w.gold[side] -= cfg.cost;
  w.turrets.push({
    kind: 'turret',
    side,
    cfg,
    x,
    hp: cfg.hp,
    maxHp: cfg.hp,
    radius: cfg.radius,
    cd: 0.4,
    dead: false,
  });
  w.effects.push({ type: 'spawn', x, y: GROUND - 10, life: 0.3, max: 0.3 });
  return true;
}

/* ---------------- 전투 ---------------- */

function findTarget(u) {
  const w = world;
  let best = null;
  let bestD = Infinity;

  for (const e of w.units) {
    if (e.dead || e.side === u.side) continue;
    const d = Math.abs(e.x - u.x);
    if (d <= u.cfg.range + e.radius && d < bestD) {
      best = e;
      bestD = d;
    }
  }
  if (best) return best;

  for (const t of w.turrets) {
    if (t.dead || t.side === u.side) continue;
    const d = Math.abs(t.x - u.x);
    if (d <= u.cfg.range + t.radius && d < bestD) {
      best = t;
      bestD = d;
    }
  }
  if (best) return best;

  const base = u.side === 'player' ? w.enemyBase : w.playerBase;
  if (base && !base.dead) {
    const d = Math.abs(base.x - u.x);
    if (d <= u.cfg.range + base.radius) return base;
  }
  return null;
}

function targetY(kind) {
  if (kind === 'turret') return GROUND - TURRET_HEIGHT - 14;
  if (kind === 'base') return GROUND - 85;
  return GROUND - 25;
}

function fire(side, fromX, fromY, target, damage, speed, proj) {
  world.projectiles.push({
    side,
    x: fromX,
    y: fromY,
    ty: targetY(target.kind),
    target,
    damage,
    speed,
    proj,
    dead: false,
  });
}

function applyDamage(target, dmg, side) {
  const w = world;
  if (!target || target.dead) return;

  let amount = dmg;
  if (target.kind === 'base' && w.evolveBuff[target.side] > 0) {
    amount *= BALANCE.evolveBuffReduction;
  }
  target.hp -= amount;

  w.effects.push({
    type: 'hit',
    x: target.x,
    y: target.kind === 'base' ? GROUND - 100 : GROUND - 30,
    life: 0.18,
    max: 0.18,
  });

  if (target.hp > 0) return;
  target.hp = 0;

  if (target.kind === 'unit') {
    target.dead = true;
    w.kills[side] = (w.kills[side] || 0) + 1;
    addGold(side, target.cfg.cost * BALANCE.killGoldRate);
    w.effects.push({ type: 'death', x: target.x, y: GROUND - 24, life: 0.35, max: 0.35 });
  } else if (target.kind === 'turret') {
    target.dead = true;
    w.effects.push({ type: 'death', x: target.x, y: GROUND - 24, life: 0.45, max: 0.45 });
  } else if (target.kind === 'base') {
    target.dead = true;
    endGame(target.side === 'enemy' ? 'win' : 'lose');
  }
}

function updateUnit(u, dt) {
  const target = findTarget(u);
  u.attackCd = Math.max(0, u.attackCd - dt);

  if (!target) {
    u.x += u.dir * u.speed * dt;
  } else {
    const d = Math.abs(target.x - u.x);
    if (d <= u.cfg.range + target.radius) {
      if (u.attackCd <= 0) {
        if (u.cfg.projectileSpeed > 0) {
          fire(u.side, u.x, GROUND - u.cfg.radius * 1.8, target, u.cfg.damage, u.cfg.projectileSpeed, u.cfg.proj);
        } else {
          applyDamage(target, u.cfg.damage, u.side);
        }
        u.attackCd = u.cfg.attackInterval;
      }
    } else {
      u.x += u.dir * u.speed * dt;
    }
  }
  u.x = Math.max(20, Math.min(W - 20, u.x));
}

function updateTurret(t, dt) {
  t.cd = Math.max(0, t.cd - dt);
  if (t.cd > 0) return;

  let best = null;
  let bestD = Infinity;
  for (const u of world.units) {
    if (u.dead || u.side === t.side) continue;
    const d = Math.abs(u.x - t.x);
    if (d <= t.cfg.range + u.radius && d < bestD) {
      best = u;
      bestD = d;
    }
  }
  if (best) {
    t.cd = t.cfg.attackInterval;
    fire(t.side, t.x, GROUND - TURRET_HEIGHT - 12, best, t.cfg.damage, t.cfg.projectileSpeed, t.cfg.projectile);
  }
}

function updateProjectile(p, dt) {
  if (!p.target || p.target.dead || p.target.hp <= 0) {
    p.dead = true;
    return;
  }
  const dx = p.target.x - p.x;
  const dy = p.ty - p.y;
  const dist = Math.max(1, Math.hypot(dx, dy));
  const step = p.speed * dt;

  if (dist <= step + 8) {
    applyDamage(p.target, p.damage, p.side);
    p.dead = true;
  } else {
    p.x += (dx / dist) * step;
    p.y += (dy / dist) * step;
  }
}

/* ---------------- 스페셜 스킬 (광역 데미지) ---------------- */

function castSpecial(side) {
  const w = world;
  if (!w || !w.started || w.over || w.paused) return false;
  if (w.specialCd[side] > 0) return false;

  const age = w.age[side];
  const sp = AGES[age - 1].special;
  w.specialCd[side] = sp.cd;

  // 목표 지점: 적 유닛이 가장 밀집한 곳, 없으면 적 기지 앞
  const enemySide = side === 'player' ? 'enemy' : 'player';
  const enemies = w.units.filter((u) => !u.dead && u.side === enemySide);
  let cx;
  if (enemies.length > 0) {
    let best = enemies[0];
    let bestScore = -1;
    for (const e of enemies) {
      const score = enemies.filter((o) => Math.abs(o.x - e.x) < sp.radius).length;
      if (score > bestScore) {
        bestScore = score;
        best = e;
      }
    }
    cx = best.x;
  } else {
    const base = side === 'player' ? w.enemyBase : w.playerBase;
    cx = base.x + (side === 'player' ? -120 : 120);
  }

  const per = sp.dmg / sp.count;
  for (let i = 0; i < sp.count; i++) {
    w.strikes.push({
      side,
      dmg: per,
      x: cx + (Math.random() * 2 - 1) * sp.radius * 0.8,
      y: 30 + Math.random() * 40,
      delay: i * 0.09,
      proj: sp.proj,
    });
  }

  w.effects.push({
    type: 'cast',
    x: side === 'player' ? PLAYER_BASE_X : ENEMY_BASE_X,
    y: GROUND - 120,
    life: 0.5,
    max: 0.5,
    rad: 120,
  });
  w.flash = 0.35;
  w.shake = Math.max(w.shake, 0.45);
  sfxCast();
  return true;
}

function updateStrikes(dt) {
  const w = world;
  for (const s of w.strikes) {
    if (s.delay > 0) {
      s.delay -= dt;
      continue;
    }
    s.y += 950 * dt;
    if (s.y >= GROUND - 8) {
      s.dead = true;
      w.shake = Math.max(w.shake, 0.3);

      // 광역 피해: 유닛은 전량, 기지는 절반
      for (const u of w.units) {
        if (u.dead || u.side === s.side) continue;
        if (Math.abs(u.x - s.x) < 45) applyDamage(u, s.dmg, s.side);
      }
      const base = s.side === 'player' ? w.enemyBase : w.playerBase;
      if (!base.dead && Math.abs(base.x - s.x) < 75) {
        applyDamage(base, s.dmg * 0.6, s.side);
      }
      w.effects.push({ type: 'boom', x: s.x, y: GROUND - 12, life: 0.4, max: 0.4, rad: 70 });
      w.effects.push({ type: 'shock', x: s.x, y: GROUND - 4, life: 0.5, max: 0.5, rad: 190 });
      sfxBoom();
    }
  }
  w.strikes = w.strikes.filter((s) => !s.dead);
}

/* ---------------- 적 AI ---------------- */

function chooseAIUnit() {
  const w = world;
  const age = w.age.enemy;
  const candidates = [];

  for (let a = Math.max(1, age - 1); a <= age; a++) {
    const weight = a === age ? 0.4 : 0.6;
    const list = UNITS.filter((u) => u.age === a);
    for (const u of list) candidates.push({ u, w: weight / list.length });
  }

  const total = candidates.reduce((s, c) => s + c.w, 0);
  let r = Math.random() * total;
  let chosen = candidates[0].u;
  for (const c of candidates) {
    r -= c.w;
    if (r <= 0) {
      chosen = c.u;
      break;
    }
  }
  if (canSpawn('enemy', chosen)) return chosen;

  const affordable = UNITS.filter((u) => u.age <= age && canSpawn('enemy', u))
    .sort((a, b) => a.cost - b.cost);
  return affordable.length ? affordable[0] : null;
}

function updateAI(dt) {
  const w = world;
  const d = DIFF[w.difficulty];
  w.aiTimer -= dt;
  w.idleTimer += dt;
  if (w.aiTimer > 0) return;
  w.aiTimer = d.decide;

  const side = 'enemy';
  if (w.evolving[side] > 0) return;
  const age = w.age[side];
  const units = countUnits(side);

  // 1. 시대 진화 — 자금이 모이면 진화하고, 절반 이상 모이면 저축 시작
  if (age < AGES.length) {
    const need = AGES[age - 1].evolveCost + d.reserve;
    if (w.gold[side] >= need && tryEvolve(side)) {
      w.idleTimer = 0;
      return;
    }
    if (w.gold[side] >= need * 0.5 && units >= 7) {
      return; // 저축 모드: 방어 유닛 7기만 유지
    }
  }

  // 1.5 스페셜 스킬 — 적 유닛이 3기 이상이면 사용
  if (w.specialCd[side] <= 0 && countUnits('player') >= 3) {
    castSpecial(side);
  }

  // 2. 터렛 건설
  if (countTurrets(side) < 2) {
    const t = TURRETS[age - 1];
    const threat = w.units.some(
      (u) => u.side === 'player' && !u.dead && u.x > 380
    );
    if (threat && w.gold[side] >= t.cost + 100) {
      if (buildTurret(side)) {
        w.idleTimer = 0;
        return;
      }
    }
  }

  // 3. 유닛 생산
  const pick = chooseAIUnit();
  if (pick && trySpawn(side, pick)) {
    w.idleTimer = 0;
    return;
  }

  // 4. 3초 이상 아무것도 못 했으면 가장 싼 유닛 강제 시도
  if (w.idleTimer > 2.5) {
    const cheapest = UNITS.filter((u) => u.age <= age)
      .sort((a, b) => a.cost - b.cost)[0];
    if (trySpawn(side, cheapest)) w.idleTimer = 0;
  }
}

/* ---------------- 메인 업데이트 ---------------- */

function update(dt) {
  const w = world;
  if (!w || !w.started || w.paused || w.over) return;

  w.time += dt;

  // 골드 (뒤처진 쪽에 수입 보정, 5분 이후 후반 수입 부스트)
  const lateBoost = w.time > 300 ? 1.4 : 1;
  const playerComeback = 1 + 0.25 * Math.max(0, w.age.enemy - w.age.player);
  const enemyComeback = 1 + 0.25 * Math.max(0, w.age.player - w.age.enemy);
  w.gold.player = Math.min(
    BALANCE.maxGold,
    w.gold.player + AGES[w.age.player - 1].income * playerComeback * lateBoost * dt
  );
  w.gold.enemy = Math.min(
    BALANCE.maxGold,
    w.gold.enemy + AGES[w.age.enemy - 1].income * DIFF[w.difficulty].income * enemyComeback * lateBoost * dt
  );

  // 시대 진화 / 진화 버프
  for (const side of SIDES) {
    if (w.evolving[side] > 0) {
      w.evolving[side] -= dt;
      if (w.evolving[side] <= 0) {
        w.evolving[side] = 0;
        w.age[side] += 1;
        w.evolveBuff[side] = BALANCE.evolveBuffTime;
        const base = side === 'player' ? w.playerBase : w.enemyBase;
        w.effects.push({
          type: 'evolve',
          x: base.x,
          y: GROUND - 90,
          life: 0.7,
          max: 0.7,
        });
        sfxEvolve();
      }
    }
    if (w.evolveBuff[side] > 0) {
      w.evolveBuff[side] = Math.max(0, w.evolveBuff[side] - dt);
    }
  }

  // 생산 쿨다운
  for (const side of SIDES) {
    const cds = w.spawnCd[side];
    for (const id in cds) {
      if (cds[id] > 0) cds[id] = Math.max(0, cds[id] - dt);
    }
  }

  for (const u of w.units) {
    if (!u.dead) updateUnit(u, dt);
  }
  for (const t of w.turrets) {
    if (!t.dead) updateTurret(t, dt);
  }
  for (const p of w.projectiles) {
    if (!p.dead) updateProjectile(p, dt);
  }

  for (const e of w.effects) e.life -= dt;
  w.effects = w.effects.filter((e) => e.life > 0);

  // 스페셜 쿨다운 / 폭격 / 화면 진동 / BGM
  for (const side of SIDES) {
    if (w.specialCd[side] > 0) {
      w.specialCd[side] = Math.max(0, w.specialCd[side] - dt);
    }
  }
  updateStrikes(dt);
  if (w.shake > 0) w.shake = Math.max(0, w.shake - dt);
  if (w.flash > 0) w.flash = Math.max(0, w.flash - dt * 1.8);
  bgmTick(dt);

  updateAI(dt);

  // 장기전 판정: 기지 HP 비율로 승패
  if (!w.over && w.time >= GAME_TIMEOUT) {
    const pRatio = w.playerBase.hp / w.playerBase.maxHp;
    const eRatio = w.enemyBase.hp / w.enemyBase.maxHp;
    endGame(pRatio >= eRatio ? 'win' : 'lose');
  }

  w.units = w.units.filter((u) => !u.dead);
  w.turrets = w.turrets.filter((t) => !t.dead);
  w.projectiles = w.projectiles.filter((p) => !p.dead);
}

/* ---------------- 렌더링 ---------------- */

function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawHpBar(x, y, w, h, ratio, color) {
  const r = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = 'rgba(0, 0, 0, .55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * r, h);
  ctx.strokeStyle = 'rgba(255, 255, 255, .25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function drawMotif(motif) {
  if (motif === 'jungle') {
    ctx.fillStyle = 'rgba(0, 0, 0, .18)';
    for (let i = 0; i < 8; i++) {
      const x = (i * 173 + 30) % W;
      const h = 50 + ((i * 47) % 70);
      ctx.fillRect(x - 2, GROUND - h * 0.4, 4, h * 0.4);
      ctx.beginPath();
      ctx.ellipse(x, GROUND - h * 0.45, 26, 10, -0.5 + i * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, .16)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      const x = (i * 61) % W;
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 10);
      ctx.lineTo(x + 3, GROUND - 2);
      ctx.stroke();
    }
  } else if (motif === 'swamp') {
    ctx.fillStyle = 'rgba(35, 70, 80, .45)';
    for (let i = 0; i < 4; i++) {
      const x = (i * 271 + 100) % W;
      ctx.beginPath();
      ctx.ellipse(x, GROUND + 22, 95, 15, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, .25)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      const x = (i * 97) % W;
      const h = 18 + ((i * 31) % 26);
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 8);
      ctx.quadraticCurveTo(x + 5, GROUND - h * 0.6, x + 11, GROUND - h);
      ctx.stroke();
    }
  } else if (motif === 'savanna') {
    ctx.fillStyle = 'rgba(0, 0, 0, .2)';
    for (let i = 0; i < 4; i++) {
      const x = (i * 311 + 60) % W;
      ctx.fillRect(x - 4, GROUND - 70, 8, 70);
      ctx.beginPath();
      ctx.ellipse(x, GROUND - 76, 52, 19, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0, 0, 0, .2)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 44; i++) {
      const x = (i * 53) % W;
      ctx.beginPath();
      ctx.moveTo(x, GROUND + 18);
      ctx.lineTo(x + 3, GROUND + 4);
      ctx.stroke();
    }
  } else if (motif === 'volcano') {
    ctx.fillStyle = 'rgba(70, 22, 16, .6)';
    ctx.beginPath();
    ctx.moveTo(280, GROUND);
    ctx.lineTo(430, 170);
    ctx.lineTo(580, GROUND);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 140, 40, .8)';
    ctx.beginPath();
    ctx.moveTo(400, 200);
    ctx.lineTo(430, 170);
    ctx.lineTo(460, 200);
    ctx.lineTo(430, 186);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 120, 30, .45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(430, GROUND);
    ctx.lineTo(448, GROUND - 26);
    ctx.lineTo(418, GROUND - 48);
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, .25)';
    for (let i = 0; i < 3; i++) {
      const x = (i * 397 + 110) % W;
      ctx.fillRect(x - 4, GROUND - 58, 8, 58);
      for (let k = 0; k < 5; k++) {
        ctx.beginPath();
        ctx.ellipse(
          x + Math.cos(k * 1.25) * 24, GROUND - 60 + Math.sin(k * 1.25) * 10,
          22, 7, k * 1.25, 0, Math.PI * 2
        );
        ctx.fill();
      }
    }
  } else if (motif === 'space') {
    ctx.fillStyle = 'rgba(255, 255, 255, .8)';
    for (let i = 0; i < 80; i++) {
      const x = (i * 137) % W;
      const y = (i * 79) % 340;
      const s = ((i * 13) % 3) * 0.6 + 0.7;
      ctx.fillRect(x, y, s, s);
    }
    ctx.fillStyle = 'rgba(130, 90, 230, .5)';
    for (let i = 0; i < 6; i++) {
      const x = (i * 231 + 60) % W;
      const h = 30 + ((i * 23) % 40);
      ctx.beginPath();
      ctx.moveTo(x, GROUND - h);
      ctx.lineTo(x + 13, GROUND);
      ctx.lineTo(x - 13, GROUND);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(180, 150, 255, .22)';
    for (let i = 0; i < 4; i++) {
      const x = (i * 311 + 150) % W;
      const y = 110 + ((i * 67) % 160);
      ctx.beginPath();
      ctx.ellipse(x, y, 22, 10, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawBackground() {
  const theme = AGES[world.age.player - 1];

  const g = ctx.createLinearGradient(0, 0, 0, GROUND);
  g.addColorStop(0, theme.sky[0]);
  g.addColorStop(1, theme.sky[1]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255, 255, 255, .22)';
  ctx.beginPath();
  ctx.arc(740, 100, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, .14)';
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  ctx.lineTo(0, 330);
  const peaks = [
    [80, 300], [210, 225], [350, 320], [500, 245],
    [650, 315], [790, 235], [900, 300], [960, 280],
  ];
  for (const [x, y] of peaks) ctx.lineTo(x, y);
  ctx.lineTo(W, GROUND);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = theme.ground;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = 'rgba(255, 255, 255, .06)';
  ctx.fillRect(0, GROUND, W, 4);

  drawMotif(theme.motif);

  ctx.fillStyle = 'rgba(0, 0, 0, .18)';
  for (let i = 0; i < 34; i++) {
    const x = (i * 137) % W;
    const y = GROUND + 14 + ((i * 53) % 74);
    ctx.fillRect(x, y, 7, 2);
  }
}

function drawBase(b) {
  const x = b.x;
  const y = GROUND;
  const color = b.side === 'player' ? '#2f6fed' : '#e23b3b';

  ctx.fillStyle = 'rgba(0, 0, 0, .25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 4, 54, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  roundRect(x - 38, y - 110, 76, 110, 4);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, .16)';
  ctx.fillRect(x - 38, y - 110, 76, 8);

  ctx.fillStyle = color;
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(x - 38 + i * 21, y - 124, 12, 14);
  }

  ctx.fillStyle = 'rgba(0, 0, 0, .38)';
  roundRect(x - 12, y - 34, 24, 34, 3);
  ctx.fill();

  ctx.strokeStyle = '#dddddd';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y - 124);
  ctx.lineTo(x, y - 165);
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 165);
  ctx.lineTo(x + 28, y - 155);
  ctx.lineTo(x, y - 145);
  ctx.closePath();
  ctx.fill();

  drawHpBar(x - 48, y - 188, 96, 7, b.hp / b.maxHp, color);
}

function drawCreature(era, role, x, r, dir, color) {
  const y = GROUND;
  let top = -r * 2;
  let badgeY = -r * 0.9;

  // 그림자
  ctx.fillStyle = 'rgba(0, 0, 0, .22)';
  ctx.beginPath();
  ctx.ellipse(x, y + 2, r * 1.15, r * 0.22, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  const dark = 'rgba(0, 0, 0, .28)';
  const eye = 'rgba(10, 10, 20, .85)';

  if (era === 1) {
    /* --- 곤충: 다리 3쌍 + 분절 몸통 + 더듬이 --- */
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1.4, r * 0.15);
    for (let i = 0; i < 3; i++) {
      const lx = -r * 0.5 + i * r * 0.45;
      ctx.beginPath();
      ctx.moveTo(lx, -r * 0.6);
      ctx.lineTo(lx - r * 0.3, -r * 0.04);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(lx, -r * 0.6);
      ctx.lineTo(lx + r * 0.25, -r * 0.04);
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-r * 0.75, -r * 0.72, r * 0.58, r * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.88, r * 0.95, r * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.88, -r * 1.05, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(r * 1.1, -r * 1.3);
    ctx.lineTo(r * 1.45, -r * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.85, -r * 1.38);
    ctx.lineTo(r * 1.0, -r * 1.95);
    ctx.stroke();
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(r * 1.0, -r * 1.12, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
    top = -r * 2.05;
    badgeY = -r * 0.9;
  } else if (era === 2) {
    /* --- 파충류: 긴 몸 + 꼬리 + 길쭉한 머리 --- */
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.45);
    ctx.lineTo(-r * 2.1, -r * 0.05);
    ctx.lineTo(-r * 0.85, -r * 0.95);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = dark;
    ctx.lineWidth = Math.max(1.6, r * 0.18);
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.65);
    ctx.lineTo(-r * 0.5, -r * 0.02);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.65);
    ctx.lineTo(r * 0.62, -r * 0.02);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.62, r * 1.25, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(r * 1.32, -r * 0.88, r * 0.58, r * 0.33, -0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(r * 1.5, -r * 0.95, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    top = -r * 1.55;
    badgeY = -r * 0.65;
  } else if (era === 3) {
    /* --- 동물: 4다리 몸통 + 귀 있는 머리 --- */
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.6, r * 0.2);
    ctx.beginPath();
    ctx.moveTo(-r * 0.85, -r * 0.95);
    ctx.quadraticCurveTo(-r * 1.4, -r * 1.1, -r * 1.5, -r * 1.45);
    ctx.stroke();
    ctx.fillStyle = color;
    for (const lx of [-r * 0.62, -r * 0.28, r * 0.3, r * 0.66]) {
      ctx.fillRect(lx, -r * 0.62, r * 0.24, r * 0.62);
    }
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.98, r * 1.05, r * 0.66, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(r * 0.95, -r * 1.46, r * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 0.6, -r * 1.72);
    ctx.lineTo(r * 0.78, -r * 2.1);
    ctx.lineTo(r * 0.95, -r * 1.68);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(r * 1.15, -r * 1.72);
    ctx.lineTo(r * 1.32, -r * 2.05);
    ctx.lineTo(r * 1.42, -r * 1.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(r * 1.12, -r * 1.5, r * 0.1, 0, Math.PI * 2);
    ctx.fill();
    top = -r * 2.15;
    badgeY = -r * 1.0;
  } else if (era === 4) {
    /* --- 공룡: 거대한 몸통 + 꼬리 + 긴 목 --- */
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-r * 0.75, -r * 1.25);
    ctx.lineTo(-r * 2.35, -r * 0.45);
    ctx.lineTo(-r * 0.75, -r * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-r * 0.65, -r * 0.85, r * 0.38, r * 0.85);
    ctx.fillRect(r * 0.4, -r * 0.85, r * 0.38, r * 0.85);
    ctx.beginPath();
    ctx.ellipse(0, -r * 1.18, r * 1.2, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(2, r * 0.45);
    if (role === 'melee') {
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 1.65);
      ctx.quadraticCurveTo(r * 1.25, -r * 2.0, r * 1.5, -r * 2.15);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(r * 1.72, -r * 2.18, r * 0.62, r * 0.38, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(r * 1.88, -r * 2.28, r * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
    top = -r * 2.7;
    badgeY = -r * 1.2;
  } else {
    /* --- 외계인: 공중 부유 몸체 + 큰 눈 + 텐타클 --- */
    ctx.fillStyle = 'rgba(150, 110, 255, .22)';
    ctx.beginPath();
    ctx.arc(0, -r * 1.3, r * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.4, r * 0.16);
    if (role === 'melee') {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.4, -r * 0.72);
        ctx.quadraticCurveTo(i * r * 0.55, -r * 0.4, i * r * 0.35, -r * 0.04);
        ctx.stroke();
      }
    }
    if (role !== 'heavy') {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(0, -r * 1.28, r * 0.86, r * 1.02, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b0a18';
      ctx.beginPath();
      ctx.ellipse(r * 0.16, -r * 1.38, r * 0.46, r * 0.58, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#67e8f9';
      ctx.beginPath();
      ctx.ellipse(r * 0.24, -r * 1.38, r * 0.2, r * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.2, r * 0.13);
    ctx.beginPath();
    ctx.moveTo(0, -r * 2.25);
    ctx.lineTo(r * 0.18, -r * 2.6);
    ctx.stroke();
    top = -r * 2.7;
    badgeY = -r * 1.3;
  }

  // 역할별 추가 묘사 (날개·로터·코·갑shell 등)
  drawRoleExtras(era, role, r, color, eye);

  ctx.restore();
  return { top, badgeY };
}

/* 시대 안에서도 역할별로 실루엣을 차별화한다 */
function drawRoleExtras(era, role, r, color, eye) {
  if (era === 1) {
    if (role === 'ranged') {
      // 벌: 투명한 날개 + 비행
      ctx.fillStyle = 'rgba(255, 255, 255, .38)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.25, -r * 1.35, r * 0.95, r * 0.36, -0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.4, -r * 1.4, r * 0.85, r * 0.32, 0.35, 0, Math.PI * 2);
      ctx.fill();
    } else if (role === 'heavy') {
      // 갑옷벌레: 둥근 등껍질
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, -r * 1.0, r * 1.2, r * 0.95, 0, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 255, 255, .18)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.15, -r * 1.05, r * 0.75, r * 0.6, 0, Math.PI, Math.PI * 2);
      ctx.fill();
    }
  } else if (era === 2) {
    if (role === 'heavy') {
      // 악어: 긴 주둥이 + 이빨
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(r * 1.95, -r * 0.78, r * 0.8, r * 0.24, -0.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f8fafc';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(r * 1.45 + i * r * 0.24, -r * 0.68, r * 0.09, r * 0.16);
      }
    } else if (role === 'ranged') {
      // 도마뱀: 뒤다리 + 긴 꼬리
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.4, r * 0.15);
      ctx.beginPath();
      ctx.moveTo(-r * 0.2, -r * 0.5);
      ctx.quadraticCurveTo(-r * 0.5, -r * 0.1, -r * 0.15, -r * 0.02);
      ctx.stroke();
    }
  } else if (era === 3) {
    if (role === 'ranged') {
      // 원숭이: 긴 팔 + 꼬리
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(1.4, r * 0.17);
      ctx.beginPath();
      ctx.moveTo(r * 0.6, -r * 1.15);
      ctx.quadraticCurveTo(r * 1.45, -r * 1.25, r * 1.25, -r * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 1.0);
      ctx.quadraticCurveTo(-r * 1.7, -r * 0.95, -r * 1.75, -r * 1.55);
      ctx.stroke();
    } else if (role === 'heavy') {
      // 코끼리: 큰 귀 + 코 + 굵은 다리
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(r * 0.45, -r * 1.5, r * 0.45, r * 0.6, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(r * 1.25, -r * 1.4);
      ctx.quadraticCurveTo(r * 1.85, -r * 1.0, r * 1.55, -r * 0.62);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(-r * 0.85, -r * 0.75, r * 0.42, r * 0.75);
      ctx.fillRect(r * 0.55, -r * 0.75, r * 0.42, r * 0.75);
    }
  } else if (era === 4) {
    if (role === 'ranged') {
      // 날개 공룡: 거대한 날개 + 비행
      ctx.fillStyle = 'rgba(255, 255, 255, .28)';
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.3);
      ctx.lineTo(-r * 0.5, -r * 2.6);
      ctx.lineTo(r * 1.7, -r * 2.0);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, -r * 1.3);
      ctx.lineTo(r * 0.5, -r * 2.6);
      ctx.lineTo(-r * 1.7, -r * 2.0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(r * 1.0, -r * 1.95, r * 0.5, r * 0.3, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(r * 1.14, -r * 2.02, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else if (role === 'heavy') {
      // 브라키오: 긴 목 + 4개의 굵은 다리
      ctx.strokeStyle = color;
      ctx.lineWidth = Math.max(2.4, r * 0.5);
      ctx.beginPath();
      ctx.moveTo(r * 0.25, -r * 1.7);
      ctx.quadraticCurveTo(r * 0.45, -r * 2.6, r * 0.55, -r * 3.1);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(r * 0.62, -r * 3.2, r * 0.52, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.arc(r * 0.8, -r * 3.26, r * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.fillRect(-r * 0.95, -r * 0.62, r * 0.45, r * 0.62);
      ctx.fillRect(r * 0.5, -r * 0.62, r * 0.45, r * 0.62);
    }
  } else if (era === 5) {
    if (role === 'ranged') {
      // 사이보 드론: 로터 + 공중 비행
      ctx.strokeStyle = 'rgba(190, 225, 255, .9)';
      ctx.lineWidth = Math.max(1.4, r * 0.13);
      ctx.beginPath();
      ctx.moveTo(-r * 1.0, -r * 1.95);
      ctx.lineTo(r * 1.0, -r * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.55, -r * 1.55);
      ctx.lineTo(-r * 1.0, -r * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.55, -r * 1.55);
      ctx.lineTo(r * 1.0, -r * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r * 0.7, -r * 2.4);
      ctx.lineTo(-r * 0.7, -r * 1.95);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(r * 0.7, -r * 2.4);
      ctx.lineTo(r * 0.7, -r * 1.95);
      ctx.stroke();
    } else if (role === 'heavy') {
      // 전투 메카: 각진 몸통 + 어깨 + 바이저 + 추진기
      ctx.fillStyle = color;
      ctx.fillRect(-r * 0.85, -r * 1.85, r * 1.7, r * 1.0);
      ctx.fillRect(-r * 1.25, -r * 1.95, r * 0.5, r * 0.6);
      ctx.fillRect(r * 0.75, -r * 1.95, r * 0.5, r * 0.6);
      ctx.fillRect(-r * 0.65, -r * 0.85, r * 0.48, r * 0.85);
      ctx.fillRect(r * 0.17, -r * 0.85, r * 0.48, r * 0.85);
      ctx.fillStyle = '#67e8f9';
      ctx.fillRect(-r * 0.55, -r * 1.7, r * 1.1, r * 0.28);
      ctx.fillStyle = 'rgba(103, 232, 249, .35)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, -r * 0.02, r * 0.3, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(r * 0.4, -r * 0.02, r * 0.3, r * 0.16, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawUnit(u) {
  const x = u.x;
  const r = u.cfg.radius;
  const color = u.side === 'player' ? '#2f6fed' : '#e23b3b';

  const info = drawCreature(u.cfg.age, u.cfg.role, x, r, u.dir, color);

  // 유닛 정체성 아이콘 배지
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${Math.round(r * 1.15)}px "Apple Color Emoji", "Segoe UI Emoji", serif`;
  ctx.fillText(u.cfg.icon, x, GROUND + info.badgeY);

  drawHpBar(x - r * 1.15, GROUND + info.top - 10, r * 2.3, 4, u.hp / u.maxHp, color);
}

function drawTurret(t) {
  const x = t.x;
  const y = GROUND - TURRET_HEIGHT; // 기지 위 탑 위에 올라간 터렛
  const color = t.side === 'player' ? '#2f6fed' : '#e23b3b';

  // 지면에서 터렛까지 기둥
  ctx.fillStyle = 'rgba(0, 0, 0, .3)';
  ctx.fillRect(x - 7, GROUND - TURRET_HEIGHT, 14, TURRET_HEIGHT);
  ctx.fillStyle = 'rgba(255, 255, 255, .12)';
  ctx.fillRect(x - 7, GROUND - TURRET_HEIGHT, 4, TURRET_HEIGHT);

  ctx.fillStyle = 'rgba(0, 0, 0, .22)';
  ctx.beginPath();
  ctx.ellipse(x, GROUND + 2, 15, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // 터렛 몸체
  ctx.fillStyle = '#3a3f4b';
  roundRect(x - 14, y - 26, 28, 26, 4);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.fillRect(x - 16, y - 30, 32, 7);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '16px "Apple Color Emoji", "Segoe UI Emoji", serif';
  ctx.fillText(t.cfg.icon, x, y - 13);

  drawHpBar(x - 17, y - 40, 34, 4, t.hp / t.maxHp, color);
}

const PROJ_STYLE = {
  acid:   { color: '#a3e635', len: 0,  w: 4.5, type: 'circle' },
  venom:  { color: '#84cc16', len: 11, w: 2.5, type: 'line' },
  bone:   { color: '#f5f5f4', len: 12, w: 2.5, type: 'bone' },
  fire:   { color: '#fb923c', len: 0,  w: 5,   type: 'circle' },
  plasma: { color: '#e879f9', len: 18, w: 3.5, type: 'line' },
  rock:   { color: '#9ca3af', len: 0,  w: 4,   type: 'circle' },
  arrow:  { color: '#8b5a2b', len: 12, w: 2,   type: 'line' },
  bolt:   { color: '#4b5563', len: 9,  w: 3,   type: 'line' },
  bullet: { color: '#fde68a', len: 6,  w: 2,   type: 'line' },
  laser:  { color: '#67e8f9', len: 18, w: 3,   type: 'line' },
};

function drawProjectile(p) {
  const st = PROJ_STYLE[p.proj] || PROJ_STYLE.acid;
  const dir = p.side === 'player' ? 1 : -1;

  if (st.type === 'circle') {
    // 잔상
    ctx.fillStyle = st.color;
    ctx.globalAlpha = 0.35;
    ctx.beginPath();
    ctx.arc(p.x - dir * 5, p.y, st.w * 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, st.w, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.type === 'bone') {
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.w;
    ctx.beginPath();
    ctx.moveTo(p.x - dir * st.len, p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(p.x - dir * st.len, p.y, st.w * 0.9, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = st.color;
    ctx.lineWidth = st.w;
    ctx.beginPath();
    ctx.moveTo(p.x - dir * st.len, p.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    if (p.proj === 'plasma' || p.proj === 'laser') {
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = st.w * 2.8;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }
}

function drawEffect(e) {
  const k = 1 - e.life / e.max;
  const big = e.type === 'evolve' ? 2.4 : e.type === 'death' ? 1.4 : 1;
  const radius = 4 + k * 18 * big;

  if (e.type === 'shock') {
    // 지면 충격파
    const rx = 16 + k * (e.rad || 180);
    ctx.strokeStyle = `rgba(255, 240, 190, ${(1 - k) * 0.85})`;
    ctx.lineWidth = 7 * (1 - k) + 1;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, rx, rx * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - k) * 0.45})`;
    ctx.beginPath();
    ctx.ellipse(e.x, e.y, rx * 0.7, rx * 0.21, 0, 0, Math.PI * 2);
    ctx.stroke();
    return;
  }

  const colors = {
    evolve: `rgba(180, 200, 255, ${1 - k})`,
    boom: `rgba(255, ${Math.round(160 - k * 100)}, 60, ${1 - k})`,
    cast: `rgba(255, 255, 160, ${1 - k})`,
  };
  ctx.strokeStyle = colors[e.type] || `rgba(255, 255, 255, ${(1 - k) * 0.8})`;
  ctx.lineWidth = e.type === 'evolve' ? 3 : e.type === 'boom' ? 4 : 2;
  ctx.beginPath();
  ctx.arc(e.x, e.y, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (e.type === 'boom') {
    // 폭발 파편
    ctx.fillStyle = `rgba(255, 200, 80, ${(1 - k) * 0.9})`;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + k * 2;
      const d = radius * 1.2;
      ctx.fillRect(e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * 0.6, 3, 3);
    }
  }
}

function drawStrikes() {
  for (const s of world.strikes) {
    if (s.delay > 0) continue;
    const st = PROJ_STYLE[s.proj] || PROJ_STYLE.rock;
    // 낙하 트레일
    ctx.strokeStyle = st.type === 'circle' ? 'rgba(200, 200, 210, .5)' : st.color;
    ctx.lineWidth = st.type === 'circle' ? 5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(s.x, s.y - 26);
    ctx.lineTo(s.x, s.y);
    ctx.stroke();
  }
}

function render() {
  if (!world) return;

  ctx.save();
  if (world.shake > 0) {
    ctx.translate(
      (Math.random() * 2 - 1) * world.shake * 14,
      (Math.random() * 2 - 1) * world.shake * 10
    );
  }

  drawBackground();
  drawBase(world.playerBase);
  drawBase(world.enemyBase);

  const ents = [
    ...world.turrets.filter((t) => !t.dead),
    ...world.units.filter((u) => !u.dead),
  ].sort((a, b) => a.x - b.x);

  for (const e of ents) {
    if (e.kind === 'turret') drawTurret(e);
    else drawUnit(e);
  }

  for (const p of world.projectiles) {
    if (!p.dead) drawProjectile(p);
  }
  drawStrikes();
  for (const e of world.effects) drawEffect(e);

  ctx.restore();

  // 스킬 사용 플래시
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(0.32, world.flash * 0.32)})`;
    ctx.fillRect(0, 0, W, H);
  }
}
