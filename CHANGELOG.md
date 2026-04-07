# Changelog

## 0.2.0 - 2026-04-07

### Added
- `ingest_media_knowledge` orchestration tool for feeding agent heads from media sources
- deterministic material presets via `materialType`:
  - `meeting`
  - `podcast`
  - `lecture`
  - `voice-note`
  - `research`
  - `pdf`
  - `web/article`
  - `generic`
  - `auto`
- preset-aware extraction heuristics for summary shaping, decisions, follow-ups, and candidate generation
- duplicate detection before source registration and durable writes
- metadata-first bridge guidance for integrating with lossless-claw

### Changed
- agent-head ingestion now prefers candidate-first routing for ambiguous transcript-derived knowledge
- durable writes and shared promotions can be skipped automatically when content already appears to exist
- README now documents ingestion workflow, presets, dedupe behavior, and lossless-claw conventions

### Notes
- This release keeps transcription as a separate acquisition concern.
- The ingestion layer lives in `agent-heads-plugin` because it is fundamentally a memory-routing workflow.
