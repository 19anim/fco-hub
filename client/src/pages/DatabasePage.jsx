import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, normalizeBackendSearch } from '../utils/backendSearch';
import {
  ArrowDownAZ,
  Banknote,
  Database,
  Gauge,
  Layers,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import PlayerTable from '../components/PlayerTable';
import AdSlot from '../components/AdSlot';
import { API_BASE } from '../config/api';

const PLAYERS_API_URL = `${API_BASE}/players`;
const ENRICHMENT_API_URL = `${API_BASE}/enrichment`;

const sortOptions = [
  { value: 'overall', label: 'OVR cao nhất', icon: Gauge },
  { value: 'season', label: 'Mùa mới nhất', icon: Layers },
  { value: 'name', label: 'Tên A-Z', icon: ArrowDownAZ },
  { value: 'price_desc', label: 'Giá cao-thấp', icon: Banknote },
  { value: 'price_asc', label: 'Giá thấp-cao', icon: Banknote },
];

const positionOptions = ['ST', 'CF', 'LW', 'RW', 'CAM', 'CM', 'CDM', 'CB', 'LB', 'RB', 'GK'];

const emptyFilters = {
  position: '',
  minOverall: '',
  maxOverall: '',
  minPrice: '',
  maxPrice: '',
  minSalary: '',
  maxSalary: '',
  trait: '',
  minPace: '',
  minShooting: '',
  minPassing: '',
  minDribbling: '',
  minDefending: '',
  minPhysical: '',
};

function FilterInput({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-subtle">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none transition focus:border-brand-blue"
      />
    </label>
  );
}

export default function DatabasePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonSearch, setSeasonSearch] = useState('');
  const [selectedSeasonIds, setSelectedSeasonIds] = useState([]);
  const [sortBy, setSortBy] = useState('overall');
  const [meta, setMeta] = useState({ seasons: [], totalPlayers: 0 });
  const [enrichmentStatus, setEnrichmentStatus] = useState(null);
  const [filters, setFilters] = useState(emptyFilters);
  const [status, setStatus] = useState('');
  const debouncedSearch = useDebouncedValue(searchQuery, BACKEND_SEARCH_DEBOUNCE_MS);
  const backendSearch = normalizeBackendSearch(debouncedSearch);
  const seasonIdParam = selectedSeasonIds.join(',');

  useEffect(() => {
    Promise.all([
      axios.get(`${PLAYERS_API_URL}/meta`),
      axios.get(`${ENRICHMENT_API_URL}/status`),
    ])
      .then(([metaResponse, enrichmentResponse]) => {
        setMeta(metaResponse.data);
        setEnrichmentStatus(enrichmentResponse.data.data);
      })
      .catch(() => {
        setStatus('Hãy khởi động API server để tải dữ liệu cầu thủ.');
      });
  }, []);

  const filteredSeasons = useMemo(() => {
    const query = seasonSearch.trim().toLowerCase();
    const seasons = meta.seasons ?? [];
    if (!query) return seasons.slice(0, 36);
    return seasons
      .filter((season) => [season.seasonName, season.seasonId].join(' ').toLowerCase().includes(query))
      .slice(0, 48);
  }, [meta.seasons, seasonSearch]);

  const selectedSeasons = useMemo(() => {
    const selected = new Set(selectedSeasonIds.map(String));
    return (meta.seasons ?? []).filter((season) => selected.has(String(season.seasonId)));
  }, [meta.seasons, selectedSeasonIds]);

  const advancedFilters = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '')),
    [filters]
  );

  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  const toggleSeason = (seasonId) => {
    const value = String(seasonId);
    setSelectedSeasonIds((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value]
    );
  };

  const currentSort = sortOptions.find((option) => option.value === sortBy) ?? sortOptions[0];
  const CurrentSortIcon = currentSort.icon;
  const quality = enrichmentStatus?.quality;

  return (
    <div className="space-y-6">
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-brand-blue/25 bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase text-brand-blue">
              <Database className="h-3.5 w-3.5" />
              Database cầu thủ
            </div>
            <h1 className="text-3xl font-semibold text-ink">Tra cứu và soi chỉ số FC Online</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Tìm theo tên, mùa, CLB, quốc tịch hoặc chỉ số ẩn; dữ liệu được đọc từ MongoDB cache của FCO-HUB.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[560px]">
            <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3">
              <p className="text-2xl font-semibold text-ink">{(meta.totalPlayers ?? 0).toLocaleString()}</p>
              <p className="text-xs text-ink-muted">bản ghi Nexon</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3">
              <p className="text-2xl font-semibold text-ink">
                {(enrichmentStatus?.totalEnriched ?? 0).toLocaleString()}
              </p>
              <p className="text-xs text-ink-muted">hồ sơ FIFAAddict</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3">
              <p className="text-2xl font-semibold text-ink">{quality?.missingDetail ?? 0}</p>
              <p className="text-xs text-ink-muted">thiếu detail</p>
            </div>
          </div>
        </div>

        {status && (
          <div className="mt-5 rounded-lg border border-hairline bg-canvas-dark px-4 py-3 text-sm text-ink-muted">
            {status}
          </div>
        )}

        <div className="mt-6 grid gap-3 xl:grid-cols-[minmax(0,1fr)_240px]">
          <label className="relative block">
            <span className="sr-only">Tìm cầu thủ</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              placeholder="Tìm tên cầu thủ, mùa thẻ, vị trí, CLB, quốc tịch, chỉ số ẩn..."
              value={searchQuery}
              maxLength={BACKEND_SEARCH_MAX_LENGTH}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark pl-12 pr-4 text-ink placeholder:text-ink-subtle outline-none transition focus:border-brand-blue"
            />
          </label>

          <label className="relative block">
            <span className="sr-only">Sắp xếp</span>
            <CurrentSortIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-12 w-full appearance-none rounded-lg border border-hairline bg-canvas-dark pl-11 pr-4 text-ink outline-none transition focus:border-brand-blue"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
          <div className="rounded-lg border border-hairline bg-canvas-dark p-4">
            <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-brand-blue" />
                <p className="text-sm font-semibold text-ink">Lọc nhiều mùa</p>
              </div>
              <div className="flex gap-2">
                <label className="relative block min-w-0 flex-1 lg:w-72">
                  <span className="sr-only">Tìm mùa thẻ</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
                  <input
                    type="search"
                    value={seasonSearch}
                    onChange={(event) => setSeasonSearch(event.target.value)}
                    placeholder="Tìm mùa thẻ..."
                    className="h-10 w-full rounded-lg border border-hairline bg-surface-1 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand-blue"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setSelectedSeasonIds([])}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline bg-surface-1 px-3 text-xs font-semibold text-ink-muted transition hover:border-brand-blue/50 hover:text-brand-blue"
                >
                  <X className="h-4 w-4" />
                  Bỏ lọc
                </button>
              </div>
            </div>

            {selectedSeasons.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {selectedSeasons.map((season) => (
                  <button
                    key={season.seasonId}
                    type="button"
                    onClick={() => toggleSeason(season.seasonId)}
                    className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-brand-blue/30 bg-brand-blue/12 px-2.5 text-xs font-semibold text-brand-blue"
                  >
                    {season.seasonImg && <img src={season.seasonImg} alt="" className="h-5 w-5 object-contain" />}
                    {season.seasonName || season.seasonId}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>
            )}

            <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-4 xl:grid-cols-6">
              {filteredSeasons.map((season) => {
                const selected = selectedSeasonIds.includes(String(season.seasonId));
                return (
                  <button
                    key={season.seasonId}
                    type="button"
                    onClick={() => toggleSeason(season.seasonId)}
                    className={`flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-center transition ${
                      selected
                        ? 'border-brand-blue bg-brand-blue/15 text-brand-blue'
                        : 'border-hairline bg-surface-1 text-ink-muted hover:border-brand-blue/50 hover:text-ink'
                    }`}
                    title={season.seasonName}
                  >
                    {season.seasonImg ? (
                      <img src={season.seasonImg} alt="" className="h-7 w-7 object-contain" loading="lazy" />
                    ) : (
                      <span className="text-sm font-semibold">{season.seasonId}</span>
                    )}
                    <span className="w-full truncate text-[11px] font-semibold">{season.seasonName || season.seasonId}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-lg border border-hairline bg-canvas-dark p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-brand-blue" />
                <p className="text-sm font-semibold text-ink">Bộ lọc chỉ số</p>
              </div>
              <button
                type="button"
                onClick={() => setFilters(emptyFilters)}
                className="inline-flex h-9 items-center gap-2 rounded-lg border border-hairline bg-surface-1 px-3 text-xs font-semibold text-ink-muted transition hover:border-brand-blue/50 hover:text-brand-blue"
              >
                <X className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-subtle">Vị trí</span>
                <select
                  value={filters.position}
                  onChange={(event) => setFilter('position', event.target.value)}
                  className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none transition focus:border-brand-blue"
                >
                  <option value="">Tất cả</option>
                  {positionOptions.map((position) => (
                    <option key={position} value={position}>{position}</option>
                  ))}
                </select>
              </label>
              <FilterInput label="Chỉ số ẩn" value={filters.trait} onChange={(value) => setFilter('trait', value)} placeholder="Ma tốc độ, Sút xoáy..." />
              <FilterInput label="OVR từ" value={filters.minOverall} onChange={(value) => setFilter('minOverall', value)} placeholder="120" />
              <FilterInput label="OVR đến" value={filters.maxOverall} onChange={(value) => setFilter('maxOverall', value)} placeholder="140" />
              <FilterInput label="Giá từ" value={filters.minPrice} onChange={(value) => setFilter('minPrice', value)} placeholder="1000000000" />
              <FilterInput label="Giá đến" value={filters.maxPrice} onChange={(value) => setFilter('maxPrice', value)} placeholder="5000000000" />
              <FilterInput label="Lương từ" value={filters.minSalary} onChange={(value) => setFilter('minSalary', value)} placeholder="20" />
              <FilterInput label="Tốc độ từ" value={filters.minPace} onChange={(value) => setFilter('minPace', value)} placeholder="120" />
              <FilterInput label="Sút từ" value={filters.minShooting} onChange={(value) => setFilter('minShooting', value)} placeholder="120" />
              <FilterInput label="Rê bóng từ" value={filters.minDribbling} onChange={(value) => setFilter('minDribbling', value)} placeholder="120" />
            </div>

            <div className="mt-4 rounded-lg border border-hairline bg-surface-1 px-3 py-2 text-xs text-ink-muted">
              <ShieldCheck className="mr-1 inline h-3.5 w-3.5 text-brand-blue" />
              Data badge trong bảng cho biết mức đầy đủ của ảnh, mô tả, chỉ số và trait.
            </div>
          </div>
        </div>
      </section>

      <AdSlot type="leaderboard" />

      <section className="surface-panel overflow-hidden">
        <PlayerTable
          searchQuery={backendSearch}
          positionFilter={filters.position}
          seasonId={seasonIdParam}
          sortBy={sortBy}
          advancedFilters={advancedFilters}
          limit={30}
        />
      </section>
    </div>
  );
}
