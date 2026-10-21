"""Worker startup/restart regression; Linux, no native library needed."""
import contextlib,importlib.util,io,json,sys,types
from pathlib import Path
# On Windows this test mocks run() entirely: it tests watch(), NOT Linux flock.
if sys.platform=='win32':sys.modules['fcntl']=types.ModuleType('fcntl')
spec=importlib.util.spec_from_file_location('worker',Path(__file__).parents[1]/'seed/worker.py');worker=importlib.util.module_from_spec(spec);spec.loader.exec_module(worker)
calls=[]
def run(*args):
 calls.append(args)
 if len(calls)==1:raise FileNotFoundError('private-seed-must-not-appear')
 if len(calls)==2:raise json.JSONDecodeError('private-seed-must-not-appear','',0)
 return 1
worker.run=run;worker.time.sleep=lambda _:None
capture=io.StringIO()
with contextlib.redirect_stderr(capture):worker.watch('fixture','fixture',lambda:len(calls)>=3)
assert len(calls)==3
assert 'private-seed' not in capture.getvalue()
assert capture.getvalue().count('retrying')==1
print('Worker reconnection PASS: missing startup export, invalid transient JSON, recovery, bounded private-safe warning.')
