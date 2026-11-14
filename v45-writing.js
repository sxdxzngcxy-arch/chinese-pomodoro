/* V4.5 写作反馈（静态站可落地的两层）：
1) 本地机械检查：纯规则统计（词数/段落/句长/衔接词/重复词/双词/句首大写），明确标注不是评分、不判断内容质量。
2) AI 批改包：把题干 + 评分维度说明 + 草稿拼成一段文本复制到剪贴板，粘贴到任意 AI 对话即可得到真正的批改。
只读写作页现有的 #writing-body / #writing-prompt / #writing-select，不改主状态。 */
(function(){
'use strict';
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
var LINKING=['first','firstly','second','secondly','moreover','furthermore','however','therefore','thus','consequently','in addition','for example','for instance','in conclusion','on the other hand','as a result','in my opinion','admittedly','nevertheless','meanwhile','overall'];
var STOP=new Set(('the,be,been,being,and,or,but,if,while,when,that,this,these,those,there,their,they,them,then,than,with,from,have,has,had,will,would,can,could,should,into,about,over,under,more,most,other,others,such,also,just,like,make,makes,made,students,student,university').split(','));
function wordsOf(t){return t.match(/[A-Za-z]+(?:'[A-Za-z]+)?/g)||[];}
function sentencesOf(t){return t.split(/[.!?]+/).map(function(s){return s.trim();}).filter(Boolean);}

function checkWriting(text,promptText){
var out=[];var words=wordsOf(text);var sents=sentencesOf(text);
var m=/(\d{2,3})\s*[–-]\s*(\d{2,3})\s*words/i.exec(promptText||'');var lo=m?+m[1]:150,hi=m?+m[2]:200;
out.push({ok:words.length>=lo&&words.length<=hi,text:'词数 '+words.length+'（本题建议 '+lo+'–'+hi+'）'+(words.length<lo?'，还差 '+(lo-words.length)+' 词':words.length>hi?'，超出 '+(words.length-hi)+' 词，考虑删减':'，在建议范围内')});
var paras=text.split(/\n\s*\n/).map(function(s){return s.trim();}).filter(Boolean).length;
out.push({ok:paras>=3,text:'段落 '+paras+' 段'+(paras<3?'，建议至少 3 段：立场、理由、收束':'')});
if(sents.length){
var avg=words.length/sents.length;
out.push({ok:avg>=10&&avg<=24,text:'共 '+sents.length+' 句，平均句长 '+avg.toFixed(1)+' 词'+(avg>24?'，句子偏长，注意拆分长句':avg<10?'，句子偏短，试着合并简单句':'')});
var lower=sents.filter(function(s){return /^[a-z]/.test(s);}).length;
out.push({ok:lower===0,text:lower?('有 '+lower+' 句句首小写，检查大写'):'句首大写未发现明显问题'});
}
var low=' '+text.toLowerCase()+' ';
var found=LINKING.filter(function(w){return low.indexOf(' '+w)>=0||low.indexOf('\n'+w)>=0;});
out.push({ok:found.length>=3,text:'衔接词用到 '+found.length+' 个'+(found.length?'（'+found.slice(0,8).join(', ')+'）':'')+(found.length<3?'，建议至少 3 个，让段落过渡更清楚':'')});
var freq={};words.forEach(function(w){var k=w.toLowerCase();if(k.length>=5&&!STOP.has(k))freq[k]=(freq[k]||0)+1;});
var rep=Object.entries(freq).filter(function(e){return e[1]>=4;}).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
out.push({ok:!rep.length,text:rep.length?('重复较多的实词：'+rep.map(function(e){return e[0]+'×'+e[1];}).join('、')+'，可换同义表达'):'没有明显过度重复的实词'});
var dbl=text.match(/\b([A-Za-z]+)\s+\1\b/gi);
out.push({ok:!dbl,text:dbl?('疑似重复词：'+dbl.slice(0,3).join('、')):'未发现重复词（如 the the）'});
return out;
}
function checkTranslation(text,promptText){
var out=[];var words=wordsOf(text);
var zh=(promptText.match(/[\u4e00-\u9fff]/g)||[]).length;
out.push({ok:words.length>=60,text:'译文 '+words.length+' 词（原文约 '+zh+' 汉字，一般译文词数约为汉字数的 0.6–0.8 倍）'+(words.length<40?'，可能有漏译，逐句对照原文检查':'')});
var dbl=text.match(/\b([A-Za-z]+)\s+\1\b/gi);
out.push({ok:!dbl,text:dbl?('疑似重复词：'+dbl.slice(0,3).join('、')):'未发现重复词'});
var freq={};words.forEach(function(w){var k=w.toLowerCase();if(k.length>=5&&!STOP.has(k))freq[k]=(freq[k]||0)+1;});
var rep=Object.entries(freq).filter(function(e){return e[1]>=4;}).sort(function(a,b){return b[1]-a[1];}).slice(0,3);
out.push({ok:!rep.length,text:rep.length?('重复较多的实词：'+rep.map(function(e){return e[0]+'×'+e[1];}).join('、')):'没有明显过度重复的实词'});
out.push({ok:true,text:'忠实与流畅（漏译、时态、术语一致）本地规则查不了，请用下方 AI 批改包做全文对照。'});
return out;
}
function currentType(){
var sel=document.getElementById('writing-select');
var id=sel&&sel.value;
var list=(window.TRAINING_DATA&&window.TRAINING_DATA.prompts)||[];
var p=list.find(function(x){return x.id===id;});
return p?p.type:'writing';
}
function aiPack(){
var prompt=(document.getElementById('writing-prompt')||{}).textContent||'';
var body=(document.getElementById('writing-body')||{}).value||'';
var type=currentType();
if(!body.trim())return null;
if(type==='translation'){
return '你是一位大学英语六级翻译阅卷老师。请对照中文原文批改下面这篇学生译文：1) 逐句指出漏译、误译和中式英语；2) 检查时态、语态与术语前后一致；3) 给出修改后的完整译文，并标注每处改动的原因；4) 最后用一句话总结这篇译文最值得改进的一点。不要给官方分数，用“接近六级平均水平/高于/低于”这类描述即可。\n\n\n'+prompt+'\n\n\n'+body;
}
return '你是一位大学英语六级作文阅卷老师。请批改下面这篇学生作文：1) 按内容切题、结构连贯、语言准确、词汇丰富四个维度分别点评；2) 逐句标出语法和拼写错误并给改法；3) 指出 2–3 处可以升级的表达（给出替换句）；4) 给出一版修改后的范文（保持学生原意与大致词数）；5) 最后用一句话总结最值得改进的一点。不要给官方分数，用“接近六级平均水平/高于/低于”这类描述即可。\n\n\n'+prompt+'\n\n\n'+body;
}
function init(){
var body=document.getElementById('writing-body');
if(!body||document.getElementById('v45-writing-panel'))return;
var card=body.closest('section');if(!card||!card.parentElement)return;
var panel=el('section','card v45-card');panel.id='v45-writing-panel';
panel.append(el('h2',null,'写作反馈 · V4.5'));
panel.append(el('p','helper','本地机械检查只统计形式（词数、段落、句长、衔接词、重复），不评分、不判断内容好坏。想要真正的批改，用 AI 批改包：把题干、要求和你的草稿打包复制，粘贴到任意 AI 对话即可。'));
var actions=el('div','inline-actions');
var checkBtn=el('button','soft','本地机械检查');var packBtn=el('button','soft','复制 AI 批改包');
actions.append(checkBtn,packBtn);panel.append(actions);
var status=el('p','helper');status.setAttribute('role','status');
var list=el('div','v45-checks');
panel.append(status,list);
checkBtn.addEventListener('click',function(){
var text=body.value||'';list.replaceChildren();
if(!text.trim()){status.textContent='草稿还是空的，先写几句再检查。';return;}
var promptText=(document.getElementById('writing-prompt')||{}).textContent||'';
var rows=currentType()==='translation'?checkTranslation(text,promptText):checkWriting(text,promptText);
rows.forEach(function(r){var row=el('p','v45-check '+(r.ok?'ok':'warn'),(r.ok?'✓ ':'! ')+r.text);list.append(row);});
status.textContent='机械检查完成。这只是形式清单，内容与语法请用 AI 批改包或对照参考文本自查。';
});
packBtn.addEventListener('click',function(){
var pack=aiPack();
if(!pack){status.textContent='先写一点草稿，再打包给 AI 批改。';return;}
function done(){status.textContent='AI 批改包已复制。打开任意 AI 对话粘贴发送，就能拿到逐句批改和修改稿。';}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(pack).then(done,function(){fallback();});}else fallback();
function fallback(){
var ta=document.createElement('textarea');ta.value=pack;ta.style.position='fixed';ta.style.opacity='0';
document.body.append(ta);ta.select();try{document.execCommand('copy');done();}catch(e){status.textContent='复制失败，请手动选中草稿复制。';}
ta.remove();
}
});
card.parentElement.insertBefore(panel,card.nextSibling);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
