'use strict';
const canvas=document.querySelector('#terrain'),ctx=canvas.getContext('2d');
const select=document.querySelector('#world'),status=document.querySelector('#status');
const app=document.querySelector('#app'),access=document.querySelector('#access');
const images=new Map(),limit=8192;
let data={worlds:[],players:[]},world=new URL(location.href).searchParams.get('world')||'';
let zoom=1,pan={x:0,z:0},pending=0,drag=null,refreshing=false,locked=false;
let imageEpoch=0,frame=0,viewReady=false,optionSignature='';
const current=()=>data.worlds.find(w=>w.id===world);

function requestDraw(){
 if(!frame&&!locked)frame=requestAnimationFrame(()=>{frame=0;draw();});
}
function cancelImages(){
 imageEpoch++;
 for(const entry of images.values())entry.cancel?.();
 images.clear();pending=0;
 if(frame)cancelAnimationFrame(frame);
 frame=0;
}
function tile(kind,id,x,z,revision){
 const key=kind+'/'+id+'/'+x+'_'+z,old=images.get(key);
 if(locked||old?.busy||old?.retry>Date.now()||(old?.image&&old.revision===revision))return old?.image;
 if(pending>=12||(kind==='preview'&&pending>=8))return old?.image;
 if(!old&&images.size>=limit){
  for(const[k,v]of images){
   if(v.busy)continue;
   const[a,w,p]=k.split('/'),[tx,tz]=p.split('_').map(Number),s=a==='preview'?256:16;
   const l=canvas.width/2+(tx*s-pan.x)*zoom,t=canvas.height/2+(tz*s-pan.z)*zoom;
   if(w!==world||l+s*zoom<0||t+s*zoom<0||l>canvas.width||t>canvas.height){images.delete(k);break;}
  }
  if(images.size>=limit)return;
 }
 const entry=old||{},epoch=imageEpoch,im=new Image();
 entry.busy=true;images.set(key,entry);pending++;
 let finished=false;
 const settle=ok=>{
  if(finished)return;
  finished=true;clearTimeout(timeout);im.onload=im.onerror=null;
  entry.cancel=null;entry.busy=false;
  if(epoch!==imageEpoch)return;
  pending--;
  if(ok){entry.image=im;entry.revision=revision;entry.retry=0;}
  else entry.retry=Date.now()+10000;
  requestDraw();
 };
 const timeout=setTimeout(()=>{settle(false);im.src='';},15000);
 entry.cancel=()=>{finished=true;clearTimeout(timeout);im.onload=im.onerror=null;im.src='';entry.busy=false;};
 im.onload=()=>settle(true);im.onerror=()=>settle(false);
 im.src='/api/'+kind+'/'+id+'/'+x+'_'+z+'.png?v='+revision;
 return entry.image;
}
function previewInRange(w,x,z){
 if(w.previewEnabled!==true)return false;
 const radius=w.key==='NORMAL'?16:4;
 if(Math.max(Math.abs(x-Math.floor(w.spawnX/256)),Math.abs(z-Math.floor(w.spawnZ/256)))<=radius)return true;
 return data.players.some(p=>p.world===w.id&&Math.max(Math.abs(x-Math.floor(p.x/256)),Math.abs(z-Math.floor(p.z/256)))<=2);
}
function draw(){
 const b=canvas.getBoundingClientRect();
 if(canvas.width!==Math.round(b.width)||canvas.height!==Math.round(b.height)){canvas.width=Math.round(b.width);canvas.height=Math.round(b.height);}
 ctx.fillStyle='#101d25';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
 const w=current();if(locked||!w)return;
 const bounds=span=>[Math.floor((pan.x-canvas.width/2/zoom)/span),Math.ceil((pan.x+canvas.width/2/zoom)/span),Math.floor((pan.z-canvas.height/2/zoom)/span),Math.ceil((pan.z+canvas.height/2/zoom)/span)];
 const[l,r,t,bottom]=bounds(16);
 const real=w.tiles.map(key=>key.split('_').map(Number)).filter(([x,z])=>x>=l&&x<=r&&z>=t&&z<=bottom);
 // Reserve download slots for real terrain BEFORE previews. Paint real LAST.
 for(const[x,z]of real)tile('tile',w.id,x,z,data.generatedAt);
 const paint=(kind,x,z,span,revision)=>{
  const im=tile(kind,w.id,x,z,revision);
  if(im){ctx.globalAlpha=kind==='preview'?.75:1;ctx.drawImage(im,canvas.width/2+(x*span-pan.x)*zoom,canvas.height/2+(z*span-pan.z)*zoom,span*zoom,span*zoom);ctx.globalAlpha=1;}
 };
 const[a,bx,c,d]=bounds(256),preview=[];
 for(let z=c;z<=d;z++)for(let x=a;x<=bx;x++)if(previewInRange(w,x,z))preview.push([x,z]);
 preview.sort((a,b)=>Math.abs(a[0]-pan.x/256)+Math.abs(a[1]-pan.z/256)-Math.abs(b[0]-pan.x/256)-Math.abs(b[1]-pan.z/256));
 for(const[x,z]of preview.slice(0,2048))paint('preview',x,z,256,1);
 for(const[x,z]of real)paint('tile',x,z,16,data.generatedAt);
 for(const p of data.players)if(p.world===world){
  const x=canvas.width/2+(p.x-pan.x)*zoom,z=canvas.height/2+(p.z-pan.z)*zoom;
  ctx.fillStyle=p.status==='online'?'#50df7e':p.status==='offline'?'#f05252':'#ffb545';ctx.beginPath();ctx.arc(x,z,5,0,7);ctx.fill();
  ctx.font='bold 13px system-ui';const width=ctx.measureText(p.name).width;
  ctx.fillStyle='#08120eee';ctx.fillRect(x+8,z-14,width+8,20);ctx.fillStyle='#ffdf55';ctx.fillText(p.name,x+12,z+1);
 }
}
function center(){const w=current();if(w){pan={x:w.spawnX,z:w.spawnZ};viewReady=true;}requestDraw();}
function saveWorld(){const url=new URL(location.href);if(world)url.searchParams.set('world',world);else url.searchParams.delete('world');history.replaceState(null,'',url.pathname+url.search+url.hash);}
function validate(next){
 const coordinate=v=>Number.isFinite(v)&&Math.abs(v)<=30000000;
 if(!next||!Number.isSafeInteger(next.generatedAt)||next.generatedAt<0||!Array.isArray(next.worlds)||next.worlds.length>256||!Array.isArray(next.players)||next.players.length>10000)throw Error('Relevé invalide');
 const ids=new Set();
 for(const w of next.worlds){
  if(typeof w.id!=='string'||!w.id||w.id.length>64||!/^[a-zA-Z0-9-]+$/.test(w.id)||ids.has(w.id)||typeof w.name!=='string'||w.name.length>256||!coordinate(w.spawnX)||!coordinate(w.spawnZ)||!Array.isArray(w.tiles)||w.tiles.length>1000000||w.tiles.some(t=>typeof t!=='string'||!/^[-]?\d{1,7}_[-]?\d{1,7}$/.test(t)))throw Error('Relevé invalide');
  ids.add(w.id);
 }
 const players=new Set();
 for(const p of next.players){
  if(typeof p.id!=='string'||!p.id||p.id.length>64||players.has(p.id)||typeof p.name!=='string'||p.name.length>256||!ids.has(p.world)||!coordinate(p.x)||!coordinate(p.z))throw Error('Relevé invalide');
  players.add(p.id);
 }
 return next;
}
function playerButtons(){
 const list=document.querySelector('#players'),existing=new Map([...list.children].map(b=>[b.dataset.player,b]));
 const wanted=new Set(data.players.map(p=>p.id));
 for(const[id,b]of existing)if(!wanted.has(id))b.remove();
 for(const p of data.players){
  let b=existing.get(p.id);
  if(!b){b=document.createElement('button');b.dataset.player=p.id;b.onclick=()=>{const latest=data.players.find(row=>row.id===b.dataset.player);if(locked||!latest)return;world=latest.world;select.value=world;pan={x:latest.x,z:latest.z};viewReady=true;saveWorld();requestDraw();};list.append(b);}
  const text=p.name+' · '+(p.status==='online'?'En ligne':p.status==='offline'?'Hors ligne':'État inconnu');if(b.textContent!==text)b.textContent=text;
 }
}
function loseAccess(){
 locked=true;cancelImages();drag=null;data={worlds:[],players:[]};viewReady=false;optionSignature='';
 select.replaceChildren();document.querySelector('#players').replaceChildren();draw();
 app.hidden=true;access.hidden=false;
 if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});
}
async function refresh(){
 if(refreshing)return;
 refreshing=true;
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
 try{
  const r=await fetch('/api/state',{cache:'no-store',signal:controller.signal});
  if(r.status===401||r.status===403){loseAccess();return;}
  if(!r.ok)throw Error('Relevé indisponible');
  const next=validate(await r.json());
  data=next;locked=false;app.hidden=false;access.hidden=true;
  const ids=new Set(data.worlds.map(w=>w.id));
  for(const[key,entry]of images)if(!ids.has(key.split('/')[1])){const busy=entry.busy;entry.cancel?.();if(busy)pending--;images.delete(key);}
  const signature=JSON.stringify(data.worlds.map(w=>[w.id,w.name]));
  if(signature!==optionSignature){select.replaceChildren(...data.worlds.map(w=>new Option(w.name,w.id)));optionSignature=signature;}
  if(!current()){world=data.worlds[0]?.id||'';viewReady=false;saveWorld();}
  select.value=world;if(!viewReady)center();
  status.textContent=data.worlds.length?'Dernier relevé : '+new Date(data.generatedAt).toLocaleString():'Aucun monde disponible.';
  playerButtons();requestDraw();
 }catch(e){if(!locked)status.textContent='Connexion interrompue ou relevé indisponible · Nouvelle tentative automatique. Le dernier terrain reste affiché.';}
 finally{clearTimeout(timeout);refreshing=false;}
}
function scale(f,x=canvas.width/2,y=canvas.height/2){if(locked)return;const next=Math.max(.125,Math.min(16,zoom*f));pan.x+=(x-canvas.width/2)*(1/zoom-1/next);pan.z+=(y-canvas.height/2)*(1/zoom-1/next);zoom=next;requestDraw();}
select.onchange=()=>{if(locked)return;world=select.value;center();saveWorld();};
document.querySelector('#minus').onclick=()=>scale(.5);document.querySelector('#plus').onclick=()=>scale(2);document.querySelector('#center').onclick=center;
document.querySelector('#reconnect').onclick=()=>location.reload();
document.querySelector('#full').onclick=async()=>{if(locked)return;try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#map').requestFullscreen();}catch{status.textContent='Plein écran indisponible dans ce navigateur.';}};
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();scale(e.deltaY<0?1.25:.8,e.clientX-r.left,e.clientY-r.top);},{passive:false});
canvas.onpointerdown=e=>{if(locked)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};};
canvas.onpointermove=e=>{if(drag&&!locked){pan.x-=(e.clientX-drag.x)/zoom;pan.z-=(e.clientY-drag.y)/zoom;drag={x:e.clientX,y:e.clientY};requestDraw();}};
canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>drag=null;
window.addEventListener('resize',requestDraw);
document.addEventListener('fullscreenchange',()=>{const active=!!document.fullscreenElement;document.querySelector('#full').textContent=active?'⛶ Quitter le plein écran':'⛶ Plein écran';document.querySelector('#full').setAttribute('aria-pressed',String(active));requestDraw();});
setInterval(refresh,10000);setInterval(requestDraw,11000);refresh();
