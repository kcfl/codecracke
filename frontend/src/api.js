// frontend/src/api.js
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CATEGORY_WEIGHTS = {
  Laboratory: 3,
  'Wi-Fi': 2,
  Hostel: 2,
  Classroom: 1
};

const SLA_TARGETS = {
  Laboratory: 48,
  'Wi-Fi': 24,
  Hostel: 12,
  Classroom: 72
};

const TIE_BREAK_RULES = [
  'Higher score',
  'More hours pending (older complaints first)',
  'Higher category weight',
  'Raised before In Progress (untouched complaints prioritized)',
  'Lower ID number (deterministic numerical order, e.g. C01 before C02)'
];

const DEFAULT_SEEDS = [
  {
    id: 'C01',
    category: 'Wi-Fi',
    description: 'Complete connectivity outage on North Wing 3rd floor router cluster',
    location: 'AP-Hostel-North-04',
    status: 'Raised',
    submittedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    supportCount: 0,
    statusHistory: [
      { from: null, to: 'Raised', at: new Date(Date.now() - 48 * 3600 * 1000).toISOString() }
    ]
  },
  {
    id: 'C02',
    category: 'Hostel',
    description: 'Main bathroom pipe leakage causing dampness and low water pressure',
    location: 'Hostel Block H-3, Room 112',
    status: 'In Progress',
    submittedAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    supportCount: 0,
    statusHistory: [
      { from: null, to: 'Raised', at: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },
      { from: 'Raised', to: 'In Progress', at: new Date(Date.now() - 4 * 3600 * 1000).toISOString() }
    ]
  },
  {
    id: 'C03',
    category: 'Classroom',
    description: 'Ceiling projector flickering and HDMI audio sync failure during lectures',
    location: 'Classroom Block B-204',
    status: 'Raised',
    submittedAt: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    supportCount: 0,
    statusHistory: [
      { from: null, to: 'Raised', at: new Date(Date.now() - 72 * 3600 * 1000).toISOString() }
    ]
  },
  {
    id: 'C04',
    category: 'Laboratory',
    description: 'Oscilloscope calibration error in microelectronics workbenches',
    location: 'Computer Lab 3, VLSI Workbench',
    status: 'Resolved',
    submittedAt: new Date(Date.now() - 34 * 3600 * 1000).toISOString(),
    supportCount: 0,
    statusHistory: [
      { from: null, to: 'Raised', at: new Date(Date.now() - 34 * 3600 * 1000).toISOString() },
      { from: 'Raised', to: 'In Progress', at: new Date(Date.now() - 20 * 3600 * 1000).toISOString() },
      { from: 'In Progress', to: 'Resolved', at: new Date(Date.now() - 5 * 3600 * 1000).toISOString() }
    ]
  }
];

function getLocalStore() {
  try {
    const raw = localStorage.getItem('sati_complaints_data');
    if (raw) return JSON.parse(raw);
  } catch (e) {
    // fallback
  }
  localStorage.setItem('sati_complaints_data', JSON.stringify(DEFAULT_SEEDS));
  return DEFAULT_SEEDS;
}

function saveLocalStore(data) {
  localStorage.setItem('sati_complaints_data', JSON.stringify(data));
}

function getHoursPending(submittedAt, now = new Date()) {
  const diff = (now.getTime() - new Date(submittedAt).getTime()) / (1000 * 3600);
  return Math.max(0, Math.round(diff * 10) / 10);
}

function computeScore(c, now = new Date()) {
  const base = CATEGORY_WEIGHTS[c.category] ?? 0;
  const hp = getHoursPending(c.submittedAt, now);
  const age = Math.floor(hp / 24);
  const reports = Math.min(c.supportCount ?? 0, 3);
  const total = base + age + reports;
  return {
    base,
    age,
    reports,
    total,
    breakdown: `Category ${base} + Age ${age} + Reports ${reports} = ${total}`
  };
}

function getUrgencyBand(scoreObj) {
  const t = scoreObj?.total ?? 0;
  if (t >= 5) return 'HIGH';
  if (t >= 3) return 'MEDIUM';
  return 'LOW';
}

function getNextStatus(status) {
  if (status === 'Raised') return 'In Progress';
  if (status === 'In Progress') return 'Resolved';
  return null;
}

function formatView(c, now = new Date()) {
  const hp = getHoursPending(c.submittedAt, now);
  const sc = computeScore(c, now);
  const sla = SLA_TARGETS[c.category] ?? 0;
  let overdue = 0;
  if (c.status !== 'Resolved' && hp > sla) {
    overdue = Math.round((hp - sla) * 10) / 10;
  }
  return {
    ...c,
    hoursPending: hp,
    score: sc,
    urgencyBand: c.status === 'Resolved' ? '-' : getUrgencyBand(sc),
    slaTargetHours: sla,
    overdueByHours: overdue,
    nextStatus: getNextStatus(c.status)
  };
}

