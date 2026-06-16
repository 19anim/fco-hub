import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Activity,
  AlertCircle,
  BarChart3,
  KeyRound,
  RadioTower,
  RefreshCw,
  Search,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import { API_BASE } from '../config/api';

const USAGE_API_URL = `${API_BASE}/usage`;

const matchTypes = [
  { value: '50', label: 'Rank 1v1' },
  { value: '52', label: 'Rank 2v2' },
  { value: '40', label: 'Friendly' },
];

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toFixed(1)}%`;
}

export default function MetaLivePage() {
  const [matchtype, setMatchtype] = useState('50');
  const [nickname, setNickname] = useState('');
  const [limit, setLimit] = useState(20);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState('');

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${USAGE_API_URL}/meta`, {
        params: { matchtype, limit: 20 },
      });
      setDashboard(response.data.data);
      setStatus('');
    } catch (error) {
      setStatus(error.response?.data?.message || 'Không tải được Meta Live.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    axios.get(`${USAGE_API_URL}/meta`, {
      params: { matchtype, limit: 20 },
    })
      .then((response) => {
        if (!ignore) setDashboard(response.data.data);
      })
      .catch((error) => {
        if (!ignore) setStatus(error.response?.data?.message || 'KhÃ´ng táº£i Ä‘Æ°á»£c Meta Live.');
      });
    return () => {
      ignore = true;
    };
  }, [matchtype]);

  const syncUsage = async () => {
    if (!nickname.trim()) {
      setStatus('Nhập nickname FC Online để backend lấy OUID và sample match.');
      return;
    }

    try {
      setSyncing(true);
      setStatus('Đang lấy match sample từ Nexon Open API...');
      const response = await axios.post(`${USAGE_API_URL}/sync`, {
        nickname: nickname.trim(),
        matchtype: Number(matchtype),
        limit: Number(limit),
      });
      await fetchDashboard();
      const result = response.data.data;
      setStatus(
        `Đã sample ${result.processedMatches} trận, bỏ qua ${result.skippedMatches} trận đã có, aggregate theo SPID.`
      );
    } catch (error) {
      const setup = error.response?.data?.setup;
      setStatus(
        setup
          ? `${error.response.data.message} Thêm NEXON_API_KEY vào server/.env rồi restart server.`
          : error.response?.data?.message || 'Không thể sync match usage từ Nexon.'
      );
    } finally {
      setSyncing(false);
    }
  };

  const topPlayers = useMemo(() => dashboard?.topPlayers ?? [], [dashboard?.topPlayers]);
  const fastestRisers = useMemo(() => topPlayers.slice(0, 6), [topPlayers]);
  const apiKeyConfigured = dashboard?.apiKeyConfigured;

  return (
    <div className="space-y-6">
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-brand-blue/25 bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase text-brand-blue">
              <RadioTower className="h-3.5 w-3.5" />
              Meta Live
            </div>
            <h1 className="text-3xl font-semibold text-ink">Usage cầu thủ từ match Nexon</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Seed bằng nickname, backend lấy OUID, match list, match detail rồi aggregate cầu thủ hay dùng,
              vị trí thực tế và tỉ lệ thắng theo match type.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[520px]">
            <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3">
              <p className="text-2xl font-semibold text-ink">{topPlayers.length.toLocaleString()}</p>
              <p className="text-xs text-ink-muted">cầu thủ top</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3">
              <p className="text-2xl font-semibold text-ink">
                {(dashboard?.sampleCount ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-ink-muted">match sample</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3">
              <p className="text-2xl font-semibold text-ink">{apiKeyConfigured ? 'OK' : 'Key?'}</p>
              <p className="text-xs text-ink-muted">Nexon API</p>
            </div>
          </div>
        </div>

        {!apiKeyConfigured && (
          <div className="mt-5 rounded-lg border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100">
            <div className="mb-2 flex items-center gap-2 font-semibold">
              <KeyRound className="h-4 w-4" />
              Chưa có Nexon API key
            </div>
            <p>
              Tạo key tại openapi.nexon.com, chọn FC Online, rồi thêm
              <span className="font-mono"> NEXON_API_KEY=your_key_here </span>
              vào <span className="font-mono">server/.env</span>. Backend gửi header
              <span className="font-mono"> x-nxopen-api-key</span>.
            </p>
          </div>
        )}

        <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_160px_160px]">
          <label className="relative block">
            <span className="sr-only">Nickname FC Online</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="Nhập nickname để seed match usage..."
              className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark pl-12 pr-4 text-ink placeholder:text-ink-subtle outline-none transition focus:border-brand-blue"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Match type</span>
            <Trophy className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <select
              value={matchtype}
              onChange={(event) => setMatchtype(event.target.value)}
              className="h-12 w-full appearance-none rounded-lg border border-hairline bg-canvas-dark pl-11 pr-4 text-ink outline-none transition focus:border-brand-blue"
            >
              {matchTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="relative block">
            <span className="sr-only">Số trận lấy</span>
            <Activity className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <input
              type="number"
              min="1"
              max="100"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
              className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark pl-11 pr-4 text-ink outline-none transition focus:border-brand-blue"
            />
          </label>

          <button
            type="button"
            onClick={syncUsage}
            disabled={syncing || loading}
            className="btn-primary inline-flex h-12 items-center justify-center gap-2 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RadioTower className="h-4 w-4" />}
            {syncing ? 'Đang sync...' : 'Sync usage'}
          </button>
        </div>

        {status && (
          <div className="mt-5 flex gap-2 rounded-lg border border-hairline bg-canvas-dark px-4 py-3 text-sm text-ink-muted">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
            <span>{status}</span>
          </div>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="surface-panel overflow-hidden">
          <div className="border-b border-hairline px-5 py-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-brand-blue" />
              <h2 className="text-base font-semibold text-ink">Top cầu thủ được dùng</h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="border-b border-hairline bg-canvas-dark text-xs uppercase text-ink-subtle">
                <tr>
                  <th className="px-5 py-3 font-semibold">SPID</th>
                  <th className="px-5 py-3 font-semibold">Số lần dùng</th>
                  <th className="px-5 py-3 font-semibold">Tỉ lệ thắng</th>
                  <th className="px-5 py-3 font-semibold">Vị trí thực tế</th>
                  <th className="px-5 py-3 font-semibold">Đội hình</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {loading && (
                  <tr>
                    <td colSpan="5" className="px-5 py-8 text-center text-sm text-ink-muted">
                      Đang tải Meta Live...
                    </td>
                  </tr>
                )}
                {!loading && topPlayers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-5 py-8 text-center text-sm text-ink-muted">
                      Chưa có sample usage. Nhập nickname và sync sau khi có Nexon API key.
                    </td>
                  </tr>
                )}
                {!loading &&
                  topPlayers.map((player) => (
                    <tr key={`${player.spid}-${player.matchType}`} className="text-sm text-ink-muted">
                      <td className="px-5 py-4 font-mono text-ink">{player.spid}</td>
                      <td className="px-5 py-4 font-semibold text-ink">{player.usageCount.toLocaleString()}</td>
                      <td className="px-5 py-4">{formatPercent(player.winRate)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-2">
                          {(player.positions ?? []).slice(0, 4).map((position) => (
                            <span
                              key={position.position}
                              className="rounded-md border border-hairline bg-surface-1 px-2 py-1 text-xs text-ink"
                            >
                              {position.position}: {position.count}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {(player.formations ?? []).slice(0, 2).map((formation) => formation.formation).join(', ') || '-'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="surface-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-blue" />
            <h2 className="text-base font-semibold text-ink">Xu hướng nhanh</h2>
          </div>
          <div className="space-y-3">
            {fastestRisers.length === 0 && (
              <p className="rounded-lg border border-hairline bg-canvas-dark p-4 text-sm text-ink-muted">
                Khi có dữ liệu match, khu vực này sẽ hiện cầu thủ nổi bật theo usage.
              </p>
            )}
            {fastestRisers.map((player, index) => (
              <div key={player.spid} className="rounded-lg border border-hairline bg-canvas-dark p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">#{index + 1} · SPID {player.spid}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {player.usageCount} lần dùng · thắng {formatPercent(player.winRate)}
                    </p>
                  </div>
                  <Activity className="h-4 w-4 text-brand-blue" />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-5 text-ink-subtle">
            Data based on NEXON Open API. Dữ liệu Nexon cần được refresh tối thiểu mỗi 30 ngày.
          </p>
        </aside>
      </section>
    </div>
  );
}
