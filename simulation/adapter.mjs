import '/gar-components/m5sticks3.mjs';
import '/gar-components/controls.mjs';
import '/gar-components/event-log.mjs';
import '/gar-components/connection-status.mjs';
import { JsonTransport } from '/gar-components/json-transport.mjs';

// The browser only displays the PC application's framebuffer and sends test I/O.
// UI, protocol, lease and button logic run together in the Node-hosted C++ app.
const device=document.querySelector('#device'),controls=document.querySelector('#scenarios');
const log=document.querySelector('#log'),answer=document.querySelector('#answer'),debug=document.querySelector('#snapshot');
const screen=document.querySelector('#screen'),context=screen.getContext('2d');
const params=new URLSearchParams(location.search);
const liveConnection=new EventTarget();liveConnection.connected=false;
let frame=-1,eventSequence=0,stopped=false,timer,liveTransport,lastState,queue=Promise.resolve();
async function request(url,command) {
  const response=await fetch(url,command?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)}:{cache:'no-store'});
  if(!response.ok)throw Error(`PCシミュレータへの接続に失敗しました (${response.status})`);
  return response.json();
}
function show(state) {
  lastState=state;
  if(device.powered!==state.hardware.powered)device.powered=state.hardware.powered;
  controls.values={...state.hardware,scenario:state.scenario};
  debug.textContent=JSON.stringify({application:state.snapshot,ble:state.ble,transport:state.hardware.transport,metrics:state.metrics,elapsedMs:state.elapsedMs},null,2);
  answer.textContent=state.result;
  screen.setAttribute('aria-label',state.snapshot.label||'VibeRemote screen');
  if(state.events.at(-1)?.sequence<eventSequence)eventSequence=0;
  for(const item of state.events)if(item.sequence>eventSequence){log.append(item.text);eventSequence=item.sequence;}
  if(liveConnection.connected!==state.liveConnected){
    liveConnection.connected=state.liveConnected;
    liveConnection.dispatchEvent(new CustomEvent('connection',{detail:{connected:state.liveConnected}}));
  }
}
function control(command) {
  // Preserve down/up ordering even when HTTP responses arrive at different times.
  queue=queue.then(()=>request('/api/control',command)).then(show).catch(error=>{
    answer.textContent='PCシミュレータとの接続が切れました。GARで起動状態を確認してください。';log.append(String(error));
  });
  return queue;
}
async function poll() {
  try {
    const state=await request('/api/state');
    show(state);
    if(state.frame!==frame) {
      const response=await fetch('/api/frame',{cache:'no-store'});
      if(!response.ok)throw Error('画面を取得できませんでした');
      const bytes=new Uint8ClampedArray(await response.arrayBuffer());
      if(bytes.length!==state.width*state.height*4)throw Error('画面のサイズが一致しません');
      if(screen.width!==state.width)screen.width=state.width;
      if(screen.height!==state.height)screen.height=state.height;
      context.putImageData(new ImageData(bytes,state.width,state.height),0,0);frame=state.frame;
    }
  } catch(error) {
    answer.textContent='PCシミュレータとの接続が切れました。GARで起動状態を確認してください。';
    frame=-1;
  } finally {if(!stopped)timer=setTimeout(poll,100);}
}
function startLive() {
  document.querySelector('#scenario-panel').hidden=true;
  document.querySelector('#live-panel').hidden=false;
  document.querySelector('#mode-label').textContent='Codex · 閲覧';
  document.querySelector('#intro').textContent='Codexの状態を表示します。回答は実機から行ってください。';
  document.querySelector('#a-guide').textContent='一覧で決定';
  document.querySelector('#live-status').source=liveConnection;
  document.querySelector('#result-heading').textContent='本番表示';
  document.querySelector('.result .section-label').textContent='STATUS';
  document.querySelector('#answer-note').textContent='B長押しでセッション一覧を確認できます。YES／NOの回答は実機から行ってください。';

}
device.addEventListener('gar-button',({detail})=>control({type:'button',button:detail.button,phase:detail.phase}));
window.addEventListener('pagehide',()=>{stopped=true;clearTimeout(timer);liveTransport?.close();},{once:true});
window.vibeSimulator=Object.freeze({snapshot:()=>structuredClone(lastState?.snapshot)});
startLive();poll();
