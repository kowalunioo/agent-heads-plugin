# Agent Heads

Per-agent isolated durable memory/knowledge storage for OpenClaw.

## Layout

- `shared/` — truly cross-agent material
- `<agent-key>/` — one local head per agent

Example:

```text
agent-heads/
├── shared/
│   ├── RULES.md
│   ├── TOOLS.md
│   ├── DECISIONS.md
│   ├── KNOWLEDGE.md
│   ├── SOURCES.md
│   └── POLICIES.md
└── your-agent/
    ├── IDENTITY.md
    ├── LEARNINGS.md
    ├── ERRORS.md
    ├── DECISIONS.md
    ├── PLAYBOOKS.md
    ├── MEMORY.md
    ├── KNOWLEDGE.md
    ├── SOURCES.md
    ├── BACKLOG.md
    ├── notes/
    ├── sources/
    └── imports/
```

## Runtime tools

- `agent_head_init`
- `agent_head_status`
- `agent_head_write_entry`
- `agent_head_register_source`
- `agent_head_read`
- `agent_head_promote_shared`

## Recommended flow

1. Initialize or select a head.
2. Register a source in `SOURCES.md`.
3. Create notes / distilled material.
4. Promote durable insights into local files.
5. Promote to `shared/` only when reuse is genuinely cross-agent.

## File meanings

- `IDENTITY.md` — role, tone, worldview, anti-goals
- `LEARNINGS.md` — lessons and user corrections
- `ERRORS.md` — repeated mistakes and failure modes
- `DECISIONS.md` — explicit settled decisions
- `PLAYBOOKS.md` — repeatable procedures
- `MEMORY.md` — durable context to remember
- `KNOWLEDGE.md` — distilled domain knowledge
- `SOURCES.md` — provenance / source registry
- `BACKLOG.md` — pending topics and open questions

## Provenance rule

`SOURCES.md` answers: **where did this come from?**

Durable memory files answer: **what do we keep?**

## Shared promotion rule

Use `agent_head_promote_shared` only for material that is:
- stable
- cross-agent
- not identity-specific
- worth reusing outside one head
