import React from 'react';

const AssignmentPage: React.FC = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted text-brand">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      </div>

      <h1 className="text-lg font-extrabold text-ink">Problema de Asignación</h1>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Asignación óptima de tareas a recursos minimizando el costo total. Próximamente.
      </p>
    </div>
  );
};

export default AssignmentPage;