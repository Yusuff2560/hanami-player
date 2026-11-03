import { brandIcons, themeOptions, themes } from '../engine/themes';
import { setJpGain } from '../engine/audio';
import { useStore, type View } from '../store';

const NAV: { view: View; icon: string; label: string }[] = [
  { view: 'music', icon: '♫', label: 'Müzikler' },
  { view: 'albums', icon: '▤', label: 'Albümler' },
  { view: 'recent', icon: '◷', label: 'Son çalınanlar' },
  { view: 'favorites', icon: '♡', label: 'Favoriler' }
];

interface Props {
  onPickFiles: () => void;
  onPickFolder: () => void;
}

export default function Sidebar({ onPickFiles, onPickFolder }: Props) {
  const theme = useStore(s => s.theme);
  const view = useStore(s => s.view);
  const fxGain = useStore(s => s.fxGain);
  const miniVisible = useStore(s => s.miniVisible);
  const ipodVisible = useStore(s => s.ipodVisible);
  const { setTheme, setView, openModal, setMini, setIpod, setFxGain } = useStore.getState();
  const t = themes[theme] ?? themes.sakura;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-flower-wrap" dangerouslySetInnerHTML={{ __html: brandIcons[theme] ?? brandIcons.sakura }} />
        <span className="brand-name">HANAMI</span>
      </div>

      <div className="theme-picker" title="Renk Teması">
        <span className="theme-dot" style={{ background: t.pink, boxShadow: `0 0 8px ${t.glow}` }} />
        <select
          className="theme-dropdown"
          aria-label="Renk Teması"
          value={theme}
          onChange={e => setTheme(e.target.value)}
        >
          {themeOptions.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="nav-label">KÜTÜPHANE</div>
      <nav className="nav">
        {NAV.map(item => (
          <button
            key={item.view}
            className={view === item.view ? 'active' : ''}
            onClick={() => setView(item.view)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-label sidebar-tools-label">KONTROLLER</div>
      <div className="sidebar-tools">
        <button className="btn" onClick={() => openModal()}>
          <span className="tool-icon">＋</span>Yeni Albüm
        </button>
        <button className={'btn' + (miniVisible ? ' active' : '')} onClick={() => setMini(!miniVisible)}>
          <span className="tool-icon">▣</span>Mini oynatıcı
        </button>
        <button className={'btn' + (ipodVisible ? ' active' : '')} onClick={() => setIpod(!ipodVisible)}>
          <span className="tool-icon">▶</span>iPod (video)
        </button>
        <button className="btn" onClick={onPickFolder}>
          <span className="tool-icon">▱</span>Klasör ekle
        </button>
        <button className="btn primary" onClick={onPickFiles}>
          <span className="tool-icon">＋</span>Müzik ekle
        </button>
        <label className="fx-row" htmlFor="fxGain">
          <span>Yazı parlaması</span>
          <input
            id="fxGain"
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={fxGain}
            aria-label="Arka plan yazısı parlama gücü"
            onChange={e => {
              const v = Number(e.target.value);
              setFxGain(v);
              setJpGain(v);
            }}
          />
        </label>
      </div>
      <div className="sidebar-foot" aria-hidden="true" />
    </aside>
  );
}
