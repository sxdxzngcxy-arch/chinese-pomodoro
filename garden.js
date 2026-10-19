/* 心境花园 UI：复用 StudyApp 的存储事务，所有感受均由用户主动选择。 */
(() => {
'use strict';
const A=StudyApp,G=GardenCore,C=StudyCore,$=id=>document.getElementById(id),node=A.node,button=A.button;
let editingDay=null,loadedDay=C.day(),formDirty=false,historyKey='',pendingTimer=null,deleteDay=null,checkpointAt=Date.now(),inFlight=false,phaseText='',lastSession=null,recovering=false;
const state=()=>A.getState(),garden=()=>state().garden;
function status(text){$('garden-status').textContent=text;A.notify(text);}
async function act(action){
 // 等待正在进行的学习事务，避免快速退出时丢失“暂停”操作。
 for(let i=0;i<50&&A.isBusy();i++)await new Promise(resolve=>setTimeout(resolve,40));
 if(A.isBusy()){A.notify('正在保存其他操作，请稍后再试。');return false;}
 return A.transact(action,{settleTimer:false});
}
function selected(name){return document.querySelector(`input[name="${name}"]:checked`)?.value||null;}
function inputs(){return {feeling:selected('garden-feeling'),energy:selected('garden-energy')?Number(selected('garden-energy')):null};}
function setForm(entry=null){
 document.querySelectorAll('[name="garden-feeling"]').forEach(el=>{el.checked=el.value===entry?.feeling;});
 document.querySelectorAll('[name="garden-energy"]').forEach(el=>{el.checked=Number(el.value)===entry?.energy;});
 $('garden-note').value=entry?.note||'';formDirty=false;renderRecommendation();renderEditLabel();
}
function renderEditLabel(){
 $('garden-editing').textContent=editingDay?`正在修改 ${editingDay} 的记录；保存后更新这一天。`:'只有点“保存记录”才会留下签到；每天一条，再次保存更新当天。日记可以不写。';
 $('save-garden-entry').textContent=editingDay?'保存修改':'保存记录';$('cancel-garden-edit').hidden=!editingDay;$('garden-note-count').textContent=`${$('garden-note').value.length} / 280`;
}
function renderRecommendation(){
 const v=inputs(),rec=G.recommend(v.feeling,v.energy);
 $('garden-recommendation').textContent=rec?`可选建议：${G.modes[rec.mode].name}模式。${rec.reason}`:'填好感受和精力后，这里会给一个可选建议。也可以直接选择模式。';
 $('adopt-garden-recommendation').hidden=!rec;$('adopt-garden-recommendation').disabled=rec?.mode===garden().mode;
}
function renderMode(){
 const mode=garden().mode;document.querySelectorAll('[name="garden-mode"]').forEach(el=>{el.checked=el.value===mode;});
 $('garden-mode-description').textContent=`已选${G.modes[mode].name}：${G.modes[mode].description}`;
 $('garden-prepare-focus').textContent=mode==='light'?'准备本次 5 分钟专注':`准备本次 ${state().settings.focus} 分钟专注`;
 $('focus-garden-mode').textContent=`${G.modes[mode].name}模式建议 · ${mode==='light'?'小步开始，也可以休息':mode==='sprint'?'可以去阅读页做限时练习':'沿用你熟悉的节奏'}`;
}
function renderBreathing(){
 const b=garden().breathing,p=G.phase(b,Date.now()),running=b.status==='running';
 $('garden-breath-duration').value=b.duration;$('garden-breath-style').value=b.style;$('garden-breath-duration').disabled=running;$('garden-breath-style').disabled=running;
 $('garden-breath-start').disabled=running;$('garden-breath-start').textContent=b.status==='paused'?'继续引导':b.status==='completed'?'再留一小段时间':'开始引导';
 $('garden-breath-pause').disabled=!running;$('garden-breath-natural').disabled=b.style==='natural';
 if(phaseText!==p.text){$('garden-breath-phase').textContent=p.text;phaseText=p.text;}
 $('garden-breath-time').textContent=`${String(Math.floor(p.remaining/60)).padStart(2,'0')}:${String(p.remaining%60).padStart(2,'0')}`;
 $('garden-breath-orb').style.transform=`scale(${p.scale})`;
 $('garden-breath-orb').classList.toggle('natural',b.style==='natural');$('garden-reduced-motion').checked=state().settings.reduced;
}
function renderHistory(){
 const g=garden(),records=G.recent(g,Date.now(),C.day),key=JSON.stringify({records,deleteDay});if(key===historyKey)return;historyKey=key;
 $('garden-history').replaceChildren();$('garden-history-count').textContent=`${records.length} 天留了记录`;
 if(!records.length)$('garden-history').append(node('p','这里可以留白。想记录时，再写下一个片刻。','helper'));
 for(const e of records){
  const row=node('article',undefined,'garden-history-row'),info=node('div',undefined,'garden-history-info');
  info.append(node('time',e.day),node('strong',`${G.feelings[e.feeling]} · 精力 ${e.energy} / 5`));
  if(e.note)info.append(node('p',e.note));else info.append(node('small','这一天没有写日记，也很好。'));
  const actions=node('div',undefined,'inline-actions');
  actions.append(button('修改',()=>{editingDay=e.day;setForm(e);$('garden-form').scrollIntoView({block:'start',behavior:'instant'});$('garden-form').querySelector('input').focus({preventScroll:true});}),button(deleteDay===e.day?'确认删除':'删除',async()=>{
   if(deleteDay!==e.day){deleteDay=e.day;renderHistory();return;}
   const ok=await act(s=>{A.scrubGardenCopies(e.day);s.garden.entries=s.garden.entries.filter(item=>item.day!==e.day);});
   if(ok){if(editingDay===e.day){editingDay=null;setForm();}deleteDay=null;renderHistory();status('这条心境记录已删除，学习记录和小满的状态保持。');}
  }));row.append(info,actions);$('garden-history').append(row);
 }
}
function render(){
 if(C.day()!==loadedDay){loadedDay=C.day();if(!formDirty&&!editingDay)setForm();}
 renderMode();renderRecommendation();renderBreathing();renderHistory();
}
$('garden-form').addEventListener('change',()=>{formDirty=true;renderRecommendation();});$('garden-note').addEventListener('input',()=>{formDirty=true;renderEditLabel();});
$('garden-form').addEventListener('submit',async event=>{
 event.preventDefault();const data={day:editingDay||C.day(),...inputs(),note:$('garden-note').value};
 const ok=await act(s=>G.upsert(s.garden,data,Date.now()));
 if(ok){editingDay=null;formDirty=false;renderEditLabel();status('已保存，只留在当前浏览器。不需要每天都记录。');}
});
$('cancel-garden-edit').addEventListener('click',()=>{editingDay=null;setForm();status('已取消修改，原记录保持。');});
$('skip-garden').addEventListener('click',()=>{editingDay=null;setForm();status('已跳过签到，照常学习或休息都可以。');A.navigate('focus');});
document.querySelectorAll('[name="garden-mode"]').forEach(el=>el.addEventListener('change',async()=>{
 const mode=el.value;pendingTimer=null;$('garden-focus-confirm').hidden=true;
 if(await act(s=>{s.garden.mode=mode;}))status(`已切换为${G.modes[mode].name}建议，当前计时和每日词量没有改变。`);
}));
$('adopt-garden-recommendation').addEventListener('click',async()=>{
 const v=inputs(),rec=G.recommend(v.feeling,v.energy);if(!rec)return;
 if(await act(s=>{s.garden.mode=rec.mode;}))status(`已采用${G.modes[rec.mode].name}建议。需要时仍可切换。`);
});
async function prepare(expected=null){
 const mode=garden().mode;
 const ok=await act(s=>{
  if(expected!==null&&JSON.stringify(s.timer)!==expected)throw Error('计时器状态已变化，请重新确认，原计时未重置。');
  if(expected===null&&G.hasTimerProgress(s.timer))throw Error('已有计时进度，请先确认保留或重置。');
  G.prepareFocus(s,mode);
 });
 if(ok){pendingTimer=null;$('garden-focus-confirm').hidden=true;A.navigate('focus');status('本次专注已准备好，点击开始即可；长期时间设置保持。');}
}
$('garden-prepare-focus').addEventListener('click',()=>{
 const t=state().timer;
 if(G.hasTimerProgress(t)){pendingTimer=JSON.stringify(t);$('garden-focus-confirm-text').textContent='你已有正在进行或暂停的计时。重置会放弃这轮未完成进度，不计奖励。也可以保留并返回。';$('garden-focus-confirm').hidden=false;return;}
 prepare();
});
$('garden-confirm-focus').addEventListener('click',()=>{if(pendingTimer!==null)prepare(pendingTimer);});$('garden-keep-focus').addEventListener('click',()=>{pendingTimer=null;$('garden-focus-confirm').hidden=true;A.navigate('focus');});
$('garden-breath-duration').addEventListener('change',()=>{const duration=Number($('garden-breath-duration').value);act(s=>{if(![60,120,180].includes(duration))return;const style=s.garden.breathing.style;s.garden.breathing={...G.freshBreathing(),duration,style};});});
$('garden-breath-style').addEventListener('change',()=>{const style=$('garden-breath-style').value;if(['paced','natural'].includes(style))act(s=>{s.garden.breathing.style=style;});});
$('garden-breath-start').addEventListener('click',async()=>{
 if(await act(s=>G.start(s.garden,Date.now(),C.uid()))){checkpointAt=Date.now();status('引导已开始，随时可以暂停或回到自然呼吸。');}
});
async function pauseAt(now,{natural=false}={}){
 const id=garden().breathing.id;const ok=await act(s=>{if(s.garden.breathing.id!==id)return false;G.pause(s.garden,now);if(natural)s.garden.breathing.style='natural';});return ok;
}
$('garden-breath-pause').addEventListener('click',async()=>{if(await pauseAt(Date.now()))status('已暂停，准备好再继续。');});
$('garden-breath-stop').addEventListener('click',async()=>{if(await pauseAt(Date.now(),{natural:true}))status('节奏已停止，现在可以自然呼吸。');});
$('garden-breath-natural').addEventListener('click',()=>act(s=>{s.garden.breathing.style='natural';}));
$('garden-reduced-motion').addEventListener('change',()=>{const reduced=$('garden-reduced-motion').checked;act(s=>{s.settings.reduced=reduced;});});
$('garden-quick-exit').addEventListener('click',async()=>{if(garden().breathing.status==='running')await pauseAt(Date.now());A.navigate('focus');});
$('export-garden').addEventListener('click',()=>{
 A.download(JSON.stringify({type:'yike-garden',schema:1,exportedAt:new Date().toISOString(),entries:garden().entries},null,2),`yike-garden-${C.day()}.json`);status('已生成心境 JSON，可在 iPhone 的下载列表保存。完整恢复请使用统计页的完整备份。');
});
$('clear-garden').addEventListener('click',()=>{$('clear-garden-confirm').hidden=false;});$('cancel-clear-garden').addEventListener('click',()=>{$('clear-garden-confirm').hidden=true;});
$('confirm-clear-garden').addEventListener('click',async()=>{
 const ok=await act(s=>{A.scrubGardenCopies();s.garden.entries=[];});
 if(ok){editingDay=null;deleteDay=null;setForm();$('clear-garden-confirm').hidden=true;renderHistory();status('心境记录及本站恢复副本中的心境记录已清除。学习和宠物数据保持。');}
});
function onNavigate(previous,next){
 if(previous==='garden'&&next!=='garden'&&garden().breathing.status==='running')pauseAt(Date.now());
}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&garden().breathing.status==='running')pauseAt(Date.now());});
window.addEventListener('pagehide',()=>{if(garden().breathing.status==='running')pauseAt(Date.now());});
window.GardenUI={render,onNavigate};setForm();render();
recovering=garden().breathing.status==='running';
if(recovering)act(s=>G.recover(s.garden)).then(ok=>{if(ok){recovering=false;status('已恢复最近保存的呼吸进度，并保持暂停。准备好后再继续。');}});
setInterval(async()=>{
 if(recovering&&garden().breathing.status!=='running')recovering=false;
 if(A.getPage()!=='garden'||document.hidden||recovering)return;renderBreathing();
 if(C.day()!==loadedDay)render();
 const b=garden().breathing;if(b.status!=='running'||inFlight)return;
 if(lastSession!==b.id){lastSession=b.id;checkpointAt=Date.now();}
 const now=Date.now();
 if(G.elapsed(b,now)>=b.duration*1000){inFlight=true;const id=b.id;const ok=await act(s=>G.finish(s.garden,now,id));inFlight=false;if(ok)status('这一小段时间留给了自己。可以继续学习，也可以再休息。');}
 else if(now-checkpointAt>=5000){inFlight=true;const id=b.id;await act(s=>G.checkpoint(s.garden,now,id));checkpointAt=now;inFlight=false;}
},250);
})();
