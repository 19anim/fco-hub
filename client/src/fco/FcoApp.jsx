import { useState, useEffect } from 'react';
import './fco.css';
import { LS_KEY } from './constants.js';
import DatabaseView from './views/DatabaseView.jsx';
import EventsView from './views/EventsView.jsx';
import UpgradeView from './views/UpgradeView.jsx';
import DetailView from './views/DetailView.jsx';
import CompareView from './views/CompareView.jsx';
import WatchlistView from './views/WatchlistView.jsx';
import DataOpsView from './views/DataOpsView.jsx';
import * as I from './Icons.jsx';

const NAV_ITEMS = [
  { id: 'db',        label: 'Database',   icon: I.Database  },
  { id: 'events',    label: 'Sự kiện',    icon: I.Calendar  },
  { id: 'upgrade',   label: 'Nâng cấp',   icon: I.Zap       },
  { id: 'compare',   label: 'So sánh',    icon: I.Compare   },
  { id: 'watchlist', label: 'Theo dõi',   icon: I.Star      },
];
const ADMIN_ITEMS = [
  { id: 'dataops', label: 'Data Ops', icon: I.Hammer },
];

// ── Hash router ───────────────────────────────────────────────────────────────
// URL format:  #/<view>/<param>
// Query string (?search=...) lives in the REAL URL search, NOT inside the hash.
// This way parseHash never collides with filter params.
//
// Examples:
//   /#/db                    → list view (filter params in ?search=messi&pos=FWD)
//   /#/detail/abc123         → player detail
//   /#/compare               → compare view
//   /#/watchlist             → watchlist
//   /#/dataops               → admin data ops

function parseHash(hash = window.location.hash) {
  // Strip leading #/ or #
  const path = hash.replace(/^#\/?/, '').split('?')[0] || 'db';
  const parts = path.split('/').filter(Boolean);
  const view  = parts[0] || 'db';
  const param = parts.slice(1).join('/') || null;
  return { view, param };
}

function routeUrl(view, param = null, { keepSearch = false } = {}) {
  const hash = param ? `#/${view}/${encodeURIComponent(param)}` : `#/${view}`;
  const search = keepSearch ? window.location.search : '';
  return `${window.location.pathname}${search}${hash}`;
}

function setHash(view, param = null) {
  const keepSearch = view === 'db';
  const next = routeUrl(view, param, { keepSearch });
  const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (current !== next) {
    window.history.pushState(null, '', next);
  }
}

function replaceHash(view, param = null) {
  window.history.replaceState(null, '', routeUrl(view, param, { keepSearch: view === 'db' }));
}

// ── Persisted state ───────────────────────────────────────────────────────────
function loadPersisted() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch { return {}; }
}
function savePersisted(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function FcoApp() {
  const persisted = loadPersisted();

  const [route,      setRoute]      = useState(() => parseHash());
  const [role,       setRole]       = useState(persisted.role || 'viewer');
  const [watch,      setWatch]      = useState(persisted.watch || []);
  const [compareIds, setCompareIds] = useState(persisted.compareIds || []);
  const [toast,      setToast]      = useState(null);

  // Listen to browser back/forward
  useEffect(() => {
    function onPop() { setRoute(parseHash()); }
    window.addEventListener('popstate', onPop);
    // Set canonical initial URL if bare
    if (!window.location.hash) replaceHash('db');
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Persist role/watch/compare
  useEffect(() => { savePersisted({ role, watch, compareIds }); }, [role, watch, compareIds]);

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  function showToast(msg, variant = 'info') { setToast({ msg, variant }); }

  function navigate(view, param = null) {
    setHash(view, param);
    setRoute({ view, param });
  }

  function toggleWatch(id) {
    setWatch(prev => {
      if (prev.includes(id)) {
        showToast('Đã xoá khỏi danh sách theo dõi');
        return prev.filter(x => x !== id);
      }
      showToast('Đã thêm vào danh sách theo dõi', 'success');
      return [...prev, id];
    });
  }

  function selectPlayer(id) { navigate('detail', id); }

  function goBack() {
    window.history.back();
  }

  function addToCompare(id) {
    setCompareIds(prev => prev.includes(id) ? prev : [...prev, id].slice(0, 4));
    navigate('compare');
    showToast('Đã thêm vào so sánh', 'success');
  }

  const { view, param } = route;
  // Decode param in case it was encoded
  const decodedParam = param ? decodeURIComponent(param) : null;
  const activeView = (view === 'detail' && decodedParam) ? 'detail' : (view || 'db');
  const navItems = role === 'admin' ? [...NAV_ITEMS, ...ADMIN_ITEMS] : NAV_ITEMS;

  return (
    <div className="fco-app">
      <nav className="fco-nav">
        <div className="fco-brand">
          <div className="fco-brand-mark">F</div>
          <div className="fco-brand-name">FCO <span>Hub</span></div>
        </div>

        <div className="fco-navitems">
          {navItems.map(item => (
            <button key={item.id}
              className={`fco-navitem${activeView === item.id ? ' active' : ''}`}
              onClick={() => navigate(item.id)}>
              <item.icon size={16} />
              <span>{item.label}</span>
              {item.id === 'watchlist' && watch.length > 0 && (
                <span className="fco-navcount">{watch.length}</span>
              )}
              {item.id === 'compare' && compareIds.length > 0 && (
                <span className="fco-navcount">{compareIds.length}</span>
              )}
            </button>
          ))}
        </div>

        <div className="fco-nav-right">
          <div className="fco-role">
            <button className={`fco-role-btn${role === 'viewer' ? ' on' : ''}`} onClick={() => setRole('viewer')}>
              <I.Eye size={13} />Viewer
            </button>
            <button className={`fco-role-btn${role === 'admin' ? ' on admin' : ''}`} onClick={() => setRole('admin')}>
              <I.ShieldCheck size={13} />Admin
            </button>
          </div>
        </div>
      </nav>

      <main className="fco-main">
        {activeView === 'db' && (
          <DatabaseView role={role} watch={watch} onToggleWatch={toggleWatch} onSelect={selectPlayer} />
        )}
        {activeView === 'events' && (
          <EventsView showToast={showToast} />
        )}
        {activeView === 'detail' && decodedParam && (
          <DetailView
            id={decodedParam}
            role={role}
            watch={watch}
            onToggleWatch={toggleWatch}
            onBack={goBack}
            onSelect={selectPlayer}
            onCompare={addToCompare}
          />
        )}
        {activeView === 'compare' && (
          <CompareView compareIds={compareIds} onUpdateCompare={setCompareIds} role={role} onSelect={selectPlayer} />
        )}
        {activeView === 'watchlist' && (
          <WatchlistView watch={watch} onToggleWatch={toggleWatch} onSelect={selectPlayer} />
        )}
        {activeView === 'upgrade' && (
          <UpgradeView onSelect={selectPlayer} />
        )}
        {activeView === 'dataops' && role === 'admin' && <DataOpsView />}
      </main>

      {toast && (
        <div className="fco-toast">
          {toast.variant === 'success'
            ? <I.Check size={16} style={{ color: 'var(--accent)' }} />
            : <I.Info size={16} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
}
