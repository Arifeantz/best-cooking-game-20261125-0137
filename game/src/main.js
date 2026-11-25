// Boot and the one loop: input is read every frame, the world advances in fixed 1/60 s
// steps (several in a slow frame, none in a fast one), and the renderer paints what is
// there. The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N) stages that
// scene instead of running the loop, paints it twice and sets window.__shotReady for a
// screenshot. ?selftest=1 runs the headless playtest and writes its JSON into #test-result.
import { BEST_KEY, FIELD, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createWorld, EVENT_BURN, EVENT_CHOP, EVENT_CHOP_DONE, EVENT_COOK_DONE,
  EVENT_COOK_START, EVENT_ERROR, EVENT_EXPIRE, EVENT_OVER, EVENT_PICKUP,
  EVENT_PLATE, EVENT_SERVE, EVENT_TIP, EVENT_WIN,
} from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, createInput } from './input.js';
import {
  createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE,
} from './render.js';
import { stageShot } from './shots.js';
import { runSelfTest } from './selftest.js';
import {
  playBurn, playChop, playChopDone, playCookDone, playError, playExpire, playLose,
  playPickup, playPlate, playServe, playSizzlePop, playTip, playWin, setSizzle,
  unlockAudio,
} from './audio.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const selftest = params.get('selftest') === '1';
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// The canvas is a fixed 1280x720 logical area scaled to the window; size it to the window
// on every resize so clicks map back to logical coordinates.
function resizeCanvas() {
  const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
  canvas.width = Math.round(FIELD.width * scale * window.devicePixelRatio);
  canvas.height = Math.round(FIELD.height * scale * window.devicePixelRatio);
  canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
  canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(canvas.width / FIELD.width, 0, 0, canvas.height / FIELD.height, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, 1 / 30);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runSelfTestMode() {
  const results = runSelfTest(world);
  const node = document.getElementById('test-result');
  node.textContent = JSON.stringify(results);
  window.__testDone = true;
  window.__testPassed = results.passed;
}

function runGame() {
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  const input = createInput(canvas, world, {
    onGesture: unlockAudio,
    onPickup: playPickup,
    onChop: playChop,
    onChopDone: playChopDone,
    onCookStart: () => { playSizzlePop(); setSizzle(true); },
    onCookDone: () => { playCookDone(); setSizzle(false); },
    onBurn: () => { playBurn(); setSizzle(false); },
    onPlate: playPlate,
    onServe: () => { playServe(); window.setTimeout(playTip, 180); },
    onError: playError,
  });

  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    renderer.setPointer(
      (event.clientX - rect.left) * (FIELD.width / rect.width),
      (event.clientY - rect.top) * (FIELD.height / rect.height),
    );
  });

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Earn Rp120.000 before closing time.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    setSizzle(false);
    if (world.state.won) playWin();
    else playLose();
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    announce(world.state.won
      ? `Shift complete! Score ${world.state.score}.`
      : `Shift over. Score ${world.state.score}. Best ${best}.`);
  }

  function handleEvents(events) {
    if (events & EVENT_SERVE) announce(`Served! Score ${world.state.score}.`);
    if (events & EVENT_EXPIRE) { playExpire(); announce(`An order expired. ${3 - world.state.fails} strikes left.`); }
    if (events & EVENT_BURN) announce('A dish burnt in the wok.');
    if (events & EVENT_WIN) endGame();
    else if (events & EVENT_OVER) endGame();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        handleEvents(world.step(STEP));
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen, best, 1 / 60);
  }

  // Leaving the tab pauses a running game rather than letting orders expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Wokfire Alley. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (selftest) runSelfTestMode();
else if (shot) runShot(shot);
else runGame();
