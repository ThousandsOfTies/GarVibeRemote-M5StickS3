const test=require('node:test');
const assert=require('node:assert/strict');
const {EventEmitter}=require('node:events');
const {PassThrough}=require('node:stream');
const {BlePort}=require('../scripts/ble_port.cjs');
function fixture(){
 const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();
 child.exitCode=null;child.signalCode=null;
 child.kill=()=>{child.signalCode='SIGTERM';child.emit('close',null,'SIGTERM');};
 const port=new BlePort({path:'11:22:33:44:55:66',spawn:()=>child});
 const event=value=>child.stdout.write(JSON.stringify(value)+'\n');
 return {port,child,event};
}
test('GATT pipe exposes bytes and completes a write only after its matching receipt',async()=>{
 const {port,child,event}=fixture();
 const opened=new Promise((resolve,reject)=>port.open(error=>error?reject(error):resolve()));
 event({event:'open'});await opened;
 const packets=[];port.on('data',bytes=>packets.push(bytes));
 event({event:'data',data:Buffer.from('質問').toString('base64')});
 let completed=false;port.write(Buffer.from('回答\n'),error=>{assert.ifError(error);completed=true;});
 const write=JSON.parse(child.stdin.read().toString());
 assert.equal(Buffer.from(write.data,'base64').toString(),'回答\n');
 event({event:'written',id:write.id+1});assert.equal(completed,false);
 event({event:'written',id:write.id});assert.equal(completed,true);
 assert.equal(Buffer.concat(packets).toString(),'質問');
 await new Promise(resolve=>port.close(resolve));assert.equal(port.isOpen,false);
});
test('disconnect fails in-flight write exactly once and cannot replay it',async()=>{
 const {port,child,event}=fixture();
 const opened=new Promise(resolve=>port.open(resolve));event({event:'open'});await opened;
 let failures=0,closes=0;port.on('close',()=>closes++);
 port.write(Buffer.from('answer\n'),error=>{assert.ok(error);failures++;});
 child.kill();assert.equal(failures,1);assert.equal(closes,1);assert.equal(port.pending.size,0);
 assert.equal(port.isOpen,false);
});
