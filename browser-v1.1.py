"""V1.1 浏览器回归；运行前在 8081 端口提供本目录。"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright, expect
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2,accept_downloads=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8081');page.wait_for_selector('#start')
 assert page.locator('.bottom-nav button').count()==5
 # 原版 v2 数据自动扩展，宠物/任务/计时不丢失；升级前快照存在。
 page.evaluate("""() => {let s=StudyCore.fresh();delete s.study;s.pet.xp=177;s.pet.coins=42;s.tasks=[{id:'keep',text:'保留科研任务',done:false}];s.timer.remaining=1234;localStorage.setItem(StudyCore.KEY,JSON.stringify(s));} """)
 page.reload();assert page.locator('#time').inner_text()=='20:34';assert '保留科研任务' in page.locator('#tasks').inner_text()
 assert page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).pet.coins")==42
 assert page.evaluate("localStorage.getItem(StudyCore.KEY+'-before-v1.1')!==null")
 page.locator('.bottom-nav [data-go="words"]').click();first=page.locator('#word-en').inner_text();page.reload();assert page.locator('#word-en').inner_text()==first
 page.locator('#flashcard').click();page.locator('[data-grade="known"]').click();page.wait_for_timeout(100);assert page.locator('#word-en').inner_text()!=first
 page.locator('#word-order').select_option('sequence');page.wait_for_timeout(100)
 page.locator('#favorite-word').click();page.wait_for_timeout(100);assert '已收藏' in page.locator('#favorite-word').inner_text()
 # 添加、重复检测、编辑、CSV导入预览及去重
 page.locator('#add-custom-word').click();page.locator('#custom-word').fill('resilient');page.locator('#custom-meaning').fill('有韧性的');page.locator('#custom-example').fill('A resilient learner adapts.');page.locator('#custom-association').fill('辅助联想，非词源。');page.locator('#custom-word-form button[type="submit"]').click();page.wait_for_timeout(100);assert not page.locator('#word-editor').is_visible()
 page.locator('#show-library').click();page.locator('#library-search').fill('resilient');page.locator('.library-row button').filter(has_text='编辑').click();assert page.locator('#custom-word').get_attribute('readonly') is not None
 page.locator('#custom-meaning').fill('有韧性的；能恢复的');page.locator('#custom-word-form button[type="submit"]').click();page.wait_for_timeout(100)
 assert page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.customWords[0].meaning")=='有韧性的；能恢复的'
 page.locator('#add-custom-word').click();page.locator('#custom-word').fill('ABANDON');page.locator('#custom-meaning').fill('不应覆盖');page.locator('#custom-word-form button[type="submit"]').click();page.wait_for_timeout(100);assert page.locator('#word-editor').is_visible();page.locator('#close-word-editor').click()
 csv='word,meaning,example\nrobust,稳健的,"A robust result, after checks."\nresilient,重复,Duplicate.\n'
 page.locator('#word-file').set_input_files({'name':'words.csv','mimeType':'text/csv','buffer':csv.encode()});page.wait_for_timeout(100)
 assert '可新增 1 词' in page.locator('#word-import-summary').inner_text();assert page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.customWords.length")==1
 page.locator('#confirm-word-import').click();page.wait_for_timeout(100);assert page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.customWords.length")==2
 page.locator('#word-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{oops'});page.wait_for_timeout(100);assert not page.locator('#word-import-preview').is_visible()
 # 删除需要第二次确认，再导入同词不会产生重复。
 page.locator('#library-search').fill('robust');page.locator('#library-list').get_by_role('button',name='删除',exact=True).click();assert page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.customWords.length")==2
 page.locator('#library-list').get_by_role('button',name='确认删除',exact=True).click();page.wait_for_timeout(100);assert page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.customWords.length")==1
 page.locator('#word-file').set_input_files({'name':'words.csv','mimeType':'text/csv','buffer':csv.encode()});page.wait_for_timeout(80);page.locator('#confirm-word-import').click();page.wait_for_timeout(100)
 # 可靠词源和辅助联想分栏
 page.evaluate("""() => {let s=JSON.parse(localStorage.getItem(StudyCore.KEY));s.settings.goal=200;for(const w of WORDS)if(w.id!=='derive')s.progress[w.id]={stage:3,due:Date.now()+86400000,firstDay:StudyCore.day(),attempts:3,correct:3,wrong:false,lastGrade:'known'};delete s.progress.derive;localStorage.setItem(StudyCore.KEY,JSON.stringify(s));} """)
 page.reload();page.locator('.bottom-nav [data-go="words"]').click();assert page.locator('#word-en').inner_text()=='derive';page.locator('#flashcard').click();page.locator('#memory-panel summary').first.click()
 assert '词源知识' in page.locator('#memory-content').inner_text();assert '不是词源' in page.locator('#memory-content').inner_text();assert page.locator('#memory-content a').get_attribute('href').startswith('https://www.etymonline.com/')
 # 阅读：隐藏答案、暂停/刷新、自动保存选项、完整交卷及错因
 page.locator('.bottom-nav [data-go="reading"]').click();assert page.locator('#reading-empty').is_visible();page.locator('#start-reading').click();page.wait_for_timeout(100)
 assert page.locator('.reading-question').count()==5;assert page.locator('.reading-analysis').count()==0
 page.locator('#pause-reading').click();page.wait_for_timeout(100);clock=page.locator('#reading-timer').inner_text();page.wait_for_timeout(1100);assert page.locator('#reading-timer').inner_text()==clock
 page.locator('input[name="reading-Q1"][value="A"]').check();page.wait_for_timeout(100);page.reload();page.locator('.bottom-nav [data-go="reading"]').click();assert page.locator('input[name="reading-Q1"][value="A"]').is_checked()
 page.locator('#submit-reading').click();page.wait_for_timeout(100);assert page.locator('#submit-reading').is_visible();assert '请先完成' in page.locator('#notice').inner_text()
 for qid,answer in [('Q2','C'),('Q3','A'),('Q4','D'),('Q5','B')]:page.locator(f'input[name="reading-{qid}"][value="{answer}"]').check();page.wait_for_timeout(80)
 page.locator('#submit-reading').click();page.wait_for_timeout(100);assert '4 / 5' in page.locator('#reading-result').inner_text();assert page.locator('.reading-analysis').count()==5;assert page.locator('.reading-passage mark').count()>0
 page.locator('[aria-label="Q1 错因"]').select_option('定位');page.wait_for_timeout(100);assert '待复练 1 题' in page.locator('#reading-reasons').inner_text()
 # 阅读生词点击入库：未填释义不混入学习队列，随后可编辑。
 page.locator('.read-token').filter(has_text='demanding').click();page.locator('#add-reading-word').click();page.wait_for_timeout(100)
 custom=page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.customWords");assert next(w for w in custom if w['word']=='demanding')['pending']
 page.locator('#edit-reading-word').click();page.locator('#custom-meaning').fill('要求高的；费力的');page.locator('#custom-word-form button[type="submit"]').click();page.wait_for_timeout(100)
 assert not next(w for w in page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.customWords") if w['word']=='demanding')['pending']
 page.locator('#retry-reading').click();page.wait_for_timeout(100);assert page.locator('.reading-question').count()==1;page.locator('input[name="reading-Q1"][value="B"]').check();page.wait_for_timeout(100);page.locator('#submit-reading').click();page.wait_for_timeout(100);assert '待复练 0 题' in page.locator('#reading-reasons').inner_text()
 # 自备文章题库导入，重复id不覆盖；不合法依据拒绝
 template=json.loads(Path('reading-template.json').read_text());template['articles'][0]['id']='my-authorized-reading';template['articles'][0]['source']={'kind':'user-provided','label':'用户导入测试','rights':'测试材料，项目原创授权。'}
 page.locator('#reading-file').set_input_files({'name':'reading.json','mimeType':'application/json','buffer':json.dumps(template).encode()});page.wait_for_timeout(100);assert '可添加 1 篇' in page.locator('#reading-import-summary').inner_text();page.locator('#confirm-reading-import').click();page.wait_for_timeout(100);assert page.locator('#reading-select').input_value()=='my-authorized-reading'
 page.locator('#reading-file').set_input_files({'name':'reading.json','mimeType':'application/json','buffer':json.dumps(template).encode()});page.wait_for_timeout(100);assert '跳过重复 id 1 篇' in page.locator('#reading-import-summary').inner_text();assert page.locator('#confirm-reading-import').is_disabled();page.locator('#cancel-reading-import').click()
 template['articles'][0]['id']='invalid';template['articles'][0]['questions'][0]['explanation']['evidence'][0]['quote']='a quote that does not exist'
 page.locator('#reading-file').set_input_files({'name':'invalid.json','mimeType':'application/json','buffer':json.dumps(template).encode()});page.wait_for_timeout(100);assert not page.locator('#reading-import-preview').is_visible()
 # 完整学习备份往返包含新模块；五页多尺寸/深色布局
 page.locator('#start-reading').click();page.wait_for_timeout(100)
 page.locator('.bottom-nav [data-go="stats"]').click()
 with page.expect_download() as dl:page.locator('#export-data').click()
 backup=json.loads(Path(dl.value.path()).read_text());assert len(backup['study']['customWords'])==3;assert len(backup['study']['readingPacks'])==1;assert all(d['runningSince'] is None for d in backup['study']['reading']['drafts'].values())
 page.locator('#import-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()});page.wait_for_timeout(100);page.locator('#confirm-import').click();page.wait_for_timeout(100)
 assert page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY)).study.reading.records['original-study-breaks-1'].Q1.lastCorrect")
 page.locator('#theme').select_option('dark');page.wait_for_timeout(100)
 for width,height in [(320,740),(390,844),(768,1024),(1024,768),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height})
  for route in ['focus','words','reading','pet','stats']:
   page.locator(f'.bottom-nav [data-go="{route}"]').click();page.wait_for_timeout(30);assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,route)
 page.set_viewport_size({'width':390,'height':844});page.locator('.bottom-nav [data-go="reading"]').click();page.locator('#reading-select').select_option('original-study-breaks-1');page.screenshot(path='/workspace/chinese-pomodoro-v1.1-reading.png',full_page=True)
 assert not errors,errors
 print('V1.1 Chromium通过：v2迁移、随机/刷新、个人词CRUD、导入去重、联想区分、收藏、阅读计时草稿/判分/解析/错因/重练/生词、题库校验、备份、五页五尺寸深色布局。脚本错误0。')
 browser.close()
