import { useState, useMemo, useRef } from 'react';
import PlayerPicker from '../components/PlayerPicker.jsx';
import LevelSelect from '../components/LevelSelect.jsx';
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
import { computeSquadBonuses, getPlayerSquadBonus, applySquadBonus } from '../teamColor.js';
import { getPlayerCardKey, normalizeUpgradeLevel } from '../upgradeHelpers.js';
import { Button, IconButton, PlayerCardMini } from '../ui.jsx';
import * as I from '../Icons.jsx';

const QUICK_LEVELS = [1, 5, 8, 10, 13];
const DRAG_BOUNDS = { left: 5, right: 95, top: 10 };

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function getRoleFromPosition(x, y, slots) {
  const nonGkSlots = slots.filter((slot) => slot.pos !== 'GK');
  let best = nonGkSlots[0]?.pos || 'CM';
  let bestDistance = Infinity;
  nonGkSlots.forEach((slot) => {
    const dx = x - slot.x;
    const dy = y - slot.y;
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = slot.pos;
    }
  });
  return best;
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

export default function SquadView() {
  const [squad, setSquad] = useState(() => loadSquad());
  const [pickerSlotId, setPickerSlotId] = useState(null);
  const [movingSlotId, setMovingSlotId] = useState(null);
  const [dragSlotId, setDragSlotId] = useState(null);
  const [dragOverSlotId, setDragOverSlotId] = useState(null);
  const [layoutDrag, setLayoutDrag] = useState(null);
  const pitchRef = useRef(null);
  const layoutDragRef = useRef(null);
  const suppressClickRef = useRef(false);

  const { formationId, bySlotId } = squad;
  const slots = useMemo(() => getActiveSquadSlots(squad), [squad]);

  const starters = useMemo(() => getStartersFromSquad(bySlotId, slots), [bySlotId, slots]);
  const squadBonuses = useMemo(() => computeSquadBonuses(starters), [starters]);
  const filledCount = starters.length;

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
  }

  function removeFromSlot(slotId) {
    persist(clearSlot(bySlotId, slotId));
  }

  function clearSquad() {
    persistSquad({ formationId, bySlotId: {}, customSlots: squad.customSlots || null });
    setMovingSlotId(null);
    setDragOverSlotId(null);
  }

  function changeLevel(slotId, level) {
    persist(updateSquadPlayerLevel(bySlotId, slotId, level));
  }

  function stepLevel(slotId, delta) {
    const player = bySlotId[slotId];
    if (!player) return;
    changeLevel(slotId, normalizeUpgradeLevel(player.upgradeLevel) + delta);
  }

  function applyQuickLevel(level) {
    let next = { ...bySlotId };
    Object.keys(next).forEach((slotId) => {
      next = updateSquadPlayerLevel(next, slotId, level);
    });
    persist(next);
  }

  function handleSlotClick(slotId) {
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
    const gkSlot = dragState.baseSlots.find((slot) => slot.pos === 'GK');
    const maxY = (gkSlot?.y || 88.5) - 0.1;
    const x = clamp(dragState.initialSlot.x + dx, DRAG_BOUNDS.left, DRAG_BOUNDS.right);
    const y = clamp(dragState.initialSlot.y + dy, DRAG_BOUNDS.top, maxY);
    const pos = getRoleFromPosition(x, y, dragState.baseSlots);
    const nextSlots = dragState.baseSlots.map((slot) => (
      slot.id === dragState.slotId ? { ...slot, x, y, pos } : slot
    ));
    return { ...dragState, currentSlots: nextSlots, currentPos: pos, x, y, moved: true };
  }

  function handleSlotPointerDown(slot, event) {
    if (event.button !== 0 || slot.pos === 'GK') return;
    if (event.target.closest('button') && !event.target.closest('.fco-player-card-mini') && !event.target.closest('.fco-squad-empty')) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
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
    };
    layoutDragRef.current = nextDrag;
    setLayoutDrag(nextDrag);
    setDragSlotId(slot.id);
  }

  function handleSlotPointerMove(event) {
    const nextDrag = getLayoutDragUpdate(event);
    if (!nextDrag) return;
    layoutDragRef.current = nextDrag;
    setLayoutDrag(nextDrag);
  }

  function handleSlotPointerUp(event) {
    const nextDrag = getLayoutDragUpdate(event) || layoutDragRef.current;
    if (!nextDrag) { clearDragState(); return; }
    event.currentTarget.releasePointerCapture?.(nextDrag.pointerId);
    if (!nextDrag.moved) { clearDragState(); return; }
    suppressClickRef.current = true;
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
    const swappedSlots = swapSlotLayouts(nextDrag.currentSlots, nextDrag.slotId, nextDrag.currentPos, nextDrag.initialSlot);
    persist(bySlotId, swappedSlots);
    clearDragState();
  }

  const visibleSlots = layoutDrag?.currentSlots || slots;

  const existingKeys = Object.values(bySlotId).map((player) => getPlayerCardKey(player));
  const activePickerSlot = visibleSlots.find((s) => s.id === pickerSlotId) || null;

  return (
    <div className="fco-squad-view">
      <div className="fco-up-machine-head">
        <div>
          <h2 className="fco-h2">Xây dựng đội hình</h2>
          <p className="fco-sub">Chọn 11 cầu thủ đá chính, kéo thả để đổi vị trí và xem team color được kích hoạt.</p>
        </div>
      </div>

      <div className="fco-squad-toolbar">
        <div className="fco-squad-toolbar-group">
          <span className="fco-squad-toolbar-label">Sơ đồ{squad.customSlots ? ' · Custom' : ''}</span>
          <div className="fco-squad-formations">
            {FORMATION_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`fco-squad-formation-btn${opt.id === formationId ? ' active' : ''}`}
                onClick={() => handleChangeFormation(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {filledCount > 0 && (
          <div className="fco-squad-toolbar-group">
            <span className="fco-squad-toolbar-label">Cấp nhanh cả đội</span>
            <div className="fco-squad-formations">
              {QUICK_LEVELS.map((lv) => (
                <button
                  key={lv}
                  type="button"
                  className="fco-squad-formation-btn"
                  onClick={() => applyQuickLevel(lv)}
                >
                  +{lv}
                </button>
              ))}
            </div>
          </div>
        )}

        {filledCount > 0 && (
          <Button variant="ghost" size="sm" icon={I.Refresh} onClick={clearSquad}>
            Xoá đội hình
          </Button>
        )}
      </div>

      <div className="fco-squad-layout">
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
          {visibleSlots.map((slot) => {
            const player = bySlotId[slot.id];
            const bonus = getPlayerSquadBonus(squadBonuses.perPlayer, player);
            const boosted = applySquadBonus(player, bonus);
            const isMovingSource = movingSlotId === slot.id;
            const isMoveTarget = movingSlotId && movingSlotId !== slot.id;
            const isDropTarget = dragSlotId && dragSlotId !== slot.id;
            const isDragOver = dragOverSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={`fco-squad-slot${isDropTarget ? ' drop-target' : ''}${isDragOver ? ' drag-over' : ''}${layoutDrag?.slotId === slot.id ? ' layout-dragging' : ''}`}
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
                        icon={I.ArrowUpDown}
                        label="Đổi vị trí"
                        size={12}
                        active={isMovingSource}
                        onClick={() => setMovingSlotId(isMovingSource ? null : slot.id)}
                      />
                      <IconButton
                        icon={I.X}
                        label="Xoá cầu thủ"
                        size={12}
                        onClick={() => removeFromSlot(slot.id)}
                      />
                    </div>

                    <PlayerCardMini
                      player={player}
                      slotPos={slot.pos}
                      ovr={boosted.ovr}
                      bonus={bonus}
                      level={player.upgradeLevel}
                      onClick={() => {
                        if (suppressClickRef.current) return;
                        movingSlotId ? handleSlotClick(slot.id) : setPickerSlotId(slot.id);
                      }}
                    />

                    <div className="fco-squad-cardlevel">
                      <IconButton icon={I.Minus} label="Giảm cấp" size={11} onClick={() => stepLevel(slot.id, -1)} />
                      <LevelSelect
                        value={normalizeUpgradeLevel(player.upgradeLevel)}
                        onChange={(lv) => changeLevel(slot.id, lv)}
                        scale={0.16}
                      />
                      <IconButton icon={I.Plus} label="Tăng cấp" size={11} onClick={() => stepLevel(slot.id, 1)} />
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`fco-squad-empty${isMoveTarget ? ' move-target' : ''}${isDragOver ? ' drag-over' : ''}`}
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

        <div className="fco-squad-panels">
          <div className="fco-squad-panel">
            <div className="fco-squad-panel-title">Team color đội</div>
            {squadBonuses.club.groups.length === 0 ? (
              <div className="fco-squad-panel-empty">Chưa có nhóm nào đạt tối thiểu 3 cầu thủ.</div>
            ) : (
              <div className="fco-squad-panel-list">
                {squadBonuses.club.groups.map((group) => (
                  <div key={`${group.kind}:${group.name}`} className="fco-squad-panel-row">
                    <div>
                      <div className="fco-squad-panel-name">{group.name}</div>
                      <div className="fco-squad-panel-sub">{group.kindLabel} · {group.count} cầu thủ</div>
                    </div>
                    <div className="fco-squad-panel-buff">+{group.buff?.up || 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fco-squad-panel">
            <div className="fco-squad-panel-title">Team color nâng cấp</div>
            {squadBonuses.upgrade.tiers.length === 0 ? (
              <div className="fco-squad-panel-empty">Chưa có tier nâng cấp nào đạt tối thiểu 5 cầu thủ.</div>
            ) : (
              <div className="fco-squad-panel-list">
                {squadBonuses.upgrade.tiers.map((tier) => (
                  <div key={tier.key} className="fco-squad-panel-row">
                    <div>
                      <div className="fco-squad-panel-name" style={{ color: tier.color }}>{tier.label}</div>
                      <div className="fco-squad-panel-sub">+{tier.min}~+{tier.max} · {tier.count} cầu thủ</div>
                    </div>
                    <div className="fco-squad-panel-buff">+{tier.buff?.up || 0}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="fco-squad-panel-note">
            Đã chọn {filledCount}/11 cầu thủ.
            {movingSlotId ? ' Bấm vào một vị trí khác để đổi chỗ, hoặc bấm lại icon đổi vị trí để huỷ.' : ' Kéo vị trí trên sân để tạo sơ đồ custom; thả vào vùng đã có vị trí sẽ đổi chỗ.'}
          </div>
        </div>
      </div>

      {pickerSlotId && (
        <PlayerPicker
          title={`Chọn cầu thủ · ${activePickerSlot?.pos || ''}`}
          allowLevelSelect
          showTopPlayers
          posGroups={getPickerPosGroupsForSlot(activePickerSlot?.pos)}
          existing={existingKeys}
          onAdd={handleAddPlayer}
          onClose={() => setPickerSlotId(null)}
        />
      )}
    </div>
  );
}
