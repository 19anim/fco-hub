import { useState, useMemo, useRef } from 'react';
import PlayerPicker from '../components/PlayerPicker';
import LevelBadge from '../components/LevelBadge.jsx';
import {
  MAX_FODDERS,
  MAX_GAUGE,
  MAX_UPGRADE_LEVEL,
  MIN_UPGRADE_LEVEL,
  UPGRADE_EFFECT_OPTIONS,
  UPGRADE_MASCOT_IMAGES,
} from '../upgradeConfig.js';
import {
  calculateEffectGaugeBonus,
  calculateUpgradeGauge,
  getDisplayedOvrForPlayer,
  normalizeMaterialOvr,
  normalizeUpgradeLevel,
  rollUpgrade,
  withUpgradeLevel,
} from '../upgradeHelpers.js';
import { Button, PlayerAvatar, SeasonChip, OvrBox } from '../ui.jsx';
import { cleanName } from '../helpers.js';
import * as I from '../Icons.jsx';

const BURST_BEAMS = [-82, -48, -18, 0, 31, 58, 86];
const BURST_PARTICLES = [
  { x: -92, y: -120, delay: 0.02, duration: 0.9, size: 3 },
  { x: -58, y: -154, delay: 0.12, duration: 1.1, size: 2 },
  { x: -24, y: -132, delay: 0.2, duration: 0.95, size: 4 },
  { x: 16, y: -168, delay: 0.04, duration: 1.2, size: 2 },
  { x: 46, y: -124, delay: 0.16, duration: 0.88, size: 3 },
  { x: 86, y: -148, delay: 0.26, duration: 1.05, size: 2 },
  { x: -76, y: 74, delay: 0.08, duration: 1.12, size: 3 },
  { x: -38, y: 104, delay: 0.18, duration: 0.96, size: 2 },
  { x: 34, y: 92, delay: 0.1, duration: 1.08, size: 4 },
  { x: 78, y: 68, delay: 0.22, duration: 0.98, size: 2 },
];

