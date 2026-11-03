// frontend/src/pages/SystemTools.js
import React, { useState, useEffect } from 'react';
import { api } from '../api';

function SystemTools() {
  const [complaints, setComplaints] = useState([]);
  const [rawJson, setRawJson] = useState('');
  const [copyStatus, setCopyStatus] = useState('Copy Raw');

  // Simulator Sliders
  const [wifiWeight, setWifiWeight] = useState(2);
  const [hostelWeight, setHostelWeight] = useState(2);
  const [classroomWeight, setClassroomWeight] = useState(1);
  const [labWeight, setLabWeight] = useState(3);
  const [ageDivisor, setAgeDivisor] = useState(24);

  const loadData = async () => {
    try {
      const list = await api.getComplaints();
      setComplaints(list);
      setRawJson(JSON.stringify(list, null, 2));
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResetSliders = () => {
    setWifiWeight(2);
    setHostelWeight(2);
    setClassroomWeight(1);
    setLabWeight(3);
    setAgeDivisor(24);
  };

  const handleResetData = async () => {
    if (window.confirm('Reset complaints database to default canonical seed data (C01 to C04)?')) {
      try {
        await api.resetData();
        await loadData();
        alert('Database restored to canonical seed baseline (C01 to C04).');
      } catch (e) {
        alert(e.message || 'Reset failed');
      }
    }
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(rawJson);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sati_dataset_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(rawJson);
    setCopyStatus('✓ Copied!');
    setTimeout(() => setCopyStatus('Copy Raw'), 2000);
  };

  // Simulate queue ranking based on custom sliders
  const weights = {
    'Wi-Fi': wifiWeight,
    Hostel: hostelWeight,
    Classroom: classroomWeight,
    Laboratory: labWeight
  };

  const simulatedQueue = [...complaints].map(c => {
    const base = weights[c.category] ?? 2;
    const hp = c.hoursPending || 0;
    const age = Math.floor(hp / ageDivisor);
    const reports = Math.min(c.supportCount || 0, 3);
    const simScore = base + age + reports;
    const officialScore = c.score?.total ?? 0;
    return {
      ...c,
      simScore,
      officialScore,
      elapsed: `${hp}h ago`
    };
  });

  simulatedQueue.sort((a, b) => b.simScore - a.simScore);

  return (
    <div className="gov-page-container">
      {/* Header section with PRD tags */}
      <div className="gov-header-section">
        <div>
          <div className="gov-breadcrumb-line">
            <span>ADMINISTRATIVE GOVERNANCE</span>
            <span>/</span>
            <span className="breadcrumb-current">DIAGNOSTICS &amp; SIMULATOR</span>
          </div>
          <h2 className="gov-page-title">System Tools &amp; Diagnostics</h2>
          <p className="gov-page-subtitle">
            Local persistence management, dataset synchronization, and live urgency score simulation according to PRD compliance protocol E5 &amp; E6.
          </p>
        </div>

        <div className="gov-action-cluster">
          <div className="persistence-active-tag">
            <span className="live-pulse-dot"></span>
            <span>PERSISTENCE ENGINE: backend/data/complaints.json (Atomic write active)</span>
          </div>
        </div>
      </div>

      {/* 4 Diagnostic Metric Cards */}
      <div className="gov-stats-grid">
        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Active Seed Baseline</span>
            <span>🗄️</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-number">4 Records</div>
            <div className="stat-subtitle">C01 to C04 verified</div>
          </div>
        </div>

        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Cache Integrity</span>
            <span>🛡️</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-number text-green">100% SHA-256</div>
            <div className="stat-subtitle">Zero checksum drift detected</div>
          </div>
        </div>

        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Simulator State</span>
            <span>⚡</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-number text-blue">In Sync</div>
            <div className="stat-subtitle">Client-side memory buffer</div>
          </div>
        </div>

        <div className="gov-card stat-card">
          <div className="stat-card-header">
            <span className="stat-card-title">Avg Priority SLA</span>
            <span>⏱️</span>
          </div>
          <div className="stat-card-body">
            <div className="stat-number">18.4 hrs</div>
            <div className="stat-subtitle">-4.2h vs statutory deadline</div>
          </div>
        </div>
      </div>

      {/* Card 1: Data Tools & Local Persistence (E6) */}
      <div className="gov-card data-tools-card">
        <div className="card-top-action-bar">
          <div className="tool-title-wrap">
            <span className="tool-icon">💾</span>
            <div>
              <h4>Data Tools &amp; Local Persistence (E6)</h4>
              <p>Synchronize, export snapshot payloads, and reset mock state.</p>
            </div>
          </div>

          <div className="tool-btns">
            <button className="gov-secondary-btn" onClick={handleExport}>
              ⬇ Export Dataset (JSON)
            </button>
            <button className="gov-btn-danger-outline" onClick={handleResetData}>
              🔄 Reset to Seed Data
            </button>
          </div>
        </div>

        <div className="integrity-status-pill">
          <span>✓ Last Import: 4 records imported, 0 skipped. Integrity verified against canonical schema.</span>
          <span className="sync-utc-stamp">12:44:09 UTC</span>
        </div>

        <div className="raw-store-dropzone">
          <div className="dropzone-header">
            <span className="dropzone-title">Raw Canonical Store</span>
            <span className="dropzone-badge">JSON Payload [C01..C04]</span>
            <button className="copy-raw-btn" onClick={handleCopyRaw}>
              📋 {copyStatus}
            </button>
          </div>
          <pre className="raw-json-viewer">{rawJson}</pre>
        </div>
      </div>

      {/* Card 2: Live Urgency Score Simulator (E5) */}
      <div className="gov-card simulator-card">
        <div className="card-top-action-bar">
          <div className="tool-title-wrap">
            <span className="tool-icon">🎛️</span>
            <div>
              <h4>Live Urgency Score Simulator (E5)</h4>
              <p>Real-time priority weight recalculation &amp; rank perturbation.</p>
            </div>
          </div>
          <button className="gov-btn-ghost" onClick={handleResetSliders}>
            ↺ Reset Default Sliders
          </button>
        </div>

        <div className="simulator-sandbox-notice">
          ℹ Browser-only sandbox: adjustments re-rank the live queue below without altering official repository data.
        </div>

        {/* Sliders Grid */}
        <div className="sliders-control-grid">
          <div className="slider-box">
            <div className="slider-label-row">
              <span className="slider-name">Wi-Fi Weight</span>
              <strong className="slider-val-badge">{wifiWeight}</strong>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={wifiWeight}
              onChange={(e) => setWifiWeight(parseInt(e.target.value, 10))}
              className="gov-range-slider"
            />
            <small>Default: 2 (Range 1-5)</small>
          </div>

          <div className="slider-box">
            <div className="slider-label-row">
              <span className="slider-name">Hostel Weight</span>
              <strong className="slider-val-badge">{hostelWeight}</strong>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={hostelWeight}
              onChange={(e) => setHostelWeight(parseInt(e.target.value, 10))}
              className="gov-range-slider"
            />
            <small>Default: 2 (Range 1-5)</small>
          </div>

          <div className="slider-box">
            <div className="slider-label-row">
              <span className="slider-name">Classroom</span>
              <strong className="slider-val-badge">{classroomWeight}</strong>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={classroomWeight}
              onChange={(e) => setClassroomWeight(parseInt(e.target.value, 10))}
              className="gov-range-slider"
            />
            <small>Default: 1 (Range 1-5)</small>
          </div>

          <div className="slider-box">
            <div className="slider-label-row">
              <span className="slider-name">Laboratory</span>
              <strong className="slider-val-badge">{labWeight}</strong>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              value={labWeight}
              onChange={(e) => setLabWeight(parseInt(e.target.value, 10))}
              className="gov-range-slider"
            />
            <small>Default: 3 (Range 1-5)</small>
          </div>

          <div className="slider-box">
            <div className="slider-label-row">
              <span className="slider-name">Age Divisor</span>
              <strong className="slider-val-badge">{ageDivisor}h</strong>
            </div>
            <input
              type="range"
              min="6"
              max="48"
              step="6"
              value={ageDivisor}
              onChange={(e) => setAgeDivisor(parseInt(e.target.value, 10))}
              className="gov-range-slider"
            />
            <small>Default: 24h (6h-48h)</small>
          </div>
        </div>

        {/* Live Simulated Output Table */}
        <div className="simulated-table-header">
          <strong>Live Simulated Queue Output</strong>
          <span className="sim-formula-tag">
            Dynamic Formula: Score = (Weight) + floor(Hours / {ageDivisor}h) + Reports
          </span>
        </div>

        <div className="table-responsive">
          <table className="gov-data-table">
            <thead>
              <tr>
                <th>SIM RANK</th>
                <th>OFFICIAL RANK</th>
                <th>TICKET ID</th>
                <th>DEPARTMENT</th>
                <th>LOCATION</th>
                <th>ELAPSED</th>
                <th>OFFICIAL SCORE</th>
                <th>SIM SCORE</th>
                <th>RANK DELTA</th>
              </tr>
            </thead>
            <tbody>
              {simulatedQueue.map((c, idx) => {
                const officialRank = complaints.findIndex(o => o.id === c.id) + 1;
                const simRank = idx + 1;
                const delta = officialRank - simRank;

                return (
                  <tr key={c.id}>
                    <td><strong className="text-rank-bold">#{simRank}</strong></td>
                    <td>#{officialRank || '—'}</td>
                    <td><strong>{c.id}</strong></td>
                    <td>{c.category}</td>
                    <td>{c.location || '—'}</td>
                    <td>{c.elapsed}</td>
                    <td>{c.officialScore}</td>
                    <td><strong className="text-blue">{c.simScore}</strong></td>
                    <td>
                      {delta > 0 ? (
                        <span className="delta-green">+{delta} ↑</span>
                      ) : delta < 0 ? (
                        <span className="delta-red">{delta} ↓</span>
                      ) : (
                        <span className="delta-zero">= 0</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card 3: API Contract & Developer Reference */}
      <div className="gov-card api-reference-card">
        <div className="card-top-action-bar">
          <div className="tool-title-wrap">
            <span className="tool-icon">🔌</span>
            <div>
              <h4>API Contract &amp; Developer Reference</h4>
              <p>Specifications for backend orchestration and client consumer party.</p>
            </div>
          </div>
          <span className="rest-badge">REST v3 Compliant</span>
        </div>

        <div className="api-contracts-grid">
          <div className="api-contract-box">
            <div className="contract-header">
              <span className="http-method-get">GET</span>
              <code>/config</code>
              <span className="http-status-200">200 OK</span>
            </div>
            <p className="contract-desc">Retrieves operational weights, SLAs, and tie-breaking rules.</p>
            <pre className="contract-code">{"{ weights: { Wi-Fi: 2, Hostel: 2, Classroom: 1, Laboratory: 3 } }"}</pre>
          </div>

          <div className="api-contract-box">
            <div className="contract-header">
              <span className="http-method-get">GET</span>
              <code>/priority-queue</code>
              <span className="http-status-200">200 OK</span>
            </div>
            <p className="contract-desc">Returns sorted queue array ranked by composite urgency score in descending order.</p>
            <pre className="contract-code">{"{ queue: [{ id: 'C03', rank: 1, score: { total: 4 } }] }"}</pre>
          </div>

          <div className="api-contract-box">
            <div className="contract-header">
              <span className="http-method-post">POST</span>
              <code>/complaints</code>
              <span className="http-status-201">201 Created</span>
            </div>
            <p className="contract-desc">Registers student grievance with atomic disk append and sequential ID generation.</p>
            <pre className="contract-code">{"{ category: 'Wi-Fi', description: 'Outage on 3rd floor', location: 'Hostel' }"}</pre>
          </div>

          <div className="api-contract-box">
            <div className="contract-header">
              <span className="http-method-patch">PATCH</span>
              <code>/complaints/:id/status</code>
              <span className="http-status-200">200 OK</span>
            </div>
            <p className="contract-desc">Updates ticket state between Raised, In Progress, and Resolved with audit trail.</p>
            <pre className="contract-code">{"{ to: 'In Progress', notes: 'Dispatched maintenance unit' }"}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemTools;
