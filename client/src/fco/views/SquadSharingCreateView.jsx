import { useState } from 'react';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import SquadPitchEditor from '../components/SquadPitchEditor.jsx';
import { Button } from '../ui.jsx';
import * as I from '../Icons.jsx';
import { DEFAULT_FORMATION_ID } from '../squadHelpers.js';
import { MANAGERS, TACTICS } from '../managerTacticCatalog.js';
import { createSquadShare } from '../api.js';

const CONDITION_TYPES = [
  { type: 'drawing', label: 'Mặc định - Hòa', needsThreshold: false, required: true },
  { type: 'leading', label: 'Đang dẫn', needsThreshold: true, required: false },
  { type: 'losing', label: 'Đang thua', needsThreshold: true, required: false },
];

const REQUIRED_CONDITION_TYPE = 'drawing';

function emptySquad() {
  return { formationId: DEFAULT_FORMATION_ID, bySlotId: {}, customSlots: null };
}

function makeVariant(conditionType, seedSquad) {
  const meta = CONDITION_TYPES.find((c) => c.type === conditionType) || CONDITION_TYPES[0];
  return {
    key: conditionType,
    conditionType,
    conditionLabel: meta.label,
    conditionThreshold: meta.needsThreshold ? 1 : null,
    formationId: seedSquad.formationId,
    bySlotId: seedSquad.bySlotId,
    customSlots: seedSquad.customSlots,
  };
}

