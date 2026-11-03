// frontend/src/components/AuthModal.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

function AuthModal() {
  const navigate = useNavigate();
  const {
    authModalOpen,
    setAuthModalOpen,
    authInitialMode,
    sendStudentOtp,
    verifyStudentOtp,
    setStudentPassword,
    loginStudent,
    loginAdmin
  } = useAuth();

  const [mode, setMode] = useState('student'); // 'student' or 'admin'
  const [studentAction, setStudentAction] = useState('verify'); // 'verify' or 'login'
  const [step, setStep] = useState(1); // 1: email, 2: verify code, 3: set password

  // Inputs
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminEmail, setAdminEmail] = useState('devbandil19@gmail.com');
  const [adminPassword, setAdminPassword] = useState('devxyz');

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [demoCode, setDemoCode] = useState('');

  useEffect(() => {
    if (authInitialMode) {
      setMode(authInitialMode);
    }
  }, [authInitialMode, authModalOpen]);

  if (!authModalOpen) return null;

  // Step 1: Send OTP code
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed.endsWith('@satiengg.in')) {
      setError('Access Restricted: Only @satiengg.in college email addresses are authorized.');
      return;
    }

    try {
      setLoading(true);
      const res = await sendStudentOtp(trimmed);
      setStep(2);
      setSuccessMsg(`Verification code dispatched to ${trimmed}`);
      if (res && res.code) {
        setDemoCode(res.code);
        setCode(res.code); // Pre-fill for seamless instant evaluation
      }
    } catch (err) {
      setError(err.message || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP code -> transition to set password
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await verifyStudentOtp(email, code);
      setSuccessMsg('Code verified! Please establish your student account password.');
      setStep(3); // Go to Set Password step!
    } catch (err) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Set Password
  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);
      await setStudentPassword(email, password, code);
      setSuccessMsg('Account registered & verified! Entering student intake portal...');
      setTimeout(() => {
        setAuthModalOpen(false);
        setStep(1);
        navigate('/student');
      }, 1000);
    } catch (err) {
      setError(err.message || 'Failed to set password.');
    } finally {
      setLoading(false);
    }
  };

  // Student Direct Login (if already registered)
  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = (email || '').trim().toLowerCase();
    if (!trimmed.endsWith('@satiengg.in')) {
      setError('Institutional email must end with @satiengg.in');
      return;
    }
    try {
      setLoading(true);
      await loginStudent(trimmed, password);
      setSuccessMsg('Student authentication successful!');
      setTimeout(() => {
        setAuthModalOpen(false);
        navigate('/student');
      }, 800);
    } catch (err) {
      setError(err.message || 'Invalid student credentials.');
    } finally {
      setLoading(false);
    }
  };

  // Admin Login with devxyz
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      setLoading(true);
      await loginAdmin(adminEmail, adminPassword);
      setSuccessMsg('Administrative access granted: Dev Bandil (Dean of Administration).');
      setTimeout(() => {
        setAuthModalOpen(false);
        navigate('/');
      }, 800);
    } catch (err) {
      setError(err.message || 'Invalid Admin credentials. Passcode: devxyz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gov-modal-backdrop" onClick={() => setAuthModalOpen(false)}>
      <div className="gov-modal-card auth-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-cluster">
            <span className="modal-icon">{mode === 'student' ? '🎓' : '🏛️'}</span>
            <div>
              <h3>{mode === 'student' ? 'SATI Student Authentication' : 'Dean / Administrator Portal'}</h3>
              <p>{mode === 'student' ? 'Restricted to @satiengg.in institutional domain' : 'Executive Cockpit Governance Authorization'}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setAuthModalOpen(false)}>✕</button>
        </div>

        {/* Tab switcher */}
        <div className="auth-tab-switch">
          <button
            className={`auth-tab ${mode === 'student' ? 'active' : ''}`}
            onClick={() => { setMode('student'); setError(''); }}
          >
            Student Access (@satiengg.in)
          </button>
          <button
            className={`auth-tab ${mode === 'admin' ? 'active' : ''}`}
            onClick={() => { setMode('admin'); setError(''); }}
          >
            Admin Sign In
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="gov-alert-banner alert-danger">{error}</div>}
          {successMsg && <div className="gov-alert-banner alert-success">{successMsg}</div>}

          {mode === 'student' ? (
            <div>
              {/* Sub-tabs for Student: Verify/Sign Up vs Password Login */}
              <div className="student-subtab-row">
                <button
                  type="button"
                  className={`subtab-btn ${studentAction === 'verify' ? 'active-subtab' : ''}`}
                  onClick={() => { setStudentAction('verify'); setStep(1); setError(''); }}
                >
                  Verify Email &amp; Set Password
                </button>
                <button
                  type="button"
                  className={`subtab-btn ${studentAction === 'login' ? 'active-subtab' : ''}`}
                  onClick={() => { setStudentAction('login'); setError(''); }}
                >
                  Password Sign In
                </button>
              </div>

              {studentAction === 'verify' ? (
                step === 1 ? (
                  <form onSubmit={handleSendOtp} className="auth-form">
                    <div className="form-group">
                      <label>College Email Address (@satiengg.in) *</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. 0108cs211042@satiengg.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="gov-input"
                      />
                      <small className="form-help-text">
                        Must end with <strong>@satiengg.in</strong>. A 6-digit code will be dispatched.
                      </small>
                    </div>

                    <div className="demo-hint-box">
                      <strong>💡 Instant Demo Tip:</strong>
                      <span>Enter any address ending with <code>@satiengg.in</code> (e.g. <code>student@satiengg.in</code>).</span>
                    </div>

                    <button type="submit" className="gov-btn-primary" disabled={loading}>
                      {loading ? 'Sending Code...' : 'Send Verification Code ➔'}
                    </button>
                  </form>
                ) : step === 2 ? (
                  <form onSubmit={handleVerifyOtp} className="auth-form">
                    <div className="form-group">
                      <label>Enter 6-Digit Verification Code *</label>
                      <input
                        type="text"
                        required
                        maxLength="6"
                        placeholder="e.g. 739201"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        className="gov-input text-center text-tracking-wide"
                      />
                      {demoCode && (
                        <small className="form-success-text">
                          Auto-detected Code: <strong>{demoCode}</strong>
                        </small>
                      )}
                    </div>

                    <div className="auth-action-row">
                      <button type="button" className="gov-btn-ghost" onClick={() => setStep(1)}>
                        ← Change Email
                      </button>
                      <button type="submit" className="gov-btn-primary" disabled={loading}>
                        {loading ? 'Verifying...' : 'Verify Code ✓'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleSetPassword} className="auth-form">
                    <div className="form-group">
                      <label>Set Student Account Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter new password (min 4 chars)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="gov-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="gov-input"
                      />
                    </div>

                    <button type="submit" className="gov-btn-primary" disabled={loading}>
                      {loading ? 'Saving...' : 'Set Password & Enter Student Portal ✓'}
                    </button>
                  </form>
                )
              ) : (
                <form onSubmit={handleStudentLogin} className="auth-form">
                  <div className="form-group">
                    <label>College Email (@satiengg.in) *</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. student@satiengg.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="gov-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>Password *</label>
                    <input
                      type="password"
                      required
                      placeholder="Enter your student password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="gov-input"
                    />
                  </div>
                  <button type="submit" className="gov-btn-primary" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In as Student ➔'}
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleAdminLogin} className="auth-form">
              <div className="form-group">
                <label>Admin Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. devbandil19@gmail.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="gov-input"
                />
              </div>

              <div className="form-group">
                <label>Admin Master Password *</label>
                <input
                  type="password"
                  required
                  placeholder="Enter admin password (devxyz)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="gov-input"
                />
                <small className="form-help-text">
                  Your designated Admin credentials: <strong>devbandil19@gmail.com</strong> / password: <code>devxyz</code>
                </small>
              </div>

              <button type="submit" className="gov-btn-primary" disabled={loading}>
                {loading ? 'Authorizing...' : 'Unlock Executive Governance Cockpit ➔'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
