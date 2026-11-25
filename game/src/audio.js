// All sound is synthesised with WebAudio — no audio files, no network. The sizzle is a
// looped noise buffer through a band-pass filter; the rest are short oscillator/noise bursts.
let context = null;
let noiseBuffer = null;
let sizzle = null;

function ensureContext() {
  if (context !== null) return context;
  const AudioContext = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContext) return null;
  context = new AudioContext();
  const length = context.sampleRate;
  noiseBuffer = context.createBuffer(1, length, context.sampleRate);
  const data = noiseBuffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  return context;
}

/** Call from the first user gesture; browsers only let audio start after one. */
export function unlockAudio() {
  const audio = ensureContext();
  if (audio && audio.state === 'suspended') void audio.resume();
}

function tone(frequency, duration, type, volume, slideTo) {
  const audio = ensureContext();
  if (!audio) return;
  const now = audio.currentTime;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, now);
  if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, now + duration);
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(audio.destination);
  oscillator.start(now);
  oscillator.stop(now + duration + 0.02);
}

function noiseBurst(duration, volume, filterFrequency) {
  const audio = ensureContext();
  if (!audio || !noiseBuffer) return;
  const now = audio.currentTime;
  const source = audio.createBufferSource();
  source.buffer = noiseBuffer;
  const filter = audio.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = filterFrequency;
  const gain = audio.createGain();
  gain.gain.setValueAtTime(volume, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  source.connect(filter).connect(gain).connect(audio.destination);
  source.start(now);
  source.stop(now + duration + 0.02);
}

export function playPickup() { tone(520, 0.08, 'triangle', 0.12, 760); }
export function playChop() { noiseBurst(0.07, 0.25, 1800); tone(180, 0.06, 'square', 0.08, 90); }
export function playChopDone() { tone(660, 0.1, 'triangle', 0.14); tone(880, 0.12, 'triangle', 0.12); }
export function playSizzlePop() { noiseBurst(0.25, 0.12, 5200); }
export function playCookDone() { tone(740, 0.12, 'sine', 0.16); tone(988, 0.16, 'sine', 0.14); }
export function playBurn() { tone(220, 0.35, 'sawtooth', 0.12, 110); noiseBurst(0.3, 0.1, 400); }
export function playPlate() { tone(440, 0.08, 'triangle', 0.12); tone(587, 0.1, 'triangle', 0.1); }
export function playServe() { tone(1046, 0.14, 'sine', 0.18); tone(1318, 0.22, 'sine', 0.16); }
export function playTip() { tone(1568, 0.12, 'sine', 0.12); tone(2093, 0.2, 'sine', 0.1); }
export function playError() { tone(160, 0.18, 'square', 0.1, 120); }
export function playExpire() { tone(392, 0.2, 'triangle', 0.14, 262); tone(262, 0.3, 'triangle', 0.12, 196); }
export function playWin() {
  [523, 659, 784, 1046].forEach((frequency, index) => {
    window.setTimeout(() => tone(frequency, 0.3, 'sine', 0.16), index * 130);
  });
}
export function playLose() {
  [392, 330, 262, 196].forEach((frequency, index) => {
    window.setTimeout(() => tone(frequency, 0.3, 'triangle', 0.14), index * 150);
  });
}

/** A soft wok sizzle while something cooks; call with false when the wok empties. */
export function setSizzle(on) {
  const audio = ensureContext();
  if (!audio || !noiseBuffer) return;
  if (on && !sizzle) {
    const source = audio.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;
    const filter = audio.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 4800;
    filter.Q.value = 0.6;
    const gain = audio.createGain();
    gain.gain.value = 0.05;
    source.connect(filter).connect(gain).connect(audio.destination);
    source.start();
    sizzle = { source, gain };
  } else if (!on && sizzle) {
    const old = sizzle;
    sizzle = null;
    old.gain.gain.linearRampToValueAtTime(0.0001, audio.currentTime + 0.15);
    window.setTimeout(() => { try { old.source.stop(); } catch { /* already stopped */ } }, 250);
  }
}
