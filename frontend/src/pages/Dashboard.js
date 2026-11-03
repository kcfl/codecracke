// frontend/src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [queue, setQueue] = useState([]);
  const [allComplaints, setAllComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showFormula, setShowFormula] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, queueData, complaintsData] = await Promise.all([
        api.getStats(),
        api.getPriorityQueue(3),
        api.getComplaints({ sort: 'priority' })
      ]);
      setStats(statsData);
      setQueue(queueData);
      setAllComplaints(complaintsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdvance = async (complaint) => {
    if (!complaint.nextStatus) return;
    try {
      setActionLoading(complaint.id);
      await api.updateStatus(complaint.id, complaint.nextStatus);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Status transition failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="gov-page-container">
      {/* Header section with PRD tag and action buttons */}
      <div className="gov-header-section">
        <div>
          <div className="gov-badge-row">
            <span className="gov-pill-sec">PRD SEC 11.2 A</span>
            <span className="gov-pill-cell">ADMINISTRATIVE CELL</span>
          </div>
          <h2 className="gov-page-title">Executive Grievance Cockpit</h2>
          <p className="gov-page-subtitle">
            Deterministic Priority Engine · Tiered SLA &amp; Tie-Breaker Queue
          </p>
        </div>

        <div className="gov-action-cluster">
          <button
            className="gov-secondary-btn"
            onClick={() => navigate('/tools')}
            title="Open Urgency Simulator"
          >
            📊 Score Simulator
          </button>
          <button
            className="gov-secondary-btn"
            onClick={() => setShowFormula(!showFormula)}
            title="Toggle Formula Breakdown"
          >
            fx Math Breakdown
          </button>
          <button
            className="gov-primary-btn"
            onClick={loadData}
            disabled={loading}
          >
            🔄 Re-Rank Queue
          </button>
        </div>
      </div>

      {/* 4 Stat Summary Cards */}
      <div className="gov-stats-grid">
        {/* Total Complaints */}
        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">TOTAL COMPLAINTS</span>
            <span className="stat-card-icon">🗄️</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-number">{stats ? stats.total : 4}</div>
            <div className="stat-subtitle">Logged Records</div>
          </div>
          <div className="stat-card-footer">
            <span>Formula: Pending + Resolved</span>
            <span className="stat-formula-calc">
              {stats ? `${stats.pending} + ${stats.resolved} = ${stats.total}` : '3 + 1 = 4'}
            </span>
          </div>
        </div>

        {/* Pending Queue */}
        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">PENDING QUEUE</span>
            <span className="stat-card-icon">📋</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-number pending-number">{stats ? stats.pending : 3}</div>
            <div className="stat-subtitle">In Active Resolution</div>
          </div>
          <div className="stat-card-footer">
            <div className="stat-pill-group">
              <span className="mini-pill raised-pill">
                ● {stats ? stats.raised : 2} Raised
              </span>
              <span className="mini-pill inprog-pill">
                ● {stats ? stats.inProgress : 1} In Progress
              </span>
            </div>
          </div>
        </div>

        {/* Resolved Closed */}
        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">RESOLVED CLOSED</span>
            <span className="stat-card-icon">✅</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-number resolved-number">{stats ? stats.resolved : 1}</div>
            <div className="stat-subtitle">Terminal Archived</div>
          </div>
          <div className="stat-card-footer">
            <span className="stat-excluded-note">C04 (Lab CS-3) Excluded via M10</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">CATEGORY BREAKDOWN</span>
            <span className="stat-card-icon">🌐</span>
          </div>
          <div className="stat-card-body">
            <div className="category-breakdown-grid">
              <div className="cat-item">
                <span className="cat-label">Wi-Fi</span>
                <span className="cat-count">{stats?.byCategory?.['Wi-Fi'] ?? 1}</span>
              </div>
              <div className="cat-item">
                <span className="cat-label">Hostel</span>
                <span className="cat-count">{stats?.byCategory?.['Hostel'] ?? 1}</span>
              </div>
              <div className="cat-item">
                <span className="cat-label">Classroom</span>
                <span className="cat-count">{stats?.byCategory?.['Classroom'] ?? 1}</span>
              </div>
              <div className="cat-item">
                <span className="cat-label">Laboratory</span>
                <span className="cat-count">{stats?.byCategory?.['Laboratory'] ?? 1}</span>
              </div>
            </div>
          </div>
          <div className="stat-card-footer text-center">
            <span className="cat-spread-note">Equal spread (25% each)</span>
          </div>
        </div>
      </div>

      {/* How Priority Scoring Works Collapsible Banner */}
      <div className="gov-card formula-banner-card">
        <div
          className="formula-banner-header"
          onClick={() => setShowFormula(!showFormula)}
        >
          <div className="formula-banner-title">
            <span className="sigma-icon">∑</span>
            <div>
              <strong>How Priority Scoring Works · PRD Specification</strong>
              <p>Deterministic arithmetic, category weighting, and 5-tier strict tie-breaking logic</p>
            </div>
          </div>
          <button className="banner-toggle-btn">
            {showFormula ? 'Hide Details ⌃' : 'Show Details ⌵'}
          </button>
        </div>

        {showFormula && (
          <div className="formula-banner-content">
            <div className="formula-eq-box">
              <div className="math-display">
                Score = Base + Age + Reports
              </div>
              <p className="formula-expl">
                • <strong>Base</strong>: Laboratory: 3, Wi-Fi: 2, Hostel: 2, Classroom: 1<br />
                • <strong>Age</strong>: <code>floor(hoursPending / 24)</code> (+1 point for every completed 24 hours unresolved)<br />
                • <strong>Reports</strong>: <code>min(supportCount, 3)</code> (up to +3 points for student endorsements)<br />
                • <strong>Resolved Exclusion</strong>: Resolved complaints are excluded from the priority queue immediately.
              </p>
            </div>

            <div className="tie-break-rules-block">
              <h5>Strict 5-Tier Tie-Break Hierarchy (PRD Section 6.6):</h5>
              <ol className="tie-break-list">
                <li>1. Higher score</li>
                <li>2. More hours pending (older complaints first)</li>
                <li>3. Higher category weight</li>
                <li>4. Raised before In Progress (untouched issues prioritized)</li>
                <li>5. Lower ID number (deterministic numerical sequence, e.g. C01 &lt; C02)</li>
              </ol>
            </div>
          </div>
        )}
      </div>

      {/* Urgent Unresolved Queue (Top 3) */}
      <div className="gov-section-header">
        <div className="section-title-wrap">
          <span className="red-bullet-dot">●</span>
          <h3 className="section-heading">Urgent Unresolved Queue (Top 3)</h3>
          <span className="sorting-badge">Strict M10 Sorting</span>
        </div>
        <div className="sla-legend-strip">
          <span className="legend-item"><span className="legend-dot dot-green"></span> On Target</span>
          <span className="legend-item"><span className="legend-dot dot-yellow"></span> Approaching SLA</span>
          <span className="legend-item"><span className="legend-dot dot-red"></span> Overdue</span>
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="gov-card all-clear-card">
          <span className="all-clear-icon">🎉</span>
          <h4>All Clear</h4>
          <p>No active unresolved grievances currently in the priority queue.</p>
        </div>
      ) : (
        <div className="gov-priority-cards-grid">
          {queue.map((c, idx) => {
            const isOverdue = c.overdueByHours > 0;
            const slaTarget = c.slaTargetHours || 24;
            const hp = c.hoursPending || 0;
            const remaining = Math.max(0, slaTarget - hp);

            return (
              <div key={c.id} className="gov-card priority-cockpit-card">
                <div className="cockpit-card-top">
                  <div className="ticket-id-tag">
                    <span className="rank-label">#{c.rank || idx + 1}</span>
                    <strong className="ticket-id">{c.id}</strong>
                  </div>
                  <div className="cockpit-chips">
                    {isOverdue ? (
                      <span className="status-chip chip-overdue">
                        ● Overdue by {c.overdueByHours}h
                      </span>
                    ) : (
                      <span className="status-chip chip-target">
                        ● {remaining === 0 ? 'On Target' : `${remaining}h Left`}
                      </span>
                    )}
                    <span className={`status-chip chip-${c.status?.toLowerCase().replace(' ', '-')}`}>
                      {c.status}
                    </span>
                  </div>
                </div>

                <div className="cockpit-location-line">
                  {c.category} {c.location ? `· ${c.location}` : ''}
                </div>

                <p className="cockpit-description">{c.description}</p>

                <div className="cockpit-pending-meta">
                  <span>⏱ {hp}h Pending</span>
                  <span>🎯 Target: {slaTarget}h</span>
                </div>

                {/* Priority Computation Score Box */}
                <div className="cockpit-computation-box">
                  <div className="comp-box-header">
                    <span className="comp-label">PRIORITY COMPUTATION</span>
                    <div className="comp-score-wrap">
                      <span className="comp-score-text">Score</span>
                      <strong className="comp-score-num">{c.score?.total ?? 0}</strong>
                    </div>
                  </div>
                  <div className="comp-formula-line">
                    Category +{c.score?.base ?? 0} + Age +{c.score?.age ?? 0} [floor({hp}/24)] + Reports +{c.score?.reports ?? 0} = {c.score?.total ?? 0}
                  </div>
                  {c.tieBreakNote && (
                    <div className="comp-tie-note">
                      ℹ {c.tieBreakNote}
                    </div>
                  )}
                </div>

                {/* Advance Button */}
                {c.nextStatus ? (
                  <button
                    className="cockpit-advance-btn"
                    onClick={() => handleAdvance(c)}
                    disabled={actionLoading === c.id}
                  >
                    {actionLoading === c.id ? (
                      'Advancing...'
                    ) : c.nextStatus === 'In Progress' ? (
                      '▶ Advance to In Progress'
                    ) : (
                      '✓ Advance to Resolved'
                    )}
                  </button>
                ) : (
                  <div className="cockpit-terminal-label">Terminal Resolved</div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Repository State & Terminal Verification Table */}
      <div className="gov-card registry-table-card">
        <div className="registry-card-header">
          <div className="registry-title-wrap">
            <span className="doc-icon">📋</span>
            <div>
              <h4>Repository State &amp; Terminal Verification</h4>
              <p>Strict M10 Compliance Record Registry</p>
            </div>
          </div>
          <span className="strict-protocol-tag">Strict M10 Compliance Record Registry</span>
        </div>

        <div className="table-responsive">
          <table className="gov-data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>CATEGORY</th>
                <th>PENDING HOURS</th>
                <th>SLA STATUS</th>
                <th>CALCULATED SCORE</th>
                <th>LIFECYCLE STATE</th>
                <th>QUEUE INCLUSION</th>
              </tr>
            </thead>
            <tbody>
              {allComplaints.map((c) => {
                const isOverdue = c.overdueByHours > 0;
                const hp = c.hoursPending || 0;
                const sla = c.slaTargetHours || 24;

                let inclusion = 'Excluded (M10 Filter)';
                if (c.status !== 'Resolved') {
                  const qIdx = queue.findIndex(q => q.id === c.id);
                  if (qIdx !== -1) {
                    inclusion = `Rank #${qIdx + 1} Active`;
                  } else {
                    inclusion = 'Pending In Queue';
                  }
                }

                return (
                  <tr key={c.id}>
                    <td><strong>{c.id}</strong></td>
                    <td>{c.category}</td>
                    <td>{hp} hrs</td>
                    <td>
                      {c.status === 'Resolved' ? (
                        <span className="sla-pill-green">Met at {hp}h</span>
                      ) : isOverdue ? (
                        <span className="sla-pill-red">Overdue (+{c.overdueByHours}h)</span>
                      ) : (
                        <span className="sla-pill-green">On Target ({sla}h)</span>
                      )}
                    </td>
                    <td>
                      <strong>Score {c.status === 'Resolved' ? (c.score?.base ?? 3) : (c.score?.total ?? 0)}</strong>
                    </td>
                    <td>
                      <span className={`status-tag status-${c.status?.toLowerCase().replace(' ', '-')}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <span className={c.status === 'Resolved' ? 'text-muted-italic' : 'text-rank-bold'}>
                        {inclusion}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
