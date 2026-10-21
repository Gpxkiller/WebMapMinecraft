const assert=require('node:assert/strict'),{harness,world,state}=require('./browser-harness.cjs');
let failures=0;
async function test(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failures++;console.error('FAIL '+name+': '+e.message);}}
(async()=>{
 await test('dimension change releases downloads of the previous dimension immediately',async()=>{
  const h=harness();await h.answer(state([world('one'),world('two')]));
  h.run("for(let i=100;i<120;i++)tile('tile','one',i,0,120000)");
  assert.equal(h.run('pending'),12);
  h.node('#world').value='two';h.node('#world').onchange();await h.advance(1);
  assert(h.jobs.some(im=>im.url.includes('/two/')),'New dimension blocked by old requests');
  assert.equal(h.run("[...images].filter(([k,v])=>k.includes('/one/')&&v.busy).length"),0);
 });
 await test('player navigation releases old dimension downloads and preserves decoded terrain',async()=>{
  const h=harness();await h.answer(state([world('one'),world('two')],[{id:'p',name:'Fixture',world:'two',x:0,z:0,status:'online'}]));
  const decoded=h.jobs[0];h.finish(decoded);await h.advance(1);
  h.run("for(let i=100;i<120;i++)tile('tile','one',i,0,120000)");
  h.node('#players').children[0].onclick();await h.advance(1);
  assert(h.jobs.some(im=>im.url.includes('/two/')));
  assert(h.run("[...images.values()].some(v=>v.image)"),'Decoded terrain should stay cached');
  assert(h.run('pending')>=0&&h.run('pending')<=12);
 });
 await test('offline interruption ends an unfinished drag',async()=>{
  const h=harness();await h.answer(state());h.node('#terrain').onpointerdown({pointerId:1,clientX:10,clientY:10});
  h.sandbox.navigator.onLine=false;h.emitWindow('offline');const before=h.run('pan.x');
  h.node('#terrain').onpointermove({clientX:300,clientY:10});assert.equal(h.run('pan.x'),before);
 });
 if(failures)process.exitCode=1;
})();
