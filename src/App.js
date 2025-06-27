import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import ToolsPage from './pages/ToolsPage';
import WorkflowPage from './pages/WorkflowPage';

const App = () => {
  const basename = process.env.NODE_ENV === 'production' ? '/gto-wasm-app' : '';


  return (
    <Router basename={basename}>
      <Navbar />

      <Routes>
        <Route path="/" element={<ToolsPage />} />
        <Route path="/workflow" element={<WorkflowPage />} />
      </Routes>
    </Router>
  );
};

export default App;