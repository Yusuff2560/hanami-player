import { create } from 'zustand';
import { audio, initAudioContext, startVisualizer } from './engine/audio';
import { readMp3Cover } from './engine/id3';
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
}

export interface Album {
  id: number;
  name: string;
  trackIds: number[];
  createdAt?: number;
}

export type View = 'music' | 'albums' | 'recent' | 'favorites';

const STORAGE_ALBUMS = 'hanami_albums_v1';
const STORAGE_THEME = 'hanami_theme_v1';
const STORAGE_FX = 'hanamiFxGain';

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
  recent: number[];
  albums: Album[];
  activeAlbumId: number | null;
  theme: string;
  fxGain: number;
  playing: boolean;
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
  setView: (view: View) => void;
  setActiveAlbum: (id: number | null) => void;
  setTheme: (key: string) => void;
  setFxGain: (value: number) => void;
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

const initialTheme = normalizeTheme(readStorage(STORAGE_THEME, 'sakura', v => v));

export const useStore = create<State>((set, get) => ({
  tracks: [],
  current: -1,
  queue: [],
  queueIndex: -1,
  queueName: 'Tüm müzikler',
  view: 'music',
  recent: [],
  albums: readStorage<Album[]>(STORAGE_ALBUMS, [], raw => JSON.parse(raw) || []),
  activeAlbumId: null,
  theme: initialTheme,
  fxGain: readStorage(STORAGE_FX, 1, raw => Number(raw)),
  playing: false,
  immersiveOpen: false,
  miniVisible: false,
  ipodVisible: false,
  modal: { open: false, editingId: null },

  addFiles(files) {
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
        coverUrl: null
      };
      known.push(item);
      fresh.push(item);

      const probe = new Audio();
      probe.src = item.url;
      probe.onloadedmetadata = () => {
        if (probe.duration && isFinite(probe.duration)) {
          patchTrack(item.id, { durationSec: probe.duration, duration: fmt(probe.duration) });
        }
      };
      if (/\.(mp3|m4a)$/i.test(f.name)) {
        readMp3Cover(f).then(u => {
          if (u) patchTrack(item.id, { coverUrl: u });
        });
      }
    }

    set(s => ({
      tracks: known,
      queue: s.queue.length ? s.queue : known,
      queueName: s.queue.length ? s.queueName : 'Tüm müzikler'
    }));

    if (fresh.length === 0 && files.length) {
      alert('Seçilen dosyalarda desteklenen bir ses dosyası bulunamadı veya dosyalar zaten kitaplıkta.');
    }
  },

  playFromQueue(queue, index, name) {
    if (!queue.length || index < 0 || index >= queue.length) return;
    initAudioContext();
    const track = queue[index];
    const trackIndex = get().tracks.findIndex(t => t.id === track.id);
    audio.src = track.url;
    audio.play().then(startVisualizer).catch(() => {});
    set(s => ({
      queue,
      queueIndex: index,
      queueName: name || 'HANAMI',
      current: trackIndex,
      recent: trackIndex >= 0 ? [trackIndex, ...s.recent.filter(x => x !== trackIndex)].slice(0, 50) : s.recent
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
    set(s => ({ tracks: s.tracks.map(t => (t.id === trackId ? { ...t, fav: !t.fav } : t)) }));
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
      alert('Kütüphanende henüz müzik bulunmuyor.\nÖnce "＋ Müzik ekle" düğmesini kullanarak bilgisayarından şarkı eklemelisin.');
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
    const album = get().albums.find(a => a.id === id);
    if (!album) return;
    if (!confirm(`"${album.name}" albümünü silmek istediğine emin misin?\n(Şarkıların kitaplığından silinmeyecektir)`)) return;
    const next = get().albums.filter(a => a.id !== id);
    writeStorage(STORAGE_ALBUMS, JSON.stringify(next));
    set(s => ({ albums: next, activeAlbumId: s.activeAlbumId === id ? null : s.activeAlbumId }));
  },

  removeTrackFromAlbum(albumId, trackId) {
    const next = get().albums.map(a =>
      a.id === albumId ? { ...a, trackIds: a.trackIds.filter(id => id !== trackId) } : a
    );
    writeStorage(STORAGE_ALBUMS, JSON.stringify(next));
    set({ albums: next });
  }
}));

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
