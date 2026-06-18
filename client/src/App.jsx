import { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopNav from './components/TopNav';
import DashboardPage from './pages/DashboardPage';
import DatabasePage from './pages/DatabasePage';
import PlayerDetailPage from './pages/PlayerDetailPage';
import MetaLivePage from './pages/MetaLivePage';
import VideosPage from './pages/VideosPage';
import CalculatorPage from './pages/CalculatorPage';
import MarketPage from './pages/MarketPage';
import SettingsPage from './pages/SettingsPage';
import { fetchMeta } from './fco/api.js';

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('light', !darkMode);
  }, [darkMode]);

  // Load global metadata (seasons, sprites, etc.) once on app start
  useEffect(() => {
    fetchMeta().catch(err => console.error('Failed to fetch meta:', err));
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-canvas-black text-ink">
        <div className="lg:flex">
          <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
          <div className="min-w-0 flex-1">
            <TopNav
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              mobileMenuOpen={mobileMenuOpen}
              setMobileMenuOpen={setMobileMenuOpen}
            />
            <main className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/database" element={<DatabasePage />} />
                <Route path="/player/:id" element={<PlayerDetailPage />} />
                <Route path="/meta-live" element={<MetaLivePage />} />
                <Route path="/videos" element={<VideosPage />} />
                <Route path="/calculator" element={<CalculatorPage />} />
                <Route path="/market" element={<MarketPage />} />
                <Route path="/settings" element={<SettingsPage darkMode={darkMode} setDarkMode={setDarkMode} />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}
