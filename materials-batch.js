/* 多文件读取层：只生成待核对的预览，不写入任何学习数据或数据库。 */
(function(root){
'use strict';
const M=typeof module!=='undefined'&&module.exports?require('./materials-core.js'):root.MaterialsCore;
const MAX_FILES=50,MAX_TOTAL=20*1024*1024;
const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
function checkAbort(signal){if(signal?.aborted){const e=Error('已取消读取。');e.name='AbortError';throw e;}}
function fileError(file,usedBytes){
 if(!file||typeof file.name!=='string'||!Number.isSafeInteger(file.size)||file.size<0)return '无法识别文件信息。';
 if(!/\.(csv|json|jsonl|jsonl\.txt|jsonl\(\d+\)\.txt)$/i.test(file.name))return '不支持此格式；词库用CSV/JSON/JSONL，阅读用JSON。ZIP需先在“文件”App解压。';
 if(!file.size)return '文件为空。';
 if(file.size>M.MAX_FILE)return '单文件超过10MiB，请先拆分。';
 if(usedBytes+file.size>MAX_TOTAL)return '本批文件累计超过20MiB，此文件未读取；请分批选择。';
 return '';
}
async function read(files,kind,{signal,onProgress=()=>{},usedFiles=0,usedBytes=0,usedRecords=0,usedRetired=[]}={}){
 if(!['vocabulary','reading','backup'].includes(kind))throw Error('请选择词库、阅读或资料备份类型。');
 const list=Array.from(files||[]);if(!list.length)return{drafts:[],files:[],retiredReadings:[],bytesRead:0};
 if(list.length+usedFiles>MAX_FILES)throw Error('一份预览最多50个文件，请先完成或清空当前预览后分批选择。');
 const drafts=[],reports=[],retired=new Map(usedRetired.map(t=>[t.articleId,t]));let bytesRead=0;
 onProgress({done:0,total:list.length,name:'',state:'reading'});
 for(const [index,file]of list.entries()){
  checkAbort(signal);await pause();checkAbort(signal);
  const report={id:usedFiles+index,name:String(file?.name||'未知文件'),size:file?.size||0,state:'error',total:0,imported:0,skipped:0,error:''};
  try{
   const failure=fileError(file,usedBytes+bytesRead);if(failure)throw Error(failure);
   bytesRead+=file.size;
   onProgress({done:index,total:list.length,name:report.name,state:'reading'});
   const text=await file.text();checkAbort(signal);await pause();checkAbort(signal);
   const next=M.parse(text,file.name,kind);
   if(usedRecords+drafts.length+next.length>M.MAX_RECORDS)throw Error(`本份文件的${next.length}项会使预览超过5000项，未追加；请先处理当前预览再导入此文件。`);
   let tombstones=[];
   if(/\.json$/i.test(file.name)){
    const raw=JSON.parse(text.replace(/^\uFEFF/,''));
    if(raw?.format==='cet6-materials')tombstones=M.validateBundle(raw).retiredReadings;
   }
   const addedTombs=new Map();
   for(const t of tombstones){const old=addedTombs.get(t.articleId)||retired.get(t.articleId);if(old&&old.digest!==t.digest)throw Error('多份资料备份含不同的阅读历史ID，请分开核对导入。');addedTombs.set(t.articleId,t);}
   for(const [row,draft]of next.entries())drafts.push({...draft,origin:{fileId:report.id,name:report.name,row:row+1}});
   for(const [id,t]of addedTombs)retired.set(id,t);
   report.state='ready';report.total=next.length;
  }catch(e){
   checkAbort(signal);
   report.error=['NotReadableError','NotFoundError','SecurityError','AbortError'].includes(e.name)?'文件读取失败或被中断。请先在“文件”App确认文件已下载且可以打开，再重新选择；其他文件继续检查。':e.message||String(e);
  }
  reports.push(report);onProgress({done:index+1,total:list.length,name:report.name,state:'checked'});
 }
 checkAbort(signal);return{drafts,files:reports,retiredReadings:[...retired.values()],bytesRead};
}
function summarize(files,assessments){
 const map=new Map(files.map(file=>[file.id,{...file,valid:0,invalid:0,duplicates:0,excluded:0,remaining:0}]));
 for(const item of assessments){const report=map.get(item.draft.origin?.fileId);if(!report)continue;report.remaining++;
  if(item.errors.length)report.invalid++;else if(item.duplicate)report.duplicates++;else if(item.draft.selected===false)report.excluded++;else report.valid++;
 }
 return [...map.values()];
}
function report(files,assessments){
 return{format:'cet6-import-report',version:1,exportedAt:new Date().toISOString(),files:summarize(files,assessments),issues:assessments.filter(a=>a.errors.length||a.duplicate||a.draft.selected===false).map(a=>({file:a.draft.origin?.name||'',row:a.draft.origin?.row||a.index+1,title:a.record?.title||a.draft.payload?.word||a.draft.payload?.title||'',reason:a.errors.join('；')||a.duplicate||'未勾选，不导入'}))};
}
const api={MAX_FILES,MAX_TOTAL,fileError,read,summarize,report};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaterialsBatch=api;
})(globalThis);
