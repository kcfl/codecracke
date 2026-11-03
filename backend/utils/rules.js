// backend/utils/rules.js
// Domain validation, ID generation, and status transitions per PRD Section 6, 7, 8

const VALID_CATEGORIES = ['Wi-Fi', 'Hostel', 'Classroom', 'Laboratory'];
const VALID_STATUSES = ['Raised', 'In Progress', 'Resolved'];

function extractIdNumber(id) {
  if (typeof id === 'number') return id;
  const matches = String(id || '').match(/\d+/);
  return matches ? parseInt(matches[0], 10) : 0;
}

function generateNextId(existingComplaints = []) {
  let maxNum = 0;
  for (const c of existingComplaints) {
    if (c && c.id) {
      const num = extractIdNumber(c.id);
      if (num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = maxNum + 1;
  const padded = String(nextNum).padStart(2, '0');
  return `C${padded}`;
}

function getNextStatus(currentStatus) {
  if (currentStatus === 'Raised') return 'In Progress';
  if (currentStatus === 'In Progress') return 'Resolved';
  return null;
}

function isValidStatusTransition(fromStatus, toStatus) {
  if (fromStatus === 'Raised' && toStatus === 'In Progress') return true;
  if (fromStatus === 'In Progress' && toStatus === 'Resolved') return true;
  return false;
}

function validateComplaintInput(input = {}) {
  const errors = {};

  // Category validation
  if (!input.category || typeof input.category !== 'string' || !input.category.trim()) {
    errors.category = 'Category is required';
  } else if (!VALID_CATEGORIES.includes(input.category.trim())) {
    errors.category = `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`;
  }

  // Description validation
  if (input.description === undefined || input.description === null) {
    errors.description = 'Description is required';
  } else if (typeof input.description !== 'string') {
    errors.description = 'Description must be a string';
  } else {
    const trimmed = input.description.trim();
    if (trimmed.length === 0) {
      errors.description = 'Description cannot be blank or whitespace-only';
    } else if (trimmed.length < 10) {
      errors.description = 'Description must be at least 10 characters long';
    } else if (trimmed.length > 500) {
      errors.description = 'Description must not exceed 500 characters';
    }
  }

  // Location validation (optional, max 80 chars)
  if (input.location !== undefined && input.location !== null && input.location !== '') {
    if (typeof input.location !== 'string') {
      errors.location = 'Location must be a string';
    } else if (input.location.trim().length > 80) {
      errors.location = 'Location must not exceed 80 characters';
    }
  }

  const isValid = Object.keys(errors).length === 0;
  return { isValid, errors };
}

module.exports = {
  VALID_CATEGORIES,
  VALID_STATUSES,
  extractIdNumber,
  generateNextId,
  getNextStatus,
  isValidStatusTransition,
  validateComplaintInput
};

