/* 게임 코어: 캔버스 스케일, 입력, 씬 전환, 메인 루프 */
(function () {
  'use strict';

  const W = 480;
  const H = 270;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scenes = {};
  let current = null;
  let time = 0;
  let last = 0;
  let cursorHot = false;

  const pointer = { x: -999, y: -999, inside: false };

  function resize() {
    const pad = 12;
    const availW = Math.max(240, window.innerWidth - pad * 2);
    const availH = Math.max(160, window.innerHeight - pad * 2);
    let scale = Math.min(availW / W, availH / H);
    if (scale >= 2) scale = Math.floor(scale * 2) / 2;
    canvas.style.width = Math.round(W * scale) + 'px';
    canvas.style.height = Math.round(H * scale) + 'px';
  }

  function toCanvas(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (W / rect.width),
      y: (clientY - rect.top) * (H / rect.height)
    };
  }

  function setScene(scene) {
    current = scene;
    cursorHot = false;
    canvas.style.cursor = 'default';
    if (scene && typeof scene.enter === 'function') scene.enter();
  }

  function startStage(index) {
    if (scenes.Battle) setScene(scenes.Battle(index));
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function setCursor(hot) {
    if (hot !== cursorHot) {
      cursorHot = hot;
      canvas.style.cursor = hot ? 'pointer' : 'default';
    }
  }

  function drawSoundButton(ctx, rect) {
    const A = window.AudioSys;
    window.UI.iconButton(ctx, rect, A.isEnabled() ? 'sound' : 'mute', {
      hover: inRect(pointer.x, pointer.y, rect)
    });
  }

  function hitSoundButton(x, y, rect) {
    if (!inRect(x, y, rect)) return false;
    const A = window.AudioSys;
    A.setEnabled(!A.isEnabled());
    A.sfx('select');
    return true;
  }

  function loop(ts) {
    if (!last) last = ts;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;
    time += dt;

    if (current) {
      if (typeof current.update === 'function') current.update(dt, time);
      ctx.save();
      if (typeof current.draw === 'function') current.draw(ctx, time);
      ctx.restore();
    }
    requestAnimationFrame(loop);
  }

  canvas.addEventListener('pointermove', (e) => {
    const p = toCanvas(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = true;
  });

  canvas.addEventListener('pointerleave', () => {
    pointer.x = -999;
    pointer.y = -999;
    pointer.inside = false;
    setCursor(false);
  });

  canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    window.AudioSys.init();
    const p = toCanvas(e.clientX, e.clientY);
    pointer.x = p.x;
    pointer.y = p.y;
    pointer.inside = true;
    if (current && typeof current.pointerDown === 'function') {
      current.pointerDown(p.x, p.y, e);
    }
  });

  window.addEventListener('keydown', (e) => {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Tab'];
    if (keys.indexOf(e.key) >= 0) e.preventDefault();
    window.AudioSys.init();
    if (current && typeof current.keyDown === 'function') current.keyDown(e.key, e);
  });

  window.addEventListener('resize', resize);

  window.GameApp = {
    W,
    H,
    canvas,
    ctx,
    scenes,
    pointer,
    setScene,
    startStage,
    sleep,
    inRect,
    setCursor,
    drawSoundButton,
    hitSoundButton,
    now: () => time,
    get current() { return current; }
  };

  resize();
  requestAnimationFrame(loop);
})();
