// Beat This! (small0) modelini ses iş parçacığından bağımsız çalıştırır; arayüz takılmaz.
import * as ort from 'onnxruntime-web/wasm';
import { trackBeats, MELS, type BeatRunner } from './beatCore';

interface InitMsg {
  type: 'init';
  ortBase: string;
  logmelUrl: string;
  beatUrl: string;
}
interface AnalyzeMsg {
  type: 'analyze';
  id: number;
  audio: Float32Array;
}

let runner: Promise<BeatRunner> | null = null;

function createRunner(msg: InitMsg): Promise<BeatRunner> {
  ort.env.wasm.wasmPaths = msg.ortBase;
  ort.env.wasm.numThreads = 1; // SharedArrayBuffer (çapraz kaynak yalıtımı) gerektirmez
  const opts: ort.InferenceSession.SessionOptions = { executionProviders: ['wasm'], graphOptimizationLevel: 'all' };
  return (async () => {
    const [lm, bt] = await Promise.all([
      ort.InferenceSession.create(msg.logmelUrl, opts),
      ort.InferenceSession.create(msg.beatUrl, opts)
    ]);
    return {
      async logmel(audio) {
        const out = await lm.run({ audio: new ort.Tensor('float32', audio, [audio.length]) });
        const t = out.spect;
        const frames = t.dims.length === 3 ? t.dims[1] : t.dims[0];
        return { data: t.data as Float32Array, frames };
      },
      async beat(spect, frames) {
        const out = await bt.run({ spect: new ort.Tensor('float32', spect, [1, frames, MELS]) });
        return { beat: out.beat.data as Float32Array, downbeat: out.downbeat.data as Float32Array };
      }
    } satisfies BeatRunner;
  })();
}

self.onmessage = async (e: MessageEvent<InitMsg | AnalyzeMsg>) => {
  const msg = e.data;
  if (msg.type === 'init') {
    runner = createRunner(msg);
    runner.then(
      () => self.postMessage({ type: 'ready' }),
      err => self.postMessage({ type: 'error', message: String(err) })
    );
    return;
  }
  if (msg.type === 'analyze') {
    try {
      const r = await runner!;
      const result = await trackBeats(msg.audio, r, (done, total) =>
        self.postMessage({ type: 'progress', id: msg.id, done, total })
      );
      self.postMessage({ type: 'result', id: msg.id, beats: result.beats, downbeats: result.downbeats });
    } catch (err) {
      self.postMessage({ type: 'error', id: msg.id, message: String(err) });
    }
  }
};
