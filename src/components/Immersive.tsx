import { useCallback, useEffect, useRef, type CSSProperties } from 'react';
import { audio } from '../engine/audio';
import { seekToPercent, useAudioProgress, useSwipeDown } from '../hooks';
import { fmt, useStore } from '../store';
import Icon from './Icon';
import { RepeatButton, ShuffleButton } from './ModeButtons';
import { Cover } from './Library';
import { usePlayerInfo } from './PlayerBar';

export default function Immersive() {
  const open = useStore(s => s.immersiveOpen);
  const playing = useStore(s => s.playing);
  const { track, title, artist } = usePlayerInfo();
  const { time, duration } = useAudioProgress();
  const { setImmersive, togglePlay, playNext, playPrev, toggleFav } = useStore.getState();
  const pct = duration ? (time / duration) * 100 : 0;
  const cover = track?.coverUrl ?? null;

  const rootRef = useRef<HTMLElement>(null);
  const grabRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const close = useCallback(() => setImmersive(false), [setImmersive]);

  useSwipeDown(grabRef, rootRef, close, open);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      backRef.current?.focus();
    } else {
      returnFocus.current?.focus?.();
    }
  }, [open]);

  const style: CSSProperties & Record<string, string> = cover
    ? {
        '--player-art': `url("${cover}")`,
        backgroundImage: `linear-gradient(#10101488, #101014cc), url("${cover}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {};

  return (
    <section
      ref={rootRef}
      className={'immersive' + (open ? ' open' : '')}
      style={style}
      role="dialog"
      aria-modal="true"
      aria-label="Oynatıcı"
      aria-hidden={!open}
    >
      <div className="immersive-grab" ref={grabRef}>
        <span className="sheet-grabber" aria-hidden="true" />
      </div>
      <button ref={backRef} className="player-back" aria-label="Oynatıcıyı kapat" onClick={close}>
        <Icon name="chevronDown" size={22} />
      </button>
      <div className="player-content">
        <Cover url={cover} className="big-cover" />
        <h2>{track ? title : 'Şarkı adı'}</h2>
        <p>{track ? artist : 'Yerel müzik'}</p>
        <div className="big-progress">
          <span>{fmt(time)}</span>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={pct}
            aria-label="İlerleme"
            aria-valuetext={`${fmt(time)} / ${fmt(duration)}`}
            onChange={e => seekToPercent(Number(e.target.value))}
          />
          <span>{fmt(duration)}</span>
        </div>
        <div className="big-controls">
          <ShuffleButton size={22} />
          <button aria-label="Önceki şarkı" onClick={playPrev}>
            <Icon name="prev" size={26} />
          </button>
          <button className="play-large" aria-label={playing ? 'Duraklat' : 'Oynat'} onClick={togglePlay}>
            <Icon name={playing ? 'pause' : 'play'} size={24} />
          </button>
          <button aria-label="Sonraki şarkı" onClick={playNext}>
            <Icon name="next" size={26} />
          </button>
          <RepeatButton size={22} />
        </div>
        <div className="player-extra">
          <button
            className={track?.fav ? 'active' : ''}
            aria-label={track?.fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            aria-pressed={!!track?.fav}
            onClick={() => track && toggleFav(track.id)}
          >
            <Icon name={track?.fav ? 'heartFill' : 'heart'} size={22} />
          </button>
          <button aria-label="5 saniye geri" onClick={() => (audio.currentTime = Math.max(0, audio.currentTime - 5))}>
            <Icon name="back5" size={24} />
          </button>
          <button
            aria-label="5 saniye ileri"
            onClick={() => (audio.currentTime = Math.min(audio.duration || audio.currentTime, audio.currentTime + 5))}
          >
            <Icon name="forward5" size={24} />
          </button>
        </div>
      </div>
    </section>
  );
}
