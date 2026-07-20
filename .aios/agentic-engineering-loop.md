# Agentic Engineering Loop

The Copilot Manager owns coordination; specialists own bounded work; the user owns authority and acceptance.

## Loop

1. **Intake** — capture objective, constraints, organization/workspace, assets, definition of done, and user authority.
2. **Classify** — identify data sensitivity, runtime, external effects, reversibility, cost, and risk.
3. **Discover** — inspect relevant repository/system evidence without mutation; state assumptions and unknowns.
4. **Plan** — decompose work, assign specialists, select tools/runtime, define gates, rollback, budgets, and required approvals.
5. **Approve** — bind approval to the plan version and capability envelope before sensitive or external effects.
6. **Sandbox** — provision the minimum isolated environment, inputs, secrets, network destinations, and resource limits.
7. **Execute** — perform the smallest auditable work item, emit progress events, and attach outputs. Stop on scope drift.
8. **Test** — run proportional automated tests and capture commands, versions, results, and artifacts.
9. **Validate** — compare outputs with requirements, policies, schemas, and acceptance criteria; reproduce critical results.
10. **Review** — obtain an independent relevant-specialist review and security review. Resolve findings through another loop.
11. **Approve completion or release** — present the exact result, residual risk, evidence, and proposed external effect to the authorized user.
12. **Deliver and observe** — deploy or hand off only when authorized; verify health and retain rollback capability.
13. **Learn under control** — propose reusable learning from approved evidence; evaluate, review, version, and approve before promotion.

## Operating rules

- Each work item has one accountable owner and explicit inputs/outputs.
- Delegation never transfers more authority than the delegator holds.
- Specialist output is advice or an artifact until independently validated.
- Retries are bounded and visible; repeated failure becomes `blocked`, not hidden looping.
- Changes to scope, target, connector, privilege, deployment environment, or destructive impact trigger replanning and renewed approval.
- Evidence is captured as work happens and references immutable or content-addressed artifacts where practical.
- Agents may say `blocked`, `failed`, or `insufficient evidence`; they may not manufacture success.

## Completion invariant

Never mark a task complete until implementation, tests, validation, specialist review, security review, evidence capture, and required approvals have passed. The state machine must make this invariant impossible to bypass through UI, API, automation, retry, feature flag, or administrator convenience.
