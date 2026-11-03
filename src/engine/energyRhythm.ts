// YEDEK yöntem: yapay zeka modeli yüklenemezse devreye giren basit enerji (onset) analizi.

export interface EnergyRhythm {
  /** Bir çerçevenin süresi (sn) */
  hopSec: number;
  /** Her çerçeve için 0..1 vuruş şiddeti (sönümlü) */
  pulse: Float32Array;
  /** Bulunan vuruş sayısı (hata ayıklama için) */
  hits: number;
}

const SAMPLE_RATE = 22050;
const HOP = 512;
const MAX_BYTES = 250 * 1024 * 1024;
const cache = new Map<number, EnergyRhythm | null>();
const inflight = new Map<number, Promise<EnergyRhythm | null>>();

export function energyPulseAt(r: EnergyRhythm, time: number): number {
  const f = time / r.hopSec;
  if (f < 0) return 0;
  const i = Math.floor(f);
  if (i >= r.pulse.length - 1) return 0;
  const k = f - i;
  return r.pulse[i] * (1 - k) + r.pulse[i + 1] * k;
}

export function analyzeEnergy(id: number, file: Blob): Promise<EnergyRhythm | null> {
  if (cache.has(id)) return Promise.resolve(cache.get(id)!);
  const running = inflight.get(id);
  if (running) return running;
  const job = analyze(file)
    .catch(() => null)
    .then(r => {
      cache.set(id, r);
      inflight.delete(id);
      return r;
    });
  inflight.set(id, job);
  return job;
}

async function analyze(file: Blob): Promise<EnergyRhythm | null> {
  if (file.size > MAX_BYTES) return null;
  const OfflineCtx: typeof OfflineAudioContext | undefined =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!OfflineCtx) return null;

  const decoded = await new OfflineCtx(1, 1, SAMPLE_RATE).decodeAudioData(await file.arrayBuffer());
  const sr = decoded.sampleRate;
  const channels = decoded.numberOfChannels;
  const length = decoded.length;
  const frames = Math.floor(length / HOP);
  if (frames < 8) return null;

  // Tek kanala indir, iki banda ayır: bas (<~180 Hz) ve tiz/vurma (>~2 kHz)
  const aLow = 1 - Math.exp((-2 * Math.PI * 180) / sr);
  const aMid = 1 - Math.exp((-2 * Math.PI * 2000) / sr);
  const chData: Float32Array[] = [];
  for (let c = 0; c < channels; c++) chData.push(decoded.getChannelData(c));

  const low = new Float32Array(frames);
  const high = new Float32Array(frames);
  let lpLow = 0;
  let lpMid = 0;
  for (let f = 0; f < frames; f++) {
    let sumLow = 0;
    let sumHigh = 0;
    const start = f * HOP;
    for (let n = 0; n < HOP; n++) {
      let x = 0;
      for (let c = 0; c < channels; c++) x += chData[c][start + n];
      x /= channels;
      lpLow += aLow * (x - lpLow);
      lpMid += aMid * (x - lpMid);
      const hp = x - lpMid;
      sumLow += lpLow * lpLow;
      sumHigh += hp * hp;
    }
    low[f] = Math.sqrt(sumLow / HOP);
    high[f] = Math.sqrt(sumHigh / HOP);
  }

  // Logaritmik sıkıştırılmış enerji artışı (onset strength)
  const k = 30;
  const onset = new Float32Array(frames);
  for (let f = 1; f < frames; f++) {
    const dLow = Math.log1p(k * low[f]) - Math.log1p(k * low[f - 1]);
    const dHigh = Math.log1p(k * high[f]) - Math.log1p(k * high[f - 1]);
    onset[f] = Math.max(0, dLow) * 1.0 + Math.max(0, dHigh) * 0.55;
  }

  // Yerel (~1,5 sn) ortalama ve tepe değerine göre normalle: sessiz ve gürültülü bölümler eşit ele alınır
  const hopSec = HOP / sr;
  const win = Math.max(8, Math.round(0.75 / hopSec));
  const impulse = new Float32Array(frames);
  const minGap = Math.max(2, Math.round(0.09 / hopSec));
  let lastHit = -minGap;
  let hits = 0;
  for (let f = 1; f < frames - 1; f++) {
    if (!(onset[f] >= onset[f - 1] && onset[f] > onset[f + 1])) continue;
    const a = Math.max(0, f - win);
    const b = Math.min(frames - 1, f + win);
    let mean = 0;
    let peak = 0;
    for (let i = a; i <= b; i++) {
      mean += onset[i];
      if (onset[i] > peak) peak = onset[i];
    }
    mean /= b - a + 1;
    const thr = mean * 1.5 + 0.004;
    if (onset[f] <= thr || peak <= thr) continue;
    const strength = Math.min(1, 0.35 + (0.65 * (onset[f] - thr)) / (peak - thr));
    if (f - lastHit < minGap) {
      if (strength > impulse[lastHit]) {
        impulse[lastHit] = 0;
        impulse[f] = strength;
        lastHit = f;
      }
      continue;
    }
    impulse[f] = strength;
    lastHit = f;
    hits++;
  }

  // Her vuruş hızlı yükselip ~110 ms'de söner
  const decay = Math.exp(-hopSec / 0.11);
  const pulse = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    pulse[f] = Math.max(impulse[f], (f > 0 ? pulse[f - 1] : 0) * decay);
  }
  return { hopSec, pulse, hits };
}
