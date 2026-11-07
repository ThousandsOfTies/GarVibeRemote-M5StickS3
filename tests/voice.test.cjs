const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');
const {VoiceReceiver}=require('../scripts/voice_receiver.cjs');
const {decodeIma}=require('../scripts/ima_adpcm.cjs');
const {questionReply,assertQuestion}=require('../scripts/native_chat_reply.cjs');
const {NativeQuestionLog}=require('../scripts/native_question_log.cjs');
const {loadApplication}=require('../simulation/host-server.cjs');
const {createSimulationController}=require('../simulation/host-controller.cjs');
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const session={session:{id:'free',name:'筐体寸法'},ui:{id:'question-size',state:'waiting',freeText:true,message:'ケースの寸法を教えてください。',actions:[]}};
const start={type:'voiceStart',id:'recording-1',sessionId:'free',uiId:'question-size'};
test('IMA decoder matches independent Python audioop reference and rejects malformed blocks',()=>{
 const block=Buffer.concat([Buffer.from([100,0,20,0]),Buffer.from('7766554433221100ffeeddccbbaa9988','hex')]);
 const pcm=decodeIma(block,33),values=Array.from({length:33},(_,i)=>pcm.readInt16LE(i*2));
 assert.deepEqual(values.slice(0,20),[100,193,392,765,1428,2423,3880,5626,7738,9726,11533,12706,13772,14354,14882,15042,15187,13200,8940,1026]);
 assert.equal(values[32],-32768);assert.throws(()=>decodeIma(block,34));const bad=Buffer.from(block);bad[2]=89;assert.throws(()=>decodeIma(bad,33));
});
const chunk=i=>({type:'voiceChunk',id:start.id,seq:i,data:Buffer.alloc(512,1).toString('base64')});
function peer(transcribe=async()=> '縦横10cm、高さ4cmです') {
 let current=structuredClone(session);const sent=[],confirmed=[];
 const v=new VoiceReceiver({current:()=>current,send:m=>sent.push(m),confirm:m=>confirmed.push(m),transcribe});
 return {v,sent,confirmed,remove:()=>{current=undefined;v.update();}};
}
test('voice transcript requires explicit confirmation, routes immutable identity, and cannot replay',async()=>{
 const p=peer();p.v.receive(start);for(let i=0;i<16;i++)p.v.receive(chunk(i));
 p.v.receive({type:'voiceEnd',id:start.id,chunks:16});await flush();
 assert.equal(p.sent.at(-1).type,'voiceResult');assert.equal(p.confirmed.length,0);
 p.v.receive({type:'voiceConfirm',id:start.id,text:'別の内容'});
 assert.deepEqual(p.confirmed,[{type:'uiAction',sessionId:'free',uiId:'question-size',actionId:'voice',text:'縦横10cm、高さ4cmです'}]);
 p.v.receive({type:'voiceConfirm',id:start.id});assert.equal(p.confirmed.length,1);
});
test('stale question, cancel during ASR, invalid sequence and PCM limit fail closed',async()=>{
 let finish;const p=peer(()=>new Promise(r=>{finish=r;}));p.v.receive(start);
 for(let i=0;i<16;i++)p.v.receive(chunk(i));p.v.receive({type:'voiceEnd',id:start.id,chunks:16});await flush();
 p.remove();finish('回答');await flush();assert.equal(p.sent.at(-1).type,'voiceError');assert.equal(p.confirmed.length,0);
 const q=peer();q.v.receive(start);q.v.receive(chunk(1));assert.equal(q.sent.at(-1).type,'voiceError');
 const b=peer();b.v.receive(start);for(let i=0;i<626;i++)b.v.receive(chunk(i));assert.equal(b.sent.at(-1).type,'voiceError');
 const c=peer();c.v.receive({...start,uiId:'old-question'});assert.equal(c.sent.at(-1).type,'voiceError');
});
test('free text preserves native question identity and is cleared by a PC plain-text response',()=>{
 const m=new NativeQuestionLog('chat');
 const call={type:'response_item',timestamp:new Date().toISOString(),payload:{type:'function_call',name:'request_user_input_async',call_id:'call_size',arguments:JSON.stringify({questions:[{title:'寸法は？'}]})}};
 m.consume(call);m.consume({type:'response_item',payload:{type:'function_call_output',call_id:'call_size',output:'{"accepted":true}'}});
 const q=m.pending()[0];assert.equal(q.freeText,true);
 const reply=questionReply(q,'10×10×4cm');assert.match(reply,/10×10×4cm/);
 assert.throws(()=>questionReply(q,''));assert.throws(()=>questionReply(q,'x\nunsafe'));
 const state={id:'chat',hostId:'local',cwd:'D:/test',turns:[{turnId:'turn',status:'inProgress',items:[{type:'agentMessage',id:'call_size',questions:[{title:'寸法は？'}]}]}]};
 assert.ok(assertQuestion(state,'chat',q));
 state.turns[0].items[0].questions[0].options=null;assert.ok(assertQuestion(state,'chat',q));
 state.turns[0].items[0].questions[0].options=['別の選択肢'];assert.throws(()=>assertQuestion(state,'chat',q));
 state.turns[0].items[0].questions[0].options=null;state.turns[0].items[0].questions[0].title='違う質問';assert.throws(()=>assertQuestion(state,'chat',q));
 m.consume({type:'response_item',payload:{type:'message',role:'user',content:[{type:'input_text',text:'10×10×4cm'}]}});assert.equal(m.pending().length,0);
});
const edge=(c,button,phase)=>c.control({type:'button',button,phase});
function wire(c,packet){c.control({type:'wire',transport:'bluetooth-ble',data:JSON.stringify(packet)+'\n'});}
async function fixture(){return createSimulationController(await loadApplication(path.join(__dirname,'../simulation/runtime')),{demo:true,transcribe:async()=> '縦横10cm、高さ4cmです'});}
test('shared target application records only on A hold, pins session, reviews, and sends on a second A short press',async()=>{
 const c=await fixture();wire(c,{type:'sessions',sessions:[session]});
 assert.equal(c.snapshot().snapshot.freeText,true);assert.equal(c.snapshot().snapshot.waitingCount,1);
 edge(c,'A','down');c.tick(699);assert.equal(c.snapshot().snapshot.voiceState,'idle');c.tick(1);
 assert.equal(c.snapshot().snapshot.voiceState,'recording');
 c.control({type:'background',status:'waiting'});assert.equal(c.snapshot().snapshot.sessionId,'free');
 for(let i=0;i<4;i++)c.control({type:'audio',samples:Array(2048).fill(2000)});
 edge(c,'A','up');c.tick(500);await flush();c.tick(500);
 assert.equal(c.snapshot().snapshot.voiceState,'review');assert.equal(c.snapshot().metrics.syntheticReplies,0);
 assert.match(c.snapshot().snapshot.voiceMessage,/高さ4cm/);
 edge(c,'A','down');c.tick(50);edge(c,'A','up');c.tick(100);
 assert.equal(c.snapshot().metrics.syntheticReplies,1);assert.equal(c.snapshot().snapshot.voiceState,'received');
 c.tick(2100);assert.equal(c.snapshot().snapshot.voiceState,'idle');
});
test('shared application cancels recording on question replacement or disconnect; short A does not record',async()=>{
 const c=await fixture();wire(c,{type:'sessions',sessions:[session]});edge(c,'A','down');c.tick(30);edge(c,'A','up');
 assert.equal(c.snapshot().snapshot.voiceState,'idle');assert.equal(c.snapshot().metrics.syntheticReplies,0);
 edge(c,'A','down');c.tick(700);wire(c,{type:'sessions',sessions:[{...session,ui:{...session.ui,id:'replacement'}}]});c.tick(10);
 assert.equal(c.snapshot().snapshot.voiceState,'idle');edge(c,'A','up');assert.equal(c.snapshot().metrics.syntheticReplies,0);
 edge(c,'A','down');c.tick(700);c.control({type:'hardware',connected:false});c.tick(10);assert.equal(c.snapshot().snapshot.voiceState,'idle');
});
