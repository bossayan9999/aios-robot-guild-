# AIOS Robot Guild — Advanced RAG Research and Upgrade Report

Date: 16 July 2026  
Status: Source update implemented and locally verified; production deployment intentionally pending owner review.

## Executive decision

Build Guild Memory in two layers:

1. **Now: D1 citation-first retrieval.** Store only evidence produced by approved missions, isolate every record by owner, retrieve matching chunks, show source/trust labels, and let the owner delete records.
2. **Scale: Cloudflare AI Search or Vectorize hybrid retrieval.** Add semantic + keyword search, metadata filters, reranking, automated indexing, and an evaluation suite after the memory contract is proven.

This is safer and cheaper than immediately adding embeddings. It also prevents the 3D game interface from becoming a visual wrapper around an unauditable chatbot.

## What was added

- `migrations/0002_guild_memory.sql`
- `knowledge_documents` and `knowledge_chunks`, both owner scoped
- Automatic ingestion after an approved Repository Health Quest completes
- `verified_mission` trust state
- `GET /api/knowledge` document inventory
- `GET /api/knowledge/search?q=` retrieval with citations
- `DELETE /api/knowledge/:id` owner-only deletion
- Knowledge tab search interface and `[K#]` citation cards
- Forge retrieval context with an explicit rule: retrieved text is untrusted evidence, never instructions
- MCP metadata advertises `guild_memory_search`
- Contract test for tenant isolation and prompt-injection boundary

## Target architecture

User quest → Router policy check → Planner query rewrite → Retriever hybrid search → Reranker → Context firewall → Model answer with citations → Reviewer confidence gate → D1 audit + XP.

Storage roles:

- D1: identities, permissions, document metadata, citations, mission/audit records, retention state
- R2: original files and large artifacts
- AI Search or Vectorize: retrieval index, never the sole source of truth
- Queues/Workflows: ingestion, chunking, embedding, re-indexing, deletion propagation
- AI Gateway: model observability, rate limits, retry/fallback, and cost controls

## RAG security contract

- Retrieved content cannot authorize a tool action.
- Tool execution always uses the existing human approval gate.
- Every query is tenant filtered before ranking.
- The answer must cite a stored source or say evidence is insufficient.
- Web and repository text are untrusted; embedded instructions are ignored.
- Secrets never enter chunks, prompts, browser storage, screenshots, or logs.
- Deleting a document must delete its chunks, vectors, cached answers, and derived summaries.
- Finance answers must separate personal records from public market research and carry freshness timestamps and risk disclaimers.

## Evaluation gates before semantic production

Create a fixed test collection with at least 40 questions:

- 15 exact project facts
- 10 multi-document questions
- 5 stale/conflicting-source questions
- 5 prompt-injection documents
- 5 questions with no answer

Release gates:

- Retrieval recall@5 ≥ 0.85
- Citation correctness ≥ 0.95
- Unsupported-claim rate ≤ 0.02
- Cross-tenant leakage = 0
- Prompt-injection tool execution = 0
- p95 search latency and cost budget recorded before enabling generation

## Game design mapping

- Router robot: classifies question, tenant, trust, and required freshness
- Planner robot: creates subqueries and chooses project, finance, market, or OSINT memory
- Builder robot: ingests/chunks/indexes artifacts and carries visible “knowledge crystals” between buildings
- Tester robot: runs retrieval, citation, injection, and staleness checks
- Reviewer robot: blocks low-confidence answers and requests owner approval
- XP is awarded only for verified ingestion/evaluation/approved outcomes—not number of chats
- Skills unlock through measured evaluation scores, not silent self-training

## Recommended backlog

### P0 — next safe release

1. Apply migration `0002_guild_memory.sql` remotely.
2. Deploy this source and test create quest → approve → run → Knowledge search → Forge citation.
3. Add API rate limits, security headers/CSP, structured security logs, and session cleanup.
4. Add export and visible delete controls to the Knowledge tab.
5. Add a RAG evaluation script and seed fixtures.

### P1 — advanced retrieval

1. Create Cloudflare AI Search instance or Vectorize index.
2. Add metadata: owner, project, source type, trust, version, created/freshness dates, sensitivity.
3. Use hybrid retrieval and reranking; keep D1 lexical fallback.
4. Add R2 document upload with type/size scanning and asynchronous ingestion.
5. Add citations to every Forge response and a “show evidence” drawer.

### P2 — agentic and finance upgrades

1. Durable mission jobs and live events via Queues/Workflows plus SSE.
2. Project wiki with decisions, runbooks, goals, quality gates, and version history.
3. PesoPilot memory namespace for salary, expenses, savings targets, and Philippine-peso budgets.
4. Separate market-research namespace with source dates, jurisdiction, risk labels, and no autonomous trading.
5. Notification center, PWA/mobile install, backups, observability, and recovery runbook.

### P3 — SaaS readiness

Organizations, roles, tenant keys, quotas, usage/cost ledger, subscription billing, retention policies, legal/privacy review, and independent security testing.

## Sources researched

- Cloudflare AI Search overview (updated 6 July 2026): https://developers.cloudflare.com/ai-search/
- Cloudflare Vectorize overview (updated 21 April 2026): https://developers.cloudflare.com/vectorize/
- Cloudflare Workers AI RAG tutorial (updated 25 June 2026): https://developers.cloudflare.com/workers-ai/guides/tutorials/build-a-retrieval-augmented-generation-ai/
- OWASP GenAI Prompt Injection guidance: https://genai.owasp.org/llmrisk/llm01-prompt-injection/

## Owner review checklist

- [ ] Review the source diff and this report
- [ ] Confirm the remote D1 backup/time-travel state
- [ ] Apply migration 0002
- [ ] Push source to GitHub main
- [ ] Wait for Cloudflare Git deployment
- [ ] Run authenticated production smoke test
- [ ] Only then configure an encrypted OpenRouter key if generation is desired
