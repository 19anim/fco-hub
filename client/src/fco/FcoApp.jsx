import { useState, useEffect } from 'react';
import { useAdminAuth } from '../contexts/AdminAuthContext';
import './fco.css';
import { LS_KEY } from './constants.js';
import { useMetaQuery } from './queries.js';
import { AssetProvider } from './assets/AssetProvider.jsx';
import FaviconAsset from './assets/FaviconAsset.jsx';
import FcoBrandLogo, { FCO_SITE_LOGO_URL } from './assets/FcoBrandLogo.jsx';
import DatabaseView from './views/DatabaseView.jsx';
import EventsView from './views/EventsView.jsx';
import UpgradeView from './views/UpgradeView.jsx';
import SquadView from './views/SquadView.jsx';
import SquadSharingCreateView from './views/SquadSharingCreateView.jsx';
import SquadSharingView from './views/SquadSharingView.jsx';
import SquadSharingListView from './views/SquadSharingListView.jsx';
import DetailView from './views/DetailView.jsx';
import CompareView from './views/CompareView.jsx';
import WatchlistView from './views/WatchlistView.jsx';
import VideosView from './views/VideosView.jsx';
import * as I from './Icons.jsx';

const NAV_ITEMS = [
  { id: 'db',        label: 'Cầu thủ',    icon: I.Database  },
  { id: 'events',    label: 'Sự kiện',    icon: I.Calendar  },
  { id: 'videos',    label: 'Videos',     icon: I.Video     },
  { id: 'upgrade',   label: 'Nâng cấp',   icon: I.Zap       },
  { id: 'squad',     label: 'Đội hình',   icon: I.Users     },
  { id: 'squad-sharing-list', label: 'Chia sẻ đội hình', icon: I.Share },
  { id: 'compare',   label: 'So sánh',    icon: I.Compare   },
  { id: 'watchlist', label: 'Theo dõi',   icon: I.Star      },
];
const VIEW_PATHS = {
  db: '/players',
  events: '/events',
  videos: '/videos',
  upgrade: '/upgrade',
  squad: '/squad-maker',
  'squad-sharing-list': '/squad-sharing',
  compare: '/compare',
  watchlist: '/watchlist',
};

const LEGACY_VIEW_MAP = {
  db: 'db',
  detail: 'detail',
  events: 'events',
  videos: 'videos',
  upgrade: 'upgrade',
  squad: 'squad',
  compare: 'compare',
  watchlist: 'watchlist',
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
  if (first === 'doi-hinh') return { view: 'squad', param: null, legacyPath: routeUrl('squad') };
  if (first === 'squad-maker') return { view: 'squad', param: null, legacyPath: null };
  if (first === 'squad-sharing') {
    if (!parts[1]) return { view: 'squad-sharing-list', param: null, legacyPath: null };
    if (parts[1] === 'new') return { view: 'squad-sharing-new', param: null, legacyPath: null };
    return { view: 'squad-sharing', param: parts[1], legacyPath: null };
  }
  if (VIEW_PATHS[first]) return { view: first, param: null, legacyPath: null };

  return { view: 'db', param: null, legacyPath: '/players' };
}

