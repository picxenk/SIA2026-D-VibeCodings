"use strict";

/* ─────────────────────────────────────────────
 * 상점: 물고기 판매 + 낚싯대 구매/장착
 * ───────────────────────────────────────────── */
class ShopScene {
  constructor(game, back) {
    this.game = game;
    this.time = 0;
    this.back = back || (() => new TitleScene(game));
    this.tab = "sell";
    this.toast = null;

    this.tabSell = { x: 34, y: 42, w: 90, h: 22 };
    this.tabRod = { x: 130, y: 42, w: 90, h: 22 };
    this.sellAllBtn = { x: 34, y: 228, w: 150, h: 22 };
    this.sellOneBtn = { x: 300, y: 184, w: 130, h: 22 };
    this.backBtn = { x: 352, y: 228, w: 96, h: 22 };

    this.grid = { x: 34, y: 76, w: 56, h: 46, gap: 4, cols: 4 };
    this.rodRows = RODS.map((rod, i) => ({
      rod,
      rect: { x: 34, y: 76 + i * 37, w: 412, h: 33 },
    }));

    const firstOwned = FISH.find((f) => this.countOf(f.id) > 0);
    this.selected = firstOwned ? firstOwned.id : FISH[0].id;
  }

  /* ── 데이터 헬퍼 ───────────────────────── */
  counts() {
    const c = {};
    for (const it of this.game.save.inventory) {
      if (FISH_BY_ID[it.id]) c[it.id] = (c[it.id] || 0) + 1;
    }
    return c;
  }

  countOf(id) {
    let n = 0;
    for (const it of this.game.save.inventory) if (it.id === id) n++;
    return n;
  }

  stackValue(id) {
    let v = 0;
    for (const it of this.game.save.inventory) {
      if (it.id !== id) continue;
      const fish = FISH_BY_ID[it.id];
      if (fish) v += fishPrice(fish, it.size);
    }
    return v;
  }

  inventoryValue() {
    let v = 0;
    for (const it of this.game.save.inventory) {
      const fish = FISH_BY_ID[it.id];
      if (fish) v += fishPrice(fish, it.size);
    }
    return v;
  }

  /* ── 액션 ─────────────────────────────── */
  setToast(text, color = PALETTE.ink) {
    this.toast = { text, timer: 1.6, color };
  }

  sellStack(id) {
    const fish = FISH_BY_ID[id];
    const n = this.countOf(id);
    if (!n) {
      this.setToast("가방에 없는 물고기예요", PALETTE.inkSoft);
      return;
    }
    const total = this.stackValue(id);
    this.game.save.inventory = this.game.save.inventory.filter(
      (it) => it.id !== id
    );
    this.game.save.gold += total;
    this.game.saveToStorage();
    this.game.sfx.coin();
    this.setToast(`${fish.name} ${n}마리  +${total} G`, PALETTE.greenDark);
  }

  sellAll() {
    const n = this.game.save.inventory.length;
    const total = this.inventoryValue();
    if (!n || !total) {
      this.setToast("팔 물고기가 없어요", PALETTE.inkSoft);
      return;
    }
    this.game.save.inventory = [];
    this.game.save.gold += total;
    this.game.saveToStorage();
    this.game.sfx.coin();
    this.setToast(`${n}마리 판매  +${total} G`, PALETTE.greenDark);
  }

  handleRod(rod) {
    const save = this.game.save;
    if (save.rod === rod.id) return;

    if (save.ownedRods.includes(rod.id)) {
      save.rod = rod.id;
      this.game.saveToStorage();
      this.game.sfx.click();
      this.setToast(`${rod.name} 장착!`, PALETTE.ink);
      return;
    }

    if (save.gold < rod.price) {
      this.game.sfx.fail();
      this.setToast("골드가 부족해요", PALETTE.red);
      return;
    }

    save.gold -= rod.price;
    save.ownedRods.push(rod.id);
    save.rod = rod.id;
    this.game.saveToStorage();
    this.game.sfx.buy();
    this.setToast(`${rod.name} 구매 완료!`, PALETTE.greenDark);
  }

  /* ── 업데이트 ─────────────────────────── */
  update(dt) {
    this.time += dt;
    const input = this.game.input;

    if (this.toast) {
      this.toast.timer -= dt;
      if (this.toast.timer <= 0) this.toast = null;
    }

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
    if (inRect(input.x, input.y, this.tabSell)) {
      if (this.tab !== "sell") this.game.sfx.page();
      this.tab = "sell";
      return;
    }
    if (inRect(input.x, input.y, this.tabRod)) {
      if (this.tab !== "rod") this.game.sfx.page();
      this.tab = "rod";
      return;
    }

    if (this.tab === "sell") {
      if (inRect(input.x, input.y, this.sellAllBtn)) {
        this.sellAll();
        return;
      }
      if (
        inRect(input.x, input.y, this.sellOneBtn) &&
        this.countOf(this.selected) > 0
      ) {
        this.sellStack(this.selected);
        return;
      }
      for (let i = 0; i < FISH.length; i++) {
        const fish = FISH[i];
        if (inRect(input.x, input.y, this.cellRect(i))) {
          if (this.selected !== fish.id) this.game.sfx.page();
          this.selected = fish.id;
          return;
        }
      }
    } else {
      for (const row of this.rodRows) {
        const b = this.rodButtonRect(row.rect);
        if (inRect(input.x, input.y, b)) {
          this.handleRod(row.rod);
          return;
        }
      }
    }
  }

