# Plan: agent heads v2

## Goal

Build a clean per-agent memory and knowledge system for OpenClaw where each agent has its own isolated head.

The system should:

- keep agents separated by default
- support a shared layer for truly global rules
- let each agent develop its own identity, memory, knowledge, decisions, and playbooks
- allow learning from many kinds of sources
- stay independent from any one ingestion method such as YouTube
- be easy to continue in a fresh session without hidden assumptions

This plan treats **agent heads as the core system**.

Learning pipelines such as:
- YouTube → transcript → summary → knowledge
- article → notes → knowledge
- PDF → extraction → summary → knowledge
- conversation → distilled learning → memory

should be treated as **optional companion systems** that feed into agent heads, not as the definition of agent heads themselves.

---

## Core idea

The system is about one thing above all:

**each agent gets its own head**

That head is where the agent’s:
- identity
- learned lessons
- decisions
- playbooks
- long-term memory
- domain knowledge

can live without being mixed with other agents.

The architecture is not tied to YouTube, transcripts, or any one plugin.

Those are only possible sources of knowledge.

---

## What we keep from the previous `agent-heads-plugin`

The earlier project had the right architectural instincts.

We should preserve these ideas.

### 1. Shared layer + local head model

This stays as the foundation.

Why it works:
- prevents context leakage
- gives every agent a clean private space
- still allows a controlled global layer for common rules

### 2. Explicit promotion to shared

This also stays.

Why it works:
- local knowledge does not silently become global
- shared memory stays cleaner
- agents keep their individuality

### 3. Agent-key auto-resolution

This is a good ergonomic feature and worth keeping.

Recommended order:
1. explicit `agentKey`
2. plugin config `currentAgentKey`
3. plugin config `defaultAgentKey`
4. runtime/env hints
5. fallback `main`

### 4. Small composable operations

The old project was right not to start with a giant monolith.

The system should prefer small operations like:
- inspect head
- read head file
- write local entry
- promote to shared
- initialize head
- audit head

### 5. Separate files by function

This stays too.

The split between:
- `IDENTITY`
- `LEARNINGS`
- `ERRORS`
- `DECISIONS`
- `PLAYBOOKS`

was a good start and should remain part of the model.

---

## What changes in v2

The biggest change is conceptual:

**agent heads are not a YouTube-learning system**

They are a general-purpose per-agent memory and knowledge architecture.

That means the core system should not assume where knowledge came from.

The source could be:
- YouTube
- PDFs
- websites
- books
- meeting notes
- transcripts
- user corrections
- project docs
- manual curation
- future plugins we have not built yet

So the core plan must focus on:
- isolation
- schema
- boundaries
- provenance
- promotion rules
- maintenance

not on one ingestion pipeline.

---

## Design principles

### Principle 1: isolation by default

An agent should read:
- shared layer
- its own head

An agent should not read another head unless explicitly requested for:
- handoff
- comparison
- migration
- review

This is the most important rule in the system.

### Principle 2: source-agnostic knowledge model

The knowledge model must work no matter whether the source was:
- a transcript
- a PDF
- a conversation
- a web article
- a manually written note

The head stores distilled knowledge, not source-specific assumptions.

### Principle 3: raw source is not durable memory

Raw inputs can be archived, but they should not automatically become the main memory.

Durable files should stay distilled and useful.

### Principle 4: promotion is explicit

Knowledge moves from local to shared only after deliberate review.

### Principle 5: provenance is mandatory

Durable knowledge should be traceable to:
- a source record
- a note or summary
- or a manual reasoning step

### Principle 6: start with filesystem and docs first

Do not start with complicated automation.

First make sure:
- the folder layout is clean
- the file roles are clear
- the rules are documented
- the workflow can be followed by a fresh session

Automation can be added later.

---

## System layers

Use a 3-layer architecture.

## Layer 1: shared layer

This is only for things that should truly apply across agents.

Suggested path:

```text
/home/user/.openclaw/workspace/agent-heads/shared/
```

Suggested contents:

