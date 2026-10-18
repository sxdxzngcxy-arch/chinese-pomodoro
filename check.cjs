'use strict';
const assert=require('node:assert/strict'), C=require('./core.js'),words=require('./words.js');
assert.equal(require('./pets.js').teddy.id,'teddy');
const ids=new Set(words.map(w=>w.id)), now=new Date(2026,9,18,12).getTime(), copy=s=>JSON.parse(JSON.stringify(s));
assert.ok(words.length>=100);assert.equal(ids.size,words.length);
for(const w of words)for(const key of ['id','word','ipa','pos','meaning','example','translation'])assert.ok(typeof w[key]==='string'&&w[key].length>0,`${w.id}: ${key}`);
const old={tasks:[{id:'a',text:'读论文',done:true}],counts:{'2026-10-18':3},timer:{mode:'focus',remaining:1400,endAt:now+1400000}};
let s=C.migrate(old);assert.equal(s.tasks[0].text,'读论文');assert.equal(s.counts[C.day(now)],3);assert.equal(s.focusMinutes[C.day(now)],75);assert.ok(s.timer.id);assert.equal(s.pet.coins,0);
assert.deepEqual(C.normalize(s,ids),s);
s=C.fresh();s.timer.id='session-1';s.timer.endAt=now+1500000;
assert.equal(C.settle(s,now+1000),false);assert.equal(C.remaining(s,now+1000),1499);
assert.equal(C.settle(s,now+1500000),'focus');assert.equal(s.pet.xp,25);assert.equal(s.pet.coins,10);assert.equal(s.counts[C.day(now)],1);
assert.equal(C.settle(s,now+999999999),false);assert.equal(s.pet.xp,25);
let restored=C.normalize(copy(s),ids);assert.equal(C.settle(restored,now+1500000),false);assert.equal(restored.pet.coins,10);
// 重放同一 session 即使恢复为到期状态也不重复结算。
s.timer={mode:'focus',id:'session-1',endAt:now,total:1500,remaining:1500};C.settle(s,now);assert.equal(s.pet.xp,25);assert.equal(s.counts[C.day(now)],1);
s.timer={mode:'break',id:'break-1',endAt:now,total:300,remaining:300};assert.equal(C.settle(s,now),'break');assert.equal(s.pet.coins,10);
// 自定义时长精确累计，跨午夜按完成日。
s=C.fresh();const midnight=new Date(2026,9,19,0,5).getTime();s.timer={mode:'focus',id:'midnight',endAt:midnight,total:1200,remaining:1200};C.settle(s,midnight);assert.equal(s.counts['2026-10-19'],1);assert.equal(s.focusMinutes['2026-10-19'],20);
s=C.fresh();assert.equal(C.queue(s,words,'learn',now).length,30);
assert.ok(C.grade(s,'abandon','unknown',now));assert.ok(s.progress.abandon.wrong);assert.equal(C.grade(s,'abandon','known',now),false);assert.equal(s.days[C.day(now)].newWords,1);
assert.ok(C.grade(s,'abandon','known',now+600000));assert.equal(s.pet.xp,2);assert.equal(s.progress.abandon.wrong,false);assert.equal(s.progress.abandon.stage,1);assert.equal(s.progress.abandon.due,C.addDay(now+600000,1));
const xp=s.pet.xp;s.progress.abandon.due=now;assert.ok(C.grade(s,'abandon','known',now+700000));assert.equal(s.pet.xp,xp);assert.equal(s.progress.abandon.stage,2);
// 下一天同一词正确复习可以再次获得 2 经验。
s.progress.abandon.due=C.addDay(now,1);C.grade(s,'abandon','known',C.addDay(now,1));assert.equal(s.pet.xp,4);
s=C.fresh();for(const w of words.slice(0,30))assert.ok(C.grade(s,w.id,'known',now));assert.equal(s.pet.food,5);assert.equal(s.pet.coins,20);assert.equal(s.days[C.day(now)].newWords,30);assert.equal(C.queue(s,words,'learn',now).length,0);assert.equal(C.grade(s,words[30].id,'known',now),false);
s.settings.goal=31;assert.ok(C.grade(s,words[30].id,'known',now));assert.equal(s.pet.coins,20);assert.equal(s.pet.food,5);
assert.equal(C.quiz(s,words[0].id,'en-zh','bad',words[0].id,now).right,false);assert.equal(s.progress[words[0].id].wrong,true);assert.equal(s.progress[words[0].id].due,now+600000);assert.equal(C.quiz(s,words[0].id,'en-zh',words[0].id,words[0].id,now).accepted,false);
assert.equal(C.quiz(s,words[0].id,'zh-en',words[0].id,words[0].id,now).right,true);assert.equal(s.pet.xp,0);assert.equal(s.days[C.day(now)].attempts,33);assert.equal(C.streak(s,now),1);assert.equal(C.streak(s,C.addDay(now,1)),1);assert.equal(C.streak(s,C.addDay(now,2)),0);
const food=s.pet.food;C.interact(s,'feed',now);assert.equal(s.pet.food,food-1);assert.equal(s.pet.hunger,100);C.interact(s,'feed',now);assert.equal(s.pet.food,food-1);
C.interact(s,'pat',now);let bond=s.pet.bond;C.interact(s,'pat',now+10);assert.equal(s.pet.bond,bond);C.interact(s,'pat',now+60000);assert.equal(s.pet.bond,bond+1);C.interact(s,'sleep',now);bond=s.pet.bond;C.interact(s,'play',now);assert.equal(s.pet.bond,bond);
s.pet.coins=100;assert.ok(C.buy(s,'plant'));assert.equal(s.pet.coins,70);assert.equal(C.buy(s,'plant'),false);assert.equal(C.buy(s,'__proto__'),false);assert.equal(s.pet.coins,70);
const noSpecies=copy(s);delete noSpecies.pet.species;assert.equal(C.normalize(noSpecies,ids).pet.species,'teddy');
const roundtrip=C.normalize(copy(s),ids);assert.deepEqual(roundtrip,s);assert.ok(C.achievements(s).find(a=>a.name==='词汇萌芽').earned);
for(const alter of [x=>x.pet.coins=-1,x=>x.settings.goal=0,x=>x.progress.abandon.due='oops',x=>x.tasks=[{id:'a',text:'x',done:false},{id:'a',text:'x',done:false}],x=>x.timer.endAt='bad',x=>x.pet.owned=['bad']]){const bad=copy(s);alter(bad);assert.throws(()=>C.normalize(bad,ids));}
const poison=copy(s);poison.ledger=JSON.parse('{"__proto__":1}');assert.throws(()=>C.normalize(poison,ids));assert.equal({}.polluted,undefined);
console.log(`通过：${words.length} 词结构；旧数据迁移；专注与休息、自定义时长、跨天、刷新与重放去重；SRS 与错词；每日目标与奖励；双向小测计分；连续天数；互动冷却；购物去重；JSON 校验与防原型污染。`);
