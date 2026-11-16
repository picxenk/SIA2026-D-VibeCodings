"use strict";

/* ─────────────────────────────────────────────
 * 낚시 화면 (캐스팅 → 대기 → 입질 → 미니게임)
 * ───────────────────────────────────────────── */
const ROD_BASE = { x: 90, y: 210 };
const ROD_TIP = { x: 152, y: 130 };

function pickFishForTime(themeKey, castPower = 0.5, rod = null) {
  const pool = FISH.filter((f) => f.times.includes(themeKey));
  const rareMul = rod ? rod.rare : 1;

  const weightOf = (f) => {
    let mult = 1;
    if (f.rarity >= 3) mult *= rareMul; // 낚싯대 희귀 보정
    if (f.rarity >= 4 && castPower > 0.72) mult *= 1.5; // 멀리 던질수록
    return f.weight * mult;
  };

  let total = 0;
  for (const f of pool) total += weightOf(f);

  let r = Math.random() * total;
  for (const f of pool) {
    r -= weightOf(f);
    if (r <= 0) return f;
  }
  return pool[pool.length - 1];
}

class FishingScene {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.state = "cast";
    this.rod = getRod(game.save);

    this.power = 0;
    this.powerDir = 1;
    this.castPower = 0.5;

    this.floatX = 290;
    this.floatYBase = 175;
    this.waitTimer = 0;
    this.biteTimer = 0;

    this.pendingFish = null;
    this.minigame = null;
    this.resultHandled = false;
    this.finishTimer = 0;

