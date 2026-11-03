import { useEffect, useRef } from 'react';
import AlbumModal from './components/AlbumModal';
import Immersive from './components/Immersive';
import Ipod from './components/Ipod';
import JpWord from './components/JpWord';
import Library from './components/Library';
import MiniPlayer from './components/MiniPlayer';
import PlayerBar from './components/PlayerBar';
import SettingsSheet from './components/SettingsSheet';
import Sidebar from './components/Sidebar';
import TabBar from './components/TabBar';
import Toast from './components/Toast';
import { createAmbient, type AmbientHandle } from './engine/ambient';
import { setJpGain, setReduceFlash } from './engine/audio';
import { initMediaSession } from './engine/mediaSession';
import { initShortcuts } from './engine/shortcuts';
import { themes } from './engine/themes';
import { useMediaQuery } from './hooks';
import { useStore } from './store';

function applyThemeVars(themeKey: string) {
  const t = themes[themeKey] ?? themes.sakura;
  document.documentElement.dataset.theme = themeKey;
  const root = document.documentElement.style;
  root.setProperty('--pink', t.pink);
  root.setProperty('--pale', t.pale);
  root.setProperty('--accent-dark', t.accentDark);
  root.setProperty('--glow', t.glow);
  root.setProperty('--accent-bg', t.accentBg);

  // Durum çubuğu / başlık rengi (mobil tarayıcı, Capacitor)
  const light = themeKey === 'snow';
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = light ? '#f4f8fc' : '#101014';
}

export default function App() {
  const theme = useStore(s => s.theme);
  const immersiveOpen = useStore(s => s.immersiveOpen);
  const ipodVisible = useStore(s => s.ipodVisible);
  const reduceFlash = useStore(s => s.reduceFlash);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<AmbientHandle | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const addFiles = useStore.getState().addFiles;

  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const lowPower = useMediaQuery('(max-width: 767px), (pointer: coarse)');

  const pickFiles = () => fileInput.current?.click();
  const pickFolder = () => folderInput.current?.click();

  useEffect(() => {
    setJpGain(useStore.getState().fxGain);
    const offShortcuts = initShortcuts();
    const offSession = initMediaSession();
    return () => {
      offShortcuts();
      offSession();
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const handle = createAmbient(canvas, () => themeRef.current);
    ambientRef.current = handle;
    return () => {
      handle.destroy();
      ambientRef.current = null;
    };
  }, []);

  useEffect(() => {
    applyThemeVars(theme);
    ambientRef.current?.init(theme);
  }, [theme]);

  // Hareketi azalt: parçacıklar yavaşlar; ışık azaltma açıksa şimşek de kapanır.
  useEffect(() => {
    setReduceFlash(reduceFlash);
    ambientRef.current?.setMotion({ scale: reduceMotion ? 0.4 : 1, lightning: !reduceFlash && !reduceMotion });
  }, [reduceFlash, reduceMotion]);

  // Mobil / dokunmatik: daha az parçacık ve düşük çözünürlük.
  useEffect(() => {
    ambientRef.current?.setDensity(lowPower ? 0.5 : 1);
  }, [lowPower]);

  // Tam ekran oynatıcı kapatıcı örtüyor ya da sekme arka planda: çizim döngüsünü durdur.
  useEffect(() => {
    const sync = () => ambientRef.current?.setPaused(document.hidden || immersiveOpen);
    sync();
    document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, [immersiveOpen]);

  const t = themes[theme] ?? themes.sakura;

  return (
    <>
      <div className="app" id="mainApp" data-theme={theme} style={{ background: t.bgGradient }}>
        <Sidebar onPickFiles={pickFiles} onPickFolder={pickFolder} />
        <main className="main">
          <canvas id="ambientCanvas" ref={canvasRef} aria-hidden="true" style={{ display: immersiveOpen ? 'none' : 'block' }} />
          <JpWord theme={theme} />
          <Library onPickFiles={pickFiles} />
          <PlayerBar />
        </main>
        <TabBar />
      </div>

      <MiniPlayer besideIpod={ipodVisible} />
      <Ipod />
      <Immersive />
      <AlbumModal />
      <SettingsSheet onPickFiles={pickFiles} onPickFolder={pickFolder} />
      <Toast />

      <input
        ref={fileInput}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        onChange={e => {
          addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
      <input
        ref={folderInput}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
        multiple
        hidden
        aria-hidden="true"
        tabIndex={-1}
        // @ts-expect-error webkitdirectory standart dışı bir özniteliktir
        webkitdirectory=""
        onChange={e => {
          addFiles([...(e.target.files ?? [])]);
          e.target.value = '';
        }}
      />
    </>
  );
}
