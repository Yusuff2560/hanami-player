// onnxruntime-web'in wasm çalışma zamanını public/ort altına kopyalar (repoya girmez, derlemede üretilir).
import { cpSync, mkdirSync, readdirSync } from 'node:fs';

const src = 'node_modules/onnxruntime-web/dist';
const dst = 'public/ort';
mkdirSync(dst, { recursive: true });
let n = 0;
for (const f of readdirSync(src)) {
  if (/^ort-wasm-simd-threaded\.(wasm|mjs)$/.test(f)) {
    cpSync(`${src}/${f}`, `${dst}/${f}`);
    n++;
  }
}
console.log(`ort: ${n} dosya kopyalandı -> ${dst}`);
