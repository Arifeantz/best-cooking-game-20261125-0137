// Wokfire Alley: Night-Market Cooking Rush — every tuning number, recipe and colour in one
// place. The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const SHIFT_SECONDS = 150;
export const TARGET_RUPIAH = 120000;
export const MAX_FAILS = 3;
export const WAVE_SECONDS = 40;
export const MAX_ORDERS = 4;

/** One ingredient bin. chop: hits needed on the board (0 = never chopped).
 *  cook: seconds in the wok to be done (0 = never cooked). burn: seconds in the wok
 *  after which it is ruined. A component is "ready" once chopped (if needed) and
 *  cooked (if needed); sauce goes straight to the plate. */
export const INGREDIENTS = [
  { id: 'nasi',   name: 'Nasi',    short: 'Nasi',   color: '#f5f0dc', chop: 0, cook: 3.0, burn: 8.0, key: '1' },
  { id: 'mie',    name: 'Mie',     short: 'Mie',    color: '#f2c94c', chop: 0, cook: 3.0, burn: 8.0, key: '2' },
  { id: 'telur',  name: 'Telur',   short: 'Telur',  color: '#f6e27a', chop: 0, cook: 2.5, burn: 7.0, key: '3' },
  { id: 'ayam',   name: 'Ayam',    short: 'Ayam',   color: '#e8a06a', chop: 3, cook: 4.0, burn: 9.0, key: '4' },
  { id: 'sate',   name: 'Sate',    short: 'Sate',   color: '#c97b3d', chop: 0, cook: 4.0, burn: 9.0, key: '5' },
  { id: 'bawang', name: 'Bawang',  short: 'Bawang', color: '#c9a0dc', chop: 3, cook: 0,   burn: 0,   key: '6' },
  { id: 'cabai',  name: 'Cabai',   short: 'Cabai',  color: '#e5534b', chop: 3, cook: 0,   burn: 0,   key: '7' },
  { id: 'sayur',  name: 'Sayur',   short: 'Sayur',  color: '#58b368', chop: 2, cook: 0,   burn: 0,   key: '8' },
  { id: 'kecap',  name: 'Kecap',   short: 'Kecap',  color: '#5b3a1e', chop: 0, cook: 0,   burn: 0,   key: '9' },
];

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id) ?? null;
}

/** A recipe is a set of ready ingredients, each named by its ingredient id. */
export const RECIPES = [
  {
    id: 'nasi-goreng', name: 'Nasi Goreng', price: 18000, unlockWave: 1,
    needs: ['nasi', 'telur', 'bawang', 'kecap'],
    blurb: 'Wok-fried rice, egg, shallot, sweet soy',
  },
  {
    id: 'mie-goreng', name: 'Mie Goreng', price: 20000, unlockWave: 1,
    needs: ['mie', 'ayam', 'sayur', 'cabai'],
    blurb: 'Fried noodles, chicken, greens, chilli',
  },
  {
    id: 'sate-ayam', name: 'Sate Ayam', price: 22000, unlockWave: 2,
    needs: ['sate', 'bawang', 'kecap'],
    blurb: 'Grilled skewers, shallot, sweet soy',
  },
  {
    id: 'gado-gado', name: 'Gado-Gado', price: 16000, unlockWave: 2,
    needs: ['sayur', 'telur', 'cabai', 'kecap'],
    blurb: 'Veggie salad, egg, chilli, sweet soy',
  },
  {
    id: 'soto-ayam', name: 'Soto Ayam', price: 24000, unlockWave: 3,
    needs: ['ayam', 'mie', 'bawang'],
    blurb: 'Chicken soup, noodles, shallot',
  },
];

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}

export function unlockedRecipes(wave) {
  return RECIPES.filter((recipe) => recipe.unlockWave <= wave);
}

/** Order timers and spawn pressure per wave: later waves are faster and busier. */
export function orderTimeFor(wave) {
  return Math.max(28, 52 - (wave - 1) * 6);
}
export function spawnIntervalFor(wave) {
  return Math.max(4, 11 - (wave - 1) * 1.5);
}
export function maxConcurrentFor(wave) {
  return Math.min(MAX_ORDERS, 2 + wave - 1);
}

/** Where every clickable station sits, shared by the renderer and the input layer. */
export const LAYOUT = {
  hud: { x: 0, y: 0, width: 1280, height: 58 },
  orders: { x: 24, y: 96, width: 240, height: 108, gap: 16 },
  bins: { x: 24, y: 216, width: 128, height: 96, gap: 10 },
  board: { x: 56, y: 352, width: 300, height: 232 },
  wok: { x: 470, y: 352, width: 340, height: 232 },
  plate: { x: 900, y: 352, width: 300, height: 232 },
  serve: { x: 900, y: 596, width: 300, height: 56 },
  trash: { x: 1216, y: 352, width: 40, height: 40 },
  hint: { x: 0, y: 668, width: 1280, height: 52 },
};

export const PALETTE = {
  night: '#1a1033',
  sky: '#2b1a4d',
  awningRed: '#d43d2a',
  awningCream: '#f6e8c8',
  stallWood: '#7a4a21',
  stallWoodDark: '#5d3413',
  counter: '#8a5a2b',
  counterTop: '#a9743c',
  panel: '#241a3d',
  panelEdge: '#4a3570',
  text: '#fff6e0',
  muted: '#c9b8e8',
  gold: '#f2c94c',
  green: '#58b368',
  red: '#e5534b',
  board: '#c89b6a',
  wokIron: '#3a3f4a',
  plate: '#f5f0dc',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'wokfire-alley.best';
