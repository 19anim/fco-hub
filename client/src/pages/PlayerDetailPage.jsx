import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Activity,
  ArrowLeft,
  Banknote,
  ExternalLink,
  Layers,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import {
  formatPrice,
  getDisplay,
  getInitials,
  getOverallTone,
  getPositionTone,
  getQualityTone,
  getStatTone,
  getValue,
} from '../utils/playerDisplay';
import { usePlayerDetailQuery } from '../fco/queries.js';

const groupLabels = {
  pace: 'Tốc độ',
  shooting: 'Sút',
  passing: 'Chuyền',
  dribbling: 'Rê bóng',
  defending: 'Phòng thủ',
  physical: 'Thể lực',
};

function InfoCell({ label, value }) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas-dark px-4 py-3">
      <p className="text-xs text-ink-subtle">{label}</p>
      <p className="mt-1 text-base font-semibold text-ink">{getValue(value, '-')}</p>
    </div>
  );
}

function StatBar({ label, value }) {
  const numeric = Number(value) || 0;
  const width = Math.min(100, Math.round((numeric / 150) * 100));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-xs text-ink-muted">{label}</span>
        <span className={`text-sm font-bold tabular-nums ${getOverallTone(numeric)}`}>{numeric || '-'}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full rounded-full ${getStatTone(numeric)}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function Stars({ count }) {
  if (!count) return <span className="text-ink-muted">-</span>;
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-300">
      {[...Array(count)].map((_, index) => (
        <Star key={index} className="h-3.5 w-3.5 fill-current" />
      ))}
    </span>
  );
}

