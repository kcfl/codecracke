// backend/utils/priority.js
// Priority calculation and queue ranking per PRD Section 6

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
  '1. Higher score',
  '2. More hours pending (older first)',
  '3. Higher category weight',
  '4. Raised before In Progress (nobody has touched it yet)',
  '5. Lower ID number (deterministic)'
];

const URGENCY_BANDS = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

function getHoursPending(submittedAt, now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const subDate = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
  const diffMs = nowDate.getTime() - subDate.getTime();
  const hours = Math.max(0, diffMs / (1000 * 60 * 60));
  return Math.round(hours * 10) / 10;
}

function getExactAgeDays(submittedAt, now = new Date()) {
  const nowDate = now instanceof Date ? now : new Date(now);
  const subDate = submittedAt instanceof Date ? submittedAt : new Date(submittedAt);
  const diffMs = nowDate.getTime() - subDate.getTime();
  const hours = Math.max(0, diffMs / (1000 * 60 * 60));
  return Math.floor(hours / 24);
}

function score(complaint, now = new Date()) {
  if (!complaint || complaint.status === 'Resolved') {
    return null;
  }

  const base = CATEGORY_WEIGHTS[complaint.category] ?? 0;
  const age = getExactAgeDays(complaint.submittedAt, now);
  const reports = Math.min(Math.max(0, complaint.supportCount || 0), 3);
  const total = base + age + reports;

  return {
    base,
    age,
    reports,
    total
  };
}

function getUrgencyBand(scoreObj) {
  if (!scoreObj || typeof scoreObj.total !== 'number') return null;
  if (scoreObj.total >= 6) return URGENCY_BANDS.HIGH;
  if (scoreObj.total >= 4) return URGENCY_BANDS.MEDIUM;
  return URGENCY_BANDS.LOW;
}

function extractIdNumber(id) {
  if (typeof id === 'number') return id;
  const matches = String(id || '').match(/\d+/);
  return matches ? parseInt(matches[0], 10) : 0;
}

function compareComplaints(a, b, now) {
  const scoreA = score(a, now);
  const scoreB = score(b, now);
  const totalA = scoreA ? scoreA.total : -1;
  const totalB = scoreB ? scoreB.total : -1;

  // 1. Higher score
  if (totalA !== totalB) {
    return totalB - totalA;
  }

  // 2. More hours pending (older first)
  const hoursA = getHoursPending(a.submittedAt, now);
  const hoursB = getHoursPending(b.submittedAt, now);
  if (hoursA !== hoursB) {
    return hoursB - hoursA;
  }

  // 3. Higher category weight
  const weightA = CATEGORY_WEIGHTS[a.category] ?? 0;
  const weightB = CATEGORY_WEIGHTS[b.category] ?? 0;
  if (weightA !== weightB) {
    return weightB - weightA;
  }

  // 4. Raised before In Progress (nobody has touched it yet)
  if (a.status !== b.status) {
    if (a.status === 'Raised' && b.status === 'In Progress') return -1;
    if (a.status === 'In Progress' && b.status === 'Raised') return 1;
  }

  // 5. Lower ID number (deterministic)
  const numA = extractIdNumber(a.id);
  const numB = extractIdNumber(b.id);
  if (numA !== numB) {
    return numA - numB;
  }
  return String(a.id).localeCompare(String(b.id));
}

function computeTieBreakNote(itemA, itemB, now) {
  if (!itemB) {
    return 'Lowest rank in queue';
  }

  const scoreA = score(itemA, now);
  const scoreB = score(itemB, now);
  const totalA = scoreA ? scoreA.total : -1;
  const totalB = scoreB ? scoreB.total : -1;

  if (totalA !== totalB) {
    return `Higher score (${totalA} vs ${totalB})`;
  }

  const hoursA = getHoursPending(itemA.submittedAt, now);
  const hoursB = getHoursPending(itemB.submittedAt, now);
  if (hoursA !== hoursB) {
    return `More hours pending (${hoursA}h vs ${hoursB}h)`;
  }

  const weightA = CATEGORY_WEIGHTS[itemA.category] ?? 0;
  const weightB = CATEGORY_WEIGHTS[itemB.category] ?? 0;
  if (weightA !== weightB) {
    return `Higher category weight (${itemA.category} [${weightA}] vs ${itemB.category} [${weightB}])`;
  }

  if (itemA.status !== itemB.status) {
    if (itemA.status === 'Raised' && itemB.status === 'In Progress') {
      return 'Raised before In Progress (untouched priority)';
    }
  }

  return `Lower ID number (${itemA.id} vs ${itemB.id})`;
}

function rankQueue(list = [], now = new Date(), limit = 3) {
  // Resolved complaints excluded
  const unresolved = list.filter(item => item && item.status !== 'Resolved');

  // Sort with 5-step tie-break order
  const sorted = [...unresolved].sort((a, b) => compareComplaints(a, b, now));

  const count = typeof limit === 'number' && limit > 0 ? limit : 3;
  const top = sorted.slice(0, count);

  return top.map((item, index) => {
    const sc = score(item, now);
    const hp = getHoursPending(item.submittedAt, now);
    const nextItem = top[index + 1];
    const tieBreakNote = top.length === 1
      ? 'Only unresolved complaint'
      : (nextItem ? computeTieBreakNote(item, nextItem, now) : `Rank ${index + 1} in priority queue`);

    return {
      ...item,
      rank: index + 1,
      hoursPending: hp,
      score: sc,
      urgencyBand: getUrgencyBand(sc),
      tieBreakNote
    };
  });
}

module.exports = {
  CATEGORY_WEIGHTS,
  SLA_TARGETS,
  TIE_BREAK_RULES,
  URGENCY_BANDS,
  getHoursPending,
  score,
  getUrgencyBand,
  rankQueue,
  compareComplaints,
  computeTieBreakNote
};

