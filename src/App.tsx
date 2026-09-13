import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { MainLayout } from './layout/MainLayout';
import { ToastContainer } from './ui';

import EditorPage from './pages/EditorPage';
import JohnsonPage from './pages/JohnsonPage';
import AssignmentPage from './pages/AssignmentPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<EditorPage />} />
          <Route path="johnson" element={<JohnsonPage />} />
          <Route path="assignment" element={<AssignmentPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;