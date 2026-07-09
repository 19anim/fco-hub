import { useAssets } from '../assets/AssetProvider.jsx';
import { cleanName, statColor } from '../helpers.js';
import { PlayerAvatar, SeasonChip, PosPill } from '../ui.jsx';
import { getOvrForLevel, getSkillMovesForLevel } from '../upgradeHelpers.js';
import LevelSelect from './LevelSelect.jsx';
import * as I from '../Icons.jsx';

const FOOT_SPRITE_FALLBACK = '/fco/icons/foot.png';
const FOOT_FRAME_W = 46;
const FOOT_FRAME_H = 91;
const FOOT_SHEET_H = 364;
const SKILL_MOVES_MAX = 6;

function SkillStars({ n }) {
  return (
    <span className="fco-mini-stars" title={`Kỹ năng ${n}/${SKILL_MOVES_MAX}`}>
      {Array.from({ length: SKILL_MOVES_MAX }, (_, i) => (
        <svg key={i} width="10" height="10" viewBox="0 0 24 24" className={`fa-star${i < n ? ' on' : ''}`} fill="inherit">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </span>
  );
}

function FootIcon({ active, mirror, size = 15, rating, spriteUrl }) {
  const scale = size / FOOT_FRAME_W;
  return (
    <span className={`fco-foot-icon${active ? ' on' : ''}`} style={{ width: size, height: FOOT_FRAME_H * scale }}>
      <span
        className="fco-foot-icon-img"
        style={{
          backgroundImage: `url(${spriteUrl})`,
          backgroundSize: `${size}px ${FOOT_SHEET_H * scale}px`,
          backgroundPosition: `0 ${active ? -(FOOT_FRAME_H + 1) * scale : 0}px`,
          transform: mirror ? 'scaleX(-1)' : undefined,
        }}
      />
      <span className="fco-foot-icon-num">{rating}</span>
    </span>
  );
}

function PreferredFoot({ foot, weakFoot, spriteUrl }) {
  const leftRating = foot === 'left' ? 5 : weakFoot;
  const rightRating = foot === 'right' ? 5 : weakFoot;
  return (
    <span className="fco-mini-foot" title={`Chân thuận: ${foot === 'left' ? 'Trái' : 'Phải'} · Chân nghịch ${weakFoot}/5`}>
      <FootIcon active={foot === 'left'} rating={leftRating} spriteUrl={spriteUrl} />
      <FootIcon active={foot === 'right'} mirror rating={rightRating} spriteUrl={spriteUrl} />
    </span>
  );
}

export default function PlayerPickerItem({ player: p, disabled, allowLevelSelect, level, onLevelChange, onChoose }) {
  const { getAssetUrl } = useAssets();
  const footSpriteUrl = getAssetUrl('playerDetailAsset', 'foot') || FOOT_SPRITE_FALLBACK;
  const displayedOvr = allowLevelSelect ? getOvrForLevel(p.ovr, level) : p.ovr;
  const displayedSkillMoves = allowLevelSelect ? getSkillMovesForLevel(p.skillMoves, level) : p.skillMoves;

  return (
    <button className="fco-modal-item" disabled={disabled} onClick={() => onChoose(p)}>
      <PlayerAvatar player={p} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="fco-modal-itemname">{cleanName(p.name)}</div>
        <div className="fco-modal-itemsub">
          <SeasonChip code={p.season} img={p.seasonImg} />
          {' '}<PosPill pos={p.primaryPos} />
          <span style={{ marginLeft: 6, fontFamily: 'var(--mono)', fontSize: 12, color: statColor(displayedOvr) }}>{displayedOvr}</span>
          {p.club && <span style={{ marginLeft: 6 }}>{p.club}</span>}
        </div>
        <div className="fco-modal-itemmeta">
          {displayedSkillMoves > 0 && <SkillStars n={displayedSkillMoves} />}
          {(p.foot || p.weakFoot > 0) && <PreferredFoot foot={p.foot} weakFoot={p.weakFoot} spriteUrl={footSpriteUrl} />}
          {p.salary > 0 && (
            <span className="fco-mini-salary" title={`Lương ${p.salary}`}>
              <svg className="fco-mini-salary-hex" width="26" height="28" viewBox="0 0 17 17">
                <path d="M8.5,16.5 L0.5,13 L0.5,4 L8.5,0.5 L16.5,4 L16.5,13 L8.5,16.5 Z" />
              </svg>
              <span className="fco-mini-salary-num">{p.salary}</span>
            </span>
          )}
        </div>
      </div>
      {allowLevelSelect && !disabled && (
        <LevelSelect value={level} onChange={onLevelChange} />
      )}
      {disabled && <I.Check size={14} style={{ color: 'var(--accent)', flex: '0 0 14px' }} />}
    </button>
  );
}
