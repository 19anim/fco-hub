import { useEffect, useState } from 'react';
import { Users, Plus, RotateCcw, Ban, CheckCircle } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { adminUsersService } from '../../services/adminUsers';
import CreateManagerModal from '../../components/admin/CreateManagerModal';
import EditPermissionsModal from '../../components/admin/EditPermissionsModal';

const STATUS_BADGE = {
  active: 'bg-green-500/15 text-green-400',
  disabled: 'bg-red-500/15 text-red-400',
  pending_password_change: 'bg-yellow-500/15 text-yellow-400',
};

const STATUS_LABEL = {
  active: 'Active',
  disabled: 'Disabled',
  pending_password_change: 'Pending PW',
};

export default function UsersPage() {
  const { user: currentUser } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const isOwner = currentUser?.role === 'owner';

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const result = await adminUsersService.list();
      if (result.success) setUsers(result.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleStatus = async (u) => {
    const newStatus = u.status === 'disabled' ? 'active' : 'disabled';
    setActionLoading(u._id);
    try {
      const result = await adminUsersService.update(u._id, { status: newStatus });
      if (result.success) {
        setUsers((prev) => prev.map((x) => x._id === u._id ? result.data.user : x));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResetPassword = async (u) => {
    const tempPassword = prompt('Enter temporary password (min 12 chars):');
    if (!tempPassword) return;
    setActionLoading(u._id);
    try {
      await adminUsersService.resetPassword(u._id, tempPassword);
      alert('Password reset. User must change password on next login.');
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
            <Users className="h-5 w-5 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-ink">Admin Users</h1>
            <p className="text-sm text-ink-muted">{users.length} account{users.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowCreate(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Create Manager
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-hairline bg-surface-1 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-hairline">
                {['Name', 'Email', 'Role', 'Status', 'Permissions', 'Last Login', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">Loading...</td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-ink-muted">No users found</td>
                </tr>
              ) : users.map((u) => (
                <tr key={u._id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium text-ink">{u.name}</td>
                  <td className="px-4 py-3 text-ink-muted">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      u.role === 'owner' ? 'bg-brand-blue/20 text-brand-blue' : 'bg-surface-3 text-ink-muted'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE[u.status] ?? 'bg-surface-3 text-ink-muted'}`}>
                      {STATUS_LABEL[u.status] ?? u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {u.role === 'owner' ? (
                      <span className="italic">All permissions</span>
                    ) : (
                      <span>{u.permissions?.length ?? 0} assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-ink-muted text-xs">
                    {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      {u.role !== 'owner' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditTarget(u)}
                            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors border border-hairline"
                          >
                            Permissions
                          </button>
                          <button
                            onClick={() => handleResetPassword(u)}
                            disabled={actionLoading === u._id}
                            className="rounded-lg p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink transition-colors"
                            title="Reset password"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={actionLoading === u._id}
                            className={`rounded-lg p-1.5 transition-colors ${
                              u.status === 'disabled'
                                ? 'text-green-400 hover:bg-green-500/10'
                                : 'text-red-400 hover:bg-red-500/10'
                            }`}
                            title={u.status === 'disabled' ? 'Enable account' : 'Disable account'}
                          >
                            {u.status === 'disabled'
                              ? <CheckCircle className="h-3.5 w-3.5" />
                              : <Ban className="h-3.5 w-3.5" />
                            }
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && (
        <CreateManagerModal
          onClose={() => setShowCreate(false)}
          onCreated={(newUser) => {
            setUsers((prev) => [newUser, ...prev]);
            setShowCreate(false);
          }}
        />
      )}

      {editTarget && (
        <EditPermissionsModal
          user={editTarget}
          onClose={() => setEditTarget(null)}
          onUpdated={(updated) => {
            setUsers((prev) => prev.map((u) => u._id === updated._id ? updated : u));
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}
