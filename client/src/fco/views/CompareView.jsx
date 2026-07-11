import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { fetchPlayerDetail } from '../api.js';
import { playerDetailKey } from '../queryKeys.js';
import { formatCoins, statColor, cleanName } from '../helpers.js';
import { PlayerAvatar, OvrBox, PosPill, SeasonChip, TrustBadge, Button, EmptyState } from '../ui.jsx';
import * as I from '../Icons.jsx';
import PlayerPicker from '../components/PlayerPicker.jsx';

const MAX = 4;

const COMPARE_ROWS = [
  { section: 'Cơ bản' },
  { key: 'ovr',       label: 'Overall', type: 'stat' },
  { key: 'pace',      label: 'Tốc độ',      type: 'stat' },
  { key: 'shooting',  label: 'Dứt điểm',    type: 'stat' },
  { key: 'passing',   label: 'Chuyền bóng', type: 'stat' },
  { key: 'dribbling', label: 'Kỹ thuật',    type: 'stat' },
  { key: 'defending', label: 'Phòng thủ',   type: 'stat' },
  { key: 'physical',  label: 'Thể lực',     type: 'stat' },
  { section: 'Thị trường' },
  { key: 'price',     label: 'Giá', type: 'coin' },
  { key: 'salary',    label: 'Lương', type: 'coin' },
];

export default function CompareView({ compareIds, onUpdateCompare, onSelect }) {
  useDocumentMeta({
    title: 'So sánh',
    description: 'So sánh chỉ số của nhiều cầu thủ FCOnline cùng lúc.',
    path: '/compare',
  });
  const [pickerOpen, setPickerOpen] = useState(false);
  const ids = compareIds.slice(0, MAX);
  const cols = MAX;

  const results = useQueries({
    queries: ids.map(id => ({
      queryKey: playerDetailKey(id),
      queryFn: () => fetchPlayerDetail(id),
      staleTime: 10 * 60 * 1000,
    })),
  });
  const players = Object.fromEntries(
    ids.map((id, i) => [id, results[i]?.data?.player]).filter(([, p]) => p != null)
  );

  function removeId(id) { onUpdateCompare(ids.filter(x => x !== id)); }
  function addId(id) { if (!ids.includes(id) && ids.length < MAX) onUpdateCompare([...ids, id]); }

  const gridCols = `180px repeat(${cols}, 1fr)`;

  return (
    <div className="fco-compare">
      <div className="fco-compare-head">
        <div>
          <h2 className="fco-h2">So sánh cầu thủ</h2>
          <p className="fco-sub">Thêm tối đa {MAX} cầu thủ để so sánh các chỉ số.</p>
        </div>
        {ids.length > 0 && (
          <Button variant="ghost" size="sm" icon={I.X} onClick={() => onUpdateCompare([])}>Xoá tất cả</Button>
        )}
      </div>

      {ids.length === 0 ? (
        <EmptyState icon={I.Compare} title="Chưa có cầu thủ để so sánh"
          body="Chọn cầu thủ từ Database hoặc bấm nút thêm bên dưới."
          action={<Button variant="primary" size="sm" icon={I.Plus} onClick={() => setPickerOpen(true)}>Thêm cầu thủ</Button>} />
      ) : (
        <div className="fco-cmp-scroll">
          <div className="fco-cmp" style={{ minWidth: 620 }}>
            {/* Header row */}
            <div className="fco-cmp-row head" style={{ gridTemplateColumns: gridCols }}>
              <div className="fco-cmp-lab" />
              {ids.map(id => {
                const p = players[id];
                return (
                  <div key={id} className="fco-cmp-head-card">
                    <button className="fco-cmp-remove" onClick={() => removeId(id)} title="Xoá"><I.X size={12} /></button>
                    {p ? (
                      <>
                        <PlayerAvatar player={p} size={48} />
                        <div>
                          <div className="fco-cmp-cardname" style={{ cursor: 'pointer' }} onClick={() => onSelect(id)}>{cleanName(p.name)}</div>
                          <div className="fco-cmp-cardsub">
                            <SeasonChip code={p.season} img={p.seasonImg} />
                            {' '}<PosPill pos={p.primaryPos} />
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ color: 'var(--text-faint)' }}><I.Spinner size={20} className="fco-spin" /></div>
                    )}
                  </div>
                );
              })}
              {ids.length < MAX && Array.from({ length: MAX - ids.length }).map((_, i) => (
                <div key={`add-${i}`} className="fco-cmp-head-card">
                  <button className="fco-cmp-add" onClick={() => setPickerOpen(true)} style={{ width: '100%', minHeight: 100 }}>
                    <I.Plus size={18} />
                    <span>Thêm</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Data rows */}
            {COMPARE_ROWS.map((row, ri) => {
              if (row.section) {
                return (
                  <div key={`sec-${ri}`} className="fco-cmp-row section" style={{ gridTemplateColumns: gridCols }}>
                    <div className="fco-cmp-lab section">{row.section}</div>
                    {Array.from({ length: MAX }).map((_, ci) => <div key={ci} className="fco-cmp-emptycol" />)}
                  </div>
                );
              }
              const vals = ids.map(id => {
                const p = players[id];
                return p != null ? (p[row.key] ?? null) : null;
              });
              const numericVals = vals.filter(v => v != null);
              const maxVal = numericVals.length ? Math.max(...numericVals) : null;

              return (
                <div key={row.key} className="fco-cmp-row" style={{ gridTemplateColumns: gridCols }}>
                  <div className="fco-cmp-lab">{row.label}</div>
                  {ids.map((id, ci) => {
                    const v = vals[ci];
                    const isBest = v != null && v === maxVal && numericVals.length > 1;
                    let display = v == null ? '—' : row.key === 'salary' ? String(v) : row.type === 'coin' ? formatCoins(v) : String(v);
                    let color = v == null ? 'var(--text-faint)' : row.type === 'stat' ? statColor(v) : 'var(--text)';
                    return (
                      <div key={id} className={`fco-cmp-cell stat${isBest ? ' best' : ''}`}>
                        {isBest && <span className="fco-cmp-best">BEST</span>}
                        <div className="fco-cmp-statline">
                          <span className="fco-cmp-statval" style={{ color }}>{display}</span>
                          {row.type === 'stat' && v != null && (
                            <div style={{ flex: 1, height: 4, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                              <div style={{ width: `${Math.min(100, v)}%`, height: '100%', background: color, borderRadius: 99 }} />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {ids.length < MAX && Array.from({ length: MAX - ids.length }).map((_, i) => (
                    <div key={`empty-${i}`} className="fco-cmp-cell" />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pickerOpen && (
        <PlayerPicker
          existing={ids}
          onAdd={p => { addId(p.id); if (ids.length + 1 >= MAX) setPickerOpen(false); }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}
