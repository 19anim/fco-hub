import { useState, useEffect } from 'react';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import SquadPitchEditor from '../components/SquadPitchEditor.jsx';
import { fetchSquadShare } from '../api.js';
import * as I from '../Icons.jsx';

const MODE_LABELS = { da_tay: 'Đá Tay', glxh: 'GLXH' };

function conditionDisplayLabel(variant) {
  if (variant.conditionType === 'leading') return `Đang dẫn ${variant.conditionThreshold ?? 1} bàn`;
  if (variant.conditionType === 'losing') return `Đang thua ${variant.conditionThreshold ?? 1} bàn`;
  if (variant.conditionType === 'drawing') return 'Mặc định - Hòa';
  return variant.conditionLabel || 'Mặc định - Hòa';
}

export default function SquadSharingView({ id, onBack }) {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeVariantKey, setActiveVariantKey] = useState(null);

  useDocumentMeta({
    title: share?.label ? `Đội hình · ${share.label}` : 'Đội hình chia sẻ',
    description: 'Xem đội hình FCOnline được chia sẻ theo tình huống tỷ số.',
    path: `/squad-sharing/${id || ''}`,
  });

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchSquadShare(id)
      .then((data) => {
        if (cancelled) return;
        setShare(data);
        setActiveVariantKey(data?.variants?.[0]?.key || null);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div className="fco-squad-view fco-squad-share-loading">
        <I.Spinner size={20} className="fco-spin" />
      </div>
    );
  }

  if (error || !share) {
    return (
      <div className="fco-squad-view">
        <div className="fco-up-machine-head">
          <div>
            <h2 className="fco-h2">Không tìm thấy đội hình</h2>
            <p className="fco-sub">Liên kết chia sẻ có thể đã bị xoá hoặc không tồn tại.</p>
          </div>
        </div>
      </div>
    );
  }

  const activeVariant = share.variants.find((v) => v.key === activeVariantKey) || share.variants[0];

  return (
    <div className="fco-squad-view">
      <div className="fco-up-machine-head">
        <div>
          {onBack && (
            <button type="button" className="fco-squad-share-back" onClick={onBack}>
              <I.ArrowLeft size={14} /> Tất cả đội hình
            </button>
          )}
          <h2 className="fco-h2">{share.label || 'Đội hình chia sẻ'}</h2>
          <p className="fco-sub">
            {MODE_LABELS[share.mode] || share.mode}
            {share.managerName ? ` · HLV ${share.managerName}` : ''}
            {share.tacticName ? ` · ${share.tacticName}` : ''}
          </p>
        </div>
      </div>

      {share.description && (
        <p className="fco-squad-share-description">{share.description}</p>
      )}

      <div className="fco-squad-share-variants-bar">
        {share.variants.map((v) => (
          <button
            key={v.key}
            type="button"
            className={`fco-squad-share-variant-tab${activeVariant?.key === v.key ? ' active' : ''}`}
            onClick={() => setActiveVariantKey(v.key)}
          >
            {conditionDisplayLabel(v)}
          </button>
        ))}
      </div>

      {activeVariant && (
        <SquadPitchEditor
          key={activeVariant.key}
          squad={{ formationId: activeVariant.formationId, bySlotId: activeVariant.bySlotId || {}, customSlots: activeVariant.customSlots }}
          onChange={() => {}}
          readOnly
          pitchColor={share.pitchColor || null}
        />
      )}
    </div>
  );
}
