const POSITION_GROUPS = {
  GK:  ['GK'],
  DEF: ['CB', 'LB', 'RB', 'LWB', 'RWB'],
  MID: ['CDM', 'CM', 'CAM', 'LM', 'RM'],
  FWD: ['ST', 'CF', 'LW', 'RW'],
};

export default function PositionGrid({ positions = [], setPositions }) {
  function toggle(pos) {
    setPositions(positions.includes(pos)
      ? positions.filter(p => p !== pos)
      : [...positions, pos]
    );
  }

  function toggleGroup(group) {
    const subs = POSITION_GROUPS[group];
    const allOn = subs.every(p => positions.includes(p));
    if (allOn) {
      setPositions(positions.filter(p => !subs.includes(p)));
    } else {
      setPositions([...new Set([...positions, ...subs])]);
    }
  }

  return (
    <div className="fa-pos-grid">
      {Object.entries(POSITION_GROUPS).map(([group, subs]) => (
        <div key={group} className="fa-pos-group">
          <button
            type="button"
            className={`fa-pos-group-label${subs.every(p => positions.includes(p)) ? ' on' : ''}`}
            onClick={() => toggleGroup(group)}
          >
            {group}
          </button>
          <div className="fa-pos-subs">
            {subs.map(pos => (
              <button
                key={pos}
                type="button"
                className={`fa-pos-btn${positions.includes(pos) ? ' on' : ''}`}
                onClick={() => toggle(pos)}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
