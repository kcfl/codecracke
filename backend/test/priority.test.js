const test = require('node:test');
const assert = require('node:assert');
const { score, rankQueue, compareComplaints } = require('../utils/priority');

const FIXED_NOW = new Date('2026-11-03T12:00:00.000Z');

function createSeedData(now = FIXED_NOW) {
  const baseTime = now.getTime();
  return [
    {
      id: 'C01',
      category: 'Wi-Fi',
      submittedAt: new Date(baseTime - 48 * 3600 * 1000).toISOString(),
      status: 'Raised',
      description: 'Wi-Fi signal keeps dropping near the library',
      supportCount: 0
    },
    {
      id: 'C02',
      category: 'Hostel',
      submittedAt: new Date(baseTime - 8 * 3600 * 1000).toISOString(),
      status: 'In Progress',
      description: 'Water supply interrupted in the hostel block',
      supportCount: 0
    },
    {
      id: 'C03',
      category: 'Classroom',
      submittedAt: new Date(baseTime - 72 * 3600 * 1000).toISOString(),
      status: 'Raised',
      description: 'Projector not working in the lecture room',
      supportCount: 0
    },
    {
      id: 'C04',
      category: 'Laboratory',
      submittedAt: new Date(baseTime - 24 * 3600 * 1000).toISOString(),
      status: 'Resolved',
      description: 'Lab computers failing to boot',
      supportCount: 0
    }
  ];
}

// PRD Section 12 - Test 1:
// On seed data: scores are C01 = 4, C02 = 2, C03 = 4, C04 not scored.
test('PRD Test 1: Seed data scores (C01=4, C02=2, C03=4, C04 not scored)', () => {
  const seed = createSeedData(FIXED_NOW);
  const scoreC01 = score(seed[0], FIXED_NOW);
  const scoreC02 = score(seed[1], FIXED_NOW);
  const scoreC03 = score(seed[2], FIXED_NOW);
  const scoreC04 = score(seed[3], FIXED_NOW);

  assert.strictEqual(scoreC01.total, 4, 'C01 total score should be 4');
  assert.strictEqual(scoreC01.base, 2, 'C01 base weight should be 2');
  assert.strictEqual(scoreC01.age, 2, 'C01 age score should be 2');

  assert.strictEqual(scoreC02.total, 2, 'C02 total score should be 2');
  assert.strictEqual(scoreC02.base, 2, 'C02 base weight should be 2');
  assert.strictEqual(scoreC02.age, 0, 'C02 age score should be 0');

  assert.strictEqual(scoreC03.total, 4, 'C03 total score should be 4');
  assert.strictEqual(scoreC03.base, 1, 'C03 base weight should be 1');
  assert.strictEqual(scoreC03.age, 3, 'C03 age score should be 3');

  assert.strictEqual(scoreC04, null, 'C04 (Resolved) should not be scored');
});

// PRD Section 12 - Test 2:
// Queue order on seed data: C03, then C01 (older, 72h vs 48h), then C02. C04 never appears.
test('PRD Test 2: Queue order on seed data is C03, C01, C02. C04 never appears', () => {
  const seed = createSeedData(FIXED_NOW);
  const queue = rankQueue(seed, FIXED_NOW, 3);

  assert.strictEqual(queue.length, 3);
  assert.strictEqual(queue[0].id, 'C03', 'First should be C03');
  assert.strictEqual(queue[1].id, 'C01', 'Second should be C01');
  assert.strictEqual(queue[2].id, 'C02', 'Third should be C02');

  const c04InQueue = queue.some(item => item.id === 'C04');
  assert.strictEqual(c04InQueue, false, 'C04 must never appear in the queue');

  assert.ok(queue[0].tieBreakNote, 'Item should have tieBreakNote');
});

