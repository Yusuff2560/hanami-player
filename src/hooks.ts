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

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const mq = matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

// Tutamaktan aşağı sürükleyerek kapatma. Her zaman bir kapat düğmesiyle birlikte kullanılmalı.
export function useSwipeDown(
  handleRef: React.RefObject<HTMLElement | null>,
  targetRef: React.RefObject<HTMLElement | null>,
  onClose: () => void,
  enabled = true
) {
  useEffect(() => {
    const handle = handleRef.current;
    const target = targetRef.current;
    if (!handle || !target || !enabled) return;
    let startY = 0;
    let dy = 0;
    let active = false;

    const down = (e: PointerEvent) => {
      active = true;
      startY = e.clientY;
      dy = 0;
      target.style.transition = 'none';
      handle.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!active) return;
      dy = Math.max(0, e.clientY - startY);
      target.style.transform = `translateY(${dy}px)`;
    };
    const end = (e: PointerEvent) => {
      if (!active) return;
      active = false;
      target.style.transition = '';
      target.style.transform = '';
      try {
        handle.releasePointerCapture(e.pointerId);
      } catch {
        /* zaten bırakılmış */
      }
      if (dy > 90) onClose();
    };
    handle.addEventListener('pointerdown', down);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', end);
    handle.addEventListener('pointercancel', end);
    return () => {
      handle.removeEventListener('pointerdown', down);
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', end);
      handle.removeEventListener('pointercancel', end);
    };
  }, [handleRef, targetRef, onClose, enabled]);
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
