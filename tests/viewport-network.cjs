const assert=require('node:assert/strict'),{harness,world,state}=require('./browser-harness.cjs');
let failed=0;
async function test(name,fn){try{await fn();console.log('PASS '+name);}catch(e){failed++;console.error('FAIL '+name+': '+e.message);}}
(async()=>{
 await test('panning within one dimension frees blocked offscreen downloads',async()=>{
  const h=harness({width:64,height:64}),w=world('one');w.spawnX=0;w.spawnZ=0;w.tiles=['0_0','1_0','100_0','101_0'];
  await h.answer(state([w]));h.run("for(let i=1000;i<1020;i++)tile('tile','one',i,0,120000)");assert.equal(h.run('pending'),12);
  const before=h.jobs.length;h.run('pan.x=1600;draw()');
  assert(h.jobs.slice(before).some(im=>im.url.includes('/tile/one/100_0')),'Offscreen requests still block the new viewport');
 });
 await test('viewport cancellation keeps decoded real terrain and ignores late callbacks',async()=>{
  const h=harness({width:64,height:64}),w=world('one');w.spawnX=0;w.spawnZ=0;w.tiles=['0_0','1_0','100_0'];
  await h.answer(state([w]));const decoded=h.jobs.find(im=>im.url.includes('/tile/one/0_0'));h.finish(decoded);
  const pendingImage=h.jobs.find(im=>im.url.includes('/tile/one/1_0')),late=pendingImage.onload;
  h.run('pan.x=1600;draw()');const pending=h.run('pending');late();
  assert.equal(h.run('pending'),pending);assert(!pendingImage.onload,'Obsolete callbacks must be detached');
  assert(h.run("images.get('tile/one/0_0').image"),'Already decoded real tile was discarded');
 });
 await test('zooming releases blocked images outside the smaller viewport',async()=>{
  const h=harness({width:256,height:256}),w=world('one');w.spawnX=0;w.spawnZ=0;w.previewEnabled=false;w.tiles=Array.from({length:16},(_,i)=>`${i-8}_0`);
  await h.answer(state([w]));assert.equal(h.run('pending'),12);h.run('zoom=16;draw()');
  const busy=h.run("[...images].filter(([k,v])=>v.busy).map(([k])=>Number(k.split('/')[2].split('_')[0]))");
  assert(busy.every(x=>x>=-1&&x<=0),'Out-of-view image requests survived zoom');
  assert(h.jobs.some(im=>im.url.includes('/tile/one/0_0')&&im.onload),'Center tile not requested');
 });
 if(failed)process.exitCode=1;
})();
