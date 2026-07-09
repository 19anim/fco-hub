import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  DollarSign,
  LayoutGrid,
  BarChart2,
  Database,
  Image,
  Users,
  ClipboardList,
  Settings,
  Shield,
  LogOut,
  X,
} from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

const NAV_ITEMS = [
  { label: 'Overview', icon: LayoutDashboard, to: '/admin', end: true, permission: null },
  { label: 'Monetization', icon: DollarSign, to: '/admin/monetization', permission: 'monetization.view' },
  { label: 'Placements', icon: LayoutGrid, to: '/admin/placements', permission: 'placements.view' },
  { label: 'Analytics', icon: BarChart2, to: '/admin/analytics', permission: 'analytics.view' },
  { label: 'Data Ops', icon: Database, to: '/admin/data-ops', permission: 'dataOps.view' },
  { label: 'Assets', icon: Image, to: '/admin/assets', permission: 'assets.view' },
  { label: 'Users', icon: Users, to: '/admin/users', permission: 'users.view' },
  { label: 'Audit Log', icon: ClipboardList, to: '/admin/audit-log', permission: 'auditLog.view' },
  { label: 'Settings', icon: Settings, to: '/admin/settings', permission: 'settings.view' },
];

function canSee(user, permission) {
  if (!permission) return true;
  if (user?.role === 'owner') return true;
  return user?.permissions?.includes(permission) ?? false;
}

export default function AdminSidebar({ isOpen, onClose }) {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-hairline bg-surface-1 transition-transform duration-200 lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-hairline px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-blue">
              <Shield className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-ink">FCO Admin</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_ITEMS.filter((item) => canSee(user, item.permission)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-blue/15 text-brand-blue'
                    : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                }`
              }
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-hairline p-3">
          <div className="mb-2 px-3 py-1.5">
            <p className="text-xs font-semibold text-ink truncate">{user?.name}</p>
            <p className="text-xs text-ink-muted truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-muted hover:bg-surface-2 hover:text-ink transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
