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
  if ((item?.ref_type === 'country' || item?.ref_type === 'nation') && item?.ref_id) return `https://s1.fifaaddict.com/fo4/countries/${item.ref_id}.png`;
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

function getItemSlots(item) {
  const matchedSlots = Array.isArray(item?.matched_slots) ? item.matched_slots : [];
  const qualifiedSlots = Array.isArray(item?.qualified_slots) && item.qualified_slots.length
    ? item.qualified_slots
    : matchedSlots;
  return { matchedSlots, qualifiedSlots };
}

function buildPitchTeamColorEntries(result) {
  return STRIP_ITEMS.flatMap((group) => {
    const { active } = getGroupData(result, group.key);
    return active.map((item, index) => {
      const { matchedSlots, qualifiedSlots } = getItemSlots(item);
      const fallbackId = item?.name_vn || item?.name || index;
      return {
        id: `${group.key}:${item?.tcid || fallbackId}`,
        groupKey: group.key,
        tone: group.key,
        label: group.label,
        item,
        matchedSlots,
        qualifiedSlots,
      };
    });
  });
}

export function PitchTeamColorList({ result, activeFocus, onToggleFocus }) {
  const entries = buildPitchTeamColorEntries(result);
  if (!entries.length) return null;

  return (
    <div className="pitch-teamcolor-list" aria-label="Team color đang kích hoạt">
      {entries.map((entry) => {
        const isActive = activeFocus?.id === entry.id;
        const iconUrl = getIconUrl(entry.item);
        const name = entry.item?.name_vn || entry.item?.name || entry.label;

        return (
          <button
            key={entry.id}
            type="button"
            className={`pitch-teamcolor-badge pitch-teamcolor-badge--${entry.tone}${isActive ? ' is-active' : ''}`}
            onClick={() => onToggleFocus(isActive ? null : entry)}
            aria-pressed={isActive}
            aria-label={name}
            title={name}
            data-group-name={entry.groupKey}
            data-team-color-tone={entry.tone}
            data-matched-slots={entry.matchedSlots.join(',')}
            data-qualified-slots={entry.qualifiedSlots.join(',')}
          >
            <span className="pitch-teamcolor-badge__icon-wrap">
              {iconUrl ? (
                <img className="pitch-teamcolor-badge__icon" src={iconUrl} alt="" aria-hidden="true" />
              ) : (
                <span className="pitch-teamcolor-badge__icon-placeholder" aria-hidden="true" />
              )}
            </span>
            <span className="pitch-teamcolor-badge__text">
              <span className="pitch-teamcolor-badge__name">{name}</span>
              <span className="pitch-teamcolor-badge__meta">{entry.item?.matched ?? entry.matchedSlots.length}/{entry.item?.required ?? entry.qualifiedSlots.length}</span>
            </span>
          </button>
        );
      })}
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
