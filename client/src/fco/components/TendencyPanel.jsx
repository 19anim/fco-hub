import { getDefaultTendency } from '../tacticInstructions.js';

const LEVELS = [1, 2, 3];

function TendencyGroup({ label, type, value, colorClass, onChange }) {
  return (
    <div className="fco-tendency-group">
      <div className="fco-tendency-group-label">{label}</div>
      <div className="fco-tendency-house-row">
        {LEVELS.map((level) => {
          const active = value === level;
          return (
            <button
              key={level}
              type="button"
              className={`fco-tendency-house ${colorClass}${active ? ' active' : ''}`}
              onClick={() => onChange(type, level)}
              aria-pressed={active}
              aria-label={`${label} ${level}`}
            >
              <span className="fco-tendency-house-shape">{level}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function TendencyPanel({ tendency, onChange }) {
  const t = tendency || getDefaultTendency();

  return (
    <div className="fco-tendency-panel">
      <TendencyGroup label="Công" type="attack" value={t.attack ?? 2} colorClass="fco-tendency-house--red" onChange={onChange} />
      <TendencyGroup label="Thủ" type="defense" value={t.defense ?? 2} colorClass="fco-tendency-house--blue" onChange={onChange} />
    </div>
  );
}
