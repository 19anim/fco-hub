import { Play, Sun, Moon, RefreshCw } from 'lucide-react';

export default function Header({ darkMode, setDarkMode, handleScan, scanning }) {
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-black/80 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-blue rounded-lg flex items-center justify-center shadow-lg shadow-brand-blue/20">
            <Play className="fill-white text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-light tracking-tight">
            FCO <span className="font-semibold">HUB</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2.5 rounded-full bg-white/5 hover:bg-white/10 transition-all"
            title={darkMode ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          <button
            onClick={handleScan}
            disabled={scanning}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 hover:bg-white/10 text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{scanning ? 'Đang quét...' : 'Làm mới'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
