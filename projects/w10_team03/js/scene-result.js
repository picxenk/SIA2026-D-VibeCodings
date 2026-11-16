"use strict";

/* ─────────────────────────────────────────────
 * 결과 화면
 * ───────────────────────────────────────────── */
class ResultScene {
  constructor(game, data) {
    this.game = game;
    this.data = data;
    this.time = 0;
    this.continueBtn = { x: 117, y: 211, w: 78, h: 26 };
    this.shopBtn = { x: 201, y: 211, w: 78, h: 26 };
    this.collectionBtn = { x: 285, y: 211, w: 78, h: 26 };
  }

  update(dt) {
    this.time += dt;
    const input = this.game.input;

    if (input.pressed) {
      if (inRect(input.x, input.y, this.collectionBtn)) {
        this.game.sfx.page();
        this.game.go(
          new CollectionScene(this.game, () => new FishingScene(this.game))
        );
        return;
      }
      if (this.data.success && inRect(input.x, input.y, this.shopBtn)) {
        this.game.sfx.page();
        this.game.go(
          new ShopScene(this.game, () => new FishingScene(this.game))
        );
        return;
      }
      this.game.sfx.click();
      this.game.go(new FishingScene(this.game));
      return;
    }

    if (input.escape) this.game.go(new FishingScene(this.game));
  }

  draw(ctx) {
    const { success, fish, size, isNew, price = 0, bagCount = 0 } = this.data;
    const t = this.time;
    const hoverC = inRect(this.game.input.x, this.game.input.y, this.collectionBtn);
    const hoverN = inRect(this.game.input.x, this.game.input.y, this.continueBtn);
    const hoverS = inRect(this.game.input.x, this.game.input.y, this.shopBtn);

    ctx.fillStyle = "rgba(20,30,38,0.5)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    const rise = Math.min(1, t / 0.28);
    const offsetY = (1 - easeOut(rise)) * 14;

    ctx.save();
    ctx.translate(0, offsetY);
    drawPanel(ctx, 84, 24, 312, 222, { fill: PALETTE.cream, radius: 8 });

    if (success) {
      drawText(ctx, "낚았어요!", VIEW_W / 2, 46, {
        size: 18,
        color: PALETTE.accentDark,
        align: "center",
        bold: true,
      });
      drawText(
        ctx,
        `도감 ${this.game.collectionCount()}/${FISH.length}`,
        378,
        46,
        {
          size: 9,
          color: PALETTE.inkSoft,
          align: "right",
        }
      );

      // 물고기
      drawFish(ctx, VIEW_W / 2, 102 + Math.sin(t * 3) * 2, 88, 52, fish, t);

      // NEW 배지
      if (isNew) {
        const boing = 1 + Math.sin(t * 8) * 0.06;
        ctx.save();
        ctx.translate(324, 74);
        ctx.scale(boing, boing);
        drawPanel(ctx, -26, -11, 52, 22, {
          fill: PALETTE.gold,
          border: PALETTE.ink,
          radius: 5,
          shadow: false,
        });
        drawText(ctx, "NEW!", 0, 1, {
          size: 11,
          color: "#6b3a10",
          align: "center",
          bold: true,
        });
        ctx.restore();
      }

      drawText(ctx, fish.name, VIEW_W / 2, 138, {
        size: 16,
        color: PALETTE.ink,
        align: "center",
        bold: true,
      });
      drawStars(ctx, VIEW_W / 2, 156, fish.rarity, 10, 4.5);
      drawText(ctx, `${size.toFixed(1)} cm`, VIEW_W / 2, 175, {
        size: 14,
        color: PALETTE.accentDark,
        align: "center",
        bold: true,
      });
      drawText(ctx, "내 최고 기록", VIEW_W / 2, 189, {
        size: 8,
        color: PALETTE.inkSoft,
        align: "center",
      });
      drawText(ctx, `상점 가치 ${price} G · 가방 ${bagCount}마리`, VIEW_W / 2, 201, {
        size: 8,
        color: PALETTE.greenDark,
        align: "center",
      });
    } else {
      drawText(ctx, "놓쳤어요...", VIEW_W / 2, 60, {
        size: 18,
        color: PALETTE.inkSoft,
        align: "center",
        bold: true,
      });

      // 잔잔한 물결
      ctx.strokeStyle = withAlpha(PALETTE.accent, 0.5);
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 3; i++) {
        const r = 16 + i * 12 + ((t * 10) % 12);
        ellipse(ctx, VIEW_W / 2, 116, r, r * 0.4);
        ctx.stroke();
      }
      drawBobber(ctx, VIEW_W / 2, 116 + Math.sin(t * 2) * 2);

      drawText(ctx, "물고기가 도망갔어요", VIEW_W / 2, 150, {
        size: 11,
        color: PALETTE.ink,
        align: "center",
      });
      drawText(ctx, "다음엔 잡을 수 있어요!", VIEW_W / 2, 168, {
        size: 9,
        color: PALETTE.inkSoft,
        align: "center",
      });
      drawText(
        ctx,
        `도감 ${this.game.collectionCount()}/${FISH.length}`,
        VIEW_W / 2,
        190,
        {
          size: 9,
          color: PALETTE.ink,
          align: "center",
        }
      );
    }

    if (success) {
      drawButton(ctx, this.continueBtn, "계속 낚시", hoverN, { size: 10 });
      drawButton(ctx, this.shopBtn, "상점", hoverS, { size: 10 });
      drawButton(ctx, this.collectionBtn, "도감", hoverC, { size: 10 });
    } else {
      drawButton(
        ctx,
        { x: 196, y: 211, w: 88, h: 26 },
        "계속 낚시",
        inRect(this.game.input.x, this.game.input.y, { x: 196, y: 211, w: 88, h: 26 })
      );
    }
    ctx.restore();
  }
}