function routeUrl(view, param = null, { keepSearch = false } = {}) {
  const search = keepSearch ? window.location.search : '';

  if (view === 'detail' && param) {
    return `/players/${encodeURIComponent(param)}${search}`;
  }

  if (view === 'squad-sharing' && param) {
    return `/squad-sharing/${encodeURIComponent(param)}${search}`;
  }

  if (view === 'squad-sharing-new') {
    return `/squad-sharing/new${search}`;
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
  const { user } = useAdminAuth();
  const isAdmin = !!user;
  const canCreateSquadShare = !!user && (user.role === 'owner' || user.permissions?.includes('squadSharing.create'));

  const [route,      setRoute]      = useState(() => parsePath());
  const [watch,      setWatch]      = useState(persisted.watch || []);
  const [compareIds, setCompareIds] = useState(persisted.compareIds || []);
  const [toast,      setToast]      = useState(null);
  const [navOpen,    setNavOpen]    = useState(false);

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

  const { error: metaError } = useMetaQuery();
  useEffect(() => {
    if (metaError) console.error('fetchMeta error', metaError);
  }, [metaError]);

  // Persist watch/compare
  useEffect(() => { savePersisted({ watch, compareIds }); }, [watch, compareIds]);

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
    setNavOpen(false);
  }

  function handleNavClick(e, view) {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(view);
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

  return (
    <AssetProvider>
      <FaviconAsset fallbackUrl={FCO_SITE_LOGO_URL} />
      <div className="fco-app">
        <nav className="fco-nav">
        <a
          className="fco-brand"
          href={routeUrl('db', null, { keepSearch: true })}
          aria-label="Về trang cầu thủ"
          onClick={e => handleNavClick(e, 'db')}>
          <FcoBrandLogo />
        </a>

        <button
          type="button"
          className={`fco-nav-toggle${navOpen ? ' open' : ''}`}
          aria-label={navOpen ? 'Đóng menu' : 'Mở menu'}
          aria-expanded={navOpen}
          aria-controls="fco-navitems"
          onClick={() => setNavOpen(open => !open)}>
          {navOpen ? <I.X size={18} /> : <I.List size={18} />}
          <span>Menu</span>
        </button>

        <div id="fco-navitems" className={`fco-navitems${navOpen ? ' open' : ''}`}>
          {NAV_ITEMS.map(item => (
            <a key={item.id}
              href={routeUrl(item.id)}
              className={`fco-navitem${(activeView === item.id || (item.id === 'squad-sharing-list' && (activeView === 'squad-sharing-new' || activeView === 'squad-sharing'))) ? ' active' : ''}`}
              onClick={e => handleNavClick(e, item.id)}>
              <item.icon size={16} />
              <span>{item.label}</span>
              {item.id === 'watchlist' && watch.length > 0 && (
                <span className="fco-navcount">{watch.length}</span>
              )}
              {item.id === 'compare' && compareIds.length > 0 && (
                <span className="fco-navcount">{compareIds.length}</span>
              )}
            </a>
          ))}
        </div>

      </nav>

      <main className="fco-main">
        {activeView === 'db' && (
          <DatabaseView isAdmin={isAdmin} watch={watch} onToggleWatch={toggleWatch} onSelect={selectPlayer} />
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
            isAdmin={isAdmin}
            watch={watch}
            onToggleWatch={toggleWatch}
            onBack={goBack}
            onSelect={selectPlayer}
            onCompare={addToCompare}
          />
        )}
        {activeView === 'compare' && (
          <CompareView compareIds={compareIds} onUpdateCompare={setCompareIds} isAdmin={isAdmin} onSelect={selectPlayer} />
        )}
        {activeView === 'watchlist' && (
          <WatchlistView watch={watch} onToggleWatch={toggleWatch} onSelect={selectPlayer} />
        )}
        {activeView === 'upgrade' && (
          <UpgradeView onSelect={selectPlayer} />
        )}
        {activeView === 'squad' && (
          <SquadView />
        )}
        {activeView === 'squad-sharing-list' && (
          <SquadSharingListView
            canCreate={canCreateSquadShare}
            onSelect={(id) => navigate('squad-sharing', id)}
            onCreate={() => navigate('squad-sharing-new')}
          />
        )}
        {activeView === 'squad-sharing-new' && canCreateSquadShare && (
          <SquadSharingCreateView onShared={(id) => navigate('squad-sharing', id)} />
        )}
        {activeView === 'squad-sharing' && decodedParam && (
          <SquadSharingView id={decodedParam} onBack={() => navigate('squad-sharing-list')} />
        )}
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
    </AssetProvider>
  );
}
