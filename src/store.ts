import { create } from 'zustand';
import { audio, initAudioContext, setRhythm, startVisualizer } from './engine/audio';
import { analyzeTrack } from './engine/rhythm';
import { readCoverBlob } from './engine/id3';
import {
  libClear,
  libDelete,
  libLoadAll,
  libPatch,
  libPut,
  libSaveMeta,
  requestPersistentStorage,
  type TrackRecord
} from './library';
import { normalizeTheme } from './engine/themes';

export interface Track {
  id: number;
  name: string;
  file: File;
  size: number;
  url: string;
  fav: boolean;
  duration: string;
  durationSec: number;
  coverUrl: string | null;
  coverBlob: Blob | null;
  addedAt: number;
}

export interface ConfirmRequest {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
}

export interface Album {
  id: number;
  name: string;
  trackIds: number[];
  createdAt?: number;
}

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

export type View = 'music' | 'albums' | 'recent' | 'favorites';

const STORAGE_ALBUMS = 'hanami_albums_v1';
const STORAGE_THEME = 'hanami_theme_v1';
const STORAGE_FX = 'hanamiFxGain';
const STORAGE_FLASH = 'hanami_reduce_flash_v1';

export const fmt = (s: number) =>
  !isFinite(s) || s < 0 ? '0:00' : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

function readStorage<T>(key: string, fallback: T, parse: (raw: string) => T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : parse(raw);
  } catch {
    return fallback;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* depolama kapalı */
  }
}

interface State {
  tracks: Track[];
  current: number;
  queue: Track[];
  queueIndex: number;
  queueName: string;
  view: View;
  /** Son çalınan şarkıların kimlikleri (en yeni başta) */
  recent: number[];
  albums: Album[];
  libraryReady: boolean;
  confirm: ConfirmRequest | null;
  activeAlbumId: number | null;
  theme: string;
  fxGain: number;
  reduceFlash: boolean;
  toast: Toast | null;
  settingsOpen: boolean;
  playing: boolean;
  rhythmBusy: boolean;
  sidebarHidden: boolean;
  immersiveOpen: boolean;
  miniVisible: boolean;
  ipodVisible: boolean;
  modal: { open: boolean; editingId: number | null };

  addFiles: (files: File[]) => void;
  playFromQueue: (queue: Track[], index: number, name?: string) => void;
  playNext: () => void;
  playPrev: () => void;
  togglePlay: () => void;
  toggleFav: (trackId: number) => void;
  removeTrack: (trackId: number) => void;
  clearLibrary: () => void;
  askConfirm: (req: ConfirmRequest) => void;
  closeConfirm: () => void;
  setView: (view: View) => void;
  setActiveAlbum: (id: number | null) => void;
  setTheme: (key: string) => void;
  setFxGain: (value: number) => void;
  setReduceFlash: (value: boolean) => void;
  notify: (message: string, action?: Toast['action']) => void;
  dismissToast: () => void;
  setSettingsOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setImmersive: (open: boolean) => void;
  setMini: (visible: boolean) => void;
  setIpod: (visible: boolean) => void;
  openModal: (editingId?: number | null) => void;
  closeModal: () => void;
  saveAlbum: (name: string, trackIds: number[]) => void;
  deleteAlbum: (id: number) => void;
  removeTrackFromAlbum: (albumId: number, trackId: number) => void;
}

let nextTrackId = 1;

const prefersLight = typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: light)').matches;
const prefersReducedMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const initialTheme = normalizeTheme(readStorage(STORAGE_THEME, prefersLight ? 'snow' : 'sakura', v => v));

