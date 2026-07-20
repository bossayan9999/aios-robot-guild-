PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL CHECK (state IN ('CREATED','PLANNING','WAITING_FOR_APPROVAL','ASSIGNED','SANDBOX_PROVISIONING','RUNNING','TESTING','REVIEWING','REPAIRING','VALIDATING','STAGING','SECURITY_REVIEW','WAITING_FOR_COMPLETION_APPROVAL','COMPLETED','FAILED','BLOCKED','CANCELLED','ROLLED_BACK')),
  current_plan_version INTEGER NOT NULL DEFAULT 0,
  correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_plan_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  material_change INTEGER NOT NULL DEFAULT 1 CHECK (material_change IN (0,1)),
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, version)
);

CREATE TABLE IF NOT EXISTS task_steps (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  plan_version INTEGER NOT NULL,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','passed','failed','blocked','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, plan_version, position)
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL REFERENCES task_steps(id) ON DELETE CASCADE,
  depends_on_step_id TEXT NOT NULL REFERENCES task_steps(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(step_id, depends_on_step_id),
  CHECK (step_id <> depends_on_step_id)
);

CREATE TABLE IF NOT EXISTS task_state_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  from_state TEXT,
  to_state TEXT NOT NULL,
  actor_user_id INTEGER NOT NULL REFERENCES users(id),
  reason TEXT NOT NULL,
  plan_version INTEGER NOT NULL,
  correlation_id TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS task_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  specialist_id TEXT NOT NULL,
  assigned_by INTEGER NOT NULL REFERENCES users(id),
  plan_version INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','cancelled','superseded')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_evidence (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  uri TEXT,
  sha256 TEXT,
  plan_version INTEGER NOT NULL,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_gates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  gate_type TEXT NOT NULL CHECK (gate_type IN ('implementation','tests','validation','specialist_review','security_review','evidence_capture','approvals')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','passed','failed','not_applicable','invalidated')),
  applicable INTEGER NOT NULL DEFAULT 1 CHECK (applicable IN (0,1)),
  evidence_id TEXT REFERENCES task_evidence(id) ON DELETE SET NULL,
  reason TEXT NOT NULL DEFAULT '',
  plan_version INTEGER NOT NULL,
  submitted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, gate_type)
);

CREATE TABLE IF NOT EXISTS specialist_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  specialist_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('passed','failed','revision_requested')),
  findings TEXT NOT NULL,
  plan_version INTEGER NOT NULL,
  reviewed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('passed','failed','revision_requested')),
  findings TEXT NOT NULL,
  plan_version INTEGER NOT NULL,
  reviewed_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS completion_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  workspace_id TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved','rejected')),
  reason TEXT NOT NULL,
  plan_version INTEGER NOT NULL,
  approved_by INTEGER NOT NULL REFERENCES users(id),
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_tasks_scope ON tasks(user_id, workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_events_task ON task_state_events(task_id, id);
CREATE INDEX IF NOT EXISTS idx_task_steps_task ON task_steps(task_id, plan_version, position);
CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_gates_task ON task_gates(task_id, gate_type);
CREATE INDEX IF NOT EXISTS idx_task_evidence_task ON task_evidence(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_specialist_reviews_task ON specialist_reviews(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_reviews_task ON security_reviews(task_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_completion_approvals_task ON completion_approvals(task_id, created_at DESC);
