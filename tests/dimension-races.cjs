const assert=require('node:assert/strict'),{harness,world,state}=require('./browser-harness.cjs');
let failed=0;
const worlds=()=>[world('one'),world('two','NETHER'),world('three','THE_END')].map(w=>({...w,spawnX:0,spawnZ:0}));
async function test(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);}}
async function decode(h){for(let n=0;n<20;n++){const active=h.jobs.filter(im=>im.onload);if(!active.length)break;for(const im of active)h.finish(im);await h.advance(1);}}
(async()=>{
 await test('500 changes before animation paint only the final selected dimension',async()=>{
  const h=harness({width:128,height:128});await h.answer(state(worlds()));
  for(let i=0;i<500;i++){h.node('#world').value=['one','two','three'][i%3];h.node('#world').onchange();}
  h.paints.length=0;await h.advance(1);await decode(h);
  assert.equal(h.run('world'),'two');assert(h.paints.some(im=>im?.url));
  assert(h.paints.filter(im=>im?.url).every(im=>im.url.includes('/two/')));
 });
 await test('six offline tabs retain independent dimensions through 500 changes each',async()=>{
  const tabs=Array.from({length:6},()=>harness({width:128,height:128}));
  for(const h of tabs){await h.answer(state(worlds()));await decode(h);h.sandbox.navigator.onLine=false;h.emitWindow('offline');}
  for(let n=0;n<tabs.length;n++){
   const h=tabs[n],before=h.jobs.length;
   for(let i=0;i<500;i++){h.node('#world').value=['one','two','three'][(i+n)%3];h.node('#world').onchange();await h.advance(1);}
   assert.equal(h.jobs.length,before);assert.equal(h.requests.length,0);assert.equal(h.run('pending'),0);
   h.sandbox.navigator.onLine=true;h.emitWindow('online');await h.flush();await h.answer(state(worlds(),[],140000));
   assert.equal(h.run('world'),['one','two','three'][(499+n)%3]);assert(h.run('fresh()'));
  }
 });
 await test('in-flight refresh cannot undo a newer dimension selection',async()=>{
  const h=harness();await h.answer(state(worlds()));h.refresh();h.node('#world').value='three';h.node('#world').onchange();
  await h.answer(state(worlds().reverse(),[],150000));assert.equal(h.run('world'),'three');assert.equal(h.node('#world').value,'three');
 });
 await test('old image callbacks cannot corrupt counters after 300 rapid changes',async()=>{
  const h=harness({width:128,height:128});await h.answer(state(worlds()));const callbacks=[];
  for(let i=0;i<300;i++){callbacks.push(...h.jobs.filter(im=>im.onload).map(im=>im.onload));h.jobs.length=0;h.node('#world').value=['one','two','three'][i%3];h.node('#world').onchange();await h.advance(1);}
  for(const callback of callbacks)callback();assert(h.run('pending')>=0&&h.run('pending')<=12);
  assert(h.run("[...images].every(([key,entry])=>!entry.busy||key.split('/')[1]===world)"));
 });
 await test('access denial while switching dimensions clears every retained image',async()=>{
  const h=harness();await h.answer(state(worlds()));await decode(h);h.refresh();h.node('#world').value='three';h.node('#world').onchange();await h.answer({},403);
  assert(h.node('#app').hidden);assert.equal(h.run('images.size'),0);assert.equal(h.run('pending'),0);assert.equal(h.node('#world').children.length,0);
 });
 await test('late JSON after offline and rejoin cannot restore an old world list',async()=>{
  const h=harness();const old=h.requests.shift();let finish;old.resolve({ok:true,status:200,json:()=>new Promise(resolve=>finish=resolve)});await h.flush();
  h.sandbox.navigator.onLine=false;h.emitWindow('offline');h.sandbox.navigator.onLine=true;h.emitWindow('online');await h.flush();await h.answer(state([world('three')],[],160000));
  finish(state([world('one')],[],120000));await h.flush();assert.equal(h.run('world'),'three');assert.equal(h.run('data.worlds.length'),1);
 });
 await test('click captured before a player disappears cannot navigate to stale coordinates',async()=>{
  const h=harness();await h.answer(state(worlds(),[{id:'p',name:'Fixture',world:'two',x:10,z:20,status:'online'}]));const oldButton=h.node('#players').children[0];
  h.refresh();await h.answer(state(worlds(),[],170000));oldButton.onclick();assert.equal(h.run('world'),'one');assert.equal(h.node('#players').children.length,0);
 });
 await test('cache-page restoration preserves requested dimension after reordered worlds',async()=>{
  const h=harness({worldQuery:'three'});await h.answer(state(worlds()));h.emitWindow('pagehide',{persisted:true});h.emitWindow('pageshow',{persisted:true});await h.flush();await h.answer(state(worlds().reverse(),[],180000));
  assert.equal(h.run('world'),'three');assert.equal(new URL(h.sandbox.location.href).searchParams.get('world'),'three');assert(!h.node('#app').hidden);
 });
 if(failed)process.exitCode=1;
})();
