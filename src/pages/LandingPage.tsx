import { ArrowRight, Binary, Orbit, Route, Sparkles } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import { UniverseNav } from '../components/UniverseNav';

const LandingPage: React.FC = () => (
  <div className="space-shell starfield min-h-screen overflow-auto text-ink">
    <UniverseNav />
    <main className="mx-auto grid min-h-[calc(100vh-76px)] max-w-7xl items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
      <section className="rise-in max-w-2xl">
        <p className="eyebrow mb-6">Nivel 01 · universo observable</p>
        <h1 className="font-display max-w-xl text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-7xl">
          Dibuja el espacio que hay entre las ideas.
        </h1>
        <p className="mt-7 max-w-lg text-base leading-8 text-ink-muted sm:text-lg">
          Figuelovers convierte tus grafos en mapas vivos: explora conexiones, encuentra rutas y asigna misiones con claridad.
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <Link to="/dashboard" className="group flex items-center gap-3 rounded-full bg-brand px-5 py-3 text-sm font-extrabold text-[#07101f] transition hover:bg-brand-hover">
            Entrar al observatorio <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link to="/constellations" className="flex items-center gap-2 rounded-full border border-mission/40 px-5 py-3 text-sm font-bold text-mission transition hover:bg-mission/10">
            <Sparkles className="h-4 w-4" /> Ver constelaciones
          </Link>
          <Link to="/editor" className="rounded-full border border-white/15 px-5 py-3 text-sm font-bold text-ink-muted transition hover:border-brand/40 hover:text-ink">
            Abrir lienzo
          </Link>
        </div>
        <div className="mt-12 flex flex-wrap gap-6 text-xs text-ink-subtle">
          <span className="flex items-center gap-2"><Binary className="h-4 w-4 text-brand" /> grafos editables</span>
          <span className="flex items-center gap-2"><Route className="h-4 w-4 text-[#ffd684]" /> rutas mínimas</span>
          <span className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-[#ff9f80]" /> misiones óptimas</span>
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-[410px] rise-in [animation-delay:140ms]" aria-label="Mapa del universo de Figuelovers">
        <div className="relative aspect-square rounded-[2.5rem] border border-white/10 bg-[#0c1730]/70 p-7 shadow-[0_35px_100px_rgba(0,0,0,0.4)] backdrop-blur-sm sm:p-9">
          <div className="absolute inset-[16%] rounded-full border border-brand/20" />
          <div className="absolute inset-[28%] rounded-full border border-[#ffd684]/20" />
          <div className="absolute inset-[40%] rounded-full border border-white/10" />
          <div className="absolute left-[22%] top-[25%] h-px w-[58%] rotate-[24deg] bg-gradient-to-r from-transparent via-brand/60 to-transparent" />
          <div className="absolute left-[19%] top-[63%] h-px w-[62%] -rotate-[26deg] bg-gradient-to-r from-transparent via-[#ffd684]/60 to-transparent" />
          <span className="cosmic-node absolute left-[19%] top-[23%] h-3 w-3 rounded-full bg-[#ffd684]" />
          <span className="cosmic-node absolute right-[20%] top-[34%] h-4 w-4 rounded-full bg-brand" />
          <span className="cosmic-node absolute bottom-[22%] left-[31%] h-5 w-5 rounded-full bg-[#ff9f80]" />
          <span className="cosmic-node absolute bottom-[28%] right-[20%] h-2.5 w-2.5 rounded-full bg-[#a4b9ff]" />
          <div className="drift absolute left-1/2 top-1/2 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-brand/30 bg-[radial-gradient(circle_at_35%_30%,#d4ffef,#72e6e0_28%,#4a65b9_65%,#152044)] shadow-[0_0_90px_rgba(114,230,224,0.28)]">
            <Orbit className="h-11 w-11 text-[#07101f]/70" />
          </div>
          <div className="absolute bottom-7 left-7 right-7 flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-mono uppercase tracking-[0.16em] text-ink-subtle">
            <span>signal / 001</span><span>live map</span>
          </div>
        </div>
      </section>
    </main>
  </div>
);

export default LandingPage;
