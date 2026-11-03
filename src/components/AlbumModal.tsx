import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';
import { Cover } from './Library';

export default function AlbumModal() {
  const { open, editingId } = useStore(s => s.modal);
  const tracks = useStore(s => s.tracks);
  const albums = useStore(s => s.albums);
  const { closeModal, saveAlbum } = useStore.getState();
  const [name, setName] = useState('');
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const album = editingId ? albums.find(a => a.id === editingId) : undefined;
    setName(album?.name ?? '');
    setPicked(new Set(album?.trackIds ?? []));
    const id = setTimeout(() => nameRef.current?.focus(), 100);
    return () => clearTimeout(id);
  }, [open, editingId]);

  const allChecked = tracks.length > 0 && picked.size === tracks.length;
  const toggle = (id: number) =>
    setPicked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const editing = editingId ? albums.find(a => a.id === editingId) : undefined;

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      alert('Lütfen albüme bir isim ver.');
      nameRef.current?.focus();
      return;
    }
    if (!picked.size) {
      alert('Lütfen albüm için en az 1 şarkı seç.');
      return;
    }
    saveAlbum(trimmed, tracks.filter(t => picked.has(t.id)).map(t => t.id));
  };

  return (
    <div className={'modal-backdrop' + (open ? ' open' : '')} onClick={e => e.target === e.currentTarget && closeModal()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>{editing ? `"${editing.name}" Albümünü Düzenle` : 'Yeni Albüm Oluştur'}</h3>
          <button className="modal-close-btn" title="Kapat" onClick={closeModal}>
            ✕
          </button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: 18 }}>
            <label className="modal-label" htmlFor="albumNameInput">
              ALBÜM ADI
            </label>
            <input
              ref={nameRef}
              id="albumNameInput"
              className="modal-input"
              type="text"
              placeholder="Örn: Akustik Geceler, Favorilerim..."
              autoComplete="off"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="track-selection-head">
            <span className="modal-label" style={{ margin: 0 }}>
              ŞARKILARI SEÇ
            </span>
            <div>
              <button
                type="button"
                className="select-all-btn"
                onClick={() => setPicked(allChecked ? new Set() : new Set(tracks.map(t => t.id)))}
              >
                {allChecked ? 'Seçimi kaldır' : 'Hepsini seç'}
              </button>
              <span className="track-selection-count" style={{ marginLeft: 10 }}>
                {picked.size} seçildi
              </span>
            </div>
          </div>
          <div className="modal-track-list">
            {tracks.map(t => (
              <div
                key={t.id}
                className={'modal-track-item' + (picked.has(t.id) ? ' checked' : '')}
                onClick={() => toggle(t.id)}
              >
                <input
                  type="checkbox"
                  checked={picked.has(t.id)}
                  onClick={e => e.stopPropagation()}
                  onChange={() => toggle(t.id)}
                />
                <Cover url={t.coverUrl} className="modal-track-cover" />
                <div className="modal-track-name">{t.name}</div>
                <div className="modal-track-dur">{t.duration}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn" onClick={closeModal}>
            Vazgeç
          </button>
          <button className="btn primary" onClick={save}>
            Albümü Kaydet
          </button>
        </div>
      </div>
    </div>
  );
}