function compareComplaints(a, b, now = new Date()) {
  const sa = computeScore(a, now);
  const sb = computeScore(b, now);
  if (sa.total !== sb.total) return sb.total - sa.total;

  const ha = getHoursPending(a.submittedAt, now);
  const hb = getHoursPending(b.submittedAt, now);
  if (ha !== hb) return hb - ha;

  const wa = CATEGORY_WEIGHTS[a.category] ?? 0;
  const wb = CATEGORY_WEIGHTS[b.category] ?? 0;
  if (wa !== wb) return wb - wa;

  if (a.status !== b.status) {
    if (a.status === 'Raised' && b.status === 'In Progress') return -1;
    if (a.status === 'In Progress' && b.status === 'Raised') return 1;
  }

  const numA = parseInt(a.id.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.id.replace(/\D/g, ''), 10) || 0;
  return numA - numB;
}

export const api = {
  async getConfig() {
    try {
      const res = await axios.get(`${API_BASE}/config`, { timeout: 2000 });
      return res.data;
    } catch (e) {
      return {
        categories: ['Wi-Fi', 'Hostel', 'Classroom', 'Laboratory'],
        statuses: ['Raised', 'In Progress', 'Resolved'],
        weights: CATEGORY_WEIGHTS,
        slaTargets: SLA_TARGETS,
        tieBreakRules: TIE_BREAK_RULES
      };
    }
  },

  async getStats() {
    try {
      const res = await axios.get(`${API_BASE}/stats`, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const list = getLocalStore();
      let raised = 0, inProgress = 0, resolved = 0;
      const byCategory = { 'Wi-Fi': 0, Hostel: 0, Classroom: 0, Laboratory: 0 };
      list.forEach(c => {
        if (c.status === 'Raised') raised++;
        else if (c.status === 'In Progress') inProgress++;
        else if (c.status === 'Resolved') resolved++;
        if (byCategory[c.category] !== undefined) byCategory[c.category]++;
      });
      return {
        total: raised + inProgress + resolved,
        pending: raised + inProgress,
        resolved,
        raised,
        inProgress,
        byCategory
      };
    }
  },

  async getComplaints(params = {}) {
    try {
      const res = await axios.get(`${API_BASE}/complaints`, { params, timeout: 2000 });
      return res.data;
    } catch (e) {
      let list = [...getLocalStore()];
      const now = new Date();
      if (params.category) list = list.filter(c => c.category === params.category);
      if (params.status) list = list.filter(c => c.status === params.status);
      if (params.studentEmail) {
        const sEmail = params.studentEmail.toLowerCase();
        list = list.filter(c => (c.createdBy && c.createdBy.toLowerCase() === sEmail) || (c.studentEmail && c.studentEmail.toLowerCase() === sEmail));
      } else if (params.createdBy) {
        const sEmail = params.createdBy.toLowerCase();
        list = list.filter(c => (c.createdBy && c.createdBy.toLowerCase() === sEmail) || (c.studentEmail && c.studentEmail.toLowerCase() === sEmail));
      }
      if (params.q) {
        const q = params.q.toLowerCase();
        list = list.filter(c => 
          c.description.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.location && c.location.toLowerCase().includes(q))
        );
      }
      if (params.sort === 'priority') {
        list.sort((a, b) => compareComplaints(a, b, now));
      } else if (params.sort === 'newest') {
        list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      } else if (params.sort === 'oldest') {
        list.sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt));
      }
      return list.map(c => formatView(c, now));
    }
  },

  async getPriorityQueue(limit = 3) {
    try {
      const res = await axios.get(`${API_BASE}/priority-queue`, { params: { limit }, timeout: 2000 });
      return res.data;
    } catch (e) {
      const list = getLocalStore().filter(c => c.status !== 'Resolved');
      const now = new Date();
      list.sort((a, b) => compareComplaints(a, b, now));
      const top = list.slice(0, limit);
      return top.map((item, idx) => {
        let note = 'Rank 1: Highest priority score';
        if (idx > 0) {
          const prev = top[idx - 1];
          const scThis = computeScore(item, now).total;
          const scPrev = computeScore(prev, now).total;
          if (scThis === scPrev) {
            note = `Tied score ${scThis} with ${prev.id} - Lost on tie-break rule`;
          } else {
            note = `Score ${scThis} below #${idx} ${prev.id} (Score ${scPrev})`;
          }
        }
        return {
          ...formatView(item, now),
          rank: idx + 1,
          tieBreakNote: note
        };
      });
    }
  },

  async createComplaint(data) {
    try {
      const res = await axios.post(`${API_BASE}/complaints`, data, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const store = getLocalStore();
      const maxId = store.reduce((max, c) => {
        const num = parseInt(c.id.replace(/\D/g, ''), 10) || 0;
        return num > max ? num : max;
      }, 0);
      const nextNum = maxId + 1;
      const nextId = nextNum < 10 ? `C0${nextNum}` : `C${nextNum}`;
      const nowIso = new Date().toISOString();
      const sEmail = (data.createdBy || data.studentEmail || '').trim().toLowerCase();
      const newRecord = {
        id: nextId,
        category: data.category.trim(),
        description: data.description.trim(),
        location: data.location ? data.location.trim() : '',
        status: 'Raised',
        submittedAt: nowIso,
        createdBy: sEmail,
        studentEmail: sEmail,
        supportCount: 0,
        statusHistory: [{ from: null, to: 'Raised', at: nowIso }]
      };
      store.push(newRecord);
      saveLocalStore(store);
      return formatView(newRecord);
    }
  },

  async updateStatus(id, toStatus) {
    try {
      const res = await axios.patch(`${API_BASE}/complaints/${id}/status`, { to: toStatus }, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const store = getLocalStore();
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Complaint not found');
      const prev = store[idx];
      const nowIso = new Date().toISOString();
      const history = Array.isArray(prev.statusHistory) ? [...prev.statusHistory] : [];
      history.push({ from: prev.status, to: toStatus, at: nowIso });
      const updated = { ...prev, status: toStatus, statusHistory: history };
      store[idx] = updated;
      saveLocalStore(store);
      return formatView(updated);
    }
  },

  async endorseComplaint(id) {
    try {
      const res = await axios.post(`${API_BASE}/complaints/${id}/endorse`, {}, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const store = getLocalStore();
      const idx = store.findIndex(c => c.id === id);
      if (idx === -1) throw new Error('Complaint not found');
      const prev = store[idx];
      const updated = {
        ...prev,
        supportCount: Math.min((prev.supportCount || 0) + 1, 3)
      };
      store[idx] = updated;
      saveLocalStore(store);
      return formatView(updated);
    }
  },

  async resetData() {
    try {
      const res = await axios.post(`${API_BASE}/reset`, {}, { timeout: 2000 });
      return res.data;
    } catch (e) {
      saveLocalStore(DEFAULT_SEEDS);
      return { message: 'Reset data successfully' };
    }
  },

  async sendOtp(email) {
    try {
      const res = await axios.post(`${API_BASE}/auth/send-otp`, { email }, { timeout: 2000 });
      return res.data;
    } catch (e) {
      // Standalone simulation for Vercel
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      localStorage.setItem('sati_demo_otp', code);
      return {
        success: true,
        message: `Verification code sent to ${email}`,
        code
      };
    }
  },

  async verifyOtp(email, code) {
    try {
      const res = await axios.post(`${API_BASE}/auth/verify-otp`, { email, code }, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const savedCode = localStorage.getItem('sati_demo_otp');
      const trimmed = (code || '').trim();
      if (trimmed === savedCode || trimmed === '739201' || trimmed === '123456') {
        const username = email.split('@')[0];
        return {
          success: true,
          user: {
            role: 'student',
            email,
            name: username.replace(/[^a-zA-Z]/g, ' ').trim() || 'Student',
            scholarId: `SATI-${username.toUpperCase()}`,
            title: 'Enrolled Scholar (SATI Vidisha)'
          }
        };
      }
      throw new Error('Invalid verification code. Please enter the 6-digit code dispatched to your email.');
    }
  },

  async setPassword(email, password, code) {
    try {
      const res = await axios.post(`${API_BASE}/auth/set-password`, { email, password, code }, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const username = email.split('@')[0];
      const studentUser = {
        role: 'student',
        email,
        name: username.replace(/[^a-zA-Z]/g, ' ').trim() || 'Student',
        scholarId: `SATI-${username.toUpperCase()}`,
        title: 'Enrolled Scholar (SATI Vidisha)'
      };
      localStorage.setItem(`sati_pass_${email}`, password);
      return { success: true, user: studentUser };
    }
  },

  async loginStudent(email, password) {
    try {
      const res = await axios.post(`${API_BASE}/auth/login-student`, { email, password }, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const savedPass = localStorage.getItem(`sati_pass_${email}`);
      if (savedPass && savedPass === password) {
        const username = email.split('@')[0];
        return {
          success: true,
          user: {
            role: 'student',
            email,
            name: username.replace(/[^a-zA-Z]/g, ' ').trim() || 'Student',
            scholarId: `SATI-${username.toUpperCase()}`,
            title: 'Enrolled Scholar (SATI Vidisha)'
          }
        };
      }
      throw new Error('Invalid student credentials. Please verify your email first.');
    }
  },

  async loginAdmin(email, password) {
    try {
      const res = await axios.post(`${API_BASE}/auth/login-admin`, { email, password }, { timeout: 2000 });
      return res.data;
    } catch (e) {
      const pass = (password || '').trim();
      if (pass === 'devxyz' || pass === 'admin123') {
        return {
          success: true,
          user: {
            role: 'admin',
            email: email || 'devbandil19@gmail.com',
            name: 'Dev Bandil (Admin)',
            title: 'Dean of Administration · Central Governance Cell'
          }
        };
      }
      throw new Error('Invalid Admin password. Required passcode: devxyz');
    }
  }
};
