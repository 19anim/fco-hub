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
import VideosView from './views/VideosView.jsx';
import * as I from './Icons.jsx';

const NAV_ITEMS = [
  { id: 'db',        label: 'Database',   icon: I.Database  },
  { id: 'events',    label: 'Sự kiện',    icon: I.Calendar  },
  { id: 'videos',    label: 'Videos',     icon: I.Video     },
  { id: 'upgrade',   label: 'Nâng cấp',   icon: I.Zap       },
  { id: 'compare',   label: 'So sánh',    icon: I.Compare   },
  { id: 'watchlist', label: 'Theo dõi',   icon: I.Star      },
];
const ADMIN_ITEMS = [
  { id: 'dataops', label: 'Data Ops', icon: I.Hammer },
];

const VIEW_PATHS = {
  db: '/players',
  events: '/events',
  videos: '/videos',
  upgrade: '/upgrade',
  compare: '/compare',
  watchlist: '/watchlist',
  dataops: '/dataops',
};

const LEGACY_VIEW_MAP = {
  db: 'db',
  detail: 'detail',
  events: 'events',
  videos: 'videos',
  upgrade: 'upgrade',
  compare: 'compare',
  watchlist: 'watchlist',
  dataops: 'dataops',
};

function parseLegacyHash(hash = window.location.hash) {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const parts = path.split('/').filter(Boolean);
  const legacyView = parts[0];
  const view = LEGACY_VIEW_MAP[legacyView];

  if (!view) return null;

  if (view === 'detail') {
    return { view: 'detail', param: parts.slice(1).join('/') || null };
  }

  return { view, param: null };
}

function parsePath(pathname = window.location.pathname, hash = window.location.hash) {
  const legacyRoute = parseLegacyHash(hash);
  if (legacyRoute) {
    return { ...legacyRoute, legacyPath: routeUrl(legacyRoute.view, legacyRoute.param, { keepSearch: legacyRoute.view === 'db' }) };
  }

  const parts = pathname.split('/').filter(Boolean);
  const first = parts[0];

  if (!first) return { view: 'db', param: null, legacyPath: '/players' };
  if (first === 'players') return { view: parts[1] ? 'detail' : 'db', param: parts.slice(1).join('/') || null, legacyPath: null };
  if (VIEW_PATHS[first]) return { view: first, param: null, legacyPath: null };

  return { view: 'db', param: null, legacyPath: '/players' };
}

function routeUrl(view, param = null, { keepSearch = false } = {}) {
  const search = keepSearch ? window.location.search : '';

  if (view === 'detail' && param) {
    return `/players/${encodeURIComponent(param)}${search}`;
  }

  return `${VIEW_PATHS[view] || '/players'}${search}`;
}

function setPath(view, param = null) {
  const keepSearch = view === 'db';
  const next = routeUrl(view, param, { keepSearch });
  const current = `${window.location.pathname}${window.location.search}`;
  if (current !== next || window.location.hash) {
    window.history.pushState(null, '', next);
  }
}

function replacePath(view, param = null) {
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

  const [route,      setRoute]      = useState(() => parsePath());
  const [role,       setRole]       = useState(persisted.role || 'viewer');
  const [watch,      setWatch]      = useState(persisted.watch || []);
  const [compareIds, setCompareIds] = useState(persisted.compareIds || []);
  const [toast,      setToast]      = useState(null);

  // Listen to browser back/forward
  useEffect(() => {
    function onPop() { setRoute(parsePath()); }
    window.addEventListener('popstate', onPop);

    const currentRoute = parsePath();
    if (currentRoute.legacyPath) {
      replacePath(currentRoute.view, currentRoute.param);
      setRoute(parsePath());
    }

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
    setPath(view, param);
    setRoute(parsePath());
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
        {activeView === 'videos' && (
          <VideosView />
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
