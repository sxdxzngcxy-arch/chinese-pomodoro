/* 资料中心阶段1：纯转换与校验，复用已有词库/阅读规则，不推断缺失答案。 */
(function(root){
'use strict';
const L=typeof module!=='undefined'&&module.exports?require('./learning-core.js'):root.LearningCore;
const MAX_FILE=10*1024*1024,MAX_STORED=6*1024*1024,MAX_RECORDS=5000;
const copy=x=>JSON.parse(JSON.stringify(x)),obj=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const text=(v,max)=>typeof v==='string'&&v.length<=max;
const safeId=id=>typeof id==='string'&&/^[-a-zA-Z0-9_:]{1,150}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const uid=()=>`m-${globalThis.crypto?.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)}`;
const aliases={'单词':'word','英文':'word','中文释义':'meaning','释义':'meaning','音标':'ipa','词性':'pos','例句':'example','例句翻译':'translation','搭配':'collocations','联想':'association','来源':'source','年份':'year','许可':'rights','版权':'rights'};
function source(value){if(!obj(value)||!['original','user-provided','licensed','public-domain'].includes(value.kind)||!text(value.label,200)||!value.label.trim()||!text(value.rights,1000)||!value.rights.trim())throw Error('请补齐资料来源和版权/使用许可说明。');return{kind:value.kind,label:value.label.trim(),rights:value.rights.trim()};}
function year(value){if(value===null||value===undefined||value==='')return null;const n=typeof value==='string'&&/^\d{4}$/.test(value.trim())?Number(value):value;if(!Number.isInteger(n)||n<1900||n>2100)throw Error('年份需为1900–2100的四位年份；未知请留空。');return n;}
function normalize(raw,now=Date.now()){
 if(!obj(raw)||!safeId(raw.id)||!['vocabulary','reading'].includes(raw.kind)||!obj(raw.meta))throw Error('资料类型、ID或元信息无效。');
 const meta={source:source(raw.meta.source),year:year(raw.meta.year)};
 const payload=raw.kind==='vocabulary'?L.word({...raw.payload,source:meta.source.label}):L.article({...raw.payload,source:meta.source,year:meta.year});
 const createdAt=Number.isFinite(raw.createdAt)&&raw.createdAt>=0?raw.createdAt:now;
 return{schema:1,id:raw.id,kind:raw.kind,questionType:raw.kind==='vocabulary'?'word':'reading-careful',title:raw.kind==='vocabulary'?payload.word:payload.title,meta,payload,review:{status:'confirmed',confirmedAt:now},createdAt,updatedAt:now};
}
function contentKey(r){
 if(r.kind==='vocabulary')return `word:${L.canonical(r.payload.word)}`;
 const clean=s=>String(s).trim().replace(/\s+/g,' ').toLowerCase();
 return 'reading:'+JSON.stringify({paragraphs:r.payload.paragraphs.map(p=>clean(p.text)),questions:r.payload.questions.map(q=>({stem:clean(q.stem),options:q.options.map(o=>clean(o.text)).sort(),answer:clean(q.options.find(o=>o.id===q.answer)?.text||'')}))});
}
function baseline(words,articles){return{words:new Set(words.map(w=>L.canonical(w.word))),articles:articles.map(a=>({id:a.id,key:contentKey({kind:'reading',payload:a})}))};}
function duplicate(record,existing,base){
 if(existing.some(r=>r.id===record.id))return '资料ID已存在，不会覆盖原资料。';
 if(record.kind==='vocabulary'){
  const w=L.canonical(record.payload.word);if(base.words.has(w)||existing.some(r=>r.kind==='vocabulary'&&L.canonical(r.payload.word)===w))return '英文词条已存在（忽略大小写与多余空格）。';
 }else{
  const key=contentKey(record);if(base.articles.some(a=>a.id===record.payload.id)||existing.some(r=>r.kind==='reading'&&r.payload.id===record.payload.id))return '阅读文章ID已存在；不同文章请改用新的ID。';
  if(base.articles.some(a=>a.key===key)||existing.some(r=>r.kind==='reading'&&contentKey(r)===key))return '阅读正文与题目内容重复。';
 }return null;
}
function fromRaw(payload,kind,rootMeta,filename){
 const provided=obj(payload?.source)?payload.source:obj(rootMeta?.source)?rootMeta.source:{};
 return{id:uid(),kind,payload:obj(payload)?copy(payload):payload,parseError:payload?.__parseError||'',meta:{source:{kind:provided.kind||payload?.source_kind||'user-provided',label:provided.label||(typeof payload?.source==='string'?payload.source:'')||filename,rights:provided.rights||payload?.rights||rootMeta?.rights||''},year:payload?.year??rootMeta?.year??null},selected:true};
}
function convertVocabularyEntry(row){
 if(!obj(row))return row;
 // KyleBing 风格的 JSONL 字段转为现有词库字段；保留原有标准字段。
 if(typeof row.meaning==='string'&&row.meaning.trim())return row;
 const translations=Array.isArray(row.translations)?row.translations:[];
 const phrases=Array.isArray(row.phrases)?row.phrases:[];
 const sentences=Array.isArray(row.sentences)?row.sentences:[];
 const first=sentences.find(x=>obj(x)&&typeof x.sentence==='string')||{};
 const meaning=translations.filter(x=>obj(x)&&typeof x.translation==='string').map(x=>x.translation).join('；');
 const pos=[...new Set(translations.map(x=>x?.type).filter(x=>typeof x==='string'&&x.trim()))].join(' / ');
 return {...row,meaning,pos,ipa:row.uk||row.us||'',example:first.sentence||'',translation:first.translation||'',collocations:phrases.filter(x=>obj(x)).map(x=>[x.phrase,x.translation].filter(Boolean).join(' — ')).join('；')};
}
function parse(input,filename,kind){
 const lower=filename.toLowerCase(),ext=lower.endsWith('.jsonl.txt')||/\.jsonl\(\d+\)\.txt$/.test(lower)?'jsonl':lower.split('.').pop();
 if(!['csv','json','jsonl'].includes(ext))throw Error('词库支持 CSV、JSON、JSONL；阅读及备份只支持 JSON。');
 if(ext==='jsonl'&&kind!=='vocabulary')throw Error('JSONL 仅用于单词词库，请选择词库类型。');
 let rows,rootMeta={};
 if(ext==='csv'){if(kind!=='vocabulary')throw Error('阅读仅支持 JSON。');rows=L.parseCSV(input,{mapHeaders:h=>aliases[h]||h,tolerantRows:true});}
 else if(ext==='jsonl'){
  const lines=input.replace(/^\uFEFF/,'').split(/\r?\n/);rows=[];
  for(let i=0;i<lines.length;i++){
   if(!lines[i].trim())continue;
   try{const item=JSON.parse(lines[i]);if(!obj(item))throw Error('需要单词对象');rows.push(item);}
   catch(e){rows.push({word:'',meaning:'',__parseError:`JSONL 第 ${i+1} 行解析失败：${e.message}`});}
   if(rows.length>MAX_RECORDS)throw Error('单次最多导入5000条。');
  }
 }else{
  let raw;try{raw=JSON.parse(input.replace(/^\uFEFF/,''));}catch(e){throw Error(`JSON 解析失败：${e.message}`);}
  if(obj(raw)&&raw.format==='cet6-materials'){
   if(raw.version!==1||!Array.isArray(raw.materials)||raw.materials.length>MAX_RECORDS||(raw.assets!==undefined&&(!Array.isArray(raw.assets)||raw.assets.length)))throw Error('资料备份版本、数量或音频资源不受支持。');
   return raw.materials.map(r=>({...copy(r),selected:true}));
  }
  if(kind==='backup')throw Error('请选择本中心导出的 cet6-materials JSON 备份。');
  if(obj(raw)){rootMeta=raw;rows=kind==='vocabulary'?raw.words:raw.articles;if(kind==='reading'&&raw.type==='reading-careful')rows=[raw];}else rows=raw;
 }
 if(!Array.isArray(rows)||!rows.length||rows.length>MAX_RECORDS)throw Error('需要非空数组，或词库 words / 阅读 articles 数组，最多5000条。');
 return rows.map(r=>fromRaw(kind==='vocabulary'?convertVocabularyEntry(r):r,kind,rootMeta,filename));
}
// 预览和落库共用集合索引；几千条词库不再逐项扫描此前的所有词。
function duplicateIndex(existing,base){
 const ids=new Set(existing.map(r=>r.id)),words=new Set(base.words),articleIds=new Set(base.articles.map(a=>a.id)),articleKeys=new Set(base.articles.map(a=>a.key));
 function add(r){ids.add(r.id);if(r.kind==='vocabulary')words.add(L.canonical(r.payload.word));else{articleIds.add(r.payload.id);articleKeys.add(contentKey(r));}}
 existing.forEach(add);
 function check(r){if(ids.has(r.id))return '资料ID已存在，不会覆盖原资料。';if(r.kind==='vocabulary')return words.has(L.canonical(r.payload.word))?'英文词条已存在（忽略大小写与多余空格）。':null;if(articleIds.has(r.payload.id))return '阅读文章ID已存在；不同文章请改用新的ID。';return articleKeys.has(contentKey(r))?'阅读正文与题目内容重复。':null;}
 return{add,check};
}
function assess(drafts,existing,base){
 const index=duplicateIndex(existing,base);return drafts.map((d,i)=>{
  try{const record=normalize(d),dupe=index.check(record);if(!dupe&&d.selected!==false)index.add(record);return{index:i,draft:d,record,errors:[],duplicate:dupe};}
  catch(e){return{index:i,draft:d,record:null,errors:[d.parseError?`${d.parseError}；${e.message}`:e.message],duplicate:null};}
 });
}
function bundle(records,retired=[]){return{format:'cet6-materials',version:1,exportedAt:new Date().toISOString(),materials:records.map(r=>normalize(r,r.updatedAt)),retiredReadings:retired.map(x=>({articleId:x.articleId,digest:x.digest})),assets:[]};}
function validateBundle(raw){
 if(!obj(raw)||raw.format!=='cet6-materials'||raw.version!==1||!Array.isArray(raw.materials)||raw.materials.length>MAX_RECORDS||raw.assets!==undefined&&(!Array.isArray(raw.assets)||raw.assets.length))throw Error('资料备份格式、版本或资源类型不受支持。');
 const records=raw.materials.map(r=>normalize(r)),retired=raw.retiredReadings||[];
 if(!Array.isArray(retired)||retired.length>10000||retired.some(t=>!obj(t)||!safeId(t.articleId)||!text(t.digest,64)||!/^[a-f0-9]{64}$/.test(t.digest)))throw Error('已删除阅读的防冲突信息无效。');
 return bundle(records,retired);
}
const api={MAX_FILE,MAX_STORED,MAX_RECORDS,copy,uid,source,year,normalize,contentKey,baseline,duplicate,duplicateIndex,parse,assess,bundle,validateBundle};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaterialsCore=api;
})(globalThis);
