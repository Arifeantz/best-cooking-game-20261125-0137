// The screenshot scenes behind ?shot=start|play|serve|end. Each one stages a real world
// through the world's own rules (orders, chopping, the wok, the plate), so the frame is what
// a short game really looks like — and the same seed always gives the same frame.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Run the world forward `seconds` with no input, so timers and steam are alive. */
function idle(world, seconds) {
  for (let index = 0; index < seconds / STEP; index += 1) world.step(STEP);
}

/** Cook one ingredient start-to-finish through the real input path. */
function cookThrough(world, ingId) {
  world.pickIngredient(ingId);
  const def = { nasi: 3, mie: 3, telur: 2.5, ayam: 4, sate: 4 }[ingId] ?? 3;
  const needsChop = ingId === 'ayam';
  if (needsChop) {
    world.placeOnBoard();
    world.chopHit(); world.chopHit(); world.chopHit();
  }
  world.placeInWok();
  for (let t = 0; t < def + 0.1; t += STEP) world.step(STEP);
  world.takeFromWok();
  world.addToPlate();
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'play') {
    world.addOrder('nasi-goreng', 38);
    world.addOrder('mie-goreng', 26);
    world.addOrder('gado-gado', 44);
    idle(world, 6);
    // Mid-service: one dish already on the plate, one sizzling in the wok, one on the board.
    world.pickIngredient('nasi');
    world.placeInWok();
    idle(world, 3.2);
    world.takeFromWok();
    world.addToPlate();
    world.pickIngredient('telur');
    world.placeInWok();
    world.pickIngredient('bawang');
    world.placeOnBoard();
    world.chopHit();
    idle(world, 1.5);
    world.state.score = 36000;
    world.state.served = 2;
    world.state.combo = 2;
    world.state.bestCombo = 2;
    world.state.shiftLeft = 118;
    return { screen: SCREEN_PLAY, best: 54000 };
  }
  if (name === 'serve') {
    world.addOrder('nasi-goreng', 24);
    world.addOrder('mie-goreng', 31);
    idle(world, 4);
    // A finished Nasi Goreng sits on the plate, its ticket waiting — serve is lit.
    cookThrough(world, 'nasi');
    cookThrough(world, 'telur');
    world.pickIngredient('bawang');
    world.placeOnBoard();
    world.chopHit(); world.chopHit(); world.chopHit();
    world.addToPlate();
    world.pickIngredient('kecap');
    world.addToPlate();
    world.state.score = 54000;
    world.state.served = 3;
    world.state.combo = 3;
    world.state.bestCombo = 3;
    world.state.shiftLeft = 96;
    return { screen: SCREEN_PLAY, best: 54000 };
  }
  if (name === 'end') {
    world.addOrder('soto-ayam', 30);
    idle(world, 3);
    world.state.score = 142000;
    world.state.served = 8;
    world.state.combo = 4;
    world.state.bestCombo = 5;
    world.state.shiftLeft = 22;
    world.state.won = true;
    return { screen: SCREEN_OVER, best: 142000 };
  }
  // start: the title screen over a living kitchen — tickets up, a wok steaming, a plate begun.
  world.addOrder('nasi-goreng', 44);
  world.addOrder('mie-goreng', 36);
  world.addOrder('sate-ayam', 48);
  idle(world, 5);
  world.pickIngredient('nasi');
  world.placeInWok();
  idle(world, 2);
  world.state.shiftLeft = 150;
  return { screen: SCREEN_TITLE, best: 54000 };
}
