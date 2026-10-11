import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Evita que un throw en cualquier componente se convierta en una
 * pantalla blanca total. Muestra el error y deja recargar.
 *
 * Sin esto, un fallo puntual en el canvas, en un modal o al parsear
 * un JSON importado tumba la app entera sin diagnostico.
 */
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): React.ReactNode {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div className="flex h-full w-full items-center justify-center bg-[#070d1d] p-6 text-ink">
        <div className="glass-panel w-full max-w-lg rounded-2xl border-error-border/40 p-6">
          <p className="eyebrow text-[9px]">error de renderizado</p>
          <h1 className="mt-2 font-display text-xl font-extrabold">
            La aplicacion se detuvo
          </h1>

          <p className="mt-3 text-sm text-ink-muted">
            Un modulo lanzo un error inesperado. Tu grafo no se guardo de forma
            automatica, asi que revisa la ultima accion que hiciste.
          </p>

          <pre className="mt-4 max-h-40 overflow-auto rounded-xl border border-white/10 bg-[#0b1328] p-3 font-mono text-xs text-ink-muted">
            {error.message}
          </pre>

          <button
            type="button"
            onClick={this.handleReload}
            className="mt-5 w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-[#070d1d] transition-colors hover:bg-brand-hover"
          >
            Recargar la aplicacion
          </button>
        </div>
      </div>
    );
  }
}