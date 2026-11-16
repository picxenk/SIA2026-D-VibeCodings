// 키 입력
(function () {
  const keys = Object.create(null);
  let pressed = Object.create(null);
  const blocked = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'Space', 'Tab', 'KeyZ', 'KeyX', 'KeyQ', 'KeyE',
  ]);

  function codeOf(e) {
    if (e.code) return e.code;
    const k = e.key;
    if (k === ' ') return 'Space';
    if (k === 'Esc') return 'Escape';
    if (k && k.length === 1) return 'Key' + k.toUpperCase();
    return k;
  }

  window.addEventListener('keydown', (e) => {
    const code = codeOf(e);
    if (blocked.has(code)) e.preventDefault();
    if (!e.repeat) pressed[code] = true;
    keys[code] = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[codeOf(e)] = false;
  });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
  });

  window.Input = {
    down(...codes) { return codes.some((c) => keys[c]); },
    hit(...codes) { return codes.some((c) => pressed[c]); },
    endFrame() { pressed = Object.create(null); },
  };
})();
