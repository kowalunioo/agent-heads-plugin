# agent-heads-plugin

OpenClaw plugin implementing small, composable tools for per-agent isolated heads.

## What it provides

- head initialization
- head status / audit
- append durable local entries
- register generic sources
- read durable local files
- promote reviewed local material into the shared layer

## Current tool set

- `agent_head_init`
- `agent_head_status`
- `agent_head_write_entry`
- `agent_head_register_source`
- `agent_head_read`
- `agent_head_promote_shared`

## Config

Recommended runtime config uses absolute workspace paths:

```json
{
  "enabled": true,
  "config": {
    "rootDir": "/home/user/.openclaw/workspace/agent-heads",
    "sharedDir": "/home/user/.openclaw/workspace/agent-heads/shared",
    "defaultAgentKey": "bankrut-jezyslaw"
  }
}
```

## Notes

- Relative paths can drift across runtimes; prefer absolute workspace paths.
- Promotion to shared is explicit by design.
- The plugin is source-agnostic; ingestion systems should feed into it, not define it.
- A planned next layer is lightweight self-improvement logging inspired by `self-improving-agent`, adapted to per-head isolation instead of one shared learnings log.

## Planned next evolution

Potential additions:
- `agent_head_log_learning`
- `agent_head_log_error`
- `agent_head_log_backlog_item`
- optional reflection triage helper

These would capture only durable post-task reflections and route them into the correct local file without weakening provenance or isolation.
