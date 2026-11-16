/* 절차적 배경: 스테이지 6종 + 타이틀 + 맵 */
(function () {
  'use strict';

  function rand(i) {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  function sky(ctx, top, bottom) {
    const g = ctx.createLinearGradient(0, 0, 0, 210);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);
  }

  function cloud(ctx, x, y, s, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha == null ? 0.7 : alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(x, y, 24 * s, 10 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 18 * s, y + 3 * s, 14 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 20 * s, y + 3 * s, 16 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 2 * s, y - 6 * s, 14 * s, 9 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function hill(ctx, y, color, offset, amp) {
    ctx.beginPath();
    ctx.moveTo(-40, 270);
    ctx.lineTo(-40, y);
    ctx.quadraticCurveTo(80 + offset, y - amp, 200 + offset, y + 8);
    ctx.quadraticCurveTo(330 + offset, y + amp * 0.7, 520, y - 12);
    ctx.lineTo(520, 270);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  function tree(ctx, x, y, s, trunk, leaf) {
    ctx.fillStyle = trunk;
    ctx.fillRect(x - 2.5 * s, y - 26 * s, 5 * s, 28 * s);
    ctx.fillStyle = leaf;
    ctx.beginPath();
    ctx.ellipse(x, y - 32 * s, 15 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x - 10 * s, y - 24 * s, 10 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 10 * s, y - 24 * s, 10 * s, 8 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function vignette(ctx, alpha) {
    const g = ctx.createRadialGradient(240, 120, 100, 240, 135, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(6,8,16,' + (alpha == null ? 0.35 : alpha) + ')');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);
  }

  const BG = {
    meadow(ctx, t) {
      sky(ctx, '#8fd9ff', '#e8fbff');
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#fff6bf';
      ctx.beginPath();
      ctx.arc(398, 38, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.arc(398, 38, 33, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      cloud(ctx, 90 + Math.sin(t * 0.12) * 8, 48, 1, 0.8);
      cloud(ctx, 255 + Math.sin(t * 0.09 + 2) * 10, 32, 0.75, 0.6);
      cloud(ctx, 350 + Math.sin(t * 0.1 + 4) * 6, 78, 0.6, 0.45);

      hill(ctx, 150, '#9bdb8c', 20, 26);
      hill(ctx, 166, '#74c46d', -30, 22);
      ctx.fillStyle = '#9ce27a';
      ctx.fillRect(0, 178, 480, 92);

      tree(ctx, 34, 178, 1.15, '#8a5a3b', '#4f9e55');
      tree(ctx, 450, 182, 1.3, '#8a5a3b', '#4f9e55');
      tree(ctx, 410, 174, 0.8, '#8a5a3b', '#5aa860');

      for (let i = 0; i < 20; i += 1) {
        const x = rand(i) * 480;
        const y = 190 + rand(i + 40) * 55;
        ctx.fillStyle = i % 3 === 0 ? '#fff7a8' : (i % 3 === 1 ? '#ffd1e1' : '#ffffff');
        ctx.globalAlpha = 0.7;
        ctx.fillRect(x, y, 2, 2);
      }
      ctx.globalAlpha = 1;

      // 꽃가루
      for (let i = 0; i < 9; i += 1) {
        const x = ((rand(i + 7) * 480) + t * (6 + i)) % 500 - 10;
        const y = 100 + rand(i + 60) * 90 + Math.sin(t + i) * 6;
        ctx.fillStyle = 'rgba(255,255,210,0.6)';
        ctx.beginPath();
        ctx.arc(x, y, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      vignette(ctx, 0.18);
    },

    ember(ctx, t) {
      sky(ctx, '#34182e', '#ff9a5c');
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#ffd9a0';
      ctx.beginPath();
      ctx.arc(98, 52, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 화산
      ctx.fillStyle = '#52283a';
      ctx.beginPath();
      ctx.moveTo(250, 178);
      ctx.lineTo(340, 54);
      ctx.lineTo(370, 76);
      ctx.lineTo(410, 44);
      ctx.lineTo(500, 178);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff6b3d';
      ctx.beginPath();
      ctx.moveTo(366, 76);
      ctx.lineTo(374, 62);
      ctx.lineTo(390, 58);
      ctx.lineTo(400, 78);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,140,60,0.35)';
      ctx.beginPath();
      ctx.moveTo(378, 72);
      ctx.lineTo(400, 170);
      ctx.lineTo(420, 170);
      ctx.closePath();
      ctx.fill();

      hill(ctx, 160, '#6a3038', 20, 24);
      hill(ctx, 174, '#4a2228', -20, 20);
      ctx.fillStyle = '#412024';
      ctx.fillRect(0, 184, 480, 86);

      // 바위
      ctx.fillStyle = '#2d171c';
      ctx.beginPath();
      ctx.ellipse(70, 200, 18, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(410, 210, 22, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // 불티
      for (let i = 0; i < 22; i += 1) {
        const x = (rand(i) * 480 + Math.sin(t * 0.8 + i) * 20) % 480;
        const y = 200 - ((t * (14 + i * 1.7) + rand(i + 9) * 200) % 200);
        const r = 1 + rand(i + 3) * 1.8;
        ctx.fillStyle = i % 3 === 0 ? 'rgba(255,220,120,0.9)' : 'rgba(255,110,50,0.8)';
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      vignette(ctx, 0.3);
    },

    stream(ctx, t) {
      sky(ctx, '#a9e9ff', '#eafbff');
      cloud(ctx, 110, 42, 0.9, 0.75);
      cloud(ctx, 330 + Math.sin(t * 0.1) * 6, 58, 0.65, 0.5);
      hill(ctx, 138, '#9bdb8c', 10, 24);
      hill(ctx, 156, '#71c56e', -40, 18);

      ctx.fillStyle = '#6fcf74';
      ctx.fillRect(0, 172, 480, 20);
      // 물
      const water = ctx.createLinearGradient(0, 178, 0, 270);
      water.addColorStop(0, '#6fd3f2');
      water.addColorStop(1, '#2d90c9');
      ctx.fillStyle = water;
      ctx.fillRect(0, 178, 480, 92);

      for (let i = 0; i < 14; i += 1) {
        const y = 186 + i * 6;
        const x = ((i * 73 + t * (12 + i)) % 560) - 40;
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.14 + (i % 3) * 0.06) + ')';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x + 18, y - 3, x + 38, y);
        ctx.stroke();
      }

      // 돌과 갈대
      ctx.fillStyle = '#7f8a9a';
      ctx.beginPath();
      ctx.ellipse(48, 190, 18, 9, -0.2, 0, Math.PI * 2);
      ctx.ellipse(420, 200, 24, 10, 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#4f7a3f';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i += 1) {
        const x = 455 + i * 5;
        ctx.beginPath();
        ctx.moveTo(x, 186);
        ctx.quadraticCurveTo(x - 4, 168, x + 2, 156 + i * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 8; i += 1) {
        const x = rand(i + 12) * 480;
        const y = 186 + rand(i + 30) * 60;
        ctx.fillStyle = 'rgba(220,250,255,0.55)';
        ctx.beginPath();
        ctx.arc(x, y + Math.sin(t * 2 + i) * 2, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
      vignette(ctx, 0.2);
    },

    forest(ctx, t) {
      sky(ctx, '#17382a', '#4d8752');
      // 빛줄기
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#eaffc0';
      for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(80 + i * 95, -10);
        ctx.lineTo(130 + i * 95, -10);
        ctx.lineTo(60 + i * 95, 230);
        ctx.lineTo(20 + i * 95, 230);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      hill(ctx, 152, '#2f5f3c', 0, 22);
      ctx.fillStyle = '#2c5738';
      ctx.fillRect(0, 176, 480, 94);

      // 큰 나무들
      for (let i = 0; i < 5; i += 1) {
        const x = 28 + i * 108;
        ctx.fillStyle = '#1e3d29';
        ctx.fillRect(x - 7, 60, 14, 150);
        ctx.fillStyle = 'rgba(100,170,100,0.25)';
        ctx.fillRect(x - 5, 60, 4, 150);
      }
      // 잎 그림자
      ctx.fillStyle = 'rgba(20,50,32,0.65)';
      for (let i = 0; i < 7; i += 1) {
        const x = 30 + i * 72;
        ctx.beginPath();
        ctx.ellipse(x, 34 + (i % 2) * 16, 46, 26, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // 반딧불
      for (let i = 0; i < 12; i += 1) {
        const x = (rand(i + 50) * 460 + Math.sin(t * 0.6 + i) * 18 + 10);
        const y = 110 + rand(i + 70) * 80 + Math.cos(t * 0.8 + i) * 8;
        ctx.fillStyle = 'rgba(210,255,150,' + (0.4 + Math.sin(t * 3 + i) * 0.25) + ')';
        ctx.beginPath();
        ctx.arc(x, y, 1.7, 0, Math.PI * 2);
        ctx.fill();
      }
      vignette(ctx, 0.4);
    },

    storm(ctx, t) {
      sky(ctx, '#181a34', '#51406e');
      // 번개
      const phase = (t % 5);
      if (phase > 2.4 && phase < 2.62) {
        ctx.fillStyle = 'rgba(220,225,255,0.28)';
        ctx.fillRect(0, 0, 480, 210);
        ctx.strokeStyle = '#f4f0ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(330, 0);
        ctx.lineTo(310, 46);
        ctx.lineTo(330, 48);
        ctx.lineTo(298, 104);
        ctx.lineTo(315, 106);
        ctx.lineTo(280, 170);
        ctx.stroke();
      }

      // 구름
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = '#242544';
      for (let i = 0; i < 6; i += 1) {
        ctx.beginPath();
        ctx.ellipse(60 + i * 90, 30 + (i % 3) * 14, 60, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      hill(ctx, 158, '#33304f', 10, 26);
      hill(ctx, 174, '#28263e', -30, 18);
      ctx.fillStyle = '#221f35';
      ctx.fillRect(0, 186, 480, 84);

      // 물웅덩이
      ctx.fillStyle = 'rgba(120,140,220,0.22)';
      ctx.beginPath();
      ctx.ellipse(90, 202, 26, 7, 0, 0, Math.PI * 2);
      ctx.ellipse(400, 208, 32, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // 비
      ctx.strokeStyle = 'rgba(180,200,255,0.28)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 44; i += 1) {
        const x = (rand(i) * 480 + t * 70) % 500 - 20;
        const y = (rand(i + 33) * 270 + t * 180) % 280 - 10;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 3, y + 9);
        ctx.stroke();
      }
      vignette(ctx, 0.42);
    },

    arena(ctx, t) {
      sky(ctx, '#342752', '#ffb27a');
      ctx.fillStyle = 'rgba(255,220,160,0.75)';
      ctx.beginPath();
      ctx.arc(240, 190, 70, Math.PI, 0);
      ctx.fill();

      // 관중석
      ctx.fillStyle = '#3e3046';
      ctx.beginPath();
      ctx.ellipse(240, 122, 240, 72, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#57415b';
      ctx.beginPath();
      ctx.ellipse(240, 130, 214, 58, 0, 0, Math.PI * 2);
      ctx.fill();

      // 관중
      for (let i = 0; i < 48; i += 1) {
        const angle = (i / 48) * Math.PI * 2;
        const x = 240 + Math.cos(angle) * (150 + rand(i) * 60);
        const y = 126 + Math.sin(angle) * (38 + rand(i + 2) * 16);
        if (y > 166) continue;
        ctx.fillStyle = ['#ffd166', '#ff8a7a', '#8ad6ff', '#c9a2ff'][i % 4];
        ctx.beginPath();
        ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
        ctx.fill();
      }

      // 깃발
      for (let i = 0; i < 6; i += 1) {
        const x = 60 + i * 72;
        ctx.strokeStyle = '#2a2233';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, 70);
        ctx.lineTo(x, 100);
        ctx.stroke();
        ctx.fillStyle = i % 2 === 0 ? '#ff7a45' : '#4aa8ff';
        ctx.beginPath();
        ctx.moveTo(x, 70);
        ctx.lineTo(x + 14, 75);
        ctx.lineTo(x, 82);
        ctx.closePath();
        ctx.fill();
      }

      // 바닥
      const floor = ctx.createLinearGradient(0, 178, 0, 270);
      floor.addColorStop(0, '#d69a66');
      floor.addColorStop(1, '#a56b48');
      ctx.fillStyle = floor;
      ctx.fillRect(0, 178, 480, 92);
      ctx.strokeStyle = 'rgba(90,50,30,0.35)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 7; i += 1) {
        ctx.beginPath();
        ctx.moveTo(0, 188 + i * 13);
        ctx.lineTo(480, 188 + i * 13);
        ctx.stroke();
      }
      for (let i = 0; i < 9; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * 60, 178);
        ctx.lineTo(i * 60 - 20, 270);
        ctx.stroke();
      }

      // 횃불
      for (const x of [22, 458]) {
        ctx.fillStyle = '#5a3a2a';
        ctx.fillRect(x - 2, 150, 4, 40);
        const glow = 6 + Math.sin(t * 8 + x) * 1.4;
        ctx.fillStyle = 'rgba(255,150,60,0.85)';
        ctx.beginPath();
        ctx.ellipse(x, 146, glow * 0.6, glow, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,230,150,0.9)';
        ctx.beginPath();
        ctx.ellipse(x, 148, glow * 0.3, glow * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      vignette(ctx, 0.3);
    }
  };

  function drawBattle(ctx, key, t) {
    (BG[key] || BG.meadow)(ctx, t);
  }

  function drawTitle(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, 270);
    g.addColorStop(0, '#0b0e1e');
    g.addColorStop(0.55, '#1c2240');
    g.addColorStop(1, '#3a2b45');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);

    // 별
    for (let i = 0; i < 70; i += 1) {
      const x = rand(i) * 480;
      const y = rand(i + 90) * 190;
      const a = 0.25 + (Math.sin(t * 1.5 + i) * 0.5 + 0.5) * 0.65;
      ctx.fillStyle = 'rgba(220,230,255,' + a.toFixed(3) + ')';
      const s = rand(i + 5) > 0.85 ? 2 : 1;
      ctx.fillRect(x, y, s, s);
    }
    // 달
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = '#f4eccf';
    ctx.beginPath();
    ctx.arc(396, 52, 26, 0, Math.PI * 2);
    ctx.fill();
    const glow = ctx.createRadialGradient(396, 52, 20, 396, 52, 46);
    glow.addColorStop(0, 'rgba(255,241,198,0.30)');
    glow.addColorStop(1, 'rgba(255,241,198,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(396, 52, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 언덕 실루엣
    ctx.fillStyle = '#161a2c';
    ctx.beginPath();
    ctx.moveTo(0, 270);
    ctx.lineTo(0, 214);
    ctx.quadraticCurveTo(90, 182, 190, 212);
    ctx.quadraticCurveTo(300, 244, 400, 200);
    ctx.quadraticCurveTo(450, 182, 480, 196);
    ctx.lineTo(480, 270);
    ctx.closePath();
    ctx.fill();

    // 몬스터 실루엣
    ctx.save();
    ctx.globalAlpha = 0.16;
    const sprites = window.Sprites;
    if (sprites) {
      sprites.drawMonster(ctx, 'sproutle', 82, 242, 92, { bob: Math.sin(t * 1.2) * 2 });
      sprites.drawMonster(ctx, 'emberpup', 238, 250, 96, { bob: Math.sin(t * 1.4 + 1) * 2, flip: true });
      sprites.drawMonster(ctx, 'aquabble', 400, 246, 88, { bob: Math.sin(t * 1.1 + 2) * 2 });
    }
    ctx.restore();

    // 안개
    const fog = ctx.createLinearGradient(0, 180, 0, 270);
    fog.addColorStop(0, 'rgba(20,24,42,0)');
    fog.addColorStop(1, 'rgba(12,14,26,0.85)');
    ctx.fillStyle = fog;
    ctx.fillRect(0, 170, 480, 100);
  }

  function drawMap(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, 270);
    g.addColorStop(0, '#f7e9c9');
    g.addColorStop(1, '#ecd6ab');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 480, 270);

    // 지형 얼룩
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#7fc27a';
    ctx.beginPath();
    ctx.ellipse(70, 130, 90, 60, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f09a6a';
    ctx.beginPath();
    ctx.ellipse(210, 90, 70, 50, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#74b9e8';
    ctx.beginPath();
    ctx.ellipse(300, 165, 80, 40, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8ccf86';
    ctx.beginPath();
    ctx.ellipse(410, 80, 60, 45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 격자
    ctx.strokeStyle = 'rgba(120,90,50,0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 480; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 32);
      ctx.lineTo(x, 204);
      ctx.stroke();
    }
    for (let y = 32; y <= 204; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(480, y);
      ctx.stroke();
    }

    // 모서리 장식
    ctx.strokeStyle = 'rgba(110,80,40,0.25)';
    ctx.lineWidth = 2;
    [[10, 36], [470, 36], [10, 200], [470, 200]].forEach(([x, y], i) => {
      ctx.beginPath();
      const sx = i % 2 === 0 ? 1 : -1;
      const sy = i < 2 ? 1 : -1;
      ctx.moveTo(x, y + 10 * sy);
      ctx.lineTo(x, y);
      ctx.lineTo(x + 10 * sx, y);
      ctx.stroke();
    });

    // 나침반
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.translate(444, 178);
    ctx.strokeStyle = '#7a5a32';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(3, 2);
    ctx.lineTo(0, 0);
    ctx.lineTo(-3, 2);
    ctx.closePath();
    ctx.fillStyle = '#a5442e';
    ctx.fill();
    ctx.fillStyle = '#7a5a32';
    ctx.font = '700 6px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('N', 0, -16);
    ctx.restore();
  }

  window.Backgrounds = { drawBattle, drawTitle, drawMap };
})();
