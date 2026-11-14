/* V4.5 内容包校验：仔细阅读沿用既有规范；选词填空/长篇匹配校验答案、依据原文与词库唯一性；写作题目过 PlatformCore 规范化。 */
'use strict';
const assert = require('node:assert');
const content = require('./v45-content.js');
const PlatformCore = require('./platform-core.js');

let checks = 0;
const ok = (cond, msg) => { assert(cond, msg); checks++; };

ok(content.release === '4.5', 'release 应为 4.5');
ok(content.articles.length === 2, '应有 2 篇仔细阅读');
ok(content.prompts.length === 2, '应有 2 道写作/翻译题');

const ids = new Set();
for (const a of content.articles) {
  ok(!ids.has(a.id), `文章ID重复: ${a.id}`); ids.add(a.id);
  ok(a.type === 'reading-careful', `${a.id} 类型错误`);
  ok(a.paragraphs.length >= 3, `${a.id} 段落过少`);
  ok(a.questions.length === 5, `${a.id} 应为 5 题`);
  const pmap = new Map(a.paragraphs.map(p => [p.id, p.text]));
  for (const q of a.questions) {
    const optIds = q.options.map(o => o.id);
    ok(optIds.includes(q.answer), `${a.id}/${q.id} 答案不在选项中`);
    ok(q.explanation && q.explanation.summary, `${a.id}/${q.id} 缺解析摘要`);
    for (const ev of q.explanation.evidence) {
      ok(pmap.has(ev.paragraphId), `${a.id}/${q.id} 依据段落不存在`);
      ok(pmap.get(ev.paragraphId).includes(ev.quote), `${a.id}/${q.id} 依据引文必须逐字出现在 ${ev.paragraphId}`);
    }
    for (const oid of optIds) {
      if (oid !== q.answer) ok(typeof q.explanation.distractors[oid] === 'string' && q.explanation.distractors[oid].length > 0, `${a.id}/${q.id} 缺选项 ${oid} 的干扰项解释`);
    }
  }
}

/* 选词填空 */
const cz = content.types.cloze;
ok(cz.bank.length === 15, '选词填空词库应为 15 词');
ok(cz.blanks.length === 10, '选词填空应为 10 空');
const bankIds = new Set(cz.bank.map(w => w.id));
const used = new Set();
for (const b of cz.blanks) {
  ok(bankIds.has(b.answer), `第 ${b.n} 空答案不在词库`);
  ok(!used.has(b.answer), `第 ${b.n} 空答案与他空重复（每词最多用一次）`);
  used.add(b.answer);
  ok(b.clue && b.clue.length > 0, `第 ${b.n} 空缺解析`);
  const hits = cz.passage.split(`{${b.n}}`).length - 1;
  ok(hits === 1, `第 ${b.n} 空占位符应恰好出现 1 次，实际 ${hits} 次`);
}

/* 长篇匹配 */
const mt = content.types.matching;
ok(mt.paragraphs.length >= 8, '长篇匹配段落过少');
ok(mt.statements.length === 10, '长篇匹配应为 10 题');
const mmap = new Map(mt.paragraphs.map(p => [p.id, p.text]));
for (const s of mt.statements) {
  ok(mmap.has(s.answer), `第 ${s.n} 题答案段落不存在`);
  ok(mmap.get(s.answer).includes(s.evidence), `第 ${s.n} 题依据引文必须逐字出现在段落 ${s.answer}`);
  ok(s.note && s.note.length > 0, `第 ${s.n} 题缺解析`);
}

/* 写作/翻译题目过平台规范化（字段、长度、来源校验） */
for (const p of content.prompts) {
  const v = PlatformCore.prompt(p);
  ok(v.id === p.id, `题目 ${p.id} 规范化后 ID 变化`);
  ok(!ids.has(v.id), `题目ID与文章重复: ${v.id}`); ids.add(v.id);
}

console.log(`check-v4.5: 全部 ${checks} 项校验通过（仔细阅读 ${content.articles.length} 篇/10 题，选词填空 10 空，长篇匹配 10 题，写作翻译 ${content.prompts.length} 题）`);
