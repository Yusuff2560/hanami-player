import { useCallback, useEffect, useRef } from 'react';
import { useSwipeDown } from '../hooks';
import { useStore } from '../store';
import { ThemePicker, ToolButtons } from './Controls';
import Icon from './Icon';

interface Props {
  onPickFiles: () => void;
  onPickFolder: () => void;
}

// Dar genişlikte kenar çubuğundaki kontrollerin yerini alan alt sayfa (sheet).
export default function SettingsSheet({ onPickFiles, onPickFolder }: Props) {
  const open = useStore(s => s.settingsOpen);
  const setOpen = useStore.getState().setSettingsOpen;
  const sheetRef = useRef<HTMLDivElement>(null);
  const grabRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const close = useCallback(() => setOpen(false), [setOpen]);

  useSwipeDown(grabRef, sheetRef, close, open);

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      closeRef.current?.focus();
    } else {
      returnFocus.current?.focus?.();
    }
  }, [open]);

  return (
    <div className={'sheet-backdrop' + (open ? ' open' : '')} onClick={e => e.target === e.currentTarget && close()}>
      <div
        ref={sheetRef}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settingsTitle"
        aria-hidden={!open}
      >
        <div className="sheet-grab" ref={grabRef}>
          <span className="sheet-grabber" aria-hidden="true" />
        </div>
        <div className="sheet-head">
          <button ref={closeRef} className="sheet-close" aria-label="Kapat" onClick={close}>
            <Icon name="close" size={20} />
          </button>
          <h2 id="settingsTitle">Ayarlar</h2>
          <span className="sheet-head-spacer" />
        </div>
        <div className="sheet-body">
          <ThemePicker />
          <ToolButtons onPickFiles={onPickFiles} onPickFolder={onPickFolder} onNavigate={close} />
        </div>
      </div>
    </div>
  );
}
