(() => {
'use strict';
const A=StudyApp,C=StudyCore,L=LearningCore,P=PlatformCore,$=id=>document.getElementById(id),node=A.node,button=A.button;
async function change(fn,options){while(A.isBusy())await new Promise(r=>setTimeout(r,20));return A.transact(fn,options);}
window.V2UI={change};
let readingKey='',storageBusy=false;
const titles={words:'背单词',focus:'专注计时',reading:'阅读训练',listening:'逐句精听',writing:'写作 / 翻译',garden:'心境花园'};
function render(){
 const s=A.getState(),today=C.day(),d=s.days[today]||{newWords:0},p=s.platform,plan=p.plan;
 $('font-size').value=plan.font;document.body.dataset.font=plan.font;
 const active=document.activeElement;if(!$('plan-form').contains(active)){for(const[id,value]of Object.entries({'plan-new':s.settings.goal,'plan-review':s.study.vocabulary.reviewGoal,'plan-reading':plan.reading,'plan-listening':plan.listening,'exam-date':plan.examDate}))$(id).value=value;}
 if(A.getPage()==='home'){
  const catalog=L.catalog(WORDS,s.study),due=catalog.filter(w=>s.progress[w.id]?.due<=Date.now()).length,reviewed=C.reviewCount(s,Date.now()),reviewTarget=Math.min(s.study.vocabulary.reviewGoal,reviewed+due);
  const read=new Set(p.days[today]?.readingIds||[]);for(const[id,v]of Object.entries(s.study.reading.last))if(C.day(v.submittedAt)===today)read.add(id);
  const listened=(p.days[today]?.listeningSeconds||0)/60;
  const rows=[['今日新词',d.newWords,s.settings.goal,'words'],['到期复习',reviewed,reviewTarget,'words'],['仔细阅读',read.size,plan.reading,'reading'],['听力练习',listened,plan.listening,'listening']];
  let completed=0,total=0;$('home-tasks').replaceChildren();for(const[label,value,target,route]of rows){const done=target===0||value>=target;if(target>0){total++;if(done)completed++;}const row=node('div',undefined,'home-task'),info=node('div'),bar=node('progress');bar.max=Math.max(1,target);bar.value=Math.min(value,target);bar.setAttribute('aria-label',label+'完成进度');info.append(node('strong',label),node('small',target===0?(label==='到期复习'?'暂时没有到期词，之后再来看看':'今天可选'): `${label==='听力练习'?value.toFixed(1):value} / ${target}${label==='听力练习'?' 分钟':''}`),bar);row.append(info,button(done?'看看':'开始',()=>A.navigate(route)));$('home-tasks').append(row);}
  $('home-completion').textContent=`${completed} / ${total} 项`;$('home-summary').textContent=`今日已专注 ${Math.round(s.focusMinutes[today]||0)} 分钟。${completed===total&&total?'计划已完成，可以安心休息。':'按自己的节奏，完成下一小步。'}`;
  $('home-streak').textContent=`连续学习 ${P.streak(s,Date.now())} 天 · 累计掌握 ${Object.values(s.progress).filter(v=>v.stage>=3).length} 词。休息不会扣除进度。`;
  $('resume-learning').textContent=`继续上次${titles[p.lastPage]||'背单词'} →`;
  const pet=PET_CATALOG[s.pet.species]||PET_CATALOG.teddy;if($('home-pet').dataset.species!==pet.id){$('home-pet').innerHTML=pet.svg;$('home-pet').dataset.species=pet.id;}
  if(plan.examDate){const a=Date.parse(plan.examDate+'T12:00:00'),b=Date.parse(today+'T12:00:00'),days=Math.round((a-b)/86400000);$('home-countdown').textContent=days>0?`距离计划考试还有 ${days} 天`:days===0?'今天是你设定的考试日':'考试日期已过，可调整下一次目标';}else $('home-countdown').textContent='目标500分 · 考试日期由你设定';
 }
 const listenDays=Object.values(p.days);const listened=listenDays.reduce((n,d)=>n+d.listeningSeconds,0);const dictations=Object.values(p.listening.progress).flatMap(pr=>Object.values(pr.answers)).filter(a=>a.checked);$('v2-stat-summary').textContent=`累计有效听力 ${(listened/60).toFixed(1)} 分钟 · 最新听写核对 ${dictations.filter(a=>a.correct).length} / ${dictations.length} 句一致 · 写作/翻译草稿 ${Object.keys(p.writing.drafts).length} 份。听写为文本比较，不是考试分数。`;
 const age=p.backupAt?Math.floor((Date.now()-p.backupAt)/86400000):null;$('backup-reminder').textContent=age===null?'还未记录整站备份。建议每周备份一次；下载后请在“文件”App确认文件确实保存。':`上次生成整站备份：${new Date(p.backupAt).toLocaleDateString('zh-CN')}。${age>=7?'已过7天，建议备份近期学习。':'请自行保管下载的文件。'}`;
 if(A.getPage()==='reading')renderReadingPlus(s);
}
function renderReadingPlus(s){
 const articles=L.readingCatalog(READING_PACKS,s.study),id=LearningUI.getReadingId()||$('reading-select').value,a=articles.find(v=>v.id===id),filter=$('reading-wrong-filter').value;
 $('favorite-reading').disabled=!a;$('favorite-reading').textContent=pinned(s,id)?'已收藏文章 · 取消':'收藏当前文章';
 const signature=JSON.stringify([s.study.reading.records,s.platform.readingFavorites,filter,id]);if(signature===readingKey)return;readingKey=signature;
 const center=$('reading-wrong-center');center.replaceChildren();let wrong=0,attempts=0,correct=0,shown=0;
 for(const article of articles){if(pinned(s,article.id)){const row=node('div',undefined,'v2-row');row.append(node('strong','♡ '+article.title),button('打开收藏文章',()=>LearningUI.openReading(article.id)));center.append(row);}
  for(const q of article.questions){const r=s.study.reading.records[article.id]?.[q.id];if(!r)continue;attempts+=r.attempts;correct+=r.correct;if(!r.lastCorrect)wrong++;
   if((filter==='star'?!r.star:r.lastCorrect)||(filter!=='all'&&filter!=='star'&&r.reason!==filter)||shown>=30)continue;
   const row=node('div',undefined,'v2-row');row.append(node('strong',q.stem),node('small',`${article.title} · ${r.reason||'待标记错因'}`),button('针对这题复练',async()=>{if(s.study.reading.drafts[article.id]&&!confirm('这会重新开始该文章的当前练习。已交卷记录和其他文章不变，继续吗？'))return;const ok=await change(next=>{const draft=L.startReading(next,article,Date.now());draft.questionIds=[q.id];});if(ok)LearningUI.openReading(article.id);}));center.append(row);shown++;
  }
 }
 if(!shown)center.append(node('p',filter==='star'?'尚无收藏题目。':'这个分类没有未改正的错题。','helper'));
 $('reading-total-stat').textContent=`累计客观题 ${correct} / ${attempts}（${attempts?Math.round(correct/attempts*100):0}%） · 当前未改正 ${wrong} 题。最多展示30题；同一文章每天只奖励一次。`;
}
function pinned(s,id){return s.platform.readingFavorites.includes(id);}
$('plan-form').addEventListener('submit',async e=>{e.preventDefault();const values={new:Number($('plan-new').value),review:Number($('plan-review').value),reading:Number($('plan-reading').value),listening:Number($('plan-listening').value),exam:$('exam-date').value};if(values.exam&&!P.date(values.exam)){A.notify('日期无效。');return;}if(await change(s=>{s.settings.goal=values.new;s.study.vocabulary.reviewGoal=values.review;Object.assign(s.platform.plan,{reading:values.reading,listening:values.listening,examDate:values.exam});}))A.notify('计划已保存；正在进行的词卡轮次仍保留。');});
$('resume-learning').addEventListener('click',()=>{const route=A.getState().platform.lastPage;A.navigate(titles[route]?route:'words');});
$('home-light').addEventListener('click',async()=>{if(await change(s=>{s.platform.plan.mode='light';s.garden.mode='light';}))A.navigate('garden');});
$('font-size').addEventListener('change',()=>{const font=$('font-size').value;change(s=>{s.platform.plan.font=font;});});
for(const reason of L.reasons){const option=node('option',reason);option.value=reason;$('reading-wrong-filter').append(option);}
$('reading-wrong-filter').addEventListener('change',render);
$('reading-select').addEventListener('change',render);
$('favorite-reading').addEventListener('click',()=>{const id=LearningUI.getReadingId()||$('reading-select').value;if(!id)return;change(s=>{const f=s.platform.readingFavorites;s.platform.readingFavorites=f.includes(id)?f.filter(v=>v!==id):[...f,id];});});
async function refreshStorage(){if(storageBusy)return;storageBusy=true;try{const files=await MediaDB.all(),bytes=files.reduce((v,a)=>v+a.blob.size,0);let total='';if(navigator.storage?.estimate){const est=await navigator.storage.estimate();total=`浏览器估算本来源使用 ${(est.usage/1048576).toFixed(1)}MB / 配额 ${(est.quota/1048576).toFixed(0)}MB。`;}let local=0;try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);local+=(k.length+(localStorage.getItem(k)||'').length)*2;}}catch{}$('v2-storage').textContent=`音频 ${files.length} 个 / ${(bytes/1048576).toFixed(1)}MB（本站上限60MB）；本来源localStorage估算 ${(local/1048576).toFixed(2)}MB。${total}iOS仍可能清理网站数据，请保留独立备份。`;
 $('audio-library').replaceChildren();for(const file of files){const row=node('div',undefined,'v2-row');row.append(node('strong',file.name),node('small',`${(file.blob.size/1048576).toFixed(2)}MB`),button('导出音频文件',()=>{const link=node('a'),url=URL.createObjectURL(file.blob);link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}),button('删除此音频',async()=>{if(!confirm('仅删除这份本地音频并解除配对，听写和学习记录保留。请先确认已有备份。继续吗？'))return;const ok=await change(s=>{for(const l of s.platform.listening.lessons)if(l.audioId===file.id)l.audioId=null;});if(!ok)return;try{await MediaDB.remove(file.id);window.dispatchEvent(new Event('media:changed'));A.notify('已删除音频，学习进度保留。');}catch(e){A.notify(e.message);}}));$('audio-library').append(row);}
 }catch(e){$('v2-storage').textContent=`音频存储不可用：${e.message}。文字学习仍可继续；音频导入不会假装保存成功。`;}finally{storageBusy=false;}}
$('check-storage').addEventListener('click',async()=>{try{const granted=await navigator.storage?.persist?.();A.notify(granted?'浏览器已同意持久存储，仍建议定期备份。':'浏览器未承诺持久存储；请保留JSON备份。');}catch(e){A.notify(e.message);}refreshStorage();});
window.addEventListener('media:changed',refreshStorage);
function pauseReading(){if(!Object.values(A.getState().study.reading.drafts).some(d=>d.runningSince!==null))return;change(s=>{for(const d of Object.values(s.study.reading.drafts)){d.elapsed=L.readingElapsed(d,Date.now());d.runningSince=null;}});}
window.addEventListener('study:before-navigate',e=>{if(e.detail.previous==='reading'&&e.detail.next!=='reading')pauseReading();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseReading();});
window.PlatformUI={render,refreshStorage,onNavigate:(_previous,next)=>{if(titles[next]&&A.getState().platform.lastPage!==next)change(s=>{s.platform.lastPage=next;});if(next==='stats')refreshStorage();}};
render();refreshStorage();
})();
