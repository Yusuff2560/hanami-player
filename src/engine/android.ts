// Android (Capacitor) kabuğu: arka planda çalma servisi, bildirim düğmeleri ve geri tuşu.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { useStore } from '../store';

interface HanamiPlayback {
  update(options: { title: string; artist: string; playing: boolean }): Promise<void>;
  stop(): Promise<void>;
  ensureNotificationPermission(): Promise<void>;
  addListener(event: 'action', cb: (e: { action: string }) => void): Promise<PluginListenerHandle>;
}

export function initAndroid(): () => void {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') return () => {};

  const Playback = registerPlugin<HanamiPlayback>('HanamiPlayback');
  const cleanups: (() => void)[] = [];
  let permissionAsked = false;
  let lastKey = '';

  // Çalan şarkı / durum değişince servisi ve bildirimi güncelle
  const unsubscribe = useStore.subscribe(state => {
    const track = state.tracks[state.current];
    if (!track) {
      if (lastKey) void Playback.stop().catch(() => {});
      lastKey = '';
      return;
    }
    const artist = state.queueName && state.queueName !== 'Tüm müzikler' ? state.queueName : 'HANAMI';
    const key = `${track.id}|${state.playing}|${artist}`;
    if (key === lastKey) return;
    lastKey = key;
    void (async () => {
      if (state.playing && !permissionAsked) {
        permissionAsked = true;
        await Playback.ensureNotificationPermission().catch(() => {});
      }
      await Playback.update({ title: track.name, artist, playing: state.playing }).catch(() => {});
    })();
  });
  cleanups.push(unsubscribe);

  // Bildirimdeki düğmeler
  void Playback.addListener('action', ({ action }) => {
    const s = useStore.getState();
    if (action === 'play' || action === 'pause') s.togglePlay();
    else if (action === 'next') s.playNext();
    else if (action === 'prev') s.playPrev();
  }).then(h => cleanups.push(() => void h.remove()));

  // Geri tuşu: önce açık katmanı kapat; müzik çalıyorsa uygulamayı arka plana al, yoksa çık
  void App.addListener('backButton', () => {
    const s = useStore.getState();
    if (s.modal.open) s.closeModal();
    else if (s.settingsOpen) s.setSettingsOpen(false);
    else if (s.immersiveOpen) s.setImmersive(false);
    else if (s.activeAlbumId !== null) s.setActiveAlbum(null);
    else if (s.playing) void App.minimizeApp();
    else void App.exitApp();
  }).then(h => cleanups.push(() => void h.remove()));

  return () => cleanups.forEach(fn => fn());
}
