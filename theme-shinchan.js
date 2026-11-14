/* 蜡笔小新主题开关：在设置页“阅读字号”下方加一个“蜡笔小新背景（全站）”开关。
   选择只存本机 localStorage（liujimiao-shinchan-bg），默认开；关掉时给 <html> 加 shinchan-bg-off 类。
   宠物小屋背景与伙伴形象不受此开关影响（在小屋里单独呈现）。 */
(function(){
'use strict';
var KEY='liujimiao-shinchan-bg';
function isOff(){try{return localStorage.getItem(KEY)==='off';}catch(e){return false;}}
function apply(){document.documentElement.classList.toggle('shinchan-bg-off',isOff());}
apply();
function build(){
  if(document.getElementById('theme-bg-toggle'))return;
  var anchor=document.getElementById('font-size');
  if(!anchor)return;
  var host=anchor.closest('label')||anchor.parentElement;
  if(!host||!host.parentElement)return;
  var label=document.createElement('label');
  label.className='check-setting';
  var span=document.createElement('span');
  span.textContent='蜡笔小新背景（全站）';
  var input=document.createElement('input');
  input.type='checkbox';
  input.id='theme-bg-toggle';
  input.checked=!isOff();
  input.addEventListener('change',function(){
    try{localStorage.setItem(KEY,input.checked?'on':'off');}catch(e){}
    apply();
  });
  label.append(span,input);
  host.parentElement.insertBefore(label,host.nextSibling);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);
else build();
})();
