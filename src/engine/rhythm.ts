// Çalan şarkının vuruş haritasını verir.
// Birincil yöntem: Beat This! (small0, ~2 milyon parametre) modeli, tarayıcıda onnxruntime-web ile.
// Model yüklenemezse basit enerji analizine (energyRhythm.ts) düşülür.
import { analyzeEnergy, energyPulseAt, type EnergyRhythm } from './energyRhythm';

export interface BeatRhythm {
  kind: 'beats';
  /** Vuruş zamanları (sn) */
  beats: Float32Array;
  /** Her vuruşun şiddeti 0..1 (downbeat = 1) */
  strengths: Float32Array;
  /** Parlama için seçilmiş vuruşlar: arası en az 340 ms (saniyede 3'ten az parlama) */
  flash: Float32Array;
  bpm: number;
}
export interface FallbackRhythm {
  kind: 'energy';
  energy: EnergyRhythm;
}
export type Rhythm = BeatRhythm | FallbackRhythm;

export interface BeatHit {
  /** Son vuruştan bu yana geçen süre (sn) */
  tau: number;
  strength: number;
  index: number;
}

// ---------------------------------------------------------------- sorgular

function lastIndexAtOrBefore(arr: Float32Array, t: number): number {
  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid] <= t) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}

export function beatHit(r: BeatRhythm, t: number): BeatHit | null {
  const i = lastIndexAtOrBefore(r.beats, t);
  if (i < 0) return null;
  return { tau: t - r.beats[i], strength: r.strengths[i], index: i };
}

export function flashHit(r: BeatRhythm, t: number): BeatHit | null {
  const i = lastIndexAtOrBefore(r.flash, t);
  if (i < 0) return null;
  return { tau: t - r.flash[i], strength: 1, index: i };
}

export function fallbackPulse(r: FallbackRhythm, t: number): number {
  return energyPulseAt(r.energy, t);
}

// ---------------------------------------------------------------- model

const MODEL_SAMPLE_RATE = 22050;
const MAX_BYTES = 250 * 1024 * 1024;
const FLASH_MIN_GAP = 0.34;

interface BeatData {
  beats: Float32Array;
  downbeats: Float32Array;
}

let worker: Worker | null = null;
let workerReady: Promise<void> | null = null;
let workerFailed = false;
let jobId = 0;
const pending = new Map<number, { resolve: (d: BeatData) => void; reject: (e: Error) => void }>();

function assetUrl(path: string) {
  return new URL(path, document.baseURI).href;
}

function getWorker(): Promise<Worker> {
  if (workerFailed) return Promise.reject(new Error('worker unavailable'));
  if (!worker) {
    worker = new Worker(new URL('./beatWorker.ts', import.meta.url), { type: 'module' });
    workerReady = new Promise<void>((resolve, reject) => {
      worker!.addEventListener('message', function onMsg(e: MessageEvent) {
        const m = e.data;
        if (m.type === 'ready') {
          resolve();
        } else if (m.type === 'error' && m.id === undefined) {
          workerFailed = true;
          reject(new Error(m.message));
        } else if (m.type === 'result') {
          pending.get(m.id)?.resolve({ beats: m.beats, downbeats: m.downbeats });
          pending.delete(m.id);
        } else if (m.type === 'error') {
          pending.get(m.id)?.reject(new Error(m.message));
          pending.delete(m.id);
        } else if (m.type === 'progress') {
          document.documentElement.dataset.rhythmProgress = `${m.done}/${m.total}`;
        }
      });
      worker!.addEventListener('error', e => {
        workerFailed = true;
        reject(new Error(e.message));
      });
    });
    worker.postMessage({
      type: 'init',
      ortBase: assetUrl('ort/'),
      logmelUrl: assetUrl('models/logmel.onnx'),
      beatUrl: assetUrl('models/beatthis_small0.onnx')
    });
  }
  return workerReady!.then(() => worker!);
}

