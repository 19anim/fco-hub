import { useState, useMemo } from 'react';
import PlayerPicker from '../components/PlayerPicker.jsx';
import LevelSelect from '../components/LevelSelect.jsx';
import {
  FORMATION_OPTIONS,
  getFormationSlots,
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

export default function SquadView() {
  const [squad, setSquad] = useState(() => loadSquad());
  const [pickerSlotId, setPickerSlotId] = useState(null);
  const [movingSlotId, setMovingSlotId] = useState(null);
  const [dragSlotId, setDragSlotId] = useState(null);
  const [dragOverSlotId, setDragOverSlotId] = useState(null);

  const { formationId, bySlotId } = squad;
  const slots = useMemo(() => getFormationSlots(formationId), [formationId]);

  const starters = useMemo(() => getStartersFromSquad(bySlotId, slots), [bySlotId, slots]);
  const squadBonuses = useMemo(() => computeSquadBonuses(starters), [starters]);
  const filledCount = starters.length;

  function persist(nextBySlotId) {
    const next = { formationId, bySlotId: nextBySlotId };
    setSquad(next);
    saveSquad(next);
  }

  function handleChangeFormation(nextFormationId) {
    if (nextFormationId === formationId) return;
    const nextSlots = getFormationSlots(nextFormationId);
    const nextBySlotId = mapSquadToFormation(bySlotId, slots, nextSlots);
    const next = { formationId: nextFormationId, bySlotId: nextBySlotId };
    setSquad(next);
    saveSquad(next);
    setMovingSlotId(null);
    setDragOverSlotId(null);
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
    const next = { formationId, bySlotId: {} };
    setSquad(next);
    saveSquad(next);
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
  }

  function handleDragStart(slotId, e) {
    if (!bySlotId[slotId]) { e.preventDefault(); return; }
    setDragSlotId(slotId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', slotId);
  }

  function handleDragOver(slotId, e) {
    if (!dragSlotId || dragSlotId === slotId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlotId(slotId);
  }

  function handleDragLeave(slotId, e) {
    if (!e.currentTarget.contains(e.relatedTarget) && dragOverSlotId === slotId) {
      setDragOverSlotId(null);
    }
  }

  function handleDrop(slotId, e) {
    e.preventDefault();
    const fromSlotId = dragSlotId || e.dataTransfer.getData('text/plain');
    if (!fromSlotId || fromSlotId === slotId) { clearDragState(); return; }
    const targetOccupied = Boolean(bySlotId[slotId]);
    persist(targetOccupied ? swapSquadSlots(bySlotId, fromSlotId, slotId) : movePlayerToSlot(bySlotId, fromSlotId, slotId));
    clearDragState();
  }

  const existingKeys = Object.values(bySlotId).map((player) => getPlayerCardKey(player));
  const activePickerSlot = slots.find((s) => s.id === pickerSlotId) || null;

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
          <span className="fco-squad-toolbar-label">Sơ đồ</span>
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
        <div className="fco-squad-pitch">
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
          {slots.map((slot) => {
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
                className={`fco-squad-slot${isDropTarget ? ' drop-target' : ''}${isDragOver ? ' drag-over' : ''}`}
                style={{ left: `${slot.x}%`, top: `${slot.y}%` }}
                onDragEnter={(e) => handleDragOver(slot.id, e)}
                onDragOver={(e) => handleDragOver(slot.id, e)}
                onDragLeave={(e) => handleDragLeave(slot.id, e)}
                onDrop={(e) => handleDrop(slot.id, e)}
              >
                {player ? (
                  <div
                    className={`fco-squad-card${isMovingSource ? ' moving' : ''}${isMoveTarget ? ' move-target' : ''}${dragSlotId === slot.id ? ' dragging' : ''}`}
                    draggable
                    onDragStart={(e) => handleDragStart(slot.id, e)}
                    onDragEnd={clearDragState}
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
                      onClick={() => (movingSlotId ? handleSlotClick(slot.id) : setPickerSlotId(slot.id))}
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
                    onClick={() => handleSlotClick(slot.id)}
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
            {movingSlotId ? ' Bấm vào một vị trí khác để đổi chỗ, hoặc bấm lại icon đổi vị trí để huỷ.' : ' Bấm icon đổi vị trí trên thẻ hoặc kéo thả để hoán đổi.'}
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
