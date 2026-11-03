// Beat This! (small0) için çalıştırıcıdan bağımsız çekirdek: parçalama, birleştirme ve tepe seçimi.
// Resmi uygulamanın (CPJKU/beat_this, MIT) inference.py ve postprocessor.py mantığıyla birebir.

export const FPS = 50; // 22050 Hz / 441 hop
export const MELS = 128;
const CHUNK = 1500;
const BORDER = 6;

export interface BeatRunner {
  /** 22,05 kHz mono ses -> log-mel [frames x 128] */
  logmel(audio: Float32Array): Promise<{ data: Float32Array; frames: number }>;
  /** [frames x 128] -> kare başına vuruş ve downbeat logit'leri */
  beat(spect: Float32Array, frames: number): Promise<{ beat: Float32Array; downbeat: Float32Array }>;
}

export interface BeatResult {
  beats: Float32Array; // saniye
  downbeats: Float32Array; // saniye (her biri en yakın vuruşa oturtulmuş)
}

export async function trackBeats(
  audio22k: Float32Array,
  runner: BeatRunner,
  onProgress?: (done: number, total: number) => void
): Promise<BeatResult> {
  const { data: spect, frames: T } = await runner.logmel(audio22k);
  if (T < 16) return { beats: new Float32Array(0), downbeats: new Float32Array(0) };

  // --- parçala (split_piece) ---
  const step = CHUNK - 2 * BORDER;
  const starts: number[] = [];
  for (let s = -BORDER; s < T - BORDER; s += step) starts.push(s);
  if (T > step) starts[starts.length - 1] = T - (CHUNK - BORDER);

  const predBeat = new Float32Array(T).fill(-1000);
  const predDown = new Float32Array(T).fill(-1000);

  // --- çalıştır ve "ilkini koru" ile birleştir: sondan başa yazarak ---
  const outs: { beat: Float32Array; downbeat: Float32Array }[] = [];
  for (let c = 0; c < starts.length; c++) {
    const start = starts[c];
    const from = Math.max(start, 0);
    const to = Math.min(start + CHUNK, T);
    const left = Math.max(0, -start);
    const right = Math.max(0, Math.min(BORDER, start + CHUNK - T));
    const len = left + (to - from) + right;
    const chunk = new Float32Array(len * MELS); // sıfır dolgulu
    chunk.set(spect.subarray(from * MELS, to * MELS), left * MELS);
    outs.push(await runner.beat(chunk, len));
    onProgress?.(c + 1, starts.length);
  }
  for (let c = starts.length - 1; c >= 0; c--) {
    const start = starts[c];
    const { beat, downbeat } = outs[c];
    const inner = beat.length - 2 * BORDER;
    for (let i = 0; i < inner; i++) {
      const idx = start + BORDER + i;
      if (idx < 0 || idx >= T) continue;
      predBeat[idx] = beat[BORDER + i];
      predDown[idx] = downbeat[BORDER + i];
    }
  }

  // --- minimal son işlem ---
  const beatFrames = dedupe(pickPeaks(predBeat));
  const downFrames = dedupe(pickPeaks(predDown));
  const beats = Float32Array.from(beatFrames, f => f / FPS);
  const downRaw = Float32Array.from(downFrames, f => f / FPS);

  const snapped = new Set<number>();
  for (const d of downRaw) {
    let best = d;
    let bestDist = Infinity;
    for (const b of beats) {
      const dist = Math.abs(b - d);
      if (dist < bestDist) {
        bestDist = dist;
        best = b;
      }
    }
    snapped.add(best);
  }
  return { beats, downbeats: Float32Array.from([...snapped].sort((a, b) => a - b)) };
}

// ±3 kare (±70 ms) içindeki en büyük ve logit > 0 olan kareler
function pickPeaks(logits: Float32Array): number[] {
  const peaks: number[] = [];
  const n = logits.length;
  for (let i = 0; i < n; i++) {
    const v = logits[i];
    if (v <= 0) continue;
    let isMax = true;
    for (let k = Math.max(0, i - 3); k <= Math.min(n - 1, i + 3); k++) {
      if (logits[k] > v) {
        isMax = false;
        break;
      }
    }
    if (isMax) peaks.push(i);
  }
  return peaks;
}

// Yan yana (≤1 kare) tepeleri ortalamayla birleştir
function dedupe(peaks: number[]): number[] {
  const result: number[] = [];
  if (!peaks.length) return result;
  let p = peaks[0];
  let c = 1;
  for (let i = 1; i < peaks.length; i++) {
    const p2 = peaks[i];
    if (p2 - p <= 1) {
      c++;
      p += (p2 - p) / c;
    } else {
      result.push(p);
      p = p2;
      c = 1;
    }
  }
  result.push(p);
  return result;
}
