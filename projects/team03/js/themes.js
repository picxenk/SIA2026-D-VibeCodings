"use strict";

/* ─────────────────────────────────────────────
 * 시간대별 팔레트 (기획서 5.2)
 * ───────────────────────────────────────────── */
const THEMES = {
  day: {
    skyTop: "#7fcbe4",
    skyMid: "#b8e6df",
    skyBottom: "#e9f6d9",
    sun: "#ffe98a",
    sunGlow: "#fff6c8",
    cloud: "#ffffff",
    hillFar: "#9cc9a6",
    hillNear: "#6fa87e",
    hillDark: "#4d8560",
    tree: "#4f8a5a",
    waterTop: "#6cc0c8",
    waterMid: "#3f93ad",
    waterDeep: "#256b8a",
    foam: "#c9f2ea",
    shore: "#8cc45c",
    shoreDark: "#5f9a45",
    sand: "#d9c08a",
    tint: "#ffe6a8",
    tintAlpha: 0,
    starAlpha: 0,
    sunY: 50,
    moon: 0,
    label: "낮",
  },
  dusk: {
    skyTop: "#6a5f9e",
    skyMid: "#c47a8a",
    skyBottom: "#f2b26a",
    sun: "#ffd08a",
    sunGlow: "#ffb07a",
    cloud: "#e7b6b0",
    hillFar: "#7a6a8f",
    hillNear: "#5a5a7a",
    hillDark: "#43466b",
    tree: "#3f5a5a",
    waterTop: "#8f7fa8",
    waterMid: "#5a6f96",
    waterDeep: "#3b4a78",
    foam: "#ffd9c0",
    shore: "#7fa85f",
    shoreDark: "#5a7c45",
    sand: "#c9a87a",
    tint: "#ff9a60",
    tintAlpha: 0.08,
    starAlpha: 0.15,
    sunY: 96,
    moon: 0,
    label: "노을",
  },
  night: {
    skyTop: "#141b33",
    skyMid: "#22305a",
    skyBottom: "#3a4a78",
    sun: "#fdf3d0",
    sunGlow: "#cfd8ff",
    cloud: "#4a5680",
    hillFar: "#2f3f5c",
    hillNear: "#22304a",
    hillDark: "#1a2538",
    tree: "#1f3a3a",
    waterTop: "#2f5f7a",
    waterMid: "#204a63",
    waterDeep: "#152f45",
    foam: "#9fd6d6",
    shore: "#4a7048",
    shoreDark: "#33523a",
    sand: "#8a7a5c",
    tint: "#5070dc",
    tintAlpha: 0.16,
    starAlpha: 1,
    sunY: 44,
    moon: 1,
    label: "밤",
  },
};

const THEME_KEYS = Object.keys(THEMES.day);

function lerpTheme(a, b, t) {
  const out = {};
  for (const key of THEME_KEYS) {
    const av = a[key];
    const bv = b[key];
    if (typeof av === "number") out[key] = lerp(av, bv, t);
    else if (typeof av === "string" && av[0] === "#") out[key] = lerpColor(av, bv, t);
    else out[key] = t < 0.5 ? av : bv;
  }
  return out;
}
