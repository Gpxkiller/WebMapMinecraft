"""Linux arithmetic-only map worker. Never opens a Minecraft world directory."""
from pathlib import Path
import ctypes,json,os,fcntl,zlib,struct,time,math,argparse,uuid,sys
ROOT=Path(".")
SPAWN_RADIUS=16
PLAYER_RADIUS=2
def safe(p):
 if any(x.is_symlink()for x in(p,*p.parents)):raise ValueError('Linked path refused')
 return p
def png(rgb):
 def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
 rows=b''.join(b'\0'+rgb[y*192:(y+1)*192]for y in range(64))
 return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',64,64,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(rows))+chunk(b'IEND',b'')

def relief_colors(rgb,heights,water_mask=None):
 # Vanilla map-material colours, not cyan swamp/yellow beach biome polygons.
 out=bytearray(len(rgb))
 for i,y in enumerate(heights):
  biome=tuple(rgb[i*3:i*3+3])
  if y<62 or (water_mask is not None and water_mask[i]):color=(64,64,255);shade=max(.75,1-max(0,50-y)*.004)
  else:
   sand=biome in ((250,222,85),(250,148,24),(255,188,64))
   snow=biome in ((255,255,255),(160,160,160),(255,255,178))and y>90
   color=(247,233,163)if sand and y<=80 else (255,255,255)if snow else (127,178,56)
   shade=min(1.12,.97+max(0,y-64)*.001)
  out[i*3:i*3+3]=bytes(max(0,min(255,round(c*shade)))for c in color)
 return bytes(out)

def scheduled_tasks(state):
 worlds={w['id']:w for w in state['worlds']if w.get('key')in('NORMAL','NETHER','THE_END')}
 spawns={};players={};jobs={}
 def coordinate(x,z):
  if type(x)not in(int,float)or type(z)not in(int,float)or not math.isfinite(x)or not math.isfinite(z)or max(abs(x),abs(z))>29999999:raise ValueError('Invalid anchor')
  return math.floor(x/256),math.floor(z/256)
 def add(world,x,z,task=None):
  if world not in worlds or type(x)is not int or type(z)is not int or max(abs(x),abs(z))>117187:raise ValueError('Invalid preview task')
  key=(world,x,z)
  if safe(ROOT/'terrain256surface5'/world/f'{x}_{z}.png').is_file():
   if task is not None:task.unlink(missing_ok=True)
   return
  if key not in jobs or task is not None:jobs[key]=(task,dict(world=world,x=x,z=z))
 # Parse every bounded queued job before ranking: directory order is not priority.
 for task in list(safe(ROOT/'requests').glob('*.json'))[:1024]:
  try:
   safe(task)
   if task.stat().st_size>1024:raise ValueError('Task too large')
   row=json.loads(task.read_text());add(row['world'],row['x'],row['z'],task)
  except (ValueError,KeyError,TypeError):task.unlink(missing_ok=True)
 for world,w in worlds.items():
  try:spawns[world]=coordinate(w['spawnX'],w['spawnZ'])
  except (ValueError,KeyError,TypeError):continue
  radius=SPAWN_RADIUS if w['key']=='NORMAL'else 4
  for dx in range(-radius,radius+1):
   for dz in range(-radius,radius+1):
    x,z=spawns[world]
    if max(abs(x+dx),abs(z+dz))<=117187:add(world,x+dx,z+dz)
 for p in state.get('players',[]):
  try:
   world=p['world']
   if world not in worlds or p.get('dataUnavailable'):continue
   x,z=coordinate(p['x'],p['z']);players.setdefault(world,[]).append((x,z))
   for dx in range(-PLAYER_RADIUS,PLAYER_RADIUS+1):
    for dz in range(-PLAYER_RADIUS,PLAYER_RADIUS+1):
     if max(abs(x+dx),abs(z+dz))<=117187:add(world,x+dx,z+dz)
  except (ValueError,KeyError,TypeError):continue
 def priority(item):
  _,r=item;world,x,z=r['world'],r['x'],r['z'];spawn=spawns.get(world)
  ds=max(abs(x-spawn[0]),abs(z-spawn[1]))if spawn else 999999
  dp=min((max(abs(x-a),abs(z-b))for a,b in players.get(world,[])),default=999999)
  if worlds[world]['key']=='NORMAL'and ds<=2:return(0,ds,x,z,world)
  if dp<=1:return(1,ds,dp,x,z,world)
  if ds<=1:return(2,ds,x,z,world)
  return(3,ds,dp,x,z,world)
 # Virtual anchor jobs work even if the browser's 1024-slot queue is full.
 return sorted(jobs.values(),key=priority)[:256]

