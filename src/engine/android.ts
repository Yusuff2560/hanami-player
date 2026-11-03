// Android (Capacitor) kabuğu: arka planda çalma servisi, bildirim düğmeleri ve geri tuşu.
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { STORAGE_DEVICE_ASKED, STORAGE_DEVICE_AUTO, useStore } from '../store';
import { hasDeviceAccess, isAndroidApp, openAppSettings, requestDeviceAccess, scanDevice } from './deviceMusic';

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* depolama kapalı */
  }
};

let scanning = false;

if (import.meta.env.DEV) {
  (window as unknown as { __hanamiStartDevice: () => Promise<void> }).__hanamiStartDevice = () => startDeviceMusic();
}

/**
 * Cihazdaki müzikleri bulup kitaplığa ekler (dosyalar kopyalanmaz).
 * @param silent true ise sonuç bildirimi gösterilmez (açılışta ve uygulamaya dönünce otomatik tarama)
 */
export async function importDeviceMusic(silent = false): Promise<void> {
  if (!isAndroidApp() || scanning) return;
  const store = useStore.getState();
  scanning = true;
  store.setDeviceScanning(true);
  try {
    let granted = await hasDeviceAccess();
    if (!granted && !silent) granted = await requestDeviceAccess();
    if (!granted) {
      if (!silent) {
        store.notify('Müzikleri bulmak için izin gerekli. Ayarlar > İzinler > Müzik ve ses bölümünden açabilirsin.', {
          label: 'Ayarları aç',
          run: () => void openAppSettings()
        });
      }
      return;
    }
    const items = await scanDevice();
    const r = await useStore.getState().syncDeviceTracks(items);
    write(STORAGE_DEVICE_AUTO, '1');
    if (silent) return;
    if (r.total === 0) {
      store.notify('Cihazında müzik bulunamadı. En az 15 saniyelik müzik dosyaları aranır.');
    } else if (r.added === 0 && r.removed === 0) {
      store.notify('Kitaplığın güncel: ' + r.total + ' şarkı.');
    } else {
      store.notify(r.added + ' şarkı eklendi' + (r.removed ? ', ' + r.removed + ' şarkı artık cihazda olmadığı için kaldırıldı' : '') + '.');
    }
  } catch (e) {
    console.warn('Cihaz müziği taranamadı:', e);
    if (!silent) store.notify('Müzikler taranamadı. Biraz sonra tekrar dene.');
  } finally {
    scanning = false;
    useStore.getState().setDeviceScanning(false);
  }
}

// Kitaplık yüklendikten sonra çalıştır (kayıtlı şarkılarla çakışmamak için)
function whenLibraryReady(): Promise<void> {
  return new Promise(resolve => {
    if (useStore.getState().libraryReady) return resolve();
    const off = useStore.subscribe(state => {
      if (state.libraryReady) {
        off();
        resolve();
      }
    });
  });
}

/** Açılışta: izin varsa sessizce eşitle; ilk kullanımda ne için izin istendiğini anlatıp sor. */
export async function startDeviceMusic() {
  await whenLibraryReady();
  const granted = await hasDeviceAccess();
  const auto = read(STORAGE_DEVICE_AUTO);

  if (granted && auto !== '0') {
    void importDeviceMusic(true);
    return;
  }
  if (!granted && useStore.getState().tracks.length === 0 && read(STORAGE_DEVICE_ASKED) === null) {
    useStore.getState().askConfirm({
      title: 'Cihazındaki müzikleri bulalım mı?',
      message:
        'HANAMI, telefonundaki müzik dosyalarını bulup kitaplığına ekleyebilir. Bunun için müziklere erişim izni istenecek. Dosyaların kopyalanmaz ve hiçbir yere gönderilmez.',
      confirmLabel: 'Müzikleri bul',
      cancelLabel: 'Şimdi değil',
      tone: 'default',
      onConfirm: () => {
        write(STORAGE_DEVICE_ASKED, '1');
        void importDeviceMusic();
      },
      onCancel: () => write(STORAGE_DEVICE_ASKED, '1')
    });
  }
}

interface HanamiPlayback {
  update(options: { title: string; artist: string; playing: boolean; cover?: string }): Promise<void>;
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
    const key = `${track.id}|${state.playing}|${artist}|${track.coverBlob ? 1 : 0}`;
    if (key === lastKey) return;
    lastKey = key;
    void (async () => {
      if (state.playing && !permissionAsked) {
        permissionAsked = true;
        await Playback.ensureNotificationPermission().catch(() => {});
      }
      const cover = await coverForNotification(track.coverBlob);
      await Playback.update({ title: track.name, artist, playing: state.playing, cover }).catch(() => {});
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

  void startDeviceMusic();

  // Uygulamaya dönünce: yeni eklenen / silinen şarkıları sessizce eşitle
  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && read(STORAGE_DEVICE_AUTO) === '1') void importDeviceMusic(true);
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

/** Bildirim ve kilit ekranı için kapağı en fazla 320 px JPEG'e küçültür (base64) */
async function coverForNotification(blob: Blob | null): Promise<string | undefined> {
  if (!blob) return undefined;
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(bmp.width * k));
    c.height = Math.max(1, Math.round(bmp.height * k));
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    return c.toDataURL('image/jpeg', 0.85).split(',')[1];
  } catch {
    return undefined;
  }
}
