# AIOS ONE v3

Production-foundation multi-tenant Agentic AI Operating System. AIOS ONE combines a FastAPI control plane, WebSocket mission execution, Supabase authentication, personal and organization workspaces, PostgreSQL row-level tenant isolation, persistent missions, and an audit trail.

## Production foundation

- Email/password accounts with automatic personal workspaces
- Organization workspaces with owner/admin/manager/member/viewer roles
- Persistent workspace-scoped missions
- PostgreSQL row-level security for tenant isolation
- Append-only audit history for authenticated clients
- Responsive command center and live agent execution stream
- Health endpoint, safer uploads, Docker packaging, and environment template

The current agent execution engine is deliberately simulated. Real AI provider calls must be added server-side with approval gates and server-held credentials.

## Run on Windows PowerShell

```powershell
cd C:\Users\Christian\Downloads\aegis-agentic-os-v2\aegis-agentic-os-v2
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m uvicorn app:app --reload
```

Copy `.env.example` to `.env`, set the Supabase publishable values, then open:

```text
http://127.0.0.1:8000
```

## Database setup

Review and apply `supabase/migrations/20260719000100_aios_one_core.sql` using the Supabase CLI. Keep public registration disabled until the RLS isolation verification passes.

## Container

```bash
docker build -t aios-one .
docker run --env-file .env -p 8000:8000 aios-one
```
