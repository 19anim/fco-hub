import { Link } from 'react-router-dom';
import { Database, Menu, Moon, Search, Sun, X } from 'lucide-react';

export default function TopNav({ darkMode, setDarkMode, mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <nav className="sticky top-0 z-40 border-b border-hairline bg-canvas-black/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-hairline bg-surface-1 text-ink lg:hidden"
            aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <Link to="/database" className="hidden min-w-0 items-center gap-3 rounded-lg border border-hairline bg-surface-1 px-4 py-2 text-sm text-ink-muted transition hover:border-brand-blue/50 hover:text-ink md:flex">
            <Search className="h-4 w-4 text-brand-blue" />
            <span className="truncate">Search players, seasons, prices...</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/database" className="btn-secondary hidden items-center gap-2 px-4 py-2 text-sm md:inline-flex">
            <Database className="h-4 w-4" />
            Player DB
          </Link>
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-hairline bg-surface-1 text-ink-muted transition hover:text-ink"
            aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </nav>
  );
}
