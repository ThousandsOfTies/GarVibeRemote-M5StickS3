const {spawn}=require('node:child_process');
const path=require('node:path');
function transcribe(pcm) {
  const root=process.env.VIBEREMOTE_PRODUCT_ROOT||path.resolve(__dirname,'..');
  const python=path.join(root,'.gar','speech-python',process.platform==='win32'?'Scripts/python.exe':'bin/python');
  return new Promise((resolve,reject)=>{
    const child=spawn(python,[path.join(root,'scripts/speech_recognizer.py'),'transcribe'],{windowsHide:true,stdio:['pipe','pipe','ignore']});
    let output='',settled=false;
    const finish=(err,value)=>{if(settled)return;settled=true;clearTimeout(timer);err?reject(err):resolve(value);};
    const timer=setTimeout(()=>{child.kill();finish(Error('Speech recognition timed out'));},120000);
    child.on('error',()=>finish(Error('Run setup_remote.py voice-prepare first')));
    child.stdout.setEncoding('utf8');
    child.stdout.on('data',b=>{output+=b;if(output.length>16384){child.kill();finish(Error('Speech output too large'));}});
    child.on('close',code=>{try{if(code!==0)throw Error();finish(null,JSON.parse(output).text);}catch{finish(Error('Speech recognition failed'));}});
    child.stdin.on('error',()=>{});child.stdin.end(pcm);
  });
}
module.exports={transcribe};
