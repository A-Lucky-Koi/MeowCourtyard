const {test}=require('node:test'),assert=require('node:assert/strict');
const A=require('../src/animations.js');
test('walk cycles through eight distinct frames without crossing into eating',()=>{assert.deepEqual(Array.from({length:8},(_,i)=>A.frameAt('walk',i*115)),[0,1,2,3,4,5,6,7]);assert.equal(A.frameAt('walk',920),0);});
test('eating reaches every stage with a longer swallow and seamless loop',()=>{let time=0;for(let i=0;i<8;i++){assert.equal(A.frameAt('eat',time),8+i);assert.equal(A.frameAt('eat',time+A.durations[i]-1),8+i);time+=A.durations[i];}assert.equal(A.frameAt('eat',time),8);assert.equal(A.stages[6],'吞咽');});

function fixture(items=[]){
  let time=0,nextId=1,intersection,mutation;
  const frames=new Map(),images=[],listeners=new Map(),motionListeners=new Map();
  const motion={matches:false,addEventListener:(type,cb)=>motionListeners.set(type,cb),removeEventListener:type=>motionListeners.delete(type)};
  const document={hidden:false,documentElement:{},querySelectorAll:()=>items.filter(el=>el.isConnected),addEventListener:(type,cb)=>listeners.set(type,cb),removeEventListener:type=>listeners.delete(type)};
  const env={document,performance:{now:()=>time},matchMedia:()=>motion,requestAnimationFrame(cb){const id=nextId++;frames.set(id,cb);return id;},cancelAnimationFrame:id=>frames.delete(id),CustomEvent:class{constructor(type,options){this.type=type;Object.assign(this,options);}},
    Image:class{constructor(){images.push(this);this.decoded=new Promise(resolve=>this.finishDecode=resolve);}decode(){return this.decoded;}},
    IntersectionObserver:class{constructor(cb){intersection=cb;}observe(){}unobserve(){}disconnect(){}},
    MutationObserver:class{constructor(cb){mutation=cb;}observe(){}disconnect(){}}
  };
  const player=A.createPlayer(env);
  return {player,images,frames,document,motion,
    async load(index=0){images[index].onload();await Promise.resolve();images[index].finishDecode();await new Promise(resolve=>setImmediate(resolve));},
    visible(el,value=true){intersection([{target:el,isIntersecting:value}]);},
    at(value){time=value;const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(time);},
    hidden(value){document.hidden=value;listeners.get('visibilitychange')();},
    reduced(value){motion.matches=value;motionListeners.get('change')();},
    mutate(el,attributeName){mutation([{type:'attributes',target:el,attributeName}]);}
  };
}
function cat(id=0,mode='walk',extra={}){return {isConnected:true,nodeType:1,dataset:{catAnimation:String(id),mode,...extra},style:{backgroundImage:'fallback',backgroundSize:'contain'},events:[],matches:()=>true,closest:()=>null,dispatchEvent(event){this.events.push(event);}};}

test('markup preserves the static pose until its atlas is decoded and accepts preview options',()=>{
  const html=A.markup(3,'eat','preview',{phase:false,paused:true,speed:.5,frame:14,preview:true});
  assert.match(html,/data-sprite-url="assets\/cat-animations\/cat-04.png"/);
  assert.match(html,/background-image:url\('assets\/cats\/cat-04-eat.png'\)/);
  for(const text of ['data-phase="0"','data-paused="true"','data-speed="0.5"','data-frame="14"','data-animation-preview="true"'])assert(html.includes(text));
  assert.equal(A.frameAt('walk',NaN),0);assert.equal(A.frameAt('eat',Infinity),8);
});

test('atlases decode once per breed, remain static while pending, and naturally offset cats',async()=>{
  const a=cat(),b=cat(),c=cat(1),f=fixture([a,b,c]);
  f.visible(a);f.visible(b);f.visible(c);
  assert.equal(f.images.length,2);assert.equal(f.frames.size,0);assert.equal(a.style.backgroundImage,'fallback');
  f.images[0].onload();await Promise.resolve();
  assert.equal(f.frames.size,0);assert.equal(a.dataset.animationReady,'loading');
  f.images[0].finishDecode();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(a.dataset.animationReady,'true');assert.equal(b.dataset.animationReady,'true');assert.match(a.style.backgroundImage,/cat-01.png/);assert.equal(a.style.backgroundSize,'400% 400%');
  await f.load(1);assert.equal(a.dataset.frame,'0');assert.equal(c.dataset.frame,'1');
  f.at(230);assert.equal(a.dataset.frame,'2');assert.equal(c.dataset.frame,'3');
  f.player.destroy();assert.equal(f.frames.size,0);
});

test('hidden and offscreen cats stop scheduling and resume without skipping animation time',async()=>{
  const el=cat(),f=fixture([el]);f.visible(el);await f.load();f.at(230);assert.equal(el.dataset.frame,'2');
  f.hidden(true);assert.equal(f.frames.size,0);f.at(10000);assert.equal(el.dataset.frame,'2');
  f.hidden(false);f.at(10115);assert.equal(el.dataset.frame,'3');
  f.visible(el,false);assert.equal(f.frames.size,0);f.at(20000);f.visible(el,true);f.at(20115);assert.equal(el.dataset.frame,'4');
  el.isConnected=false;f.player.refresh();assert.equal(f.frames.size,0);f.player.destroy();
});

test('preview can pause, wrap single steps, change speed, and restart without competing clocks',async()=>{
  const el=cat(0,'eat',{phase:'0',animationPreview:'true'}),f=fixture([el]);f.visible(el);await f.load();
  f.player.pause(el);assert.equal(f.frames.size,0);
  assert.equal(f.player.step(el,-1).frame,15);assert.equal(f.player.step(el).frame,8);
  assert.equal(f.player.seek(el,14).stage,'吞咽');
  f.player.restart(el);assert.equal(el.dataset.frame,'8');
  f.player.setSpeed(el,2);f.player.pause(el,false);f.at(120);assert.equal(el.dataset.frame,'9');
  el.dataset.speed='.5';f.mutate(el,'data-speed');f.at(560);assert.equal(el.dataset.frame,'10');
  el.dataset.paused='true';f.mutate(el,'data-paused');assert.equal(f.frames.size,0);
  el.dataset.frame='14';f.mutate(el,'data-frame');assert.equal(f.player.getState(el).stage,'吞咽');
  assert(el.events.some(event=>event.type==='cat-animation-frame'&&event.detail.frame===14));f.player.destroy();
});

test('reduced motion disables automatic playback but permits explicit single-frame inspection',async()=>{
  const el=cat(),f=fixture([el]);f.visible(el);await f.load();f.at(230);
  f.reduced(true);assert.equal(f.frames.size,0);assert.equal(f.player.step(el).frame,3);
  f.player.pause(el,false);assert.equal(f.frames.size,0);f.reduced(false);assert.equal(f.frames.size,1);f.player.destroy();
});

test('failed atlas loads retain the fallback and do not create an idle frame loop',async()=>{
  const el=cat(),f=fixture([el]);f.visible(el);f.images[0].onerror();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(el.dataset.animationReady,'error');assert.equal(el.style.backgroundImage,'fallback');assert.equal(f.frames.size,0);f.player.destroy();
  const empty=fixture();assert.equal(empty.frames.size,0);empty.player.destroy();
});
