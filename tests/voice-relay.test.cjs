const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {EventEmitter}=require('node:events');const {createRequire}=require('node:module');
const runtime=createRequire(path.join(require('../scripts/runtime.cjs'),'package.json'));
const {WebSocket}=runtime('ws');const {startCodexBridge}=runtime('./codexBridge.cjs');
const {loadApplication}=require('../simulation/host-server.cjs');const {startDeviceBridge}=require('../scripts/device_bridge.cjs');
async function until(check){for(let i=0;i<600;i++){if(check())return;await new Promise(r=>setTimeout(r,10));}throw Error('Timed out');}
test('shared C++ app through real PC relay and authenticated backend completes reviewed voice answer',async t=>{
 const token='isolated-shared-voice-token',sessionId='voice-e2e';
 const backend=await startCodexBridge({port:0,token,sessionId,chatQuestions:true,chatQuestionSources:['m5sticks3-ble']});t.after(()=>backend.close());
 const request=async()=>{const r=await fetch(`http://127.0.0.1:${backend.port}/chat-questions`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({kind:'chat-choice',sessionId,owner:'isolated-voice-e2e-owner',questions:[{id:'original-size-question',question:'寸法は？',freeText:true,options:[]}],delivered:[],failed:[]})});return r.json();};
 await request();
 const m=await loadApplication(path.join(__dirname,'../simulation/runtime'));m._gar_lv_init();m._gar_app_init();m._gar_app_ble_hardware(1,1);
 const snapshot=()=>JSON.parse(m.UTF8ToString(m._gar_app_snapshot()));let device;
 class Port extends EventEmitter {
  constructor(){super();device=this;this.isOpen=false;}
  open(cb){this.isOpen=true;setImmediate(cb);}
  write(data,cb){const ptr=m._malloc(20);try{for(let i=0;i<data.length;i+=20){const bytes=data.subarray(i,i+20);m.HEAPU8.set(bytes,ptr);m._gar_app_feed_bytes(3,ptr,bytes.length);m._gar_app_tick(0);}}finally{m._free(ptr);}setImmediate(cb);}
  close(cb=()=>{}){this.isOpen=false;this.emit('close');setImmediate(cb);}
  drain(cb){setImmediate(cb);}
 }
 const events=[];const relay=startDeviceBridge({SerialPort:Port,WebSocket,url:backend.url,token,port:'SDK-SUBSTITUTE',transport:'ble',transcribe:async()=> '縦横10cm、高さ4cm',onEvent:e=>events.push(e)});t.after(()=>relay.close());
 const timer=setInterval(()=>{
  m._gar_app_tick(10);
  for(let i=0;i<256;i++){const raw=m.UTF8ToString(m._gar_app_take_output());if(!raw)break;const packet=JSON.parse(raw);if(packet.transport==='bluetooth-ble'&&device?.isOpen)device.emit('data',Buffer.from(packet.data));}
 },10);t.after(()=>clearInterval(timer));
 await until(()=>snapshot().freeText===true);
 m._gar_app_button(65,1);await until(()=>snapshot().voiceState==='recording');
 const pcm=new Int16Array(8192).fill(2000),ptr=m._malloc(pcm.byteLength);try{m.HEAPU8.set(new Uint8Array(pcm.buffer),ptr);m._gar_app_audio(ptr,pcm.length);}finally{m._free(ptr);}
 m._gar_app_button(65,0);await until(()=>snapshot().voiceState==='review');
 assert.equal((await request()).answers.length,0);
 m._gar_app_button(65,1);await new Promise(r=>setTimeout(r,50));m._gar_app_button(65,0);
 await until(()=>snapshot().voiceState==='received');
 const answers=(await request()).answers;assert.equal(answers.length,1);assert.equal(answers[0].text,'縦横10cm、高さ4cm');assert.equal(answers[0].id,'original-size-question');
 assert.equal(events.filter(e=>e.event==='answer-sent').length,1);
});
