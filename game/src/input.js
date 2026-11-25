// Keyboard, mouse and touch input. Clicks are hit-tested against the shared LAYOUT so the
// same zones the renderer draws are the zones the player taps. Every action goes through
// the world, so a click and a key press do exactly the same thing.
import { INGREDIENTS, LAYOUT } from './config.js';
import {
  EVENT_BURN, EVENT_CHOP, EVENT_CHOP_DONE, EVENT_COOK_DONE, EVENT_COOK_START,
  EVENT_ERROR, EVENT_PICKUP, EVENT_PLATE, EVENT_SERVE,
} from './world.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

function inside(x, y, rect) {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

function binRect(index) {
  return {
    x: LAYOUT.bins.x + index * (LAYOUT.bins.width + LAYOUT.bins.gap),
    y: LAYOUT.bins.y, width: LAYOUT.bins.width, height: LAYOUT.bins.height,
  };
}

export function createInput(canvas, world, hooks) {
  const actions = { value: 0 };
  let paused = false;

  function emit(events) {
    if (events & EVENT_ERROR) hooks.onError?.();
    if (events & EVENT_PICKUP) hooks.onPickup?.();
    if (events & EVENT_CHOP) hooks.onChop?.();
    if (events & EVENT_CHOP_DONE) hooks.onChopDone?.();
    if (events & EVENT_COOK_START) hooks.onCookStart?.();
    if (events & EVENT_COOK_DONE) hooks.onCookDone?.();
    if (events & EVENT_BURN) hooks.onBurn?.();
    if (events & EVENT_PLATE) hooks.onPlate?.();
    if (events & EVENT_SERVE) hooks.onServe?.();
  }

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (1280 / rect.width),
      y: (event.clientY - rect.top) * (720 / rect.height),
    };
  }

  /** One tap on a station: pick an ingredient, chop, cook, plate, serve or bin it. */
  function tap(x, y) {
    const state = world.state;
    if (state.won || state.over) {
      actions.value |= ACTION_CONFIRM;
      return;
    }
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      if (inside(x, y, binRect(index))) {
        emit(world.pickIngredient(INGREDIENTS[index].id));
        return;
      }
    }
    if (inside(x, y, LAYOUT.board)) {
      if (state.board) emit(world.chopHit());
      else if (state.hand) emit(world.placeOnBoard());
      else emit(EVENT_ERROR);
      return;
    }
    if (inside(x, y, LAYOUT.wok)) {
      if (state.wok) emit(world.takeFromWok());
      else if (state.hand) emit(world.placeInWok());
      else emit(EVENT_ERROR);
      return;
    }
    if (inside(x, y, LAYOUT.plate)) {
      if (state.hand) emit(world.addToPlate());
      return;
    }
    if (inside(x, y, LAYOUT.serve)) {
      emit(world.serve());
      return;
    }
    if (inside(x, y, LAYOUT.trash)) {
      emit(world.discardHand());
      return;
    }
  }

  function keyAction(code) {
    const state = world.state;
    if (code === 'Escape' || code === 'KeyP') {
      actions.value |= ACTION_PAUSE;
      return;
    }
    if (state.won || state.over) {
      if (code === 'Enter' || code === 'Space') actions.value |= ACTION_CONFIRM;
      return;
    }
    if (code === 'Enter') { emit(world.serve()); return; }
    if (code === 'Space') {
      if (state.board) emit(world.chopHit());
      else if (state.hand) emit(world.placeOnBoard());
      else emit(EVENT_ERROR);
      return;
    }
    if (code === 'KeyB') {
      if (state.board) emit(world.chopHit());
      else if (state.hand) emit(world.placeOnBoard());
      else emit(EVENT_ERROR);
      return;
    }
    if (code === 'KeyW') {
      if (state.wok) emit(world.takeFromWok());
      else if (state.hand) emit(world.placeInWok());
      else emit(EVENT_ERROR);
      return;
    }
    if (code === 'KeyA') {
      if (state.hand) emit(world.addToPlate());
      return;
    }
    if (code === 'KeyT') { emit(world.discardHand()); return; }
    const digit = /^Digit(\d)$/.exec(code);
    if (digit) {
      const index = Number.parseInt(digit[1], 10) - 1;
      if (index >= 0 && index < INGREDIENTS.length) emit(world.pickIngredient(INGREDIENTS[index].id));
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    hooks.onGesture?.();
    const point = toLogical(event);
    tap(point.x, point.y);
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    hooks.onGesture?.();
    keyAction(event.code);
  });

  function takeActions() {
    const value = actions.value;
    actions.value = 0;
    return value;
  }

  return { takeActions, tap, keyAction };
}
