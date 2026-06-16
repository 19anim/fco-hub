import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AlertTriangle,
  Database,
  DownloadCloud,
  KeyRound,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
} from 'lucide-react';
import { API_BASE } from '../config/api';

const PLAYERS_API_URL = `${API_BASE}/players`;
const ENRICHMENT_API_URL = `${API_BASE}/enrichment`;

function StatusTile({ label, value }) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas-dark px-4 py-3">
      <p className="text-2xl font-semibold text-ink">{value}</p>
      <p className="text-xs text-ink-muted">{label}</p>
    </div>
  );
}

export default function SettingsPage({ darkMode, setDarkMode }) {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem('fco-admin-sync-token') || '');
  const [status, setStatus] = useState('');
  const [syncing, setSyncing] = useState('');
  const [enrichmentStatus, setEnrichmentStatus] = useState(null);
  const [resyncId, setResyncId] = useState('');

  const adminHeaders = adminToken ? { 'x-admin-sync-token': adminToken } : {};

  const refreshStatus = async () => {
    const response = await axios.get(`${ENRICHMENT_API_URL}/status`);
    setEnrichmentStatus(response.data.data);
  };

  useEffect(() => {
    axios.get(`${ENRICHMENT_API_URL}/status`)
      .then((response) => setEnrichmentStatus(response.data.data))
      .catch(() => setStatus('Không tải được trạng thái enrichment.'));
  }, []);

  const saveToken = () => {
    localStorage.setItem('fco-admin-sync-token', adminToken);
    setStatus('Đã lưu admin sync token trên trình duyệt này.');
  };

  const syncNexon = async () => {
    try {
      setSyncing('nexon');
      setStatus('Đang đồng bộ metadata Nexon...');
      const response = await axios.post(`${PLAYERS_API_URL}/sync-nexon`, { limit: 90000 }, { headers: adminHeaders });
      setStatus(
        `Nexon sync xong: ${response.data.data.requested.toLocaleString()} / ${response.data.data.totalAvailable.toLocaleString()} bản ghi.`
      );
    } catch (error) {
      setStatus(error.response?.data?.message || 'Không thể đồng bộ Nexon.');
    } finally {
      setSyncing('');
    }
  };

  const syncFifaAddict = async () => {
    try {
      setSyncing('fifaaddict');
      setStatus('Đang enrich FIFAAddict theo listing batch...');
      const response = await axios.post(
        `${ENRICHMENT_API_URL}/fifaaddict/sync`,
        { limit: 30, delayMs: 1200 },
        { headers: adminHeaders }
      );
      await refreshStatus();
      setStatus(`Listing sync xong: ${response.data.data.processed} cập nhật, ${response.data.data.failed} lỗi.`);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Không thể enrich FIFAAddict.');
    } finally {
      setSyncing('');
    }
  };

  const syncAllFifaAddict = async () => {
    try {
      setSyncing('fifaaddict-all');
      setStatus('Đang khởi động bulk sync tất cả tên cầu thủ trong nền...');
      const response = await axios.post(
        `${ENRICHMENT_API_URL}/fifaaddict/sync-all`,
        { limit: 300, delayMs: 800, onlyMissing: true },
        { headers: adminHeaders }
      );
      await refreshStatus();
      setStatus(`Bulk sync đã chạy nền. Run ID: ${response.data.data.runId}`);
    } catch (error) {
      setStatus(error.response?.data?.message || 'Không thể khởi động bulk sync.');
    } finally {
      setSyncing('');
    }
  };

  const resyncRecord = async () => {
    if (!resyncId.trim()) {
      setStatus('Nhập playerId hoặc enrichmentId trước khi re-sync.');
      return;
    }

    try {
      setSyncing('resync');
      setStatus('Đang re-sync detail record...');
      await axios.post(
        `${ENRICHMENT_API_URL}/fifaaddict/resync`,
        resyncId.startsWith('enrichment-')
          ? { enrichmentId: resyncId.replace('enrichment-', ''), force: true }
          : { playerId: resyncId, force: true },
        { headers: adminHeaders }
      );
      await refreshStatus();
      setStatus('Re-sync record hoàn tất.');
    } catch (error) {
      setStatus(error.response?.data?.error || error.response?.data?.message || 'Không thể re-sync record.');
    } finally {
      setSyncing('');
    }
  };

  const quality = enrichmentStatus?.quality;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-ink">Settings</h1>
        <p className="mt-1 text-ink-muted">Cài đặt ứng dụng và vận hành dữ liệu cầu thủ.</p>
      </div>

      <section className="surface-panel p-5 sm:p-6">
        <div className="mb-5 flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-blue" />
          <h2 className="text-xl font-semibold text-ink">Admin data ops</h2>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
                <KeyRound className="h-4 w-4 text-brand-blue" />
                Admin sync token
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  type="password"
                  value={adminToken}
                  onChange={(event) => setAdminToken(event.target.value)}
                  placeholder="Nhập ADMIN_SYNC_TOKEN nếu production đã bật"
                  className="h-12 min-w-0 flex-1 rounded-lg border border-hairline bg-canvas-dark px-4 text-ink outline-none transition focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={saveToken}
                  className="inline-flex h-12 items-center justify-center rounded-lg border border-hairline bg-surface-2 px-4 text-sm font-semibold text-ink transition hover:border-brand-blue/50 hover:text-brand-blue"
                >
                  Lưu token
                </button>
              </div>
            </label>

            <div className="grid gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={syncNexon}
                disabled={Boolean(syncing)}
                className="btn-primary inline-flex h-12 items-center justify-center gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing === 'nexon' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
                Sync Nexon
              </button>
              <button
                type="button"
                onClick={syncFifaAddict}
                disabled={Boolean(syncing)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-brand-blue/35 bg-brand-blue/10 px-4 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing === 'fifaaddict' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Sync listing
              </button>
              <button
                type="button"
                onClick={syncAllFifaAddict}
                disabled={Boolean(syncing)}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-hairline bg-surface-2 px-4 text-sm font-semibold text-ink transition hover:border-brand-blue/50 hover:text-brand-blue disabled:cursor-not-allowed disabled:opacity-60"
              >
                {syncing === 'fifaaddict-all' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                Sync all
              </button>
            </div>

            <div className="rounded-lg border border-hairline bg-canvas-dark p-4">
              <p className="mb-3 text-sm font-semibold text-ink">Re-sync một record</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  value={resyncId}
                  onChange={(event) => setResyncId(event.target.value)}
                  placeholder="playerId hoặc enrichment-<id>"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-hairline bg-surface-1 px-3 text-sm text-ink outline-none transition focus:border-brand-blue"
                />
                <button
                  type="button"
                  onClick={resyncRecord}
                  disabled={Boolean(syncing)}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-brand-blue/35 bg-brand-blue/10 px-4 text-sm font-semibold text-brand-blue transition hover:bg-brand-blue/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {syncing === 'resync' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Re-sync
                </button>
              </div>
            </div>

            {status && (
              <div className="rounded-lg border border-hairline bg-canvas-dark px-4 py-3 text-sm text-ink-muted">
                {status}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-lg border border-hairline bg-canvas-dark p-4">
              <div className="mb-3 flex items-center gap-2">
                <Database className="h-4 w-4 text-brand-blue" />
                <p className="text-sm font-semibold text-ink">Trạng thái FIFAAddict</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatusTile label="hồ sơ enrich" value={(enrichmentStatus?.totalEnriched ?? 0).toLocaleString()} />
                <StatusTile label="đã match" value={(enrichmentStatus?.totalMatched ?? 0).toLocaleString()} />
                <StatusTile label="thiếu detail" value={quality?.missingDetail ?? 0} />
                <StatusTile label="thiếu ảnh" value={quality?.missingImage ?? 0} />
                <StatusTile label="match yếu" value={quality?.lowConfidence ?? 0} />
                <StatusTile label="chưa match" value={quality?.unmatched ?? 0} />
              </div>
              <p className="mt-3 text-xs text-ink-muted">
                Latest run: {enrichmentStatus?.latestRun?.finishedAt ? new Date(enrichmentStatus.latestRun.finishedAt).toLocaleString('vi-VN') : 'chưa có'}
              </p>
              {enrichmentStatus?.bulkSyncRunning && (
                <p className="mt-2 inline-flex items-center gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Bulk sync đang chạy
                </p>
              )}
            </div>

            <div className="rounded-lg border border-hairline bg-canvas-dark p-4">
              <div className="mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <p className="text-sm font-semibold text-ink">Warnings gần đây</p>
              </div>
              <div className="space-y-2">
                {(quality?.recentWarnings || []).length ? quality.recentWarnings.map((item) => (
                  <div key={item._id} className="rounded-lg border border-hairline bg-surface-1 px-3 py-2">
                    <p className="truncate text-sm font-semibold text-ink">{item.displayNameVi || 'Unknown'}</p>
                    <p className="mt-1 text-xs text-ink-muted">{(item.parseWarnings || []).join(', ')}</p>
                  </div>
                )) : (
                  <p className="text-sm text-ink-muted">Chưa có warning.</p>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="surface-panel p-5 sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-ink">Giao diện</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-ink">Chế độ tối</p>
            <p className="text-sm text-ink-muted">Sử dụng giao diện tối để giảm mỏi mắt.</p>
          </div>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-hairline bg-surface-2 transition hover:border-brand-blue/50"
            aria-label="Đổi chế độ giao diện"
          >
            {darkMode ? (
              <Moon className="h-5 w-5 text-brand-blue" />
            ) : (
              <Sun className="h-5 w-5 text-yellow-400" />
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
