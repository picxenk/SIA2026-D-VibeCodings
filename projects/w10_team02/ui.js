/* =========================================================
   전쟁시대 MVP — UI / 입력 / 게임 루프
   ========================================================= */

const stage = document.getElementById('stage');
const overlay = document.getElementById('overlay');
const goldText = document.getElementById('goldText');
const ageText = document.getElementById('ageText');
const timeText = document.getElementById('timeText');
const playerHpBar = document.getElementById('playerHpBar');
const enemyHpBar = document.getElementById('enemyHpBar');
const unitButtonsEl = document.getElementById('unitButtons');
const turretBtn = document.getElementById('turretBtn');
const specialBtn = document.getElementById('specialBtn');
const evolveBtn = document.getElementById('evolveBtn');
const soundBtn = document.getElementById('soundBtn');

const STEP = 1 / 60;
let last = performance.now();
let acc = 0;
let builtAge = 0;
let selectedDiff = 'normal';
let unitBtns = [];

/* ---------------- 유틸 ---------------- */

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function showOverlay(html) {
  overlay.innerHTML = html;
  overlay.classList.add('show');
}

function hideOverlay() {
  overlay.classList.remove('show');
  overlay.innerHTML = '';
}

/* ---------------- 단위 버튼 ---------------- */

function syncUnitButtons(force) {
  if (!world) return;
  const age = world.age.player;
  if (!force && builtAge === age) return;
  builtAge = age;

  unitButtonsEl.innerHTML = '';
  unitBtns = UNITS.filter((u) => u.age === age).map((cfg, i) => {
    const el = document.createElement('button');
    el.className = 'unit-btn';
    el.innerHTML =
      `<span class="k">${i + 1}</span>` +
      `<span class="ic">${cfg.icon}</span>` +
      `<span class="nm">${cfg.name}</span>` +
      `<span class="cost">${cfg.cost}</span>` +
      `<span class="cd"></span>`;
    el.addEventListener('click', () => {
      if (world && world.started && !world.over && !world.paused) {
        trySpawn('player', cfg);
      }
    });
    unitButtonsEl.appendChild(el);
    return { el, cfg, cd: el.querySelector('.cd') };
  });
}

/* ---------------- HUD 갱신 ---------------- */

function updateUI() {
  if (!world) return;

  syncUnitButtons(false);

  goldText.textContent = Math.floor(world.gold.player);
  ageText.textContent = AGES[world.age.player - 1].name;
  timeText.textContent = fmtTime(world.time);

  playerHpBar.style.width =
    (world.playerBase.hp / world.playerBase.maxHp) * 100 + '%';
  enemyHpBar.style.width =
    (world.enemyBase.hp / world.enemyBase.maxHp) * 100 + '%';

  for (const ref of unitBtns) {
    const cd = world.spawnCd.player[ref.cfg.id] || 0;
    ref.el.disabled = !canSpawn('player', ref.cfg);
    ref.cd.textContent = cd > 0 ? cd.toFixed(1) + 's' : '';
  }

  const age = world.age.player;
  if (age >= AGES.length) {
    evolveBtn.textContent = '최종 시대';
    evolveBtn.disabled = true;
  } else if (world.evolving.player > 0) {
    evolveBtn.textContent = `진화 중 ${world.evolving.player.toFixed(1)}s`;
    evolveBtn.disabled = true;
  } else {
    const cost = AGES[age - 1].evolveCost;
    evolveBtn.textContent = `진화 ${cost} → ${AGES[age].name}`;
    evolveBtn.disabled =
      !world.started || world.over || world.gold.player < cost;
  }

  const turretCount = countTurrets('player');
  const turret = TURRETS[age - 1];
  turretBtn.textContent = `터렛 ${turret.cost} (${turretCount}/2)`;
  turretBtn.disabled =
    !world.started ||
    world.over ||
    world.gold.player < turret.cost ||
    turretCount >= 2;

  const sp = AGES[age - 1].special;
  const cd = world.specialCd.player;
  specialBtn.textContent = cd > 0 ? `${sp.icon} ${Math.ceil(cd)}s` : `${sp.icon} ${sp.name}`;
  specialBtn.disabled = !world.started || world.over || cd > 0;
}

/* ---------------- 오버레이 ---------------- */

function showStart() {
  const diffs = Object.entries(DIFF)
    .map(
      ([key, d]) =>
        `<button data-d="${key}" class="${key === selectedDiff ? 'sel' : ''}">${d.label}</button>`
    )
    .join('');

  showOverlay(`
    <div class="panel">
      <h1>전쟁시대</h1>
      <p class="sub">골드를 모아 병력을 뽑고, 시대를 진화시켜<br>적 기지를 파괴하세요.</p>
      <div class="diffs">${diffs}</div>
      <button class="primary" id="startBtn">게임 시작</button>
      <p class="hint">1 / 2 / 3 병력 · Q 터렛 · S 스킬 · E 진화 · Space 일시정지</p>
    </div>
  `);

  overlay.querySelectorAll('.diffs button').forEach((b) => {
    b.addEventListener('click', () => {
      selectedDiff = b.dataset.d;
      overlay
        .querySelectorAll('.diffs button')
        .forEach((x) => x.classList.toggle('sel', x === b));
    });
  });

  overlay.querySelector('#startBtn').onclick = () =>
    startGame(selectedDiff);
}