export const useStore = create<State>((set, get) => ({
  tracks: [],
  current: -1,
  queue: [],
  queueIndex: -1,
  queueName: 'Tüm müzikler',
  view: 'music',
  recent: [],
  libraryReady: false,
  confirm: null,
  albums: readStorage<Album[]>(STORAGE_ALBUMS, [], raw => JSON.parse(raw) || []),
  activeAlbumId: null,
  theme: initialTheme,
  fxGain: readStorage(STORAGE_FX, 1, raw => Number(raw)),
  reduceFlash: readStorage(STORAGE_FLASH, prefersReducedMotion, raw => raw === '1'),
  toast: null,
  settingsOpen: false,
  playing: false,
  rhythmBusy: false,
  sidebarHidden: false,
  immersiveOpen: false,
  miniVisible: false,
  ipodVisible: false,
  modal: { open: false, editingId: null },

  addFiles(files) {
    void (async () => {
      await hydrated; // kimlikler çakışmasın diye kayıtlı kütüphane yüklenmeden ekleme yapılmaz
      const state = get();
      const known = [...state.tracks];
      const fresh: Track[] = [];
      for (const f of files) {
        if (!f.type.startsWith('audio/') && !/\.(mp3|wav|flac|ogg|m4a|aac)$/i.test(f.name)) continue;
        const name = f.name.replace(/\.[^.]+$/, '');
        if (known.some(t => t.name === name && t.size === f.size)) continue;
        const item: Track = {
          id: nextTrackId++,
          name,
          file: f,
          size: f.size,
          url: URL.createObjectURL(f),
          fav: false,
          duration: '--:--',
          durationSec: 0,
          coverUrl: null,
          coverBlob: null,
          addedAt: Date.now()
        };
        known.push(item);
        fresh.push(item);

        void libPut(trackToRecord(item)).then(ok => {
          if (!ok) get().notify('Şarkı kalıcı olarak kaydedilemedi (depolama dolu olabilir). Bu oturumda çalmaya devam eder.');
        });

        const probe = new Audio();
        probe.src = item.url;
        probe.onloadedmetadata = () => {
          if (probe.duration && isFinite(probe.duration)) {
            patchTrack(item.id, { durationSec: probe.duration, duration: fmt(probe.duration) });
            void libPatch(item.id, { durationSec: probe.duration });
          }
        };
        if (/\.(mp3|m4a)$/i.test(f.name)) {
          readCoverBlob(f).then(blob => {
            if (!blob) return;
            patchTrack(item.id, { coverUrl: URL.createObjectURL(blob), coverBlob: blob });
            void libPatch(item.id, { cover: blob });
          });
        }
      }

      set(s => ({
        tracks: known,
        queue: s.queue.length ? s.queue : known,
        queueName: s.queue.length ? s.queueName : 'Tüm müzikler'
      }));

      if (fresh.length) void requestPersistentStorage();
      if (fresh.length === 0 && files.length) {
        get().notify('Desteklenen bir ses dosyası bulunamadı ya da dosyalar zaten kitaplıkta.');
      }
    })();
  },

  playFromQueue(queue, index, name) {
    if (!queue.length || index < 0 || index >= queue.length) return;
    initAudioContext();
    const track = queue[index];
    const trackIndex = get().tracks.findIndex(t => t.id === track.id);
    audio.src = track.url;
    audio.play().then(startVisualizer).catch(() => {});
    setRhythm(null);
    set({ rhythmBusy: true });
    analyzeTrack(track.id, track.file).then(r => {
      const now = get().tracks[get().current];
      if (!now || now.id !== track.id) return; // bu arada başka şarkıya geçildi
      if (r) setRhythm(r);
      set({ rhythmBusy: false });
      // Sıradaki şarkıyı arka planda önceden analiz et ki geçince beklenmesin
      const { queue, queueIndex } = get();
      const next = queue[(queueIndex + 1) % queue.length];
      if (next && next.id !== track.id) void analyzeTrack(next.id, next.file);
    });
    set(s => ({
      queue,
      queueIndex: index,
      queueName: name || 'HANAMI',
      current: trackIndex,
      recent: [track.id, ...s.recent.filter(x => x !== track.id)].slice(0, 50)
    }));
  },

  playNext() {
    const { queue, queueIndex, queueName, tracks, playFromQueue } = get();
    if (!queue.length) {
      if (tracks.length) playFromQueue(tracks, 0, 'Tüm müzikler');
      return;
    }
    playFromQueue(queue, (queueIndex + 1) % queue.length, queueName);
  },

  playPrev() {
    const { queue, queueIndex, queueName, tracks, playFromQueue } = get();
    if (!queue.length) {
      if (tracks.length) playFromQueue(tracks, 0, 'Tüm müzikler');
      return;
    }
    playFromQueue(queue, queueIndex <= 0 ? queue.length - 1 : queueIndex - 1, queueName);
  },

  togglePlay() {
    const { current, tracks, playFromQueue } = get();
    initAudioContext();
    if (current < 0) {
      if (tracks.length) playFromQueue(tracks, 0, 'Tüm müzikler');
      return;
    }
    if (audio.paused) audio.play().then(startVisualizer).catch(() => {});
    else audio.pause();
  },

  toggleFav(trackId) {
    const track = get().tracks.find(t => t.id === trackId);
    if (!track) return;
    const fav = !track.fav;
    set(s => ({ tracks: s.tracks.map(t => (t.id === trackId ? { ...t, fav } : t)) }));
    void libPatch(trackId, { fav });
  },

  removeTrack(trackId) {
    const s = get();
    const track = s.tracks.find(t => t.id === trackId);
    if (!track) return;
    const curId = s.tracks[s.current]?.id;
    const wasCurrent = curId === trackId;
    if (wasCurrent) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      setRhythm(null);
    }
    const tracks = s.tracks.filter(t => t.id !== trackId);
    const queue = s.queue.filter(t => t.id !== trackId);
    set({
      tracks,
      queue,
      recent: s.recent.filter(id => id !== trackId),
      current: wasCurrent ? -1 : tracks.findIndex(t => t.id === curId),
      queueIndex: wasCurrent ? -1 : queue.findIndex(t => t.id === curId),
      playing: wasCurrent ? false : s.playing
    });
    void libDelete(trackId);
    get().notify(`"${track.name}" kitaplıktan kaldırıldı. Orijinal dosyan silinmedi.`, {
      label: 'Geri al',
      run: () => {
        void libPut(trackToRecord(track));
        set(cur => ({
          tracks: [...cur.tracks, track].sort((x, y) => x.addedAt - y.addedAt || x.id - y.id),
          toast: null
        }));
      }
    });
  },

  clearLibrary() {
    get().askConfirm({
      title: 'Kitaplık temizlensin mi?',
      message: 'Eklediğin tüm şarkılar, albümler, favoriler ve son çalınanlar HANAMI\'den silinir. Orijinal müzik dosyaların bilgisayarında kalır. Bu işlem geri alınamaz.',
      confirmLabel: 'Kitapl??? temizle',
      onConfirm: () => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        setRhythm(null);
        get().tracks.forEach(t => {
          URL.revokeObjectURL(t.url);
          if (t.coverUrl) URL.revokeObjectURL(t.coverUrl);
        });
        writeStorage(STORAGE_ALBUMS, '[]');
        set({
          tracks: [], queue: [], queueIndex: -1, current: -1, recent: [], albums: [],
          activeAlbumId: null, playing: false, immersiveOpen: false, confirm: null
        });
        void libClear();
        get().notify('Kitaplık temizlendi.');
      }
    });
  },

  askConfirm(req) {
    set({ confirm: req });
  },

  closeConfirm() {
    set({ confirm: null });
  },

  setView(view) {
    set({ view, activeAlbumId: null });
  },

  setActiveAlbum(id) {
    set({ activeAlbumId: id });
  },

  setTheme(key) {
    const theme = normalizeTheme(key);
    writeStorage(STORAGE_THEME, theme);
    set({ theme });
  },

  setFxGain(value) {
    writeStorage(STORAGE_FX, String(value));
    set({ fxGain: value });
  },

  setReduceFlash(value) {
    writeStorage(STORAGE_FLASH, value ? '1' : '0');
    set({ reduceFlash: value });
  },

  notify(message, action) {
    set({ toast: { id: Date.now(), message, action } });
  },

  dismissToast() {
    set({ toast: null });
  },

  setSettingsOpen(open) {
    set({ settingsOpen: open });
  },

  toggleSidebar() {
    set(s => ({ sidebarHidden: !s.sidebarHidden }));
  },

  setImmersive(open) {
    if (open && get().current < 0) return;
    set({ immersiveOpen: open });
  },

  setMini(visible) {
    set({ miniVisible: visible });
  },

  setIpod(visible) {
    set({ ipodVisible: visible });
  },

  openModal(editingId = null) {
    if (!get().tracks.length) {
      get().notify('Önce müzik eklemelisin. "Müzik ekle" ile başlayabilirsin.');
      return;
    }
    set({ modal: { open: true, editingId } });
  },

  closeModal() {
    set({ modal: { open: false, editingId: null } });
  },

  saveAlbum(name, trackIds) {
    const { modal, albums } = get();
    let next: Album[];
    let activeAlbumId = get().activeAlbumId;
    if (modal.editingId) {
      next = albums.map(a => (a.id === modal.editingId ? { ...a, name, trackIds } : a));
    } else {
      const created: Album = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        name,
        trackIds,
        createdAt: Date.now()
      };
      next = [...albums, created];
      activeAlbumId = created.id;
    }
    writeStorage(STORAGE_ALBUMS, JSON.stringify(next));
    set({ albums: next, activeAlbumId, view: 'albums', modal: { open: false, editingId: null } });
  },

  deleteAlbum(id) {
    const { albums, activeAlbumId } = get();
    const index = albums.findIndex(a => a.id === id);
    if (index < 0) return;
    const removed = albums[index];
    const next = albums.filter(a => a.id !== id);
    writeStorage(STORAGE_ALBUMS, JSON.stringify(next));
    set({ albums: next, activeAlbumId: activeAlbumId === id ? null : activeAlbumId });
    get().notify(`"${removed.name}" albümü silindi. Şarkıların kitaplıkta duruyor.`, {
      label: 'Geri al',
      run: () => {
        const restored = [...get().albums];
        restored.splice(Math.min(index, restored.length), 0, removed);
        writeStorage(STORAGE_ALBUMS, JSON.stringify(restored));
        set({ albums: restored, toast: null });
      }
    });
  },

  removeTrackFromAlbum(albumId, trackId) {
    const next = get().albums.map(a =>
      a.id === albumId ? { ...a, trackIds: a.trackIds.filter(id => id !== trackId) } : a
    );
    writeStorage(STORAGE_ALBUMS, JSON.stringify(next));
    set({ albums: next });
  }
}));

