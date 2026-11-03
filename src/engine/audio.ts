// Ses çalar elemanı, Web Audio analiz zinciri ve ritim (bas/tiz/vuruş) hesabı.
// Arayüzden bağımsızdır: sonuçlar CSS değişkenleri olarak hedef elemana yazılır.

import { beatHit, fallbackPulse, flashHit, type Rhythm } from './rhythm';

export const audio = new Audio();
audio.volume = 0.8;

export const viz = {
  bass: 0,
  treb: 0,
  beat: 0,
  bLo: 0,
  bHi: 0.3,
  tLo: 0,
  tHi: 0.3,
  mean: 0.2,
  prevBass: 0,
  lastBeat: 0,
  last: 0
};

let audioCtx: AudioContext | null = null;
let analyser: AnalyserNode | null = null;
let audioFreqData: Uint8Array<ArrayBuffer> | null = null;
let videoSource: MediaElementAudioSourceNode | null = null;
let videoEl: HTMLVideoElement | null = null;
let vizTarget: HTMLElement | null = null;
let running = false;
let gain = 1;
let reduceFlash = false;
let rhythm: Rhythm | null = null;

// Çalan şarkının önceden hesaplanmış vuruş haritası (yoksa anlık dinlemeye düşülür).
export function setRhythm(r: Rhythm | null) {
  rhythm = r;
  document.documentElement.dataset.rhythm = r ? 'ready' : 'pending';
  document.documentElement.dataset.rhythmKind = r ? r.kind : '';
  document.documentElement.dataset.rhythmBeats = r?.kind === 'beats' ? String(r.beats.length) : '0';
  document.documentElement.dataset.rhythmBpm = r?.kind === 'beats' ? r.bpm.toFixed(1) : '';
}

// Sert parlamalar saniyede 3'ten az tutulur (yanıp sönme eşiği); vuruşlar arası en az 340 ms.
const MIN_BEAT_GAP_MS = 340;

const reduceMotionQuery =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function setReduceFlash(value: boolean) {
  reduceFlash = value;
}

export function setVizTarget(el: HTMLElement | null) {
  vizTarget = el;
}

export function setJpGain(value: number) {
  gain = value;
}

export function registerVideo(el: HTMLVideoElement | null) {
  videoEl = el;
  attachVideoToAnalyser();
}

export function initAudioContext() {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    attachVideoToAnalyser();
    return;
  }
  try {
    const Ctor: typeof AudioContext | undefined =
      window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = new Ctor();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.55;
    analyser.minDecibels = -90;
    analyser.maxDecibels = -20;
    const source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioFreqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    attachVideoToAnalyser();
  } catch (e) {
    console.warn('AudioContext initialization error:', e);
  }
}

function attachVideoToAnalyser() {
  if (!audioCtx || !analyser || !videoEl || videoSource) return;
  try {
    videoSource = audioCtx.createMediaElementSource(videoEl);
    videoSource.connect(analyser);
  } catch (e) {
    console.warn('Video audio source error:', e);
  }
}

export function isMediaPlaying() {
  return (!audio.paused && !audio.ended) || (!!videoEl && !videoEl.paused && !videoEl.ended);
}

function bandAvg(loHz: number, hiHz: number) {
  const binHz = audioCtx!.sampleRate / analyser!.fftSize;
  const data = audioFreqData!;
  const a = Math.max(1, Math.floor(loHz / binHz));
  const b = Math.min(data.length - 1, Math.ceil(hiHz / binHz));
  let sum = 0;
  for (let i = a; i <= b; i++) sum += data[i];
  return sum / ((b - a + 1) * 255);
}

export function startVisualizer() {
  initAudioContext();
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  if (!running) {
    running = true;
    viz.last = 0;
    requestAnimationFrame(frame);
  }
}

// Titreme: bas ve vuruşla büyüyen, hızlı ve birbirinden bağımsız üç salınım (x, y, dönme).
// Hareket tercihi kapalıysa ya da "ışık azaltma" açıksa tamamen sıfırlanır.
const SHAKE_MAX_PX = 7;
interface Shake {
  x: number;
  y: number;
  r: number;
  amp: number;
}
const NO_SHAKE: Shake = { x: 0, y: 0, r: 0, amp: 0 };

// Yedek (model yok): bas enerjisine bağlı sürekli titreşim.
function liveShake(now: number, intensity: number): Shake {
  const amp = Math.min(SHAKE_MAX_PX, intensity * 5);
  const t = now / 1000;
  return {
    amp,
    x: Math.sin(t * 2 * Math.PI * 17) * amp,
    y: Math.sin(t * 2 * Math.PI * 23 + 1.3) * amp * 0.6,
    r: Math.sin(t * 2 * Math.PI * 13 + 2.1) * amp * 0.07
  };
}

// Vuruş anında en büyük kayma ile başlayan, hızla sönen "tokat" hareketi (her vuruşta yön değişir).
function punchShake(tau: number, strength: number, index: number, g: number): Shake {
  const amp = Math.min(SHAKE_MAX_PX, strength * 5 * g * Math.exp(-tau / 0.085));
  const sx = index % 2 === 0 ? 1 : -1;
  const sy = index % 3 === 0 ? -1 : 1;
  const w = 2 * Math.PI;
  return {
    amp,
    x: Math.cos(w * 16 * tau) * amp * sx,
    y: Math.cos(w * 21 * tau + 0.8) * amp * 0.6 * sy,
    r: Math.cos(w * 12 * tau) * amp * 0.07 * sx
  };
}

