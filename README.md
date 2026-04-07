# agent-heads-plugin

OpenClaw plugin implementing small, composable tools for per-agent isolated heads.

## What it provides

- head initialization
- head status / audit
- append durable local entries
- register generic sources
- read durable local files
- selective single-file reads
- promote reviewed local material into the shared layer
- create conversation-derived candidate notes
- promote reviewed conversation candidates into durable files
- cleanup / curation helper for durable files

## Current tool set

- `agent_head_init` — create the canonical directory structure and starter files for a per-agent head
- `agent_head_status` — inspect one head and return audit-style status, issues, warnings, suggestions, and counts
- `agent_head_write_entry` — append a curated entry into one durable local file
- `agent_head_register_source` — register a generic provenance/source record in `SOURCES.md`
- `agent_head_read` — read the durable snapshot of the whole local head
- `agent_head_read_file` — read one selected durable file from a local head
- `agent_head_promote_shared` — promote reviewed local material into the shared layer explicitly
- `agent_head_create_conversation_candidate` — create a reviewed-later candidate note from conversation under `notes/conversation/`
- `agent_head_promote_conversation_candidate` — promote a reviewed conversation candidate into one durable local file
- `agent_head_curate_file` — append a curation note or rewrite a durable local file during maintenance
- `agent_head_log_learning` — quickly append a durable learning to `LEARNINGS.md`
- `agent_head_log_error` — quickly append an error pattern or failure mode to `ERRORS.md`
- `agent_head_log_backlog_item` — quickly append a backlog item or open question to `BACKLOG.md`

## Config

Recommended runtime config uses absolute workspace paths:

```json
{
  "enabled": true,
  "config": {
    "rootDir": "/home/user/.openclaw/workspace/agent-heads",
    "sharedDir": "/home/user/.openclaw/workspace/agent-heads/shared",
    "defaultAgentKey": "your-agent"
  }
}
```

## Notes

- Relative paths can drift across runtimes; prefer absolute workspace paths.
- Promotion to shared is explicit by design.
- The plugin is source-agnostic; ingestion systems should feed into it, not define it.
- A planned next layer is lightweight self-improvement logging inspired by `self-improving-agent`, adapted to per-head isolation instead of one shared learnings log.

## Release scope: v0.1.0 core

This release intentionally stops at the reusable core:
- isolated per-agent heads
- shared/local boundaries
- source registration
- explicit promotion to shared
- conversation candidate creation + promotion
- selective reads
- curation helper
- audit / maintenance baseline

Out of scope for v0.1.0:
- source-specific ingestion pipelines
- PDF/web/transcript companion systems
- self-improvement fast-path log tools
- reflection triage helper
- advanced semantic audit heuristics

## Recommended workspace guidance

To make usage more automatic in practice, add a short rule to your workspace `AGENTS.md` or equivalent guidance file.

Recommended idea:
- when a task involves durable agent memory, provenance, candidate-note review, head maintenance, or per-agent behavior updates, default to the `agent-heads` workflow
- when runtime `agent_head_*` tools are available, prefer them over ad-hoc file editing

This does not change the plugin itself, but it significantly improves whether agents reach for the head workflow automatically.

## Planned next evolution

Potential additions:
- `agent_head_log_learning`
- `agent_head_log_error`
- `agent_head_log_backlog_item`
- optional reflection triage helper

These would capture only durable post-task reflections and route them into the correct local file without weakening provenance or isolation.
