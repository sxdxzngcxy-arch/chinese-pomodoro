/* V4.4资料概览、全词库搜索和独立拼写；沿用原事务、备份和导航。 */
(() => {
'use strict';
const A=StudyApp,C=StudyCore,L=LearningCore,P=PlatformCore,S=SpellingCore,$=id=>document.getElementById(id),node=A.node,button=A.button,change=V2UI.change;
let page=0,queryKey='',held=null,downloadController=null,pendingSpell=null,savingSpell=false,spellSequence=0;
const words=()=>L.catalog(WORDS,A.getState().study);
function speak(word){if(!word)return;try{if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)throw Error('此浏览器暂不支持发音，请切回看中文拼写。');speechSynthesis.cancel();held=new SpeechSynthesisUtterance(word);held.lang=A.getState().study.accent;held.rate=.85;held.onerror=()=>{$('v44-spelling-feedback').textContent='语音未能播放，请检查系统英语语音，或使用看中文拼写。';};speechSynthesis.speak(held);}catch(e){A.notify(e.message);}}
function render(){
 const all=words(),readings=L.readingCatalog(READING_PACKS,A.getState().study),lessons=ListeningUI.catalog(),prompts=WritingUI.catalog();
 const count=`当前可学 ${all.length} 词 · 阅读 ${readings.length} 篇 · 有声精听 ${TRAINING_DATA.listening.filter(l=>l.audioPath).length} 段 · 作文 ${prompts.filter(p=>p.type==='writing').length} 题 · 翻译 ${prompts.filter(p=>p.type==='translation').length} 题`;
 $('v44-home-counts').textContent=count;$('v44-pack-counts').textContent=count+'。新版本的内置资料已自动接入，不需要逐个导入。';
 const on=A.getPage()==='words';$('v44-word-extras').hidden=!on;if(!on)return;
 $('v44-catalog-title').textContent=`全部词库 · ${all.length} 词，可搜索与收藏`;
 renderCatalog(all);renderSpelling(all);
}
function renderCatalog(all){
 const query=$('v44-word-search').value.trim().toLowerCase(),filter=$('v44-word-status').value,s=A.getState();
 const list=all.filter(w=>(!query||`${w.word} ${w.meaning}`.toLowerCase().includes(query))&&(filter==='all'||filter==='new'&&!s.progress[w.id]||filter==='wrong'&&s.progress[w.id]?.wrong||filter==='mastered'&&s.progress[w.id]?.stage>=3));
 const count=Math.max(1,Math.ceil(list.length/20));page=Math.min(page,count-1);$('v44-word-count').textContent=`筛选 ${list.length} / 全部 ${all.length} 词；每页20词，不是词库数量上限。`;$('v44-word-page').textContent=`${page+1} / ${count}`;$('v44-word-prev').disabled=page===0;$('v44-word-next').disabled=page+1>=count;
 const key=JSON.stringify([page,query,filter,list.slice(page*20,page*20+20).map(w=>[w.id,w.meaning,L.status(s.progress[w.id]),s.study.favorites.includes(w.id)])]);if(queryKey===key)return;queryKey=key;$('v44-word-list').replaceChildren();
 for(const w of list.slice(page*20,page*20+20)){const row=node('div',undefined,'v2-row'),actions=node('div',undefined,'inline-actions');row.append(node('strong',w.word),node('p',w.pos+' '+w.meaning),node('small',`${L.status(s.progress[w.id])} · ${w.bundled?'原创补充释义':w.materialId?'本机导入':w.id.startsWith('user:')?'个人词':'原内置词'}`));actions.append(button('听发音',()=>speak(w.word)),button(s.study.favorites.includes(w.id)?'已收藏 · 取消':'收藏',()=>change(next=>{const f=next.study.favorites;next.study.favorites=f.includes(w.id)?f.filter(x=>x!==w.id):[...f,w.id];})));row.append(actions);$('v44-word-list').append(row);}
}
function renderSpelling(all){
 const d=A.getState().platform.spelling,a=d.active,active=!!a&&a.index<a.ids.length,w=active?all.find(w=>w.id===a.ids[a.index]):null,answer=active?a.answers[a.index]:null;
 $('v44-spelling-mode').value=d.mode;$('v44-spelling-start').textContent=active?'重新抽取10词':'开始10词练习';$('v44-spelling-finish').disabled=!active;$('v44-spelling-form').hidden=!active||!w;
 $('v44-spelling-progress').textContent=active?`第 ${a.index+1} / ${a.ids.length} 词 · ${savingSpell||pendingSpell?'输入正在保存':'位置与输入已保存'}` :a?`本轮结束：核对 ${a.answers.length} 词，正确 ${a.answers.filter(x=>x.correct).length} 词。`:'准备好后开始，10词一轮。';
 if(active&&w){$('v44-spelling-prompt').textContent=d.mode==='sound'?'先点击听发音，再输入听到的英文。':w.meaning;$('v44-spelling-speak').hidden=false;if(document.activeElement!==$('v44-spelling-input'))$('v44-spelling-input').value=a.draft;$('v44-spelling-input').disabled=!!answer;$('v44-spelling-form').querySelector('[type="submit"]').disabled=!!answer;$('v44-spelling-next').disabled=!answer;$('v44-spelling-feedback').textContent=answer?`${answer.correct?'拼写正确。':'还可以再练。'}正确拼写：${w.word} · ${w.meaning}`:'';}
 if(active&&!w){$('v44-spelling-feedback').textContent='该词已被移出资料库，可以结束此轮；已保存的词汇进度不变。';}
 $('v44-spelling-history').replaceChildren();for(const h of d.history.slice(0,5))$('v44-spelling-history').append(node('p',`${new Date(h.at).toLocaleDateString('zh-CN')} · ${h.correct} / ${h.total} 词拼写正确`,'helper'));
}
for(const id of ['v44-word-search','v44-word-status'])$(id).addEventListener(id.endsWith('search')?'input':'change',()=>{page=0;renderCatalog(words());});
for(const[id,delta]of [['v44-word-prev',-1],['v44-word-next',1]])$(id).addEventListener('click',()=>{page+=delta;renderCatalog(words());});
$('v44-spelling-mode').addEventListener('change',()=>{const mode=$('v44-spelling-mode').value;change(s=>{s.platform.spelling.mode=mode;});});
$('v44-spelling-start').addEventListener('click',async()=>{const s=A.getState(),a=s.platform.spelling.active;if(a&&a.index<a.ids.length&&!confirm('重新开始本轮拼写？已交卷历史和词卡复习计划保持不变。'))return;const all=words(),learned=all.filter(w=>s.progress[w.id]),chosen=L.shuffle(learned).slice(0,10);chosen.push(...L.shuffle(all.filter(w=>!s.progress[w.id])).slice(0,Math.max(0,10-chosen.length)));const ids=L.shuffle(chosen).map(w=>w.id);await change(s=>S.start(s,ids,'spell-'+C.uid(),Date.now()));});
async function flushSpelling(){
 if(savingSpell){while(savingSpell)await new Promise(r=>setTimeout(r,20));if(!pendingSpell)return true;}
 while(pendingSpell){savingSpell=true;const data=pendingSpell;pendingSpell=null;const ok=await change(s=>{const a=s.platform.spelling.active;if(data.sequence===spellSequence&&a?.id===data.round&&a.index===data.index&&!a.answers[data.index])a.draft=data.draft;});savingSpell=false;if(!ok){if(!pendingSpell)pendingSpell=data;$('v44-spelling-progress').textContent='输入尚未保存，请保留页面并复制文字或导出学习文本。';A.notify('拼写输入未保存，请保留页面并复制文字或导出学习文本。');return false;}}
 renderSpelling(words());return true;
}
$('v44-spelling-input').addEventListener('input',()=>{const a=A.getState().platform.spelling.active;if(!a)return;pendingSpell={round:a.id,index:a.index,draft:$('v44-spelling-input').value,sequence:++spellSequence};$('v44-spelling-progress').textContent='输入正在保存…';flushSpelling();});
$('v44-spelling-form').addEventListener('submit',async e=>{e.preventDefault();await flushSpelling();const a=A.getState().platform.spelling.active;if(!a)return;const w=words().find(w=>w.id===a.ids[a.index]);if(!w)return;const value=$('v44-spelling-input').value;await change(s=>S.check(s,a.id,a.index,value,w,Date.now()));});
$('v44-spelling-next').addEventListener('click',()=>{const a=A.getState().platform.spelling.active;if(a)change(s=>S.next(s,a.id,a.index,Date.now()));});
$('v44-spelling-finish').addEventListener('click',()=>change(s=>S.finish(s,Date.now())));
$('v44-spelling-speak').addEventListener('click',()=>{const a=A.getState().platform.spelling.active,w=words().find(w=>w.id===a?.ids[a.index]);speak(w?.word);});
$('v44-source-load').addEventListener('click',async()=>{
 if(downloadController)return;if(!$('v44-source-ack').checked){A.notify('请先核对并勾选词库来源与使用范围说明。');return;}
 if(MaterialsUI.isReading()||MaterialsUI.isWorking()){A.notify('请先完成或取消当前资料操作。');return;}
 const controller=new AbortController();downloadController=controller;$('v44-source-load').disabled=true;$('v44-source-cancel').hidden=false;
 try{const pack=await V44Source.fetchPack({signal:controller.signal,onProgress:message=>{$('v44-source-status').textContent=message;}});if(controller.signal.aborted)return;$('v44-source-cancel').hidden=true;const file=new File([JSON.stringify(pack)],'用户指定六级词库-全部.json',{type:'application/json'});const ready=await MaterialsUI.previewFiles([file],'vocabulary');$('v44-source-status').textContent=ready?`已读取并合并 ${pack.words.length} 词，原始 ${pack.audit.sourceRecords} 条记录。现在统一核对预览并确认导入；尚未保存。`:'文件已读取，但未追加预览，请查看资料中心提示。';}
 catch(e){$('v44-source-status').textContent=e.name==='AbortError'?'已取消下载，原有资料与进度保持。':`未安装词库：${e.message} 可改用已下载的本地JSON备用包。`;}
 finally{downloadController=null;$('v44-source-load').disabled=false;$('v44-source-cancel').hidden=true;}
});
$('v44-source-cancel').addEventListener('click',()=>downloadController?.abort());
window.addEventListener('study:before-navigate',e=>{if(e.detail.previous==='materials'&&e.detail.next!=='materials')downloadController?.abort();if(e.detail.previous==='words'&&e.detail.next!=='words'){flushSpelling();held=null;try{speechSynthesis.cancel();}catch{}}});
window.addEventListener('study:restored',()=>{spellSequence++;pendingSpell=null;queryKey='';render();});
window.V44UI={render,flushSpelling,pendingSpelling:()=>pendingSpell};render();
})();
