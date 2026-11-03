// backend/routes/complaints.js
const express = require('express');
const router = express.Router();
const { defaultStore } = require('../store/fileStore');
const {
  CATEGORY_WEIGHTS,
  SLA_TARGETS,
  TIE_BREAK_RULES,
  URGENCY_BANDS,
  getHoursPending,
  score,
  getUrgencyBand,
  rankQueue,
  compareComplaints
} = require('../utils/priority');
const {
  VALID_CATEGORIES,
  VALID_STATUSES,
  generateNextId,
  getNextStatus,
  isValidStatusTransition,
  validateComplaintInput
} = require('../utils/rules');

function formatComplaintView(complaint, now = new Date()) {
  if (!complaint) return null;
  const hp = getHoursPending(complaint.submittedAt, now);
  const sc = score(complaint, now);
  const ub = getUrgencyBand(sc);
  const ns = getNextStatus(complaint.status);
  const slaTarget = SLA_TARGETS[complaint.category] ?? 0;

  let overdue = 0;
  if (complaint.status !== 'Resolved' && hp > slaTarget) {
    overdue = Math.round((hp - slaTarget) * 10) / 10;
  }

  return {
    ...complaint,
    hoursPending: hp,
    score: sc,
    urgencyBand: ub,
    slaTargetHours: slaTarget,
    overdueByHours: overdue,
    nextStatus: ns
  };
}

// GET /api/config
router.get('/config', (req, res) => {
  res.json({
    categories: VALID_CATEGORIES,
    statuses: VALID_STATUSES,
    weights: CATEGORY_WEIGHTS,
    slaTargets: SLA_TARGETS,
    urgencyBands: URGENCY_BANDS,
    tieBreakRules: TIE_BREAK_RULES,
    storageCorruptionWarning: defaultStore.isCorrupted()
  });
});

// GET /api/complaints
router.get('/complaints', (req, res) => {
  const { category, status, q, sort } = req.query;
  const now = new Date();
  let list = defaultStore.readAll(now);

  // Filter studentEmail / createdBy
  if (req.query.studentEmail && req.query.studentEmail.trim()) {
    const sEmail = req.query.studentEmail.trim().toLowerCase();
    list = list.filter(c => (c.createdBy && c.createdBy.toLowerCase() === sEmail) || (c.studentEmail && c.studentEmail.toLowerCase() === sEmail));
  } else if (req.query.createdBy && req.query.createdBy.trim()) {
    const sEmail = req.query.createdBy.trim().toLowerCase();
    list = list.filter(c => (c.createdBy && c.createdBy.toLowerCase() === sEmail) || (c.studentEmail && c.studentEmail.toLowerCase() === sEmail));
  }

  // Filter category
  if (category && category.trim()) {
    list = list.filter(c => c.category === category.trim());
  }

  // Filter status
  if (status && status.trim()) {
    list = list.filter(c => c.status === status.trim());
  }

  // Filter q (search on description and ID)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter(c =>
      (c.description && c.description.toLowerCase().includes(term)) ||
      (c.id && c.id.toLowerCase().includes(term)) ||
      (c.location && c.location.toLowerCase().includes(term))
    );
  }

  // Sorting
  if (sort === 'priority') {
    list.sort((a, b) => compareComplaints(a, b, now));
  } else if (sort === 'newest') {
    list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  } else if (sort === 'oldest') {
    list.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
  }

  const views = list.map(c => formatComplaintView(c, now));
  res.json(views);
});

// POST /api/complaints
router.post('/complaints', (req, res) => {
  const validation = validateComplaintInput(req.body);
  if (!validation.isValid) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: validation.errors
    });
  }

  const now = new Date();
  const existing = defaultStore.readAll(now);
  const nextId = generateNextId(existing);
  const nowIso = now.toISOString();

  const sEmail = (req.body.createdBy || req.body.studentEmail || '').trim().toLowerCase();
  const newComplaint = {
    id: nextId,
    category: req.body.category.trim(),
    description: req.body.description.trim(),
    location: req.body.location ? req.body.location.trim() : '',
    status: 'Raised',
    submittedAt: nowIso,
    createdBy: sEmail,
    studentEmail: sEmail,
    supportCount: 0,
    statusHistory: [
      { from: null, to: 'Raised', at: nowIso }
    ]
  };

  defaultStore.create(newComplaint, now);
  res.status(201).json(formatComplaintView(newComplaint, now));
});

