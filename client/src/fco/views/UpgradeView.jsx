import { useState, useMemo, useRef } from 'react';
import PlayerPicker from '../components/PlayerPicker';
import LevelBadge from '../components/LevelBadge.jsx';
import { fetchPlayers } from '../api.js';
import {
  MAX_FODDERS,
  MAX_GAUGE,
  QUICK_ADD_GAUGE_TARGETS,
  UPGRADE_MASCOT_IMAGES,
} from '../upgradeConfig.js';
import {
  calculateUpgradeGauge,
  getDisplayedOvrForPlayer,
  normalizeUpgradeLevel,
  pickQuickAddFodders,
  rollUpgrade,
  withUpgradeLevel,
} from '../upgradeHelpers.js';
import { Button, PlayerAvatar, SeasonChip, OvrBox } from '../ui.jsx';
import { cleanName } from '../helpers.js';
import * as I from '../Icons.jsx';

export default function UpgradeView() {
  const [mainPlayer, setMainPlayer] = useState(null);
  const [level, setLevel] = useState(0);
  const [fuel, setFuel] = useState([]);
  const [pickerMode, setPickerOpen] = useState(null);
  const [isSafeMode, setSafeMode] = useState(true);
  const [animStatus, setAnimStatus] = useState('idle');
  const [quickAdding, setQuickAdding] = useState(null);
  const cancelRef = useRef(null);

  const targetOvr = useMemo(() => {
    if (!mainPlayer) return 0;
    return getDisplayedOvrForPlayer({ ...mainPlayer, upgradeLevel: level });
  }, [mainPlayer, level]);

  const upgradeGauge = useMemo(() => {
    if (!mainPlayer) {
      return calculateUpgradeGauge({ targetOvr: 0, currentLevel: 0, fodderOvrs: [] });
    }

    return calculateUpgradeGauge({
      targetOvr,
      currentLevel: level,
      fodderOvrs: fuel.map(player => getDisplayedOvrForPlayer(player)),
    });
  }, [mainPlayer, targetOvr, level, fuel]);

  const mascotSrc = upgradeGauge.totalGauge >= MAX_GAUGE
    ? UPGRADE_MASCOT_IMAGES.happy
    : UPGRADE_MASCOT_IMAGES.sad;

  const nextLevel = level >= 13 ? 13 : level + 1;

  function handleAddPlayer(player) {
    const selected = withUpgradeLevel(player, player.upgradeLevel);

    if (pickerMode === 'main') {
      setMainPlayer(selected);
      setLevel(normalizeUpgradeLevel(selected.upgradeLevel));
      setFuel([]);
    } else if (pickerMode === 'fuel') {
      setFuel(prev => {
        if (prev.length >= MAX_FODDERS) return prev;
        return [...prev, selected];
      });
    }

    setPickerOpen(null);
  }

  async function quickAddToGauge(targetGauge) {
    if (!mainPlayer || animStatus !== 'idle') return;

    setQuickAdding(targetGauge);
    try {
      const res = await fetchPlayers({
        sort: 'ovr_asc',
        pageSize: 100,
        ovr: [Math.max(50, Math.floor(targetOvr - 30)), Math.ceil(targetOvr + 30)],
      });
      const picked = pickQuickAddFodders({
        candidates: res.players,
        existingFodders: fuel,
        mainPlayer,
        targetOvr,
        currentLevel: level,
        targetGauge,
      });
      setFuel(picked);
    } finally {
      setQuickAdding(null);
    }
  }

  function doUpgrade() {
    if (animStatus === 'running' || !mainPlayer || level >= 13 || !fuel.length) return;
    setAnimStatus('running');

    clearTimeout(cancelRef.current);
    cancelRef.current = setTimeout(() => {
      const success = rollUpgrade(upgradeGauge.successRate);
      if (success) {
        setAnimStatus('success');
        setLevel(prev => Math.min(13, Math.max(1, prev) + 1));
      } else {
        setAnimStatus('fail');
        if (!isSafeMode) setLevel(prev => Math.max(1, prev - 1));
      }
      setFuel([]);

      cancelRef.current = setTimeout(() => setAnimStatus('idle'), 2000);
    }, 1500);
  }

  return (
    <div className="fco-up-view fco-up-machine-view">
      <div className="fco-up-machine-head">
        <div>
          <h2 className="fco-h2">Giả lập nâng cấp</h2>
          <p className="fco-sub">Máy ép thẻ mô phỏng thanh nguyên liệu 5 vạch và tỷ lệ nâng cấp theo cấp thẻ FCO.</p>
        </div>
        {mainPlayer && (
          <Button variant="ghost" size="sm" icon={I.Refresh} onClick={() => { setMainPlayer(null); setLevel(0); setFuel([]); }}>
            Đổi cầu thủ
          </Button>
        )}
      </div>

      <div className="fco-up-machine-stage">
        <div className="fco-up-machine-orbit" />

        <div className="fco-up-machine-core">
          <div className="fco-up-main">
            {mainPlayer && (
              <div className="fco-up-mascot-card floating">
                <img src={mascotSrc} alt={upgradeGauge.totalGauge >= MAX_GAUGE ? 'Thần Tài vui khi đủ 5 vạch' : 'Thần Tài buồn khi chưa đủ 5 vạch'} />
                <span>Đủ 5 vạch, Thần Tài vui</span>
              </div>
            )}
            {mainPlayer ? (
              <div className={`fco-up-card fco-up-${animStatus}`} onClick={() => animStatus === 'idle' && setPickerOpen('main')}>
                <div className="fco-up-card-badge-row">
                  <LevelBadge level={level} scale={0.42} />
                </div>
                <PlayerAvatar player={mainPlayer} size={104} />
                <div style={{ marginTop: 12, fontWeight: 700, fontSize: 16 }}>{cleanName(mainPlayer.name)}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <SeasonChip code={mainPlayer.season} img={mainPlayer.seasonImg} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <OvrBox value={targetOvr} size="md" />
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
        </div>

        {mainPlayer && (
          <div className="fco-up-machine-console">
            <div className="fco-up-gauge-panel">
              <div className="fco-up-level-row">
                <span>Nâng cấp: <b>+{level} → +{nextLevel}</b></span>
                <span>Phôi: <b>{fuel.length}/{MAX_FODDERS}</b></span>
              </div>

              <div className="fco-up-progress-wrap fco-up-progress-machine">
                <div className="fco-up-progress-bar" style={{ width: `${Math.min(100, upgradeGauge.gaugeRatio * 100)}%` }} />
                <div className="fco-up-progress-ticks">
                  {[20, 40, 60, 80].map(t => (
                    <div key={t} className="fco-up-tick" style={{ left: `${t}%` }} />
                  ))}
                </div>
              </div>


              <div className="fco-up-result-strip">
                <div className="fco-up-summary-grid compact">
                  <div>
                    <span>Tổng vạch</span>
                    <b>{upgradeGauge.totalGauge.toFixed(4)} / {MAX_GAUGE}</b>
                  </div>
                  <div>
                    <span>Tỷ lệ full vạch</span>
                    <b>{(upgradeGauge.fullGaugeSuccessRate * 100).toFixed(2)}%</b>
                  </div>
                  <div className="wide hot">
                    <span>Tỷ lệ thành công cuối</span>
                    <b>{(upgradeGauge.successRate * 100).toFixed(2)}%</b>
                  </div>
                </div>
              </div>
            </div>

            <div className="fco-up-quick-panel">
              <div className="fco-up-quick-title">Thêm nhanh đến mốc vạch</div>
              <div className="fco-up-quick-buttons">
                {QUICK_ADD_GAUGE_TARGETS.map(target => (
                  <button
                    key={target}
                    type="button"
                    className="fco-up-quick-btn"
                    disabled={quickAdding !== null || animStatus !== 'idle'}
                    onClick={() => quickAddToGauge(target)}
                  >
                    {quickAdding === target ? <I.Spinner size={13} className="fco-spin" /> : `${target} vạch`}
                  </button>
                ))}
              </div>
            </div>

            <div className="fco-up-fuels machine">
              {Array.from({ length: MAX_FODDERS }).map((_, i) => (
                <div key={i} className="fco-up-fuel-slot" onClick={() => animStatus === 'idle' && setPickerOpen('fuel')}>
                  {fuel[i] ? (
                    <div className="fco-up-fuel-filled">
                      <LevelBadge level={fuel[i].upgradeLevel || 1} scale={0.26} className="mini" />
                      <PlayerAvatar player={fuel[i]} size={42} />
                      <div className="fco-up-fuel-gauge">{(upgradeGauge.fodderGauges[i] || 0).toFixed(4)}</div>
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

            {fuel.length > 0 && (
              <div className="fco-up-fuel-note">
                Số dưới mỗi phôi là số vạch đóng góp, tính bằng OVR hiện tại của phôi so với OVR hiện tại của cầu thủ đang nâng.
              </div>
            )}

            <div className="fco-up-action-row">
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
                <div className={`fco-checkbox ${isSafeMode ? 'on' : ''}`}>
                  {isSafeMode && <I.Check size={12} />}
                </div>
                <input type="checkbox" style={{ display: 'none' }} checked={isSafeMode} onChange={e => setSafeMode(e.target.checked)} />
                <span style={{ fontSize: 13.5, fontWeight: 550 }}>Chế độ an toàn</span>
              </label>
              <Button variant="primary" size="lg" disabled={animStatus !== 'idle' || !fuel.length || level >= 13} onClick={doUpgrade} style={{ minWidth: 140 }}>
                {level >= 13 ? 'Đã đạt +13' : 'Nâng cấp'}
              </Button>
            </div>

            {animStatus === 'success' && (
              <div className="fco-up-result success">Thành công! Cầu thủ đã lên cấp mới.</div>
            )}
            {animStatus === 'fail' && (
              <div className="fco-up-result fail">Thất bại. Cấp thẻ được xử lý theo chế độ đang chọn.</div>
            )}
          </div>
        )}
      </div>

      <div className="fco-up-disclaimer">
        Đây là công cụ giả lập phục vụ tham khảo, không phải công cụ chính thức của Garena/FCO và không khẳng định là công thức nội bộ chính thức của game.
      </div>

      {pickerMode && (
        <PlayerPicker
          title={pickerMode === 'main' ? 'Chọn cầu thủ nâng cấp' : 'Chọn thẻ phôi'}
          showTopPlayers
          allowLevelSelect
          defaultLevel={pickerMode === 'main' ? Math.max(1, level || 1) : 1}
          existing={[]}
          onAdd={handleAddPlayer}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </div>
  );
}
