/* 数据和规则层；不依赖 DOM，供浏览器和 Node 检查共同使用。 */
(function(root){
'use strict';
const L=typeof module!=='undefined'&&module.exports?require('./learning-core.js'):root.LearningCore;
const G=typeof module!=='undefined'&&module.exports?require('./garden-core.js'):root.GardenCore;
const DAY=86400000, KEY='yike-study-v2', LEGACY='yike-pomodoro-v1';
const day=(ms=Date.now())=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const addDay=(ms,n)=>{const d=new Date(ms);d.setDate(d.getDate()+n);return d.getTime();};
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fresh=()=>({version:2,garden:G.fresh(),study:L.fresh(),settings:{goal:30,focus:25,break:5,theme:'system',reduced:false},tasks:[],counts:{},focusMinutes:{},days:{},progress:{},pet:{species:'teddy',xp:0,coins:0,food:3,mood:80,hunger:80,bond:0,sleeping:false,owned:[],cooldowns:{}},ledger:{},timer:{mode:'focus',remaining:1500,endAt:null,id:null,total:1500},revision:0});
const obj=x=>x!==null && typeof x==='object' && !Array.isArray(x);
const safeKey=k=> !['__proto__','constructor','prototype'].includes(k);
const numeric=(v,min=0,max=1e15)=>Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min=0,max=1e9)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const dateKey=k=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&!Number.isNaN(Date.parse(k));
function normalize(raw, wordIds){
 if(!obj(raw)||raw.version!==2)throw Error('备份版本不支持，请选择本站导出的 v2 JSON。');
 const s=fresh(), r=raw.settings;
 if(!obj(r)||!integer(r.goal,1,200)||!integer(r.focus,1,180)||!integer(r.break,1,60)||!['system','light','dark'].includes(r.theme)||typeof r.reduced!=='boolean')throw Error('设置数据无效。');
 s.settings={goal:r.goal,focus:r.focus,break:r.break,theme:r.theme,reduced:r.reduced};
 if(!Array.isArray(raw.tasks)||raw.tasks.length>5000)throw Error('任务数据无效。');
 const ids=new Set();s.tasks=raw.tasks.map(t=>{if(!obj(t)||typeof t.id!=='string'||!safeKey(t.id)||t.id.length>100||ids.has(t.id)||typeof t.text!=='string'||!t.text.trim()||t.text.length>120||typeof t.done!=='boolean')throw Error('任务内容无效。');ids.add(t.id);return {id:t.id,text:t.text,done:t.done};});
 for(const key of ['counts','focusMinutes']){if(!obj(raw[key]))throw Error('专注记录无效。');for(const [k,v] of Object.entries(raw[key])){if(!dateKey(k)||!numeric(v))throw Error('专注记录无效。');s[key][k]=v;}}
 if(!obj(raw.progress))throw Error('单词进度无效。');
 for(const [k,p] of Object.entries(raw.progress)){
  if(!safeKey(k)||!obj(p)||!integer(p.stage,0,6)||!numeric(p.due)||!dateKey(p.firstDay)||!integer(p.attempts,1)||!integer(p.correct,0,p.attempts)||typeof p.wrong!=='boolean'||p.lastGrade!==undefined&&!['known','vague','unknown'].includes(p.lastGrade))throw Error('单词进度内容无效。');
  s.progress[k]={stage:p.stage,due:p.due,firstDay:p.firstDay,attempts:p.attempts,correct:p.correct,wrong:p.wrong,lastGrade:p.lastGrade|| (p.wrong?(p.stage===0?'unknown':'vague'):'known')};
  if(p.lastReviewedAt!==undefined){if(!numeric(p.lastReviewedAt))throw Error('单词学习时间无效。');s.progress[k].lastReviewedAt=p.lastReviewedAt;}
 }
 if(!obj(raw.days))throw Error('学习记录无效。');
 for(const [k,v] of Object.entries(raw.days)){if(!dateKey(k)||!obj(v)||!integer(v.newWords)||!integer(v.reviews)||!integer(v.attempts)||!integer(v.correct,0,v.attempts))throw Error('每日学习记录无效。');s.days[k]={newWords:v.newWords,reviews:v.reviews,attempts:v.attempts,correct:v.correct};}
 const p=raw.pet;if(!obj(p)||!integer(p.xp)||!integer(p.coins)||!integer(p.food)||!integer(p.mood,0,100)||!integer(p.hunger,0,100)||!integer(p.bond,0,100)||typeof p.sleeping!=='boolean'||!Array.isArray(p.owned)||p.owned.some(k=>!['plant','rug','lamp'].includes(k))||!obj(p.cooldowns))throw Error('宠物数据无效。');
 if(p.species!==undefined&&(typeof p.species!=='string'||!/^[-a-z0-9]{1,40}$/.test(p.species)))throw Error('宠物类型无效。');
 s.pet={species:p.species||'teddy',xp:p.xp,coins:p.coins,food:p.food,mood:p.mood,hunger:p.hunger,bond:p.bond,sleeping:p.sleeping,owned:[...new Set(p.owned)],cooldowns:{}};
 for(const [k,v]of Object.entries(p.cooldowns)){if(!['pat','play'].includes(k)||!numeric(v))throw Error('互动数据无效。');s.pet.cooldowns[k]=v;}
 if(!obj(raw.ledger)||Object.keys(raw.ledger).length>200000)throw Error('结算记录无效。');
 for(const [k,v]of Object.entries(raw.ledger)){if(!safeKey(k)||k.length>240||!numeric(v))throw Error('结算记录无效。');s.ledger[k]=v;}
 const t=raw.timer;if(!obj(t)||!['focus','break'].includes(t.mode)||!numeric(t.total,60,10800)||!numeric(t.remaining,0,t.total)||(t.endAt!==null&&!numeric(t.endAt,1,1e15))||(t.id!==null&&(typeof t.id!=='string'||!safeKey(t.id)||t.id.length>100))||(t.endAt!==null&&!t.id))throw Error('计时状态无效。');
 s.timer={mode:t.mode,total:t.total,remaining:t.remaining,endAt:t.endAt,id:t.id};s.revision=integer(raw.revision)?raw.revision:0;s.study=L.normalize(raw.study);s.garden=G.normalize(raw.garden);
 return s;
}
function migrate(old){
 const s=fresh();if(!obj(old))return s;
 if(Array.isArray(old.tasks))s.tasks=old.tasks.filter(t=>obj(t)&&typeof t.id==='string'&&safeKey(t.id)&&typeof t.text==='string'&&t.text.trim()).map(t=>({id:t.id,text:t.text.slice(0,120),done:!!t.done}));
 if(obj(old.counts))for(const[k,n]of Object.entries(old.counts))if(dateKey(k)&&integer(n)){s.counts[k]=n;s.focusMinutes[k]=n*25;}
 const t=old.timer;if(obj(t)&&['focus','break'].includes(t.mode)&&numeric(t.remaining,0, t.mode==='focus'?1500:300)&&(t.endAt===null||numeric(t.endAt,1,1e15))){s.timer={...s.timer,mode:t.mode,total:t.mode==='focus'?1500:300,remaining:t.remaining,endAt:t.endAt,id:uid()};}
 return s;
}
function daily(s,now){const k=day(now);return s.days[k]||=( {newWords:0,reviews:0,attempts:0,correct:0} );}
function reward(s,key,now,{xp=0,coins=0,food=0}={}){
 if(Object.hasOwn(s.ledger,key))return false;
 s.ledger[key]=now;s.pet.xp+=xp;s.pet.coins+=coins;s.pet.food+=food;return true;
}
function settle(s,now){
 const t=s.timer;
 if(t.endAt===null||now<t.endAt)return false;
 if(t.mode==='focus'&&reward(s,`focus:${t.id}`,now,{xp:25,coins:10})){
  const k=day(t.endAt);s.counts[k]=(s.counts[k]||0)+1;s.focusMinutes[k]=(s.focusMinutes[k]||0)+t.total/60;
  s.pet.mood=Math.min(100,s.pet.mood+5);
 }
 const focus=t.mode==='focus';s.timer={mode:focus?'break':'focus',remaining:s.settings[focus?'break':'focus']*60,total:s.settings[focus?'break':'focus']*60,endAt:null,id:null};
 return focus?'focus':'break';
}
function remaining(s,now){return s.timer.endAt===null?s.timer.remaining:Math.max(0,(s.timer.endAt-now)/1000);}
function queue(s,words,kind,now){
 const due=words.filter(w=>s.progress[w.id]&&s.progress[w.id].due<=now).sort((a,b)=>s.progress[a.id].due-s.progress[b.id].due);
 if(kind==='wrong')return due.filter(w=>s.progress[w.id].wrong);
 if(kind==='review')return due;
 const left=Math.max(0,s.settings.goal-(s.days[day(now)]?.newWords||0));
 return [...due,...words.filter(w=>!s.progress[w.id]).slice(0,left)];
}
function vocabularyDay(s,now){
 const k=day(now);return s.study.vocabulary.days[k]||=( {baselineReviews:s.days[k]?.reviews||0,reviewed:[],known:0,vague:0,unknown:0,practice:0,quizAttempts:0,quizCorrect:0} );
}
function reviewCount(s,now){const d=s.study.vocabulary.days[day(now)];return d?d.baselineReviews+d.reviewed.length:s.days[day(now)]?.reviews||0;}
function schedule(prev,grade,now){
 const stage=prev?.stage||0;
 if(grade==='known'){const next=Math.min(6,stage+1);return {stage:next,due:addDay(now,[0,1,3,7,14,30,60][next]),wrong:false};}
 return {stage:grade==='unknown'?0:Math.max(0,stage-1),due:now+(grade==='unknown'?10:30)*60000,wrong:true};
}
function grade(s,id,grade,now,{newLimit=s.settings.goal}={}){
 if(!['known','vague','unknown'].includes(grade))return false;
 const prev=s.progress[id];if(prev&&prev.due>now)return false;
 if(!prev&&(s.days[day(now)]?.newWords||0)>=newLimit)return false;
 const vd=vocabularyDay(s,now),d=daily(s,now), known=grade==='known';
 const p=prev||{stage:0,due:0,firstDay:day(now),attempts:0,correct:0,wrong:false};
 if(!prev)d.newWords++;else d.reviews++;
 if(prev&&!vd.reviewed.includes(id))vd.reviewed.push(id);vd[grade]++;
 p.lastGrade=grade;p.attempts++;d.attempts++;p.lastReviewedAt=now;
 Object.assign(p,schedule(prev,grade,now));
 if(known){p.correct++;d.correct++;
  if(prev)reward(s,`review:${day(now)}:${id}`,now,{xp:2});
 }
 s.progress[id]=p;
 if(d.newWords>=30)reward(s,`daily30:${day(now)}`,now,{coins:20,food:2});
 return true;
}
// 轮次只在用户开始时抽样一次；以后按稳定词 ID 推进，不重新洗牌。
function startWords(s,words,kind,now){
 const v=s.study.vocabulary;if(v.active&&v.active.index<v.active.items.length)return v.active;
 if(!['learn','review','wrong'].includes(kind))return null;
 const id=uid(),order=s.study.order,available=words.filter(w=>!w.pending),random=L.seeded(`${s.study.seed}:${id}`);
 const sort=list=>order==='random'?L.shuffle(list,random):order==='weak'?[...list].sort((a,b)=>Number(s.progress[b.id]?.wrong||false)-Number(s.progress[a.id]?.wrong||false)||(s.progress[a.id]?.correct||0)/(s.progress[a.id]?.attempts||1)-(s.progress[b.id]?.correct||0)/(s.progress[b.id]?.attempts||1)):list;
 const budget=Math.max(0,v.reviewGoal-reviewCount(s,now)),due=sort(available.filter(w=>s.progress[w.id]?.due<=now).sort((a,b)=>s.progress[a.id].due-s.progress[b.id].due));
 let items=[];
 if(kind==='wrong'){
  let left=budget;
  const wrong=available.filter(w=>s.progress[w.id]?.wrong),dueWrong=sort(wrong.filter(w=>s.progress[w.id].due<=now)),others=sort(wrong.filter(w=>s.progress[w.id].due>now));
  const priority=dueWrong.slice(0,budget),rest=[...dueWrong.slice(budget),...others].sort((a,b)=>(v.practiceTimes[a.id]||0)-(v.practiceTimes[b.id]||0));
  items=[...priority,...rest].slice(0,v.reviewGoal||30).map(w=>({id:w.id,mode:s.progress[w.id].due<=now&&left-->0?'review':'practice'}));
 }else{
  items=due.slice(0,budget).map(w=>({id:w.id,mode:'review'}));
  if(kind==='learn'){
   const left=Math.max(0,s.settings.goal-(s.days[day(now)]?.newWords||0));
   items.push(...sort(available.filter(w=>!s.progress[w.id])).slice(0,left).map(w=>({id:w.id,mode:'new'})));
  }
  if(order==='random')items=L.shuffle(items,random);
 }
 if(!items.length)return null;
 v.active={id,kind,order,day:day(now),startedAt:now,newGoal:s.settings.goal,index:0,revealed:false,items:items.map(i=>({...i,grade:null,skipped:false,nextDue:null}))};return v.active;
}
function finishWords(s,now){
 const v=s.study.vocabulary,a=v.active;if(!a||a.index<a.items.length||v.history.some(h=>h.id===a.id))return;
 const r={id:a.id,kind:a.kind,order:a.order,day:a.day,startedAt:a.startedAt,finishedAt:Math.max(now,a.startedAt),total:a.items.length,skipped:0,practice:0,known:0,vague:0,unknown:0};
 for(const i of a.items){if(i.skipped)r.skipped++;else{r[i.grade]++;if(i.mode==='practice')r.practice++;}}
 v.history=[r,...v.history].slice(0,100);
}
function skipWord(s,sessionId,index,now){
 const a=s.study.vocabulary.active;if(!a||a.id!==sessionId||a.index!==index||index>=a.items.length)return false;
 a.items[index].skipped=true;a.index++;a.revealed=false;finishWords(s,now);return true;
}
function gradeWord(s,words,sessionId,index,rating,now){
 const a=s.study.vocabulary.active;if(!a||a.id!==sessionId||a.index!==index||!a.revealed||!['known','vague','unknown'].includes(rating))return false;
 const item=a.items[index];if(!item)return false;
 const w=words.find(w=>w.id===item.id&&!w.pending),p=s.progress[item.id];
 if(!w||(item.mode==='new'&&p)||(item.mode==='review'&&(!p||p.due>now))||(item.mode==='practice'&&!p)){skipWord(s,sessionId,index,now);return {skipped:true};}
 if(item.mode==='practice'){vocabularyDay(s,now).practice++;s.study.vocabulary.practiceTimes[item.id]=now;item.nextDue=p.due;}
 else{if(!grade(s,item.id,rating,now,{newLimit:Math.max(s.settings.goal,a.newGoal)}))return false;item.nextDue=s.progress[item.id].due;}
 item.grade=rating;a.index++;a.revealed=false;finishWords(s,now);
 return {accepted:true,id:item.id,grade:rating,nextDue:item.nextDue,practice:item.mode==='practice',complete:a.index===a.items.length};
}
function quiz(s,id,direction,answer,correctAnswer,now){
 if(!['en-zh','zh-en'].includes(direction)||!s.progress[id])return {accepted:false};
 const key=`quiz:${day(now)}:${direction}:${id}`;if(Object.hasOwn(s.ledger,key))return {accepted:false};
 s.ledger[key]=now;const right=answer===correctAnswer,d=daily(s,now),vd=vocabularyDay(s,now);vd.quizAttempts++;if(right)vd.quizCorrect++;d.attempts++;if(right)d.correct++;else {s.progress[id].wrong=true;s.progress[id].stage=0;s.progress[id].due=Math.min(s.progress[id].due,now+10*60000);}
 // 小测不改变间隔，也不发经验，避免跳过到期复习或反复练习刷奖。
 return {accepted:true,right};
}
function interact(s,action,now){
 const p=s.pet;
 if(action==='sleep'){p.sleeping=!p.sleeping;return p.sleeping?'小满蜷起来睡着了，安心做自己的事吧。':'小满醒来啦，伸了一个大懒腰。';}
 if(p.sleeping)return '小满正在休息，先轻轻唤醒它吧。';
 if(action==='feed'){
  if(p.food<1)return '食物暂时用完了；完成每日 30 新词可获得 2 份食物。';
  if(p.hunger>=100)return '小满已经吃饱啦，食物留到下次吧。';
  p.food--;p.hunger=Math.min(100,p.hunger+20);p.mood=Math.min(100,p.mood+5);p.bond=Math.min(100,p.bond+2);return '小满吃得很开心，谢谢你的照顾。';
 }
 if(!['pat','play'].includes(action))return '';
 const wait=action==='pat'?60000:600000;
 if(p.cooldowns[action]&&now-p.cooldowns[action]<wait)return '小满还在回味刚才的快乐，过一会儿再来吧。';
 p.cooldowns[action]=now;p.bond=Math.min(100,p.bond+(action==='pat'?1:3));p.mood=Math.min(100,p.mood+5);
 if(action==='play')p.hunger=Math.max(20,p.hunger-5);
 return action==='pat'?'尾巴摇呀摇～小满开心地蹭了蹭你的手。':'一起追了会儿小球，真是愉快的休息！';
}
const shop={plant:{name:'窗边绿植',price:30},rug:{name:'柔软地毯',price:50},lamp:{name:'暖光台灯',price:80}};
function buy(s,id){if(!Object.hasOwn(shop,id)||s.pet.owned.includes(id)||s.pet.coins<shop[id].price)return false;s.pet.coins-=shop[id].price;s.pet.owned.push(id);return true;}
function streak(s,now){let n=0,d=new Date(now);const active=k=>(s.days[k]?.attempts||0)>0;if(!active(day(d)))d.setDate(d.getDate()-1);while(active(day(d))){n++;d.setDate(d.getDate()-1);}return n;}
function achievements(s){return [{name:'初次专注',icon:'◷',earned:Object.values(s.counts).reduce((a,b)=>a+b,0)>=1},{name:'词汇萌芽',icon:'✿',earned:Object.keys(s.progress).length>=30},{name:'百词小树',icon:'♧',earned:Object.keys(s.progress).length>=100},{name:'温柔陪伴',icon:'♡',earned:s.pet.bond>=20},{name:'成长伙伴',icon:'☆',earned:s.pet.xp>=200}];}
const api={KEY,LEGACY,day,addDay,uid,fresh,normalize,migrate,daily,reward,settle,remaining,queue,grade,schedule,reviewCount,startWords,skipWord,gradeWord,quiz,interact,buy,shop,streak,achievements};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyCore=api;
})(globalThis);
