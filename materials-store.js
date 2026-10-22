/* IndexedDB 资料仓库；学习进度继续由原应用保存，不将资料正文写入localStorage。 */
(() => {
'use strict';
const M=MaterialsCore,L=LearningCore,DB_NAME='yike-materials-v1';let database=null,opening=null,cache=[],listeners=[];
const error=e=>new Error(e?.name==='QuotaExceededError'?'浏览器存储空间不足，资料未保存。请先导出备份并整理空间。':`无法使用资料库：${e?.message||e?.name||'IndexedDB操作失败'}。原学习数据未移动，请使用Safari正常模式与HTTPS地址重试。`);
function open(){
 if(database)return Promise.resolve(database);if(opening)return opening;
 opening=new Promise((resolve,reject)=>{
  if(!globalThis.indexedDB){reject(error({message:'浏览器不支持IndexedDB'}));return;}
  const req=indexedDB.open(DB_NAME,1);
  req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains('materials'))db.createObjectStore('materials',{keyPath:'id'});if(!db.objectStoreNames.contains('retired'))db.createObjectStore('retired',{keyPath:'articleId'});};
  req.onerror=()=>reject(error(req.error));req.onblocked=()=>reject(error({message:'旧标签页占用了资料库，请关闭旧页面再重试'}));
  req.onsuccess=()=>{database=req.result;database.onversionchange=()=>{database.close();database=null;opening=null;};resolve(database);};
 }).catch(e=>{opening=null;throw e;});return opening;
}
async function readAll(store='materials'){
 const db=await open();return new Promise((resolve,reject)=>{const tx=db.transaction(store,'readonly'),req=tx.objectStore(store).getAll();let value;req.onsuccess=()=>{value=req.result;};tx.oncomplete=()=>resolve(value||[]);tx.onabort=()=>reject(error(tx.error));tx.onerror=()=>{};});
}
function publish(records){cache=records;L.setExternalCatalog({words:records.filter(r=>r.kind==='vocabulary').map(r=>({...r.payload,materialId:r.id})),articles:records.filter(r=>r.kind==='reading').map(r=>({...r.payload,materialId:r.id}))});listeners.forEach(fn=>{try{fn(records);}catch(e){globalThis.console?.error(e);}});}
async function refresh(){const records=(await readAll()).map(r=>M.normalize(r,r.updatedAt));publish(records);return records;}
async function digest(record){if(!globalThis.crypto?.subtle)throw Error('资料去重需要HTTPS或localhost安全环境。请使用GitHub Pages网址。');const bytes=new TextEncoder().encode(M.contentKey(record)),out=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(out)].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function addBatch(input,base,retiredInput=[]){
 const records=input.map(r=>M.normalize(r));const hashes=await Promise.all(records.map(digest));const db=await open();
 const result=await new Promise((resolve,reject)=>{
  const tx=db.transaction(['materials','retired'],'readwrite'),store=tx.objectStore('materials'),retired=tx.objectStore('retired'),req=store.getAll(),rreq=retired.getAll();let current=null,tombs=null,summary={added:0,skipped:[]},failure=null;
  const run=()=>{if(current===null||tombs===null)return;try{
   const known=[...current],add=[],index=M.duplicateIndex(current,base);
   for(const [i,r]of records.entries()){
    let reason=index.check(r);
    if(!reason&&r.kind==='reading'){const tomb=tombs.find(t=>t.articleId===r.payload.id);if(tomb&&tomb.digest!==hashes[i])reason='该阅读ID曾用于不同文章，请改用新ID以保护旧答题记录。';}
    if(reason){summary.skipped.push({title:r.title,reason});continue;}known.push(r);index.add(r);add.push({record:r,digest:hashes[i]});
   }
   const bytes=new TextEncoder().encode(JSON.stringify(known)).byteLength;
   if(known.length>M.MAX_RECORDS||bytes>M.MAX_STORED)throw Error('本阶段资料库上限为5000条 / 6MB文本。请导出并整理后重试；没有覆盖或部分写入。');
   for(const item of add){store.add({...item.record,digest:item.digest});if(item.record.kind==='reading')retired.delete(item.record.payload.id);}summary.added=add.length;
   for(const t of retiredInput)if(!tombs.some(x=>x.articleId===t.articleId)&&!known.some(r=>r.kind==='reading'&&r.payload.id===t.articleId))retired.add(t);
  }catch(e){failure=e;tx.abort();}};
  req.onsuccess=()=>{current=req.result;run();};rreq.onsuccess=()=>{tombs=rreq.result;run();};tx.oncomplete=()=>resolve(summary);tx.onabort=()=>reject(failure||error(tx.error));tx.onerror=()=>{};
 });await refresh();broadcast();return result;
}
async function remove(id){
 const db=await open(),r=(await readAll()).find(r=>r.id===id);if(!r)return false;const hash=r.kind==='reading'?(r.digest||await digest(r)):null;
 await new Promise((resolve,reject)=>{const tx=db.transaction(['materials','retired'],'readwrite');if(hash)tx.objectStore('retired').put({articleId:r.payload.id,digest:hash});tx.objectStore('materials').delete(id);tx.oncomplete=resolve;tx.onabort=()=>reject(error(tx.error));tx.onerror=()=>{};});await refresh();broadcast();return true;
}
async function exportBundle(){const [records,retired]=await Promise.all([readAll(),readAll('retired')]);return M.bundle(records,retired);}
let channel;try{channel=new BroadcastChannel('yike-materials-change');channel.onmessage=()=>refresh().catch(()=>{});}catch{}
function broadcast(){try{channel?.postMessage({changed:true});}catch{}}
window.MaterialsDB={DB_NAME,open,refresh,readAll,addBatch,remove,exportBundle,snapshot:()=>cache,onChange:fn=>listeners.push(fn)};
})();
