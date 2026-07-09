import { useState } from 'react';
import { useAssets } from '../assets/AssetProvider.jsx';

const STRIP_ITEMS = [
  { key: 'club', label: 'Team Color CLB' },
  { key: 'grade', label: 'Team Color thẻ cộng' },
  { key: 'relation', label: 'Team Color liên kết' },
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

function getPlayerFaceUrl(uid) {
  return uid ? `https://s1.fifaaddict.com/fo4/players/${uid}.png` : '';
}

function getSourceUid(player) {
  return String(player?._raw?.enrichment?.sourceUid || player?.spid || '');
}

function TeamColorDetailCard({ item, bySlotId }) {
  const rewardEntries = Object.entries(item.rewards || {});
  const matchedSlots = Array.isArray(item.matched_slots) ? item.matched_slots : [];
  const qualifiedSlots = Array.isArray(item.qualified_slots) && item.qualified_slots.length
    ? item.qualified_slots
    : matchedSlots;
  const matchedSet = new Set(matchedSlots);

  const players = [...new Set(qualifiedSlots)]
    .map((slotId) => {
      const player = bySlotId?.[slotId];
      if (!player) return null;
      return { slotId, uid: getSourceUid(player), name: player.name || '', isMatched: matchedSet.has(slotId) };
    })
    .filter(Boolean)
    .sort((a, b) => (a.isMatched === b.isMatched ? 0 : a.isMatched ? -1 : 1));

  return (
    <article className="team-color-detail-card">
      <div className="team-color-detail-card__top">
        <div className="team-color-detail-card__identity">
          <div className="team-color-detail-card__icon-wrap">
            {getIconUrl(item) && <img className="team-color-detail-card__icon" src={getIconUrl(item)} alt="" aria-hidden="true" />}
          </div>
          <div className="team-color-detail-card__text">
            <div className="team-color-detail-card__name">{item.name_vn || item.name}</div>
            <div className="team-color-detail-card__meta">Lv {item.level} • {item.matched}/{item.required} cầu thủ</div>
          </div>
        </div>
      </div>

      {rewardEntries.length > 0 && (
        <div className="team-color-detail-card__rewards">
          {rewardEntries.map(([stat, value]) => (
            <div key={stat} className="team-color-detail-reward">
              <span className="team-color-detail-reward__name">{stat}</span>
              <span className="team-color-detail-reward__value">+{value}</span>
            </div>
          ))}
        </div>
      )}

      {players.length > 0 && (
        <div className="team-color-detail-card__players">
          {players.map((player) => (
            <div
              key={player.slotId}
              className={`team-color-detail-player${player.isMatched ? '' : ' team-color-detail-player--inactive'}`}
              title={player.name}
            >
              {getPlayerFaceUrl(player.uid) && (
                <img className="team-color-detail-player__face" src={getPlayerFaceUrl(player.uid)} alt={player.name || ''} loading="lazy" draggable="false" />
              )}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

function TeamColorDetailModal({ items, title, bySlotId, onClose }) {
  return (
    <div className="team-color-detail-overlay active" onClick={onClose}>
      <div className="team-color-detail-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="team-color-detail-header">
          <h2 className="team-color-detail-title">{title}</h2>
          <button type="button" className="team-color-detail-close" onClick={onClose} aria-label="Đóng">×</button>
        </div>
        <div className="team-color-detail-list">
          {items.map((item) => (
            <TeamColorDetailCard key={item.tcid} item={item} bySlotId={bySlotId} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TeamColorStrip({ result, loading, error, bySlotId }) {
  const [openGroupKey, setOpenGroupKey] = useState(null);
  const { getAssetUrl } = useAssets();

  return (
    <div className="fco-squad-summary-card team-color-strip">
      <div className="fco-squad-summary-head">
        <span className="fco-squad-summary-eyebrow">Team Color</span>
      </div>
      <div className="team-color-items">
        {STRIP_ITEMS.map((item) => {
          const { active, candidates } = getGroupData(result, item.key);
          const count = active.length;
          const hasData = count > 0;
          const iconUrl = getAssetUrl('teamColorIcon', item.key);

          return (
            <button
              key={item.key}
              type="button"
              id={`teamColor${item.key.charAt(0).toUpperCase()}${item.key.slice(1)}Button`}
              className={`summary-edit-icon${hasData ? ' is-active' : ''}`}
              disabled={!active.length && !candidates.length}
              onClick={() => setOpenGroupKey(item.key)}
              aria-label={item.label}
              title={item.label}
            >
              {iconUrl ? (
                <img className="team-color-item__icon" src={iconUrl} alt="" aria-hidden="true" />
              ) : (
                <span className="team-color-item__icon-placeholder" aria-hidden="true" />
              )}
              <span>{count}</span>
            </button>
          );
        })}
      </div>

      {loading && <span className="fco-teamcolor-strip-status">Đang tính team color…</span>}
      {!loading && error && <span className="fco-teamcolor-strip-status is-error">Team color tạm thời không khả dụng</span>}

      {openGroupKey && (() => {
        const { active, candidates } = getGroupData(result, openGroupKey);
        const items = active.length > 0 ? active : candidates.slice(0, 1);
        const label = STRIP_ITEMS.find((i) => i.key === openGroupKey)?.label || '';
        return (
          <TeamColorDetailModal
            items={items}
            title={label}
            bySlotId={bySlotId}
            onClose={() => setOpenGroupKey(null)}
          />
        );
      })()}
    </div>
  );
}
