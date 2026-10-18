"""本地 Chromium/WebKit（若已安装）端到端检查；需先在 8080 端口启动静态服务器。"""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).parent
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2,accept_downloads=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8080');page.wait_for_selector('#start')
 assert page.locator('#time').inner_text()=='25:00'
 # 旧数据迁移不丢失
 page.evaluate("""() => {localStorage.clear();localStorage.setItem('yike-pomodoro-v1',JSON.stringify({tasks:[{id:'old',text:'阅读科研论文',done:false}],counts:{'2026-10-18':2},timer:{mode:'focus',remaining:1500,endAt:null}}));} """)
 page.reload();assert page.locator('#tasks').inner_text().find('阅读科研论文')>=0
 page.locator('#task-input').fill('<img src=x onerror=alert(1)>');page.locator('#task-form button').click();page.wait_for_timeout(100)
 assert page.locator('#tasks li').count()==2;assert page.locator('#tasks img').count()==0
 page.locator('#tasks input').first.check();page.wait_for_timeout(100)
 page.locator('#clear-completed').click();page.wait_for_timeout(100);assert page.locator('#tasks li').count()==1
 # 时间设置在输入期间不会被 tick 覆盖
 page.locator('.timer-settings summary').click();page.locator('#focus-length').fill('20');page.wait_for_timeout(1200);assert page.locator('#focus-length').input_value()=='20'
 page.locator('#break-length').fill('4');page.locator('#time-form button').click();page.wait_for_timeout(100);assert page.locator('#time').inner_text()=='20:00'
 page.locator('#start').click();page.wait_for_timeout(1100);page.locator('#start').click();page.wait_for_timeout(100);paused=page.locator('#time').inner_text();page.wait_for_timeout(1200);assert page.locator('#time').inner_text()==paused
 page.reload();assert page.locator('#time').inner_text()==paused
 # 注入到期 session（跳过实际20分钟等待）；刷新只结算一次。
 page.evaluate("""() => {let s=JSON.parse(localStorage.getItem('yike-study-v2'));s.timer.endAt=Date.now()-1000;s.timer.id='browser-focus';localStorage.setItem('yike-study-v2',JSON.stringify(s));} """)
 page.reload();page.wait_for_timeout(200);assert page.locator('#celebration').is_visible()
 data=page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2'))");assert data['pet']['xp']==25;assert data['pet']['coins']==10
 page.reload();page.wait_for_timeout(100);assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.xp")==25
 page.locator('.bottom-nav [data-go="words"]').click();assert page.locator('#page-words').is_visible()
 assert page.locator('[data-grade="known"]').is_disabled()
 page.locator('#flashcard').click();page.locator('[data-grade="unknown"]').click();page.wait_for_timeout(100)
 data=page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2'))");assert data['progress']['abandon']['wrong']
 assert page.locator('#word-en').inner_text()=='abstract'
 # 完成30个新词，每次先翻卡；日奖励仅一次
 for i in range(29):
  page.locator('#flashcard').click();page.locator('[data-grade="known"]').click();page.wait_for_timeout(30)
 data=page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2'))");assert len(data['progress'])==30;assert data['pet']['food']==5;assert data['pet']['coins']==30
 page.reload();page.locator('.bottom-nav [data-go="words"]').click();assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.coins")==30
 assert page.locator('#word-empty').is_visible()
 if page.locator('#celebration').is_visible():page.locator('#dismiss-celebration').click()
 # 复习到期 + 跨标签重复结算
 page.evaluate("""() => {let s=JSON.parse(localStorage.getItem('yike-study-v2'));s.progress.abandon.due=Date.now()-1;localStorage.setItem('yike-study-v2',JSON.stringify(s));} """);page.reload();page.locator('.bottom-nav [data-go="words"]').click()
 page.locator('[data-filter="review"]').click();assert page.locator('#word-en').inner_text()=='abandon';page.locator('#flashcard').click();page.locator('[data-grade="known"]').click();page.wait_for_timeout(100)
 assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.xp")==27
 page.locator('[data-filter="wrong"]').click();assert page.locator('#wrong-count').inner_text()=='0'
 # 小测两方向
 assert page.locator('#quiz-options button').count()==4
 page.locator('#quiz-options button').first.click();page.wait_for_timeout(100);assert page.locator('#quiz-next').is_enabled();assert page.locator('#quiz-options button:enabled').count()==0
 page.locator('#quiz-direction').select_option('zh-en');assert page.locator('#quiz-options button').count()==4
 # 宠物互动与购买
 page.locator('.bottom-nav [data-go="pet"]').click();page.locator('[data-pet="pat"]').click();page.wait_for_timeout(100);bond=page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.bond")
 page.locator('[data-pet="pat"]').click();page.wait_for_timeout(100);assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.bond")==bond
 page.locator('#shop button').first.click();page.wait_for_timeout(100);assert page.locator('#decor-plant').is_visible();assert page.locator('#shop button').first.is_disabled()
 page.locator('[data-pet="sleep"]').click();page.wait_for_timeout(100);assert 'sleeping' in page.locator('#room').get_attribute('class')
 # 主题与备份导出/导入预览和确认
 page.locator('.bottom-nav [data-go="stats"]').click();page.locator('#theme').select_option('dark');page.wait_for_timeout(100);assert page.locator('body').get_attribute('data-theme')=='dark'
 page.locator('#reduced-motion').check();page.wait_for_timeout(100);assert 'reduce-motion' in page.locator('body').get_attribute('class')
 with page.expect_download() as dl:page.locator('#export-data').click()
 backup=json.loads(Path(dl.value.path()).read_text());assert backup['version']==2
 page.locator('#import-file').set_input_files({'name':'bad.json','mimeType':'application/json','buffer':b'{bad'})
 page.wait_for_timeout(100);assert not page.locator('#import-preview').is_visible();assert '未导入' in page.locator('#notice').inner_text()
 backup['pet']['coins']=123
 page.locator('#import-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()});page.wait_for_timeout(100)
 assert page.locator('#import-preview').is_visible();assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.coins")!=123
 page.locator('#confirm-import').click();page.wait_for_timeout(100);assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.coins")==123
 assert page.evaluate("localStorage.getItem('yike-study-v2-before-import')!==null")
 # 每个页面和多种屏幕宽度，无横向溢出
 for width,height in [(320,740),(390,844),(768,1024),(1024,768),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height})
  for route in ['focus','words','pet','stats']:
   page.locator(f'.bottom-nav [data-go="{route}"]').click();page.wait_for_timeout(50)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,route)
 page.set_viewport_size({'width':390,'height':844});page.locator('.bottom-nav [data-go="pet"]').click();page.screenshot(path='/workspace/chinese-pomodoro-pet-mobile.png',full_page=True)
 page.locator('.bottom-nav [data-go="focus"]').click();page.screenshot(path='/workspace/chinese-pomodoro-focus-mobile.png',full_page=True)
 # 两标签同一到期 session 只发一次奖励
 page.evaluate("""() => {let s=JSON.parse(localStorage.getItem('yike-study-v2'));s.timer={mode:'focus',id:'two-tabs',endAt:Date.now()+300,total:1200,remaining:1200};localStorage.setItem('yike-study-v2',JSON.stringify(s));} """)
 before=page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.xp")
 tab=context.new_page();tab.goto('http://127.0.0.1:8080');page.reload();page.wait_for_timeout(1800)
 assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.xp")==before+25
 # 泰迪外观、点击摸头、升级动画与减少动态效果
 page.evaluate("""() => {let s=JSON.parse(localStorage.getItem('yike-study-v2'));s.pet.xp=99;s.pet.sleeping=false;s.pet.cooldowns={};s.settings.reduced=false;s.timer={mode:'focus',id:'level-up-test',endAt:Date.now()-1,total:1200,remaining:1200};localStorage.setItem('yike-study-v2',JSON.stringify(s));} """)
 page.reload();page.wait_for_timeout(150)
 assert 'Lv.2' in page.locator('#celebration-title').inner_text()
 assert page.locator('#room').evaluate("el=>el.classList.contains('leveling')")
 page.locator('#dismiss-celebration').click();page.locator('.bottom-nav [data-go="pet"]').click()
 assert page.locator('#pet-avatar').get_attribute('data-species')=='teddy'
 assert page.locator('#pet-avatar svg.teddy').count()==1
 assert not page.locator('#pet-picker-label').is_visible()
 page.locator('#pet-avatar').click();page.wait_for_timeout(100)
 assert page.locator('#room').evaluate("el=>el.classList.contains('petting')")
 assert page.locator('.pet-happy-eyes').first.evaluate("el=>getComputedStyle(el).opacity")=='1'
 # 动态添加第二个受信任外观，选择后养成数值保持不变
 old_xp=page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.xp")
 page.evaluate("""() => {PET_CATALOG.test={...PET_CATALOG.teddy,id:'test',type:'测试外观'};}""")
 page.locator('.bottom-nav [data-go="focus"]').click();page.locator('.bottom-nav [data-go="pet"]').click()
 page.locator('#pet-picker').select_option('test');page.wait_for_timeout(100)
 assert page.evaluate("JSON.parse(localStorage.getItem('yike-study-v2')).pet.xp")==old_xp
 assert page.locator('#pet-avatar').get_attribute('data-species')=='test'
 page.locator('#pet-picker').select_option('teddy');page.wait_for_timeout(100)
 page.locator('.bottom-nav [data-go="stats"]').click();page.locator('#reduced-motion').check();page.wait_for_timeout(100)
 page.locator('.bottom-nav [data-go="pet"]').click()
 assert page.locator('.pet-eyes').first.evaluate("el=>getComputedStyle(el).animationName")=='none'
 page.screenshot(path='/workspace/chinese-pomodoro-teddy-mobile.png',full_page=True)
 assert not errors,errors
 print('浏览器检查通过：旧数据迁移、任务、时间设置/暂停/刷新、结算去重、30词奖励、到期复习、小测、宠物、购物、主题、JSON备份、五种宽度四页布局、双标签奖励。页面脚本错误：0。')
 browser.close()
