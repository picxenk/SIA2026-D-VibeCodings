"use strict";

/* ─────────────────────────────────────────────
 * 낚싯대 (성능 업그레이드)
 * bar   : 초록 바 크기 배율
 * rare  : 희귀(★3+) 물고기 출현 가중치 배율
 * bite  : 입질 반응 시간 배율
 * size  : 큰 물고기가 나올 확률 보정
 * ───────────────────────────────────────────── */
const RODS = [
  {
    id: "basic",
    name: "나무 낚싯대",
    price: 0,
    bar: 1,
    rare: 1,
    bite: 1,
    size: 0,
    color: "#7a5230",
    tip: "#c9975a",
    reel: false,
    desc: "처음부터 가지고 있는 소박한 낚싯대.",
  },
  {
    id: "reinforced",
    name: "강화 낚싯대",
    price: 300,
    bar: 1.15,
    rare: 1.2,
    bite: 1.1,
    size: 0.03,
    color: "#6f6152",
    tip: "#d8c8a8",
    reel: true,
    desc: "튼튼하게 손본 낚싯대. 초록 바가 조금 커진다.",
  },
  {
    id: "silver",
    name: "은빛 낚싯대",
    price: 1200,
    bar: 1.3,
    rare: 1.45,
    bite: 1.2,
    size: 0.06,
    color: "#9fb4c8",
    tip: "#eef6ff",
    reel: true,
    desc: "은빛으로 빛나는 낚싯대. 희귀한 물고기가 더 잘 물린다.",
  },
  {
    id: "gold",
    name: "황금 낚싯대",
    price: 3200,
    bar: 1.45,
    rare: 1.8,
    bite: 1.3,
    size: 0.1,
    color: "#d9a63a",
    tip: "#ffe9a0",
    reel: true,
    desc: "전설의 낚시꾼이 쓰던 낚싯대. 모든 성능이 뛰어나다.",
  },
];

const ROD_BY_ID = {};
for (const r of RODS) ROD_BY_ID[r.id] = r;

function getRod(save) {
  return ROD_BY_ID[save.rod] || RODS[0];
}

function rodStatText(rod) {
  if (rod.id === "basic") return "기본 성능";
  const pct = (v, base = 1) => Math.round((v / base - 1) * 100);
  const parts = [];
  parts.push(`바 +${pct(rod.bar)}%`);
  parts.push(`희귀 +${pct(rod.rare)}%`);
  parts.push(`반응 +${pct(rod.bite)}%`);
  if (rod.size > 0) parts.push(`크기 +${Math.round(rod.size * 100)}%`);
  return parts.join("  ");
}
