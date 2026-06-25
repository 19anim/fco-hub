const FOOT_OPTIONS = [
  { value: '', label: '▾ Chân thuận' },
  { value: 'right', label: 'Chân phải' },
  { value: 'left', label: 'Chân trái' },
];

const STAR_OPTIONS = [
  { value: '', label: '▾ All' },
  { value: '5', label: '★★★★★' },
  { value: '4', label: '★★★★+' },
  { value: '3', label: '★★★+' },
  { value: '2', label: '★★+' },
  { value: '1', label: '★+' },
];

const WR_OPTIONS = [
  { value: '', label: '▾ All' },
  { value: 'High', label: 'Cao' },
  { value: 'Medium', label: 'Trung bình' },
  { value: 'Low', label: 'Thấp' },
];

export default function FootWorkFilter({
  preferredFoot, weakFoot, skillMoves,
  workRateAttack, workRateDefense,
  setPreferredFoot, setWeakFoot, setSkillMoves,
  setWorkRateAttack, setWorkRateDefense,
}) {
  return (
    <div className="fa-foot-work-row">
      <div className="fa-filter-group">
        <label className="fa-filter-label">Chân thuận</label>
        <select className="fa-select" value={preferredFoot} onChange={e => setPreferredFoot(e.target.value)}>
          {FOOT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">Chân nghịch</label>
        <select className="fa-select" value={weakFoot} onChange={e => setWeakFoot(e.target.value)}>
          {STAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">Kỹ năng</label>
        <select className="fa-select" value={skillMoves} onChange={e => setSkillMoves(e.target.value)}>
          {STAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">WR Tấn công</label>
        <select className="fa-select" value={workRateAttack} onChange={e => setWorkRateAttack(e.target.value)}>
          {WR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      <div className="fa-filter-group">
        <label className="fa-filter-label">WR Phòng thủ</label>
        <select className="fa-select" value={workRateDefense} onChange={e => setWorkRateDefense(e.target.value)}>
          {WR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </div>
  );
}
