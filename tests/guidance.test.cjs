const {test}=require('node:test');
const assert=require('node:assert/strict');
const E=require('../src/engine.js');
const order=(items)=>({cat:0,items,gold:45,stars:1});
function state(){const s=E.fresh(0);E.enter(s,0,()=>0);s.board.cells.fill(null);s.board.orders=[order([{chain:0,level:2,count:1}])];return s;}
function put(s,index,chain,level){s.board.cells[index]={chain,level};}
function freeze(value){if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;}

test('order progress allocates repeated requirements without double counting',()=>{
 const s=state();put(s,0,0,2);put(s,1,0,2);put(s,2,1,2);
 const o=order([{chain:0,level:2,count:1},{chain:0,level:2,count:2},{chain:1,level:2,count:1}]);
 const p=E.orderProgress(s.board,o);
 assert.deepEqual(p.items.map(item=>item.available),[1,1,1]);
 assert.deepEqual(p.items.map(item=>item.missing),[0,1,0]);
 assert.deepEqual(p.items.flatMap(item=>item.indices),[0,1,2]);
 assert.equal(p.available,3);assert.equal(p.required,4);assert.equal(p.ready,false);
 put(s,3,0,2);assert.equal(E.orderProgress(s.board,o).ready,true);
});
test('order progress handles missing board without claiming an empty order is ready',()=>{
 assert.equal(E.orderProgress(null,order([{chain:0,level:2,count:2}])).available,0);
 assert.equal(E.orderProgress(null,order([])).ready,false);
});
test('hint merges nonadjacent items and prioritizes a completed order over thawing',()=>{
 const s=state();put(s,0,0,1);put(s,63,0,1);put(s,12,1,1);put(s,13,1,1);
 const h=E.getHint(s,0);assert.equal(h.type,'merge');assert.equal(h.reason,'order');
 assert.deepEqual([h.from,h.to],[0,63]);assert(E.move(s,h.from,h.to).merged);assert(E.orderIndices(s.board,s.board.orders[0]));
});
test('hint orients a merge toward ice and never wraps adjacency across rows',()=>{
 const s=state();s.board.orders=[order([{chain:4,level:4,count:1}])];put(s,12,1,1);put(s,13,1,1);
 let h=E.getHint(s,0);assert.equal(h.to,13);assert.equal(h.reason,'ice');assert.deepEqual(h.thawed,[14]);
 assert.deepEqual(E.move(s,h.from,h.to).thawed,[14]);
 s.board.cells.fill(null);s.frozenCells=[15];put(s,16,1,1);put(s,24,1,1);
 h=E.getHint(s,0);assert.equal(h.reason,'merge');assert.deepEqual(h.thawed,[]);
});
test('hint refuses frozen, max-level and mismatched pairs',()=>{
 const s=state();put(s,13,1,1);put(s,14,1,1);put(s,0,2,6);put(s,1,2,6);put(s,2,3,1);put(s,3,3,2);
 assert.equal(E.getHint(s,0).type,'generate');
});
test('ready orders remain deliverable without moves, points or free spaces',()=>{
 const s=state();s.board.cells.fill({chain:0,level:2});s.board.moves=0;s.board.points=0;
 const h=E.getHint(s,0);assert.equal(h.type,'deliver');assert.equal(h.orderIndex,0);
});
test('hint identifies inactive, completed, no-step, full and no-point states',()=>{
 const s=state();s.board.moves=0;assert.equal(E.getHint(s,0).reason,'moves');s.board.moves=10;
 s.board.cells.fill({chain:1,level:6});s.board.points=0;assert.equal(E.getHint(s,0).reason,'full');
 s.board.cells[0]=null;assert.equal(E.getHint(s,1000).reason,'points');assert.equal(E.getHint(s,1000).seconds,9);
 s.board.finished=true;assert.equal(E.getHint(s,0).reason,'finished');s.board=null;assert.equal(E.getHint(s,0).reason,'inactive');
});
test('hint may merge while generation points are depleted and the board is full',()=>{
 const s=state();s.board.cells.fill({chain:1,level:6});s.frozenCells=[];put(s,0,2,1);put(s,63,2,1);s.board.points=0;
 const h=E.getHint(s,0);assert.equal(h.type,'merge');assert(E.move(s,h.from,h.to).merged);
});
test('generation hint projects recovered points and suggests a useful chain',()=>{
 const s=state();s.board.orders=[order([{chain:3,level:3,count:1}])];s.board.points=0;s.board.pointsAt=0;
 const h=E.getHint(s,10000);assert.equal(h.type,'generate');assert.equal(h.chain,3);assert.equal(s.board.points,0);
 assert(E.spawn(s,h.chain,10000).ok);
});
test('hints preserve partially collected order ingredients when another pair helps',()=>{
 const s=state();s.board.orders=[order([{chain:0,level:1,count:1},{chain:1,level:2,count:1}])];
 put(s,0,0,1);put(s,1,0,1);put(s,2,1,1);put(s,3,1,1);
 const h=E.getHint(s,0);assert.equal(h.chain,1);assert.equal(h.reason,'order');
});
test('resource timers project exact boundaries, remainder and caps without changes',()=>{
 const s=state();s.energy=25;s.energyAt=1000;s.board.points=58;s.board.pointsAt=1000;
 let t=E.resourceTimers(s,8500);assert.deepEqual(t.points,{value:58,cap:60,seconds:3});assert.equal(t.energy.seconds,293);
 t=E.resourceTimers(s,11000);assert.deepEqual(t.points,{value:59,cap:60,seconds:10});
 t=E.resourceTimers(s,301000);assert.deepEqual(t.energy,{value:26,cap:30,seconds:300});assert.deepEqual(t.points,{value:60,cap:60,seconds:0});
 t=E.resourceTimers(s,1501000);assert.deepEqual(t.energy,{value:30,cap:30,seconds:0});assert.equal(s.energy,25);assert.equal(s.board.points,58);
});
test('resource timers respect clock rollback and inactive generation',()=>{
 const s=state();s.energyAt=10000;s.board.pointsAt=10000;
 assert.equal(E.resourceTimers(s,0).energy.seconds,310);assert.equal(E.resourceTimers(s,0).points.seconds,20);
 s.board.finished=true;assert.equal(E.resourceTimers(s,0).points,null);s.board=null;assert.equal(E.resourceTimers(s,0).points,null);
});
test('all guidance APIs accept deeply frozen state and leave it unchanged',()=>{
 const s=state();put(s,0,0,1);put(s,30,0,1);s.frozenCells=[];const before=JSON.stringify(s);freeze(s);
 assert.equal(E.getHint(s,900000).type,'merge');assert.equal(E.orderProgress(s.board,s.board.orders[0]).ready,false);
 assert.equal(E.resourceTimers(s,900000).energy.value,28);assert.equal(JSON.stringify(s),before);
});
test('automatic merging preserves a ready order without delivering or charging moves',()=>{
 const s=state();put(s,0,0,2);put(s,1,0,2);
 const before=JSON.stringify(s);
 assert.equal(E.autoMerge(s),0);assert.equal(JSON.stringify(s),before);
 assert.deepEqual(E.orderIndices(s.board,s.board.orders[0]),[0]);
 // The player retains the ability to merge these items manually.
 assert(E.move(s,0,1).merged);assert.equal(s.board.cells[1].level,3);
});
test('automatic merging protects an order as soon as it becomes ready',()=>{
 const s=state();put(s,0,0,1);put(s,1,0,1);put(s,2,0,2);
 s.board.orders=[order([{chain:0,level:2,count:2}])];
 const moves=s.board.moves,gold=s.gold;
 assert.equal(E.autoMerge(s),1);assert.equal(s.board.moves,moves-1);
 assert.deepEqual(E.orderIndices(s.board,s.board.orders[0]),[1,2]);
 assert.equal(s.board.orders.length,1);assert.equal(s.board.done,0);assert.equal(s.gold,gold);
});
test('automatic merging continues other chains while protecting every ready order',()=>{
 const s=state();
 s.board.orders=[order([{chain:0,level:2,count:1}]),order([{chain:0,level:2,count:1}]),order([{chain:2,level:2,count:1}])];
 put(s,0,0,2);put(s,1,0,2);put(s,2,2,2);put(s,3,2,2);
 put(s,8,1,1);put(s,9,1,1);put(s,10,1,2);
 assert.equal(E.autoMerge(s),2);assert.deepEqual(s.board.cells[10],{chain:1,level:3});
 for(const o of s.board.orders)assert(E.orderIndices(s.board,o));
 assert.deepEqual(s.board.cells[0],{chain:0,level:2});assert.deepEqual(s.board.cells[2],{chain:2,level:2});
 assert.equal(s.board.orders.length,3);assert.equal(s.board.done,0);
});
