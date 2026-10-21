// 24 virtual hours; real timers of the app run against a deterministic clock.
// This is not a claim of 24 hours of physical browser testing.
const assert=require('node:assert/strict'),{harness,world,state}=require('./browser-harness.cjs');
(async()=>{
 const tabs=Array.from({length:4},()=>harness({automaticTimers:true,width:64,height:64}));
 const worlds=[world('one','NORMAL',false),world('two','NETHER',false),world('three','THE_END',false)];
 for(const w of worlds){w.spawnX=0;w.spawnZ=0;}
 let served=0,offlineTicks=0,maxTimers=0,maxImages=0;
 for(const h of tabs)await h.answer(state(worlds));
 for(let tick=0;tick<8640;tick++)for(let i=0;i<tabs.length;i++){
  const h=tabs[i],phase=tick%2160;
  if(phase===300){h.sandbox.navigator.onLine=false;h.emitWindow('offline');}
  if(phase===660||phase===1230){h.sandbox.navigator.onLine=true;h.emitWindow('online');}
  if(phase===1500)h.emitWindow('pagehide',{persisted:true});
  if(phase===1530)h.emitWindow('pageshow',{persisted:true});
  if(tick%360===0){h.node('#world').value=worlds[Math.floor(tick/360+i)%3].id;h.node('#world').onchange();h.node(tick%720?'#minus':'#plus').onclick();}
  if(tick===1700&&i===0)h.run('Date.now=()=>0');
  await h.advance(10000);
  while(h.requests.length){served++;await h.answer(state(worlds,[],120000+tick*10000),phase>=900&&phase<1080?503:phase===1200?401:200);}
  for(const im of h.jobs.filter(im=>im.onload))h.finish(im);
  h.jobs.length=0;await h.advance(1);h.paints.length=0;
  if(phase>=300&&phase<660){offlineTicks++;assert.equal(h.requests.length,0);assert.equal(h.run('pending'),0);}
  assert(h.run('pending')>=0&&h.run('pending')<=12);assert(h.run('images.size')<=8192);
  maxTimers=Math.max(maxTimers,h.timers.size);maxImages=Math.max(maxImages,h.run('images.size'));assert(h.timers.size<=20);
 }
 for(const h of tabs){h.emitWindow('online');await h.flush();while(h.requests.length)await h.answer(state(worlds,[],999999999));assert.equal(h.run('locked'),false);assert.equal(h.run('refreshing'),false);assert(h.run('fresh()'));}
 assert(maxImages>=2,'Soak must actually load real terrain images');
 console.log(JSON.stringify({result:'PASS',tabs:4,virtualHours:24,ticksPerTab:8640,served,offlineTicks,maxTimers,maxImages,realHoursClaimed:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
