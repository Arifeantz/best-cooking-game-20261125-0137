// Everything on screen, drawn in code on one canvas: the night-market stall, the order
// board, the ingredient counter, the chopping board, the wok, the plate and every screen.
// No image assets anywhere — every dish is drawn from shapes.
import {
  FIELD, INGREDIENTS, LAYOUT, PALETTE, FONT, ingredientById, recipeById,
} from './config.js';
import { isReady } from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, weight, align) {
  ctx.fillStyle = color;
  ctx.font = `${weight ?? 700} ${size}px ${FONT}`;
  ctx.textAlign = align ?? 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function rupiah(value) {
  return `Rp${Math.round(value).toLocaleString('en-US')}`;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** One ingredient, drawn from shapes. `stage` tints it: chopped = cut pieces, cooked = golden. */
export function drawIngredient(ctx, id, x, y, size, stage) {
  const s = size;
  ctx.save();
  ctx.translate(x, y);
  if (stage === 'cooked') {
    ctx.fillStyle = 'rgba(242, 201, 76, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.62, 0, Math.PI * 2);
    ctx.fill();
  }
  switch (id) {
    case 'nasi': {
      ctx.fillStyle = '#f5f0dc';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.08, s * 0.48, s * 0.34, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#e8e0c0';
      for (let i = 0; i < 5; i += 1) {
        ctx.beginPath();
        ctx.arc(-s * 0.28 + i * s * 0.14, -s * 0.12 + (i % 2) * s * 0.08, s * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'mie': {
      ctx.strokeStyle = '#f2c94c';
      ctx.lineWidth = s * 0.09;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-s * 0.4, -s * 0.25 + i * s * 0.25);
        ctx.bezierCurveTo(-s * 0.15, -s * 0.4 + i * s * 0.25, s * 0.15, -s * 0.1 + i * s * 0.25, s * 0.4, -s * 0.25 + i * s * 0.25);
        ctx.stroke();
      }
      break;
    }
    case 'telur': {
      ctx.fillStyle = '#fff8e7';
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.5, s * 0.36, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f6a821';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd970';
      ctx.beginPath();
      ctx.arc(-s * 0.05, -s * 0.05, s * 0.1, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'ayam': {
      ctx.fillStyle = '#e8a06a';
      ctx.beginPath();
      ctx.ellipse(-s * 0.08, -s * 0.05, s * 0.38, s * 0.3, -0.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f5f0dc';
      ctx.lineWidth = s * 0.12;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(s * 0.22, s * 0.18);
      ctx.lineTo(s * 0.48, s * 0.42);
      ctx.stroke();
      ctx.fillStyle = '#d98a4e';
      ctx.beginPath();
      ctx.arc(-s * 0.2, -s * 0.18, s * 0.07, 0, Math.PI * 2);
      ctx.arc(s * 0.02, -s * 0.2, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'sate': {
      ctx.strokeStyle = '#d9c49a';
      ctx.lineWidth = s * 0.07;
      ctx.beginPath();
      ctx.moveTo(-s * 0.5, 0);
      ctx.lineTo(s * 0.5, 0);
      ctx.stroke();
      ctx.fillStyle = '#c97b3d';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.arc(-s * 0.28 + i * s * 0.28, 0, s * 0.17, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8a4f1e';
      ctx.beginPath();
      ctx.arc(-s * 0.28, -s * 0.05, s * 0.05, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.05, s * 0.05, 0, Math.PI * 2);
      ctx.arc(s * 0.28, -s * 0.05, s * 0.05, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'bawang': {
      ctx.fillStyle = '#c9a0dc';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.05, s * 0.34, s * 0.38, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9a6fb0';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.32);
      ctx.quadraticCurveTo(s * 0.1, -s * 0.5, s * 0.02, -s * 0.58);
      ctx.stroke();
      ctx.strokeStyle = '#e8d5f2';
      ctx.beginPath();
      ctx.arc(0, s * 0.05, s * 0.2, 0.3, Math.PI * 1.4);
      ctx.stroke();
      break;
    }
    case 'cabai': {
      ctx.strokeStyle = '#e5534b';
      ctx.lineWidth = s * 0.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.2);
      ctx.quadraticCurveTo(0, s * 0.45, s * 0.38, -s * 0.3);
      ctx.stroke();
      ctx.strokeStyle = '#58b368';
      ctx.lineWidth = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(s * 0.38, -s * 0.3);
      ctx.lineTo(s * 0.5, -s * 0.45);
      ctx.stroke();
      break;
    }
    case 'sayur': {
      ctx.fillStyle = '#58b368';
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.ellipse(-s * 0.28 + i * s * 0.28, -s * 0.05, s * 0.2, s * 0.34, (i - 1) * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#3d8a4c';
      ctx.lineWidth = s * 0.05;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.3);
      ctx.lineTo(0, s * 0.48);
      ctx.stroke();
      break;
    }
    case 'kecap': {
      ctx.fillStyle = '#5b3a1e';
      roundRect(ctx, -s * 0.2, -s * 0.35, s * 0.4, s * 0.7, s * 0.08);
      ctx.fill();
      ctx.fillStyle = '#3a2410';
      roundRect(ctx, -s * 0.12, -s * 0.52, s * 0.24, s * 0.2, s * 0.05);
      ctx.fill();
      ctx.fillStyle = '#f2c94c';
      ctx.fillRect(-s * 0.2, -s * 0.05, s * 0.4, s * 0.22);
      break;
    }
    default:
      break;
  }
  if (stage === 'chopped') {
    // Cut pieces: three small chunks of the same food beside the main piece.
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [dx, dy] of [[-0.42, 0.32], [0.42, 0.3], [0.05, -0.44]]) {
      ctx.beginPath();
      ctx.arc(dx * s, dy * s, s * 0.11, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawSteam(ctx, x, y, time) {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const phase = (time * 0.9 + i * 0.33) % 1;
    const sx = x - 36 + i * 36 + Math.sin(phase * 6 + i) * 8;
    const sy = y - phase * 46;
    ctx.globalAlpha = 0.55 * (1 - phase);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(sx + 10, sy - 14, sx - 4, sy - 26);
    ctx.stroke();
  }
  ctx.restore();
}

function drawOrderTicket(ctx, order, x, y, width, height, time) {
  const recipe = recipeById(order.recipe);
  const urgent = order.timeLeft < 12;
  const fraction = Math.max(0, order.timeLeft / order.total);
  ctx.save();
  ctx.fillStyle = '#fff8e7';
  roundRect(ctx, x, y, width, height, 10);
  ctx.fill();
  ctx.strokeStyle = urgent && Math.floor(time * 4) % 2 === 0 ? '#e5534b' : '#d9c49a';
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, `#${order.id} ${recipe.name}`, x + 12, y + 18, 17, '#3a2410', 800);
  text(ctx, rupiah(recipe.price), x + width - 12, y + 18, 15, '#8a5a2b', 800, 'right');
  const iconSize = 28;
  const gap = (width - 24 - recipe.needs.length * iconSize) / Math.max(1, recipe.needs.length - 1);
  recipe.needs.forEach((ing, index) => {
    const ix = x + 12 + iconSize / 2 + index * (iconSize + gap);
    drawIngredient(ctx, ing, ix, y + 52, iconSize, 'raw');
  });
  text(ctx, `${Math.ceil(order.timeLeft)}s left`, x + 12, y + 86, 14, urgent ? '#e5534b' : '#8a5a2b', 800);
  ctx.fillStyle = '#e8dcc0';
  roundRect(ctx, x + 12, y + height - 14, width - 24, 8, 4);
  ctx.fill();
  ctx.fillStyle = urgent ? '#e5534b' : '#58b368';
  roundRect(ctx, x + 12, y + height - 14, (width - 24) * fraction, 8, 4);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let pointer = { x: 640, y: 300 };
  let time = 0;

  function setPointer(x, y) { pointer = { x, y }; }

  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    sky.addColorStop(0, PALETTE.sky);
    sky.addColorStop(0.45, '#3d2466');
    sky.addColorStop(1, '#1a1033');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // String lights across the top of the stall.
    ctx.strokeStyle = '#0f0a1f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.quadraticCurveTo(640, 66, 1280, 30);
    ctx.stroke();
    const bulbColors = ['#f2c94c', '#ff8a5c', '#58b368', '#4fc3f7'];
    for (let i = 0; i < 16; i += 1) {
      const bx = 40 + i * 78;
      const by = 30 + Math.sin((bx / 1280) * Math.PI) * 34 + 8;
      ctx.fillStyle = bulbColors[i % bulbColors.length];
      ctx.beginPath();
      ctx.arc(bx, by, 7 + Math.sin(time * 2 + i) * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(242, 201, 76, 0.18)';
      ctx.beginPath();
      ctx.arc(bx, by, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    // Stall awning.
    for (let i = 0; i < 10; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? PALETTE.awningRed : PALETTE.awningCream;
      ctx.fillRect(i * 128, 54, 128, 22);
    }
    ctx.fillStyle = PALETTE.stallWoodDark;
    ctx.fillRect(0, 76, FIELD.width, 6);
    // Distant night-market silhouettes, kept low and dark so they never read as UI.
    ctx.fillStyle = 'rgba(20, 10, 40, 0.55)';
    ctx.fillRect(0, 620, FIELD.width, 100);
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(15, 8, 30, 0.85)';
    ctx.fillRect(0, 0, FIELD.width, LAYOUT.hud.height);
    text(ctx, 'WOKFIRE ALLEY', 24, 29, 26, PALETTE.gold, 900);
    text(ctx, 'Night-Market Cooking Rush', 268, 31, 15, PALETTE.muted, 600);
    text(ctx, `SCORE ${rupiah(state.score)}`, 560, 18, 22, PALETTE.text, 800);
    const progress = Math.min(1, state.score / state.target);
    ctx.fillStyle = '#3a2a5e';
    roundRect(ctx, 560, 30, 220, 8, 4);
    ctx.fill();
    ctx.fillStyle = PALETTE.gold;
    roundRect(ctx, 560, 30, 220 * progress, 8, 4);
    ctx.fill();
    text(ctx, `target ${rupiah(state.target)}`, 560, 52, 12, PALETTE.muted, 600);
    text(ctx, `⏱ ${formatTime(state.shiftLeft)}`, 830, 29, 24, state.shiftLeft < 30 ? '#ff8a5c' : PALETTE.text, 800);
    text(ctx, `WAVE ${state.wave}`, 950, 29, 20, PALETTE.text, 800);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < 3 - state.fails ? '#ff5c7a' : 'rgba(255,255,255,0.18)';
      ctx.beginPath();
      ctx.arc(1060 + i * 30, 28, 11, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, '♥', 1060 + i * 30, 29, 14, '#fff', 800, 'center');
    }
    text(ctx, `served ${state.served}`, 1256, 22, 15, PALETTE.muted, 700, 'right');
    text(ctx, state.combo > 1 ? `COMBO x${state.combo} 🔥` : 'best ' + rupiah(best), 1256, 42, 15, state.combo > 1 ? '#ff8a5c' : PALETTE.muted, 800, 'right');
  }

  function drawOrders(state) {
    text(ctx, 'ORDER BOARD', 24, LAYOUT.orders.y - 6, 13, PALETTE.muted, 800);
    if (state.orders.length === 0) {
      text(ctx, 'No orders yet — the night is young…', 24, 150, 18, PALETTE.muted, 600);
      return;
    }
    state.orders.forEach((order, index) => {
      const x = LAYOUT.orders.x + index * (LAYOUT.orders.width + LAYOUT.orders.gap);
      drawOrderTicket(ctx, order, x, LAYOUT.orders.y, LAYOUT.orders.width, LAYOUT.orders.height, time);
    });
  }

  function drawBins(state) {
    text(ctx, 'INGREDIENTS — click or press 1–9', 24, LAYOUT.bins.y - 6, 13, PALETTE.muted, 800);
    INGREDIENTS.forEach((ing, index) => {
      const x = LAYOUT.bins.x + index * (LAYOUT.bins.width + LAYOUT.bins.gap);
      const y = LAYOUT.bins.y;
      const inHand = state.hand?.ing === ing.id;
      ctx.fillStyle = inHand ? '#5a3d1e' : PALETTE.counter;
      roundRect(ctx, x, y, LAYOUT.bins.width, LAYOUT.bins.height, 12);
      ctx.fill();
      ctx.strokeStyle = inHand ? PALETTE.gold : '#6b4423';
      ctx.lineWidth = inHand ? 4 : 2;
      ctx.stroke();
      drawIngredient(ctx, ing.id, x + LAYOUT.bins.width / 2, y + 40, 52, 'raw');
      text(ctx, ing.name, x + LAYOUT.bins.width / 2, y + 78, 15, PALETTE.text, 700, 'center');
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 11, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, ing.key, x + 16, y + 17, 12, '#fff', 800, 'center');
      const tag = ing.chop > 0 && ing.cook > 0 ? '✂+🔥' : ing.chop > 0 ? '✂ chop' : ing.cook > 0 ? '🔥 wok' : 'raw';
      text(ctx, tag, x + LAYOUT.bins.width - 8, y + 16, 11, PALETTE.muted, 700, 'right');
    });
  }

  function drawBoard(state) {
    const r = LAYOUT.board;
    text(ctx, 'CHOPPING BOARD  (Space / click to chop)', r.x, r.y - 12, 13, PALETTE.muted, 800);
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, r.x, r.y, r.width, r.height, 14);
    ctx.fill();
    ctx.fillStyle = PALETTE.board;
    roundRect(ctx, r.x + 24, r.y + 30, r.width - 48, r.height - 70, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(r.x + 24 + i * (r.width - 48) / 4, r.y + 40);
      ctx.lineTo(r.x + 24 + i * (r.width - 48) / 4, r.y + r.height - 50);
      ctx.stroke();
    }
    if (state.board) {
      const def = ingredientById(state.board.ing);
      drawIngredient(ctx, state.board.ing, r.x + r.width / 2, r.y + r.height / 2 - 8, 96, 'chopped');
      text(ctx, `${state.board.hits} / ${def.chop} chops`, r.x + r.width / 2, r.y + r.height - 24, 17, '#3a2410', 800, 'center');
      // The knife, mid-chop: a silver blade with a pointed tip and a dark handle.
      const bob = Math.sin(time * 10) * 6;
      ctx.save();
      ctx.translate(r.x + r.width / 2 + 66, r.y + 52 + bob);
      ctx.rotate(-0.55);
      ctx.fillStyle = '#c8ccd4';
      ctx.beginPath();
      ctx.moveTo(-5, -30);
      ctx.lineTo(5, -30);
      ctx.lineTo(5, 8);
      ctx.lineTo(0, 20);
      ctx.lineTo(-5, 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#3a2410';
      roundRect(ctx, -6, -48, 12, 20, 4);
      ctx.fill();
      ctx.restore();
    } else {
      text(ctx, 'drop something to chop here', r.x + r.width / 2, r.y + r.height / 2, 16, '#7a5a35', 600, 'center');
    }
  }

  function drawWok(state) {
    const r = LAYOUT.wok;
    text(ctx, 'WOK  (click to put in / take out — watch the burn!)', r.x, r.y - 12, 13, PALETTE.muted, 800);
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, r.x, r.y, r.width, r.height, 14);
    ctx.fill();
    // Burner glow.
    const cooking = !!state.wok;
    ctx.fillStyle = cooking ? '#ff7a2a' : '#4a2c14';
    ctx.beginPath();
    ctx.ellipse(r.x + r.width / 2, r.y + 150, 110, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    // The wok bowl.
    ctx.fillStyle = PALETTE.wokIron;
    ctx.beginPath();
    ctx.ellipse(r.x + r.width / 2, r.y + 118, 128, 52, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3038';
    ctx.beginPath();
    ctx.ellipse(r.x + r.width / 2, r.y + 112, 112, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    if (state.wok) {
      const def = ingredientById(state.wok.ing);
      const burnt = state.wok.cookTime >= def.burn;
      const done = state.wok.cookTime >= def.cook;
      drawIngredient(ctx, state.wok.ing, r.x + r.width / 2, r.y + 108, 84, done ? 'cooked' : 'raw');
      if (burnt) {
        text(ctx, 'BURNT!', r.x + r.width / 2, r.y + 60, 22, '#ff5c4d', 900, 'center');
      } else {
        drawSteam(ctx, r.x + r.width / 2, r.y + 80, time);
      }
      const fraction = Math.min(1, state.wok.cookTime / def.cook);
      ctx.fillStyle = '#241a3d';
      roundRect(ctx, r.x + 40, r.y + r.height - 46, r.width - 80, 16, 8);
      ctx.fill();
      ctx.fillStyle = burnt ? '#e5534b' : done ? PALETTE.green : PALETTE.gold;
      roundRect(ctx, r.x + 40, r.y + r.height - 46, (r.width - 80) * fraction, 16, 8);
      ctx.fill();
      text(ctx, burnt ? 'ruined — click to toss it' : done ? 'READY — click to take it out!' : `cooking… ${Math.ceil(def.cook - state.wok.cookTime)}s`, r.x + r.width / 2, r.y + r.height - 18, 15, done || burnt ? '#fff' : PALETTE.muted, 800, 'center');
    } else {
      text(ctx, 'empty wok — fire it up!', r.x + r.width / 2, r.y + 112, 16, '#c9b8e8', 600, 'center');
    }
  }

  function drawPlate(state) {
    const r = LAYOUT.plate;
    text(ctx, 'PLATE  (click with a ready dish to add it)', r.x, r.y - 12, 13, PALETTE.muted, 800);
    ctx.fillStyle = PALETTE.counterTop;
    roundRect(ctx, r.x, r.y, r.width, r.height, 14);
    ctx.fill();
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath();
    ctx.ellipse(r.x + r.width / 2, r.y + r.height / 2 + 6, 118, 84, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9c49a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(r.x + r.width / 2, r.y + r.height / 2 + 6, 96, 66, 0, 0, Math.PI * 2);
    ctx.stroke();
    if (state.plate.length === 0) {
      text(ctx, 'empty plate', r.x + r.width / 2, r.y + r.height / 2 + 6, 16, '#a89a7a', 600, 'center');
    } else {
      state.plate.forEach((ing, index) => {
        const angle = -0.6 + index * 0.55;
        const px = r.x + r.width / 2 + Math.cos(angle) * 44;
        const py = r.y + r.height / 2 + 6 + Math.sin(angle) * 26;
        drawIngredient(ctx, ing, px, py, 56, 'cooked');
      });
    }
    // Match hint: which order this plate could serve.
    const match = state.orders.find((order) => {
      const recipe = recipeById(order.recipe);
      return recipe.needs.length === state.plate.length
        && recipe.needs.every((ing) => state.plate.includes(ing));
    });
    if (match) {
      text(ctx, `✓ matches #${match.id} ${recipeById(match.recipe).name} — SERVE!`, r.x + r.width / 2, r.y + r.height - 16, 16, PALETTE.green, 800, 'center');
    } else if (state.plate.length > 0) {
      text(ctx, 'keep building — check the tickets', r.x + r.width / 2, r.y + r.height - 16, 15, PALETTE.muted, 600, 'center');
    }
    // Serve button.
    const s = LAYOUT.serve;
    const ready = !!match;
    ctx.fillStyle = ready ? PALETTE.green : '#4a3570';
    roundRect(ctx, s.x, s.y, s.width, s.height, 12);
    ctx.fill();
    ctx.strokeStyle = ready ? '#8ae0a0' : '#6b4f9e';
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, ready ? '🍽  SERVE IT!  (Enter)' : 'SERVE  (Enter)', s.x + s.width / 2, s.y + s.height / 2 + 1, 24, '#fff', 900, 'center');
    // Trash bin.
    const t = LAYOUT.trash;
    ctx.fillStyle = '#4a3570';
    roundRect(ctx, t.x, t.y, t.width, t.height, 8);
    ctx.fill();
    text(ctx, '🗑', t.x + t.width / 2, t.y + t.height / 2 + 1, 20, '#fff', 800, 'center');
  }

  function drawHand(state) {
    if (!state.hand) return;
    const def = ingredientById(state.hand.ing);
    const stageLabel = isReady(state.hand) ? 'READY' : state.hand.stage.toUpperCase();
    ctx.save();
    ctx.globalAlpha = 0.95;
    ctx.fillStyle = 'rgba(15, 8, 30, 0.9)';
    roundRect(ctx, pointer.x - 70, pointer.y - 66, 140, 52, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    drawIngredient(ctx, state.hand.ing, pointer.x, pointer.y - 40, 40, state.hand.stage);
    text(ctx, `${def.name} · ${stageLabel}`, pointer.x, pointer.y - 24, 12, PALETTE.text, 700, 'center');
    ctx.restore();
  }

  function drawHint() {
    ctx.fillStyle = 'rgba(15, 8, 30, 0.85)';
    ctx.fillRect(0, LAYOUT.hint.y, FIELD.width, LAYOUT.hint.height);
    text(ctx, '1–9 pick ingredient   •   B / click board to chop   •   W / click wok to cook   •   A / click plate to add   •   Enter serve   •   T trash   •   Esc pause', 640, LAYOUT.hint.y + 26, 16, PALETTE.muted, 600, 'center');
  }

  function drawFlash(state) {
    if (state.flashTime > 0 && state.flash) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.flashTime);
      text(ctx, state.flash, 640, 318, 30, PALETTE.gold, 900, 'center');
      ctx.restore();
    }
  }

  function overlay(title, lines, accent) {
    const boxHeight = 210 + lines.length * 34;
    ctx.fillStyle = 'rgba(12, 6, 26, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, 290, 130, 700, boxHeight, 20);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 3;
    ctx.stroke();
    text(ctx, title, 640, 190, 44, accent, 900, 'center');
    lines.forEach((line, index) => {
      text(ctx, line.text, 640, 250 + index * 34, line.size ?? 19, line.color ?? PALETTE.text, line.weight ?? 600, 'center');
    });
    text(ctx, 'Click or press Enter', 640, 250 + lines.length * 34 + 30, 18, PALETTE.muted, 700, 'center');
  }

  function draw(state, screen, best, dt) {
    time += dt ?? 0.016;
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    drawBackground();
    drawHud(state, best);
    drawOrders(state);
    drawBins(state);
    drawBoard(state);
    drawWok(state);
    drawPlate(state);
    drawHint();
    drawFlash(state);
    drawHand(state);
    if (screen === SCREEN_TITLE) {
      ctx.fillStyle = 'rgba(12, 6, 26, 0.55)';
      ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      text(ctx, 'WOKFIRE ALLEY', 640, 210, 72, PALETTE.gold, 900, 'center');
      text(ctx, 'Night-Market Cooking Rush', 640, 268, 30, PALETTE.text, 700, 'center');
      text(ctx, 'Run the busiest street-food stall in town: take orders, chop, wok, plate — and serve before the timer runs out.', 640, 320, 19, PALETTE.muted, 600, 'center');
      text(ctx, 'Earn Rp120.000 before closing time. Three failed orders ends the shift.', 640, 352, 19, PALETTE.muted, 600, 'center');
      text(ctx, '5 recipes  •  rush waves  •  tips & combos  •  keyboard, mouse & touch', 640, 396, 18, PALETTE.text, 700, 'center');
      text(ctx, best > 0 ? `Best score: ${rupiah(best)}` : 'Your first shift awaits…', 640, 440, 18, PALETTE.gold, 700, 'center');
      const pulse = 0.65 + Math.sin(time * 3) * 0.35;
      ctx.save();
      ctx.globalAlpha = pulse;
      text(ctx, '▶  CLICK OR PRESS ENTER TO START  ◀', 640, 500, 24, '#fff', 900, 'center');
      ctx.restore();
    } else if (screen === SCREEN_PAUSED) {
      overlay('PAUSED', [{ text: 'The wok is still warm. Take a breath.' }], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      const won = state.won;
      overlay(won ? 'SHIFT COMPLETE! 🎉' : 'SHIFT OVER', [
        { text: won ? 'You beat the target — the alley is buzzing about your stall!' : state.overReason || 'The night got the better of you.', size: 19 },
        { text: `Score: ${rupiah(state.score)}   •   Dishes served: ${state.served}   •   Best combo: x${state.bestCombo}`, size: 20, color: PALETTE.gold, weight: 800 },
        { text: won ? `Target ${rupiah(state.target)} beaten with ${formatTime(state.shiftLeft)} to spare.` : `Target was ${rupiah(state.target)} — so close. Try a faster route through the kitchen!`, size: 17, color: PALETTE.muted },
      ], won ? PALETTE.gold : '#ff8a5c');
    }
  }

  return { draw, setPointer };
}
