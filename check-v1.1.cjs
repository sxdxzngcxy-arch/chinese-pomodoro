'use strict';
const assert=require('node:assert/strict'),L=require('./learning-core.js'),C=require('./core.js'),words=require('./words.js'),packs=require('./reading-data.js'),fs=require('node:fs');
const now=new Date(2026,9,20,12).getTime(),day=C.day(now),ids=new Set(words.map(w=>w.id));
let s=C.fresh();
// 现有 v2 备份无扩展字段：核心信息保留，默认补齐 V1.1。
s.tasks=[{id:'old-task',text:'阅读论文',done:true}];s.pet.xp=177;s.pet.coins=42;C.grade(s,'abandon','unknown',now);
let old=L.copy(s);delete old.study;delete old.progress.abandon.lastGrade;let migrated=C.normalize(old,ids);
assert.equal(migrated.tasks[0].text,'阅读论文');assert.equal(migrated.pet.xp,177);assert.equal(migrated.pet.coins,42);assert.equal(migrated.progress.abandon.due,s.progress.abandon.due);assert.equal(migrated.study.order,'random');
// Fisher-Yates 不改原数组，排列无重复；确定性种子跨刷新稳定。
const source=Array.from({length:100},(_,i)=>i),shuffled=L.shuffle(source,L.seeded('test'));
assert.equal(new Set(shuffled).size,100);assert.deepEqual(source,Array.from({length:100},(_,i)=>i));assert.notDeepEqual(shuffled,source);assert.deepEqual(shuffled,L.shuffle(source,L.seeded('test')));
s=C.fresh();const first=L.queue(s,words,'learn',now,C.queue,day),restored=C.normalize(L.copy(s),ids);
assert.equal(first.length,30);assert.equal(new Set(first.map(w=>w.id)).size,30);assert.deepEqual(first,L.queue(restored,words,'learn',now,C.queue,day));
const learned=first[0].id;C.grade(s,learned,'known',now);assert.ok(!L.queue(s,words,'learn',now,C.queue,day).some(w=>w.id===learned));
s.study.order='sequence';assert.equal(L.queue(s,words,'learn',now,C.queue,day)[0].id,words.find(w=>!s.progress[w.id]).id);
s.progress[learned].due=now;s.progress[learned].wrong=true;s.study.order='weak';assert.equal(L.queue(s,words,'learn',now,C.queue,day)[0].id,learned);
// 个人词与待补全生词、删除后重加保留进度。
let add=L.addWord(s,{word:' Resilient ',meaning:'有韧性的',association:'辅助联想'},words);assert.ok(add.added);assert.equal(add.word.id,'user:resilient');assert.equal(L.addWord(s,{word:'RESILIENT',meaning:'新释义'},words).added,false);assert.equal(L.addWord(s,{word:'abandon',meaning:'放弃'},words).added,false);
L.addWord(s,{word:'distracting',meaning:'',example:'a distracting thought'},words,{pending:true});assert.ok(!L.catalog(words,s.study).some(w=>w.word==='distracting'));assert.ok(L.catalog(words,s.study,{includePending:true}).some(w=>w.pending));
assert.deepEqual(C.normalize(L.copy(s),ids),s);C.grade(s,'user:resilient','unknown',now);s.study.customWords=s.study.customWords.filter(w=>w.word!=='resilient');L.addWord(s,{word:'resilient',meaning:'有韧性的'},words);assert.equal(C.grade(s,'user:resilient','known',now),false);
// 导入不覆盖；支持引号、逗号、双引号、换行、BOM；损坏输入拒绝。
const csv='\uFEFFword,meaning,example\r\nresilient,有韧性的,"It is a \"\"small\"\" word,\nand a useful one."\r\n';const rows=L.parseCSV(csv);assert.ok(rows[0].example.includes('"small" word,\nand'));
const preview=L.previewWords(JSON.stringify([{word:'resilient',meaning:'重复'},{word:'robust',meaning:'稳健的'},{word:'ROBUST',meaning:'再次重复'},{word:'missing'}]),'test.json',L.catalog(words,s.study,{includePending:true}));assert.equal(preview.words.length,1);assert.equal(preview.duplicates.length,2);assert.equal(preview.errors.length,1);
for(const bad of ['word,meaning\nx,"broken','word,word\nx,y','word,meaning\nx,a,b'])assert.throws(()=>L.parseCSV(bad));
assert.equal(L.previewWords(fs.readFileSync('word-template.csv','utf8'),'words.csv',words).words.length,1);
// 阅读严格校验 + 自动保存/暂停计时 + 重复交卷保护。
packs.forEach(L.article);let a=L.article(packs[0]);s=C.fresh();const draft=L.startReading(s,a,now);
assert.equal(L.readingElapsed(draft,now+1000),1000);draft.elapsed=L.readingElapsed(draft,now+1000);draft.runningSince=null;assert.equal(L.readingElapsed(draft,now+10000),1000);
assert.throws(()=>L.submitReading(s,a,draft.id,now+20000));assert.equal(s.study.reading.records[a.id],undefined);
for(const q of a.questions)draft.answers[q.id]=q.id==='Q1'?'A':q.answer;
const result=L.submitReading(s,a,draft.id,now+20000);assert.equal(result.correct,4);assert.equal(result.total,5);assert.equal(result.elapsed,1000);assert.equal(s.study.reading.records[a.id].Q1.lastCorrect,false);assert.equal(L.submitReading(s,a,draft.id,now+20001),false);assert.equal(s.pet.xp,0);
s.study.reading.records[a.id].Q1.reason='定位';assert.deepEqual(C.normalize(L.copy(s),ids),s);const retry=L.startReading(s,a,now+30000,true);assert.deepEqual(retry.questionIds,['Q1']);retry.answers.Q1='B';L.submitReading(s,a,retry.id,now+31000);assert.equal(s.study.reading.records[a.id].Q1.lastCorrect,true);assert.equal(s.study.reading.records[a.id].Q1.reason,'');assert.equal(s.study.reading.records[a.id].Q1.attempts,2);
s.study.readingPacks.push({...L.copy(a),id:'user-test'});assert.deepEqual(C.normalize(L.copy(s),ids),s);
const invalid=L.copy(a);invalid.questions[0].explanation.evidence[0].quote='not in this passage';assert.throws(()=>L.article(invalid));
for(const change of [x=>x.type='fake-test',x=>x.questions[0].answer='Z',x=>delete x.source.rights,x=>x.audioUrl='javascript:alert(1)',x=>x.questions[0].explanation.distractors={}]){const bad=L.copy(a);change(bad);assert.throws(()=>L.article(bad));}
const poison=L.copy(s);poison.study.reading.drafts=JSON.parse('{"__proto__":{}}');assert.throws(()=>C.normalize(poison,ids));assert.equal({}.polluted,undefined);
console.log('V1.1 通过：旧v2数据、Fisher-Yates、跨刷新队列、新旧词/SRS、个人词去重和待补全、JSON/CSV导入、备份往返、阅读资料/依据句校验、计时暂停、交卷判分、重复提交、错因和重练、防原型污染。');
