import { useState, useEffect, useMemo, useRef } from 'react';
import { fetchEvents } from '../api.js';
import { filterValidEvents, groupEvents, daysUntil, openSequentially } from '../eventHelpers.js';
import { Button, EmptyState, SkeletonRow } from '../ui.jsx';
import * as I from '../Icons.jsx';

function Countdown({ endDate }) {
  const d = daysUntil(endDate);
  if (d === null) return <span className="fco-ev-tag">Chưa rõ hạn</span>;
  const warn = d <= 3;
  const label = d <= 0 ? 'Hết hạn hôm nay' : `Còn ${d} ngày`;
  return <span className={`fco-ev-countdown${warn ? ' warn' : ''}`}>⏳ {label}</span>;
}

function EventCard({ ev, warn }) {
  const kind = ev.isSubdomain ? 'Sự kiện' : ev.isNewsPage ? 'Tin tức' : '—';
  return (
    <div className={`fco-ev-card${warn ? ' warn' : ''}`}>
      <span className="fco-ev-tag">{kind}</span>
      <div className="fco-ev-card-title">{ev.title}</div>
      <div className="fco-ev-card-meta"><I.Calendar size={13} /> {ev.dateLabel}</div>
      <Countdown endDate={ev.endDate} />
      <div className="fco-ev-card-foot">
        <Button variant="default" size="sm" iconRight={I.External}
          onClick={() => window.open(ev.launchUrl, '_blank', 'noopener')}>
          Mở
        </Button>
      </div>
    </div>
  );
}

function Group({ title, warn, events }) {
  if (!events.length) return null;
  return (
    <div className="fco-ev-group">
      <div className={`fco-ev-group-title${warn ? ' warn' : ''}`}>
        {warn ? <I.Alert size={14} /> : <I.Clock size={14} />} {title} ({events.length})
      </div>
      <div className="fco-ev-grid">
        {events.map((ev) => <EventCard key={ev.launchUrl} ev={ev} warn={warn} />)}
      </div>
    </div>
  );
}

export default function EventsView({ showToast }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [blocked, setBlocked] = useState(false);
  const cancelRef = useRef(null);

  // Async fetch core — only updates state from promise callbacks, never synchronously.
  function runFetch() {
    return fetchEvents()
      .then((raw) => { setEvents(filterValidEvents(raw)); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }

  // Retry handler: show the spinner again, then re-fetch.
  function load() {
    setLoading(true);
    setError(false);
    runFetch();
  }

  // On mount `loading` is already true and `error` already false, so no sync setState here.
  useEffect(() => {
    runFetch();
    return () => cancelRef.current?.();
  }, []);

  const groups = useMemo(() => groupEvents(events), [events]);
  const counts = useMemo(() => ({
    events: events.filter((e) => e.isSubdomain).length,
    news:   events.filter((e) => e.isNewsPage).length,
  }), [events]);

  function openMany(list, label) {
    if (!list.length) { showToast?.('Không có mục nào để mở'); return; }
    setBlocked(false);
    showToast?.(`Đang mở ${list.length} ${label}...`, 'success');
    cancelRef.current = openSequentially(
      list.map((e) => e.launchUrl),
      { onBlocked: () => { setBlocked(true); showToast?.('Popup bị chặn'); } }
    );
  }

  if (loading) {
    return (
      <div className="fco-db">
        <h2 className="fco-h2">Sự kiện</h2>
        <div className="fco-ev-grid" style={{ marginTop: 16 }}>
          {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState icon={I.Alert} title="Không tải được sự kiện"
        body="Kiểm tra kết nối tới máy chủ rồi thử lại."
        action={<Button icon={I.Refresh} onClick={load}>Thử lại</Button>}
      />
    );
  }

  if (!events.length) {
    return (
      <EmptyState icon={I.Calendar} title="Hiện không có sự kiện nào còn hiệu lực"
        action={<Button icon={I.Refresh} onClick={load}>Tải lại</Button>}
      />
    );
  }

  return (
    <div className="fco-db">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 className="fco-h2" style={{ marginBottom: 4 }}>Sự kiện FCO còn hiệu lực</h2>
          <p className="fco-sub" style={{ margin: 0 }}>
            <b>{counts.events}</b> sự kiện · <b>{counts.news}</b> tin tức
          </p>
        </div>
        <Button variant="ghost" size="sm" icon={I.Refresh} onClick={load}>Tải lại</Button>
      </div>

      <div className="fco-ev-bar">
        <Button icon={I.External} onClick={() => openMany(events, 'trang')}>
          Mở tất cả ({events.length})
        </Button>
        <Button variant="ghost" onClick={() => openMany(events.filter((e) => e.isSubdomain), 'sự kiện')}>
          Chỉ sự kiện ({counts.events})
        </Button>
        <Button variant="ghost" onClick={() => openMany(events.filter((e) => e.isNewsPage), 'tin tức')}>
          Chỉ tin tức ({counts.news})
        </Button>
      </div>

      {blocked && (
        <div className="fco-ev-banner">
          <I.Alert size={16} style={{ color: '#ff8a3d', flex: '0 0 16px' }} />
          <span>Trình duyệt đã chặn popup. Hãy cho phép popup cho trang này rồi bấm mở lại.</span>
        </div>
      )}

      <Group title="Sắp hết hạn" warn events={groups.expiring} />
      <Group title="Đang diễn ra" events={groups.ongoing} />
      <Group title="Chưa rõ hạn" events={groups.unknown} />
    </div>
  );
}
