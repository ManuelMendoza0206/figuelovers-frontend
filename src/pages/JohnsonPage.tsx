import React from 'react';

const JohnsonPage: React.FC = () => {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-muted text-brand">
        <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      </div>

      <h1 className="text-lg font-extrabold text-ink">Algoritmo de Johnson</h1>

      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        Caminos más cortos entre todos los pares de nodos en grafos con pesos negativos. Próximamente.
      </p>
    </div>
  );
};

export default JohnsonPage;