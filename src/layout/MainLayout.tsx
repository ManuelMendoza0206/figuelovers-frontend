import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';

import { HelpModal } from '../components/HelpModal';
import { Navbar } from '../components/Navbar';

export const MainLayout: React.FC = () => {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <div className="space-shell flex h-screen w-screen flex-col overflow-hidden font-sans antialiased">
      <Navbar
        isHelpOpen={isHelpOpen}
        onOpenHelp={() => setIsHelpOpen(true)}
      />

      <Outlet />

      <HelpModal
        isOpen={isHelpOpen}
        onOpen={() => setIsHelpOpen(true)}
        onClose={() => setIsHelpOpen(false)}
      />
    </div>
  );
};
