/* 게임 데이터: 타입, 기술, 몬스터, 스테이지 */
(function () {
  'use strict';

  const TYPES = {
    fire:   { name: '불',   color: '#ff7a45', dark: '#8a2f12', text: '#3d1505' },
    water:  { name: '물',   color: '#4aa8ff', dark: '#1b4f86', text: '#062039' },
    grass:  { name: '풀',   color: '#5cc96a', dark: '#1e5b2a', text: '#0b2412' },
    normal: { name: '노말', color: '#b5b9cc', dark: '#4c5168', text: '#171a26' }
  };

  // 공격 타입 → 방어 타입 배율
  const CHART = {
    fire:   { fire: 0.5, water: 0.5, grass: 2.0, normal: 1.0 },
    water:  { fire: 2.0, water: 0.5, grass: 0.5, normal: 1.0 },
    grass:  { fire: 0.5, water: 2.0, grass: 0.5, normal: 1.0 },
    normal: { fire: 1.0, water: 1.0, grass: 1.0, normal: 1.0 }
  };

  const MOVES = {
    flame_paw:    { id: 'flame_paw',    name: '불꽃 발톱',   type: 'fire',   power: 40, accuracy: 100, desc: '불꽃을 두른 발톱으로 할퀸다.' },
    ember_burst:  { id: 'ember_burst',  name: '불티 폭발',   type: 'fire',   power: 65, accuracy: 90,  desc: '작은 불꽃을 한꺼번에 터뜨린다.' },
    aqua_jet:     { id: 'aqua_jet',     name: '물대포',      type: 'water',  power: 40, accuracy: 100, desc: '물을 압축해 쏘아낸다.' },
    tidal_crash:  { id: 'tidal_crash',  name: '파도 강타',   type: 'water',  power: 70, accuracy: 85,  desc: '큰 파도를 일으켜 덮친다.' },
    leaf_cut:     { id: 'leaf_cut',     name: '잎날 가르기', type: 'grass',  power: 40, accuracy: 100, desc: '날카로운 잎으로 베어낸다.' },
    bloom_impact: { id: 'bloom_impact', name: '꽃망울 충격', type: 'grass',  power: 65, accuracy: 90,  desc: '꽃망울을 부풀려 들이받는다.' },
    tackle:       { id: 'tackle',       name: '몸통 박치기', type: 'normal', power: 35, accuracy: 100, desc: '온몸으로 부딪친다.' },
    quick_strike: { id: 'quick_strike', name: '속공',        type: 'normal', power: 30, accuracy: 100, desc: '빠르게 파고들어 친다.' },
    guard_break:  { id: 'guard_break',  name: '방어 깨기',   type: 'normal', power: 50, accuracy: 95,  desc: '단단한 자세를 무시하고 친다.' },
    spark:        { id: 'spark',        name: '스파크',      type: 'fire',   power: 45, accuracy: 95,  desc: '튀는 불꽃으로 감전시킨다.' },
    bubble_veil:  { id: 'bubble_veil',  name: '물거품',      type: 'water',  power: 45, accuracy: 95,  desc: '물거품을 흩뿌려 공격한다.' },
    vine_wrap:    { id: 'vine_wrap',    name: '덩굴 묶기',   type: 'grass',  power: 45, accuracy: 95,  desc: '덩굴을 뻗어 휘감는다.' }
  };

  const SPECIES = {
    emberpup: {
      id: 'emberpup', name: '엠버펍', type: 'fire',
      base: { hp: 42, atk: 64, def: 38, spd: 66 },
      moves: ['flame_paw', 'ember_burst', 'tackle', 'quick_strike'],
      desc: '불꽃 꼬리를 흔들며 싸우는 새끼 여우. 빠르고 공격적이다.'
    },
    aquabble: {
      id: 'aquabble', name: '아쿠아블', type: 'water',
      base: { hp: 54, atk: 50, def: 54, spd: 48 },
      moves: ['aqua_jet', 'tidal_crash', 'tackle', 'bubble_veil'],
      desc: '몸속에 물을 저장하는 방울 몬스터. 균형 잡힌 능력이 자랑.'
    },
    sproutle: {
      id: 'sproutle', name: '스프라우틀', type: 'grass',
      base: { hp: 62, atk: 46, def: 64, spd: 34 },
      moves: ['leaf_cut', 'bloom_impact', 'tackle', 'vine_wrap'],
      desc: '등에 새싹을 기르는 온순한 몬스터. 단단한 방어가 장점.'
    },
    pebblit: {
      id: 'pebblit', name: '페블릿', type: 'normal',
      base: { hp: 70, atk: 36, def: 68, spd: 22 },
      moves: ['tackle', 'guard_break', 'spark', 'quick_strike'],
      desc: '오래된 바위가 깨어난 몬스터. 느리지만 체력이 두텁다.'
    },
    voltwisp: {
      id: 'voltwisp', name: '볼트위습', type: 'fire',
      base: { hp: 36, atk: 60, def: 34, spd: 82 },
      moves: ['spark', 'flame_paw', 'quick_strike', 'ember_burst'],
      desc: '번개를 먹고 자라는 장난꾸러기. 최고 속도를 자랑한다.'
    },
    reefling: {
      id: 'reefling', name: '리플링', type: 'water',
      base: { hp: 58, atk: 56, def: 48, spd: 56 },
      moves: ['aqua_jet', 'tidal_crash', 'bubble_veil', 'tackle'],
      desc: '물결을 타고 유영하는 몬스터. 다양한 기술을 구사한다.'
    }
  };

  const SPECIES_ORDER = ['emberpup', 'aquabble', 'sproutle', 'pebblit', 'voltwisp', 'reefling'];
  const STARTERS = ['emberpup', 'aquabble', 'sproutle'];

  const STAGES = [
    {
      id: 1, name: '초원 입구', enemy: 'pebblit', level: 1, bg: 'meadow',
      unlock: null, tip: '풀숲에서 굴러온 돌멩이 몬스터가 길을 막았다.'
    },
    {
      id: 2, name: '불씨 언덕', enemy: 'emberpup', level: 4, bg: 'ember',
      unlock: 'pebblit', tip: '불씨가 흩날리는 언덕. 물 타입이 유리하다.'
    },
    {
      id: 3, name: '잔잔한 개울', enemy: 'aquabble', level: 6, bg: 'stream',
      unlock: 'voltwisp', tip: '개울가의 주인은 물을 다루는 몬스터다.'
    },
    {
      id: 4, name: '수풀 미로', enemy: 'sproutle', level: 8, bg: 'forest',
      unlock: 'reefling', tip: '울창한 수풀. 불 타입 기술이 통할지도?'
    },
    {
      id: 5, name: '번개 마당', enemy: 'voltwisp', level: 10, bg: 'storm',
      unlock: null, tip: '번쩍이는 스피드, 한 턴이 승부를 가른다.'
    },
    {
      id: 6, name: '아레나 결승', enemy: 'reefling', level: 12, bg: 'arena',
      unlock: null, tip: '아레나의 마지막 관문. 준비한 몬스터를 총동원하자.'
    }
  ];

  window.GameData = { TYPES, CHART, MOVES, SPECIES, SPECIES_ORDER, STARTERS, STAGES };
})();
