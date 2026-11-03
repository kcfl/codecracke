const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { FileStore } = require('../store/fileStore');
const {
  validateComplaintInput,
  generateNextId,
  isValidStatusTransition,
  getNextStatus
} = require('../utils/rules');
const { rankQueue } = require('../utils/priority');

const TEST_DIR = path.join(__dirname, 'temp_test_data');
const TEST_FILE = path.join(TEST_DIR, 'test_complaints.json');
const FIXED_NOW = new Date('2026-11-03T12:00:00.000Z');

function cleanTestDir() {
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  }
}

// PRD Section 12 - Test 4:
// Resolving C03 removes it from the queue immediately and Resolved count goes up by 1, Pending down by 1.
test('PRD Test 4: Resolving C03 removes it from the queue immediately and updates counts', () => {
  cleanTestDir();
  const store = new FileStore(TEST_FILE);
  let list = store.readAll(FIXED_NOW);

  // Initial state check
  const initialQueue = rankQueue(list, FIXED_NOW, 3);
  assert.strictEqual(initialQueue[0].id, 'C03');

  const initialPending = list.filter(c => c.status !== 'Resolved').length;
  const initialResolved = list.filter(c => c.status === 'Resolved').length;
  assert.strictEqual(initialPending, 3);
  assert.strictEqual(initialResolved, 1);

  // Resolve C03: Raised -> In Progress -> Resolved
  store.update('C03', c => ({ ...c, status: 'In Progress' }), FIXED_NOW);
  store.update('C03', c => ({ ...c, status: 'Resolved' }), FIXED_NOW);

  list = store.readAll(FIXED_NOW);

  // Queue check: C03 must not be in queue
  const updatedQueue = rankQueue(list, FIXED_NOW, 3);
  assert.strictEqual(updatedQueue.some(c => c.id === 'C03'), false, 'C03 removed from queue immediately');
  assert.strictEqual(updatedQueue[0].id, 'C01', 'C01 is now top of the queue');

  // Count checks: Resolved goes up by 1, Pending down by 1
  const updatedPending = list.filter(c => c.status !== 'Resolved').length;
  const updatedResolved = list.filter(c => c.status === 'Resolved').length;

  assert.strictEqual(updatedResolved, initialResolved + 1, 'Resolved count goes up by 1');
  assert.strictEqual(updatedPending, initialPending - 1, 'Pending count goes down by 1');
  assert.strictEqual(list.length, updatedPending + updatedResolved, 'Total equals Pending + Resolved');

  cleanTestDir();
});

// PRD Section 12 - Test 5:
// PATCH Raised to Resolved returns 400. PATCH Resolved to anything returns 400.
test('PRD Test 5: Status transition validation rejects Raised -> Resolved and Resolved -> anything', () => {
  // Valid transitions
  assert.strictEqual(isValidStatusTransition('Raised', 'In Progress'), true);
  assert.strictEqual(isValidStatusTransition('In Progress', 'Resolved'), true);

  // Invalid transitions
  assert.strictEqual(isValidStatusTransition('Raised', 'Resolved'), false, 'Raised to Resolved must be rejected');
  assert.strictEqual(isValidStatusTransition('Resolved', 'Raised'), false, 'Resolved to Raised must be rejected');
  assert.strictEqual(isValidStatusTransition('Resolved', 'In Progress'), false, 'Resolved to In Progress must be rejected');
  assert.strictEqual(isValidStatusTransition('In Progress', 'Raised'), false, 'Backward transition must be rejected');
  assert.strictEqual(isValidStatusTransition('Raised', 'Unknown'), false, 'Invalid target must be rejected');

  assert.strictEqual(getNextStatus('Raised'), 'In Progress');
  assert.strictEqual(getNextStatus('In Progress'), 'Resolved');
  assert.strictEqual(getNextStatus('Resolved'), null);
});

