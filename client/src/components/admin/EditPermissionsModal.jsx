import { useState } from 'react';
import { X } from 'lucide-react';
import { adminUsersService } from '../../services/adminUsers';

const ALL_PERMISSIONS = [
  'monetization.view', 'monetization.create', 'monetization.edit',
  'monetization.publish', 'monetization.archive',
  'placements.view', 'placements.edit',
  'users.view', 'users.create', 'users.edit', 'users.disable',
  'dataOps.view', 'dataOps.run',
  'analytics.view', 'auditLog.view',
  'settings.view', 'settings.edit',
  'squadSharing.create', 'squadSharing.edit', 'squadSharing.delete',
];

export default function EditPermissionsModal({ user, onClose, onUpdated }) {
  const [permissions, setPermissions] = useState(user.permissions ?? []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const togglePermission = (perm) => {
    setPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await adminUsersService.update(user._id, { permissions });
      if (result.success) {
        onUpdated(result.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update permissions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface-1 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Edit Permissions</h2>
            <p className="text-sm text-ink-muted">{user.name}</p>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto rounded-lg border border-hairline bg-canvas-dark p-3">
            {ALL_PERMISSIONS.map((perm) => (
              <label key={perm} className="flex items-center gap-2 text-xs text-ink-muted hover:text-ink cursor-pointer">
                <input
                  type="checkbox"
                  checked={permissions.includes(perm)}
                  onChange={() => togglePermission(perm)}
                  className="accent-brand-blue h-3.5 w-3.5"
                />
                {perm}
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-hairline bg-surface-2 px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface-3 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary py-2.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
