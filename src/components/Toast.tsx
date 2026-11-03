import { useStore } from '../store';
import Icon from './Icon';

// Satır içi geri bildirim: uyarı penceresi yerine, odağı çalmadan okunan durum mesajı.
export default function Toast() {
  const toast = useStore(s => s.toast);
  const dismiss = useStore.getState().dismissToast;
  return (
    <div className="toast-region" role="status" aria-live="polite">
      {toast && (
        <div className="toast" key={toast.id}>
          <span className="toast-text">{toast.message}</span>
          {toast.action && (
            <button
              className="toast-action"
              onClick={() => {
                toast.action!.run();
              }}
            >
              {toast.action.label}
            </button>
          )}
          <button className="toast-close" aria-label="Bildirimi kapat" onClick={dismiss}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