function trackToRecord(t: Track): TrackRecord {
  return {
    id: t.id,
    name: t.name,
    size: t.size,
    lastModified: t.file.lastModified,
    type: t.file.type,
    file: t.file,
    fav: t.fav,
    durationSec: t.durationSec,
    cover: t.coverBlob,
    addedAt: t.addedAt
  };
}

function recordToTrack(r: TrackRecord): Track {
  const file = r.file instanceof File ? r.file : new File([r.file], r.name, { type: r.type, lastModified: r.lastModified });
  return {
    id: r.id,
    name: r.name,
    file,
    size: r.size,
    url: URL.createObjectURL(file),
    fav: r.fav,
    duration: r.durationSec > 0 ? fmt(r.durationSec) : '--:--',
    durationSec: r.durationSec,
    coverUrl: r.cover ? URL.createObjectURL(r.cover) : null,
    coverBlob: r.cover,
    addedAt: r.addedAt
  };
}

let hydratedFlag = false;
// Açılışta kayıtlı kütüphaneyi geri yükle
const hydrated: Promise<void> = (async () => {
  try {
    const { tracks: recs, meta } = await libLoadAll();
    if (recs.length) {
      nextTrackId = Math.max(nextTrackId, ...recs.map(r => r.id + 1));
      const loaded = recs.map(recordToTrack);
      const ids = new Set(loaded.map(t => t.id));
      useStore.setState(s => ({
        tracks: loaded,
        queue: s.queue.length ? s.queue : loaded,
        recent: (meta.recent ?? []).filter(id => ids.has(id))
      }));
    }
  } catch (e) {
    console.warn('Kütüphane yüklenemedi:', e);
  } finally {
    hydratedFlag = true;
    useStore.setState({ libraryReady: true });
  }
})();

// Son çalınanları kalıcı yap (yükleme bitmeden boş listeyle üzerine yazma)
useStore.subscribe((state, prev) => {
  if (hydratedFlag && state.recent !== prev.recent) void libSaveMeta({ recent: state.recent });
});

function patchTrack(id: number, patch: Partial<Track>) {
  useStore.setState(s => ({ tracks: s.tracks.map(t => (t.id === id ? { ...t, ...patch } : t)) }));
}

audio.onended = () => useStore.getState().playNext();
audio.onplay = () => {
  useStore.setState({ playing: true });
  startVisualizer();
};
audio.onpause = () => useStore.setState({ playing: false });
audio.onloadedmetadata = () => {
  const { current, tracks } = useStore.getState();
  const t = tracks[current];
  if (t && isFinite(audio.duration)) patchTrack(t.id, { durationSec: audio.duration, duration: fmt(audio.duration) });
};

export function getCurrentTrack(): Track | null {
  const { current, tracks } = useStore.getState();
  return tracks[current] ?? null;
}