  cellRect(i) {
    const g = this.grid;
    const col = i % g.cols;
    const row = Math.floor(i / g.cols);
    return {
      x: g.x + col * (g.w + g.gap),
      y: g.y + row * (g.h + g.gap),
      w: g.w,
      h: g.h,
    };
  }

  rodButtonRect(r) {
    return { x: r.x + r.w - 72, y: r.y + 5, w: 64, h: 23 };
  }

  /* ── 그리기 ───────────────────────────── */
  draw(ctx) {
    const g = this.game;
    const input = g.input;
    const save = g.save;

    ctx.fillStyle = "rgba(20,30,38,0.5)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    drawPanel(ctx, 16, 10, 448, 250, { fill: PALETTE.cream, radius: 8 });

    // 헤더
    drawText(ctx, "별빛 상점", 34, 29, {
      size: 15,
      color: PALETTE.ink,
      bold: true,
    });
    drawText(ctx, `· 가방 ${save.inventory.length}마리`, 112, 30, {
      size: 7,
      color: PALETTE.inkSoft,
    });

    // 금액 폭을 재서 코인이 텍스트와 겹치지 않게 배치
    const goldLabel = `${formatGold(save.gold)} G`;
    ctx.save();
    ctx.font = `bold 12px ${FONT}`;
    const goldW = ctx.measureText(goldLabel).width;
    ctx.restore();
    drawCoin(ctx, 446 - goldW - 9, 29, 4.5);
    drawText(ctx, goldLabel, 446, 29, {
      size: 12,
      color: PALETTE.accentDark,
      align: "right",
      bold: true,
    });

    // 탭
    this.drawTab(ctx, this.tabSell, "물고기 판매", this.tab === "sell");
    this.drawTab(ctx, this.tabRod, "낚싯대", this.tab === "rod");

    if (this.tab === "sell") this.drawSellTab(ctx, input, save);
    else this.drawRodTab(ctx, input, save);

    // 푸터
    if (this.tab === "sell") {
      const total = this.inventoryValue();
      const hover = inRect(input.x, input.y, this.sellAllBtn);
      drawPanel(
        ctx,
        this.sellAllBtn.x,
        this.sellAllBtn.y,
        this.sellAllBtn.w,
        this.sellAllBtn.h,
        {
          fill:
            total > 0
              ? hover
                ? PALETTE.accentDark
                : PALETTE.accent
              : "#e2d4b8",
          border: PALETTE.ink,
          radius: 5,
          shadow: false,
        }
      );
      drawText(
        ctx,
        total > 0 ? `전부 팔기  ${formatGold(total)} G` : "전부 팔기",
        this.sellAllBtn.x + this.sellAllBtn.w / 2,
        this.sellAllBtn.y + 12,
        {
          size: 9,
          color: total > 0 ? "#fff6d8" : PALETTE.inkSoft,
          align: "center",
          bold: true,
        }
      );
    }

    drawButton(ctx, this.backBtn, "돌아가기", inRect(input.x, input.y, this.backBtn), {
      size: 10,
    });

    // 토스트
    if (this.toast) {
      const a = clamp(this.toast.timer / 0.35, 0, 1);
      drawText(ctx, this.toast.text, 268, 239, {
        size: 9,
        color: this.toast.color,
        align: "center",
        outline: PALETTE.creamLight,
        alpha: a,
        bold: true,
      });
    }
  }

