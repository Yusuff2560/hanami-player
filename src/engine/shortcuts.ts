// Klavye kısayolları. Düğme, bağlantı veya form alanı odaktayken devreye girmez.
import { audio } from './audio';
import { useStore } from '../store';

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
};

export function initShortcuts() {
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    const s = useStore.getState();

    if (e.key === 'Escape') {
      if (s.modal.open) s.closeModal();
      else if (s.settingsOpen) s.setSettingsOpen(false);
      else if (s.immersiveOpen) s.setImmersive(false);
      return;
    }
    if (isTyping(e.target)) return;

    const onButton = (e.target as HTMLElement | null)?.closest('button, a, [role=button], summary');
    switch (e.key) {
      case ' ':
        if (onButton) return;
        e.preventDefault();
        s.togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (e.shiftKey) s.playNext();
        else audio.currentTime = Math.min(audio.duration || audio.currentTime, audio.currentTime + 5);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        if (e.shiftKey) s.playPrev();
        else audio.currentTime = Math.max(0, audio.currentTime - 5);
        break;
      case 'm':
      case 'M':
        audio.muted = !audio.muted;
        break;
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
