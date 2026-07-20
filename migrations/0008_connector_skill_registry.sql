PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS skill_registry (
  id TEXT NOT NULL, version INTEGER NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  name TEXT NOT NULL, description TEXT NOT NULL, input_schema TEXT NOT NULL, output_schema TEXT NOT NULL,
  risk_level TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, integrity_digest TEXT NOT NULL,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id,version,workspace_id)
);
CREATE TABLE IF NOT EXISTS connector_manifests (
  id TEXT NOT NULL, version INTEGER NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  name TEXT NOT NULL, provider TEXT NOT NULL, auth_type TEXT NOT NULL, base_url TEXT NOT NULL,
  required_scopes TEXT NOT NULL, allowed_destinations TEXT NOT NULL, data_classes TEXT NOT NULL,
  rate_limit_per_minute INTEGER NOT NULL, timeout_ms INTEGER NOT NULL, max_retries INTEGER NOT NULL,
  integrity_digest TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, actor_user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(id,version,workspace_id)
);
CREATE TABLE IF NOT EXISTS connector_actions (
  connector_id TEXT NOT NULL, connector_version INTEGER NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  action_id TEXT NOT NULL, classification TEXT NOT NULL, input_schema TEXT NOT NULL, output_schema TEXT NOT NULL,
  approval_required INTEGER NOT NULL DEFAULT 0, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE',
  evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(connector_id,connector_version,workspace_id,action_id)
);
CREATE TABLE IF NOT EXISTS connector_instances (
  id TEXT PRIMARY KEY, connector_id TEXT NOT NULL, connector_version INTEGER NOT NULL, organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL, credential_reference TEXT, provider_identity TEXT, verified_scopes TEXT NOT NULL DEFAULT '[]',
  state TEXT NOT NULL DEFAULT 'NOT_CONFIGURED', last_verified_at TEXT, failure_reason TEXT,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(connector_id,workspace_id)
);
CREATE TABLE IF NOT EXISTS connector_grants (
  id TEXT PRIMARY KEY, connector_instance_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  task_id TEXT NOT NULL, plan_version INTEGER NOT NULL, actor_scope TEXT NOT NULL, actions_json TEXT NOT NULL,
  resources_json TEXT NOT NULL, data_classes_json TEXT NOT NULL, expires_at TEXT NOT NULL, approved_by INTEGER,
  revoked_at TEXT, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', evidence_refs TEXT NOT NULL,
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS connector_credential_references (
  id TEXT PRIMARY KEY, connector_instance_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  provider TEXT NOT NULL, secret_reference TEXT NOT NULL, last_four TEXT, rotated_at TEXT, expires_at TEXT,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS connector_oauth_states (
  id TEXT PRIMARY KEY, connector_instance_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  state_hash TEXT NOT NULL, redirect_uri TEXT NOT NULL, expires_at TEXT NOT NULL, consumed_at TEXT,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS connector_health_checks (
  id TEXT PRIMARY KEY, connector_instance_id TEXT NOT NULL, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  provider_identity TEXT, credentials_valid INTEGER NOT NULL, permissions_valid INTEGER NOT NULL,
  health_valid INTEGER NOT NULL, latency_ms INTEGER, detail TEXT NOT NULL, actor_user_id INTEGER NOT NULL,
  status TEXT NOT NULL, evidence_refs TEXT NOT NULL DEFAULT '[]', correlation_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS connector_invocations (
  id TEXT PRIMARY KEY, connector_instance_id TEXT NOT NULL, grant_id TEXT NOT NULL, organization_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL, task_id TEXT NOT NULL, plan_version INTEGER NOT NULL, action_id TEXT NOT NULL,
  target TEXT NOT NULL, request_digest TEXT NOT NULL, response_status INTEGER, attempt_count INTEGER NOT NULL DEFAULT 0,
  actor_user_id INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING', evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS connector_idempotency_records (
  connector_instance_id TEXT NOT NULL, workspace_id TEXT NOT NULL, idempotency_key TEXT NOT NULL,
  request_digest TEXT NOT NULL, invocation_id TEXT NOT NULL, response_status INTEGER, response_summary TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(connector_instance_id,workspace_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS connector_rate_limits (
  connector_instance_id TEXT NOT NULL, workspace_id TEXT NOT NULL, window_started_at TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(connector_instance_id,workspace_id)
);
CREATE TABLE IF NOT EXISTS connector_circuit_breakers (
  connector_instance_id TEXT NOT NULL, workspace_id TEXT NOT NULL, failure_count INTEGER NOT NULL DEFAULT 0,
  state TEXT NOT NULL DEFAULT 'CLOSED', opened_at TEXT, retry_after TEXT, last_failure TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(connector_instance_id,workspace_id)
);
CREATE TABLE IF NOT EXISTS connector_audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, connector_instance_id TEXT, organization_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  task_id TEXT, plan_version INTEGER NOT NULL DEFAULT 0, event_type TEXT NOT NULL, target TEXT NOT NULL,
  outcome TEXT NOT NULL, actor_user_id INTEGER NOT NULL, status TEXT NOT NULL, evidence_refs TEXT NOT NULL DEFAULT '[]',
  correlation_id TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_connector_instances_scope ON connector_instances(organization_id,workspace_id,state);
CREATE INDEX IF NOT EXISTS idx_connector_grants_scope ON connector_grants(workspace_id,task_id,status);
CREATE INDEX IF NOT EXISTS idx_connector_invocations_scope ON connector_invocations(workspace_id,task_id,created_at);
CREATE INDEX IF NOT EXISTS idx_connector_audit_scope ON connector_audit_events(workspace_id,created_at);
