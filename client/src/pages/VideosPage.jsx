import { useDeferredValue, useMemo, useState } from 'react';
import { Play, Search, Video } from 'lucide-react';
import YouTubeEmbed from '../components/YouTubeEmbed';
import AdSlot from '../components/AdSlot';
import MonetizationSlot from '../components/monetization/MonetizationSlot';

const sampleVideos = [
  {
    _id: '1',
    name: 'R9 ICON',
    position: 'ST',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'R9 ICON review and gameplay test',
    channel: 'FC Online Vietnam',
  },
  {
    _id: '2',
    name: 'TOTY Mbappe',
    position: 'LW',
    youtubeId: 'dQw4w9WgXcQ',
    title: 'TOTY Mbappe pace and finishing review',
    channel: 'Pro FC Online',
  },
];

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);

  const visibleVideos = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return sampleVideos;
    return sampleVideos.filter((video) =>
      [video.name, video.position, video.title, video.channel].join(' ').toLowerCase().includes(query)
    );
  }, [deferredSearch]);

  return (
    <div className="space-y-6">
      <section className="surface-panel p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase text-fuchsia-300">
              <Video className="h-3.5 w-3.5" />
              Review utility
            </div>
            <h1 className="text-3xl font-semibold text-ink">Video Reviews</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-muted">
              Pair player searches with gameplay reviews so database decisions are easier to trust.
            </p>
          </div>
          <label className="relative block w-full lg:max-w-md">
            <span className="sr-only">Search videos</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" />
            <input
              type="search"
              placeholder="Search player reviews..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-12 w-full rounded-lg border border-hairline bg-canvas-dark pl-12 pr-4 text-ink placeholder:text-ink-subtle outline-none transition focus:border-brand-blue"
            />
          </label>
        </div>
      </section>

      <AdSlot type="leaderboard" />

      <MonetizationSlot placement="videos_top" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" />

      <section className="grid gap-5 lg:grid-cols-2">
        {visibleVideos.map((video) => (
          <article key={video._id} className="surface-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-hairline p-5">
              <div>
                <h2 className="font-semibold text-ink">{video.name}</h2>
                <p className="text-sm text-ink-muted">{video.position} · {video.channel}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-fuchsia-500/15 text-fuchsia-300">
                <Play className="h-5 w-5" />
              </div>
            </div>
            <div className="p-5">
              <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
