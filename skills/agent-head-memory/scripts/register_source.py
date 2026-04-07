#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import sys

if len(sys.argv) < 6:
    raise SystemExit('usage: register_source.py <root> <agent> <title> <type> <origin> [notes]')

root = Path(sys.argv[1])
agent = sys.argv[2]
file_path = root / agent / 'SOURCES.md'
file_path.parent.mkdir(parents=True, exist_ok=True)
if not file_path.exists():
    file_path.write_text('# Sources\n\n', encoding='utf-8')
source_id = 'SRC-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
notes = sys.argv[6] if len(sys.argv) > 6 else '-'
block = f"\n## {source_id}\n\n- Title: {sys.argv[3]}\n- Type: {sys.argv[4]}\n- Origin: {sys.argv[5]}\n- Added At: {datetime.now(timezone.utc).isoformat()}\n- Added For: {agent}\n- Trust: unknown\n- Status: unreviewed\n- Related Files: -\n- Notes: {notes}\n"
file_path.write_text(file_path.read_text(encoding='utf-8').rstrip() + '\n' + block, encoding='utf-8')
print(source_id)