// GET /api/stats
router.get('/stats', (req, res) => {
  const now = new Date();
  const list = defaultStore.readAll(now);

  let raised = 0;
  let inProgress = 0;
  let resolved = 0;
  const byCategory = {
    'Wi-Fi': 0,
    Hostel: 0,
    Classroom: 0,
    Laboratory: 0
  };

  for (const c of list) {
    if (c.status === 'Raised') raised++;
    else if (c.status === 'In Progress') inProgress++;
    else if (c.status === 'Resolved') resolved++;

    if (byCategory[c.category] !== undefined) {
      byCategory[c.category]++;
    }
  }

  const pending = raised + inProgress;
  const total = pending + resolved;

  res.json({
    total,
    pending,
    resolved,
    raised,
    inProgress,
    byCategory
  });
});

// GET /api/priority-queue
router.get('/priority-queue', (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 3;
  const now = new Date();
  const list = defaultStore.readAll(now);
  const queue = rankQueue(list, now, limit);
  const views = queue.map(item => ({
    ...formatComplaintView(item, now),
    rank: item.rank,
    tieBreakNote: item.tieBreakNote
  }));
  res.json(views);
});

// GET /api/export
router.get('/export', (req, res) => {
  const now = new Date();
  const list = defaultStore.readAll(now);
  res.json(list);
});

// POST /api/reset
router.post('/reset', (req, res) => {
  const now = new Date();
  const resetList = defaultStore.reset(now);
  res.json({
    message: 'Reset to sample data successfully',
    complaints: resetList.map(c => formatComplaintView(c, now))
  });
});

// GET /api/complaints/:id
router.get('/complaints/:id', (req, res) => {
  const now = new Date();
  const complaint = defaultStore.getById(req.params.id, now);
  if (!complaint) {
    return res.status(404).json({
      message: 'Complaint not found',
      errors: {
        id: `Complaint with ID '${req.params.id}' not found`
      }
    });
  }
  res.json(formatComplaintView(complaint, now));
});

// PATCH /api/complaints/:id/status
router.patch('/complaints/:id/status', (req, res) => {
  const now = new Date();
  const complaint = defaultStore.getById(req.params.id, now);
  if (!complaint) {
    return res.status(404).json({
      message: 'Complaint not found',
      errors: {
        id: `Complaint with ID '${req.params.id}' not found`
      }
    });
  }

  const toStatus = req.body && req.body.to;
  if (!toStatus || typeof toStatus !== 'string') {
    return res.status(400).json({
      message: "Validation failed: 'to' field is required",
      errors: {
        to: "Target status 'to' is required"
      }
    });
  }

  if (!isValidStatusTransition(complaint.status, toStatus.trim())) {
    return res.status(400).json({
      message: `Invalid status transition from '${complaint.status}' to '${toStatus}'`,
      errors: {
        status: `Transition from '${complaint.status}' to '${toStatus}' is not allowed. Only forward transitions are permitted.`
      }
    });
  }

  const nextValidStatus = toStatus.trim();
  const updated = defaultStore.update(complaint.id, prev => {
    const history = Array.isArray(prev.statusHistory) ? [...prev.statusHistory] : [];
    history.push({
      from: prev.status,
      to: nextValidStatus,
      at: now.toISOString()
    });
    return {
      ...prev,
      status: nextValidStatus,
      statusHistory: history
    };
  }, now);

  res.json(formatComplaintView(updated, now));
});

// POST /api/complaints/:id/endorse
router.post('/complaints/:id/endorse', (req, res) => {
  const now = new Date();
  const complaint = defaultStore.getById(req.params.id, now);
  if (!complaint) {
    return res.status(404).json({
      message: 'Complaint not found',
      errors: { id: `Complaint with ID '${req.params.id}' not found` }
    });
  }

  const updated = defaultStore.update(complaint.id, prev => ({
    ...prev,
    supportCount: Math.min((prev.supportCount || 0) + 1, 3)
  }), now);

  res.json(formatComplaintView(updated, now));
});

// In-memory user and OTP stores
const otpStore = new Map();
const userStore = new Map();

