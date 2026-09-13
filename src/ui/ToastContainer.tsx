import React from 'react';
import { useToast } from '../hooks/useToast';
import { CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-success text-white',
  error: 'bg-error text-white',
  warning: 'bg-warning text-white',
  info: 'bg-brand text-white',
};

const borderColors = {
  success: 'border-success-bg',
  error: 'border-error-border',
  warning: 'border-warning-border',
  info: 'border-brand-muted',
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 flex flex-col gap-2 max-w-[min(92vw,460px)]"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={[
              'pointer-events-auto flex items-center gap-3 rounded-xl border bg-white px-4 py-3 text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-top-2',
              borderColors[toast.type],
            ].join(' ')}
            role="alert"
          >
            <span className={['flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white', colors[toast.type]].join(' ')}>
              <Icon className="h-4 w-4" />
            </span>
            <span>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="ml-auto flex h-5 w-5 items-center justify-center rounded text-slate-400 hover:text-slate-600"
              aria-label="Cerrar notificación"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
};