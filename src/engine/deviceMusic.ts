// Android cihazdaki müzikler (MediaStore): izin, tarama ve kapak. Yalnızca yerel Android uygulamasında çalışır.
import { Capacitor, registerPlugin } from '@capacitor/core';

export interface DeviceItem {
  /** MediaStore ses kimliği (çalma /_hanami_media_/<id> üzerinden) */
  id: number;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  size: number;
  /** Değişme zamanı (saniye) */
  modified: number;
  mime: string;
}

interface HanamiMedia {
  checkAccess(): Promise<{ granted: boolean }>;
  requestAccess(): Promise<{ granted: boolean }>;
  openSettings(): Promise<void>;
  scan(): Promise<{ items: DeviceItem[] }>;
  cover(options: { id: number }): Promise<{ data?: string; mime?: string }>;
}

let plugin: HanamiMedia | null = null;
let mocked = false;
export const isAndroidApp = () => mocked || (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');

// Yalnızca geliştirme modunda: akışları gerçek telefon olmadan sınamak için sahte eklenti takılabilir
if (import.meta.env.DEV) {
  (window as unknown as { __hanamiDeviceMock: (p: HanamiMedia) => void }).__hanamiDeviceMock = p => {
    plugin = p;
    mocked = true;
  };
}
const media = () => (plugin ??= registerPlugin<HanamiMedia>('HanamiMedia'));

export async function hasDeviceAccess(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  try {
    return (await media().checkAccess()).granted;
  } catch {
    return false;
  }
}

export async function requestDeviceAccess(): Promise<boolean> {
  if (!isAndroidApp()) return false;
  try {
    return (await media().requestAccess()).granted;
  } catch {
    return false;
  }
}

export async function openAppSettings(): Promise<void> {
  try {
    await media().openSettings();
  } catch {
    /* ayarlar açılamadı */
  }
}

export async function scanDevice(): Promise<DeviceItem[]> {
  const { items } = await media().scan();
  return items;
}

export async function fetchCover(id: number): Promise<{ data: string; mime: string } | null> {
  if (!isAndroidApp()) return null;
  try {
    const r = await media().cover({ id });
    return r.data ? { data: r.data, mime: r.mime ?? 'image/jpeg' } : null;
  } catch {
    return null;
  }
}
