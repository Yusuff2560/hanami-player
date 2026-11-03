import type { ReactNode } from 'react';
import { audio } from '../engine/audio';
import { fmt, useStore, type Album, type Track } from '../store';

export function Cover({ url, className }: { url: string | null; className?: string }) {
  return <div className={className}>{url ? <img src={url} alt="Kapak Resmi" /> : '✿'}</div>;
}

function albumTracksOf(album: Album, tracks: Track[]) {
  return album.trackIds.map(id => tracks.find(t => t.id === id)).filter((t): t is Track => !!t);
}

function Empty({ symbol, title, message, action }: { symbol: string; title: string; message: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-symbol">{symbol}</div>
      <b>{title}</b>
      <p>{message}</p>
      {action}
    </div>
  );
}

function TrackRow({
  track,
  index,
  isCurrent,
  playing,
  subtitle,
  onPlay,
  onRemove
}: {
  track: Track;
  index: number;
  isCurrent: boolean;
  playing: boolean;
  subtitle: string;
  onPlay: () => void;
  onRemove?: () => void;
}) {
  const toggleFav = useStore.getState().toggleFav;
  return (
    <div className={'track' + (onRemove ? ' has-extra-action' : '') + (isCurrent ? ' playing' : '')} onClick={onPlay}>
      <div className="track-index">{isCurrent ? (playing ? '♫' : '▶') : String(index + 1).padStart(2, '0')}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
        <Cover url={track.coverUrl} className="cover" />
        <div className="track-info">
          <b>{track.name}</b>
          <small>{subtitle}</small>
        </div>
      </div>
      <div className="track-duration">{track.duration}</div>
      <button
        className={'heart' + (track.fav ? ' on' : '')}
        title="Favori"
        onClick={e => {
          e.stopPropagation();
          toggleFav(track.id);
        }}
      >
        {track.fav ? '♥' : '♡'}
      </button>
      {onRemove && (
        <button
          className="track-remove-btn"
          title="Albümden çıkar"
          onClick={e => {
            e.stopPropagation();
            onRemove();
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export default function Library({ onPickFiles }: { onPickFiles: () => void }) {
  const tracks = useStore(s => s.tracks);
  const albums = useStore(s => s.albums);
  const view = useStore(s => s.view);
  const recent = useStore(s => s.recent);
  const current = useStore(s => s.current);
  const playing = useStore(s => s.playing);
  const activeAlbumId = useStore(s => s.activeAlbumId);
  const { playFromQueue, setActiveAlbum, openModal, deleteAlbum, removeTrackFromAlbum } = useStore.getState();

  const currentTrack = tracks[current];
  const favCount = tracks.filter(t => t.fav).length;
  const album = view === 'albums' && activeAlbumId !== null ? albums.find(a => a.id === activeAlbumId) : undefined;

  const pageTitle = album
    ? album.name
    : { music: 'Müziklerin', albums: 'Albümlerin', recent: 'Son Çalınanlar', favorites: 'Favorilerin' }[view];

  const titles = {
    music: { list: 'Tüm müzikler', sub: 'Yerel müzik kitaplığın' },
    recent: { list: 'Son çalınan müzikler', sub: 'En son dinlediğin parçalar' },
    favorites: { list: 'Beğendiğin şarkılar', sub: 'Favori müzik koleksiyonun' },
    albums: { list: 'Oluşturulan Albümler', sub: `${albums.length} özel koleksiyon` }
  }[view];

  let body: ReactNode;

  if (view === 'albums' && album) {
    const albumTracks = albumTracksOf(album, tracks);
    const totalSec = albumTracks.reduce((acc, t) => acc + (t.durationSec || 0), 0);
    const totalLabel = totalSec > 0 ? fmt(totalSec) : `${albumTracks.length} Şarkı`;
    const cover = albumTracks.find(t => t.coverUrl)?.coverUrl ?? null;
    body = (
      <>
        <button className="btn" style={{ marginBottom: 18 }} onClick={() => setActiveAlbum(null)}>
          ← Tüm Albümlere Dön
        </button>
        <div className="album-detail-banner">
          <Cover url={cover} className="album-detail-art" />
          <div className="album-detail-meta">
            <span className="album-badge">ALBÜM</span>
            <h2 className="album-detail-title">{album.name}</h2>
            <p className="album-detail-info">
              {albumTracks.length} Şarkı • Toplam Süre: {totalLabel}
            </p>
            <div className="album-detail-actions">
              <button
                className="btn primary"
                onClick={() => {
                  if (!albumTracks.length) return alert('Bu albümde henüz çalınacak şarkı yok.');
                  playFromQueue(albumTracks, 0, album.name);
                }}
              >
                ▶ Tümünü Çal
              </button>
              <button className="btn" onClick={() => openModal(album.id)}>
                ＋ Şarkıları Düzenle
              </button>
              <button className="btn" style={{ color: '#ff6b81' }} onClick={() => deleteAlbum(album.id)}>
                Albümü Sil
              </button>
            </div>
          </div>
        </div>
        <div className="track-list">
          {albumTracks.length === 0 ? (
            <Empty
              symbol="▤"
              title="Bu albümde henüz şarkı yok"
              message="Albüm oluştururken seçtiğin şarkılar silinmiş veya henüz şarkı eklenmemiş."
              action={
                <button className="btn primary" onClick={() => openModal(album.id)}>
                  ＋ Şarkı Ekle
                </button>
              }
            />
          ) : (
            albumTracks.map((t, i) => (
              <TrackRow
                key={t.id}
                track={t}
                index={i}
                isCurrent={currentTrack === t}
                playing={playing}
                subtitle={album.name}
                onPlay={() => playFromQueue(albumTracks, i, album.name)}
                onRemove={() => removeTrackFromAlbum(album.id, t.id)}
              />
            ))
          )}
        </div>
      </>
    );
  } else if (view === 'albums') {
    body = !albums.length ? (
      <Empty
        symbol="▤"
        title="Henüz albüm oluşturulmadı"
        message="Müziklerini temalarına veya çalma listelerine göre gruplayıp özel albümler oluşturabilirsin."
        action={
          <button className="btn primary" onClick={() => openModal()}>
            ＋ İlk Albümünü Oluştur
          </button>
        }
      />
    ) : (
      <div className="album-grid">
        {albums.map(a => {
          const at = albumTracksOf(a, tracks);
          const cover = at.find(t => t.coverUrl)?.coverUrl ?? null;
          return (
            <div key={a.id} className="album-card" onClick={() => setActiveAlbum(a.id)}>
              <div className="album-card-cover">
                <div className="album-cover-holder">{cover ? <img src={cover} alt="Kapak Resmi" /> : '✿'}</div>
                <button
                  className="album-card-play"
                  title="Tümünü Çal"
                  onClick={e => {
                    e.stopPropagation();
                    if (!at.length) return alert('Bu albümde şarkı bulunmuyor.');
                    playFromQueue(at, 0, a.name);
                  }}
                >
                  ▶
                </button>
              </div>
              <div className="album-card-title">{a.name}</div>
              <div className="album-card-meta">
                <span>{at.length} Şarkı</span>
                <button
                  className="album-card-delete"
                  title="Albümü sil"
                  onClick={e => {
                    e.stopPropagation();
                    deleteAlbum(a.id);
                  }}
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    );
  } else {
    const list =
      view === 'favorites'
        ? tracks.filter(t => t.fav)
        : view === 'recent'
          ? recent.map(i => tracks[i]).filter(Boolean)
          : tracks;

    if (!list.length) {
      let title = 'HANAMI kitaplığın henüz boş';
      let message =
        'Bilgisayarından müzik dosyaları veya bir müzik klasörü ekleyerek başlayabilirsin. Dosyaların bilgisayarından silinmez veya taşınmaz.';
      if (tracks.length) {
        if (view === 'favorites') {
          title = 'Henüz favori şarkı eklemedin';
          message = 'Şarkıların yanındaki kalp (♡) simgesine tıklayarak favorilerine parça ekleyebilirsin.';
        } else if (view === 'recent') {
          title = 'Henüz şarkı çalınmadı';
          message = 'Müzik kitaplığından şarkı çaldıkça son çalınanlar listesi burada belirecek.';
        }
      }
      body = (
        <div className="track-list">
          <Empty
            symbol="✿"
            title={title}
            message={message}
            action={
              <button className="btn primary" onClick={onPickFiles}>
                Müzik seç
              </button>
            }
          />
        </div>
      );
    } else {
      body = (
        <div className="track-list">
          {list.map((t, i) => (
            <TrackRow
              key={t.id}
              track={t}
              index={i}
              isCurrent={currentTrack === t}
              playing={playing && !audio.paused}
              subtitle="Yerel dosya"
              onPlay={() => playFromQueue(list, i, titles.list)}
            />
          ))}
        </div>
      );
    }
  }

  return (
    <>
      <header className="topbar">
        <h1>{pageTitle}</h1>
      </header>
      <section className="content" id="mainContent">
        {!album && (
          <>
            <div className="welcome">
              <div>
                <h2>Kendi ritmini bul.</h2>
                <p>Bilgisayarındaki müzikleri HANAMI'de bir araya getir.</p>
              </div>
              <div className="stats">
                <div className="stat">
                  <strong>{tracks.length}</strong>
                  <span>ŞARKI</span>
                </div>
                <div className="stat">
                  <strong>{albums.length}</strong>
                  <span>ALBÜM</span>
                </div>
                <div className="stat">
                  <strong>{favCount}</strong>
                  <span>FAVORİ</span>
                </div>
              </div>
            </div>
            <div className="section-head">
              <div className="section-head-title">
                <h3>{titles.list}</h3>
                <span className="subtle">{titles.sub}</span>
              </div>
              <div>
                {view === 'albums' && (
                  <button className="btn primary" onClick={() => openModal()}>
                    ＋ Yeni Albüm Oluştur
                  </button>
                )}
              </div>
            </div>
          </>
        )}
        <div id="dynamicContainer">{body}</div>
      </section>
    </>
  );
}
