import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ReactFlowProvider } from '@xyflow/react';
import Navbar from './components/Navbar';
import ToolsPage from './pages/ToolsPage';
import WorkflowPage from './pages/WorkflowPage';

const App = () => {
  return (
    <Router>
      <Navbar />

      <Routes>
        <Route path="/" element={<ToolsPage />} />
        <Route
          path="/workflow"
          element={
            <ReactFlowProvider>
              <WorkflowPage />
            </ReactFlowProvider>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;