export default function SquadSharingCreateView({ onShared }) {
  useDocumentMeta({
    title: 'Chia sẻ đội hình',
    description: 'Chia sẻ đội hình FCOnline theo tình huống tỷ số, kèm HLV và chiến thuật.',
    path: '/squad-sharing/new',
  });

  const [label, setLabel] = useState('');
  const [mode, setMode] = useState('da_tay');
  const [managerId, setManagerId] = useState('');
  const [tacticId, setTacticId] = useState('');
  const [description, setDescription] = useState('');
  const [pitchColor, setPitchColor] = useState('#1f8a4c');
  const [variants, setVariants] = useState(() => [makeVariant(REQUIRED_CONDITION_TYPE, emptySquad())]);
  const [activeVariantKey, setActiveVariantKey] = useState(REQUIRED_CONDITION_TYPE);
  const [isSharing, setIsSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [shareResult, setShareResult] = useState(null);

  const activeVariant = variants.find((v) => v.key === activeVariantKey) || variants[0];

  function updateVariant(key, patch) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }

  function handlePitchChange(nextSquad) {
    updateVariant(activeVariant.key, {
      formationId: nextSquad.formationId,
      bySlotId: nextSquad.bySlotId,
      customSlots: nextSquad.customSlots,
    });
  }

  function toggleVariant(conditionType) {
    const meta = CONDITION_TYPES.find((c) => c.type === conditionType);
    if (!meta || meta.required) {
      setActiveVariantKey(REQUIRED_CONDITION_TYPE);
      return;
    }

    const existing = variants.find((v) => v.conditionType === conditionType);
    if (existing) {
      setVariants((prev) => prev.filter((v) => v.conditionType !== conditionType));
      if (activeVariantKey === existing.key) setActiveVariantKey(REQUIRED_CONDITION_TYPE);
      return;
    }

    const seed = activeVariant
      ? { formationId: activeVariant.formationId, bySlotId: activeVariant.bySlotId, customSlots: activeVariant.customSlots }
      : emptySquad();
    const next = makeVariant(conditionType, seed);
    setVariants((prev) => [...prev, next]);
    setActiveVariantKey(next.key);
  }

  async function handleShare() {
    setIsSharing(true);
    setShareError('');
    try {
      const manager = MANAGERS.find((m) => m.id === managerId);
      const tactic = TACTICS.find((t) => t.id === tacticId);
      const payload = {
        label,
        mode,
        managerName: manager?.name || '',
        tacticName: tactic?.name || '',
        description,
        pitchColor,
        variants: CONDITION_TYPES
          .map((condition) => variants.find((v) => v.conditionType === condition.type))
          .filter(Boolean)
          .map(({ key, conditionType, conditionLabel, conditionThreshold, formationId, bySlotId, customSlots }) => ({
            key, conditionType, conditionLabel, conditionThreshold, formationId, bySlotId, customSlots,
          })),
      };
      const created = await createSquadShare(payload);
      setShareResult(created);
      onShared?.(created._id);
    } catch (err) {
      setShareError('Không thể chia sẻ đội hình. Vui lòng thử lại.');
    } finally {
      setIsSharing(false);
    }
  }

  if (shareResult) {
    const shareUrl = `${window.location.origin}/squad-sharing/${shareResult._id}`;
    return (
      <div className="fco-squad-view">
        <div className="fco-up-machine-head">
          <div>
            <h2 className="fco-h2">Đã chia sẻ đội hình</h2>
            <p className="fco-sub">Gửi liên kết dưới đây cho đồng đội của bạn.</p>
          </div>
        </div>
        <div className="fco-squad-share-result">
          <input readOnly value={shareUrl} onFocus={(e) => e.target.select()} className="fco-squad-share-link-input" />
          <Button variant="default" icon={I.Check} onClick={() => navigator.clipboard?.writeText(shareUrl)}>
            Sao chép liên kết
          </Button>
          <Button variant="ghost" onClick={() => window.location.assign(`/squad-sharing/${shareResult._id}`)}>
            Xem trang chia sẻ
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fco-squad-view">
      <div className="fco-up-machine-head">
        <div>
          <h2 className="fco-h2">Chia sẻ đội hình</h2>
          <p className="fco-sub">Thiết lập HLV, chiến thuật và các đội hình theo tỷ số trận đấu.</p>
        </div>
        <div className="fco-squad-share-cta-wrap">
          <Button
            variant="primary"
            icon={I.Share}
            onClick={handleShare}
            disabled={isSharing}
          >
            {isSharing ? 'Đang chia sẻ...' : 'Chia sẻ đội hình'}
          </Button>
        </div>
      </div>

      {shareError && <div className="fco-squad-share-error">{shareError}</div>}

      <div className="fco-squad-share-form">
        <label className="fco-squad-share-field">
          <span>Tên đội hình</span>
          <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="VD: Đội hình phòng ngự" />
        </label>

        <label className="fco-squad-share-field">
          <span>Chế độ</span>
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="da_tay">Đá Tay</option>
            <option value="glxh">GLXH</option>
          </select>
        </label>

        <label className="fco-squad-share-field">
          <span>HLV</span>
          <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
            <option value="">Chọn HLV</option>
            {MANAGERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>

        <label className="fco-squad-share-field">
          <span>Chiến thuật</span>
          <select value={tacticId} onChange={(e) => setTacticId(e.target.value)}>
            <option value="">Chọn chiến thuật</option>
            {TACTICS.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>

        <label className="fco-squad-share-field fco-squad-share-field--color">
          <span>Màu sân</span>
          <div className="fco-squad-share-color-picker">
            <input type="color" value={pitchColor} onChange={(e) => setPitchColor(e.target.value)} />
            <span className="fco-squad-share-color-value">{pitchColor}</span>
          </div>
        </label>
      </div>

      <label className="fco-squad-share-field fco-squad-share-field--wide">
        <span>Ghi chú đội hình</span>
        <textarea
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Mô tả cách chơi, lưu ý khi dùng đội hình này..."
          maxLength={2000}
        />
      </label>

      <div className="fco-squad-share-variants-count">
        Đội hình đã thêm: <strong>{variants.length}</strong>/{CONDITION_TYPES.length}
      </div>
      <div className="fco-squad-share-variants-bar" role="group" aria-label="Tuỳ chọn đội hình theo tỷ số">
        {CONDITION_TYPES.map((condition) => {
          const variant = variants.find((v) => v.conditionType === condition.type);
          const selected = Boolean(variant);
          const active = activeVariantKey === (variant?.key || condition.type);
          return (
            <button
              key={condition.type}
              type="button"
              className={`fco-squad-share-variant-tab${active ? ' active' : ''}${selected ? ' selected' : ''}`}
              onClick={() => {
                if (selected) setActiveVariantKey(variant.key);
                else toggleVariant(condition.type);
              }}
              aria-pressed={selected}
            >
              {!condition.required && !selected && (
                <>
                  <I.Plus size={14} strokeWidth={2.75} className="fco-squad-share-variant-add-icon" />
                  <span className="fco-squad-share-variant-add-text">Thêm đội hình khi</span>
                </>
              )}
              <span>{condition.label}</span>
              {condition.required && <span className="fco-squad-share-variant-required">Bắt buộc</span>}
              {!condition.required && selected && (
                <span
                  role="button"
                  tabIndex={0}
                  className="fco-squad-share-variant-remove"
                  onClick={(e) => { e.stopPropagation(); toggleVariant(condition.type); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleVariant(condition.type);
                    }
                  }}
                  aria-label={`Bỏ chọn ${condition.label}`}
                >
                  <I.X size={13} />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeVariant && (
        <div className="fco-squad-share-active-helper">
          Đang chỉnh: <strong>{activeVariant.conditionLabel}</strong>
        </div>
      )}

      {activeVariant && CONDITION_TYPES.find((c) => c.type === activeVariant.conditionType)?.needsThreshold && (
        <label className="fco-squad-share-field fco-squad-share-threshold">
          <span>{activeVariant.conditionType === 'losing' ? 'Thua từ bao nhiêu bàn' : 'Dẫn từ bao nhiêu bàn'}</span>
          <input
            type="number"
            min={1}
            value={activeVariant.conditionThreshold ?? 1}
            onChange={(e) => updateVariant(activeVariant.key, { conditionThreshold: Math.max(1, Number(e.target.value) || 1) })}
          />
        </label>
      )}

      {activeVariant && (
        <SquadPitchEditor
          key={activeVariant.key}
          squad={{ formationId: activeVariant.formationId, bySlotId: activeVariant.bySlotId, customSlots: activeVariant.customSlots }}
          onChange={handlePitchChange}
          showQuickGrade={false}
          pitchColor={pitchColor}
        />
      )}

    </div>
  );
}
