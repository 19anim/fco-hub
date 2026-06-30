import { useState } from 'react';
import { useMonetizationFeed } from '../../hooks/useMonetizationFeed.js';
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js';
import { BACKEND_SEARCH_DEBOUNCE_MS, BACKEND_SEARCH_MAX_LENGTH, canRunBackendSearch, normalizeBackendSearch } from '../../utils/backendSearch.js';
import MonetizationSlot from '../../components/monetization/MonetizationSlot.jsx';
import AffiliateCtaCard from '../../components/monetization/renderers/AffiliateCtaCard.jsx';
import YouTubeCard from '../../components/monetization/renderers/YouTubeCard.jsx';
import { EmptyState } from '../ui.jsx';
import * as I from '../Icons.jsx';

export default function VideosView() {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, BACKEND_SEARCH_DEBOUNCE_MS);
  const activeSearch = canRunBackendSearch(debouncedSearch) ? normalizeBackendSearch(debouncedSearch) : undefined;

  const { items: videoItems, loading: videosLoading } = useMonetizationFeed({ placement: 'videos_inline', limit: 20, search: activeSearch });
  const { items: affItems } = useMonetizationFeed({ placement: 'videos_aff', limit: 6 });

  return (
    <div className="fco-videos">
      <div className="fco-videos-head">
        <div className="fco-video-badge"><I.Video size={14} /> Videos</div>
        <h2 className="fco-h2">Video Reviews</h2>
        <p className="fco-sub">Tổng hợp gameplay, review cầu thủ và hướng dẫn để bạn ra quyết định nhanh hơn.</p>
        <div className="fco-videos-search">
          <div className="fa-search-input-wrap">
            <input
              type="search"
              placeholder="Tìm video..."
              maxLength={BACKEND_SEARCH_MAX_LENGTH}
              value={search}
              className="fa-search-input"
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" className="fa-clear-btn" onClick={() => setSearch('')} title="Xoá">
                <I.X size={14} />
              </button>
            )}
          </div>
          {normalizeBackendSearch(search).length === 1 && (
            <span className="fa-search-hint">Nhập ít nhất 2 ký tự</span>
          )}
        </div>
      </div>

      <MonetizationSlot placement="videos_top" limit={1} className="fco-monetization-band" />

      <div className="fco-videos-layout">
        <div className="fco-videos-center">
          {!videosLoading && videoItems.length === 0 ? (
            <EmptyState
              icon={I.Video}
              title="Chưa có video nào"
              body="Nội dung video sẽ được cập nhật sớm."
            />
          ) : (
            <div className="fco-video-grid fco-video-grid--2col">
              {videoItems.map((item) => (
                <YouTubeCard key={item._id} item={item} placement="videos_inline" />
              ))}
            </div>
          )}
        </div>

        {affItems.length > 0 && (
          <aside className="fco-videos-sidebar" aria-label="Gợi ý Shopee">
            <div className="fco-sidebar-label">
              <I.Coins size={12} />
              Gợi ý mua sắm
            </div>
            <div className="fco-videos-aff-grid">
              {affItems.map((item) => (
                <AffiliateCtaCard key={item._id} item={item} placement="videos_aff" />
              ))}
            </div>
          </aside>
        )}
      </div>

      <MonetizationSlot placement="videos_bottom" limit={1} className="fco-monetization-band" />
    </div>
  );
}