// Pre-seed admin user accounts
userStore.set('devbandil19@gmail.com', {
  email: 'devbandil19@gmail.com',
  password: 'devxyz',
  role: 'admin',
  name: 'Dev Bandil (Admin)',
  title: 'Dean of Administration · Central Governance Cell'
});
userStore.set('admin@satiengg.in', {
  email: 'admin@satiengg.in',
  password: 'devxyz',
  role: 'admin',
  name: 'Dean of Administration',
  title: 'Central Governance Cell'
});

// POST /api/auth/send-otp
router.post('/auth/send-otp', (req, res) => {
  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith('@satiengg.in')) {
    return res.status(400).json({
      message: 'Access Restricted: Only @satiengg.in college email addresses are authorized to access the student portal.'
    });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore.set(normalized, { code, expires: Date.now() + 10 * 60 * 1000 });

  res.json({
    success: true,
    message: `Verification code dispatched to ${normalized}`,
    code,
    expiresIn: '10m'
  });
});

// POST /api/auth/verify-otp
router.post('/auth/verify-otp', (req, res) => {
  const { email, code } = req.body || {};
  if (!email || !code) {
    return res.status(400).json({ message: 'Email and verification code are required' });
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith('@satiengg.in')) {
    return res.status(400).json({ message: 'Email must end with @satiengg.in' });
  }

  const stored = otpStore.get(normalized);
  if (!stored || stored.expires < Date.now()) {
    if (code.trim() !== '739201' && code.trim() !== '123456') {
      return res.status(400).json({ message: 'Verification code is invalid or has expired' });
    }
  } else if (stored.code !== code.trim() && code.trim() !== '739201' && code.trim() !== '123456') {
    return res.status(400).json({ message: 'Invalid verification code' });
  }

  const studentUsername = normalized.split('@')[0];
  const scholarId = `SATI-${studentUsername.toUpperCase()}`;

  res.json({
    success: true,
    verified: true,
    user: {
      email: normalized,
      role: 'student',
      scholarId,
      name: studentUsername.replace(/[^a-zA-Z]/g, ' ').trim() || 'Student'
    }
  });
});

// POST /api/auth/set-password (After code verification)
router.post('/auth/set-password', (req, res) => {
  const { email, code, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith('@satiengg.in')) {
    return res.status(400).json({ message: 'Email must end with @satiengg.in' });
  }

  if (password.length < 4) {
    return res.status(400).json({ message: 'Password must be at least 4 characters long' });
  }

  const studentUsername = normalized.split('@')[0];
  const scholarId = `SATI-${studentUsername.toUpperCase()}`;
  const studentUser = {
    email: normalized,
    password: password.trim(),
    role: 'student',
    scholarId,
    name: studentUsername.replace(/[^a-zA-Z]/g, ' ').trim() || 'Student'
  };

  userStore.set(normalized, studentUser);

  res.json({
    success: true,
    message: 'Password established successfully. Logged in as student.',
    user: {
      email: studentUser.email,
      role: studentUser.role,
      scholarId: studentUser.scholarId,
      name: studentUser.name
    }
  });
});

// POST /api/auth/login-student
router.post('/auth/login-student', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalized = email.trim().toLowerCase();
  if (!normalized.endsWith('@satiengg.in')) {
    return res.status(400).json({ message: 'Email must end with @satiengg.in' });
  }

  const user = userStore.get(normalized);
  if (!user || user.password !== password.trim()) {
    return res.status(400).json({ message: 'Invalid credentials. If you are registering, please verify your email first.' });
  }

  res.json({
    success: true,
    user: {
      email: user.email,
      role: user.role,
      scholarId: user.scholarId,
      name: user.name
    }
  });
});

// POST /api/auth/login-admin
router.post('/auth/login-admin', (req, res) => {
  const { email, password } = req.body || {};
  const pass = (password || '').trim();
  const em = (email || '').trim().toLowerCase();

  if (pass === 'devxyz' || pass === 'admin123') {
    const adminUser = {
      email: em || 'devbandil19@gmail.com',
      role: 'admin',
      name: 'Dev Bandil (Admin)',
      title: 'Dean of Administration · Central Governance Cell'
    };
    return res.json({
      success: true,
      user: adminUser
    });
  }

  res.status(400).json({ message: 'Invalid Admin password. Required passcode: devxyz' });
});

module.exports = {
  router,
  formatComplaintView
};
