import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { MainLayout } from './layout/MainLayout';
import { ToastContainer } from './ui';

import AssignmentPage from './pages/AssignmentPage';
import DashboardPage from './pages/DashboardPage';
import EditorPage from './pages/EditorPage';
import JohnsonPage from './pages/JohnsonPage';
import LandingPage from './pages/LandingPage';
import ProjectEditorPage from './pages/ProjectEditorPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route element={<MainLayout />}>
          <Route path="editor" element={<EditorPage />} />
          <Route path="galaxy/:projectId" element={<ProjectEditorPage />} />
          <Route path="johnson" element={<JohnsonPage />} />
          <Route path="assignment" element={<AssignmentPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
    </BrowserRouter>
  );
};

export default App;