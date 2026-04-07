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

- `ingest_media_knowledge` — transcribe media, register provenance, and route the result into candidate notes or durable head files
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

## Release scope: v0.2.0

This release expands the reusable core into an actual ingestion workflow:
- isolated per-agent heads
- shared/local boundaries
- source registration
- explicit promotion to shared
- conversation candidate creation + promotion
- selective reads
- curation helper
- audit / maintenance baseline
- media-to-knowledge ingestion via `ingest_media_knowledge`
- preset-aware routing for meetings, podcasts, lectures, voice notes, research material, PDFs, and web/article imports
- lightweight dedupe before durable writes
- metadata-first conventions for lossless-claw interoperability

Still intentionally out of scope for v0.2.0:
- OCR/parsing backend for PDFs inside this plugin
- first-class web fetching/parser runtime inside this plugin
- semantic/vector dedupe infra
- autonomous promotion of ambiguous knowledge into durable memory without review
- heavy LLM-only extraction as the default path

## Recommended workspace guidance

To make usage more automatic in practice, add a short rule to your workspace `AGENTS.md` or equivalent guidance file.

Recommended idea:
- when a task involves durable agent memory, provenance, candidate-note review, head maintenance, or per-agent behavior updates, default to the `agent-heads` workflow
- when runtime `agent_head_*` tools are available, prefer them over ad-hoc file editing

This does not change the plugin itself, but it significantly improves whether agents reach for the head workflow automatically.

## Media ingestion wrapper

`ingest_media_knowledge` is the first orchestration layer that turns media into agent-usable knowledge.

What it does:
1. calls `transcribe_media`
2. extracts a compact summary, bullet points, and likely follow-ups
3. registers a transcript source in `SOURCES.md`
4. either:
   - creates candidate notes for later review, or
   - writes directly into durable files for low-risk cases
5. optionally promotes reviewed content into the shared layer

Why this matters:
- the transcription plugin remains the acquisition layer
- agent-heads remains the durable memory layer
- the wrapper becomes the digestion layer in the middle

### Suggested default

Use `knowledgeMode: "auto"` or `"candidate"` unless the transcript is short, trusted, and the durable target is obvious.

### Important caveat

`writeTranscript: true` can be useful, but it is easy to bloat `MEMORY.md` with raw text. Use it on purpose, not by habit.

## Planned next evolution

Potential additions:
- transcript-type presets (`meeting`, `podcast`, `lecture`, `research`, `voice-note`)
- better extraction heuristics or optional LLM-assisted classification
- optional reflection triage helper

These should improve routing quality without weakening provenance or isolation.

Current ingestion presets:
- `meeting`
- `podcast`
- `lecture`
- `voice-note`
- `research`
- `pdf`
- `web/article`
- `generic`

The ingestion layer now also accepts `materialType` and falls back to deterministic preset detection when it is omitted or set to `auto`.

### Lossless-claw bridge

The practical bridge is metadata-first, not raw-text-first.

Use these conventions when feeding media into agent heads:
- keep transcript artifacts in the transcription system
- register a `transcript` source in `SOURCES.md`
- preserve `sourceId`, `cache_key`, `selected_input_path`, and artifact paths
- create candidate notes for durable takeaways before writing to durable files
- use the media title or source ID as the stable search key for later lossless-claw recall

Why this works:
- agent-heads stays the durable knowledge layer
- lossless-claw stays the replay/recall layer
- the transcript system stays the acquisition layer

If we later add a direct bridge, it should be a thin export helper that turns the same metadata into a search prompt or retrieval bundle, not a raw transcript copier.
