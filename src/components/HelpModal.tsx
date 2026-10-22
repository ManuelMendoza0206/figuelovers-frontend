import { HelpCircle, Lightbulb, X } from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

import { EDITOR_EVENTS } from '../lib/editorEvents';
import { useEditorEvent } from '../hooks/useEditorEvent';
import type { HelpControl, HelpSection, HelpStep } from '../help/helpSections';
import { getHelpSection } from '../help/helpSections';
import { IconButton } from '../ui';

interface HelpModalProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

const StepList: React.FC<{ steps: HelpStep[] }> = ({ steps }) => (
  <ol className="space-y-3.5">
    {steps.map((step, index) => (
      <li key={step.title} className="flex gap-3">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand/10 font-mono text-[10px] font-bold text-brand"
        >
          {String(index + 1).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold leading-5 text-ink">{step.title}</p>
          <p className="mt-0.5 text-[13px] leading-5 text-ink-muted">{step.detail}</p>
        </div>
      </li>
    ))}
  </ol>
);

const ControlList: React.FC<{ controls: HelpControl[] }> = ({ controls }) => (
  <ul className="space-y-2.5">
    {controls.map((control) => (
      <li key={control.label} className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-brand">
          {control.icon}
        </span>
        <div className="min-w-0">
          <p className="inline-flex rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-ink">
            {control.label}
          </p>
          <p className="mt-1 text-[13px] leading-5 text-ink-muted">{control.description}</p>
        </div>
      </li>
    ))}
  </ul>
);

const HelpBody: React.FC<{ section: HelpSection }> = ({ section }) => (
  <>
    <p className="text-sm leading-6 text-ink-muted">{section.summary}</p>

    <section className="mt-6" aria-labelledby="help-steps-title">
      <p id="help-steps-title" className="eyebrow text-[9px]">
        Paso a paso
      </p>
      <div className="mt-3">
        <StepList steps={section.steps} />
      </div>
    </section>

    <section className="mt-7" aria-labelledby="help-controls-title">
      <p id="help-controls-title" className="eyebrow text-[9px]">
        Botones y controles
      </p>
      <div className="mt-3">
        <ControlList controls={section.controls} />
      </div>
    </section>

    {section.shortcuts && section.shortcuts.length > 0 && (
      <section className="mt-7" aria-labelledby="help-shortcuts-title">
        <p id="help-shortcuts-title" className="eyebrow text-[9px]">
          Atajos del lienzo
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {section.shortcuts.map((shortcut) => (
            <span
              key={shortcut.keys}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-ink-muted"
            >
              <kbd className="rounded border border-white/15 bg-[#050a17] px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink">
                {shortcut.keys}
              </kbd>
              {shortcut.label}
            </span>
          ))}
        </div>
      </section>
    )}

    {section.notes && section.notes.length > 0 && (
      <section className="mt-7" aria-labelledby="help-notes-title">
        <p id="help-notes-title" className="eyebrow text-[9px]">
          Tené en cuenta
        </p>
        <ul className="mt-3 space-y-2.5 rounded-xl border border-mission/20 bg-mission/[0.06] p-3.5">
          {section.notes.map((note) => (
            <li key={note} className="flex gap-2.5 text-[13px] leading-5 text-ink-muted">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-mission" aria-hidden="true" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </section>
    )}
  </>
);

/**
 * Ayuda contextual de la aplicación.
 *
 * El botón flotante y el botón «Ayuda» del navbar abren el mismo panel.
 * El contenido depende de la ruta: cada sección explica sus propios
 * botones y su flujo, en lugar de mostrar un catálogo genérico.
 */
export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onOpen, onClose }) => {
  const location = useLocation();
  const section = getHelpSection(location.pathname);
  const isConstellations = location.pathname.replace(/\/+$/, '') === '/constellations';

  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const fabRef = useRef<HTMLButtonElement | null>(null);
  const wasOpen = useRef(false);

  useEditorEvent(EDITOR_EVENTS.openHelp, () => {
    if (isOpen) {
      onClose();
    } else {
      onOpen();
    }
  });

  useEffect(() => {
    if (isOpen) {
      wasOpen.current = true;
      closeButtonRef.current?.focus();
    } else if (wasOpen.current) {
      wasOpen.current = false;
      fabRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <>
      <button
        ref={fabRef}
        type="button"
        aria-label="Abrir ayuda"
        aria-haspopup="dialog"
        aria-controls="contextual-help-dialog"
        aria-expanded={isOpen}
        tabIndex={isOpen ? -1 : 0}
        aria-hidden={isOpen}
        onClick={onOpen}
        className={[
          'fixed right-4 z-40 inline-flex items-center gap-2 rounded-full border border-brand/35',
          'bg-surface/95 px-4 py-2.5 text-sm font-bold text-brand shadow-[0_18px_50px_rgba(3,8,20,0.55)]',
          'backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/60',
          'hover:bg-brand hover:text-[#07101f] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
          'sm:right-5',
          isConstellations ? 'bottom-20' : 'bottom-4 sm:bottom-5',
          isOpen ? 'pointer-events-none opacity-0' : 'opacity-100',
        ].join(' ')}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">Ayuda</span>
        <span className="hidden rounded-md border border-brand/20 bg-brand/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-brand/80 sm:inline">
          {section.fabLabel}
        </span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Cerrar ayuda"
            aria-hidden="true"
            tabIndex={-1}
            onClick={onClose}
            className="help-backdrop-enter absolute inset-0 bg-[#03060f]/75 backdrop-blur-sm"
          />

          <aside
            id="contextual-help-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contextual-help-title"
            className="help-drawer-enter absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col border-l border-border/80 bg-surface shadow-2xl"
          >
            <header className="flex items-start gap-3 border-b border-border/80 px-5 py-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand/25 bg-brand/10 text-brand">
                {section.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="eyebrow text-[9px]">{section.eyebrow}</p>
                <h2
                  id="contextual-help-title"
                  className="mt-1 font-display text-lg font-extrabold leading-tight text-ink"
                >
                  {section.title}
                </h2>
              </div>
              <IconButton
                ref={closeButtonRef}
                type="button"
                aria-label="Cerrar panel de ayuda"
                title="Cerrar ayuda (Esc)"
                size="sm"
                variant="secondary"
                onClick={onClose}
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </IconButton>
            </header>

            <div className="custom-scrollbar flex-1 overflow-y-auto px-5 py-5">
              <HelpBody section={section} />
            </div>

            <footer className="border-t border-border/80 px-5 py-3">
              <p className="text-[11px] leading-4 text-ink-subtle">
                Esta guía cambia según la sección. El botón «Ayuda» del navbar abre el mismo panel.
              </p>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
};
