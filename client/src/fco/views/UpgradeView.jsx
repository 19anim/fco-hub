import { useState, useMemo, useRef } from 'react';
import PlayerPicker from '../components/PlayerPicker';
import { getOvrForLevel, calculateFuelValue, getSuccessProbability, rollUpgrade } from '../upgradeHelpers.js';
import { Button, PlayerAvatar, SeasonChip, OvrBox } from '../ui.jsx';
import { cleanName } from '../helpers.js';
import * as I from '../Icons.jsx';

export default function UpgradeView({ onSelect }) {
  const [mainPlayer, setMainPlayer] = useState(null);
  const [level, setLevel] = useState(0);
  const [fuel, setFuel] = useState([]); // Array of player objects
  const [pickerMode, setPickerOpen] = useState(null); // 'main' | 'fuel'
  const [isSafeMode, setSafeMode] = useState(true);
  const [animStatus, setAnimStatus] = useState('idle'); // 'idle' | 'running' | 'success' | 'fail'
  const cancelRef = useRef(null);

  const totalPercent = useMemo(() => {
    if (!mainPlayer) return 0;
    return fuel.reduce((sum, f) => sum + calculateFuelValue(mainPlayer, f), 0);
  }, [mainPlayer, fuel]);

  const prob = useMemo(() => getSuccessProbability(totalPercent), [totalPercent]);

  function handleAddPlayer(p) {
    if (pickerMode === 'main') {
      setMainPlayer(p);
      setLevel(0);
      setFuel([]);
    } else if (pickerMode === 'fuel') {
      if (fuel.length < 5) setFuel([...fuel, p]);
    }
    setPickerOpen(null);
  }

  function doUpgrade() {
    if (animStatus === 'running' || !mainPlayer) return;
    setAnimStatus('running');

    clearTimeout(cancelRef.current);
    cancelRef.current = setTimeout(() => {
      const success = rollUpgrade(prob);
      if (success) {
        setAnimStatus('success');
        setLevel(prev => Math.min(13, prev + 1));
      } else {
        setAnimStatus('fail');
        if (!isSafeMode) setLevel(prev => Math.max(0, prev - 1));
      }
      setFuel([]); // Consume fuel

      cancelRef.current = setTimeout(() => setAnimStatus('idle'), 2000);
    }, 1500);
  }

  return (
    <div className="fco-up-view">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 className="fco-h2">Giả lập nâng cấp</h2>
          <p className="fco-sub">Chọn cầu thủ và thẻ nhiên liệu để nâng cấp OVR (Max +13).</p>
        </div>
        {mainPlayer && (
          <Button variant="ghost" size="sm" icon={I.Refresh} onClick={() => { setMainPlayer(null); setLevel(0); setFuel([]); }}>
            Đổi cầu thủ
          </Button>
        )}
      </div>

      <div className="fco-up-stage">
        {/* Main Card Slot */}
        <div className="fco-up-main">
          {mainPlayer ? (
            <div className={`fco-up-card fco-up-${animStatus}`} onClick={() => animStatus === 'idle' && setPickerOpen('main')}>
              <PlayerAvatar player={mainPlayer} size={100} />
              <div style={{ marginTop: 12, fontWeight: 700, fontSize: 16 }}>{cleanName(mainPlayer.name)}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                <SeasonChip code={mainPlayer.season} img={mainPlayer.seasonImg} />
                <span style={{ fontWeight: 800, color: 'var(--accent)', fontSize: 20 }}>+{level}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <OvrBox value={getOvrForLevel(mainPlayer.ovr, level)} size="md" />
              </div>
            </div>
          ) : (
            <div className="fco-up-card empty" onClick={() => setPickerOpen('main')}>
              <div style={{ background: 'var(--surface-3)', width: 60, height: 60, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                 <I.Plus size={32} style={{ margin: 'auto' }} />
              </div>
              <span style={{ fontWeight: 600 }}>Chọn cầu thủ</span>
            </div>
          )}
          <div className="fco-up-led" />
        </div>

        {/* Progress & Fuels */}
        {mainPlayer && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%' }}>
              <div className="fco-up-progress-wrap">
                <div className="fco-up-progress-bar" style={{ width: `${Math.min(100, totalPercent)}%` }} />
                <div className="fco-up-progress-ticks">
                  {[20, 40, 60, 80].map(t => (
                    <div key={t} className="fco-up-tick" style={{ left: `${t}%` }} />
                  ))}
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>
                Tỉ lệ thành công: <span style={{ color: totalPercent >= 100 ? 'var(--accent)' : 'var(--text)', fontSize: 15 }}>{(prob * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="fco-up-fuels">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="fco-up-fuel-slot" onClick={() => animStatus === 'idle' && setPickerOpen('fuel')}>
                  {fuel[i] ? (
                    <div className="fco-up-fuel-filled">
                       <PlayerAvatar player={fuel[i]} size={42} />
                       <button
                        style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: '50%', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => { e.stopPropagation(); setFuel(prev => prev.filter((_, idx) => idx !== i)); }}>
                        <I.X size={10} />
                       </button>
                    </div>
                  ) : <I.Plus size={18} style={{ opacity: 0.2 }} />}
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginTop: 10 }}>
               <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                  <div className={`fco-checkbox ${isSafeMode ? 'on' : ''}`}>
                    {isSafeMode && <I.Check size={12} />}
                  </div>
                  <input type="checkbox" style={{ display: 'none' }} checked={isSafeMode} onChange={e => setSafeMode(e.target.checked)} />
                  <span style={{ fontSize: 13.5, fontWeight: 550 }}>Chế độ an toàn (không rớt cấp)</span>
               </label>
               <Button variant="primary" size="lg" disabled={animStatus !== 'idle' || !fuel.length} onClick={doUpgrade} style={{ minWidth: 140 }}>
                  Nâng cấp
               </Button>
            </div>
          </div>
        )}
      </div>

      {pickerMode && (
        <PlayerPicker
          title={pickerMode === 'main' ? "Chọn cầu thủ nâng cấp" : "Chọn thẻ nhiên liệu"}
          onAdd={handleAddPlayer}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </div>
  );
}
