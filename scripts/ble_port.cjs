// Serial-like byte adapter for the existing, tested Product relay. No JSONL interpretation.
const {EventEmitter}=require('node:events');
const {spawn}=require('node:child_process');
const {createInterface}=require('node:readline');
const path=require('node:path');
const profile=require('../transports/ble/profile.json');
class BlePort extends EventEmitter {
 constructor(options){super();this.address=options.path;this.spawn=options.spawn??spawn;this.isOpen=false;this.pending=new Map();this.nextId=0;}
 open(callback){
  let opening=true;
  const finish=error=>{if(opening){opening=false;clearTimeout(this.timer);callback(error);}};
  const root=process.env.VIBEREMOTE_PRODUCT_ROOT||path.resolve(__dirname,'..');
  const python=process.env.VIBEREMOTE_BLE_PYTHON||path.join(root,'.gar/ble-python',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  const helper=path.join(root,'sources/gar-tools/transports/ble-uart/pc/gatt_pipe.py');
  const child=this.spawn(python,['-u',helper,'--address',this.address,...Object.entries(profile).flatMap(([key,value])=>['--'+key,value])],{windowsHide:true,stdio:['pipe','pipe','pipe']});
  this.child=child;this.timer=setTimeout(()=>{finish(Error('BLE open timeout'));child.kill();},120000);
  child.stdin.on('error',()=>child.kill());
  createInterface({input:child.stdout}).on('line',line=>{
   try{
    if(line.length>100000)throw Error('pipe overflow');const event=JSON.parse(line);
    if(event.event==='open'){this.isOpen=true;finish();}
    else if(event.event==='data'&&this.isOpen)this.emit('data',Buffer.from(event.data,'base64'));
    else if(event.event==='written'){const cb=this.pending.get(event.id);this.pending.delete(event.id);cb?.();}
    else if(event.event==='error')throw Error('GATT transfer failed');
   }catch{child.kill();}
  });
  child.stderr.resume();child.on('error',()=>finish(Error('BLE helper unavailable')));
  child.on('close',()=>{const wasOpen=this.isOpen;this.isOpen=false;finish(Error('BLE disconnected'));for(const cb of this.pending.values())cb(Error('BLE disconnected'));this.pending.clear();if(wasOpen)this.emit('close');});
 }
 write(bytes,callback){
  if(!this.isOpen){callback(Error('Closed BLE'));return;}
  const id=++this.nextId;this.pending.set(id,callback);
  this.child.stdin.write(JSON.stringify({type:'write',id,data:Buffer.from(bytes).toString('base64')})+'\n',error=>{if(error)this.child.kill();});
 }
 drain(callback){
  const until=Date.now()+2000;
  const check=()=>{if(!this.pending.size||Date.now()>=until)callback();else setTimeout(check,20);};check();
 }
 close(callback=()=>{}){const child=this.child;if(!child||child.exitCode!==null||child.signalCode!==null){callback();return;}child.once('close',callback);child.stdin.end();child.kill();}
}
module.exports={BlePort};
