const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../src/engine.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const now=Date.UTC(2026,9,11,16);
function board(){const s=E.fresh(now);E.enter(s,now);return s;}
function pairAt(s,from,to,level=1){s.board.cells[from]={chain:0,level};s.board.cells[to]={chain:0,level};}

test('fresh ice is a separate permanent progress ledger and starts empty of items',()=>{
 const s=board();assert.equal(s.version,2);assert.equal(s.frozenCells.length,12);
 assert.notEqual(s.frozenCells,E.INITIAL_FROZEN_CELLS);
 for(const index of s.frozenCells){assert.equal(s.board.cells[index],null);assert(E.isFrozen(s,index));}
 assert(!E.isFrozen(s,40));assert(E.validate(clone(s)));
});
test('generators skip every frozen cell and fail when only frozen holes remain',()=>{
 const s=board();s.board.cells.fill(null);s.board.points=60;s.board.moves=200;
 for(let i=0;i<52;i++){const result=E.spawn(s,0,now);assert(result.ok);assert(!E.isFrozen(s,result.index));}
 const previous=clone(s);assert.equal(E.spawn(s,0,now).ok,false);assert.deepEqual(s,previous);
 for(const index of s.frozenCells)assert.equal(s.board.cells[index],null);
});
test('moving into ice is rejected without spending or changing items',()=>{
 const s=board(),previous=clone(s);assert.equal(E.move(s,0,14).ok,false);assert.deepEqual(s,previous);
});
test('a successful merge melts only orthogonal neighbors of its destination',()=>{
 const s=board();pairAt(s,0,6);const result=E.move(s,0,6);
 assert(result.merged);assert.deepEqual(result.thawed,[14]);assert(!E.isFrozen(s,14));
 assert(E.isFrozen(s,15));assert(E.isFrozen(s,22));assert.equal(s.board.cells[6].level,2);
 assert.equal(E.move(s,2,14).ok,true);
});
test('one merge can thaw several adjacent frozen cells',()=>{
 const s=board();s.frozenCells=s.frozenCells.filter(i=>i!==22);pairAt(s,0,22);
 assert.deepEqual(E.move(s,0,22).thawed,[14,23,30]);
});
test('merging on the left edge does not melt the previous row right edge',()=>{
 const s=board();pairAt(s,0,16);assert.deepEqual(E.move(s,0,16).thawed,[]);assert(E.isFrozen(s,15));
});
test('empty moves, mismatches, maximum levels and exhausted steps do not melt ice',()=>{
 const s=board(),ice=[...s.frozenCells];s.board.cells[6]=null;
 assert.deepEqual(E.move(s,0,6).thawed,[]);assert.deepEqual(s.frozenCells,ice);
 s.board.cells[0]={chain:1,level:1};assert.equal(E.move(s,0,6).ok,false);assert.deepEqual(s.frozenCells,ice);
 pairAt(s,0,6,6);assert.equal(E.move(s,0,6).ok,false);assert.deepEqual(s.frozenCells,ice);
 pairAt(s,0,6);s.board.moves=0;assert.equal(E.move(s,0,6).ok,false);assert.deepEqual(s.frozenCells,ice);
});
test('automatic merges use the same thaw rule',()=>{
 const s=board();s.board.cells.fill(null);pairAt(s,5,6);
 assert.equal(E.autoMerge(s),1);assert(!E.isFrozen(s,14));assert(E.isFrozen(s,15));
});
test('melted cells remain clear after saving and starting another level',()=>{
 let s=board();pairAt(s,0,6);E.move(s,0,6);s=E.validate(clone(s));
 while(s.board.orders.length){s.board.cells[20]={...s.board.orders[0].items[0]};assert(E.deliver(s,0,now).ok);}
 assert(E.enter(s,now).ok);assert(!E.isFrozen(s,14));assert(E.isFrozen(s,15));
});
test('clearing all ice never reinitializes it on reload, resume or later levels',()=>{
 let s=board();s.board.cells.fill(null);
 for(const index of [...s.frozenCells]){
  if(!E.isFrozen(s,index))continue;
  const destination=index-1;assert(!E.isFrozen(s,destination));pairAt(s,0,destination);assert(E.move(s,0,destination).merged);
 }
 assert.deepEqual(s.frozenCells,[]);s=E.validate(clone(s));assert(E.enter(s,now).resumed);assert.deepEqual(s.frozenCells,[]);
 while(s.board.orders.length){s.board.cells[20]={...s.board.orders[0].items[0]};assert(E.deliver(s,0,now).ok);}
 assert(E.enter(s,now).ok);assert.deepEqual(s.frozenCells,[]);assert.equal(E.validate(clone(s)).frozenCells.length,0);
});
test('version one migrates without changing an existing board or resources',()=>{
 const legacy=board();legacy.version=1;delete legacy.frozenCells;delete legacy.dailyRewards;
 legacy.board.cells[14]={chain:4,level:5};legacy.gold=3210;legacy.energy=17;
 legacy.daily={date:'2026-10-12',claimed:true};const oldBoard=clone(legacy.board);
 const migrated=E.validate(legacy);assert.equal(migrated.version,2);assert.deepEqual(migrated.frozenCells,[]);
 assert.deepEqual(migrated.board,oldBoard);assert.equal(migrated.gold,3210);assert.equal(migrated.energy,17);
 assert(E.dailyStatus(migrated,now).energy.claimed);assert(E.dailyStatus(migrated,now).coins.claimed);
});
test('an unclaimed legacy gift keeps both new daily rewards available',()=>{
 const legacy=board();legacy.version=1;delete legacy.frozenCells;delete legacy.dailyRewards;
 const s=E.validate(legacy);assert(E.dailyStatus(s,now).energy.available);assert(E.dailyStatus(s,now).coins.available);
});
test('invalid or occupied frozen cells and missing progress are rejected, not regenerated',()=>{
 for(const values of [[14,14],[0],['14'],[64],null]){const s=board();s.frozenCells=values;assert.throws(()=>E.validate(s));}
 const s=board();s.board.cells[14]={chain:0,level:1};assert.throws(()=>E.validate(s));
 const missing=board();delete missing.frozenCells;assert.throws(()=>E.validate(missing));
});
test('daily energy and coins are independent and each can be claimed only once',()=>{
 const s=E.fresh(now);s.energy=15;const gold=s.gold;
 assert.deepEqual(E.claimDaily(s,'energy',now),{ok:true,kind:'energy',amount:10,date:'2026-10-12'});
 assert.equal(s.energy,25);assert(E.dailyStatus(s,now).coins.available);
 assert.deepEqual(E.claimDaily(s,'coins',now),{ok:true,kind:'coins',amount:300,date:'2026-10-12'});
 assert.equal(s.gold,gold+300);const previous=clone(s);
 assert.equal(E.claimDaily(s,'energy',now).ok,false);assert.equal(E.claimDaily(s,'coins',now).ok,false);assert.deepEqual(s,previous);
});
test('full energy preserves the claim and a partial top-up reports the actual grant',()=>{
 const s=E.fresh(now);assert.equal(E.dailyStatus(s,now).energy.available,false);
 assert.equal(E.claimDaily(s,'energy',now).ok,false);assert.equal(s.dailyRewards.energyDate,'');
 assert(E.enter(s,now).ok);assert.equal(E.claimDaily(s,'energy',now).amount,5);assert.equal(s.energy,30);
});
test('energy already restored naturally to full cannot consume the daily claim',()=>{
 const s=E.fresh(now);s.energy=29;assert.equal(E.dailyStatus(s,now+300000).energy.available,false);
 assert.equal(E.claimDaily(s,'energy',now+300000).ok,false);assert.equal(s.dailyRewards.energyDate,'');
});
test('daily rewards refresh at Beijing midnight and do not reset through clock rollback',()=>{
 const beforeMidnight=Date.UTC(2026,9,11,15,59,59,999),afterMidnight=beforeMidnight+1;
 const s=E.fresh(beforeMidnight);assert.equal(E.beijingDate(beforeMidnight),'2026-10-11');
 assert(E.claimDaily(s,'coins',beforeMidnight).ok);assert(E.claimDaily(s,'coins',afterMidnight).ok);
 assert.equal(E.claimDaily(s,'coins',beforeMidnight).ok,false);
 assert.equal(E.claimDaily(s,'coins',afterMidnight+3600000).ok,false);
 assert(E.claimDaily(s,'coins',afterMidnight+86400000).ok);
});
test('daily status and claim flags survive save reload and reject malformed dates',()=>{
 let s=E.fresh(now);E.claimDaily(s,'coins',now);s=E.validate(clone(s));assert(E.dailyStatus(s,now).coins.claimed);
 for(const value of ['2026-02-30','2026-10-99','2026/10/12',42,null]){const invalid=clone(s);invalid.dailyRewards.energyDate=value;assert.throws(()=>E.validate(invalid));}
 const invalid=clone(s);delete invalid.dailyRewards;assert.throws(()=>E.validate(invalid));
});
test('an unknown daily reward cannot change game state',()=>{
 const s=board(),previous=clone(s);assert.equal(E.claimDaily(s,'diamonds',now).ok,false);assert.deepEqual(s,previous);
});
