# CyberScool

A secure agentic research and engineering operations platform with a responsive SaaS dashboard, a real Cloudflare Worker/D1 foundation, approval-gated tasks, and the original 3D Robot Guild preserved as an optional Guild View.

## Working features

- Professional CyberScool shell with typed navigation across Mission Control, Copilot Manager, Specialists, R&D, Development Studio, Network Center, Integrations, Runtime Center, Audit & Security, Guild View, and Settings
- Server-authoritative specialist runtime with versioned manifests, bounded capability grants, independent sandbox evaluations, suspension/revocation, and non-executing work contracts
- Connector and skill registry with opaque server-side credential references, live provider verification, scoped grants, idempotency, rate limits, circuit breakers, revocation, and honest connection states
- Backend-compatible vertical slice from task planning through specialist evidence, approval, validation, and final owner verification
- Honest connector/runtime states: unimplemented or unverified capability is shown as Not configured or disconnected
- Responsive desktop/mobile navigation, accessible focus states, and explicit loading, empty, error, and unavailable states
- Interactive Three.js factory with five clickable robots
- Router → Planner → Builder → Tester → Reviewer workflow
- Animated data packet, mission progress, XP, levels, skills, and themes
- Responsive desktop/mobile interface and reduced-motion support
- Owner setup/login using PBKDF2 password hashing and an HTTP-only session cookie
- D1-backed missions, approvals, audit events, and mission history
- Approval-gated, read-only public GitHub repository inspection
- Searchable OpenRouter, OpenAI, Anthropic, Gemini, xAI, Mistral, Groq, and Ollama directory
- Optional server-side OpenRouter planning; keys never reach browser code
- Forge developer Copilot with server-side model routing and a safe local fallback
- Developer Studio with official VS Code, GitHub Desktop, GitHub, and Cloudflare links
- Downloadable localhost terminal companion with pairing, origin checks, confirmation, and four allowlisted commands
- `/mcp` metadata endpoint
- Guild Memory RAG foundation: approved mission evidence ingestion, owner-scoped retrieval, source citations, trust labels, and deletion API
- Browser demo mode when the Cloudflare backend is not configured

## Platform policies and roadmap

The versioned platform contract lives in `.aios/`. Start with `mission.md`, `architecture.md`, `completion-gates.md`, and `roadmap.md`. Missing backend capabilities surfaced by the v0.2 application shell are tracked in `.aios/backlog/backend.md`; the UI intentionally does not simulate them.

## Local development

```bash
npm install
npm run dev
```

The Vite-only development server can open demo mode. For backend development, create D1 and use Wrangler.

## Cloudflare setup

1. Create a D1 database:

   ```bash
   npx wrangler d1 create aios-robot-guild
   ```

2. Copy the returned database ID into `wrangler.jsonc`.
3. Apply the schema:

   ```bash
   npx wrangler d1 migrations apply aios-robot-guild --remote
   ```

4. Add optional AI secrets without committing them:

   ```bash
   npx wrangler secret put OPENROUTER_API_KEY
   npx wrangler secret put OPENROUTER_MODEL
   ```

5. Verify and deploy:

   ```bash
   npm run lint
   npm test
   npm run deploy
   ```

The application works without OpenRouter by using a safe fixed plan. Do not place keys in `.env`, React code, browser storage, screenshots, Git commits, or chat.

## Guild Memory RAG

Migration `0002_guild_memory.sql` adds owner-scoped documents and chunks. A completed, approved Repository Health Quest is stored as `verified_mission` evidence. The Knowledge tab searches it and displays stable `[K#]` citations. Forge receives only the top matching evidence, is instructed to treat retrieved content as untrusted data, and must disclose when evidence is insufficient.

This first stage intentionally uses D1 lexical retrieval so it deploys without another paid service or credential. The scale-up path is Cloudflare AI Search or Vectorize hybrid retrieval with metadata filtering, reranking, evaluation, and the same D1 source-of-truth records.

## Local terminal companion

Open Developer Studio and download `aios-terminal-companion.mjs`. Put it in the project folder and run:

```bash
node aios-terminal-companion.mjs
```

Enter the displayed one-time code in Developer Studio. The companion listens only on `127.0.0.1:4317`, validates the website origin, requires a pairing token, and accepts only `pwd`, `git status --short`, `npm run lint`, and `npm test`. Every browser run also requires confirmation.

## Security boundary

Repository Health Quest accepts only public `https://github.com/owner/repository` URLs and performs public, read-only metadata and root-file inspection. It does not clone, execute repository code, change files, merge, push, or deploy. Every run requires an explicit owner approval recorded in D1.

Before commercial SaaS use, add rate limiting, organization roles, email verification/recovery, security monitoring, backup/retention policies, dependency scanning, and an independent security review.
