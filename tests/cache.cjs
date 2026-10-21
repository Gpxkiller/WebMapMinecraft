const assert=require('node:assert/strict'),{harness,world,state}=require('./browser-harness.cjs');
(async()=>{
 const tabs=Array.from({length:4},()=>harness({width:128,height:128}));
 for(const h of tabs)await h.answer(state([world('one'),world('two','NETHER'),world('three','THE_END')]));
 for(let cycle=0;cycle<180;cycle++)for(const h of tabs){
  await h.advance(60001);h.node('#world').value=['one','two','three'][cycle%3];h.node('#world').onchange();h.node(cycle%2?'#plus':'#minus').onclick();
  h.refresh();await h.answer(state([world('one'),world('two','NETHER'),world('three','THE_END')],[],120000+cycle*60001));
  for(let round=0;round<8;round++){
   const active=h.jobs.filter(im=>typeof im.onload==='function');if(!active.length)break;
   for(const im of active)h.finish(im,cycle%7!==0);await h.advance(2);
  }
  assert(h.run('pending')>=0&&h.run('pending')<=12);assert(h.run('images.size')<=8192);
 }
 assert(tabs.every((t,i)=>tabs.every((s,j)=>i===j||t.run('images')!==s.run('images'))));
 const h=harness();await h.answer(state());h.run("cancelImages();for(let i=0;i<8192;i++)images.set('tile/old/'+i+'_0',{image:{}})");
 const before=h.jobs.length;h.run('draw()');assert(h.jobs.length>before);assert(h.run('images.size')<=8192);
 console.log('Cache PASS: four independent full-app contexts, 180 virtual cycles, zooms, dimensions, errors, retries and saturation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
