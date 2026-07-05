import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import LevelBadge from './LevelBadge.jsx';
import { normalizeUpgradeLevel } from '../upgradeHelpers.js';
import * as I from '../Icons.jsx';

const LEVELS = Array.from({ length: 14 }, (_, index) => index);

function normalizeTeamGrade(level) {
  const numericLevel = Math.trunc(Number(level));
  return numericLevel === 0 ? 0 : normalizeUpgradeLevel(level);
}

export default function TeamGradePopover({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [gridStyle, setGridStyle] = useState({});
  const triggerRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const gridW = 240;
    const left = Math.min(r.left, window.innerWidth - gridW - 8);
    setGridStyle({
      position: 'fixed',
      top: r.bottom + 6,
      left: Math.max(8, left),
      zIndex: 9999,
      width: gridW,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        gridRef.current && !gridRef.current.contains(e.target)
      ) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const safeValue = normalizeTeamGrade(value);

  return (
    <div
      ref={triggerRef}
      className="fco-team-grade-trigger"
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      <LevelBadge level={safeValue} scale={0.3} />
      <I.ChevronDown size={10} className="fco-team-grade-caret" />
      {open && createPortal(
        <div
          ref={gridRef}
          className="fco-team-grade-popover"
          style={gridStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="fco-team-grade-popover-head">
            <span>Grade</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng">
              <I.X size={14} />
            </button>
          </div>
          <div className="fco-team-grade-grid">
            {LEVELS.map((lv) => (
              <button
                key={lv}
                type="button"
                className={`fco-team-grade-item${lv === safeValue ? ' active' : ''}`}
                onClick={() => { onChange(lv); setOpen(false); }}
              >
                <LevelBadge level={lv} scale={0.28} />
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
