/* =========================================================
   전쟁시대 — 데이터 정의
   테마: 곤충 → 파충류 → 동물 → 공룡 → 외계인
   ========================================================= */

const W = 960;
const H = 540;
const GROUND = 440;

const BALANCE = {
  baseHp: 12000,
  unitCap: 12,
  startGold: 300,
  maxGold: 99999,
  killGoldRate: 0.15,
  evolveBuffTime: 3,
  evolveBuffReduction: 0.8,
};

const PLAYER_BASE_X = 80;
const ENEMY_BASE_X = 880;
const SPAWN_X = { player: 140, enemy: 820 };
const TURRET_SLOTS = { player: [135, 190], enemy: [825, 770] };
const TURRET_HEIGHT = 58;

/* motif: 배경 장식 / proj: 투사체 종류 / special: 광역 스킬 */

const AGES = [
  {
    name: '곤충',
    fullName: '곤충 시대',
    income: 15,
    evolveCost: 250,
    evolveTime: 1.5,
    sky: ['#a8d86b', '#3f6b3a'],
    ground: '#2c3a24',
    motif: 'jungle',
    special: { name: '무벌레 대군', icon: '🐛', dmg: 45, radius: 130, count: 8, cd: 40, proj: 'acid' },
    bgm: { base: 150, scale: [0, 2, 3, 7, 8], tempo: 132, wave: 'square' },
  },
  {
    name: '파충류',
    fullName: '파충류 시대',
    income: 26,
    evolveCost: 450,
    evolveTime: 1.5,
    sky: ['#e8e07a', '#7a8f3a'],
    ground: '#3d4a2a',
    motif: 'swamp',
    special: { name: '독무 분사', icon: '🐍', dmg: 70, radius: 140, count: 10, cd: 40, proj: 'venom' },
    bgm: { base: 98, scale: [0, 1, 5, 7, 8], tempo: 86, wave: 'sawtooth' },
  },
  {
    name: '동물',
    fullName: '동물 시대',
    income: 44,
    evolveCost: 750,
    evolveTime: 2.0,
    sky: ['#ffd9a0', '#c98f4e'],
    ground: '#7a5a35',
    motif: 'savanna',
    special: { name: '늑대 사냥대', icon: '🐺', dmg: 120, radius: 150, count: 8, cd: 40, proj: 'bone' },
    bgm: { base: 110, scale: [0, 2, 4, 5, 7, 9], tempo: 116, wave: 'triangle' },
  },
  {
    name: '공룡',
    fullName: '공룡 시대',
    income: 72,
    evolveCost: 1400,
    evolveTime: 2.0,
    sky: ['#f2a25c', '#8a2f2f'],
    ground: '#3a2420',
    motif: 'volcano',
    special: { name: '소행성 폭격', icon: '☄️', dmg: 180, radius: 160, count: 9, cd: 40, proj: 'fire' },
    bgm: { base: 82, scale: [0, 2, 3, 5, 6, 8], tempo: 96, wave: 'sawtooth' },
  },
  {
    name: '외계인',
    fullName: '외계인 시대',
    income: 115,
    evolveCost: 0,
    evolveTime: 0,
    sky: ['#1b1040', '#5a2ea6'],
    ground: '#141029',
    motif: 'space',
    special: { name: '궤도 빔', icon: '🛰️', dmg: 260, radius: 170, count: 7, cd: 40, proj: 'plasma' },
    bgm: { base: 130, scale: [0, 2, 4, 6, 8, 10], tempo: 128, wave: 'square' },
  },
];

