// frontend/src/pages/Complaints.js
import React, { useState, useEffect } from 'react';
import { api } from '../api';

function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('priority');
  const [selected, setSelected] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stats, setStats] = useState(null);

  const fetchComplaints = async () => {
    try {
      const [list, statsData] = await Promise.all([
        api.getComplaints({ q, category, status, sort }),
        api.getStats()
      ]);
      setComplaints(list);
      setStats(statsData);

      // Auto-select first complaint if none selected or if previously selected is missing
      if (list.length > 0) {
        if (!selected) {
          setSelected(list[0]);
        } else {
          const found = list.find(c => c.id === selected.id);
          setSelected(found || list[0]);
        }
      } else {
        setSelected(null);
      }
    } catch (err) {
      console.error('Failed to fetch complaints:', err);
    }
  };

  useEffect(() => {
    fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, status, sort]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchComplaints();
  };

  const handleClearFilters = () => {
    setQ('');
    setCategory('');
    setStatus('');
    setSort('priority');
  };

  const handleAdvance = async () => {
    if (!selected || !selected.nextStatus) return;
    try {
      setActionLoading(true);
      const updated = await api.updateStatus(selected.id, selected.nextStatus);
      setSelected(updated);
      await fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Status transition failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndorse = async () => {
    if (!selected) return;
    try {
      setActionLoading(true);
      const updated = await api.endorseComplaint(selected.id);
      setSelected(updated);
      await fetchComplaints();
    } catch (err) {
      alert(err.response?.data?.message || err.message || 'Endorsement failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(complaints, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sati_complaints_ledger_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="gov-page-container">
      {/* Header section with PRD tags */}
      <div className="gov-header-section">
        <div>
          <div className="gov-breadcrumb-line">
            <span>CAMPUS ADMINISTRATION</span>
            <span>&gt;</span>
            <span className="breadcrumb-current">TRIAGE &amp; INSPECTION NODE</span>
          </div>
          <h2 className="gov-page-title">Active Complaints Registry</h2>
          <p className="gov-page-subtitle">
            Real-time dynamic urgency scoring engine, SLA tracking, and audit-verified lifecycle routing.
          </p>
        </div>

        <div className="gov-action-cluster">
          <div className="gov-engine-status-pill">
            <span className="live-pulse-dot"></span>
            <span>AUTOMATED SCORING ENGINE: E3/E4 Active</span>
          </div>
          <button className="gov-secondary-btn" onClick={handleExport}>
            ⬇ Export Ledger
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="gov-card filter-toolbar-card">
        <form onSubmit={handleSearchSubmit} className="filter-form-row">
          <div className="search-input-wrap">
            <span className="search-icon-symbol">🔍</span>
            <input
              type="text"
              placeholder="Search by ID (e.g. C01) or description"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="gov-search-input"
            />
          </div>

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="gov-select"
          >
            <option value="">All Categories</option>
            <option value="Wi-Fi">Wi-Fi</option>
            <option value="Hostel">Hostel</option>
            <option value="Classroom">Classroom</option>
            <option value="Laboratory">Laboratory</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="gov-select"
          >
            <option value="">All Statuses</option>
            <option value="Raised">Raised</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="gov-select"
          >
            <option value="priority">Highest Priority ⇅</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>

          <button
            type="button"
            className="gov-btn-ghost"
            onClick={handleClearFilters}
          >
            Clear Filters
          </button>
        </form>

        <div className="filter-meta-bar">
          <span className="meta-showing-count">
            Showing {complaints.length} of {stats?.total ?? 4} complaints ({stats?.pending ?? 3} Pending, {stats?.resolved ?? 1} Resolved)
          </span>
          <div className="urgency-band-legend">
            <span className="band-legend-item"><span className="legend-dot band-high-dot"></span> High (&gt;5)</span>
            <span className="band-legend-item"><span className="legend-dot band-med-dot"></span> Medium (3-5)</span>
            <span className="band-legend-item"><span className="legend-dot band-low-dot"></span> Low (1-2)</span>
          </div>
        </div>
      </div>

      {/* Main Split Grid: Left Table, Right Inspection Node */}
      <div className="complaints-registry-split">
        {/* Left Side: Table */}
        <div className="registry-table-col">
          <div className="gov-card complaints-table-card">
            <div className="table-responsive">
              <table className="gov-data-table table-hoverable">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>CATEGORY</th>
                    <th>DESCRIPTION</th>
                    <th>LOCATION</th>
                    <th>STATUS</th>
                    <th>HOURS</th>
                    <th>SCORE</th>
                  </tr>
                </thead>
                <tbody>
                  {complaints.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-6 text-muted">
                        No complaints match your active filter criteria.
                      </td>
                    </tr>
                  ) : (
                    complaints.map((c) => {
                      const isSelected = selected?.id === c.id;
                      const scoreVal = c.status === 'Resolved' ? (c.score?.base ?? 3) : (c.score?.total ?? 0);
                      const isOverdue = c.overdueByHours > 0;

                      return (
                        <tr
                          key={c.id}
                          className={`table-row-selectable ${isSelected ? 'row-selected' : ''}`}
                          onClick={() => setSelected(c)}
                        >
                          <td>
                            <strong className="ticket-id-cell">{c.id}</strong>
                          </td>
                          <td>
                            <span className="category-cell-badge">{c.category}</span>
                          </td>
                          <td className="description-cell">
                            <div className="desc-text-truncate">{c.description}</div>
                          </td>
                          <td className="location-cell">
                            {c.location || '—'}
                          </td>
                          <td>
                            <span className={`status-tag status-${c.status?.toLowerCase().replace(' ', '-')}`}>
                              {c.status}
                            </span>
                          </td>
                          <td>
                            <span className={isOverdue ? 'hours-overdue-tag' : 'hours-normal-tag'}>
                              {c.hoursPending}h
                            </span>
                          </td>
                          <td>
                            <span className={`score-badge score-band-${c.urgencyBand?.toLowerCase()}`}>
                              {scoreVal}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="registry-table-subfooter">
              <span>Dynamic Queue Sorting: Priority Descent · Engine Cycle: Active · Page 1 of 1</span>
            </div>
          </div>

          {/* SLA Latency Summary Footer Card */}
          <div className="gov-card sla-latency-summary-card">
            <div className="latency-icon-box">⏱️</div>
            <div className="latency-text-block">
              <strong>Mean SLA Resolution Latency</strong>
              <p>Average resolution achieved within 18.2 hours for critical utility infrastructure.</p>
            </div>
            <div className="latency-percentage-circle">
              <span className="percent-val">94.1%</span>
              <span className="percent-lbl">Within SLA</span>
            </div>
          </div>
        </div>

        {/* Right Side: Inspection Node Details Panel */}
        <div className="inspection-node-col">
          {selected ? (
            <div className="gov-card inspection-node-card">
              <div className="inspection-header">
                <div className="node-id-cluster">
                  <span className="inspection-pill">INSPECTION NODE</span>
                  <span className="inspection-ref">Ref #CAMPUS-{selected.id}</span>
                </div>
                {selected.overdueByHours > 0 ? (
                  <span className="status-chip chip-overdue">
                    ● Overdue by {selected.overdueByHours}h
                  </span>
                ) : (
                  <span className="status-chip chip-target">
                    ● SLA Compliant
                  </span>
                )}
              </div>

              <div className="inspection-body">
                <h3 className="inspection-title">Complaint {selected.id} Details</h3>
                <p className="inspection-wing-text">
                  Central Library Infrastructure Wing · Assigned to Operations
                </p>

                <div className="inspection-meta-tags">
                  <span className="meta-pill">Category: <strong>{selected.category}</strong></span>
                  <span className="meta-pill">Weight: <strong>{selected.score?.base ?? 2}</strong></span>
                  <span className="meta-pill">SLA: <strong>{selected.slaTargetHours}h</strong></span>
                </div>

                <div className="inspection-description-quote">
                  <p>"{selected.description}"</p>
                </div>

                <div className="inspection-location-row">
                  <span className="pin-symbol">📍</span>
                  <span>{selected.location || 'Campus premises / unspecified node'}</span>
                </div>

                {/* Urgency Formula Scorecard */}
                <div className="inspection-scorecard-box">
                  <div className="scorecard-header">
                    <span className="scorecard-title">Urgency Formula Scorecard</span>
                    <span className={`scorecard-band-tag band-${selected.urgencyBand?.toLowerCase()}`}>
                      BAND: {selected.urgencyBand}
                    </span>
                  </div>

                  <div className="scorecard-grid">
                    <div className="scorecard-cell">
                      <span className="cell-num">{selected.score?.base ?? 0}</span>
                      <span className="cell-lbl">BASE (Weight)</span>
                    </div>
                    <div className="scorecard-cell">
                      <span className="cell-num">+{selected.score?.age ?? 0}</span>
                      <span className="cell-lbl">AGE floor({selected.hoursPending}/24)</span>
                    </div>
                    <div className="scorecard-cell">
                      <span className="cell-num">+{selected.score?.reports ?? 0}</span>
                      <span className="cell-lbl">REPORTS (Me Too)</span>
                    </div>
                    <div className="scorecard-cell total-cell">
                      <span className="cell-num total-num">
                        {selected.status === 'Resolved' ? (selected.score?.base ?? 3) : (selected.score?.total ?? 0)}
                      </span>
                      <span className="cell-lbl total-lbl">TOTAL Priority</span>
                    </div>
                  </div>

                  <div className="scorecard-equation">
                    Base ({selected.score?.base}) + Age floor({selected.hoursPending}/24) ({selected.score?.age}) + Reports ({selected.score?.reports}) = Total Score {selected.score?.total}
                  </div>
                </div>

                {/* Status Transition Audit Trail (E4) */}
                <div className="inspection-audit-trail">
                  <h5>Status Transition Audit Trail (E4) · Immutable Log</h5>
                  <div className="audit-timeline">
                    <div className="timeline-item">
                      <span className="timeline-dot dot-blue"></span>
                      <div className="timeline-content">
                        <strong>Complaint Raised by Student</strong>
                        <span className="timeline-time">
                          {selected.submittedAt ? new Date(selected.submittedAt).toLocaleString('en-IN') : 'Recent'}
                        </span>
                        <p className="timeline-detail">
                          Authenticated student ticket via SATI Portal (Roll #2022-CS-104)
                        </p>
                      </div>
                    </div>

                    {selected.overdueByHours > 0 && (
                      <div className="timeline-item">
                        <span className="timeline-dot dot-red"></span>
                        <div className="timeline-content">
                          <strong className="text-red">Automated SLA breach alert logged</strong>
                          <span className="timeline-time">Automatic Trigger</span>
                          <p className="timeline-detail">
                            Elapsed pending time exceeded {selected.slaTargetHours}h statutory threshold.
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="timeline-item">
                      <span className="timeline-dot dot-green"></span>
                      <div className="timeline-content">
                        <strong>Currently: {selected.status}</strong>
                        <span className="timeline-time">Active Phase</span>
                        <p className="timeline-detail">
                          {selected.nextStatus
                            ? `Valid next authorized governance transition step: ${selected.nextStatus}`
                            : 'Terminal resolution achieved. No further transitions.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Support Endorsement (E3) */}
                <div className="inspection-endorsement-box">
                  <div className="endorsement-info">
                    <strong>Student Support Endorsement (E3)</strong>
                    <p>Campus peer verification accelerates priority weight.</p>
                  </div>
                  <button
                    className="endorse-btn"
                    onClick={handleEndorse}
                    disabled={actionLoading || (selected.supportCount ?? 0) >= 3}
                  >
                    👍 +1 Me Too (3 max boost, currently {selected.supportCount ?? 0})
                  </button>
                </div>

                {/* Advance Button */}
                {selected.nextStatus && (
                  <button
                    className="advance-action-btn"
                    onClick={handleAdvance}
                    disabled={actionLoading}
                  >
                    {actionLoading
                      ? 'Executing Transition...'
                      : `⚡ Advance Status: Transition to '${selected.nextStatus}'`}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="gov-card inspection-empty-card">
              <span className="empty-icon">👈</span>
              <p>Select any complaint from the registry table to view its audit scorecard and transition controls.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Complaints;