  drawTab(ctx, rect, label, active) {
    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: active ? PALETTE.accent : PALETTE.creamDark,
      border: PALETTE.ink,
      radius: 5,
      shadow: false,
    });
    drawText(ctx, label, rect.x + rect.w / 2, rect.y + 12, {
      size: 10,
      color: active ? "#fff6d8" : PALETTE.inkSoft,
      align: "center",
      bold: active,
    });
  }

  drawSellTab(ctx, input, save) {
    const counts = this.counts();

    for (let i = 0; i < FISH.length; i++) {
      const fish = FISH[i];
      const n = counts[fish.id] || 0;
      const sel = this.selected === fish.id;
      const r = this.cellRect(i);

      drawPanel(ctx, r.x, r.y, r.w, r.h, {
        fill: sel ? PALETTE.creamLight : n ? "#f1e0bd" : "#e4d7bb",
        border: sel ? PALETTE.accentDark : withAlpha(PALETTE.ink, 0.4),
        radius: 5,
        shadow: false,
      });

      drawFish(ctx, r.x + r.w / 2, r.y + 16, 32, 18, fish, this.time + i, {
        silhouette: n === 0,
      });

      if (n > 0) {
        drawText(ctx, fish.name, r.x + r.w / 2, r.y + 33, {
          size: 7,
          color: PALETTE.ink,
          align: "center",
        });
        drawText(ctx, `${this.stackValue(fish.id)}G`, r.x + r.w / 2, r.y + 42, {
          size: 7,
          color: PALETTE.accentDark,
          align: "center",
        });
        drawText(ctx, `x${n}`, r.x + r.w - 5, r.y + 7, {
          size: 7,
          color: PALETTE.ink,
          align: "right",
          bold: true,
        });
      } else {
        drawText(ctx, "-", r.x + r.w / 2, r.y + 39, {
          size: 8,
          color: withAlpha(PALETTE.inkSoft, 0.7),
          align: "center",
        });
      }
    }

    // 상세 패널
    const fish = FISH_BY_ID[this.selected] || FISH[0];
    const n = this.countOf(fish.id);
    drawPanel(ctx, 282, 76, 166, 146, {
      fill: "#f2e2c0",
      border: withAlpha(PALETTE.ink, 0.5),
      radius: 6,
      shadow: false,
    });

    if (n > 0) {
      drawFish(ctx, 365, 100, 58, 34, fish, this.time);
      drawText(ctx, fish.name, 365, 124, {
        size: 12,
        color: PALETTE.ink,
        align: "center",
        bold: true,
      });
      drawText(ctx, `${n}마리 보유`, 365, 140, {
        size: 8,
        color: PALETTE.inkSoft,
        align: "center",
      });
      drawText(ctx, `${formatGold(this.stackValue(fish.id))} G`, 365, 158, {
        size: 14,
        color: PALETTE.accentDark,
        align: "center",
        bold: true,
      });
      drawText(
        ctx,
        `1마리 평균 ${formatGold(Math.round(this.stackValue(fish.id) / n))} G`,
        365,
        172,
        {
        size: 7,
        color: PALETTE.inkSoft,
        align: "center",
      });
      drawButton(
        ctx,
        this.sellOneBtn,
        "이 종류 팔기",
        inRect(input.x, input.y, this.sellOneBtn),
        { size: 9 }
      );
    } else {
      drawFish(ctx, 365, 102, 58, 34, fish, this.time, { silhouette: true });
      drawText(ctx, fish.name, 365, 128, {
        size: 12,
        color: PALETTE.inkSoft,
        align: "center",
        bold: true,
      });
      drawText(ctx, "가방에 없어요", 365, 146, {
        size: 9,
        color: PALETTE.inkSoft,
        align: "center",
      });
      drawText(ctx, "낚시해서 채워 보세요", 365, 164, {
        size: 7,
        color: withAlpha(PALETTE.inkSoft, 0.85),
        align: "center",
      });
    }
  }

  drawRodTab(ctx, input, save) {
    for (const { rod, rect } of this.rodRows) {
      const owned = save.ownedRods.includes(rod.id);
      const equipped = save.rod === rod.id;
      const b = this.rodButtonRect(rect);
      const hoverRow = inRect(input.x, input.y, rect);

      drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
        fill: equipped ? "#fff3d6" : owned ? "#f1e0bd" : "#e4d7bb",
        border: equipped ? PALETTE.accentDark : withAlpha(PALETTE.ink, 0.4),
        radius: 5,
        shadow: false,
      });

      drawRodIcon(ctx, rect.x + 20, rect.y + 17, rod);

      drawText(ctx, rod.name, rect.x + 40, rect.y + 12, {
        size: 10,
        color: PALETTE.ink,
        bold: true,
      });
      drawText(ctx, rodStatText(rod), rect.x + 40, rect.y + 24, {
        size: 7,
        color: equipped ? PALETTE.accentDark : PALETTE.inkSoft,
      });

      if (!owned) {
        drawText(ctx, `${formatGold(rod.price)} G`, b.x - 8, rect.y + 16, {
          size: 9,
          color: PALETTE.accentDark,
          align: "right",
          bold: true,
        });
      }

      const label = equipped ? "사용 중" : owned ? "장착" : "구매";
      const hoverB = inRect(input.x, input.y, b);
      if (equipped) {
        drawPanel(ctx, b.x, b.y, b.w, b.h, {
          fill: PALETTE.creamDark,
          border: withAlpha(PALETTE.ink, 0.45),
          radius: 5,
          shadow: false,
        });
        drawText(ctx, label, b.x + b.w / 2, b.y + b.h / 2 + 1, {
          size: 8,
          color: PALETTE.inkSoft,
          align: "center",
        });
      } else {
        drawButton(ctx, b, label, hoverB || hoverRow, { size: 9 });
      }
    }
  }
}

/* 상점용 미니 낚싯대 아이콘 */
function drawRodIcon(ctx, cx, cy, rod) {
  ctx.save();
  ctx.lineCap = "round";

  ctx.strokeStyle = "#4a3024";
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 9);
  ctx.lineTo(cx + 10, cy - 10);
  ctx.stroke();

  ctx.strokeStyle = rod.color;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(cx - 7, cy + 9);
  ctx.lineTo(cx + 10, cy - 10);
  ctx.stroke();

  if (rod.reel) {
    ctx.fillStyle = "#f7e9c9";
    circle(ctx, cx - 1, cy + 1, 2.8);
    ctx.fill();
    ctx.strokeStyle = "#4a3024";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}
