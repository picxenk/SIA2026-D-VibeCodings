"use strict";

/* ─────────────────────────────────────────────
 * 도감 화면
 * ───────────────────────────────────────────── */
class CollectionScene {
  constructor(game, back) {
    this.game = game;
    this.time = 0;
    this.back = back || (() => new TitleScene(game));
    this.backBtn = { x: 348, y: 226, w: 96, h: 22 };

    // 처음엔 잡은 물고기(또는 첫 칸) 선택
    const caughtIdx = FISH.findIndex((f) => game.save.caught[f.id]);
    this.selected = caughtIdx >= 0 ? caughtIdx : 0;

    this.grid = { x: 30, y: 46, cell: 58, gap: 4, cols: 4 };
  }

  cellRect(i) {
    const g = this.grid;
    const col = i % g.cols;
    const row = Math.floor(i / g.cols);
    return {
      x: g.x + col * (g.cell + g.gap),
      y: g.y + row * (g.cell + g.gap),
      w: g.cell,
      h: g.cell,
    };
  }

  update(dt) {
    this.time += dt;
    const input = this.game.input;

    if (input.escape) {
      this.game.sfx.click();
      this.game.go(this.back());
      return;
    }

    if (!input.pressed) return;

    if (inRect(input.x, input.y, this.backBtn)) {
      this.game.sfx.click();
      this.game.go(this.back());
      return;
    }

    for (let i = 0; i < FISH.length; i++) {
      if (inRect(input.x, input.y, this.cellRect(i))) {
        if (i !== this.selected) this.game.sfx.page();
        this.selected = i;
        return;
      }
    }
  }

  draw(ctx) {
    const g = this.game;
    const caughtCount = g.collectionCount();
    const input = g.input;

    ctx.fillStyle = "rgba(20,30,38,0.45)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawPanel(ctx, 16, 10, 448, 250, { fill: PALETTE.cream, radius: 8 });

    drawText(ctx, "별빛 도감", 34, 30, {
      size: 15,
      color: PALETTE.ink,
      bold: true,
    });
    drawText(ctx, `${caughtCount} / ${FISH.length}`, 446, 30, {
      size: 11,
      color: PALETTE.accentDark,
      align: "right",
      bold: true,
    });

    // 구분선
    ctx.strokeStyle = withAlpha(PALETTE.ink, 0.25);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(34, 39);
    ctx.lineTo(446, 39);
    ctx.stroke();

    // 도감 그리드
    for (let i = 0; i < FISH.length; i++) {
      const fish = FISH[i];
      const rec = g.save.caught[fish.id];
      const r = this.cellRect(i);
      const selected = i === this.selected;
      const hover = inRect(input.x, input.y, r);

      drawPanel(ctx, r.x, r.y, r.w, r.h, {
        fill: selected
          ? PALETTE.creamLight
          : rec
            ? "#f1e0bd"
            : "#e2d4b8",
        border: selected ? PALETTE.accentDark : withAlpha(PALETTE.ink, 0.55),
        radius: 6,
        shadow: false,
      });

      drawFish(ctx, r.x + r.w / 2, r.y + 23, 38, 23, fish, this.time + i, {
        silhouette: !rec,
      });

      if (rec) {
        drawText(ctx, fish.name, r.x + r.w / 2, r.y + 43, {
          size: 8,
          color: PALETTE.ink,
          align: "center",
        });
        drawText(ctx, `${rec.bestSize.toFixed(1)}cm`, r.x + r.w / 2, r.y + 52, {
          size: 7,
          color: PALETTE.inkSoft,
          align: "center",
        });
      } else {
        drawText(ctx, "???", r.x + r.w / 2, r.y + 45, {
          size: 8,
          color: PALETTE.inkSoft,
          align: "center",
        });
      }

      // 희귀도 점
      ctx.fillStyle = RARITY_COLOR[fish.rarity - 1];
      circle(ctx, r.x + r.w - 8, r.y + 8, 2.4);
      ctx.fill();

      if (selected || hover) {
        ctx.strokeStyle = selected
          ? withAlpha(PALETTE.accentDark, 0.9)
          : withAlpha(PALETTE.ink, 0.4);
        ctx.lineWidth = selected ? 2 : 1;
        roundRect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, 5);
        ctx.stroke();
      }
    }

