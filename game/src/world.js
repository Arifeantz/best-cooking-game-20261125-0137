// The game's rules and state, with no drawing and no browser in it: orders, the hand, the
// chopping board, the wok, the plate, scoring with tips and combos, waves, and the win/lose
// conditions. step() advances one fixed step and returns what happened as bit flags, so the
// caller can react (and play sounds) without the world knowing about screens or sound.
import {
  FIELD, MAX_FAILS, SHIFT_SECONDS, TARGET_RUPIAH, WAVE_SECONDS,
  ingredientById, maxConcurrentFor, orderTimeFor, recipeById, spawnIntervalFor,
  unlockedRecipes,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_CHOP = 2;
export const EVENT_CHOP_DONE = 4;
export const EVENT_COOK_START = 8;
export const EVENT_COOK_DONE = 16;
export const EVENT_BURN = 32;
export const EVENT_PLATE = 64;
export const EVENT_SERVE = 128;
export const EVENT_TIP = 256;
export const EVENT_EXPIRE = 512;
export const EVENT_ERROR = 1024;
export const EVENT_WIN = 2048;
export const EVENT_OVER = 4096;
export const EVENT_SPAWN = 8192;

/** An item in the hand, on the board or in the wok: { ing, stage, hits, cookTime }.
 *  stage is 'raw', 'chopped' or 'cooked'; 'ready' is derived, never stored. */
export function makeItem(ing) {
  return { ing, stage: 'raw', hits: 0, cookTime: 0 };
}

/** True once the item has had every step its ingredient needs. */
export function isReady(item) {
  if (!item) return false;
  const def = ingredientById(item.ing);
  if (def.chop > 0 && item.stage === 'raw') return false;
  if (def.cook > 0 && item.stage !== 'cooked') return false;
  return true;
}

function sameSet(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

export function createWorld(random) {
  const state = {
    score: 0, served: 0, fails: 0, combo: 0, bestCombo: 0,
    wave: 1, elapsed: 0, shiftLeft: SHIFT_SECONDS, target: TARGET_RUPIAH,
    orders: [], hand: null, board: null, wok: null, plate: [],
    spawnTimer: 2, nextOrderId: 1, won: false, over: false, overReason: '',
    flash: '', flashTime: 0,
  };

  function reset() {
    state.score = 0;
    state.served = 0;
    state.fails = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.wave = 1;
    state.elapsed = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.orders = [];
    state.hand = null;
    state.board = null;
    state.wok = null;
    state.plate = [];
    state.spawnTimer = 2;
    state.nextOrderId = 1;
    state.won = false;
    state.over = false;
    state.overReason = '';
    state.flash = '';
    state.flashTime = 0;
    spawnOrder();
  }

  function spawnOrder() {
    const pool = unlockedRecipes(state.wave);
    const recipe = pool[Math.floor(random() * pool.length)];
    const time = orderTimeFor(state.wave);
    state.orders.push({
      id: state.nextOrderId, recipe: recipe.id, timeLeft: time, total: time,
    });
    state.nextOrderId += 1;
    return state.orders[state.orders.length - 1];
  }

  /** Test/staging helper: add a named order without the spawn clock. */
  function addOrder(recipeId, timeLeft) {
    const recipe = recipeById(recipeId);
    const time = timeLeft ?? orderTimeFor(state.wave);
    state.orders.push({ id: state.nextOrderId, recipe: recipeId, timeLeft: time, total: time });
    state.nextOrderId += 1;
    return state.orders[state.orders.length - 1];
  }

  function failOrder(order) {
    state.orders = state.orders.filter((item) => item.id !== order.id);
    state.fails += 1;
    state.combo = 0;
    if (state.fails >= MAX_FAILS) {
      state.over = true;
      state.overReason = 'Three orders walked away hungry.';
    }
  }

  function pickIngredient(ingId) {
    if (state.over || state.won) return 0;
    if (state.hand) return EVENT_ERROR;
    const def = ingredientById(ingId);
    if (!def) return EVENT_ERROR;
    state.hand = makeItem(ingId);
    return EVENT_PICKUP;
  }

  function placeOnBoard() {
    if (!state.hand || state.board) return EVENT_ERROR;
    const def = ingredientById(state.hand.ing);
    if (def.chop <= 0 || state.hand.stage !== 'raw') return EVENT_ERROR;
    state.board = state.hand;
    state.hand = null;
    return EVENT_PICKUP;
  }

  function chopHit() {
    if (!state.board) return EVENT_ERROR;
    const def = ingredientById(state.board.ing);
    state.board.hits += 1;
    if (state.board.hits < def.chop) return EVENT_CHOP;
    state.board.stage = 'chopped';
    state.hand = state.board;
    state.board = null;
    return EVENT_CHOP_DONE;
  }

  function placeInWok() {
    if (!state.hand || state.wok) return EVENT_ERROR;
    const def = ingredientById(state.hand.ing);
    if (def.cook <= 0) return EVENT_ERROR;
    if (def.chop > 0 && state.hand.stage !== 'chopped') return EVENT_ERROR;
    state.wok = state.hand;
    state.wok.cookTime = 0;
    state.hand = null;
    return EVENT_COOK_START;
  }

  function takeFromWok() {
    if (!state.wok) return EVENT_ERROR;
    const def = ingredientById(state.wok.ing);
    if (state.wok.cookTime >= def.burn) {
      state.wok = null;
      return EVENT_BURN;
    }
    if (state.wok.cookTime < def.cook) return EVENT_ERROR;
    state.wok.stage = 'cooked';
    state.hand = state.wok;
    state.wok = null;
    return EVENT_COOK_DONE;
  }

  function addToPlate() {
    if (!state.hand || !isReady(state.hand)) return EVENT_ERROR;
    state.plate.push(state.hand.ing);
    state.hand = null;
    return EVENT_PLATE;
  }

  function discardHand() {
    if (!state.hand) return EVENT_ERROR;
    state.hand = null;
    return EVENT_PICKUP;
  }

  /** Serve the earliest active order whose recipe the plate matches exactly. */
  function serve() {
    if (state.plate.length === 0) return EVENT_ERROR;
    const order = state.orders.find((item) => {
      const recipe = recipeById(item.recipe);
      return sameSet(state.plate, recipe.needs);
    });
    if (!order) return EVENT_ERROR;
    const recipe = recipeById(order.recipe);
    const tip = Math.round(recipe.price * 0.5 * (order.timeLeft / order.total));
    const comboBonus = state.combo * 1000;
    state.score += recipe.price + tip + comboBonus;
    state.served += 1;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.orders = state.orders.filter((item) => item.id !== order.id);
    state.plate = [];
    state.flash = tip + comboBonus > 0
      ? `+Rp${(recipe.price + tip + comboBonus).toLocaleString('en-US')}  (tip Rp${tip.toLocaleString('en-US')})`
      : `+Rp${recipe.price.toLocaleString('en-US')}`;
    state.flashTime = 2;
    return EVENT_SERVE | (tip > 0 ? EVENT_TIP : 0);
  }

  /** One fixed step: order countdowns, wok cooking, the shift clock and new waves. */
  function step(dt) {
    let events = 0;
    if (state.over || state.won) return events;
    state.elapsed += dt;
    state.shiftLeft = Math.max(0, state.shiftLeft - dt);
    state.wave = Math.min(5, 1 + Math.floor(state.elapsed / WAVE_SECONDS));
    if (state.flashTime > 0) state.flashTime -= dt;

    for (const order of [...state.orders]) {
      order.timeLeft -= dt;
      if (order.timeLeft <= 0) {
        failOrder(order);
        events |= EVENT_EXPIRE;
        if (state.over) return events | EVENT_OVER;
      }
    }

    if (state.wok) {
      const def = ingredientById(state.wok.ing);
      state.wok.cookTime += dt;
      if (state.wok.cookTime >= def.burn && state.wok.cookTime - dt < def.burn) {
        events |= EVENT_BURN;
      }
    }

    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.orders.length < maxConcurrentFor(state.wave)) {
      spawnOrder();
      events |= EVENT_SPAWN;
      state.spawnTimer = spawnIntervalFor(state.wave);
    }

    if (state.shiftLeft <= 0) {
      if (state.score >= state.target) {
        state.won = true;
        events |= EVENT_WIN;
      } else {
        state.over = true;
        state.overReason = 'Closing time — the target was not reached.';
        events |= EVENT_OVER;
      }
    }
    return events;
  }

  reset();
  return {
    state, reset, step, spawnOrder, addOrder,
    pickIngredient, placeOnBoard, chopHit, placeInWok, takeFromWok,
    addToPlate, discardHand, serve,
  };
}

// Re-exported so the renderer and tests read the field without importing config twice.
export { FIELD };
