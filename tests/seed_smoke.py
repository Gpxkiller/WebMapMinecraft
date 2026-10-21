"""Synthetic seed only. Linux: python3 tests/seed_smoke.py /path/libgpxbiomes.so"""
import sys,tempfile,json,uuid,importlib.util,hashlib
from pathlib import Path
spec=importlib.util.spec_from_file_location('worker',Path(__file__).parents[1]/'seed/worker.py');worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
with tempfile.TemporaryDirectory(prefix='webmap-test-') as temp:
 root=Path(temp);(root/'private').mkdir();world=str(uuid.UUID(int=1))
 row=dict(id=world,name='Fixture',key='NORMAL',spawnX=-1,spawnZ=-1,seed='1234',large=False,version='26.3',supported=True)
 (root/'private/generation.json').write_text(json.dumps([row]));(root/'state.json').write_text(json.dumps(dict(worlds=[row],players=[])))
 # One tile per run keeps this smoke test bounded; production defaults unchanged.
 worker.SPAWN_RADIUS=0
 schedule=worker.scheduled_tasks
 worker.scheduled_tasks=lambda state:schedule(state)[:1]
 assert worker.run(root,sys.argv[1])==1
 tile=root/'preview/terrain256surface5'/world/'-1_-1.png';assert tile.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
 before=hashlib.sha256(tile.read_bytes()).hexdigest();assert worker.run(root,sys.argv[1])==0;assert hashlib.sha256(tile.read_bytes()).hexdigest()==before
 assert not any(p.name in ('region','level.dat')for p in root.rglob('*'))
 for key in ('NETHER','THE_END'):
  row['key']=key;(root/'private/generation.json').write_text(json.dumps([row]));(root/'state.json').write_text(json.dumps(dict(worlds=[row],players=[])))
  # New world identity prevents cross-dimension reuse.
  row['id']=str(uuid.uuid4());(root/'private/generation.json').write_text(json.dumps([row]));(root/'state.json').write_text(json.dumps(dict(worlds=[row],players=[])))
  assert worker.run(root,sys.argv[1])>=1
 print('Seed smoke PASS: synthetic seed, three dimensions, immutable cache, no Minecraft chunks.')
