// Headless playtest behind ?selftest=1: drives the real world through the same calls the
// input layer makes, and reports the result as JSON in #test-result. No rendering needed.
import { STEP } from './config.js';
import {
  EVENT_BURN, EVENT_OVER, EVENT_SERVE, EVENT_WIN,
} from './world.js';

function advance(world, seconds) {
  let events = 0;
  for (let index = 0; index < seconds / STEP; index += 1) events |= world.step(STEP);
  return events;
}

/** Complete the named recipe end-to-end through pick → chop → cook → plate → serve. */
function cookRecipe(world, recipeId) {
  const needs = {
    'nasi-goreng': ['nasi', 'telur', 'bawang', 'kecap'],
    'mie-goreng': ['mie', 'ayam', 'sayur', 'cabai'],
    'sate-ayam': ['sate', 'bawang', 'kecap'],
    'gado-gado': ['sayur', 'telur', 'cabai', 'kecap'],
    'soto-ayam': ['ayam', 'mie', 'bawang'],
  }[recipeId];
  const cookTimes = { nasi: 3, mie: 3, telur: 2.5, ayam: 4, sate: 4 };
  const chopTimes = { ayam: 3, bawang: 3, cabai: 3, sayur: 2 };
  for (const ing of needs) {
    world.pickIngredient(ing);
    if (chopTimes[ing]) {
      world.placeOnBoard();
      for (let hit = 0; hit < chopTimes[ing]; hit += 1) world.chopHit();
    }
    if (cookTimes[ing]) {
      world.placeInWok();
      advance(world, cookTimes[ing] + 0.1);
      const took = world.takeFromWok();
      if (took & EVENT_BURN) return { ok: false, why: `${ing} burnt` };
    }
    world.addToPlate();
  }
  return { ok: true };
}

export function runSelfTest(world) {
  const results = {};
  const errors = [];
  try {
    // 1. Complete a Nasi Goreng order and serve it for points.
    world.reset();
    world.addOrder('nasi-goreng', 50);
    const cooked = cookRecipe(world, 'nasi-goreng');
    results.cookRecipe = cooked.ok;
    if (!cooked.ok) errors.push(cooked.why);
    const before = world.state.score;
    const served = world.serve();
    results.servedNasiGoreng = !!(served & EVENT_SERVE) && world.state.score > before;
    results.scoreAfterServe = world.state.score;
    results.servedCount = world.state.served;

    // 2. Complete every other recipe too.
    results.allRecipes = {};
    for (const recipeId of ['mie-goreng', 'sate-ayam', 'gado-gado', 'soto-ayam']) {
      world.reset();
      world.addOrder(recipeId, 60);
      const done = cookRecipe(world, recipeId);
      const servedEvent = done.ok ? world.serve() : 0;
      results.allRecipes[recipeId] = done.ok && !!(servedEvent & EVENT_SERVE);
      if (!results.allRecipes[recipeId]) errors.push(`${recipeId} failed`);
    }

    // 3. A burnt dish: leave food in the wok past its burn time.
    world.reset();
    world.pickIngredient('nasi');
    world.placeInWok();
    advance(world, 9);
    const burnt = world.takeFromWok();
    results.burnDetected = !!(burnt & EVENT_BURN);

    // 4. An expired order counts as a fail.
    world.reset();
    world.addOrder('nasi-goreng', 2);
    advance(world, 3);
    results.expireFails = world.state.fails === 1;

    // 5. Three fails loses the shift.
    world.reset();
    for (let i = 0; i < 3; i += 1) {
      world.addOrder('nasi-goreng', 1);
      advance(world, 2);
    }
    results.losePath = world.state.over && !world.state.won;

    // 6. Reaching the target before closing wins the shift.
    world.reset();
    world.state.score = world.state.target - 18000;
    world.addOrder('nasi-goreng', 60);
    cookRecipe(world, 'nasi-goreng');
    world.serve();
    world.state.shiftLeft = 0.05;
    const winEvents = advance(world, 0.2);
    results.winPath = world.state.won && !!(winEvents & EVENT_WIN);

    // 7. A wrong plate cannot be served.
    world.reset();
    world.addOrder('nasi-goreng', 50);
    world.pickIngredient('mie');
    world.placeInWok();
    advance(world, 3.2);
    world.takeFromWok();
    world.addToPlate();
    const wrong = world.serve();
    results.wrongPlateRejected = !(wrong & EVENT_SERVE);

    // 8. No console errors were thrown reaching here (the harness also watches console).
    results.noThrow = true;
  } catch (error) {
    errors.push(String(error && error.message ? error.message : error));
    results.noThrow = false;
  }
  results.errors = errors;
  results.passed = errors.length === 0
    && results.servedNasiGoreng && results.burnDetected && results.expireFails
    && results.losePath && results.winPath && results.wrongPlateRejected
    && Object.values(results.allRecipes ?? {}).every(Boolean);
  return results;
}
