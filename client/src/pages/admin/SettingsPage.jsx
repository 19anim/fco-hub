import { useState } from 'react';
import axios from 'axios';
import { Settings, User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { API_BASE } from '../../config/api';

const api = axios.create({ baseURL: `${API_BASE}/admin/auth`, withCredentials: true });

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-ink-muted">{label}</label>
      {children}
    </div>
  );
}

function Input(props) {
  return (
    <input
      {...props}
      className="h-10 w-full rounded-lg border border-hairline bg-surface-2 px-3 text-sm text-ink placeholder:text-ink-subtle focus:outline-none focus:ring-1 focus:ring-brand-blue"
    />
  );
}

export default function SettingsPage() {
  const { user } = useAdminAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (next !== confirm) {
      setResult({ ok: false, msg: 'New passwords do not match.' });
      return;
    }
    if (next.length < 8) {
      setResult({ ok: false, msg: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      await api.post('/change-password', { currentPassword: current, newPassword: next, confirmPassword: confirm });
      setResult({ ok: true, msg: 'Password changed successfully.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Failed to change password.';
      setResult({ ok: false, msg });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-blue/15">
          <Settings className="h-5 w-5 text-brand-blue" />
        </div>
        <h1 className="text-xl font-semibold text-ink">Settings</h1>
      </div>

      {/* Account info */}
      <section className="rounded-xl border border-hairline bg-surface-1 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="h-4 w-4 text-brand-blue" />
          <h2 className="text-sm font-semibold text-ink">Account</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-ink-muted text-xs mb-0.5">Email</p>
            <p className="text-ink font-medium">{user?.email ?? '—'}</p>
          </div>
          <div>
            <p className="text-ink-muted text-xs mb-0.5">Role</p>
            <p className="text-ink font-medium capitalize">{user?.role ?? '—'}</p>
          </div>
        </div>
      </section>

      {/* Change password */}
      <section className="rounded-xl border border-hairline bg-surface-1 p-6 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock className="h-4 w-4 text-brand-blue" />
          <h2 className="text-sm font-semibold text-ink">Change Password</h2>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <Field label="Current password">
            <Input
              type="password"
              placeholder="Current password"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              required
              autoComplete="current-password"
            />
          </Field>
          <Field label="New password">
            <Input
              type="password"
              placeholder="Min 8 characters"
              value={next}
              onChange={e => setNext(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>
          <Field label="Confirm new password">
            <Input
              type="password"
              placeholder="Repeat new password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </Field>

          {result && (
            <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
              result.ok ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {result.ok
                ? <CheckCircle className="h-4 w-4 shrink-0" />
                : <AlertCircle className="h-4 w-4 shrink-0" />}
              {result.msg}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="h-10 rounded-lg bg-brand-blue px-5 text-sm font-medium text-white hover:bg-brand-blue/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Update password'}
          </button>
        </form>
      </section>
    </div>
  );
}
