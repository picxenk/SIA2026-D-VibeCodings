"use strict";

/* ─────────────────────────────────────────────
 * 부트스트랩
 * ───────────────────────────────────────────── */
window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("game");
  const game = new Game(canvas);
  game.start();

  // 디버그/확장용
  window.starlight = game;
});
