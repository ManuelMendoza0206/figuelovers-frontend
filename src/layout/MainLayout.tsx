import React from 'react';
import { Outlet } from 'react-router-dom';

import { Navbar } from '../components/Navbar';

export const MainLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-slate-100 font-sans antialiased">
      <header className="shrink-0">
        <Navbar />
      </header>

      <Outlet />
    </div>
  );
};