async function decodeMono22k(file: Blob): Promise<Float32Array> {
  const Ctor: typeof OfflineAudioContext | undefined =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Ctor) throw new Error('OfflineAudioContext yok');
  const decoded = await new Ctor(1, 1, MODEL_SAMPLE_RATE).decodeAudioData(await file.arrayBuffer());
  const n = decoded.length;
  const out = new Float32Array(n);
  const ch = decoded.numberOfChannels;
  for (let c = 0; c < ch; c++) {
    const d = decoded.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i] / ch;
  }
  return out;
}

async function runModel(file: Blob): Promise<BeatData> {
  const w = await getWorker();
  const audio = await decodeMono22k(file);
  const id = ++jobId;
  return new Promise<BeatData>((resolve, reject) => {
    pending.set(id, { resolve, reject });
    w.postMessage({ type: 'analyze', id, audio }, [audio.buffer]);
  });
}

// ---------------------------------------------------------------- önbellek (IndexedDB)

const DB_NAME = 'hanami-rhythm';
const STORE = 'beats';
const CACHE_VERSION = 'bt-small0-v1';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function cacheGet(key: string): Promise<BeatData | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise(resolve => {
    const req = db.transaction(STORE).objectStore(STORE).get(`${CACHE_VERSION}|${key}`);
    req.onsuccess = () => resolve((req.result as BeatData | undefined) ?? null);
    req.onerror = () => resolve(null);
  });
}

async function cachePut(key: string, data: BeatData) {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(STORE, 'readwrite').objectStore(STORE).put(data, `${CACHE_VERSION}|${key}`);
  } catch {
    /* önbellek yazılamadı */
  }
}

// ---------------------------------------------------------------- birleştirme

function buildRhythm(d: BeatData): BeatRhythm {
  const { beats, downbeats } = d;
  const downSet = new Set(Array.from(downbeats, t => Math.round(t * 1000)));
  const strengths = Float32Array.from(beats, t => (downSet.has(Math.round(t * 1000)) ? 1 : 0.8));

  const flash: number[] = [];
  let last = -Infinity;
  for (const t of beats) {
    if (t - last >= FLASH_MIN_GAP) {
      flash.push(t);
      last = t;
    }
  }

  const ibi: number[] = [];
  for (let i = 1; i < beats.length; i++) ibi.push(beats[i] - beats[i - 1]);
  ibi.sort((a, b) => a - b);
  const med = ibi.length ? ibi[ibi.length >> 1] : 0;
  return { kind: 'beats', beats, strengths, flash: Float32Array.from(flash), bpm: med ? 60 / med : 0 };
}

const cache = new Map<number, Rhythm | null>();
const inflight = new Map<number, Promise<Rhythm | null>>();

/** Bir şarkının ham baytlarına erişim: seçilen dosya ya da cihaz müziği (adresten okunur) */
export interface TrackSource {
  /** Önbellek anahtarı (aynı dosya aynı anahtarı üretmeli) */
  key: string;
  size: number;
  load: () => Promise<Blob>;
}

export function analyzeTrack(id: number, src: TrackSource): Promise<Rhythm | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!);
  const running = inflight.get(id);
  if (running) return running;

  const job = (async (): Promise<Rhythm | null> => {
    if (src.size <= MAX_BYTES) {
      const key = src.key;
      try {
        const cached = await cacheGet(key);
        const data = cached ?? (await runModel(await src.load()));
        if (!cached) void cachePut(key, data);
        if (data.beats.length >= 4) return buildRhythm(data);
      } catch (err) {
        console.warn('Ritim modeli çalışmadı, enerji analizine düşülüyor:', err);
      }
    }
    let energy = null;
    try {
      energy = await analyzeEnergy(id, await src.load());
    } catch (err) {
      console.warn('Enerji analizi de çalışmadı:', err);
    }
    return energy ? { kind: 'energy', energy } : null;
  })().then(r => {
    cache.set(id, r);
    inflight.delete(id);
    return r;
  });
  inflight.set(id, job);
  return job;
}
