import React from 'react';
import { Outlet } from 'react-router-dom';

import { Navbar } from '../components/Navbar';

export const MainLayout: React.FC = () => {
  return (
    <div className="space-shell flex h-screen w-screen flex-col overflow-hidden font-sans antialiased">
      <Navbar />

      <Outlet />
    </div>
  );
};