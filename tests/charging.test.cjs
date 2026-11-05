const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
const {loadApplication}=require('../simulation/host-server.cjs');const {createSimulationController}=require('../simulation/host-controller.cjs');
test('charging fact renders a lightning glyph beside battery and disappears when charging stops',async()=>{
 const c=createSimulationController(await loadApplication(path.join(__dirname,'../simulation/runtime')),{demo:true});
 c.tick(40);const before=Buffer.from(c.frame());assert.equal(c.snapshot().snapshot.charging,false);
 c.control({type:'hardware',charging:true,battery:100});c.tick(40);
 assert.equal(c.snapshot().snapshot.charging,true);assert.equal(c.snapshot().snapshot.battery,100);
 const charged=Buffer.from(c.frame());let changed=0;
 for(let y=12;y<25;y++)for(let x=120;x<129;x++){const p=(y*135+x)*4;if(!before.subarray(p,p+4).equals(charged.subarray(p,p+4)))changed++;}
 assert.ok(changed>0,'lightning glyph must produce actual LVGL pixels');
 c.control({type:'hardware',charging:false});c.tick(40);assert.equal(c.snapshot().snapshot.charging,false);
 const stopped=c.frame();for(let y=12;y<25;y++)for(let x=120;x<129;x++){const p=(y*135+x)*4;assert.deepEqual(stopped.subarray(p,p+4),before.subarray(p,p+4));}
});
