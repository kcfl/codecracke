# SATI Campus Complaint Management System

A transparent, SLA-aware complaint management dashboard built for Samrat Ashoka Technological Institute (SATI). It enables campus students to report issues across facilities (Wi-Fi, Classrooms, Hostels, Laboratories) and administrators to track and address unresolved grievances based on an explainable priority-ranked queue.

---

## Features

- **Explainable Priority Queue**: Unresolved complaints are prioritized dynamically with a transparent scoring breakdown and deterministic tie-breaks.
- **SLA & Age Tracking**: Every category has a dedicated target resolution timeframe. Issues pending past target display live overdue indicators.
- **Forward-Only Status Workflow**: Grievance statuses follow strict sequential lifecycle transitions: `Raised` &rarr; `In Progress` &rarr; `Resolved`.
- **Search & Filtering**: Free-text search across IDs, locations, and descriptions with multi-criteria filtering by category and status.
- **Detailed Audit Trail**: Every status transition records a full timestamped history.
- **Zero-Key Atomic Persistence**: File-based atomic JSON storage with automatic seeding, corrupted file recovery, and instant reset capabilities.

---

## Domain Rules & Scoring

### 1. Priority Scoring Formula
Every unresolved complaint receives an official priority score computed on the backend:

$$\text{Score} = \text{Base} + \text{Age} + \text{Reports}$$

- **Base Weight**: Assigned according to campus facility severity:
  - **Laboratory**: `+3`
  - **Wi-Fi**: `+2`
  - **Hostel**: `+2`
  - **Classroom**: `+1`
- **Age**: `floor(hoursPending / 24)` (+1 point for every completed 24-hour window an issue remains unresolved).
- **Reports**: `min(supportCount, 3)` (up to +3 points for recurring reports).

> **Note**: Resolved complaints are excluded from the priority queue and are not scored.

### 2. Category Weights & SLAs
| Category | Weight | Target Resolution SLA |
| :--- | :---: | :--- |
| **Laboratory** | 3 | 48 hours |
| **Wi-Fi** | 2 | 24 hours |
| **Hostel** | 2 | 12 hours |
| **Classroom** | 1 | 72 hours |

### 3. Deterministic 5-Step Tie-Break Order
When multiple unresolved complaints contend for queue position, ties are broken strictly in the following order:
1. **Higher score**
2. **More hours pending** (older complaints first)
3. **Higher category weight**
4. **Raised before In Progress** (untouched complaints prioritized)
5. **Lower ID number** (deterministic numerical order, e.g. `C01` before `C02`)

### 4. Metrics & Definitions
- **Pending**: `Raised + In Progress`
- **Total**: `Pending + Resolved`
- **Timestamps**: All submissions and transitions are recorded as absolute ISO datetimes (`submittedAt`, `at`), never stored as raw relative hours.

---

## Persistence & Reliability

Persistence is managed by an atomic file repository (`backend/data/complaints.json`):
- **Atomic Writes**: Writes are committed to a temporary file before being renamed atomically, preventing partial or corrupt states.
- **Self-Healing & Auto-Seed**: If no database file is present, the repository initializes itself with seed complaints (`C01` through `C04`).
- **Corruption Safeguard**: If JSON parsing fails due to manual corruption, the file is automatically preserved as `complaints.corrupt.json` and cleanly re-seeded.
- **Offline & Zero-Key Ready**: The system operates entirely without third-party services, databases, or API keys.

---

## API Reference

Base URL: `/api`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/config` | Returns categories, statuses, weights, SLAs, and tie-break rules. |
| `GET` | `/complaints` | Lists complaints with optional query filters: `category`, `status`, `q`, and `sort`. |
| `POST` | `/complaints` | Submits a new complaint (`category`, `description`, optional `location`). Returns `201` with computed view. |
| `GET` | `/complaints/:id` | Returns a single complaint with its complete `statusHistory` audit log. |
| `PATCH` | `/complaints/:id/status` | Advances a complaint status forward (`{"to": "In Progress"}` or `{"to": "Resolved"}`). |
| `GET` | `/stats` | Aggregated counts: `total`, `pending`, `resolved`, `raised`, `inProgress`, and `byCategory`. |
| `GET` | `/priority-queue` | Returns top unresolved complaints ranked by the 5-step tie-break order with a `tieBreakNote`. |
| `GET` | `/export` | Exports the full stored complaints dataset as JSON. |
| `POST` | `/reset` | Restores default sample data (`C01` to `C04`). |

---

## Getting Started

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)

### 1. Installation

Install backend dependencies:
```bash
cd backend
npm install
```

Install frontend dependencies:
```bash
cd ../frontend
npm install
```

### 2. Running Locally

Start the backend API server (runs on `http://localhost:5000`):
```bash
cd backend
npm start
```

Start the frontend development interface (runs on `http://localhost:3000`):
```bash
cd frontend
npm start
```

---

## Verification & Unit Testing

The backend includes a comprehensive suite of unit and acceptance tests covering:
- Urgency scoring calculations and floor age thresholds
- Deterministic 5-step tie-break rankings
- Immediate removal of resolved grievances from queue
- Atomic status transitions and rejection of backward/terminal jumps (`400 Bad Request`)
- Server-side form validation (category validation, whitespace checks, minimum 10-character limits)
- Sequential ID generation (`C05`, `C06`, etc.)
- Strict count invariance (`Total == Pending + Resolved`)

To run the full test suite:
```bash
cd backend
npm test
```
