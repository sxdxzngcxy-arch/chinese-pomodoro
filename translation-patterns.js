/* 翻译句型库（V4.5 追加）：六级汉译英高频句型，全部为原创例句。
   面板挂在写作页，自包含渲染；点“复制”可把例句译文复制走仿写。不写主状态。 */
(function(){
'use strict';
var CATS=['常用框架','从句类','高分句式','翻译难点','数字与比较','话题表达'];
var PATTERNS=[
 {cat:'常用框架',name:'随着……的发展',form:'With the development / growth of + 名词, …',note:'“随着”十有八九用 With 介词短语开头，比 As 从句更简洁。',zh:'随着经济的快速发展，人们的生活水平显著提高。',en:'With the rapid development of the economy, people\u2019s living standards have improved markedly.'},
 {cat:'常用框架',name:'近年来……',form:'In recent years, … / Recent years have witnessed …',note:'witness 是“见证”式拟人，写“近年来发生了某变化”很地道。',zh:'近年来，越来越多的年轻人选择到乡村旅游。',en:'In recent years, a growing number of young people have chosen to travel to the countryside.'},
 {cat:'常用框架',name:'越来越……',form:'more and more + 形容词 / an increasing number of …',note:'“越来越多的 + 名词”优先用 a growing number of，避免通篇 more and more。',zh:'越来越多的人意识到，健康比财富更重要。',en:'More and more people have realized that health matters more than wealth.'},
 {cat:'常用框架',name:'不仅……而且……',form:'not only … but also …（注意倒装与平行）',note:'not only 放句首要部分倒装；两个分句结构必须平行。',zh:'这项政策不仅降低了成本，而且提高了效率。',en:'The policy not only reduced costs but also improved efficiency.'},
 {cat:'常用框架',name:'一方面……另一方面……',form:'on the one hand …, on the other hand …',note:'写利弊、双面话题时的骨架句型，后面各接一个完整分句。',zh:'一方面，网络购物节省时间；另一方面，它也让人花钱更冲动。',en:'On the one hand, online shopping saves time; on the other hand, it makes people spend more impulsively.'},
 {cat:'常用框架',name:'据统计 / 数据显示',form:'Statistics show that … / According to a recent survey, …',note:'原文出现“据统计”就补出信息来源，译文显得有据可依。',zh:'据统计，中国高铁的运营里程已居世界第一。',en:'Statistics show that the total length of China\u2019s high-speed railways in operation now ranks first in the world.'},
 {cat:'从句类',name:'定语从句合并短句',form:'…, which / who / that + 从句',note:'中文两个短句、后句在解释前句名词时，合并成定语从句，避免句子碎。',zh:'博物馆免费开放，这一做法吸引了大量年轻游客。',en:'The museum is open to the public free of charge, which has attracted a large number of young visitors.'},
 {cat:'从句类',name:'It 形式主语',form:'It is + 形容词 + for sb. to do / that …',note:'“做某事很重要/很难”不要直译 Doing… is…，用 It 形式主语更自然。',zh:'对大学生来说，学会管理时间非常重要。',en:'It is of great importance for college students to learn how to manage their time.'},
 {cat:'从句类',name:'让步状语从句',form:'Although / While + 从句, 主句',note:'“虽然……但是……”英文只能留一个连词，Although 和 but 不能同时出现。',zh:'虽然这项工作很辛苦，但他从中学会了很多。',en:'Although the job was demanding, he learned a great deal from it.'},
 {cat:'从句类',name:'目的状语从句',form:'so that … / in order that … / to do …',note:'“为了……”优先用 to do 放句首或句尾，最简洁。',zh:'政府修建了这座桥，以便村民能更快地到达县城。',en:'The government built the bridge so that villagers could reach the county town more quickly.'},
 {cat:'从句类',name:'条件句与“只要”',form:'As long as + 从句, 主句',note:'“只要”用 as long as 或 provided that；“只有”才用 only if。',zh:'只要坚持练习，任何人都能掌握一门外语。',en:'As long as one keeps practicing, anyone can master a foreign language.'},
 {cat:'高分句式',name:'强调句',form:'It is / was + 被强调部分 + that …',note:'想突出时间、原因、对象时用强调句；注意 that 后句子要完整。',zh:'正是教育改变了无数农村孩子的命运。',en:'It is education that has changed the fate of countless children in rural areas.'},
 {cat:'高分句式',name:'否定倒装',form:'Never / Seldom / Not only … + 助动词 + 主语 …',note:'否定副词放句首要倒装，是阅卷老师眼里的明确加分信号，但一篇最多用一次。',zh:'他从未想过放弃自己的梦想。',en:'Never did he think of giving up his dream.'},
 {cat:'高分句式',name:'虚拟语气',form:'If it were not for … / Without …, … would …',note:'“要不是……”“没有……”译成虚拟语气，比 If there is no… 高级得多。',zh:'要不是老师的鼓励，他可能早就放弃了。',en:'If it had not been for his teacher\u2019s encouragement, he might have given up long ago.'},
 {cat:'高分句式',name:'分词作状语',form:'Doing / Done …, 主句（逻辑主语与主句一致）',note:'两个动作同一主语时，前一个动作改分词短语，句子立刻紧凑。',zh:'建于明代的这座古塔见证了城市六百年的变迁。',en:'Built in the Ming Dynasty, the ancient tower has witnessed six centuries of change in the city.'},
 {cat:'高分句式',name:'With 复合结构',form:'with + 名词 + doing / done / 形容词',note:'描写场景细节（伴随状态）时用 with 复合结构，比再起一个句子更流畅。',zh:'老人坐在树下，手里拿着一把蒲扇，脸上带着微笑。',en:'The old man sat under the tree, with a palm-leaf fan in his hand and a smile on his face.'},
 {cat:'翻译难点',name:'被动语态处理',form:'… is / are + 过去分词 + by … / 地点',note:'中文“被修建、被誉为、受到……”多用被动；“被誉为”是 be known / honored as。',zh:'这座图书馆建于 1950 年，被誉为城市的文化地标。',en:'Built in 1950, the library is honored as a cultural landmark of the city.'},
 {cat:'翻译难点',name:'无主语句补主语',form:'补 It / There / 人 / 物 作主语',note:'中文常省主语，英文必须补：无合适主语时用 It 或 There be。',zh:'要解决这个问题，需要全社会的共同努力。',en:'To solve this problem, joint efforts from the whole society are needed.'},
 {cat:'翻译难点',name:'长句拆分',form:'按意群切分：主干先行，修饰后置',note:'中文长句先找主干（谁做了什么），再把时间、地点、原因拆成短语或从句分开安放。',zh:'这座位于长江边的小城，以其保存完好的古建筑和悠久的茶文化而闻名，每年吸引成千上万的游客。',en:'Located on the bank of the Yangtze River, the small city is famous for its well-preserved ancient buildings and long history of tea culture, attracting tens of thousands of tourists every year.'},
 {cat:'翻译难点',name:'词性转换',form:'动词→名词 / 形容词→动词 等',note:'“成功地做成了某事”译 succeed in doing 不如名词化：achieve success in…；按英文习惯换词性。',zh:'他的成功主要归功于多年的勤奋和坚持。',en:'His success is mainly attributed to years of diligence and persistence.'},
 {cat:'翻译难点',name:'增译与省译',form:'补出隐含信息 / 省掉重复修饰',note:'“方方面面、各种各样”这类虚词常可省；指代不清时要补出所指对象。',zh:'改革开放以来，中国发生了翻天覆地的变化。',en:'Since the reform and opening up, China has undergone tremendous changes.'},
 {cat:'数字与比较',name:'占……的百分之……',form:'account for + 百分数 / make up + 百分数',note:'“占”不用 is；account for 是最稳的表达。',zh:'去年，新能源汽车占新车总销量的四分之一以上。',en:'Last year, new energy vehicles accounted for more than a quarter of all new cars sold.'},
 {cat:'数字与比较',name:'是……的 X 倍',form:'X times as + 形容词 + as / X times the + 名词 + of',note:'“是去年的三倍”用 three times as much as last year，不要写 more than 的混搭。',zh:'今年的游客数量是五年前的两倍。',en:'The number of tourists this year is twice as large as that of five years ago.'},
 {cat:'数字与比较',name:'增长 / 下降了……',form:'increase / rise by + 数值（到某值用 to）',note:'by 表示增量，to 表示结果值，“增长了 20%”是 increase by 20%。',zh:'该市的人口在过去十年里增长了近 20%。',en:'The population of the city has increased by nearly 20 percent over the past decade.'},
 {cat:'数字与比较',name:'与……相比',form:'Compared with … / In comparison with …',note:'“与过去相比”放句首用 Compared with the past, 主句主语要与之逻辑一致。',zh:'与十年前相比，人们的出行方式发生了巨大变化。',en:'Compared with ten years ago, the way people travel has changed dramatically.'},
 {cat:'话题表达',name:'传统文化介绍',form:'…, a traditional Chinese art form with a history of … years',note:'介绍京剧、书法、剪纸等：名称 + 同位语解释 + 历史，是六级文化题的标准开局。',zh:'书法是中国传统艺术形式，已有三千多年的历史。',en:'Calligraphy, a traditional Chinese art form, has a history of more than 3,000 years.'},
 {cat:'话题表达',name:'非物质文化遗产',form:'be listed as / be inscribed on the list of intangible cultural heritage',note:'“被列入非遗名录”用 be inscribed on…；保护传承用 pass down / preserve。',zh:'这项技艺已被列入国家级非物质文化遗产名录。',en:'The craft has been inscribed on the national list of intangible cultural heritage.'},
 {cat:'话题表达',name:'科技改变生活',form:'… has brought great convenience to … / has revolutionized …',note:'科技话题的万能谓语：bring convenience to、revolutionize、transform。',zh:'智能手机彻底改变了人们获取信息的方式。',en:'Smartphones have revolutionized the way people access information.'},
 {cat:'话题表达',name:'环境保护',form:'raise public awareness of environmental protection / take measures to …',note:'环保题高频搭配：提高意识 raise awareness，采取措施 take measures。',zh:'政府采取了一系列措施来减少空气污染。',en:'The government has taken a series of measures to reduce air pollution.'},
 {cat:'话题表达',name:'教育与成长',form:'play a vital role in … / lay a solid foundation for …',note:'“起重要作用”用 play a vital role in；“打下基础”用 lay a solid foundation for。',zh:'阅读在孩子的成长中起着至关重要的作用。',en:'Reading plays a vital role in the growth of children.'}
];
function el(tag,cls,text){var n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;}
function init(){
  var host=document.getElementById('page-writing');
  if(!host||document.getElementById('v45-patterns'))return;
  var panel=el('section','card v45-card');panel.id='v45-patterns';
  panel.append(el('h2',null,'翻译句型库 · V4.5'));
  panel.append(el('p','helper','六级汉译英高频句型 '+PATTERNS.length+' 个，例句全部原创。先按类别筛选，挑 2–3 个读熟，再套到当前题目里仿写一句，比背整篇范文更有效。'));
  var chips=el('div','v45-bank');
  var list=el('div');
  function render(cat){
    list.replaceChildren();
    PATTERNS.filter(function(p){return cat==='全部'||p.cat===cat;}).forEach(function(p){
      var row=el('div','v45-row');
      row.append(el('strong',null,p.name));
      var form=el('p','v45-form',p.form);row.append(form);
      row.append(el('p','helper',p.note));
      row.append(el('p','v45-ex-zh',p.zh));
      var enRow=el('p','v45-ex-en');enRow.append(document.createTextNode(p.en+' '));
      var copy=el('button','soft v45-copy','复制译文');
      copy.addEventListener('click',function(){
        function done(){copy.textContent='已复制';setTimeout(function(){copy.textContent='复制译文';},1500);}
        if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(p.en).then(done,done);else done();
      });
      enRow.append(copy);row.append(enRow);
      list.append(row);
    });
  }
  ['全部'].concat(CATS).forEach(function(c,i){
    var b=el('button','v45-chip-btn'+(i===0?' on':''),c);
    b.addEventListener('click',function(){chips.querySelectorAll('button').forEach(function(x){x.classList.remove('on');});b.classList.add('on');render(c);});
    chips.append(b);
  });
  panel.append(chips,list);
  render('全部');
  var anchor=document.getElementById('v45-writing-panel')||document.getElementById('writing-body');
  var card=anchor&&anchor.closest?anchor.closest('section'):null;
  if(card&&card.parentElement)card.parentElement.insertBefore(panel,card.nextSibling);
  else host.append(panel);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
