const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');const os=require('node:os');
const {createRequire}=require('node:module');const runtime=createRequire(path.join(require('../scripts/runtime.cjs'),'package.json'));
const {startCodexBridge}=runtime('./codexBridge.cjs');const {startDeviceBridge}=require('../scripts/device_bridge.cjs');
const {WebSocket}=runtime('ws');
const {createHostServer,loadApplication}=require('../simulation/host-server.cjs');const {createSimulationController}=require('../simulation/host-controller.cjs');
const {startChatQuestions}=require('../scripts/question_service.cjs');const {NativeChatReply}=require('../scripts/native_chat_reply.cjs');
const {fixture:nativeFixture,state:nativeState}=require('./helpers/native_reply_fixture.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(check){for(let i=0;i<1200;i++){if(await check())return;await pause(10);}throw Error('Timed out');}
async function fixture(t,freeText){
 const sessionId='panel-native-chat',token='isolated-production-path-token';
 const q={id:'["request_user_input_async","call_panel",0]',originalQuestion:'ケースの寸法は？',...(freeText?{freeText:true}:{originalOptions:['YES','NO']})};
 const native=await nativeFixture(t,{getState:id=>{const s=nativeState(id,q);if(freeText)s.turns[0].items[0].questions[0].options=null;return s;}});
 const replies=new NativeChatReply(native);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'vibe-panel-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const file=path.join(dir,'rollout.jsonl');
 const payload={type:'function_call',name:'request_user_input_async',call_id:'call_panel',arguments:JSON.stringify({questions:[{title:q.originalQuestion,...(freeText?{}:{options:q.originalOptions})}]})};
 fs.writeFileSync(file,[{type:'response_item',timestamp:new Date().toISOString(),payload},{type:'response_item',payload:{type:'function_call_output',call_id:'call_panel',output:'{"accepted":true}'}}].map(JSON.stringify).join('\n')+'\n');
 const backendOptions={token,sessionId,chatQuestions:true,chatQuestionSources:['m5sticks3-ble','m5sticks3-sim-ble']};
 let backend=await startCodexBridge({...backendOptions,port:0});const backendPort=backend.port;
 const service=await startChatQuestions({config:{token,sessionId,port:backend.port,chatQuestions:true},file,intervalMs:20,app:{ready:async()=>{},close(){},reply:async(question,answer)=>{
  await replies.reply(question,answer,sessionId);
  fs.appendFileSync(file,JSON.stringify({type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:'<send_user_message_question_reply>\n'+JSON.stringify([{questionItemId:q.id,question:q.originalQuestion,answer:freeText?answer:q.originalOptions[Number(answer.slice(7))]}])+'\n</send_user_message_question_reply>'}]}})+'\n');
 }}});
 const server=await createHostServer({port:0,componentsRoot:path.join(__dirname,'../sources/gar-tools/web-simulator/components'),connection:{url:backend.url,token,retryMs:50},transcribe:async()=> '縦横10cmです'});
 const physical=createSimulationController(await loadApplication(path.join(__dirname,'../simulation/runtime')),{externalPeer:true});
 const clock=setInterval(()=>physical.tick(10),10);
 const relay=startDeviceBridge({SerialPort:physical.SerialPort,WebSocket,transport:'ble',port:'isolated-physical-sdk',url:backend.url,token,transcribe:async()=> '実機側の回答'});
 t.after(async()=>{await server.close();await relay.close();clearInterval(clock);await service.close();replies.close();await backend.close();});
 await until(()=>server.controller.snapshot().snapshot.uiId.startsWith('chat-choice-')&&physical.snapshot().snapshot.uiId.startsWith('chat-choice-'));
 const control=async command=>{
  const r=await fetch(`http://127.0.0.1:${server.port}/api/control`,{method:'POST',headers:{Origin:`http://127.0.0.1:${server.port}`,'Content-Type':'application/json'},body:JSON.stringify(command)});
  assert.equal(r.status,200);return r.json();
 };
 const edge=(key,phase)=>control({type:'button',button:key,phase});
 return {server,physical,native,control,edge,token,restart:async()=>{
  await backend.close();await until(()=>!server.controller.snapshot().snapshot.connected);
  backend=await startCodexBridge({...backendOptions,port:backendPort});
 }};
}
test('normal panel choice traverses real relay, question worker and native card; physical peer closes too',async t=>{
 const f=await fixture(t,false);const before=f.server.controller.snapshot().snapshot.uiId;
 assert.equal(f.server.controller.snapshot().production,true);
 await f.edge('A','down');await pause(50);await f.edge('A','up');
 await until(()=>f.native.mutations.length===1);
 await until(()=>!f.physical.snapshot().snapshot.answerable&&!f.server.controller.snapshot().snapshot.answerable);
 const text=f.native.mutations[0].params.input[0].text;assert.match(text,/call_panel/);assert.match(text,/YES/);
 f.physical.control({type:'button',button:'A',phase:'down'});f.physical.tick(50);f.physical.control({type:'button',button:'A',phase:'up'});await pause(100);assert.equal(f.native.mutations.length,1);
 const response=await fetch(`http://127.0.0.1:${f.server.port}/api/control`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'wire',data:'malicious'})});assert.equal(response.status,403);
 const state=await(await fetch(`http://127.0.0.1:${f.server.port}/api/state`)).text();assert.equal(state.includes(f.token),false);assert.ok(before);
});
test('normal panel PCM traverses shared C++ recording/ADPCM/BLE, PC ASR, confirmation and native reply',async t=>{
 const f=await fixture(t,true);await f.edge('A','down');await until(()=>f.server.controller.snapshot().snapshot.voiceState==='recording');
 for(let i=0;i<4;i++)await f.control({type:'audio',samples:Array(2048).fill(2000)});
 await f.edge('A','up');await until(()=>f.server.controller.snapshot().snapshot.voiceState==='review');assert.equal(f.native.mutations.length,0);
 await f.edge('A','down');await pause(50);await f.edge('A','up');await until(()=>f.native.mutations.length===1);
 assert.match(f.native.mutations[0].params.input[0].text,/縦横10cmです/);
 await until(()=>f.physical.snapshot().snapshot.freeText===false);
});
test('physical answer wins and prevents a simulator answer to the same question',async t=>{
 const f=await fixture(t,false);
 f.physical.control({type:'button',button:'A',phase:'down'});f.physical.tick(50);f.physical.control({type:'button',button:'A',phase:'up'});
 await until(()=>f.native.mutations.length===1);await until(()=>!f.server.controller.snapshot().snapshot.answerable);
 await f.edge('A','down');await pause(50);await f.edge('A','up');await pause(100);assert.equal(f.native.mutations.length,1);
});
test('PC bridge restart revokes an in-progress gesture; reconnect restores current question without replay',async t=>{
 const f=await fixture(t,false);const before=f.server.controller.snapshot().snapshot.uiId;
 await f.edge('A','down');await f.restart();
 await until(()=>f.server.controller.snapshot().snapshot.answerable&&f.server.controller.snapshot().snapshot.uiId!==before);
 await f.edge('A','up');await pause(100);assert.equal(f.native.mutations.length,0);
 await f.edge('A','down');await pause(50);await f.edge('A','up');await until(()=>f.native.mutations.length===1);
});
if(process.env.GAR_PLAYWRIGHT_MODULE)test('browser microphone reaches the production-path SDK application and native reply',async t=>{
 const {chromium}=require(process.env.GAR_PLAYWRIGHT_MODULE);
 const f=await fixture(t,true);
 const browser=await chromium.launch({channel:'msedge',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});t.after(()=>browser.close());
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.pcmSamples=0;document.addEventListener('gar-microphone-pcm',e=>window.pcmSamples+=e.detail.samples.length);
  const original=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);let first=true;
  navigator.mediaDevices.getUserMedia=(...args)=>{if(first){first=false;return Promise.reject(new DOMException('permission denied by system','NotAllowedError'));}return original(...args);};
 });
 await page.goto(`http://127.0.0.1:${f.server.port}/`);
 await page.locator('#microphone').getByRole('button').click();
 await page.locator('#microphone').getByText(/マイクを利用できません/).waitFor();
 await page.waitForTimeout(300);assert.equal(await page.locator('#microphone').getByText(/マイクを利用できません/).isVisible(),true);
 await page.locator('#microphone').getByRole('button').click();
 await page.waitForFunction(()=>document.querySelector('#microphone').stream);
 await page.evaluate(()=>document.querySelector('#device').press('A','browser-test'));
 await page.waitForFunction(()=>window.vibeSimulator.snapshot().voiceState==='recording');
 await page.waitForFunction(()=>window.pcmSamples>=4096);
 await page.evaluate(()=>document.querySelector('#device').release('A','browser-test'));
 await page.waitForFunction(()=>window.vibeSimulator.snapshot().voiceState==='review');
 await page.evaluate(()=>document.querySelector('#device').press('A','browser-confirm'));await page.waitForTimeout(50);await page.evaluate(()=>document.querySelector('#device').release('A','browser-confirm'));
 await until(()=>f.native.mutations.length===1);assert.deepEqual(errors,[]);
});
