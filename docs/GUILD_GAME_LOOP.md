# AIOS Robot Guild — Verified Game Loop

Build: `2026.07.18-hall2`

## Core loop

1. The owner creates a scoped quest.
2. The owner approves the read-only plan.
3. Router, Planner, Builder, Tester and Reviewer record evidence handoffs.
4. The result stops at `review_required` with rewards locked.
5. The owner either requests a revision or verifies completion.
6. Only `completed` missions award 300 XP, 25 Guild Tokens, specialist experience, a tool badge and cited Guild Memory.

## Visual rules

- Active mission events move the matching specialist robot toward the central forge.
- Recorded progress grows the project tower; it does not represent unverified execution.
- The gold reward crown appears only when the mission status is `completed`.
- Graphics modes are Low, Balanced and Cinematic; mobile defaults to Low.
- Camera controls include overview, follow, pause, drag-to-orbit, keyboard orbit and zoom.

## Security rules

- The 3D scene never calls APIs and never executes tools.
- Mission mutation remains owner-session protected and same-origin restricted.
- Final verification is a separate audited API decision.
- Revision requests award no XP, tokens, memory or badges.
- Guild Tokens are presentation-only and have no monetary or cryptocurrency value.

## Next art milestone

Replace procedural robot geometry with original, licensed GLB characters that use idle, walk, carry, work and celebrate animation clips. Keep Low mode as the procedural fallback for older phones and reduced-bandwidth sessions.
