PRAGMA foreign_keys = ON;

ALTER TABLE specialist_manifests ADD COLUMN allowed_skills TEXT NOT NULL DEFAULT '[]';
ALTER TABLE specialist_manifests ADD COLUMN evaluation_suite TEXT NOT NULL DEFAULT '[]';
ALTER TABLE specialist_manifests ADD COLUMN integrity_digest TEXT;
ALTER TABLE specialist_manifests ADD COLUMN suspended_at TEXT;

CREATE TABLE IF NOT EXISTS specialist_skills (
  specialist_id TEXT NOT NULL, specialist_version INTEGER NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  skill_id TEXT NOT NULL, skill_version INTEGER NOT NULL, instructions TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE',
  actor_user_id INTEGER NOT NULL, evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(specialist_id,specialist_version,workspace_id,skill_id)
);
CREATE TABLE IF NOT EXISTS specialist_capability_grants (
  id TEXT PRIMARY KEY, specialist_id TEXT NOT NULL, specialist_version INTEGER NOT NULL, assignment_id TEXT,
  organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL, plan_version INTEGER NOT NULL,
  capabilities_json TEXT NOT NULL, connectors_json TEXT NOT NULL, runtimes_json TEXT NOT NULL, data_scope_json TEXT NOT NULL,
  expires_at TEXT NOT NULL, approved_by INTEGER, revoked_at TEXT, revocation_reason TEXT,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PROPOSED', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS specialist_evaluations (
  id TEXT PRIMARY KEY, specialist_id TEXT NOT NULL, specialist_version INTEGER NOT NULL, organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL, task_id TEXT NOT NULL DEFAULT 'registry', plan_version INTEGER NOT NULL DEFAULT 0,
  suite_version INTEGER NOT NULL, sandbox_runtime TEXT NOT NULL, evaluator_specialist_id TEXT NOT NULL,
  score REAL NOT NULL, passed INTEGER NOT NULL CHECK(passed IN (0,1)), findings TEXT NOT NULL,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL, evidence_refs TEXT NOT NULL, correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS specialist_performance_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, specialist_id TEXT NOT NULL, specialist_version INTEGER NOT NULL,
  organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL, plan_version INTEGER NOT NULL,
  assignment_id TEXT, metric_type TEXT NOT NULL, metric_value REAL NOT NULL, outcome TEXT NOT NULL,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'RECORDED', evidence_refs TEXT NOT NULL,
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS specialist_suspensions (
  id TEXT PRIMARY KEY, specialist_id TEXT NOT NULL, specialist_version INTEGER NOT NULL, organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL, task_id TEXT NOT NULL DEFAULT 'registry', plan_version INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL, suspended_by INTEGER NOT NULL, lifted_by INTEGER, lifted_at TEXT,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', evidence_refs TEXT NOT NULL,
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS specialist_revocations (
  id TEXT PRIMARY KEY, specialist_id TEXT NOT NULL, specialist_version INTEGER NOT NULL, organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL, task_id TEXT NOT NULL DEFAULT 'registry', plan_version INTEGER NOT NULL DEFAULT 0,
  reason TEXT NOT NULL, revoked_by INTEGER NOT NULL, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'REVOKED',
  evidence_refs TEXT NOT NULL, correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS specialist_execution_contracts (
  id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, grant_id TEXT NOT NULL, specialist_id TEXT NOT NULL,
  specialist_version INTEGER NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL, input_json TEXT NOT NULL, expected_output_schema TEXT NOT NULL,
  acceptance_criteria TEXT NOT NULL, evidence_requirements TEXT NOT NULL, budget_json TEXT NOT NULL,
  expires_at TEXT NOT NULL, cancelled_at TEXT, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'READY',
  evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_specialist_grants_scope ON specialist_capability_grants(workspace_id,task_id,status);
CREATE INDEX IF NOT EXISTS idx_specialist_evaluations_scope ON specialist_evaluations(workspace_id,specialist_id,specialist_version);
CREATE INDEX IF NOT EXISTS idx_specialist_performance_scope ON specialist_performance_events(workspace_id,specialist_id,created_at);
CREATE INDEX IF NOT EXISTS idx_specialist_contracts_scope ON specialist_execution_contracts(workspace_id,task_id,status);
