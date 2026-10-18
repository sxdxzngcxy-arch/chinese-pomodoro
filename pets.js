/* 宠物注册表：图形与养成数据分离。增加同结构条目即可开放外观切换。
   SVG 只允许受信任的项目源码，不从 JSON 备份加载任意 SVG。 */
(function(root){
'use strict';
const pets={
 teddy:{id:'teddy',name:'小满',type:'Q版泰迪小狗',icon:'♡',svg:`
 <svg class="pet-svg teddy" viewBox="0 0 120 120" role="img" aria-label="Q版泰迪小狗小满，卷卷毛、圆耳朵和奶油色小肚子">
 <ellipse cx="60" cy="111" rx="31" ry="5" fill="#6e4a31" opacity=".12"/>
 <g class="pet-tail"><path d="M84 89Q108 83 100 70" fill="none" stroke="#b67c50" stroke-width="11" stroke-linecap="round"/></g>
 <g class="pet-body"><ellipse cx="60" cy="89" rx="25" ry="23" fill="#c18c5a"/><ellipse cx="60" cy="93" rx="15" ry="16" fill="#f4dfbb"/>
 <ellipse cx="43" cy="108" rx="12" ry="7" fill="#ce9a67"/><ellipse cx="77" cy="108" rx="12" ry="7" fill="#ce9a67"/>
 <path d="M39 81Q29 85 33 96M81 81Q91 85 87 96" fill="none" stroke="#b77e50" stroke-width="11" stroke-linecap="round"/>
 <path d="M47 78Q60 85 73 78" fill="none" stroke="#7f9c7d" stroke-width="5" stroke-linecap="round"/><circle cx="60" cy="83" r="4" fill="#dfbd77"/></g>
 <g class="pet-head">
 <g fill="#ae754d"><ellipse cx="28" cy="50" rx="15" ry="24" transform="rotate(14 28 50)"/><ellipse cx="92" cy="50" rx="15" ry="24" transform="rotate(-14 92 50)"/><circle cx="17" cy="46" r="7"/><circle cx="20" cy="61" r="8"/><circle cx="100" cy="61" r="8"/><circle cx="103" cy="46" r="7"/></g>
 <path d="M27 42Q27 18 60 16Q93 18 93 42V56Q91 81 60 82Q29 81 27 56Z" fill="#d7a573"/>
 <g fill="#d7a573"><circle cx="35" cy="30" r="11"/><circle cx="45" cy="22" r="11"/><circle cx="60" cy="20" r="12"/><circle cx="75" cy="22" r="11"/><circle cx="85" cy="30" r="11"/><circle cx="29" cy="47" r="8"/><circle cx="91" cy="47" r="8"/><circle cx="32" cy="66" r="9"/><circle cx="88" cy="66" r="9"/></g>
 <g fill="none" stroke="#be8b5d" stroke-width="2.5" stroke-linecap="round" opacity=".55"><path d="M41 28q-6-7-8 0M56 21q-5-5-8 0M70 25q5-6 9 0M85 36q6 1 5 6"/></g>
 <ellipse cx="60" cy="63" rx="23" ry="17" fill="#f2d9b6"/>
 <g class="pet-eyes" fill="#49382d"><ellipse cx="43" cy="47" rx="4.2" ry="5.5"/><ellipse cx="77" cy="47" rx="4.2" ry="5.5"/><g fill="#fff9ea"><circle cx="44" cy="45" r="1.4"/><circle cx="78" cy="45" r="1.4"/></g></g>
 <g class="pet-happy-eyes" fill="none" stroke="#49382d" stroke-width="3" stroke-linecap="round"><path d="M39 49q4-5 8 0M73 49q4-5 8 0"/></g>
 <ellipse cx="35" cy="58" rx="6" ry="3.5" fill="#d9948b" opacity=".65"/><ellipse cx="85" cy="58" rx="6" ry="3.5" fill="#d9948b" opacity=".65"/>
 <path d="M54 56Q60 52 66 56Q65 62 60 63Q55 62 54 56" fill="#654735"/>
 <path d="M60 63v4m-8 0q4 7 8 0q4 7 8 0" fill="none" stroke="#79503b" stroke-width="2" stroke-linecap="round"/>
 <path class="pet-tongue" d="M56 70h8v4a4 4 0 0 1-8 0Z" fill="#db9b9b"/>
 </g></svg>`}
};
if(typeof module!=='undefined'&&module.exports)module.exports=pets;else root.PET_CATALOG=pets;
})(globalThis);
