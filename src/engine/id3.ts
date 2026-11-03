// MP3/M4A içindeki ID3 APIC (kapak resmi) çerçevesini okur.
export async function readCoverBlob(file: Blob): Promise<Blob | null> {
  try {
    const head = await file.slice(0, Math.min(file.size, 8 * 1024 * 1024)).arrayBuffer();
    const b = new Uint8Array(head);
    if (b.length < 10 || String.fromCharCode(...b.slice(0, 3)) !== 'ID3') return null;
    const ver = b[3];
    const size = ((b[6] & 127) << 21) | ((b[7] & 127) << 14) | ((b[8] & 127) << 7) | (b[9] & 127);
    let pos = 10;
    const end = Math.min(10 + size, b.length);

    while (pos + 10 < end) {
      const id = String.fromCharCode(...b.slice(pos, pos + 4));
      if (!id.trim() || id.charCodeAt(0) === 0) break;
      const n =
        ver === 4
          ? ((b[pos + 4] & 127) << 21) | ((b[pos + 5] & 127) << 14) | ((b[pos + 6] & 127) << 7) | (b[pos + 7] & 127)
          : (b[pos + 4] << 24) | (b[pos + 5] << 16) | (b[pos + 6] << 8) | b[pos + 7];
      if (n <= 0 || pos + 10 + n > end) break;

      if (id === 'APIC') {
        let q = pos + 10;
        const enc = b[q++];
        let mime = 'image/jpeg';
        const mimeStart = q;
        while (q < pos + 10 + n && b[q] !== 0) q++;
        const mimeStr = String.fromCharCode(...b.slice(mimeStart, q));
        if (mimeStr.includes('png')) mime = 'image/png';
        q++;
        q++;
        if (enc === 1 || enc === 2) {
          while (q + 1 < pos + 10 + n && !(b[q] === 0 && b[q + 1] === 0)) q += 2;
          q += 2;
        } else {
          while (q < pos + 10 + n && b[q] !== 0) q++;
          q++;
        }
        if (q < pos + 10 + n) {
          const blob = new Blob([b.slice(q, pos + 10 + n)], { type: mime });
          if (blob.size > 0) return blob;
        }
      }
      pos += 10 + n;
    }
  } catch {
    /* kapak okunamadı */
  }
  return null;
}

export async function readMp3Cover(file: Blob): Promise<string | null> {
  const blob = await readCoverBlob(file);
  return blob ? URL.createObjectURL(blob) : null;
}
