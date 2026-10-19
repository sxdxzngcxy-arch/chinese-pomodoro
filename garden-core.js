/* 心境花园 MVP：纯规则模块，不推断疾病、不联网、不改变学习奖励。 */
(function(root){
'use strict';
const feelings={happy:'愉快',calm:'平静',anxious:'焦虑',low:'低落',irritable:'烦躁'};
const modes={light:{name:'轻量',description:'5 分钟词卡、少量到期复习，再留一点休息时间。'},standard:{name:'标准',description:'沿用你设定的番茄钟，搭配单词或一篇阅读。'},sprint:{name:'冲刺',description:'做一轮限时仔细阅读，交卷后核对依据与干扰项。'}};
const freshBreathing=()=>({id:null,duration:60,style:'paced',elapsed:0,runningSince:null,status:'idle'});
const fresh=()=>({schema:1,mode:'standard',entries:[],breathing:freshBreathing()});
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const validTime=x=>Number.isFinite(x)&&x>=0&&x<=1e15;
const validDay=value=>{if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;const d=new Date(value+'T12:00:00Z');return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===value;};
function recommend(feeling,energy){
 if(!Object.hasOwn(feelings,feeling)||!Number.isInteger(energy)||energy<1||energy>5)return null;
 if(energy<=2)return {mode:'light',reason:'你选择的精力较少，可以先用轻量任务试试。想做更多也可以自行调整。'};
 if(['anxious','low','irritable'].includes(feeling))return energy===3?{mode:'light',reason:'按你填写的感受和精力，可以从一小段学习开始；也可以直接休息。'}:{mode:'standard',reason:'可以按熟悉的节奏学习，随时暂停；如果想挑战，也能手动选冲刺。'};
 if(energy>=4)return {mode:'sprint',reason:'你填写的精力比较充足，可以尝试一轮限时阅读；标准或轻量也同样可以。'};
 return {mode:'standard',reason:'可以沿用熟悉的学习节奏，学习中仍能随时暂停或切换。'};
}
function normalize(raw){
 if(raw===undefined)return fresh();
 if(!obj(raw)||raw.schema!==1||!Object.hasOwn(modes,raw.mode)||!Array.isArray(raw.entries)||raw.entries.length>3650)throw Error('心境数据格式或版本无效。');
 const g=fresh();g.mode=raw.mode;const dates=new Set();
 g.entries=raw.entries.map(e=>{
  if(!obj(e)||!validDay(e.day)||dates.has(e.day)||!Object.hasOwn(feelings,e.feeling)||!Number.isInteger(e.energy)||e.energy<1||e.energy>5||typeof e.note!=='string'||e.note.length>280||!validTime(e.createdAt)||!validTime(e.updatedAt)||e.updatedAt<e.createdAt)throw Error('心境记录日期、感受、精力或日记无效。');
  dates.add(e.day);return {day:e.day,feeling:e.feeling,energy:e.energy,note:e.note,createdAt:e.createdAt,updatedAt:e.updatedAt};
 }).sort((a,b)=>b.day.localeCompare(a.day));
 const b=raw.breathing;
 if(!obj(b)||![60,120,180].includes(b.duration)||!['paced','natural'].includes(b.style)||!validTime(b.elapsed)||b.elapsed>b.duration*1000||!(b.runningSince===null||validTime(b.runningSince))||!['idle','running','paused','completed'].includes(b.status)||(b.id!==null&&(typeof b.id!=='string'||!/^[-a-zA-Z0-9]{1,100}$/.test(b.id)))||(b.status==='running'&&(b.runningSince===null||!b.id))||(b.status!=='running'&&b.runningSince!==null)||(b.status==='completed'&&b.elapsed!==b.duration*1000))throw Error('呼吸进度无效。');
 g.breathing={id:b.id,duration:b.duration,style:b.style,elapsed:b.elapsed,runningSince:b.runningSince,status:b.status};return g;
}
function upsert(g,entry,now){
 if(!validDay(entry.day)||!Object.hasOwn(feelings,entry.feeling)||!Number.isInteger(entry.energy)||entry.energy<1||entry.energy>5||typeof entry.note!=='string'||entry.note.length>280)throw Error('请选择一种感受和 1–5 级精力，日记最多 280 字。');
 const old=g.entries.find(e=>e.day===entry.day);
 if(!old&&g.entries.length>=3650)throw Error('本地记录较多，请先导出并整理。');
 const value={day:entry.day,feeling:entry.feeling,energy:entry.energy,note:entry.note.trim(),createdAt:old?.createdAt??now,updatedAt:Math.max(now,old?.createdAt||0)};
 g.entries=g.entries.filter(e=>e.day!==entry.day);g.entries.push(value);g.entries.sort((a,b)=>b.day.localeCompare(a.day));return value;
}
function recent(g,now,day){const cutoff=new Date(now);cutoff.setDate(cutoff.getDate()-6);const from=day(cutoff.getTime()),to=day(now);return g.entries.filter(e=>e.day>=from&&e.day<=to);}
function merge(current,incoming){const g=normalize(current),other=normalize(incoming),dates=new Set(g.entries.map(e=>e.day));for(const e of other.entries)if(!dates.has(e.day)){g.entries.push(e);dates.add(e.day);}if(g.entries.length>3650)throw Error('合并后的心境记录超过 3650 条，请先整理。');g.entries.sort((a,b)=>b.day.localeCompare(a.day));return g;}
function elapsed(b,now){return Math.min(b.duration*1000,b.elapsed+(b.status==='running'?Math.max(0,now-b.runningSince):0));}
function start(g,now,id){const b=g.breathing;if(b.status==='running')return false;if(b.status==='completed'||b.elapsed>=b.duration*1000){b.elapsed=0;b.id=null;}b.id||=id;b.status='running';b.runningSince=now;return true;}
function pause(g,now){const b=g.breathing;if(b.status!=='running')return false;b.elapsed=elapsed(b,now);b.runningSince=null;b.status='paused';return true;}
function checkpoint(g,now,id){const b=g.breathing;if(b.id!==id||b.status!=='running')return false;b.elapsed=elapsed(b,now);b.runningSince=now;return true;}
function recover(g){const b=g.breathing;if(b.status==='running'){b.runningSince=null;b.status='paused';return true;}return false;}
function finish(g,now,id){const b=g.breathing;if(b.id!==id||b.status!=='running'||elapsed(b,now)<b.duration*1000)return false;b.elapsed=b.duration*1000;b.runningSince=null;b.status='completed';return true;}
function phase(b,now){const t=elapsed(b,now),remaining=Math.max(0,Math.ceil(b.duration-t/1000));if(b.status==='completed')return {text:'这一小段时间，留给了自己。',scale:1,remaining};if(b.status!=='running')return {text:b.status==='paused'?'已暂停，按自己的节奏呼吸':'准备好了再开始',scale:1,remaining};if(b.style==='natural')return {text:'自然呼吸，不必跟随节奏',scale:1,remaining};const p=t%10000;return p<4000?{text:'轻轻吸气',scale:1+p/4000*.25,remaining}:{text:'慢慢呼气',scale:1.25-(p-4000)/6000*.25,remaining};}
function prepareFocus(s,mode){if(!Object.hasOwn(modes,mode))throw Error('学习模式无效。');const total=(mode==='light'?5:s.settings.focus)*60;s.timer={mode:'focus',total,remaining:total,endAt:null,id:null};}
const hasTimerProgress=t=>t.id!==null||t.endAt!==null||t.remaining<t.total;
const api={feelings,modes,fresh,freshBreathing,normalize,recommend,upsert,recent,merge,elapsed,start,pause,checkpoint,recover,finish,phase,prepareFocus,hasTimerProgress};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GardenCore=api;
})(globalThis);
