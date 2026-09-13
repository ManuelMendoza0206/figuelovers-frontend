import React from 'react';
import { GraphCanvas } from '../components/GraphCanvas';
import { Sidebar } from '../components/Sidebar';

const EditorPage: React.FC = () => {
  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <main className="relative min-w-0 flex-1 overflow-hidden bg-surface-muted" aria-label="Editor de grafos">
        <GraphCanvas />
      </main>

      <aside className="h-full shrink-0" aria-label="Panel de propiedades">
        <Sidebar />
      </aside>
    </div>
  );
};

export default EditorPage;