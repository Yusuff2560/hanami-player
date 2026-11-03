import type { CSSProperties } from 'react';
import { audio } from '../engine/audio';
import { seekToPercent, useAudioProgress } from '../hooks';
import { fmt, useStore } from '../store';
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

  const style: CSSProperties & Record<string, string> = cover
    ? {
        '--player-art': `url("${cover}")`,
        backgroundImage: `linear-gradient(#10101488, #101014cc), url("${cover}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {};

  return (
    <section className={'immersive' + (open ? ' open' : '')} style={style}>
      <button className="player-back" title="Ana menüye dön" onClick={() => setImmersive(false)}>
        ←
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
            value={pct}
            aria-label="Tam ekran ilerleme"
            onChange={e => seekToPercent(Number(e.target.value))}
          />
          <span>{fmt(duration)}</span>
        </div>
        <div className="big-controls">
          <button title="Önceki" onClick={playPrev}>
            |◀
          </button>
          <button className="play-large" title="Oynat / duraklat" onClick={togglePlay}>
            {playing ? 'Ⅱ' : '▶'}
          </button>
          <button title="Sonraki" onClick={playNext}>
            ▶|
          </button>
        </div>
        <div className="player-extra">
          <button
            className={track?.fav ? 'active' : ''}
            title="Favori"
            onClick={() => track && toggleFav(track.id)}
          >
            {track?.fav ? '♥' : '♡'}
          </button>
          <button title="5 saniye geri" onClick={() => (audio.currentTime = Math.max(0, audio.currentTime - 5))}>
            ↶ 5
          </button>
          <button
            title="5 saniye ileri"
            onClick={() => (audio.currentTime = Math.min(audio.duration || audio.currentTime, audio.currentTime + 5))}
          >
            5 ↷
          </button>
        </div>
      </div>
    </section>
  );
}
