/* 순수 배틀 엔진: Phaser/DOM 의존 없이 계산만 담당 */
(function () {
  'use strict';

  const DATA = window.GameData;
  const LEVEL_CAP = 20;

  function typeMultiplier(moveType, defenderType) {
    const row = DATA.CHART[moveType];
    if (!row) return 1;
    const value = row[defenderType];
    return typeof value === 'number' ? value : 1;
  }

  function statAt(base, level) {
    return Math.floor(base * (1 + 0.06 * (level - 1)));
  }

  function hpAt(baseHp, level) {
    return Math.floor(baseHp * (1 + 0.09 * (level - 1))) + 8;
  }

  function createMonster(speciesId, level) {
    const species = DATA.SPECIES[speciesId];
    if (!species) throw new Error('Unknown species: ' + speciesId);
    const lv = Math.max(1, Math.min(LEVEL_CAP, Math.floor(level)));
    const stats = {
      hp: hpAt(species.base.hp, lv),
      atk: statAt(species.base.atk, lv),
      def: statAt(species.base.def, lv),
      spd: statAt(species.base.spd, lv)
    };
    return {
      speciesId,
      name: species.name,
      type: species.type,
      level: lv,
      maxHp: stats.hp,
      hp: stats.hp,
      stats,
      moves: species.moves.slice(0, 4)
    };
  }

  function effectivenessLabel(mult) {
    if (mult > 1.5) return '효과가 굉장했다!';
    if (mult < 1) return '효과가 별로인 듯하다...';
    return '';
  }

  function accuracyCheck(move, rng) {
    const roll = (rng || Math.random)() * 100;
    return roll < move.accuracy;
  }

  // 대미지 공식: 계획서 공식을 짧은 세션에 맞게 계수만 조정(50 → 15)
  function calcDamage(attacker, defender, move, rng) {
    const random = rng || Math.random;
    const eff = typeMultiplier(move.type, defender.type);
    const crit = random() < (1 / 16);
    const roll = 0.85 + random() * 0.15;
    const attack = attacker.stats.atk;
    const defense = Math.max(1, defender.stats.def);
    const base = (((2 * attacker.level / 5 + 2) * move.power * attack / defense) / 15) + 2;
    const damage = Math.max(1, Math.floor(base * eff * (crit ? 1.5 : 1) * roll));
    return { damage, effectiveness: eff, crit };
  }

  // AI가 기대값을 계산할 때 쓰는 난수 없는 평균 대미지
  function averageDamage(attacker, defender, move) {
    const eff = typeMultiplier(move.type, defender.type);
    const attack = attacker.stats.atk;
    const defense = Math.max(1, defender.stats.def);
    const base = (((2 * attacker.level / 5 + 2) * move.power * attack / defense) / 15) + 2;
    const critFactor = 1 + (1 / 16) * 0.5;
    return base * eff * critFactor * 0.925;
  }

  function chooseAiMove(attacker, defender, rng) {
    const random = rng || Math.random;
    const moves = attacker.moves.map((id) => DATA.MOVES[id]).filter(Boolean);
    if (!moves.length) return null;
    if (random() < 0.2) {
      return moves[Math.floor(random() * moves.length)];
    }
    let best = moves[0];
    let bestScore = -1;
    for (const move of moves) {
      const score = averageDamage(attacker, defender, move) * (move.accuracy / 100);
      if (score > bestScore) {
        bestScore = score;
        best = move;
      }
    }
    return best;
  }

  function turnOrder(a, b, rng) {
    if (a.stats.spd === b.stats.spd) return (rng || Math.random)() < 0.5 ? 'a' : 'b';
    return a.stats.spd > b.stats.spd ? 'a' : 'b';
  }

  function expToNext(level) {
    return 60 + level * 10;
  }

  function expGain(enemyLevel) {
    return enemyLevel * 14 + 40;
  }

  function gainExp(level, exp, amount) {
    let lv = level;
    let rest = exp + Math.max(0, Math.floor(amount));
    let gained = 0;
    while (lv < LEVEL_CAP && rest >= expToNext(lv)) {
      rest -= expToNext(lv);
      lv += 1;
      gained += 1;
    }
    if (lv >= LEVEL_CAP) {
      lv = LEVEL_CAP;
      rest = 0;
    }
    return { level: lv, exp: rest, gained };
  }

  function hpRatio(monster) {
    return Math.max(0, Math.min(1, monster.hp / monster.maxHp));
  }

  window.Engine = {
    LEVEL_CAP,
    typeMultiplier,
    effectivenessLabel,
    createMonster,
    accuracyCheck,
    calcDamage,
    averageDamage,
    chooseAiMove,
    turnOrder,
    expToNext,
    expGain,
    gainExp,
    hpRatio
  };
})();