const UNITS = [
  // ---------- 시대 1 : 곤충 ----------
  {
    id: 'ant', name: '개미병', age: 1, role: 'melee', icon: '🐜', proj: 'acid',
    hp: 70, damage: 10, attackInterval: 1.0, range: 24, speed: 62,
    cost: 45, spawnCooldown: 1.0, projectileSpeed: 0, radius: 11,
  },
  {
    id: 'bee', name: '벌침병', age: 1, role: 'ranged', icon: '🐝', proj: 'acid',
    hp: 50, damage: 10, attackInterval: 1.4, range: 180, speed: 58,
    cost: 65, spawnCooldown: 1.2, projectileSpeed: 320, radius: 10,
  },
  {
    id: 'beetle', name: '갑옷벌레', age: 1, role: 'heavy', icon: '🪲', proj: 'acid',
    hp: 240, damage: 20, attackInterval: 1.6, range: 28, speed: 46,
    cost: 150, spawnCooldown: 2.5, projectileSpeed: 0, radius: 16,
  },

  // ---------- 시대 2 : 파충류 ----------
  {
    id: 'snake', name: '뱀병', age: 2, role: 'melee', icon: '🐍', proj: 'venom',
    hp: 130, damage: 18, attackInterval: 1.0, range: 30, speed: 62,
    cost: 90, spawnCooldown: 1.0, projectileSpeed: 0, radius: 12,
  },
  {
    id: 'lizard', name: '도마뱀 사냥꾼', age: 2, role: 'ranged', icon: '🦎', proj: 'venom',
    hp: 80, damage: 17, attackInterval: 1.2, range: 230, speed: 58,
    cost: 120, spawnCooldown: 1.2, projectileSpeed: 360, radius: 11,
  },
  {
    id: 'croc', name: '악어', age: 2, role: 'heavy', icon: '🐊', proj: 'venom',
    hp: 400, damage: 32, attackInterval: 1.8, range: 38, speed: 54,
    cost: 260, spawnCooldown: 2.5, projectileSpeed: 0, radius: 18,
  },

  // ---------- 시대 3 : 동물 ----------
  {
    id: 'wolf', name: '늑대', age: 3, role: 'melee', icon: '🐺', proj: 'bone',
    hp: 280, damage: 34, attackInterval: 1.1, range: 32, speed: 62,
    cost: 200, spawnCooldown: 1.0, projectileSpeed: 0, radius: 13,
  },
  {
    id: 'monkey', name: '원숭이 저격수', age: 3, role: 'ranged', icon: '🐒', proj: 'bone',
    hp: 130, damage: 28, attackInterval: 1.3, range: 250, speed: 58,
    cost: 225, spawnCooldown: 1.2, projectileSpeed: 400, radius: 12,
  },
  {
    id: 'elephant', name: '코끼리', age: 3, role: 'heavy', icon: '🐘', proj: 'bone',
    hp: 900, damage: 80, attackInterval: 2.4, range: 44, speed: 42,
    cost: 600, spawnCooldown: 2.5, projectileSpeed: 0, radius: 21,
  },

  // ---------- 시대 4 : 공룡 ----------
  {
    id: 'raptor', name: '라노수어', age: 4, role: 'melee', icon: '🦖', proj: 'fire',
    hp: 600, damage: 70, attackInterval: 1.1, range: 36, speed: 64,
    cost: 450, spawnCooldown: 1.0, projectileSpeed: 0, radius: 18,
  },
  {
    id: 'pterodactyl', name: '날개 공룡', age: 4, role: 'ranged', icon: '🦅', proj: 'fire',
    hp: 220, damage: 45, attackInterval: 1.3, range: 300, speed: 70,
    cost: 420, spawnCooldown: 1.2, projectileSpeed: 520, radius: 13,
  },
  {
    id: 'brachiosaurus', name: '브라키오사우루스', age: 4, role: 'heavy', icon: '🦕', proj: 'fire',
    hp: 1400, damage: 110, attackInterval: 2.4, range: 48, speed: 40,
    cost: 900, spawnCooldown: 3.0, projectileSpeed: 0, radius: 24,
  },

  // ---------- 시대 5 : 외계인 ----------
  {
    id: 'alien', name: '외계 침입자', age: 5, role: 'melee', icon: '👽', proj: 'plasma',
    hp: 380, damage: 50, attackInterval: 0.7, range: 38, speed: 72,
    cost: 450, spawnCooldown: 1.0, projectileSpeed: 0, radius: 13,
  },
  {
    id: 'drone', name: '사이보 드론', age: 5, role: 'ranged', icon: '🤖', proj: 'plasma',
    hp: 260, damage: 85, attackInterval: 1.6, range: 330, speed: 55,
    cost: 580, spawnCooldown: 1.5, projectileSpeed: 700, radius: 12,
  },
  {
    id: 'mecha', name: '전투 메카', age: 5, role: 'heavy', icon: '🛸', proj: 'plasma',
    hp: 1500, damage: 150, attackInterval: 2.0, range: 68, speed: 46,
    cost: 1000, spawnCooldown: 3.0, projectileSpeed: 0, radius: 25,
  },
];

const TURRETS = [
  { age: 1, name: '벌집', icon: '🕷️', hp: 500, damage: 14, attackInterval: 1.2, range: 280, cost: 180, projectileSpeed: 380, projectile: 'acid', radius: 18 },
  { age: 2, name: '악어 턱', icon: '🐊', hp: 700, damage: 26, attackInterval: 1.3, range: 300, cost: 330, projectileSpeed: 420, projectile: 'venom', radius: 18 },
  { age: 3, name: '매의 둥지', icon: '🦅', hp: 950, damage: 50, attackInterval: 1.4, range: 330, cost: 580, projectileSpeed: 460, projectile: 'bone', radius: 19 },
  { age: 4, name: '뼈탑', icon: '🦴', hp: 1300, damage: 80, attackInterval: 1.8, range: 350, cost: 900, projectileSpeed: 520, projectile: 'fire', radius: 19 },
  { age: 5, name: '위성 포탑', icon: '🛰️', hp: 1800, damage: 70, attackInterval: 0.9, range: 380, cost: 1350, projectileSpeed: 760, projectile: 'plasma', radius: 20 },
];

const DIFF = {
  easy:   { label: '쉬움',   income: 0.6,  decide: 1.0,  startGold: 250, aiCap: 9,  reserve: 300 },
  normal: { label: '보통',   income: 0.8,  decide: 0.5,  startGold: 300, aiCap: 11, reserve: 100 },
  hard:   { label: '어려움', income: 0.95, decide: 0.35, startGold: 350, aiCap: 12, reserve: 50 },
};
