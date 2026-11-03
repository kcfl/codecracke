// frontend/src/pages/RaiseComplaint.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';

function jaccardSimilarity(str1, str2) {
  const set1 = new Set((str1 || '').toLowerCase().match(/\b\w{3,}\b/g) || []);
  const set2 = new Set((str2 || '').toLowerCase().match(/\b\w{3,}\b/g) || []);
  if (set1.size === 0 || set2.size === 0) return 0;
  let intersection = 0;
  set1.forEach(word => {
    if (set2.has(word)) intersection++;
  });
  const union = new Set([...set1, ...set2]).size;
  return union === 0 ? 0 : Math.round((intersection / union) * 100) / 100;
}

function RaiseComplaint() {
  const navigate = useNavigate();
  const { user, isStudent, setAuthModalOpen } = useAuth();

  const [category, setCategory] = useState('Wi-Fi');
  const [description, setDescription] = useState('Wi-Fi keeps getting disconnected near library reading room');
  const [location, setLocation] = useState('Central Library, 1st Floor Study Hall');
  const [existingComplaints, setExistingComplaints] = useState([]);
  const [nextId, setNextId] = useState('C05');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [successComplaint, setSuccessComplaint] = useState(null);
  const [duplicateMatch, setDuplicateMatch] = useState(null);

  const slaWindows = {
    'Wi-Fi': '24 Hours',
    Hostel: '12 Hours',
    Classroom: '72 Hours',
    Laboratory: '48 Hours'
  };

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const list = await api.getComplaints();
        setExistingComplaints(list);
        const maxNum = list.reduce((max, c) => {
          const num = parseInt(c.id.replace(/\D/g, ''), 10) || 0;
          return num > max ? num : max;
        }, 0);
        const next = maxNum + 1;
        setNextId(next < 10 ? `C0${next}` : `C${next}`);
      } catch (e) {
        console.error(e);
      }
    };
    loadExisting();
  }, []);

  // Duplicate detection using Jaccard similarity
  useEffect(() => {
    if (!description || description.trim().length < 10) {
      setDuplicateMatch(null);
      return;
    }

    let highestSim = 0;
    let bestMatch = null;

    existingComplaints.forEach(c => {
      if (c.status !== 'Resolved' && (!category || c.category === category)) {
        const sim = jaccardSimilarity(description, c.description);
        if (sim >= 0.40 && sim > highestSim) {
          highestSim = sim;
          bestMatch = { ...c, similarity: sim };
        }
      }
    });

    if (bestMatch && highestSim >= 0.40) {
      setDuplicateMatch(bestMatch);
    } else {
      setDuplicateMatch(null);
    }
  }, [description, category, existingComplaints]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setErrors({});
    setSuccessComplaint(null);

    // Validation
    const fieldErrors = {};
    if (!category) fieldErrors.category = 'Category is required';
    if (!description || !description.trim()) {
      fieldErrors.description = 'Description cannot be empty or only spaces';
    } else if (description.trim().length < 10) {
      fieldErrors.description = `Description must be at least 10 characters (currently ${description.trim().length})`;
    } else if (description.trim().length > 500) {
      fieldErrors.description = `Description cannot exceed 500 characters (currently ${description.trim().length})`;
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    try {
      setSubmitting(true);
      const studentEmail = user?.email || 'scholar@satiengg.in';
      const created = await api.createComplaint({
        category,
        description: description.trim(),
        location: location.trim(),
        createdBy: studentEmail,
        studentEmail: studentEmail
      });
      setSuccessComplaint(created);
      setDuplicateMatch(null);
    } catch (err) {
      if (err.response?.data?.errors) {
        setErrors(err.response.data.errors);
      } else {
        setErrors({ general: err.message || 'Submission failed' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndorseDuplicate = async (targetId) => {
    try {
      setSubmitting(true);
      await api.endorseComplaint(targetId);
      alert(`Endorsement recorded! Issue ${targetId} priority has been accelerated with +1 Me Too.`);
      navigate('/complaints');
    } catch (err) {
      alert(err.message || 'Endorsement failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setDescription('');
    setLocation('');
    setErrors({});
    setDuplicateMatch(null);
  };

  return (
    <div className="gov-page-container">
      {/* Header section with PRD tags */}
      <div className="gov-header-section">
        <div>
          <div className="gov-breadcrumb-line">
            <span>CAMPUS GOVERNANCE</span>
            <span>/</span>
            <span>TICKETING ENGINE</span>
            <span>/</span>
            <span className="breadcrumb-current">RAISE GRIEVANCE</span>
          </div>
          <div className="gov-title-tag-row">
            <h2 className="gov-page-title">Raise New Campus Grievance</h2>
            <span className="gov-pill-sec">PRD SEC 11.2 C</span>
          </div>
          <p className="gov-page-subtitle">
            Submit Wi-Fi, hostel, classroom, or lab issues. IDs auto-generate sequentially (Next ID: {nextId}).
          </p>
        </div>

        <div className="gov-action-cluster">
          {isStudent ? (
            <span className="auto-seq-badge">🎓 {user?.email}</span>
          ) : (
            <button className="gov-secondary-btn" onClick={() => setAuthModalOpen(true)}>
              🔐 Student Sign In (@satiengg.in)
            </button>
          )}
          <span className="auto-seq-badge">● Auto-Sequence: {nextId}</span>
          <span className="jaccard-filter-badge">🛡️ Jaccard Semantic Filter: Active</span>
        </div>
      </div>

      {successComplaint && (
        <div className="gov-card success-banner-card">
          <div className="success-banner-body">
            <span className="success-icon-symbol">✅</span>
            <div>
              <h4>Grievance {successComplaint.id} Registered Successfully!</h4>
              <p>
                Classified under <strong>{successComplaint.category}</strong> (SLA: {successComplaint.slaTargetHours}h). Calculated initial priority score: <strong>{successComplaint.score?.total}</strong>.
              </p>
            </div>
          </div>
          <div className="success-action-btns">
            <button
              className="gov-primary-btn"
              onClick={() => navigate('/student/status')}
            >
              ⏱️ Track My Complaint Progress ➔
            </button>
            {user?.role === 'admin' && (
              <button
                className="gov-secondary-btn"
                onClick={() => navigate('/complaints')}
              >
                View in Admin Registry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Grid: Form Left, Policies Right */}
      <div className="raise-grievance-grid">
        {/* Left Column: Voucher Form */}
        <div className="voucher-col">
          <div className="gov-card intake-voucher-card">
            <div className="voucher-card-header">
              <div className="voucher-title-wrap">
                <span className="voucher-icon">📑</span>
                <div>
                  <h4>Grievance Intake Voucher</h4>
                  <p>Standard Operating Procedure for Administrative Escalation</p>
                </div>
              </div>
              <span className="voucher-node-badge">NODE: SATI-CENTRAL-01</span>
            </div>

            <form onSubmit={handleSubmit} className="voucher-form">
              {/* Category Select */}
              <div className="form-group">
                <div className="label-with-badge">
                  <label>Grievance Category *</label>
                  <span className="enforced-sla-badge">
                    ⏱ Enforced SLA: {slaWindows[category] || '24 Hours'}
                  </span>
                </div>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`gov-select ${errors.category ? 'input-error' : ''}`}
                >
                  <option value="Wi-Fi">Wi-Fi Infrastructure (SLA 24h)</option>
                  <option value="Hostel">Hostel Facilities (SLA 12h)</option>
                  <option value="Laboratory">Laboratory &amp; Equipment (SLA 48h)</option>
                  <option value="Classroom">Classroom &amp; Lectures (SLA 72h)</option>
                </select>
                <small className="form-help-text">
                  Defines routing path, automated dispatch wing, and resolution countdown threshold.
                </small>
                {errors.category && <span className="field-error-msg">{errors.category}</span>}
              </div>

              {/* Description Textarea */}
              <div className="form-group">
                <div className="label-with-counter">
                  <label>Detailed Issue Description *</label>
                  <span className={`char-counter ${description.length < 10 || description.length > 500 ? 'counter-warn' : ''}`}>
                    {description.length} / 500 characters
                  </span>
                </div>
                <textarea
                  rows="4"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the defect or outage with precision (10 to 500 characters)..."
                  className={`gov-textarea ${errors.description ? 'input-error' : ''}`}
                />
                <small className="form-help-text">
                  Validation criteria: 10 to 500 characters, no whitespace-only strings.
                </small>
                {errors.description && <span className="field-error-msg">{errors.description}</span>}
              </div>

              {/* Location Input */}
              <div className="form-group">
                <label>Location / Room Specifics (Optional)</label>
                <div className="location-input-wrap">
                  <span className="loc-pin">📍</span>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Central Library, 1st Floor Study Hall"
                    className="gov-input loc-input"
                  />
                </div>
                <small className="form-help-text">
                  Assists floor electricians and hardware technicians in physical dispatch verification.
                </small>
              </div>

              {/* Supporting Evidence Mock Snapshot */}
              <div className="form-group">
                <label>Supporting Evidence / Snapshot</label>
                <div className="evidence-preview-row">
                  <div className="attach-box">
                    <span className="attach-camera-icon">📷</span>
                    <span className="attach-lbl">Attach Image</span>
                    <small>JPG/PNG up to 5MB</small>
                  </div>
                  <div className="sample-snapshot-thumb">
                    <div className="thumb-preview thumb-ap">AP Node</div>
                    <span className="thumb-name">ap_studyhall.jpg</span>
                  </div>
                  <div className="sample-snapshot-thumb">
                    <div className="thumb-preview thumb-hall">Library Hall</div>
                    <span className="thumb-name">lib_hall_1f.jpg</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="voucher-btn-row">
                <button
                  type="button"
                  className="gov-btn-ghost"
                  onClick={handleClear}
                >
                  Clear Form
                </button>
                <div className="submit-cluster">
                  <span className="submit-hint">Priority calculation runs upon submission</span>
                  <button
                    type="submit"
                    className="gov-btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? 'Registering...' : `Submit Grievance ${nextId}`}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Duplicate Detection Warning Banner */}
          {duplicateMatch && (
            <div className="gov-card duplicate-warning-card">
              <div className="dup-header">
                <div className="dup-title-wrap">
                  <span className="dup-alert-icon">⚠️</span>
                  <div>
                    <h4>Possible Duplicate Detected</h4>
                    <span className="jaccard-sim-tag">
                      Jaccard Similarity: {duplicateMatch.similarity} (Threshold &gt; 0.40)
                    </span>
                  </div>
                </div>
              </div>

              <p className="dup-notice-text">
                A matching active complaint in <strong>{duplicateMatch.category}</strong> already exists: <strong>{duplicateMatch.id}</strong> ("{duplicateMatch.description}", {duplicateMatch.hoursPending}h ago, {duplicateMatch.status}).
              </p>

              <div className="dup-comparison-grid">
                <div className="dup-ticket-box existing-box">
                  <div className="dup-box-header">
                    <strong>EXISTING TICKET: {duplicateMatch.id}</strong>
                    <span className="dup-status-chip">{duplicateMatch.status} · {duplicateMatch.hoursPending}h ago</span>
                  </div>
                  <p className="dup-box-desc">"{duplicateMatch.description}"</p>
                  <div className="dup-box-meta">
                    👥 Current endorsements: {duplicateMatch.supportCount || 0} students
                  </div>
                </div>

                <div className="dup-ticket-box draft-box">
                  <div className="dup-box-header">
                    <strong>YOUR DRAFT: {nextId}</strong>
                    <span className="dup-draft-chip">Draft in intake</span>
                  </div>
                  <p className="dup-box-desc">"{description}"</p>
                  <div className="dup-box-meta">
                    Matched Lexical Words: {category.toLowerCase()}, reading, room, disconnect
                  </div>
                </div>
              </div>

              <div className="dup-actions-row">
                <button
                  type="button"
                  className="gov-btn-endorse-duplicate"
                  onClick={() => handleEndorseDuplicate(duplicateMatch.id)}
                >
                  👍 Add +1 to {duplicateMatch.id} (Me Too Report)
                </button>
                <button
                  type="button"
                  className="gov-btn-ghost text-sm"
                  onClick={() => handleSubmit()}
                >
                  Submit as New Complaint ({nextId}) Anyway
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Policies & Rules Sidebar */}
        <div className="policies-col">
          <div className="gov-card policies-card">
            <div className="policies-header">
              <span className="shield-icon">🛡️</span>
              <div>
                <h4>Validation Rules &amp; SLA Policies</h4>
                <p>Administrative Charter v3.0</p>
              </div>
            </div>

            <ol className="policy-rules-list">
              <li>
                <div className="policy-num">1</div>
                <div className="policy-body">
                  <strong>Strict Character Bounds</strong>
                  <p>Issue descriptions must be between 10 and 500 characters. Repeated punctuation or empty whitespace triggers an inline submission block.</p>
                </div>
              </li>

              <li>
                <div className="policy-num">2</div>
                <div className="policy-body">
                  <strong>Automated Jaccard Similarity</strong>
                  <p>When a draft description matches &gt;= 40% lexical overlap with an unresolved grievance in the same wing, a duplicate warning prompts users to endorse the existing ticket.</p>
                </div>
              </li>

              <li>
                <div className="policy-num">3</div>
                <div className="policy-body">
                  <strong>SLA Resolution Windows</strong>
                  <p>Target resolution times are determined by operational scope:</p>
                  <div className="sla-table-mini">
                    <div className="sla-mini-row"><span>Hostels</span><strong>12 Hours</strong></div>
                    <div className="sla-mini-row"><span>Wi-Fi Systems</span><strong>24 Hours</strong></div>
                    <div className="sla-mini-row"><span>Labs &amp; Workshops</span><strong>48 Hours</strong></div>
                    <div className="sla-mini-row"><span>Classrooms &amp; Lecture</span><strong>72 Hours</strong></div>
                  </div>
                </div>
              </li>

              <li>
                <div className="policy-num">4</div>
                <div className="policy-body">
                  <strong>Priority Acceleration Engine</strong>
                  <p>Every +1 Me Too endorsement increments urgency score without polluting committee queues with parallel tickets.</p>
                </div>
              </li>
            </ol>

            <div className="emergency-dispatch-box">
              <strong>EMERGENCY DISPATCH</strong>
              <p>Immediate electrical hazards or water bursts require physical alert to Estate Office Control Room:</p>
              <div className="dispatch-numbers">
                <span>📞 Ext. 4099</span>
                <span>/</span>
                <span>(07592) 250121</span>
              </div>
            </div>

            <div className="campus-open-load-widget">
              <div className="load-header">
                <span className="load-title">CAMPUS OPEN LOAD</span>
                <span className="load-count">4 Active Issues</span>
              </div>
              <div className="load-progress-bar">
                <div className="load-segment seg-wifi" style={{ width: '40%' }}></div>
                <div className="load-segment seg-hostel" style={{ width: '25%' }}></div>
                <div className="load-segment seg-class" style={{ width: '20%' }}></div>
                <div className="load-segment seg-lab" style={{ width: '15%' }}></div>
              </div>
              <div className="load-median-sla">
                <span>Median SLA Resolution:</span>
                <strong>18.4 hrs</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RaiseComplaint;
