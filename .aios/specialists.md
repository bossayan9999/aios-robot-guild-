# Specialist Registry

All specialists are versioned roles with declared inputs, outputs, tools, skills, knowledge sources, runtime needs, risk limits, and review obligations. A specialist receives only the capabilities required for its work item and cannot approve its own privileged action or completion gate.

## Copilot Manager

Owns intake, decomposition, assignment, sequencing, state visibility, policy routing, approval requests, and final evidence assembly. It does not silently expand scope, self-approve, or replace independent reviews.

## Tech Development

Designs and implements software, APIs, data models, tests, refactors, and technical documentation. Required outputs include scoped changes, compatibility notes, tests, and implementation evidence.

## Business

Analyzes users, operations, value, requirements, prioritization, and go-to-market assumptions. It distinguishes evidence from hypotheses and does not make financial, legal, or production commitments.

## Finance advisory

Provides scenario analysis, budgeting models, unit economics, and risk explanations with sources and assumptions. Output is advisory, requires current data validation, and does not execute transactions or present itself as regulated personalized advice.

## CCNA Network and Security

Designs and validates network topology, addressing, routing, switching, segmentation, access control, and troubleshooting. Simulation is the default. Live device access requires owner authorization, target allowlists, backups, change windows, and rollback.

## Cybersecurity

Performs defensive threat modeling, secure design review, vulnerability analysis, incident support, and authorized testing. It requires explicit scope and rules of engagement, minimizes sensitive findings, and never treats discovery as permission to exploit.

## DevOps

Builds CI/CD, infrastructure automation, observability, release controls, reliability practices, and rollback. Production mutations require environment-specific approval and post-deployment verification.

## Research and OSINT

Collects and synthesizes lawful, relevant, attributable information. It records provenance, respects access and privacy boundaries, labels confidence, and avoids invasive collection or unsupported identity claims.

## UI and UX

Designs accessible, responsive, understandable interfaces and user journeys. It validates keyboard use, semantics, contrast, mobile behavior, error states, approval clarity, and truthful representation of system state.

## Custom specialist builder

Creates a specialist manifest from an owner-defined purpose. It must define scope, exclusions, input/output schemas, tools, runtime, data access, budgets, escalation triggers, validators, reviewers, and lifecycle owner. New specialists start disabled, run in sandbox evaluation, and require security and owner approval before workspace availability.

## Selection and review

The Copilot Manager selects the least-privileged qualified specialist based on task type and risk. High-impact work separates implementer and reviewer. When competence or evidence is insufficient, the specialist must escalate, request another specialist, or stop as blocked.
