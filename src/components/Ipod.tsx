import { useCallback, useEffect, useRef, useState } from 'react';
import { audio, initAudioContext, registerVideo, startVisualizer } from '../engine/audio';
import { useDraggable } from '../hooks';
import Icon from './Icon';
import { useStore } from '../store';

const dragHandle = (target: HTMLElement) => !target.closest('button, .ipod-screen');

export default function Ipod() {
  const boxRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const objUrl = useRef<string | null>(null);
  const hudTimer = useRef<number>(0);

  const visible = useStore(s => s.ipodVisible);
  const setIpod = useStore.getState().setIpod;

  const [hasVideo, setHasVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hud, setHud] = useState({ text: '', show: false });
  const [dragOver, setDragOver] = useState(false);

  useDraggable(boxRef, dragHandle);

  const showHud = useCallback((text: string) => {
    setHud({ text, show: true });
    window.clearTimeout(hudTimer.current);
    hudTimer.current = window.setTimeout(() => setHud(h => ({ ...h, show: false })), 900);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = 0.8;
    registerVideo(v);
    return () => registerVideo(null);
  }, []);

  useEffect(() => {
    const v = videoRef.current!;
    const onPlay = () => {
      if (!audio.paused) audio.pause();
      initAudioContext();
      setPlaying(true);
      startVisualizer();
    };
    const onPause = () => setPlaying(false);
    const onTime = () => setProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
    const onAudioPlay = () => {
      if (!v.paused) v.pause();
    };
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('ended', onPause);
    v.addEventListener('timeupdate', onTime);
    audio.addEventListener('play', onAudioPlay);
    return () => {
      v.removeEventListener('play', onPlay);
      v.removeEventListener('pause', onPause);
      v.removeEventListener('ended', onPause);
      v.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('play', onAudioPlay);
    };
  }, []);

  useEffect(() => {
    if (!visible) videoRef.current?.pause();
  }, [visible]);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const v = videoRef.current!;
      v.muted = false;
      v.volume = Math.min(1, Math.max(0, v.volume - Math.sign(e.deltaY) * 0.05));
      showHud('Ses ' + Math.round(v.volume * 100) + '%');
    };
    wheel.addEventListener('wheel', onWheel, { passive: false });
    return () => wheel.removeEventListener('wheel', onWheel);
  }, [showHud]);

  const loadVideo = (f: File | undefined) => {
    if (!f) return;
    if (!f.type.startsWith('video/') && !/\.(mp4|m4v|webm|mov)$/i.test(f.name)) {
      useStore.getState().notify('Bu bir video dosyası değil. MP4, M4V, WebM veya MOV seç.');
      return;
    }
    const v = videoRef.current!;
    if (objUrl.current) URL.revokeObjectURL(objUrl.current);
    objUrl.current = URL.createObjectURL(f);
    v.src = objUrl.current;
    setHasVideo(true);
    initAudioContext();
    v.play().catch(() => {});
  };

  const togglePlay = () => {
    const v = videoRef.current!;
    if (!v.src) {
      fileRef.current?.click();
      return;
    }
    initAudioContext();
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };

  const skip = (delta: number) => {
    const v = videoRef.current!;
    if (delta < 0) v.currentTime = Math.max(0, v.currentTime + delta);
    else if (v.duration) v.currentTime = Math.min(v.duration, v.currentTime + delta);
    showHud(delta < 0 ? '−10 sn' : '+10 sn');
  };

  const classes = ['ipod', visible && 'visible', hasVideo && 'has-video', dragOver && 'dragover'].filter(Boolean).join(' ');

  return (
    <div
      ref={boxRef}
      className={classes}
      role="region"
      aria-label="iPod video oynatıcı"
      onDragEnter={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={e => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={e => {
        e.preventDefault();
        setDragOver(false);
      }}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        loadVideo(e.dataTransfer.files[0]);
      }}
    >
      <div className="ipod-body">
        <button className="ipod-close" aria-label="Video oynatıcıyı kapat" onClick={() => setIpod(false)}>
          <Icon name="close" size={14} />
        </button>
        <div className="ipod-screen" onDoubleClick={() => videoRef.current?.requestFullscreen?.().catch(() => {})}>
          <video ref={videoRef} playsInline preload="metadata" aria-label="Video" onClick={togglePlay} />
          <div className="ipod-empty">
            MP4 sürükle-bırak
            <br />
            veya MENU'ye bas
          </div>
          <div className={'ipod-hud' + (hud.show ? ' show' : '')}>{hud.text}</div>
          <div
            className="ipod-bar"
            onClick={e => {
              const v = videoRef.current!;
              const r = e.currentTarget.getBoundingClientRect();
              if (v.duration) v.currentTime = v.duration * ((e.clientX - r.left) / r.width);
            }}
          >
            <i style={{ width: progress + '%' }} />
          </div>
        </div>
        <div className="ipod-wheel" ref={wheelRef}>
          <button className="w-menu" aria-label="Video seç" onClick={() => fileRef.current?.click()}>
            MENU
          </button>
          <button className="w-prev" aria-label="10 saniye geri" onClick={() => skip(-10)}>
            <Icon name="prev" size={16} />
          </button>
          <button className="w-next" aria-label="10 saniye ileri" onClick={() => skip(10)}>
            <Icon name="next" size={16} />
          </button>
          <button
            className="w-mute"
            aria-label="Sesi kapat veya aç"
            onClick={() => {
              const v = videoRef.current!;
              v.muted = !v.muted;
              showHud(v.muted ? 'Ses kapalı' : 'Ses açık');
            }}
          >
            <Icon name="volume" size={16} />
          </button>
          <button className="w-center" aria-label={playing ? 'Videoyu duraklat' : 'Videoyu oynat'} onClick={togglePlay}>
            <Icon name={playing ? 'pause' : 'play'} size={18} />
          </button>
        </div>
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="video/mp4,video/*,.mp4,.m4v,.webm,.mov"
        hidden
        onChange={e => {
          loadVideo(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
    </div>
  );
}