```text
agent-heads/shared/
├── RULES.md
├── TOOLS.md
├── DECISIONS.md
├── KNOWLEDGE.md
├── SOURCES.md
└── POLICIES.md
```

What belongs here:
- cross-agent rules
- environment-wide workflow rules
- workspace-wide tool gotchas
- common formatting conventions
- shared policies
- truly reusable knowledge used by multiple agents

What should not go here:
- one agent’s tone
- one agent’s worldview
- one agent’s domain-specific style
- temporary experiments
- low-confidence ideas from a single source

---

## Layer 2: per-agent local head

Each agent gets its own directory.

Example:

```text
/home/user/.openclaw/workspace/agent-heads/bankrut-jezyslaw/
```

Suggested layout:

```text
agent-heads/bankrut-jezyslaw/
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

Purpose of files:

- `IDENTITY.md` — who the agent is, its role, tone, scope, worldview, anti-goals
- `LEARNINGS.md` — lessons about how this agent should think or operate
- `ERRORS.md` — mistakes, failed approaches, incorrect assumptions
- `DECISIONS.md` — decisions about how this agent is configured or expected to behave
- `PLAYBOOKS.md` — repeatable procedures this agent should use
- `MEMORY.md` — long-lived context this agent should remember
- `KNOWLEDGE.md` — distilled domain knowledge used by this agent
- `SOURCES.md` — registry of source records associated with this head
- `BACKLOG.md` — pending topics, future imports, open questions
- `notes/` — structured notes, topic pages, drafts, distilled summaries
- `sources/` — archived raw source artifacts or normalized imports
- `imports/` — staging area for newly added material before review

---

## Layer 3: companion ingestion systems

This layer is intentionally separate from the core agent-heads model.

Companion systems may exist for:
- YouTube transcription and summarization
- web/article ingestion
- PDF/document extraction
- transcript cleanup
- conversation distillation
- future semantic indexing

These systems should feed into agent heads through a standard pattern:

```text
source -> note/summary -> curated promotion -> durable head files
```

Important:
- the head system should work even if none of these companion systems exist
- any ingestion plugin should plug into agent heads, not redefine them

---

## Canonical responsibilities of `agent-heads`

The core `agent-heads` system should be responsible for:

- creating and organizing per-agent heads
- enforcing separation between heads
- defining the shared vs local model
- storing durable agent-specific memory
- storing durable agent-specific knowledge
- keeping clear categories of local knowledge
- allowing explicit promotion to shared
- tracking source provenance at a generic level
- supporting audits and maintenance

It should **not** be tightly responsible for:
- YouTube-specific logic
- transcript-specific logic
- PDF parsing
- website scraping
- source-type-specific extraction details

Those belong in companion systems.

---

## File semantics

The success of the system depends on strict meaning for each file.

### `IDENTITY.md`

Use for:
- agent name and role
- tone and style
- worldview
- priorities
- anti-goals
- boundaries of behavior

### `LEARNINGS.md`

Use for:
- lessons learned over time
- reasoning adjustments
- workflow lessons
- repeated user corrections turned into durable guidance

### `ERRORS.md`

Use for:
- known bad patterns
- mistakes already made
- avoidable failure modes
- assumptions that turned out wrong

### `DECISIONS.md`

Use for:
- explicit policy decisions
- chosen conventions
- architectural or behavioral decisions about the head

### `PLAYBOOKS.md`

Use for:
- repeatable step-by-step procedures
- task recipes
- operational workflows

### `MEMORY.md`

Use for:
- long-term contextual memory
- stable preferences or durable facts relevant to this head
- things that should still matter in future sessions

### `KNOWLEDGE.md`

Use for:
- distilled domain knowledge
- principles
- heuristics
- frameworks
- conceptual reference knowledge

### `SOURCES.md`

Use for:
- generic source registry
- records of where knowledge came from
- trust/status/provenance tracking

### `BACKLOG.md`

Use for:
- topics to research
- future knowledge to import
- unresolved questions
- pending cleanups

### `notes/`

Use for:
- intermediate writeups
- topic notes
- source summaries
- working docs that are not yet promoted into durable memory/knowledge

### `sources/`

Use for:
- stored raw inputs or normalized artifacts
- imported documents
- archived transcript files
- source-side materials that support provenance

### `imports/`

Use for:
- staging area before promotion
- newly added external materials
- unreviewed content waiting to be processed

---

## Canonical source model

Because the system is source-agnostic, we need one generic way to track sources.

Each source record should include at least:

- source id
- title
- type
- origin
- added at
- added for which agent
- trust level
- status
- related files
- notes

### Example source types

- `youtube`
- `pdf`
- `web`
- `book-note`
- `conversation`
- `manual`
- `transcript`
- `doc`
- `audio`
- `other`

### Example source entry

```markdown
## SRC-20260406-001

