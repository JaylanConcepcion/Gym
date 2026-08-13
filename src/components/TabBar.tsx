import type { ReactElement } from 'react';

export type Tab = 'log' | 'history' | 'progress' | 'settings';

function Icon({ children }: { children: ReactElement | ReactElement[] }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

const TABS: Array<{ id: Tab; label: string; icon: ReactElement }> = [
  {
    id: 'log',
    label: 'Log',
    icon: (
      <Icon>
        <path d="M6.5 6.5v11M17.5 6.5v11M3 9.5v5M21 9.5v5M6.5 12h11M1.5 12H3M21 12h1.5" />
      </Icon>
    )
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <Icon>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </Icon>
    )
  },
  {
    id: 'progress',
    label: 'Progress',
    icon: (
      <Icon>
        <path d="M3 17l6-6 4 4 8-8" />
        <path d="M14 7h7v7" />
      </Icon>
    )
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <Icon>
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" />
        <path d="M1.5 14h5M9.5 8h5M17.5 16h5" />
      </Icon>
    )
  }
];

export default function TabBar({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav className="tabbar">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`tab-btn${active === t.id ? ' active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon}
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
