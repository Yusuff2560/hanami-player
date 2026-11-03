import { useEffect, useRef } from 'react';
import { useStore } from '../store';

// Geri alınamayan, nadir işlemler için uyarı penceresi (Apple: alerts). Varsayılan düğme yıkıcı olmayandır.
export default function ConfirmDialog() {
  const confirm = useStore(s => s.confirm);
  const closeConfirm = useStore.getState().closeConfirm;
  const close = () => {
    const cancel = useStore.getState().confirm?.onCancel;
    closeConfirm();
    cancel?.();
  };
  const cancelRef = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const open = confirm !== null;

  useEffect(() => {
    if (open) {
      returnFocus.current = document.activeElement as HTMLElement | null;
      cancelRef.current?.focus();
    } else {
      returnFocus.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  return (
    <div className={'modal-backdrop confirm-backdrop' + (open ? ' open' : '')} onClick={e => e.target === e.currentTarget && close()}>
      <div className="modal-box confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="confirmTitle" aria-describedby="confirmMsg" aria-hidden={!open}>
        <div className="confirm-body">
          <h3 id="confirmTitle">{confirm?.title}</h3>
          <p id="confirmMsg">{confirm?.message}</p>
        </div>
        <div className="confirm-actions">
          <button ref={cancelRef} className="btn" onClick={close}>
            {confirm?.cancelLabel ?? 'Vazgeç'}
          </button>
          <button
            className={'btn' + (confirm?.tone === 'default' ? ' primary' : ' danger')}
            onClick={() => {
              const run = confirm?.onConfirm;
              closeConfirm();
              run?.();
            }}
          >
            {confirm?.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