- Title: Example source
- Type: web
- Origin: https://example.com/article
- Added At: 2026-04-06T18:00:00Z
- Added For: bankrut-jezyslaw
- Trust: medium
- Status: reviewed
- Related Files: notes/example-source.md
- Notes: useful for downside-risk framing
```

This works whether the source is a YouTube video, a PDF, a voice note, or a manually written memo.

---

## Knowledge lifecycle

The head system should support a generic lifecycle for any imported knowledge.

### Stage 1: add source

A source gets registered in `SOURCES.md`.

At this point it is only a tracked input, not durable knowledge.

### Stage 2: create note or summary

The source is processed into a note, summary, or structured intermediate file under `notes/`.

This stage may be produced by:
- a human
- an agent
- a script
- a plugin
- a transcription pipeline
- a document parser

### Stage 3: extract durable insights

Selected insights move from `notes/` into:
- `KNOWLEDGE.md`
- `MEMORY.md`
- `LEARNINGS.md`
- `DECISIONS.md`
- `PLAYBOOKS.md`

### Stage 4: review

Over time, durable knowledge may be:
- kept active
- challenged
- updated
- deprecated
- promoted to shared

This lifecycle is intentionally source-independent.

---

## Conversation-derived learning

The system should explicitly support learning from the user conversation.

This is important because some of the most valuable agent calibration comes from:
- user corrections
- explicit preferences
- decisions made in chat
- repeated feedback patterns
- direct statements about how the agent should behave

### Key rule

Conversation with the user is a valid source of knowledge, but it should not be dumped into durable memory automatically.

Use this model:

```text
conversation -> candidate note -> reviewed promotion -> durable head file
```

This prevents the head from filling up with:
- casual chatter
- one-off moods
- brainstorming noise
- speculative statements
- temporary context that should not persist

### Source model for conversation

Conversation-derived entries should be allowed in `SOURCES.md` using generic source types such as:
- `conversation`
- `user-feedback`
- `user-correction`
- `session-note`

Example:

```markdown
## SRC-20260406-014

