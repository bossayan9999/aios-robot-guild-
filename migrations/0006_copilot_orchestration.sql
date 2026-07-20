PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS specialist_manifests (
  id TEXT NOT NULL, version INTEGER NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL DEFAULT 'registry', plan_version INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL, role TEXT NOT NULL, instructions TEXT NOT NULL, input_schema TEXT NOT NULL,
  output_schema TEXT NOT NULL, allowed_tools TEXT NOT NULL, allowed_connectors TEXT NOT NULL,
  allowed_runtimes TEXT NOT NULL, allowed_data_scope TEXT NOT NULL, risk_level TEXT NOT NULL,
  budget_limits TEXT NOT NULL, approval_requirements TEXT NOT NULL, prohibited_actions TEXT NOT NULL,
  reviewer_requirements TEXT NOT NULL, test_cases TEXT NOT NULL DEFAULT '[]', enabled INTEGER NOT NULL DEFAULT 1,
  sandbox_evaluated INTEGER NOT NULL DEFAULT 0, security_reviewed INTEGER NOT NULL DEFAULT 0,
  owner_approved INTEGER NOT NULL DEFAULT 0, revoked_at TEXT, created_by INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, version, workspace_id)
);

CREATE TABLE IF NOT EXISTS copilot_sessions (
  id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE',
  evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(task_id) REFERENCES tasks(id)
);
CREATE TABLE IF NOT EXISTS copilot_objectives (
  id TEXT PRIMARY KEY, session_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL, plan_version INTEGER NOT NULL, objective TEXT NOT NULL, constraints_json TEXT NOT NULL,
  unknowns_json TEXT NOT NULL, risk_level TEXT NOT NULL, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT',
  evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(session_id) REFERENCES copilot_sessions(id)
);
CREATE TABLE IF NOT EXISTS task_plans (
  id TEXT PRIMARY KEY, objective_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL, plan_version INTEGER NOT NULL, summary TEXT NOT NULL, risk_level TEXT NOT NULL,
  approval_required INTEGER NOT NULL DEFAULT 1, approved_by INTEGER, approved_at TEXT,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'DRAFT', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(task_id, plan_version), FOREIGN KEY(objective_id) REFERENCES copilot_objectives(id)
);
CREATE TABLE IF NOT EXISTS plan_steps (
  id TEXT PRIMARY KEY, plan_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL, plan_version INTEGER NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL,
  description TEXT NOT NULL, dependencies_json TEXT NOT NULL DEFAULT '[]', parallel_group TEXT,
  accountable_specialist_id TEXT NOT NULL, acceptance_criteria TEXT NOT NULL, evidence_requirements TEXT NOT NULL,
  rollback_requirements TEXT NOT NULL, approval_required INTEGER NOT NULL DEFAULT 0, actor_user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED', evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(plan_id) REFERENCES task_plans(id)
);
CREATE TABLE IF NOT EXISTS specialist_assignments (
  id TEXT PRIMARY KEY, plan_step_id TEXT NOT NULL, specialist_id TEXT NOT NULL, specialist_version INTEGER NOT NULL,
  organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL, plan_version INTEGER NOT NULL,
  capability_grants TEXT NOT NULL, connector_grants TEXT NOT NULL, runtime_grants TEXT NOT NULL, data_scope TEXT NOT NULL,
  retry_count INTEGER NOT NULL DEFAULT 0, retry_limit INTEGER NOT NULL DEFAULT 2, actor_user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PROPOSED', evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(plan_step_id) REFERENCES plan_steps(id)
);
CREATE TABLE IF NOT EXISTS specialist_handoffs (
  id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, source_specialist_id TEXT NOT NULL, destination_specialist_id TEXT NOT NULL,
  organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL, plan_version INTEGER NOT NULL,
  plan_step_id TEXT NOT NULL, input_contract TEXT NOT NULL, output_contract TEXT NOT NULL, artifacts_json TEXT NOT NULL,
  unresolved_questions TEXT NOT NULL, risk_notes TEXT NOT NULL, approval_state TEXT NOT NULL,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PROPOSED', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS specialist_results (
  id TEXT PRIMARY KEY, assignment_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL, plan_version INTEGER NOT NULL, output_json TEXT NOT NULL, actor_user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'SUBMITTED', evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS review_findings (
  id TEXT PRIMARY KEY, result_id TEXT NOT NULL, assignment_id TEXT NOT NULL, reviewer_specialist_id TEXT NOT NULL,
  organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL, plan_version INTEGER NOT NULL,
  decision TEXT NOT NULL, findings TEXT NOT NULL, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL,
  evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS conflict_records (
  id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL, assignment_ids TEXT NOT NULL, description TEXT NOT NULL, resolution TEXT,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'UNRESOLVED', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS escalation_requests (
  id TEXT PRIMARY KEY, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL, assignment_id TEXT, reason TEXT NOT NULL, requested_action TEXT NOT NULL,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orchestration_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL, task_id TEXT NOT NULL,
  plan_version INTEGER NOT NULL, actor_user_id INTEGER NOT NULL, event_type TEXT NOT NULL, target_type TEXT NOT NULL,
  target_id TEXT NOT NULL, status TEXT NOT NULL, detail TEXT NOT NULL, evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_copilot_task_scope ON copilot_sessions(task_id, workspace_id);
CREATE INDEX IF NOT EXISTS idx_orchestration_plan_scope ON task_plans(task_id, workspace_id, plan_version);
CREATE INDEX IF NOT EXISTS idx_assignment_scope ON specialist_assignments(task_id, workspace_id, plan_version);
CREATE INDEX IF NOT EXISTS idx_orchestration_events_scope ON orchestration_events(task_id, workspace_id, id);
