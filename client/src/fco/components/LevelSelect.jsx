import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import LevelBadge from './LevelBadge.jsx';
import * as I from '../Icons.jsx';

const LEVELS = Array.from({ length: 13 }, (_, index) => index + 1);

export default function LevelSelect({ value, onChange, scale = 0.30, badgeScale }) {
  const [open, setOpen] = useState(false);
  const [gridStyle, setGridStyle] = useState({});
  const triggerRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const r = triggerRef.current.getBoundingClientRect();
    const gridW = 212;
    const left = Math.min(r.right - gridW, window.innerWidth - gridW - 8);
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

  return (
    <div
      ref={triggerRef}
      className="fco-lvl-dropdown"
      onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
    >
      <LevelBadge level={value} scale={badgeScale ?? scale} />
      <I.ChevronDown size={10} className="fco-lvl-dropdown-caret" />
      {open && createPortal(
        <div
          ref={gridRef}
          className="fco-lvl-dropdown-grid"
          style={gridStyle}
          onClick={e => e.stopPropagation()}
        >
          {LEVELS.map(lv => (
            <button
              key={lv}
              className={`fco-lvl-dropdown-item${lv === value ? ' active' : ''}`}
              onClick={() => { onChange(lv); setOpen(false); }}
            >
              <LevelBadge level={lv} scale={0.28} />
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
