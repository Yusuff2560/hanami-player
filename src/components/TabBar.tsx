import { useStore } from '../store';
import Icon, { type IconName } from './Icon';
import { NAV } from './nav';

// Dar genişlikte kenar çubuğunun yerini alan üst düzey gezinme (tabbar). Yalnızca CSS ile görünür.
export default function TabBar() {
  const view = useStore(s => s.view);
  const setView = useStore.getState().setView;
  return (
    <nav className="tabbar" aria-label="Ana gezinme">
      {NAV.map(item => {
        const active = view === item.view;
        return (
          <button
            key={item.view}
            className={'tabbar-item' + (active ? ' active' : '')}
            aria-current={active ? 'page' : undefined}
            onClick={() => setView(item.view)}
          >
            <Icon name={(active && item.icon === 'heart' ? 'heartFill' : item.icon) as IconName} size={24} />
            <span>{item.short}</span>
          </button>
        );
      })}
    </nav>
  );
}
