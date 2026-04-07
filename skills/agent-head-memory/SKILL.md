---
name: agent-head-memory
description: Use when working on per-agent isolated memory heads, durable per-agent memory/knowledge files, shared-vs-local head boundaries, source registration/provenance, conversation-derived candidate notes, promotion to shared, or head maintenance/curation. Trigger when a task involves agent identity, learnings, errors, decisions, playbooks, durable memory, knowledge capture, candidate-note promotion, or isolated head audits.
---

# agent-head-memory

Use this skill when working on per-agent isolated memory heads.

## Purpose

This skill defines the filesystem-first operating model for agent heads:
- shared layer + local head separation
- explicit promotion to shared
- source-agnostic source registration
- durable files with strict semantics
- conversation-derived learning only through deliberate promotion

## Core rules

1. Isolation by default.
2. Read shared + current head only unless explicitly told otherwise.
3. Register sources generically; do not bake source-specific assumptions into the core model.
4. Use notes/ for intermediate material.
5. Promote only curated durable insights into durable files.
6. Treat user conversation as a valid source, but not as auto-memory.
7. Prefer `agent_head_*` runtime tools when they are available instead of ad-hoc filesystem edits.
8. When a task touches durable agent behavior, memory, provenance, or head maintenance, assume this workflow first before inventing a custom one.

## Durable local files

- IDENTITY.md
- LEARNINGS.md
- ERRORS.md
- DECISIONS.md
- PLAYBOOKS.md
- MEMORY.md
- KNOWLEDGE.md
- SOURCES.md
- BACKLOG.md

## Lifecycle

source -> note -> reviewed promotion -> durable head file

## Automatic-use heuristics

Reach for this skill by default when the task is about:
- what an agent should remember long-term
- agent-specific identity, tone, behavior, or anti-goals
- durable learnings, errors, decisions, or playbooks
- provenance or source registration
- promoting local material to shared
- turning conversation into reviewed candidate notes
- curating, auditing, or cleaning a head

## References

- references/head-schema.md
- references/isolation-rules.md
- references/source-model.md
- references/knowledge-lifecycle.md
- references/promotion-rules.md
- references/maintenance.md
- references/conversation-derived-learning.md
