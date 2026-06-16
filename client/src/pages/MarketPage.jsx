import { ArrowUpRight, BarChart3, TrendingUp } from 'lucide-react';
import AdSlot from '../components/AdSlot';

const rows = [
  ['Ronaldo Nazario', 'ST', '+12.4%', '880B'],
  ['Ruud Gullit', 'CM', '+8.1%', '690B'],
  ['Kylian Mbappe', 'LW', '-3.2%', '360B'],
  ['Virgil van Dijk', 'CB', '+5.6%', '440B'],
];

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-warning/25 bg-warning/10 px-3 py-1 text-xs font-semibold uppercase text-warning">
              <TrendingUp className="h-3.5 w-3.5" />
              Market utility
            </div>
            <h1 className="text-3xl font-semibold text-ink">Market Trends</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Track transfer price movement and connect market decisions back to the player database.
            </p>
          </div>
          <div className="rounded-lg border border-hairline bg-surface-2 px-4 py-3 text-sm text-ink-muted">
            Sample trend data until live market sync is connected.
          </div>
        </div>
      </section>

      <AdSlot type="leaderboard" />

      <section className="surface-panel overflow-hidden">
        <div className="border-b border-hairline p-5">
          <div className="flex items-center gap-2 text-brand-blue">
            <BarChart3 className="h-5 w-5" />
            <h2 className="font-semibold text-ink">Watchlist movers</h2>
          </div>
        </div>
        <div className="divide-y divide-hairline">
          {rows.map(([name, position, change, price]) => (
            <div key={name} className="grid grid-cols-[minmax(0,1fr)_80px_100px_100px] items-center gap-3 px-5 py-4">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{name}</p>
                <p className="text-xs text-ink-muted">{position}</p>
              </div>
              <span className="text-sm text-ink-muted">24h</span>
              <span className={change.startsWith('+') ? 'font-semibold text-success' : 'font-semibold text-error'}>
                {change}
              </span>
              <span className="inline-flex items-center justify-end gap-1 font-semibold text-ink">
                {price}
                <ArrowUpRight className="h-4 w-4 text-ink-subtle" />
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
