import { cleanName, statColor } from '../helpers.js';
import { getCardThemeForPlayer } from '../cardThemes.js';
import { normalizeUpgradeLevel } from '../upgradeHelpers.js';
import { getClubCrest, getLeagueLogo, getNationFlag } from '../flagAssets.js';

function getPlayerImage(player) {
  return player?.imageUrl || player?.avatar || '';
}

function getFlagItems(player, flags) {
  if (Array.isArray(flags)) return flags.filter(Boolean);
  return [
    player?.nation ? { key: 'nation', label: player.nation, img: getNationFlag(player.nation) } : null,
    player?.league ? { key: 'league', label: player.league, img: getLeagueLogo(player.league) } : null,
    player?.club ? { key: 'club', label: player.club, img: getClubCrest(player.club) } : null,
  ].filter(Boolean);
}

export function FcoPlayerCard({
  player,
  theme: themeProp,
  ovr,
  pos,
  salary,
  grade,
  flags,
  variant = 'squad',
  className = '',
  onClick,
  title,
}) {
  const theme = themeProp || getCardThemeForPlayer(player);
  const safeGrade = normalizeUpgradeLevel(grade ?? player?.upgradeLevel);
  const displayedOvr = ovr ?? player?.ovr ?? 0;
  const displayedPos = pos || player?.primaryPos || '';
  const displayedSalary = salary ?? player?.salary;
  const playerName = cleanName(player?.name);
  const playerImage = getPlayerImage(player);
  const flagItems = getFlagItems(player, flags);
  const Root = onClick ? 'button' : 'div';

  return (
    <Root
      type={onClick ? 'button' : undefined}
      className={[
        'player-card',
        player ? 'has-player' : '',
        'fc-card',
        theme.className,
        `fc-card--${variant}`,
        className,
      ].filter(Boolean).join(' ')}
      style={{
        '--fco-card-theme-bg': theme.backgroundImage ? `url(${theme.backgroundImage})` : undefined,
        '--fco-card-ovr-color': statColor(displayedOvr),
      }}
      onClick={onClick}
      title={title || playerName}
    >
      {theme.backgroundImage ? (
        <img className="card-bg-img fc-bg" src={theme.backgroundImage} alt="" draggable="false" />
      ) : (
        <span className="card-bg-img fc-bg" aria-hidden="true" />
      )}

      <span className="card-ovr fc-ovr">{displayedOvr}</span>
      <span className="card-pos-label fc-pos">{displayedPos}</span>
      <span
        className={`fc-salary${displayedSalary ? '' : ' is-empty'}`}
        aria-label={displayedSalary ? `Salary ${displayedSalary}` : undefined}
      >
        <svg className="hexagon-svg" viewBox="0 0 17 17" aria-hidden="true" focusable="false">
          <path
            fillRule="evenodd"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="butt"
            strokeLinejoin="miter"
            fill="none"
            d="M8.5,16.5 L0.5,13 L0.5,4 L8.5,0.5 L16.5,4 L16.5,13 L8.5,16.5 Z"
          />
        </svg>
        <span className="pay-number">{displayedSalary || ''}</span>
      </span>

      <span className="card-player-media fc-player-media">
        {playerImage ? <img src={playerImage} alt="" draggable="false" /> : <span className="fc-player-media-placeholder" aria-hidden="true" />}
      </span>

      <span className={`fc-grade enchant_${safeGrade}`} aria-label={`Reinforce ${safeGrade}`} />

      <span className="card-player-name fc-name-area">
        <span className="fc-name">
          <i className={`badged y${theme.themeId}`} aria-hidden="true" />
          <span>{playerName}</span>
        </span>
        <span className="card-flags fc-flags">
          {flagItems.map((flag) => (
            <span className="fc-flag" key={flag.key || flag.label} title={flag.label}>
              {flag.img ? <img src={flag.img} alt="" /> : <span>{String(flag.label || '').slice(0, 2).toUpperCase()}</span>}
            </span>
          ))}
        </span>
      </span>
    </Root>
  );
}