def run(export,library):
 global ROOT
 export=safe(Path(export).absolute());ROOT=safe(export/'preview')
 ROOT.mkdir(parents=True,exist_ok=True)
 with (ROOT/'worker.lock').open('a') as lock:
  try:fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
  except BlockingIOError:return 0
  state=json.loads(safe(export/'state.json').read_text())
  config=json.loads(safe(export/'private/generation.json').read_text())
  configs={}
  for row in config:
   identifier=str(uuid.UUID(row['id']))
   if identifier!=row['id'] or row['version']!='26.3':continue
   # Reject unrecognised/custom generators. Seeds remain local and private.
   if row.get('supported') is not True:continue
   seed=int(row['seed'])
   if not -(1<<63)<=seed<(1<<63):raise ValueError('Seed out of range')
   configs[identifier]=(seed,int(row['large']),row['key'])
  state['worlds']=[w for w in state['worlds'] if w['id'] in configs]
  lib=ctypes.CDLL(str(Path(library).absolute()))
  fn=lib.gpx_biome_tile
  fn.argtypes=[ctypes.c_char_p,ctypes.c_uint64,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.POINTER(ctypes.c_ubyte)];fn.restype=ctypes.c_int
  relief=lib.gpx_relief_heights
  relief.argtypes=[ctypes.c_uint64,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.POINTER(ctypes.c_short)];relief.restype=ctypes.c_int
  surface=lib.gpx_surface_water_mask
  surface.argtypes=[ctypes.c_uint64,ctypes.c_int,ctypes.c_int,ctypes.c_int,ctypes.POINTER(ctypes.c_short),ctypes.POINTER(ctypes.c_ubyte)];surface.restype=ctypes.c_int
  started=time.monotonic();count=0
  for task,row in scheduled_tasks(state):
   if time.monotonic()-started>30:break
   world,x,z=row['world'],row['x'],row['z']
   seed,large,key=configs[world];dim={'NORMAL':0,'NETHER':-1,'THE_END':1}[key];seed&=(1<<64)-1
   rgb=(ctypes.c_ubyte*12288)()
   if fn(b'26.3',seed,dim,x,z,large,rgb):raise ValueError('Biome calculation failed')
   result=bytes(rgb)
   if dim==0:
    heights=(ctypes.c_short*4096)();mask=(ctypes.c_ubyte*4096)()
    if relief(seed,x,z,large,heights) or surface(seed,x,z,large,heights,mask):raise ValueError('Relief calculation failed')
    result=relief_colors(result,heights,mask)
   target=safe(ROOT/'terrain256surface5'/world/f'{x}_{z}.png');target.parent.mkdir(parents=True,exist_ok=True)
   temp=target.with_suffix('.tmp');temp.write_bytes(png(result));temp.replace(target)
   if task is not None:task.unlink(missing_ok=True)
   count+=1
  health=ROOT/'health.json';temp=health.with_suffix('.tmp');temp.write_text(json.dumps(dict(calculated=count,at=time.time(),minecraftStarted=False)));temp.replace(health)
  return count
def watch(export,library,stop=lambda:False):
 # Export files may not exist yet at startup, or be unavailable during restart.
 # Retry without printing their content (which includes the private seed).
 last_warning=-60.0
 while not stop():
  try:run(export,library)
  except (OSError,ValueError,TypeError,KeyError):
   now=time.monotonic()
   if now-last_warning>=60:
    print('Map export not ready; retrying. No world files are accessed.',file=sys.stderr,flush=True)
    last_warning=now
  if not stop():time.sleep(3)

if __name__=='__main__':
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--export',required=True);parser.add_argument('--library',default=str(Path(__file__).with_name('libgpxbiomes.so')));parser.add_argument('--watch',action='store_true');args=parser.parse_args()
 if args.watch:watch(args.export,args.library)
 else:run(args.export,args.library)

