import { useEffect, useState } from 'react';
import { audio } from './engine/audio';

export function useAudioProgress() {
  const [state, setState] = useState({ time: 0, duration: 0 });
  useEffect(() => {
    const update = () => setState({ time: audio.currentTime, duration: audio.duration });
    const events = ['timeupdate', 'loadedmetadata', 'durationchange', 'emptied'] as const;
    events.forEach(e => audio.addEventListener(e, update));
    update();
    return () => events.forEach(e => audio.removeEventListener(e, update));
  }, []);
  return state;
}

export function seekToPercent(pct: number) {
  if (audio.duration) audio.currentTime = (audio.duration * pct) / 100;
}

export function useDraggable(
  panelRef: React.RefObject<HTMLElement | null>,
  handleFilter: (target: HTMLElement) => boolean
) {
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    let drag: { dx: number; dy: number } | null = null;

    const down = (e: PointerEvent) => {
      if (!handleFilter(e.target as HTMLElement)) return;
      const r = panel.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top };
      panel.style.left = r.left + 'px';
      panel.style.top = r.top + 'px';
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
      panel.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!drag) return;
      const maxX = window.innerWidth - panel.offsetWidth - 8;
      const maxY = window.innerHeight - panel.offsetHeight - 8;
      panel.style.left = Math.max(8, Math.min(maxX, e.clientX - drag.dx)) + 'px';
      panel.style.top = Math.max(8, Math.min(maxY, e.clientY - drag.dy)) + 'px';
    };
    const up = (e: PointerEvent) => {
      if (!drag) return;
      drag = null;
      try {
        panel.releasePointerCapture(e.pointerId);
      } catch {
        /* yakalama zaten bırakılmış */
      }
    };
    panel.addEventListener('pointerdown', down);
    panel.addEventListener('pointermove', move);
    panel.addEventListener('pointerup', up);
    panel.addEventListener('pointercancel', up);
    return () => {
      panel.removeEventListener('pointerdown', down);
      panel.removeEventListener('pointermove', move);
      panel.removeEventListener('pointerup', up);
      panel.removeEventListener('pointercancel', up);
    };
  }, [panelRef, handleFilter]);
}
