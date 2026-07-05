import { useState } from 'react';

const STRIP_ITEMS = [
  { key: 'club', label: 'Team Color CLB', icon: '/fco/teamcolor-icons/strip/club.png' },
  { key: 'grade', label: 'Team Color thẻ cộng', icon: '/fco/teamcolor-icons/strip/grade.png' },
  { key: 'relation', label: 'Team Color liên kết', icon: '/fco/teamcolor-icons/strip/relation.png' },
];

function getGroupData(result, key) {
  const group = result?.groups?.[key];
  return {
    active: Array.isArray(group?.active) ? group.active : [],
    candidates: Array.isArray(group?.candidates) ? group.candidates : [],
  };
}

function getIconUrl(item) {
  if (item?.image) return `https://s1.fifaaddict.com/fo4/teamcolor/${item.image}`;
  if (item?.ref_type === 'team' && item?.ref_id) return `https://s1.fifaaddict.com/fo4/crests/light/l${item.ref_id}.png`;
  return '';
}

function TeamColorDetailModal({ item, groupKey, onClose }) {
  if (!item) return null;
  const rewardEntries = Object.entries(item.rewards || {});

  return (
    <div className="fco-modal-backdrop" onClick={onClose}>
      <div className="fco-teamcolor-detail" onClick={(e) => e.stopPropagation()}>
        <div className="fco-teamcolor-detail-head">
          {getIconUrl(item) && <img src={getIconUrl(item)} alt="" className="fco-teamcolor-detail-icon" />}
          <div>
            <div className="fco-teamcolor-detail-name">{item.name_vn || item.name}</div>
            <div className="fco-teamcolor-detail-sub">Cấp {item.level} · Yêu cầu {item.required} · Đủ điều kiện {item.matched}</div>
          </div>
          <button type="button" className="fco-modal-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <div className="fco-teamcolor-detail-rewards">
          {rewardEntries.map(([stat, value]) => (
            <span key={stat} className="fco-teamcolor-reward-chip">{stat} +{value}</span>
          ))}
        </div>
        {groupKey !== 'grade' && (
          <div className="fco-teamcolor-detail-slots">
            Vị trí thoả điều kiện: {(item.matched_slots || []).join(', ') || '—'}
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamColorStrip({ result, loading, error }) {
  const [openGroupKey, setOpenGroupKey] = useState(null);

  return (
    <div className="fco-teamcolor-strip">
      {STRIP_ITEMS.map((item) => {
        const { active, candidates } = getGroupData(result, item.key);
        const count = active.length;
        const hasData = count > 0;

        return (
          <button
            key={item.key}
            type="button"
            className={`fco-teamcolor-strip-btn${hasData ? ' is-active' : ''}`}
            disabled={!active.length && !candidates.length}
            onClick={() => setOpenGroupKey(item.key)}
            title={item.label}
          >
            <img src={item.icon} alt="" />
            <span>{count}</span>
          </button>
        );
      })}

      {loading && <span className="fco-teamcolor-strip-status">Đang tính team color…</span>}
      {!loading && error && <span className="fco-teamcolor-strip-status is-error">Team color tạm thời không khả dụng</span>}

      {openGroupKey && (
        <div className="fco-teamcolor-detail-list">
          {getGroupData(result, openGroupKey).active.map((item) => (
            <TeamColorDetailModal key={item.tcid} item={item} groupKey={openGroupKey} onClose={() => setOpenGroupKey(null)} />
          ))}
          {getGroupData(result, openGroupKey).active.length === 0 && (
            <TeamColorDetailModal
              item={getGroupData(result, openGroupKey).candidates[0]}
              groupKey={openGroupKey}
              onClose={() => setOpenGroupKey(null)}
            />
          )}
        </div>
      )}
    </div>
  );
}
