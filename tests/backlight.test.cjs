const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
const {loadApplication}=require('../simulation/host-server.cjs');const {createSimulationController}=require('../simulation/host-controller.cjs');
async function fixture(){return createSimulationController(await loadApplication(path.join(__dirname,'../simulation/runtime')),{demo:true});}
const edge=(c,button,phase)=>c.control({type:'button',button,phase});
test('all sessions idle for 30 seconds dims; heartbeat does not reset timer',async()=>{
 const c=await fixture();c.control({type:'scenario',name:'idle'});c.tick(29999);assert.equal(c.snapshot().snapshot.dimmed,false);
 c.tick(1);assert.equal(c.snapshot().snapshot.dimmed,true);assert.equal(c.snapshot().snapshot.brightness,8);
 c.tick(5000);assert.equal(c.snapshot().snapshot.dimmed,true);
 c.control({type:'background',status:'running'});assert.equal(c.snapshot().snapshot.dimmed,false);assert.equal(c.snapshot().snapshot.brightness,96);
 c.tick(40000);assert.equal(c.snapshot().snapshot.dimmed,false);
});
test('new question restores brightness; first physical long B only wakes and never opens list',async()=>{
 const c=await fixture();c.control({type:'scenario',name:'idle'});c.tick(30000);
 edge(c,'B','down');assert.equal(c.snapshot().snapshot.dimmed,false);c.tick(1000);edge(c,'B','up');
 assert.equal(c.snapshot().snapshot.listOpen,false);
 c.tick(30000);assert.equal(c.snapshot().snapshot.dimmed,true);
 c.control({type:'background',status:'waiting'});assert.equal(c.snapshot().snapshot.dimmed,false);
 assert.equal(c.snapshot().metrics.syntheticReplies,0);
});
test('wake A release cannot answer a question arriving while held; next A can answer',async()=>{
 const c=await fixture();c.control({type:'scenario',name:'idle'});c.tick(30000);
 edge(c,'A','down');c.control({type:'background',status:'waiting'});edge(c,'A','up');c.tick(1000);
 assert.equal(c.snapshot().metrics.syntheticReplies,0);
 edge(c,'A','down');c.tick(50);edge(c,'A','up');c.tick(1000);assert.equal(c.snapshot().metrics.syntheticReplies,1);
});
