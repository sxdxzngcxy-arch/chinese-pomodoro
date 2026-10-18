(() => {
  'use strict';
  const KEY = 'yike-pomodoro-v1';
  const durations = { focus: 25 * 60, break: 5 * 60 };
  const $ = id => document.getElementById(id);
  const dayKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  let tasks = [], counts = {}, mode = 'focus', remaining = durations.focus, endAt = null;
  let storageWarning = false;
  function notify(message) { $('notice').textContent = message; }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ tasks, counts, timer: { mode, remaining, endAt } })); }
    catch { storageWarning = true; notify('浏览器无法保存数据，本次仍可使用；请检查存储空间或浏览器设置。'); }
  }
  function load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY) || '{}');
      if (Array.isArray(data.tasks)) tasks = data.tasks.filter(t => t && typeof t.id === 'string' && typeof t.text === 'string' && t.text.trim()).map(t => ({id:t.id,text:t.text.slice(0,120),done:!!t.done}));
      if (data.counts && typeof data.counts === 'object') for (const [day, count] of Object.entries(data.counts)) if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isSafeInteger(count) && count >= 0) counts[day] = count;
      const t = data.timer;
      if (t && Object.hasOwn(durations, t.mode) && Number.isFinite(t.remaining) && t.remaining > 0 && t.remaining <= durations[t.mode] && (t.endAt === null || (Number.isFinite(t.endAt) && t.endAt > 0))) {
        mode = t.mode; remaining = t.remaining; endAt = t.endAt;
      }
    } catch { notify('未能读取已保存的数据，已使用默认设置。'); }
  }
  function renderStats() {
    const today = counts[dayKey()] || 0;
    $('count').textContent = today;
    $('minutes').textContent = today * 25;
    $('encouragement').textContent = today ? '每一份专注，都让你离目标更近一点' : '今天的第一份专注，从现在开始';
    $('date').textContent = new Date().toLocaleDateString('zh-CN', { month:'long',day:'numeric',weekday:'long' });
  }
  function renderTimer() {
    const seconds = Math.max(0, Math.ceil(remaining));
    const formatted = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
    $('time').textContent = formatted;
    $('time').setAttribute('aria-label', `剩余${Math.floor(seconds / 60)}分${seconds % 60}秒`);
    document.title = `${endAt !== null ? formatted + ' · ' : ''}一刻专注 · ${mode === 'focus' ? '学习番茄钟' : '休息一下'}`;
    $('progress').style.strokeDashoffset = 854.513 * (1 - remaining / durations[mode]);
    $('focus-mode').classList.toggle('selected', mode === 'focus');
    $('break-mode').classList.toggle('selected', mode === 'break');
    $('focus-mode').setAttribute('aria-pressed', String(mode === 'focus'));
    $('break-mode').setAttribute('aria-pressed', String(mode === 'break'));
    document.body.classList.toggle('break', mode === 'break');
    $('clock-label').textContent = mode === 'focus' ? '保持专注' : '放松一下';
    $('clock-caption').textContent = mode === 'focus' ? '给自己一段不被打扰的时间' : '伸个懒腰，让思绪透透气';
    $('start').textContent = endAt !== null ? '暂停计时  Ⅱ' : remaining < durations[mode] ? '继续计时  ▶' : mode === 'focus' ? '开始专注  ▶' : '开始休息  ▶';
  }
  function tick() {
    if (endAt !== null) {
      remaining = Math.max(0, (endAt - Date.now()) / 1000);
      if (remaining <= 0) {
        const completedMode = mode;
        if (mode === 'focus') {
          const completedDay = dayKey(new Date(endAt));
          counts[completedDay] = (counts[completedDay] || 0) + 1;
        }
        mode = mode === 'focus' ? 'break' : 'focus';
        remaining = durations[mode]; endAt = null;
        save();
        if (!storageWarning) notify(completedMode === 'focus' ? '完成了一次专注！现在可以开始 5 分钟休息。' : '休息结束，准备好开始下一次专注了吗？');
      }
    }
    renderTimer(); renderStats();
  }
  function renderTasks() {
    const list = $('tasks'); list.replaceChildren();
    for (const task of tasks) {
      const li = document.createElement('li'); li.classList.toggle('done',task.done);
      const label = document.createElement('label');
      const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = task.done;
      checkbox.addEventListener('change', () => { task.done = checkbox.checked; save(); renderTasks(); const next = [...$('tasks').querySelectorAll('input')][tasks.indexOf(task)]; if(next) next.focus(); });
      const text = document.createElement('span'); text.textContent = task.text;
      label.append(checkbox,text);
      const remove = document.createElement('button'); remove.className = 'delete'; remove.textContent = '×'; remove.setAttribute('aria-label',`删除任务：${task.text}`);
      remove.addEventListener('click', () => { tasks = tasks.filter(t => t.id !== task.id); save(); renderTasks(); $('task-input').focus(); });
      li.append(label,remove); list.append(li);
    }
    const completed = tasks.filter(t => t.done).length;
    $('empty').hidden = tasks.length > 0;
    $('task-count').textContent = `${completed} / ${tasks.length}`;
    $('clear-completed').disabled = completed === 0;
  }
  $('start').addEventListener('click', () => {
    const wasRunning = endAt !== null;
    tick();
    if (wasRunning && endAt === null) return;
    if (endAt !== null) endAt = null;
    else endAt = Date.now() + remaining * 1000;
    save(); renderTimer();
  });
  $('reset').addEventListener('click', () => { tick(); endAt = null; remaining = durations[mode]; save(); renderTimer(); });
  function switchMode(next) {
    tick();
    if (mode === next) return;
    mode = next; endAt = null; remaining = durations[mode]; save(); renderTimer();
    if (!storageWarning) notify('已切换模式，未完成的计时不会计入专注次数。');
  }
  $('focus-mode').addEventListener('click', () => switchMode('focus'));
  $('break-mode').addEventListener('click', () => switchMode('break'));
  $('task-form').addEventListener('submit', event => {
    event.preventDefault(); const text = $('task-input').value.trim();
    if (!text) { $('task-input').value = ''; $('task-input').focus(); return; }
    tasks.push({ id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`, text: text.slice(0,120), done:false });
    save(); renderTasks(); $('task-input').value = ''; $('task-input').focus();
  });
  $('clear-completed').addEventListener('click', () => { tasks = tasks.filter(t => !t.done); save(); renderTasks(); });
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('pageshow', tick);
  load(); renderTasks(); tick(); setInterval(tick, 250);
})();
