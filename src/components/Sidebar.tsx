import { brandIcons } from '../engine/themes';
import { useStore } from '../store';
import { ThemePicker, ToolButtons } from './Controls';
import Icon, { type IconName } from './Icon';
import { NAV } from './nav';

interface Props {
  onPickFiles: () => void;
  onPickFolder: () => void;
}

export default function Sidebar({ onPickFiles, onPickFolder }: Props) {
  const theme = useStore(s => s.theme);
  const view = useStore(s => s.view);
  const setView = useStore.getState().setView;

  return (
    <aside className="sidebar" aria-label="Kenar çubuğu">
      <div className="brand">
        <div
          className="brand-flower-wrap"
          role="img"
          aria-label="HANAMI"
          dangerouslySetInnerHTML={{ __html: brandIcons[theme] ?? brandIcons.sakura }}
        />
        <span className="brand-name">HANAMI</span>
      </div>

      <ThemePicker />

      <div className="nav-label">KÜTÜPHANE</div>
      <nav className="nav" aria-label="Kütüphane">
        {NAV.map(item => (
          <button
            key={item.view}
            className={view === item.view ? 'active' : ''}
            aria-current={view === item.view ? 'page' : undefined}
            onClick={() => setView(item.view)}
          >
            <span className="nav-icon">
              <Icon name={item.icon as IconName} size={20} />
            </span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="nav-label sidebar-tools-label">KONTROLLER</div>
      <ToolButtons onPickFiles={onPickFiles} onPickFolder={onPickFolder} />
      <div className="sidebar-foot" aria-hidden="true" />
    </aside>
  );
}
