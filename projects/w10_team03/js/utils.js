"use strict";

/* ─────────────────────────────────────────────
 * 수학 · 색상 유틸
 * ───────────────────────────────────────────── */
function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
function lerp(a, b, t) {
  return a + (b - a) * t;
}
function rand(a = 0, b = 1) {
  return a + Math.random() * (b - a);
}
function randInt(a, b) {
  return Math.floor(rand(a, b + 1));
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
function easeOut(t) {
  return 1 - Math.pow(1 - t, 3);
}

function hexToRgb(hex) {
  let h = hex.replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  return (
    "#" +
    [r, g, b]
      .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, "0"))
      .join("")
  );
}
function lerpColor(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(lerp(A.r, B.r, t), lerp(A.g, B.g, t), lerp(A.b, B.b, t));
}
function withAlpha(hex, alpha) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function shade(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  const f = amount < 0 ? 0 : 255;
  const t = Math.abs(amount);
  return rgbToHex(lerp(r, f, t), lerp(g, f, t), lerp(b, f, t));
}

/* ─────────────────────────────────────────────
 * 캔버스 드로잉 헬퍼
 * ───────────────────────────────────────────── */
function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}
function ellipse(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
  ctx.closePath();
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPanel(ctx, x, y, w, h, opt = {}) {
  const {
    fill = PALETTE.cream,
    border = PALETTE.ink,
    radius = 6,
    shadow = true,
    inner = null,
  } = opt;
  if (shadow) {
    ctx.fillStyle = PALETTE.shadow;
    roundRect(ctx, x + 3, y + 3, w, h, radius);
    ctx.fill();
  }
  ctx.fillStyle = border;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  ctx.fillStyle = fill;
  roundRect(ctx, x + 2, y + 2, w - 4, h - 4, Math.max(0, radius - 2));
  ctx.fill();
  if (inner) {
    ctx.strokeStyle = inner;
    ctx.lineWidth = 1;
    roundRect(ctx, x + 5, y + 5, w - 10, h - 10, Math.max(0, radius - 3));
    ctx.stroke();
  }
}

function drawText(ctx, text, x, y, opt = {}) {
  const {
    size = 11,
    color = PALETTE.ink,
    align = "left",
    baseline = "middle",
    outline = null,
    bold = false,
    alpha = 1,
  } = opt;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${bold ? "bold " : ""}${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (outline) {
    ctx.lineJoin = "round";
    ctx.lineWidth = Math.max(2, size * 0.28);
    ctx.strokeStyle = outline;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawStar(ctx, cx, cy, r, color, filled = true) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rad;
    const py = cy + Math.sin(a) * rad;
    i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
  }
  ctx.closePath();
  if (filled) {
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    ctx.strokeStyle = withAlpha(color, 0.5);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawStars(ctx, cx, cy, rarity, spacing = 9, size = 4) {
  const start = cx - ((spacing * 5 - spacing) / 2);
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, start + i * spacing, cy, size, RARITY_COLOR[rarity - 1], i < rarity);
  }
}

function drawButton(ctx, rect, label, hover, opt = {}) {
  const { size = 11 } = opt;
  drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
    fill: hover ? PALETTE.creamLight : PALETTE.cream,
    border: PALETTE.ink,
    radius: 5,
    shadow: false,
  });
  drawText(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1, {
    size,
    color: PALETTE.ink,
    align: "center",
    bold: true,
  });
}

function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

function wrapText(ctx, text, maxWidth, size = 9) {
  ctx.save();
  ctx.font = `${size}px ${FONT}`;
  const lines = [];
  let line = "";
  for (const ch of text) {
    if (ch === "\n") {
      lines.push(line);
      line = "";
      continue;
    }
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

/* ─────────────────────────────────────────────
 * 물고기 스프라이트 (절차적 픽셀풍)
 * ───────────────────────────────────────────── */
function drawFish(ctx, cx, cy, w, h, fish, time = 0, opt = {}) {
  const silhouette = opt.silhouette || false;
  const wiggle = Math.sin(time * 9) * h * 0.1;
  const body = silhouette ? "#2f3a42" : fish.body;
  const belly = silhouette ? "#2f3a42" : fish.belly;
  const accent = silhouette ? "#2f3a42" : fish.accent;
  const outline = silhouette ? "rgba(0,0,0,0.25)" : "rgba(70,45,32,0.55)";

  ctx.save();
  ctx.translate(cx, cy);

  // 꼬리
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-w * 0.42, 0);
  ctx.lineTo(-w * 0.62, -h * 0.34 + wiggle);
  ctx.lineTo(-w * 0.62, h * 0.34 + wiggle);
  ctx.closePath();
  ctx.fill();

  // 등지느러미
  ctx.fillStyle = accent;
  ctx.beginPath();
  ctx.moveTo(-w * 0.1, -h * 0.4);
  ctx.lineTo(w * 0.02, -h * 0.62);
  ctx.lineTo(w * 0.16, -h * 0.38);
  ctx.closePath();
  ctx.fill();

  // 몸통
  ctx.fillStyle = body;
  ctx.strokeStyle = outline;
  ctx.lineWidth = 1.2;
  ellipse(ctx, 0, 0, w * 0.46, h * 0.5);
  ctx.fill();
  ctx.stroke();

  // 배
  ctx.fillStyle = belly;
  ellipse(ctx, w * 0.02, h * 0.14, w * 0.34, h * 0.28);
  ctx.fill();

  // 옆지느러미
  ctx.fillStyle = withAlpha(accent, silhouette ? 1 : 0.9);
  ctx.beginPath();
  ctx.moveTo(-w * 0.02, h * 0.08);
  ctx.lineTo(-w * 0.2, h * 0.34);
  ctx.lineTo(w * 0.08, h * 0.26);
  ctx.closePath();
  ctx.fill();

  if (!silhouette) {
    // 줄무늬
    ctx.fillStyle = withAlpha(accent, 0.45);
    for (let i = 0; i < 2; i++) {
      ctx.fillRect(-w * 0.14 + i * w * 0.16, -h * 0.22, w * 0.07, h * 0.4);
    }
    // 눈
    ctx.fillStyle = "#fffaf0";
    circle(ctx, w * 0.26, -h * 0.1, Math.max(1.6, h * 0.11));
    ctx.fill();
    ctx.fillStyle = "#3a2a22";
    circle(ctx, w * 0.28, -h * 0.1, Math.max(0.9, h * 0.055));
    ctx.fill();
    // 입
    ctx.strokeStyle = outline;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w * 0.42, h * 0.08);
    ctx.lineTo(w * 0.32, h * 0.12);
    ctx.stroke();
  }
  ctx.restore();
}

function formatGold(n) {
  return Math.floor(n).toLocaleString("en-US");
}

function drawCoin(ctx, x, y, r = 5) {
  ctx.fillStyle = "#f0c24a";
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.strokeStyle = "#8a5a1a";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = "rgba(255, 250, 220, 0.75)";
  circle(ctx, x - r * 0.28, y - r * 0.28, r * 0.35);
  ctx.fill();
}

function drawBobber(ctx, x, y) {
  ctx.save();
  ctx.fillStyle = "#5b3a29";
  ctx.fillRect(x - 1, y - 9, 2, 6);
  ctx.fillStyle = "#e05a4a";
  circle(ctx, x, y, 5);
  ctx.fill();
  ctx.fillStyle = "#fffaf0";
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5b3a29";
  ctx.lineWidth = 1;
  circle(ctx, x, y, 5);
  ctx.stroke();
  ctx.restore();
}
