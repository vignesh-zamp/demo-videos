import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import ProcessList from './components/ProcessList';
import ProcessDetails from './components/ProcessDetails';
import KnowledgeBase from './components/KnowledgeBase';
import PeoplePage from './components/People';
import Login from './components/Login';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/done" element={<DashboardLayout />}>
          <Route index element={<Navigate to="deviation-trending" replace />} />
          <Route path="deviation-trending" element={
            <ProcessList key="deviation-trending" title="Deviation Trend Intelligence" category="Deviation Trend Intelligence" />
          } />
          <Route path="knowledge-base" element={<KnowledgeBase />} />
          <Route path="people" element={<PeoplePage />} />
          <Route path="process/:id" element={<ProcessDetails />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
