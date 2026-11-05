const {test}=require('node:test');
const assert=require('node:assert/strict');
const path=require('node:path');
const {loadApplication}=require('../simulation/host-server.cjs');
const {createSimulationController}=require('../simulation/host-controller.cjs');
async function fixture(){return createSimulationController(await loadApplication(path.join(__dirname,'../simulation/runtime')),{demo:true});}
const event=(c,name,value)=>c.control({type:'ble-event',event:name,value});
test('real BleUart requests security on every connection; no payload before authentication and subscription',async()=>{
 const c=await fixture();event(c,'reset',0);event(c,'security',0);event(c,'connect',1);
 assert.equal(c.snapshot().ble.securityRequests,1);assert.equal(c.snapshot().ble.securityRequested,true);
 event(c,'subscribe',1);
 const before=c.snapshot().metrics.outgoingPackets;
 c.control({type:'wire',transport:'bluetooth-ble',data:'{"type":"hello"}\n'});
 assert.equal(c.snapshot().ble.ready,false);assert.ok(c.snapshot().ble.rejectedWrites>0);assert.equal(c.snapshot().metrics.outgoingPackets,before);
 event(c,'authenticate',1);assert.equal(c.snapshot().ble.ready,true);
 event(c,'subscribe',0);assert.equal(c.snapshot().ble.ready,false);
 event(c,'disconnect',0);event(c,'connect',1);assert.equal(c.snapshot().ble.securityRequests,2);assert.equal(c.snapshot().ble.ready,false);
});
test('authentication rejection closes link; reconnect recovers sessions and ACK via shared BleUart',async()=>{
 const c=await fixture();event(c,'disconnect',0);event(c,'security',0);event(c,'connect',1);event(c,'authenticate',0);
 assert.equal(c.snapshot().ble.linked,false);
 event(c,'security',1);c.control({type:'hardware',connected:false});c.control({type:'hardware',connected:true});
 c.tick(1000);assert.equal(c.snapshot().ble.ready,true);assert.equal(c.snapshot().snapshot.activeTransport,'bluetooth-ble');
 c.control({type:'button',button:'A',phase:'down'});c.tick(50);c.control({type:'button',button:'A',phase:'up'});c.tick(2000);
 assert.equal(c.snapshot().metrics.syntheticReplies,1);assert.equal(c.snapshot().metrics.acknowledgements,1);
});
