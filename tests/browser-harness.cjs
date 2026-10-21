const fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../src/main/resources/web/app.js','utf8');
function harness({worldQuery='',width=1200,height=700,automaticTimers=false}={}){
 let now=120000,sequence=0;const timers=new Map(),jobs=[],paints=[],requests=[];
 class Node{
  constructor(){this.children=[];this.dataset={};this.attributes={};this.hidden=false;this.textContent='';this.value='';this.disabled=false;this.classList={add(){},remove(){},toggle(){}};}
  replaceChildren(...children){this.children=children;children.forEach(n=>n.parentNode=this);this.replacements=(this.replacements||0)+1;}
  append(...children){for(const n of children){if(n.parentNode)n.parentNode.children=n.parentNode.children.filter(c=>c!==n);this.children.push(n);n.parentNode=this;}}
  remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(n=>n!==this);}
  setAttribute(k,v){this.attributes[k]=v;} removeAttribute(k){delete this.attributes[k];}
  addEventListener(k,fn){this['on'+k]=fn;}getBoundingClientRect(){return{width,height,left:0,top:0};}
  setPointerCapture(){}releasePointerCapture(){}focus(){}
 }
 const nodes=new Map();const node=id=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id);};
 const ctx=new Proxy({drawImage:im=>paints.push(im),clearRect:()=>paints.push('clear'),fillRect:()=>paints.push('background'),measureText:t=>({width:t.length*8})},{get:(o,k)=>o[k]||(()=>{})});node('#terrain').getContext=()=>ctx;
 const windowEvents=new Map(),documentEvents=new Map();
 const listen=(map,k,fn)=>{if(!map.has(k))map.set(k,[]);map.get(k).push(fn);};
 const document={querySelector:node,createElement:()=>new Node(),addEventListener:(k,fn)=>listen(documentEvents,k,fn),fullscreenElement:null,visibilityState:'visible'};
 const location={href:'http://127.0.0.1/?'+new URLSearchParams(worldQuery?{world:worldQuery}:{}),reload(){location.reloadCalled=true;}};
 const clock=(fn,ms,period=0)=>{const id=++sequence;timers.set(id,{at:now+ms,fn,period});return id;};
 const sandbox={document,window:{addEventListener:(k,fn)=>listen(windowEvents,k,fn)},navigator:{onLine:true},performance:{now:()=>now},location,history:{replaceState(a,b,url){location.href=new URL(url,location.href).href;}},URL,URLSearchParams,AbortController,Date:class extends Date{static now(){return now;}},console,Option:class extends Node{constructor(text,value){super();this.textContent=text;this.value=value;}},setTimeout:clock,clearTimeout:id=>timers.delete(id),setInterval:(fn,ms)=>automaticTimers?clock(fn,ms,ms):++sequence,clearInterval:id=>timers.delete(id),requestAnimationFrame:fn=>clock(fn,1),cancelAnimationFrame:id=>timers.delete(id),Image:class{set src(v){this.url=v;if(v)jobs.push(this);}},fetch:(url,options={})=>new Promise((resolve,reject)=>{requests.push({url,options,resolve,reject});options.signal?.addEventListener('abort',()=>reject(new Error('aborted')),{once:true});})};
 vm.createContext(sandbox);vm.runInContext(source,sandbox);
 const flush=async()=>{for(let n=0;n<10;n++)await Promise.resolve();};
 async function advance(ms){now+=ms;for(let round=0;round<100;round++){const ready=[...timers].filter(([,t])=>t.at<=now);if(!ready.length)break;for(const[id,t]of ready){if(!timers.has(id))continue;timers.delete(id);if(t.period)timers.set(id,{...t,at:now+t.period});t.fn();}await flush();}}
 async function answer(payload,status=200){const req=requests.shift();if(!req)throw Error('No state request');req.resolve({ok:status===200,status,json:async()=>payload});await flush();await advance(1);}
 return{sandbox,node,nodes,jobs,paints,requests,timers,flush,advance,answer,run:s=>vm.runInContext(s,sandbox),refresh:()=>vm.runInContext('refresh()',sandbox),emitWindow(name,event={}){for(const fn of windowEvents.get(name)||[])fn(event);},emitDocument(name,event={}){for(const fn of documentEvents.get(name)||[])fn(event);},finish(im,ok=true){im.complete=true;im.naturalWidth=ok?16:0;(ok?im.onload:im.onerror)?.();}};
}
const world=(id,key='NORMAL',previewEnabled=true)=>({id,name:id,key,spawnX:128,spawnZ:-128,previewEnabled,tiles:['0_0','1_0']});
const state=(worlds=[world('one')],players=[],generatedAt=120000)=>({worlds,players,generatedAt});
module.exports={harness,world,state};
