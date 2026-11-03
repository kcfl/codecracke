# Project rules
Read docs/PRD.md before any task. It is the source of truth; if code and PRD disagree, PRD wins.
- No auth, email, AI/LLM/vision APIs, maps, photos. Only external service allowed: Supabase, backend only.
- Never put the Supabase service role key in frontend code, logs, commits or chat. Read it from backend/.env.
- All scoring/ranking lives in backend/utils/priority.js. Frontend never computes the official score.
- Tie-breaks follow PRD 6.6 exactly. Never rely on array order.
- Every change to scoring, IDs, transitions or validation needs a unit test, and you must run the tests before saying done.
- Do not edit docs/PRD.md. Do not delete files outside PRD section 10.
- Another teammate owns frontend/. Only touch frontend/ when a prompt says so.
- When done with a task: list changed files, list commands you ran, paste the real output.

