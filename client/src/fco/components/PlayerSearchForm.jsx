import { useState } from 'react';
import * as I from '../Icons.jsx';
import PositionGrid from './filter/PositionGrid.jsx';
import StatRangeFilter from './filter/StatRangeFilter.jsx';
import FootWorkFilter from './filter/FootWorkFilter.jsx';
import BodyFilter from './filter/BodyFilter.jsx';

const LEAGUE_OPTIONS = [
  { value: '', label: '▾ Giải đấu' },
  { value: 'England Premier League', label: 'England Premier League' },
  { value: 'England Championship', label: '+ England Championship' },
  { value: 'France Ligue 1', label: 'France Ligue 1' },
  { value: 'France Ligue 2', label: '+ France Ligue 2' },
  { value: 'Germany Bundesliga', label: 'Germany Bundesliga' },
  { value: 'Germany 2. Bundesliga', label: '+ Germany 2. Bundesliga' },
  { value: 'Italy Serie A', label: 'Italy Serie A' },
  { value: 'Italy Serie B', label: '+ Italy Serie B' },
  { value: 'Spain Primera Division', label: 'Spain Primera Division' },
  { value: 'Netherlands Eredivisie', label: 'Netherlands Eredivisie' },
  { value: 'Portugal Primeira Liga', label: 'Portugal Primeira Liga' },
  { value: 'United States Major League Soccer', label: 'MLS' },
  { value: 'Korea Republic K League 1', label: 'Korea K League 1' },
  { value: 'China PR Super League', label: 'China Super League' },
  { value: 'National Team', label: 'National Team' },
  { value: 'Rest of World', label: 'Rest of World' },
];

export default function PlayerSearchForm({
  search = '', setSearch,
  positions = [], setPositions,
  ovr = [50, 150], setOvr,
  salaryMax = 999999, setSalaryMax,
  league = '', setLeague,
  nation = '', setNation,
  clubSearch = '', setClubSearch,
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
  onReset,
  onSearch,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="fa-form-panel">
      <div className="fa-search-row">
        <div className="fa-search-input-wrap">
          <input
            type="search"
            placeholder="Messi, Ronaldo"
            maxLength="50"
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
                {LEAGUE_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="fa-filter-group">
              <label className="fa-filter-label">Quốc gia</label>
              <input
                type="text"
                className="fa-text-input"
                placeholder="england, spain..."
                value={nation}
                onChange={e => setNation(e.target.value)}
              />
            </div>
            <div className="fa-filter-group">
              <label className="fa-filter-label">Câu lạc bộ</label>
              <input
                type="text"
                className="fa-text-input"
                placeholder="manchester, real..."
                value={clubSearch}
                onChange={e => setClubSearch(e.target.value)}
              />
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
