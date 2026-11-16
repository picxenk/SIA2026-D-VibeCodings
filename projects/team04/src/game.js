// 슈와 몽이: 별빛 수호대 — 게임 본체
(function () {
  const TILE = 16;
  const VIEW_W = 480;
  const VIEW_H = 272;
  const GRAVITY = 800;

  const SU_W = 14, SU_H = 22;
  const MONG_W = 12, MONG_H = 14;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const overlap = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function setFont(ctx, size, weight) {
    ctx.font = `${weight || 'bold'} ${size}px "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif`;
  }

  function starPath(ctx, cx, cy, outer, inner, points, rot) {
    ctx.beginPath();
    const n = points || 5;
    const r0 = rot == null ? -Math.PI / 2 : rot;
    for (let i = 0; i < n * 2; i++) {
      const r = i % 2 === 0 ? outer : inner;
      const a = r0 + (i * Math.PI) / n;
      const x = cx + Math.cos(a) * r;
      const y = cy + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  function heartPath(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s);
    ctx.bezierCurveTo(cx - s * 1.25, cy + s * 0.15, cx - s * 0.65, cy - s * 0.85, cx, cy - s * 0.15);
    ctx.bezierCurveTo(cx + s * 0.65, cy - s * 0.85, cx + s * 1.25, cy + s * 0.15, cx, cy + s);
    ctx.closePath();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  // ---------- 엔티티 ----------

  function makePlayer(kind, x, y) {
    const su = kind === 'su';
    return {
      kind,
      x, y,
      w: su ? SU_W : MONG_W,
      h: su ? SU_H : MONG_H,
      vx: 0, vy: 0, dir: 1,
      hp: su ? 5 : 3,
      maxHp: su ? 5 : 3,
      speed: su ? 96 : 112,
      jump: su ? -350 : -330,
      onGround: false,
      coyote: 0,
      jumps: 0,
      invuln: 0,
      attackCd: 0,
      attackTimer: 0,
      lightCd: 0,
      lightTimer: 0,
      ranged: false,
      anim: 0,
    };
  }

  function makeSlime(tx, ty) {
    return {
      type: 'slime',
      x: tx * TILE + 2,
      y: (ty + 1) * TILE - 12,
      w: 12, h: 12,
      vx: 0, vy: 0,
      dir: -1,
      hp: 2,
      flash: 0,
      seed: Math.random() * 10,
      anim: Math.random() * 10,
    };
  }

  function makeBat(tx, ty) {
    return {
      type: 'bat',
      x: tx * TILE + 2,
      y: ty * TILE + 3,
      w: 12, h: 10,
      ox: tx * TILE + 2,
      oy: ty * TILE + 3,
      hp: 1,
      flash: 0,
      seed: Math.random() * 10,
      anim: Math.random() * 10,
    };
  }

  function makeBoss(tx) {
    return {
      type: 'boss',
      x: tx * TILE - 6,
      y: 200,
      w: 30, h: 30,
      baseX: tx * TILE - 6,
      hp: 8,
      maxHp: 8,
      stun: 0,
      flash: 0,
      shoot: 2,
      contactCd: 0,
    };
  }

  function parseLevel(data) {
    const rows = data.map;
    const w = rows[0].length;
    const h = rows.length;
    const level = {
      data, w, h,
      tiles: rows.map((r) => r.split('')),
      theme: data.theme,
      dark: !!data.dark,
      switchType: data.switchType || 'any',
      gateOpen: false,
      switchOn: false,
      bossLevel: !!data.boss,
      spawnSu: { x: 32, y: 200 },
      spawnMong: { x: 48, y: 200 },
      coins: [],
      hearts: [],
      enemies: [],
      boxes: [],
      switches: [],
      bolts: [],
      projectiles: [],
      dropItems: [],
      checkpoint: null,
      star: null,
      boss: null,
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        switch (ch) {
          case 'S':
            level.spawnSu = { x: x * TILE + (TILE - SU_W) / 2, y: (y + 1) * TILE - SU_H };
            break;
          case 'M':
            level.spawnMong = { x: x * TILE + (TILE - MONG_W) / 2, y: (y + 1) * TILE - MONG_H };
            break;
          case 'o':
            level.coins.push({ x: x * TILE + 8, y: y * TILE + 8, taken: false });
            break;
          case 'h':
            level.hearts.push({ x: x * TILE + 8, y: y * TILE + 8, taken: false });
            break;
          case '*':
            level.star = { x: x * TILE + 8, y: y * TILE + 8 };
            break;
          case 'c':
            level.checkpoint = { tx: x, ty: y, active: false };
            break;
          case 's':
            level.switches.push({ tx: x, ty: y, on: false });
            break;
          case 'e':
            level.enemies.push(makeSlime(x, y));
            break;
          case 'b':
            level.enemies.push(makeBat(x, y));
            break;
          case 'B':
            level.boxes.push({
              x: x * TILE, y: (y + 1) * TILE - TILE, w: 16, h: 16,
              vy: 0, onGround: false,
              hp: 2, pushed: 0, flash: 0, dead: false,
              breakable: true, drop: null,
            });
            break;
          case 'X':
            level.boss = makeBoss(x);
            break;
        }
        if (ch !== '#' && ch !== 'G' && ch !== '^') level.tiles[y][x] = '.';
      }
    }

    level.respawn = {
      su: { x: level.spawnSu.x, y: level.spawnSu.y },
      mong: { x: level.spawnMong.x, y: level.spawnMong.y },
    };
    // 퍼즐용 밀 상자는 부술 수 없게
    if (data.firstBoxUnbreakable && level.boxes.length) level.boxes[0].breakable = false;
    // 상자가 드롭할 아이템 (맵 등장 순서대로)
    const crateDrops = data.crateDrops || [];
    level.boxes.forEach((b, i) => { b.drop = crateDrops[i] || null; });
    // 맵 위 직접 배치하는 아이템
    for (const d of data.drops || []) {
      level.dropItems.push({
        x: d.x * TILE + 8, y: d.y * TILE + 8, w: 4, h: 4,
        kind: d.kind, vy: 0,
      });
    }
    return level;
  }

  // ---------- 충돌 / 물리 ----------

  function tileAt(level, tx, ty) {
    if (tx < 0 || tx >= level.w) return '#';
    if (ty < 0) return '.';
    if (ty >= level.h) return '#';
    return level.tiles[ty][tx];
  }

  function isSolid(level, tx, ty) {
    const ch = tileAt(level, tx, ty);
    if (ch === '#') return true;
    if (ch === 'G') return !level.gateOpen;
    return false;
  }

  function tryBoxX(level, box, dx) {
    if (!dx) return false;
    const oldX = box.x;
    box.x += dx;
    const dir = Math.sign(dx);
    const x0 = Math.floor(box.x / TILE);
    const x1 = Math.floor((box.x + box.w - 0.01) / TILE);
    const y0 = Math.floor(box.y / TILE);
    const y1 = Math.floor((box.y + box.h - 0.01) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(level, tx, ty)) {
          if (dir > 0) box.x = Math.min(box.x, tx * TILE - box.w);
          else box.x = Math.max(box.x, (tx + 1) * TILE);
        }
      }
    }
    for (const other of level.boxes) {
      if (other === box) continue;
      if (overlap(box, other)) {
        if (dir > 0) box.x = Math.min(box.x, other.x - box.w);
        else box.x = Math.max(box.x, other.x + other.w);
      }
    }
    if (box.x !== oldX) {
      box.pushed = 0.2; // 밀리는 중에는 공격으로 부서지지 않음
      return true;
    }
    return false;
  }

  function moveX(ent, dx, level, canPush) {
    if (!dx) return;
    ent.x += dx;
    const dir = Math.sign(dx);

    if (canPush) {
      for (const box of level.boxes) {
        if (overlap(ent, box)) {
          const push = dir > 0 ? ent.x + ent.w - box.x : ent.x - (box.x + box.w);
          if (push) tryBoxX(level, box, push);
        }
      }
    }

    const x0 = Math.floor(ent.x / TILE);
    const x1 = Math.floor((ent.x + ent.w - 0.01) / TILE);
    const y0 = Math.floor(ent.y / TILE);
    const y1 = Math.floor((ent.y + ent.h - 0.01) / TILE);
    let hit = false;
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(level, tx, ty)) {
          if (dir > 0) ent.x = Math.min(ent.x, tx * TILE - ent.w);
          else ent.x = Math.max(ent.x, (tx + 1) * TILE);
          hit = true;
        }
      }
    }
    for (const box of level.boxes) {
      if (overlap(ent, box)) {
        if (dir > 0) ent.x = Math.min(ent.x, box.x - ent.w);
        else ent.x = Math.max(ent.x, box.x + box.w);
        hit = true;
      }
    }
    if (hit) ent.vx = 0;
  }

  function moveY(ent, dy, level) {
    if (!dy) return;
    ent.y += dy;
    const dir = Math.sign(dy);
    const x0 = Math.floor(ent.x / TILE);
    const x1 = Math.floor((ent.x + ent.w - 0.01) / TILE);
    const y0 = Math.floor(ent.y / TILE);
    const y1 = Math.floor((ent.y + ent.h - 0.01) / TILE);
    let hit = false;
    const resolveSide = (tileX) => {
      // 깊게 겹친 벽은 세로 해석 대신 옆으로 밀어낸다 (벽타기 버그 방지)
      const cx = ent.x + ent.w / 2;
      if (cx < tileX + TILE / 2) ent.x = Math.min(ent.x, tileX - ent.w);
      else ent.x = Math.max(ent.x, (tileX + 1) * TILE);
    };
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (isSolid(level, tx, ty)) {
          if (dir > 0) {
            const top = ty * TILE;
            if (ent.y + ent.h - top < TILE) {
              ent.y = Math.min(ent.y, top - ent.h);
              ent.onGround = true;
            } else {
              resolveSide(tx);
            }
          } else {
            ent.y = Math.max(ent.y, (ty + 1) * TILE);
          }
          hit = true;
        }
      }
    }
    for (const box of level.boxes) {
      if (box === ent) continue;
      if (overlap(ent, box)) {
        if (dir > 0) {
          const top = box.y;
          if (ent.y + ent.h - top < TILE) {
            ent.y = Math.min(ent.y, top - ent.h);
            ent.onGround = true;
          } else {
            const cx = ent.x + ent.w / 2;
            if (cx < box.x + box.w / 2) ent.x = Math.min(ent.x, box.x - ent.w - 0.01);
            else ent.x = Math.max(ent.x, box.x + box.w + 0.01);
          }
        } else {
          ent.y = Math.max(ent.y, box.y + box.h);
        }
        hit = true;
      }
    }
    if (hit) ent.vy = 0;
  }

  function stepBody(ent, level, dt, glide) {
    ent.onGround = false;
    ent.vy += GRAVITY * dt;
    if (glide && ent.vy > 0) ent.vy = Math.min(ent.vy, 68);
    moveX(ent, ent.vx * dt, level, ent.kind === 'su');
    moveY(ent, ent.vy * dt, level);
  }

  function updateBox(level, box, dt) {
    box.vy += GRAVITY * dt;
    box.onGround = false;
    moveY(box, box.vy * dt, level);
    box.pushed = Math.max(0, (box.pushed || 0) - dt);
    box.flash = Math.max(0, (box.flash || 0) - dt);
  }

  // 상자 피격: pushed 중이 아닌 부서질 수 있는 상자만 데미지. 맞은 개수 반환
  function hitBoxes(level, box, dmg) {
    let n = 0;
    for (const b of level.boxes) {
      if (!b.breakable || b.dead || b.pushed > 0) continue;
      if (!overlap(box, b)) continue;
      n++;
      b.hp -= dmg;
      b.flash = 0.15;
      if (b.hp <= 0) {
        b.dead = true;
        if (b.drop) level.dropItems.push({ x: b.x + b.w / 2, y: b.y + b.h / 2, w: 4, h: 4, kind: b.drop, vy: -120 });
        SFX.enemy();
      } else {
        SFX.attack();
      }
    }
    return n;
  }

  // ---------- 그리기 도우미 ----------

  function drawSu(ctx, p, t) {
    const cx = p.x + p.w / 2;
    const bottom = p.y + p.h;
    const walking = p.onGround && Math.abs(p.vx) > 1;
    const step = walking ? Math.sin(p.anim * 14) : 0;

    ctx.save();
    ctx.translate(cx, bottom);
    ctx.scale(p.dir, 1);

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 다리
    ctx.fillStyle = '#4a2b3a';
    ctx.fillRect(-5, -6 + step * 2, 4, 6);
    ctx.fillRect(1, -6 - step * 2, 4, 6);

    // 드레스
    ctx.fillStyle = '#ff8a7a';
    ctx.beginPath();
    ctx.moveTo(-6, -14);
    ctx.lineTo(6, -14);
    ctx.lineTo(7, -4);
    ctx.lineTo(-7, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffb0a3';
    ctx.fillRect(-3, -12, 6, 3);

    // 머리
    ctx.fillStyle = '#ffe8c9';
    ctx.beginPath();
    ctx.arc(0, -19, 6.4, 0, Math.PI * 2);
    ctx.fill();

    // 앞머리
    ctx.fillStyle = '#6b3f2a';
    ctx.beginPath();
    ctx.arc(0, -21, 6.6, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-6.6, -21, 13.2, 3);
    ctx.fillRect(-6.6, -20, 3, 6);

    // 눈 / 볼
    ctx.fillStyle = '#2b1530';
    ctx.fillRect(2.4, -19.5, 1.6, 2.6);
    ctx.fillStyle = 'rgba(255,120,140,0.55)';
    ctx.fillRect(3.6, -16.5, 2.2, 1.4);

    // 장난감 망치 (공격 중)
    if (p.attackTimer > 0) {
      ctx.save();
      ctx.translate(7, -10);
      ctx.rotate(-0.6);
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(-1, -7, 2, 9);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(-4, -9, 8, 5);
      ctx.restore();
    }

    ctx.restore();
  }

  function drawMong(ctx, p, t) {
    const cx = p.x + p.w / 2;
    const bottom = p.y + p.h;
    const bob = Math.sin(p.anim * 6) * 1.2;

    ctx.save();
    ctx.translate(cx, bottom + bob);

    // 발광
    const glow = ctx.createRadialGradient(0, -7, 1, 0, -7, 20);
    glow.addColorStop(0, 'rgba(255, 248, 180, 0.5)');
    glow.addColorStop(0.55, 'rgba(158, 247, 216, 0.22)');
    glow.addColorStop(1, 'rgba(158, 247, 216, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, -7, 20, 0, Math.PI * 2);
    ctx.fill();

    // 그림자
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, 1, 6, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // 몸통 별
    ctx.save();
    ctx.rotate(Math.sin(p.anim * 2) * 0.08);
    ctx.fillStyle = '#9ef7d8';
    starPath(ctx, 0, -7, 8.5, 4.4, 5, -Math.PI / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // 얼굴
    ctx.fillStyle = '#21414a';
    ctx.beginPath();
    ctx.arc(-2.6, -8, 1, 0, Math.PI * 2);
    ctx.arc(2.6, -8, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillRect(-0.5, -6.5, 1, 1);

    ctx.restore();
  }

  function drawHeart(ctx, cx, cy, s, filled) {
    heartPath(ctx, cx, cy, s);
    ctx.fillStyle = filled ? '#ff6b8a' : 'rgba(255,255,255,0.12)';
    ctx.fill();
    ctx.strokeStyle = filled ? '#ffd0dc' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawCoin(ctx, x, y, t) {
    const bob = Math.sin(t * 4 + x * 0.12) * 1.5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = '#b07a1f';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd75e';
    ctx.beginPath();
    ctx.arc(0, -0.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff3a8';
    ctx.beginPath();
    ctx.arc(-1.2, -1.7, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawHeartItem(ctx, x, y, t) {
    const bob = Math.sin(t * 3.5 + x * 0.1) * 2;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.fillStyle = 'rgba(255, 107, 138, 0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    drawHeart(ctx, 0, 0, 5.5, true);
    ctx.restore();
  }

  function drawStar(ctx, x, y, t, scale) {
    const bob = Math.sin(t * 3) * 3;
    const s = scale || 1;
    ctx.save();
    ctx.translate(x, y + bob);
    const glow = ctx.createRadialGradient(0, 0, 1, 0, 0, 18 * s);
    glow.addColorStop(0, 'rgba(255, 243, 150, 0.75)');
    glow.addColorStop(1, 'rgba(255, 220, 80, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 18 * s, 0, Math.PI * 2);
    ctx.fill();
    ctx.rotate(t * 0.8);
    ctx.fillStyle = '#ffe066';
    starPath(ctx, 0, 0, 9 * s, 4 * s, 5, -Math.PI / 2);
    ctx.fill();
    ctx.strokeStyle = '#fff8c9';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function drawCrate(ctx, box) {
    ctx.fillStyle = box.flash > 0 ? '#ffffff' : '#8a5a3a';
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.fillStyle = box.breakable ? '#b07a4a' : '#7b7f92';
    ctx.fillRect(box.x + 2, box.y + 2, box.w - 4, box.h - 4);
    ctx.strokeStyle = '#5c3a24';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(box.x + 3, box.y + 3);
    ctx.lineTo(box.x + box.w - 3, box.y + box.h - 3);
    ctx.moveTo(box.x + box.w - 3, box.y + 3);
    ctx.lineTo(box.x + 3, box.y + box.h - 3);
    ctx.stroke();
    ctx.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
  }

  function drawSwitch(ctx, sw, type, t) {
    const x = sw.tx * TILE + 8;
    const baseY = (sw.ty + 1) * TILE;
    const color = sw.on ? '#7dffb0'
      : type === 'su' ? '#ff9f6e'
        : type === 'mong' ? '#9ef7d8' : '#ffe066';

    ctx.fillStyle = '#3b3448';
    ctx.fillRect(x - 7, baseY - 3, 14, 3);
    ctx.fillStyle = '#5a5068';
    ctx.fillRect(x - 2, baseY - 9, 4, 6);

    const pulse = 0.6 + Math.sin(t * 5) * 0.4;
    ctx.save();
    ctx.globalAlpha = 0.35 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, baseY - 11, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, baseY - 11, 4.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(20,20,30,0.7)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawCheckpoint(ctx, cp, t) {
    const x = cp.tx * TILE + 8;
    const baseY = (cp.ty + 1) * TILE;
    ctx.fillStyle = '#cfd6e6';
    ctx.fillRect(x - 1, baseY - 20, 2, 20);
    const wave = Math.sin(t * 4) * 1.5;
    ctx.fillStyle = cp.active ? '#7dffb0' : '#6f7890';
    ctx.beginPath();
    ctx.moveTo(x + 1, baseY - 20);
    ctx.lineTo(x + 11 + wave, baseY - 16);
    ctx.lineTo(x + 1, baseY - 12);
    ctx.closePath();
    ctx.fill();
    if (cp.active) {
      ctx.fillStyle = 'rgba(125, 255, 176, 0.35)';
      ctx.beginPath();
      ctx.arc(x, baseY - 10, 8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSlime(ctx, e, t) {
    const squish = 1 + Math.sin(t * 4 + e.seed) * 0.1;
    const cx = e.x + e.w / 2;
    const by = e.y + e.h;
    ctx.save();
    ctx.translate(cx, by);
    ctx.scale(squish, 1 / squish);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#6fd18a';
    ctx.beginPath();
    ctx.ellipse(0, -6, 6.5, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(-2, -8, 2, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#204030';
    ctx.beginPath();
    ctx.arc(-2, -7, 0.9, 0, Math.PI * 2);
    ctx.arc(2, -7, 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBat(ctx, e, t) {
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    const flap = Math.sin(t * 12 + e.seed) * 3;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.fillStyle = e.flash > 0 ? '#ffffff' : '#9a6bd6';
    ctx.beginPath();
    ctx.moveTo(-2, -3);
    ctx.lineTo(-11, -6 - flap);
    ctx.lineTo(-7, 1);
    ctx.lineTo(-2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(2, -3);
    ctx.lineTo(11, -6 - flap);
    ctx.lineTo(7, 1);
    ctx.lineTo(2, 3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(0, 0, 4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(-1.5, -0.5, 0.8, 0, Math.PI * 2);
    ctx.arc(1.5, -0.5, 0.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBoss(ctx, b, t) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    ctx.save();
    ctx.translate(cx, cy);

    const aura = ctx.createRadialGradient(0, 0, 2, 0, 0, 26);
    aura.addColorStop(0, 'rgba(190, 90, 255, 0.45)');
    aura.addColorStop(1, 'rgba(90, 20, 140, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = b.flash > 0 ? '#ffffff' : '#2a1738';
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b06bff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // 눈
    ctx.fillStyle = '#ff5f9e';
    ctx.beginPath();
    ctx.ellipse(-5, -3, 3, 2.2, -0.25, 0, Math.PI * 2);
    ctx.ellipse(5, -3, 3, 2.2, 0.25, 0, Math.PI * 2);
    ctx.fill();

    // 왕관
    ctx.fillStyle = '#ffcf6b';
    ctx.beginPath();
    ctx.moveTo(-8, -16);
    ctx.lineTo(-5, -22);
    ctx.lineTo(-2, -17);
    ctx.lineTo(0, -23);
    ctx.lineTo(2, -17);
    ctx.lineTo(5, -22);
    ctx.lineTo(8, -16);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function drawProjectile(ctx, pr, t) {
    ctx.save();
    ctx.translate(pr.x, pr.y);
    if (pr.light) {
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
      g.addColorStop(0, 'rgba(220, 255, 240, 0.95)');
      g.addColorStop(1, 'rgba(158, 247, 216, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#eafff6';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.rotate(t * 14 * Math.sign(pr.vx));
      ctx.fillStyle = '#8a5a3a';
      ctx.fillRect(-1.5, -6, 3, 12);
      ctx.fillStyle = '#ffd166';
      ctx.fillRect(-5, -6, 10, 5);
    }
    ctx.restore();
  }

  function drawBolt(ctx, b, t) {
    ctx.save();
    ctx.translate(b.x, b.y);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 9);
    g.addColorStop(0, 'rgba(255, 180, 255, 0.9)');
    g.addColorStop(1, 'rgba(160, 50, 220, 0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2b6ff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawBlock(ctx, level, x, y) {
    const th = level.theme;
    ctx.fillStyle = th.block;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    const above = tileAt(level, x, y - 1);
    if (above !== '#') {
      ctx.fillStyle = th.top;
      ctx.fillRect(x * TILE, y * TILE, TILE, 4);
    }
    ctx.strokeStyle = th.edge;
    ctx.lineWidth = 1;
    ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
    if ((x * 7 + y * 13) % 11 === 0) {
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.fillRect(x * TILE + 4, y * TILE + 7, 3, 2);
      ctx.fillRect(x * TILE + 10, y * TILE + 11, 2, 2);
    }
  }

  function drawGate(ctx, level, x, y) {
    if (level.gateOpen) {
      ctx.fillStyle = 'rgba(140, 220, 255, 0.18)';
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      return;
    }
    ctx.fillStyle = level.theme.edge;
    ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
    ctx.fillStyle = '#8f7aa8';
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x * TILE + 2 + i * 5, y * TILE + 1, 2, TILE - 2);
    }
    ctx.fillStyle = 'rgba(190, 160, 255, 0.5)';
    ctx.fillRect(x * TILE, y * TILE + 3, TILE, 1);
  }

  function drawSpikes(ctx, x, y) {
    ctx.fillStyle = '#c7cbe0';
    for (let i = 0; i < 3; i++) {
      const sx = x * TILE + 1 + i * 5;
      ctx.beginPath();
      ctx.moveTo(sx, (y + 1) * TILE);
      ctx.lineTo(sx + 2.5, y * TILE + 3);
      ctx.lineTo(sx + 5, (y + 1) * TILE);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = '#7c809c';
    ctx.fillRect(x * TILE, y * TILE + 12, TILE, 4);
  }

  // ---------- 게임 ----------

  class Game {
    constructor(ctx) {
      this.ctx = ctx;
      this.state = 'title';
      this.time = 0;
      this.levelIndex = 0;
      this.level = null;
      this.su = null;
      this.mong = null;
      this.active = null;
      this.cam = { x: 0 };
      this.coins = 0;
      this.stars = 0;
      this.playTime = 0;
      this.banner = 0;
      this.toastText = '';
      this.toastTimer = 0;
      this.hintCd = 0;

      this.darkCanvas = document.createElement('canvas');
      this.darkCanvas.width = VIEW_W;
      this.darkCanvas.height = VIEW_H;
      this.darkCtx = this.darkCanvas.getContext('2d');
    }

    toast(text) {
      this.toastText = text;
      this.toastTimer = 2.2;
    }

    startGame() {
      this.levelIndex = 0;
      this.coins = 0;
      this.stars = 0;
      this.playTime = 0;
      this.loadLevel(0);
    }

    loadLevel(index) {
      this.levelIndex = index;
      this.level = parseLevel(LEVELS[index]);
      this.su = makePlayer('su', this.level.spawnSu.x, this.level.spawnSu.y);
      this.mong = makePlayer('mong', this.level.spawnMong.x, this.level.spawnMong.y);
      this.active = this.su;
      this.cam.x = clamp(this.su.x + this.su.w / 2 - VIEW_W / 2, 0, this.level.w * TILE - VIEW_W);
      this.banner = 2.6;
      this.toastTimer = 0;
      this.hintCd = 0;
      this.state = 'playing';
      this.toast(this.level.data.subtitle || this.level.data.name);

      const width = this.level.w * TILE;
      if (width < VIEW_W + 1) this.cam.x = 0;
    }

    respawn() {
      const r = this.level.respawn;
      this.su.x = r.su.x;
      this.su.y = r.su.y;
      this.su.vx = 0;
      this.su.vy = 0;
      this.su.hp = this.su.maxHp;
      this.su.invuln = 2;
      this.mong.x = r.mong.x;
      this.mong.y = r.mong.y;
      this.mong.vx = 0;
      this.mong.vy = 0;
      this.mong.hp = this.mong.maxHp;
      this.mong.invuln = 2;
      if (this.level.boss) this.level.bolts.length = 0;
      this.coins = Math.floor(this.coins / 2);
      this.toast('체크포인트에서 다시 시작!');
      this.banner = 0;
    }

    hurtPlayer(p) {
      const target = p || this.active;
      if (!target || target.invuln > 0 || this.state !== 'playing') return;
      target.hp--;
      target.invuln = 1.3;
      SFX.hurt();
      if (target.hp <= 0) this.respawn();
    }

    completeLevel() {
      if (this.state !== 'playing') return;
      // 보스 스테이지는 마지막 별을 "획득 연출"로만 쓰고, 조각 수는 3개까지 센다.
      if (this.levelIndex < LEVELS.length - 1) this.stars++;
      this.toastTimer = 0;
      this.banner = 0;
      SFX.clear();
      if (this.levelIndex >= LEVELS.length - 1) {
        this.state = 'ending';
      } else {
        this.state = 'stageclear';
      }
    }

    // ---------- 업데이트 ----------

    update(dt) {
      this.time += dt;
      const I = window.Input;

      if (this.state === 'title') {
        if (I.hit('Enter', 'NumpadEnter', 'Space')) this.startGame();
        return;
      }
      if (this.state === 'stageclear') {
        if (I.hit('Enter', 'NumpadEnter', 'Space')) this.loadLevel(this.levelIndex + 1);
        return;
      }
      if (this.state === 'ending') {
        if (I.hit('Enter', 'NumpadEnter', 'Space')) this.state = 'title';
        return;
      }
      if (this.state === 'paused') {
        if (I.hit('Escape')) this.state = 'playing';
        if (I.hit('KeyR')) this.loadLevel(this.levelIndex);
        return;
      }
      if (this.state !== 'playing') return;

      if (I.hit('Escape')) {
        this.state = 'paused';
        return;
      }
      this.playTime += dt;
      this.updatePlaying(dt);
    }

    updatePlaying(dt) {
      const I = window.Input;
      const level = this.level;
      const players = [this.su, this.mong];

      // 조작: 슈 = 화살표 + 오른쪽 Shift / 몽이 = WASD + 왼쪽 Shift
      const controlPlayer = (p, left, right, jumpKey, atkKey, atkCodes) => {
        p.vx = 0;
        if (I.down(left)) { p.vx = -p.speed; p.dir = -1; p.anim += dt; }
        if (I.down(right)) { p.vx = p.speed; p.dir = 1; p.anim += dt; }

        if (I.hit(jumpKey)) {
          if (p.onGround || p.coyote > 0) {
            p.vy = p.jump;
            p.onGround = false;
            p.coyote = 0;
            p.jumps = p.kind === 'mong' ? 1 : 0;
            SFX.jump();
          } else if (p.kind === 'mong' && p.jumps < 2) {
            p.vy = p.jump * 0.82;
            p.jumps = 2;
            SFX.jump2();
          }
        }
        if (I.hit(...atkCodes)) this.doAttack(p);
      };

      controlPlayer(this.su, 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ShiftRight', ['ShiftRight']);
      controlPlayer(this.mong, 'KeyA', 'KeyD', 'KeyW', 'ShiftLeft', ['ShiftLeft']);

      const glide = I.down('KeyW');

      // 물리
      stepBody(this.su, level, dt, false);
      stepBody(this.mong, level, dt, this.mong.kind === 'mong' && glide);

      for (const q of players) {
        if (q.onGround) {
          q.coyote = 0.08;
          q.jumps = 0;
        } else {
          q.coyote = Math.max(0, q.coyote - dt);
        }
        q.invuln = Math.max(0, q.invuln - dt);
        q.attackCd = Math.max(0, q.attackCd - dt);
        q.attackTimer = Math.max(0, q.attackTimer - dt);
        q.lightCd = Math.max(0, q.lightCd - dt);
        q.lightTimer = Math.max(0, q.lightTimer - dt);
      }

      // 상자
      for (const box of level.boxes) updateBox(level, box, dt);
      level.boxes = level.boxes.filter((b) => !b.dead);

      // 슬라임 / 박쥐 + 밟기(마리오식)
      for (const e of level.enemies) {
        e.anim += dt;
        if (e.flash > 0) e.flash -= dt;
        if (e.type === 'slime') {
          e.vx = e.dir * 30;
          e.vy += GRAVITY * dt;
          const before = e.x;
          moveX(e, e.vx * dt, level, false);
          if (Math.abs(e.x - before) < 0.01) e.dir *= -1;
          const frontX = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
          const belowY = e.y + e.h + 3;
          if (!isSolid(level, Math.floor(frontX / TILE), Math.floor(belowY / TILE))) {
            e.dir *= -1;
          }
          moveY(e, e.vy * dt, level);
        } else {
          e.x = e.ox + Math.sin(e.anim * 1.3 + e.seed) * 26;
          e.y = e.oy + Math.sin(e.anim * 2.2 + e.seed) * 9;
        }

        for (const q of players) {
          if (q.dead || !overlap(e, q)) continue;
          // 위에서 떨어진 상태로 밟으면 적 처치
          if (q.vy > 40 && (q.y + q.h) - e.y < 9 && q.y < e.y) {
            e.hp = 0;
            e.dead = true;
            e.flash = 0.2;
            q.vy = -260;
            this.coins += 1;
            SFX.enemy();
            continue;
          }
          if (q.invuln <= 0) this.hurtPlayer(q);
        }
      }
      level.enemies = level.enemies.filter((e) => !e.dead);

      // 보스
      if (level.boss) {
        const b = level.boss;
        if (b.flash > 0) b.flash -= dt;
        b.stun = Math.max(0, b.stun - dt);
        if (b.stun <= 0) {
          // 가장 가까운 플레이어 추적
          let near = players[0];
          let nd = Infinity;
          for (const q of players) {
            const d = Math.abs(q.x - b.x);
            if (d < nd) { nd = d; near = q; }
          }
          const target = near.x + near.w / 2;
          const cx = b.x + b.w / 2;
          b.x += Math.sign(target - cx) * Math.min(26 * dt, Math.abs(target - cx));
          b.x = clamp(b.x, TILE * 2, level.w * TILE - TILE * 2 - b.w);
          b.y = 200 + Math.sin(this.time * 1.5) * 8;
          b.shoot -= dt;
          if (b.shoot <= 0) {
            b.shoot = 2.2;
            // 가장 가까운 플레이어를 향해 3발
            let aim = players[0];
            let ad = Infinity;
            for (const q of players) {
              const d = Math.hypot(q.x - b.x, q.y - b.y);
              if (d < ad) { ad = d; aim = q; }
            }
            const acx = aim.x + aim.w / 2;
            const acy = aim.y + aim.h / 2;
            const bcx = b.x + b.w / 2;
            const bcy = b.y + b.h / 2;
            const ang = Math.atan2(acy - bcy, acx - bcx);
            for (let k = -1; k <= 1; k++) {
              const a = ang + k * 0.2;
              level.bolts.push({
                x: bcx, y: bcy,
                vx: Math.cos(a) * 115,
                vy: Math.sin(a) * 115,
                life: 5,
              });
            }
            SFX.boss();
          }
        } else {
          b.y = 200 + Math.sin(this.time * 30) * 1.5;
        }
        for (const q of players) {
          if (q.invuln <= 0 && overlap(b, q)) this.hurtPlayer(q);
        }
      }

      // 보스 탄환
      for (let i = level.bolts.length - 1; i >= 0; i--) {
        const b = level.bolts[i];
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.life -= dt;
        let dead = b.life <= 0;
        if (!dead && isSolid(level, Math.floor(b.x / TILE), Math.floor(b.y / TILE))) dead = true;
        if (!dead) {
          const hb = { x: b.x - 4, y: b.y - 4, w: 8, h: 8 };
          for (const q of players) {
            if (overlap(hb, q)) {
              this.hurtPlayer(q);
              dead = true;
              break;
            }
          }
        }
        if (dead) level.bolts.splice(i, 1);
      }

      // 아군 원거리 투사체
      for (let i = level.projectiles.length - 1; i >= 0; i--) {
        const pr = level.projectiles[i];
        pr.x += pr.vx * dt;
        pr.y += pr.vy * dt;
        pr.life -= dt;
        let dead = pr.life <= 0;
        if (!dead && isSolid(level, Math.floor(pr.x / TILE), Math.floor(pr.y / TILE))) dead = true;
        if (!dead) {
          const hb = { x: pr.x - 5, y: pr.y - 5, w: 10, h: 10 };
          const hits = this.damageEnemies(hb, 1, pr.light, true);
          // 빛 구슬은 보스 탄환도 파괴
          if (pr.light) {
            for (let j = level.bolts.length - 1; j >= 0; j--) {
              const b = level.bolts[j];
              if (overlap(hb, { x: b.x - 5, y: b.y - 5, w: 10, h: 10 })) {
                level.bolts.splice(j, 1);
                hits.n += 1;
              }
            }
          }
          if (hits.n > 0) pr.dead = true;
        }
        if (dead) level.projectiles.splice(i, 1);
      }
      level.projectiles = level.projectiles.filter((p) => !p.dead);

      // 스위치 (두 명 모두)
      for (const sw of level.switches) {
        if (sw.on) continue;
        const box = { x: sw.tx * TILE, y: sw.ty * TILE, w: TILE, h: TILE };
        for (const q of players) {
          if (sw.on || q.invuln > 0 || !overlap(q, box)) continue;
          const need = level.switchType;
          if (need !== 'any' && need !== q.kind) {
            if (this.hintCd <= 0) {
              this.toast(need === 'su' ? '무거운 레버는 슈만 당길 수 있어!' : '몽이의 빛이 필요해!');
              this.hintCd = 1.8;
            }
            continue;
          }
          sw.on = true;
          level.switchOn = true;
          level.gateOpen = true;
          SFX.switch();
          SFX.gate();
          this.toast('문이 열렸다!');
          this.banner = 0;
        }
      }
      this.hintCd = Math.max(0, this.hintCd - dt);

      // 체크포인트
      const cp = level.checkpoint;
      if (cp && !cp.active) {
        const box = { x: cp.tx * TILE, y: cp.ty * TILE, w: TILE, h: TILE };
        for (const q of players) {
          if (!overlap(q, box)) continue;
          cp.active = true;
          level.respawn = {
            su: { x: cp.tx * TILE + 1, y: (cp.ty + 1) * TILE - SU_H },
            mong: { x: cp.tx * TILE + 18, y: (cp.ty + 1) * TILE - MONG_H },
          };
          this.su.hp = this.su.maxHp;
          this.mong.hp = this.mong.maxHp;
          this.toast('체크포인트!');
          SFX.checkpoint();
          break;
        }
      }

      // 코인 / 회복 / 아이템
      for (const c of level.coins) {
        if (c.taken) continue;
        for (const q of players) {
          if (Math.abs(c.x - (q.x + q.w / 2)) < 12 &&
              Math.abs(c.y - (q.y + q.h / 2)) < 16) {
            c.taken = true;
            this.coins++;
            SFX.coin();
            break;
          }
        }
      }
      for (const h of level.hearts) {
        if (h.taken) continue;
        for (const q of players) {
          if (Math.abs(h.x - (q.x + q.w / 2)) < 13 &&
              Math.abs(h.y - (q.y + q.h / 2)) < 17) {
            h.taken = true;
            q.hp = Math.min(q.maxHp, q.hp + 1);
            this.toast('하트를 회복했다!');
            SFX.coin();
            break;
          }
        }
      }

      // 드롭 아이템 (원거리 파워업 / 하트)
      for (let i = level.dropItems.length - 1; i >= 0; i--) {
        const it = level.dropItems[i];
        it.vy += GRAVITY * dt;
        moveY(it, it.vy * dt, level);
        for (const q of players) {
          if (!it.taken && Math.abs(it.x - (q.x + q.w / 2)) < 13 &&
              Math.abs(it.y - (q.y + q.h / 2)) < 16) {
            it.taken = true;
            level.dropItems.splice(i, 1);
            if (it.kind === 'power') {
              q.ranged = true;
              this.toast(`${q === this.su ? '슈' : '몽이'} 원거리 공격 파워업!`);
            } else {
              q.hp = Math.min(q.maxHp, q.hp + Math.min(2, q.maxHp - q.hp));
              this.toast('하트 +2 회복!');
            }
            SFX.star();
            break;
          }
        }
      }

      // 가시 / 낙사
      for (const q of players) {
        const tx0 = Math.floor(q.x / TILE);
        const tx1 = Math.floor((q.x + q.w - 0.01) / TILE);
        const ty0 = Math.floor(q.y / TILE);
        const ty1 = Math.floor((q.y + q.h - 0.01) / TILE);
        for (let ty = ty0; ty <= ty1; ty++) {
          for (let tx = tx0; tx <= tx1; tx++) {
            if (tileAt(level, tx, ty) === '^') this.hurtPlayer(q);
          }
        }
        if (q.y > level.h * TILE + 24) this.respawn();
      }

      // 별빛 조각
      if (level.star) {
        const s = level.star;
        for (const q of players) {
          const d = Math.hypot(s.x - (q.x + q.w / 2), s.y - (q.y + q.h / 2));
          if (d < 16) {
            SFX.star();
            this.completeLevel();
            break;
          }
        }
      }

      // 카메라: 두 캐릭터의 중점
      const midX = (this.su.x + this.mong.x) / 2 + (this.su.w + this.mong.w) / 4;
      const targetX = clamp(
        midX - VIEW_W / 2,
        0,
        Math.max(0, level.w * TILE - VIEW_W)
      );
      this.cam.x += (targetX - this.cam.x) * Math.min(1, dt * 8);

      this.banner = Math.max(0, this.banner - dt);
      this.toastTimer = Math.max(0, this.toastTimer - dt);
    }

    // 공격: 기본 근접 / 파워업 시 원거리 투사체
    doAttack(p) {
      if (p.ranged) {
        if (p.attackCd > 0) return;
        p.attackCd = 0.42;
        p.attackTimer = 0.15;
        SFX.light();
        this.level.projectiles.push({
          x: p.x + p.w / 2 + p.dir * 10,
          y: p.y + p.h / 2 - 2,
          vx: p.dir * 260,
          vy: 0,
          life: 1.6,
          light: p.kind === 'mong',
          owner: p.kind,
          dead: false,
        });
        return;
      }
      if (p.attackCd > 0) return;
      p.attackCd = 0.35;
      p.attackTimer = 0.18;
      SFX.attack();

      const box = {
        x: p.dir > 0 ? p.x + p.w : p.x - 20,
        y: p.y - 2,
        w: 20,
        h: 20,
      };
      this.damageEnemies(box, 1, false, false);
      if (p.kind === 'mong') this.mongAura();
    }

    // 몽이 근접 시 빛 나비 효과 (보스트 stun / 탄환 소멸)
    mongAura() {
      const p = this.mong;
      const px = p.x + p.w / 2;
      const py = p.y + p.h / 2;
      for (let i = this.level.bolts.length - 1; i >= 0; i--) {
        const b = this.level.bolts[i];
        if (Math.hypot(b.x - px, b.y - py) < 110) this.level.bolts.splice(i, 1);
      }
    }

    damageEnemies(box, dmg, isLight, isProjectile) {
      const r = { n: 0 };
      for (const e of this.level.enemies) {
        if (overlap(box, e)) {
          e.hp -= dmg;
          e.flash = 0.2;
          r.n++;
          if (e.hp <= 0) {
            e.dead = true;
            this.coins += 2;
            SFX.enemy();
          }
        }
      }
      this.level.enemies = this.level.enemies.filter((e) => !e.dead);
      if (!isProjectile) r.n += hitBoxes(this.level, box, dmg);
      const boss = this.level.boss;
      if (boss && overlap(box, boss)) {
        boss.hp -= dmg;
        boss.flash = 0.2;
        r.n++;
        if (isLight) boss.stun = 1.2;
        this.checkBossDead();
      }
      return r;
    }

    checkBossDead() {
      const boss = this.level.boss;
      if (!boss || boss.hp > 0) return;
      this.level.boss = null;
      this.level.bolts.length = 0;
      this.level.star = { x: 14 * TILE + 8, y: 13 * TILE + 8 };
      this.toast('그림자 정령을 물리쳤다!');
      SFX.star();
    }

    // ---------- 그리기 ----------

    draw() {
      if (this.state === 'title') {
        this.drawTitle();
        return;
      }
      this.drawScene();

      if (this.state === 'paused') {
        this.drawPause();
      } else if (this.state === 'stageclear') {
        this.drawStageClear();
      } else if (this.state === 'ending') {
        this.drawEnding();
      }
    }

    drawBackground(theme) {
      const ctx = this.ctx;
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, theme.skyTop);
      g.addColorStop(1, theme.skyBottom);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      // 별 / 부유 입자
      for (let i = 0; i < 46; i++) {
        const seedX = ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1;
        const seedY = ((Math.sin(i * 311.7) * 12543.12) % 1 + 1) % 1;
        const x = ((seedX * VIEW_W - this.cam.x * 0.25) % VIEW_W + VIEW_W) % VIEW_W;
        const y = seedY * VIEW_H * 0.72;
        const tw = 0.3 + 0.7 * Math.abs(Math.sin(this.time * 1.2 + i));
        ctx.fillStyle = `rgba(255,255,255,${0.12 + tw * 0.25})`;
        ctx.fillRect(x, y, i % 5 === 0 ? 2 : 1, i % 5 === 0 ? 2 : 1);
      }

      // 안개 띠
      ctx.fillStyle = theme.fog;
      ctx.fillRect(0, VIEW_H - 80, VIEW_W, 80);

      // 달
      ctx.fillStyle = 'rgba(255, 240, 190, 0.12)';
      ctx.beginPath();
      ctx.arc(402 - (this.cam.x * 0.05) % VIEW_W, 46, 22, 0, Math.PI * 2);
      ctx.fill();
    }

    drawScene() {
      const ctx = this.ctx;
      const level = this.level;
      const camX = Math.round(this.cam.x);

      this.drawBackground(level.theme);

      ctx.save();
      ctx.translate(-camX, 0);

      const x0 = Math.max(0, Math.floor(camX / TILE) - 1);
      const x1 = Math.min(level.w - 1, Math.ceil((camX + VIEW_W) / TILE) + 1);
      for (let y = 0; y < level.h; y++) {
        for (let x = x0; x <= x1; x++) {
          const ch = level.tiles[y][x];
          if (ch === '#') drawBlock(ctx, level, x, y);
          else if (ch === 'G') drawGate(ctx, level, x, y);
          else if (ch === '^') drawSpikes(ctx, x, y);
        }
      }

      // 체크포인트 / 스위치
      if (level.checkpoint) drawCheckpoint(ctx, level.checkpoint, this.time);
      for (const sw of level.switches) drawSwitch(ctx, sw, level.switchType, this.time);

      // 코인 / 회복 / 별
      for (const c of level.coins) if (!c.taken) drawCoin(ctx, c.x, c.y, this.time);
      for (const h of level.hearts) if (!h.taken) drawHeartItem(ctx, h.x, h.y, this.time);
      if (level.star) drawStar(ctx, level.star.x, level.star.y, this.time, 1);

      // 상자
      for (const box of level.boxes) drawCrate(ctx, box);

      // 적
      for (const e of level.enemies) {
        if (e.type === 'slime') drawSlime(ctx, e, this.time);
        else drawBat(ctx, e, this.time);
      }
      if (level.boss) drawBoss(ctx, level.boss, this.time);

      // 탄환
      for (const b of level.bolts) drawBolt(ctx, b, this.time);

      // 캐릭터
      drawSu(ctx, this.su, this.time);
      drawMong(ctx, this.mong, this.time);

      // 근접 공격 파동
      for (const p of [this.su, this.mong]) {
        if (p.ranged || p.attackTimer <= 0) continue;
        ctx.save();
        ctx.globalAlpha = clamp(p.attackTimer / 0.18, 0, 1) * 0.8;
        ctx.strokeStyle = p.kind === 'su' ? '#fff3c9' : '#d9fff3';
        ctx.lineWidth = 3;
        ctx.beginPath();
        const cx = p.x + p.w / 2;
        const cy = p.y + 9;
        const a0 = p.dir > 0 ? -0.8 : Math.PI - 0.8;
        const a1 = p.dir > 0 ? 0.8 : Math.PI + 0.8;
        ctx.arc(cx, cy, 19, a0, a1);
        ctx.stroke();
        ctx.restore();
      }

      // 아군 투사체
      for (const pr of level.projectiles) drawProjectile(ctx, pr, this.time);

      // 드롭 아이템
      for (const it of level.dropItems) {
        const bob = Math.sin(this.time * 4 + it.x) * 1.5;
        ctx.save();
        ctx.translate(it.x, it.y + bob);
        if (it.kind === 'power') {
          ctx.fillStyle = 'rgba(255, 224, 102, 0.25)';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.rotate(this.time * 1.2);
          ctx.fillStyle = '#ffe066';
          starPath(ctx, 0, 0, 6, 3, 5, -Math.PI / 2);
          ctx.fill();
          ctx.strokeStyle = '#fff8c9';
          ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255, 107, 138, 0.25)';
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          drawHeart(ctx, 0, 0, 5.5, true);
        }
        ctx.restore();
      }

      ctx.restore();

      // 어둠
      if (level.dark) this.drawDarkness(camX);

      // 화면 밖 캐릭터 표시
      for (const p of [this.su, this.mong]) this.drawEdgeIndicator(p, camX);

      this.drawHUD();
      this.drawBanner();
      this.drawToast();
    }

    drawDarkness(camX) {
      const ctx = this.ctx;
      const d = this.darkCtx;
      d.clearRect(0, 0, VIEW_W, VIEW_H);
      d.fillStyle = 'rgba(2, 4, 14, 0.94)';
      d.fillRect(0, 0, VIEW_W, VIEW_H);
      d.globalCompositeOperation = 'destination-out';

      for (const p of [this.su, this.mong]) {
        const px = p.x + p.w / 2 - camX;
        const py = p.y + p.h / 2;
        const radius = p.kind === 'mong' ? 132 : 58;
        const grad = d.createRadialGradient(px, py, 4, px, py, radius);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(0.6, 'rgba(0,0,0,0.92)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        d.fillStyle = grad;
        d.beginPath();
        d.arc(px, py, radius, 0, Math.PI * 2);
        d.fill();
      }
      d.globalCompositeOperation = 'source-over';

      ctx.drawImage(this.darkCanvas, 0, 0);

      // 스위치와 별은 어둠 위에서도 은은하게 보이게
      for (const sw of this.level.switches) {
        const x = sw.tx * TILE + 8 - camX;
        const y = (sw.ty + 1) * TILE - 11;
        if (x < -10 || x > VIEW_W + 10) continue;
        const color = sw.on ? '#7dffb0' : this.level.switchType === 'mong' ? '#9ef7d8' : '#ffe066';
        ctx.save();
        ctx.globalAlpha = 0.5 + Math.sin(this.time * 4) * 0.25;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (this.level.star) {
        const x = this.level.star.x - camX;
        const y = this.level.star.y;
        ctx.save();
        ctx.globalAlpha = 0.55 + Math.sin(this.time * 3) * 0.25;
        ctx.fillStyle = '#ffe066';
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    drawEdgeIndicator(p, camX) {
      const ctx = this.ctx;
      const sx = p.x + p.w / 2 - camX;
      if (sx >= -6 && sx <= VIEW_W + 6) return;
      const left = sx < 0;
      const y = clamp(p.y + p.h / 2, 28, VIEW_H - 32);
      const x = left ? 8 : VIEW_W - 8;
      const dir = left ? 1 : -1;
      const color = p.kind === 'su' ? '#ff8a7a' : '#9ef7d8';
      const pulse = 0.7 + Math.sin(this.time * 5) * 0.3;

      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.fillStyle = 'rgba(8,10,20,0.7)';
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x + dir * 5, y);
      ctx.lineTo(x - dir * 3, y - 4);
      ctx.lineTo(x - dir * 3, y + 4);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    drawHUD() {
      const ctx = this.ctx;

      // 슈 하트 (왼쪽)
      setFont(ctx, 9);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffb0a3';
      ctx.fillText('슈', 12, 7);
      for (let i = 0; i < this.su.maxHp; i++) {
        drawHeart(ctx, 16 + i * 13, 17, 5, i < this.su.hp);
      }
      if (this.su.ranged) {
        ctx.fillStyle = '#ffe066';
        ctx.fillText('원거리!', 12, 30);
      }

      // 몽이 하트 (오른쪽)
      ctx.textAlign = 'right';
      ctx.fillStyle = '#9ef7d8';
      ctx.fillText('몽이', VIEW_W - 12, 7);
      for (let i = 0; i < this.mong.maxHp; i++) {
        drawHeart(ctx, VIEW_W - 16 - (this.mong.maxHp - 1 - i) * 13, 17, 5, i < this.mong.hp);
      }
      if (this.mong.ranged) {
        ctx.fillStyle = '#ffe066';
        ctx.fillText('원거리!', VIEW_W - 12, 30);
      }

      // 코인
      drawCoin(ctx, VIEW_W / 2 - 16, 20, this.time);
      setFont(ctx, 11);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffe9a8';
      ctx.fillText(String(this.coins), VIEW_W / 2 - 6, 21);

      // 별빛 조각
      for (let i = 0; i < 3; i++) {
        const filled = i < this.stars;
        ctx.save();
        ctx.globalAlpha = filled ? 1 : 0.22;
        ctx.fillStyle = filled ? '#ffe066' : '#ffffff';
        starPath(ctx, VIEW_W / 2 - 16 + i * 17, 44, 6.5, 3, 5, -Math.PI / 2);
        ctx.fill();
        ctx.restore();
      }

      // 보스 HP
      if (this.level.boss) {
        const b = this.level.boss;
        const w = 150;
        const x = (VIEW_W - w) / 2;
        ctx.fillStyle = 'rgba(8,6,18,0.7)';
        roundRect(ctx, x - 2, 56, w + 4, 9, 4);
        ctx.fill();
        ctx.fillStyle = '#3a1f4a';
        roundRect(ctx, x, 58, w, 5, 2.5);
        ctx.fill();
        ctx.fillStyle = '#d06bff';
        roundRect(ctx, x, 58, w * clamp(b.hp / b.maxHp, 0, 1), 5, 2.5);
        ctx.fill();
        setFont(ctx, 8);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e9c7ff';
        ctx.fillText('그림자 정령', VIEW_W / 2, 73);
      }
    }

    drawBanner() {
      if (this.banner <= 0) return;
      const ctx = this.ctx;
      const alpha = Math.min(1, this.banner, (2.6 - this.banner) * 2);
      ctx.save();
      ctx.globalAlpha = clamp(alpha, 0, 1);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setFont(ctx, 14);
      ctx.fillStyle = 'rgba(5,8,16,0.55)';
      roundRect(ctx, 110, 44, 260, 28, 8);
      ctx.fill();
      ctx.fillStyle = '#fff4c9';
      ctx.fillText(`STAGE ${this.levelIndex + 1} · ${this.level.data.name}`, VIEW_W / 2, 58);
      ctx.restore();
    }

    drawToast() {
      if (this.toastTimer <= 0 || !this.toastText) return;
      const ctx = this.ctx;
      const alpha = Math.min(1, this.toastTimer * 2);
      ctx.save();
      ctx.globalAlpha = alpha;
      setFont(ctx, 11);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = Math.min(420, ctx.measureText(this.toastText).width + 28);
      const x = (VIEW_W - w) / 2;
      ctx.fillStyle = 'rgba(6, 9, 20, 0.78)';
      roundRect(ctx, x, VIEW_H - 32, w, 22, 8);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 240, 180, 0.25)';
      ctx.stroke();
      ctx.fillStyle = '#ffeec2';
      ctx.fillText(this.toastText, VIEW_W / 2, VIEW_H - 21);
      ctx.restore();
    }

    drawTitle() {
      const ctx = this.ctx;
      const t = this.time;

      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, '#080b1a');
      g.addColorStop(0.6, '#16233d');
      g.addColorStop(1, '#20384a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      for (let i = 0; i < 60; i++) {
        const x = ((Math.sin(i * 127.1) * 43758.5453) % 1 + 1) % 1 * VIEW_W;
        const y = ((Math.sin(i * 311.7) * 12543.12) % 1 + 1) % 1 * VIEW_H * 0.8;
        const tw = 0.25 + 0.75 * Math.abs(Math.sin(t * 1.4 + i));
        ctx.fillStyle = `rgba(255,255,255,${0.15 + tw * 0.3})`;
        ctx.fillRect(x, y, i % 7 === 0 ? 2 : 1, i % 7 === 0 ? 2 : 1);
      }

      // 달
      ctx.fillStyle = 'rgba(255, 240, 190, 0.16)';
      ctx.beginPath();
      ctx.arc(390, 62, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 246, 210, 0.8)';
      ctx.beginPath();
      ctx.arc(390, 62, 17, 0, Math.PI * 2);
      ctx.fill();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.save();
      ctx.shadowColor = 'rgba(255, 200, 80, 0.85)';
      ctx.shadowBlur = 20;
      setFont(ctx, 34);
      ctx.fillStyle = '#ffe066';
      ctx.fillText('슈와 몽이', VIEW_W / 2, 68);
      ctx.restore();

      setFont(ctx, 14);
      ctx.fillStyle = '#9ef7d8';
      ctx.fillText('별빛 수호대', VIEW_W / 2, 98);

      // 캐릭터
      ctx.save();
      ctx.translate(240, 182);
      ctx.scale(2.3, 2.3);
      const su = { x: -38, y: -22, w: SU_W, h: SU_H, dir: 1, anim: t, onGround: true, vx: 0, attackTimer: 0 };
      const mong = { x: 2, y: -14, w: MONG_W, h: MONG_H, anim: t * 0.8 };
      drawSu(ctx, su, t);
      drawMong(ctx, mong, t);
      ctx.restore();

      const pulse = 0.65 + Math.sin(t * 3) * 0.35;
      ctx.save();
      ctx.globalAlpha = pulse;
      setFont(ctx, 13);
      ctx.fillStyle = '#fff4c9';
      ctx.fillText('Enter / Space 로 시작', VIEW_W / 2, 216);
      ctx.restore();

      setFont(ctx, 10, 'normal');
      ctx.fillStyle = 'rgba(255, 176, 163, 0.9)';
      ctx.fillText('슈(R1P)  ← → 이동 · ↑ 점프 · 오른쪽 Shift 공격', VIEW_W / 2, 238);
      ctx.fillStyle = 'rgba(158, 247, 216, 0.9)';
      ctx.fillText('몽이(P2)  A D 이동 · W 점프(2단·활공) · 왼쪽 Shift 공격', VIEW_W / 2, 254);
      ctx.fillStyle = 'rgba(200, 215, 240, 0.5)';
      ctx.fillText('Esc 일시정지 · 적 위에 떨어지면 밟기! · 상자를 부수면 아이템', VIEW_W / 2, 268);

      setFont(ctx, 9, 'normal');
      ctx.fillStyle = 'rgba(200, 215, 240, 0.35)';
      ctx.fillText('팬 게임 · 2026', VIEW_W / 2, 268);
    }

    drawOverlayPanel(title, lines) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(4, 6, 15, 0.72)';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);

      const w = 342;
      const h = 46 + lines.length * 21 + 24;
      const x = (VIEW_W - w) / 2;
      const y = (VIEW_H - h) / 2;
      ctx.fillStyle = 'rgba(16, 20, 38, 0.92)';
      roundRect(ctx, x, y, w, h, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 224, 120, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      setFont(ctx, 18);
      ctx.fillStyle = '#ffe066';
      ctx.fillText(title, VIEW_W / 2, y + 34);

      setFont(ctx, 11, 'normal');
      ctx.fillStyle = '#d8e2f2';
      lines.forEach((line, i) => {
        ctx.fillText(line, VIEW_W / 2, y + 66 + i * 21);
      });
    }

    drawPause() {
      this.drawOverlayPanel('일시정지', [
        'Esc : 계속하기',
        'R : 스테이지 재시작',
      ]);
    }

    drawStageClear() {
      const next = LEVELS[this.levelIndex + 1];
      this.drawOverlayPanel('별빛 조각 획득!', [
        `${this.level.data.name} 클리어`,
        `다음: ${next ? next.name : ''}`,
        'Enter : 계속',
      ]);
    }

    drawEnding() {
      const ctx = this.ctx;
      this.drawOverlayPanel('별등이 다시 빛났다!', [
        `별빛 조각 ${this.stars} / 3`,
        `모은 코인 ${this.coins}개`,
        `플레이 시간 ${Math.floor(this.playTime / 60)}분 ${Math.floor(this.playTime % 60)}초`,
        'Enter : 처음으로',
      ]);

      // 반짝이
      for (let i = 0; i < 18; i++) {
        const x = 60 + ((Math.sin(i * 77.7) * 43758.5) % 1 + 1) % 1 * 360;
        const y = 40 + ((Math.sin(i * 33.3) * 12543.1) % 1 + 1) % 1 * 200;
        ctx.save();
        ctx.globalAlpha = 0.4 + Math.sin(this.time * 3 + i) * 0.3;
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(x, y, 2, 2);
        ctx.restore();
      }
    }
  }

  window.Game = Game;
})();