function showPause() {
  showOverlay(`
    <div class="panel">
      <h1>일시정지</h1>
      <p class="sub">전장이 멈췄습니다.</p>
      <button class="primary" id="resumeBtn">계속하기</button>
      <button class="ghost" id="restartBtn">다시 시작</button>
    </div>
  `);
  overlay.querySelector('#resumeBtn').onclick = () => togglePause();
  overlay.querySelector('#restartBtn').onclick = () =>
    startGame(world.difficulty);
}

function showGameOver() {
  const win = world.result === 'win';

  showOverlay(`
    <div class="panel">
      <h1 class="${win ? 'win' : 'lose'}">${win ? '승리!' : '패배...'}</h1>
      <p class="sub">${
        win ? '적 기지를 파괴했습니다.' : '내 기지가 파괴되었습니다.'
      }</p>
      <div class="stats">
        ⏱ ${fmtTime(world.time)} &nbsp;·&nbsp; ⚔️ 처치 ${world.kills.player}
        &nbsp;·&nbsp; ${AGES[world.age.player - 1].name}
      </div>
      <button class="primary" id="againBtn">다시 시작</button>
      <button class="ghost" id="menuBtn">난이도 선택</button>
    </div>
  `);

  overlay.querySelector('#againBtn').onclick = () =>
    startGame(world.difficulty);
  overlay.querySelector('#menuBtn').onclick = () => showStart();
}

/* ---------------- 게임 시작 / 종료 ---------------- */

function startGame(diff) {
  world = newWorld(diff);
  world.started = true;
  builtAge = 0;
  syncUnitButtons(true);
  hideOverlay();
  ensureAudio(); // 사용자 제스처 시점에 오디오 활성화

  last = performance.now();
  acc = 0;
  updateUI();
}

function endGame(result) {
  if (!world || world.over) return;
  world.over = true;
  world.result = result;
  sfxEnd(result === 'win');
  showGameOver();
}

function togglePause() {
  if (!world || !world.started || world.over) return;
  world.paused = !world.paused;
  if (world.paused) {
    showPause();
  } else {
    hideOverlay();
    last = performance.now();
    acc = 0;
  }
}

/* ---------------- 입력 ---------------- */

turretBtn.addEventListener('click', () => {
  if (world && world.started && !world.over && !world.paused) {
    buildTurret('player');
  }
});

evolveBtn.addEventListener('click', () => {
  if (world && world.started && !world.over && !world.paused) {
    tryEvolve('player');
  }
});

specialBtn.addEventListener('click', () => {
  if (world && world.started && !world.over && !world.paused) {
    castSpecial('player');
  }
});

soundBtn.addEventListener('click', () => {
  audio.muted = !audio.muted;
  soundBtn.textContent = audio.muted ? '🔇' : '🔊';
  if (!audio.muted) ensureAudio();
});

window.addEventListener('keydown', (e) => {
  if (!world) return;

  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    togglePause();
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    if (world.over) startGame(world.difficulty);
    return;
  }

  if (!world.started || world.over || world.paused) return;

  if (e.key === 'q' || e.key === 'Q') {
    buildTurret('player');
    return;
  }
  if (e.key === 'e' || e.key === 'E') {
    tryEvolve('player');
    return;
  }
  if (e.key === 's' || e.key === 'S') {
    castSpecial('player');
    return;
  }

  const index = { 1: 0, 2: 1, 3: 2 }[e.key];
  if (index !== undefined) {
    const list = UNITS.filter((u) => u.age === world.age.player);
    if (list[index]) trySpawn('player', list[index]);
  }
});

/* ---------------- 루프 / 리사이즈 ---------------- */

function loop(now) {
  const dt = Math.min((now - last) / 1000, 0.1);
  last = now;

  if (world && world.started && !world.paused && !world.over) {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard < 5) {
      update(STEP);
      acc -= STEP;
      guard++;
    }
    if (guard >= 5) acc = 0;
  } else {
    acc = 0;
  }

  render();
  updateUI();
  requestAnimationFrame(loop);
}

function resize() {
  const scale =
    Math.min(window.innerWidth / W, window.innerHeight / H) * 0.98;
  stage.style.transform = `scale(${scale})`;
}

window.addEventListener('resize', resize);

/* ---------------- 부트 ---------------- */

world = newWorld('normal');
resize();
syncUnitButtons(true);
showStart();
requestAnimationFrame(loop);
