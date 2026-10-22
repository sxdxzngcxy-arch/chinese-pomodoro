(() => {
'use strict';
const C=StudyCore, L=LearningCore, G=GardenCore, wordIds=new Set(WORDS.map(w=>w.id)), $=id=>document.getElementById(id);
let words=WORDS;
const learningQueue=(s,kind,now)=>L.queue(s,L.catalog(WORDS,s.study),kind,now,C.queue,C.day(now));
let state, busy=false, storageBlocked=false, storageUnavailable=false, filter='learn', current=null, revealed=false, quizQuestion=null, importCandidate=null, importMaterials=null, page='focus', lastDay=C.day(), quizDirection='en-zh';
const clone=x=>JSON.parse(JSON.stringify(x));
let noticeTimer;
function notify(text){const name=window.PET_CATALOG?.[state?.pet?.species]?.name||'小满';text=String(text).replaceAll('小满',name);$('notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('notice').textContent='';},10000);}
function read(){
 if(storageUnavailable)return clone(state||C.fresh());
 try{
  const raw=localStorage.getItem(C.KEY);
  if(raw!==null)return C.normalize(JSON.parse(raw),wordIds);
  const legacy=localStorage.getItem(C.LEGACY);return legacy?C.migrate(JSON.parse(legacy)):C.fresh();
 }catch(e){
  if(e instanceof SyntaxError || !(e instanceof DOMException)){
   storageBlocked=true;notify('保存的数据格式异常，已保留原始数据。请导出备份，或在统计页导入有效备份恢复。');return clone(state||C.fresh());
  }
  storageUnavailable=true;notify('浏览器禁止本地存储，暂用内存模式；离开前请导出 JSON。');return clone(state||C.fresh());
 }
}
function write(next){
 if(storageUnavailable){state=next;return;}
 const previous=localStorage.getItem(C.KEY);
 if(previous&&!storageBlocked&&!JSON.parse(previous).platform&&!localStorage.getItem(`${C.KEY}-before-v2.0`))localStorage.setItem(`${C.KEY}-before-v2.0`,previous);
 if(previous&&!storageBlocked&&!JSON.parse(previous).study?.vocabulary&&!localStorage.getItem(`${C.KEY}-before-v1.2`))localStorage.setItem(`${C.KEY}-before-v1.2`,previous);
 localStorage.setItem(C.KEY,JSON.stringify(next));state=next;
}
async function transact(action,{restore=false,settleTimer=true}={}){
 if(busy)return false;busy=true;
 try{
  const work=()=>{
   if(storageBlocked&&!restore)throw Error('原始数据异常，已暂停写入以保护记录。请先导出或导入有效备份。');
   const next=read();if(storageBlocked&&!restore)throw Error('请先处理异常的保存数据。');
   const previousLevel=1+Math.floor(next.pet.xp/100);
   const previousDaily=Object.keys(next.ledger).filter(k=>k.startsWith('daily30:')).length;
   const finished=restore||!settleTimer?false:C.settle(next,Date.now());
   const result=action(next,finished);
   next.revision++;write(next);
   if(finished==='focus')celebrate();else if(finished==='break')notify('休息结束。准备好了，再开启下一段专注吧。');
   renderAll();
   if(!restore&&Object.keys(next.ledger).filter(k=>k.startsWith('daily30:')).length>previousDaily){celebrate('words');notify('今天学过 30 个新词！小满为你庆祝，+20 金币、+2 食物。');}
   if(!restore&&1+Math.floor(next.pet.xp/100)>previousLevel){celebrate('level');animatePet('leveling',2600);$('pet-message').textContent=`${PET_CATALOG[next.pet.species]?.name||'伙伴'}升级到 Lv.${1+Math.floor(next.pet.xp/100)} 啦！谢谢你的一点点陪伴。`;notify($('pet-message').textContent);}
   return result===undefined?true:result;
  };
  return navigator.locks?.request ? await navigator.locks.request(C.KEY,work) : work();
 }catch(e){notify(`未能完成操作：${e.message} 本地保存失败时不会发放奖励，请导出备份或检查存储空间。`);return false;}
 finally{busy=false;}
}
function node(tag,text,className){const n=document.createElement(tag);if(text!==undefined)n.textContent=text;if(className)n.className=className;return n;}
function button(text,fn,className='soft'){const b=node('button',text,className);b.type='button';b.addEventListener('click',fn);return b;}
function duration(mode){return state.settings[mode]*60;}
function applyTheme(){
 const selected=state.settings.theme;
 document.body.dataset.font=state.platform.plan.font;
 document.body.dataset.theme=selected==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):selected;
 document.body.classList.toggle('reduce-motion',state.settings.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches);
 document.querySelector('meta[name="theme-color"]').content=document.body.dataset.theme==='dark'?'#1c2521':'#f5f4ee';
 $('theme').value=selected;$('reduced-motion').checked=state.settings.reduced;
}
function navigate(next){
 if(!PlatformCore.routes.includes(next))next='home';const previous=page;window.dispatchEvent(new CustomEvent('study:before-navigate',{detail:{previous,next}}));page=next;if(previous==='words'&&next!=='words')stopWordSpeech();window.GardenUI?.onNavigate(previous,next);
 document.querySelectorAll('.view').forEach(el=>{el.hidden=el.id!==`page-${page}`;});
 document.querySelectorAll('.bottom-nav button').forEach(el=>{if(el.dataset.go===page||(el.dataset.go==='training'&&['focus','reading','listening','writing','materials'].includes(page)))el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 if(location.hash!==`#${page}`)history.replaceState(null,'',`#${page}`);
 document.querySelectorAll('.garden-entry').forEach(el=>{if(page==='garden')el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 $('celebration').hidden=true;renderAll();window.PlatformUI?.onNavigate(previous,next);window.dispatchEvent(new CustomEvent('study:navigate',{detail:{previous,next}}));window.scrollTo({top:0,behavior:'instant'});
}
function renderTimer(){
 const t=state.timer, seconds=Math.ceil(C.remaining(state,Date.now()));
 const formatted=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
 $('time').textContent=formatted;$('time').setAttribute('aria-label',`剩余${Math.floor(seconds/60)}分${seconds%60}秒`);
 $('progress').style.strokeDashoffset=854.513*(1-seconds/t.total);
 for(const mode of ['focus','break']){$(`${mode}-mode`).classList.toggle('selected',t.mode===mode);$(`${mode}-mode`).setAttribute('aria-pressed',String(t.mode===mode));}
 $('clock-label').textContent=t.mode==='focus'?'保持专注':'放松一下';
 $('clock-caption').textContent=t.mode==='focus'?'给自己一段不被打扰的时间':'伸个懒腰，让思绪透透气';
 $('start').textContent=t.endAt!==null?'暂停计时  Ⅱ':t.remaining<t.total?'继续计时  ▶':t.mode==='focus'?'开始专注  ▶':'开始休息  ▶';
 $('companion-text').textContent=t.mode==='break'?'休息时间，去小屋摸摸学习伙伴吧。':'完成专注，为学习伙伴积攒成长能量。';
 document.title=`${t.endAt!==null?formatted+' · ':''}六级喵 · 学习与心境伙伴`;

}
function renderFocusStats(){
 const k=C.day(),n=state.counts[k]||0;$('count').textContent=n;$('minutes').textContent=state.focusMinutes[k]||0;
 $('encouragement').textContent=n?'每一份专注，都让你离目标更近一点':'今天的第一份专注，从现在开始';
 $('date').textContent=new Date().toLocaleDateString('zh-CN',{month:'long',day:'numeric',weekday:'long'});
}
function renderTasks(){
 $('tasks').replaceChildren();
 for(const task of state.tasks){
  const li=node('li');li.classList.toggle('done',task.done);const label=node('label'),check=node('input');check.type='checkbox';check.checked=task.done;
  check.addEventListener('change',()=>{const done=check.checked;transact(s=>{const t=s.tasks.find(t=>t.id===task.id);if(t)t.done=done;});});
  label.append(check,node('span',task.text));const remove=button('×',()=>transact(s=>{s.tasks=s.tasks.filter(t=>t.id!==task.id);}), 'delete');remove.setAttribute('aria-label',`删除任务：${task.text}`);li.append(label,remove);$('tasks').append(li);
 }
 const n=state.tasks.filter(t=>t.done).length;$('task-count').textContent=`${n} / ${state.tasks.length}`;$('empty').hidden=state.tasks.length>0;$('clear-completed').disabled=n===0;
}
function dueLabel(ms){return ms<=Date.now()?'现在可复习':new Date(ms).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})+' 复习';}
function renderWordDashboard(now){
 const v=state.study.vocabulary,d=state.days[C.day(now)],vd=v.days[C.day(now)],n=d?.newWords||0,r=C.reviewCount(state,now),due=words.filter(w=>state.progress[w.id]?.due<=now).length;
 const mastered=words.filter(w=>L.status(state.progress[w.id])==='已掌握').length;
 $('word-mastery').textContent=`累计掌握 ${mastered} 词`;
 $('today-new').textContent=`${n} / ${state.settings.goal}`;$('today-review').textContent=`${r} / ${v.reviewGoal}`;
 for(const [id,value,max]of [['today-new-bar',n,state.settings.goal],['today-review-bar',r,v.reviewGoal]]){$(id).max=Math.max(1,max);$(id).value=Math.min(value,max);}
 $('word-task-note').textContent=`当前到期 ${due} 词；先复习，再添一点新词。掌握表示至少连续推进至第 3 阶段，仍会安排复习。${(vd?.baselineReviews||(!vd&&d?.reviews))?' 升级前今日复习沿用原次数，升级后按不同单词计入目标。':''}`;
 $('focus-word-progress').textContent=`新词 ${n}/${state.settings.goal} · 复习 ${r}/${v.reviewGoal}${v.active&&v.active.index<v.active.items.length?' · 有未完成轮次':''}`;
 $('new-progress').textContent=`${n} / ${state.settings.goal}`;$('goal-progress').max=state.settings.goal;$('goal-progress').value=Math.min(n,state.settings.goal);
 if(document.activeElement!==$('daily-goal'))$('daily-goal').value=state.settings.goal;
 if(document.activeElement!==$('daily-review-goal'))$('daily-review-goal').value=v.reviewGoal;
 $('word-stat-detail').textContent=`今日自评：认识 ${vd?.known||0}、模糊 ${vd?.vague||0}、不认识 ${vd?.unknown||0}；额外练习 ${vd?.practice||0} 次。小测：${vd?.quizAttempts?`${vd.quizCorrect}/${vd.quizAttempts}，${Math.round(vd.quizCorrect/vd.quizAttempts*100)}%`:'尚未作答'}。`;
 $('word-history-note').textContent='轮次与自评明细从 V1.2 开始记录；旧版每日新词、复习次数及统计继续保留。';
 const signature=JSON.stringify(v.history);if($('word-history').dataset.signature!==signature){
  $('word-history').dataset.signature=signature;$('word-history').replaceChildren();
  if(!v.history.length)$('word-history').append(node('p','完成一轮后，这里会留下学习足迹。','helper'));
  for(const h of v.history){const row=node('div',undefined,'word-history-row');row.append(node('strong',`${new Date(h.finishedAt).toLocaleString('zh-CN',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${h.total-h.skipped} 词`),node('small',`认识 ${h.known} · 模糊 ${h.vague} · 不认识 ${h.unknown}${h.practice?` · 含额外练习 ${h.practice}`:''}${h.skipped?` · 跳过 ${h.skipped}`:''}`));$('word-history').append(row);}
 }
}
function renderWords(){
 const now=Date.now(),a=state.study.vocabulary.active,active=!!a&&a.index<a.items.length,item=active?a.items[a.index]:null,prev=current?.id;
 current=item?words.find(w=>w.id===item.id)||null:null;revealed=active&&a.revealed;
 if(prev!==current?.id){stopWordSpeech();$('speech-status').textContent='';}
 $('flash-area').hidden=!current;$('word-empty').hidden=!!current;
 $('due-count').textContent=words.filter(w=>state.progress[w.id]?.due<=now).length;
 $('wrong-count').textContent=words.filter(w=>state.progress[w.id]?.wrong).length;
 $('word-position').textContent=active?`第 ${a.index+1} / ${a.items.length} 张 · 已标记 ${a.items.filter(i=>i.grade).length}`:`词库 ${words.length} 词`;
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 $('start-word-session').hidden=active;$('pause-word-session').hidden=!active;$('skip-word').hidden=!active;
 $('word-session-state').textContent=active?`正在${{learn:'今日学习',review:'到期复习',wrong:'错词练习'}[a.kind]} · 本轮已自动保存。${item.mode==='practice'?'此词为额外练习，不改变间隔、不发经验。':''}`:filter==='wrong'?'错词按复习目标数量组成一轮；未到期或超过目标的词仅作额外练习。':'按剩余新词目标与复习目标组成一轮；没有足够到期词时按实际数量学习。';
 renderWordDashboard(now);
 if(current){
  const w=current;$('word-en').textContent=w.word;$('word-ipa').textContent=w.ipa;$('word-pos').textContent=w.pos;$('word-meaning').textContent=w.meaning;$('word-example').textContent=w.example;$('word-translation').textContent=w.translation;
  $('word-tag').textContent=`${L.status(state.progress[w.id])} · ${{new:'新词',review:'到期复习',practice:'额外练习'}[item.mode]}`;$('flashcard').classList.toggle('flipped',revealed);$('flashcard').setAttribute('aria-expanded',String(revealed));
  $('flashcard').querySelector('.card-front').setAttribute('aria-hidden',String(revealed));$('flashcard').querySelector('.card-back').setAttribute('aria-hidden',String(!revealed));
  $('flashcard').setAttribute('aria-label',revealed?`${w.word}：${w.meaning}。${w.example} ${w.translation}。点击返回英文`:`${w.word}，${w.ipa}。点击翻转查看释义`);
  document.querySelectorAll('[data-grade]').forEach(b=>{b.disabled=!revealed;const ms=C.schedule(state.progress[w.id],b.dataset.grade,now).due-now;b.querySelector('span').textContent=item.mode==='practice'?'仅记录练习':ms<3600000?`${Math.round(ms/60000)} 分钟后`:`约 ${Math.round(ms/86400000)} 天后`;});
  $('grade-hint').textContent=revealed?'按真实感受选择；下一次复习时间会随判断保存。':'先尝试回忆，再翻开卡片；每一次判断都会保存。';
 }else{
  $('word-empty-text').textContent=active?'当前词条暂不可用，可等待资料加载或跳过此词。':a?'本轮学习已完成。休息一下，或开始下一轮。':'准备好后，开始今天的一小轮。';
  const future=words.map(w=>state.progress[w.id]).filter(Boolean).map(p=>p.due).filter(d=>d>now).sort((a,b)=>a-b)[0];
  $('next-review').textContent=future?`下次：${dueLabel(future)}。`:'没有已安排的后续复习。';
 }
 const finished=!!a&&!active;$('word-session-result').hidden=!finished;
 if(finished){const h=state.study.vocabulary.history.find(h=>h.id===a.id);$('word-result-counts').textContent=h?`认识 ${h.known} · 模糊 ${h.vague} · 不认识 ${h.unknown} · 跳过 ${h.skipped}${h.practice?`（含额外练习 ${h.practice} 词）`:''}`:'学习结果已保存。';const next=a.items.filter(i=>i.nextDue!==null).map(i=>i.nextDue).sort((a,b)=>a-b)[0];$('word-result-next').textContent=next?`本轮最早可复习：${dueLabel(next)}。每个词按各自的间隔安排。`:'本轮没有新增复习安排。';}
 $('wrong-list').replaceChildren();
 const wrong=words.filter(w=>state.progress[w.id]?.wrong);
 if(!wrong.length)$('wrong-list').append(node('p','还没有错词，慢慢积累就好。','helper'));
 if(wrong.length>200)$('wrong-list').append(node('p',`共 ${wrong.length} 词，这里先显示前 200 词；“只练错词”会按轮次安排全部错词。`,'helper'));
 wrong.slice(0,200).forEach(w=>{const row=node('div',undefined,'wrong-row'),left=node('div');left.append(node('strong',w.word),node('small',`${w.pos} ${w.meaning}`));row.append(left,node('span',dueLabel(state.progress[w.id].due)));$('wrong-list').append(row);});
 renderQuiz();window.LearningUI?.renderMemory(current,revealed);
}
function quizPool(){const prefix=`quiz:${C.day()}:${quizDirection}:`;return words.filter(w=>state.progress[w.id]&&!Object.hasOwn(state.ledger,prefix+w.id));}
function renderQuiz(newQuestion=false){
 const pool=quizPool();
 if(newQuestion)quizQuestion=null;
 if(quizQuestion&&quizQuestion.direction!==quizDirection)quizQuestion=null;
 if(quizQuestion&&!quizQuestion.answered&&Object.hasOwn(state.ledger,`quiz:${C.day()}:${quizDirection}:${quizQuestion.word.id}`))quizQuestion=null;
 if(!quizQuestion&&pool.length){
  const w=pool[Math.floor(Math.random()*pool.length)],senses=w.meaning.split(/[；，]/),candidates=L.shuffle(words.filter(x=>x.id!==w.id&&!x.meaning.split(/[；，]/).some(m=>senses.includes(m)))).slice(0,3);
  quizQuestion={word:w,direction:quizDirection,options:L.shuffle([w,...candidates]),answered:false,feedback:''};
 }
 $('quiz-count').textContent=`待测 ${pool.length}`;$('quiz-options').replaceChildren();
 if(!quizQuestion){$('quiz-prompt').textContent=Object.keys(state.progress).length?'今天这个方向的小测已完成':'先学习几个词，再来小测吧';$('quiz-feedback').textContent='';$('quiz-next').disabled=true;return;}
 const q=quizQuestion;$('quiz-prompt').textContent=quizDirection==='en-zh'?q.word.word:q.word.meaning;$('quiz-next').disabled=!q.answered;
 for(const w of q.options){
  const b=button(quizDirection==='en-zh'?w.meaning:w.word,async()=>{
   if(q!==quizQuestion||q.answered||busy)return;
   const outcome=await transact(s=>C.quiz(s,q.word.id,q.direction,w.id,q.word.id,Date.now()));
   if(outcome&&outcome.accepted){q.answered=true;q.chosen=w.id;q.feedback=outcome.right?'答对了！继续保持自己的节奏。':`这次的答案是 ${q.word.word}：${q.word.meaning}，已收入错词本。`;quizQuestion=q;renderQuiz();}
   else{quizQuestion=null;renderQuiz();}
  },'');
  b.disabled=q.answered;if(q.answered&&w.id===q.word.id)b.classList.add('right');if(q.answered&&q.chosen===w.id&&w.id!==q.word.id)b.classList.add('wrong');$('quiz-options').append(b);
 }
 $('quiz-feedback').textContent=q.feedback||'';
}
function renderPet(){
 const p=state.pet,level=1+Math.floor(p.xp/100),definition=Object.hasOwn(PET_CATALOG,p.species)?PET_CATALOG[p.species]:PET_CATALOG.teddy;
 if($('pet-avatar').dataset.species!==definition.id){$('pet-avatar').innerHTML=definition.svg;$('pet-avatar').dataset.species=definition.id;}
 $('pet-avatar').setAttribute('aria-label',`摸摸${definition.type}${definition.name}的头`);$('pet-name').textContent=definition.name;$('pet-avatar').title=`摸摸${definition.name}的头`;$('companion-name').textContent=`${definition.name}，陪你慢慢来`;
 $('pet-picker-label').hidden=Object.keys(PET_CATALOG).length<2;$('pet-picker').replaceChildren();
 for(const item of Object.values(PET_CATALOG)){const option=node('option',item.type);option.value=item.id;$('pet-picker').append(option);}$('pet-picker').value=definition.id;$('pet-level').textContent=`Lv.${level}`;$('pet-wallet').textContent=`◈ ${p.coins} 金币 · ♧ ${p.food} 食物`;
 $('pet-xp').textContent=`总经验 ${p.xp} · 距下一级 ${100-p.xp%100}`;$('xp-progress').value=p.xp%100;
 $('room').classList.toggle('sleeping',p.sleeping);$('sleep-button').textContent=p.sleeping?'☀ 唤醒':'☾ 睡觉';
 $('pet-meters').replaceChildren();
 for(const[key,name]of [['mood','心情'],['hunger','饱食度'],['bond','亲密度']]){const row=node('div',undefined,'meter'),bar=node('progress');bar.max=100;bar.value=p[key];bar.setAttribute('aria-label',name);row.append(node('span',name),bar,node('strong',p[key]));$('pet-meters').append(row);}
 $('shop').replaceChildren();
 for(const[id,item]of Object.entries(C.shop)){
  $(`decor-${id}`).hidden=!p.owned.includes(id);const row=node('div',undefined,'shop-item'),label=node('span',item.name);label.append(node('small',`${item.price} 金币 · 一次购买，永久摆放`));
  const b=button(p.owned.includes(id)?'已拥有':'购买',()=>transact(s=>{if(C.buy(s,id))notify(`已为小屋添置${item.name}。`);}));b.disabled=p.owned.includes(id)||p.coins<item.price;row.append(label,b);$('shop').append(row);
 }
 $('badges').replaceChildren();for(const a of C.achievements(state)){const badge=node('div',undefined,`badge${a.earned?' earned':''}`);badge.append(node('span',a.icon),node('small',a.name),node('em',a.earned?'已点亮':'慢慢解锁'));$('badges').append(badge);}
}
function renderStats(){
 const d=state.days[C.day()]||{newWords:0,reviews:0,attempts:0,correct:0};$('overview').replaceChildren();
 for(const[label,value,sub]of [['今日新词',d.newWords,`每日目标 ${state.settings.goal} 词`],['今日复习',d.reviews,'到期词卡练习'],['认识与答对占比',d.attempts?`${Math.round(d.correct/d.attempts*100)}%`:'—',`${d.correct} / ${d.attempts} 次自评与小测，含旧记录；分别统计见背词页`],['连续学习',`${C.streak(state,Date.now())} 天`,'按词卡与小测活动计算']]){const card=node('div',undefined,'card');card.append(node('span',label),node('strong',value),node('small',sub));$('overview').append(card);}
 const entries=[];for(let n=6;n>=0;n--){const dt=new Date();dt.setDate(dt.getDate()-n);const key=C.day(dt),v=state.days[key];entries.push({dt,key,total:(v?.newWords||0)+(v?.reviews||0)});}
 const max=Math.max(1,...entries.map(d=>d.total));$('week-chart').replaceChildren();
 for(const e of entries){const wrap=node('div',undefined,'day-bar'),bar=node('div',undefined,'bar');bar.style.height=`${Math.max(3,e.total/max*125)}px`;const label=`${e.key}：新词 ${state.days[e.key]?.newWords||0}，复习 ${state.days[e.key]?.reviews||0}`;wrap.title=label;wrap.setAttribute('aria-label',label);wrap.append(node('strong',e.total),bar,node('small',`${e.dt.getMonth()+1}/${e.dt.getDate()}`));$('week-chart').append(wrap);}
 $('all-stats').textContent=`当前词库已学 ${words.filter(w=>state.progress[w.id]).length} / ${words.length} 词 · 累计专注 ${Object.values(state.counts).reduce((a,b)=>a+b,0)} 次 / ${Object.values(state.focusMinutes).reduce((a,b)=>a+b,0)} 分钟。断签不会扣除记录或宠物状态。`;
 $('storage-state').textContent=storageBlocked?'原始数据异常，写入已暂停。导出会保留原始文本。':storageUnavailable?'内存模式：离开前务必导出。':navigator.locks?'本地自动保存已启用；多标签操作通过浏览器锁串行结算。':'本地自动保存已启用。此浏览器不支持跨标签锁，请只打开一个页面，避免同时修改。';
}
function renderAll(){words=L.catalog(WORDS,state.study);if(!$('time-form').contains(document.activeElement)){$('focus-length').value=state.settings.focus;$('break-length').value=state.settings.break;}applyTheme();renderTimer();renderFocusStats();renderTasks();renderWords();renderPet();renderStats();window.LearningUI?.render();window.GardenUI?.render();window.MaterialsUI?.render();window.PlatformUI?.render();window.ListeningUI?.render();window.WritingUI?.render();}
const animationTimers={};
function animatePet(kind,ms=1900){
 const room=$('room');room.classList.remove(kind);void room.offsetWidth;room.classList.add(kind);clearTimeout(animationTimers[kind]);animationTimers[kind]=setTimeout(()=>room.classList.remove(kind),ms);
}
function celebrate(type='focus'){
 const definition=Object.hasOwn(PET_CATALOG,state.pet.species)?PET_CATALOG[state.pet.species]:PET_CATALOG.teddy;
 $('celebration-art').innerHTML=definition.svg;
 $('celebration-title').textContent=type==='level'?`${definition.name}升级到 Lv.${1+Math.floor(state.pet.xp/100)} 啦！`:`${definition.name}为你庆祝！`;
 $('celebration-detail').textContent=type==='words'?'今日 30 新词 · +20 金币 · +2 食物':type==='level'?'一点点努力，一起长大 · 成长记录已保存':'完成专注 · +25 经验 · +10 金币';
 $('celebration').hidden=false;animatePet('celebrating');
 $('pet-message').textContent=`又完成了一段学习！${definition.name}开心地跳了起来。`;
}
async function petAction(action){
 let message='',wasSleeping=state.pet.sleeping;
 const ok=await transact(s=>{message=C.interact(s,action,Date.now());});
 if(ok){$('pet-message').textContent=message.replaceAll('小满',PET_CATALOG[state.pet.species]?.name||'小满');
  if(!state.pet.sleeping){if(action==='pat')animatePet('petting');if(action==='play')animatePet('playing');if(action==='feed')animatePet('petting');if(action==='sleep'&&wasSleeping)animatePet('waking');}
 }
}

function tick(){
 if(busy)return;
 if(state.timer.endAt!==null&&Date.now()>=state.timer.endAt){if(!storageBlocked)transact(()=>{});return;}
 renderTimer();if(lastDay!==C.day()){lastDay=C.day();quizQuestion=null;renderAll();}
 if(page==='words'&&!current)renderWords();
}
$('start').addEventListener('click',()=>transact((s,finished)=>{
 if(finished)return;
 const t=s.timer;if(t.endAt!==null){t.remaining=C.remaining(s,Date.now());t.endAt=null;}else{t.id||=C.uid();t.endAt=Date.now()+t.remaining*1000;}
}));
$('reset').addEventListener('click',()=>transact(s=>{const mode=s.timer.mode;s.timer={mode,remaining:s.settings[mode]*60,total:s.settings[mode]*60,endAt:null,id:null};}));
for(const mode of ['focus','break'])$(`${mode}-mode`).addEventListener('click',()=>transact(s=>{if(s.timer.mode===mode)return;s.timer={mode,remaining:s.settings[mode]*60,total:s.settings[mode]*60,endAt:null,id:null};}));
$('time-form').addEventListener('submit',e=>{e.preventDefault();const focus=Number($('focus-length').value),rest=Number($('break-length').value);if(!Number.isInteger(focus)||focus<1||focus>180||!Number.isInteger(rest)||rest<1||rest>60)return;transact(s=>{s.settings.focus=focus;s.settings.break=rest;const mode=s.timer.mode;s.timer={mode,remaining:s.settings[mode]*60,total:s.settings[mode]*60,endAt:null,id:null};notify('已保存时间设置并重置当前计时。');});});
$('task-form').addEventListener('submit',async e=>{e.preventDefault();const text=$('task-input').value.trim().slice(0,120);if(!text||state.tasks.length>=5000)return;const ok=await transact(s=>{s.tasks.push({id:C.uid(),text,done:false});});if(ok){$('task-input').value='';$('task-input').focus();}});
$('clear-completed').addEventListener('click',()=>transact(s=>{s.tasks=s.tasks.filter(t=>!t.done);}));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>navigate(b.dataset.go)));
window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
$('flashcard').addEventListener('click',()=>{const a=state.study.vocabulary.active;if(!current||!a||busy)return;const id=a.id,index=a.index;transact(s=>{const live=s.study.vocabulary.active;if(live?.id===id&&live.index===index)live.revealed=!live.revealed;});});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;renderWords();if(state.study.vocabulary.active?.index<state.study.vocabulary.active?.items.length)notify('已选择下一轮范围，当前轮次继续保留。');}));
$('start-word-session').addEventListener('click',async()=>{
 if(busy)return;
 if(window.MaterialsUI&&MaterialsUI.isLoading()){notify('正在读取个人资料库，请稍后重试；若连接失败，可在资料中心重新连接后继续。');return;}
 const result=await transact(s=>C.startWords(s,L.catalog(WORDS,s.study),filter,Date.now()));
 if(result){$('word-feedback').textContent='本轮词单已保存，先尝试回忆再翻卡。';renderWords();$('flash-area').scrollIntoView({block:'start',behavior:document.body.classList.contains('reduce-motion')?'instant':'smooth'});}
 else if(result===null)notify(filter==='wrong'?'还没有可练习的错词。':'当前没有符合目标的词：可能已完成今日目标或尚未到复习时间，可调整目标后再开始。');
});
$('pause-word-session').addEventListener('click',()=>{navigate('focus');notify('本轮词单、当前位置和翻面状态已保存，回来可以继续。');});
$('skip-word').addEventListener('click',()=>{const a=state.study.vocabulary.active;if(a)transact(s=>C.skipWord(s,a.id,a.index,Date.now()));});
document.querySelectorAll('[data-grade]').forEach(b=>b.addEventListener('click',async()=>{
 if(!current||!revealed||busy)return;const a=state.study.vocabulary.active,id=a.id,index=a.index,name=current.word;
 const result=await transact(s=>C.gradeWord(s,L.catalog(WORDS,s.study),id,index,b.dataset.grade,Date.now()));
 if(result?.accepted){$('word-feedback').textContent=result.practice?`${name}：额外练习已记录，原复习安排保持。`:`${name}：已保存，${dueLabel(result.nextDue)}。`;window.dispatchEvent(new CustomEvent('study:word-rated',{detail:clone(result)}));if(result.complete)window.dispatchEvent(new CustomEvent('study:word-session-complete',{detail:clone(state.study.vocabulary.history.find(h=>h.id===id))}));}
 else if(result?.skipped)$('word-feedback').textContent='此词已在其他操作中更新或已移出词库，本轮已跳过，原记录保留。';
}));
$('goal-form').addEventListener('submit',async e=>{e.preventDefault();const goal=Number($('daily-goal').value),review=Number($('daily-review-goal').value);if(!Number.isInteger(goal)||goal<1||goal>200||!Number.isInteger(review)||review<0||review>200)return;const ok=await transact(s=>{s.settings.goal=goal;s.study.vocabulary.reviewGoal=review;});if(ok)notify(`目标已保存：新词 ${goal}，复习 ${review}。从下一轮生效，当前轮次保留。`);});
let speechToken=0,speechWait=null,heldUtterance=null,englishVoices=[];
function loadVoices(){try{englishVoices=window.speechSynthesis?.getVoices().filter(v=>/^en/i.test(v.lang))||[];}catch{englishVoices=[];}}
function stopWordSpeech(){speechToken++;clearTimeout(speechWait);heldUtterance=null;try{window.speechSynthesis?.cancel();}catch{}$('speak').textContent='◖ 点击发音';}
loadVoices();window.speechSynthesis?.addEventListener?.('voiceschanged',loadVoices);
$('speak').addEventListener('click',()=>{
 if(!current)return;
 if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){$('speech-status').textContent='当前浏览器不支持英文发音，可继续通过音标、例句学习。';return;}
 stopWordSpeech();loadVoices();const token=speechToken;
 try{
  const u=new SpeechSynthesisUtterance(current.word);heldUtterance=u;u.lang=state.study.accent;u.rate=.85;
  const voice=englishVoices.find(v=>v.lang.toLowerCase()===u.lang.toLowerCase())||englishVoices[0];if(voice)u.voice=voice;
  $('speech-status').textContent=voice?'正在准备英文发音…':'正在请求系统英语语音；可用口音取决于设备。';
  u.onstart=()=>{if(token!==speechToken)return;clearTimeout(speechWait);$('speak').textContent='◖ 正在发音';$('speech-status').textContent='';};
  u.onend=()=>{if(token!==speechToken)return;clearTimeout(speechWait);heldUtterance=null;$('speak').textContent='◖ 再听一次';};
  u.onerror=e=>{if(token!==speechToken)return;clearTimeout(speechWait);heldUtterance=null;$('speak').textContent='◖ 点击重试';if(!['interrupted','canceled'].includes(e.error))$('speech-status').textContent='语音暂不可用。请检查设备音量与系统英语语音后重试；卡片学习仍可继续。';};
  speechWait=setTimeout(()=>{if(token!==speechToken)return;stopWordSpeech();$('speech-status').textContent='语音未能启动。请保持 Safari 在前台，检查英语语音与音量后点击重试。';},6000);
  // 必须直接响应点击，避免等待异步语音列表后失去 iOS 用户手势。
  speechSynthesis.speak(u);
 }catch{stopWordSpeech();$('speech-status').textContent='此设备暂时无法发音，可继续通过音标学习。';}
});
window.addEventListener('pagehide',stopWordSpeech);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopWordSpeech();});
$('quiz-direction').addEventListener('change',()=>{quizDirection=$('quiz-direction').value;renderQuiz(true);});$('quiz-next').addEventListener('click',()=>renderQuiz(true));
document.querySelectorAll('[data-pet]').forEach(b=>b.addEventListener('click',()=>petAction(b.dataset.pet)));
$('pet-avatar').addEventListener('click',()=>petAction('pat'));
$('pet-picker').addEventListener('change',()=>{const id=$('pet-picker').value;if(Object.hasOwn(PET_CATALOG,id))transact(s=>{s.pet.species=id;});});
$('theme').addEventListener('change',()=>{const theme=$('theme').value;transact(s=>{s.settings.theme=theme;});});$('reduced-motion').addEventListener('change',()=>{const reduced=$('reduced-motion').checked;transact(s=>{s.settings.reduced=reduced;});});
for(const query of ['(prefers-color-scheme: dark)','(prefers-reduced-motion: reduce)'])matchMedia(query).addEventListener('change',applyTheme);
function download(text,name){const a=node('a');const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
// 整站备份及跨IndexedDB恢复由 backup.js 统一处理。
$('dismiss-celebration').addEventListener('click',()=>{$('celebration').hidden=true;});
window.addEventListener('storage',e=>{if(e.key===C.KEY&&!busy){state=read();current=null;quizQuestion=null;renderAll();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){state=read();tick();renderAll();}});window.addEventListener('pageshow',()=>tick());
function scrubGardenCopies(day=null){
 if(storageUnavailable)return;
 const keys=[`${C.KEY}-before-import`,`${C.KEY}-before-v1.1`,`${C.KEY}-before-v1.2`,`${C.KEY}-before-v2.0`];
 for(const key of keys){const raw=localStorage.getItem(key);if(!raw)continue;const copy=JSON.parse(raw);if(!copy.garden)continue;if(!Array.isArray(copy.garden.entries))throw Error('本地恢复副本中的心境格式异常，未完成清除。');copy.garden.entries=day?copy.garden.entries.filter(e=>e.day!==day):[];localStorage.setItem(key,JSON.stringify(copy));}
}
window.StudyApp={isStorageBlocked:()=>storageBlocked,isMemoryOnly:()=>storageUnavailable,finishRestore:()=>{storageBlocked=false;current=null;quizQuestion=null;revealed=false;renderAll();},celebrate,animatePet,getState:()=>state,getFreshState:()=>read(),refreshMaterials:()=>renderAll(),getPage:()=>page,isBusy:()=>busy,scrubGardenCopies,transact,notify,node,button,navigate,getCurrent:()=>current,refreshWords:()=>{words=L.catalog(WORDS,state.study);renderWords();},download};
state=read();
if(!storageBlocked&&!storageUnavailable){try{const previous=localStorage.getItem(C.KEY);if(!previous||!JSON.parse(previous).study){if(previous&&!localStorage.getItem(`${C.KEY}-before-v1.1`))localStorage.setItem(`${C.KEY}-before-v1.1`,previous);write(state);}}catch(e){notify('升级数据暂未保存，请检查存储空间并导出备份。');}}
navigate(location.hash.slice(1)||'home');tick();setInterval(tick,1000);
if(!navigator.locks)notify('此浏览器不支持跨标签锁，建议只打开一个学习页面以保持记录一致。');
})();
