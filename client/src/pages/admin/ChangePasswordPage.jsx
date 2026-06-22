import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { adminAuth } from '../../services/adminAuth';

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 12) {
      setError('New password must be at least 12 characters');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      const result = await adminAuth.changePassword(currentPassword, newPassword, confirmPassword);
      if (result.success) {
        navigate('/admin');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas-black flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue text-white shadow-lg shadow-brand-blue/20 mb-4">
            <KeyRound className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-semibold text-ink">Change Password</h1>
          <p className="mt-2 text-ink-muted">You must set a new password before continuing.</p>
        </div>

        <div className="surface-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-semibold text-ink mb-2">
                Current Password
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="••••••••••••"
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-semibold text-ink mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="Min 12 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-ink mb-2">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                placeholder="••••••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary h-12 w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing password...' : 'Set New Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
