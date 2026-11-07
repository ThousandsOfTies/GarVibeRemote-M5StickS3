// One bounded, explicitly confirmed voice answer. Audio/transcripts stay in memory.
const {randomUUID}=require('node:crypto');
const {decodeIma}=require('./ima_adpcm.cjs');
class VoiceReceiver {
  constructor({send,current,transcribe,confirm,now=Date.now,onEvent=()=>{}}) {
    Object.assign(this,{send,current,transcribe,confirm,now,onEvent});
  }
  valid(v=this.recording) {
    const s=this.current(v?.sessionId);
    return !!v && this.now()-v.at<180000 && s?.ui?.id===v.uiId && s.ui.state==='waiting' && s.ui.freeText===true;
  }
  clear() {this.recording=undefined;}
  update() {if(this.recording&&!this.valid())this.fail();}
  fail(reason='invalid-or-expired') {
    this.onEvent({event:'voice-failed',reason});
    if(this.recording)this.send({type:'voiceError',id:this.recording.id});
    this.clear();
  }
  receive(m) {
    if(!m?.type?.startsWith('voice'))return false;
    if(m.type==='voiceStart') {
      if(typeof m.id!=='string'||!/^[\w-]{1,80}$/.test(m.id))return true;
      this.clear();
      if(m.encoding!==undefined && m.encoding!=='ima-adpcm'){this.send({type:'voiceError',id:m.id});return true;}
      const v={id:m.id,sessionId:m.sessionId,uiId:m.uiId,encoding:m.encoding,at:this.now(),seq:0,size:0,chunks:[],phase:'capture',nonce:randomUUID()};
      if(!this.valid(v)){this.send({type:'voiceError',id:m.id});return true;}
      this.recording=v;this.onEvent({event:'voice-started'});return true;
    }
    const v=this.recording;
    if(!v||m.id!==v.id)return true;
    if(m.type==='voiceCancel'){this.clear();return true;}
    if(!this.valid()){this.fail();return true;}
    if(m.type==='voiceChunk') {
      if(v.phase!=='capture'||m.seq!==v.seq||typeof m.data!=='string'||m.data.length>684||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(m.data)) {this.fail();return true;}
      const bytes=Buffer.from(m.data,'base64');let pcm;
      try{pcm=v.encoding==='ima-adpcm'?decodeIma(bytes,m.samples):bytes;}catch{this.fail('invalid-audio-block');return true;}
      if(!pcm.length||pcm.length%2||bytes.length>512||v.size+pcm.length>320000){this.fail();return true;}
      v.chunks.push(pcm);v.size+=pcm.length;v.seq++;
      if(v.seq===1||v.seq%32===0)this.onEvent({event:'voice-transfer-progress',pcmBytes:v.size,elapsedMs:this.now()-v.at});
      this.send({type:'voiceChunkAck',id:v.id,seq:m.seq});return true;
    }
    if(m.type==='voiceEnd') {
      if(v.phase!=='capture'||v.size<6400||m.chunks!==v.seq){this.fail();return true;}
      v.phase='transcribing';const pcm=Buffer.concat(v.chunks);v.chunks=[];
      this.onEvent({event:'voice-audio-received',bytes:v.size});
      Promise.resolve().then(()=>this.transcribe(pcm)).then(text=>{
        if(this.recording!==v)return;
        if(!this.valid()||typeof text!=='string'||!text.trim()||Buffer.byteLength(text)>2000||/[\p{Cc}]/u.test(text)){this.fail();return;}
        v.text=text.trim();v.phase='review';this.onEvent({event:'voice-transcribed',characters:v.text.length});this.send({type:'voiceResult',id:v.id,text:v.text});
      }).catch(()=>{if(this.recording===v)this.fail('speech-recognition-failed');});return true;
    }
    if(m.type==='voiceConfirm'&&v.phase==='review') {
      // Only the transcript actually shown to this device can be submitted.
      this.clear();this.onEvent({event:'voice-confirmed'});this.confirm({type:'uiAction',sessionId:v.sessionId,uiId:v.uiId,actionId:'voice',text:v.text});return true;
    }
    this.fail();return true;
  }
}
module.exports={VoiceReceiver};
