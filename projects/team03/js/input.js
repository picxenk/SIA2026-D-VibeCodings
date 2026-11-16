"use strict";

/* ─────────────────────────────────────────────
 * 입력 통합 (마우스 · 터치 · 키보드)
 * ───────────────────────────────────────────── */
class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = false;
    this.pressed = false;
    this.released = false;
    this.escape = false;
    this.x = VIEW_W / 2;
    this.y = VIEW_H / 2;

    const setPos = (clientX, clientY) => {
      const r = canvas.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.x = ((clientX - r.left) / r.width) * VIEW_W;
      this.y = ((clientY - r.top) / r.height) * VIEW_H;
    };

    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      setPos(e.clientX, e.clientY);
      this.down = true;
      this.pressed = true;
      if (canvas.setPointerCapture) {
        try {
          canvas.setPointerCapture(e.pointerId);
        } catch (_) {
          /* noop */
        }
      }
    });

    canvas.addEventListener("pointermove", (e) => {
      setPos(e.clientX, e.clientY);
    });

    window.addEventListener("pointerup", () => {
      if (!this.down) return;
      this.down = false;
      this.released = true;
    });

    window.addEventListener("pointercancel", () => {
      this.down = false;
      this.released = true;
    });

    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        setPos(VIEW_W / 2, VIEW_H / 2); // 키보드 입력 시 중앙 기준
        this.down = true;
        this.pressed = true;
      }
      if (e.code === "Escape" || e.code === "KeyP") this.escape = true;
    });

    window.addEventListener("keyup", (e) => {
      if (e.code === "Space" || e.code === "Enter") {
        this.down = false;
        this.released = true;
      }
    });

    window.addEventListener("blur", () => {
      this.down = false;
    });

    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  endFrame() {
    this.pressed = false;
    this.released = false;
    this.escape = false;
  }
}
