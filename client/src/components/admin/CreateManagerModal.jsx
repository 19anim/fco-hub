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
  'squadSharing.create',
];

export default function CreateManagerModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [permissions, setPermissions] = useState([]);
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
      const result = await adminUsersService.create({ name, email, temporaryPassword, permissions });
      if (result.success) {
        onCreated(result.data.user);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create manager');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
      <div className="w-full max-w-lg rounded-2xl border border-hairline bg-surface-1 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-ink">Create Manager</h2>
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

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-ink outline-none transition focus:border-brand-blue text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-ink outline-none transition focus:border-brand-blue text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">
              Temporary Password <span className="text-ink-subtle font-normal">(min 12 chars)</span>
            </label>
            <input
              type="password"
              value={temporaryPassword}
              onChange={(e) => setTemporaryPassword(e.target.value)}
              required
              className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-ink outline-none transition focus:border-brand-blue text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Permissions</label>
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto rounded-lg border border-hairline bg-canvas-dark p-3">
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
          </div>

          <div className="flex gap-3 pt-2">
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
              {loading ? 'Creating...' : 'Create Manager'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
