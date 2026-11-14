/* V4.5 新题型渲染：选词填空（banked cloze）+ 长篇阅读匹配。
   数据来自 v45-content.js 的 V45_CONTENT.types；本模块自管 localStorage（liujimiao-v45-types-v1），
   不写入主状态、不发金币/经验，只在本机记录每题型的作答与最佳成绩。 */
(function(root){
'use strict';
var KEY='liujimiao-v45-types-v1';
function load(){try{return JSON.parse(localStorage.getItem(KEY))||{};}catch(e){return{};}}
function save(s){try{localStorage.setItem(KEY,JSON.stringify(s));}catch(e){}}
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');}

function renderCloze(box,data,store){
  var card=el('section','card v45-card');
  card.append(el('h2',null,data.title));
  card.append(el('p','helper',data.instructions));
  var bank=el('div','v45-bank');
  data.bank.forEach(function(w){var c=el('span','v45-chip',w.id+'. '+w.word);c.title=w.pos;bank.append(c);});
  card.append(bank);
  var saved=(store[data.id]&&store[data.id].answers)||{};
  var form=el('div','v45-passage');
  var parts=data.passage.split(/\{(\d+)\}/);
  var selects={};
  for(var i=0;i<parts.length;i++){
    if(i%2===0){form.append(document.createTextNode(parts[i]));}
    else{
      var n=+parts[i];
      var sel=document.createElement('select');
      sel.className='v45-blank';sel.dataset.blank=n;sel.setAttribute('aria-label','第 '+n+' 空');
      var ph=document.createElement('option');ph.value='';ph.textContent='('+n+')';sel.append(ph);
      data.bank.forEach(function(w){var o=document.createElement('option');o.value=w.id;o.textContent=w.id+' '+w.word;sel.append(o);});
      if(saved[n])sel.value=saved[n];
      sel.addEventListener('change',function(){persist();});
      selects[n]=sel;form.append(sel);
    }
  }
  card.append(form);
  var actions=el('div','inline-actions');
  var submit=el('button','primary','交卷并查看解析');var reset=el('button','soft','清空重做');
  var result=el('p','helper');result.setAttribute('role','status');
  var review=el('div','v45-review');
  actions.append(submit,reset);card.append(actions,result,review);
  function persist(){
    var answers={};Object.keys(selects).forEach(function(k){if(selects[k].value)answers[k]=selects[k].value;});
    var s=load();s[data.id]=s[data.id]||{};s[data.id].answers=answers;save(s);
  }
  function grade(){
    persist();review.replaceChildren();var right=0;
    data.blanks.forEach(function(b){
      var got=selects[b.n].value;
      var ok=got===b.answer;if(ok)right++;
      selects[b.n].classList.toggle('v45-right',ok);
      selects[b.n].classList.toggle('v45-wrong',!ok);
      var row=el('div','v45-row');
      row.append(el('strong',null,'第 '+b.n+' 空：正确答案 '+b.answer+'（'+data.bank.find(function(w){return w.id===b.answer;}).word+'）'+(ok?' ✓':'，你选了 '+(got||'未选'))));
      row.append(el('p','helper',b.clue));review.append(row);
    });
    result.textContent='得分 '+right+' / '+data.blanks.length+'。每词最多用一次；先判断空里需要的词性，再看搭配与上下文。';
    var s=load();s[data.id]=s[data.id]||{};s[data.id].best=Math.max(s[data.id].best||0,right);save(s);
  }
  submit.addEventListener('click',grade);
  reset.addEventListener('click',function(){Object.values(selects).forEach(function(s2){s2.value='';s2.classList.remove('v45-right','v45-wrong');});review.replaceChildren();result.textContent='';persist();});
  var st=store[data.id];
  if(st&&st.best!=null)result.textContent='本机最佳成绩：'+st.best+' / '+data.blanks.length+'。';
  box.append(card);
}

function renderMatching(box,data,store){
  var card=el('section','card v45-card');
  card.append(el('h2',null,data.title));
  card.append(el('p','helper',data.instructions));
  var saved=(store[data.id]&&store[data.id].answers)||{};
  var article=el('div','v45-article');
  data.paragraphs.forEach(function(p){
    var para=el('p','v45-para');var tag=el('strong','v45-ptag',p.id+' ');
    para.append(tag,document.createTextNode(p.text));article.append(para);
  });
  card.append(article);
  var list=el('div','v45-stmts');var selects={};
  data.statements.forEach(function(st){
    var row=el('div','v45-stmt');
    row.append(el('span','v45-stmt-text',st.n+'. '+st.text));
    var sel=document.createElement('select');sel.className='v45-blank';sel.setAttribute('aria-label','第 '+st.n+' 题对应段落');
    var ph=document.createElement('option');ph.value='';ph.textContent='选段落';sel.append(ph);
    data.paragraphs.forEach(function(p){var o=document.createElement('option');o.value=p.id;o.textContent='段落 '+p.id;sel.append(o);});
    if(saved[st.n])sel.value=saved[st.n];
    sel.addEventListener('change',function(){persist();});
    selects[st.n]=sel;row.append(sel);list.append(row);
  });
  card.append(list);
  var actions=el('div','inline-actions');
  var submit=el('button','primary','交卷并查看解析');var reset=el('button','soft','清空重做');
  var result=el('p','helper');result.setAttribute('role','status');
  var review=el('div','v45-review');
  actions.append(submit,reset);card.append(actions,result,review);
  function persist(){
    var answers={};Object.keys(selects).forEach(function(k){if(selects[k].value)answers[k]=selects[k].value;});
    var s=load();s[data.id]=s[data.id]||{};s[data.id].answers=answers;save(s);
  }
  function grade(){
    persist();review.replaceChildren();var right=0;
    data.statements.forEach(function(st){
      var got=selects[st.n].value;var ok=got===st.answer;if(ok)right++;
      selects[st.n].classList.toggle('v45-right',ok);
      selects[st.n].classList.toggle('v45-wrong',!ok);
      var row=el('div','v45-row');
      row.append(el('strong',null,'第 '+st.n+' 题：段落 '+st.answer+(ok?' ✓':'，你选了 '+(got||'未选'))));
      row.append(el('p','helper','依据句：“'+st.evidence+'” '+st.note));review.append(row);
    });
    result.textContent='得分 '+right+' / '+data.statements.length+'。匹配题先抓陈述里的关键词，再到段落里找同义替换，不要逐词硬对。';
    var s=load();s[data.id]=s[data.id]||{};s[data.id].best=Math.max(s[data.id].best||0,right);save(s);
  }
  submit.addEventListener('click',grade);
  reset.addEventListener('click',function(){Object.values(selects).forEach(function(s2){s2.value='';s2.classList.remove('v45-right','v45-wrong');});review.replaceChildren();result.textContent='';persist();});
  var st0=store[data.id];
  if(st0&&st0.best!=null)result.textContent='本机最佳成绩：'+st0.best+' / '+data.statements.length+'。';
  box.append(card);
}

function init(){
  var host=document.getElementById('page-reading');
  var data=root.V45_CONTENT&&root.V45_CONTENT.types;
  if(!host||!data||document.getElementById('v45-types'))return;
  var box=el('div');box.id='v45-types';
  var head=el('div','intro');
  head.append(el('span','eyebrow','NEW QUESTION TYPES · V4.5'));
  head.append(el('h1',null,'真题题型补全'));
  head.append(el('p',null,'选词填空与长篇匹配是六级阅读的固定题型，原创模拟，先练方法再练速度。'));
  box.append(head);
  var store=load();
  if(data.cloze)renderCloze(box,data.cloze,store);
  if(data.matching)renderMatching(box,data.matching,store);
  host.append(box);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(globalThis);
