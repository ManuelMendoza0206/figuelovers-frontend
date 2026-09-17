import { Orbit, X } from 'lucide-react';
import React, { useState } from 'react';

interface ProjectNameDialogProps {
  isOpen: boolean;
  onCancel: () => void;
  onCreate: (name: string) => void;
}

export const ProjectNameDialog: React.FC<ProjectNameDialogProps> = ({ isOpen, onCancel, onCreate }) => {
  const [name, setName] = useState('');
  if (!isOpen) return null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onCreate(name.trim() || 'Nueva galaxia');
    setName('');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="project-name-title">
      <form onSubmit={submit} className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#101a31] shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-4 border-b border-white/10 bg-[#0b1328] px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ffd684]/25 bg-[#ffd684]/10 text-[#ffd684]"><Orbit className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1"><h2 id="project-name-title" className="font-display text-base font-bold text-ink">Nombra tu galaxia</h2><p className="mt-1 text-sm leading-6 text-ink-muted">Elige un nombre para encontrarla después en tu red cósmica.</p></div>
          <button type="button" onClick={onCancel} aria-label="Cerrar" className="text-ink-subtle transition hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <div className="px-5 py-5"><label className="eyebrow text-[9px]" htmlFor="project-name">Nombre de la galaxia</label><input id="project-name" autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Ej. Red de exploración" maxLength={50} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0b1328] px-3 py-3 text-sm text-ink outline-none transition placeholder:text-ink-subtle focus:border-brand/50" /></div>
        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4"><button type="button" onClick={onCancel} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-ink-muted hover:bg-white/[0.06] hover:text-ink">Cancelar</button><button type="submit" className="rounded-full bg-brand px-4 py-2 text-xs font-bold text-[#07101f] hover:bg-brand-hover">Crear galaxia</button></div>
      </form>
    </div>
  );
};
