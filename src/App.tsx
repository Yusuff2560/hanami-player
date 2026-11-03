import { useEffect, useRef } from 'react';
import AlbumModal from './components/AlbumModal';
import Immersive from './components/Immersive';
import Ipod from './components/Ipod';
import JpWord from './components/JpWord';
import Library from './components/Library';
import MiniPlayer from './components/MiniPlayer';
import PlayerBar from './components/PlayerBar';
import Sidebar from './components/Sidebar';
import { createAmbient, type AmbientHandle } from './engine/ambient';
import { setJpGain } from './engine/audio';
import { themes } from './engine/themes';
import { useStore } from './store';

function applyThemeVars(themeKey: string) {
  const t = themes[themeKey] ?? themes.sakura;
  const root = document.documentElement.style;
  root.setProperty('--pink', t.pink);
  root.setProperty('--pale', t.pale);
  root.setProperty('--accent-dark', t.accentDark);
  root.setProperty('--glow', t.glow);
  root.setProperty('--accent-bg', t.accentBg);
}

export default function App() {
  const theme = useStore(s => s.theme);
  const immersiveOpen = useStore(s => s.immersiveOpen);
  const ipodVisible = useStore(s => s.ipodVisible);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ambientRef = useRef<AmbientHandle | null>(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const fileInput = useRef<HTMLInputElement>(null);
  const folderInput = useRef<HTMLInputElement>(null);
  const addFiles = useStore.getState().addFiles;

  useEffect(() => {
    setJpGain(useStore.getState().fxGain);
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

  const t = themes[theme] ?? themes.sakura;

  return (
    <>
      <div className="app" id="mainApp" data-theme={theme} style={{ background: t.bgGradient }}>
        <Sidebar onPickFiles={() => fileInput.current?.click()} onPickFolder={() => folderInput.current?.click()} />
        <main className="main">
          <canvas id="ambientCanvas" ref={canvasRef} aria-hidden="true" style={{ display: immersiveOpen ? 'none' : 'block' }} />
          <JpWord theme={theme} />
          <Library onPickFiles={() => fileInput.current?.click()} />
          <PlayerBar />
        </main>
      </div>

      <MiniPlayer besideIpod={ipodVisible} />
      <Ipod />
      <Immersive />
      <AlbumModal />

      <input
        ref={fileInput}
        type="file"
        accept="audio/*,.mp3,.wav,.flac,.ogg,.m4a,.aac"
        multiple
        hidden
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