    this.toast = null;
    this.paused = false;
    this.ripples = [];
  }

  addRipple(x, y, max = 22) {
    this.ripples.push({ x, y, r: 3, max, life: 1 });
  }

  update(dt) {
    this.time += dt;
    const input = this.game.input;

    if (this.toast) {
      this.toast.timer -= dt;
      if (this.toast.timer <= 0) this.toast = null;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.r += dt * 26;
      r.life -= dt / 1.1;
      if (r.life <= 0) this.ripples.splice(i, 1);
    }

    /* 일시정지 */
    if (this.paused) {
      if (input.pressed || input.escape) {
        this.paused = false;
        this.game.sfx.click();
      }
      return;
    }
    if (input.escape) {
      this.paused = true;
      return;
    }

    /* HUD 버튼 */
    if (input.pressed) {
      if (inRect(input.x, input.y, UI.sound)) {
        this.game.toggleSound();
        return;
      }
      if (inRect(input.x, input.y, UI.pause)) {
        this.paused = true;
        return;
      }
    }

    /* 상태 머신 */
    switch (this.state) {
      case "cast":
        this.updateCast(dt);
        break;
      case "wait":
        this.updateWait(dt);
        break;
      case "bite":
        this.updateBite(dt);
        break;
      case "minigame":
        this.updateMinigame(dt);
        break;
    }
  }

  updateCast(dt) {
    const input = this.game.input;
    this.power += this.powerDir * dt * FISHING.POWER_SPEED;
    if (this.power >= 1) {
      this.power = 1;
      this.powerDir = -1;
    } else if (this.power <= 0) {
      this.power = 0;
      this.powerDir = 1;
    }

    if (input.pressed) this.doCast();
  }

  doCast() {
    this.castPower = 0.18 + this.power * 0.82;
    this.floatX = 190 + this.castPower * 220;
    this.floatYBase = 162 + this.castPower * 22;
    this.state = "wait";
    this.waitTimer = rand(1.6, 4.2);
    this.resultHandled = false;

    // 플레이 횟수 → 시간대 순환
    this.game.save.totalCasts += 1;
    this.game.updateTheme();
    this.game.saveToStorage();

    this.pendingFish = pickFishForTime(
      this.game.themeKey,
      this.castPower,
      this.rod
    );

    this.game.sfx.init();
    this.game.sfx.cast();
    this.addRipple(this.floatX, this.floatYBase, 18);
  }

  updateWait(dt) {
    const input = this.game.input;
    this.waitTimer -= dt;

    if (input.pressed) {
      // 일찍 감기
      this.state = "cast";
      this.toast = { text: "일찍 감았어요", timer: 1.0 };
      this.game.sfx.click();
      return;
    }

    if (this.waitTimer <= 0) {
      this.state = "bite";
      this.biteTimer = FISHING.BITE_WINDOW * this.rod.bite;
      this.game.sfx.bite();
      this.addRipple(this.floatX, this.floatYBase, 26);
    }
  }

  updateBite(dt) {
    const input = this.game.input;
    this.biteTimer -= dt;

    if (input.pressed) {
      this.state = "minigame";
      this.minigame = new Minigame(this.pendingFish, this.rod);
      this.resultHandled = false;
      this.game.sfx.splash();
      return;
    }

    if (this.biteTimer <= 0) {
      this.state = "cast";
      this.toast = { text: "놓쳤어요...", timer: 1.2 };
      this.game.sfx.fail();
    }
  }

  updateMinigame(dt) {
    const input = this.game.input;
    const mg = this.minigame;
    if (!mg) return;

    if (!mg.result) {
      mg.update(dt, input.down);
      if (mg.result) {
        this.resultHandled = true;
        this.finishTimer = 0.55;
        if (mg.result === "catch") this.game.sfx.catchFish();
        else this.game.sfx.fail();
      }
      return;
    }

    this.finishTimer -= dt;
    if (this.finishTimer <= 0) this.finishScene(mg.result === "catch");
  }

  finishScene(success) {
    const fish = this.pendingFish;
    let size = 0;
    let isNew = false;
    let price = 0;

    if (success) {
      // 낚싯대가 좋을수록 큰 물고기가 나올 확률이 높다
      const exp = clamp(1.5 - this.rod.size, 1.05, 1.6);
      const t = Math.pow(Math.random(), exp);
      size = Math.round((fish.min + (fish.max - fish.min) * t) * 10) / 10;

      const rec = this.game.save.caught[fish.id];
      if (!rec) {
        this.game.save.caught[fish.id] = { bestSize: size, count: 1 };
        isNew = true;
      } else {
        rec.count += 1;
        if (size > rec.bestSize) {
          rec.bestSize = size;
          isNew = true;
        }
      }

      price = fishPrice(fish, size);
      this.game.save.inventory.push({ id: fish.id, size });
    }

    this.game.saveToStorage();
    this.game.go(
      new ResultScene(this.game, {
        success,
        fish,
        size,
        isNew,
        price,
        bagCount: this.game.save.inventory.length,
      })
    );
  }

  /* ── 그리기 ───────────────────────────── */
  draw(ctx) {
    const T = this.game.bg.theme;

    this.drawRod(ctx);

    if (this.state === "wait" || this.state === "bite") {
      this.drawFloat(ctx, T);
    }

    this.drawRipples(ctx, T);
    this.drawHUD(ctx, T);
    this.drawStateUI(ctx, T);

    if (this.state === "minigame" && this.minigame) {
      this.minigame.draw(ctx);
    }

    if (this.toast) {
      const a = clamp(this.toast.timer / 0.35, 0, 1);
      drawText(ctx, this.toast.text, VIEW_W / 2, 214, {
        size: 12,
        color: "#fff6d8",
        align: "center",
        outline: "#4a3024",
        alpha: a,
      });
    }

    if (this.paused) this.drawPause(ctx);
  }

  drawRod(ctx) {
    const rod = this.rod;
    ctx.save();
    ctx.lineCap = "round";

    // 손잡이
    ctx.strokeStyle = "#4a3024";
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(ROD_BASE.x - 1, ROD_BASE.y + 1);
    ctx.lineTo(ROD_BASE.x + 7, ROD_BASE.y - 7);
    ctx.stroke();

    // 낚싯대 본체
    ctx.strokeStyle = rod.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ROD_BASE.x, ROD_BASE.y);
    ctx.lineTo(ROD_TIP.x, ROD_TIP.y);
    ctx.stroke();

    // 하이라이트
    ctx.strokeStyle = rod.tip;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = 0.9;
    ctx.beginPath();
    ctx.moveTo(ROD_BASE.x + 2, ROD_BASE.y - 2);
    ctx.lineTo(ROD_TIP.x + 1, ROD_TIP.y + 1);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // 릴
    if (rod.reel) {
      const rx = ROD_BASE.x + 18;
      const ry = ROD_BASE.y - 18;
      ctx.fillStyle = "#f7e9c9";
      circle(ctx, rx, ry, 3.6);
      ctx.fill();
      ctx.strokeStyle = "#4a3024";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = rod.tip;
      circle(ctx, rx, ry, 1.4);
      ctx.fill();
    }

    // 황금 낚싯대 반짝임
    if (rod.id === "gold") {
      const tw = 0.5 + 0.5 * Math.sin(this.time * 4);
      ctx.globalAlpha = tw;
      drawStar(ctx, ROD_TIP.x + 2, ROD_TIP.y - 4, 3.2, "#fff3b0", true);
      drawStar(ctx, ROD_TIP.x - 5, ROD_TIP.y + 2, 1.8, "#ffe08a", true);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawFloat(ctx, T) {
    const bob = Math.sin(this.time * 2.2) * 1.6;
    let fy = this.floatYBase + bob;
    if (this.state === "bite") fy += 6;

    // 낚싯줄 (살짝 처짐)
    const mx = (ROD_TIP.x + this.floatX) / 2;
    const my = (ROD_TIP.y + fy) / 2 + 10;
    ctx.strokeStyle = "rgba(255,255,255,0.72)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(ROD_TIP.x, ROD_TIP.y);
    ctx.quadraticCurveTo(mx, my, this.floatX, fy - 7);
    ctx.stroke();

    // 물결 링
    ctx.strokeStyle = withAlpha(T.foam, 0.5);
    const ring = 8 + Math.sin(this.time * 3) * 1.5;
    ellipse(ctx, this.floatX, fy + 5, ring, ring * 0.35);
    ctx.stroke();

    drawBobber(ctx, this.floatX, fy);

    if (this.state === "bite") {
      const bounce = Math.sin(this.time * 22) * 1.5;
      drawPanel(ctx, this.floatX - 8, fy - 30 + bounce, 16, 16, {
        fill: PALETTE.creamLight,
        radius: 4,
        shadow: false,
      });
      drawText(ctx, "!", this.floatX, fy - 21 + bounce, {
        size: 12,
        color: PALETTE.red,
        align: "center",
        bold: true,
      });
    }
  }

  drawRipples(ctx, T) {
    for (const r of this.ripples) {
      ctx.strokeStyle = withAlpha(T.foam, 0.55 * clamp(r.life, 0, 1));
      ctx.lineWidth = 1.2;
      ellipse(ctx, r.x, r.y + 4, r.r, r.r * 0.34);
      ctx.stroke();
    }
  }

  drawHUD(ctx, T) {
    const g = ctx.createLinearGradient(0, 0, 0, 26);
    g.addColorStop(0, "rgba(18,28,34,0.55)");
    g.addColorStop(1, "rgba(18,28,34,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, 26);

    drawText(ctx, `도감 ${this.game.collectionCount()}/${FISH.length}`, 8, 11, {
      size: 9,
      color: "#fff6d8",
      outline: "#2c3c46",
    });
    drawCoin(ctx, 84, 11.5, 3.4);
    drawText(ctx, `${this.game.save.gold}G`, 91, 11, {
      size: 9,
      color: "#ffe9a0",
      outline: "#2c3c46",
    });
    drawText(ctx, T.label, VIEW_W / 2, 11, {
      size: 9,
      color: "#fff6d8",
      align: "center",
      outline: "#2c3c46",
    });

    // 사운드 버튼
    const soundHover = inRect(this.game.input.x, this.game.input.y, UI.sound);
    drawPanel(ctx, UI.sound.x, UI.sound.y, UI.sound.w, UI.sound.h, {
      fill: soundHover ? PALETTE.creamLight : PALETTE.cream,
      radius: 4,
      shadow: false,
    });
    drawText(
      ctx,
      this.game.save.soundOn ? "♪" : "×",
      UI.sound.x + UI.sound.w / 2,
      UI.sound.y + UI.sound.h / 2 + 1,
      {
        size: 10,
        color: PALETTE.ink,
        align: "center",
        bold: true,
      }
    );

    // 일시정지 버튼
    const pauseHover = inRect(this.game.input.x, this.game.input.y, UI.pause);
    drawPanel(ctx, UI.pause.x, UI.pause.y, UI.pause.w, UI.pause.h, {
      fill: pauseHover ? PALETTE.creamLight : PALETTE.cream,
      radius: 4,
      shadow: false,
    });
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(UI.pause.x + 5.5, UI.pause.y + 4, 2, 8);
    ctx.fillRect(UI.pause.x + 10.5, UI.pause.y + 4, 2, 8);
  }

  drawStateUI(ctx, T) {
    if (this.state === "cast") {
      drawText(ctx, "클릭해서 던지기!", VIEW_W / 2, 224, {
        size: 10,
        color: "#fff6d8",
        align: "center",
        outline: "#4a3024",
      });

      const bx = 200;
      const by = 236;
      const bw = 170;
      const bh = 11;
      drawPanel(ctx, bx - 2, by - 2, bw + 4, bh + 4, {
        fill: PALETTE.cream,
        radius: 5,
        shadow: false,
      });
      const fillW = Math.max(2, this.power * bw);
      const grad = ctx.createLinearGradient(bx, 0, bx + bw, 0);
      grad.addColorStop(0, "#8fd45a");
      grad.addColorStop(0.7, "#f0c24a");
      grad.addColorStop(1, "#e8894a");
      ctx.fillStyle = grad;
      roundRect(ctx, bx, by, fillW, bh, 3);
      ctx.fill();

      // 마커
      const mx = bx + this.power * bw;
      ctx.fillStyle = "#fffaf0";
      ctx.fillRect(mx - 1, by - 3, 2, bh + 6);
      ctx.strokeStyle = PALETTE.ink;
      ctx.lineWidth = 1;
      ctx.strokeRect(mx - 1.5, by - 3.5, 3, bh + 7);
    } else if (this.state === "wait") {
      drawText(ctx, "입질을 기다리는 중...", VIEW_W / 2, 246, {
        size: 10,
        color: "#fff6d8",
        align: "center",
        outline: "#4a3024",
      });
    } else if (this.state === "bite") {
      const pulse = 0.7 + 0.3 * Math.sin(this.time * 20);
      drawText(ctx, "지금! 클릭!", VIEW_W / 2, 240, {
        size: 16,
        color: "#ffe066",
        align: "center",
        outline: "#4a3024",
        bold: true,
        alpha: pulse,
      });
    } else if (this.state === "minigame") {
      drawText(ctx, "집중!", VIEW_W / 2, 248, {
        size: 9,
        color: "#fff6d8",
        align: "center",
        outline: "#4a3024",
        alpha: 0.9,
      });
    }
  }

  drawPause(ctx) {
    ctx.fillStyle = "rgba(20,30,38,0.66)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    drawPanel(ctx, 148, 82, 184, 108, { fill: PALETTE.cream, radius: 8 });
    drawText(ctx, "일시정지", VIEW_W / 2, 106, {
      size: 18,
      color: PALETTE.ink,
      align: "center",
      bold: true,
    });
    drawText(ctx, `낚싯대 · ${this.rod.name}`, VIEW_W / 2, 130, {
      size: 9,
      color: PALETTE.ink,
      align: "center",
    });
    drawCoin(ctx, VIEW_W / 2 - 26, 145, 3.4);
    drawText(ctx, `${this.game.save.gold} G`, VIEW_W / 2 - 19, 145, {
      size: 9,
      color: PALETTE.accentDark,
      align: "left",
      bold: true,
    });
    drawText(ctx, "클릭해서 계속하기", VIEW_W / 2, 166, {
      size: 10,
      color: PALETTE.inkSoft,
      align: "center",
    });
    drawText(ctx, "ESC / P", VIEW_W / 2, 181, {
      size: 8,
      color: PALETTE.inkSoft,
      align: "center",
      alpha: 0.7,
    });
  }
}
