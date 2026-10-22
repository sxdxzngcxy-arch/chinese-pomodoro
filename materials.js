/* 资料中心阶段1：页面草稿 -> 人工核对 -> IndexedDB；不改旧学习存储。 */
(() => {
'use strict';
const A=StudyApp,L=LearningCore,M=MaterialsCore,D=MaterialsDB,$=id=>document.getElementById(id),node=A.node,button=A.button;
let drafts=[],assessments=[],previewPage=0,libraryPage=0,editIndex=null,editorPayload=null,editorRead=null,editorMode='edit',previousFocus=null,deleteId=null,ready=false,loading=true,working=false,filename='',retiredInput=[];
const PAGE=10;
const base=()=>{const s=A.getFreshState();return M.baseline([...WORDS,...s.study.customWords],[...READING_PACKS,...s.study.readingPacks]);};
function status(message){$('materials-status').textContent=message;A.notify(message);}
const pages=(items,page)=>items.slice(page*PAGE,(page+1)*PAGE);
const labelSource=r=>`${r.kind==='vocabulary'?'词库':'仔细阅读'} · ${r.meta.source.label} · ${r.meta.year||'年份未知'}`;
function setPagination(prefix,total,page){const count=Math.max(1,Math.ceil(total/PAGE));$(`material-${prefix}-page`).textContent=`${page+1} / ${count}`;$(`material-${prefix}-prev`).disabled=page===0;$(`material-${prefix}-next`).disabled=page+1>=count;}
function renderPreview(){
 assessments=M.assess(drafts,D.snapshot(),base());previewPage=Math.min(previewPage,Math.max(0,Math.ceil(drafts.length/PAGE)-1));
 const invalid=assessments.filter(a=>a.errors.length).length,duplicates=assessments.filter(a=>a.duplicate).length,chosen=assessments.filter(a=>a.draft.selected!==false),valid=chosen.filter(a=>a.record&&!a.duplicate),skipped=chosen.length-valid.length;
 $('materials-summary').textContent=drafts.length?`共 ${drafts.length} 项，待修复 ${invalid}，重复 ${duplicates}，已选 ${chosen.length}；可导入 ${valid.length}，将跳过 ${skipped}。确认前请核对来源和内容。`:'尚未选择文件。这里只保存确认后的资料；不会猜测缺失答案或解析。';
 $('materials-file-name').textContent=filename||'尚未选择文件';$('materials-preview').replaceChildren();
 for(const item of pages(assessments,previewPage)){
  const {draft,record,index}=item,row=node('article',undefined,'material-preview-row'),title=record?.title||draft.payload?.word||draft.payload?.title||`第 ${index+1} 项`,label=node('label',undefined,'material-select'),check=node('input');check.type='checkbox';check.checked=draft.selected!==false;check.setAttribute('aria-label',`选择 ${title}`);check.addEventListener('change',()=>{draft.selected=check.checked;$('materials-reviewed').checked=false;renderPreview();});
  const info=node('div');info.append(node('strong',title),node('small',item.errors.length?'需要人工修复':item.duplicate?'重复，将跳过':'结构有效 · 仍需人工核对',item.errors.length||item.duplicate?'material-warning':''));
  if(record)info.append(node('small',labelSource(record)));if(item.errors.length||item.duplicate)info.append(node('p',item.errors.join('；')||item.duplicate));
  label.append(check,info);row.append(label,button('编辑核对',()=>openEditor(index)));$('materials-preview').append(row);
 }
 setPagination('preview',drafts.length,previewPage);$('confirm-materials').disabled=!ready||working||!$('materials-reviewed').checked||!valid.length;
 $('confirm-materials').textContent=working?'正在保存…':`确认导入可用资料${valid.length?'（'+valid.length+'项）':''}${skipped?' · 跳过'+skipped+'项':''}`;
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
async function previewFile(file,kind=null){
 if(!file)return;if(working){status('正在保存，请完成后再选择新文件。');return;}if(kind)$('materials-kind').value=kind;
 $('materials-reviewed').checked=false;
 try{
  if(!ready)throw Error('资料库未连接，请先重新连接；原学习功能不受影响。');
  if(file.size>M.MAX_FILE)throw Error('本阶段文件最多10MB，请拆分文本资料；音频不会写入localStorage。');
  if(!/\.(csv|json|jsonl|jsonl\.txt|jsonl\(\d+\)\.txt)$/i.test(file.name))throw Error('词库支持 CSV/JSON/JSONL，尚不读取Excel、PDF、Word或音频。');
  const text=await file.text(),next=M.parse(text,file.name,$('materials-kind').value);filename=file.name;drafts=next;retiredInput=[];
  if(/\.json$/i.test(file.name)){const raw=JSON.parse(text.replace(/^\uFEFF/,''));if(raw?.format==='cet6-materials')retiredInput=M.validateBundle(raw).retiredReadings;}
  previewPage=0;$('materials-reviewed').checked=false;const checked=M.assess(drafts,D.snapshot(),base());checked.forEach(a=>{if(a.duplicate)a.draft.selected=false;});renderPreview();status('已生成本地预览，没有写入。请补齐缺失信息，并核对答案和来源。');
 }catch(e){renderPreview();status(`${e.message}${drafts.length?' 当前仍显示上一份未确认预览，请重新核对。':''}`);}finally{$('materials-file').value='';}
}
$('materials-file').addEventListener('change',()=>previewFile($('materials-file').files[0]));
$('material-apply-source').addEventListener('click',()=>{
 try{const source=M.source({kind:$('material-default-kind').value,label:$('material-default-label').value,rights:$('material-default-rights').value}),year=M.year($('material-default-year').value);for(const d of drafts)if(d.selected!==false)d.meta={source:{...source},year};$('materials-reviewed').checked=false;renderPreview();status('已更新选中预览项的来源信息；原有资料没有改变。');}catch(e){status(e.message);}
});
$('materials-reviewed').addEventListener('change',renderPreview);
$('material-select-valid').addEventListener('click',()=>{assessments=M.assess(drafts,D.snapshot(),base());assessments.forEach(a=>{a.draft.selected=!!a.record&&!a.duplicate;});$('materials-reviewed').checked=false;renderPreview();});$('material-select-none').addEventListener('click',()=>{drafts.forEach(d=>{d.selected=false;});$('materials-reviewed').checked=false;renderPreview();});
for(const [prefix,setPage]of [['preview',v=>{previewPage=v;}],['library',v=>{libraryPage=v;}]])for(const [direction,delta]of [['prev',-1],['next',1]])$(`material-${prefix}-${direction}`).addEventListener('click',()=>{setPage((prefix==='preview'?previewPage:libraryPage)+delta);if(prefix==='preview')renderPreview();else renderLibrary();});
async function withLock(work){return navigator.locks?.request?navigator.locks.request(StudyCore.KEY,work):work();}
async function restoreBundle(bundle){const normalized=M.validateBundle(bundle);if(!normalized.materials.length&&!normalized.retiredReadings.length)return{added:0,skipped:[]};await D.open();return withLock(()=>D.addBatch(normalized.materials,base(),normalized.retiredReadings));}
$('confirm-materials').addEventListener('click',async()=>{
 if(working||!ready||!$('materials-reviewed').checked)return;renderPreview();if($('confirm-materials').disabled)return;const selected=assessments.filter(a=>a.draft.selected!==false);const importable=selected.filter(a=>a.record&&!a.duplicate);if(!importable.length){status('没有可导入的资料，请先修复或取消重复项。');return;}
 working=true;renderPreview();
 try{const result=await withLock(()=>D.addBatch(importable.map(a=>a.record),base(),retiredInput));const totalSkipped=drafts.length-importable.length+result.skipped.length;const reasons=assessments.filter(a=>!importable.includes(a)).slice(0,8).map(a=>`第${a.index+1}项：${a.errors.join('；')||a.duplicate||'未勾选'}`);const accepted=new Set(importable.map(a=>a.draft));drafts=drafts.filter(d=>!accepted.has(d));if(!drafts.length)filename='';$('materials-reviewed').checked=false;status(`已导入 ${result.added} 项，跳过 ${totalSkipped} 项。${reasons.join('；')}。待修复项目保留在预览中，重复资料不覆盖。资料已接入背词或阅读。`);await storageInfo();}
 catch(e){status(e.message);}finally{working=false;renderPreview();renderLibrary();}
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
window.MaterialsUI={isLoading:()=>loading,isReady:()=>ready,previewFile:async(file,kind='vocabulary')=>{A.navigate('materials');await previewFile(file,kind);},render:()=>{if(A.getPage()==='materials'){renderPreview();renderLibrary();}},restoreBundle,validateBackup:async raw=>{const normalized=M.validateBundle(raw);if(normalized.materials.length||normalized.retiredReadings.length)await D.open();return normalized;},openExisting:id=>{A.navigate('materials');openExisting(id);}};
initialize();
})();
