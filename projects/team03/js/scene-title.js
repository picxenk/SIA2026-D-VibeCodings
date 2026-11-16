"use strict";

/* ─────────────────────────────────────────────
 * 타이틀 화면
 * ───────────────────────────────────────────── */
class TitleScene {
  constructor(game) {
    this.game = game;
    this.time = 0;
    this.collectionBtn = { x: 388, y: 238, w: 76, h: 23 };
    this.shopBtn = { x: 304, y: 238, w: 76, h: 23 };
  }

  update(dt) {
    this.time += dt;
    const input = this.game.input;

    if (input.pressed) {
      this.game.sfx.init();
      if (inRect(input.x, input.y, this.collectionBtn)) {
        this.game.sfx.page();
        this.game.go(new CollectionScene(this.game));
        return;
      }
      if (inRect(input.x, input.y, this.shopBtn)) {
        this.game.sfx.page();
        this.game.go(new ShopScene(this.game, () => new TitleScene(this.game)));
        return;
      }
      this.startGame();
      return;
    }
    if (input.escape) this.startGame();
  }

  startGame() {
    this.game.sfx.click();
    this.game.go(new FishingScene(this.game));
  }

  draw(ctx) {
    const g = this.game;
    const T = g.bg.theme;
    const t = this.time;

    // 상하 비네트
    let vg = ctx.createLinearGradient(0, 0, 0, 110);
    vg.addColorStop(0, "rgba(20,28,36,0.45)");
    vg.addColorStop(1, "rgba(20,28,36,0)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, VIEW_W, 110);

    vg = ctx.createLinearGradient(0, 150, 0, VIEW_H);
    vg.addColorStop(0, "rgba(20,28,36,0)");
    vg.addColorStop(1, "rgba(20,28,36,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 150, VIEW_W, 120);

    // 장식 물고기
    drawFish(ctx, 76, 74 + Math.sin(t * 1.2) * 3, 34, 20, FISH[0], t);
    drawFish(ctx, 410, 106 + Math.sin(t * 1.1 + 1.5) * 3, 30, 18, FISH[9], t + 0.4);

    // 타이틀
    drawText(ctx, "별빛 낚시", VIEW_W / 2, 90, {
      size: 42,
      color: "#fff6d8",
      align: "center",
      outline: "#4a3024",
      bold: true,
    });
    drawText(ctx, "S T A R L I G H T   F I S H I N G", VIEW_W / 2, 124, {
      size: 8,
      color: "#fdf3d0",
      align: "center",
      outline: "rgba(60,40,30,0.5)",
      alpha: 0.9,
    });

    // 찌 + 물결
    const bobY = 160 + Math.sin(t * 2) * 2;
    ctx.strokeStyle = withAlpha(T.foam, 0.7);
    ctx.lineWidth = 1;
    const rr = 10 + ((t * 14) % 16);
    ctx.globalAlpha = clamp(1 - ((t * 14) % 16) / 16, 0, 1) * 0.6;
    ellipse(ctx, VIEW_W / 2, bobY + 12, rr, rr * 0.32);
    ctx.stroke();
    ctx.globalAlpha = 1;
    drawBobber(ctx, VIEW_W / 2, bobY);

    // 시작 안내
    const pulse = 0.65 + 0.35 * Math.sin(t * 3);
    drawText(ctx, "클릭해서 시작", VIEW_W / 2, 200, {
      size: 13,
      color: "#fff6d8",
      align: "center",
      outline: "#4a3024",
      alpha: pulse,
      bold: true,
    });
    drawText(ctx, "Space / Enter", VIEW_W / 2, 216, {
      size: 8,
      color: "#e8d3a8",
      align: "center",
      alpha: 0.7,
    });

    // 하단 정보
    drawText(ctx, `도감 ${this.game.collectionCount()}/${FISH.length}`, 14, 250, {
      size: 9,
      color: "#fff6d8",
      outline: "#4a3024",
    });
    drawCoin(ctx, 20, 261.5, 3.4);
    drawText(ctx, `${this.game.save.gold} G`, 27, 261, {
      size: 8,
      color: "#ffe9a0",
      outline: "#4a3024",
    });
    drawText(ctx, `v0.2 · ${T.label}`, 68, 261, {
      size: 8,
      color: "#e8d3a8",
      alpha: 0.7,
    });

    const hoverC = inRect(g.input.x, g.input.y, this.collectionBtn);
    const hoverS = inRect(g.input.x, g.input.y, this.shopBtn);
    drawButton(ctx, this.shopBtn, "상점", hoverS, { size: 10 });
    drawButton(ctx, this.collectionBtn, "도감 보기", hoverC, { size: 10 });
  }
}
