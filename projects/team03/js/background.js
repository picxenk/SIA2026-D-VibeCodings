"use strict";

/* ─────────────────────────────────────────────
 * 배경: 하늘 · 구름 · 언덕 · 물 · 물가 · 캐릭터
 * 시간대 팔레트는 THEMES에서 부드럽게 보간
 * ───────────────────────────────────────────── */
class Background {
  constructor() {
    this.time = 0;
    this.from = THEMES.day;
    this.to = THEMES.day;
    this.t = 1;
    this.theme = THEMES.day;
    this.clouds = [
      { x: 60, y: 40, s: 1.1, spd: 3 },
      { x: 220, y: 66, s: 0.8, spd: 5 },
      { x: 390, y: 30, s: 1.3, spd: 2 },
      { x: 300, y: 88, s: 0.6, spd: 7 },
    ];
    this.stars = [];
    for (let i = 0; i < 46; i++) {
      this.stars.push({
        x: (i * 97 + 37) % VIEW_W,
        y: (i * 53 + 17) % 118,
        r: i % 7 === 0 ? 1.7 : 1,
        tw: i * 1.7,
      });
    }
    this.flowers = [
      { x: 118, y: 250, c: "#f2a0c0" },
      { x: 286, y: 262, c: "#ffe08a" },
      { x: 442, y: 248, c: "#f2a0c0" },
      { x: 202, y: 258, c: "#b8a0f0" },
    ];
    this.grassTufts = [30, 96, 140, 178, 232, 268, 316, 360, 398, 430, 460];
    this.rockPos = [
      { x: 150, y: 250, s: 1 },
      { x: 330, y: 258, s: 0.8 },
      { x: 462, y: 262, s: 0.7 },
    ];
  }

  setTheme(name, instant = false) {
    const target = THEMES[name];
    if (!target) return;
    if (instant) {
      this.from = target;
      this.to = target;
      this.t = 1;
      this.theme = target;
    } else {
      this.from = this.theme;
      this.to = target;
      this.t = 0;
    }
  }