export default function UpgradeView() {
  const [mainPlayer, setMainPlayer] = useState(null);
  const [level, setLevel] = useState(MIN_UPGRADE_LEVEL);
  const [materialOvrInputs, setMaterialOvrInputs] = useState(['200']);
  const [effectPercent, setEffectPercent] = useState(0);
  const [pickerMode, setPickerOpen] = useState(null);
  const [isSafeMode, setSafeMode] = useState(true);
  const [animStatus, setAnimStatus] = useState('idle');
  const [sequenceLevel, setSequenceLevel] = useState(null);
  const cancelRef = useRef(null);

  const targetOvr = useMemo(() => {
    if (!mainPlayer) return 0;
    return getDisplayedOvrForPlayer({ ...mainPlayer, upgradeLevel: level });
  }, [mainPlayer, level]);

  const materialOvrs = useMemo(
    () => materialOvrInputs.map(value => normalizeMaterialOvr(value)).filter(ovr => ovr != null),
    [materialOvrInputs],
  );
  const effectGaugeBonus = useMemo(() => calculateEffectGaugeBonus(effectPercent), [effectPercent]);

  const upgradeGauge = useMemo(() => {
    if (!mainPlayer) {
      return calculateUpgradeGauge({ targetOvr: 0, currentLevel: 0, fodderOvrs: [] });
    }

    return calculateUpgradeGauge({
      targetOvr,
      currentLevel: level,
      fodderOvrs: materialOvrs,
      eventGaugeBonus: effectGaugeBonus,
    });
  }, [mainPlayer, targetOvr, level, materialOvrs, effectGaugeBonus]);

  const mascotSrc = upgradeGauge.totalGauge >= MAX_GAUGE
    ? UPGRADE_MASCOT_IMAGES.happy
    : UPGRADE_MASCOT_IMAGES.sad;

  const nextLevel = Math.min(MAX_UPGRADE_LEVEL, level + 1);
  const sessionPercent = Math.min(100, upgradeGauge.gaugeRatio * 100);
  const realSuccessPercent = upgradeGauge.successRate * 100;
  const canUpgrade = Boolean(animStatus === 'idle' && mainPlayer && materialOvrs.length > 0 && level < MAX_UPGRADE_LEVEL);
  const isSequenceActive = animStatus !== 'idle';
  const sequenceCurrentLevel = sequenceLevel ?? level;
  const sequenceNextLevel = Math.min(MAX_UPGRADE_LEVEL, sequenceCurrentLevel + 1);
  const sequenceCopy = {
    running: 'Đang nâng cấp...',
    success: 'Thành công',
    fail: 'Thất bại',
  }[animStatus] || 'Sẵn sàng';

  function handleAddPlayer(player) {
    const selected = withUpgradeLevel(player, level || MIN_UPGRADE_LEVEL);
    setMainPlayer(selected);
    setLevel(prev => normalizeUpgradeLevel(prev || selected.upgradeLevel));
    setPickerOpen(null);
  }

  function updateMaterialOvr(index, value) {
    setMaterialOvrInputs(prev => prev.map((current, currentIndex) => (currentIndex === index ? value : current)));
  }

  function addMaterialSlot() {
    setMaterialOvrInputs(prev => (prev.length >= MAX_FODDERS ? prev : [...prev, '']));
  }

  function removeMaterialSlot(index) {
    setMaterialOvrInputs(prev => {
      const next = prev.filter((_, currentIndex) => currentIndex !== index);
      return next.length ? next : [''];
    });
  }

  function doUpgrade() {
    if (!canUpgrade) return;
    setSequenceLevel(level);
    setAnimStatus('running');

    clearTimeout(cancelRef.current);
    cancelRef.current = setTimeout(() => {
      const success = rollUpgrade(upgradeGauge.successRate);
      if (success) {
        setAnimStatus('success');
        setLevel(prev => Math.min(MAX_UPGRADE_LEVEL, Math.max(MIN_UPGRADE_LEVEL, prev) + 1));
      } else {
        setAnimStatus('fail');
        if (!isSafeMode) setLevel(prev => Math.max(MIN_UPGRADE_LEVEL, prev - 1));
      }

      cancelRef.current = setTimeout(() => {
        setAnimStatus('idle');
        setSequenceLevel(null);
      }, 2400);
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
          <Button
            variant="ghost"
            size="sm"
            icon={I.Refresh}
            onClick={() => {
              setMainPlayer(null);
              setLevel(MIN_UPGRADE_LEVEL);
              setMaterialOvrInputs(['200']);
              setEffectPercent(0);
            }}
          >
            Đổi cầu thủ
          </Button>
        )}
      </div>

      {mainPlayer && isSequenceActive ? (
        <div className={`fco-up-sequence-screen ${animStatus}`}>
          <div className="fco-up-sequence-backdrop" aria-hidden="true" />
          <div className="fco-up-burst-bg" aria-hidden="true" />
          <div className="fco-up-burst-spotlight" aria-hidden="true" />
          <div className="fco-up-burst-beams" aria-hidden="true">
            {BURST_BEAMS.map((offset, index) => (
              <i key={offset} className="fco-up-burst-beam" style={{ '--beam-x': `${offset}px`, '--beam-delay': `${index * 0.07}s` }} />
            ))}
          </div>
          <div className="fco-up-particles" aria-hidden="true">
            {BURST_PARTICLES.map((particle, index) => (
              <i
                key={`${particle.x}-${particle.y}`}
                className="fco-up-particle"
                style={{
                  '--particle-x': `${particle.x}px`,
                  '--particle-y': `${particle.y}px`,
                  '--particle-delay': `${particle.delay}s`,
                  '--particle-duration': `${particle.duration}s`,
                  '--particle-size': `${particle.size}px`,
                }}
              />
            ))}
          </div>
          {animStatus === 'fail' && <div className="fco-up-shatter-effect" aria-hidden="true" />}
          <div className="fco-up-sequence-card">
            <div className="fco-up-sequence-player">
              <div className={`fco-up-card fco-up-${animStatus}`}>
                <div className="fco-up-card-badge-row">
                  <LevelBadge level={level} scale={0.42} />
                </div>
                <PlayerAvatar player={mainPlayer} size={156} />
                <div style={{ marginTop: 12, fontWeight: 700, fontSize: 16 }}>{cleanName(mainPlayer.name)}</div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                  <SeasonChip code={mainPlayer.season} img={mainPlayer.seasonImg} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <OvrBox value={targetOvr} size="md" />
                </div>
              </div>
            </div>

            <div className="fco-up-sequence-meta">
              <span>Phiên nâng cấp</span>
              <strong>+{sequenceCurrentLevel} → +{sequenceNextLevel}</strong>
              <small>{sessionPercent.toFixed(2)}% vạch · {realSuccessPercent.toFixed(2)}% thành công</small>
            </div>

            <div className={`fco-up-sequence-ring ${animStatus}`}>
              <div className="fco-up-sequence-ring-core">
                <span>{sequenceCopy}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="fco-up-machine-stage">
          <div className="fco-up-machine-orbit" />

          <div className="fco-up-machine-core">
            <div className="fco-up-main">
              {mainPlayer && (
                <div className="fco-up-mascot-card floating">
                  <img src={mascotSrc} alt={upgradeGauge.totalGauge >= MAX_GAUGE ? 'Thần Tài vui khi đủ 5 vạch' : 'Thần Tài buồn khi chưa đủ 5 vạch'} />
                  <span>{upgradeGauge.totalGauge >= MAX_GAUGE ? 'Đủ 5 vạch, Thần Tài vui' : 'Chưa đủ 5 vạch, Thần Tài buồn'}</span>
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
                  <span>Phôi: <b>{materialOvrs.length}/{MAX_FODDERS}</b></span>
                </div>

                <div className="fco-up-progress-wrap fco-up-progress-machine">
                  <div className="fco-up-progress-bar" style={{ width: `${sessionPercent}%` }} />
                  <div className="fco-up-progress-ticks">
                    {[20, 40, 60, 80].map(t => (
                      <div key={t} className="fco-up-tick" style={{ left: `${t}%` }} />
                    ))}
                  </div>
                </div>

                <div className="fco-up-result-strip">
                  <div className="fco-up-summary-grid compact">
                    <div>
                      <span>Phiên nâng cấp</span>
                      <b>{sessionPercent.toFixed(2)}%</b>
                    </div>
                    <div>
                      <span>Tỷ lệ full vạch</span>
                      <b>{(upgradeGauge.fullGaugeSuccessRate * 100).toFixed(2)}%</b>
                    </div>
                    <div>
                      <span>Tổng vạch</span>
                      <b>{upgradeGauge.totalGauge.toFixed(4)} / {MAX_GAUGE}</b>
                    </div>
                    <div>
                      <span>Hiệu ứng</span>
                      <b>+{effectPercent}%</b>
                    </div>
                    <div className="wide hot">
                      <span>Tỷ lệ thành công thực</span>
                      <b>{realSuccessPercent.toFixed(2)}%</b>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fco-up-control-panel">
                <label className="fco-up-field">
                  <span>Cấp thẻ</span>
                  <select
                    value={level}
                    disabled={animStatus !== 'idle' || level >= MAX_UPGRADE_LEVEL}
                    onChange={event => setLevel(normalizeUpgradeLevel(event.target.value))}
                  >
                    {Array.from({ length: MAX_UPGRADE_LEVEL - MIN_UPGRADE_LEVEL }, (_, index) => MIN_UPGRADE_LEVEL + index).map(option => (
                      <option key={option} value={option}>+{option} → +{option + 1}</option>
                    ))}
                    {level >= MAX_UPGRADE_LEVEL && <option value={MAX_UPGRADE_LEVEL}>+{MAX_UPGRADE_LEVEL} tối đa</option>}
                  </select>
                </label>

                <label className="fco-up-field">
                  <span>Thẻ thành phần</span>
                  <div className="fco-up-material-count">{materialOvrs.length}/{MAX_FODDERS}</div>
                </label>

                <label className="fco-up-field">
                  <span>Hiệu ứng</span>
                  <select
                    value={effectPercent}
                    disabled={animStatus !== 'idle'}
                    onChange={event => setEffectPercent(Number(event.target.value))}
                  >
                    {UPGRADE_EFFECT_OPTIONS.map(option => (
                      <option key={option} value={option}>+{option}%</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className={`fco-up-material-slots fco-up-material-${animStatus}`}>
                {Array.from({ length: MAX_FODDERS }).map((_, index) => {
                  const inputValue = materialOvrInputs[index];
                  const normalizedOvr = normalizeMaterialOvr(inputValue ?? '');
                  const isActiveSlot = index < materialOvrInputs.length;

                  return (
                    <div key={index} className={`fco-up-material-slot ${isActiveSlot ? 'filled' : 'empty'}`}>
                      {isActiveSlot ? (
                        <>
                          <div className="fco-up-material-card">
                            <b>OVR</b>
                            <input
                              type="number"
                              min="1"
                              inputMode="numeric"
                              value={inputValue}
                              disabled={animStatus !== 'idle'}
                              onChange={event => updateMaterialOvr(index, event.target.value)}
                            />
                          </div>
                          <div className="fco-up-material-percent">
                            {normalizedOvr == null ? '0.00%' : `${Math.min(100, ((upgradeGauge.fodderGauges[index] || 0) / MAX_GAUGE) * 100).toFixed(2)}%`}
                          </div>
                          <button
                            type="button"
                            className="fco-up-material-remove"
                            disabled={animStatus !== 'idle'}
                            onClick={() => removeMaterialSlot(index)}
                            aria-label="Xóa thẻ thành phần"
                          >
                            ×
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className="fco-up-material-add"
                          disabled={animStatus !== 'idle'}
                          onClick={addMaterialSlot}
                          aria-label="Thêm thẻ thành phần"
                        >
                          +
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="fco-up-action-row">
                <label className="fco-up-protect-toggle">
                  <input type="checkbox" checked={isSafeMode} onChange={event => setSafeMode(event.target.checked)} />
                  <span className={`fco-checkbox ${isSafeMode ? 'on' : ''}`}>
                    {isSafeMode && <I.Check size={12} />}
                  </span>
                  <span>Bảo vệ cầu thủ</span>
                  <b>{isSafeMode ? 'BẬT' : 'TẮT'}</b>
                </label>
                <Button variant="primary" size="lg" disabled={!canUpgrade} onClick={doUpgrade} style={{ minWidth: 140 }}>
                  {level >= MAX_UPGRADE_LEVEL ? 'Đã đạt +13' : 'Nâng cấp'}
                </Button>
              </div>

              {materialOvrs.length === 0 && (
                <div className="fco-up-result fail">Nhập ít nhất 1 OVR thẻ thành phần để mô phỏng phiên nâng cấp.</div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="fco-up-disclaimer">
        Đây là công cụ giả lập phục vụ tham khảo, không phải công cụ chính thức của Garena/FCO và không khẳng định là công thức nội bộ chính thức của game.
      </div>

      {pickerMode && (
        <PlayerPicker
          title="Chọn cầu thủ nâng cấp"
          showTopPlayers
          allowLevelSelect={false}
          defaultLevel={Math.max(MIN_UPGRADE_LEVEL, level || MIN_UPGRADE_LEVEL)}
          existing={[]}
          onAdd={handleAddPlayer}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </div>
  );
}
