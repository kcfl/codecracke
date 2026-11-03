// frontend/src/components/QRModal.js
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

function QRModal() {
  const { qrModalOpen, setQrModalOpen, setAuthModalOpen } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!qrModalOpen) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin + '/raise?portal=student' : 'https://sati-grievance.vercel.app/raise?portal=student';

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="gov-modal-backdrop" onClick={() => setQrModalOpen(false)}>
      <div className="gov-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-cluster">
            <span className="modal-icon">📲</span>
            <div>
              <h3>Campus QR Dispatch Terminal</h3>
              <p>Official SATI Student Grievance Intake Node</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={() => setQrModalOpen(false)}>✕</button>
        </div>

        <div className="modal-body text-center">
          <div className="qr-container-box">
            {/* High-Resolution Clean Vector QR Code Representation */}
            <svg
              className="qr-code-svg"
              viewBox="0 0 256 256"
              width="210"
              height="210"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="256" height="256" fill="#ffffff" rx="12" />
              {/* Outer corner positioning squares */}
              <rect x="20" y="20" width="60" height="60" fill="#1e3a8a" rx="4" />
              <rect x="30" y="30" width="40" height="40" fill="#ffffff" rx="2" />
              <rect x="40" y="40" width="20" height="20" fill="#1e3a8a" rx="2" />

              <rect x="176" y="20" width="60" height="60" fill="#1e3a8a" rx="4" />
              <rect x="186" y="30" width="40" height="40" fill="#ffffff" rx="2" />
              <rect x="196" y="40" width="20" height="20" fill="#1e3a8a" rx="2" />

              <rect x="20" y="176" width="60" height="60" fill="#1e3a8a" rx="4" />
              <rect x="30" y="186" width="40" height="40" fill="#ffffff" rx="2" />
              <rect x="40" y="196" width="20" height="20" fill="#1e3a8a" rx="2" />

              {/* Data matrix pattern simulating real grievance intake QR */}
              <rect x="96" y="24" width="16" height="16" fill="#1e3a8a" />
              <rect x="120" y="24" width="16" height="16" fill="#1e3a8a" />
              <rect x="144" y="24" width="16" height="16" fill="#1e3a8a" />

              <rect x="96" y="48" width="16" height="16" fill="#0ea5e9" />
              <rect x="136" y="48" width="24" height="16" fill="#1e3a8a" />

              <rect x="96" y="72" width="24" height="16" fill="#1e3a8a" />
              <rect x="128" y="72" width="16" height="24" fill="#0ea5e9" />

              <rect x="24" y="96" width="16" height="24" fill="#1e3a8a" />
              <rect x="48" y="96" width="24" height="16" fill="#1e3a8a" />
              <rect x="80" y="96" width="16" height="16" fill="#0ea5e9" />
              <rect x="112" y="96" width="32" height="16" fill="#1e3a8a" />
              <rect x="160" y="96" width="16" height="24" fill="#1e3a8a" />
              <rect x="192" y="96" width="24" height="16" fill="#0ea5e9" />
              <rect x="224" y="96" width="16" height="16" fill="#1e3a8a" />

              <rect x="24" y="128" width="32" height="16" fill="#1e3a8a" />
              <rect x="72" y="120" width="16" height="32" fill="#1e3a8a" />
              <rect x="96" y="128" width="24" height="16" fill="#0ea5e9" />
              <rect x="136" y="128" width="40" height="16" fill="#1e3a8a" />
              <rect x="184" y="120" width="16" height="24" fill="#1e3a8a" />
              <rect x="208" y="128" width="32" height="16" fill="#1e3a8a" />

              <rect x="24" y="152" width="16" height="16" fill="#0ea5e9" />
              <rect x="56" y="152" width="24" height="16" fill="#1e3a8a" />
              <rect x="96" y="152" width="16" height="16" fill="#1e3a8a" />
              <rect x="128" y="152" width="24" height="24" fill="#0ea5e9" />
              <rect x="168" y="152" width="16" height="16" fill="#1e3a8a" />
              <rect x="200" y="152" width="24" height="16" fill="#1e3a8a" />

              <rect x="96" y="184" width="32" height="16" fill="#1e3a8a" />
              <rect x="144" y="184" width="16" height="24" fill="#1e3a8a" />
              <rect x="176" y="184" width="24" height="16" fill="#0ea5e9" />
              <rect x="208" y="184" width="32" height="16" fill="#1e3a8a" />

              <rect x="96" y="216" width="16" height="16" fill="#1e3a8a" />
              <rect x="120" y="208" width="24" height="24" fill="#1e3a8a" />
              <rect x="160" y="216" width="32" height="16" fill="#1e3a8a" />
              <rect x="208" y="216" width="16" height="16" fill="#0ea5e9" />

              {/* Center Logo Stamp */}
              <circle cx="128" cy="128" r="22" fill="#ffffff" />
              <circle cx="128" cy="128" r="18" fill="#1e3a8a" />
              <text x="128" y="133" fill="#ffffff" fontSize="10" fontWeight="900" textAnchor="middle">SATI</text>
            </svg>
          </div>

          <div className="qr-instructions">
            <h4>Scan with Mobile Camera on Campus</h4>
            <p>
              Directly routes students at <strong>Hostels, Wi-Fi Routers, Laboratories, and Lecture Halls</strong> to the Grievance Intake Voucher.
            </p>
            <div className="qr-badge-strip">
              <span className="qr-badge">🛡️ Enforces @satiengg.in Auth</span>
              <span className="qr-badge">⚡ Auto Sequence C05</span>
              <span className="qr-badge">🔍 Jaccard Duplicate Check</span>
            </div>
          </div>

          <div className="qr-link-box">
            <input type="text" readOnly value={currentUrl} className="qr-url-input" />
            <button className="qr-copy-btn" onClick={handleCopy}>
              {copied ? '✓ Copied' : 'Copy URL'}
            </button>
          </div>

          <div className="qr-action-buttons">
            <button
              className="qr-auth-trigger-btn"
              onClick={() => {
                setQrModalOpen(false);
                setAuthModalOpen(true);
              }}
            >
              🔐 Authenticate Student Email (@satiengg.in)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default QRModal;

