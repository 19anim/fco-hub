import { useMemo } from 'react';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { usePlayersQuery } from '../queries.js';
import { cleanName } from '../helpers.js';
import { PlayerAvatar, OvrBox, PosPill, SeasonChip, EmptyState, SkeletonRow, Button } from '../ui.jsx';
import * as I from '../Icons.jsx';

export default function WatchlistView({ watch, onToggleWatch, onSelect }) {
  useDocumentMeta({
    title: 'Theo dõi',
    description: 'Danh sách cầu thủ FCOnline bạn đang theo dõi.',
    path: '/watchlist',
  });
  const queryFilters = useMemo(() => watch.length ? { ids: watch, pageSize: 100 } : null, [watch]);
  const { data: playersRes, isLoading: loading } = usePlayersQuery(queryFilters);
  const players = (playersRes?.players ?? []).filter(p => watch.includes(p.id));

  if (!watch.length) {
    return (
      <EmptyState icon={I.Star} title="Danh sách theo dõi trống"
        body="Bấm biểu tượng ★ ở bất kỳ cầu thủ nào trong Database để thêm vào đây."
      />
    );
  }

  return (
    <div className="fco-db">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h2 className="fco-h2" style={{ marginBottom: 4 }}>Theo dõi</h2>
          <p className="fco-sub" style={{ margin: 0 }}><b>{watch.length}</b> cầu thủ đang theo dõi</p>
        </div>
        <Button variant="ghost" size="sm" icon={I.X} onClick={() => watch.forEach(id => onToggleWatch(id))}>
          Xoá tất cả
        </Button>
      </div>

      <div className="fco-rows">
        {loading
          ? Array.from({ length: Math.min(watch.length, 6) }).map((_, i) => <SkeletonRow key={i} />)
          : players.map(p => (
              <div key={p.id} className="fco-row" tabIndex={0}
                onClick={() => onSelect(p.id)}
                onKeyDown={e => e.key === 'Enter' && onSelect(p.id)}>
                <PlayerAvatar player={p} size={40} />
                <div className="fco-row-player">
                  <div>
                    <div className="fco-row-name">{cleanName(p.name)}</div>
                    <div className="fco-row-sub">
                      <SeasonChip code={p.season} img={p.seasonImg} />
                      {' '}<PosPill pos={p.primaryPos} />
                      {p.club && <span style={{ marginLeft: 4 }}>{p.club}</span>}
                    </div>
                  </div>
                </div>
                <OvrBox value={p.ovr} pos={p.primaryPos} size="sm" />
                <div style={{ display: 'flex', gap: 14, marginLeft: 'auto' }}>
                  {p.salary > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Lương</div>
                      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13 }}>{p.salary}</div>
                    </div>
                  )}
                </div>
                <button className="fco-star on"
                  onClick={e => { e.stopPropagation(); onToggleWatch(p.id); }}
                  title="Bỏ theo dõi">
                  <I.StarFill size={14} />
                </button>
                <I.ChevronRight size={16} className="fco-row-chev" style={{ color: 'var(--text-faint)', flex: '0 0 16px' }} />
              </div>
            ))
        }
      </div>
    </div>
  );
}
