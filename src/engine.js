(function(root){
'use strict';
const D=typeof module!=='undefined'?require('./data.js'):root.MeowData;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const INITIAL_FROZEN_CELLS=Object.freeze([14,15,22,23,30,31,38,39,46,47,54,55]);
function isFrozen(s,index){return Array.isArray(s.frozenCells)&&s.frozenCells.includes(index);}
function adjacentCells(index){const cells=[];if(index%8>0)cells.push(index-1);if(index%8<7)cells.push(index+1);if(index>=8)cells.push(index-8);if(index<56)cells.push(index+8);return cells;}
function beijingDate(now=Date.now()){return new Date(now+8*60*60*1000).toISOString().slice(0,10);}
function validDate(value){if(value==='')return true;if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const parsed=new Date(value+'T00:00:00Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;}
function dailyStatus(s,now=Date.now()){
 const date=beijingDate(now),claimed=kind=>(s.dailyRewards[kind+'Date']||'')>=date;
 const energy=Math.min(30,s.energy+Math.floor(Math.max(0,now-s.energyAt)/300000));
 return {date,energy:{claimed:claimed('energy'),amount:10,available:!claimed('energy')&&energy<30},coins:{claimed:claimed('coins'),amount:300,available:!claimed('coins')}};
}
function claimDaily(s,kind,now=Date.now()){
 if(!['energy','coins'].includes(kind))return {ok:false,message:'没有这种每日奖励。'};
 const status=dailyStatus(s,now);
 if(status[kind].claimed)return {ok:false,message:'这份奖励已经领取，明天再来吧。'};
 if(!status[kind].available)return {ok:false,message:'体力已满，消耗体力后再领取，今日机会为你保留。'};
 let amount=300;
 if(kind==='energy'){recover(s,now);const before=s.energy;addEnergy(s,10,now);amount=s.energy-before;}else s.gold+=amount;
 s.dailyRewards[kind+'Date']=status.date;
 return {ok:true,kind,amount,date:status.date};
}
function newCat(id,map=0){return {id,map,affection:0,hunger:20,state:'walk',until:0,x:25+(id%4)*17,y:50+id%2*12,gifts:0,giftDay:'',sunDay:'',sunEarned:0,sunSeconds:0};}
function fresh(now=Date.now()){return {version:2,frozenCells:[...INITIAL_FROZEN_CELLS],dailyRewards:{energyDate:'',coinsDate:''},gold:1800,diamonds:60,energy:30,energyAt:now,stars:0,level:1,xp:0,map:0,maps:[{unlocked:true,capacity:3,decor:0},{unlocked:false,capacity:3,decor:0},{unlocked:false,capacity:3,decor:0},{unlocked:false,capacity:3,decor:0}],cats:[newCat(0),newCat(1)],board:null,lastSeen:now,daily:{date:'',claimed:false},stats:{merges:0,orders:0},sound:true};}
function recover(s,now=Date.now()) {let elapsed=Math.max(0,now-s.energyAt);if(s.energy>=30){s.energyAt=now;return;}const n=Math.floor(elapsed/300000);s.energy=clamp(s.energy+n,0,30);s.energyAt=s.energy===30?now:s.energyAt+n*300000;}
function addEnergy(s,n,now=Date.now()){recover(s,now);s.energy=clamp(s.energy+n,0,30);if(s.energy===30)s.energyAt=now;}
function makeOrder(level,index=0,rng=Math.random){const max=Math.min(6,2+Math.floor(level/4));const chain=index===0&&level===1?0:Math.floor(rng()*5);const l=index===0&&level===1?2:Math.max(2,max-(rng()<.6?0:1));return {cat:Math.floor(rng()*30),items:[{chain,level:l,count:1}],gold:15+15*l,stars:l>=5?3:l>=3?2:1};}
function enter(s,now=Date.now(),rng=Math.random){recover(s,now);if(s.board&&!s.board.finished)return {ok:true,resumed:true};if(s.energy<5)return {ok:false,message:'体力不足，需要5点体力。'};if(s.energy===30)s.energyAt=now;s.energy-=5;const cells=Array(64).fill(null);for(let i=0;i<5;i++){cells[i*2]={chain:i,level:1};cells[i*2+1]={chain:i,level:1};}s.board={cells,points:40,pointsAt:now,moves:160+Math.min(300,s.level*10),orders:[0,1,2].map(i=>makeOrder(s.level,i,rng)),done:0,target:3,finished:false};return {ok:true};}
function recoverPoints(b,now=Date.now()){if(!b||b.finished)return;const n=Math.floor(Math.max(0,now-b.pointsAt)/10000);b.points=Math.min(60,b.points+n);b.pointsAt=b.points===60?now:b.pointsAt+n*10000;}
function spawn(s,chain,now=Date.now()){const b=s.board;if(!b||b.finished)return {ok:false,message:'请先开始关卡。'};recoverPoints(b,now);if(b.moves<=0)return {ok:false,message:'步数已用完。'};if(b.points<1)return {ok:false,message:'生成点不足，每10秒恢复1点。'};const i=b.cells.findIndex((cell,index)=>cell===null&&!isFrozen(s,index));if(i<0)return {ok:false,message:'棋盘已满，先合成、交付或回收物品。'};if(!Number.isInteger(chain)||chain<0||chain>4)return {ok:false};if(b.points===60)b.pointsAt=now;b.points--;b.moves--;b.cells[i]={chain,level:1};return {ok:true,index:i};}
function move(s,from,to){const b=s.board;if(!b||b.finished||from===to||![from,to].every(i=>Number.isInteger(i)&&i>=0&&i<64)||!b.cells[from])return {ok:false};if(isFrozen(s,from)||isFrozen(s,to))return {ok:false,message:'冰封格暂时不能放物品，在旁边合成即可永久解冻。'};const a=b.cells[from],c=b.cells[to];if(!c){b.cells[to]=a;b.cells[from]=null;return {ok:true,merged:false,thawed:[]};}if(a.chain!==c.chain||a.level!==c.level)return {ok:false,message:'同一系列、同一等级才可以合成。'};if(a.level===6)return {ok:false,message:'已经是最高等级，可交付订单或回收。'};if(b.moves<=0)return {ok:false,message:'步数已用完。'};b.cells[to]={chain:a.chain,level:a.level+1};b.cells[from]=null;b.moves--;s.stats.merges++;const neighbors=adjacentCells(to),thawed=s.frozenCells.filter(index=>neighbors.includes(index));s.frozenCells=s.frozenCells.filter(index=>!thawed.includes(index));return {ok:true,merged:true,level:a.level+1,thawed};}
function orderIndices(b,order){const used=[];for(const wanted of order.items){for(let k=0;k<wanted.count;k++){const i=b.cells.findIndex((x,j)=>x&&x.chain===wanted.chain&&x.level===wanted.level&&!used.includes(j));if(i<0)return null;used.push(i);}}return used;}
// Allocate each physical item only once, even when an order repeats a requirement.
function orderProgress(board,order){
 const cells=board?.cells||[],used=new Set();
 const items=(order?.items||[]).map(wanted=>{
  const indices=[];
  for(let i=0;i<cells.length&&indices.length<wanted.count;i++){
   const item=cells[i];
   if(item&&item.chain===wanted.chain&&item.level===wanted.level&&!used.has(i)){indices.push(i);used.add(i);}
  }
  return {chain:wanted.chain,level:wanted.level,required:wanted.count,available:indices.length,missing:wanted.count-indices.length,ready:indices.length===wanted.count,indices};
 });
 return {items,ready:items.length>0&&items.every(item=>item.ready),available:items.reduce((sum,item)=>sum+item.available,0),required:items.reduce((sum,item)=>sum+item.required,0)};
}
// Project recovery for labels and hints without advancing any saved clocks.
function resourceTimers(s,now=Date.now()){
 const project=(value,at,cap,interval)=>{
  if(value>=cap)return {value:cap,cap,seconds:0};
  const ticks=Math.floor(Math.max(0,now-at)/interval),recovered=Math.min(cap,value+ticks);
  return {value:recovered,cap,seconds:recovered===cap?0:Math.max(0,Math.ceil((at+(ticks+1)*interval-now)/1000))};
 };
 return {energy:project(s.energy,s.energyAt,30,300000),points:s.board&&!s.board.finished?project(s.board.points,s.board.pointsAt,60,10000):null};
}
function getHint(s,now=Date.now()){
 const b=s.board;
 if(!b||b.finished)return {type:'blocked',reason:b?'finished':'inactive',message:b?'本关已完成，开始下一关继续收集吧。':'先开始关卡，再点击菜篮子生成物品。'};
 const progress=b.orders.map(order=>orderProgress(b,order)),ready=progress.findIndex(order=>order.ready);
 if(ready>=0)return {type:'deliver',orderIndex:ready,message:'这份猫咪订单已经集齐，点击交付就能领取奖励。'};
 if(b.moves<=0)return {type:'blocked',reason:'moves',message:'步数已用完，可以在商店查看步数补给；提示不会自动购买。'};
 let best=null;
 for(let from=0;from<64;from++){
  const a=b.cells[from];if(!a||a.level>=6||isFrozen(s,from))continue;
  for(let to=from+1;to<64;to++){
   const c=b.cells[to];if(!c||isFrozen(s,to)||a.chain!==c.chain||a.level!==c.level)continue;
   const cells=b.cells.slice();cells[from]=null;cells[to]={chain:a.chain,level:a.level+1};
   const after=b.orders.map(order=>orderProgress({cells},order));
   const completes=after.some(order=>order.ready);
   const improves=after.some((order,i)=>order.available>progress[i].available);
   const lost=after.reduce((sum,order,i)=>sum+Math.max(0,progress[i].available-order.available),0);
   for(const [source,target] of [[from,to],[to,from]]){
    const neighbors=adjacentCells(target),thawed=(s.frozenCells||[]).filter(index=>neighbors.includes(index));
    const rank=completes?3:improves?2:thawed.length?1:0;
    // Higher priority wins; ties preserve order ingredients, then melt more ice.
    const score=rank*1000-lost*20+thawed.length;
    if(!best||score>best.score)best={score,from:source,to:target,chain:a.chain,level:a.level+1,thawed,reason:rank>=2?'order':thawed.length?'ice':'merge',completes};
   }
  }
 }
 if(best){
  const {score,completes,...hint}=best,name=D.chains[hint.chain].names[hint.level-1];
  const message=hint.reason==='order'?`把亮起的两件物品合成${name}${completes?'，就能交付一份订单':'，离订单更近一步'}。`:hint.reason==='ice'?`把物品移到亮起的目标格合成，可永久解冻${hint.thawed.length}个冰格。`:`这两件相同物品可以合成${name}，点击或拖动其中一件到另一件上。`;
  return {type:'merge',...hint,message};
 }
 if(!b.cells.some((item,index)=>item===null&&!isFrozen(s,index)))return {type:'blocked',reason:'full',message:'可用格子已满，也没有可合成的物品；先回收不需要的物品腾出空间。'};
 const timers=resourceTimers(s,now);
 if(timers.points.value<1)return {type:'blocked',reason:'points',seconds:timers.points.seconds,message:`生成点不足，${timers.points.seconds}秒后恢复1点；也可以在商店查看补给。`};
 let choice=null;
 for(const order of progress){
  const reserved=new Set(order.items.flatMap(item=>item.indices));
  for(const item of order.items){
   if(!item.missing)continue;
   const material=b.cells.reduce((sum,cell,index)=>sum+(cell&&!isFrozen(s,index)&&!reserved.has(index)&&cell.chain===item.chain&&cell.level<item.level?2**(cell.level-1):0),0);
   const needed=Math.max(1,item.missing*2**(item.level-1)-material);
   if(!choice||needed<choice.needed)choice={chain:item.chain,needed};
  }
 }
 const chain=choice?choice.chain:b.cells.find((item,index)=>item&&item.level<6&&!isFrozen(s,index))?.chain??0;
 return {type:'generate',chain,message:`暂时没有可合成的一对，点击${D.chains[chain].name}菜篮子生成${D.chains[chain].names[0]}${choice?'，继续准备订单':'，凑成一对再合成'}。`};
}
function deliver(s,idx,now=Date.now()){const b=s.board,o=b?.orders[idx];if(!o||b.finished)return {ok:false};const ids=orderIndices(b,o);if(!ids)return {ok:false,message:'还差一点，合成订单需要的物品吧。'};ids.forEach(i=>b.cells[i]=null);b.orders.splice(idx,1);b.done++;s.gold+=o.gold;s.stars+=o.stars;s.stats.orders++;addEnergy(s,1,now);s.xp+=20;let won=false,rating=0;if(b.done>=b.target){won=true;b.finished=true;rating=b.moves>100?3:b.moves>40?2:1;s.gold+=[0,50,75,100][rating];s.level++;s.xp=0;}return {ok:true,won,rating,gold:o.gold,stars:o.stars};}
function autoMerge(s){
 const b=s.board;if(!b||b.finished)return 0;
 let count=0;
 while(b.moves>0){
  // A newly completed order must be protected before the next automatic merge.
  const reserved=new Set(b.orders.flatMap(order=>orderIndices(b,order)||[]));
  let pair=null;
  for(let i=0;i<64&&!pair;i++){
   const a=b.cells[i];if(!a||a.level>=6||isFrozen(s,i)||reserved.has(i))continue;
   for(const j of [i%8<7?i+1:-1,i+8])if(j>=0&&j<64){
    const c=b.cells[j];
    if(c&&!isFrozen(s,j)&&!reserved.has(j)&&a.chain===c.chain&&a.level===c.level){pair=[i,j];break;}
   }
  }
  if(!pair)break;
  if(move(s,...pair).merged)count++;else break;
 }
 return count;
}
function buyCat(s,id){const cat=D.cats[id];if(!cat||s.cats.some(c=>c.id===id))return {ok:false};if(s.gold<cat.price)return {ok:false,message:'金币不足，去完成猫咪订单吧。'};s.gold-=cat.price;const full=s.cats.filter(c=>c.map===s.map).length>=s.maps[s.map].capacity;s.cats.push(newCat(id,full?null:s.map));return {ok:true,stored:full};}
function place(s,id){const c=s.cats.find(c=>c.id===id);if(!c)return {ok:false};if(c.map===s.map){c.map=null;return {ok:true,stored:true};}if(s.cats.filter(c=>c.map===s.map).length>=s.maps[s.map].capacity)return {ok:false,message:'庭院住满啦，请先扩建或让猫咪回收藏室。'};c.map=s.map;c.x=20+Math.random()*60;c.y=45+Math.random()*30;return {ok:true};}
function expand(s){const m=s.maps[s.map],price=[1000,2000,3500,5500,8000][m.capacity-3];if(!price)return {ok:false,message:'已达到8只猫的容量上限。'};if(s.gold<price)return {ok:false,message:`扩建需要${price}金币。`};s.gold-=price;m.capacity++;return {ok:true};}
function unlock(s,id){const m=D.maps[id];if(!m)return {ok:false};if(s.maps[id].unlocked){s.map=id;return {ok:true};}if(s.level<m.level||s.gold<m.price||s.stars<m.stars)return {ok:false,message:`需要等级${m.level}、${m.price}金币和${m.stars}星星。`};s.gold-=m.price;s.stars-=m.stars;s.maps[id].unlocked=true;s.map=id;return {ok:true};}
function offline(s,now=Date.now()){recover(s,now);recoverPoints(s.board,now);const secs=Math.min(14400,Math.max(0,now-s.lastSeen)/1000);const cats=s.cats.filter(c=>c.map!==null);for(const c of cats){c.hunger=clamp(c.hunger+secs/300,0,100);c.until=0;}const gold=Math.floor(secs/600)*cats.length*5;s.gold+=gold;s.lastSeen=now;return gold;}
function validate(s){if(!s||![1,2].includes(s.version))throw Error('不支持的存档版本');for(const k of ['gold','diamonds','energy','stars','level','xp','energyAt','lastSeen'])if(!Number.isFinite(s[k])||s[k]<0)throw Error('存档数据不完整');if(s.energy>30||s.level<1||s.gold>1e9||s.diamonds>1e9||s.stars>1e9)throw Error('存档数值超出范围');if(!Number.isInteger(s.map)||s.map<0||s.map>3||!Array.isArray(s.maps)||s.maps.length!==4)throw Error('地图数据无效');for(const m of s.maps)if(typeof m.unlocked!=='boolean'||!Number.isInteger(m.capacity)||m.capacity<3||m.capacity>8||!Number.isInteger(m.decor)||m.decor<0||m.decor>3)throw Error('庭院数据无效');if(!s.maps[s.map].unlocked)throw Error('当前地图未解锁');if(!Array.isArray(s.cats)||s.cats.length>30||new Set(s.cats.map(c=>c.id)).size!==s.cats.length)throw Error('猫咪数据无效');for(const c of s.cats){if(!Number.isInteger(c.id)||!D.cats[c.id]||(c.map!==null&&(!Number.isInteger(c.map)||!s.maps[c.map]?.unlocked))||![c.x,c.y,c.hunger,c.affection,c.until].every(Number.isFinite)||c.hunger<0||c.hunger>100||c.affection<0||c.affection>100)throw Error('猫咪属性无效');c.x=clamp(c.x,10,90);c.y=clamp(c.y,38,82);c.state=['walk','eat','sleep','purr','sun','idle','play'].includes(c.state)?c.state:'idle';}for(let i=0;i<4;i++)if(s.cats.filter(c=>c.map===i).length>s.maps[i].capacity)throw Error('猫咪数量超过容量');const item=x=>x&&Number.isInteger(x.chain)&&x.chain>=0&&x.chain<5&&Number.isInteger(x.level)&&x.level>=1&&x.level<=6;if(s.board){const b=s.board;if(!Array.isArray(b.cells)||b.cells.length!==64||b.cells.some(x=>x!==null&&!item(x))||!Number.isInteger(b.points)||b.points<0||b.points>60||!Number.isFinite(b.pointsAt)||!Number.isInteger(b.moves)||b.moves<0||b.moves>10000||!Array.isArray(b.orders)||b.orders.length>3||b.orders.some(o=>!Number.isInteger(o.cat)||!D.cats[o.cat]||!Array.isArray(o.items)||o.items.length<1||o.items.length>3||o.items.some(x=>!item(x)||!Number.isInteger(x.count)||x.count<1||x.count>8)||!Number.isFinite(o.gold)||o.gold<0||o.gold>120||!Number.isInteger(o.stars)||o.stars<1||o.stars>3)||!Number.isInteger(b.done)||b.done<0||b.done>3||b.target!==3||b.done+b.orders.length!==3||typeof b.finished!=='boolean')throw Error('棋盘数据无效');}if(!s.stats||!['merges','orders'].every(k=>Number.isFinite(s.stats[k])&&s.stats[k]>=0)||!s.daily||typeof s.daily.date!=='string'||typeof s.daily.claimed!=='boolean'||typeof s.sound!=='boolean')throw Error('进度数据无效');
 if(!validDate(s.daily.date))throw Error('每日奖励日期无效');
 if(s.version===1){
  // Legacy boards keep their exact contents; the one-time ice tutorial is complete.
  s.frozenCells=[];
  const claimedDate=s.daily.claimed?s.daily.date:'';
  s.dailyRewards={energyDate:claimedDate,coinsDate:claimedDate};
  s.version=2;
 }
 if(!Array.isArray(s.frozenCells)||new Set(s.frozenCells).size!==s.frozenCells.length||s.frozenCells.some(index=>!INITIAL_FROZEN_CELLS.includes(index))||(s.board&&s.frozenCells.some(index=>s.board.cells[index]!==null)))throw Error('冰封进度数据无效');
 if(!s.dailyRewards||!['energyDate','coinsDate'].every(key=>typeof s.dailyRewards[key]==='string'&&validDate(s.dailyRewards[key])))throw Error('每日奖励进度无效');
 return s;}
const api={INITIAL_FROZEN_CELLS,isFrozen,beijingDate,dailyStatus,claimDaily,fresh,recover,addEnergy,enter,spawn,move,deliver,autoMerge,orderIndices,orderProgress,getHint,resourceTimers,buyCat,place,expand,unlock,offline,validate,recoverPoints,clamp};if(typeof module!=='undefined')module.exports=api;root.MeowEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
