// frontend/src/components/Sidebar.js
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Sidebar() {
  const location = useLocation();
  const { isAdmin, setQrModalOpen } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 992) setMobileOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Admin menu items: Notice NO "Raise Complaint" option per user specification!
  const adminMenuItems = [
    {
      path: '/',
      label: 'Dashboard',
      icon: '📊',
      badge: 'Cockpit'
    },
    {
      path: '/complaints',
      label: 'Complaints Queue',
      icon: '📋',
      badge: 'Active'
    },
    {
      path: '/tools',
      label: 'System Tools',
      icon: '⚙️',
      badge: 'E5/E6'
    }
  ];

  // Student menu items: Student can ONLY see "Raise Complaint" and "My Grievances"
  const studentMenuItems = [
    {
      path: '/student',
      label: 'Raise Complaint',
      icon: '📝',
      badge: 'Intake'
    },
    {
      path: '/student/status',
      label: 'My Complaint Progress',
      icon: '⏱️',
      badge: 'Live SLA'
    }
  ];

  const activeMenuItems = isAdmin ? adminMenuItems : studentMenuItems;

  return (
    <>
      <button
        className="mobile-hamburger-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation menu"
      >
        ☰
      </button>

      {mobileOpen && (
        <div
          className="mobile-backdrop-overlay"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`gov-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-section-title">
          <span>{isAdmin ? 'ADMINISTRATIVE WORKFLOWS' : 'STUDENT INTAKE WORKFLOWS'}</span>
        </div>

        <nav className="gov-nav-list">
          {activeMenuItems.map((item) => {
            const isActive = location.pathname === item.path;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`gov-nav-link ${isActive ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* QR Scan Dispatch Action */}
        <div className="sidebar-qr-card">
          <div className="sidebar-qr-header">
            <span>📲 Campus Dispatch</span>
          </div>
          <p className="sidebar-qr-desc">
            Official QR Code for hostel gates, labs &amp; router spots.
          </p>
          <button
            className="sidebar-qr-btn"
            onClick={() => setQrModalOpen(true)}
          >
            Open Student QR
          </button>
        </div>

        {/* Footer SLA Node Status */}
        <div className="gov-sidebar-footer">
          <div className="sla-metric-row">
            <span className="sla-title">SLA COMPLIANCE</span>
            <span className="sla-value">98.4%</span>
          </div>
          <div className="sla-progress-track">
            <div className="sla-progress-bar" style={{ width: '98.4%' }}></div>
          </div>
          <div className="monitoring-node-text">
            <span>Active Monitoring Node #3</span>
          </div>
          <div className="engine-version-text">
            <span>SATI Governance Engine v3.0</span>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
