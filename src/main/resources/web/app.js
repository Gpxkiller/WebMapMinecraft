'use strict';
const canvas=document.querySelector('#terrain'),ctx=canvas.getContext('2d'),select=document.querySelector('#world'),status=document.querySelector('#status');
let data={worlds:[],players:[]},world='',zoom=1,pan={x:0,z:0},pending=0,drag=null,refreshing=false;
const images=new Map(),limit=8192;
const current=()=>data.worlds.find(w=>w.id===world);
function tile(kind,id,x,z,revision){
 const key=`${kind}/${id}/${x}_${z}`,old=images.get(key),span=kind==='preview'?256:16;
 if(old?.busy||old?.retry>Date.now()||(old?.image&&old.revision===revision))return old?.image;
 if(pending>=12)return old?.image;
 if(!old&&images.size>=limit){for(const[k,v]of images){if(v.busy)continue;const[a,w,p]=k.split('/'),[tx,tz]=p.split('_').map(Number),s=a==='preview'?256:16,l=canvas.width/2+(tx*s-pan.x)*zoom,t=canvas.height/2+(tz*s-pan.z)*zoom;if(w!==world||l+s*zoom<0||t+s*zoom<0||l>canvas.width||t>canvas.height){images.delete(k);break;}}if(images.size>=limit)return;}
 const entry=old||{};entry.busy=true;images.set(key,entry);pending++;const im=new Image();
 im.onload=()=>{entry.image=im;entry.revision=revision;entry.busy=false;pending--;draw();};
 im.onerror=()=>{entry.busy=false;entry.retry=Date.now()+10000;pending--;};
 im.src=`/api/${kind}/${id}/${x}_${z}.png?v=${revision}`;return entry.image;
}
function draw(){
 const w=current();if(!w)return;const b=canvas.getBoundingClientRect();if(canvas.width!==Math.round(b.width)||canvas.height!==Math.round(b.height)){canvas.width=Math.round(b.width);canvas.height=Math.round(b.height);}ctx.fillStyle='#101d25';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
 const bounds=span=>[Math.floor((pan.x-canvas.width/2/zoom)/span),Math.ceil((pan.x+canvas.width/2/zoom)/span),Math.floor((pan.z-canvas.height/2/zoom)/span),Math.ceil((pan.z+canvas.height/2/zoom)/span)];
 const paint=(kind,x,z,span,revision)=>{const im=tile(kind,w.id,x,z,revision);if(im){ctx.globalAlpha=kind==='preview'?.75:1;ctx.drawImage(im,canvas.width/2+(x*span-pan.x)*zoom,canvas.height/2+(z*span-pan.z)*zoom,span*zoom,span*zoom);ctx.globalAlpha=1;}};
 let[a,bx,c,d]=bounds(256);let count=0;for(let z=c;z<=d&&count<512;z++)for(let x=a;x<=bx&&count<512;x++,count++)paint('preview',x,z,256,1);
 const[l,r,t,bottom]=bounds(16);for(const key of w.tiles||[]){const[x,z]=key.split('_').map(Number);if(x>=l&&x<=r&&z>=t&&z<=bottom)paint('tile',x,z,16,Math.floor(data.generatedAt/60000));}
 for(const p of data.players||[])if(p.world===world){const x=canvas.width/2+(p.x-pan.x)*zoom,z=canvas.height/2+(p.z-pan.z)*zoom;ctx.fillStyle=p.status==='online'?'#50df7e':p.status==='offline'?'#f05252':'#ffb545';ctx.beginPath();ctx.arc(x,z,5,0,7);ctx.fill();ctx.font='bold 13px system-ui';const text=String(p.name),width=ctx.measureText(text).width;ctx.fillStyle='#08120eee';ctx.fillRect(x+8,z-14,width+8,20);ctx.fillStyle='#ffdf55';ctx.fillText(text,x+12,z+1);}
}
function center(){const w=current();if(w){pan={x:w.spawnX,z:w.spawnZ};draw();}}
async function refresh(){if(refreshing)return;refreshing=true;try{const r=await fetch('/api/state',{cache:'no-store'});if(!r.ok)throw Error(r.status===401?'Connexion requise':'Relevé indisponible');const next=await r.json();if(!Array.isArray(next.worlds))throw Error('Relevé invalide');data=next;select.replaceChildren(...data.worlds.map(w=>new Option(w.name,w.id)));if(!current()){world=data.worlds[0]?.id||'';select.value=world;center();}else select.value=world;status.textContent='Dernier relevé : '+new Date(data.generatedAt).toLocaleString();document.querySelector('#players').replaceChildren(...(data.players||[]).map(p=>{const b=document.createElement('button');b.textContent=p.name+' · '+(p.status==='online'?'En ligne':'Hors ligne');b.onclick=()=>{world=p.world;select.value=world;pan={x:p.x,z:p.z};draw();};return b;}));draw();}catch(e){status.textContent=e.message+' · La carte précédente reste affichée.';}finally{refreshing=false;}}
function scale(f,x=canvas.width/2,y=canvas.height/2){const next=Math.max(.125,Math.min(16,zoom*f));pan.x+=(x-canvas.width/2)*(1/zoom-1/next);pan.z+=(y-canvas.height/2)*(1/zoom-1/next);zoom=next;draw();}
select.onchange=()=>{world=select.value;center();};document.querySelector('#minus').onclick=()=>scale(.5);document.querySelector('#plus').onclick=()=>scale(2);document.querySelector('#center').onclick=center;
document.querySelector('#full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.querySelector('#map').requestFullscreen();}catch{status.textContent='Plein écran indisponible dans ce navigateur.';}};
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();scale(e.deltaY<0?1.25:.8,e.clientX-r.left,e.clientY-r.top);},{passive:false});
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY};};canvas.onpointermove=e=>{if(drag){pan.x-=(e.clientX-drag.x)/zoom;pan.z-=(e.clientY-drag.y)/zoom;drag={x:e.clientX,y:e.clientY};draw();}};canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
window.addEventListener('resize',draw);document.addEventListener('fullscreenchange',draw);setInterval(refresh,10000);setInterval(draw,11000);refresh();
