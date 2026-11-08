from pathlib import Path
import hashlib, html, json
root = Path(__file__).resolve().parents[1]
dist = root / 'dist'
manifest = dict(line.split('=', 1) for line in (dist / 'starhermit.txt').read_text().splitlines() if '=' in line and not line.startswith('#'))
p = dist / 'index.html'
s = p.read_text()
meta = '<meta name="description" content="' + html.escape(manifest['description'], quote=True) + '">'
if '<meta name="description"' not in s:
    s = s.replace('</head>', meta + '\n</head>')
p.write_text(s)
index = {'format': 1, 'files': {str(p.relative_to(dist)): {'size': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(dist.rglob('*')) if p.is_file() and p.name != 'starhermit-files.json'}}
(dist / 'starhermit-files.json').write_text(json.dumps(index, indent=2) + '\n')
