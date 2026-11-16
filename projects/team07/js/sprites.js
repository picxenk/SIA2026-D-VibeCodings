/* 몬스터 스프라이트: 128x128 오프스크린 캔버스에 절차적으로 그린다 */
(function () {
  'use strict';

  const cache = {};

  function ell(ctx, x, y, rx, ry, fill, stroke, lw) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function circ(ctx, x, y, r, fill, stroke, lw) {
    ell(ctx, x, y, r, r, fill, stroke, lw);
  }

  function poly(ctx, points, fill, stroke, lw) {
    ctx.beginPath();
    points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p[0], p[1]);
      else ctx.lineTo(p[0], p[1]);
    });
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function shape(ctx, build, fill, stroke, lw) {
    ctx.beginPath();
    build(ctx);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 2; ctx.stroke(); }
  }

  function eye(ctx, x, y, r, pupil) {
    circ(ctx, x, y, r, '#2a2033', null);
    circ(ctx, x - r * 0.3, y - r * 0.35, r * 0.36, '#ffffff', null);
    if (pupil !== false) circ(ctx, x + r * 0.18, y + r * 0.15, r * 0.24, '#5b4a68', null);
  }

  function smile(ctx, x, y, w, color) {
    ctx.beginPath();
    ctx.arc(x, y, w, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.strokeStyle = color || '#4a2b2b';
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const ART = {
    emberpup(ctx) {
      const OUT = '#5b2412';
      const ORANGE = '#ff8a4a';
      const LIGHT = '#ffb06e';
      const CREAM = '#ffe7c2';

      // 꼬리 불꽃
      shape(ctx, (c) => {
        c.moveTo(21, 48);
        c.bezierCurveTo(7, 50, 1, 38, 8, 28);
        c.bezierCurveTo(12, 21, 20, 22, 17, 31);
        c.bezierCurveTo(27, 30, 29, 43, 21, 48);
      }, '#ffb347', OUT, 2);
      shape(ctx, (c) => {
        c.moveTo(17, 43);
        c.bezierCurveTo(9, 40, 8, 31, 14, 29);
        c.bezierCurveTo(18, 33, 20, 39, 17, 43);
      }, '#ffd66b', null);

      // 몸통
      ell(ctx, 33, 43, 14, 11.5, ORANGE, OUT, 2);
      ell(ctx, 33, 45, 8.5, 7, CREAM, null);
      // 다리
      ell(ctx, 23, 52, 6.5, 3.8, ORANGE, OUT, 2);
      ell(ctx, 43, 52, 6.5, 3.8, ORANGE, OUT, 2);
      ell(ctx, 23, 53, 3.4, 2, CREAM, null);
      ell(ctx, 43, 53, 3.4, 2, CREAM, null);
      // 꼬리 연결부
      ell(ctx, 20, 43, 5, 5, ORANGE, OUT, 2);

      // 귀
      poly(ctx, [[23, 19], [18, 5], [32, 15]], ORANGE, OUT, 2);
      poly(ctx, [[43, 19], [48, 5], [34, 15]], ORANGE, OUT, 2);
      poly(ctx, [[24, 16], [21.5, 9], [29, 15]], '#ffc08a', null);
      poly(ctx, [[42, 16], [44.5, 9], [37, 15]], '#ffc08a', null);

      // 머리
      circ(ctx, 33, 26, 12, ORANGE, OUT, 2);
      circ(ctx, 33, 26.5, 9.5, LIGHT, null);
      // 얼굴
      ell(ctx, 33, 31, 7, 5, CREAM, null);
      eye(ctx, 28, 24.5, 2.1);
      eye(ctx, 38, 24.5, 2.1);
      poly(ctx, [[33, 27.5], [31.6, 29.4], [34.4, 29.4]], '#4a2b2b', null);
      smile(ctx, 33, 30.5, 2.6, '#6d3a2a');
      circ(ctx, 24, 29.5, 2, 'rgba(255,90,90,0.5)', null);
      circ(ctx, 42, 29.5, 2, 'rgba(255,90,90,0.5)', null);
      // 볼 하이라이트
      ctx.beginPath();
      ctx.arc(28, 19, 4, 3.4, 5.4);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    },

    aquabble(ctx) {
      const OUT = '#174a7a';
      const BLUE = '#5cb8ff';
      const LIGHT = '#a7e2ff';

      // 옆 지느러미
      poly(ctx, [[16, 38], [5, 30], [8, 40], [4, 48], [16, 46]], '#3f9ee8', OUT, 2);
      poly(ctx, [[48, 38], [59, 30], [56, 40], [60, 48], [48, 46]], '#3f9ee8', OUT, 2);

      // 몸통
      ell(ctx, 32, 39, 17, 15, BLUE, OUT, 2);
      ell(ctx, 32, 44, 12, 9.5, LIGHT, null);
      // 물방울 머리
      shape(ctx, (c) => {
        c.moveTo(32, 8);
        c.bezierCurveTo(38, 15, 40, 20, 32, 22);
        c.bezierCurveTo(24, 20, 26, 15, 32, 8);
      }, '#9fe6ff', OUT, 2);
      circ(ctx, 30, 15, 1.6, 'rgba(255,255,255,0.8)', null);
      // 지느러미
      poly(ctx, [[32, 24], [26, 15], [38, 15]], '#3f9ee8', null);

      // 눈
      circ(ctx, 26, 34, 4.4, '#ffffff', OUT, 1.4);
      circ(ctx, 38, 34, 4.4, '#ffffff', OUT, 1.4);
      circ(ctx, 26.5, 34.5, 2.3, '#23324a', null);
      circ(ctx, 38.5, 34.5, 2.3, '#23324a', null);
      circ(ctx, 25.6, 33.4, 0.9, '#ffffff', null);
      circ(ctx, 37.6, 33.4, 0.9, '#ffffff', null);
      smile(ctx, 32, 41, 3, '#2b5f86');
      circ(ctx, 22, 41, 2.4, 'rgba(255,255,255,0.28)', null);
      circ(ctx, 42, 41, 2.4, 'rgba(255,255,255,0.28)', null);
      // 거품
      circ(ctx, 52, 20, 2.6, 'rgba(190,240,255,0.5)', 'rgba(255,255,255,0.7)', 1);
      circ(ctx, 14, 21, 1.8, 'rgba(190,240,255,0.45)', 'rgba(255,255,255,0.6)', 1);
      circ(ctx, 48, 12, 1.4, 'rgba(190,240,255,0.4)', null);
    },

    sproutle(ctx) {
      const OUT = '#245b2b';
      const GREEN = '#6ecf73';
      const LIGHT = '#9be79d';
      const CREAM = '#f2f0c9';

      // 새싹
      ctx.beginPath();
      ctx.moveTo(32, 17);
      ctx.quadraticCurveTo(31, 10, 32, 7);
      ctx.strokeStyle = '#3f8a42';
      ctx.lineWidth = 2;
      ctx.stroke();
      shape(ctx, (c) => {
        c.moveTo(32, 11);
        c.bezierCurveTo(26, 10, 19, 6, 20, 2);
        c.bezierCurveTo(27, 3, 31, 7, 32, 11);
      }, '#8ee88a', '#2f7a33', 1.6);
      shape(ctx, (c) => {
        c.moveTo(33, 9);
        c.bezierCurveTo(38, 8, 44, 3, 43, 0);
        c.bezierCurveTo(37, 2, 34, 6, 33, 9);
      }, '#a6f39e', '#2f7a33', 1.6);

      // 몸통
      ell(ctx, 32, 44, 16, 13, GREEN, OUT, 2);
      ell(ctx, 32, 47, 10, 8.5, CREAM, null);
      // 다리
      ell(ctx, 22, 55, 6.5, 3.6, GREEN, OUT, 2);
      ell(ctx, 42, 55, 6.5, 3.6, GREEN, OUT, 2);
      ell(ctx, 22, 56, 3.2, 1.8, CREAM, null);
      ell(ctx, 42, 56, 3.2, 1.8, CREAM, null);
      // 등 점
      circ(ctx, 21, 41, 2.2, 'rgba(40,120,55,0.35)', null);
      circ(ctx, 44, 43, 1.8, 'rgba(40,120,55,0.35)', null);

      // 머리
      circ(ctx, 32, 28, 12, GREEN, OUT, 2);
      circ(ctx, 32, 27, 9, LIGHT, null);
      // 얼굴
      eye(ctx, 27, 28, 2.1);
      eye(ctx, 37, 28, 2.1);
      smile(ctx, 32, 32, 2.8, '#2f5d31');
      circ(ctx, 23, 33, 2, 'rgba(255,120,120,0.35)', null);
      circ(ctx, 41, 33, 2, 'rgba(255,120,120,0.35)', null);
      ctx.beginPath();
      ctx.arc(27.5, 21.5, 3.6, 3.3, 5.2);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    },

    pebblit(ctx) {
      const OUT = '#3a4058';
      const ROCK = '#9aa3ba';
      const LIGHT = '#c4cbdd';

      // 팔 바위
      ell(ctx, 12, 42, 5.5, 4.2, ROCK, OUT, 2);
      ell(ctx, 52, 41, 5.5, 4.2, ROCK, OUT, 2);
      // 몸통 바위
      poly(ctx, [
        [16, 47], [13, 34], [22, 20], [36, 16], [50, 26],
        [52, 43], [43, 54], [24, 54]
      ], ROCK, OUT, 2.4);
      // 상단 면
      poly(ctx, [[22, 20], [36, 16], [43, 25], [30, 30]], LIGHT, null);
      // 균열
      ctx.beginPath();
      ctx.moveTo(40, 22);
      ctx.lineTo(36, 30);
      ctx.lineTo(39, 36);
      ctx.strokeStyle = 'rgba(58,64,88,0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(20, 45);
      ctx.lineTo(25, 40);
      ctx.lineTo(23, 35);
      ctx.stroke();
      // 눈
      ell(ctx, 26, 35, 4.3, 3.4, '#ffffff', OUT, 1.2);
      ell(ctx, 39, 35, 4.3, 3.4, '#ffffff', OUT, 1.2);
      circ(ctx, 27, 36, 2, '#2c3142', null);
      circ(ctx, 40, 36, 2, '#2c3142', null);
      circ(ctx, 26, 35, 0.7, '#ffffff', null);
      circ(ctx, 39, 35, 0.7, '#ffffff', null);
      // 입
      ctx.beginPath();
      ctx.moveTo(28, 44);
      ctx.quadraticCurveTo(32.5, 47, 37, 44);
      ctx.strokeStyle = '#3a4058';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      // 이빨
      poly(ctx, [[30, 44.5], [32, 47], [34, 44.5]], '#e8ecf5', null);
      // 하이라이트
      ctx.beginPath();
      ctx.arc(26, 26, 5, 3.4, 5.3);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    },

    voltwisp(ctx) {
      const OUT = '#7a5a0e';
      const YELLOW = '#ffe066';
      const LIGHT = '#fff3a8';

      // 은은한 빛
      circ(ctx, 32, 32, 22, 'rgba(255,230,90,0.13)', null);

      // 꼬리 번개
      poly(ctx, [
        [46, 33], [55, 28], [51, 37], [59, 35], [48, 48], [52, 41], [44, 43]
      ], '#ffc93c', OUT, 2);

      // 귀
      poly(ctx, [[24, 16], [20, 4], [31, 13]], YELLOW, OUT, 2);
      poly(ctx, [[41, 16], [45, 4], [34, 13]], YELLOW, OUT, 2);

      // 유령 몸통
      shape(ctx, (c) => {
        c.moveTo(18, 43);
        c.lineTo(18, 29);
        c.bezierCurveTo(18, 14, 46, 14, 46, 29);
        c.lineTo(46, 43);
        c.lineTo(41, 39);
        c.lineTo(37, 45);
        c.lineTo(32, 40);
        c.lineTo(27, 45);
        c.lineTo(23, 39);
        c.closePath();
      }, YELLOW, OUT, 2.2);
      shape(ctx, (c) => {
        c.moveTo(22, 27);
        c.bezierCurveTo(24, 18, 40, 18, 42, 27);
        c.bezierCurveTo(36, 24, 28, 24, 22, 27);
      }, LIGHT, null);
      // 볼
      circ(ctx, 23, 33, 2.6, '#ff9a5c', null);
      circ(ctx, 41, 33, 2.6, '#ff9a5c', null);
      // 눈
      eye(ctx, 27, 30, 2.2);
      eye(ctx, 37, 30, 2.2);
      smile(ctx, 32, 35, 2.4, '#7a5a0e');
      // 스파크
      poly(ctx, [[12, 24], [15, 20], [16, 25], [19, 22]], '#ffd23f', null);
      poly(ctx, [[50, 15], [53, 11], [54, 16], [57, 13]], '#ffd23f', null);
    },

    reefling(ctx) {
      const OUT = '#16595c';
      const TEAL = '#5fd6c9';
      const LIGHT = '#b6f3ea';
      const CORAL = '#ff9a76';

      // 꼬리 지느러미
      poly(ctx, [[20, 38], [6, 29], [9, 41], [5, 51], [20, 47]], CORAL, '#7a3a2a', 2);
      // 등 지느러미
      poly(ctx, [[28, 23], [33, 9], [43, 22]], CORAL, '#7a3a2a', 2);
      // 몸통
      shape(ctx, (c) => {
        c.moveTo(20, 33);
        c.bezierCurveTo(24, 21, 40, 20, 47, 28);
        c.bezierCurveTo(52, 33, 50, 38, 44, 43);
        c.bezierCurveTo(36, 51, 24, 50, 19, 42);
        c.bezierCurveTo(17, 39, 18, 36, 20, 33);
      }, TEAL, OUT, 2.2);
      // 배
      shape(ctx, (c) => {
        c.moveTo(23, 40);
        c.bezierCurveTo(30, 36, 40, 36, 46, 39);
        c.bezierCurveTo(40, 47, 29, 48, 23, 40);
      }, LIGHT, null);
      // 옆지느러미
      poly(ctx, [[31, 40], [26, 47], [35, 45]], CORAL, '#7a3a2a', 1.6);
      // 눈
      circ(ctx, 41, 31, 3.6, '#ffffff', OUT, 1.2);
      circ(ctx, 42, 31.5, 1.9, '#20323e', null);
      circ(ctx, 41.2, 30.6, 0.7, '#ffffff', null);
      // 입
      ctx.beginPath();
      ctx.moveTo(47, 37);
      ctx.quadraticCurveTo(49, 38.5, 47.5, 40);
      ctx.strokeStyle = '#2b6a6a';
      ctx.lineWidth = 1.3;
      ctx.stroke();
      // 볼
      circ(ctx, 37, 37, 1.8, 'rgba(255,120,120,0.3)', null);
      // 비늘
      ctx.beginPath();
      ctx.arc(30, 31, 4, 3.6, 5.3);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // 거품
      circ(ctx, 53, 20, 2.3, 'rgba(180,240,255,0.35)', 'rgba(255,255,255,0.55)', 1);
      circ(ctx, 48, 13, 1.4, 'rgba(180,240,255,0.3)', null);
    }
  };

  function build(speciesId) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    if (ART[speciesId]) ART[speciesId](ctx);
    return canvas;
  }

  function get(speciesId) {
    if (!cache[speciesId]) cache[speciesId] = build(speciesId);
    return cache[speciesId];
  }

  // opts: flip, bob, alpha, blink, tint(무시), scale
  function drawMonster(ctx, speciesId, cx, cy, size, options) {
    const o = options || {};
    const img = get(speciesId);
    ctx.save();
    ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
    ctx.translate(cx, (cy + (o.bob || 0)));
    if (o.flip) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawShadow(ctx, cx, cy, rx, ry, alpha) {
    ctx.save();
    ctx.globalAlpha *= (alpha == null ? 0.28 : alpha);
    ctx.fillStyle = '#0b1020';
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  window.Sprites = { get, drawMonster, drawShadow };
})();
