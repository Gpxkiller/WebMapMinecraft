// Isolated Paper fixture only; never run this against a production server.
const assert=require('node:assert/strict');
const base=process.env.WEBMAP_TEST_URL||'http://127.0.0.1:29127';
if(!/^http:\/\/127\.0\.0\.1:\d+$/.test(base))throw Error('Loopback fixture required');
const auth='Basic '+Buffer.from('admin:isolated-fixture-password-not-production').toString('base64');
(async()=>{
 assert.equal((await fetch(base+'/api/state')).status,401);
 const get=path=>fetch(base+path,{headers:{Authorization:auth}});
 let r=await get('/api/state');assert.equal(r.status,200);assert.match(r.headers.get('cache-control'),/no-store/);const state=await r.json();assert(state.worlds.length>=3);assert.equal(state.players.length,0);assert(!JSON.stringify(state).includes('seed'));assert(state.worlds.every(w=>typeof w.previewEnabled==='boolean'));
 assert.equal((await fetch(base+'/api/state',{headers:{Authorization:'Basic '+Buffer.from('admin:wrong-fixture-password').toString('base64')}})).status,401);
 const clients=await Promise.all(Array.from({length:20},()=>get('/api/state').then(async r=>{assert.equal(r.status,200);return r.json();})));assert(clients.every(s=>s.worlds.length===state.worlds.length&&s.players.length===0));
 for(const path of ['/private/generation.json','/export/private/generation.json','/api/tile/../../private/generation.json','/.env'])assert.equal((await get(path)).status,404);
 assert.equal((await fetch(base+'/api/state',{method:'POST',headers:{Authorization:auth}})).status,405);
 const tile=state.worlds.find(w=>w.tiles.length);assert(tile,'Loaded chunks must be exported');r=await get(`/api/tile/${tile.id}/${tile.tiles[0]}.png`);assert.equal(r.status,200);assert.equal(r.headers.get('content-type'),'image/png');assert.equal(Buffer.from(await r.arrayBuffer()).subarray(0,8).toString('hex'),'89504e470d0a1a0a');
 for(const path of ['/','/app.js','/style.css'])assert.equal((await get(path)).status,200);
 console.log('HTTP fixture PASS: auth, private seed isolation, paths, methods, PNG, static assets, players opt-in.');
})().catch(e=>{console.error(e);process.exitCode=1;});
