/* 资料中心阶段1：页面草稿 -> 人工核对 -> IndexedDB；不改旧学习存储。 */
(() => {
'use strict';
const A=StudyApp,L=LearningCore,M=MaterialsCore,D=MaterialsDB,B=MaterialsBatch,$=id=>document.getElementById(id),node=A.node,button=A.button;
let drafts=[],assessments=[],previewPage=0,libraryPage=0,editIndex=null,editorPayload=null,editorRead=null,editorMode='edit',previousFocus=null,deleteId=null,ready=false,loading=true,working=false,filename='',retiredInput=[];
let reading=false,readController=null,readToken=0,files=[],previewBytes=0,lastCommit=null;
const PAGE=10;
const base=()=>{const s=A.getFreshState();return M.baseline([...WORDS,...s.study.customWords],[...READING_PACKS,...s.study.readingPacks]);};
function status(message){$('materials-status').textContent=message;A.notify(message);}
const pages=(items,page)=>items.slice(page*PAGE,(page+1)*PAGE);
const labelSource=r=>`${r.kind==='vocabulary'?'词库':'仔细阅读'} · ${r.meta.source.label} · ${r.meta.year||'年份未知'}`;
function setPagination(prefix,total,page){const count=Math.max(1,Math.ceil(total/PAGE));$(`material-${prefix}-page`).textContent=`${page+1} / ${count}`;$(`material-${prefix}-prev`).disabled=page===0;$(`material-${prefix}-next`).disabled=page+1>=count;}
function setBusyControls(){
 const blocked=working||reading;
 document.querySelector('.materials-preview-card').setAttribute('aria-busy',String(blocked));
 for(const id of ['materials-file','materials-kind','materials-reviewed','material-apply-source','material-select-valid','material-select-none','materials-clear-preview'])$(id).disabled=blocked;
 $('materials-export-report').disabled=blocked||!files.length;
 $('materials-preview').querySelectorAll('button,input').forEach(el=>{el.disabled=blocked;});
}
function renderFileReport(){
 const reports=B.summarize(files,assessments),failed=reports.filter(f=>f.state==='error').length;
 $('materials-file-details').hidden=!reports.length;
 $('materials-files-summary').textContent=`${reports.length} 份文件 · ${failed} 份无法解析 · 已导入 ${reports.reduce((n,f)=>n+f.imported,0)} 项`;
 $('materials-file-results').replaceChildren();
 for(const file of reports){
  const row=node('div',undefined,'batch-file-row');row.append(node('strong',file.name));
  row.append(node('p',file.error?`未读取：${file.error}`:`解析 ${file.total} 项 · 已导入 ${file.imported} · 当前可导入 ${file.valid} · 无效 ${file.invalid} · 重复 ${file.duplicates} · 未勾选 ${file.excluded}${file.skipped?' · 保存时跳过 '+file.skipped:''}`,'helper'));
  $('materials-file-results').append(row);
 }
}
function renderPreview(){
 assessments=M.assess(drafts,D.snapshot(),base());previewPage=Math.min(previewPage,Math.max(0,Math.ceil(drafts.length/PAGE)-1));
 const invalid=assessments.filter(a=>a.errors.length).length,duplicates=assessments.filter(a=>a.duplicate).length,chosen=assessments.filter(a=>a.draft.selected!==false),valid=chosen.filter(a=>a.record&&!a.duplicate),skipped=chosen.length-valid.length;
 $('materials-summary').textContent=drafts.length?`共 ${drafts.length} 项，待修复 ${invalid}，重复 ${duplicates}，已选 ${chosen.length}；可导入 ${valid.length}，将跳过 ${skipped}。确认前请核对来源和内容。`:'尚未选择文件。这里只保存确认后的资料；不会猜测缺失答案或解析。';
 const filter=$('material-preview-filter').value,query=$('material-preview-search').value.trim().toLowerCase();
 const visible=assessments.filter(a=>{const valid=a.record&&!a.duplicate;return (filter==='all'||filter==='issues'&&(a.errors.length||a.duplicate)||filter==='valid'&&valid&&a.draft.selected!==false||filter==='unselected'&&a.draft.selected===false)&&(!query||`${a.record?.title||a.draft.payload?.word||a.draft.payload?.title||''} ${a.draft.origin?.name||''} ${a.errors.join(' ')} ${a.duplicate||''}`.toLowerCase().includes(query));});
 previewPage=Math.min(previewPage,Math.max(0,Math.ceil(visible.length/PAGE)-1));
 $('materials-file-name').textContent=files.length?`${files.length} 份文件`:filename||'尚未选择文件';$('materials-preview').replaceChildren();
 for(const item of pages(visible,previewPage)){
  const {draft,record,index}=item,row=node('article',undefined,'material-preview-row'),title=record?.title||draft.payload?.word||draft.payload?.title||`第 ${index+1} 项`,label=node('label',undefined,'material-select'),check=node('input');check.type='checkbox';check.checked=draft.selected!==false;check.setAttribute('aria-label',`选择 ${title}`);check.addEventListener('change',()=>{draft.selected=check.checked;$('materials-reviewed').checked=false;renderPreview();});
  const info=node('div');info.append(node('strong',title),node('small',item.errors.length?'需要人工修复':item.duplicate?'重复，将跳过':'结构有效 · 仍需人工核对',item.errors.length||item.duplicate?'material-warning':''));
  if(draft.origin)info.append(node('small',`${draft.origin.name} · 第 ${draft.origin.row} 项`));
  if(record)info.append(node('small',labelSource(record)));if(item.errors.length||item.duplicate)info.append(node('p',item.errors.join('；')||item.duplicate));
  label.append(check,info);row.append(label,button('编辑核对',()=>openEditor(index)));$('materials-preview').append(row);
 }
 if(!visible.length&&drafts.length)$('materials-preview').append(node('p','此筛选下没有项目；可以切换筛选或修改搜索。','helper'));
 setPagination('preview',visible.length,previewPage);$('confirm-materials').disabled=!ready||working||reading||!$('materials-reviewed').checked||!valid.length;
 $('confirm-materials').textContent=working?'正在保存，请稍候…':reading?'正在读取文件…':`确认导入可用资料${valid.length?'（'+valid.length+'项）':''}${skipped?' · 跳过'+skipped+'项':''}`;
 renderFileReport();setBusyControls();
}
function renderLibrary(){
 const all=D.snapshot(),query=$('materials-search').value.trim().toLowerCase(),kind=$('materials-filter').value,year=$('materials-year-filter').value;
 const years=[...new Set(all.map(r=>String(r.meta.year||'unknown')))].sort().reverse(),selector=$('materials-year-filter'),selected=selector.value;
 selector.replaceChildren();const any=node('option','全部年份');any.value='all';selector.append(any);for(const y of years){const op=node('option',y==='unknown'?'年份未知':y);op.value=y;selector.append(op);}selector.value=[...selector.options].some(o=>o.value===selected)?selected:'all';
 const filtered=all.filter(r=>(kind==='all'||r.kind===kind)&&(selector.value==='all'||String(r.meta.year||'unknown')===selector.value)&&(!query||`${r.title} ${r.meta.source.label} ${r.meta.source.rights} ${r.kind==='vocabulary'?r.payload.meaning:''}`.toLowerCase().includes(query))).sort((a,b)=>b.createdAt-a.createdAt);
 libraryPage=Math.min(libraryPage,Math.max(0,Math.ceil(filtered.length/PAGE)-1));$('materials-library-count').textContent=`显示 ${filtered.length} / ${all.length} 项 · 资料存于 IndexedDB，原学习记录未移动。`;$('materials-library').replaceChildren();
 if(!filtered.length)$('materials-library').append(node('p',ready?'这里还没有符合条件的资料。':'本地资料库暂不可用，原学习功能仍可使用。','helper'));
 for(const r of pages(filtered,libraryPage)){
  const row=node('article',undefined,'material-library-row'),info=node('div');info.append(node('strong',r.title),node('small',labelSource(r)),node('p',r.meta.source.rights));const actions=node('div',undefined,'inline-actions');
  actions.append(button('查看',()=>openExisting(r.id)),button(r.kind==='vocabulary'?'去背词':'去阅读',()=>{if(r.kind==='reading')LearningUI.openReading(r.payload.id);else A.navigate('words');}),button(deleteId===r.id?'确认删除':'删除',async()=>{
   if(deleteId!==r.id){deleteId=r.id;renderLibrary();return;}
   try{await D.remove(r.id);deleteId=null;status('资料已删除，原来的词汇进度、阅读作答和奖励记录均保留。');}catch(e){status(e.message);}
  }));row.append(info,actions);$('materials-library').append(row);
 }setPagination('library',filtered.length,libraryPage);$('export-materials').disabled=!ready||working;
 $('materials-library').querySelectorAll('button').forEach(el=>{el.disabled=working;});
}
function field(container,label,value,{tag='input',rows=2,readOnly=false}={}){
 const wrapper=node('label',label),input=node(tag);input.value=typeof value==='string'?value:value===undefined?'':String(value);if(tag==='textarea')input.rows=rows;input.readOnly=readOnly;wrapper.append(input);container.append(wrapper);return input;
}
function buildEditor(payload,kind){
 $('material-edit-fields').replaceChildren();const target=$('material-edit-fields');editorPayload=M.copy(payload||{});
 if(kind==='vocabulary'){
  const fields={};for(const [key,label]of [['word','英文'],['meaning','中文释义'],['ipa','音标'],['pos','词性'],['example','英文例句'],['translation','例句翻译'],['collocations','常见搭配'],['association','辅助联想（不是词源）']])fields[key]=field(target,label,payload?.[key],{tag:['example','translation','association'].includes(key)?'textarea':'input'});
  editorRead=()=>({...editorPayload,...Object.fromEntries(Object.entries(fields).map(([key,el])=>[key,el.value]))});return;
 }
 const article=payload&&typeof payload==='object'?payload:{},id=field(target,'文章ID（不同文章不可共用）',article.id),title=field(target,'标题',article.title),paras=[],questions=[];
 for(const [i,p]of (Array.isArray(article.paragraphs)?article.paragraphs:[]).entries()){
  const box=node('details');box.append(node('summary',`段落 ${p?.id||i+1}`));const text=field(box,'段落原文',p?.text,{tag:'textarea',rows:5});paras.push({original:p,text});target.append(box);
 }
 for(const [i,q]of (Array.isArray(article.questions)?article.questions:[]).entries()){
  const box=node('details',undefined,'material-question-editor');box.append(node('summary',`第 ${i+1} 题：${String(q?.stem||'题干缺失').slice(0,75)}`));
  const stem=field(box,'题干',q?.stem,{tag:'textarea',rows:3}),options=[];
  for(const o of Array.isArray(q?.options)?q.options:[])options.push({original:o,text:field(box,`选项 ${o?.id||'ID缺失'}`,o?.text,{tag:'textarea'})});
  const label=node('label','正确答案（不确定请先核对）'),answer=node('select'),empty=node('option','未填写');empty.value='';answer.append(empty);
  for(const o of options){const opt=node('option',o.original?.id||'');opt.value=o.original?.id||'';answer.append(opt);}answer.value=q?.answer||'';label.append(answer);box.append(label);
  const e=q?.explanation||{},summary=field(box,'答案解析',e.summary,{tag:'textarea',rows:3}),paraphrase=field(box,'同义替换说明',e.paraphrase,{tag:'textarea'}),evidence=[],distractors={};
  for(const ev of Array.isArray(e.evidence)&&e.evidence.length?e.evidence:[{paragraphId:article.paragraphs?.[0]?.id||'',quote:''}]){
   const wrap=node('div',undefined,'material-evidence'),pid=field(wrap,'依据所在段落ID',ev.paragraphId),quote=field(wrap,'依据句（需逐字出现在原段落中）',ev.quote,{tag:'textarea',rows:3});evidence.push({pid,quote});box.append(wrap);
  }
  for(const o of options)distractors[o.original?.id||'']=field(box,`干扰项 ${o.original?.id||'?'} 解释（正确选项可留空）`,e.distractors?.[o.original?.id]||'',{tag:'textarea'});
  questions.push({original:q,stem,options,answer,summary,paraphrase,evidence,distractors});target.append(box);
 }
 if(!paras.length||!questions.length)target.append(node('p','段落或题目结构缺失，请切换 JSON 编辑补齐；不会自动编造题目。','helper'));
 editorRead=()=>({...article,id:id.value,title:title.value,paragraphs:paras.map(p=>({...p.original,text:p.text.value})),questions:questions.map(q=>({...q.original,stem:q.stem.value,options:q.options.map(o=>({...o.original,text:o.text.value})),answer:q.answer.value,explanation:{summary:q.summary.value,paraphrase:q.paraphrase.value,evidence:q.evidence.map(e=>({paragraphId:e.pid.value,quote:e.quote.value})),distractors:Object.fromEntries(Object.entries(q.distractors).map(([key,el])=>[key,el.value]))}}))});
}
function openEditor(index){
 editIndex=index;editorMode='edit';const d=drafts[index];previousFocus=document.activeElement;fillEditor(d);$('material-editor-title').textContent='编辑核对 · 尚未保存入库';$('save-material-edit').hidden=false;
}
function fillEditor(d){
 $('material-edit-kind').value=d.meta?.source?.kind||'user-provided';$('material-edit-label').value=d.meta?.source?.label||'';$('material-edit-year').value=d.meta?.year??'';$('material-edit-rights').value=d.meta?.source?.rights||'';$('material-editor-error').textContent='';$('material-raw-mode').checked=false;$('material-raw-label').hidden=true;$('material-edit-fields').hidden=false;
 buildEditor(d.payload,d.kind);$('material-editor').hidden=false;document.body.classList.add('editor-open');
 $('material-editor').querySelectorAll('input,textarea,select').forEach(el=>{el.disabled=false;});$('material-edit-label').focus();
}
function openExisting(id){
 const r=D.snapshot().find(r=>r.id===id);if(!r)return;editorMode='view';previousFocus=document.activeElement;fillEditor(r);$('material-editor-title').textContent='已导入资料 · 查看';$('save-material-edit').hidden=true;$('material-raw-mode').checked=true;$('material-raw-label').hidden=false;$('material-edit-fields').hidden=true;$('material-raw-json').value=JSON.stringify(r.payload,null,2);
 $('material-editor').querySelectorAll('input,textarea,select').forEach(el=>{el.disabled=true;});$('material-raw-json').disabled=false;$('material-raw-json').readOnly=true;$('close-material-editor').focus();
}
function closeEditor(){$('material-editor').hidden=true;document.body.classList.remove('editor-open');$('material-raw-json').readOnly=false;previousFocus?.focus();}
$('close-material-editor').addEventListener('click',closeEditor);$('material-editor').addEventListener('click',e=>{if(e.target===$('material-editor'))closeEditor();});
document.addEventListener('keydown',e=>{if($('material-editor').hidden)return;if(e.key==='Escape'){closeEditor();return;}if(e.key==='Tab'){const els=[...$('material-editor').querySelectorAll('button,input,textarea,select')].filter(x=>!x.disabled&&!x.closest('[hidden]')&&x.getClientRects().length);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('material-raw-mode').addEventListener('change',()=>{
 try{if($('material-raw-mode').checked)$('material-raw-json').value=JSON.stringify(editorRead(),null,2);else buildEditor(JSON.parse($('material-raw-json').value),drafts[editIndex].kind);$('material-edit-fields').hidden=$('material-raw-mode').checked;$('material-raw-label').hidden=!$('material-raw-mode').checked;}
 catch(e){$('material-raw-mode').checked=true;$('material-editor-error').textContent=`JSON尚未修复：${e.message}`;}
});
$('save-material-edit').addEventListener('click',()=>{
 if(editorMode!=='edit'||editIndex===null)return;
 try{const d=drafts[editIndex];d.payload=$('material-raw-mode').checked?JSON.parse($('material-raw-json').value):editorRead();d.meta={source:{kind:$('material-edit-kind').value,label:$('material-edit-label').value,rights:$('material-edit-rights').value},year:$('material-edit-year').value};$('materials-reviewed').checked=false;closeEditor();renderPreview();status('预览修改已保留，请检查剩余问题并人工核对，尚未写入资料库。');}
 catch(e){$('material-editor-error').textContent=e.message;}
});
async function previewFiles(input,kind=null){
 const selectedFiles=Array.from(input||[]);if(!selectedFiles.length)return false;
 if(working||reading){status('正在读取或保存，请完成后再追加文件。');return false;}
 if(!$('material-editor').hidden){status('请先保存或关闭正在编辑的预览，再追加文件。');return false;}
 if(!ready){status('资料库未连接，请先重新连接；原学习功能不受影响。');return false;}
 if(kind)$('materials-kind').value=kind;
 const selectedKind=$('materials-kind').value,token=++readToken;reading=true;readController=new AbortController();
 $('materials-reviewed').checked=false;$('materials-read-progress').hidden=false;renderPreview();
 try{
  const result=await B.read(selectedFiles,selectedKind,{signal:readController.signal,usedFiles:files.length,usedBytes:previewBytes,usedRecords:drafts.length,usedRetired:retiredInput,onProgress:p=>{
   if(token!==readToken)return;
   $('materials-read-bar').max=Math.max(1,p.total);$('materials-read-bar').value=p.done;
   $('materials-read-label').textContent=`已检查 ${p.done} / ${p.total} 份${p.name?' · '+p.name:''}；仅生成预览，尚未入库。`;
  }});
  if(token!==readToken)return false;
  const checked=M.assess([...drafts,...result.drafts],D.snapshot(),base());
  for(const item of checked)if(item.index>=drafts.length&&item.duplicate)item.draft.selected=false;
  drafts.push(...result.drafts);files.push(...result.files);previewBytes+=result.bytesRead;retiredInput=result.retiredReadings;
  previewPage=0;$('materials-commit-status').textContent='';$('material-preview-filter').value='all';$('material-preview-search').value='';
  const failures=result.files.filter(f=>f.state==='error').length;
  if(result.drafts.some(d=>{try{M.source(d.meta?.source);return false;}catch{return true;}}))$('materials-source-details').open=true;
  if(failures)$('materials-file-details').open=true;
  status(result.drafts.length?`已追加 ${result.drafts.length} 项到统一预览；${failures} 份文件无法解析，原因见文件处理情况。没有写入资料库，请核对后确认。`:`没有新增可预览资料；${failures} 份文件未读取，原有预览与已保存数据保持。请查看文件错误。`);
  return true;
 }catch(e){if(token===readToken)status(e.name==='AbortError'?'已取消本次读取，原有预览和已保存资料保持。':`${e.message} 原有预览与已保存资料保持。`);return false;}
 finally{if(token===readToken){reading=false;readController=null;$('materials-read-progress').hidden=true;$('materials-file').value='';renderPreview();}}
}
$('materials-file').addEventListener('change',()=>previewFiles($('materials-file').files));
$('materials-cancel-reading').addEventListener('click',()=>{
 if(!reading)return;readController?.abort();readToken++;reading=false;readController=null;
 $('materials-read-progress').hidden=true;$('materials-file').value='';renderPreview();status('已取消本次读取，原有预览和已保存资料保持；可以重新选择文件。');
});
$('materials-clear-preview').addEventListener('click',()=>{
 if(working||reading||!files.length&&!drafts.length)return;
 if(!confirm('只清空尚未保存的预览和本次文件报告；不会删除已经导入的资料、单词进度或其他学习记录。继续吗？'))return;
 drafts=[];assessments=[];files=[];previewBytes=0;retiredInput=[];lastCommit=null;filename='';previewPage=0;$('materials-source-details').open=false;
 $('materials-reviewed').checked=false;$('materials-commit-status').textContent='';$('material-preview-filter').value='all';$('material-preview-search').value='';renderPreview();status('预览已清空，已导入资料和学习记录保持。');
});
$('materials-export-report').addEventListener('click',()=>{
 if(working||reading||!files.length)return;renderPreview();
 A.download(JSON.stringify({...B.report(files,assessments),lastCommit},null,2),`cet6-import-report-${StudyCore.day()}.json`);status('已生成导入报告，包含文件错误与待处理条目，不是整站学习备份。');
});
for(const id of ['material-preview-filter','material-preview-search'])$(id).addEventListener(id.endsWith('search')?'input':'change',()=>{previewPage=0;renderPreview();});
$('material-apply-source').addEventListener('click',()=>{
 try{const source=M.source({kind:$('material-default-kind').value,label:$('material-default-label').value,rights:$('material-default-rights').value}),year=M.year($('material-default-year').value);for(const d of drafts)if(d.selected!==false)d.meta={source:{...source},year};$('materials-reviewed').checked=false;renderPreview();status('已更新选中预览项的来源信息；原有资料没有改变。');}catch(e){status(e.message);}
});
$('materials-reviewed').addEventListener('change',renderPreview);
$('material-select-valid').addEventListener('click',()=>{assessments=M.assess(drafts.map(d=>({...d,selected:true})),D.snapshot(),base());assessments.forEach(a=>{drafts[a.index].selected=!!a.record&&!a.duplicate;});$('materials-reviewed').checked=false;renderPreview();});$('material-select-none').addEventListener('click',()=>{drafts.forEach(d=>{d.selected=false;});$('materials-reviewed').checked=false;renderPreview();});
for(const [prefix,setPage]of [['preview',v=>{previewPage=v;}],['library',v=>{libraryPage=v;}]])for(const [direction,delta]of [['prev',-1],['next',1]])$(`material-${prefix}-${direction}`).addEventListener('click',()=>{setPage((prefix==='preview'?previewPage:libraryPage)+delta);if(prefix==='preview')renderPreview();else renderLibrary();});
async function withLock(work){return navigator.locks?.request?navigator.locks.request(StudyCore.KEY,work):work();}
async function restoreBundle(bundle){const normalized=M.validateBundle(bundle);if(!normalized.materials.length&&!normalized.retiredReadings.length)return{added:0,skipped:[]};await D.open();const result=await withLock(()=>D.addBatch(normalized.materials,base(),normalized.retiredReadings));if(result.refreshPending)throw Error(result.message);return result;}
$('confirm-materials').addEventListener('click',async()=>{
 if(working||reading||!ready||!$('materials-reviewed').checked)return;renderPreview();if($('confirm-materials').disabled)return;
 const selected=assessments.filter(a=>a.draft.selected!==false),importable=selected.filter(a=>a.record&&!a.duplicate);
 if(!importable.length){status('没有可导入的资料，请先修复或取消重复项。');return;}
 const beforeAssessments=assessments,allDrafts=[...drafts];
 working=true;renderPreview();renderLibrary();$('materials-commit-status').textContent=`正在校验并保存 ${importable.length} 项。完成前请留在页面；重复点击不会重复导入。`;
 await new Promise(resolve=>setTimeout(resolve,0));
 try{
  // 与原资料中心共用锁和同一个原子IDB事务，提交前重新检查其他标签新增的重复资料。
  const result=await withLock(()=>D.addBatch(importable.map(a=>a.record),base(),retiredInput));
  const storedIds=new Set(result.addedIds),accepted=new Set(importable.map(a=>a.draft));
  for(const item of importable){const file=files.find(f=>f.id===item.draft.origin?.fileId);if(file){if(storedIds.has(item.record.id))file.imported++;else file.skipped++;}}
  const totalSkipped=allDrafts.length-importable.length+result.skipped.length;
  const issues=beforeAssessments.filter(a=>!importable.includes(a)).map(a=>({file:a.draft.origin?.name||'',row:a.draft.origin?.row||a.index+1,title:a.record?.title||a.draft.payload?.word||a.draft.payload?.title||'',reason:a.errors.join('；')||a.duplicate||'未勾选'}));
  lastCommit={at:new Date().toISOString(),added:result.added,skipped:totalSkipped,issues,storageSkipped:result.skipped};
  drafts=drafts.filter(d=>!accepted.has(d));retiredInput=[];previewPage=0;$('materials-reviewed').checked=false;
  $('materials-commit-status').textContent=`保存完成：新增 ${result.added} 项，跳过 ${totalSkipped} 项。未导入项目仍在预览，可筛选问题、编辑并再次确认。${result.refreshPending?' 请重新连接以加载已保存资料。':''}`;
  if(result.refreshPending){ready=false;$('materials-retry').hidden=false;status(result.message);}else status(`已导入 ${result.added} 项，跳过 ${totalSkipped} 项。重复资料不覆盖；待修复项目保留。详情可导出报告，背词与阅读已接入新资料。`);
  await storageInfo();
 }catch(e){$('materials-commit-status').textContent='未完成导入；预览仍保留，请核对提示后重试。';status(e.message);}
 finally{working=false;renderPreview();renderLibrary();}
});
for(const id of ['materials-search','materials-filter','materials-year-filter'])$(id).addEventListener(id==='materials-search'?'input':'change',()=>{libraryPage=0;renderLibrary();});
$('export-materials').addEventListener('click',async()=>{try{const bundle=await D.exportBundle();A.download(JSON.stringify(bundle,null,2),`cet6-materials-${StudyCore.day()}.json`);status('资料备份已在本机生成，可保存到“文件”。学习进度和心境请使用统计页完整备份。');}catch(e){status(e.message);}});
async function storageInfo(){
 const bytes=new TextEncoder().encode(JSON.stringify(D.snapshot())).byteLength;let suffix='浏览器未提供可用容量估算。';
 try{const estimate=await navigator.storage?.estimate?.();if(estimate?.quota)suffix=`此站点约用 ${(estimate.usage/1048576).toFixed(1)}MB / ${(estimate.quota/1048576).toFixed(0)}MB（浏览器估算，可能调整）。`;}catch{}
 $('materials-storage').textContent=`资料库 ${(bytes/1048576).toFixed(2)} / 6MB文本。${suffix} 清除网站数据或换设备可能丢失，请定期导出。`;
}
async function initialize(){
 loading=true;
 try{await D.refresh();ready=true;$('materials-retry').hidden=true;await storageInfo();renderPreview();renderLibrary();}
 catch(e){ready=false;$('materials-storage').textContent=e.message;$('materials-retry').hidden=false;renderPreview();renderLibrary();}
 finally{loading=false;}
}
$('materials-retry').addEventListener('click',initialize);
D.onChange(()=>{ready=true;A.refreshMaterials();if(A.getPage()==='materials'){renderPreview();renderLibrary();}storageInfo().catch(()=>{});});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)D.refresh().catch(()=>{});});
window.MaterialsUI={isLoading:()=>loading,isReady:()=>ready,previewFile:async(file,kind='vocabulary')=>{A.navigate('materials');return previewFiles([file],kind);},previewFiles:async(files,kind='vocabulary')=>{A.navigate('materials');return previewFiles(files,kind);},isReading:()=>reading,isWorking:()=>working,render:()=>{if(A.getPage()==='materials'){renderPreview();renderLibrary();}},restoreBundle,validateBackup:async raw=>{const normalized=M.validateBundle(raw);if(normalized.materials.length||normalized.retiredReadings.length)await D.open();return normalized;},openExisting:id=>{A.navigate('materials');openExisting(id);}};
initialize();
})();
