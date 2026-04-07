#!/usr/bin/env python3
from pathlib import Path
import json
import sys

if len(sys.argv) < 3:
    raise SystemExit('usage: audit_head.py <root> <agent>')

root = Path(sys.argv[1])
agent = sys.argv[2]
base = root / agent
files = ['IDENTITY.md','LEARNINGS.md','ERRORS.md','DECISIONS.md','PLAYBOOKS.md','MEMORY.md','KNOWLEDGE.md','SOURCES.md','BACKLOG.md']
issues = []
stats = {}
for name in files:
    path = base / name
    if not path.exists():
        issues.append(f'missing: {name}')
        continue
    text = path.read_text(encoding='utf-8')
    stats[name] = {'bytes': path.stat().st_size, 'lines': len(text.splitlines())}
    if name != 'SOURCES.md' and len(text.strip()) < 40:
        issues.append(f'{name}: looks nearly empty')
if (base / 'imports').exists():
    imports_count = len(list((base / 'imports').iterdir()))
    if imports_count:
        issues.append(f'imports/: {imports_count} item(s) waiting for review')
else:
    imports_count = 0
print(json.dumps({'agent': agent, 'issues': issues, 'stats': stats, 'imports': imports_count}, indent=2))
