const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(__dirname+'/../src/main/resources/web/app.js','utf8'),code=source.slice(source.indexOf('function tile('),source.indexOf('function draw('));
function create(){const jobs=[],c={images:new Map(),limit:8192,pending:0,world:'one',canvas:{width:200,height:200},zoom:1,pan:{x:0,z:0},draw(){},Image:class{set src(v){this.url=v;jobs.push(this);}}};vm.createContext(c);vm.runInContext(code,c);return{c,jobs};}
const tabs=Array.from({length:4},create);
for(let n=0;n<180;n++)for(const{c,jobs}of tabs){c.world=['one','two','three'][n%3];c.zoom=n%2+1;vm.runInContext(`tile('tile',world,0,0,${n})`,c);let im=jobs.shift();if(im){im.onload();}const old=c.images.get('tile/'+c.world+'/0_0').image;const held=vm.runInContext(`tile('tile',world,0,0,${n+1})`,c);assert.equal(held,old);im=jobs.shift();if(im){n%7?im.onload():im.onerror();}assert(c.pending<=12);assert(c.images.size<=8192);}
const{c,jobs}=create();for(let i=0;i<8192;i++)c.images.set('tile/old/'+i+'_0',{image:{}});vm.runInContext("tile('tile','one',0,0,1)",c);assert.equal(jobs.length,1);assert(c.images.size<=8192);
assert(tabs.every((t,i)=>tabs.every((s,j)=>i===j||s.c.images!==t.c.images)));
console.log('Standalone cache PASS: four tabs, 180 virtual cycles, retained replacements, errors, dimensions, full-cache eviction.');
