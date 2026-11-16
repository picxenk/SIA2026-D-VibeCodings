"use strict";

/* ─────────────────────────────────────────────
 * 저장 (localStorage)
 * ───────────────────────────────────────────── */
const Save = {
  KEY: "starlight-fishing-v1",

  defaults() {
    return {
      version: 2,
      caught: {},
      totalCasts: 0,
      soundOn: true,
      gold: 0,
      inventory: [],
      ownedRods: ["basic"],
      rod: "basic",
    };
  },

  load() {
    const base = Save.defaults();
    try {
      const raw = localStorage.getItem(Save.KEY);
      if (!raw) return base;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return base;

      // 도감
      const caught =
        data.caught && typeof data.caught === "object" ? data.caught : {};

      // 가방 (잡은 물고기 원본 목록)
      const inventory = Array.isArray(data.inventory)
        ? data.inventory.filter(
            (it) =>
              it &&
              typeof it.id === "string" &&
              typeof it.size === "number" &&
              Number.isFinite(it.size)
          )
        : [];

      // 낚싯대
      let ownedRods = Array.isArray(data.ownedRods)
        ? data.ownedRods.filter((id) => typeof id === "string")
        : [];
      if (!ownedRods.includes("basic")) ownedRods.unshift("basic");
      const rod = ownedRods.includes(data.rod) ? data.rod : "basic";

      return {
        version: 2,
        caught,
        totalCasts: Number.isFinite(data.totalCasts) ? data.totalCasts : 0,
        soundOn: data.soundOn !== false,
        gold: Number.isFinite(data.gold) ? Math.max(0, Math.floor(data.gold)) : 0,
        inventory,
        ownedRods,
        rod,
      };
    } catch (_) {
      return base;
    }
  },

  save(data) {
    try {
      localStorage.setItem(Save.KEY, JSON.stringify(data));
    } catch (_) {
      /* 저장 불가 환경(시크릿 모드 등)에서도 게임은 계속 진행 */
    }
  },
};
