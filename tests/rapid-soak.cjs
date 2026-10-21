// Long deterministic soak of the complete browser script, not physical uptime.
const assert=require('node:assert/strict'),{harness,world,state}=require('./browser-harness.cjs');
(async()=>{
 const tabs=Array.from({length:6},(_,i)=>({h:harness({automaticTimers:true,width:128,height:128,worldQuery:['one','two','three'][i%3]}),delayed:[]}));
 const worlds=[world('one'),world('two','NETHER'),world('three','THE_END')];
 for(const w of worlds){w.spawnX=0;w.spawnZ=0;w.tiles=Array.from({length:81},(_,i)=>`${i%9-4}_${Math.floor(i/9)-4}`);}
 for(const t of tabs)await t.h.answer(state(worlds));
 let responses=0,lateCallbacks=0,successfulLoads=0,maxPending=0,maxCache=0,maxTimers=0;
 // One minute per step: 72 virtual hours, six independent tabs.
 for(let tick=0;tick<4320;tick++)for(let n=0;n<tabs.length;n++){
  const {h,delayed}=tabs[n],phase=tick%120;
  const harvest=()=>{const jobs=h.jobs.splice(0);for(const im of jobs)if(im.onload){if((tick+n)%3===0&&tick%13){im.onload();successfulLoads++;}else delayed.push({callback:tick%13?im.onload:im.onerror,at:tick+1+((tick+n)%2)});}};
  harvest();
  if(phase===10){h.sandbox.navigator.onLine=false;h.emitWindow('offline');}
  if(phase===30){h.sandbox.navigator.onLine=true;h.emitWindow('online');}
  if(phase===60)h.emitWindow('pagehide',{persisted:true});
  if(phase===62)h.emitWindow('pageshow',{persisted:true});
  // Switch twice before animation: canceled downloads must never cross worlds.
  if(!h.run('locked'))for(let j=0;j<2;j++){
   h.node('#world').value=worlds[(tick+n+j)%3].id;h.node('#world').onchange();
   h.run(`pan.x=${tick%2?0:48};pan.z=${tick%3?0:-48}`);h.node((tick+j)%2?'#plus':'#minus').onclick();
   await h.advance(1);
   harvest();
  }
  const serve=async()=>{while(h.requests.length){const request=h.requests[0];if(request.options.signal.aborted){h.requests.shift();continue;}responses++;await h.answer(state(worlds,[],120000+tick*60000),phase>=35&&phase<40?503:phase===50?401:200);}};
  await serve();harvest();await h.advance(60000);await serve();
  // Capture callbacks, then invoke them even if a later pan/offline/timeout has
  // canceled that image: settled callbacks must not corrupt the pending count.
  harvest();
  for(let i=delayed.length-1;i>=0;i--)if(delayed[i].at<=tick){const item=delayed.splice(i,1)[0];item.callback();lateCallbacks++;}
  await h.advance(1);
  const pending=h.run('pending'),cache=h.run('images.size');
  assert(pending>=0&&pending<=12);assert(cache<=8192);assert(h.timers.size<=20);assert(delayed.length<=100);
  if(!h.run('locked'))assert.equal(new URL(h.sandbox.location.href).searchParams.get('world'),h.run('world'));
  maxPending=Math.max(maxPending,pending);maxCache=Math.max(maxCache,cache);maxTimers=Math.max(maxTimers,h.timers.size);
  h.paints.length=0;
 }
 for(const {h}of tabs){h.sandbox.navigator.onLine=true;h.emitWindow('online');await h.flush();while(h.requests.length){if(h.requests[0].options.signal.aborted){h.requests.shift();continue;}await h.answer(state(worlds,[],999999999));}assert(h.run('fresh()'));assert(!h.run('locked'));}
 assert(lateCallbacks>10000);assert(successfulLoads>10000);assert(maxCache>10);
 console.log(JSON.stringify({result:'PASS',tabs:6,virtualHoursEach:72,stepsEach:4320,responses,lateCallbacks,successfulLoads,maxPending,maxCache,maxTimers,physicalHoursClaimed:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
