import { useRef } from 'react';
import { useDraggable } from '../hooks';
import { useStore } from '../store';
import { Cover } from './Library';
import { usePlayerInfo } from './PlayerBar';

const notButton = (target: HTMLElement) => !target.closest('button');

export default function MiniPlayer({ besideIpod }: { besideIpod: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useStore(s => s.miniVisible);
  const playing = useStore(s => s.playing);
  const { track, title } = usePlayerInfo();
  const queueName = useStore(s => s.queueName);
  const { togglePlay, playNext, playPrev, setMini } = useStore.getState();
  useDraggable(ref, notButton);

  const artist = track
    ? queueName && queueName !== 'Tüm müzikler'
      ? `${queueName} • Yerel müzik`
      : 'Yerel müzik'
    : 'HANAMI mini oynatıcı';

  return (
    <div
      className={'mini-player' + (visible ? ' visible' : '') + (besideIpod ? ' beside-ipod' : '')}
      ref={ref}
      aria-label="Mini Oynatıcı"
    >
      <button className="mini-close" title="Kapat" onClick={() => setMini(false)}>
        ×
      </button>
      <Cover url={track?.coverUrl ?? null} className="mini-art" />
      <div className="mini-info">
        <b>{title}</b>
        <small>{artist}</small>
      </div>
      <div className="mini-controls">
        <button title="Önceki" onClick={playPrev}>
          |◀
        </button>
        <button className="mini-play-btn" title="Oynat / duraklat" onClick={togglePlay}>
          {playing ? 'Ⅱ' : '▶'}
        </button>
        <button title="Sonraki" onClick={playNext}>
          ▶|
        </button>
      </div>
    </div>
  );
}
