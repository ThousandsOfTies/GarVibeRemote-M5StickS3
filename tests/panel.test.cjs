const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {loadApplication,createHostServer}=require('../simulation/host-server.cjs');
async function fixture(t){
 const module=await loadApplication(path.join(__dirname,'../simulation/runtime'));
 const server=await createHostServer({module,port:0,manualClock:true,demo:true});
 t.after(()=>server.close());return server;
}
const edge=(c,button,phase)=>c.control({type:'button',button,phase});
function press(c,button,ms=50){edge(c,button,'down');c.tick(ms);edge(c,button,'up');}
test('same C++ app: short B changes focus, A answers and receives ACK',async t=>{
 const {controller:c}=await fixture(t);const initial=c.snapshot().snapshot;
 press(c,'B');assert.notEqual(c.snapshot().snapshot.choice,initial.choice);
 press(c,'A');assert.equal(c.snapshot().metrics.syntheticReplies,1);
 c.tick(600);assert.equal(c.snapshot().metrics.acknowledgements,1);
 assert.match(c.snapshot().result,/受信・確認/);
});
test('long B opens list without cycling choice; short B and A select another session',async t=>{
 const {controller:c}=await fixture(t);const choice=c.snapshot().snapshot.choice;
 press(c,'B',750);assert.equal(c.snapshot().snapshot.listOpen,true);
 assert.equal(c.snapshot().snapshot.choice,choice);
 press(c,'B');press(c,'A');
 assert.equal(c.snapshot().snapshot.listOpen,false);
 assert.equal(c.snapshot().snapshot.sessionId,'notes');
});
test('cancelled B press does not move focus or open list',async t=>{
 const {controller:c}=await fixture(t);const choice=c.snapshot().snapshot.choice;
 edge(c,'B','down');c.tick(300);edge(c,'B','cancel');c.tick(500);
 assert.equal(c.snapshot().snapshot.choice,choice);
 assert.equal(c.snapshot().snapshot.listOpen,false);
 assert.equal(c.snapshot().metrics.syntheticReplies,0);
});
test('scroll advances, disconnect releases app and reconnect restores sessions',async t=>{
 const {controller:c}=await fixture(t);c.tick(5000);
 assert.ok(c.snapshot().snapshot.scrollPixels>0);
 c.control({type:'hardware',connected:false});assert.equal(c.snapshot().snapshot.connected,false);
 c.control({type:'hardware',connected:true});assert.equal(c.snapshot().snapshot.connected,true);
 assert.equal(c.snapshot().snapshot.sessions.length,3);
 assert.throws(()=>edge(c,'C','down'),/Invalid button/);
 assert.throws(()=>c.control({type:'hardware',transport:'bluetooth-spp'}),/Invalid transport/);
});
test('production controller starts disconnected and refuses direct state/demo injection',async()=>{
 const {createSimulationController}=require('../simulation/host-controller.cjs');
 const c=createSimulationController(await loadApplication(path.join(__dirname,'../simulation/runtime')));
 assert.equal(c.snapshot().production,true);assert.equal(c.snapshot().snapshot.connected,false);
 assert.throws(()=>c.control({type:'live',connected:true,sessions:[]}),/PC relay/);
 assert.throws(()=>c.control({type:'mode',mode:'demo'}),/PC relay/);
});

test('HTTP serves device component, protects origin and denies private paths',async t=>{
 const {port}=await fixture(t);const base=`http://127.0.0.1:${port}`;
 // Runtime HTTP tests use the explicit component root, as does the developer CLI.
 assert.equal((await fetch(base+'/health')).status,200);
 assert.equal((await fetch(base+'/product.json')).status,404);
 assert.equal((await fetch(base+'/api/control',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/json'},body:'{}'})).status,403);
});
test('BLE chunks use a distinct application lease and preserve answer identities',async t=>{
 const {controller:c}=await fixture(t);
 c.control({type:'hardware',transport:'bluetooth-ble'});
 const before=c.snapshot().snapshot;
 assert.equal(before.activeTransport,'bluetooth-ble');
 assert.equal(before.bleClient,true);
 assert.match(before.message,/画面の変更/);
 press(c,'B');press(c,'A');c.tick(600);
 assert.equal(c.snapshot().metrics.syntheticReplies,1);
 assert.equal(c.snapshot().metrics.acknowledgements,1);
 c.control({type:'hardware',connected:false});assert.equal(c.snapshot().snapshot.activeTransport,'none');
 c.control({type:'hardware',connected:true});assert.equal(c.snapshot().snapshot.activeTransport,'bluetooth-ble');
 assert.equal(c.snapshot().metrics.syntheticReplies,1);
});
test('normal server starts without synthetic sessions and refuses test inputs',async t=>{
 const module=await loadApplication(path.join(__dirname,'../simulation/runtime'));
 const server=await createHostServer({module,port:0,manualClock:true});t.after(()=>server.close());
 assert.equal(server.controller.snapshot().mode,'live');
 assert.equal(server.controller.snapshot().snapshot.sessions.some(s=>['screen','notes','release'].includes(s.id)),false);
 const response=await fetch(`http://127.0.0.1:${server.port}/api/control`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'mode',mode:'demo'})});
 assert.equal(response.status,403);
});
