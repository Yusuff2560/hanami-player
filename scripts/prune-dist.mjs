// vite, onnxruntime-web'in wasm dosyasını assets/ altına da kopyalar; uygulama onu hiç kullanmaz
// (wasmPaths ile /ort/ altından yükler). Boyutu yarıya indirmek için siler.
import { readdirSync, rmSync, existsSync } from 'node:fs';

if (existsSync('dist/ort/ort-wasm-simd-threaded.wasm') && existsSync('dist/assets')) {
  for (const f of readdirSync('dist/assets')) {
    if (/^ort-wasm-simd-threaded.*\.wasm$/.test(f)) {
      rmSync('dist/assets/' + f);
      console.log('prune: dist/assets/' + f + ' silindi');
    }
  }
}
