import { CATEGORY_OPTIONS, STATUS_OPTIONS } from './assetUtils.js';

export default function AssetFilters({ filters, onChange, onReset }) {
  const update = (field, value) => onChange({ ...filters, [field]: value, page: 1 });

  return (
    <div className="rounded-xl border border-hairline bg-surface-1 p-4">
      <div className="grid gap-3 md:grid-cols-[1fr_180px_160px_auto]">
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Search</span>
          <input
            value={filters.search}
            onChange={(event) => update('search', event.target.value)}
            placeholder="Key, label, source, public ID"
            className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue"
          />
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Category</span>
          <select
            value={filters.category}
            onChange={(event) => update('category', event.target.value)}
            className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue"
          >
            {CATEGORY_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Status</span>
          <select
            value={filters.status}
            onChange={(event) => update('status', event.target.value)}
            className="h-10 w-full rounded-lg border border-hairline bg-canvas-dark px-3 text-sm text-ink outline-none focus:border-brand-blue"
          >
            {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <div className="flex items-end">
          <button type="button" onClick={onReset} className="h-10 rounded-lg border border-hairline bg-surface-2 px-4 text-sm font-medium text-ink-muted hover:bg-surface-3 hover:text-ink">
            Reset
          </button>
        </div>
      </div>
    </div>
  );
}
