/* 数据和规则层；不依赖 DOM，供浏览器和 Node 检查共同使用。 */
(function(root){
'use strict';
const DAY=86400000, KEY='yike-study-v2', LEGACY='yike-pomodoro-v1';
const day=(ms=Date.now())=>{const d=new Date(ms);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const addDay=(ms,n)=>{const d=new Date(ms);d.setDate(d.getDate()+n);return d.getTime();};
const uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(36).slice(2)}`;
const fresh=()=>({version:2,settings:{goal:30,focus:25,break:5,theme:'system',reduced:false},tasks:[],counts:{},focusMinutes:{},days:{},progress:{},pet:{species:'teddy',xp:0,coins:0,food:3,mood:80,hunger:80,bond:0,sleeping:false,owned:[],cooldowns:{}},ledger:{},timer:{mode:'focus',remaining:1500,endAt:null,id:null,total:1500},revision:0});
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
  if(!safeKey(k)||!obj(p)||!integer(p.stage,0,6)||!numeric(p.due)||!dateKey(p.firstDay)||!integer(p.attempts,1)||!integer(p.correct,0,p.attempts)||typeof p.wrong!=='boolean')throw Error('单词进度内容无效。');
  if(!wordIds||wordIds.has(k))s.progress[k]={stage:p.stage,due:p.due,firstDay:p.firstDay,attempts:p.attempts,correct:p.correct,wrong:p.wrong};
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
 s.timer={mode:t.mode,total:t.total,remaining:t.remaining,endAt:t.endAt,id:t.id};s.revision=integer(raw.revision)?raw.revision:0;
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
function grade(s,id,grade,now){
 if(!['known','vague','unknown'].includes(grade))return false;
 const prev=s.progress[id];if(prev&&prev.due>now)return false;
 if(!prev&&(s.days[day(now)]?.newWords||0)>=s.settings.goal)return false;
 const d=daily(s,now), known=grade==='known';
 const p=prev||{stage:0,due:0,firstDay:day(now),attempts:0,correct:0,wrong:false};
 if(!prev)d.newWords++;else d.reviews++;
 p.attempts++;d.attempts++;
 if(known){p.correct++;d.correct++;p.stage=Math.min(6,p.stage+1);p.due=addDay(now,[0,1,3,7,14,30,60][p.stage]);p.wrong=false;
  if(prev)reward(s,`review:${day(now)}:${id}`,now,{xp:2});
 }else{p.stage=grade==='unknown'?0:Math.max(0,p.stage-1);p.due=now+(grade==='unknown'?10:30)*60000;p.wrong=true;}
 s.progress[id]=p;
 if(d.newWords>=30)reward(s,`daily30:${day(now)}`,now,{coins:20,food:2});
 return true;
}
function quiz(s,id,direction,answer,correctAnswer,now){
 if(!['en-zh','zh-en'].includes(direction)||!s.progress[id])return {accepted:false};
 const key=`quiz:${day(now)}:${direction}:${id}`;if(Object.hasOwn(s.ledger,key))return {accepted:false};
 s.ledger[key]=now;const right=answer===correctAnswer,d=daily(s,now);d.attempts++;if(right)d.correct++;else {s.progress[id].wrong=true;s.progress[id].stage=0;s.progress[id].due=Math.min(s.progress[id].due,now+10*60000);}
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
const api={KEY,LEGACY,day,addDay,uid,fresh,normalize,migrate,daily,reward,settle,remaining,queue,grade,quiz,interact,buy,shop,streak,achievements};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.StudyCore=api;
})(globalThis);
