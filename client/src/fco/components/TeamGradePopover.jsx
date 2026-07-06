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

export default function TeamGradePopover({ value, onChange, minimal = false }) {
  const [open, setOpen] = useState(false);
  const [gridStyle, setGridStyle] = useState({});
  const triggerRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const margin = 8;
    const gridW = 240;
    const maxLeft = Math.max(margin, window.innerWidth - gridW - margin);
    const left = Math.min(Math.max(r.right - gridW, margin), maxLeft);
    setGridStyle({
      position: 'fixed',
      top: r.bottom + 6,
      left,
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
      className={`fco-team-grade-trigger${minimal ? ' is-minimal' : ''}`}
      onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
    >
      <LevelBadge level={safeValue} scale={0.3} />
      {!minimal && <I.ChevronDown size={10} className="fco-team-grade-caret" />}
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
