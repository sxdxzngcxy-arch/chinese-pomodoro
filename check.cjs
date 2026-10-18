// 无依赖逻辑检查：node check.cjs。使用模拟 DOM，不替代真实 Safari 测试。
const {readFileSync} = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = readFileSync(__dirname + '/app.js','utf8');
function app(saved, start = new Date(2026, 9, 18, 12).getTime(), broken = false) {
  let now = start, interval, store = saved;
  class Element {
    constructor(){this.children=[];this.listeners={};this.style={};this.value='';this.classList={toggle(){}};}
    addEventListener(name,fn){this.listeners[name]=fn;}
    setAttribute(){} append(...items){this.children.push(...items);} replaceChildren(){this.children=[];}
    focus(){} querySelectorAll(){return this.children.map(li=>li.children[0].children[0]);}
    fire(name){this.listeners[name]?.({preventDefault(){}});}
  }
  const elements = {};
  const get = id => elements[id] ||= new Element();
  class Clock extends Date { constructor(...args){super(...(args.length?args:[now]));} static now(){return now;} }
  const document = {getElementById:get,createElement:()=>new Element(),body:new Element(),addEventListener(){}};
  vm.runInNewContext(source,{document,Date:Clock,localStorage:{getItem(){if(broken)throw Error();return store;},setItem(k,v){if(broken)throw Error();store=v;}},window:{addEventListener(){}},setInterval(fn){interval=fn;},crypto:{randomUUID:()=>String(Math.random())}});
  return {get,advance(ms){now+=ms;interval();},snapshot:()=>JSON.parse(store),raw:()=>store};
}
let a=app(); assert.equal(a.get('time').textContent,'25:00');
a.get('start').fire('click');a.advance(60000);assert.equal(a.get('time').textContent,'24:00');
a.get('start').fire('click');a.advance(60000);assert.equal(a.get('time').textContent,'24:00');
a.get('start').fire('click');a.advance(24*60000);assert.equal(a.get('count').textContent,1);assert.equal(a.get('time').textContent,'05:00');
a.advance(600000);assert.equal(a.get('count').textContent,1); // 不自动循环累计
a.get('start').fire('click');a.advance(300000);assert.equal(a.get('time').textContent,'25:00');assert.equal(a.get('count').textContent,1);
a.get('task-input').value='<img src=x onerror=alert(1)>';a.get('task-form').fire('submit');assert.equal(a.get('tasks').children[0].children[0].children[1].textContent,'<img src=x onerror=alert(1)>');
const check=a.get('tasks').children[0].children[0].children[0];check.checked=true;check.fire('change');assert.equal(a.snapshot().tasks[0].done,true);
let restored=app(a.raw());assert.equal(restored.get('tasks').children.length,1);assert.equal(restored.get('count').textContent,1);
restored.get('clear-completed').fire('click');assert.equal(restored.snapshot().tasks.length,0);
a.get('start').fire('click');a.advance(1000);let resumed=app(a.raw(),new Date(2026,9,18,16).getTime());assert.equal(resumed.get('count').textContent,2);resumed.advance(1000);assert.equal(resumed.get('count').textContent,2);
let midnight=app(null,new Date(2026,9,18,23,50).getTime());midnight.get('start').fire('click');midnight.advance(25*60000);assert.equal(midnight.get('count').textContent,1);assert.equal(midnight.snapshot().counts['2026-10-19'],1);
midnight.advance(24*3600000);assert.equal(midnight.get('count').textContent,0);
let reset=app();reset.get('start').fire('click');reset.advance(10000);reset.get('reset').fire('click');reset.advance(25*60000);assert.equal(reset.get('count').textContent,0);assert.equal(reset.get('time').textContent,'25:00');
reset.get('break-mode').fire('click');assert.equal(reset.get('time').textContent,'05:00');
assert.doesNotThrow(()=>app('{bad json'));assert.doesNotThrow(()=>app(null,Date.now(),true));
console.log('通过：开始/暂停/继续、重置、模式切换、专注/休息完成、重复计数防护、刷新恢复、跨天统计、任务添加/勾选/清除、安全文本输入和存储异常。');
