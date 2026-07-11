import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
} from 'lucide-react';
import {
  formatPrice,
  getDisplay,
  getInitials,
  getOverallTone,
  getPositionTone,
  getQualityTone,
  getValue,
} from '../utils/playerDisplay';
import { usePlayerTableQuery } from '../fco/queries.js';
import { canRunBackendSearch } from '../utils/backendSearch';

function PositionBadge({ position }) {
  return (
    <span className={`inline-flex min-h-8 min-w-14 items-center justify-center rounded-lg border px-2 text-xs font-bold ${getPositionTone(position)}`}>
      {getValue(position, '-')}
    </span>
  );
}

function SeasonCell({ seasonImg, seasonName, fallback }) {
  const label = seasonName || fallback || '-';
  return (
    <div className="flex max-w-44 items-center gap-2.5" title={label}>
      {seasonImg ? (
        <img src={seasonImg} alt={label} className="h-9 w-9 shrink-0 object-contain" loading="lazy" />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface-2 text-[11px] font-bold text-ink-muted">
          {String(label).slice(0, 3).toUpperCase()}
        </span>
      )}
      <span className="hidden min-w-0 truncate text-xs font-medium text-ink-muted lg:block">{label}</span>
    </div>
  );
}

function SortableHeader({ label, sortKey, currentSort, onSort, align = 'left' }) {
  const alignClass = align === 'right' ? 'justify-end text-right' : align === 'center' ? 'justify-center text-center' : 'justify-start text-left';

  if (!sortKey) {
    return (
      <th className={`px-4 py-3 text-xs font-semibold uppercase text-ink-subtle ${align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'}`}>
        {label}
      </th>
    );
  }

  const isPrice = sortKey === 'price';
  const active = isPrice ? currentSort === 'price_desc' || currentSort === 'price_asc' : currentSort === sortKey;
  const ascending = currentSort === 'price_asc' || currentSort === 'name';
  const Icon = active ? (ascending ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th className="px-2 py-2" aria-sort={active ? (ascending ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        onClick={() => onSort(isPrice ? (currentSort === 'price_desc' ? 'price_asc' : 'price_desc') : sortKey)}
        className={`flex h-9 w-full items-center gap-1.5 rounded-lg px-2 text-xs font-semibold uppercase transition hover:bg-surface-2 hover:text-ink ${alignClass} ${
          active ? 'text-brand-blue' : 'text-ink-subtle'
        }`}
      >
        {label}
        <Icon className="h-3.5 w-3.5 shrink-0" />
      </button>
    </th>
  );
}

export default function PlayerTable({
  searchQuery = '',
  positionFilter = '',
  sortBy = 'overall',
  onSortChange,
  page: controlledPage,
  onPageChange,
  seasonId = '',
  advancedFilters = {},
  limit = 20,
  compact = false,
}) {
  const [localPage, setLocalPage] = useState(1);
  const [localSort, setLocalSort] = useState(sortBy);
  const page = controlledPage ?? localPage;
  const sort = onSortChange ? sortBy : localSort;
  const setPage = onPageChange ?? setLocalPage;
  const setSort = onSortChange ?? setLocalSort;

  const queryEnabled = canRunBackendSearch(searchQuery);
  const queryParams = useMemo(() => {
    const params = {
      search: searchQuery,
      position: positionFilter,
      seasonId,
      sort,
      page: page.toString(),
      limit: limit.toString(),
    };

    Object.entries(advancedFilters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') params[key] = String(value);
    });

    return params;
  }, [searchQuery, positionFilter, seasonId, sort, page, limit, advancedFilters]);

  const { data, isLoading: loading, isError } = usePlayerTableQuery(queryEnabled ? queryParams : null);

  const players = useMemo(() => data?.players ?? [], [data]);
  const totalPages = data?.totalPages ?? 1;
  const offline = isError;

  const visiblePlayers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const selectedSeasons = String(seasonId || '').split(',').filter(Boolean);
    const filtered = players.filter((player) => {
      const display = getDisplay(player);
      const haystack = [
        player.name,
        player.position,
        player.cardType,
        player.seasonName,
        display.name,
        display.seasonName,
        display.bestPosition,
        display.club,
        display.nation,
        display.league,
        ...(display.hiddenTraits || []),
      ].join(' ').toLowerCase();
      const matchesSearch = query ? haystack.includes(query) : true;
      const matchesPosition = positionFilter ? display.bestPosition === positionFilter || player.position === positionFilter : true;
      const matchesSeason = selectedSeasons.length ? selectedSeasons.includes(String(player.seasonId)) : true;
      return matchesSearch && matchesPosition && matchesSeason;
    });

    return [...filtered].sort((a, b) => {
      const aDisplay = getDisplay(a);
      const bDisplay = getDisplay(b);
      if (sort === 'price_desc') return (bDisplay.price ?? 0) - (aDisplay.price ?? 0);
      if (sort === 'price_asc') return (aDisplay.price ?? 0) - (bDisplay.price ?? 0);
      if (sort === 'season') return Number(b.seasonId ?? 0) - Number(a.seasonId ?? 0);
      if (sort === 'name') return aDisplay.name.localeCompare(bDisplay.name);
      return (bDisplay.overall ?? 0) - (aDisplay.overall ?? 0) || Number(b.seasonId ?? 0) - Number(a.seasonId ?? 0);
    });
  }, [players, positionFilter, searchQuery, seasonId, sort]);

  if (loading && players.length === 0) {
    return (
      <div className="p-4">
        <div className="grid gap-3">
          {[...Array(compact ? 5 : 8)].map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      </div>
    );
  }

  if (visiblePlayers.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-ink-muted">
          {offline ? 'API cầu thủ đang tắt. Hãy khởi động server.' : 'Không có cầu thủ phù hợp.'}
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px]">
          <thead className="border-b border-hairline bg-canvas-dark">
            <tr>
              <SortableHeader label="Cầu thủ" sortKey="name" currentSort={sort} onSort={setSort} />
              <SortableHeader label="Mùa" sortKey="season" currentSort={sort} onSort={setSort} />
              <SortableHeader label="Vị trí" align="center" />
              <SortableHeader label="OVR" sortKey="overall" align="center" currentSort={sort} onSort={setSort} />
              <SortableHeader label="Lương" align="center" />
              <SortableHeader label="Giá" sortKey="price" align="right" currentSort={sort} onSort={setSort} />
              <SortableHeader label="Data" align="center" />
              {!compact && <SortableHeader label="Detail" align="right" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {visiblePlayers.map((player) => {
              const display = getDisplay(player);
              return (
                <tr
                  key={player._id}
                  className="group transition odd:bg-surface-1 even:bg-canvas-dark hover:bg-surface-2"
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      {display.imageUrl ? (
                        <img src={display.imageUrl} alt={display.name} className="h-12 w-12 rounded-lg object-cover ring-1 ring-hairline" loading="lazy" />
                      ) : (
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-brand-blue/30 bg-brand-blue/10 text-sm font-semibold text-brand-blue">
                          {getInitials(display.name)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link to={`/player/${player._id}`} className="block truncate text-[15px] font-semibold text-ink transition hover:text-brand-blue">
                          {display.name}
                        </Link>
                        <p className="truncate text-xs text-ink-muted">{display.club || display.nation || display.fullName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <SeasonCell seasonImg={display.seasonImg} seasonName={display.seasonName} fallback={player.seasonId} />
                  </td>
                  <td className="px-4 py-3.5 text-center"><PositionBadge position={display.bestPosition} /></td>
                  <td className={`px-4 py-3.5 text-center text-base font-bold tabular-nums ${getOverallTone(display.overall)}`}>
                    {getValue(display.overall, '-')}
                  </td>
                  <td className="px-4 py-3.5 text-center text-sm font-medium tabular-nums text-ink-muted">
                    {getValue(display.salary, '-')}
                  </td>
                  <td className="px-4 py-3.5 text-right text-sm font-semibold tabular-nums text-ink">
                    {formatPrice(display.price, display.priceText)}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex h-8 min-w-14 items-center justify-center rounded-lg border px-2 text-xs font-bold ${getQualityTone(display.dataQuality?.score ?? 0)}`}>
                      {display.dataQuality?.score ?? 0}%
                    </span>
                  </td>
                  {!compact && (
                    <td className="px-4 py-3.5 text-right">
                      <Link to={`/player/${player._id}`} className="inline-flex h-10 items-center gap-1 rounded-lg border border-hairline bg-canvas-dark px-3 text-xs font-semibold text-ink-muted transition hover:border-brand-blue/60 hover:text-brand-blue">
                        Chi tiết
                        <ChevronRightSmall className="h-4 w-4" />
                      </Link>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!compact && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-hairline px-4 py-3">
          <p className="text-sm text-ink-muted">Trang {page} / {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-3 text-sm font-medium text-ink transition hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline bg-surface-2 px-3 text-sm font-medium text-ink transition hover:bg-surface-3 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