// PRD Section 12 - Test 6:
// Description of only spaces is rejected. Description of 9 characters is rejected. Missing category is rejected.
test('PRD Test 6: Form validation rejects spaces-only description, <10 char description, and missing category', () => {
  // Description of only spaces
  const spacesOnly = validateComplaintInput({
    category: 'Wi-Fi',
    description: '          '
  });
  assert.strictEqual(spacesOnly.isValid, false);
  assert.ok(spacesOnly.errors.description, 'Spaces-only description must have field error');

  // Description of 9 characters
  const nineChars = validateComplaintInput({
    category: 'Wi-Fi',
    description: '123456789'
  });
  assert.strictEqual(nineChars.isValid, false);
  assert.ok(nineChars.errors.description, '9-char description must have field error');

  // Valid description (10 characters)
  const tenChars = validateComplaintInput({
    category: 'Wi-Fi',
    description: '1234567890'
  });
  assert.strictEqual(tenChars.isValid, true);

  // Missing category
  const missingCat = validateComplaintInput({
    category: '',
    description: 'This is a valid long description'
  });
  assert.strictEqual(missingCat.isValid, false);
  assert.ok(missingCat.errors.category, 'Missing category must have field error');

  // Undefined category
  const undefinedCat = validateComplaintInput({
    description: 'This is a valid long description'
  });
  assert.strictEqual(undefinedCat.isValid, false);
  assert.ok(undefinedCat.errors.category);

  // Invalid category
  const invalidCat = validateComplaintInput({
    category: 'Cafeteria',
    description: 'This is a valid long description'
  });
  assert.strictEqual(invalidCat.isValid, false);
  assert.ok(invalidCat.errors.category);
});

// PRD Section 12 - Test 7:
// After creating a complaint on seed data the new ID is C05. After deleting the file and restarting, seed data returns.
test('PRD Test 7: Next ID on seed data is C05, and deleting file + restarting restores seed data', () => {
  cleanTestDir();
  const store = new FileStore(TEST_FILE);
  const seed = store.readAll(FIXED_NOW);
  assert.strictEqual(seed.length, 4);

  // Generate next ID on seed data
  const nextId = generateNextId(seed);
  assert.strictEqual(nextId, 'C05', 'Next ID on seed data must be C05');

  // Create complaint with C05
  store.create({
    id: nextId,
    category: 'Wi-Fi',
    description: 'Another Wi-Fi complaint in new hall',
    status: 'Raised',
    submittedAt: FIXED_NOW.toISOString(),
    supportCount: 0,
    statusHistory: [{ from: null, to: 'Raised', at: FIXED_NOW.toISOString() }]
  }, FIXED_NOW);

  const updatedList = store.readAll(FIXED_NOW);
  assert.strictEqual(updatedList.length, 5);
  assert.strictEqual(updatedList[4].id, 'C05');

  // Verify next ID after C05 is C06
  const nextNextId = generateNextId(updatedList);
  assert.strictEqual(nextNextId, 'C06');

  // Delete file and restart store
  fs.unlinkSync(TEST_FILE);
  assert.strictEqual(fs.existsSync(TEST_FILE), false);

  const restoredStore = new FileStore(TEST_FILE);
  const restoredSeed = restoredStore.readAll(FIXED_NOW);
  assert.strictEqual(restoredSeed.length, 4, 'Seed data restored after deleting file');
  assert.strictEqual(restoredSeed[0].id, 'C01');
  assert.strictEqual(restoredSeed[3].id, 'C04');

  cleanTestDir();
});

// PRD Section 12 - Test 12:
// Counts: Total always equals Pending + Resolved.
test('PRD Test 12: Counts invariant: Total always equals Pending + Resolved', () => {
  cleanTestDir();
  const store = new FileStore(TEST_FILE);
  let list = store.readAll(FIXED_NOW);

  function checkCounts(items) {
    let raised = 0;
    let inProgress = 0;
    let resolved = 0;
    for (const c of items) {
      if (c.status === 'Raised') raised++;
      else if (c.status === 'In Progress') inProgress++;
      else if (c.status === 'Resolved') resolved++;
    }
    const pending = raised + inProgress;
    const total = pending + resolved;
    assert.strictEqual(total, items.length, 'Total must equal items count');
    assert.strictEqual(total, pending + resolved, 'Total must equal Pending + Resolved');
    assert.strictEqual(pending, raised + inProgress, 'Pending must equal Raised + In Progress');
  }

  // 1. Check on seed data
  checkCounts(list);

  // 2. Check after creating new complaints
  store.create({
    id: 'C05',
    category: 'Hostel',
    description: 'Electricity failure in floor 2',
    status: 'Raised',
    submittedAt: FIXED_NOW.toISOString(),
    supportCount: 0,
    statusHistory: []
  }, FIXED_NOW);
  list = store.readAll(FIXED_NOW);
  checkCounts(list);

  // 3. Check after status transition
  store.update('C01', c => ({ ...c, status: 'In Progress' }), FIXED_NOW);
  list = store.readAll(FIXED_NOW);
  checkCounts(list);

  store.update('C01', c => ({ ...c, status: 'Resolved' }), FIXED_NOW);
  list = store.readAll(FIXED_NOW);
  checkCounts(list);

  cleanTestDir();
});

