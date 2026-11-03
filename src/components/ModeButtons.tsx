import Icon from './Icon';
import { useStore } from '../store';

const REPEAT_LABEL = { all: 'Tekrar: tüm liste', one: 'Tekrar: tek şarkı', off: 'Tekrar: kapalı' } as const;

export function ShuffleButton({ size = 20 }: { size?: number }) {
  const shuffle = useStore(s => s.shuffle);
  return (
    <button
      className={'ctrl mode-btn' + (shuffle ? ' on' : '')}
      aria-label="Karıştır"
      aria-pressed={shuffle}
      onClick={() => useStore.getState().toggleShuffle()}
    >
      <Icon name="shuffle" size={size} />
    </button>
  );
}

export function RepeatButton({ size = 20 }: { size?: number }) {
  const repeat = useStore(s => s.repeat);
  return (
    <button
      className={'ctrl mode-btn' + (repeat !== 'off' ? ' on' : '')}
      aria-label={REPEAT_LABEL[repeat]}
      title={REPEAT_LABEL[repeat]}
      onClick={() => useStore.getState().cycleRepeat()}
    >
      <Icon name={repeat === 'one' ? 'repeatOne' : 'repeat'} size={size} />
    </button>
  );
}
