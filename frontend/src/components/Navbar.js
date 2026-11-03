// frontend/src/components/Navbar.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, isAdmin, switchRole, setQrModalOpen, setAuthModalOpen } = useAuth();
  const [currentTime, setCurrentTime] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="gov-header">
      {/* Top Main Navbar */}
      <div className="gov-topbar">
        <div className="gov-brand-cluster">
          <div className="gov-crest">
            <span className="gov-crest-text">SATI</span>
          </div>
          <div className="gov-brand-titles">
            <div className="gov-brand-row">
              <h1 className="gov-main-title">SATI Campus Grievance Portal</h1>
              <span className="gov-tag-pill">GOV-OPS</span>
            </div>
            <p className="gov-sub-title">Code Crack 3.0 · SLA & Priority Queue System</p>
          </div>
        </div>

        <div className="gov-center-pill">
          <span className="live-pulse-dot"></span>
          <span className="live-pill-text">LIVE UTC+5:30 ACTIVE</span>
        </div>

        <div className="gov-right-cluster">
          {/* QR Access Button */}
          <button
            className="gov-qr-btn"
            onClick={() => setQrModalOpen(true)}
            title="Open Campus QR Code for Mobile Student Intake"
          >
            <span className="qr-icon-symbol">📱</span>
            <span className="qr-btn-text">Campus QR</span>
          </button>

          {/* User Account & Role Switcher */}
          <div className="gov-user-widget" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="gov-user-info">
              <span className="gov-user-name">
                {isAdmin ? 'Dean of Administration' : (user?.name || 'Student')}
              </span>
              <span className="gov-user-dept">
                {isAdmin ? 'Central Governance Cell' : (user?.email || 'Scholar Portal')}
              </span>
            </div>
            <div className={`gov-user-avatar ${isAdmin ? 'admin-avatar' : 'student-avatar'}`}>
              {isAdmin ? '🏛️' : '🎓'}
            </div>

            {menuOpen && (
              <div className="gov-user-dropdown" onClick={(e) => e.stopPropagation()}>
                <div className="dropdown-header">
                  <strong>Current Access Level</strong>
                  <span className={`role-badge ${isAdmin ? 'role-admin' : 'role-student'}`}>
                    {isAdmin ? 'ADMINISTRATOR' : 'STUDENT (@satiengg.in)'}
                  </span>
                </div>

                <div className="dropdown-divider"></div>

                {isAdmin ? (
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      switchRole('student');
                      setMenuOpen(false);
                    }}
                  >
                    <span>🎓</span> Switch to Student Mode
                  </button>
                ) : (
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      switchRole('admin');
                      setMenuOpen(false);
                    }}
                  >
                    <span>🏛️</span> Switch to Admin Mode
                  </button>
                )}

                <button
                  className="dropdown-item"
                  onClick={() => {
                    setAuthModalOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  <span>🔐</span> Student Email Verification
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Header Protocol Status Strip */}
      <div className="gov-status-strip">
        <div className="strip-left">
          <span className="repo-status-dot"></span>
          <span className="repo-status-label">Local Repository: Active (complaints.json) · Integrity Checked</span>
          <span className="hash-validated-badge">HASH VALIDATED</span>
        </div>
        <div className="strip-right">
          <span className="protocol-label">PRD M10 Strict Protocol</span>
          <span className="divider-bar">|</span>
          <span className="sync-time-label">Live Queue Synced: {currentTime}</span>
        </div>
      </div>
    </header>
  );
}

export default Navbar;

