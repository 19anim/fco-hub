import { NavLink } from 'react-router-dom';
import { Calculator, Database, Home, RadioTower, Settings, Shield, TrendingUp, Video } from 'lucide-react';

const navItems = [
  { path: '/', icon: Home, label: 'Home', description: 'Database first' },
  { path: '/database', icon: Database, label: 'Players', description: 'Nexon metadata' },
  { path: '/meta-live', icon: RadioTower, label: 'Meta Live', description: 'Match usage' },
  { path: '/market', icon: TrendingUp, label: 'Market', description: 'Price watch' },
  { path: '/calculator', icon: Calculator, label: 'BP Calc', description: 'Tax helper' },
  { path: '/videos', icon: Video, label: 'Reviews', description: 'Gameplay clips' },
];

export default function Sidebar({ isOpen, onClose }) {
  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-dvh w-72 flex-col border-r border-hairline bg-canvas-black transition-transform duration-200 lg:sticky lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-hairline p-5">
          <NavLink to="/" onClick={onClose} className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-blue text-white shadow-lg shadow-brand-blue/20">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-ink">FCO Hub</p>
              <p className="text-xs text-ink-muted">Player utility desk</p>
            </div>
          </NavLink>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5">
          <p className="px-3 pb-3 text-xs font-semibold uppercase tracking-widest text-ink-subtle">
            Workspace
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 transition ${
                      isActive
                        ? 'border-brand-blue/30 bg-brand-blue/12 text-brand-blue'
                        : 'border-transparent text-ink-muted hover:border-hairline hover:bg-surface-1 hover:text-ink'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.label}</span>
                    <span className="block truncate text-xs opacity-65">{item.description}</span>
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="border-t border-hairline p-3">
          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `flex h-12 items-center gap-3 rounded-lg px-3 text-sm font-semibold transition ${
                isActive ? 'bg-surface-2 text-ink' : 'text-ink-muted hover:bg-surface-1 hover:text-ink'
              }`
            }
          >
            <Settings className="h-5 w-5" />
            Settings
          </NavLink>
        </div>
      </aside>
    </>
  );
}
