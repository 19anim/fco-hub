import { Shield } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';

function StatCard({ label, value, note }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-5">
      <p className="text-sm text-ink-muted mb-1">{label}</p>
      <p className="text-2xl font-semibold text-ink">{value}</p>
      {note && <p className="text-xs text-ink-subtle mt-1">{note}</p>}
    </div>
  );
}

export default function AdminOverviewPage() {
  const { user } = useAdminAuth();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue/15">
          <Shield className="h-6 w-6 text-brand-blue" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-ink">
            Welcome back, {user?.name ?? 'Admin'}
          </h1>
          <p className="text-sm text-ink-muted">
            {user?.role === 'owner' ? 'Owner' : 'Manager'} · {user?.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Published Items" value="—" note="Analytics coming soon" />
        <StatCard label="Total Impressions" value="—" note="Analytics coming soon" />
        <StatCard label="Total Clicks" value="—" note="Analytics coming soon" />
        <StatCard label="Active Placements" value="—" note="Placements phase" />
      </div>

      <div className="rounded-xl border border-hairline bg-surface-1 p-5">
        <h2 className="mb-4 text-base font-semibold text-ink">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="/admin/monetization/new"
            className="btn-primary text-sm px-4 py-2 rounded-lg"
          >
            + New Monetization Item
          </a>
          <a
            href="/admin/monetization"
            className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors"
          >
            View All Items
          </a>
          <a
            href="/admin/placements"
            className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors"
          >
            Manage Placements
          </a>
          {user?.role === 'owner' && (
            <a
              href="/admin/users"
              className="rounded-lg border border-hairline bg-surface-2 px-4 py-2 text-sm text-ink hover:bg-surface-3 transition-colors"
            >
              Manage Users
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
