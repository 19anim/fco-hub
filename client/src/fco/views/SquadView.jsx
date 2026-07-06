import { useState, useMemo, useEffect, useRef } from 'react';
import PlayerPickerFiltered from '../components/PlayerPickerFiltered.jsx';
import LevelBadge from '../components/LevelBadge.jsx';
import TeamGradePopover from '../components/TeamGradePopover.jsx';
import { buildTeamColorPayload, getLiveTeamColorOvrBonusBySlot, getTeamColorPayloadHash, evaluateTeamColorLive } from '../teamColorLive.js';
import { TeamColorStrip } from '../components/TeamColorStrip.jsx';
import {
  FORMATION_OPTIONS,
  getFormationSlots,
  getActiveSquadSlots,
  normalizeSquadSlots,
  loadSquad,
  saveSquad,
  getStartersFromSquad,
  assignPlayerToSlot,
  clearSlot,
  swapSquadSlots,
  movePlayerToSlot,
  updateSquadPlayerLevel,
  mapSquadToFormation,
  getPickerPosGroupsForSlot,
} from '../squadHelpers.js';
import { getOvrForSlotPosition } from '../positionOvr.js';
import { DEFAULT_SALARY_CAP, MAX_SALARY_CAP, getLineAverages, getSlotDisplayOvr, getSquadSalaryTotal } from '../squadSummary.js';
import { computeSquadBonuses, getPlayerSquadBonus } from '../teamColor.js';
import { getPlayerCardKey, normalizeUpgradeLevel } from '../upgradeHelpers.js';
import { MIN_UPGRADE_LEVEL } from '../upgradeConfig.js';
import { Button, IconButton, PlayerCardMini, PlayerAvatar, SeasonChip, PosPill } from '../ui.jsx';
import * as I from '../Icons.jsx';
import MonetizationSlot from '../../components/monetization/MonetizationSlot.jsx';

const FORMATION_GROUPS = [
  { label: '3 Back', prefix: '3-' },
  { label: '4 Back', prefix: '4-' },
  { label: '5 Back', prefix: '5-' },
];
const EDIT_GRADE_LEVELS = Array.from({ length: 14 }, (_, index) => index);
const DRAG_BOUNDS = { left: 5, right: 95, top: 10, bottom: 82 };

function normalizeSquadGrade(level) {
  const numericLevel = Math.trunc(Number(level));
  return numericLevel === 0 ? 0 : normalizeUpgradeLevel(level);
}

