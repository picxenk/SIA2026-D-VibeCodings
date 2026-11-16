"use strict";

/* ─────────────────────────────────────────────
 * 게임 루프 · 씬 관리 · 스케일
 * ───────────────────────────────────────────── */
class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;

    this.input = new Input(canvas);
    this.sfx = new Sfx();
    this.save = Save.load();
    this.sfx.enabled = this.save.soundOn;

    this.bg = new Background();
    this.themeKey = this.themeName();
    this.bg.setTheme(this.themeKey, true);

    this.time = 0;
    this.acc = 0;
    this.last = 0;

    this.scene = new TitleScene(this);

    this.fit();
    window.addEventListener("resize", () => this.fit());
    window.addEventListener("orientationchange", () => {
      setTimeout(() => this.fit(), 120);
    });
  }

  themeName() {
    const c = this.save.totalCasts % TIME_CYCLE;
    if (c < 5) return "day";
    if (c < 10) return "dusk";
    return "night";
  }

  updateTheme() {
    const next = this.themeName();
    if (next !== this.themeKey) {
      this.themeKey = next;
      this.bg.setTheme(next);
    }
  }

  collectionCount() {
    return Object.keys(this.save.caught).length;
  }

  toggleSound() {
    this.save.soundOn = !this.save.soundOn;
    this.sfx.enabled = this.save.soundOn;
    this.saveToStorage();
    if (this.save.soundOn) {
      this.sfx.init();
      this.sfx.click();
    }
  }

  saveToStorage() {
    Save.save(this.save);
  }

  go(scene) {
    this.scene = scene;
  }

  fit() {
    const canvas = this.canvas;
    const pad = 20;
    const availW = Math.max(120, window.innerWidth - pad * 2);
    const availH = Math.max(80, window.innerHeight - pad * 2);
    let scale = Math.min(availW / VIEW_W, availH / VIEW_H);

    if (scale >= 1) {
      scale = Math.floor(scale);
    } else {
      scale = Math.max(0.35, scale);
    }

    canvas.style.width = `${Math.round(VIEW_W * scale)}px`;
    canvas.style.height = `${Math.round(VIEW_H * scale)}px`;
  }

  start() {
    this.last = performance.now();
    const frame = (now) => {
      const dt = Math.min((now - this.last) / 1000, 0.1);
      this.last = now;
      this.acc += dt;

      const STEP = 1 / 60;
      let steps = 0;
      while (this.acc >= STEP && steps < 5) {
        this.update(STEP);
        this.acc -= STEP;
        steps++;
      }
      if (steps === 5) this.acc = 0;

      this.render();
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  update(dt) {
    this.time += dt;
    if (this.input.pressed || this.input.down || this.input.escape) {
      this.sfx.init();
    }
    this.bg.update(dt);
    this.scene.update(dt);
    this.input.endFrame();
  }

  render() {
    const ctx = this.ctx;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    this.bg.draw(ctx);
    this.scene.draw(ctx);
  }
}
