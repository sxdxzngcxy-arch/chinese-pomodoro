/* 一个完整备份包含主学习数据、资料文本及音频base64；确认恢复前全部校验。 */
(() => {
'use strict';
const A=StudyApp,C=StudyCore,G=GardenCore,L=LearningCore,P=PlatformCore,$=id=>document.getElementById(id),change=V2UI.change,clone=x=>JSON.parse(JSON.stringify(x));
const MAX_BACKUP=100*1024*1024;
let candidate=null,working=false;
async function flush(){if(await window.WritingUI?.flush()===false||await window.ListeningUI?.flush()===false)throw Error('有尚未保存的输入，请先导出当前草稿或复制听写文字并检查空间。');}
function snapshot(){const s=clone(A.getFreshState()),now=Date.now();if(s.timer.endAt!==null){s.timer.remaining=Math.max(1,C.remaining(s,now));s.timer.endAt=null;}for(const d of Object.values(s.study.reading.drafts)){d.elapsed=L.readingElapsed(d,now);d.runningSince=null;}for(const d of Object.values(s.platform.writing.drafts)){d.elapsed=P.elapsed(d,now);d.runningSince=null;}G.pause(s.garden,now);return s;}
async function exportFull(){if(working)return;working=true;$('export-data').disabled=true;A.notify('正在本机打包资料和音频，请留在页面，稍后保存到“文件”…');try{await flush();if(A.isStorageBlocked())throw Error('原数据格式异常，请使用“仅导出学习文本”保留原始文件。');if(A.isMemoryOnly())throw Error('浏览器已禁用localStorage，请先使用“仅导出学习文本”保存当前内存学习记录，再单独备份资料。');const mediaAssets=await MediaDB.exportAssets(),materialsBackup=await MaterialsDB.exportBundle(),s=snapshot();const ids=new Set(mediaAssets.map(a=>a.id));for(const lesson of s.platform.listening.lessons)if(lesson.audioId&&!ids.has(lesson.audioId))throw Error('某份配对音频已丢失，请先重新配对或在设置中解除引用，避免生成不完整备份。');s.platform.backupAt=Date.now();const raw={...s,backupFormat:'liujimiao-full',backupVersion:2,exportedAt:new Date().toISOString(),materialsBackup,mediaAssets};const json=JSON.stringify(raw);if(new Blob([json]).size>MAX_BACKUP)throw Error('整站备份超过100MB，请先单独保存大音频并整理资料库后重试。');A.download(json,`六级喵-V2-完整备份-${C.day()}.json`);await change(state=>{state.platform.backupAt=s.platform.backupAt;});A.notify('整站备份已生成，包含资料和音频。请在iPhone“文件”App确认保存成功；其中含私人心境日记，请妥善保管。');}catch(e){A.notify('完整备份未生成：'+e.message);}finally{working=false;$('export-data').disabled=false;}}
$('export-data').addEventListener('click',exportFull);
const textOnly=A.button('仅导出学习文本（不含资料和音频）',async()=>{try{try{await flush();}catch{}const text=A.isStorageBlocked()?(localStorage.getItem(C.KEY)||localStorage.getItem(C.LEGACY)||'{}'):JSON.stringify({...snapshot(),textOnly:true,pendingWriting:WritingUI.pending(),pendingDictation:ListeningUI.pending(),exportedAt:new Date().toISOString()});A.download(text,`六级喵-学习文本非完整-${C.day()}.json`);A.notify('已生成学习文本备份；此文件不包含导入资料与音频，请另行保管。');}catch(e){A.notify(e.message);}});$('export-data').after(textOnly);
$('export-recovery').addEventListener('click',()=>{try{const raw=localStorage.getItem(C.KEY+'-before-import');if(!raw){A.notify('本机尚无“恢复前副本”。每次整站恢复前会保留一份。');return;}A.download(raw,`六级喵-恢复前学习副本-${C.day()}.json`);A.notify('已导出恢复前的学习副本；资料和音频不在此副本内，原IndexedDB内容仍留在本机。');}catch(e){A.notify(e.message);}});
async function validate(raw){
 if(raw.backupFormat!==undefined&&(raw.backupFormat!=='liujimiao-full'||raw.backupVersion!==2))throw Error('整站备份格式或版本不受支持。');
 const state=C.normalize(raw,new Set(WORDS.map(w=>w.id))),materials=raw.materialsBackup===undefined?null:await MaterialsUI.validateBackup(raw.materialsBackup);
 if(raw.backupFormat==='liujimiao-full'&&(!Array.isArray(raw.mediaAssets)||!materials))throw Error('完整备份缺少音频或资料列表。');
 // 仅文本应急备份可包含尚未写入主状态的草稿/听写；一并校验后恢复。
 const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_:-]{1,160}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
 if(raw.pendingWriting!=null){const d=raw.pendingWriting;if(!safeId(d.id)||typeof d.body!=='string'||d.body.length>50000||!Number.isFinite(d.updatedAt)||d.updatedAt<0)throw Error('应急草稿字段无效。');const draft=P.draft(state,d.id);draft.body=d.body;draft.updatedAt=d.updatedAt;}
 if(raw.pendingDictation!=null){const d=raw.pendingDictation;if(!safeId(d.lesson)||!safeId(d.segment)||typeof d.input!=='string'||d.input.length>8000)throw Error('应急听写字段无效。');const pr=P.listeningProgress(state,d.lesson),old=pr.answers[d.segment];pr.answers[d.segment]={input:d.input,checked:false,correct:false,attempts:old?.attempts||0};}
 C.normalize(state);
 const assets=raw.mediaAssets===undefined?[]:await MediaDB.validateAssets(raw.mediaAssets);
 const existing=assets.length||state.platform.listening.lessons.some(l=>l.audioId)?await MediaDB.all():[];
 const ids=new Map(existing.map(a=>[a.id,a]));for(const a of assets){const old=ids.get(a.id);if(old&&await MediaDB.digest(old.blob)!==await MediaDB.digest(a.blob))throw Error('本机已有同ID但不同内容的音频，已拒绝覆盖。');ids.set(a.id,a);}
 for(const lesson of state.platform.listening.lessons)if(lesson.audioId&&!ids.has(lesson.audioId))throw Error(`听力“${lesson.title}”缺少音频。请选择含音频的整站备份，或先在原设备解除配对后重新导出。`);
 const added=assets.filter(a=>!existing.some(e=>e.id===a.id));if(existing.reduce((n,a)=>n+a.blob.size,0)+added.reduce((n,a)=>n+a.blob.size,0)>MediaDB.MAX_TOTAL)throw Error('恢复音频将超过本站60MB上限，请先导出并整理本机音频。');
 return{state,materials,assets,hasPlatform:raw.platform!==undefined,hasGarden:raw.garden!==undefined};
}
$('import-file').addEventListener('change',async()=>{if(working)return;candidate=null;$('import-preview').hidden=true;$('restore-garden').checked=false;const file=$('import-file').files[0];if(!file)return;working=true;A.notify('正在校验备份；音频较多时需要一些时间。');try{if(file.size>MAX_BACKUP)throw Error('备份上限100MB。');const raw=JSON.parse(await file.text());candidate=await validate(raw);const c=candidate;$('restore-garden-label').hidden=!c.hasGarden;$('import-summary').textContent=`即将恢复：${Object.keys(c.state.progress).length} 个单词进度、${c.state.tasks.length} 个任务、${c.state.platform.listening.lessons.length} 份听力、${Object.keys(c.state.platform.writing.drafts).length} 份草稿。追加资料 ${c.materials?.materials.length||0} 项、音频 ${c.assets.length} 个；重复资料跳过，不删除现有资料或音频。主学习记录会替换，恢复前先保存本机学习副本。心境默认保留，勾选后按日期合并。${!c.hasPlatform?'此为旧版备份，新增V2训练数据会保留本机内容。':''}请先确认你已下载当前整站备份。`;$('import-preview').hidden=false;A.notify('校验通过，尚未修改任何学习数据。请核对恢复预览。');}catch(e){candidate=null;A.notify('未恢复：'+e.message);}finally{working=false;$('import-file').value='';}});
$('cancel-import').addEventListener('click',()=>{candidate=null;$('import-preview').hidden=true;});
$('confirm-import').addEventListener('click',async()=>{if(!candidate||working)return;working=true;$('confirm-import').disabled=true;const c=candidate,merge=$('restore-garden').checked;try{ListeningUI.pause();await WritingUI.pause();await flush();if(A.isMemoryOnly())throw Error('浏览器禁止本地存储，无法安全恢复。请退出隐私模式或允许本地存储。');
 // 先保存恢复副本；此步骤失败就停止，不触碰主学习数据或媒体。
 const previous=localStorage.getItem(C.KEY);if(previous!==null)localStorage.setItem(C.KEY+'-before-import',previous);
 // IDB追加是幂等的。后续写入失败时，旧主记录保留；新追加资料也不删除旧资料。
 if(c.assets.length)await MediaDB.addBatch(c.assets);
 let result={added:0,skipped:[]};if(c.materials)result=await MaterialsUI.restoreBundle(c.materials);
 const replacement=clone(c.state);if(replacement.timer.endAt!==null){replacement.timer.remaining=Math.max(1,C.remaining(replacement,Date.now()));replacement.timer.endAt=null;}for(const d of Object.values(replacement.study.reading.drafts)){d.elapsed=L.readingElapsed(d,Date.now());d.runningSince=null;}for(const d of Object.values(replacement.platform.writing.drafts)){d.elapsed=P.elapsed(d,Date.now());d.runningSince=null;}G.pause(replacement.garden,Date.now());
 const ok=await change(s=>{const garden=s.garden,platform=s.platform;Object.assign(s,replacement);s.garden=merge?G.merge(garden,replacement.garden):garden;if(!c.hasPlatform)s.platform=platform;},{restore:true,settleTimer:false});
 if(!ok)throw Error('主学习记录未写入，原记录保留。追加成功的音频/资料仍在本机，请保管备份再重试。');
 A.finishRestore();try{localStorage.removeItem('liujimiao-writing-pending');localStorage.removeItem('liujimiao-dictation-pending');}catch{}candidate=null;$('import-preview').hidden=true;window.dispatchEvent(new Event('study:restored'));window.dispatchEvent(new Event('media:changed'));A.notify(`恢复完成：资料新增${result.added}项、重复跳过${result.skipped.length}项。恢复前学习副本已保留；计时已暂停，心境按你的选择保留或合并。`);
 }catch(e){A.notify('恢复未完成：'+e.message+' 原有资料与音频未删除，请保留备份文件。');}finally{working=false;$('confirm-import').disabled=false;}});
window.BackupUI={validate,exportFull,snapshot};
})();