const SOURCE_ROLE_MAX_TOP = 115;
const SOURCE_ROLE_ZONES = {
  SW: { left: 35, right: 65, top: 97.75, bottom: 109.25 },
  RWB: { left: 75, right: 100, top: 69, bottom: 115 },
  RB: { left: 75, right: 100, top: 80, bottom: 104 },
  RCB: { left: 50, right: 75, top: 92, bottom: 115 },
  CB: { left: 25, right: 75, top: 92, bottom: 115 },
  LCB: { left: 25, right: 50, top: 92, bottom: 115 },
  LB: { left: 0, right: 25, top: 80, bottom: 104 },
  LWB: { left: 0, right: 25, top: 69, bottom: 115 },
  RDM: { left: 50, right: 75, top: 69, bottom: 92 },
  CDM: { left: 25, right: 75, top: 69, bottom: 92 },
  LDM: { left: 25, right: 50, top: 69, bottom: 92 },
  RM: { left: 75, right: 100, top: 34.5, bottom: 69 },
  RCM: { left: 50, right: 75, top: 46, bottom: 69 },
  CM: { left: 25, right: 75, top: 46, bottom: 69 },
  LCM: { left: 25, right: 50, top: 46, bottom: 69 },
  LM: { left: 0, right: 25, top: 34.5, bottom: 69 },
  RAM: { left: 50, right: 75, top: 28.75, bottom: 51.75 },
  CAM: { left: 25, right: 75, top: 28.75, bottom: 51.75 },
  LAM: { left: 25, right: 50, top: 28.75, bottom: 51.75 },
  RF: { left: 50, right: 75, top: 11.5, bottom: 34.5 },
  CF: { left: 25, right: 75, top: 11.5, bottom: 34.5 },
  LF: { left: 25, right: 50, top: 11.5, bottom: 34.5 },
  RW: { left: 75, right: 100, top: 0, bottom: 69 },
  RS: { left: 50, right: 75, top: 0, bottom: 17.25 },
  ST: { left: 25, right: 75, top: 0, bottom: 17.25 },
  LS: { left: 25, right: 50, top: 0, bottom: 17.25 },
  LW: { left: 0, right: 25, top: 0, bottom: 69 },
};
const HIT_ROLE_ZONES = {
  ...SOURCE_ROLE_ZONES,
  SW: { left: 35, right: 65, top: 104, bottom: 115 },
  RWB: { left: 75, right: 100, top: 69, bottom: 95 },
  RB: { left: 75, right: 100, top: 95, bottom: 115 },
  RCB: { left: 50, right: 75, top: 92, bottom: 104 },
  CB: { left: 25, right: 75, top: 92, bottom: 104 },
  LCB: { left: 25, right: 50, top: 92, bottom: 104 },
  LB: { left: 0, right: 25, top: 95, bottom: 115 },
  LWB: { left: 0, right: 25, top: 69, bottom: 95 },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function buildPositionZones(bounds, sourceZones = SOURCE_ROLE_ZONES) {
  const zones = {};
  Object.entries(sourceZones).forEach(([role, z]) => {
    const l = z.left;
    const r = z.right;
    const t = (z.top / SOURCE_ROLE_MAX_TOP) * bounds.bottom;
    const b = (z.bottom / SOURCE_ROLE_MAX_TOP) * bounds.bottom;
    zones[role] = { left: l, right: r, top: t, bottom: b, centerX: (l + r) / 2, centerY: (t + b) / 2 };
  });
  return zones;
}

function getRoleFromPosition(x, y, zones) {
  let matchedRole = 'CM';
  let minDistance = Infinity;
  const insideRoles = [];
  Object.entries(zones).forEach(([role, z]) => {
    if (x >= z.left && x <= z.right && y >= z.top && y <= z.bottom) insideRoles.push(role);
  });
  if (insideRoles.length > 0) {
    insideRoles.forEach((role) => {
      const z = zones[role];
      const dx = x - z.centerX;
      const dy = y - z.centerY;
      const area = (z.right - z.left) * (z.bottom - z.top);
      const d = dx * dx + dy * dy + area * 0.001;
      if (d < minDistance) { minDistance = d; matchedRole = role; }
    });
  } else {
    Object.entries(zones).forEach(([role, z]) => {
      const cx = clamp(x, z.left, z.right);
      const cy = clamp(y, z.top, z.bottom);
      const db = (x - cx) * (x - cx) + (y - cy) * (y - cy);
      const dc = (x - z.centerX) * (x - z.centerX) + (y - z.centerY) * (y - z.centerY);
      const s = db * 1000 + dc;
      if (s < minDistance) { minDistance = s; matchedRole = role; }
    });
  }
  return matchedRole;
}

function swapSlotLayouts(slots, draggedSlotId, targetPos, initialLayout) {
  const next = slots.map((slot) => ({ ...slot }));
  const dragged = next.find((slot) => slot.id === draggedSlotId);
  const occupant = next.find((slot) => slot.id !== draggedSlotId && slot.pos === targetPos);
  if (!dragged) return next;
  if (occupant) {
    occupant.pos = initialLayout.pos;
    occupant.x = initialLayout.x;
    occupant.y = initialLayout.y;
  }
  return next;
}

const CUSTOM_FORMATION_BUCKETS = [
  new Set(['LB', 'RB', 'LWB', 'RWB', 'CB', 'LCB', 'RCB', 'SW']),
  new Set(['CDM', 'LDM', 'RDM']),
  new Set(['CM', 'LCM', 'RCM', 'LM', 'RM']),
  new Set(['CAM', 'LAM', 'RAM']),
  new Set(['ST', 'CF', 'LF', 'RF', 'LW', 'RW', 'LS', 'RS']),
];

function getCustomFormationLabel(slots) {
  const counts = CUSTOM_FORMATION_BUCKETS.map(() => 0);
  slots.forEach((slot) => {
    if (slot.pos === 'GK') return;
    const index = CUSTOM_FORMATION_BUCKETS.findIndex((bucket) => bucket.has(slot.pos));
    if (index >= 0) counts[index] += 1;
  });
  return counts.filter(Boolean).join('-') || 'Custom';
}

export default function SquadView() {
  const [squad, setSquad] = useState(() => loadSquad());
  const [pickerSlotId, setPickerSlotId] = useState(null);
  const [editSlotId, setEditSlotId] = useState(null);
  const [movingSlotId, setMovingSlotId] = useState(null);
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [dragSlotId, setDragSlotId] = useState(null);
  const [dragOverSlotId, setDragOverSlotId] = useState(null);
  const [layoutDrag, setLayoutDrag] = useState(null);
  const [salaryCap, setSalaryCap] = useState(DEFAULT_SALARY_CAP);
  const [teamGrade, setTeamGrade] = useState(MIN_UPGRADE_LEVEL);
  const pitchRef = useRef(null);
  const layoutDragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const { formationId, bySlotId } = squad;
  const slots = useMemo(() => getActiveSquadSlots(squad), [squad]);
  const visibleSlots = layoutDrag?.currentSlots || slots;

  const isCustomLayout = Boolean(squad.customSlots) || Boolean(layoutDrag);
  const customFormationLabel = useMemo(() => (isCustomLayout ? getCustomFormationLabel(visibleSlots) : ''), [isCustomLayout, visibleSlots]);
  const dragZone = useMemo(() => {
    if (!layoutDrag?.currentPos) return null;
    const zone = buildPositionZones(DRAG_BOUNDS)[layoutDrag.currentPos];
    return zone ? { role: layoutDrag.currentPos, ...zone } : null;
  }, [layoutDrag]);
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
  const filledCount = starters.length;

  useEffect(() => {
    const payload = buildTeamColorPayload(slots, bySlotId, { squadLevel: 1 });
    if (!payload) {
      setLiveTeamColor(null);
      setLiveTeamColorError(false);
      lastPayloadHashRef.current = '';
      return;
    }

    const hash = getTeamColorPayloadHash(payload);
    if (hash === lastPayloadHashRef.current) return;

    const timer = setTimeout(() => {
      lastPayloadHashRef.current = hash;
      setLiveTeamColorLoading(true);
      setLiveTeamColorError(false);
      evaluateTeamColorLive(payload)
        .then((result) => setLiveTeamColor(result))
        .catch(() => setLiveTeamColorError(true))
        .finally(() => setLiveTeamColorLoading(false));
    }, 400);

    return () => clearTimeout(timer);
  }, [slots, bySlotId]);

  function persist(nextBySlotId, nextCustomSlots = squad.customSlots) {
    const next = { formationId, bySlotId: nextBySlotId, customSlots: normalizeSquadSlots(nextCustomSlots) };
    setSquad(next);
    saveSquad(next);
  }

  function persistSquad(next) {
    setSquad(next);
    saveSquad(next);
  }

  function handleChangeFormation(nextFormationId) {
    if (nextFormationId === formationId && !squad.customSlots) return;
    const nextSlots = getFormationSlots(nextFormationId);
    const nextBySlotId = mapSquadToFormation(bySlotId, slots, nextSlots);
    persistSquad({ formationId: nextFormationId, bySlotId: nextBySlotId, customSlots: null });
    setMovingSlotId(null);
    setDragOverSlotId(null);
    setLayoutDrag(null);
    layoutDragRef.current = null;
  }

  function handleAddPlayer(player) {
    if (!pickerSlotId) return;
    persist(assignPlayerToSlot(bySlotId, pickerSlotId, player));
    setPickerSlotId(null);
    setEditSlotId(null);
  }

  function openEditModal(slotId) {
    setActiveSlotId(slotId);
    setEditSlotId(slotId);
  }

  function openReplacePicker(slotId) {
    setEditSlotId(null);
    setPickerSlotId(slotId);
  }

  function closeEditModal() {
    setEditSlotId(null);
  }

  function removeFromSlot(slotId) {
    persist(clearSlot(bySlotId, slotId));
    if (editSlotId === slotId) setEditSlotId(null);
  }

  function clearSquad() {
    persistSquad({ formationId, bySlotId: {}, customSlots: squad.customSlots || null });
    setMovingSlotId(null);
    setDragOverSlotId(null);
  }

  function changeLevel(slotId, level) {
    persist(updateSquadPlayerLevel(bySlotId, slotId, level));
  }

  function applyQuickLevel(level) {
    setTeamGrade(normalizeSquadGrade(level));
    let next = { ...bySlotId };
    Object.keys(next).forEach((slotId) => {
      next = updateSquadPlayerLevel(next, slotId, level);
    });
    persist(next);
  }

  function handleSlotClick(slotId) {
    setActiveSlotId(slotId);
    const player = bySlotId[slotId];
    if (movingSlotId) {
      if (movingSlotId === slotId) {
        setMovingSlotId(null);
        return;
      }
      const targetOccupied = Boolean(bySlotId[slotId]);
      persist(targetOccupied ? swapSquadSlots(bySlotId, movingSlotId, slotId) : movePlayerToSlot(bySlotId, movingSlotId, slotId));
      setMovingSlotId(null);
      return;
    }
    if (player) return;
    setPickerSlotId(slotId);
  }

  function handleRosterEditKey(event, slotId) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openEditModal(slotId);
  }

  function clearDragState() {
    setDragSlotId(null);
    setDragOverSlotId(null);
    setLayoutDrag(null);
    layoutDragRef.current = null;
  }

  function getLayoutDragUpdate(event, dragState = layoutDragRef.current) {
    if (!dragState || !pitchRef.current) return null;
    const rect = pitchRef.current.getBoundingClientRect();
    const dx = ((event.clientX - dragState.startClientX) / rect.width) * 100;
    const dy = ((event.clientY - dragState.startClientY) / rect.height) * 100;
    const x = clamp(dragState.initialSlot.x + dx, DRAG_BOUNDS.left, DRAG_BOUNDS.right);
    const y = clamp(dragState.initialSlot.y + dy, DRAG_BOUNDS.top, DRAG_BOUNDS.bottom);
    const zones = buildPositionZones(DRAG_BOUNDS, HIT_ROLE_ZONES);
    const pos = getRoleFromPosition(x, y, zones);
    const nextSlots = dragState.baseSlots.map((slot) => (
      slot.id === dragState.slotId ? { ...slot, x, y, pos } : slot
    ));
    const moved = dragState.moved || Math.hypot(event.clientX - dragState.startClientX, event.clientY - dragState.startClientY) > 4;
    return { ...dragState, currentSlots: nextSlots, currentPos: pos, x, y, moved };
  }

  function handleSlotPointerDown(slot, event) {
    if (event.button !== 0) return;
    setActiveSlotId(slot.id);
    if (slot.pos === 'GK') return;
    if (event.target.closest('button') && !event.target.closest('.fco-player-card-mini-wrap') && !event.target.closest('.fco-squad-empty-add')) return;
    const baseSlots = slots.map((s) => ({ ...s }));
    const initialSlot = { ...slot };
    const nextDrag = {
      pointerId: event.pointerId,
      slotId: slot.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialSlot,
      baseSlots,
      currentSlots: baseSlots,
      currentPos: slot.pos,
      x: slot.x,
      y: slot.y,
      moved: false,
      captured: false,
    };
    layoutDragRef.current = nextDrag;
  }

  function handleSlotPointerMove(event) {
    const dragState = layoutDragRef.current;
    if (!dragState) return;
    const nextDrag = getLayoutDragUpdate(event, dragState);
    if (!nextDrag) return;
    if (nextDrag.moved && !dragState.captured) {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      nextDrag.captured = true;
      setDragSlotId(nextDrag.slotId);
    }
    layoutDragRef.current = nextDrag;
    if (nextDrag.moved) setLayoutDrag(nextDrag);
  }

  function handleSlotPointerUp(event) {
    const nextDrag = getLayoutDragUpdate(event) || layoutDragRef.current;
    if (!nextDrag) { clearDragState(); return; }
    if (nextDrag.captured) event.currentTarget.releasePointerCapture?.(nextDrag.pointerId);
    if (!nextDrag.moved) { clearDragState(); return; }
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    const swappedSlots = swapSlotLayouts(nextDrag.currentSlots, nextDrag.slotId, nextDrag.currentPos, nextDrag.initialSlot);
    persist(bySlotId, swappedSlots);
    clearDragState();
  }

  const existingKeys = Object.entries(bySlotId)
    .filter(([slotId]) => slotId !== pickerSlotId)
    .map(([, player]) => getPlayerCardKey(player));
  const activePickerSlot = visibleSlots.find((s) => s.id === pickerSlotId) || null;
  const activeEditSlot = visibleSlots.find((s) => s.id === editSlotId) || null;
  const activeEditPlayer = editSlotId ? bySlotId[editSlotId] : null;
  const rosterSlots = useMemo(() => [...visibleSlots].sort((a, b) => a.y - b.y || a.x - b.x), [visibleSlots]);

  return (
    <div className="fco-squad-view">
      <div className="fco-up-machine-head">
        <div>
          <h2 className="fco-h2">Xây dựng đội hình</h2>
          <p className="fco-sub">Chọn 11 cầu thủ đá chính, kéo thả để đổi vị trí và xem team color được kích hoạt.</p>
        </div>
      </div>

      <div className="fco-squad-layout">
        <div className="fco-squad-maincol">
          <div className="fco-squad-controls-bar">
        <div className="fco-squad-summary-strip">
          <div className={`fco-squad-summary-card fco-squad-summary-card--fp${isOverSalaryCap ? ' is-over-limit' : ''}`}>
            <div className="fco-squad-summary-head">
              <span className="fco-squad-summary-eyebrow">Tổng lương</span>
            </div>
            <div className="fco-squad-summary-value">
              {salaryTotal} /
              <input
                type="number"
                min={0}
                max={MAX_SALARY_CAP}
                value={salaryCap}
                onChange={(e) => {
                  const next = Math.max(0, Math.min(MAX_SALARY_CAP, Number(e.target.value) || 0));
                  setSalaryCap(next);
                }}
                className="fco-squad-summary-cap-input"
              />
            </div>
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
              <div className="fco-squad-summary-ovr-total">{lineAverages.overall ?? '—'}</div>
            </div>
          </div>

          <TeamColorStrip result={liveTeamColor} loading={liveTeamColorLoading} error={liveTeamColorError} bySlotId={bySlotId} />
        </div>

        <div className="fco-squad-controls-actions">
          <div className="fco-squad-formation-select-wrap">
            {isCustomLayout && <span className="fco-squad-custom-formation">Custom · {customFormationLabel}</span>}
            <select
              id="fco-squad-formation-select"
              className="fco-squad-formation-select"
              value={isCustomLayout ? 'custom' : formationId}
              onChange={(e) => {
                if (e.target.value !== 'custom') handleChangeFormation(e.target.value);
              }}
            >
              {isCustomLayout && <option value="custom">Custom · {customFormationLabel}</option>}
              {FORMATION_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {FORMATION_OPTIONS.filter((opt) => opt.id.startsWith(group.prefix)).map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {filledCount > 0 && (
            <div className="fco-squad-toolbar-group">
              <span className="fco-squad-toolbar-label">Cấp nhanh cả đội</span>
              <TeamGradePopover value={teamGrade} onChange={applyQuickLevel} />
            </div>
          )}

          {filledCount > 0 && (
            <Button variant="ghost" size="sm" icon={I.Refresh} onClick={clearSquad}>
              Xoá đội hình
            </Button>
          )}
          </div>
        </div>

          <div className="fco-squad-pitch" ref={pitchRef}>
          <div className="fco-pitch-lines" aria-hidden="true">
            <span className="fco-pitch-halfway" />
            <span className="fco-pitch-circle" />
            <span className="fco-pitch-spot fco-pitch-spot-center" />
            <span className="fco-pitch-box fco-pitch-box-top" />
            <span className="fco-pitch-box-small fco-pitch-box-small-top" />
            <span className="fco-pitch-spot fco-pitch-spot-top" />
            <span className="fco-pitch-arc fco-pitch-arc-top" />
            <span className="fco-pitch-box fco-pitch-box-bottom" />
            <span className="fco-pitch-box-small fco-pitch-box-small-bottom" />
            <span className="fco-pitch-spot fco-pitch-spot-bottom" />
            <span className="fco-pitch-arc fco-pitch-arc-bottom" />
            <span className="fco-pitch-corner fco-pitch-corner-tl" />
            <span className="fco-pitch-corner fco-pitch-corner-tr" />
            <span className="fco-pitch-corner fco-pitch-corner-bl" />
            <span className="fco-pitch-corner fco-pitch-corner-br" />
          </div>
          {dragZone && (
            <div className="fco-squad-role-zones" aria-hidden="true">
              <span
                className="fco-squad-role-zone active"
                style={{
                  left: `${dragZone.left}%`,
                  top: `${dragZone.top}%`,
                  width: `${dragZone.right - dragZone.left}%`,
                  height: `${dragZone.bottom - dragZone.top}%`,
                }}
              >
                {dragZone.role}
              </span>
            </div>
          )}
          {visibleSlots.map((slot) => {
            const player = bySlotId[slot.id];
            const bonus = getPlayerSquadBonus(squadBonuses.perPlayer, player);
            const positionOvr = getOvrForSlotPosition(player, slot.pos);
            const boostedOvr = getSlotDisplayOvr(slot, player, squadBonuses.perPlayer, liveOvrBonusBySlot);
            const isMovingSource = movingSlotId === slot.id;
            const isMoveTarget = movingSlotId && movingSlotId !== slot.id;
            const isDropTarget = dragSlotId && dragSlotId !== slot.id;
            const isDragOver = dragOverSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={`fco-squad-slot ${player ? 'has-player' : 'empty-slot'}${activeSlotId === slot.id ? ' is-active' : ''}${isDropTarget ? ' drop-target' : ''}${isDragOver ? ' drag-over' : ''}${layoutDrag?.slotId === slot.id ? ' layout-dragging' : ''}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                onPointerDown={(e) => handleSlotPointerDown(slot, e)}
                onPointerMove={handleSlotPointerMove}
                onPointerUp={handleSlotPointerUp}
                onPointerCancel={clearDragState}
              >
                {player ? (
                  <div
                    className={`fco-squad-card${isMovingSource ? ' moving' : ''}${isMoveTarget ? ' move-target' : ''}${dragSlotId === slot.id ? ' dragging' : ''}`}
                  >
                    <div className="fco-squad-card-actions">
                      <IconButton
                        icon={I.Settings}
                        label="Chỉnh thẻ"
                        size={12}
                        className="card-edit-btn"
                        onClick={() => openEditModal(slot.id)}
                      />
                      <IconButton
                        icon={I.X}
                        label="Xoá cầu thủ"
                        size={12}
                        className="card-remove-btn"
                        onClick={() => removeFromSlot(slot.id)}
                      />
                    </div>

                    <PlayerCardMini
                      player={player}
                      slotPos={slot.pos}
                      ovr={boostedOvr}
                      ovrIsFallback={positionOvr.ovrIsFallback}
                      bonus={bonus}
                      level={player.upgradeLevel}
                      onClick={() => {
                        if (suppressClickRef.current) return;
                        movingSlotId ? handleSlotClick(slot.id) : setPickerSlotId(slot.id);
                      }}
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    className="fco-squad-empty-add"
                    onClick={() => {
                      if (suppressClickRef.current) return;
                      handleSlotClick(slot.id);
                    }}
                    aria-label={`Chọn cầu thủ vị trí ${slot.pos}`}
                  >
                    <span className="fco-squad-empty-plus">+</span>
                    <span>{slot.pos}</span>
                  </button>
                )}
              </div>
            );
          })}
          </div>

          <div className="fco-squad-panel-note">
            Đã chọn {filledCount}/11 cầu thủ.
            {movingSlotId ? ' Bấm vào một vị trí khác để đổi chỗ, hoặc bấm lại icon đổi vị trí để huỷ.' : ' Kéo vị trí trên sân để tạo sơ đồ custom; thả vào vùng đã có vị trí sẽ đổi chỗ.'}
          </div>
        </div>

        <aside className="fco-squad-rail">
          <MonetizationSlot placement="squad_top" limit={1} className="fco-squad-rail-ad" />

          <section className="fco-squad-rail-panel fco-squad-rail-roster">
            <div className="fco-squad-rail-roster-head">
              <span>Pos</span>
              <span>Tên</span>
              <span className="fco-squad-rail-roster-head-fp">
                <I.Coins size={12} />
                <span>Lương</span>
              </span>
              <span>OVR</span>
              <span>Grade</span>
            </div>
            <div className="fco-squad-rail-roster-list">
              {rosterSlots.map((slot) => {
                const player = bySlotId[slot.id];
                if (!player) {
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      className="fco-squad-rail-roster-row is-empty"
                      onClick={() => handleSlotClick(slot.id)}
                      aria-label={`Chọn cầu thủ vị trí ${slot.pos}`}
                    >
                      <span className="fco-squad-rail-roster-pos"><PosPill pos={slot.pos} faded /></span>
                      <span className="fco-squad-rail-roster-name is-empty">Thêm cầu thủ</span>
                      <span className="fco-squad-rail-roster-fp">—</span>
                      <span className="fco-squad-rail-roster-ovr">—</span>
                      <span className="fco-squad-rail-roster-grade is-add">Thêm</span>
                    </button>
                  );
                }
                const bonus = getPlayerSquadBonus(squadBonuses.perPlayer, player);
                const boostedOvr = getSlotDisplayOvr(slot, player, squadBonuses.perPlayer, liveOvrBonusBySlot);
                return (
                  <div
                    key={slot.id}
                    role="button"
                    tabIndex={0}
                    className="fco-squad-rail-roster-row"
                    onClick={() => openEditModal(slot.id)}
                    onKeyDown={(event) => handleRosterEditKey(event, slot.id)}
                    aria-label={`Chỉnh cầu thủ ${player.name} vị trí ${slot.pos}`}
                  >
                    <span className="fco-squad-rail-roster-pos"><PosPill pos={slot.pos} /></span>
                    <span className="fco-squad-rail-roster-name">{player.name}</span>
                    <span className="fco-squad-rail-roster-fp fco-num">{Number(player.salary) || 0}</span>
                    <span className="fco-squad-rail-roster-ovr fco-num">{boostedOvr}</span>
                    <span className="fco-squad-rail-roster-grade">
                      <TeamGradePopover minimal value={player.upgradeLevel} onChange={(level) => changeLevel(slot.id, level)} />
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <MonetizationSlot placement="squad_bottom" limit={1} className="fco-squad-rail-ad" />
        </aside>
      </div>

      {pickerSlotId && (
        <PlayerPickerFiltered
          title={`Chọn cầu thủ · ${activePickerSlot?.pos || ''}`}
          allowLevelSelect
          defaultLevel={teamGrade}
          posGroups={getPickerPosGroupsForSlot(activePickerSlot?.pos)}
          existing={existingKeys}
          onAdd={handleAddPlayer}
          onClose={() => setPickerSlotId(null)}
        />
      )}

      {activeEditPlayer && activeEditSlot && (
        <div className="fco-modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeEditModal(); }}>
          <div className="fco-modal player-edit-modal">
            <div className="fco-modal-head">
              <div>
                <div className="fco-modal-title">Chỉnh cầu thủ · {activeEditSlot.pos}</div>
                <div className="fco-modal-subtitle">Đổi grade, mùa thẻ hoặc xoá riêng cầu thủ này.</div>
              </div>
              <button className="player-edit-close" onClick={closeEditModal} aria-label="Đóng">
                <I.X size={18} />
              </button>
            </div>

            <div className="player-edit-body">
              <div className="player-edit-current">
                <PlayerAvatar player={activeEditPlayer} size={48} />
                <div className="player-edit-info">
                  <div className="player-edit-name">{activeEditPlayer.name}</div>
                  <div className="player-edit-meta">
                    <SeasonChip code={activeEditPlayer.season} img={activeEditPlayer.seasonImg} />
                    <PosPill pos={activeEditPlayer.primaryPos} />
                    <span className="player-edit-ovr">OVR {activeEditPlayer.ovr}</span>
                  </div>
                </div>
              </div>

              <div className="player-edit-grade-block">
                <div className="player-edit-label">Grade</div>
                <div className="player-edit-grade-grid">
                  {EDIT_GRADE_LEVELS.map(level => {
                    const active = level === normalizeSquadGrade(activeEditPlayer.upgradeLevel);
                    return (
                      <button
                        key={level}
                        type="button"
                        className={`player-edit-grade-btn${active ? ' active' : ''}`}
                        onClick={() => changeLevel(editSlotId, level)}
                        aria-label={`Chọn thẻ +${level}`}
                        aria-pressed={active}
                      >
                        <LevelBadge level={level} scale={0.30} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="player-edit-actions">
                <Button
                  variant="default"
                  icon={I.Search}
                  onClick={() => openReplacePicker(editSlotId)}
                  full
                >
                  Tìm / đổi mùa thẻ
                </Button>
                <Button
                  variant="outline"
                  danger
                  icon={I.X}
                  onClick={() => removeFromSlot(editSlotId)}
                  full
                >
                  Xoá khỏi đội hình
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