function writeShake(s: Shake, enabled: boolean) {
  if (!vizTarget) return;
  const v = enabled ? s : NO_SHAKE;
  vizTarget.style.setProperty('--shake-amp', v.amp.toFixed(2));
  vizTarget.style.setProperty('--shake-x', v.x.toFixed(2) + 'px');
  vizTarget.style.setProperty('--shake-y', v.y.toFixed(2) + 'px');
  vizTarget.style.setProperty('--shake-r', v.r.toFixed(3) + 'deg');
}

function writeVars(bass: number, beat: number, treb: number) {
  if (!vizTarget) return;
  vizTarget.style.setProperty('--bass', bass.toFixed(3));
  vizTarget.style.setProperty('--beat', beat.toFixed(3));
  vizTarget.style.setProperty('--treb', treb.toFixed(3));
}

function frame(now: number) {
  if (!vizTarget) {
    running = false;
    return;
  }

  const dt = viz.last ? Math.min(0.1, (now - viz.last) / 1000) : 0.016;
  viz.last = now;
  const playing = isMediaPlaying();

  let bassTarget = 0;
  let trebTarget = 0;

  if (playing && analyser && audioFreqData) {
    analyser.getByteFrequencyData(audioFreqData);
    const bassRaw = bandAvg(25, 150);
    const trebRaw = bandAvg(4000, 12000);

    viz.bHi = Math.max(bassRaw, viz.bHi - dt * 0.04);
    viz.bLo = Math.min(bassRaw, viz.bLo + dt * 0.04);
    viz.tHi = Math.max(trebRaw, viz.tHi - dt * 0.04);
    viz.tLo = Math.min(trebRaw, viz.tLo + dt * 0.04);
    bassTarget = clamp01((bassRaw - viz.bLo) / Math.max(0.12, viz.bHi - viz.bLo));
    trebTarget = clamp01((trebRaw - viz.tLo) / Math.max(0.12, viz.tHi - viz.tLo));

    viz.mean += (bassRaw - viz.mean) * (1 - Math.exp(-dt / 0.9));
    const rising = bassRaw - viz.prevBass > 0.008;
    if (rising && bassRaw > viz.mean * 1.15 + 0.03 && now - viz.lastBeat > MIN_BEAT_GAP_MS) {
      viz.lastBeat = now;
      viz.beat = Math.max(viz.beat, clamp01((bassRaw - viz.mean) / 0.3 + 0.55));
    }
    viz.prevBass = bassRaw;
  }

  const k = (cur: number, tgt: number, up: number, down: number) =>
    cur + (tgt - cur) * (1 - Math.exp(-dt / (tgt > cur ? up : down)));
  viz.bass = k(viz.bass, bassTarget, 0.035, playing ? 0.2 : 0.6);
  viz.treb = k(viz.treb, trebTarget, 0.03, playing ? 0.1 : 0.4);
  viz.beat *= Math.exp(-dt / (playing ? 0.16 : 0.3));

  if (!playing && viz.bass < 0.004 && viz.beat < 0.004 && viz.treb < 0.004) {
    viz.bass = viz.beat = viz.treb = 0;
    writeVars(0, 0, 0);
    writeShake(NO_SHAKE, false);
    running = false;
    return;
  }

  const g = Math.min(1.6, gain) * (reduceMotionQuery?.matches ? 0.45 : 1);
  const shakeOn = !reduceFlash && !reduceMotionQuery?.matches;
  let beatGlow = viz.beat;
  // Müzik çalıyorsa vuruş haritası hazır olana kadar titreme yok (yanlış titremek yerine sakin kalır);
  // yalnızca video sesi (iPod) için anlık bas titremesi kullanılır.
  const musicPlaying = !audio.paused;
  let shake: Shake = musicPlaying ? NO_SHAKE : liveShake(now, Math.pow(viz.bass * g, 1.6) * 0.5 + viz.beat * g * 0.6);

  // Şarkının vuruş haritası varsa hareket tam vuruş anlarında, çalma konumuna göre tetiklenir.
  if (rhythm && !audio.paused) {
    const latency = audioCtx ? audioCtx.outputLatency || audioCtx.baseLatency || 0 : 0;
    const t = audio.currentTime - latency;
    if (rhythm.kind === 'beats') {
      const hit = beatHit(rhythm, t);
      shake = hit ? punchShake(hit.tau, hit.strength, hit.index, g) : NO_SHAKE;
      const fh = flashHit(rhythm, t);
      beatGlow = fh ? Math.exp(-fh.tau / 0.16) : 0;
    } else {
      shake = liveShake(now, fallbackPulse(rhythm, t) * g);
    }
  }

  // Işık azaltma açıkken sert vuruş parlaması kapanır, sürekli bas nabzı yarıya iner.
  writeVars(viz.bass * g * (reduceFlash ? 0.5 : 1), reduceFlash ? 0 : beatGlow * g, viz.treb * g * (reduceFlash ? 0.5 : 1));
  writeShake(shake, shakeOn);
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && isMediaPlaying()) startVisualizer();
});
window.addEventListener('pointerdown', () => initAudioContext(), { once: true });

if (import.meta.env.DEV) {
  (window as unknown as { __hanami: unknown }).__hanami = { audio, getRhythm: () => rhythm, getCtx: () => audioCtx };
}
