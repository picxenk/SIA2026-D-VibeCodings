/* 저장/불러오기 (localStorage, 실패 시 메모리 저장) */
(function () {
  'use strict';

  const KEY = 'monster-arena.save.v1';
  const DATA = window.GameData;
  let memory = null;

  function safeGet() {
    try { return localStorage.getItem(KEY); } catch (e) { return memory; }
  }
  function safeSet(value) {
    memory = value;
    try { localStorage.setItem(KEY, value); } catch (e) { /* private mode */ }
  }
  function safeRemove() {
    memory = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* noop */ }
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function sanitize(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const speciesOk = (id) => Object.prototype.hasOwnProperty.call(DATA.SPECIES, id);

    const owned = Array.isArray(raw.owned)
      ? raw.owned.filter((id, i, arr) => speciesOk(id) && arr.indexOf(id) === i)
      : [];
    if (!owned.length) return null;

    const starterId = speciesOk(raw.starterId) && owned.indexOf(raw.starterId) >= 0
      ? raw.starterId
      : owned[0];
    const activeId = speciesOk(raw.activeId) && owned.indexOf(raw.activeId) >= 0
      ? raw.activeId
      : starterId;

    return {
      version: 1,
      starterId,
      activeId,
      owned,
      level: clamp(Math.floor(Number(raw.level) || 5), 1, 20),
      exp: clamp(Math.floor(Number(raw.exp) || 0), 0, 100000),
      cleared: clamp(Math.floor(Number(raw.cleared) || 0), 0, DATA.STAGES.length),
      updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date().toISOString()
    };
  }

  const Save = {
    data: null,

    load() {
      let raw = null;
      try { raw = JSON.parse(safeGet()); } catch (e) { raw = null; }
      this.data = sanitize(raw);
      return this.data;
    },

    write() {
      if (!this.data) return;
      this.data.updatedAt = new Date().toISOString();
      safeSet(JSON.stringify(this.data));
    },

    clear() {
      this.data = null;
      safeRemove();
    },

    newGame(starterId) {
      if (!DATA.SPECIES[starterId]) starterId = 'emberpup';
      this.data = {
        version: 1,
        starterId,
        activeId: starterId,
        owned: [starterId],
        level: 5,
        exp: 0,
        cleared: 0,
        updatedAt: new Date().toISOString()
      };
      this.write();
      return this.data;
    },

    setActive(speciesId) {
      if (!this.data) return false;
      if (this.data.owned.indexOf(speciesId) < 0) return false;
      this.data.activeId = speciesId;
      this.write();
      return true;
    },

    unlock(speciesId) {
      if (!this.data || !DATA.SPECIES[speciesId]) return false;
      if (this.data.owned.indexOf(speciesId) >= 0) return false;
      this.data.owned.push(speciesId);
      this.write();
      return true;
    },

    hasProgress() {
      return !!(this.data && this.data.cleared > 0);
    }
  };

  window.Save = Save;
})();
