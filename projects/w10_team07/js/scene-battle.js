/* 배틀 화면: 턴 처리, 연출, 결과 */
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

  const SOUND = { x: 444, y: 8, w: 26, h: 26 };
  const MOVE_Y = 218;
  const MOVE_H = 44;

  function moveRect(i) {
    return { x: 12 + i * 115, y: MOVE_Y, w: 109, h: MOVE_H };
  }

  G.scenes.Battle = function (stageIndex) {
    const stage = Data.STAGES[stageIndex];
    if (!Save.data || !stage) {
      G.setScene(G.scenes.Title());
      return { update() {}, draw() {}, pointerDown() {}, keyDown() {} };
    }

    const save = Save.data;
    const player = Engine.createMonster(save.activeId, save.level);
    const enemy = Engine.createMonster(stage.enemy, stage.level);

    let phase = 'intro';
    let selected = 0;
    let msg = '야생의 ' + enemy.name + ' 등장!';
    let introT = 0;
    let turn = 1;
    let token = 1;
    let result = null;
    let resultFocus = 0;
    let resultAlpha = 0;
    const dHp = { p: player.hp, e: enemy.hp };
    const fx = { shake: 0, pLunge: 0, eLunge: 0, pFlash: 0, eFlash: 0, screen: 0 };
    const fainting = { p: 0, e: 0 };
    const popups = [];
    let confetti = [];

    function makeConfetti() {
      confetti = [];
      for (let i = 0; i < 46; i += 1) {
        confetti.push({
          x: Math.random() * 480,
          y: -20 - Math.random() * 260,
          vy: 40 + Math.random() * 70,
          vx: (Math.random() - 0.5) * 22,
          size: 2 + Math.random() * 4,
          rot: Math.random() * 6,
          vr: (Math.random() - 0.5) * 6,
          color: ['#ffd166', '#ff7a45', '#4aa8ff', '#5cc96a', '#ffffff'][i % 5]
        });
      }
    }

    function say(text) {
      msg = text;
    }

    function effectTag(move) {
      const eff = Engine.typeMultiplier(move.type, enemy.type);
      if (eff > 1.5) return { text: '2×', color: '#ffd166' };
      if (eff < 1) return { text: '½×', color: '#9aa3bd' };
      return null;
    }

    async function perform(attacker, defender, move, side, tok) {
      const defSide = side === 'p' ? 'e' : 'p';
      say(attacker.name + '의 ' + move.name + '!');
      await G.sleep(520);
      if (tok !== token) return true;

      fx[side + 'Lunge'] = 1;
      await G.sleep(110);
      if (tok !== token) return true;

      if (!Engine.accuracyCheck(move)) {
        A.sfx('miss');
        say('빗나갔다!');
        popups.push({
          x: defSide === 'p' ? 118 : 356,
          y: defSide === 'p' ? 124 : 76,
          text: 'MISS',
          color: '#c6cfe8',
          life: 0.9,
          t: 0,
          big: false
        });
        await G.sleep(650);
        return false;
      }

      const dmg = Engine.calcDamage(attacker, defender, move);
      defender.hp = Math.max(0, defender.hp - dmg.damage);
      fx[defSide + 'Flash'] = 1;
      fx.shake = (dmg.crit || dmg.effectiveness > 1.5) ? 0.95 : 0.45;
      if (dmg.effectiveness > 1.5) fx.screen = 0.8;

      if (dmg.crit) A.sfx('crit');
      else if (dmg.effectiveness > 1.5) A.sfx('effective');
      else A.sfx('hit');

      popups.push({
        x: defSide === 'p' ? 118 : 356,
        y: defSide === 'p' ? 122 : 74,
        text: '-' + dmg.damage,
        color: dmg.crit ? '#ffd166' : (dmg.effectiveness > 1.5 ? '#ff9f6e' : '#ff8080'),
        life: 0.95,
        t: 0,
        big: dmg.crit || dmg.effectiveness > 1.5
      });

      await G.sleep(430);
      if (tok !== token) return true;

      if (dmg.crit) say('급소에 맞았다!');
      else if (dmg.effectiveness > 1.5) say('효과가 굉장했다!');
      else if (dmg.effectiveness < 1) say('효과가 별로인 듯하다...');
      else say('');

      if (msg) await G.sleep(500);
      if (tok !== token) return true;

      if (defender.hp <= 0) {
        A.sfx('faint');
        say(defender.name + ' 쓰러졌다!');
        fainting[defSide] = 0.01;
        await G.sleep(750);
        return true;
      }
      return false;
    }

    async function takeTurn(moveIndex) {
      if (phase !== 'select') return;
      phase = 'busy';
      const pMove = Data.MOVES[player.moves[moveIndex]];
      const eMove = Engine.chooseAiMove(enemy, player);
      if (!pMove || !eMove) {
        phase = 'select';
        return;
      }
      A.sfx('confirm');

      const first = Engine.turnOrder(player, enemy) === 'a' ? 'p' : 'e';
      const actions = first === 'p'
        ? [{ atk: player, def: enemy, move: pMove, side: 'p' }, { atk: enemy, def: player, move: eMove, side: 'e' }]
        : [{ atk: enemy, def: player, move: eMove, side: 'e' }, { atk: player, def: enemy, move: pMove, side: 'p' }];

      const tok = token;
      for (let i = 0; i < actions.length; i += 1) {
        if (player.hp <= 0 || enemy.hp <= 0) break;
        const action = actions[i];
        const finished = await perform(action.atk, action.def, action.move, action.side, tok);
        if (tok !== token) return;
        if (finished) break;
      }

      if (player.hp <= 0 || enemy.hp <= 0) {
        await finishBattle(tok);
        return;
      }
      turn += 1;
      phase = 'select';
      say('무엇을 할까?');
    }

    async function finishBattle(tok) {
      await G.sleep(650);
      if (tok !== token) return;
      const win = enemy.hp <= 0;
      const firstClear = save.cleared < stageIndex + 1;
      const before = save.level;
      let expGain = 0;
      let gained = 0;
      let unlocked = null;

      if (win) {
        expGain = firstClear ? Engine.expGain(stage.level) : Math.floor(Engine.expGain(stage.level) * 0.3);
        const grown = Engine.gainExp(save.level, save.exp, expGain);
        save.level = grown.level;
        save.exp = grown.exp;
        gained = grown.gained;
        if (firstClear) {
          save.cleared = Math.max(save.cleared, stageIndex + 1);
          if (stage.unlock && save.owned.indexOf(stage.unlock) < 0) {
            save.owned.push(stage.unlock);
            unlocked = stage.unlock;
          }
        }
        Save.write();
      }

      const counter = { fire: 'water', water: 'grass', grass: 'fire' }[enemy.type] || null;
      let hint = counter
        ? enemy.name + '에게는 ' + UI.typeName(counter) + ' 타입 기술이 효과적!'
        : '상성보다 화력과 속도로 밀어붙이자!';
      if (counter) {
        const ownedCounter = save.owned.find((id) => Data.SPECIES[id].type === counter);
        if (ownedCounter) hint += ' (' + Data.SPECIES[ownedCounter].name + ' 출전 추천)';
      }

      result = {
        win,
        expGain,
        firstClear,
        before,
        after: save.level,
        gained,
        unlocked,
        champion: win && stageIndex === Data.STAGES.length - 1,
        turns: turn,
        hint
      };
      if (result.champion) makeConfetti();
      phase = 'result';
      resultFocus = 0;
      resultAlpha = 0;
      A.sfx(win ? 'win' : 'lose');
      if (gained > 0) setTimeout(() => A.sfx('levelup'), 420);
      if (unlocked) setTimeout(() => A.sfx('unlock'), 800);
    }

    function resultButtons() {
      if (!result) return [];
      if (result.champion) {
        return [{ id: 'map', label: '로드맵으로', r: { x: 150, y: 208, w: 180, h: 28 } }];
      }
      if (result.win) {
        return [
          { id: 'next', label: '다음 스테이지', r: { x: 84, y: 204, w: 148, h: 28 } },
          { id: 'map', label: '로드맵', r: { x: 248, y: 204, w: 148, h: 28 } }
        ];
      }
      return [
        { id: 'retry', label: '재도전', r: { x: 84, y: 204, w: 148, h: 28 } },
        { id: 'map', label: '로드맵', r: { x: 248, y: 204, w: 148, h: 28 } }
      ];
    }

    function activateResult(id) {
      if (id === 'next') {
        A.sfx('confirm');
        G.startStage(stageIndex + 1);
      } else if (id === 'retry') {
        A.sfx('confirm');
        G.startStage(stageIndex);
      } else {
        A.sfx('select');
        G.setScene(G.scenes.Map());
      }
    }

    return {
      enter() {
        token += 1;
        phase = 'intro';
        introT = 0;
        msg = '야생의 ' + enemy.name + ' 등장!';
        A.sfx('encounter');
        const tok = token;
        setTimeout(() => {
          if (tok !== token) return;
          phase = 'select';
          msg = '무엇을 할까?';
        }, 1050);
      },

      update(dt, t) {
        introT = Math.min(1, introT + dt * 2.6);
        if (phase === 'result') resultAlpha = Math.min(1, resultAlpha + dt * 4);

        fx.shake = Math.max(0, fx.shake - dt * 2.4);
        fx.pLunge = Math.max(0, fx.pLunge - dt * 3.4);
        fx.eLunge = Math.max(0, fx.eLunge - dt * 3.4);
        fx.pFlash = Math.max(0, fx.pFlash - dt * 2.8);
        fx.eFlash = Math.max(0, fx.eFlash - dt * 2.8);
        fx.screen = Math.max(0, fx.screen - dt * 4.2);

        if (fainting.p > 0) fainting.p = Math.min(1, fainting.p + dt * 2.2);
        if (fainting.e > 0) fainting.e = Math.min(1, fainting.e + dt * 2.2);

        dHp.p += (player.hp - dHp.p) * Math.min(1, dt * 7);
        dHp.e += (enemy.hp - dHp.e) * Math.min(1, dt * 7);

        for (let i = popups.length - 1; i >= 0; i -= 1) {
          popups[i].t += dt;
          if (popups[i].t >= popups[i].life) popups.splice(i, 1);
        }

        if (result && result.champion) {
          for (const c of confetti) {
            c.y += c.vy * dt;
            c.x += c.vx * dt;
            c.rot += c.vr * dt;
            if (c.y > 280) {
              c.y = -10;
              c.x = Math.random() * 480;
            }
          }
        }

        if (phase === 'result') {
          const btns = resultButtons();
          G.setCursor(btns.some((b) => G.inRect(G.pointer.x, G.pointer.y, b.r)));
          return;
        }

        let hot = G.inRect(G.pointer.x, G.pointer.y, SOUND);
        if (phase === 'select') {
          for (let i = 0; i < 4; i += 1) {
            if (G.inRect(G.pointer.x, G.pointer.y, moveRect(i))) hot = true;
          }
        }
        G.setCursor(hot);
      },

      draw(ctx, t) {
        BG.drawBattle(ctx, stage.bg, t);

        const introOffset = (1 - UI.easeOutCubic(introT)) * 110;
        const shakeX = (Math.random() - 0.5) * fx.shake * 8;
        const shakeY = (Math.random() - 0.5) * fx.shake * 5;
        const pLunge = Math.sin((1 - fx.pLunge) * Math.PI) * 14;
        const eLunge = -Math.sin((1 - fx.eLunge) * Math.PI) * 14;

        // 그림자 & 플랫폼
        S.drawShadow(ctx, 356, 138, 34, 8, 0.3);
        S.drawShadow(ctx, 120, 200, 38, 9, 0.3);

        // 적
        const enemyAlpha = (fx.eFlash > 0.5 ? 0.45 : 1) * (1 - fainting.e);
        S.drawMonster(ctx, stage.enemy, 356 + introOffset + eLunge + shakeX, 94 + shakeY + fainting.e * 26, 88, {
          flip: true,
          bob: Math.sin(t * 2.1) * 2.5,
          alpha: enemyAlpha
        });

        // 아군
        const playerAlpha = (fx.pFlash > 0.5 ? 0.45 : 1) * (1 - fainting.p);
        S.drawMonster(ctx, save.activeId, 120 - introOffset + pLunge + shakeX, 152 + shakeY + fainting.p * 26, 100, {
          bob: Math.sin(t * 2 + 1) * 2.5,
          alpha: playerAlpha
        });

        // 데미지 팝업
        for (const p of popups) {
          const k = p.t / p.life;
          ctx.save();
          ctx.globalAlpha = 1 - k;
          UI.text(ctx, p.text, p.x, p.y - k * 24, {
            size: p.big ? 17 : 13,
            align: 'center',
            color: p.color,
            weight: 900,
            outline: 'rgba(20,12,20,0.9)',
            outlineWidth: 3
          });
          if (p.big && p.text !== 'MISS') {
            UI.text(ctx, '!', p.x + 16, p.y - 8 - k * 24, {
              size: 11,
              align: 'center',
              color: p.color,
              weight: 900,
              outline: 'rgba(20,12,20,0.9)',
              outlineWidth: 3
            });
          }
          ctx.restore();
        }

        // 효과 플래시
        if (fx.screen > 0.01) {
          ctx.save();
          ctx.globalAlpha = fx.screen * 0.22;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 480, 204);
          ctx.restore();
        }

        // HUD
        this.drawHud(ctx, t);

        // 커맨드 패널
        ctx.save();
        ctx.fillStyle = '#151827';
        ctx.fillRect(0, 204, 480, 66);
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        ctx.fillRect(0, 204, 480, 1);
        ctx.restore();

        if (phase === 'select') {
          UI.text(ctx, '무엇을 할까?', 14, 212, { size: 7.5, color: '#ffd166', weight: 800 });
          const hovering = (r) => G.inRect(G.pointer.x, G.pointer.y, r);
          player.moves.forEach((moveId, i) => {
            const move = Data.MOVES[moveId];
            const r = moveRect(i);
            const isSel = selected === i;
            const isHover = hovering(r);
            const type = Data.TYPES[move.type];
            const tag = effectTag(move);

            ctx.save();
            UI.roundRectPath(ctx, r.x, r.y, r.w, r.h, 7);
            ctx.fillStyle = isSel ? '#39446f' : (isHover ? '#2c3456' : 'rgba(255,255,255,0.05)');
            ctx.fill();
            ctx.strokeStyle = isSel ? '#ffd166' : 'rgba(255,255,255,0.14)';
            ctx.lineWidth = isSel ? 2 : 1;
            ctx.stroke();
            ctx.save();
            UI.roundRectPath(ctx, r.x, r.y, r.w, r.h, 7);
            ctx.clip();
            ctx.fillStyle = type.color;
            ctx.fillRect(r.x, r.y, 3.5, r.h);
            ctx.restore();
            ctx.restore();

            UI.text(ctx, move.name, r.x + 11, r.y + 15, {
              size: 9.5,
              color: '#ffffff',
              weight: 900
            });
            UI.text(ctx, '위력 ' + move.power + ' · 명중 ' + move.accuracy, r.x + 11, r.y + 30, {
              size: 6.2,
              color: 'rgba(215,224,255,0.58)'
            });
            UI.typeBadge(ctx, move.type, r.x + r.w - 35, r.y + 7, { scale: 0.9 });
            if (tag) {
              UI.text(ctx, tag.text, r.x + r.w - 8, r.y + 31, {
                size: 7.5,
                align: 'right',
                color: tag.color,
                weight: 900
              });
            }
          });
          UI.text(ctx, '1~4 또는 클릭', 466, 210, {
            size: 6,
            align: 'right',
            color: 'rgba(220,228,255,0.35)'
          });
        } else {
          UI.panel(ctx, 12, 212, 456, 46, {
            fill: 'rgba(255,255,255,0.045)',
            stroke: 'rgba(255,255,255,0.1)',
            radius: 8,
            shadow: false
          });
          UI.text(ctx, msg, 240, 235, {
            size: 11,
            align: 'center',
            color: '#f1f4ff',
            weight: 800
          });
        }

        G.drawSoundButton(ctx, SOUND);

        if (result) this.drawResult(ctx, t);
      },

      drawHud(ctx, t) {
        // 적 정보
        UI.panel(ctx, 14, 12, 214, 48, {
          fill: 'rgba(18,22,38,0.9)',
          stroke: 'rgba(255,255,255,0.14)',
          radius: 8,
          shadow: false
        });
        UI.text(ctx, enemy.name, 26, 26, { size: 11, color: '#ffffff', weight: 900 });
        UI.typeBadge(ctx, enemy.type, 152, 20, { scale: 0.9 });
        UI.text(ctx, 'Lv.' + enemy.level, 218, 26, { size: 7.5, align: 'right', color: '#c6cfe8' });
        UI.hpBar(ctx, 26, 40, 190, 6, Engine.hpRatio({ hp: dHp.e, maxHp: enemy.maxHp }));
        UI.text(ctx, 'HP', 26, 51, { size: 5.5, color: 'rgba(200,210,235,0.55)' });

        // 아군 정보
        UI.panel(ctx, 244, 140, 222, 58, {
          fill: 'rgba(18,22,38,0.9)',
          stroke: 'rgba(255,255,255,0.14)',
          radius: 8,
          shadow: false
        });
        UI.text(ctx, player.name, 256, 152, { size: 11, color: '#ffffff', weight: 900 });
        UI.typeBadge(ctx, player.type, 400, 146, { scale: 0.9 });
        UI.text(ctx, 'Lv.' + player.level, 456, 152, { size: 7.5, align: 'right', color: '#c6cfe8' });
        UI.hpBar(ctx, 256, 163, 198, 6.5, Engine.hpRatio({ hp: dHp.p, maxHp: player.maxHp }));
        UI.text(ctx, Math.ceil(dHp.p) + '/' + player.maxHp, 454, 174, {
          size: 6.5,
          align: 'right',
          color: '#dfe5ff'
        });
        const need = Engine.expToNext(save.level);
        UI.statBar(ctx, 256, 184, 140, 3.5, save.exp / need, '#7f9cff');
        UI.text(ctx, 'EXP ' + save.exp + '/' + need, 454, 186, {
          size: 5.8,
          align: 'right',
          color: 'rgba(200,210,235,0.55)'
        });
      },

      drawResult(ctx, t) {
        ctx.save();
        ctx.globalAlpha = resultAlpha;
        UI.dim(ctx, 0.66);

        if (result.champion) {
          for (const c of confetti) {
            ctx.save();
            ctx.translate(c.x, c.y);
            ctx.rotate(c.rot);
            ctx.fillStyle = c.color;
            ctx.globalAlpha = 0.8 * resultAlpha;
            ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size * 0.7);
            ctx.restore();
          }
        }

        UI.panel(ctx, 60, 34, 360, 206, {
          fill: '#1e2540',
          stroke: 'rgba(255,255,255,0.18)',
          radius: 12
        });

        if (result.champion) {
          UI.text(ctx, '챔피언 등극!', 240, 56, {
            size: 24,
            align: 'center',
            color: '#ffd166',
            weight: 900,
            outline: '#4a2f0d',
            outlineWidth: 4
          });
          UI.text(ctx, '아레나의 마지막 관문을 통과했습니다!', 240, 82, {
            size: 9.5,
            align: 'center',
            color: '#e6ecff'
          });
          S.drawMonster(ctx, save.activeId, 240, 140, 82, {
            bob: Math.sin(t * 2.4) * 3
          });
          UI.text(ctx, '최종 Lv.' + save.level + '  ·  클리어 6/6', 240, 182, {
            size: 9,
            align: 'center',
            color: '#c6cfe8'
          });
          UI.text(ctx, '몬스터 배틀 아레나 v0.1 MVP  ·  플레이해 주셔서 감사합니다!', 240, 196, {
            size: 7,
            align: 'center',
            color: 'rgba(200,210,235,0.65)'
          });
        } else if (result.win) {
          UI.text(ctx, '승리!', 240, 58, {
            size: 24,
            align: 'center',
            color: '#ffd166',
            weight: 900,
            outline: '#4a2f0d',
            outlineWidth: 4
          });
          UI.text(ctx, stage.name + ' 클리어!', 240, 80, {
            size: 8.5,
            align: 'center',
            color: '#aab3d0'
          });
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(100, 92);
          ctx.lineTo(380, 92);
          ctx.stroke();
          UI.text(ctx, '획득 EXP  +' + result.expGain + (result.firstClear ? '' : '  (훈련)'), 240, 108, {
            size: 10.5,
            align: 'center',
            color: '#e6ecff'
          });
          UI.text(ctx, result.gained > 0 ? 'Lv.' + result.before + ' → Lv.' + result.after + '  레벨 업!' : 'Lv.' + result.after, 240, 126, {
            size: 10,
            align: 'center',
            color: result.gained > 0 ? '#8fe38f' : '#aab3d0'
          });
          UI.text(ctx, '남은 HP ' + player.hp + '/' + player.maxHp + '  ·  ' + result.turns + '턴', 240, 146, {
            size: 8,
            align: 'center',
            color: '#8f98b8'
          });
          if (result.unlocked) {
            const sp = Data.SPECIES[result.unlocked];
            UI.text(ctx, '새 몬스터 해금!', 160, 168, {
              size: 9,
              align: 'right',
              color: '#ffe6a8'
            });
            S.drawMonster(ctx, result.unlocked, 206, 168, 34, { bob: Math.sin(t * 3) * 2 });
            UI.text(ctx, sp.name, 226, 168, {
              size: 9,
              color: '#ffffff',
              weight: 900
            });
          } else if (result.firstClear) {
            UI.text(ctx, '다음 스테이지가 열렸습니다.', 240, 170, {
              size: 8,
              align: 'center',
              color: 'rgba(200,210,235,0.7)'
            });
          } else {
            UI.text(ctx, '연습 배틀 완료! EXP를 조금 얻었습니다.', 240, 170, {
              size: 8,
              align: 'center',
              color: 'rgba(200,210,235,0.7)'
            });
          }
        } else {
          UI.text(ctx, '패배...', 240, 58, {
            size: 24,
            align: 'center',
            color: '#ff8f8f',
            weight: 900,
            outline: '#421418',
            outlineWidth: 4
          });
          UI.text(ctx, '눈앞이 깜깜해졌다...', 240, 88, {
            size: 9.5,
            align: 'center',
            color: '#c6cfe8'
          });
          ctx.strokeStyle = 'rgba(255,255,255,0.1)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(100, 102);
          ctx.lineTo(380, 102);
          ctx.stroke();
          UI.text(ctx, '힌트', 240, 116, { size: 7, align: 'center', color: '#ffd166' });
          UI.text(ctx, result.hint, 240, 130, {
            size: 8,
            align: 'center',
            color: '#e6ecff'
          });
          UI.text(ctx, '출전 몬스터를 바꾸거나 연습 배틀로 레벨을 올려보세요.', 240, 152, {
            size: 7.5,
            align: 'center',
            color: 'rgba(200,210,235,0.68)'
          });
          UI.text(ctx, '패배해도 저장 기록은 유지됩니다.', 240, 168, {
            size: 7,
            align: 'center',
            color: 'rgba(200,210,235,0.45)'
          });
        }

        const btns = resultButtons();
        btns.forEach((b, i) => {
          UI.button(ctx, b.r, b.label, {
            selected: resultFocus === i,
            hover: G.inRect(G.pointer.x, G.pointer.y, b.r),
            size: 10
          });
        });
        ctx.restore();
      },

      pointerDown(x, y) {
        if (G.hitSoundButton(x, y, SOUND)) return;

        if (phase === 'result') {
          const btns = resultButtons();
          for (let i = 0; i < btns.length; i += 1) {
            if (G.inRect(x, y, btns[i].r)) {
              resultFocus = i;
              activateResult(btns[i].id);
              return;
            }
          }
          return;
        }

        if (phase !== 'select') return;
        for (let i = 0; i < 4; i += 1) {
          if (G.inRect(x, y, moveRect(i))) {
            selected = i;
            takeTurn(i);
            return;
          }
        }
      },

      keyDown(key) {
        if (phase === 'result') {
          const btns = resultButtons();
          if (key === 'ArrowLeft' || key === 'ArrowRight') {
            resultFocus = (resultFocus + (key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length;
            A.sfx('select');
          } else if (key === 'Enter' || key === ' ') {
            activateResult(btns[resultFocus].id);
          }
          return;
        }
        if (phase !== 'select') return;

        if (key === 'ArrowLeft' || key === 'ArrowUp') {
          selected = (selected + 3) % 4;
          A.sfx('select');
        } else if (key === 'ArrowRight' || key === 'ArrowDown') {
          selected = (selected + 1) % 4;
          A.sfx('select');
        } else if (key === 'Enter' || key === ' ') {
          takeTurn(selected);
        } else if (key >= '1' && key <= '4') {
          selected = Number(key) - 1;
          takeTurn(selected);
        }
      }
    };
  };
})();