function GroupStats({ groupStats }) {
  const entries = Object.entries(groupLabels)
    .map(([key, label]) => ({ key, label, value: groupStats[key] }))
    .filter((item) => item.value !== null && item.value !== undefined);

  if (!entries.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      {entries.map((item) => (
        <div key={item.key} className="rounded-lg border border-hairline bg-canvas-dark px-4 py-3">
          <p className="text-xs text-ink-subtle">{item.label}</p>
          <p className={`mt-1 text-2xl font-bold tabular-nums ${getOverallTone(item.value)}`}>{item.value}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
            <div className={`h-full ${getStatTone(item.value)}`} style={{ width: `${Math.min(100, (item.value / 150) * 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function RelatedSeasonCard({ item }) {
  const display = getDisplay(item);
  return (
    <Link
      to={`/player/${item._id}`}
      className="flex min-h-20 items-center gap-3 rounded-lg border border-hairline bg-canvas-dark px-3 py-2 transition hover:border-brand-blue/60 hover:bg-surface-2"
    >
      {display.seasonImg && <img src={display.seasonImg} alt="" className="h-9 w-9 shrink-0 object-contain" />}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{display.seasonName || item.seasonId}</p>
        <p className="truncate text-xs text-ink-muted">{display.bestPosition || '-'} · lương {getValue(display.salary, '-')}</p>
      </div>
      <span className={`text-lg font-bold tabular-nums ${getOverallTone(display.overall)}`}>{getValue(display.overall, '-')}</span>
    </Link>
  );
}

export default function PlayerDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const detailQuery = usePlayerDetailQuery(id);
  const data = detailQuery.data;
  const error = detailQuery.error
    ? detailQuery.error.response?.status === 404
      ? 'Không tìm thấy cầu thủ này.'
      : 'Không tải được dữ liệu. Hãy kiểm tra API server.'
    : '';

  const display = useMemo(
    () => (data?.player ? getDisplay(data.player) : null),
    [data]
  );

  if (detailQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-56 animate-pulse rounded-lg bg-surface-2" />
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="h-72 animate-pulse rounded-lg bg-surface-2" />
          <div className="h-72 animate-pulse rounded-lg bg-surface-2" />
        </div>
      </div>
    );
  }

  if (error || !data || !display) {
    return (
      <div className="surface-panel p-12 text-center">
        <p className="text-ink-muted">{error || 'Không có dữ liệu.'}</p>
        <Link to="/database" className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-4 text-sm font-semibold text-ink transition hover:border-brand-blue/60 hover:text-brand-blue">
          <ArrowLeft className="h-4 w-4" />
          Về Database
        </Link>
      </div>
    );
  }

  const usage = (data.usage || []).filter((item) => item.usageCount > 0);
  const totalUsage = usage[0];
  const stats = display.detailedStats.length ? display.detailedStats : display.keyStats;
  const relatedSeasons = (data.related || []).filter((item) => item._id !== data.player._id).slice(0, 18);

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-4 text-sm font-semibold text-ink-muted transition hover:border-brand-blue/60 hover:text-brand-blue"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại
      </button>

      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-5 sm:flex-row">
            {display.imageUrl ? (
              <img src={display.imageUrl} alt={display.name} className="h-36 w-36 shrink-0 rounded-lg object-cover ring-1 ring-hairline" />
            ) : (
              <div className="flex h-36 w-36 shrink-0 items-center justify-center rounded-lg border border-brand-blue/30 bg-brand-blue/10 text-3xl font-semibold text-brand-blue">
                {getInitials(display.name)}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {display.seasonImg && <img src={display.seasonImg} alt="" className="h-7 w-7 object-contain" title={display.seasonName} />}
                <span className="text-xs font-semibold uppercase text-brand-blue">{getValue(display.seasonName, '')}</span>
                <span className={`inline-flex h-7 items-center rounded-lg border px-2 text-xs font-bold ${getQualityTone(display.dataQuality?.score ?? 0)}`}>
                  Data {display.dataQuality?.score ?? 0}%
                </span>
              </div>
              <h1 className="mt-1 text-3xl font-semibold text-ink">{display.name}</h1>
              {display.fullName !== display.name && (
                <p className="mt-1 text-sm text-ink-muted">{display.fullName}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className={`inline-flex min-h-9 min-w-16 items-center justify-center rounded-lg border px-3 text-sm font-bold ${getPositionTone(display.bestPosition)}`}>
                  {getValue(display.bestPosition, '-')}
                </span>
                <span className={`text-4xl font-bold tabular-nums ${getOverallTone(display.overall)}`}>
                  {getValue(display.overall, '-')}
                  <span className="ml-1 text-xs font-semibold text-ink-subtle">OVR</span>
                </span>
                <div className="text-sm text-ink-muted">
                  <p>Kỹ thuật <Stars count={display.skillMoves} /></p>
                  <p className="mt-0.5">Chân nghịch {display.weakFoot ? `${display.weakFoot}/5` : '-'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid w-full shrink-0 grid-cols-2 gap-3 sm:max-w-xs">
            <div className="rounded-lg border border-brand-blue/25 bg-brand-blue/10 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-brand-blue"><Banknote className="h-3.5 w-3.5" /> Giá thị trường</div>
              <p className="mt-1 text-lg font-bold tabular-nums text-ink">{formatPrice(display.price, display.priceText)}</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3">
              <div className="flex items-center gap-1.5 text-xs text-ink-subtle"><UserRound className="h-3.5 w-3.5" /> Lương</div>
              <p className="mt-1 text-lg font-bold tabular-nums text-ink">{getValue(display.salary, '-')}</p>
            </div>
            {display.sourceUrl && (
              <a
                href={display.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="col-span-2 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-hairline bg-canvas-dark text-xs font-semibold text-ink-muted transition hover:border-brand-blue/60 hover:text-brand-blue"
              >
                Xem nguồn
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </section>

      <section className="surface-panel p-5">
        <div className="mb-4 flex items-center gap-2">
          <GaugeIcon />
          <h2 className="text-lg font-semibold text-ink">Nhóm chỉ số</h2>
        </div>
        <GroupStats groupStats={display.groupStats} />
        {!Object.values(display.groupStats).some((value) => value !== null && value !== undefined) && (
          <p className="text-sm text-ink-muted">Chưa có dữ liệu nhóm chỉ số cho thẻ này.</p>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="surface-panel p-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Hồ sơ cầu thủ</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <InfoCell label="CLB" value={display.club} />
            <InfoCell label="Quốc tịch" value={display.nation} />
            <InfoCell label="Giải đấu" value={display.league} />
            <InfoCell label="Tuổi" value={display.age} />
            <InfoCell label="Chiều cao" value={display.heightCm ? `${display.heightCm} cm` : ''} />
            <InfoCell label="Cân nặng" value={display.weightKg ? `${display.weightKg} kg` : ''} />
          </div>
        </div>

        <div className="surface-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-brand-blue" />
            <h2 className="text-lg font-semibold text-ink">Vị trí có thể đá</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {display.positions.length ? (
              display.positions.map((item) => (
                <span key={item.position} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-bold ${getPositionTone(item.position)}`}>
                  {item.position}
                  {item.overall != null && <span className="tabular-nums">{item.overall}</span>}
                </span>
              ))
            ) : (
              <p className="text-sm text-ink-muted">Chưa có dữ liệu vị trí.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="surface-panel p-5">
          <h2 className="mb-4 text-lg font-semibold text-ink">Chỉ số chi tiết</h2>
          {stats.length ? (
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {stats.map((stat) => (
                <StatBar
                  key={stat.labelVi || stat.label || stat.key}
                  label={stat.labelVi || stat.label || stat.key}
                  value={stat.value}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">
              Chưa có chỉ số chi tiết cho thẻ này. Admin có thể re-sync record trong Settings.
            </p>
          )}
        </div>

        <div className="surface-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand-blue" />
            <h2 className="text-lg font-semibold text-ink">Chỉ số ẩn</h2>
          </div>
          {display.traitsDescription.length ? (
            <div className="space-y-2">
              {display.traitsDescription.map((trait) => (
                <div key={trait.name} className="rounded-lg border border-hairline bg-canvas-dark px-3 py-2">
                  <p className="text-sm font-semibold text-ink">{trait.name}</p>
                  {trait.description && <p className="mt-1 text-xs leading-5 text-ink-muted">{trait.description}</p>}
                </div>
              ))}
            </div>
          ) : display.hiddenTraits.length ? (
            <div className="flex flex-wrap gap-2">
              {display.hiddenTraits.map((trait) => (
                <span key={trait} className="rounded-lg border border-brand-blue/35 bg-brand-blue/10 px-3 py-1.5 text-xs font-semibold text-brand-blue">
                  {trait}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-muted">Chưa có dữ liệu chỉ số ẩn.</p>
          )}
        </div>
      </section>

      {relatedSeasons.length > 0 && (
        <section className="surface-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="h-4 w-4 text-brand-blue" />
            <h2 className="text-lg font-semibold text-ink">Các mùa khác</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {relatedSeasons.map((item) => (
              <RelatedSeasonCard key={item._id} item={item} />
            ))}
          </div>
        </section>
      )}

      {totalUsage && (
        <section className="surface-panel p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand-blue" />
            <h2 className="text-lg font-semibold text-ink">Mức sử dụng trong meta</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <InfoCell label="Số đội sử dụng" value={totalUsage.usageCount?.toLocaleString()} />
            <InfoCell label="Số trận ghi nhận" value={totalUsage.matchCount?.toLocaleString()} />
            <InfoCell label="Tỉ lệ thắng" value={totalUsage.winRate ? `${Math.round(totalUsage.winRate * 100) / 100}%` : ''} />
            <InfoCell
              label="Vị trí hay dùng"
              value={(totalUsage.positions || []).slice(0, 3).map((item) => item.position).join(', ')}
            />
          </div>
        </section>
      )}

      <section className="surface-panel p-5">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-blue" />
          <div>
            <h2 className="text-lg font-semibold text-ink">Data quality</h2>
            <p className="mt-1 text-sm text-ink-muted">
              Record này có điểm {display.dataQuality?.score ?? 0}%. Warnings: {(display.dataQuality?.warnings || []).join(', ') || 'không có'}.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function GaugeIcon() {
  return <Activity className="h-4 w-4 text-brand-blue" />;
}
