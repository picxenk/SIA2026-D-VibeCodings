/* 타이틀 화면 */
(function () {
  'use strict';

  const G = window.GameApp;
  const UI = window.UI;
  const BG = window.Backgrounds;
  const Save = window.Save;
  const A = window.AudioSys;

  const SOUND = { x: 444, y: 8, w: 26, h: 26 };

  G.scenes.Title = function () {
    let focus = 0;
    let confirmNew = false;
    let confirmFocus = 0;

    function buttons() {
      return [
        { id: 'new', label: '새 게임', r: { x: 155, y: 154, w: 170, h: 32 }, disabled: false },
        { id: 'continue', label: '이어하기', r: { x: 155, y: 192, w: 170, h: 32 }, disabled: !Save.data }
      ];
    }

    function modalButtons() {
      return [
        { id: 'cancel', label: '취소', r: { x: 130, y: 166, w: 100, h: 28 } },
        { id: 'start', label: '새로 시작', r: { x: 250, y: 166, w: 100, h: 28 } }
      ];
    }

    function startNew() {
      if (Save.data) {
        confirmNew = true;
        confirmFocus = 0;
        A.sfx('select');
        return;
      }
      A.sfx('confirm');
      G.setScene(G.scenes.Starter());
    }

    function doContinue() {
      if (!Save.data) return;
      A.sfx('confirm');
      G.setScene(G.scenes.Map());
    }

    function activate(id) {
      if (id === 'new') startNew();
      else if (id === 'continue') doContinue();
    }

    return {
      enter() {
        focus = 0;
        confirmNew = false;
      },

      update() {
        if (confirmNew) {
          const mb = modalButtons();
          G.setCursor(G.inRect(G.pointer.x, G.pointer.y, SOUND) || mb.some((b) => G.inRect(G.pointer.x, G.pointer.y, b.r)));
        } else {
          const list = buttons().filter((b) => !b.disabled);
          G.setCursor(G.inRect(G.pointer.x, G.pointer.y, SOUND) || list.some((b) => G.inRect(G.pointer.x, G.pointer.y, b.r)));
        }
      },

      draw(ctx, t) {
        BG.drawTitle(ctx, t);

        // 버전 배지
        ctx.save();
        UI.roundRectPath(ctx, 12, 10, 58, 16, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        UI.text(ctx, 'v0.1 MVP', 41, 18.5, { size: 7.5, align: 'center', color: '#cfd6ee' });

        // 로고
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.lineJoin = 'round';

        ctx.font = '900 27px ' + UI.FONT;
        ctx.letterSpacing = '7px';
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#160f22';
        ctx.strokeText('MONSTER', 243, 64);
        const g1 = ctx.createLinearGradient(0, 46, 0, 82);
        g1.addColorStop(0, '#fff3c4');
        g1.addColorStop(0.55, '#ffd166');
        g1.addColorStop(1, '#ff9d5c');
        ctx.fillStyle = g1;
        ctx.fillText('MONSTER', 243, 64);

        ctx.font = '900 46px ' + UI.FONT;
        ctx.letterSpacing = '9px';
        ctx.lineWidth = 8;
        ctx.strokeStyle = '#160f22';
        ctx.strokeText('ARENA', 244, 103);
        const g2 = ctx.createLinearGradient(0, 76, 0, 126);
        g2.addColorStop(0, '#fff7dc');
        g2.addColorStop(0.4, '#ffd166');
        g2.addColorStop(1, '#ff7a45');
        ctx.fillStyle = g2;
        ctx.fillText('ARENA', 244, 103);
        ctx.restore();

        UI.text(ctx, '몬스터 배틀 아레나', 240, 132, {
          size: 11,
          align: 'center',
          color: '#dfe5ff',
          weight: 700,
          shadow: true
        });

        // 버튼
        const list = buttons();
        const hovering = (r) => G.inRect(G.pointer.x, G.pointer.y, r);
        list.forEach((b, i) => {
          UI.button(ctx, b.r, b.label, {
            selected: !b.disabled && focus === i,
            hover: !b.disabled && hovering(b.r),
            disabled: b.disabled,
            size: 12
          });
        });

        if (Save.data) {
          UI.text(ctx, '저장된 기록  ·  Lv.' + Save.data.level + '  ·  스테이지 ' + Save.data.cleared + '/6', 240, 232, {
            size: 8,
            align: 'center',
            color: '#aab3d0'
          });
        } else {
          UI.text(ctx, '몬스터를 고르고 아레나의 챔피언이 되어보세요', 240, 232, {
            size: 8,
            align: 'center',
            color: '#8f98b8'
          });
        }

        G.drawSoundButton(ctx, SOUND);

        UI.text(ctx, '←→ 선택  ·  Enter 확인  ·  클릭/터치 지원', 14, 258, {
          size: 7.5,
          color: 'rgba(220,228,255,0.55)'
        });
        UI.text(ctx, '오리지널 몬스터 팬게임  ·  합성 사운드', 466, 258, {
          size: 7.5,
          align: 'right',
          color: 'rgba(220,228,255,0.42)'
        });

        if (confirmNew) {
          UI.dim(ctx, 0.62);
          UI.panel(ctx, 105, 82, 270, 124, { fill: '#222a46', stroke: 'rgba(255,255,255,0.2)' });
          UI.text(ctx, '새로 시작할까요?', 240, 106, { size: 14, align: 'center', color: '#ffe6a8' });
          UI.text(ctx, '기존 저장 기록이 사라집니다.', 240, 128, { size: 9, align: 'center', color: '#c9d0e8' });
          UI.text(ctx, '이어하기를 원한다면 취소를 눌러주세요.', 240, 142, { size: 8, align: 'center', color: '#8f98b8' });
          modalButtons().forEach((b, i) => {
            UI.button(ctx, b.r, b.label, {
              selected: confirmFocus === i,
              hover: G.inRect(G.pointer.x, G.pointer.y, b.r),
              fill: b.id === 'start' ? '#8a3f3f' : undefined,
              selectedFill: b.id === 'start' ? '#a94d4d' : undefined,
              size: 10
            });
          });
        }
      },

      pointerDown(x, y) {
        if (G.hitSoundButton(x, y, SOUND)) return;

        if (confirmNew) {
          const mb = modalButtons();
          for (let i = 0; i < mb.length; i += 1) {
            if (G.inRect(x, y, mb[i].r)) {
              if (mb[i].id === 'start') {
                Save.clear();
                confirmNew = false;
                A.sfx('confirm');
                G.setScene(G.scenes.Starter());
              } else {
                confirmNew = false;
                A.sfx('select');
              }
              return;
            }
          }
          return;
        }

        const list = buttons();
        for (let i = 0; i < list.length; i += 1) {
          if (G.inRect(x, y, list[i].r)) {
            focus = i;
            activate(list[i].id);
            return;
          }
        }
      },

      keyDown(key) {
        if (confirmNew) {
          if (key === 'ArrowLeft' || key === 'ArrowRight') {
            confirmFocus = confirmFocus === 0 ? 1 : 0;
            A.sfx('select');
          } else if (key === 'Escape' || key === 'n' || key === 'N') {
            confirmNew = false;
            A.sfx('select');
          } else if (key === 'Enter' || key === ' ') {
            if (confirmFocus === 1) {
              Save.clear();
              confirmNew = false;
              A.sfx('confirm');
              G.setScene(G.scenes.Starter());
            } else {
              confirmNew = false;
              A.sfx('select');
            }
          }
          return;
        }

        if (key === 'ArrowUp' || key === 'ArrowDown') {
          focus = focus === 0 ? 1 : 0;
          if (focus === 1 && !Save.data) focus = 0;
          A.sfx('select');
          return;
        }

        const list = buttons();
        if (key === 'Enter' || key === ' ') {
          activate(list[focus].id);
          return;
        }
        if (key === '1') startNew();
        if (key === '2') doContinue();
      }
    };
  };
})();
