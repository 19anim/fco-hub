import { useState, useEffect, useMemo, useRef } from 'react';
import { normalizeBackendSearch } from '../../utils/backendSearch.js';
import { fetchPlayers, fetchMeta, fetchClubsByLeague } from '../api.js';
import { shouldClearCareerClubForLeagueChange, shouldLoadClubsForLeague } from '../views/DatabaseView.filters.js';
import { getPlayerCardKey, isSamePlayerCard, normalizeUpgradeLevel } from '../upgradeHelpers.js';
import { SEASONS_META } from '../constants.js';
import { getSeasonSprite, resolveSeasonSprite } from '../seasonSprites.js';
import PlayerSearchForm from './PlayerSearchForm.jsx';
import PlayerPickerItem from './PlayerPickerItem.jsx';
import * as I from '../Icons.jsx';
import { useAssets } from '../assets/AssetProvider.jsx';

const DEFAULT_OVR = [50, 150];
const DEFAULT_SALARY = 999999;

export default function PlayerPickerFiltered({
  existing = [],
  existingPlayers = [],
  onAdd,
  onClose,
  title = 'Chọn cầu thủ',
  allowLevelSelect = false,
  defaultLevel = 1,
  posGroups = null,
  pageSize = 20,
}) {
  const { getAssetUrl } = useAssets();
  const [search, setSearch] = useState('');
  const [positions, setPositions] = useState([]);
  const [seasons, setSeasons] = useState([]);
  const [ovr, setOvr] = useState(DEFAULT_OVR);
  const [salaryMax, setSalaryMax] = useState(DEFAULT_SALARY);
  const [league, setLeague] = useState('');
  const [nation, setNation] = useState('');
  const [club, setClub] = useState('');
  const [preferredFoot, setPreferredFoot] = useState('');
  const [weakFoot, setWeakFoot] = useState('');
  const [skillMoves, setSkillMoves] = useState('');
  const [workRateAttack, setWorkRateAttack] = useState('');
  const [workRateDefense, setWorkRateDefense] = useState('');
  const [heightMin, setHeightMin] = useState('');
  const [heightMax, setHeightMax] = useState('');
  const [weightMin, setWeightMin] = useState('');
  const [weightMax, setWeightMax] = useState('');
  const [reputation, setReputation] = useState('');
  const [statFilter, setStatFilter] = useState('');
  const [statMin, setStatMin] = useState('');
  const [statMax, setStatMax] = useState('');
  const [trait, setTrait] = useState('');

  const [allSeasons, setAllSeasons] = useState([]);
  const [allNations, setAllNations] = useState([]);
  const [allLeagues, setAllLeagues] = useState([]);
  const [allTraits, setAllTraits] = useState([]);
  const [clubOptions, setClubOptions] = useState([]);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [levelById, setLevelById] = useState({});
  const [mobileTab, setMobileTab] = useState('filters');

  const previousLeagueRef = useRef(undefined);
  const normalizedSearch = normalizeBackendSearch(search);
  const [submittedParams, setSubmittedParams] = useState(() => (
    posGroups?.length ? { posGroups, sort: 'ovr_desc', pageSize } : null
  ));

  useEffect(() => {
    fetchMeta().then(res => {
      if (res.seasons) setAllSeasons(res.seasons);
      if (res.nations) setAllNations(res.nations);
      if (res.leagues) setAllLeagues(res.leagues);
      if (res.hiddenTraits) setAllTraits(res.hiddenTraits);
    });
  }, []);

  useEffect(() => {
    if (shouldLoadClubsForLeague(league)) {
      fetchClubsByLeague(league).then(setClubOptions);
    } else {
      setClubOptions([]);
    }
    if (shouldClearCareerClubForLeagueChange(previousLeagueRef.current, league)) {
      setClub('');
    }
    previousLeagueRef.current = league;
  }, [league]);

  const hasActiveFilter = Boolean(
    normalizedSearch || positions.length || seasons.length || league || nation || club ||
    preferredFoot || weakFoot || skillMoves || workRateAttack || workRateDefense ||
    heightMin || heightMax || weightMin || weightMax || reputation || trait ||
    statFilter || salaryMax < DEFAULT_SALARY ||
    ovr[0] > DEFAULT_OVR[0] || ovr[1] < DEFAULT_OVR[1]
  );

  useEffect(() => {
    if (!submittedParams) return;

    let ignore = false;
    setLoading(true);

    fetchPlayers(submittedParams)
      .then(res => {
        if (!ignore) {
          setResults(res.players);
          setMobileTab('results');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, [submittedParams]);

  function submitSearch() {
    const hasNonSearchFilter = Boolean(
      positions.length || seasons.length || league || nation || club ||
      preferredFoot || weakFoot || skillMoves || workRateAttack || workRateDefense ||
      heightMin || heightMax || weightMin || weightMax || reputation || trait ||
      statFilter || salaryMax < DEFAULT_SALARY ||
      ovr[0] > DEFAULT_OVR[0] || ovr[1] < DEFAULT_OVR[1]
    );

    if (search.trim() && normalizedSearch.length < 2) {
      setSubmittedParams(null);
      setResults([]);
      setMobileTab('results');
      return;
    }

    if (!normalizedSearch && !hasNonSearchFilter) {
      if (posGroups?.length) {
        setSubmittedParams({ posGroups, sort: 'ovr_desc', pageSize });
      } else {
        setSubmittedParams(null);
      }
      setResults([]);
      setMobileTab('results');
      return;
    }

    setSubmittedParams({
      search: normalizedSearch || undefined,
      posGroups: positions.length ? positions : undefined,
      seasons, ovr, salaryMax,
      league, nation, club,
      preferredFoot, weakFoot, skillMoves, workRateAttack, workRateDefense,
      heightMin, heightMax, weightMin, weightMax, reputation,
      statFilter, statMin, statMax,
      traits: trait ? [trait] : [],
      sort: 'ovr_desc',
      pageSize,
    });
  }

  function resetFilters() {
    setSearch('');
    setPositions([]);
    setSeasons([]);
    setOvr(DEFAULT_OVR);
    setSalaryMax(DEFAULT_SALARY);
    setLeague('');
    setNation('');
    setClub('');
    setPreferredFoot('');
    setWeakFoot('');
    setSkillMoves('');
    setWorkRateAttack('');
    setWorkRateDefense('');
    setHeightMin('');
    setHeightMax('');
    setWeightMin('');
    setWeightMax('');
    setReputation('');
    setStatFilter('');
    setStatMin('');
    setStatMax('');
    setTrait('');
    if (posGroups?.length) {
      setSubmittedParams({ posGroups, sort: 'ovr_desc', pageSize });
    } else {
      setSubmittedParams(null);
    }
    setResults([]);
  }

  function getLevel(playerId) {
    return normalizeUpgradeLevel(levelById[playerId] ?? defaultLevel);
  }

  function choosePlayer(player) {
    onAdd({
      ...player,
      upgradeLevel: getLevel(getPlayerCardKey(player)),
    });
  }

  const seasonOptions = useMemo(() => allSeasons, [allSeasons]);
  const seasonFilter = seasonOptions.length > 0 && (
    <div className="fco-picker-seasons">
      {seasonOptions.map(s => {
        const sid = String(s.seasonId);
        const isSelected = seasons.includes(sid);
        const seasonSprite = getSeasonSprite(sid, getAssetUrl) || resolveSeasonSprite(s.seasonSprite, getAssetUrl);
        const seasonMeta = s.seasonImg || seasonSprite ? null : (SEASONS_META[sid] || SEASONS_META[sid.toUpperCase()] || SEASONS_META.NG);
        return (
          <button
            key={s.seasonId}
            type="button"
            className={`fco-season-opt${isSelected ? ' on' : ''}`}
            title={s.seasonName}
            onClick={() => setSeasons(prev => prev.includes(sid) ? prev.filter(x => x !== sid) : [...prev, sid])}
          >
            {seasonSprite ? (
              <span
                className="fco-season-sprite fco-season-opt-sprite"
                aria-hidden="true"
                style={{
                  ...(seasonSprite.spriteUrl ? { '--season-sprite-url': `url(${seasonSprite.spriteUrl})` } : {}),
                  '--season-sprite-position': seasonSprite.backgroundPosition,
                  '--season-sprite-size': seasonSprite.backgroundSize || 'auto',
                  '--season-sprite-width': `${seasonSprite.width || 30}px`,
                  '--season-sprite-height': `${seasonSprite.height || 24}px`,
                }}
              />
            ) : s.seasonImg ? (
              <img src={s.seasonImg} alt="" className="fco-season-opt-img" onError={e => { e.currentTarget.style.display = 'none'; }} />
            ) : (
              <div className="fco-season-opt-badge" style={{ background: seasonMeta?.bg, color: seasonMeta?.fg, borderColor: seasonMeta?.ring }}>
                <span>{seasonMeta?.name || sid}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="fco-modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fco-modal picker-wide">
        <div className="fco-modal-head">
          <div>
            <div className="fco-modal-title">{title}</div>
            {!hasActiveFilter && (
              <div className="fco-modal-subtitle">Top OVR cao nhất theo vị trí</div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-faint)', cursor: 'pointer' }}>
            <I.X size={18} />
          </button>
        </div>

        <div className="fco-picker-mobile-tabs">
          <button
            type="button"
            className={`fco-picker-tab${mobileTab === 'filters' ? ' on' : ''}`}
            onClick={() => setMobileTab('filters')}
          >
            <I.Sliders size={14} />
            Bộ lọc
            {hasActiveFilter && <span className="fco-picker-tab-dot" />}
          </button>
          <button
            type="button"
            className={`fco-picker-tab${mobileTab === 'results' ? ' on' : ''}`}
            onClick={() => setMobileTab('results')}
          >
            <I.List size={14} />
            Kết quả
            {submittedParams && <span className="fco-picker-tab-count">{loading ? <I.Spinner size={11} className="fco-spin" /> : results.length}</span>}
          </button>
        </div>

        <div className={`fco-picker-body fco-picker-body--${mobileTab}`}>
          <div className="fco-picker-filters">
            <PlayerSearchForm
              search={search} setSearch={setSearch}
              positions={positions} setPositions={setPositions}
              ovr={ovr} setOvr={setOvr}
              salaryMax={salaryMax} setSalaryMax={setSalaryMax}
              league={league} setLeague={setLeague} leagueOptions={allLeagues}
              nation={nation} setNation={setNation} nationOptions={allNations}
              club={club} setClub={setClub} clubOptions={clubOptions}
              preferredFoot={preferredFoot} setPreferredFoot={setPreferredFoot}
              weakFoot={weakFoot} setWeakFoot={setWeakFoot}
              skillMoves={skillMoves} setSkillMoves={setSkillMoves}
              workRateAttack={workRateAttack} setWorkRateAttack={setWorkRateAttack}
              workRateDefense={workRateDefense} setWorkRateDefense={setWorkRateDefense}
              heightMin={heightMin} setHeightMin={setHeightMin}
              heightMax={heightMax} setHeightMax={setHeightMax}
              weightMin={weightMin} setWeightMin={setWeightMin}
              weightMax={weightMax} setWeightMax={setWeightMax}
              reputation={reputation} setReputation={setReputation}
              statFilter={statFilter} setStatFilter={setStatFilter}
              statMin={statMin} setStatMin={setStatMin}
              statMax={statMax} setStatMax={setStatMax}
              trait={trait} setTrait={setTrait}
              traitOptions={allTraits}
              seasonSlot={seasonFilter}
              defaultExpanded
              lockExpanded
              onReset={resetFilters}
              onSearch={submitSearch}
            />
          </div>

          <div className="fco-modal-list">
            {loading && <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-faint)' }}><I.Spinner size={20} className="fco-spin" /></div>}
            {!loading && results.map(p => {
              const cardKey = getPlayerCardKey(p);
              const disabled = existing.includes(cardKey) || existing.includes(p.id) || existingPlayers.some(player => isSamePlayerCard(p, player));
              const selectedLevel = getLevel(cardKey);

              return (
                <PlayerPickerItem
                  key={cardKey || p.id}
                  player={p}
                  disabled={disabled}
                  allowLevelSelect={allowLevelSelect}
                  level={selectedLevel}
                  onLevelChange={lv => setLevelById(prev => ({ ...prev, [cardKey]: lv }))}
                  onChoose={choosePlayer}
                />
              );
            })}
            {!loading && !submittedParams && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Nhập ít nhất 2 ký tự hoặc chọn filter rồi nhấn Tìm</div>
            )}
            {!loading && submittedParams && results.length === 0 && (
              <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>Không tìm thấy cầu thủ</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
