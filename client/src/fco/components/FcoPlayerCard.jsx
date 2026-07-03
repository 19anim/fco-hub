import { cleanName, statColor } from '../helpers.js';
import { getCardThemeForPlayer } from '../cardThemes.js';
import { normalizeUpgradeLevel } from '../upgradeHelpers.js';

function getPlayerImage(player) {
  return player?.imageUrl || player?.avatar || '';
}

function getFlagItems(player, flags) {
  if (Array.isArray(flags)) return flags.filter(Boolean);
  return [
    player?.nation ? { key: 'nation', label: player.nation } : null,
    player?.club ? { key: 'club', label: player.club } : null,
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
      <span className={`fc-salary${displayedSalary ? '' : ' is-empty'}`}>{displayedSalary || ''}</span>

      <span className="card-player-media fc-player-media">
        {playerImage ? <img src={playerImage} alt="" draggable="false" /> : <span className="fc-player-media-placeholder" aria-hidden="true" />}
      </span>

      <span className={`fc-grade enchant_${safeGrade}`}>+{safeGrade}</span>

      <span className="card-player-name fc-name-area">
        <span className="fc-name">{playerName}</span>
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
