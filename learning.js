/* V1.1 页面交互：共用原应用事务与备份，不另建一套用户数据。 */
(() => {
'use strict';
const A=StudyApp,L=LearningCore,C=StudyCore,$=id=>document.getElementById(id),node=A.node,button=A.button;
let importWords=null,importArticles=null,editId=null,editorSource='',deleteId=null,selectedWord=null,memoryKey='',lastReadingKey='',readingId='',previousFocus=null;
const state=()=>A.getState();
const allWords=()=>L.catalog(WORDS,state().study,{includePending:true});
const articles=()=>L.readingCatalog(READING_PACKS,state().study);
const findArticle=()=>articles().find(a=>a.id===readingId)||articles()[0];
const sourceLabel=a=>`${a.source.kind==='original'?'原创模拟题':a.source.kind==='user-provided'?'用户提供':a.source.kind==='licensed'?'授权材料':'公有领域'} · ${a.source.label}${a.year?' · '+a.year:''}`;
function saveError(e){A.notify(e.message||String(e));}
function openEditor(w=null){
 previousFocus=document.activeElement;editId=w?.id||null;editorSource=w?.source||'';deleteId=null;
 $('word-editor-title').textContent=w?'编辑个人单词':'添加个人单词';
 for(const key of ['word','meaning','ipa','pos','example','translation','collocations','association'])$(`custom-${key}`).value=w?.[key]||'';
 $('custom-word').readOnly=!!w;$('word-editor').hidden=false;document.body.classList.add('editor-open');
 setTimeout(()=>$(w?'custom-meaning':'custom-word').focus(),0);
}
function closeEditor(){$('word-editor').hidden=true;document.body.classList.remove('editor-open');previousFocus?.focus();}
function renderLibrary(){
 const s=state(),query=L.canonical($('library-search').value),personal=s.study.customWords;
 $('library-count').textContent=`个人 ${personal.length} · 收藏 ${s.study.favorites.length}`;
 const selected=allWords().filter(w=>(w.id.startsWith('user:')||s.study.favorites.includes(w.id))&&(!query||`${w.word} ${w.meaning}`.toLowerCase().includes(query)));
 $('library-list').replaceChildren();
 if(!selected.length)$('library-list').append(node('p','还没有符合条件的个人词或收藏。','helper'));
 for(const w of selected){
  const row=node('div',undefined,'library-row'),info=node('div');info.append(node('strong',w.word),node('small',w.pending?'待完善释义 · 不进入学习队列':`${w.pos} ${w.meaning}`));
  const actions=node('div',undefined,'inline-actions');
  if(w.id.startsWith('user:')){
   actions.append(button('编辑',()=>openEditor(w)),button(deleteId===w.id?'确认删除':'删除',async()=>{
    if(deleteId!==w.id){deleteId=w.id;renderLibrary();return;}
    await A.transact(s=>{s.study.customWords=s.study.customWords.filter(x=>x.id!==w.id);s.study.favorites=s.study.favorites.filter(x=>x!==w.id);});deleteId=null;A.refreshWords();
   }));
  }
  if(s.study.favorites.includes(w.id))actions.append(button('取消收藏',()=>A.transact(s=>{s.study.favorites=s.study.favorites.filter(id=>id!==w.id);})));row.append(info,actions);$('library-list').append(row);
 }
}
function renderMemory(w,revealed){
 $('favorite-word').disabled=!w;
 if(!w){$('memory-panel').hidden=true;return;}$('memory-panel').hidden=false;
 $('favorite-word').textContent=state().study.favorites.includes(w.id)?'★ 已收藏':'☆ 收藏';
 const key=`${w.id}:${revealed}:${w.association||''}:${w.collocations||''}`;
 if(memoryKey===key)return;memoryKey=key;$('memory-content').replaceChildren();
 if(!revealed){$('memory-content').append(node('p','先主动回忆，再翻卡查看提示。','helper'));return;}
 const m=MEMORY_DATA[w.word]||{};
 const block=(title,text)=>{if(!text)return;const div=node('div',undefined,'memory-block');div.append(node('strong',title),node('p',text));$('memory-content').append(div);};
 block('词源知识',m.etymology||'本版暂未整理可核实的词源，不自动拆分或编造。');
 if(m.source){const link=node('a','词源参考：Etymonline','template-link');link.href=m.source;link.target='_blank';link.rel='noopener noreferrer';$('memory-content').append(link);}
 block('辅助记忆联想 · 不是词源',w.association||m.association||'可以把这个词放进今天的学习或科研场景，自己造一句话，再尝试回忆。');
 block('常见搭配',w.collocations||m.collocations);block('易混淆对比',m.contrast);
 if(m.recall){const details=node('details'),summary=node('summary','主动回忆：补全例句'),p=node('p',m.recall);details.append(summary,p,node('small',`翻开后核对：${m.answer}`,'helper'));$('memory-content').append(details);}
}
$('add-custom-word').addEventListener('click',()=>openEditor());$('close-word-editor').addEventListener('click',closeEditor);
$('word-editor').addEventListener('click',e=>{if(e.target===$('word-editor'))closeEditor();});
document.addEventListener('keydown',e=>{
 if($('word-editor').hidden)return;
 if(e.key==='Escape'){closeEditor();return;}
 if(e.key==='Tab'){
  const focusables=[...$('word-editor').querySelectorAll('button,input,textarea')].filter(el=>!el.disabled),first=focusables[0],last=focusables.at(-1);
  if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
 }
});
$('custom-word-form').addEventListener('submit',async e=>{
 e.preventDefault();const raw={source:editorSource};for(const key of ['word','meaning','ipa','pos','example','translation','collocations','association'])raw[key]=$(`custom-${key}`).value;
 try{
  const w=L.word(raw),id=editId;
  const ok=await A.transact(s=>{
   if(id){const index=s.study.customWords.findIndex(x=>x.id===id);if(index<0)throw Error('该词已在另一页面删除，请重新添加。');if(w.id!==id)throw Error('已保存词的英文不可改名，请另建新词。');s.study.customWords[index]=w;}
   else if(!L.addWord(s,w,WORDS).added)throw Error('这个英文已在内置或个人词库中，无需重复添加。');
  });
  if(ok){closeEditor();A.refreshWords();A.notify('单词已保存，个人词库与学习备份已同步更新。');}
 }catch(e){saveError(e);}
});
$('show-library').addEventListener('click',()=>{$('library-panel').hidden=!$('library-panel').hidden;renderLibrary();});$('library-search').addEventListener('input',renderLibrary);
$('favorite-word').addEventListener('click',()=>{const id=A.getCurrent()?.id;if(!id)return;A.transact(s=>{const a=s.study.favorites;s.study.favorites=a.includes(id)?a.filter(x=>x!==id):[...a,id];});});
$('word-order').addEventListener('change',async()=>{const order=$('word-order').value;if(!['sequence','random','weak'].includes(order))return;const ok=await A.transact(s=>{s.study.order=order;});if(ok)A.refreshWords();});
$('word-accent').addEventListener('change',()=>{const accent=$('word-accent').value;A.transact(s=>{s.study.accent=accent;});});
$('word-file').addEventListener('change',async()=>{
 importWords=null;$('word-import-preview').hidden=true;const file=$('word-file').files[0];if(!file)return;
 try{
  if(file.size>2*1024*1024)throw Error('单次词库文件请小于 2MB。');importWords=L.previewWords(await file.text(),file.name,allWords());
  $('word-import-summary').textContent=`可新增 ${importWords.words.length} 词，跳过重复 ${importWords.duplicates.length} 词，格式错误 ${importWords.errors.length} 条。确认后只添加，不覆盖已有词。`;
  $('word-import-errors').textContent=[...importWords.errors.slice(0,6),importWords.duplicates.length?`重复：${importWords.duplicates.slice(0,8).join('、')}`:'',`待导入：${importWords.words.slice(0,10).map(w=>w.word).join('、')}`].filter(Boolean).join('\n');
  $('confirm-word-import').disabled=!importWords.words.length;$('word-import-preview').hidden=false;
 }catch(e){saveError(e);}finally{$('word-file').value='';}
});
$('cancel-word-import').addEventListener('click',()=>{importWords=null;$('word-import-preview').hidden=true;});
$('confirm-word-import').addEventListener('click',async()=>{
 if(!importWords)return;const batch=importWords.words;let added=0;
 const ok=await A.transact(s=>{for(const w of batch)if(L.addWord(s,w,WORDS).added)added++;});
 if(ok){importWords=null;$('word-import-preview').hidden=true;A.refreshWords();A.notify(`已新增 ${added} 词；重复词保持原内容和进度。`);}
});
function tokenize(target,text,paragraph){
 const parts=text.split(/([A-Za-z]+(?:[-’'][A-Za-z]+)*)/g);
 for(const [i,part]of parts.entries())if(i%2===0)target.append(document.createTextNode(part));else{
  const b=button(part,()=>selectReadingWord(part,paragraph),'read-token');b.setAttribute('aria-label',`查看生词 ${part}`);target.append(b);
 }
}
function renderParagraph(p,a,result){
 const wrapper=node('div',undefined,'reading-paragraph');wrapper.id=`paragraph-${p.id}`;wrapper.append(node('span',p.id,'paragraph-label'));const text=node('p');
 const evidence=result?a.questions.filter(q=>result.questionIds.includes(q.id)).flatMap(q=>q.explanation.evidence.filter(e=>e.paragraphId===p.id)):[];
 const ranges=evidence.map(e=>({start:p.text.indexOf(e.quote),end:p.text.indexOf(e.quote)+e.quote.length})).sort((a,b)=>a.start-b.start),merged=[];
 for(const r of ranges){const last=merged.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else merged.push({...r});}
 let from=0;for(const r of merged){tokenize(text,p.text.slice(from,r.start),p);const mark=node('mark');tokenize(mark,p.text.slice(r.start,r.end),p);text.append(mark);from=r.end;}tokenize(text,p.text.slice(from),p);wrapper.append(text);return wrapper;
}
function selectReadingWord(token,p){
 selectedWord={word:L.canonical(token),paragraph:p};const existing=allWords().find(w=>L.canonical(w.word)===selectedWord.word);
 $('reading-word-tool').hidden=false;$('reading-word-label').textContent=selectedWord.word;
 $('reading-word-definition').textContent=existing?(existing.pending?'已加入，待补充释义':`${existing.pos} ${existing.meaning}`):'未在本地词库中；可先保存生词，再查词补充释义。';
 $('add-reading-word').disabled=!!existing;$('add-reading-word').textContent=existing?'已在词库':'加入生词本';$('edit-reading-word').hidden=!existing?.id.startsWith('user:');
}
$('add-reading-word').addEventListener('click',async()=>{
 if(!selectedWord)return;const selected={...selectedWord},a=findArticle();let added=false;
 const ok=await A.transact(s=>{added=L.addWord(s,{word:selected.word,meaning:'',example:selected.paragraph.text.slice(0,2000),source:`阅读：${a.title} / ${selected.paragraph.id}`},WORDS,{pending:true}).added;});
 if(ok){selectReadingWord(selected.word,selected.paragraph);A.notify(added?'已存入个人词库，补齐释义后进入背词队列。':'这个词已在词库中。');}
});
$('edit-reading-word').addEventListener('click',()=>{const w=allWords().find(w=>w.word===selectedWord?.word&&w.id.startsWith('user:'));if(w)openEditor(w);});
function renderReading(force=false){
 const s=state(),list=articles();
 if(!readingId)readingId=Object.keys(s.study.reading.drafts)[0]||list[0]?.id||'';
 const a=findArticle();if(!a)return;readingId=a.id;
 const selector=$('reading-select');if([...selector.options].map(o=>o.value).join('|')!==list.map(a=>a.id).join('|')){selector.replaceChildren();for(const item of list){const option=node('option',item.title);option.value=item.id;selector.append(option);}}selector.value=readingId;
 const d=s.study.reading.drafts[a.id],result=d?null:s.study.reading.last[a.id];
 const key=JSON.stringify({id:a.id,d,result,records:s.study.reading.records,revision:s.revision});
 $('reading-source').textContent=`${sourceLabel(a)}。${a.source.rights}`;
 $('start-reading').textContent=d?'继续已保存练习':'开始新一轮';$('retry-reading').disabled=!a.questions.some(q=>s.study.reading.records[a.id]?.[q.id]?.lastCorrect===false);
 $('pause-reading').hidden=!d;$('pause-reading').textContent=d?.runningSince===null?'继续阅读计时':'暂停阅读计时';
 $('reading-summary').textContent=d?'选择实时保存；切换页面不会自动暂停计时。':result?`上次：${result.correct} / ${result.total}，正确率 ${Math.round(result.correct/result.total*100)}%。仅练习结果。`:'先选材料，点击开始；未交卷前隐藏解析。';
 $('reading-empty').hidden=!!d||!!result;$('reading-work').hidden=!d&&!result;
 renderReadingTimer();renderReasonStats();
 if(!force&&key===lastReadingKey)return;lastReadingKey=key;
 if(!d&&!result)return;
 $('reading-title').textContent=a.title;$('reading-kind').textContent=a.source.kind==='original'?'原创模拟题':'自备材料';$('reading-passage').replaceChildren();a.paragraphs.forEach(p=>$('reading-passage').append(renderParagraph(p,a,result)));
 $('reading-question-list').replaceChildren();$('reading-result').textContent=result?`${result.correct} / ${result.total} · ${Math.round(result.correct/result.total*100)}%`:`已答 ${Object.keys(d.answers).filter(id=>d.questionIds.includes(id)).length} / ${d.questionIds.length}`;
 const ids=d?.questionIds||result.questionIds;
 for(const [index,id]of ids.entries()){
  const q=a.questions.find(q=>q.id===id);if(!q)continue;
  const card=node('section',undefined,'reading-question');card.dataset.qid=q.id;const legend=node('legend',`${index+1}. ${q.stem}`);const fieldset=node('fieldset');fieldset.append(legend);
  for(const option of q.options){const label=node('label',undefined,'reading-option'),input=node('input');input.type='radio';input.name=`reading-${q.id}`;input.value=option.id;input.checked=(d?.answers[q.id]||result?.answers[q.id])===option.id;input.disabled=!d;
   if(result&&option.id===q.answer)label.classList.add('right');if(result&&option.id===result.answers[q.id]&&option.id!==q.answer)label.classList.add('wrong');
   input.addEventListener('change',()=>A.transact(s=>{const live=s.study.reading.drafts[a.id];if(!live||live.id!==d.id)throw Error('本轮已结束，请刷新阅读页面。');live.answers[q.id]=option.id;}));label.append(input,node('span',`${option.id}. ${option.text}`));fieldset.append(label);
  }
  card.append(fieldset);
  if(result){
   const e=q.explanation,analysis=node('div',undefined,'reading-analysis');analysis.append(node('strong',`${result.answers[q.id]===q.answer?'✓ 回答正确':'再看一下依据'} · 正确答案 ${q.answer}`),node('p',e.summary));
   for(const ev of e.evidence){const anchor=node('a',`依据 ${ev.paragraphId}：${ev.quote}`);anchor.href=`#paragraph-${ev.paragraphId}`;anchor.addEventListener('click',event=>{event.preventDefault();document.getElementById(`paragraph-${ev.paragraphId}`)?.scrollIntoView({block:'center',behavior:document.body.classList.contains('reduce-motion')?'instant':'smooth'});});analysis.append(anchor);}
   analysis.append(node('p',`同义替换：${e.paraphrase}`));
   const details=node('details'),summary=node('summary','逐项排除干扰项');details.append(summary);for(const [id,why]of Object.entries(e.distractors))details.append(node('p',`${id}：${why}`));analysis.append(details);
   const r=s.study.reading.records[a.id]?.[q.id];
   if(r?.lastCorrect===false){const label=node('label','我的主要错因：'),select=node('select');const empty=node('option','请选择');empty.value='';select.append(empty);for(const reason of L.reasons){const op=node('option',reason);op.value=reason;select.append(op);}select.value=r.reason;select.setAttribute('aria-label',`${q.id} 错因`);select.addEventListener('change',()=>{const reason=select.value;A.transact(s=>{s.study.reading.records[a.id][q.id].reason=reason;});});label.append(select);analysis.append(label);}
   const star=button(r?.star?'★ 已收藏此题':'☆ 收藏此题',()=>A.transact(s=>{const item=s.study.reading.records[a.id]?.[q.id];if(item)item.star=!item.star;}));analysis.append(star);card.append(analysis);
  }
  $('reading-question-list').append(card);
 }
 $('submit-reading').hidden=!d;$('reading-restart').hidden=!!d;
}
function renderReadingTimer(){const a=findArticle();if(!a)return;const s=state(),d=s.study.reading.drafts[a.id],r=s.study.reading.last[a.id],seconds=Math.floor((d?L.readingElapsed(d,Date.now()):r?.elapsed||0)/1000);$('reading-timer').textContent=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;}
function renderReasonStats(){
 const records=Object.values(state().study.reading.records).flatMap(r=>Object.values(r)),wrong=records.filter(r=>r.lastCorrect===false);$('reading-reasons').replaceChildren();
 for(const reason of L.reasons){const row=node('div',undefined,'reason-row');row.append(node('span',reason),node('strong',wrong.filter(r=>r.reason===reason).length));$('reading-reasons').append(row);}
 $('reading-reasons').append(node('p',`待复练 ${wrong.length} 题 · 已收藏 ${records.filter(r=>r.star).length} 题 · 尚未分类 ${wrong.filter(r=>!r.reason).length} 题`,'helper'));
}
$('reading-select').addEventListener('change',()=>{readingId=$('reading-select').value;selectedWord=null;$('reading-word-tool').hidden=true;renderReading(true);});
$('start-reading').addEventListener('click',()=>{const a=findArticle();A.transact(s=>{const d=s.study.reading.drafts[a.id];if(d){if(d.runningSince===null)d.runningSince=Date.now();}else L.startReading(s,a,Date.now());});});
function startAgain(wrongOnly=false){const a=findArticle();if(state().study.reading.drafts[a.id]){A.notify('当前练习尚未提交，先完成本轮，避免覆盖已保存的答案。');return;}A.transact(s=>L.startReading(s,a,Date.now(),wrongOnly));}
$('retry-reading').addEventListener('click',()=>startAgain(true));$('new-reading-attempt').addEventListener('click',()=>startAgain());
$('pause-reading').addEventListener('click',()=>{const a=findArticle();A.transact(s=>{const d=s.study.reading.drafts[a.id];if(!d)return;if(d.runningSince===null)d.runningSince=Date.now();else{d.elapsed=L.readingElapsed(d,Date.now());d.runningSince=null;}});});
$('submit-reading').addEventListener('click',async()=>{const a=findArticle(),d=state().study.reading.drafts[a.id];if(!d)return;const result=await A.transact(s=>L.submitReading(s,a,d.id,Date.now()));if(result)A.notify(`已保存：${result.correct} / ${result.total}。先核对依据句，再给错题标记原因。`);});
$('reading-file').addEventListener('change',async()=>{
 importArticles=null;$('reading-import-preview').hidden=true;const file=$('reading-file').files[0];if(!file)return;
 try{if(file.size>2*1024*1024)throw Error('单次阅读题库文件请小于 2MB。');const raw=JSON.parse((await file.text()).replace(/^\uFEFF/,'')),batch=Array.isArray(raw)?raw:raw.articles;if(!Array.isArray(batch)||!batch.length||batch.length>100)throw Error('题库需要 articles 数组，最多 100 篇。');const known=new Set(articles().map(a=>a.id));importArticles=[];let duplicate=0;for(const entry of batch){const a=L.article(entry);if(known.has(a.id))duplicate++;else{known.add(a.id);importArticles.push(a);}}$('reading-import-summary').textContent=`可添加 ${importArticles.length} 篇，跳过重复 id ${duplicate} 篇。不会覆盖已有文章、作答或解析。`;$('confirm-reading-import').disabled=!importArticles.length;$('reading-import-preview').hidden=false;
 }catch(e){importArticles=null;saveError(e);}finally{$('reading-file').value='';}
});
$('cancel-reading-import').addEventListener('click',()=>{importArticles=null;$('reading-import-preview').hidden=true;});
$('confirm-reading-import').addEventListener('click',async()=>{
 if(!importArticles)return;const batch=importArticles;let added=0;
 const ok=await A.transact(s=>{for(const a of batch)if(!L.readingCatalog(READING_PACKS,s.study).some(x=>x.id===a.id)){if(s.study.readingPacks.length>=100)throw Error('自备阅读材料最多 100 篇。');s.study.readingPacks.push(a);added++;}});
 if(ok){readingId=batch[0]?.id||readingId;importArticles=null;$('reading-import-preview').hidden=true;renderReading(true);A.notify(`已添加 ${added} 篇材料，来源声明和逐题解析已保存。`);}
});
function render(){
 $('word-order').value=state().study.order;$('word-accent').value=state().study.accent;renderLibrary();renderMemory(A.getCurrent(),$('flashcard').getAttribute('aria-expanded')==='true');renderReading();
}
window.LearningUI={render,renderMemory};render();setInterval(renderReadingTimer,1000);
})();
