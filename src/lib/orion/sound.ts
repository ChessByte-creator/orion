let ctx: AudioContext | null = null;
let enabled = true;

try {
  enabled = localStorage.getItem("orion-sound") !== "0";
} catch {
  enabled = true;
}

export function soundEnabled() {
  return enabled;
}

export function setSoundEnabled(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem("orion-sound", on ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (on) unlockSound();
}

export function unlockSound() {
  if (!enabled || typeof window === "undefined") return;
  const AudioCtx = window.AudioContext;
  if (!AudioCtx) return;
  ctx ??= new AudioCtx();
  if (ctx.state === "suspended") void ctx.resume();
}

function tone(freq: number, duration: number, peak: number, type: OscillatorType, delay = 0) {
  if (!enabled || !ctx) return;
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noise(duration: number, peak: number) {
  if (!enabled || !ctx) return;
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  source.buffer = buffer;
  filter.type = "highpass";
  filter.frequency.value = 900;
  gain.gain.setValueAtTime(peak, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playTick() {
  unlockSound();
  noise(0.03, 0.035);
  tone(180, 0.04, 0.03, "square");
}

export function playCut() {
  unlockSound();
  noise(0.22, 0.12);
  tone(90, 0.28, 0.08, "sawtooth");
}

export function playAlarm() {
  unlockSound();
  tone(520, 0.16, 0.07, "square");
  tone(780, 0.22, 0.07, "square", 0.18);
}

export function playBlip() {
  unlockSound();
  tone(660, 0.07, 0.04, "square");
}

export function playEnd(ok: boolean) {
  unlockSound();
  tone(ok ? 440 : 140, 0.24, 0.06, ok ? "triangle" : "sawtooth");
}