// PRD Section 12 - Test 3:
// Hours pending 23.9 gives age 0, and 24.0 gives age 1.
test('PRD Test 3: Hours pending 23.9 gives age 0, and 24.0 gives age 1', () => {
  const c23_9 = {
    id: 'T23',
    category: 'Classroom',
    status: 'Raised',
    submittedAt: new Date(FIXED_NOW.getTime() - 23.9 * 3600 * 1000).toISOString(),
    supportCount: 0
  };
  const c24_0 = {
    id: 'T24',
    category: 'Classroom',
    status: 'Raised',
    submittedAt: new Date(FIXED_NOW.getTime() - 24.0 * 3600 * 1000).toISOString(),
    supportCount: 0
  };

  const score23_9 = score(c23_9, FIXED_NOW);
  const score24_0 = score(c24_0, FIXED_NOW);

  assert.strictEqual(score23_9.age, 0, '23.9 hours gives age 0');
  assert.strictEqual(score24_0.age, 1, '24.0 hours gives age 1');
});

// PRD Section 12 - Test 8:
// Two complaints with equal score and equal hours are ordered by category weight, then status, then ID.
test('PRD Test 8: Equal score and hours ordered by category weight, then status, then ID', () => {
  const submittedAt = new Date(FIXED_NOW.getTime() - 48 * 3600 * 1000).toISOString();

  // Case A: Equal score (4) & equal hours (48h).
  // Complaint 1: Wi-Fi (weight 2), age 2 => score = 4
  // Complaint 2: Classroom (weight 1), age 2, reports 1 => score = 4
  // Wi-Fi (weight 2) > Classroom (weight 1)
  const wifiComplaint = {
    id: 'C10',
    category: 'Wi-Fi',
    status: 'Raised',
    submittedAt,
    supportCount: 0
  };
  const classroomComplaint = {
    id: 'C09',
    category: 'Classroom',
    status: 'Raised',
    submittedAt,
    supportCount: 1
  };

  const q1 = rankQueue([classroomComplaint, wifiComplaint], FIXED_NOW, 2);
  assert.strictEqual(q1[0].id, 'C10', 'Wi-Fi (weight 2) ordered before Classroom (weight 1)');

  // Case B: Equal score, equal hours, equal category weight, different status.
  // Raised beats In Progress
  const raisedComplaint = {
    id: 'C20',
    category: 'Wi-Fi',
    status: 'Raised',
    submittedAt,
    supportCount: 0
  };
  const inProgressComplaint = {
    id: 'C19',
    category: 'Wi-Fi',
    status: 'In Progress',
    submittedAt,
    supportCount: 0
  };

  const q2 = rankQueue([inProgressComplaint, raisedComplaint], FIXED_NOW, 2);
  assert.strictEqual(q2[0].id, 'C20', 'Raised ordered before In Progress');

  // Case C: Equal score, equal hours, equal category weight, equal status, different ID.
  // Lower ID number wins
  const lowerId = {
    id: 'C05',
    category: 'Wi-Fi',
    status: 'Raised',
    submittedAt,
    supportCount: 0
  };
  const higherId = {
    id: 'C08',
    category: 'Wi-Fi',
    status: 'Raised',
    submittedAt,
    supportCount: 0
  };

  const q3 = rankQueue([higherId, lowerId], FIXED_NOW, 2);
  assert.strictEqual(q3[0].id, 'C05', 'Lower ID (C05) ordered before higher ID (C08)');
});

// PRD Section 12 - Test 9:
// Fewer than 3 unresolved complaints shows only those. Zero unresolved shows All clear.
test('PRD Test 9: Fewer than 3 unresolved complaints shows only those. Zero shows empty array', () => {
  const seed = createSeedData(FIXED_NOW);
  // Keep only 2 unresolved
  const twoComplaints = [seed[0], seed[1]];
  const queueTwo = rankQueue(twoComplaints, FIXED_NOW, 3);
  assert.strictEqual(queueTwo.length, 2, 'Shows exactly 2 when only 2 unresolved exist');

  // Keep only resolved
  const resolvedOnly = [seed[3]];
  const queueEmpty = rankQueue(resolvedOnly, FIXED_NOW, 3);
  assert.strictEqual(queueEmpty.length, 0, 'Shows 0 when all are resolved (All clear)');

  const emptyList = rankQueue([], FIXED_NOW, 3);
  assert.strictEqual(emptyList.length, 0, 'Empty input returns empty array');
});

