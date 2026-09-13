import React from 'react';
import { MousePointerClick } from 'lucide-react';

export const EmptyState: React.FC = () => {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center md:min-h-[420px]">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted text-brand">
        <MousePointerClick className="h-7 w-7" />
      </div>

      <h3 className="text-sm font-extrabold text-ink">
        Selecciona un elemento
      </h3>

      <p className="mt-2 max-w-[230px] text-xs leading-relaxed text-slate-500">
        Selecciona un nodo o una arista en el lienzo para editar o eliminar.
      </p>
    </div>
  );
};