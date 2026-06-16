import { useDeferredValue, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Calculator,
  Database,
  Filter,
  Search,
  Sparkles,
  Trophy,
  Video,
  Zap,
} from 'lucide-react';
import PlayerTable from '../components/PlayerTable';
import AdSlot from '../components/AdSlot';

const utilityCards = [
  {
    title: 'Player Database',
    description: 'Search by name, season, position, price, and key stats.',
    href: '/database',
    icon: Database,
    tone: 'bg-brand-blue/15 text-brand-blue border-brand-blue/25',
  },
  {
    title: 'BP Calculator',
    description: 'Estimate tax, discounts, and real BP after selling.',
    href: '/calculator',
    icon: Calculator,
    tone: 'bg-success/15 text-success border-success/25',
  },
  {
    title: 'Market Trends',
    description: 'Spot price movement and shortlist transfer targets.',
    href: '/market',
    icon: BarChart3,
    tone: 'bg-warning/15 text-warning border-warning/25',
  },
  {
    title: 'Video Reviews',
    description: 'Attach gameplay reviews to the players you scout.',
    href: '/videos',
    icon: Video,
    tone: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/25',
  },
];

const topFilters = ['ICON', 'Ronaldo', 'Messi', 'TOTY', 'Captain'];
export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_380px]">
        <div className="surface-panel overflow-hidden p-5 sm:p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-brand-blue/25 bg-brand-blue/10 px-3 py-1 text-xs font-semibold uppercase text-brand-blue">
                  <Trophy className="h-3.5 w-3.5" />
                  FCO Hub reference layout
                </span>
                <span className="rounded-full border border-hairline bg-surface-2 px-3 py-1 text-xs font-medium text-ink-muted">
                  Inspired by FIFAAddict database utility flow
                </span>
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                Build squads from the player database first.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-ink-muted">
                The home page now starts where FC Online players actually spend time: finding cards,
                comparing stats, checking prices, and jumping into the calculator or market tools.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:min-w-72">
              {[
                ['24K+', 'players'],
                ['16', 'positions'],
                ['4', 'core tools'],
              ].map(([value, label]) => (
                <div key={label} className="rounded-lg border border-hairline bg-surface-2 p-3 text-center">
                  <p className="text-2xl font-semibold text-ink">{value}</p>
                  <p className="text-xs uppercase tracking-wide text-ink-subtle">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-7 grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="relative block">
              <span className="sr-only">Search players</span>
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search player, club, season, trait..."
                className="h-14 w-full rounded-lg border border-hairline bg-canvas-dark pl-12 pr-4 text-base text-ink outline-none transition focus:border-brand-blue"
              />
            </label>
            <Link to="/database" className="btn-primary inline-flex h-14 items-center justify-center gap-2 rounded-lg">
              Open full database
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-ink-muted">
              <Filter className="h-4 w-4" />
              Search ideas
            </span>
            {topFilters.map((position) => (
              <button
                key={position}
                type="button"
                onClick={() => setSearchQuery(position)}
                className="h-10 rounded-lg border border-hairline bg-surface-1 px-4 text-sm font-semibold text-ink-muted transition hover:border-brand-blue/60 hover:text-ink"
              >
                {position}
              </button>
            ))}
          </div>
        </div>

        <aside className="surface-panel p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-blue text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-semibold text-ink">Layout reference</h2>
              <p className="text-sm text-ink-muted">Use this structure on every utility.</p>
            </div>
          </div>
          <div className="mt-5 space-y-4 text-sm text-ink-muted">
            <p>
              Left navigation keeps the utilities persistent. Each page starts with a compact command
              area, then moves into dense working data instead of a marketing hero.
            </p>
            <p>
              For the home page, the database preview is the primary feature. Calculator, market,
              videos, and events become supporting workflows.
            </p>
          </div>
        </aside>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {utilityCards.map((item) => (
          <Link key={item.title} to={item.href} className="utility-tile group">
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-lg border ${item.tone}`}>
              <item.icon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-ink">{item.title}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-ink-muted">{item.description}</p>
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-blue">
              Open utility
              <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
            </span>
          </Link>
        ))}
      </section>

      <AdSlot type="leaderboard" />

      <section className="surface-panel overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-hairline p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-brand-blue">
              <Zap className="h-4 w-4" />
              Featured database
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-ink">Top player search</h2>
            <p className="mt-1 text-sm text-ink-muted">
              A FIFAAddict-style scan table with stronger home-page priority and cleaner controls.
            </p>
          </div>
          <Link to="/database" className="btn-secondary inline-flex items-center justify-center gap-2 rounded-lg">
            Compare more players
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <PlayerTable
          searchQuery={deferredSearch}
          sortBy="season"
          limit={8}
          compact
        />
      </section>
    </div>
  );
}
