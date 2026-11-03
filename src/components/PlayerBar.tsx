import { audio } from '../engine/audio';
import { seekToPercent, useAudioProgress } from '../hooks';
import { fmt, useStore } from '../store';
import { Cover } from './Library';

export function usePlayerInfo() {
  const tracks = useStore(s => s.tracks);
  const current = useStore(s => s.current);
  const queueName = useStore(s => s.queueName);
  const track = tracks[current];
  const artist = track
    ? queueName && queueName !== 'Tüm müzikler'
      ? `${queueName} • Yerel müzik`
      : 'Yerel müzik'
    : 'Müzik ekleyerek başla';
  return { track, title: track?.name ?? 'Henüz şarkı seçilmedi', artist };
}

export default function PlayerBar() {
  const { track, title, artist } = usePlayerInfo();
  const playing = useStore(s => s.playing);
  const { time, duration } = useAudioProgress();
  const { togglePlay, playNext, playPrev, setImmersive } = useStore.getState();
  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <footer className="playerbar">
      <div className="now-playing" title="Tam ekran oynatıcıyı aç" onClick={() => setImmersive(true)}>
        <Cover url={track?.coverUrl ?? null} className="cover" />
        <div className="now-text">
          <b>{title}</b>
          <small>{artist}</small>
        </div>
      </div>
      <div className="controls">
        <button className="ctrl" title="Önceki Şarkı" onClick={playPrev}>
          |◀
        </button>
        <button className="ctrl main-ctrl" title="Oynat / Duraklat" onClick={togglePlay}>
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <button className="ctrl" title="Sonraki Şarkı" onClick={playNext}>
          ▶|
        </button>
      </div>
      <div className="progress">
        <span>{fmt(time)}</span>
        <input
          type="range"
          min="0"
          max="100"
          value={pct}
          aria-label="İlerleme çubuğu"
          onChange={e => seekToPercent(Number(e.target.value))}
        />
        <span>{fmt(duration)}</span>
      </div>
      <div className="volume">
        ♪{' '}
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
