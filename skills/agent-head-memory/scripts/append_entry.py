#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime, timezone
import sys

if len(sys.argv) < 5:
    raise SystemExit('usage: append_entry.py <root> <agent> <file> <content> [heading]')

root = Path(sys.argv[1])
agent = sys.argv[2]
name = sys.argv[3]
content = sys.argv[4]
heading = sys.argv[5] if len(sys.argv) > 5 else datetime.now(timezone.utc).isoformat()
path = root / agent / name
path.parent.mkdir(parents=True, exist_ok=True)
if not path.exists():
    path.write_text(f'# {name}\n\n', encoding='utf-8')
block = f"\n## {heading}\n\n{content.strip()}\n"
path.write_text(path.read_text(encoding='utf-8').rstrip() + '\n' + block, encoding='utf-8')
print(path)
