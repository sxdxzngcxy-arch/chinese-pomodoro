/* 音频 Blob 单独存 IndexedDB；不把音频放 localStorage，不联网。 */
(() => {
'use strict';
const MAX_FILE=25*1024*1024,MAX_TOTAL=60*1024*1024,MAX_ASSETS=200;
let connection;
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||Error('IndexedDB读取失败。'));});
function open(){if(connection)return connection;connection=new Promise((resolve,reject)=>{if(!window.indexedDB)return reject(Error('此浏览器不支持音频持久保存。'));const r=indexedDB.open('liujimiao-media-v2',1);r.onupgradeneeded=()=>r.result.createObjectStore('assets',{keyPath:'id'});r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=null;};resolve(r.result);};r.onerror=()=>{connection=null;reject(r.error||Error('无法打开音频库。'));};r.onblocked=()=>{connection=null;reject(Error('其他标签正在更新音频库，请关闭后重试。'));};});return connection;}
async function all(){const db=await open();return request(db.transaction('assets').objectStore('assets').getAll());}
async function get(id){const db=await open();return request(db.transaction('assets').objectStore('assets').get(id));}
function valid(a){if(!a||typeof a.id!=='string'||!/^audio-[a-zA-Z0-9_-]{1,120}$/.test(a.id)||!(a.blob instanceof Blob)||!a.blob.size||a.blob.size>MAX_FILE||!['audio/mpeg','audio/wav','audio/x-wav','audio/mp4','audio/ogg'].includes(a.blob.type)||typeof a.name!=='string'||a.name.length>200||!Number.isFinite(a.createdAt))throw Error('音频对象格式、大小或类型无效。');return a;}
async function digest(blob){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer())),b=>b.toString(16).padStart(2,'0')).join('');}
async function addBatch(items){
 const checked=[];for(const a of items){valid(a);checked.push({...a,sha256:await digest(a.blob)});}const db=await open();
 return new Promise((resolve,reject)=>{const tx=db.transaction('assets','readwrite'),store=tx.objectStore('assets'),read=store.getAll();let count=0,error;
 read.onsuccess=()=>{try{const previous=read.result,byId=new Map(previous.map(a=>[a.id,a]));let size=previous.reduce((n,a)=>n+a.blob.size,0);for(const a of checked){const found=byId.get(a.id);if(found){if(found.sha256!==a.sha256)throw Error('相同音频ID内容不同，已停止，未覆盖任何文件。');continue;}size+=a.blob.size;if(size>MAX_TOTAL||byId.size>=MAX_ASSETS)throw Error('本站音频库上限60MB/200个文件，请先备份并移除不需要的音频。');byId.set(a.id,a);store.add(a);count++;}}catch(e){error=e;tx.abort();}};
 tx.oncomplete=()=>resolve(count);tx.onabort=()=>reject(error||tx.error||Error('音频保存失败；可能空间不足或隐私模式限制。'));tx.onerror=()=>{};});
}
async function addFile(file){if(!file||!file.size||file.size>MAX_FILE)throw Error('请选择不超过25MB的音频。较长录音可先分段。');const ext=file.name.toLowerCase().split('.').pop(),types={mp3:'audio/mpeg',wav:'audio/wav',m4a:'audio/mp4',ogg:'audio/ogg'};if(!types[ext])throw Error('支持MP3、WAV、M4A、OGG；iPhone的具体解码支持由系统决定。');const a={id:'audio-'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2)),name:file.name.slice(0,200),blob:new Blob([file],{type:types[ext]}),createdAt:Date.now()};await addBatch([a]);return a;}
async function remove(id){const db=await open();return new Promise((resolve,reject)=>{const t=db.transaction('assets','readwrite');t.objectStore('assets').delete(id);t.oncomplete=resolve;t.onabort=()=>reject(t.error);});}
async function exportAssets(){const out=[];for(const a of await all()){const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=()=>reject(r.error);r.readAsDataURL(a.blob);});out.push({id:a.id,name:a.name,type:a.blob.type,size:a.blob.size,createdAt:a.createdAt,sha256:await digest(a.blob),data});}return out;}
async function validateAssets(raw){if(!Array.isArray(raw)||raw.length>MAX_ASSETS)throw Error('音频备份列表无效。');const result=[],ids=new Set();let size=0;for(const a of raw){if(!a||typeof a.data!=='string'||a.data.length>Math.ceil(MAX_FILE/3)*4||!Number.isSafeInteger(a.size)||a.size<=0||a.size>MAX_FILE||!/^[-a-f0-9]{64}$/.test(a.sha256)||ids.has(a.id))throw Error('音频备份损坏或重复。');ids.add(a.id);size+=a.size;if(size>MAX_TOTAL)throw Error('音频备份超过60MB限制。');let binary;try{binary=atob(a.data);}catch{throw Error('音频编码无效。');}if(binary.length!==a.size)throw Error('音频长度校验失败。');const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0)),asset={id:a.id,name:a.name,createdAt:a.createdAt,blob:new Blob([bytes],{type:a.type})};valid(asset);if(await digest(asset.blob)!==a.sha256)throw Error('音频完整性校验失败。');result.push(asset);}return result;}
window.MediaDB={MAX_FILE,MAX_TOTAL,all,get,addFile,addBatch,remove,exportAssets,validateAssets,digest};
})();
