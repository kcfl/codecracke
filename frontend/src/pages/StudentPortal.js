// frontend/src/pages/StudentPortal.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function StudentPortal() {
  const navigate = useNavigate();
  const { user, isStudent, setAuthModalOpen } = useAuth();
  const [myComplaints, setMyComplaints] = useState([]);

  const fetchMyComplaints = async () => {
    if (!user?.email) return;
    try {
      const list = await api.getComplaints({ studentEmail: user.email });
      setMyComplaints(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!isStudent && !user) {
      setAuthModalOpen(true);
    } else {
      fetchMyComplaints();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isStudent]);

  return (
    <div className="gov-page-container student-portal-container">
      {/* Student Welcome Header */}
      <div className="gov-header-section">
        <div>
          <div className="gov-breadcrumb-line">
            <span>SATI STUDENT DISPATCH NODE</span>
            <span>/</span>
            <span className="breadcrumb-current">GRIEVANCE PROGRESS TRACKER</span>
          </div>
          <h2 className="gov-page-title">My Registered Grievances &amp; SLA Progress</h2>
          <p className="gov-page-subtitle">
            Authenticated Scholar: <strong>{user?.email || 'student@satiengg.in'}</strong> ({user?.scholarId || 'SATI-STUDENT'})
          </p>
        </div>

        <div className="gov-action-cluster">
          <button
            className="gov-primary-btn"
            onClick={() => navigate('/raise')}
          >
            ➕ Raise New Complaint
          </button>
        </div>
      </div>

      {/* If no complaints yet */}
      {myComplaints.length === 0 ? (
        <div className="gov-card student-empty-card text-center">
          <div className="empty-qr-icon">📝</div>
          <h3>No Active Complaints Registered Yet</h3>
          <p>
            You haven't submitted any campus grievances under <strong>{user?.email}</strong>.
            Click below to report an issue in Wi-Fi, Hostels, Laboratories, or Classrooms.
          </p>
          <button
            className="gov-primary-btn mt-4 mx-auto"
            onClick={() => navigate('/raise')}
          >
            Launch Grievance Intake Voucher ➔
          </button>
        </div>
      ) : (
        <div className="student-complaints-list">
          {myComplaints.map((c) => {
            const isOverdue = c.overdueByHours > 0;
            const slaTarget = c.slaTargetHours || 24;
            const hp = c.hoursPending || 0;

            // Step index: Raised=1, In Progress=2, Resolved=3
            const currentStep = c.status === 'Resolved' ? 3 : c.status === 'In Progress' ? 2 : 1;

            return (
              <div key={c.id} className="gov-card student-ticket-card">
                <div className="ticket-card-header">
                  <div className="ticket-id-cluster">
                    <span className="ticket-id-badge">#{c.id}</span>
                    <span className="category-tag">{c.category}</span>
                    {c.location && <span className="location-tag">📍 {c.location}</span>}
                  </div>
                  <div className="ticket-chips">
                    {isOverdue ? (
                      <span className="status-chip chip-overdue">● SLA Breach (+{c.overdueByHours}h)</span>
                    ) : (
                      <span className="status-chip chip-target">● SLA Active ({slaTarget}h)</span>
                    )}
                    <span className={`status-chip chip-${c.status?.toLowerCase().replace(' ', '-')}`}>
                      {c.status}
                    </span>
                  </div>
                </div>

                <div className="ticket-card-body">
                  <h4 className="ticket-desc-text">"{c.description}"</h4>

                  {/* Visual Stepper Lifecycle Progress Tracker */}
                  <div className="student-stepper-box">
                    <div className="stepper-title-row">
                      <span>Live Resolution Stage</span>
                      <span className="stepper-state-text">
                        Current: <strong>{c.status}</strong>
                      </span>
                    </div>

                    <div className="stepper-track">
                      {/* Step 1: Raised */}
                      <div className={`stepper-step ${currentStep >= 1 ? 'step-completed' : ''}`}>
                        <div className="step-circle">1</div>
                        <div className="step-info">
                          <strong>Raised</strong>
                          <small>Ticket Intake Verified</small>
                        </div>
                      </div>

                      <div className={`stepper-line ${currentStep >= 2 ? 'line-completed' : ''}`}></div>

                      {/* Step 2: In Progress */}
                      <div className={`stepper-step ${currentStep >= 2 ? 'step-completed' : ''} ${currentStep === 2 ? 'step-active' : ''}`}>
                        <div className="step-circle">2</div>
                        <div className="step-info">
                          <strong>In Progress</strong>
                          <small>Dispatched to Wing</small>
                        </div>
                      </div>

                      <div className={`stepper-line ${currentStep >= 3 ? 'line-completed' : ''}`}></div>

                      {/* Step 3: Resolved */}
                      <div className={`stepper-step ${currentStep >= 3 ? 'step-completed' : ''}`}>
                        <div className="step-circle">3</div>
                        <div className="step-info">
                          <strong>Resolved</strong>
                          <small>Inspected &amp; Archived</small>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata and Stats */}
                  <div className="ticket-meta-grid">
                    <div className="meta-block">
                      <span className="meta-lbl">Submission Timestamp</span>
                      <strong className="meta-val">
                        {c.submittedAt ? new Date(c.submittedAt).toLocaleString('en-IN') : 'Recent'}
                      </strong>
                    </div>
                    <div className="meta-block">
                      <span className="meta-lbl">Elapsed Pending Time</span>
                      <strong className="meta-val">{hp} hours</strong>
                    </div>
                    <div className="meta-block">
                      <span className="meta-lbl">Target Resolution SLA</span>
                      <strong className="meta-val">{slaTarget} hours</strong>
                    </div>
                    <div className="meta-block">
                      <span className="meta-lbl">Official Priority Score</span>
                      <strong className="meta-val text-blue">Score {c.score?.total ?? 0}</strong>
                    </div>
                  </div>

                  {/* Status History Timeline */}
                  {Array.isArray(c.statusHistory) && c.statusHistory.length > 0 && (
                    <div className="ticket-audit-box">
                      <strong>Audit Trail Log:</strong>
                      <ul className="audit-list">
                        {c.statusHistory.map((h, i) => (
                          <li key={i}>
                            {h.from ? `${h.from} ➔ ` : 'Ticket Initiated: '}
                            <strong>{h.to}</strong> on {new Date(h.at).toLocaleTimeString('en-IN')}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default StudentPortal;