- Title: User feedback about agent tone
- Type: user-feedback
- Origin: discord conversation
- Added At: 2026-04-06T18:15:00Z
- Added For: bankrut-jezyslaw
- Trust: high
- Status: reviewed
- Related Files: notes/2026-04-06__tone-feedback.md
- Notes: user wants the agent to be more blunt and less motivational
```

### Good candidates for durable promotion

Promote conversation-derived content when it is:
- a stable user preference
- an explicit correction
- a behavioral rule
- an agent-specific direction
- a durable project or workflow decision
- a reusable lesson learned from repeated interaction

Examples:
- preferred tone or style
- what the agent should optimize for
- what the agent should avoid doing
- a correction to how something works
- a standing workflow decision
- a repeated pattern of user feedback

### Weak candidates that should usually stay out of durable memory

Do not promote by default:
- casual banter
- temporary emotional states
- one-off requests with no long-term value
- raw brainstorming without conclusion
- speculative ideas without follow-up
- noisy fragments without clear durable meaning

### Mapping conversation learnings to files

Use these rules:

- `IDENTITY.md` for:
  - tone
  - role
  - worldview
  - style boundaries
  - anti-goals

- `LEARNINGS.md` for:
  - corrections from the user
  - lessons about how the agent should reason
  - repeated interaction-based adjustments

- `DECISIONS.md` for:
  - explicit decisions made in conversation
  - settled policy choices
  - agreed conventions

- `PLAYBOOKS.md` for:
  - recurring ways the user wants a task handled
  - repeatable step-by-step behaviors

- `MEMORY.md` for:
  - durable contextual facts the agent should remember
  - stable user expectations relevant to that head

- `KNOWLEDGE.md` for:
  - conceptual or factual knowledge extracted from conversation when it has lasting value

### Review policy

Conversation-derived knowledge should be reviewed with extra care because chat often contains ambiguity.

Prefer promotion when one or more of these are true:
- the user explicitly says to remember it
- the same point appears more than once
- it clearly changes how the agent should behave in future
- it is phrased as a preference, rule, correction, or decision

If unclear, keep it in `notes/` first instead of promoting immediately.

### Why this matters

Without conversation-derived learning, the agent head misses the most direct source of calibration.

With too much automatic conversation memory, the head turns into clutter.

So the correct balance is:
- conversation is a first-class source
- promotion from conversation is filtered and deliberate

---

## Shared promotion policy

Promotion to shared must stay conservative.

Promote to shared only when content is:
- reused across multiple heads
- stable over time
- not identity-specific
- genuinely useful outside one agent

Good shared candidates:
- formatting rules
- workspace workflow conventions
- tool gotchas
- ingestion policies
- common evaluation criteria
- reusable general procedures

Bad shared candidates:
- one agent’s personality
- one agent’s worldview
- one agent’s niche heuristics
- unstable takes from one source

---

## Core operations for MVP

The core system should support a minimal set of operations.

### 1. Initialize head

Create the folder structure and starter files for a new agent head.

### 2. Read head state

Read key files from the current or selected head.

### 3. Append local knowledge

Add entries to the proper local file.

### 4. Register source

Add a generic source record to `SOURCES.md`.

### 5. Promote local entry to shared

Move or rewrite a local insight into the shared layer after review.

### 6. Audit head

Check for:
- duplicates
- stale files
- oversized notes
- missing provenance
- messy structure

---

## Suggested skill structure

Recommended location:

```text
/home/user/.openclaw/workspace/skills/agent-head-memory/
```

Suggested structure:

```text
skills/agent-head-memory/
├── SKILL.md
├── references/
│   ├── head-schema.md
│   ├── isolation-rules.md
│   ├── source-model.md
│   ├── knowledge-lifecycle.md
│   ├── promotion-rules.md
│   └── maintenance.md
├── scripts/
│   ├── init_agent_head.py
│   ├── register_source.py
│   ├── append_entry.py
│   └── audit_head.py
└── assets/
    └── templates/
