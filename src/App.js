import React from 'react';
import { Route, HashRouter as Router, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToolsPage from './pages/ToolsPage';
import WorkflowPage from './pages/WorkflowPage';
import AboutPage from './pages/AboutPage';

const App = () => {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<ToolsPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="/about" element={<AboutPage />} />
      </Routes>
    </Router>
  );
};

export default App;