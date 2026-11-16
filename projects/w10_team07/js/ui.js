/* 캔버스 UI 헬퍼 */
(function () {
  'use strict';

  const DATA = window.GameData;
  const FONT = '"Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", sans-serif';

  function roundRectPath(ctx, x, y, w, h, r) {
    const radius = Math.max(0, Math.min(r == null ? 6 : r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function text(ctx, str, x, y, options) {
    const o = options || {};
    const size = o.size || 10;
    const weight = o.weight || 700;
    ctx.save();
    ctx.globalAlpha *= (o.alpha == null ? 1 : o.alpha);
    ctx.font = weight + ' ' + size + 'px ' + FONT;
    ctx.textAlign = o.align || 'left';
    ctx.textBaseline = o.baseline || 'middle';
    if (o.outline) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = o.outlineWidth || 3;
      ctx.strokeStyle = o.outline;
      ctx.strokeText(str, x, y);
    }
    if (o.shadow) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillText(str, x + 1, y + 1);
    }
    ctx.fillStyle = o.color || '#ffffff';
    ctx.fillText(str, x, y);
    ctx.restore();
  }

  function wrapText(ctx, str, x, y, maxWidth, lineHeight, options) {
    const o = options || {};
    const words = str.split(' ');
    let line = '';
    let cy = y;
    for (let i = 0; i < words.length; i += 1) {
      const test = line ? line + ' ' + words[i] : words[i];
      ctx.save();
      ctx.font = (o.weight || 700) + ' ' + (o.size || 10) + 'px ' + FONT;
      const width = ctx.measureText(test).width;
      ctx.restore();
      if (width > maxWidth && line) {
        text(ctx, line, x, cy, o);
        line = words[i];
        cy += lineHeight;
      } else {
        line = test;
      }
    }
    if (line) text(ctx, line, x, cy, o);
    return cy;
  }

  function panel(ctx, x, y, w, h, options) {
    const o = options || {};
    const r = o.radius == null ? 8 : o.radius;
    ctx.save();
    if (o.shadow !== false) {
      roundRectPath(ctx, x, y + 2, w, h, r);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fill();
    }
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = o.fill || 'rgba(20,24,42,0.92)';
    ctx.fill();
    ctx.strokeStyle = o.stroke || 'rgba(255,255,255,0.14)';
    ctx.lineWidth = o.lineWidth || 1.5;
    ctx.stroke();
    if (o.accent) {
      ctx.save();
      roundRectPath(ctx, x, y, w, h, r);
      ctx.clip();
      ctx.fillStyle = o.accent;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(x, y, w, 3);
      ctx.restore();
    }
    ctx.restore();
  }

  function button(ctx, rect, label, options) {
    const o = options || {};
    const r = o.radius == null ? 7 : o.radius;
    const disabled = !!o.disabled;
    const selected = !!o.selected;
    const hover = !!o.hover;
    let fill = o.fill || '#2a3150';
    if (disabled) fill = '#222536';
    else if (selected) fill = o.selectedFill || '#4c5d96';
    else if (hover) fill = o.hoverFill || '#3a446c';

    ctx.save();
    if (!disabled) {
      roundRectPath(ctx, rect.x, rect.y + 2, rect.w, rect.h, r);
      ctx.fillStyle = 'rgba(0,0,0,0.28)';
      ctx.fill();
    }
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
    ctx.fillStyle = fill;
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(255,209,102,0.55)';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = disabled ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    if (!disabled) {
      ctx.save();
      roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, r);
      ctx.clip();
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(rect.x, rect.y, rect.w, 1);
      ctx.restore();
    }
    ctx.restore();

    text(ctx, label, rect.x + rect.w / 2, rect.y + rect.h / 2 + (o.sub ? -5 : 0), {
      size: o.size || 11,
      color: disabled ? '#767b91' : (o.textColor || '#ffffff'),
      align: 'center',
      weight: 800
    });
    if (o.sub) {
      text(ctx, o.sub, rect.x + rect.w / 2, rect.y + rect.h / 2 + 8, {
        size: 7.5,
        color: disabled ? '#666b80' : 'rgba(255,255,255,0.62)',
        align: 'center',
        weight: 600
      });
    }
  }

  function typeName(type) {
    return DATA.TYPES[type] ? DATA.TYPES[type].name : type;
  }

  function typeBadge(ctx, type, x, y, options) {
    const o = options || {};
    const info = DATA.TYPES[type] || DATA.TYPES.normal;
    const scale = o.scale || 1;
    const w = (o.w || 30) * scale;
    const h = (o.h || 14) * scale;
    ctx.save();
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = info.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
    text(ctx, info.name, x + w / 2, y + h / 2 + 0.5, {
      size: (o.size || 9) * scale,
      color: info.text,
      align: 'center',
      weight: 800
    });
    ctx.restore();
  }

  function hpBar(ctx, x, y, w, h, ratio, options) {
    const o = options || {};
    const r = o.radius == null ? h / 2 : o.radius;
    const clamped = Math.max(0, Math.min(1, ratio));
    ctx.save();
    roundRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = o.bg || '#1a1d2c';
    ctx.fill();
    if (clamped > 0) {
      const color = clamped > 0.5 ? '#58d16a' : (clamped > 0.25 ? '#f2c94c' : '#eb5757');
      ctx.save();
      roundRectPath(ctx, x, y, w, h, r);
      ctx.clip();
      ctx.fillStyle = o.color || color;
      ctx.fillRect(x, y, w * clamped, h);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.fillRect(x, y, w * clamped, Math.max(1, h * 0.32));
      ctx.restore();
    }
    roundRectPath(ctx, x, y, w, h, r);
    ctx.strokeStyle = o.border || 'rgba(0,0,0,0.45)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  function statBar(ctx, x, y, w, h, ratio, color) {
    ctx.save();
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = 'rgba(10,12,20,0.45)';
    ctx.fill();
    const clamped = ratio <= 0 ? 0 : Math.max(0.04, Math.min(1, ratio));
    ctx.save();
    roundRectPath(ctx, x, y, w, h, h / 2);
    ctx.clip();
    ctx.fillStyle = color || '#7f9cff';
    ctx.fillRect(x, y, w * clamped, h);
    ctx.restore();
    ctx.restore();
  }

  function dim(ctx, alpha) {
    ctx.save();
    ctx.fillStyle = 'rgba(5,7,14,' + (alpha == null ? 0.62 : alpha) + ')';
    ctx.fillRect(0, 0, 480, 270);
    ctx.restore();
  }

  function iconButton(ctx, rect, kind, options) {
    const o = options || {};
    const hover = !!o.hover;
    ctx.save();
    roundRectPath(ctx, rect.x, rect.y, rect.w, rect.h, 7);
    ctx.fillStyle = hover ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.07)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1;
    ctx.stroke();
    const cx = rect.x + rect.w / 2;
    const cy = rect.y + rect.h / 2;
    ctx.strokeStyle = o.color || '#dfe5ff';
    ctx.fillStyle = o.color || '#dfe5ff';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (kind === 'sound' || kind === 'mute') {
      const on = kind === 'sound';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 2);
      ctx.lineTo(cx - 3, cy - 2);
      ctx.lineTo(cx + 1, cy - 6);
      ctx.lineTo(cx + 1, cy + 6);
      ctx.lineTo(cx - 3, cy + 2);
      ctx.lineTo(cx - 6, cy + 2);
      ctx.closePath();
      ctx.fill();
      if (on) {
        ctx.beginPath();
        ctx.arc(cx + 2, cy, 5, -0.9, 0.9);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx + 2, cy, 8, -0.8, 0.8);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.moveTo(cx + 3, cy - 4);
        ctx.lineTo(cx + 9, cy + 4);
        ctx.moveTo(cx + 9, cy - 4);
        ctx.lineTo(cx + 3, cy + 4);
        ctx.stroke();
      }
    } else if (kind === 'reset') {
      ctx.beginPath();
      ctx.arc(cx, cy, 6, -0.2, Math.PI * 1.45);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx + 5.5, cy - 5);
      ctx.lineTo(cx + 7.5, cy + 0.5);
      ctx.lineTo(cx + 2, cy - 0.5);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 'lock') {
      ctx.beginPath();
      ctx.rect(cx - 5, cy - 2, 10, 8);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - 2, 3.5, Math.PI, 0);
      ctx.stroke();
    } else if (kind === 'check') {
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy);
      ctx.lineTo(cx - 1.5, cy + 4.5);
      ctx.lineTo(cx + 6, cy - 5);
      ctx.stroke();
    }
    ctx.restore();
  }

  function easeOutCubic(t) {
    const x = Math.max(0, Math.min(1, t));
    return 1 - Math.pow(1 - x, 3);
  }

  window.UI = {
    FONT,
    roundRectPath,
    text,
    wrapText,
    panel,
    button,
    typeName,
    typeBadge,
    hpBar,
    statBar,
    dim,
    iconButton,
    easeOutCubic
  };
})();
