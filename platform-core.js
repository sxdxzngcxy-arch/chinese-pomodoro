/* V2 增量状态与训练规则；不读取 DOM、存储或网络。旧版主数据仍使用原 key。 */
(function(root){
'use strict';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safe=k=>typeof k==='string'&&/^[a-zA-Z0-9_:-]{1,160}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k);
const text=(v,max=2000)=>typeof v==='string'&&v.length<=max;
const num=(v,max=1e15)=>Number.isFinite(v)&&v>=0&&v<=max;
const integer=(v,max)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const date=k=>{try{return typeof k==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(k)&&new Date(k+'T12:00:00Z').toISOString().slice(0,10)===k;}catch{return false;}};
const routes=['home','focus','words','reading','listening','writing','pet','stats','garden','materials','training'];
const checks=['respond','structure','grammar','spelling','revise'];
const fresh=()=>({schema:1,plan:{reading:1,listening:10,examDate:'',font:'normal',mode:'standard'},lastPage:'home',days:{},readingFavorites:[],expressions:[],listening:{active:null,lessons:[],progress:{}},writing:{prompts:[],drafts:{},active:null},backupAt:0});
function source(s){if(!obj(s)||!['original','user-provided','licensed','public-domain'].includes(s.kind)||!text(s.label,200)||!s.label.trim()||!text(s.rights,1000)||!s.rights.trim())throw Error('请填写资料来源和使用许可，不确定的内容请先人工核对。');return{kind:s.kind,label:s.label.trim(),rights:s.rights.trim()};}
function year(y){if(y===undefined||y===null||y==='')return null;if(!Number.isInteger(y)||y<1900||y>2100)throw Error('年份必须在1900–2100之间，未知可留空。');return y;}
function lesson(x){
 if(!obj(x)||!safe(x.id)||x.type!=='listening'||!text(x.title,200)||!x.title.trim()||!Array.isArray(x.segments)||!x.segments.length||x.segments.length>500)throw Error('听力需要唯一ID、标题及1–500条时间轴原文。');
 const ids=new Set();let previous=-1;
 const segments=x.segments.map(s=>{if(!obj(s)||!safe(s.id)||ids.has(s.id)||!num(s.start,86400)||!num(s.end,86400)||s.end<=s.start||s.start<previous||!text(s.text,4000)||!s.text.trim()||!text(s.translation||'',4000))throw Error('逐句原文需按开始时间排序，填写唯一ID、有效起止秒数和英文。');ids.add(s.id);previous=s.start;return{id:s.id,start:s.start,end:s.end,text:s.text.trim(),translation:s.translation||''};});
 if(x.audioId!==undefined&&x.audioId!==null&&!safe(x.audioId))throw Error('音频引用无效。');
 return{id:x.id,type:'listening',title:x.title.trim(),source:source(x.source),year:year(x.year),audioId:x.audioId||null,segments};
}
function prompt(x){if(!obj(x)||!safe(x.id)||!['writing','translation'].includes(x.type)||!text(x.title,200)||!x.title.trim()||!text(x.prompt,12000)||!x.prompt.trim()||!integer((x.minutes===undefined?30:x.minutes),180)||!((x.minutes===undefined?30:x.minutes)))throw Error('写作/翻译题目需要唯一ID、类型、标题、题干和1–180分钟时长。');for(const k of ['reference','template'])if(x[k]!==undefined&&!text(x[k],20000))throw Error('参考文本过长或格式无效。');return{id:x.id,type:x.type,title:x.title.trim(),prompt:x.prompt.trim(),minutes:(x.minutes===undefined?30:x.minutes),reference:x.reference||'',template:x.template||'',source:source(x.source),year:year(x.year)};}
function normalize(raw){
 if(raw===undefined)return fresh();if(!obj(raw)||raw.schema!==1)throw Error('V2扩展数据版本无效。');
 const s=fresh(),p=raw.plan;
 if(!obj(p)||!integer(p.reading,20)||!integer(p.listening,180)||!(p.examDate===''||date(p.examDate))||!['normal','large','larger'].includes(p.font)||!['light','standard','sprint'].includes(p.mode)||!routes.includes(raw.lastPage)||!num(raw.backupAt))throw Error('每日计划或显示设置无效。');
 s.plan={reading:p.reading,listening:p.listening,examDate:p.examDate,font:p.font,mode:p.mode};s.lastPage=raw.lastPage;s.backupAt=raw.backupAt;
 if(!obj(raw.days)||Object.keys(raw.days).length>10000)throw Error('训练活动记录无效。');
 for(const [k,v]of Object.entries(raw.days)){if(!date(k)||!obj(v)||!num(v.listeningSeconds,86400)||!Array.isArray(v.readingIds)||!Array.isArray(v.writingIds)||[...v.readingIds,...v.writingIds].some(id=>!safe(id)))throw Error('每日训练记录无效。');s.days[k]={listeningSeconds:v.listeningSeconds,readingIds:[...new Set(v.readingIds)].slice(0,1000),writingIds:[...new Set(v.writingIds)].slice(0,1000)};}
 if(!Array.isArray(raw.readingFavorites)||raw.readingFavorites.length>5000||raw.readingFavorites.some(id=>!safe(id)))throw Error('文章收藏无效。');s.readingFavorites=[...new Set(raw.readingFavorites)];
 if(!Array.isArray(raw.expressions)||raw.expressions.length>1000)throw Error('表达收藏无效。');const expr=new Set();s.expressions=raw.expressions.map(e=>{if(!obj(e)||!safe(e.id)||expr.has(e.id)||!text(e.text,4000)||!e.text.trim()||!text(e.source,200))throw Error('表达收藏内容无效。');expr.add(e.id);return{id:e.id,text:e.text,source:e.source};});
 const l=raw.listening;if(!obj(l)||!Array.isArray(l.lessons)||l.lessons.length>200||!obj(l.progress)||Object.keys(l.progress).length>1000)throw Error('听力数据无效。');if(l.active!==undefined&&l.active!==null&&!safe(l.active))throw Error('上次听力引用无效。');s.listening.active=l.active||null;const lids=new Set();s.listening.lessons=l.lessons.map(x=>{const v=lesson(x);if(lids.has(v.id))throw Error('听力ID重复。');lids.add(v.id);return v;});
 for(const[k,v]of Object.entries(l.progress)){if(!safe(k)||!obj(v)||!num(v.position,86400)||!num(v.elapsed)||!num(v.completedAt)||(v.segment!==undefined&&v.segment!==null&&!safe(v.segment))||!obj(v.answers)||Object.keys(v.answers).length>500)throw Error('听力进度无效。');const answers={};for(const[id,a]of Object.entries(v.answers)){if(!safe(id)||!obj(a)||!text(a.input,8000)||typeof a.checked!=='boolean'||typeof a.correct!=='boolean'||!integer(a.attempts,1e9))throw Error('听写记录无效。');answers[id]={input:a.input,checked:a.checked,correct:a.correct,attempts:a.attempts};}s.listening.progress[k]={position:v.position,elapsed:v.elapsed,completedAt:v.completedAt,segment:v.segment||null,answers};}
 const w=raw.writing;if(!obj(w)||!Array.isArray(w.prompts)||w.prompts.length>500||!obj(w.drafts)||Object.keys(w.drafts).length>1000||!(w.active===null||safe(w.active)))throw Error('写作数据无效。');const pids=new Set();s.writing.prompts=w.prompts.map(x=>{const v=prompt(x);if(pids.has(v.id))throw Error('题目ID重复。');pids.add(v.id);return v;});s.writing.active=w.active;
 for(const[k,d]of Object.entries(w.drafts)){if(!safe(k)||!obj(d)||!text(d.body,50000)||!num(d.elapsed)||!(d.runningSince===null||num(d.runningSince))||!num(d.updatedAt)||!Array.isArray(d.checks)||d.checks.some(c=>!checks.includes(c))||!Array.isArray(d.versions)||d.versions.length>10||d.versions.some(v=>!obj(v)||!text(v.body,50000)||!num(v.savedAt)))throw Error('写作草稿无效。');s.writing.drafts[k]={body:d.body,elapsed:d.elapsed,runningSince:d.runningSince,updatedAt:d.updatedAt,checks:[...new Set(d.checks)],versions:d.versions.map(v=>({body:v.body,savedAt:v.savedAt}))};}
 return s;
}
function dayState(s,key){return s.platform.days[key]||=( {listeningSeconds:0,readingIds:[],writingIds:[]} );}
function listeningProgress(s,id){return s.platform.listening.progress[id]||=( {position:0,elapsed:0,completedAt:0,segment:null,answers:{}} );}
function draft(s,id){return s.platform.writing.drafts[id]||=( {body:'',elapsed:0,runningSince:null,updatedAt:0,checks:[],versions:[]} );}
function elapsed(d,now){return d.elapsed+(d.runningSince===null?0:Math.max(0,(now-d.runningSince)/1000));}
const tokens=t=>String(t).normalize('NFKC').replace(/[’‘]/g,"'").toLowerCase().match(/[a-z0-9]+(?:'[a-z]+)*/g)||[];
function compare(input,expected){const a=tokens(input),b=tokens(expected),m=a.length,n=b.length;let prev=Array.from({length:n+1},(_,i)=>i);for(let i=1;i<=m;i++){const row=[i];for(let j=1;j<=n;j++)row[j]=Math.min(row[j-1]+1,prev[j]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1));prev=row;}return{correct:JSON.stringify(a)===JSON.stringify(b)&&n>0,similarity:n?Math.max(0,Math.round((1-prev[n]/Math.max(n,m,1))*100)):0};}
function saveExpression(s,value,from,uid){const str=value.trim();if(!str||str.length>4000)throw Error('请选择1–4000字符的表达。');if(s.platform.expressions.some(e=>e.text.toLowerCase()===str.toLowerCase()))return false;if(s.platform.expressions.length>=1000)throw Error('表达收藏最多1000条，请先导出整理。');s.platform.expressions.unshift({id:uid,text:str,source:String(from).slice(0,200)});return true;}
function activeDays(s){const dates=new Set([...Object.keys(s.days).filter(k=>s.days[k].attempts>0),...Object.keys(s.counts).filter(k=>s.counts[k]>0)]);for(const[k,d]of Object.entries(s.platform.days))if(d.listeningSeconds>0||d.readingIds.length||d.writingIds.length)dates.add(k);for(const a of Object.values(s.study.reading.last))if(a.submittedAt)dates.add(localDay(a.submittedAt));return dates;}
function localDay(ms){const d=new Date(ms);return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function streak(s,now){const dates=activeDays(s);let n=0,d=new Date(now);if(!dates.has(localDay(d)))d.setDate(d.getDate()-1);while(dates.has(localDay(d))){n++;d.setDate(d.getDate()-1);}return n;}
function rewardKey(domain,...parts){let h=14695981039346656037n;for(const c of JSON.stringify(parts)){h^=BigInt(c.codePointAt(0));h=BigInt.asUintN(64,h*1099511628211n);}return domain+':'+h.toString(16);}
function contentKey(item){const clean=s=>String(s).toLowerCase().trim().replace(/\s+/g,' ');return item.type==='listening'?rewardKey('listening-content',item.segments.map(s=>[s.start,s.end,clean(s.text)])):rewardKey(item.type+'-content',clean(item.prompt));}
const api={contentKey,rewardKey,fresh,normalize,source,year,lesson,prompt,dayState,listeningProgress,draft,elapsed,compare,saveExpression,streak,date,routes,checks};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.PlatformCore=api;
})(globalThis);
