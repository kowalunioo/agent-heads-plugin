#!/usr/bin/env python3
from pathlib import Path
import sys

LOCAL_FILES = {
    'IDENTITY.md': '# {agent} identity\n\n- Name: {agent}\n- Role:\n- Tone:\n- Scope:\n- Anti-goals:\n',
    'LEARNINGS.md': '# Learnings\n\nDurable lessons and user corrections for this agent.\n',
    'ERRORS.md': '# Errors\n\nKnown bad patterns, mistakes, and avoidable failure modes.\n',
    'DECISIONS.md': '# Decisions\n\nExplicit behavior or architecture decisions for this head.\n',
    'PLAYBOOKS.md': '# Playbooks\n\nRepeatable procedures this agent should follow.\n',
    'MEMORY.md': '# Memory\n\nLong-lived contextual memory for this specific agent.\n',
    'KNOWLEDGE.md': '# Knowledge\n\nDistilled domain knowledge and heuristics for this agent.\n',
    'SOURCES.md': '# Sources\n\nRegistry of source records for this agent head.\n',
    'BACKLOG.md': '# Backlog\n\nPending topics, imports, and open questions.\n',
}

root = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.cwd() / 'agent-heads'
agent = (sys.argv[2] if len(sys.argv) > 2 else 'main').strip().lower().replace(' ', '-')
agent_dir = root / agent
(agent_dir / 'notes').mkdir(parents=True, exist_ok=True)
(agent_dir / 'sources').mkdir(parents=True, exist_ok=True)
(agent_dir / 'imports').mkdir(parents=True, exist_ok=True)
for name, template in LOCAL_FILES.items():
    path = agent_dir / name
    if not path.exists():
        path.write_text(template.format(agent=agent), encoding='utf-8')
print(agent_dir)
