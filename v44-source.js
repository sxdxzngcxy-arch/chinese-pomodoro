/* 只在用户主动选择后读取指定公开仓库；词典内容不随网站源码公开打包。 */
(function(root){
'use strict';
const base='https://raw.githubusercontent.com/KyleBing/english-vocabulary/c4c6c80879ff17d7025c28fb853a4991c8e6be6a/';
const urls=[base+encodeURI('full_line_jsonl/sentence/正序/六级.jsonl'),base+encodeURI('full_line_jsonl/sentence/乱序/六级.jsonl')];
const source={kind:'user-provided',label:'用户选定：KyleBing/english-vocabulary CET6 @c4c6c80',rights:'仓库标注BSD-3-Clause；Copyright (c) 2022-2026, KyleBing。上游第三方数据的公开再分发授权未核实。这里只按用户指定来源生成本机学习预览，不代表官方词表或授权保证。'};
const canonical=w=>String(w||'').trim().toLowerCase().replace(/[’]/g,"'").replace(/\s+/g,' ');
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function convert(texts){
 const map=new Map(),issues=[];let original=0,limited=0;
 for(const [fileIndex,text]of texts.entries())for(const [lineIndex,line]of text.replace(/^\uFEFF/,'').split(/\r?\n/).entries()){
  if(!line.trim())continue;original++;let raw;
  try{raw=JSON.parse(line);if(!object(raw)||typeof raw.word!=='string')throw Error('缺少英文词条');}catch(e){issues.push(`文件${fileIndex+1}第${lineIndex+1}行：${e.message}`);continue;}
  const name=canonical(raw.word);if(!/^[a-z]+(?:[-' ][a-z]+)*$/.test(name)){issues.push(`跳过不能识别的英文：${name}`);continue;}
  let x=map.get(name);if(!x){x={word:name,phones:new Set(),pos:new Set(),meanings:new Set(),phrases:new Set(),examples:[]};map.set(name,x);}
  for(const[k,label]of [['uk','英'],['us','美']])if(typeof raw[k]==='string'&&raw[k].trim())x.phones.add(label+' '+raw[k].trim());
  for(const t of Array.isArray(raw.translations)?raw.translations:[]){if(typeof t?.translation==='string'&&t.translation.trim())x.meanings.add(t.translation.trim());if(typeof t?.type==='string'&&t.type.trim())x.pos.add(t.type.trim());}
  for(const p of Array.isArray(raw.phrases)?raw.phrases:[])if(typeof p?.phrase==='string')x.phrases.add([p.phrase,typeof p.translation==='string'?p.translation:''].filter(Boolean).join(' — '));
  for(const s of Array.isArray(raw.sentences)?raw.sentences:[])if(typeof s?.sentence==='string'&&s.sentence.trim()&&!x.examples.some(v=>v.example===s.sentence))x.examples.push({example:s.sentence,translation:typeof s.translation==='string'?s.translation:''});
 }
 const words=[];
 for(const x of map.values()){
  let clipped=false;
  const bounded=(values,max,separator='；')=>{let text='';for(const value of values){const next=text?text+separator+value:value;if(next.length>max){clipped=true;continue;}text=next;}return text;};
  const sense=bounded(x.meanings,500);if(!sense){issues.push(`跳过没有可用释义的词：${x.word}`);continue;}
  const sample=x.examples.find(e=>e.example.length<=2000&&e.translation.length<=2000)||{example:'',translation:''};
  const w={word:x.word,ipa:bounded(x.phones,2000),pos:bounded(x.pos,100,' / '),meaning:sense,collocations:bounded(x.phrases,2000),example:sample.example,translation:sample.translation,association:''};
  if(clipped){limited++;w.association='导入格式有限额，只保留限额内的完整原始释义或搭配；其余内容可查原仓库。这是来源提示，不是词源或记忆故事。';}
  words.push(w);
 }
 return{schema:1,source,year:null,sourceRepository:'https://github.com/KyleBing/english-vocabulary',sourceCommit:'c4c6c80879ff17d7025c28fb853a4991c8e6be6a',usageScope:'User-selected local preview; upstream public redistribution rights not verified',notes:'按英文去重，合并原有音标、词性、释义和搭配；只取一组完整例句/翻译。缺失字段保持为空，不生成知识。',audit:{sourceRecords:original,words:words.length,limitedFields:limited,issues},words};
}
async function fetchPack({signal,onProgress=()=>{}}={}){
 const controller=new AbortController(),relay=()=>controller.abort();let timedOut=false;
 signal?.addEventListener('abort',relay,{once:true});if(signal?.aborted)controller.abort();
 const timer=setTimeout(()=>{timedOut=true;controller.abort();},45000);
 try{const texts=[];for(const[i,url]of urls.entries()){onProgress(`正在读取你选定的词库 ${i+1} / ${urls.length}…`);const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw Error(`词库下载失败（${response.status}），可使用本地JSON备用包。`);const text=await response.text();if(text.length>10*1024*1024)throw Error('词库文件超出读取限制。');texts.push(text);}onProgress('正在合并重复词并保留原始字段…');return convert(texts);}
 catch(e){if(timedOut)throw Error('词库读取超时。可以稍后重试，或选择已提供的本地JSON备用包。');throw e;}
 finally{clearTimeout(timer);signal?.removeEventListener('abort',relay);}
}
const api={source,urls,convert,fetchPack};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.V44Source=api;
})(globalThis);
