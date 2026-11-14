/* 六级喵 V4.5 内容包：原创模拟材料，非官方真题。
   仔细阅读沿用 reading-careful/single-choice 格式并注入 READING_PACKS；
   选词填空与长篇匹配为新题型数据，由 v45-types.js 渲染；
   写作/翻译题目注入 TRAINING_DATA.prompts。 */
(function(root){
'use strict';
const source={kind:'original',label:'六级喵V4.5原创模拟练习',rights:'本项目原创文本与解析，允许随本项目部署、个人学习与备份。不是官方六级真题。'};
const articles=[
{
 id:'v45-reading-decisions',type:'reading-careful',title:'原创模拟 · Why good teams write down their decisions',year:null,source,audioUrl:'',
 paragraphs:[
  {id:'P1',text:"In a small software company, the same questions kept returning to the meeting table. A price had been agreed in March, yet by May nobody could remember why that figure had been chosen, and the discussion started again from the beginning. The operations manager, Lena Ortiz, did not blame anyone's memory. Meetings, she argued, were designed for talking, not for storing what a team had decided."},
  {id:'P2',text:"Ortiz introduced a simple rule: every meeting would end with a one-page summary. It would state the decision, the main reason behind it, and the questions that remained open. A rotating team member would write the summary before the end of the day and post it where everyone could find it. The rule applied to short project meetings as well as to longer planning sessions."},
  {id:'P3',text:"After two months, the clearest change was for people who had not been in the room. New staff could read the summaries and understand recent choices without asking colleagues to reconstruct them. However, the summaries were not free. Writing one took about twenty minutes, and in trying to keep the page short, writers sometimes removed the disagreement that explained why a compromise had been reached."},
  {id:'P4',text:"The company also counted fewer repeated discussions in its meeting records, although Ortiz is careful about this figure. The teams using summaries had also changed their meeting schedule during the same period, so the summaries cannot take all the credit. Her response is practical rather than defensive: keep the summaries, shorten them, and review the practice after three more months to see whether the benefits still justify the time."}
 ],
 questions:[
  {id:'Q1',type:'single-choice',stem:'What problem led Ortiz to introduce the summaries?',options:[
   {id:'A',text:'Decisions were repeatedly discussed because the reasons behind them were forgotten.'},
   {id:'B',text:'Staff refused to attend meetings that lasted too long.'},
   {id:'C',text:'New employees were not allowed to read company records.'},
   {id:'D',text:'The company had lost its written price lists.'}],answer:'A',
   explanation:{summary:'已决定的事被反复讨论，因为当初的理由被遗忘了。',evidence:[{paragraphId:'P1',quote:'by May nobody could remember why that figure had been chosen, and the discussion started again from the beginning'}],paraphrase:'repeatedly discussed = started again from the beginning；reasons forgotten = nobody could remember why that figure had been chosen。',distractors:{B:'原文没有说员工拒绝开会或会议过长。',C:'与后文相反：总结正是让不在场的人能读懂决定。',D:'被忘掉的是某个价格为何这样定，不是价格清单丢失。'}}},
  {id:'Q2',type:'single-choice',stem:'According to the second paragraph, what must each summary include?',options:[
   {id:'A',text:'The names of everyone who disagreed.'},
   {id:'B',text:'The decision, its main reason, and unanswered questions.'},
   {id:'C',text:'A full record of everything said in the meeting.'},
   {id:'D',text:'A plan for the next three months of meetings.'}],answer:'B',
   explanation:{summary:'总结内容三件套：决定本身、主要理由、尚未解决的问题。',evidence:[{paragraphId:'P2',quote:'It would state the decision, the main reason behind it, and the questions that remained open.'}],paraphrase:'unanswered questions = the questions that remained open。',distractors:{A:'第三段提到分歧有时被删减，但第二段的要求里没有记录异议者姓名。',C:'一页总结不是会议全记录。',D:'三个月后复查在第四段，是复查安排，不是每份总结的内容。'}}},
  {id:'Q3',type:'single-choice',stem:'What benefit was clearest after two months?',options:[
   {id:'A',text:'Summaries took less time to write than expected.'},
   {id:'B',text:'Meetings became shorter for everyone.'},
   {id:'C',text:'People absent from a meeting could follow its decisions afterwards.'},
   {id:'D',text:'Disagreements inside teams disappeared.'}],answer:'C',
   explanation:{summary:'最明确的收益落在不在场的人身上：以新员工为例，能事后读懂近期决定。',evidence:[{paragraphId:'P3',quote:'New staff could read the summaries and understand recent choices without asking colleagues to reconstruct them.'}],paraphrase:'people who had not been in the room = people absent from a meeting。',distractors:{A:'每份约二十分钟在原文里是成本，不是收益。',B:'原文没有提会议变短。',D:'分歧并没有消失，只是总结里有时被删减。'}}},
  {id:'Q4',type:'single-choice',stem:'What is a cost of the summaries mentioned in the passage?',options:[
   {id:'A',text:'They require a paid external writer.'},
   {id:'B',text:'They take time, and shortening them can hide useful disagreement.'},
   {id:'C',text:'They must be approved by every department.'},
   {id:'D',text:'They are stored where new staff cannot find them.'}],answer:'B',
   explanation:{summary:'成本有二：耗时；压缩篇幅时可能删掉解释妥协来由的分歧。',evidence:[{paragraphId:'P3',quote:'Writing one took about twenty minutes, and in trying to keep the page short, writers sometimes removed the disagreement that explained why a compromise had been reached.'}],paraphrase:'hide useful disagreement = removed the disagreement that explained why a compromise had been reached。',distractors:{A:'总结由轮值的团队成员写，不是外聘。',C:'没有部门审批的要求。',D:'第二段明确说贴在大家都能找到的地方。'}}},
  {id:'Q5',type:'single-choice',stem:'Why does Ortiz refuse to credit the summaries for all of the improvement?',options:[
   {id:'A',text:'The meeting records were incomplete.'},
   {id:'B',text:'Another change happened during the same period.'},
   {id:'C',text:'The summaries had only been used for two weeks.'},
   {id:'D',text:'Staff had stopped writing summaries by then.'}],answer:'B',
   explanation:{summary:'同期还改了会议安排，重复讨论减少不能全部归功于总结。',evidence:[{paragraphId:'P4',quote:'The teams using summaries had also changed their meeting schedule during the same period, so the summaries cannot take all the credit.'}],paraphrase:'another change = changed their meeting schedule。',distractors:{A:'记录不完整未被提及。',C:'试行是两个月，不是两周。',D:'总结仍在继续，还计划再观察三个月。'}}}
 ]
},
{
 id:'v45-reading-repair',type:'reading-careful',title:'原创模拟 · The workshop where broken things get a second chance',year:null,source,audioUrl:'',
 paragraphs:[
  {id:'P1',text:"On the last Saturday of each month, a classroom at Westfield Community College becomes a repair workshop. Students and local residents bring lamps that no longer light, chairs with loose legs, and bicycles with tired brakes. Volunteer fixers work beside the owners rather than taking the items away, so the owners see each step and, the organisers hope, feel able to try a similar repair themselves one day."},
  {id:'P2',text:"At a recent session, 64 items were brought in and 41 were working again by the end of the afternoon. The organisers present this figure carefully. People tend to bring problems they judge to be fixable, so the success rate says little about all the broken objects sitting in people's homes. Satisfaction, too, is reported by the visitors themselves, and those who left disappointed may simply not have filled in a form."},
  {id:'P3',text:"Some items are beyond a Saturday afternoon. A heater with damaged wiring, for example, is not repaired at the workshop at all: anything involving mains electricity is checked by a qualified electrician, and if it cannot be made safe, the owner is shown how to recycle it responsibly. The workshop keeps a short list of such limits, and the volunteers say the list protects visitors as much as it disappoints them."},
  {id:'P4',text:"What the organisers value most is slower to count. Several regular visitors now describe attempting small repairs at home before throwing an object away, and two former visitors have trained as volunteer fixers. Next year the workshop plans a shelf of shared spare parts and short training sessions for new volunteers. The aim, as one organiser puts it, is not only to fix objects but to change what people do the next time something breaks."}
 ],
 questions:[
  {id:'Q1',type:'single-choice',stem:'Why do the fixers work beside the owners instead of taking items away?',options:[
   {id:'A',text:'So that owners can check the volunteers are honest.'},
   {id:'B',text:'So that owners learn by watching and may attempt repairs themselves later.'},
   {id:'C',text:'Because two people can repair an item faster than one.'},
   {id:'D',text:'Because owners must help if they want to pay less.'}],answer:'B',
   explanation:{summary:'并排修理是为了让物品主人看清步骤、以后敢自己动手。',evidence:[{paragraphId:'P1',quote:'Volunteer fixers work beside the owners rather than taking the items away, so the owners see each step'}],paraphrase:'learn by watching = see each step；attempt repairs themselves = feel able to try a similar repair themselves。',distractors:{A:'原文没有谈监督诚信。',C:'没有说两人修得更快。',D:'活动没有收费与折扣的说法。'}}},
  {id:'Q2',type:'single-choice',stem:'Why do the organisers present the repair figure carefully?',options:[
   {id:'A',text:'Visitors mainly bring items they already believe can be fixed.'},
   {id:'B',text:'Some repaired items were counted twice.'},
   {id:'C',text:'The volunteers admitted exaggerating the number.'},
   {id:'D',text:'Most satisfaction forms were lost.'}],answer:'A',
   explanation:{summary:'样本是自选的：人们倾向于带来自认为能修好的东西，成功率不能代表所有坏掉的物品。',evidence:[{paragraphId:'P2',quote:'People tend to bring problems they judge to be fixable, so the success rate says little about all the broken objects sitting in people\'s homes.'}],paraphrase:'mainly bring items they believe can be fixed = bring problems they judge to be fixable。',distractors:{B:'没有重复计数的问题。',C:'没有志愿者承认夸大。',D:'原文说的是失望的人可能没填表，不是表格丢失。'}}},
  {id:'Q3',type:'single-choice',stem:'What happens to a heater with damaged wiring?',options:[
   {id:'A',text:'It is repaired by the most experienced volunteer.'},
   {id:'B',text:'It is sold to a shop for spare parts.'},
   {id:'C',text:'It is checked by a qualified electrician, and recycled if it cannot be made safe.'},
   {id:'D',text:'It is stored until the next monthly session.'}],answer:'C',
   explanation:{summary:'涉及市电的物品不由志愿者修，先由有资质的电工检查，不能确保安全就指导回收。',evidence:[{paragraphId:'P3',quote:'anything involving mains electricity is checked by a qualified electrician, and if it cannot be made safe, the owner is shown how to recycle it responsibly'}],paraphrase:'recycled if it cannot be made safe = if it cannot be made safe, the owner is shown how to recycle it。',distractors:{A:'原文明确说这类取暖器根本不在工坊修。',B:'没有出售零件的安排。',D:'没有留到下月的说法。'}}},
  {id:'Q4',type:'single-choice',stem:'What does the passage suggest the organisers value most?',options:[
   {id:'A',text:'Raising the monthly repair rate above 41 out of 64.'},
   {id:'B',text:'Changing what people do when something breaks at home.'},
   {id:'C',text:'Collecting more satisfaction forms from visitors.'},
   {id:'D',text:'Training every visitor to become a volunteer.'}],answer:'B',
   explanation:{summary:'组织者最看重的是习惯的改变：下次东西坏时先试着修，而不是直接扔掉，这比计数慢得多。',evidence:[{paragraphId:'P4',quote:'Several regular visitors now describe attempting small repairs at home before throwing an object away'}],paraphrase:'changing what people do = attempting small repairs at home before throwing an object away。',distractors:{A:'数字恰恰是组织者谨慎对待的东西，不是首要目标。',C:'表格只是满意度来源，不是目标。',D:'只有两位访客成了志愿者，不是人人都要培训。'}}},
  {id:'Q5',type:'single-choice',stem:'What is planned for next year?',options:[
   {id:'A',text:'Charging visitors a small entry fee.'},
   {id:'B',text:'Opening the workshop every day.'},
   {id:'C',text:'Removing the list of repair limits.'},
   {id:'D',text:'A shared spare-parts shelf and training for new volunteers.'}],answer:'D',
   explanation:{summary:'明年计划两件事：共享备件架和新志愿者短培训。',evidence:[{paragraphId:'P4',quote:'the workshop plans a shelf of shared spare parts and short training sessions for new volunteers'}],paraphrase:'training for new volunteers = short training sessions for new volunteers。',distractors:{A:'没有收费计划。',B:'仍是每月一次，没有改成每天。',C:'限制清单被认为能保护访客，不会取消。'}}}
 ]
}
];
const types={
 cloze:{
  id:'v45-cloze-time',kind:'cloze',title:'原创模拟 · 选词填空：Why time seems to move faster',source,
  instructions:'阅读短文，从 15 个词中为每个空选 1 个最合适的词，每词最多用一次。六级真题中本题型 10 空、占 5%，建议 7 分钟内完成。本练习为原创模拟。',
  passage:"Almost everyone has heard an older relative say that the years pass more quickly than they used to. Psychologists who study time perception describe this as a familiar {1}: the older we become, the faster time seems to move. One explanation begins with {2}. When our days follow a fixed {3} — the same route to work, the same meetings, the same meals — the brain records fewer separate memories. Looking back, a week with few new memories feels short, as if it had been {4} into a single day. By contrast, {5} experiences leave detailed memories behind. A first trip to a new city, for example, is full of moments that stand out, so the trip seems long when we {6} on it later. This contrast has led to a second explanation, based on {7}. For a ten-year-old, one year is a tenth of a lifetime, a large share of everything experienced so far. For a fifty-year-old, the same year is a much smaller fraction, and so it seems to pass more quickly. Neither explanation suggests that time itself changes. What changes is how we {8} it: how many memories we store, and how large each period appears beside the whole of our lives. The process is {9}, which is why the effect is rarely noticed from one birthday to the next. It becomes clear only across a {10}, when we compare the endless summers of childhood with the swift years of adult life.",
  bank:[
   {id:'A',word:'expand',pos:'v.'},{id:'B',word:'phenomenon',pos:'n.'},{id:'C',word:'budget',pos:'n./v.'},
   {id:'D',word:'routine',pos:'n.'},{id:'E',word:'compressed',pos:'v.（过去分词）'},{id:'F',word:'fragile',pos:'adj.'},
   {id:'G',word:'novel',pos:'adj.'},{id:'H',word:'reflect',pos:'v.'},{id:'I',word:'proportion',pos:'n.'},
   {id:'J',word:'orbit',pos:'n./v.'},{id:'K',word:'perceive',pos:'v.'},{id:'L',word:'gradual',pos:'adj.'},
   {id:'M',word:'translate',pos:'v.'},{id:'N',word:'decade',pos:'n.'},{id:'O',word:'memory',pos:'n.'}
  ],
  blanks:[
   {n:1,answer:'B',clue:'a familiar ___ 需要名词；phenomenon（现象）与冒号后对这一现象的描述呼应。'},
   {n:2,answer:'O',clue:'第一个解释从 memory（记忆）讲起，下文紧接着说大脑记录的记忆变少，前后指同一对象。'},
   {n:3,answer:'D',clue:'a fixed ___ 需要名词；routine（日常惯例）与后面列举的同一路线、同一会议、同一餐食对应。'},
   {n:4,answer:'E',clue:'had been ___ into 需要过去分词构成被动；compressed into a single day 表示一周被“压缩”成一天的感觉。'},
   {n:5,answer:'G',clue:'___ experiences 需要形容词修饰 experiences；novel（新奇的）与前文的固定日常形成对照，后文举例正是第一次去新城市。'},
   {n:6,answer:'H',clue:'___ on it 是固定搭配 reflect on（回想、反思），指后来回想这趟旅行。'},
   {n:7,answer:'I',clue:'based on ___ 需要名词；proportion（比例）引出下文“一年占一生的十分之一”这一比例解释。'},
   {n:8,answer:'K',clue:'how we ___ it 需要动词；perceive（感知）与首段 time perception 同根，指我们感知时间的方式在变。'},
   {n:9,answer:'L',clue:'The process is ___ 需要形容词作表语；gradual（渐进的）解释了为何生日与生日之间察觉不到。'},
   {n:10,answer:'N',clue:'across a ___ 需要时间名词；decade（十年）与下文“从童年到成年”的长时间跨度对应。'}
  ]
 },
 matching:{
  id:'v45-matching-streets',kind:'matching',title:'原创模拟 · 长篇匹配：How cities are learning to share the street',source,
  instructions:'读长文，为每条陈述找到信息所在的段落（字母 A–I），段落可重复选择。六级真题中本题型 10 题、占 10%，文章约 1200 词；本练习为原创模拟，篇幅略短，建议 12 分钟内完成。',
  paragraphs:[
   {id:'A',text:"For most of the twentieth century, city streets were planned around one question: how quickly can cars move through? Roads widened, pavements narrowed, and other users of the street — people walking, cycling, waiting for a bus, or simply sitting — were treated as leftovers. Many cities are now asking a different question: who else is the street for? The change sounds simple, but it forces planners to measure things they once ignored."},
   {id:'B',text:"The first difficulty is information. Traffic departments have counted cars for decades, so they can say how many vehicles pass a junction in an hour. Far fewer can say how many people walk to school on the same street, or how long bus passengers wait at an unsheltered stop. Without such numbers, the needs of people outside cars are easy to overlook when budgets are divided."},
   {id:'C',text:"Some cities start near schools. In one district, pavements outside three primary schools were widened and a short section of road was closed to through traffic at drop-off and pick-up times. Parents reported calmer mornings, and teachers said children arrived less rushed. The scheme cost little, the district notes, because it changed the rules of the street more than its physical shape."},
   {id:'D',text:"Safety remains the strongest argument for separating different kinds of traffic. Where cycle lanes are protected by a kerb rather than painted lines alone, riders say they feel safer, and parents are more willing to let older children ride alone. Yet the most dangerous points are often where lanes end at junctions, and a line on a map can hide how complicated those crossings remain."},
   {id:'E',text:"Shopkeepers are frequently the most anxious group when parking spaces are removed. Their fear is understandable: many assume that most customers arrive by car. Surveys carried out for several high streets, however, have repeatedly found that shopkeepers overestimate the share of customers who drive, and underestimate how many arrive on foot or by bus and return more often."},
   {id:'F',text:"Buses show what sharing can gain. When a city gives buses their own lane and priority at traffic lights, journeys become faster and, just as importantly, more predictable. Transport officials argue that reliability matters more than top speed: passengers plan their lives around the worst journey of the week, not the best one."},
   {id:'G',text:"Older residents judge a street by different details. A bench in the shade, a public toilet that is actually open, a crossing that allows enough time — these decide whether a trip to the shops feels possible or exhausting. 'A fast street is no use to me if there is nowhere to rest,' one resident told a consultation meeting, and planners say such comments have changed their checklists."},
   {id:'H',text:"Because permanent rebuilding is expensive, many changes are tested first with paint, planters and temporary barriers. A junction can be rearranged for a summer at a fraction of the cost of rebuilding it, and if the trial fails, the street can be put back. Trials also produce something reports cannot: residents experience the change before they are asked to judge it."},
   {id:'I',text:"None of this settles who the street belongs to. Every design gives space to one group by taking it from another, and the arguments continue long after the paint has dried. What has changed is the starting point. Instead of asking how a street can move the most cars, more cities now begin by asking whose journeys the street makes easy, and whose it makes hard."}
  ],
  statements:[
   {n:1,text:'Planners often lack basic information about people who travel without a car.',answer:'B',evidence:'Far fewer can say how many people walk to school on the same street',note:'B 段主题就是信息缺口：会数汽车，不会数行人和候车时间。'},
   {n:2,text:'Near some schools, the street was changed mainly by rules rather than by construction.',answer:'C',evidence:'it changed the rules of the street more than its physical shape',note:'C 段明确比较：改规则多于改物理形态，成本因此很低。'},
   {n:3,text:'Protected cycle lanes can make parents more comfortable about children riding on their own.',answer:'D',evidence:'parents are more willing to let older children ride alone',note:'注意陈述里的 comfortable 与原文 more willing 是同义改写。'},
   {n:4,text:'Traders often believe a larger share of their customers drive than is actually the case.',answer:'E',evidence:'shopkeepers overestimate the share of customers who drive',note:'overestimate（高估）正是陈述 believe a larger share ... than is actually the case 的来源。'},
   {n:5,text:'For bus passengers, a dependable journey time matters more than a fast one.',answer:'F',evidence:'reliability matters more than top speed',note:'dependable = reliability；fast = top speed，两组同义替换同时出现时基本可锁定。'},
   {n:6,text:'Small facilities such as somewhere to sit can decide whether older people use a street at all.',answer:'G',evidence:'these decide whether a trip to the shops feels possible or exhausting',note:'G 段列举长椅、公厕、过街时间，都是“小设施决定出行是否可能”。'},
   {n:7,text:'Temporary materials allow a city to try a new street layout before paying for permanent work.',answer:'H',evidence:'many changes are tested first with paint, planters and temporary barriers',note:'paint、planters、temporary barriers 就是陈述里的 temporary materials。'},
   {n:8,text:'Streets used to be designed mainly around the movement of cars.',answer:'A',evidence:'city streets were planned around one question: how quickly can cars move through?',note:'used to 对应 For most of the twentieth century，是全文的历史背景段。'},
   {n:9,text:'Giving space to one group of street users means another group gets less.',answer:'I',evidence:'Every design gives space to one group by taking it from another',note:'结论段的零和表述，与陈述几乎逐词对应。'},
   {n:10,text:'Junctions are where separated lanes may still leave riders in danger.',answer:'D',evidence:'the most dangerous points are often where lanes end at junctions',note:'D 段可重复选：前半讲隔离车道的好处，后半 Yet 转折讲路口仍危险，别被前半误导。'}
  ]
 }
};
const prompts=[
{
id:'v45-writing-skill',type:'writing',title:'原创模拟 · A practical skill beyond the classroom',minutes:30,source,year:null,
prompt:'Write an essay about the value of learning a practical skill, such as cooking, first aid, or basic computer programming, while at university. Discuss why such a skill matters and how students can learn it without neglecting their main studies. Suggested length: 150–200 words. This is an original practice prompt, not an official exam question.',
template:'第一段：表明立场——实用技能不是“不务正业”，而是对课堂学习的补充。\n第二段：给出两点理由（能应对真实生活问题；练习的反馈直接、可见，能带来信心），每点配一个具体例子。\n第三段：回应顾虑——时间有限怎么办（固定小段时间、与日常结合），最后收束观点。',
reference:'University education is usually judged by examinations, yet some of the most useful lessons take place far from the classroom. Learning a practical skill, such as cooking or first aid, deserves a place in student life.\n\nFirst, practical skills answer real problems immediately. A student who can cook a simple, healthy meal depends less on expensive takeaway food, and one trained in first aid can respond calmly in an emergency. Unlike abstract knowledge, these skills give direct feedback: the dish tastes better, the bandage stays in place. Such visible progress also builds confidence that carries back into academic work.\n\nAdmittedly, time is limited. The answer is not to add another heavy course, but to practise in small, regular amounts — cooking twice a week, or joining a two-hour workshop each month. Treated this way, a practical skill supports study rather than competing with it.\n\n①立场在第一段就明确出现，不绕弯子；②每段只有一个中心，理由之后立刻给例子；③结尾回应了“没有时间”这一反方顾虑，而不是简单重复开头。对照自己的作文时重点看：例子是否具体到“谁、做了什么、结果怎样”。'
},
{
id:'v45-translation-payment',type:'translation',title:'原创模拟 · 移动支付在中国',minutes:30,source,year:null,
prompt:'把下面段落翻译成英语：\n\n在中国，移动支付已经深入日常生活的方方面面。从城市的大型商场到乡村的小摊贩，扫码付款随处可见。消费者不再需要携带大量现金，商家也省去了找零的麻烦。与此同时，越来越多的老年人开始学习使用智能手机支付，社区志愿者会耐心地教他们操作。不过，移动支付在带来便利的同时也提醒人们注意保护个人信息，防范网络诈骗。',
template:'先通读全段，标出转折与并列（与此同时、不过）。长句按意群拆分：“从……到……”用 from... to...；“省去了……的麻烦”可用 save sb. the trouble of doing；最后一句的“提醒人们注意”可处理为 remind people to...，避免逐字硬译。',
reference:'参考译文：\nIn China, mobile payment has become part of almost every aspect of daily life. From large shopping malls in cities to small stalls in the countryside, paying by scanning a code can be seen everywhere. Consumers no longer need to carry large amounts of cash, and shopkeepers are saved the trouble of giving change. Meanwhile, a growing number of elderly people are learning to pay with their smartphones, with community volunteers patiently teaching them how to do it. However, while bringing convenience, mobile payment also reminds people to protect their personal information and guard against online fraud.\n\n方方面面：almost every aspect of daily life；随处可见：can be seen everywhere；找零：giving change；防范：guard against。注意 are saved the trouble of giving change 的被动用法，以及 while bringing convenience 的省略结构。'
}
];
const content={release:'4.5',source,articles,prompts,types};
if(typeof module!=='undefined'&&module.exports)module.exports=content;
else{root.V45_CONTENT=content;root.READING_PACKS.push(...content.articles);root.TRAINING_DATA.prompts.push(...content.prompts);}
})(globalThis);
