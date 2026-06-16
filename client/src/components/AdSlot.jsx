import { useState } from 'react';

export default function AdSlot({ type = 'leaderboard', className = '' }) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const sizes = {
    leaderboard: { width: '100%', height: '90px', label: '728x90' },
    skyscraper: { width: '160px', height: '600px', label: '160x600' },
    inline: { width: '100%', height: '120px', label: 'Ad' },
    banner: { width: '100%', height: '250px', label: '300x250' },
  };

  const size = sizes[type] || sizes.leaderboard;

  return (
    <div className={`${className}`}>
      <div
        className="bg-surface-1 border border-dashed border-hairline rounded-lg flex items-center justify-center relative group"
        style={{ width: size.width, height: size.height }}
      >
        <div className="text-center">
          <p className="text-xs text-ink-subtle uppercase tracking-wider">Advertisement</p>
          <p className="text-sm text-ink-muted mt-1">{size.label}</p>
        </div>

        {/* Close button */}
        <button
          onClick={() => setIsVisible(false)}
          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-surface-2 hover:bg-surface-3 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <span className="text-xs text-ink-muted">×</span>
        </button>
      </div>
    </div>
  );
}
