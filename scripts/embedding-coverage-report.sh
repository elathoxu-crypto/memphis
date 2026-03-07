#!/usr/bin/env bash
set -euo pipefail

MEMPHIS_HOME="${MEMPHIS_HOME:-$HOME/.memphis}"
CHAINS_DIR="$MEMPHIS_HOME/chains"
CACHE_FILE="$MEMPHIS_HOME/embeddings-cache.json"
OUT_JSON="$MEMPHIS_HOME/logs/embedding-coverage.json"
OUT_TXT="$MEMPHIS_HOME/logs/embedding-coverage.txt"

mkdir -p "$MEMPHIS_HOME/logs"

python3 - <<'PY'
import json,glob,os
from datetime import datetime

home=os.path.expanduser(os.environ.get('MEMPHIS_HOME','~/.memphis'))
chains_dir=os.path.join(home,'chains')
cache_file=os.path.join(home,'embeddings-cache.json')
out_json=os.path.join(home,'logs','embedding-coverage.json')
out_txt=os.path.join(home,'logs','embedding-coverage.txt')

reserved={'.git','.locks'}

entries=[]
if os.path.exists(cache_file):
    try:
        j=json.load(open(cache_file))
        entries=j.get('entries',[]) if isinstance(j,dict) else []
    except Exception:
        entries=[]
embedded=set()
for e in entries:
    h=str(e.get('hash','')).strip().lower()
    if h:
        embedded.add(h)

report={
  'generatedAt': datetime.now().isoformat(),
  'totalBlocks':0,
  'embeddedBlocks':0,
  'coveragePct':0.0,
  'chains':[]
}

if os.path.isdir(chains_dir):
    for chain in sorted(os.listdir(chains_dir)):
        if chain in reserved or chain.startswith('.'):
            continue
        cdir=os.path.join(chains_dir,chain)
        if not os.path.isdir(cdir):
            continue
        files=sorted(glob.glob(os.path.join(cdir,'*.json')))
        total=len(files)
        covered=0
        for fp in files:
            try:
                b=json.load(open(fp))
                h=str(b.get('hash','')).lower()
                h16=h[:16] if h else ''
                if h16 and h16 in embedded:
                    covered+=1
            except Exception:
                pass
        pct=round((covered/total*100.0),2) if total else 100.0
        report['chains'].append({
            'chain':chain,
            'total':total,
            'embedded':covered,
            'missing':max(0,total-covered),
            'coveragePct':pct
        })
        report['totalBlocks']+=total
        report['embeddedBlocks']+=covered

report['coveragePct']=round((report['embeddedBlocks']/report['totalBlocks']*100.0),2) if report['totalBlocks'] else 100.0

with open(out_json,'w') as f:
    json.dump(report,f,indent=2)

lines=[]
lines.append(f"Embedding Coverage Report @ {report['generatedAt']}")
lines.append(f"TOTAL: {report['embeddedBlocks']}/{report['totalBlocks']} ({report['coveragePct']}%)")
lines.append('')
for c in report['chains']:
    lines.append(f"- {c['chain']}: {c['embedded']}/{c['total']} ({c['coveragePct']}%) missing={c['missing']}")

with open(out_txt,'w') as f:
    f.write('\n'.join(lines)+'\n')

print(out_json)
print(out_txt)
print(report['coveragePct'])
PY
