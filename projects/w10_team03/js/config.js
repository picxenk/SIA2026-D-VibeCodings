"use strict";

/* ─────────────────────────────────────────────
 * 해상도 · 공용 상수
 * ───────────────────────────────────────────── */
const VIEW_W = 480;
const VIEW_H = 270;
const HORIZON = 132; // 수평선 y

// 한글 픽셀 폰트 우선, 없으면 시스템 폰트
const FONT = '"Galmuri11", "DungGeunMo", "Apple SD Gothic Neo", "Malgun Gothic", sans-serif';

const PALETTE = {
  ink: "#5b3a29",
  inkSoft: "#8a6a52",
  cream: "#f7e9c9",
  creamDark: "#e8d3a8",
  creamLight: "#fff8e4",
  accent: "#e8894a",
  accentDark: "#c96a33",
  gold: "#f0c24a",
  green: "#7cbf5a",
  greenDark: "#4e8c3c",
  red: "#e05a4a",
  white: "#fffaf0",
  shadow: "rgba(40, 25, 18, 0.35)",
  dim: "rgba(20, 30, 38, 0.55)",
};

const FISHING = {
  // 캐스팅
  POWER_SPEED: 1.25,
  // 입질
  BITE_WINDOW: 0.62,
  // 미니게임 (기획서 4.3)
  TRACK_H: 168,
  GRAVITY: 900,
  LIFT_ACCEL: 1600,
  MAX_VY: 260,
  GAIN: 22,
  LOSS: 18,
  START_PROGRESS: 18,
  TIME_LIMIT: 45,
};

const UI = {
  sound: { x: 436, y: 3, w: 18, h: 16 },
  pause: { x: 458, y: 3, w: 18, h: 16 },
};

// 밤/낮 순환 주기 (플레이 횟수 기반)
const TIME_CYCLE = 15;

const RARITY_COLOR = ["#b9b9b9", "#8fbf6a", "#6aa8d8", "#a97fd8", "#f0b93f"];
