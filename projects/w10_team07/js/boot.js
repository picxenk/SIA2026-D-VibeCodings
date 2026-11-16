/* 부트스트랩: 저장 불러오기 후 타이틀 시작 */
(function () {
  'use strict';

  const G = window.GameApp;
  const Save = window.Save;
  const A = window.AudioSys;

  Save.load();

  // 첫 입력에서 오디오 활성화 (모바일 자동재생 정책)
  const unlockAudio = () => {
    A.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio);
  window.addEventListener('keydown', unlockAudio);

  document.addEventListener('contextmenu', (e) => e.preventDefault());

  // 폰트 준비 후 시작 (실패해도 즉시 시작)
  const start = () => {
    if (G.current) return;
    G.setScene(G.scenes.Title());
  };
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(start).catch(start);
    setTimeout(() => {
      if (!G.current) start();
    }, 400);
  } else {
    start();
  }
})();
