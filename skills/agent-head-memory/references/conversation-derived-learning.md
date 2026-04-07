# Conversation-derived learning

Conversation with the user is a valid source of knowledge, but should not become durable memory automatically.

## Recommended pattern

```text
conversation -> candidate note -> reviewed promotion -> durable head file
```

## Good promotion candidates

- stable user preferences
- explicit corrections
- behavior rules
- durable workflow decisions
- repeated feedback patterns

## Weak candidates

- casual banter
- temporary moods
- one-off brainstorming fragments
- speculative ideas without follow-up

## Suggested mapping

- `IDENTITY.md` -> tone, role, anti-goals, style boundaries
- `LEARNINGS.md` -> corrections, reasoning adjustments
- `DECISIONS.md` -> settled agreements and rules
- `PLAYBOOKS.md` -> recurring requested procedures
- `MEMORY.md` -> durable contextual facts
- `KNOWLEDGE.md` -> lasting conceptual/factual knowledge extracted from chat

## Candidate-note idea

A future helper/plugin layer can create candidate note files under:

```text
agent-heads/<agent>/notes/conversation/
```

with metadata such as:
- date
- source chat/channel
- why it seems durable
- suggested target file
- confidence / review status
