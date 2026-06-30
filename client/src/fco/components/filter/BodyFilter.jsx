const REPUTATION_OPTIONS = [
  { value: '', label: '▾ all' },
  { value: 'Regular Player', label: 'Regular Player' },
  { value: 'Famous Player', label: 'Famous Player' },
  { value: 'Top Class', label: 'Top Class' },
  { value: 'World Class', label: 'World Class' },
  { value: 'Legendary', label: 'Legendary' },
];

export default function BodyFilter({
  heightMin, heightMax, setHeightMin, setHeightMax,
  weightMin, weightMax, setWeightMin, setWeightMax,
  ovrMin, ovrMax, setOvr,
  salaryMax, setSalaryMax,
  reputation, setReputation,
}) {
  return (
    <div className="fa-body-filter-grid">
      <div className="fa-filter-group">
        <label className="fa-filter-label">OVR</label>
        <div className="fa-range-inputs">
          <input type="number" className="fa-spin" placeholder="50" min={50} max={150}
            value={ovrMin === 50 ? '' : ovrMin}
            onChange={e => setOvr([Number(e.target.value) || 50, ovrMax])} />
          <span className="fa-range-sep">–</span>
          <input type="number" className="fa-spin" placeholder="150" min={50} max={150}
            value={ovrMax === 150 ? '' : ovrMax}
            onChange={e => setOvr([ovrMin, Number(e.target.value) || 150])} />
        </div>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">Chiều cao (cm)</label>
        <div className="fa-range-inputs">
          <input type="number" className="fa-spin" placeholder="Min" min={140} max={210}
            value={heightMin} onChange={e => setHeightMin(e.target.value)} />
          <span className="fa-range-sep">–</span>
          <input type="number" className="fa-spin" placeholder="Max" min={140} max={210}
            value={heightMax} onChange={e => setHeightMax(e.target.value)} />
        </div>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">Cân nặng (kg)</label>
        <div className="fa-range-inputs">
          <input type="number" className="fa-spin" placeholder="Min" min={50} max={120}
            value={weightMin} onChange={e => setWeightMin(e.target.value)} />
          <span className="fa-range-sep">–</span>
          <input type="number" className="fa-spin" placeholder="Max" min={50} max={120}
            value={weightMax} onChange={e => setWeightMax(e.target.value)} />
        </div>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">Lương</label>
        <div className="fa-range-inputs">
          <input type="number" className="fa-spin" placeholder="Max" min={1} max={50}
            value={salaryMax === 999999 ? '' : salaryMax}
            onChange={e => setSalaryMax(Number(e.target.value) || 999999)} />
        </div>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">Danh tiếng</label>
        <select className="fa-select" value={reputation} onChange={e => setReputation(e.target.value)}>
          {REPUTATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
