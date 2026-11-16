"use strict";

/* ─────────────────────────────────────────────
 * 낚시 미니게임 (기획서 4.3)
 * 초록 바를 유지해 진행 게이지를 100까지 채운다
 * ───────────────────────────────────────────── */
const MG_LAYOUT = {
  panelX: 150,
  panelY: 24,
  panelW: 180,
  panelH: 220,
  trackX: 170,
  trackY: 58,
  trackW: 34,
  trackH: FISHING.TRACK_H,
  progX: 214,
  progY: 58,
  progW: 18,
  progH: FISHING.TRACK_H,
};

class Minigame {
  constructor(fish, rod = null) {
    this.fish = fish;
    this.rod = rod;
    const d = fish.difficulty;

    // 낚싯대 성능: 초록 바가 커진다
    const rodBar = rod ? rod.bar : 1;
    this.barH = Math.round(
      clamp(lerp(66, 42, (d - 1) / 4) * rodBar, 34, FISHING.TRACK_H - 12)
    );
    this.barY = (FISHING.TRACK_H - this.barH) / 2;
    this.barVy = 0;

    this.fishH = 18;
    this.fishBase = FISHING.TRACK_H / 2;
    this.fishY = this.fishBase;
    this.target = this.fishBase;
    this.targetTimer = 0;
    this.wobble = 0;

    this.progress = FISHING.START_PROGRESS;
    this.elapsed = 0;
    this.overlap = false;
    this.result = null; // 'catch' | 'fail'
    this.time = 0;
  }

  get difficulty() {
    return this.fish.difficulty;
  }

  update(dt, holding) {
    if (this.result) return;
    this.time += dt;
    this.elapsed += dt;

    const d = this.difficulty;

    /* 초록 바 물리 */
    this.barVy += (holding ? -FISHING.LIFT_ACCEL : FISHING.GRAVITY) * dt;
    this.barVy = clamp(this.barVy, -FISHING.MAX_VY, FISHING.MAX_VY);
    this.barY += this.barVy * dt;

    if (this.barY < 0) {
      this.barY = 0;
      this.barVy = 0;
    } else if (this.barY + this.barH > FISHING.TRACK_H) {
      this.barY = FISHING.TRACK_H - this.barH;
      this.barVy = 0;
    }

    /* 물고기 AI */
    this.targetTimer -= dt;
    if (this.targetTimer <= 0) {
      const hold = lerp(1.15, 0.4, (d - 1) / 4) * rand(0.8, 1.25);
      this.targetTimer = hold;
      this.target = clamp(
        this.fishBase + rand(-85, 85),
        0,
        FISHING.TRACK_H - this.fishH
      );
    }
    const k = lerp(2.2, 6.8, (d - 1) / 4);
    this.fishBase += (this.target - this.fishBase) * (1 - Math.exp(-k * dt));

    this.wobble += dt * (0.9 + d * 0.35);
    const amp = 3 + d * 1.15;
    this.fishY = clamp(
      this.fishBase + Math.sin(this.wobble * Math.PI * 2) * amp,
      0,
      FISHING.TRACK_H - this.fishH
    );

    /* 겹침 · 진행 게이지 */
    const barTop = this.barY;
    const barBottom = this.barY + this.barH;
    const fishTop = this.fishY;
    const fishBottom = this.fishY + this.fishH;
    this.overlap = barTop < fishBottom && fishTop < barBottom;

    this.progress += (this.overlap ? FISHING.GAIN : -FISHING.LOSS) * dt;
    this.progress = clamp(this.progress, 0, 100);

    if (this.progress >= 100) this.result = "catch";
    else if (this.progress <= 0) this.result = "fail";
    else if (this.elapsed >= FISHING.TIME_LIMIT) this.result = "fail";
  }

  draw(ctx) {
    const L = MG_LAYOUT;
    const t = this.time;

    // 전체 딤
    ctx.fillStyle = PALETTE.dim;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawPanel(ctx, L.panelX, L.panelY, L.panelW, L.panelH, {
      fill: PALETTE.cream,
      radius: 8,
    });

    // 제목 + 진행 수치
    drawText(ctx, "낚는 중...", VIEW_W / 2 - 18, 41, {
      size: 12,
      color: PALETTE.ink,
      align: "center",
      bold: true,
    });
    drawText(ctx, `${Math.round(this.progress)}%`, 314, 41, {
      size: 11,
      color: this.progress > 65 ? PALETTE.accentDark : PALETTE.greenDark,
      align: "right",
      bold: true,
    });

    // 트랙 배경
    const tx = L.trackX;
    const ty = L.trackY;
    const tw = L.trackW;
    const th = L.trackH;

    ctx.fillStyle = "#2a4a5a";
    roundRect(ctx, tx - 3, ty - 3, tw + 6, th + 6, 5);
    ctx.fill();
    ctx.fillStyle = "#12293a";
    roundRect(ctx, tx, ty, tw, th, 4);
    ctx.fill();

    // 트랙 눈금
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    for (let y = 12; y < th; y += 24) ctx.fillRect(tx, ty + y, tw, 1);

    // 초록 바
    const barY = ty + this.barY;
    const barH = this.barH;
    const grad = ctx.createLinearGradient(0, barY, 0, barY + barH);
    if (this.overlap) {
      grad.addColorStop(0, "#c8f08a");
      grad.addColorStop(1, "#6fbf4a");
    } else {
      grad.addColorStop(0, "#9fd47a");
      grad.addColorStop(1, "#4e8c3c");
    }
    ctx.fillStyle = grad;
    roundRect(ctx, tx + 2, barY, tw - 4, barH, 4);
    ctx.fill();
    ctx.strokeStyle = this.overlap ? "#eaffc0" : "rgba(255,255,255,0.45)";
    ctx.lineWidth = 1;
    roundRect(ctx, tx + 2, barY, tw - 4, barH, 4);
    ctx.stroke();

    // 물고기 아이콘 (바보다 위에 그려 항상 보이게)
    const fishCx = tx + tw / 2;
    const fishCy = ty + this.fishY + this.fishH / 2;
    ctx.fillStyle = "rgba(255, 246, 216, 0.18)";
    ellipse(ctx, fishCx, fishCy, 17, 11);
    ctx.fill();
    drawFish(ctx, fishCx, fishCy, 30, 18, this.fish, t);

    // 진행 게이지
    const px = L.progX;
    const py = L.progY;
    const pw = L.progW;
    const ph = L.progH;
    ctx.fillStyle = "#2a4a5a";
    roundRect(ctx, px - 2, py - 2, pw + 4, ph + 4, 4);
    ctx.fill();
    ctx.fillStyle = "#12293a";
    roundRect(ctx, px, py, pw, ph, 3);
    ctx.fill();

    const fh = (this.progress / 100) * ph;
    const pgrad = ctx.createLinearGradient(0, py + ph - fh, 0, py + ph);
    pgrad.addColorStop(0, this.progress > 65 ? "#ffe08a" : "#a8e07a");
    pgrad.addColorStop(1, this.progress > 65 ? "#e8a23a" : "#4e9c5a");
    ctx.fillStyle = pgrad;
    roundRect(ctx, px, py + ph - fh, pw, Math.max(2, fh), 3);
    ctx.fill();

    // 100% 눈금
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(px, py + 1, pw, 1.5);

    // 안내
    drawText(ctx, "누르고 있으면 떠올라요!", VIEW_W / 2, 258, {
      size: 9,
      color: PALETTE.ink,
      align: "center",
      outline: PALETTE.creamLight,
    });
  }
}
