import { ArrowRight, Orbit, Sparkles } from 'lucide-react';
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export const UniverseNav: React.FC = () => {
  const { pathname } = useLocation();
  const isDashboard = pathname === '/dashboard';
  const isConstellations = pathname === '/constellations';

  return (
    <header className="relative z-30 border-b border-white/10 bg-[#070d1dcc] backdrop-blur-xl">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-5 px-5 sm:px-8">
        <Link to="/" className="flex items-center gap-3" aria-label="Figuelovers, inicio">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-brand/30 bg-brand/10 text-brand shadow-[0_0_28px_rgba(114,230,224,0.12)]">
            <Orbit className="h-5 w-5" />
          </span>
          <span>
            <span className="font-display block text-base font-bold tracking-tight text-ink">FIGUELOVERS</span>
            <span className="eyebrow block text-[9px] tracking-[0.22em] text-ink-subtle">graph observatory</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1 text-xs font-semibold text-ink-muted">
          <Link className={`rounded-full px-3 py-2 transition ${isDashboard ? 'bg-brand text-[#07101f]' : 'hover:bg-white/10 hover:text-ink'}`} to="/dashboard">
            <span className="hidden sm:inline">Mis galaxias</span>
            <span className="sm:hidden">Galaxias</span>
          </Link>
          <Link
            className={`rounded-full px-3 py-2 transition ${isConstellations ? 'bg-brand text-[#07101f]' : 'hover:bg-white/10 hover:text-ink'}`}
            to="/constellations"
          >
            Constelaciones
          </Link>
          <Link className="flex items-center gap-1 rounded-full px-3 py-2 transition hover:bg-white/10 hover:text-ink" to="/">
            Explorar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </nav>

        <div className="hidden items-center gap-2 text-[11px] font-mono text-ink-subtle md:flex">
          <Sparkles className="h-3.5 w-3.5 text-[#ffd684]" />
          <span>observatorio activo</span>
        </div>
      </div>
    </header>
  );
};
