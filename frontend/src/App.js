// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import QRModal from './components/QRModal';
import AuthModal from './components/AuthModal';
import Dashboard from './pages/Dashboard';
import Complaints from './pages/Complaints';
import RaiseComplaint from './pages/RaiseComplaint';
import SystemTools from './pages/SystemTools';
import StudentPortal from './pages/StudentPortal';
import './App.css';

function MainRoutes() {
  const { isStudent } = useAuth();

  return (
    <Routes>
      <Route path="/" element={isStudent ? <Navigate to="/student/status" replace /> : <Dashboard />} />
      <Route path="/complaints" element={isStudent ? <Navigate to="/student/status" replace /> : <Complaints />} />
      <Route path="/tools" element={isStudent ? <Navigate to="/student/status" replace /> : <SystemTools />} />
      <Route path="/raise" element={<RaiseComplaint />} />
      <Route path="/student" element={<RaiseComplaint />} />
      <Route path="/student/status" element={<StudentPortal />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="gov-app-shell">
          <Navbar />
          <div className="gov-body-layout">
            <Sidebar />
            <main className="gov-main-viewport">
              <MainRoutes />
            </main>
          </div>
          <QRModal />
          <AuthModal />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
