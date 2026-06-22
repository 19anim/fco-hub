import { useDeferredValue, useMemo, useState } from 'react';
import YouTubeEmbed from '../../components/YouTubeEmbed.jsx';
import MonetizationSlot from '../../components/monetization/MonetizationSlot.jsx';
import { EmptyState } from '../ui.jsx';
import * as I from '../Icons.jsx';

const VIDEOS = [
  {
    id: 'keyboard-4141',
    player: 'Ronaldo',
    position: 'ST',
    season: 'IPRM',
    youtubeId: 'Yhdynz53Spw',
    title: 'Sơ đồ 4-1-4-1: nghệ thuật của sự kiên nhẫn',
    channel: 'FCO Đá Phím',
  },
  {
    id: 'keyboard-skills',
    player: 'Gameplay Tips',
    position: 'META',
    season: 'Guide',
    youtubeId: 'nvD0eLchDFc',
    title: 'Top kỹ thuật hiệu quả cho dân chơi bàn phím',
    channel: 'FC Online Vietnam',
  },
];

function VideoCard({ video }) {
  return (
    <article className="fco-video-card">
      <div className="fco-video-card-head">
        <div>
          <div className="fco-video-kicker">
            <span>{video.season}</span>
            <span>{video.position}</span>
          </div>
          <h3 className="fco-video-title">{video.title}</h3>
          <p className="fco-video-meta">{video.player} · {video.channel}</p>
        </div>
        <div className="fco-video-play" aria-hidden="true">
          <I.Video size={18} />
        </div>
      </div>
      <YouTubeEmbed videoId={video.youtubeId} title={video.title} />
    </article>
  );
}

export default function VideosView() {
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);

  const visibleVideos = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) return VIDEOS;

    return VIDEOS.filter((video) =>
      [video.player, video.position, video.season, video.title, video.channel]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    );
  }, [deferredQuery]);

  return (
    <div className="fco-videos">
      <div className="fco-videos-head">
        <div>
          <div className="fco-video-badge"><I.Video size={14} /> Videos</div>
          <h2 className="fco-h2">Video Reviews</h2>
          <p className="fco-sub">Tổng hợp gameplay, review cầu thủ và hướng dẫn để bạn ra quyết định nhanh hơn.</p>
        </div>
        <label className="fco-search fco-videos-search">
          <I.Search size={16} />
          <span className="sr-only">Tìm video</span>
          <input
            type="search"
            className="fco-search-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm cầu thủ, vị trí, kênh..."
          />
          {query && (
            <button type="button" className="fco-search-clear" onClick={() => setQuery('')} aria-label="Xoá tìm kiếm">
              <I.X size={14} />
            </button>
          )}
        </label>
      </div>

      <MonetizationSlot placement="videos_top" className="fco-videos-monetization" />

      {visibleVideos.length === 0 ? (
        <EmptyState
          icon={I.Video}
          title="Không tìm thấy video phù hợp"
          body="Thử tìm theo tên cầu thủ, vị trí, mùa thẻ hoặc tên kênh."
        />
      ) : (
        <div className="fco-video-grid">
          {visibleVideos.map((video, index) => (
            <div key={video.id} className="fco-video-grid-item">
              {index === 2 && <MonetizationSlot placement="videos_inline" className="fco-videos-inline" />}
              <VideoCard video={video} />
            </div>
          ))}
          {visibleVideos.length < 3 && <MonetizationSlot placement="videos_inline" className="fco-videos-inline" />}
        </div>
      )}
    </div>
  );
}
