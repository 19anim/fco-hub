import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, LogOut, Settings } from 'lucide-react';
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
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate('/admin/login');
  };

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

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="flex items-center gap-3 rounded-lg px-1.5 py-1 transition-colors hover:bg-surface-2 cursor-pointer"
        >
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ROLE_COLOR[user?.role] ?? 'bg-surface-3 text-ink-muted'}`}
          >
            {ROLE_LABEL[user?.role] ?? user?.role}
          </span>
          <div className="h-8 w-8 rounded-full bg-surface-3 flex items-center justify-center">
            <span className="text-xs font-bold text-ink">{user?.name?.[0]?.toUpperCase() ?? 'A'}</span>
          </div>
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-hairline bg-surface-1 shadow-lg z-50">
            <div className="px-3 py-2.5 border-b border-hairline">
              <p className="text-sm font-semibold text-ink truncate">{user?.name}</p>
              <p className="text-xs text-ink-muted truncate">{user?.email}</p>
            </div>
            <div className="p-1.5">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); navigate('/admin/settings'); }}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
              >
                <Settings className="h-4 w-4 shrink-0" />
                Settings
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
