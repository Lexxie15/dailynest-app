import type { TabId } from '../state/types';

// To add a tab: add it here, to TabId in state/types.ts, and to the switch in Workspace.tsx.
export const TABS: Array<{ id: TabId; label: string; icon: string }> = [
  { id: 'today', label: 'Today', icon: '⌂' },
  { id: 'plan', label: 'Plan', icon: '▦' },
  { id: 'home', label: 'Home', icon: '▤' },
  { id: 'money', label: 'Money', icon: '◈' },
  { id: 'me', label: 'Me', icon: '☺' }
];

interface Props {
  tab: TabId;
  badges: Partial<Record<TabId, number>>;
  onGo: (tab: TabId) => void;
}

export function BottomNav({ tab, badges, onGo }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map((t) => {
        const n = badges[t.id] ?? 0;
        return (
          <button
            key={t.id}
            type="button"
            className="nav-item"
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => onGo(t.id)}
          >
            <span className="nav-icon">{t.icon}</span>
            {t.label}
            {n > 0 && <span className="nav-badge">{n}</span>}
          </button>
        );
      })}
    </nav>
  );
}
