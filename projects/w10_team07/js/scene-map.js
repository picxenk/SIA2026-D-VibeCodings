/* 아레나 로드맵: 스테이지 선택 + 출전 몬스터 변경 */
(function () {
  'use strict';

  const G = window.GameApp;
  const UI = window.UI;
  const BG = window.Backgrounds;
  const Data = window.GameData;
  const S = window.Sprites;
  const Save = window.Save;
  const Engine = window.Engine;
  const A = window.AudioSys;

  const SOUND = { x: 408, y: 3, w: 26, h: 26 };
  const RESET = { x: 440, y: 3, w: 26, h: 26 };
  const NODES = [
    { x: 58, y: 170 },
    { x: 126, y: 132 },
    { x: 196, y: 164 },
    { x: 266, y: 120 },
    { x: 336, y: 154 },
    { x: 412, y: 108 }
  ];

  G.scenes.Map = function () {
    if (!Save.data) {
      G.setScene(G.scenes.Title());
      return { update() {}, draw() {}, pointerDown() {}, keyDown() {} };
    }

    let focus = Math.max(0, Math.min(5, Save.data.cleared));
    let toast = '';
    let toastT = 0;
    let resetOpen = false;
    let resetFocus = 0;

    function stageUnlocked(i) {
      return i < Save.data.cleared + 1;
    }

    function say(message) {
      toast = message;
      toastT = 2.2;
    }

    function rosterRect(i) {
      return { x: 216 + i * 42, y: 218, w: 38, h: 38 };
    }

    function modalButtons() {
      return [
        { id: 'cancel', label: '취소', r: { x: 134, y: 168, w: 96, h: 28 } },
        { id: 'reset', label: '초기화', r: { x: 250, y: 168, w: 96, h: 28 } }
      ];
    }

    function enterStage(i) {
      if (!stageUnlocked(i)) {
        A.sfx('error');
        say('아직 잠겨 있어요. 이전 스테이지를 클리어하세요.');
        return;
      }
      A.sfx('confirm');
      G.startStage(i);
    }

    function cycleActive() {
      const owned = Save.data.owned;
      const idx = owned.indexOf(Save.data.activeId);
      const next = owned[(idx + 1) % owned.length];
      Save.setActive(next);
      A.sfx('select');
    }

    return {
      enter() {
        focus = Math.max(0, Math.min(5, Save.data.cleared));
        toastT = 0;
        resetOpen = false;
      },

      update(dt) {
        if (toastT > 0) toastT = Math.max(0, toastT - dt);

        if (resetOpen) {
          const mb = modalButtons();
          G.setCursor(mb.some((b) => G.inRect(G.pointer.x, G.pointer.y, b.r)));
          return;
        }

        let hot = G.inRect(G.pointer.x, G.pointer.y, SOUND) || G.inRect(G.pointer.x, G.pointer.y, RESET);
        for (let i = 0; i < 6; i += 1) {
          if (G.inRect(G.pointer.x, G.pointer.y, { x: NODES[i].x - 20, y: NODES[i].y - 20, w: 40, h: 44 })) hot = true;
          if (Save.data.owned.length && G.inRect(G.pointer.x, G.pointer.y, rosterRect(i)) && i < 6) hot = true;
        }
        G.setCursor(hot);
      },

      draw(ctx, t) {
        BG.drawMap(ctx, t);

        // 경로
        ctx.save();
        ctx.strokeStyle = 'rgba(110,80,40,0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([7, 5]);
        ctx.lineDashOffset = -t * 12;
        ctx.beginPath();
        NODES.forEach((n, i) => {
          if (i === 0) ctx.moveTo(n.x, n.y);
          else ctx.lineTo(n.x, n.y);
        });
        ctx.stroke();
        ctx.restore();

        // 노드
        NODES.forEach((node, i) => {
          const stage = Data.STAGES[i];
          const enemy = Data.SPECIES[stage.enemy];
          const type = Data.TYPES[enemy.type];
          const cleared = i < Save.data.cleared;
          const unlocked = stageUnlocked(i);
          const isNext = i === Save.data.cleared;
          const isFocus = focus === i;
          const hover = G.inRect(G.pointer.x, G.pointer.y, { x: node.x - 20, y: node.y - 20, w: 40, h: 44 });

          // 다음 스테이지 펄스
          if (isNext) {
            ctx.save();
            ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.18;
            ctx.strokeStyle = type.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(node.x, node.y, 25 + Math.sin(t * 3) * 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          if (isFocus) {
            ctx.save();
            ctx.strokeStyle = 'rgba(50,38,24,0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.arc(node.x, node.y, 26, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }

          // 노드 원
          ctx.save();
          ctx.shadowColor = 'rgba(60,40,20,0.25)';
          ctx.shadowBlur = 5;
          ctx.shadowOffsetY = 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, 19, 0, Math.PI * 2);
          ctx.fillStyle = cleared ? '#fff3d2' : (unlocked ? '#ffffff' : '#cec5b0');
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.arc(node.x, node.y, 19, 0, Math.PI * 2);
          ctx.strokeStyle = unlocked ? type.color : '#9d947f';
          ctx.lineWidth = isFocus ? 3.5 : 2.5;
          ctx.stroke();

          if (unlocked) {
            S.drawMonster(ctx, stage.enemy, node.x, node.y + 1, 30, {
              bob: isNext ? Math.sin(t * 2.5) * 1.2 : 0,
              alpha: cleared ? 0.78 : 1
            });
          } else {
            UI.iconButton(ctx, { x: node.x - 10, y: node.y - 10, w: 20, h: 20 }, 'lock', {
              color: '#7f7663'
            });
          }

          // 번호 배지
          ctx.beginPath();
          ctx.arc(node.x + 13, node.y + 13, 7.5, 0, Math.PI * 2);
          ctx.fillStyle = cleared ? '#4f9e55' : (unlocked ? type.dark : '#8b8270');
          ctx.fill();
          UI.text(ctx, String(i + 1), node.x + 13, node.y + 13.5, {
            size: 7,
            align: 'center',
            color: '#ffffff',
            weight: 900
          });

          // 클리어 체크
          if (cleared) {
            ctx.beginPath();
            ctx.arc(node.x - 13, node.y - 13, 7, 0, Math.PI * 2);
            ctx.fillStyle = '#4f9e55';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(node.x - 16, node.y - 13);
            ctx.lineTo(node.x - 13.5, node.y - 10.5);
            ctx.lineTo(node.x - 9.5, node.y - 16);
            ctx.stroke();
          }

          // 스테이지 이름
          UI.text(ctx, stage.name, node.x, node.y + 30, {
            size: 7,
            align: 'center',
            color: unlocked ? '#4a3a24' : '#8d8471',
            weight: 800,
            shadow: true
          });

          if (isNext) {
            ctx.save();
            UI.roundRectPath(ctx, node.x - 16, node.y - 39, 32, 13, 6);
            ctx.fillStyle = '#ffd166';
            ctx.fill();
            ctx.restore();
            UI.text(ctx, '다음', node.x, node.y - 32.5, {
              size: 6.5,
              align: 'center',
              color: '#4a3410',
              weight: 900
            });
          }

          if (hover && !unlocked) {
            UI.text(ctx, '잠김', node.x, node.y + 40, { size: 6, align: 'center', color: '#8d8471' });
          }
        });

        // 헤더
        ctx.save();
        ctx.fillStyle = '#1b2337';
        ctx.fillRect(0, 0, 480, 32);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, 31, 480, 1);
        ctx.restore();

        UI.text(ctx, '아레나 로드', 14, 16, { size: 14, color: '#fff4d6', weight: 900 });
        UI.text(ctx, '진행 ' + Save.data.cleared + '/6', 128, 17, { size: 8, color: '#9fa9c9' });

        const active = Data.SPECIES[Save.data.activeId];
        UI.text(ctx, '출전 ' + active.name + ' Lv.' + Save.data.level, 292, 17, {
          size: 8,
          align: 'right',
          color: '#c6cfe8'
        });

        G.drawSoundButton(ctx, SOUND);
        UI.iconButton(ctx, RESET, 'reset', {
          hover: G.inRect(G.pointer.x, G.pointer.y, RESET)
        });

        // 포커스 스테이지 정보 패널
        const stage = Data.STAGES[focus];
        const enemy = Data.SPECIES[stage.enemy];
        UI.panel(ctx, 12, 38, 316, 36, {
          fill: 'rgba(32,27,24,0.78)',
          stroke: 'rgba(255,230,170,0.22)',
          radius: 7
        });
        UI.text(ctx, (focus + 1) + '. ' + stage.name, 22, 50, {
          size: 10.5,
          color: '#ffe6a8',
          weight: 900
        });
        UI.typeBadge(ctx, enemy.type, 132, 44, { scale: 0.9 });
        UI.text(ctx, enemy.name + '  Lv.' + stage.level + (stageUnlocked(focus) ? '' : '  (잠김)'), 166, 50, {
          size: 8,
          color: stageUnlocked(focus) ? '#e6ecff' : '#8f98b8'
        });
        UI.text(ctx, stage.tip, 22, 64, {
          size: 7,
          color: 'rgba(230,236,255,0.62)'
        });

        // 하단 패널
        ctx.save();
        ctx.fillStyle = '#1b2337';
        ctx.fillRect(0, 204, 480, 66);
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(0, 204, 480, 1);
        ctx.restore();

        // 출전 몬스터 카드
        UI.panel(ctx, 9, 211, 199, 53, {
          fill: 'rgba(255,255,255,0.05)',
          stroke: 'rgba(255,255,255,0.1)',
          radius: 8,
          shadow: false
        });
        S.drawMonster(ctx, Save.data.activeId, 39, 236, 50, { bob: Math.sin(t * 2.2) * 1.4 });
        const activeType = Data.TYPES[active.type];
        UI.text(ctx, active.name, 69, 221, { size: 11, color: '#ffffff', weight: 900 });
        UI.typeBadge(ctx, active.type, 69, 228, { scale: 0.9 });
        UI.text(ctx, 'Lv.' + Save.data.level, 103, 234, { size: 7.5, color: '#c6cfe8' });
        UI.text(ctx, 'EXP', 69, 243, { size: 6, color: 'rgba(200,210,235,0.6)' });
        const need = Engine.expToNext(Save.data.level);
        UI.statBar(ctx, 84, 240, 110, 4.5, Save.data.exp / need, activeType.color);
        UI.text(ctx, Save.data.exp + '/' + need, 196, 243, { size: 5.8, align: 'right', color: 'rgba(200,210,235,0.65)' });

        // 로스터
        Data.SPECIES_ORDER.forEach((id, i) => {
          if (i > 5) return;
          const r = rosterRect(i);
          const owned = Save.data.owned.indexOf(id) >= 0;
          const isActive = Save.data.activeId === id;
          const hover = G.inRect(G.pointer.x, G.pointer.y, r);
          UI.roundRectPath(ctx, r.x, r.y, r.w, r.h, 7);
          ctx.fillStyle = owned ? (hover ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.06)') : 'rgba(0,0,0,0.24)';
          ctx.fill();
          ctx.strokeStyle = isActive ? '#ffd166' : (owned ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)');
          ctx.lineWidth = isActive ? 2 : 1;
          ctx.stroke();

          if (owned) {
            S.drawMonster(ctx, id, r.x + r.w / 2, r.y + r.h / 2, 32, {
              alpha: isActive ? 1 : 0.62,
              bob: isActive ? Math.sin(t * 2.2 + i) * 1 : 0
            });
          } else {
            UI.text(ctx, '?', r.x + r.w / 2, r.y + r.h / 2 - 1, {
              size: 13,
              align: 'center',
              color: 'rgba(255,255,255,0.22)',
              weight: 900
            });
            UI.text(ctx, '잠김', r.x + r.w / 2, r.y + r.h - 6, {
              size: 5.5,
              align: 'center',
              color: 'rgba(255,255,255,0.3)'
            });
          }
        });

        const tip = Save.data.owned.length > 1
          ? 'M: 몬스터 변경  ·  ←→: 스테이지  ·  Enter: 입장'
          : 'M: 몬스터 변경  ·  ←→: 스테이지  ·  Enter: 입장';
        UI.text(ctx, tip, 466, 263, {
          size: 6.5,
          align: 'right',
          color: 'rgba(220,228,255,0.45)'
        });

        // 토스트
        if (toastT > 0) {
          const alpha = Math.min(1, toastT * 1.5);
          ctx.save();
          ctx.globalAlpha = alpha;
          const w = Math.min(360, toast.length * 8 + 28);
          UI.roundRectPath(ctx, 240 - w / 2, 180, w, 20, 10);
          ctx.fillStyle = 'rgba(16,18,30,0.92)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,209,102,0.35)';
          ctx.lineWidth = 1;
          ctx.stroke();
          UI.text(ctx, toast, 240, 190, { size: 8, align: 'center', color: '#ffe6a8' });
          ctx.restore();
        }

        if (resetOpen) {
          UI.dim(ctx, 0.62);
          UI.panel(ctx, 110, 84, 260, 120, { fill: '#222a46', stroke: 'rgba(255,255,255,0.2)' });
          UI.text(ctx, '기록을 초기화할까요?', 240, 108, { size: 14, align: 'center', color: '#ffe6a8' });
          UI.text(ctx, '모든 몬스터와 진행도가 사라집니다.', 240, 130, { size: 9, align: 'center', color: '#c9d0e8' });
          UI.text(ctx, '되돌릴 수 없어요.', 240, 144, { size: 8, align: 'center', color: '#8f98b8' });
          modalButtons().forEach((b, i) => {
            UI.button(ctx, b.r, b.label, {
              selected: resetFocus === i,
              hover: G.inRect(G.pointer.x, G.pointer.y, b.r),
              fill: b.id === 'reset' ? '#8a3f3f' : undefined,
              selectedFill: b.id === 'reset' ? '#a94d4d' : undefined,
              size: 10
            });
          });
        }
      },

      pointerDown(x, y) {
        if (resetOpen) {
          const mb = modalButtons();
          for (let i = 0; i < mb.length; i += 1) {
            if (G.inRect(x, y, mb[i].r)) {
              if (mb[i].id === 'reset') {
                Save.clear();
                A.sfx('confirm');
                G.setScene(G.scenes.Title());
              } else {
                resetOpen = false;
                A.sfx('select');
              }
              return;
            }
          }
          return;
        }

        if (G.hitSoundButton(x, y, SOUND)) return;
        if (G.inRect(x, y, RESET)) {
          resetOpen = true;
          resetFocus = 0;
          A.sfx('select');
          return;
        }

        for (let i = 0; i < 6; i += 1) {
          if (G.inRect(x, y, { x: NODES[i].x - 20, y: NODES[i].y - 20, w: 40, h: 44 })) {
            focus = i;
            enterStage(i);
            return;
          }
        }

        for (let i = 0; i < Data.SPECIES_ORDER.length; i += 1) {
          if (G.inRect(x, y, rosterRect(i))) {
            const id = Data.SPECIES_ORDER[i];
            if (Save.data.owned.indexOf(id) >= 0) {
              if (Save.setActive(id)) A.sfx('select');
            } else {
              A.sfx('error');
              say('스테이지를 클리어하면 해금됩니다.');
            }
            return;
          }
        }
      },

      keyDown(key) {
        if (resetOpen) {
          if (key === 'ArrowLeft' || key === 'ArrowRight') {
            resetFocus = resetFocus === 0 ? 1 : 0;
            A.sfx('select');
          } else if (key === 'Escape' || key === 'n' || key === 'N') {
            resetOpen = false;
            A.sfx('select');
          } else if (key === 'Enter' || key === ' ') {
            if (resetFocus === 1) {
              Save.clear();
              A.sfx('confirm');
              G.setScene(G.scenes.Title());
            } else {
              resetOpen = false;
              A.sfx('select');
            }
          }
          return;
        }

        if (key === 'ArrowLeft') {
          focus = (focus + 5) % 6;
          A.sfx('select');
        } else if (key === 'ArrowRight') {
          focus = (focus + 1) % 6;
          A.sfx('select');
        } else if (key === 'Enter' || key === ' ') {
          enterStage(focus);
        } else if (key === 'm' || key === 'M') {
          cycleActive();
        } else if (key === 'Escape') {
          A.sfx('select');
          G.setScene(G.scenes.Title());
        } else if (key >= '1' && key <= '6') {
          focus = Number(key) - 1;
          A.sfx('select');
        }
      }
    };
  };
})();
