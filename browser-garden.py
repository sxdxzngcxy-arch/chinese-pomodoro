"""心境花园浏览器检查。需已有 Playwright/Chromium；网站没有此运行依赖。"""
from pathlib import Path
import json,os,threading
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from playwright.sync_api import sync_playwright,expect
BASE=os.environ.get('POMODORO_TEST_URL','http://127.0.0.1:8082')
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=2,accept_downloads=True)
 page=ctx.new_page();errors=[];external=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:external.append(r.url) if not r.url.startswith((BASE,'blob:','data:')) else None)
 def data():return page.evaluate("JSON.parse(localStorage.getItem(StudyCore.KEY))")
 def go_garden():page.locator('header .garden-entry').click();expect(page.locator('#page-garden')).to_be_visible()
 def choose(feeling,energy):
  page.locator(f'.feeling-choices label:has(input[value="{feeling}"])').click()
  page.locator(f'.energy-choices label:has(input[value="{energy}"])').click()
 def upload(backup):
  page.locator('#import-file').set_input_files({'name':'backup.json','mimeType':'application/json','buffer':json.dumps(backup).encode()});page.wait_for_timeout(100)
 page.goto(BASE);page.wait_for_selector('#start');assert page.locator('.bottom-nav button').count()==5
 # 不弹签到、不自动建情绪记录；跳过不建记录，建议与选择相互独立。
 assert not page.locator('#page-garden').is_visible();before=data();go_garden();choose('anxious',2)
 assert '轻量' in page.locator('#garden-recommendation').inner_text();assert data()['garden']['mode']=='standard';assert len(data()['garden']['entries'])==0
 page.locator('#skip-garden').click();assert len(data()['garden']['entries'])==0;assert data()['pet']==before['pet']
 go_garden();choose('low',1);page.locator('#garden-note').fill('<img src=x onerror=alert(1)> 今天慢一点。');page.locator('#save-garden-entry').click();page.wait_for_timeout(100)
 assert len(data()['garden']['entries'])==1;assert data()['pet']==before['pet'];assert data()['ledger']==before['ledger'];assert page.locator('#garden-history img').count()==0
 page.reload();expect(page.locator('#garden-history')).to_contain_text('今天慢一点')
 page.locator('#garden-history').get_by_role('button',name='修改',exact=True).click();choose('calm',3);page.locator('#garden-note').fill('修改后的记录');page.locator('#save-garden-entry').click();page.wait_for_timeout(100)
 assert len(data()['garden']['entries'])==1;assert data()['garden']['entries'][0]['note']=='修改后的记录'
 page.locator('#garden-history').get_by_role('button',name='修改',exact=True).click();page.locator('#garden-note').fill('取消这次修改');page.locator('#cancel-garden-edit').click();assert data()['garden']['entries'][0]['note']=='修改后的记录'
 with page.expect_download() as dl:page.locator('#export-garden').click()
 isolated=json.loads(Path(dl.value.path()).read_text());assert isolated['type']=='yike-garden';assert isolated['entries'][0]['note']=='修改后的记录'
 # 建议不强制；手动任意切换不改变计时/目标/奖励。
 choose('calm',5);assert '冲刺' in page.locator('#garden-recommendation').inner_text();original_timer=data()['timer']
 for mode in ['sprint','light','standard']:
  page.locator(f'.garden-modes label:has(input[value="{mode}"])').click();page.wait_for_timeout(80);assert data()['garden']['mode']==mode;assert data()['timer']==original_timer
 page.locator('#adopt-garden-recommendation').click();page.wait_for_timeout(100);assert data()['garden']['mode']=='sprint';assert data()['timer']==original_timer
 page.locator('.garden-modes label:has(input[value="light"])').click();page.wait_for_timeout(100);page.locator('#garden-prepare-focus').click();page.wait_for_timeout(100)
 assert page.locator('#time').inner_text()=='05:00';assert data()['settings']['focus']==25;assert data()['settings']['goal']==30
 page.locator('#start').click();page.wait_for_timeout(100);active=data()['timer'];go_garden();page.locator('.garden-modes label:has(input[value="standard"])').click();page.wait_for_timeout(100);assert data()['timer']==active
 page.locator('#garden-prepare-focus').click();assert page.locator('#garden-focus-confirm').is_visible();page.locator('#garden-keep-focus').click();assert data()['timer']==active
 go_garden();page.locator('#garden-prepare-focus').click();page.locator('#garden-confirm-focus').click();page.wait_for_timeout(100);assert data()['timer']['total']==1500;assert data()['timer']['endAt'] is None
 # 呼吸所有控制、减少动画、离开暂停。
 go_garden()
 for duration in ['120','180','60']:
  page.locator('#garden-breath-duration').select_option(duration);page.wait_for_timeout(80);assert data()['garden']['breathing']['duration']==int(duration)
 page.locator('#garden-breath-style').select_option('natural');page.wait_for_timeout(80);page.locator('#garden-breath-style').select_option('paced');page.wait_for_timeout(80)
 pet_before=data()['pet'];page.locator('#garden-breath-start').click();page.wait_for_timeout(100);assert data()['garden']['breathing']['status']=='running'
 page.locator('#garden-reduced-motion').check();page.wait_for_timeout(100);assert page.locator('#garden-breath-orb').evaluate('el=>getComputedStyle(el).transform')=='matrix(1, 0, 0, 1, 0, 0)'
 page.locator('#garden-breath-natural').click();page.wait_for_timeout(100);assert data()['garden']['breathing']['style']=='natural'
 page.locator('#garden-breath-pause').click();page.wait_for_timeout(100);frozen=data()['garden']['breathing']['elapsed'];page.wait_for_timeout(600);assert data()['garden']['breathing']['elapsed']==frozen
 page.locator('#garden-breath-start').click();page.wait_for_timeout(100);page.locator('#garden-breath-stop').click();page.wait_for_timeout(100);assert data()['garden']['breathing']['status']=='paused'
 page.locator('#garden-breath-start').click();page.wait_for_timeout(100);page.locator('#garden-quick-exit').click();page.wait_for_timeout(100);assert data()['garden']['breathing']['status']=='paused'
 go_garden();page.locator('#garden-breath-start').click();page.wait_for_timeout(100);page.locator('.bottom-nav [data-go="words"]').click();page.wait_for_timeout(100);assert data()['garden']['breathing']['status']=='paused'
 assert data()['pet']==pet_before
 # 模拟后台事件；不依赖 headless 浏览器是否真的冻结页面。
 go_garden();page.locator('#garden-breath-start').click();page.wait_for_timeout(100)
 page.evaluate("Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))")
 page.wait_for_timeout(100);assert data()['garden']['breathing']['status']=='paused'
 page.evaluate("delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))")
 # 硬刷新恢复仅保留检查点，不补算离线一分钟，也不奖励。
 page.evaluate("""() => {let s=JSON.parse(localStorage.getItem(StudyCore.KEY));s.garden.breathing={id:'recover-test',duration:60,style:'paced',elapsed:10000,runningSince:Date.now()-86400000,status:'running'};localStorage.setItem(StudyCore.KEY,JSON.stringify(s));} """)
 page.reload();page.wait_for_timeout(150);go_garden();assert data()['garden']['breathing']['status']=='paused';assert data()['garden']['breathing']['elapsed']==10000
 # 前台真实达到总时长才完成，重复tick不发奖。
 page.evaluate("""() => StudyApp.transact(s=>{s.garden.breathing={id:'completion-test',duration:60,style:'paced',elapsed:59000,runningSince:Date.now()-1500,status:'running'};},{settleTimer:false})""")
 page.wait_for_timeout(600);assert data()['garden']['breathing']['status']=='completed';assert data()['pet']==pet_before
 # 活动呼吸导出副本暂停，当前页面保持运行。
 page.locator('#garden-breath-start').click();page.wait_for_timeout(100);page.locator('.bottom-nav [data-go="stats"]').click();page.wait_for_timeout(100)
 with page.expect_download() as dl:page.locator('#export-data').click()
 backup=json.loads(Path(dl.value.path()).read_text());assert backup['garden']['breathing']['runningSince'] is None;assert len(backup['garden']['entries'])==1
 # 错误备份不得覆盖；旧备份不清心境；显式合并本机同日优先。
 invalid=json.loads(json.dumps(backup));invalid['garden']['entries'][0]['energy']=9;upload(invalid);assert not page.locator('#import-preview').is_visible();assert data()['garden']['entries'][0]['note']=='修改后的记录'
 older=json.loads(json.dumps(backup));del older['garden'];upload(older);assert not page.locator('#restore-garden-label').is_visible();page.locator('#confirm-import').click();page.wait_for_timeout(100);assert data()['garden']['entries'][0]['note']=='修改后的记录'
 go_garden();page.locator('#garden-history').get_by_role('button',name='修改',exact=True).click();page.locator('#garden-note').fill('本机优先的新记录');page.locator('#save-garden-entry').click();page.wait_for_timeout(100)
 yesterday=page.evaluate('StudyCore.day(StudyCore.addDay(Date.now(),-1))');another=dict(backup['garden']['entries'][0]);another['day']=yesterday;another['note']='备份中的另一天';backup['garden']['entries'].append(another)
 page.locator('.bottom-nav [data-go="stats"]').click();upload(backup);assert not page.locator('#restore-garden').is_checked();page.locator('#restore-garden').check();page.locator('#confirm-import').click();page.wait_for_timeout(100);assert len(data()['garden']['entries'])==2;assert data()['garden']['entries'][0]['note']=='本机优先的新记录'
 # 删除需要确认，并擦除本站恢复副本对应日记；清除只影响心境。
 go_garden();page.locator('#garden-history').get_by_role('button',name='删除',exact=True).first.click();assert len(data()['garden']['entries'])==2
 page.locator('#garden-history').get_by_role('button',name='确认删除',exact=True).click();page.wait_for_timeout(100);assert len(data()['garden']['entries'])==1
 kept_pet=data()['pet'];kept_tasks=data()['tasks'];page.evaluate("localStorage.setItem(StudyCore.KEY+'-before-v1.1',localStorage.getItem(StudyCore.KEY))")
 page.locator('#clear-garden').click();page.locator('#cancel-clear-garden').click();assert len(data()['garden']['entries'])==1
 page.locator('#clear-garden').click();page.locator('#confirm-clear-garden').click();page.wait_for_timeout(100);assert data()['garden']['entries']==[];assert data()['pet']==kept_pet;assert data()['tasks']==kept_tasks
 for suffix in ['-before-import','-before-v1.1']:assert page.evaluate(f"JSON.parse(localStorage.getItem(StudyCore.KEY+'{suffix}')).garden.entries.length")==0
 # 少量键盘/无障碍检查：控件标签、系统减少动态、深浅色、移动布局。
 page.locator('#garden-reduced-motion').uncheck();page.wait_for_timeout(100);page.emulate_media(reduced_motion='reduce');assert page.locator('#garden-breath-orb').evaluate('el=>getComputedStyle(el).transform')=='matrix(1, 0, 0, 1, 0, 0)'
 for theme in ['dark','light']:
  page.locator('.bottom-nav [data-go="stats"]').click();page.locator('#theme').select_option(theme);page.wait_for_timeout(100)
  for width,height in [(320,740),(390,844),(768,1024),(1024,768)]:
   page.set_viewport_size({'width':width,'height':height});go_garden();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(theme,width)
 assert page.locator('#garden-form fieldset legend').count()==2;assert page.locator('#garden-breath-time').get_attribute('aria-live')=='off'
 page.set_viewport_size({'width':390,'height':844});page.screenshot(path='/workspace/chinese-pomodoro-garden-mobile.png',full_page=True)
 assert not external,external;assert not errors,errors
 # 模拟 GitHub Pages 项目子路径，所有相对资源必须正常加载。
 class Quiet(SimpleHTTPRequestHandler):
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(Path(__file__).parent.parent)))
 thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
 try:
  sub=browser.new_page(viewport={'width':390,'height':844});failed=[];sub.on('response',lambda r:failed.append((r.url,r.status)) if r.status>=400 and 'favicon' not in r.url else None)
  sub.goto(f'http://127.0.0.1:{server.server_port}/chinese-pomodoro/');sub.locator('header .garden-entry').click();expect(sub.locator('#page-garden')).to_be_visible();assert not failed,failed;sub.close()
 finally:server.shutdown();server.server_close()
 print('心境花园Chromium通过：自愿/跳过、签到修改/导出/删除清除、模式建议和手动选择、计时保护、全部呼吸控制/恢复/完成、奖励不变、旧备份与心境合并、恢复副本清理、深浅色/减少动画、四种设备宽度、无第三方请求、GitHub Pages子路径。脚本错误0。')
 browser.close()
