import { themeOptions, themes } from '../engine/themes';
import { setJpGain } from '../engine/audio';
import { useStore } from '../store';
import Icon from './Icon';

export function ThemePicker() {
  const theme = useStore(s => s.theme);
  const setTheme = useStore.getState().setTheme;
  const t = themes[theme] ?? themes.sakura;
  return (
    <div className="theme-picker">
      <span className="theme-dot" style={{ background: t.pink, boxShadow: `0 0 8px ${t.glow}` }} aria-hidden="true" />
      <select className="theme-dropdown" aria-label="Renk teması" value={theme} onChange={e => setTheme(e.target.value)}>
        {themeOptions.map(o => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface ToolProps {
  onPickFiles: () => void;
  onPickFolder: () => void;
  onNavigate?: () => void;
}

export function ToolButtons({ onPickFiles, onPickFolder, onNavigate }: ToolProps) {
  const fxGain = useStore(s => s.fxGain);
  const reduceFlash = useStore(s => s.reduceFlash);
  const miniVisible = useStore(s => s.miniVisible);
  const ipodVisible = useStore(s => s.ipodVisible);
  const { openModal, setMini, setIpod, setFxGain, setReduceFlash } = useStore.getState();
  const after = (fn: () => void) => () => {
    fn();
    onNavigate?.();
  };

  return (
    <div className="sidebar-tools">
      <button className="btn" onClick={after(() => openModal())}>
        <span className="tool-icon">
          <Icon name="plus" size={16} />
        </span>
        Yeni albüm
      </button>
      <button className="btn only-wide" aria-pressed={miniVisible} onClick={() => setMini(!miniVisible)}>
        <span className="tool-icon">
          <Icon name="window" size={16} />
        </span>
        Mini oynatıcı
      </button>
      <button className="btn" aria-pressed={ipodVisible} onClick={after(() => setIpod(!ipodVisible))}>
        <span className="tool-icon">
          <Icon name="video" size={16} />
        </span>
        iPod (video)
      </button>
      <button className="btn only-fine" onClick={onPickFolder}>
        <span className="tool-icon">
          <Icon name="folder" size={16} />
        </span>
        Klasör ekle
      </button>
      <button className="btn primary" onClick={after(onPickFiles)}>
        <span className="tool-icon">
          <Icon name="plus" size={16} />
        </span>
        Müzik ekle
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
          aria-valuetext={`${Math.round(fxGain * 100)}%`}
          onChange={e => {
            const v = Number(e.target.value);
            setFxGain(v);
            setJpGain(v);
          }}
        />
      </label>
      <label className="fx-switch">
        <input type="checkbox" role="switch" checked={reduceFlash} onChange={e => setReduceFlash(e.target.checked)} />
        <span>Işık yanıp sönmesini azalt</span>
      </label>
    </div>
  );
}