```

### `SKILL.md` should explain

- when to use the skill
- how to create a new head
- how to keep head boundaries strict
- how to register sources generically
- how to move notes into durable files
- how to promote local knowledge to shared
- how to keep the head clean over time

---

## Plugin strategy

A plugin can exist, but should come after the workflow is proven.

### Phase 1

Build the model as:
- folders
- templates
- skill references
- helper scripts

### Phase 2

If repeated usage proves it helpful, build or revive a plugin with small tools like:
- `agent_head_status`
- `agent_head_read`
- `agent_head_write_entry`
- `agent_head_register_source`
- `agent_head_promote_shared`

### Phase 3

Let companion plugins integrate with it:
- transcript ingestion plugin
- PDF ingestion plugin
- article ingestion plugin
- conversation distillation plugin

This keeps the core stable and lets source-specific systems evolve separately.

### Phase 4

Add lightweight self-improvement helpers inspired by self-improving-agent, but adapted to the head-isolated architecture.

The key adaptation is:
- keep per-agent isolation intact
- do not introduce one global learnings log
- log only durable or reusable post-task reflections
- separate learning, error, and backlog capture
- keep promotion to shared explicit

Suggested additions:
- `agent_head_log_learning` -> fast path into `LEARNINGS.md`
- `agent_head_log_error` -> fast path into `ERRORS.md`
- `agent_head_log_backlog_item` -> fast path into `BACKLOG.md`
- optional reflection triage helper to decide whether a reflection belongs in learning, error, decision, backlog, or only a candidate note

Design rule:

```text
post-task reflection -> triage -> local durable file or candidate note -> optional shared promotion
```

This gives the plugin a controlled self-improvement loop without collapsing into noisy auto-memory.

---

## What companion plugins can do later

These are explicitly out of scope for the core system, but fully compatible with it.

### Example companion plugin: YouTube/transcript learning

Responsibilities:
- accept YouTube URL
- transcribe media
- generate summary
- create note under selected agent head
- suggest promotion candidates

### Example companion plugin: PDF/document learning

Responsibilities:
- ingest PDF or document
- extract text
- summarize key concepts
- create structured note
- suggest durable knowledge updates

### Example companion plugin: conversation distillation

Responsibilities:
- turn chat or meetings into concise notes
- extract stable decisions and learnings
- suggest updates to relevant head files

All of these should feed the same model:

```text
source -> note -> promotion -> durable head files
```

---

## MVP definition

The MVP should focus only on the core system.

### MVP scope

- `agent-heads/` folder model
- shared layer
- per-agent local head structure
- reusable `agent-head-memory` skill
- templates for key files
- one head initialization script
- one generic source registration script
- one generic append-entry helper
- one audit helper
- one pilot head, e.g. `bankrut-jezyslaw`

### MVP is done when

- a new agent head can be created cleanly
- the current head can be identified or selected
- sources can be registered without assuming source type
- notes can be turned into durable local knowledge
- shared promotion is explicit
- another head is not touched by default
- a fresh session can continue work by reading the files alone

---

## Recommended implementation order

### Step 1
Create canonical `agent-heads/` structure.

### Step 2
Create `shared/` starter files.

### Step 3
Create one example local head: `bankrut-jezyslaw`.

### Step 4
Scaffold `skills/agent-head-memory/`.

### Step 5
Write references:
- `head-schema.md`
- `isolation-rules.md`
- `source-model.md`
- `knowledge-lifecycle.md`
- `promotion-rules.md`
- `maintenance.md`

### Step 6
Implement `init_agent_head.py`.

### Step 7
Implement `register_source.py`.

### Step 8
Implement `append_entry.py`.

### Step 9
Implement `audit_head.py`.

### Step 10
Test the full local workflow with one manually added source.

### Step 11
Only then decide whether to add or revive plugin tooling.

---

## Next-session checklist

When resuming this work in a new session:

1. create `agent-heads/shared/`
2. create `agent-heads/bankrut-jezyslaw/`
3. create starter files for shared and local head
4. scaffold `skills/agent-head-memory/`
5. write `SKILL.md`
6. write the reference docs
7. create starter templates in `assets/templates/`
8. implement `init_agent_head.py`
9. implement `register_source.py`
10. implement `append_entry.py`
11. implement `audit_head.py`
12. test local append/promote flow
13. test generic source registration
14. note friction points and simplify the model if needed

---

## Risks and mitigations

### Risk 1: the system becomes accidentally source-specific

Mitigation:
- keep source tracking generic
- treat YouTube/PDF/web as types, not as architecture
- put source-specific logic into companion plugins

### Risk 2: agents bleed into each other

Mitigation:
- strict local-vs-shared rules
- do not read another head by default
- keep identity files isolated

### Risk 3: durable files become cluttered

Mitigation:
- use `notes/` for intermediate material
- promote only curated insights
- audit periodically

### Risk 4: shared layer becomes a dumping ground

Mitigation:
- explicit promotion only
- shared must stay conservative
- only promote reusable, stable, cross-agent material

### Risk 5: plugin work starts too early

Mitigation:
- prove the filesystem workflow first
- add plugin only where repeated operations justify it

---

## Final recommendation

The correct framing is:

**agent heads = core per-agent memory architecture**

not:

**agent heads = YouTube learning plugin**

Keep the core small, strict, and source-agnostic.

Then let separate ingestion systems feed it from:
- YouTube
- PDFs
- articles
- conversations
- notes
- future sources

That gives us a system that is:
- cleaner
- more reusable
- easier to reason about
- easier to extend later
- much less likely to collapse into source-specific spaghetti
