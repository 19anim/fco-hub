const STAT_OPTIONS = [
  { value: '', label: '▾ Chỉ số' },
  { value: 'pace', label: 'Tốc độ' },
  { value: 'shooting', label: 'Dứt điểm' },
  { value: 'passing', label: 'Chuyền' },
  { value: 'dribbling', label: 'Rê bóng' },
  { value: 'defending', label: 'Phòng thủ' },
  { value: 'physical', label: 'Thể lực' },
];

export default function StatRangeFilter({ statFilter, statMin, statMax, setStatFilter, setStatMin, setStatMax }) {
  return (
    <div className="fa-stat-range">
      <select
        className="fa-select"
        value={statFilter}
        onChange={e => { setStatFilter(e.target.value); setStatMin(''); setStatMax(''); }}
      >
        {STAT_OPTIONS.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <div className="fa-range-inputs">
        <input
          type="number" className="fa-spin" placeholder="Min" min={0} max={99}
          value={statMin} disabled={!statFilter}
          onChange={e => setStatMin(e.target.value)}
        />
        <span className="fa-range-sep">–</span>
        <input
          type="number" className="fa-spin" placeholder="Max" min={0} max={99}
          value={statMax} disabled={!statFilter}
          onChange={e => setStatMax(e.target.value)}
        />
      </div>
    </div>
  );
}
