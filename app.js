(() => {
'use strict';
const C=StudyCore, L=LearningCore, G=GardenCore, wordIds=new Set(WORDS.map(w=>w.id)), $=id=>document.getElementById(id);
let words=WORDS;
const learningQueue=(s,kind,now)=>L.queue(s,L.catalog(WORDS,s.study),kind,now,C.queue,C.day(now));
let state, busy=false, storageBlocked=false, storageUnavailable=false, filter='learn', current=null, revealed=false, quizQuestion=null, importCandidate=null, page='focus', lastDay=C.day(), quizDirection='en-zh';
const clone=x=>JSON.parse(JSON.stringify(x));
let noticeTimer;
function notify(text){$('notice').textContent=text;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>{$('notice').textContent='';},10000);}
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
   if(!restore&&1+Math.floor(next.pet.xp/100)>previousLevel){celebrate('level');animatePet('leveling',2600);$('pet-message').textContent=`小满升级到 Lv.${1+Math.floor(next.pet.xp/100)} 啦！谢谢你的一点点陪伴。`;notify($('pet-message').textContent);}
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
 document.body.dataset.theme=selected==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):selected;
 document.body.classList.toggle('reduce-motion',state.settings.reduced||matchMedia('(prefers-reduced-motion: reduce)').matches);
 document.querySelector('meta[name="theme-color"]').content=document.body.dataset.theme==='dark'?'#1c2521':'#f5f4ee';
 $('theme').value=selected;$('reduced-motion').checked=state.settings.reduced;
}
function navigate(next){
 if(!['focus','words','reading','pet','stats','garden'].includes(next))next='focus';const previous=page;page=next;window.GardenUI?.onNavigate(previous,next);
 document.querySelectorAll('.view').forEach(el=>{el.hidden=el.id!==`page-${page}`;});
 document.querySelectorAll('.bottom-nav button').forEach(el=>{if(el.dataset.go===page)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 if(location.hash!==`#${page}`)history.replaceState(null,'',`#${page}`);
 document.querySelectorAll('.garden-entry').forEach(el=>{if(page==='garden')el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
 $('celebration').hidden=true;renderAll();window.scrollTo({top:0,behavior:'instant'});
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
 $('companion-text').textContent=t.mode==='break'?'休息时间，去小屋摸摸小满吧。':'完成专注，为小狗积攒成长能量。';
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
function renderWords(force=false){
 const now=Date.now(),q=learningQueue(state,filter,now),prev=current?.id;
 current=q.find(w=>w.id===prev)||q[0]||null;
 if(force||prev!==current?.id)revealed=false;
 $('flash-area').hidden=!current;$('word-empty').hidden=!!current;
 $('due-count').textContent=learningQueue(state,'review',now).length;
 $('wrong-count').textContent=Object.values(state.progress).filter(p=>p.wrong).length;
 $('word-position').textContent=current?`待学 ${q.length} 词`:`词库 ${words.length} 词`;
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 const n=state.days[C.day()]?.newWords||0;$('new-progress').textContent=`${n} / ${state.settings.goal}`;$('goal-progress').max=state.settings.goal;$('goal-progress').value=Math.min(n,state.settings.goal);if(document.activeElement!==$('daily-goal'))$('daily-goal').value=state.settings.goal;
 if(current){
  const w=current;$('word-en').textContent=w.word;$('word-ipa').textContent=w.ipa;$('word-pos').textContent=w.pos;$('word-meaning').textContent=w.meaning;$('word-example').textContent=w.example;$('word-translation').textContent=w.translation;
  $('word-tag').textContent=`${L.status(state.progress[w.id])} · ${state.progress[w.id]?'到期复习':'新词'}`;$('flashcard').classList.toggle('flipped',revealed);$('flashcard').setAttribute('aria-expanded',String(revealed));
  $('flashcard').setAttribute('aria-label',revealed?`${w.word}：${w.meaning}。${w.example} ${w.translation}。点击返回英文`:`${w.word}，${w.ipa}。点击翻转查看释义`);
  document.querySelectorAll('[data-grade]').forEach(b=>{b.disabled=!revealed;});
  $('grade-hint').textContent=revealed?'按真实感受选择；认识后逐渐延长间隔。':'先翻开卡片，再诚实评价自己，不必急着记住。';
 }else{
  $('word-empty-text').textContent=filter==='wrong'?'目前没有到期的错词':filter==='review'?'到期复习已完成':'今天的词卡已完成，做得很好！';
  const future=words.map(w=>state.progress[w.id]).filter(Boolean).filter(p=>filter!=='wrong'||p.wrong).map(p=>p.due).filter(d=>d>now).sort((a,b)=>a-b)[0];
  const unseen=words.filter(w=>!state.progress[w.id]).length;
  $('next-review').textContent=(future?`下次：${dueLabel(future)}。`:'')+(filter==='learn'?(unseen?`词库还有 ${unseen} 个新词，明天继续或调整每日目标。`:'所有内置新词已学过，继续间隔复习即可。'):'');
 }
 $('wrong-list').replaceChildren();
 const wrong=words.filter(w=>state.progress[w.id]?.wrong);
 if(!wrong.length)$('wrong-list').append(node('p','还没有错词，慢慢积累就好。','helper'));
 wrong.forEach(w=>{const row=node('div',undefined,'wrong-row'),left=node('div');left.append(node('strong',w.word),node('small',`${w.pos} ${w.meaning}`));row.append(left,node('span',dueLabel(state.progress[w.id].due)));$('wrong-list').append(row);});
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
 $('pet-avatar').setAttribute('aria-label',`摸摸${definition.type}${definition.name}的头`);$('pet-name').textContent=definition.name;
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
 for(const[label,value,sub]of [['今日新词',d.newWords,`每日目标 ${state.settings.goal} 词`],['今日复习',d.reviews,'到期词卡练习'],['今日正确率',d.attempts?`${Math.round(d.correct/d.attempts*100)}%`:'—',`${d.correct} / ${d.attempts} 次评价与小测`],['连续学习',`${C.streak(state,Date.now())} 天`,'按词卡与小测活动计算']]){const card=node('div',undefined,'card');card.append(node('span',label),node('strong',value),node('small',sub));$('overview').append(card);}
 const entries=[];for(let n=6;n>=0;n--){const dt=new Date();dt.setDate(dt.getDate()-n);const key=C.day(dt),v=state.days[key];entries.push({dt,key,total:(v?.newWords||0)+(v?.reviews||0)});}
 const max=Math.max(1,...entries.map(d=>d.total));$('week-chart').replaceChildren();
 for(const e of entries){const wrap=node('div',undefined,'day-bar'),bar=node('div',undefined,'bar');bar.style.height=`${Math.max(3,e.total/max*125)}px`;const label=`${e.key}：新词 ${state.days[e.key]?.newWords||0}，复习 ${state.days[e.key]?.reviews||0}`;wrap.title=label;wrap.setAttribute('aria-label',label);wrap.append(node('strong',e.total),bar,node('small',`${e.dt.getMonth()+1}/${e.dt.getDate()}`));$('week-chart').append(wrap);}
 $('all-stats').textContent=`当前词库已学 ${words.filter(w=>state.progress[w.id]).length} / ${words.length} 词 · 累计专注 ${Object.values(state.counts).reduce((a,b)=>a+b,0)} 次 / ${Object.values(state.focusMinutes).reduce((a,b)=>a+b,0)} 分钟。断签不会扣除记录或宠物状态。`;
 $('storage-state').textContent=storageBlocked?'原始数据异常，写入已暂停。导出会保留原始文本。':storageUnavailable?'内存模式：离开前务必导出。':navigator.locks?'本地自动保存已启用；多标签操作通过浏览器锁串行结算。':'本地自动保存已启用。此浏览器不支持跨标签锁，请只打开一个页面，避免同时修改。';
}
function renderAll(){words=L.catalog(WORDS,state.study);if(!$('time-form').contains(document.activeElement)){$('focus-length').value=state.settings.focus;$('break-length').value=state.settings.break;}applyTheme();renderTimer();renderFocusStats();renderTasks();renderWords();renderPet();renderStats();window.LearningUI?.render();window.GardenUI?.render();}
const animationTimers={};
function animatePet(kind,ms=1900){
 const room=$('room');room.classList.remove(kind);void room.offsetWidth;room.classList.add(kind);clearTimeout(animationTimers[kind]);animationTimers[kind]=setTimeout(()=>room.classList.remove(kind),ms);
}
function celebrate(type='focus'){
 const definition=Object.hasOwn(PET_CATALOG,state.pet.species)?PET_CATALOG[state.pet.species]:PET_CATALOG.teddy;
 $('celebration-art').innerHTML=definition.svg;
 $('celebration-title').textContent=type==='level'?`小满升级到 Lv.${1+Math.floor(state.pet.xp/100)} 啦！`:'小满为你庆祝！';
 $('celebration-detail').textContent=type==='words'?'今日 30 新词 · +20 金币 · +2 食物':type==='level'?'一点点努力，一起长大 · 成长记录已保存':'完成专注 · +25 经验 · +10 金币';
 $('celebration').hidden=false;animatePet('celebrating');
 $('pet-message').textContent='又完成了一段专注！小满开心地跳了起来。';
}
async function petAction(action){
 let message='',wasSleeping=state.pet.sleeping;
 const ok=await transact(s=>{message=C.interact(s,action,Date.now());});
 if(ok){$('pet-message').textContent=message;
  if(!state.pet.sleeping){if(action==='pat')animatePet('petting');if(action==='play')animatePet('playing');if(action==='feed')animatePet('petting');if(action==='sleep'&&wasSleeping)animatePet('waking');}
 }
}

function tick(){
 if(busy)return;
 if(state.timer.endAt!==null&&Date.now()>=state.timer.endAt){if(!storageBlocked)transact(()=>{});return;}
 renderTimer();if(lastDay!==C.day()){lastDay=C.day();quizQuestion=null;renderAll();}
 if(page==='words'&&((!current&&learningQueue(state,filter,Date.now()).length>0)||(current&&state.progress[current.id]?.due>Date.now())))renderWords();
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
$('flashcard').addEventListener('click',()=>{if(!current)return;revealed=!revealed;renderWords();});
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filter=b.dataset.filter;current=null;renderWords(true);}));
document.querySelectorAll('[data-grade]').forEach(b=>b.addEventListener('click',async()=>{
 if(!current||!revealed||busy)return;const id=current.id;
 const ok=await transact(s=>C.grade(s,id,b.dataset.grade,Date.now()));
 if(ok){revealed=false;renderWords(true);}
}));
$('goal-form').addEventListener('submit',e=>{e.preventDefault();const goal=Number($('daily-goal').value);if(!Number.isInteger(goal)||goal<1||goal>200)return;transact(s=>{s.settings.goal=goal;notify(`每日新词目标已设为 ${goal} 词。`);});});
$('speak').addEventListener('click',()=>{
 if(!current)return;if(!('speechSynthesis'in window)||!('SpeechSynthesisUtterance'in window)){notify('此浏览器不支持语音合成，音标仍可用于学习。');return;}
 const utterance=new SpeechSynthesisUtterance(current.word);utterance.lang=state.study.accent;utterance.rate=.85;
 const voices=speechSynthesis.getVoices(),voice=voices.find(v=>v.lang.toLowerCase()===state.study.accent.toLowerCase())||voices.find(v=>/^en/i.test(v.lang));if(voice)utterance.voice=voice;
 utterance.onerror=e=>{if(!['interrupted','canceled'].includes(e.error))notify('当前语音暂不可用，请检查系统英语语音或设备音量。');};
 speechSynthesis.cancel();speechSynthesis.speak(utterance);
});
$('quiz-direction').addEventListener('change',()=>{quizDirection=$('quiz-direction').value;renderQuiz(true);});$('quiz-next').addEventListener('click',()=>renderQuiz(true));
document.querySelectorAll('[data-pet]').forEach(b=>b.addEventListener('click',()=>petAction(b.dataset.pet)));
$('pet-avatar').addEventListener('click',()=>petAction('pat'));
$('pet-picker').addEventListener('change',()=>{const id=$('pet-picker').value;if(Object.hasOwn(PET_CATALOG,id))transact(s=>{s.pet.species=id;});});
$('theme').addEventListener('change',()=>{const theme=$('theme').value;transact(s=>{s.settings.theme=theme;});});$('reduced-motion').addEventListener('change',()=>{const reduced=$('reduced-motion').checked;transact(s=>{s.settings.reduced=reduced;});});
for(const query of ['(prefers-color-scheme: dark)','(prefers-reduced-motion: reduce)'])matchMedia(query).addEventListener('change',applyTheme);
function download(text,name){const a=node('a');const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
$('export-data').addEventListener('click',()=>{
 try{
  const snapshot=clone(state),now=Date.now();
  if(snapshot.timer.endAt!==null){snapshot.timer.remaining=Math.max(1,C.remaining(snapshot,now));snapshot.timer.endAt=null;}
  for(const d of Object.values(snapshot.study.reading.drafts)){d.elapsed=L.readingElapsed(d,now);d.runningSince=null;}
  G.pause(snapshot.garden,now);
  const data=storageBlocked?(localStorage.getItem(C.KEY)||localStorage.getItem(C.LEGACY)):JSON.stringify({...snapshot,exportedAt:new Date(now).toISOString()},null,2);
  download(data||'{}',`yike-backup-${C.day()}.json`);notify('已生成备份。备份中的活动计时已暂停，当前页面仍可继续。iPhone 可保存到“文件”App。');
 }catch(e){notify(`导出失败：${e.message}`);}
});
$('import-file').addEventListener('change',async()=>{
 importCandidate=null;$('import-preview').hidden=true;$('restore-garden').checked=false;$('restore-garden-label').hidden=true;const file=$('import-file').files[0];if(!file)return;
 try{if(file.size>10*1024*1024)throw Error('备份超过 10MB 限制。');const raw=JSON.parse(await file.text());importCandidate=C.normalize(raw,wordIds);$('restore-garden-label').hidden=raw.garden===undefined;$('import-summary').textContent=`即将替换：${importCandidate.tasks.length} 个任务、${Object.keys(importCandidate.progress).length} 个单词进度、${Object.values(importCandidate.counts).reduce((a,b)=>a+b,0)} 次专注、${importCandidate.pet.coins} 金币、${importCandidate.study.customWords.length} 个个人词、${Object.keys(importCandidate.study.reading.last).length} 篇阅读记录。学习部分会替换并保留本机恢复副本。心境默认保留；可选合并备份中的 ${importCandidate.garden.entries.length} 条心境，同日期保留本机记录。导入会暂停备份计时。`;$('import-preview').hidden=false;}catch(e){notify(`未导入：${e.message}`);}finally{$('import-file').value='';}
});
$('cancel-import').addEventListener('click',()=>{importCandidate=null;$('import-preview').hidden=true;});
$('confirm-import').addEventListener('click',async()=>{
 if(!importCandidate||busy)return;const replacement=clone(importCandidate),mergeGarden=$('restore-garden').checked;
 if(replacement.timer.endAt!==null){replacement.timer.remaining=Math.max(1,C.remaining(replacement,Date.now()));replacement.timer.endAt=null;}
 for(const d of Object.values(replacement.study.reading.drafts)){d.elapsed=L.readingElapsed(d,Date.now());d.runningSince=null;}
 const ok=await transact(s=>{
  if(!storageUnavailable){const prior=localStorage.getItem(C.KEY);if(prior!==null)localStorage.setItem(`${C.KEY}-before-import`,prior);}
  const currentGarden=s.garden;Object.assign(s,replacement);s.garden=mergeGarden?G.merge(currentGarden,replacement.garden):currentGarden;
 },{restore:true});
 if(ok){storageBlocked=false;importCandidate=null;current=null;quizQuestion=null;revealed=false;$('import-preview').hidden=true;renderAll();notify('备份已恢复；导入前的已保存数据也保留在本地恢复副本中。');}
});
$('dismiss-celebration').addEventListener('click',()=>{$('celebration').hidden=true;});
window.addEventListener('storage',e=>{if(e.key===C.KEY&&!busy){state=read();current=null;quizQuestion=null;renderAll();}});
document.addEventListener('visibilitychange',()=>{if(!document.hidden){state=read();tick();renderAll();}});window.addEventListener('pageshow',()=>tick());
function scrubGardenCopies(day=null){
 if(storageUnavailable)return;
 const keys=[`${C.KEY}-before-import`,`${C.KEY}-before-v1.1`];
 for(const key of keys){const raw=localStorage.getItem(key);if(!raw)continue;const copy=JSON.parse(raw);if(!copy.garden)continue;if(!Array.isArray(copy.garden.entries))throw Error('本地恢复副本中的心境格式异常，未完成清除。');copy.garden.entries=day?copy.garden.entries.filter(e=>e.day!==day):[];localStorage.setItem(key,JSON.stringify(copy));}
}
window.StudyApp={getState:()=>state,getPage:()=>page,isBusy:()=>busy,scrubGardenCopies,transact,notify,node,button,navigate,getCurrent:()=>current,refreshWords:()=>{current=null;revealed=false;words=L.catalog(WORDS,state.study);renderWords(true);},download};
state=read();
if(!storageBlocked&&!storageUnavailable){try{const previous=localStorage.getItem(C.KEY);if(!previous||!JSON.parse(previous).study){if(previous&&!localStorage.getItem(`${C.KEY}-before-v1.1`))localStorage.setItem(`${C.KEY}-before-v1.1`,previous);write(state);}}catch(e){notify('升级数据暂未保存，请检查存储空间并导出备份。');}}
navigate(location.hash.slice(1)||'focus');tick();setInterval(tick,1000);
if(!navigator.locks)notify('此浏览器不支持跨标签锁，建议只打开一个学习页面以保持记录一致。');
})();
