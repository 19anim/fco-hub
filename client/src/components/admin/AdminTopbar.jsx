import { Menu } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const ROLE_LABEL = {
  owner: 'Owner',
  manager: 'Manager',
};

const ROLE_COLOR = {
  owner: 'bg-brand-blue/20 text-brand-blue',
  manager: 'bg-surface-3 text-ink-muted',
};

export default function AdminTopbar({ onMenuToggle }) {
  const { user } = useAdminAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-hairline bg-surface-1/80 px-4 backdrop-blur sm:px-6">
      <button
        onClick={onMenuToggle}
        className="rounded-lg p-2 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors lg:hidden"
        aria-label="Toggle menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLOR[user?.role] ?? 'bg-surface-3 text-ink-muted'}`}
        >
          {ROLE_LABEL[user?.role] ?? user?.role}
        </span>
        <div className="h-8 w-8 rounded-full bg-surface-3 flex items-center justify-center">
          <span className="text-xs font-bold text-ink">{user?.name?.[0]?.toUpperCase() ?? 'A'}</span>
        </div>
      </div>
    </header>
  );
}
