// Medya tuşları, kilit ekranı ve bildirim denetimleri (Windows, Android, tarayıcı).
import { audio } from './audio';
import { useStore } from '../store';

export function initMediaSession() {
  if (!('mediaSession' in navigator)) return () => {};
  const ms = navigator.mediaSession;
  const s = () => useStore.getState();

  const set = (action: MediaSessionAction, handler: MediaSessionActionHandler | null) => {
    try {
      ms.setActionHandler(action, handler);
    } catch {
      /* eylem bu platformda desteklenmiyor */
    }
  };

  set('play', () => {
    if (audio.paused) s().togglePlay();
  });
  set('pause', () => {
    if (!audio.paused) s().togglePlay();
  });
  set('previoustrack', () => s().playPrev());
  set('nexttrack', () => s().playNext());
  set('seekbackward', d => {
    audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset ?? 5));
  });
  set('seekforward', d => {
    audio.currentTime = Math.min(audio.duration || audio.currentTime, audio.currentTime + (d.seekOffset ?? 5));
  });
  set('seekto', d => {
    if (d.seekTime !== undefined) audio.currentTime = d.seekTime;
  });

  let lastKey = '';
  const unsubscribe = useStore.subscribe(state => {
    const track = state.tracks[state.current];
    ms.playbackState = track ? (state.playing ? 'playing' : 'paused') : 'none';
    const key = track ? `${track.id}|${track.coverUrl ?? ''}|${state.queueName}` : '';
    if (key === lastKey) return;
    lastKey = key;
    if (!track) {
      ms.metadata = null;
      return;
    }
    ms.metadata = new MediaMetadata({
      title: track.name,
      artist: state.queueName && state.queueName !== 'Tüm müzikler' ? state.queueName : 'HANAMI',
      album: 'HANAMI',
      artwork: track.coverUrl ? [{ src: track.coverUrl, sizes: '512x512' }] : []
    });
  });

  const updatePosition = () => {
    if (!audio.duration || !isFinite(audio.duration)) return;
    try {
      ms.setPositionState({ duration: audio.duration, position: audio.currentTime, playbackRate: audio.playbackRate });
    } catch {
      /* konum bilgisi geçersiz */
    }
  };
  audio.addEventListener('timeupdate', updatePosition);

  return () => {
    unsubscribe();
    audio.removeEventListener('timeupdate', updatePosition);
  };
}
