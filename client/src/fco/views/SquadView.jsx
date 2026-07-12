import { useState, useMemo, useEffect, useRef } from 'react';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import SquadPitchEditor from '../components/SquadPitchEditor.jsx';
import {
  loadSquad,
  saveSquad,
  getActiveSquadSlots,
  getStartersFromSquad,
} from '../squadHelpers.js';
import { buildTeamColorPayload, getLiveTeamColorOvrBonusBySlot, getTeamColorPayloadHash, evaluateTeamColorLive } from '../teamColorLive.js';
import { TeamColorStrip } from '../components/TeamColorStrip.jsx';
import { DEFAULT_SALARY_CAP, MAX_SALARY_CAP, getLineAverages, getSquadSalaryTotal } from '../squadSummary.js';
import { computeSquadBonuses } from '../teamColor.js';
import { MIN_UPGRADE_LEVEL } from '../upgradeConfig.js';
import MonetizationSlot from '../../components/monetization/MonetizationSlot.jsx';

export default function SquadView() {
  useDocumentMeta({
    title: 'Đội hình',
    description: 'Xây dựng và lưu đội hình FCOnline, tính toán chỉ số đồng đội và lương đội bóng.',
    path: '/squad-maker',
  });
  const [squad, setSquad] = useState(() => loadSquad());
  const [salaryCap, setSalaryCap] = useState(DEFAULT_SALARY_CAP);
  const [isEditingSalaryCap, setIsEditingSalaryCap] = useState(false);
  const [teamGrade, setTeamGrade] = useState(MIN_UPGRADE_LEVEL);
  const [activeTeamColorFocus, setActiveTeamColorFocus] = useState(null);

  const { bySlotId } = squad;
  const slots = useMemo(() => getActiveSquadSlots(squad), [squad]);
  const starters = useMemo(() => getStartersFromSquad(bySlotId, slots), [bySlotId, slots]);
  const squadBonuses = useMemo(() => computeSquadBonuses(starters), [starters]);
  const salaryTotal = useMemo(() => getSquadSalaryTotal(starters), [starters]);

  const [liveTeamColor, setLiveTeamColor] = useState(null);
  const [liveTeamColorLoading, setLiveTeamColorLoading] = useState(false);
  const [liveTeamColorError, setLiveTeamColorError] = useState(false);
  const lastPayloadHashRef = useRef('');
  const liveOvrBonusBySlot = useMemo(() => getLiveTeamColorOvrBonusBySlot(liveTeamColor), [liveTeamColor]);
  const lineAverages = useMemo(() => getLineAverages(slots, bySlotId, squadBonuses.perPlayer, liveOvrBonusBySlot), [slots, bySlotId, squadBonuses.perPlayer, liveOvrBonusBySlot]);
  const salaryProgress = salaryCap > 0 ? Math.min(100, (salaryTotal / salaryCap) * 100) : 100;
  const isOverSalaryCap = salaryTotal > salaryCap;

  useEffect(() => {
    const payload = buildTeamColorPayload(slots, bySlotId, { squadLevel: 1 });
    if (!payload) {
      lastPayloadHashRef.current = '';
      const timer = setTimeout(() => {
        setLiveTeamColor(null);
        setLiveTeamColorError(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    const hash = getTeamColorPayloadHash(payload);
    if (hash === lastPayloadHashRef.current) return;

    const timer = setTimeout(() => {
      lastPayloadHashRef.current = hash;
      setLiveTeamColorLoading(true);
      setLiveTeamColorError(false);
      evaluateTeamColorLive(payload)
        .then((result) => {
          setLiveTeamColor(result);
          setActiveTeamColorFocus(null);
        })
        .catch(() => setLiveTeamColorError(true))
        .finally(() => setLiveTeamColorLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [slots, bySlotId]);

  function handleSquadChange(next) {
    setActiveTeamColorFocus(null);
    setSquad(next);
    saveSquad(next);
  }

  return (
    <div className="fco-squad-view">
      <div className="fco-up-machine-head">
        <div>
          <h2 className="fco-h2">Xây dựng đội hình</h2>
          <p className="fco-sub">Chọn 11 cầu thủ đá chính, kéo thả để đổi vị trí và xem team color được kích hoạt.</p>
        </div>
      </div>

      <div className="fco-squad-summary-strip">
        <div className={`fco-squad-summary-card fco-squad-summary-card--fp${isOverSalaryCap ? ' is-over-limit' : ''}`}>
          <div className="fco-squad-summary-head">
            <span className="fco-squad-summary-eyebrow">Tổng lương</span>
          </div>
          <div className="fco-squad-summary-value">
            <span>{salaryTotal}</span>
            <span className="fco-squad-summary-divider">/</span>
            <span className="fco-squad-summary-cap-wrap">
              {isEditingSalaryCap ? (
                <input
                  type="number"
                  min={0}
                  max={MAX_SALARY_CAP}
                  value={salaryCap}
                  autoFocus
                  onChange={(e) => {
                    const next = Math.max(0, Math.min(MAX_SALARY_CAP, Number(e.target.value) || 0));
                    setSalaryCap(next);
                  }}
                  onBlur={() => setIsEditingSalaryCap(false)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') setIsEditingSalaryCap(false); }}
                  className="fco-squad-summary-cap-input"
                />
              ) : (
                <>
                  <span>{salaryCap}</span>
                  <button
                    type="button"
                    className="summary-edit-icon"
                    aria-label="Sửa lương tối đa"
                    onClick={() => setIsEditingSalaryCap(true)}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4 11.5-11.5Z" />
                    </svg>
                  </button>
                </>
              )}
            </span>
          </div>
          <div className="fco-squad-summary-caption">Hiện tại / Tối đa</div>
          <div className="fco-squad-summary-bar" aria-label={`Tổng lương ${salaryTotal} trên ${salaryCap}`}>
            <span style={{ width: `${salaryProgress}%` }} />
          </div>
        </div>

        <div className="fco-squad-summary-card fco-squad-summary-card--ovr">
          <div className="fco-squad-summary-head">
            <span className="fco-squad-summary-eyebrow">OVR trung bình</span>
          </div>
          <div className="fco-squad-summary-ovr-grid">
            <div className="fco-squad-summary-ovr-rows">
              {['GK', 'DEF', 'MID', 'FWD'].map((key) => {
                const value = lineAverages[key];
                const progress = value == null ? 0 : Math.min(100, (value / 150) * 100);
                return (
                  <div key={key} className={`fco-squad-summary-ovr-row line-${key.toLowerCase()}`}>
                    <span className="fco-squad-summary-ovr-bar"><span style={{ width: `${progress}%` }} /></span>
                    <span className="fco-squad-summary-ovr-value">{value ?? '—'}</span>
                  </div>
                );
              })}
            </div>
            <div className="fco-squad-summary-ovr-total-wrap"><div className="fco-squad-summary-ovr-total">{lineAverages.overall ?? '—'}</div></div>
          </div>
        </div>

        <TeamColorStrip result={liveTeamColor} loading={liveTeamColorLoading} error={liveTeamColorError} bySlotId={bySlotId} />
      </div>

      <SquadPitchEditor
        squad={squad}
        onChange={handleSquadChange}
        perPlayerBonus={squadBonuses.perPlayer}
        ovrBonusBySlot={liveOvrBonusBySlot}
        defaultAddLevel={teamGrade}
        headTeamGrade={teamGrade}
        onHeadTeamGradeChange={setTeamGrade}
        activeTeamColorFocus={activeTeamColorFocus}
        onTeamColorFocusChange={setActiveTeamColorFocus}
        teamColorResult={liveTeamColor}
        railTop={<MonetizationSlot placement="squad_top" limit={1} className="fco-squad-rail-ad" />}
        railBottom={<MonetizationSlot placement="squad_bottom" limit={1} className="fco-squad-rail-ad" />}
      />
    </div>
  );
}
