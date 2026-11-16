"use strict";

/* ─────────────────────────────────────────────
 * 물고기 도감 (기획서 4.5)
 * rarity 1~5 · difficulty 1~5
 * ───────────────────────────────────────────── */
const FISH = [
  {
    id: "pirami",
    name: "피라미",
    rarity: 1,
    difficulty: 1,
    min: 8,
    max: 15,
    times: ["day", "dusk", "night"],
    weight: 50,
    body: "#a8c8e0",
    belly: "#e8f2fa",
    accent: "#6f93b8",
    desc: "호숫가에서 가장 먼저 만나는 작은 친구. 물빛과 비슷해서 놓치기 쉽다.",
  },
  {
    id: "bungeo",
    name: "붕어",
    rarity: 1,
    difficulty: 1,
    min: 15,
    max: 30,
    times: ["day", "dusk", "night"],
    weight: 45,
    body: "#c9a86a",
    belly: "#f0ddb0",
    accent: "#9a7a40",
    desc: "느긋하고 듬직한 호수 지킴이. 초보 낚시꾼의 든든한 친구.",
  },
  {
    id: "ingeo",
    name: "잉어",
    rarity: 2,
    difficulty: 2,
    min: 30,
    max: 60,
    times: ["day"],
    weight: 28,
    body: "#e8925a",
    belly: "#ffd2a8",
    accent: "#b96636",
    desc: "수면 가까이에서 힘차게 헤엄친다. 낮에만 모습을 드러낸다.",
  },
  {
    id: "songsari",
    name: "송사리",
    rarity: 2,
    difficulty: 2,
    min: 4,
    max: 8,
    times: ["day", "dusk", "night"],
    weight: 26,
    body: "#d9e6c9",
    belly: "#f6fbe8",
    accent: "#9fb98a",
    desc: "손바닥보다 작지만 움직임은 누구보다 빠르다.",
  },
  {
    id: "megi",
    name: "메기",
    rarity: 3,
    difficulty: 3,
    min: 40,
    max: 80,
    times: ["night"],
    weight: 16,
    body: "#7a7a86",
    belly: "#c8c8d0",
    accent: "#55555f",
    desc: "수염을 길게 늘어뜨린 밤의 사냥꾼. 묵직하게 움직인다.",
  },
  {
    id: "eunbit",
    name: "은빛송어",
    rarity: 3,
    difficulty: 3,
    min: 25,
    max: 50,
    times: ["dusk"],
    weight: 16,
    body: "#c8d8e8",
    belly: "#f2f8ff",
    accent: "#d98aa8",
    desc: "노을이 질 때 은빛으로 반짝이며 물 위로 뛰어오른다.",
  },
  {
    id: "mujigae",
    name: "무지개송어",
    rarity: 3,
    difficulty: 4,
    min: 30,
    max: 65,
    times: ["day"],
    weight: 13,
    body: "#8fd0c0",
    belly: "#e0f7ee",
    accent: "#e08ab0",
    desc: "햇빛을 받으면 등에 무지개가 번진다. 힘이 세서 다루기 어렵다.",
  },
  {
    id: "jangeo",
    name: "장어",
    rarity: 4,
    difficulty: 4,
    min: 60,
    max: 100,
    times: ["night"],
    weight: 8,
    body: "#55705a",
    belly: "#a8c0a0",
    accent: "#3a5040",
    desc: "길고 미끄러운 몸으로 상하로 크게 움직인다. 밤에만 잡힌다.",
  },
  {
    id: "dalbit",
    name: "달빛잉어",
    rarity: 4,
    difficulty: 4,
    min: 35,
    max: 70,
    times: ["night"],
    weight: 7,
    body: "#a8c8f0",
    belly: "#eef4ff",
    accent: "#7f9fe0",
    desc: "달빛을 머금은 비늘. 조용한 밤에만 물 위로 떠오른다.",
  },
  {
    id: "hwanggeum",
    name: "황금붕어",
    rarity: 5,
    difficulty: 5,
    min: 10,
    max: 20,
    times: ["dusk"],
    weight: 3,
    body: "#f0c24a",
    belly: "#fff0b0",
    accent: "#d09a2a",
    desc: "노을이 물드는 순간에만 보이는 전설의 금빛 붕어. 아주 작고 아주 빠르다.",
  },
  {
    id: "yuryeong",
    name: "유령메기",
    rarity: 5,
    difficulty: 5,
    min: 50,
    max: 90,
    times: ["night"],
    weight: 2,
    body: "#cfe0e8",
    belly: "#f8fdff",
    accent: "#8fb0d0",
    desc: "물속 안개 사이로 흐릿하게 비치는 메기. 잡히면 금세 사라진다.",
  },
  {
    id: "byeol",
    name: "전설의 별고기",
    rarity: 5,
    difficulty: 5,
    min: 80,
    max: 120,
    times: ["night"],
    weight: 1,
    body: "#6a7fd8",
    belly: "#c8d4ff",
    accent: "#f0c24a",
    desc: "도감을 모두 채운 자에게만 모습을 보인다는 별빛 물고기.",
  },
];

const FISH_BY_ID = {};
for (const f of FISH) FISH_BY_ID[f.id] = f;

function timeLabel(times) {
  if (times.length >= 3) return "언제나";
  return times
    .map((t) => ({ day: "낮", dusk: "노을", night: "밤" })[t])
    .join(" · ");
}

/* ─────────────────────────────────────────────
 * 판매 가격
 * 기본가 × 크기 보정(0.75 ~ 1.25)
 * ───────────────────────────────────────────── */
const BASE_PRICE = {
  pirami: 18,
  bungeo: 26,
  ingeo: 60,
  songsari: 32,
  megi: 110,
  eunbit: 120,
  mujigae: 130,
  jangeo: 240,
  dalbit: 260,
  hwanggeum: 600,
  yuryeong: 650,
  byeol: 1200,
};

function fishPrice(fish, size) {
  const base = BASE_PRICE[fish.id] || 10;
  const t = clamp((size - fish.min) / Math.max(0.001, fish.max - fish.min), 0, 1);
  return Math.max(1, Math.round(base * (0.75 + 0.5 * t)));
}
