/* V1.1 可测试规则：个人词库、Fisher–Yates 排序、阅读与兼容存储。无外部依赖。 */
(function(root){
'use strict';
const obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const safe=k=>typeof k==='string'&&!['__proto__','prototype','constructor'].includes(k)&&k.length<=160;
const num=(v,max=1e15)=>Number.isFinite(v)&&v>=0&&v<=max;
const int=(v,max=1e9)=>Number.isSafeInteger(v)&&num(v,max);
const text=(v,max=4000)=>typeof v==='string'&&v.length<=max;
const copy=x=>JSON.parse(JSON.stringify(x));
let external={words:[],articles:[]};
function setExternalCatalog(value){external={words:value.words||[],articles:value.articles||[]};}
const canonical=w=>String(w).trim().toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ');
const reasons=['词汇','定位','推断','主旨','同义替换','时间不足'];
const vocabularyFresh=()=>({schema:1,reviewGoal:30,active:null,history:[],days:{},practiceTimes:{}});
const fresh=()=>({schema:1,order:'random',seed:Math.random().toString(36).slice(2),accent:'en-GB',customWords:[],favorites:[],readingPacks:[],reading:{drafts:{},records:{},last:{}},vocabulary:vocabularyFresh()});
function shuffle(items,random=Math.random){const a=[...items];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function seeded(key){let h=2166136261;for(const c of key){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return()=>{h+=0x6D2B79F5;let t=Math.imul(h^h>>>15,1|h);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function word(raw,{pending=false}={}){
 if(!obj(raw)||!text(raw.word,80))throw Error('英文词条无效。');
 const name=canonical(raw.word);if(!/^[a-z]+(?:[-' ][a-z]+)*$/.test(name))throw Error('英文只支持字母、空格、连字符和撇号。');
 if(!text(raw.meaning??'',500)||(!pending&&!String(raw.meaning||'').trim()))throw Error(`${name} 缺少中文释义。`);
 const w={id:`user:${name}`,word:name};
 for(const key of ['ipa','pos','meaning','example','translation','collocations','association','source']){const v=raw[key]??'';if(!text(v,key==='pos'?100:2000))throw Error(`${name} 的 ${key} 过长或格式无效。`);w[key]=v.trim();}
 w.pending=!w.meaning;return w;
}
function catalog(builtin,study,{includePending=false}={}){const names=new Set();return [...builtin,...study.customWords,...external.words].filter(w=>{const name=canonical(w.word);if(names.has(name)||(!includePending&&w.pending))return false;names.add(name);return true;});}
function addWord(s,raw,builtin,{pending=false}={}){
 const w=word(raw,{pending});const existing=catalog(builtin,s.study,{includePending:true}).find(x=>canonical(x.word)===w.word);
 if(existing)return {added:false,word:existing};
 if(s.study.customWords.length>=5000)throw Error('个人词库最多 5000 词，请先整理。');
 s.study.customWords.push(w);return{added:true,word:w};
}
function queue(s,words,kind,now,baseQueue,day){
 const available=words.filter(w=>!w.pending),mode=s.study?.order||'sequence';
 const due=baseQueue(s,available,kind,now).filter(w=>s.progress[w.id]);
 const random=seeded(`${s.study?.seed||'legacy'}:${day}:${mode}:${kind}`);
 if(kind==='review'||kind==='wrong')return mode==='sequence'?due:mode==='weak'?due.sort((a,b)=>Number(s.progress[b.id].wrong)-Number(s.progress[a.id].wrong)||s.progress[a.id].correct/s.progress[a.id].attempts-s.progress[b.id].correct/s.progress[b.id].attempts||s.progress[a.id].due-s.progress[b.id].due):shuffle(due,random);
 const left=Math.max(0,s.settings.goal-(s.days[day]?.newWords||0));
 let unseen=available.filter(w=>!s.progress[w.id]);if(mode!=='sequence')unseen=shuffle(unseen,random);
 const combined=[...due,...unseen.slice(0,left)];
 if(mode==='random')return shuffle(combined,random);
 if(mode==='weak')return [...due.sort((a,b)=>Number(s.progress[b.id].wrong)-Number(s.progress[a.id].wrong)||s.progress[a.id].correct/s.progress[a.id].attempts-s.progress[b.id].correct/s.progress[b.id].attempts),...unseen.slice(0,left)];
 return combined;
}
function status(p){if(!p)return '未学';if(p.wrong)return p.lastGrade==='vague'?'模糊':'不认识';return p.stage>=3?'已掌握':'认识';}
function parseCSV(input,{mapHeaders=h=>h}={}){
 const rows=[];let row=[],field='',quoted=false,afterQuote=false;
 const push=()=>{row.push(field);field='';afterQuote=false;};
 input=input.replace(/^\uFEFF/,'');
 for(let i=0;i<input.length;i++){const c=input[i];
  if(quoted){if(c==='"'){if(input[i+1]==='"'){field+='"';i++;}else{quoted=false;afterQuote=true;}}else field+=c;continue;}
  if(c==='"'){if(field||afterQuote)throw Error('CSV 引号位置错误。');quoted=true;}
  else if(c===','){push();}
  else if(c==='\n'||c==='\r'){if(c==='\r'&&input[i+1]==='\n')i++;push();if(row.some(x=>x.trim()))rows.push(row);row=[];}
  else{if(afterQuote&&!/\s/.test(c))throw Error('CSV 引号后应为逗号或换行。');if(!afterQuote)field+=c;}
 }
 if(quoted)throw Error('CSV 存在未闭合引号。');push();if(row.some(x=>x.trim()))rows.push(row);
 if(rows.length<2)throw Error('CSV 需要表头和至少一条数据。');
 const headers=rows.shift().map(h=>mapHeaders(h.trim()));if(!headers.includes('word')||!headers.includes('meaning')||new Set(headers).size!==headers.length||headers.some(h=>!safe(h)))throw Error('CSV 表头需要唯一的 word 和 meaning 字段。');
 return rows.map((r,i)=>{if(r.length!==headers.length)throw Error(`CSV 第 ${i+2} 行的列数不一致。`);return Object.fromEntries(headers.map((h,j)=>[h,r[j]]));});
}
function previewWords(input,filename,existing){
 const raw=/\.csv$/i.test(filename)?parseCSV(input):JSON.parse(input.replace(/^\uFEFF/,''));
 const list=Array.isArray(raw)?raw:raw.words;
 if(!Array.isArray(list)||list.length>5000)throw Error('词库需为数组或 {"words": [...]}，单次最多 5000 词。');
 const seen=new Set(existing.map(w=>canonical(w.word))),result={words:[],duplicates:[],errors:[]};
 list.forEach((row,i)=>{try{const w=word(row);if(seen.has(w.word))result.duplicates.push(w.word);else{seen.add(w.word);result.words.push(w);}}catch(e){result.errors.push(`第 ${i+1} 条：${e.message}`);}});return result;
}
function article(raw){
 if(!obj(raw)||!safe(raw.id)||!/^[-a-zA-Z0-9_:]+$/.test(raw.id)||!text(raw.title,200)||!raw.title.trim()||raw.type!=='reading-careful')throw Error('阅读材料需要稳定 id、标题，且 type 为 reading-careful。');
 const src=raw.source;
 if(!obj(src)||!['original','user-provided','licensed','public-domain'].includes(src.kind)||!text(src.label,200)||!src.label.trim()||!text(src.rights,1000)||!src.rights.trim()||!(raw.year===null||Number.isInteger(raw.year)&&raw.year>=1900&&raw.year<=2100))throw Error('请填写来源 kind/label/rights 和 year（未知填 null）。');
 const a={id:raw.id,title:raw.title,type:raw.type,source:{kind:src.kind,label:src.label,rights:src.rights},year:raw.year,audioUrl:raw.audioUrl||'',paragraphs:[],questions:[]};
 if(!text(a.audioUrl,2000)||a.audioUrl&&!/^(https:\/\/|\.\/|[^:/]+\/)/.test(a.audioUrl))throw Error('audioUrl 只允许 HTTPS 或相对路径。');
 if(!Array.isArray(raw.paragraphs)||raw.paragraphs.length<1||raw.paragraphs.length>50||!Array.isArray(raw.questions)||!raw.questions.length||raw.questions.length>30)throw Error('阅读材料需有 1–50 段和 1–30 题。');
 const pids=new Set();for(const p of raw.paragraphs){if(!obj(p)||!safe(p.id)||pids.has(p.id)||!text(p.text,10000)||!p.text.trim())throw Error('文章段落格式无效或 id 重复。');pids.add(p.id);a.paragraphs.push({id:p.id,text:p.text});}
 const qids=new Set();for(const q of raw.questions){
  if(q?.type!==undefined&&q.type!=='single-choice')throw Error('V1.1 仅支持 single-choice 单选题。');
  if(!obj(q)||!safe(q.id)||qids.has(q.id)||!text(q.stem,2000)||!q.stem.trim()||!Array.isArray(q.options)||q.options.length<2||q.options.length>6)throw Error('题目 id、题干或选项无效。');qids.add(q.id);
  const oids=new Set();const options=q.options.map(o=>{if(!obj(o)||!safe(o.id)||oids.has(o.id)||!text(o.text,2000)||!o.text.trim())throw Error('选项无效或重复。');oids.add(o.id);return {id:o.id,text:o.text};});
  const e=q.explanation;if(!oids.has(q.answer)||!obj(e)||!text(e.summary,4000)||!e.summary.trim()||!text(e.paraphrase,2000)||!e.paraphrase.trim()||!obj(e.distractors)||!Array.isArray(e.evidence)||!e.evidence.length)throw Error('每题需包含答案、解释、同义替换、依据句与干扰项解释。');
  const evidence=e.evidence.map(v=>{const para=a.paragraphs.find(p=>p.id===v.paragraphId);if(!para||!text(v.quote,2000)||!v.quote.trim()||!para.text.includes(v.quote))throw Error('依据句必须逐字出现在对应段落中。');return{paragraphId:v.paragraphId,quote:v.quote};});
  const distractors={};for(const o of options)if(o.id!==q.answer){if(!text(e.distractors[o.id],2000)||!e.distractors[o.id].trim())throw Error('每个干扰项都需要解释。');distractors[o.id]=e.distractors[o.id];}
  a.questions.push({id:q.id,type:'single-choice',stem:q.stem,options,answer:q.answer,explanation:{summary:e.summary,paraphrase:e.paraphrase,evidence,distractors}});
 }return a;
}
function readingCatalog(builtin,study){const ids=new Set();return [...builtin,...study.readingPacks,...external.articles].filter(a=>{if(ids.has(a.id))return false;ids.add(a.id);return true;});}
function startReading(s,a,now,wrongOnly=false){
 const ids=a.questions.filter(q=>!wrongOnly||s.study.reading.records[a.id]?.[q.id]?.lastCorrect===false).map(q=>q.id);
 if(!ids.length)throw Error('暂时没有可重练的错题。');
 const draft={id:`read-${now}-${Math.random().toString(36).slice(2)}`,questionIds:ids,answers:{},elapsed:0,runningSince:now,startedAt:now};s.study.reading.drafts[a.id]=draft;return draft;
}
function readingElapsed(d,now){return d.elapsed+(d.runningSince===null?0:Math.max(0,now-d.runningSince));}
function submitReading(s,a,draftId,now){
 const d=s.study.reading.drafts[a.id];if(!d||d.id!==draftId||Object.hasOwn(s.ledger,`reading:${draftId}`))return false;
 const questions=d.questionIds.map(id=>a.questions.find(q=>q.id===id));if(questions.some(q=>!q||!q.options.some(o=>o.id===d.answers[q.id])))throw Error('请先完成本次所有题目，再交卷。');
 const records=s.study.reading.records[a.id]||={};let correct=0;
 for(const q of questions){const right=d.answers[q.id]===q.answer;if(right)correct++;const r=records[q.id]||={attempts:0,correct:0,lastCorrect:false,lastAnswer:'',reason:'',star:false};r.attempts++;if(right)r.correct++;r.lastCorrect=right;r.lastAnswer=d.answers[q.id];if(right)r.reason='';}
 s.ledger[`reading:${draftId}`]=now;
 const result={id:draftId,questionIds:[...d.questionIds],answers:{...d.answers},correct,total:questions.length,elapsed:readingElapsed(d,now),submittedAt:now};
 s.study.reading.last[a.id]=result;delete s.study.reading.drafts[a.id];return result;
}
function normalizeVocabulary(raw){
 if(raw===undefined)return vocabularyFresh();
 if(!obj(raw)||raw.schema!==1||!int(raw.reviewGoal,200)||!Array.isArray(raw.history)||raw.history.length>100||!obj(raw.days))throw Error('词汇学习记录无效。');
 const v=vocabularyFresh();v.reviewGoal=raw.reviewGoal;
 if(raw.practiceTimes!==undefined){if(!obj(raw.practiceTimes)||Object.keys(raw.practiceTimes).length>10000)throw Error('错词练习顺序记录无效。');for(const [id,at]of Object.entries(raw.practiceTimes)){if(!safe(id)||!num(at))throw Error('错词练习时间无效。');v.practiceTimes[id]=at;}}
 const grades=['known','vague','unknown'];
 const date=k=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&!Number.isNaN(Date.parse(k));
 function summary(r){
  if(!obj(r)||!safe(r.id)||!['learn','review','wrong'].includes(r.kind)||!['sequence','random','weak'].includes(r.order)||!date(r.day)||!num(r.startedAt)||!num(r.finishedAt)||r.finishedAt<r.startedAt||!int(r.total,400)||!int(r.skipped,r.total)||!int(r.practice,r.total)||grades.some(g=>!int(r[g],r.total))||r.known+r.vague+r.unknown+r.skipped!==r.total)throw Error('词汇轮次结果无效。');
  return Object.fromEntries(['id','kind','order','day','startedAt','finishedAt','total','skipped','practice',...grades].map(k=>[k,r[k]]));
 }
 v.history=raw.history.map(summary);if(new Set(v.history.map(h=>h.id)).size!==v.history.length)throw Error('词汇历史轮次重复。');
 if(raw.active!==null){
  const a=raw.active;if(!obj(a)||!safe(a.id)||!['learn','review','wrong'].includes(a.kind)||!['sequence','random','weak'].includes(a.order)||!date(a.day)||!num(a.startedAt)||!int(a.newGoal,200)||a.newGoal<1||!Array.isArray(a.items)||!a.items.length||a.items.length>400||!int(a.index,a.items.length)||typeof a.revealed!=='boolean'||new Set(a.items.map(i=>i?.id)).size!==a.items.length)throw Error('词汇学习轮次无效。');
  const items=a.items.map((i,n)=>{if(!obj(i)||!safe(i.id)||!['new','review','practice'].includes(i.mode)||!(i.grade===null||grades.includes(i.grade))||typeof i.skipped!=='boolean'||!(i.nextDue===null||num(i.nextDue))||(n<a.index?!i.skipped&&i.grade===null:i.skipped||i.grade!==null)||(i.skipped&&i.grade!==null))throw Error('词汇卡片记录无效。');return {id:i.id,mode:i.mode,grade:i.grade,skipped:i.skipped,nextDue:i.nextDue};});
  v.active={id:a.id,kind:a.kind,order:a.order,day:a.day,startedAt:a.startedAt,newGoal:a.newGoal,index:a.index,revealed:a.revealed,items};
 }
 for(const [k,d]of Object.entries(raw.days)){
  if(!date(k)||!obj(d)||!Array.isArray(d.reviewed)||d.reviewed.length>10000||d.reviewed.some(id=>!safe(id))||new Set(d.reviewed).size!==d.reviewed.length||!int(d.baselineReviews)||grades.some(g=>!int(d[g]))||!int(d.practice)||!int(d.quizAttempts)||!int(d.quizCorrect,d.quizAttempts))throw Error('词汇每日明细无效。');
  v.days[k]={baselineReviews:d.baselineReviews,reviewed:[...d.reviewed],known:d.known,vague:d.vague,unknown:d.unknown,practice:d.practice,quizAttempts:d.quizAttempts,quizCorrect:d.quizCorrect};
 }
 return v;
}
function normalize(raw){
 if(raw===undefined)return fresh();if(!obj(raw)||raw.schema!==1)throw Error('V1.1 学习扩展数据版本无效。');
 const s=fresh();if(!['sequence','random','weak'].includes(raw.order)||!text(raw.seed,100)||!['en-GB','en-US'].includes(raw.accent))throw Error('单词排序或发音设置无效。');s.order=raw.order;s.seed=raw.seed;s.accent=raw.accent;
 if(!Array.isArray(raw.customWords)||raw.customWords.length>5000)throw Error('个人词库数据无效。');const names=new Set();s.customWords=raw.customWords.map(r=>{const w=word(r,{pending:true});if(names.has(w.word))throw Error('个人词库存在重复英文。');names.add(w.word);return w;});
 if(!Array.isArray(raw.favorites)||raw.favorites.length>10000||raw.favorites.some(id=>!safe(id)))throw Error('收藏数据无效。');s.favorites=[...new Set(raw.favorites)];
 if(!Array.isArray(raw.readingPacks)||raw.readingPacks.length>100)throw Error('阅读题库数据无效。');const aids=new Set();s.readingPacks=raw.readingPacks.map(r=>{const a=article(r);if(aids.has(a.id))throw Error('阅读 id 重复。');aids.add(a.id);return a;});
 if(!obj(raw.reading))throw Error('阅读记录无效。');
 for(const key of ['drafts','records','last'])if(!obj(raw.reading[key])||Object.keys(raw.reading[key]).some(k=>!safe(k)))throw Error('阅读记录键无效。');
 for(const[id,d]of Object.entries(raw.reading.drafts)){
  if(!obj(d)||!safe(d.id)||!Array.isArray(d.questionIds)||!d.questionIds.length||d.questionIds.length>30||new Set(d.questionIds).size!==d.questionIds.length||d.questionIds.some(x=>!safe(x))||!obj(d.answers)||!num(d.elapsed)||!(d.runningSince===null||num(d.runningSince))||!num(d.startedAt))throw Error('阅读草稿无效。');
  const answers={};for(const[k,v]of Object.entries(d.answers)){if(!safe(k)||!safe(v))throw Error('阅读答案无效。');answers[k]=v;}
  s.reading.drafts[id]={id:d.id,questionIds:[...d.questionIds],answers,elapsed:d.elapsed,runningSince:d.runningSince,startedAt:d.startedAt};
 }
 for(const[id,records]of Object.entries(raw.reading.records)){
  if(!obj(records)||Object.keys(records).length>1000)throw Error('阅读题目记录无效。');s.reading.records[id]={};
  for(const[qid,r]of Object.entries(records)){if(!safe(qid)||!obj(r)||!int(r.attempts)||!int(r.correct,r.attempts)||typeof r.lastCorrect!=='boolean'||!safe(r.lastAnswer)||!['',...reasons].includes(r.reason)||typeof r.star!=='boolean')throw Error('阅读错因记录无效。');s.reading.records[id][qid]={attempts:r.attempts,correct:r.correct,lastCorrect:r.lastCorrect,lastAnswer:r.lastAnswer,reason:r.reason,star:r.star};}
 }
 for(const[id,r]of Object.entries(raw.reading.last)){
  if(!obj(r)||!safe(r.id)||!Array.isArray(r.questionIds)||r.questionIds.some(x=>!safe(x))||!obj(r.answers)||!int(r.total,30)||!int(r.correct,r.total)||!num(r.elapsed)||!num(r.submittedAt)||Object.entries(r.answers).some(([k,v])=>!safe(k)||!safe(v)))throw Error('阅读结果无效。');s.reading.last[id]={id:r.id,questionIds:[...r.questionIds],answers:{...r.answers},correct:r.correct,total:r.total,elapsed:r.elapsed,submittedAt:r.submittedAt};
 }
 s.vocabulary=normalizeVocabulary(raw.vocabulary);return s;
}
const api={setExternalCatalog,fresh,normalize,canonical,word,catalog,addWord,shuffle,seeded,queue,status,parseCSV,previewWords,article,readingCatalog,startReading,readingElapsed,submitReading,reasons,copy};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LearningCore=api;
})(globalThis);
