// Production attaches the same PC relay through the SDK byte endpoint.
// Explicit isolated tests can attach their synthetic peer instead.
const longQuestion = '画面の変更とテストが完了しました。修正した内容を確認してから、次の作業へ進めてもよいですか？本文はゆっくり自動スクロールします。読み終えたらB短押しでYESまたはNOにフォーカスを合わせ、Aで決定してください。ほかのセッションを確認するときはB長押しで一覧を開き、B短押しで順番に選び、Aで切り替えます。今回は接続試験なので、PCのファイルや設定は変更しません。';
const yesNo = [{id:'yes',label:'YES'}, {id:'no',label:'NO'}];
const choices = [{id:'continue',label:'続ける'}, {id:'revise',label:'修正する'}, {id:'stop',label:'中止する'}];
const scenarioNames = new Set(['multi','long','short','choices','running','idle','done','failed','text']);
const links = {'usb-serial':1,'bluetooth-ble':3};
const {VoiceReceiver}=require('./voice_receiver.cjs');
const {createSdkBytePort}=require('./sdk-byte-port.cjs');

function createSimulationController(module, options={}) {
  const externalPeer=options.demo!==true;
  if(options.demo && options.externalPeer)throw Error('Cannot attach two PC peers');
  let peerData,upstreamConnected=false;
  let now=0, serial=0, lastPing=0, mode=options.demo===true?'demo':'live', scenarioName='multi', transport='bluetooth-ble';
  let powered=true, connected=true, reject=false, charging=false, battery=82, liveConnected=false;
  let result='まだ回答していません';
  const fragments=new Map();
  const states=new Map(), receipts=new Map(), events=[];
  const metrics={incomingPackets:0,outgoingPackets:0,syntheticReplies:0,acknowledgements:0,droppedReplies:0};
  const read=name=>{const ptr=module[`_gar_app_${name}`]();const value=module.UTF8ToString(ptr);return value?JSON.parse(value):null;};
  const event=text=>{events.push({sequence:(events.at(-1)?.sequence??0)+1,text});if(events.length>60)events.shift();};
  const active=()=>powered && connected && (mode==='demo' || liveConnected);
  const voice=new VoiceReceiver({send:p=>send(p),current:id=>{
      const s=read('snapshot');return mode==='demo'&&active()&&s.sessionId===id?{ui:{id:s.uiId,state:s.state,freeText:s.freeText}}:undefined;
    },
    transcribe:options.transcribe??(async()=>{throw Error('No simulated speech provider');}),
    confirm:m=>{
      // Isolated simulator confirmation; never enters Codex or production transport.
      result=`音声回答：${m.text}`;metrics.syntheticReplies++;
      send({type:'ack',...m,type:'ack',ok:true});
    },now:()=>now});
  function wire(link, bytes) {
    const encoded=Buffer.from(bytes,'utf8');
    const pointer=module._malloc(Math.max(1,encoded.length));
    if(!pointer)throw Error('Application receive buffer could not be allocated');
    try {
      const chunkSize=link==='bluetooth-ble'?20:encoded.length;
      for(let offset=0;offset<encoded.length;offset+=chunkSize){
        const chunk=encoded.subarray(offset,offset+chunkSize);module.HEAPU8.set(chunk,pointer);
        module._gar_app_feed_bytes(links[link],pointer,chunk.length);if(link==='bluetooth-ble')module._gar_app_tick(0);
      }
    } finally {module._free(pointer);}
  }
  function send(packet, link=transport) {
    if(!active())return;
    wire(link,JSON.stringify(packet)+'\n');metrics.incomingPackets++;
    event(`${mode==='live'?'本番PC':'模擬PC'} → 本体 / ${link}：${packet.type}`);
  }
  function hardware() {
    module._gar_app_hardware(+powered,battery,0,0);module._gar_app_charging(+charging);
    module._gar_app_ble_hardware(1,+(transport==='bluetooth-ble'&&active()));
  }
  function connect() {
    hardware();
    if(active()) {
      send({type:'hello'});lastPing=now;
      send({type:'sessions',sessions:[...states.values()]});
    }
  }
  function disconnect() {
    // Model the transport epoch reset, not a direct UI connection flag.
    module._gar_app_transport_reset(1,0);module._gar_app_transport_reset(2,0);
    module._gar_app_ble_hardware(1,0);fragments.clear();
    hardware();
  }
  function state(id,name,status,message,actions=[]) {
    return {type:'state',session:{id,name},agent:{status,message},
      ui:{id:`synthetic-${++serial}`,state:status,message,actions:structuredClone(actions)}};
  }
  function scenario(name) {
    if(!scenarioNames.has(name))throw Error('Unknown scenario');
    scenarioName=name;receipts.clear();states.clear();
    send({type:'sessions',sessions:[]});
    const messages={long:longQuestion,short:'次の作業へ進めてもよいですか？',
      choices:'テスト結果を確認しました。この後の進め方を選んでください。',
      running:'画面の実装を進めています。完了したら結果をお知らせします。',
      idle:'次の指示を待っています。',done:'変更が完了しました。テストはすべて成功しました。',
      failed:'接続先から応答がありません。PC側の状態を確認してください。'};
    const waiting=['long','short','choices'].includes(name);
    const examples=name==='multi'?[
      state('screen','画面の改善','waiting',longQuestion,yesNo),
      state('notes','調査メモ','running','通信方式について調査しています。資料を確認し、結果をまとめています。'),
      state('release','公開の確認','waiting','確認用の成果物を公開してもよいですか？この質問も模擬試験です。',yesNo),
    ]:[state('screen','画面の改善',waiting?'waiting':name,messages[name],waiting?(name==='choices'?choices:yesNo):[])];
    if(name==='text'){examples.splice(0,examples.length,{session:{id:'speech-test',name:'音声回答の試験'},ui:{id:`text-${++serial}`,state:'waiting',freeText:true,message:'ケースの幅・奥行・高さを教えてください。A長押しで録音します。',actions:[]}});}
    for(const value of examples)states.set(value.session.id,value);
    send({type:'sessions',sessions:examples});result='まだ回答していません';
  }
  function outputs() {
    for(let count=0;count<256;count++) {
      const output=read('take_output');if(!output)break;
      if(output.type==='pairing-confirm') {event(`模擬Bluetooth認証：${output.accepted?'YES':'NO'}`);continue;}
      if(typeof output.data!=='string')continue;
      if(externalPeer){if(output.transport==='bluetooth-ble'){metrics.outgoingPackets++;peerData?.(Buffer.from(output.data));}continue;}
      const buffered=(fragments.get(output.transport)||'')+output.data;
      const complete=buffered.split('\n');fragments.set(output.transport,complete.pop());
      for(const line of complete.filter(Boolean)) {
        let message;try{message=JSON.parse(line);}catch{continue;}
        metrics.outgoingPackets++;event(`本体 → 模擬PC / ${output.transport}：${message.type.startsWith('voice')?message.type:line}`);
        if(mode==='demo' && voice.receive(message))continue;
        if(message.type!=='uiAction')continue;
        // Only the explicit isolated peer below fabricates test receipts.
        if(mode!=='demo' || !active() || output.transport!==transport){metrics.droppedReplies++;continue;}
        const source=states.get(message.sessionId), action=source?.ui.actions.find(a=>a.id===message.actionId);
        if(!source || source.ui.id!==message.uiId || !action){metrics.droppedReplies++;continue;}
        metrics.syntheticReplies++;result=`${source.session.name}：${action.label} を模擬PCで受信しました`;
        const key=JSON.stringify([message.sessionId,message.uiId,message.actionId]);
        receipts.set(key,{...message,key,link:output.transport,due:now+500,reject,name:source.session.name,label:action.label});
      }
    }
  }
  function tick(deltaMs) {
    if(!Number.isInteger(deltaMs)||deltaMs<0||deltaMs>60000)throw Error('Invalid elapsed time');
    // A long deterministic advance still gives the synthetic PC its heartbeat
    // opportunities. This is a byte-stream peer, not a forced UI connection.
    let remaining=deltaMs;
    do {
    const step=Math.min(remaining,250);remaining-=step;now+=step;
    if(!externalPeer && active() && now-lastPing>=2000){send({type:'ping'});lastPing=now;}
    module._gar_app_tick(step);outputs();
    for(const receipt of receipts.values()) {
      if(receipt.due>now || !active())continue;
      receipts.delete(receipt.key);
      if(mode!=='demo' || receipt.link!==transport || states.get(receipt.sessionId)?.ui.id!==receipt.uiId)continue;
      send({type:'ack',sessionId:receipt.sessionId,uiId:receipt.uiId,actionId:receipt.actionId,ok:!receipt.reject});
      metrics.acknowledgements++;
      result=receipt.reject?`${receipt.name}：受信エラー。選び直して再送できます。`:`${receipt.name}：${receipt.label} を受信・確認しました`;
    }
    module._gar_app_tick(0);outputs();
    } while(remaining>0);
  }
  function control(command) {
    if(!command || typeof command!=='object' || Array.isArray(command))throw Error('Invalid control');
    if(externalPeer && !['button','audio'].includes(command.type))throw Error('Production input comes from the PC relay');
    if(command.type==='button') {
      if(!['A','B'].includes(command.button)||!['down','up','cancel'].includes(command.phase))throw Error('Invalid button');
      module._gar_app_button(command.button.charCodeAt(0),command.phase==='down'?1:command.phase==='up'?0:-1);
    } else if(command.type==='audio') {
      if((mode!=='demo'&&!externalPeer)||!Array.isArray(command.samples)||command.samples.length>4096||command.samples.some(x=>!Number.isInteger(x)||x < -32768||x>32767))throw Error('Invalid PCM');
      const pcm=new Int16Array(command.samples),ptr=module._malloc(pcm.byteLength);
      try{module.HEAPU8.set(new Uint8Array(pcm.buffer),ptr);module._gar_app_audio(ptr,pcm.length);}finally{module._free(ptr);}
    } else if(command.type==='scenario') {
      if(mode!=='demo')throw Error('Test scenarios require an isolated peer');scenario(command.name);
    } else if(command.type==='background') {
      if(mode!=='demo')throw Error('Test scenarios require an isolated peer');
      const selected=read('snapshot').sessionId;
      const id=[...states.keys()].find(id=>id!==selected)||'background';
      const status=command.status==='running'?'running':'waiting';
      const value=state(id,states.get(id)?.session.name||'別の作業',status,
        status==='running'?'別のセッションで作業を開始しました。':'別のセッションから確認が届きました。この後の進め方を選んでください。',status==='running'?[]:choices);
      states.set(id,value);send(value);
    } else if(command.type==='hardware') {
      const wasActive=active(), previous=transport;
      for(const name of ['powered','connected','reject','charging'])if(command[name]!==undefined&&typeof command[name]!=='boolean')throw Error('Invalid hardware');
      if(command.transport!==undefined&&!links[command.transport])throw Error('Invalid transport');
      if(command.battery!==undefined&&(!Number.isInteger(command.battery)||command.battery<0||command.battery>100))throw Error('Invalid battery');
      powered=command.powered??powered;connected=command.connected??connected;reject=command.reject??reject;charging=command.charging??charging;
      transport=command.transport??transport;battery=command.battery??battery;
      if(!active() || previous!==transport){receipts.clear();disconnect();}
      if(active() && (!wasActive || previous!==transport))connect();else hardware();
    } else if(command.type==='ble-event') {
      const ids={security:0,connect:1,authenticate:2,subscribe:3,disconnect:4,mtu:5,notifyFailure:6,reset:7};
      if(!(command.event in ids)||!Number.isInteger(command.value))throw Error('Invalid BLE event');
      module._gar_app_ble_event(ids[command.event],command.value);
    } else if(command.type==='wire') {
      // Isolated protocol tests use the same byte framing as USB/SPP.
      if(mode!=='demo'||!links[command.transport]||typeof command.data!=='string'||Buffer.byteLength(command.data)>65536)throw Error('Invalid wire input');
      wire(command.transport,command.data);
    } else throw Error('Unknown control');
    module._gar_app_tick(0);outputs();
  }
  module._gar_lv_init();module._gar_app_init();outputs();hardware();
  if(mode==='demo'){connect();scenario('multi');}else result='本番データの接続を待っています。';
  tick(0);
  const SerialPort=externalPeer?createSdkBytePort({
    subscribe:callback=>{peerData=callback;return ()=>{peerData=undefined;};},
    connect:()=>{liveConnected=true;hardware();outputs();},
    disconnect:()=>{liveConnected=false;upstreamConnected=false;disconnect();outputs();},
    write:bytes=>{if(!active())throw Error('SDK link disconnected');wire('bluetooth-ble',bytes);metrics.incomingPackets++;outputs();}
  }):undefined;
  return {tick,control,SerialPort,
    relayEvent:e=>{event(e.event);if(e.event==='upstream-connected')upstreamConnected=true;if(e.event==='upstream-disconnected')upstreamConnected=false;
      if(e.event==='answer-accepted')result='PCが回答を受信しました。元のチャットで配信結果を確認できます。';
      if(e.event==='answer-rejected')result='回答は受理されませんでした。元のチャットで確認してください。';},
    snapshot:()=>({snapshot:read('snapshot'),ble:read('ble_snapshot'),frame:module._gar_lv_frame(),width:module._gar_lv_width(),height:module._gar_lv_height(),
      mode,production:externalPeer,scenario:scenarioName,hardware:{powered,connected,reject,charging,battery,transport},liveConnected:externalPeer?upstreamConnected:liveConnected,result,events:[...events],metrics:{...metrics},elapsedMs:now}),
    frame:()=>Buffer.from(module.HEAPU8.subarray(module._gar_lv_framebuffer(),module._gar_lv_framebuffer()+module._gar_lv_width()*module._gar_lv_height()*4)),
  };
}
module.exports={createSimulationController};
