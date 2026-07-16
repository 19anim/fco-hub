import { useState } from 'react';
import { getInstructionGroup, getDefaultInstructions } from '../tacticInstructions.js';
import * as I from '../Icons.jsx';

export default function TacticInstructionsPanel({ pos, selections, onChange }) {
  const [expandedCode, setExpandedCode] = useState(null);
  const group = getInstructionGroup(pos);
  if (!group) return null;

  const defaults = getDefaultInstructions(pos);
  const sel = selections || defaults;

  return (
    <div className="fco-tactic-panel">
      {group.categories.map((category) => {
        const currentCode = sel[category.category_code] || defaults[category.category_code];
        const currentOption = category.options.find((o) => o.option_code === currentCode) || category.options[0];
        const isExpanded = expandedCode === category.category_code;

        return (
          <div key={category.category_code} className="fco-tactic-row">
            <button
              type="button"
              className="fco-tactic-row-head"
              onClick={() => setExpandedCode(isExpanded ? null : category.category_code)}
              aria-expanded={isExpanded}
            >
              <span className="fco-tactic-chip" style={{ background: currentOption?.color_hex }}>
                <span className="fco-tactic-chip-code">{category.category_code}</span>
                <span className="fco-tactic-chip-name">{category.category_name}</span>
              </span>
              <span className="fco-tactic-current">
                <span className="fco-tactic-current-code">{currentOption?.option_code}</span>
                <span className="fco-tactic-current-name">{currentOption?.name}</span>
              </span>
              {isExpanded ? <I.ChevronUp size={14} /> : <I.ChevronDown size={14} />}
            </button>

            {isExpanded && (
              <div className="fco-tactic-options">
                {category.options.map((option) => {
                  const active = option.option_code === currentCode;
                  return (
                    <button
                      key={option.option_code}
                      type="button"
                      className={`fco-tactic-option-btn${active ? ' active' : ''}`}
                      onClick={() => {
                        onChange(category.category_code, option.option_code);
                        setExpandedCode(null);
                      }}
                      aria-pressed={active}
                    >
                      <span className="fco-tactic-option-code" style={{ color: option.color_hex }}>{option.option_code}</span>
                      <span className="fco-tactic-option-body">
                        <span className="fco-tactic-option-name">{option.name}</span>
                        <span className="fco-tactic-option-desc">{option.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
