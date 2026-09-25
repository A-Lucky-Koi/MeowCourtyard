// Original synthesized effects, no third-party recordings.
const fs=require('node:fs'),path=require('node:path');
const out=path.join(__dirname,'../assets/audio');fs.mkdirSync(out,{recursive:true});
function wav(name,duration,fn){const rate=22050,n=Math.floor(duration*rate),b=Buffer.alloc(44+n*2);b.write('RIFF');b.writeUInt32LE(36+n*2,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);for(let i=0;i<n;i++){const t=i/rate,fade=Math.min(1,t/.04,(duration-t)/.15);b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,fn(t)*fade))*32760),44+i*2);}fs.writeFileSync(path.join(out,name+'.wav'),b);}
let seed=731;const noise=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296*2-1;};
wav('purr',3.2,t=>{const breath=.45+.3*Math.sin(2*Math.PI*.65*t);const pulse=Math.pow(.5+.5*Math.sin(2*Math.PI*26*t),2);return breath*(.32*Math.sin(2*Math.PI*78*t)+.17*Math.sin(2*Math.PI*131*t)+noise()*.15)*pulse;});
wav('merge',.45,t=>.3*Math.sin(2*Math.PI*(550*t+500*t*t))*Math.exp(-7*t));
wav('reward',1.1,t=>{const notes=[523.25,659.25,783.99,1046.5],i=Math.min(3,Math.floor(t/.2)),local=t-i*.2;return .24*Math.sin(2*Math.PI*notes[i]*local)*Math.exp(-5*local);});
console.log('Generated purr.wav, merge.wav, reward.wav');
