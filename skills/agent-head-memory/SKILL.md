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

## References

- references/head-schema.md
- references/isolation-rules.md
- references/source-model.md
- references/knowledge-lifecycle.md
- references/promotion-rules.md
- references/maintenance.md
- references/conversation-derived-learning.md
