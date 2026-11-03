import { useRef } from 'react';
import { useDraggable } from '../hooks';
import { useStore } from '../store';
import Icon from './Icon';
import { Cover } from './Library';
import { usePlayerInfo } from './PlayerBar';

const notButton = (target: HTMLElement) => !target.closest('button');

export default function MiniPlayer({ besideIpod }: { besideIpod: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useStore(s => s.miniVisible);
  const playing = useStore(s => s.playing);
  const { track, title, artist } = usePlayerInfo();
  const { togglePlay, playNext, playPrev, setMini } = useStore.getState();
  useDraggable(ref, notButton);

  return (
    <div
      className={'mini-player' + (visible ? ' visible' : '') + (besideIpod ? ' beside-ipod' : '')}
      ref={ref}
      role="region"
      aria-label="Mini oynatıcı"
    >
      <button className="mini-close" aria-label="Mini oynatıcıyı kapat" onClick={() => setMini(false)}>
        <Icon name="close" size={16} />
      </button>
      <Cover url={track?.coverUrl ?? null} className="mini-art" />
      <div className="mini-info">
        <b>{title}</b>
        <small>{track ? artist : 'HANAMI mini oynatıcı'}</small>
      </div>
      <div className="mini-controls">
        <button aria-label="Önceki şarkı" onClick={playPrev}>
          <Icon name="prev" size={18} />
        </button>
        <button className="mini-play-btn" aria-label={playing ? 'Duraklat' : 'Oynat'} onClick={togglePlay}>
          <Icon name={playing ? 'pause' : 'play'} size={16} />
        </button>
        <button aria-label="Sonraki şarkı" onClick={playNext}>
          <Icon name="next" size={18} />
        </button>
      </div>
    </div>
  );
}
