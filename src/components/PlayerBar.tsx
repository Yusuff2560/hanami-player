import { audio } from '../engine/audio';
import { seekToPercent, useAudioProgress } from '../hooks';
import { fmt, useStore } from '../store';
import { Cover } from './Library';
import Icon from './Icon';

export function usePlayerInfo() {
  const tracks = useStore(s => s.tracks);
  const current = useStore(s => s.current);
  const queueName = useStore(s => s.queueName);
  const busy = useStore(s => s.rhythmBusy);
  const track = tracks[current];
  const base = track
    ? queueName && queueName !== 'Tüm müzikler'
      ? `${queueName} • Yerel müzik`
      : 'Yerel müzik'
    : 'Müzik ekleyerek başla';
  const artist = track && busy ? `${base} • ritim analiz ediliyor…` : base;
  return { track, title: track?.name ?? 'Henüz şarkı seçilmedi', artist };
}

export default function PlayerBar() {
  const { track, title, artist } = usePlayerInfo();
  const playing = useStore(s => s.playing);
  const { time, duration } = useAudioProgress();
  const { togglePlay, playNext, playPrev, setImmersive } = useStore.getState();
  const pct = duration ? (time / duration) * 100 : 0;
  const valueText = `${fmt(time)} / ${fmt(duration)}`;

  return (
    <footer className="playerbar">
      <div className="playerbar-line" aria-hidden="true">
        <i style={{ width: pct + '%' }} />
      </div>
      <button className="now-playing" title="Tam ekran oynatıcıyı aç" onClick={() => setImmersive(true)}>
        <Cover url={track?.coverUrl ?? null} className="cover" />
        <span className="now-text">
          <b>{title}</b>
          <small>{artist}</small>
        </span>
      </button>
      <div className="controls">
        <button className="ctrl ctrl-prev" aria-label="Önceki şarkı" onClick={playPrev}>
          <Icon name="prev" size={20} />
        </button>
        <button className="ctrl main-ctrl" aria-label={playing ? 'Duraklat' : 'Oynat'} onClick={togglePlay}>
          <Icon name={playing ? 'pause' : 'play'} size={20} />
        </button>
        <button className="ctrl" aria-label="Sonraki şarkı" onClick={playNext}>
          <Icon name="next" size={20} />
        </button>
      </div>
      <div className="progress">
        <span>{fmt(time)}</span>
        <input
          type="range"
          min="0"
          max="100"
          step="0.1"
          value={pct}
          aria-label="İlerleme"
          aria-valuetext={valueText}
          onChange={e => seekToPercent(Number(e.target.value))}
        />
        <span>{fmt(duration)}</span>
      </div>
      <div className="volume">
        <Icon name="volume" size={18} />
        <input
          type="range"
          min="0"
          max="1"
          step=".01"
          defaultValue={audio.volume}
          aria-label="Ses seviyesi"
          onChange={e => {
            audio.volume = Number(e.target.value);
          }}
        />
      </div>
    </footer>
  );
}
