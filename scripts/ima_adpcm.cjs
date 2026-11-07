// Standard IMA/DVI steps; block header matches the portable C++ encoder.
const steps=[7,8,9,10,11,12,13,14,16,17,19,21,23,25,28,31,34,37,41,45,50,55,60,66,73,80,88,97,107,118,130,143,157,173,190,209,230,253,279,307,337,371,408,449,494,544,598,658,724,796,876,963,1060,1166,1282,1411,1552,1707,1878,2066,2272,2499,2749,3024,3327,3660,4026,4428,4871,5358,5894,6484,7132,7845,8630,9493,10442,11487,12635,13899,15289,16818,18500,20350,22385,24623,27086,29794,32767];
const changes=[-1,-1,-1,-1,2,4,6,8];
function decodeIma(bytes,samples){
 if(!Number.isInteger(samples)||samples<1||samples>1017||bytes.length!==4+Math.ceil((samples-1)/2)||bytes[2]>88||bytes[3]!==0)throw Error('Invalid ADPCM block');
 const out=Buffer.alloc(samples*2);let predictor=bytes.readInt16LE(),index=bytes[2];out.writeInt16LE(predictor);
 for(let i=1;i<samples;i++){
  const code=i&1?bytes[4+((i-1)>>1)]>>4:bytes[4+((i-1)>>1)]&15,step=steps[index];
  const delta=(step>>3)+((code&4)?step:0)+((code&2)?step>>1:0)+((code&1)?step>>2:0);
  predictor=Math.max(-32768,Math.min(32767,predictor+((code&8)?-delta:delta)));index=Math.max(0,Math.min(88,index+changes[code&7]));out.writeInt16LE(predictor,i*2);
 }
 return out;
}
module.exports={decodeIma};