    // 상세 패널
    this.drawDetail(ctx, FISH[this.selected]);

    drawButton(ctx, this.backBtn, "돌아가기", inRect(input.x, input.y, this.backBtn), {
      size: 10,
    });

    drawText(ctx, "클릭해서 물고기 정보 보기", 30, 246, {
      size: 8,
      color: PALETTE.inkSoft,
    });
  }

  drawDetail(ctx, fish) {
    const rec = this.game.save.caught[fish.id];
    const x = 292;
    const y = 46;
    const w = 158;
    const h = 174;

    drawPanel(ctx, x, y, w, h, {
      fill: "#f2e2c0",
      border: withAlpha(PALETTE.ink, 0.55),
      radius: 6,
      shadow: false,
    });

    if (rec) {
      drawFish(ctx, x + w / 2, y + 34, 64, 38, fish, this.time);
      drawText(ctx, fish.name, x + w / 2, y + 66, {
        size: 13,
        color: PALETTE.ink,
        align: "center",
        bold: true,
      });
      drawStars(ctx, x + w / 2, y + 82, fish.rarity, 8, 4);

      ctx.strokeStyle = withAlpha(PALETTE.ink, 0.22);
      ctx.beginPath();
      ctx.moveTo(x + 12, y + 93);
      ctx.lineTo(x + w - 12, y + 93);
      ctx.stroke();

      drawText(ctx, "최고 기록", x + 12, y + 106, {
        size: 8,
        color: PALETTE.inkSoft,
      });
      drawText(ctx, `${rec.bestSize.toFixed(1)} cm`, x + 12, y + 120, {
        size: 13,
        color: PALETTE.accentDark,
        bold: true,
      });
      drawText(ctx, `잡은 횟수 ${rec.count}`, x + w - 12, y + 120, {
        size: 8,
        color: PALETTE.inkSoft,
        align: "right",
      });

      drawText(ctx, `출현 · ${timeLabel(fish.times)}`, x + 12, y + 136, {
        size: 8,
        color: PALETTE.inkSoft,
      });

      const lines = wrapText(ctx, fish.desc, w - 24, 8);
      lines.slice(0, 3).forEach((line, i) => {
        drawText(ctx, line, x + 12, y + 152 + i * 11, {
          size: 8,
          color: PALETTE.ink,
        });
      });
    } else {
      drawFish(ctx, x + w / 2, y + 38, 60, 36, fish, this.time, {
        silhouette: true,
      });
      drawText(ctx, "???", x + w / 2, y + 72, {
        size: 15,
        color: PALETTE.inkSoft,
        align: "center",
        bold: true,
      });
      drawText(ctx, "아직 잡지 못한 물고기", x + w / 2, y + 92, {
        size: 8,
        color: PALETTE.inkSoft,
        align: "center",
      });

      drawText(ctx, "힌트", x + 12, y + 118, {
        size: 8,
        color: PALETTE.inkSoft,
      });
      drawText(ctx, `출현 시간 · ${timeLabel(fish.times)}`, x + 12, y + 132, {
        size: 9,
        color: PALETTE.ink,
      });
      drawText(ctx, `희귀도 · ${"★".repeat(fish.rarity)}`, x + 12, y + 148, {
        size: 9,
        color: RARITY_COLOR[fish.rarity - 1],
      });
      drawText(ctx, "잡으면 이곳에 기록이 남아요", x + w / 2, y + 166, {
        size: 7,
        color: PALETTE.inkSoft,
        align: "center",
      });
    }
  }
}
