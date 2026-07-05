import { useState } from 'react';
import { BACKEND_SEARCH_MAX_LENGTH, normalizeBackendSearch } from '../../utils/backendSearch.js';
import * as I from '../Icons.jsx';
import PositionGrid from './filter/PositionGrid.jsx';
import StatRangeFilter from './filter/StatRangeFilter.jsx';
import FootWorkFilter from './filter/FootWorkFilter.jsx';
import BodyFilter from './filter/BodyFilter.jsx';

const FALLBACK_LEAGUES = [
  'England Premier League',
  'England Championship',
  'Spain Primera Division',
  'France Ligue 1',
  'France Ligue 2',
  'Germany Bundesliga',
  'Germany 2. Bundesliga',
  'Italy Serie A',
  'Italy Serie B',
  'Netherlands Eredivisie',
  'Portugal Primeira Liga',
  'United States Major League Soccer',
  'Korea Republic K League 1',
  'China PR Super League',
  'National Team',
  'Rest of World',
];

function formatLeagueLabel(league) {
  const labels = {
    'Spain Primera Division': 'LaLiga',
    'United States Major League Soccer': 'MLS',
    'Korea Republic K League 1': 'Korea K League 1',
    'China PR Super League': 'China Super League',
  };
  return labels[league] || league;
}

export default function PlayerSearchForm({
  search = '', setSearch,
  positions = [], setPositions,
  ovr = [50, 150], setOvr,
  salaryMax = 999999, setSalaryMax,
  league = '', setLeague,
  leagueOptions = [],
  nation = '', setNation,
  nationOptions = [],
  club = '', setClub,
  clubOptions = [],
  preferredFoot = '', setPreferredFoot,
  weakFoot = '', setWeakFoot,
  skillMoves = '', setSkillMoves,
  workRateAttack = '', setWorkRateAttack,
  workRateDefense = '', setWorkRateDefense,
  heightMin = '', setHeightMin,
  heightMax = '', setHeightMax,
  weightMin = '', setWeightMin,
  weightMax = '', setWeightMax,
  reputation = '', setReputation,
  statFilter = '', setStatFilter,
  statMin = '', setStatMin,
  statMax = '', setStatMax,
  trait = '', setTrait,
  traitOptions = [],
  onReset,
  onSearch,
}) {
  const [expanded, setExpanded] = useState(false);
  const leagues = leagueOptions.length ? leagueOptions : FALLBACK_LEAGUES;

  return (
    <div className="fa-form-panel">
      <div className="fa-search-row">
        <div className="fa-search-input-wrap">
          <input
            type="text"
            placeholder="Messi, Ronaldo"
            maxLength={BACKEND_SEARCH_MAX_LENGTH}
            value={search}
            className="fa-search-input"
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
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
        <button type="button" className="fa-btn fa-btn-primary" onClick={onSearch}>
          Tìm
        </button>
        <button type="button" className="fa-btn fa-btn-ghost" onClick={onReset} title="Đặt lại">
          <I.Refresh size={14} />
        </button>
        <button
          type="button"
          className={`fa-btn fa-btn-ghost fa-expand-btn${expanded ? ' on' : ''}`}
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? 'LESS' : 'MORE'}
          {expanded ? <I.ChevronUp size={12} /> : <I.ChevronDown size={12} />}
        </button>
      </div>

      <PositionGrid positions={positions} setPositions={setPositions} />

      {expanded && (
        <div className="fa-expanded-filters">
          <div className="fa-filter-row">
            <div className="fa-filter-group">
              <label className="fa-filter-label">Giải đấu</label>
              <select className="fa-select" value={league} onChange={e => setLeague(e.target.value)}>
                <option value="">▾ Giải đấu</option>
                {leagues.map(l => (
                  <option key={l} value={l}>{formatLeagueLabel(l)}</option>
                ))}
              </select>
            </div>
            <div className="fa-filter-group">
              <label className="fa-filter-label">Quốc gia</label>
              <select
                className="fa-select"
                value={nation}
                onChange={e => setNation(e.target.value)}
              >
                <option value="">▾ Quốc gia</option>
                {nationOptions.map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
            <div className="fa-filter-group">
              <label className="fa-filter-label">Câu lạc bộ</label>
              <select
                className="fa-select"
                value={club}
                onChange={e => setClub(e.target.value)}
                disabled={!league}
              >
                <option value="">{league ? '▾ Chọn CLB' : 'Chọn giải đấu trước'}</option>
                {clubOptions.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="fa-filter-group">
              <label className="fa-filter-label">Chỉ số ẩn</label>
              <select
                className="fa-select"
                value={trait}
                onChange={e => setTrait(e.target.value)}
              >
                <option value="">▾ Chỉ số ẩn</option>
                {traitOptions.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="fa-filter-row">
            <div className="fa-filter-group fa-filter-group--wide">
              <label className="fa-filter-label">Chỉ số</label>
              <StatRangeFilter
                statFilter={statFilter} statMin={statMin} statMax={statMax}
                setStatFilter={setStatFilter} setStatMin={setStatMin} setStatMax={setStatMax}
              />
            </div>
          </div>

          <FootWorkFilter
            preferredFoot={preferredFoot} weakFoot={weakFoot} skillMoves={skillMoves}
            workRateAttack={workRateAttack} workRateDefense={workRateDefense}
            setPreferredFoot={setPreferredFoot} setWeakFoot={setWeakFoot}
            setSkillMoves={setSkillMoves} setWorkRateAttack={setWorkRateAttack}
            setWorkRateDefense={setWorkRateDefense}
          />

          <BodyFilter
            heightMin={heightMin} heightMax={heightMax}
            weightMin={weightMin} weightMax={weightMax}
            ovrMin={ovr[0]} ovrMax={ovr[1]} setOvr={setOvr}
            salaryMax={salaryMax} setSalaryMax={setSalaryMax}
            reputation={reputation} setReputation={setReputation}
            setHeightMin={setHeightMin} setHeightMax={setHeightMax}
            setWeightMin={setWeightMin} setWeightMax={setWeightMax}
          />
        </div>
      )}
    </div>
  );
}
