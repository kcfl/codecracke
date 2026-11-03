// backend/store/fileStore.js
// Atomic JSON file persistence for complaints per PRD Section 9

const fs = require('fs');
const path = require('path');

const DEFAULT_DATA_DIR = path.join(__dirname, '..', 'data');
const DEFAULT_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'complaints.json');
const CORRUPT_FILE_PATH = path.join(DEFAULT_DATA_DIR, 'complaints.corrupt.json');

function createSeedComplaints(now = new Date()) {
  const baseTime = now.getTime();
  const sub1 = new Date(baseTime - 48 * 3600 * 1000).toISOString();
  const sub2 = new Date(baseTime - 8 * 3600 * 1000).toISOString();
  const sub3 = new Date(baseTime - 72 * 3600 * 1000).toISOString();
  const sub4 = new Date(baseTime - 24 * 3600 * 1000).toISOString();

  return [
    {
      id: 'C01',
      category: 'Wi-Fi',
      description: 'Wi-Fi signal keeps dropping near the library',
      location: 'Near Library',
      status: 'Raised',
      submittedAt: sub1,
      supportCount: 0,
      statusHistory: [
        { from: null, to: 'Raised', at: sub1 }
      ]
    },
    {
      id: 'C02',
      category: 'Hostel',
      description: 'Water supply interrupted in the hostel block',
      location: 'Hostel Block B',
      status: 'In Progress',
      submittedAt: sub2,
      supportCount: 0,
      statusHistory: [
        { from: null, to: 'Raised', at: sub2 },
        { from: 'Raised', to: 'In Progress', at: sub2 }
      ]
    },
    {
      id: 'C03',
      category: 'Classroom',
      description: 'Projector not working in the lecture room',
      location: 'Lecture Room 101',
      status: 'Raised',
      submittedAt: sub3,
      supportCount: 0,
      statusHistory: [
        { from: null, to: 'Raised', at: sub3 }
      ]
    },
    {
      id: 'C04',
      category: 'Laboratory',
      description: 'Lab computers failing to boot',
      location: 'Computer Lab 2',
      status: 'Resolved',
      submittedAt: sub4,
      supportCount: 0,
      statusHistory: [
        { from: null, to: 'Raised', at: sub4 },
        { from: 'Raised', to: 'In Progress', at: sub4 },
        { from: 'In Progress', to: 'Resolved', at: sub4 }
      ]
    }
  ];
}

class FileStore {
  constructor(filePath = DEFAULT_FILE_PATH) {
    this.filePath = filePath;
    this.dataDir = path.dirname(filePath);
    this.corruptPath = path.join(this.dataDir, 'complaints.corrupt.json');
    this.corruptionDetected = false;
    this.ensureDir();
  }

  ensureDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  atomicWrite(data) {
    this.ensureDir();
    const tempFile = path.join(
      this.dataDir,
      `complaints.tmp.${Date.now()}.${Math.random().toString(36).substring(2)}`
    );
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(tempFile, content, 'utf-8');
    fs.renameSync(tempFile, this.filePath);
  }

  readAll(now = new Date()) {
    this.ensureDir();

    if (!fs.existsSync(this.filePath)) {
      const seed = createSeedComplaints(now);
      this.atomicWrite(seed);
      return seed;
    }

    const raw = fs.readFileSync(this.filePath, 'utf-8');
    if (!raw.trim()) {
      const seed = createSeedComplaints(now);
      this.atomicWrite(seed);
      return seed;
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Data is not an array');
      }
      return parsed;
    } catch (err) {
      // Corrupted file handling
      this.corruptionDetected = true;
      try {
        fs.writeFileSync(this.corruptPath, raw, 'utf-8');
      } catch (backupErr) {
        // ignore backup error
      }
      const seed = createSeedComplaints(now);
      this.atomicWrite(seed);
      return seed;
    }
  }

  saveAll(complaints) {
    this.atomicWrite(complaints);
  }

  reset(now = new Date()) {
    const seed = createSeedComplaints(now);
    this.atomicWrite(seed);
    return seed;
  }

  getById(id, now = new Date()) {
    const list = this.readAll(now);
    return list.find(c => c.id === id) || null;
  }

  create(complaintData, now = new Date()) {
    const list = this.readAll(now);
    list.push(complaintData);
    this.saveAll(list);
    return complaintData;
  }

  update(id, updater, now = new Date()) {
    const list = this.readAll(now);
    const index = list.findIndex(c => c.id === id);
    if (index === -1) {
      return null;
    }
    const updated = typeof updater === 'function' ? updater(list[index]) : { ...list[index], ...updater };
    list[index] = updated;
    this.saveAll(list);
    return updated;
  }

  isCorrupted() {
    return this.corruptionDetected;
  }

  clearCorruptionWarning() {
    this.corruptionDetected = false;
  }
}

const defaultStore = new FileStore();

module.exports = {
  FileStore,
  defaultStore,
  createSeedComplaints,
  DEFAULT_FILE_PATH,
  CORRUPT_FILE_PATH
};

