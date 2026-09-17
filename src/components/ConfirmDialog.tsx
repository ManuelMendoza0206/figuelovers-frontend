import { AlertTriangle, X } from 'lucide-react';
import React from 'react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirmar',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-[#101a31] shadow-[0_30px_100px_rgba(0,0,0,0.5)]">
        <div className="flex items-start gap-4 border-b border-white/10 bg-[#0b1328] px-5 py-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#ff9f80]/25 bg-[#ff9f80]/10 text-[#ffb09a]"><AlertTriangle className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <h2 id="confirm-title" className="font-display text-base font-bold text-ink">{title}</h2>
            <p className="mt-1 text-sm leading-6 text-ink-muted">{message}</p>
          </div>
          <button type="button" onClick={onCancel} aria-label="Cerrar confirmación" className="text-ink-subtle transition hover:text-ink"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex justify-end gap-3 px-5 py-4">
          <button type="button" onClick={onCancel} className="rounded-full border border-white/10 px-4 py-2 text-xs font-bold text-ink-muted transition hover:bg-white/[0.06] hover:text-ink">Cancelar</button>
          <button type="button" onClick={onConfirm} className="rounded-full border border-[#ff9f80]/30 bg-[#ff9f80]/10 px-4 py-2 text-xs font-bold text-[#ffb09a] transition hover:bg-[#ff9f80]/20">{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};
