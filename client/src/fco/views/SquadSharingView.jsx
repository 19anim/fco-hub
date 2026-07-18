import { useState, useEffect } from 'react';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import SquadPitchEditor from '../components/SquadPitchEditor.jsx';
import { deleteSquadShare, fetchSquadShare } from '../api.js';
import * as I from '../Icons.jsx';
import { Button } from '../ui.jsx';
import MonetizationSlot from '../../components/monetization/MonetizationSlot.jsx';
import AdSenseUnit from '../../components/monetization/AdSenseUnit.jsx';

const MODE_LABELS = { da_tay: 'Đá Tay', glxh: 'GLXH' };

function conditionDisplayLabel(variant) {
  if (variant.conditionType === 'leading') return `Đang dẫn ${variant.conditionThreshold ?? 1} bàn`;
  if (variant.conditionType === 'losing') return `Đang thua ${variant.conditionThreshold ?? 1} bàn`;
  if (variant.conditionType === 'drawing') return 'Mặc định - Hòa';
  return variant.conditionLabel || 'Mặc định - Hòa';
}

export default function SquadSharingView({
  id,
  onBack,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDeleted,
  showToast,
}) {
  const [share, setShare] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeVariantKey, setActiveVariantKey] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

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
    setDeleteError('');
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

  async function handleDelete() {
    if (!canDelete || deleting) return;
    if (!window.confirm('Xoá đội hình chia sẻ này? Hành động này không thể hoàn tác.')) return;

    setDeleting(true);
    setDeleteError('');
    try {
      await deleteSquadShare(id);
      onDeleted?.();
    } catch (err) {
      const message = err.response?.status === 403
        ? 'Bạn không có quyền xoá đội hình này.'
        : 'Không thể xoá đội hình. Vui lòng thử lại.';
      setDeleteError(message);
      showToast?.(message, 'error');
    } finally {
      setDeleting(false);
    }
  }

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
    <div className="fco-squad-share-layout">
      <aside className="fco-squad-share-adcol">
        <AdSenseUnit slotId="SQUAD_SHARING_LEFT_SLOT_ID" />
      </aside>

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
          {(canEdit || canDelete) && (
            <div className="fco-squad-share-cta-wrap">
              {canEdit && (
                <Button variant="ghost" onClick={onEdit}>
                  Chỉnh sửa
                </Button>
              )}
              {canDelete && (
                <Button variant="ghost" danger disabled={deleting} onClick={handleDelete}>
                  {deleting ? 'Đang xoá...' : 'Xoá'}
                </Button>
              )}
            </div>
          )}
        </div>

        {deleteError && <div className="fco-squad-share-error">{deleteError}</div>}

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
            railTop={<MonetizationSlot placement="squad_sharing_top" entity={{ type: 'squad_share', id }} limit={1} className="fco-squad-rail-ad" />}
            railBottom={<AdSenseUnit slotId="SQUAD_SHARING_RAIL_BOTTOM_SLOT_ID" className="fco-squad-rail-ad" />}
          />
        )}
      </div>
    </div>
  );
}