  update(dt) {
    this.time += dt;
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / 1.4);
      this.theme = lerpTheme(this.from, this.to, easeInOut(this.t));
    } else if (this.theme !== this.to) {
      this.theme = this.to;
    }

    for (const c of this.clouds) {
      c.x -= c.spd * dt * (0.6 + this.t * 0.4);
      if (c.x < -70) {
        c.x = VIEW_W + 70;
        c.y = rand(24, 90);
      }
    }
  }

  /* ── 배경 전체 ───────────────────────────── */
  draw(ctx) {
    const T = this.theme;

    this.drawSky(ctx, T);
    this.drawStars(ctx, T);
    this.drawCelestial(ctx, T);
    this.drawClouds(ctx, T);
    this.drawHills(ctx, T);
    this.drawWater(ctx, T);
    this.drawShore(ctx, T);
    this.drawDecor(ctx, T);
    this.drawCharacter(ctx, T);

    if (T.tintAlpha > 0.005) {
      ctx.fillStyle = withAlpha(T.tint, T.tintAlpha);
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  drawSky(ctx, T) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON);
    g.addColorStop(0, T.skyTop);
    g.addColorStop(0.62, T.skyMid);
    g.addColorStop(1, T.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, HORIZON);
  }

  drawStars(ctx, T) {
    if (T.starAlpha < 0.02) return;
    for (const s of this.stars) {
      const tw = 0.55 + 0.45 * Math.sin(this.time * 1.6 + s.tw);
      ctx.fillStyle = withAlpha("#fff8dc", T.starAlpha * tw);
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
  }

  drawCelestial(ctx, T) {
    const x = 388;
    const y = T.sunY;
    const isMoon = T.moon > 0.5;

    // glow
    const gr = ctx.createRadialGradient(x, y, 4, x, y, 44);
    gr.addColorStop(0, withAlpha(T.sunGlow, 0.5));
    gr.addColorStop(1, withAlpha(T.sunGlow, 0));
    ctx.fillStyle = gr;
    ctx.fillRect(x - 50, y - 50, 100, 100);

    if (!isMoon) {
      ctx.strokeStyle = withAlpha(T.sunGlow, 0.35);
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4 + this.time * 0.15;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * 19, y + Math.sin(a) * 19);
        ctx.lineTo(x + Math.cos(a) * 24, y + Math.sin(a) * 24);
        ctx.stroke();
      }
    }

    ctx.fillStyle = T.sun;
    circle(ctx, x, y, isMoon ? 15 : 16);
    ctx.fill();

    if (isMoon) {
      // 크레이터
      ctx.fillStyle = withAlpha("#c9bfa0", 0.35);
      circle(ctx, x - 5, y - 4, 1.8);
      ctx.fill();
      circle(ctx, x + 5, y + 4, 1.4);
      ctx.fill();
      circle(ctx, x + 2, y - 7, 1);
      ctx.fill();
    }
  }

  drawClouds(ctx, T) {
    for (const c of this.clouds) {
      ctx.fillStyle = withAlpha(T.cloud, 0.92);
      ellipse(ctx, c.x, c.y, 18 * c.s, 8 * c.s);
      ctx.fill();
      ellipse(ctx, c.x - 12 * c.s, c.y + 2 * c.s, 10 * c.s, 6 * c.s);
      ctx.fill();
      ellipse(ctx, c.x + 14 * c.s, c.y + 3 * c.s, 12 * c.s, 5.5 * c.s);
      ctx.fill();
    }
  }

  drawHills(ctx, T) {
    // 먼 언덕
    ctx.fillStyle = T.hillFar;
    ctx.beginPath();
    ctx.moveTo(-10, HORIZON);
    for (let x = -10; x <= VIEW_W + 10; x += 8) {
      const y = HORIZON - 9 - Math.sin(x * 0.012) * 9 - Math.sin(x * 0.033 + 2) * 4;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_W + 10, HORIZON);
    ctx.closePath();
    ctx.fill();

    // 가까운 언덕
    ctx.fillStyle = T.hillNear;
    ctx.beginPath();
    ctx.moveTo(-10, HORIZON);
    for (let x = -10; x <= VIEW_W + 10; x += 8) {
      const y = HORIZON - 3 - Math.abs(Math.sin(x * 0.019 + 0.8)) * 13;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(VIEW_W + 10, HORIZON);
    ctx.closePath();
    ctx.fill();

    // 언덕 위 나무 실루엣
    const trees = [
      { x: 34, h: 20, s: 1 },
      { x: 92, h: 14, s: 0.8 },
      { x: 300, h: 16, s: 0.9 },
      { x: 356, h: 22, s: 1.1 },
      { x: 438, h: 13, s: 0.7 },
    ];
    for (const t of trees) {
      const baseY = HORIZON - 6;
      ctx.fillStyle = T.tree;
      ctx.fillRect(t.x - 1.5, baseY - t.h, 3, t.h);
      ctx.beginPath();
      ctx.moveTo(t.x, baseY - t.h - 12 * t.s);
      ctx.lineTo(t.x - 8 * t.s, baseY - t.h + 2);
      ctx.lineTo(t.x + 8 * t.s, baseY - t.h + 2);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(t.x, baseY - t.h - 4);
      ctx.lineTo(t.x - 7 * t.s, baseY - t.h + 7);
      ctx.lineTo(t.x + 7 * t.s, baseY - t.h + 7);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawWater(ctx, T) {
    ctx.fillStyle = T.waterTop;
    ctx.fillRect(0, HORIZON, VIEW_W, 28);
    ctx.fillStyle = T.waterMid;
    ctx.fillRect(0, HORIZON + 28, VIEW_W, 30);
    ctx.fillStyle = T.waterDeep;
    ctx.fillRect(0, HORIZON + 58, VIEW_W, 26);

    // 태양/달 물반사
    const refX = 388;
    for (let i = 0; i < 11; i++) {
      const y = HORIZON + 5 + i * 7;
      const w = 12 + Math.sin(this.time * 2 + i) * 4 + i * 1.2;
      const x = refX + Math.sin(this.time * 1.3 + i * 0.8) * 4;
      ctx.fillStyle = withAlpha(T.sunGlow, 0.34 - i * 0.02);
      ctx.fillRect(x - w / 2, y, w, 1.5);
    }

    // 물결 하이라이트
    ctx.fillStyle = withAlpha(T.foam, 0.5);
    for (let i = 0; i < 34; i++) {
      const row = i % 17;
      const y = HORIZON + 8 + row * 4.6;
      const drift = this.time * (6 + (i % 5));
      const x = ((i * 71 + drift + Math.sin(this.time * 0.9 + i) * 10) % (VIEW_W + 40)) - 20;
      const len = 5 + (i % 4) * 3;
      ctx.fillRect(x, y, len, 1);
    }

    // 수평선 물보라
    ctx.fillStyle = withAlpha(T.foam, 0.7);
    for (let x = 0; x < VIEW_W; x += 9) {
      const off = Math.sin(this.time * 1.4 + x * 0.05) * 1.2;
      ctx.fillRect(x, HORIZON + off, 5, 1.2);
    }
  }

  drawShore(ctx, T) {
    // 모래 물가
    ctx.fillStyle = T.sand;
    ctx.beginPath();
    ctx.moveTo(0, 212);
    for (let x = 0; x <= VIEW_W; x += 16) {
      ctx.lineTo(x, 212 + Math.sin(x * 0.045 + this.time * 0.6) * 2.2);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.lineTo(0, VIEW_H);
    ctx.closePath();
    ctx.fill();

    // 잔디
    ctx.fillStyle = T.shore;
    ctx.beginPath();
    ctx.moveTo(0, 223);
    for (let x = 0; x <= VIEW_W; x += 12) {
      ctx.lineTo(x, 223 + Math.sin(x * 0.08 + 0.6) * 2.4);
    }
    ctx.lineTo(VIEW_W, VIEW_H);
    ctx.lineTo(0, VIEW_H);
    ctx.closePath();
    ctx.fill();

    // 잔디 어두운 결
    ctx.fillStyle = withAlpha(T.shoreDark, 0.5);
    for (let i = 0; i < 24; i++) {
      const x = (i * 37) % VIEW_W;
      const y = 230 + (i % 5) * 7;
      ctx.fillRect(x, y, 9, 1);
    }
  }

  drawDecor(ctx, T) {
    // 잔디 포기
    ctx.strokeStyle = T.shoreDark;
    ctx.lineWidth = 1.4;
    for (let i = 0; i < this.grassTufts.length; i++) {
      const x = this.grassTufts[i];
      const y = 236 + (i % 3) * 9;
      const sway = Math.sin(this.time * 1.8 + i) * 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + sway, y - 6, x + sway + 2, y - 10);
      ctx.moveTo(x + 3, y);
      ctx.quadraticCurveTo(x + 3 - sway, y - 5, x + 1 - sway, y - 8);
      ctx.stroke();
    }

    // 돌
    for (const r of this.rockPos) {
      ctx.fillStyle = withAlpha("#8a8a86", 0.9);
      ellipse(ctx, r.x, r.y, 9 * r.s, 5 * r.s);
      ctx.fill();
      ctx.fillStyle = withAlpha("#b0b0aa", 0.8);
      ellipse(ctx, r.x - 2 * r.s, r.y - 1.5 * r.s, 5 * r.s, 2.5 * r.s);
      ctx.fill();
    }

    // 꽃
    for (const f of this.flowers) {
      const sway = Math.sin(this.time * 1.6 + f.x) * 1;
      ctx.strokeStyle = T.shoreDark;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y + 4);
      ctx.lineTo(f.x + sway, f.y - 3);
      ctx.stroke();
      ctx.fillStyle = f.c;
      circle(ctx, f.x + sway, f.y - 4, 2.6);
      ctx.fill();
      ctx.fillStyle = "#fff3b0";
      circle(ctx, f.x + sway, f.y - 4, 1);
      ctx.fill();
    }

    // 낚시 바구니
    const bx = 404;
    const by = 240;
    ctx.fillStyle = "#a8763e";
    roundRect(ctx, bx, by, 22, 14, 3);
    ctx.fill();
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = withAlpha("#7a5230", 0.8);
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(bx + i * 5.5, by + 1);
      ctx.lineTo(bx + i * 5.5, by + 13);
      ctx.stroke();
    }
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(bx + 11, by, 9, Math.PI, 0);
    ctx.stroke();
  }

  drawCharacter(ctx, T) {
    const bob = Math.sin(this.time * 1.3) * 0.7;
    const x = 61;
    const y = 192 + bob;

    // 그림자
    ctx.fillStyle = "rgba(40,30,20,0.2)";
    ellipse(ctx, 61, 246, 26, 5);
    ctx.fill();

    // 다리
    ctx.fillStyle = "#3d5a8a";
    roundRect(ctx, 50, 222, 13, 20, 5);
    ctx.fill();
    roundRect(ctx, 65, 222, 13, 20, 5);
    ctx.fill();
    // 신발
    ctx.fillStyle = "#4a3527";
    roundRect(ctx, 48, 239, 17, 6, 3);
    ctx.fill();
    roundRect(ctx, 63, 239, 17, 6, 3);
    ctx.fill();

    // 몸통 (멜빵)
    ctx.fillStyle = "#5b7fd1";
    roundRect(ctx, 42, 203, 38, 30, 9);
    ctx.fill();
    ctx.fillStyle = "#f7e9c9";
    roundRect(ctx, 44, 203, 34, 10, 6);
    ctx.fill();
    ctx.fillStyle = "#5b7fd1";
    ctx.fillRect(52, 203, 5, 14);
    ctx.fillRect(65, 203, 5, 14);

    // 팔 (낚싯대를 든 쪽)
    ctx.fillStyle = "#f4cda6";
    rowArm(ctx, 77, 208);

    // 머리
    ctx.fillStyle = "#f4cda6";
    circle(ctx, x, y, 9.5);
    ctx.fill();

    // 얼굴
    ctx.fillStyle = "#4a3527";
    ctx.fillRect(x - 5, y - 1, 2, 2);
    ctx.fillRect(x + 3, y - 1, 2, 2);
    ctx.strokeStyle = "#c9805e";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x - 1, y + 3, 2, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // 밀짚모자
    ctx.fillStyle = "#e8c47a";
    ellipse(ctx, x, y - 6, 17, 4.6);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y - 6, 9.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#c9a45a";
    ctx.fillRect(x - 9, y - 8.5, 18, 2.5);

    // 손
    ctx.fillStyle = "#f4cda6";
    circle(ctx, 88, 209, 3.6);
    ctx.fill();

    // 로프/가방끈 포인트
    ctx.fillStyle = "#d9c08a";
    ctx.fillRect(43, 216, 5, 4);
  }
}

function rowArm(ctx, x, y) {
  ctx.fillStyle = "#f7e9c9";
  roundRect(ctx, x - 2, y - 2, 12, 8, 3);
  ctx.fill();
}
