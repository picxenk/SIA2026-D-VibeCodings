// 부트스트랩 & 게임 루프
(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const game = new Game(ctx);
  window.game = game; // 디버깅용
  canvas.focus();

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;

    game.update(dt);
    game.draw();
    window.Input.endFrame();

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.addEventListener('keydown', () => window.SFX.unlock());
  window.addEventListener('blur', () => {
    if (game.state === 'playing') game.state = 'paused';
  });
})();
