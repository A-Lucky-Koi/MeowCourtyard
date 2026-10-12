(function(root){
'use strict';
const durations=[240,220,240,170,170,180,300,260];
const stages=['准备进食','低头靠近','啃咬猫粮','慢慢咀嚼','慢慢咀嚼','咀嚼一下','吞咽','满足抬头'];
const eatCycle=durations.reduce((a,b)=>a+b,0);
const modeOf=mode=>mode==='eat'?'eat':'walk';
const cycleOf=mode=>modeOf(mode)==='eat'?eatCycle:920;
const speedOf=value=>Number.isFinite(Number(value))?Math.max(.25,Math.min(3,Number(value))):1;
const timeOf=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
const escapeAttr=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function frameAt(mode,time){
  if(modeOf(mode)!=='eat')return Math.floor(timeOf(time)/115)%8;
  let t=timeOf(time)%eatCycle;
  for(let i=0;i<8;i++){if(t<durations[i])return i+8;t-=durations[i];}
  return 15;
}
function frameTime(mode,frame){
  const first=modeOf(mode)==='eat'?8:0;
  const index=((Math.trunc(Number(frame)||0)-first)%8+8)%8;
  return first?durations.slice(0,index).reduce((a,b)=>a+b,0):index*115;
}
function markup(id,mode,cls='',options={}){
  id=Math.max(0,Math.min(29,Math.trunc(Number(id)||0)));mode=modeOf(mode);
  const number=String(id+1).padStart(2,'0'),name=root.MeowData?.cats[id]?.name||'猫咪'+(id+1);
  const phase=options.phase===false?0:options.phase;
  const attrs=[`data-cat-animation="${id}"`,`data-mode="${mode}"`,`data-sprite-url="assets/cat-animations/cat-${number}.png"`,`data-speed="${speedOf(options.speed??1)}"`];
  if(options.paused)attrs.push('data-paused="true"');
  if(phase!==undefined)attrs.push(`data-phase="${timeOf(phase)}"`);
  if(options.frame!==undefined)attrs.push(`data-frame="${frameAt(mode,frameTime(mode,options.frame))}"`);
  if(options.preview)attrs.push('data-animation-preview="true"');
  // Keep a small, already-used pose visible while the atlas loads and decodes.
  return `<span class="cat-visual cat-animated ${escapeAttr(cls)}" ${attrs.join(' ')} role="img" aria-label="${escapeAttr(name)}，${mode==='eat'?'连续进食动作':'连续散步动作'}" style="background-image:url('assets/cats/cat-${number}-${mode==='eat'?'eat':'walk1'}.png');background-size:contain;background-position:center"></span>`;
}
function createPlayer(env){
  const doc=env.document,entries=new Map(),images=new Map();
  const motion=env.matchMedia('(prefers-reduced-motion: reduce)');
  const now=()=>env.performance.now();
  let raf=0,lastPaint=0,destroyed=false;
  const isPaused=el=>el.dataset.paused==='true'||el.dataset.paused==='1';
  const phaseOf=el=>el.dataset.phase!==undefined?timeOf(el.dataset.phase):(Number(el.dataset.catAnimation)||0)*137%cycleOf(el.dataset.mode);
  const active=e=>e.ready&&e.visible&&!e.paused&&!doc.hidden&&!motion.matches&&e.el.isConnected;
  function advance(e,time){if(active(e)&&e.lastAt!==null)e.elapsed+=Math.max(0,time-e.lastAt)*e.speed;e.lastAt=active(e)?time:null;}
  function detail(e){const frame=e.frame<0?frameAt(e.mode,e.elapsed):e.frame;return {frame,index:frame%8+1,total:8,mode:e.mode,stage:e.mode==='eat'?stages[frame-8]:'散步 · 第 '+(frame+1)+' 帧',paused:e.paused,speed:e.speed,ready:e.ready};}
  function paint(e){
    const frame=frameAt(e.mode,e.elapsed),changed=frame!==e.frame;
    e.frame=frame;if(e.el.dataset.frame!==String(frame))e.el.dataset.frame=String(frame);
    if(e.ready)e.el.style.backgroundPosition=(frame%4)*100/3+'% '+Math.floor(frame/4)*100/3+'%';
    if(e.mode==='eat'){
      const bubble=e.el.closest('.garden-cat')?.querySelector('.state-bubble');
      if(bubble){bubble.hidden=false;if(bubble.textContent!==stages[frame-8])bubble.textContent=stages[frame-8];}
    }
    if(changed&&e.el.dataset.animationPreview==='true')e.el.dispatchEvent(new env.CustomEvent('cat-animation-frame',{bubbles:true,detail:detail(e)}));
  }
  function schedule(){
    if(destroyed||raf||doc.hidden||motion.matches)return;
    for(const e of entries.values())if(active(e)){raf=env.requestAnimationFrame(tick);break;}
  }
  function tick(time){
    raf=0;
    if(time-lastPaint>=45){lastPaint=time;for(const e of entries.values()){advance(e,time);if(active(e))paint(e);}}
    schedule();
  }
  function stopWhenIdle(){
    if(raf&&![...entries.values()].some(active)){env.cancelAnimationFrame(raf);raf=0;}
  }
  function atlas(url){
    if(!images.has(url)){
      const img=new env.Image();img.decoding='async';
      const ready=new Promise(resolve=>{
        img.onload=async()=>{try{if(img.decode)await img.decode();resolve(true);}catch{resolve(false);}};
        img.onerror=()=>resolve(false);img.src=url;
      });
      images.set(url,{img,ready});
    }
    return images.get(url).ready;
  }
  function visible(el){
    const box=el.getBoundingClientRect();
    return box.width>0&&box.height>0&&box.bottom>0&&box.right>0&&box.top<(env.innerHeight||doc.documentElement.clientHeight)&&box.left<(env.innerWidth||doc.documentElement.clientWidth);
  }
  const observer=env.IntersectionObserver?new env.IntersectionObserver(changes=>{
    const time=now();for(const change of changes){const e=entries.get(change.target);if(!e)continue;advance(e,time);e.visible=change.isIntersecting;e.lastAt=active(e)?time:null;}
    stopWhenIdle();schedule();
  },{threshold:0}):null;
  function register(el){
    if(entries.has(el))return entries.get(el);
    const mode=modeOf(el.dataset.mode),e={el,mode,phase:el.dataset.phase,elapsed:motion.matches?0:phaseOf(el),paused:isPaused(el),speed:speedOf(el.dataset.speed??1),visible:observer?false:visible(el),ready:false,lastAt:null,frame:-1};
    if(el.dataset.frame!==undefined)e.elapsed=frameTime(mode,el.dataset.frame);
    entries.set(el,e);observer?.observe(el);paint(e);
    const url=el.dataset.spriteUrl||'assets/cat-animations/cat-'+String(Number(el.dataset.catAnimation)+1).padStart(2,'0')+'.png';
    el.dataset.animationReady='loading';
    atlas(url).then(ok=>{
      if(destroyed||entries.get(el)!==e)return;
      if(!ok){el.dataset.animationReady='error';return;}
      e.ready=true;el.style.backgroundImage='url("'+url.replace(/["\\\n\r]/g,'')+'")';el.style.backgroundSize='400% 400%';el.dataset.animationReady='true';
      e.lastAt=active(e)?now():null;paint(e);
      el.dispatchEvent(new env.CustomEvent('cat-animation-ready',{bubbles:true,detail:detail(e)}));schedule();
    });
    return e;
  }
  function sync(el){
    const e=register(el),time=now();advance(e,time);
    const mode=modeOf(el.dataset.mode);
    if(mode!==e.mode||el.dataset.phase!==e.phase){e.mode=mode;e.phase=el.dataset.phase;e.elapsed=phaseOf(el);}
    if(el.dataset.frame!==undefined&&Number(el.dataset.frame)!==e.frame)e.elapsed=frameTime(e.mode,el.dataset.frame);
    e.paused=isPaused(el);e.speed=speedOf(el.dataset.speed??1);e.lastAt=active(e)?time:null;paint(e);stopWhenIdle();schedule();return e;
  }
  function refresh(){
    if(destroyed)return;
    for(const [el] of entries)if(!el.isConnected||!el.matches('.cat-animated')){observer?.unobserve(el);entries.delete(el);}
    for(const el of doc.querySelectorAll('.cat-animated'))if(!entries.has(el))register(el);
    stopWhenIdle();schedule();
  }
  const mutations=new env.MutationObserver(changes=>{
    let refreshNeeded=false;
    for(const change of changes){
      if(change.type==='childList'){
        const containsCat=node=>node.nodeType===1&&(node.matches?.('.cat-animated')||node.querySelector?.('.cat-animated'));
        if([...change.addedNodes,...change.removedNodes].some(containsCat))refreshNeeded=true;
        continue;
      }
      const el=change.target,e=entries.get(el);if(!e)continue;
      // Our rendered data-frame is also public. Ignore our own writes.
      if(change.attributeName==='data-frame'&&Number(el.dataset.frame)===e.frame)continue;
      sync(el);
    }
    if(refreshNeeded)refresh();
  });
  mutations.observe(doc.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['data-mode','data-paused','data-speed','data-phase','data-frame']});
  function visibilityChanged(){
    const time=now();for(const e of entries.values()){e.lastAt=active(e)?time:null;}
    stopWhenIdle();schedule();
  }
  function motionChanged(){for(const e of entries.values()){e.lastAt=active(e)?now():null;paint(e);}stopWhenIdle();schedule();}
  function viewportChanged(){const time=now();for(const e of entries.values()){advance(e,time);e.visible=visible(e.el);e.lastAt=active(e)?time:null;}stopWhenIdle();schedule();}
  doc.addEventListener('visibilitychange',visibilityChanged);
  if(motion.addEventListener)motion.addEventListener('change',motionChanged);else motion.addListener?.(motionChanged);
  if(!observer){env.addEventListener?.('scroll',viewportChanged,true);env.addEventListener?.('resize',viewportChanged);}
  refresh();
  return {
    refresh,
    getState(el){return detail(entries.get(el)||register(el));},
    pause(el,paused=true){el.dataset.paused=String(Boolean(paused));return detail(sync(el));},
    setSpeed(el,speed){el.dataset.speed=String(speedOf(speed));return detail(sync(el));},
    seek(el,frame){const e=register(el);advance(e,now());e.elapsed=frameTime(e.mode,frame);e.lastAt=active(e)?now():null;paint(e);return detail(e);},
    step(el,delta=1){const e=register(el);advance(e,now());e.paused=true;el.dataset.paused='true';e.elapsed=frameTime(e.mode,frameAt(e.mode,e.elapsed)+(Math.trunc(Number(delta))||1));e.lastAt=null;paint(e);stopWhenIdle();return detail(e);},
    restart(el){const e=register(el);e.elapsed=0;e.lastAt=active(e)?now():null;paint(e);schedule();return detail(e);},
    destroy(){destroyed=true;if(raf)env.cancelAnimationFrame(raf);raf=0;observer?.disconnect();mutations.disconnect();entries.clear();images.clear();doc.removeEventListener('visibilitychange',visibilityChanged);if(motion.removeEventListener)motion.removeEventListener('change',motionChanged);else motion.removeListener?.(motionChanged);if(!observer){env.removeEventListener?.('scroll',viewportChanged,true);env.removeEventListener?.('resize',viewportChanged);}}
  };
}
const api={frameAt,markup,durations,stages,createPlayer};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
else{root.MeowAnimations=api;Object.assign(api,createPlayer(root));}
})(typeof globalThis!=='undefined'?globalThis:this);
