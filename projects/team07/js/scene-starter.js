/* 스타터 몬스터 선택 */
(function () {
  'use strict';

  const G = window.GameApp;
  const UI = window.UI;
  const Data = window.GameData;
  const S = window.Sprites;
  const Save = window.Save;
  const A = window.AudioSys;

  const SOUND = { x: 444, y: 8, w: 26, h: 26 };
  const STAT_DEFS = [
    { key: 'hp', label: 'HP', max: 80 },
    { key: 'atk', label: '공격', max: 85 },
    { key: 'def', label: '방어', max: 85 },
    { key: 'spd', label: '속도', max: 85 }
  ];

  G.scenes.Starter = function () {
    let selected = 0;

    function cardRect(i) {
      return { x: 18 + i * 149, y: 40, w: 140, h: 158 };
    }

    function confirmRect() {
      return { x: 160, y: 204, w: 160, h: 30 };
    }

    function start() {
      const id = Data.STARTERS[selected];
      Save.newGame(id);
      A.sfx('win');
      G.setScene(G.scenes.Map());
    }

    return {
      enter() {
        selected = 0;
      },

      update() {
        let hot = G.inRect(G.pointer.x, G.pointer.y, SOUND) || G.inRect(G.pointer.x, G.pointer.y, confirmRect());
        for (let i = 0; i < 3; i += 1) hot = hot || G.inRect(G.pointer.x, G.pointer.y, cardRect(i));
        G.setCursor(hot);
      },

      draw(ctx, t) {
        const bg = ctx.createLinearGradient(0, 0, 0, 270);
        bg.addColorStop(0, '#141a30');
        bg.addColorStop(1, '#252c4c');
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 480, 270);

        // 장식 원
        ctx.save();
        ctx.globalAlpha = 0.06;
        ctx.fillStyle = '#9fb4ff';
        ctx.beginPath();
        ctx.arc(240, 120, 130, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        UI.text(ctx, '파트너를 선택하세요', 240, 16, {
          size: 17,
          align: 'center',
          color: '#fff4d6',
          weight: 900,
          shadow: true
        });
        UI.text(ctx, '모든 파트너는 Lv.5에서 시작합니다  ·  타입 상성으로 승부하세요', 240, 32, {
          size: 8,
          align: 'center',
          color: '#9fa9c9'
        });

        Data.STARTERS.forEach((id, i) => {
          const sp = Data.SPECIES[id];
          const type = Data.TYPES[sp.type];
          const r = cardRect(i);
          const isSel = selected === i;
          const hover = G.inRect(G.pointer.x, G.pointer.y, r);

          UI.panel(ctx, r.x, r.y, r.w, r.h, {
            fill: isSel ? '#303b66' : (hover ? '#2a3254' : '#242b48'),
            stroke: isSel ? '#ffd166' : 'rgba(255,255,255,0.12)',
            lineWidth: isSel ? 2 : 1.2,
            radius: 9
          });

          // 상단 타입 스트립
          ctx.save();
          UI.roundRectPath(ctx, r.x, r.y, r.w, r.h, 9);
          ctx.clip();
          ctx.fillStyle = type.color;
          ctx.globalAlpha = isSel ? 0.95 : 0.7;
          ctx.fillRect(r.x, r.y, r.w, 4);
          ctx.restore();

          UI.typeBadge(ctx, sp.type, r.x + r.w - 38, r.y + 9, { scale: 1 });

          // 스프라이트
          S.drawMonster(ctx, id, r.x + r.w / 2, 88, 66, {
            bob: isSel ? Math.sin(t * 2.4 + i) * 2.2 : 0
          });
          if (isSel) {
            ctx.save();
            ctx.globalAlpha = 0.22;
            ctx.fillStyle = type.color;
            ctx.beginPath();
            ctx.ellipse(r.x + r.w / 2, 112, 28, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }

          UI.text(ctx, sp.name, r.x + r.w / 2, 126, {
            size: 12.5,
            align: 'center',
            color: '#ffffff',
            weight: 900
          });

          STAT_DEFS.forEach((stat, si) => {
            const value = sp.base[stat.key];
            const y = 138 + si * 12.5;
            UI.text(ctx, stat.label, r.x + 10, y + 2, { size: 6.5, color: 'rgba(220,228,255,0.65)' });
            UI.statBar(ctx, r.x + 37, y, 66, 4.5, value / stat.max, type.color);
            UI.text(ctx, String(value), r.x + r.w - 10, y + 2, {
              size: 6.5,
              align: 'right',
              color: 'rgba(255,255,255,0.8)'
            });
          });

          if (isSel) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,209,102,0.4)';
            ctx.lineWidth = 1;
            UI.roundRectPath(ctx, r.x - 3, r.y - 3, r.w + 6, r.h + 6, 11);
            ctx.stroke();
            ctx.restore();
          }
        });

        const sp = Data.SPECIES[Data.STARTERS[selected]];
        UI.text(ctx, sp.desc, 240, 246, {
          size: 8,
          align: 'center',
          color: 'rgba(230,236,255,0.75)'
        });

        UI.button(ctx, confirmRect(), '이 몬스터로 시작', {
          selected: true,
          hover: G.inRect(G.pointer.x, G.pointer.y, confirmRect()),
          size: 11
        });

        UI.text(ctx, '←→ 선택  ·  Enter 시작', 14, 260, {
          size: 7.5,
          color: 'rgba(220,228,255,0.5)'
        });

        G.drawSoundButton(ctx, SOUND);
      },

      pointerDown(x, y) {
        if (G.hitSoundButton(x, y, SOUND)) return;

        for (let i = 0; i < 3; i += 1) {
          if (G.inRect(x, y, cardRect(i))) {
            if (selected !== i) {
              selected = i;
              A.sfx('select');
            }
            return;
          }
        }
        if (G.inRect(x, y, confirmRect())) start();
      },

      keyDown(key) {
        if (key === 'ArrowLeft' || key === 'ArrowRight') {
          selected = (selected + (key === 'ArrowRight' ? 1 : 2)) % 3;
          A.sfx('select');
        } else if (key === 'Enter' || key === ' ') {
          start();
        } else if (key >= '1' && key <= '3') {
          selected = Number(key) - 1;
          A.sfx('select');
        }
      }
    };
  };
})();
