import { useState, useEffect } from 'react';
import { useDocumentMeta } from '../../hooks/useDocumentMeta.js';
import { fetchSquadShares } from '../api.js';
import { getActiveSquadSlots, getStartersFromSquad } from '../squadHelpers.js';
import { PlayerCardMini, Button } from '../ui.jsx';
import * as I from '../Icons.jsx';

const MODE_LABELS = { da_tay: 'Đá Tay', glxh: 'GLXH' };

function getPreviewStarters(share) {
  const variant = share.variants?.[0];
  if (!variant) return [];
  const squad = { formationId: variant.formationId, bySlotId: variant.bySlotId || {}, customSlots: variant.customSlots };
  const slots = getActiveSquadSlots(squad);
  return getStartersFromSquad(squad.bySlotId, slots).slice(0, 4);
}

export default function SquadSharingListView({ onSelect, onCreate }) {
  useDocumentMeta({
    title: 'Chia sẻ đội hình',
    description: 'Khám phá các đội hình FCOnline được cộng đồng chia sẻ theo tình huống tỷ số.',
    path: '/squad-sharing',
  });

  const [shares, setShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchSquadShares()
      .then((data) => { if (!cancelled) setShares(data); })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="fco-squad-view">
      <div className="fco-up-machine-head">
        <div>
          <h2 className="fco-h2">Chia sẻ đội hình</h2>
          <p className="fco-sub">Các đội hình được chia sẻ bởi cộng đồng, kèm HLV, chiến thuật và tình huống tỷ số.</p>
        </div>
        <div className="fco-squad-share-cta-wrap">
          <Button variant="primary" icon={I.Plus} onClick={onCreate}>
            Chia sẻ đội hình
          </Button>
        </div>
      </div>

      {loading && (
        <div className="fco-squad-share-loading">
          <I.Spinner size={20} className="fco-spin" />
        </div>
      )}

      {!loading && error && (
        <p className="fco-sub">Không thể tải danh sách đội hình. Vui lòng thử lại.</p>
      )}

      {!loading && !error && shares.length === 0 && (
        <p className="fco-sub">Chưa có đội hình nào được chia sẻ. Hãy là người đầu tiên!</p>
      )}

      {!loading && !error && shares.length > 0 && (
        <div className="fco-squad-share-gallery">
          {shares.map((share) => (
            <button
              key={share._id}
              type="button"
              className="fco-squad-share-gallery-card"
              style={share.pitchColor ? { '--squad-share-card-tint': share.pitchColor } : undefined}
              onClick={() => onSelect(share._id)}
            >
              <div className="fco-squad-share-gallery-head">
                <span className="fco-squad-share-gallery-title">{share.label || 'Đội hình chia sẻ'}</span>
                <span className="fco-squad-share-gallery-mode">{MODE_LABELS[share.mode] || share.mode}</span>
              </div>
              <div className="fco-squad-share-gallery-meta">
                {share.managerName && <span>HLV {share.managerName}</span>}
                {share.tacticName && <span>{share.tacticName}</span>}
                <span>{share.variants?.length || 0} biến thể</span>
              </div>
              <div className="fco-squad-share-gallery-preview">
                {getPreviewStarters(share).map((player, i) => (
                  <div key={i} className="fco-squad-share-gallery-mini">
                    <PlayerCardMini player={player} />
                  </div>
                ))}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
