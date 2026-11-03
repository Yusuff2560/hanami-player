// Kütüphane kalıcılığı: eklenen şarkılar (dosyanın kendisi dahil) yerel IndexedDB'de saklanır.
// Böylece uygulamayı kapatıp açınca şarkılar, favoriler, son çalınanlar ve albümler yerinde kalır.
// Not: dosyanın bir kopyası uygulama deposunda tutulur; orijinal dosya değişmez ve silinmez.

export interface TrackRecord {
  id: number;
  name: string;
  size: number;
  lastModified: number;
  type: string;
  /** Seçilen dosyanın kendisi; cihaz müziğinde (mediaId) null: dosya cihazda kalır, kopyalanmaz */
  file: Blob | null;
  /** Android MediaStore kimliği (yalnızca cihaz müziği) */
  mediaId?: number;
  artist?: string;
  fav: boolean;
  durationSec: number;
  cover: Blob | null;
  addedAt: number;
}

export interface LibraryMeta {
  recent: number[];
  /** Kullanıcının kitaplıktan kaldırdığı cihaz müzikleri (MediaStore kimlikleri): yeniden taramada eklenmez */
  hidden?: number[];
}

const DB_NAME = 'hanami-library';
const TRACKS = 'tracks';
const META = 'meta';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (!dbPromise) {
    dbPromise = new Promise(resolve => {
      try {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          db.createObjectStore(TRACKS, { keyPath: 'id' });
          db.createObjectStore(META);
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
  }
  return dbPromise;
}

function wrap<T>(req: IDBRequest<T>): Promise<T | undefined> {
  return new Promise(resolve => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

export async function libAvailable(): Promise<boolean> {
  return (await openDb()) !== null;
}

export async function libLoadAll(): Promise<{ tracks: TrackRecord[]; meta: LibraryMeta }> {
  const db = await openDb();
  if (!db) return { tracks: [], meta: { recent: [] } };
  const tx = db.transaction([TRACKS, META]);
  const tracks = ((await wrap(tx.objectStore(TRACKS).getAll())) as TrackRecord[] | undefined) ?? [];
  const meta = ((await wrap(tx.objectStore(META).get('state'))) as LibraryMeta | undefined) ?? { recent: [] };
  tracks.sort((a, b) => a.addedAt - b.addedAt || a.id - b.id);
  return { tracks, meta };
}

/** Başarılıysa true; kota dolu ya da depolama kapalıysa false */
export async function libPut(record: TrackRecord): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TRACKS, 'readwrite');
      tx.objectStore(TRACKS).put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/** Binlerce kaydı tek işlemde yazar (cihaz müziği taraması) */
export async function libPutMany(records: TrackRecord[]): Promise<boolean> {
  const db = await openDb();
  if (!db) return false;
  return new Promise(resolve => {
    try {
      const tx = db.transaction(TRACKS, 'readwrite');
      const store = tx.objectStore(TRACKS);
      records.forEach(r => store.put(r));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
      tx.onabort = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function libDeleteMany(ids: number[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(TRACKS, 'readwrite');
      ids.forEach(id => tx.objectStore(TRACKS).delete(id));
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function libPatch(id: number, patch: Partial<TrackRecord>): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(TRACKS, 'readwrite');
      const store = tx.objectStore(TRACKS);
      const get = store.get(id);
      get.onsuccess = () => {
        const cur = get.result as TrackRecord | undefined;
        if (cur) store.put({ ...cur, ...patch });
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function libDelete(id: number): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction(TRACKS, 'readwrite');
      tx.objectStore(TRACKS).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function libClear(): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>(resolve => {
    try {
      const tx = db.transaction([TRACKS, META], 'readwrite');
      tx.objectStore(TRACKS).clear();
      tx.objectStore(META).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function libSaveMeta(meta: LibraryMeta): Promise<void> {
  const db = await openDb();
  if (!db) return;
  try {
    db.transaction(META, 'readwrite').objectStore(META).put(meta, 'state');
  } catch {
    /* yazılamadı */
  }
}

/** Tarayıcının bu site için ayırdığı alan; "kalıcı depolama" istenir ki otomatik silinmesin */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* desteklenmiyor */
  }
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}
