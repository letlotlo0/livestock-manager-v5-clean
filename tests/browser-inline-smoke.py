"""Offline Playwright UI smoke test: inline actual frontend scripts; fake API only.
No external network calls, Postgres or Render required.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re, json, threading
ROOT=Path(__file__).resolve().parents[1] / 'frontend'
html=(ROOT/'animals.html').read_text()
# Keep actual HTML and JS. CSS isn't involved in functional save/sync tests.
html=re.sub(r'<link[^>]+rel="stylesheet"[^>]*>', '', html)
html=re.sub(r'<link[^>]+href="[^\"]+\.css[^\"]*"[^>]*>', '', html)
html=re.sub(r'<img\s[^>]*>', '', html)
def inline(m):
 filename=m.group(1).split('?')[0]
 data=(ROOT/filename).read_text().replace('</script>','<\\/script>')
 return '<script>\n'+data+'\n</script>'
html=re.sub(r'<script\s+src="([^"]+)"[^>]*>\s*</script>',inline,html)
bootstrap='''<script>
class FakeStorage{constructor(){this.data=new Map()}getItem(k){k=String(k);return this.data.has(k)?this.data.get(k):null}setItem(k,v){this.data.set(String(k),String(v))}removeItem(k){this.data.delete(String(k))}key(i){return [...this.data.keys()][i]||null}get length(){return this.data.size}}
Object.defineProperty(window,'Storage',{value:FakeStorage,configurable:true});
Object.defineProperty(window,'localStorage',{value:new FakeStorage(),configurable:true});
window.fetch=async function(url,opts={}){let result=await window.__fakeApi(url,opts.method||'GET',opts.body||'');return new Response(JSON.stringify(result.data),{status:result.status,headers:{'Content-Type':'application/json'}})};
window.__v5_ui_mock=true;
</script>'''
html=html.replace('<head>', '<head>'+bootstrap,1)
class API:
 def __init__(self):self.animals={};self.docs={};self.calls=[]
 def __call__(self,source,path,method,body):
  obj=json.loads(body) if body else {}
  self.calls.append((method,path))
  ok=lambda data,status=200: {'status':status,'data':data}
  if path=='/api/auth/me':return ok({'user':{'id':'test-farmer-1','name':'V5 Farmer','fullName':'V5 Farmer','email':'test@example.org','emailVerified':True}})
  if path=='/api/v5/state':return ok({'apiVersion':5,'animals':[{'id':k,'data':v['data'],'version':v['version'],'photo':v['photo'],'photoVersion':v['photoVersion']} for k,v in self.animals.items()],'records':[{'key':k,'data':v['data'],'version':v['version']} for k,v in self.docs.items()]})
  if path=='/api/v5/animals' and method=='POST':
   id=obj['id'];
   if id in self.animals:return ok({'error':'Already exists'},409)
   self.animals[id]={'data':obj['data'],'version':1,'photo':'','photoVersion':0};return ok({'version':1},201)
  if path.startswith('/api/v5/animals/'):
   bits=path.split('/');id=bits[4];r=self.animals.get(id)
   if not r:return ok({'error':'Missing animal'},409)
   if method=='PATCH':
    if r['version']!=obj['expectedVersion']:return ok({'error':'Version conflict'},409)
    for k in obj.get('removed',[]):r['data'].pop(k,None)
    r['data'].update(obj['changes']);r['version']+=1;return ok({'version':r['version']})
   if method=='PUT' and bits[-1]=='photo':
    if r['photoVersion']!=obj['expectedVersion']:return ok({'error':'Photo conflict'},409)
    r['photo']=obj['photo'];r['photoVersion']+=1;return ok({'photoVersion':r['photoVersion']})
   if method=='DELETE':
    if r['version']!=obj['expectedVersion']:return ok({'error':'Version conflict'},409)
    del self.animals[id];return ok({'deleted':True})
  if path.startswith('/api/farm/records/') and method=='PUT':
   key=path.rsplit('/',1)[1];r=self.docs.get(key);v=r['version'] if r else 0
   if v!=obj['expectedVersion']:return ok({'error':'Version conflict'},409)
   self.docs[key]={'data':obj['data'],'version':v+1};return ok({'version':v+1})
  return ok({'error':'Unmocked '+method+' '+path},404)
api=API();errors=[]
with sync_playwright() as p:
 import shutil
 launch={'headless':True,'args':['--no-sandbox','--disable-dev-shm-usage']}
 if shutil.which('chromium'):launch['executable_path']=shutil.which('chromium')
 browser=p.chromium.launch(**launch)
 desktop=browser.new_context(service_workers='block')
 mobile=browser.new_context(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,service_workers='block')
 for ctx in [desktop,mobile]:ctx.expose_binding('__fakeApi',api)
 a=desktop.new_page();b=mobile.new_page()
 for page,name in [(a,'desktop'),(b,'mobile')]:
  page.on('pageerror',lambda exc,name=name:errors.append([name,str(exc)]))
  page.set_content(html,wait_until='load',timeout=30000)
  page.wait_for_function("window.LivestockCloud && window.LivestockCloud.getStatus().state==='synced'",timeout=15000)
  print(name,'loaded and V5 cloud synced')
 def add(page,name):
  page.locator('#animalName').fill(name)
  page.locator('#animalType').select_option('Cattle')
  page.locator('#breed').select_option('Brahman')
  page.locator('#sex').select_option('Male')
  page.locator('#weight').fill('400')
  page.locator('#purchasePrice').fill('1000')
  page.locator('#purchaseDate').fill('2026-11-11')
  page.locator('#animalSubmitButton').click()
  page.wait_for_function("window.LivestockCloud.getStatus().state==='synced'",timeout=15000)
 add(a,'qqq');add(a,'Ttt')
 assert len(api.animals)==2,api.animals
 print('created via real UI:',list(api.animals.keys()))
 # Mimic full page refresh on phone; its prior copy contains no animals.
 b.close();b=mobile.new_page()
 b.on('pageerror',lambda exc:errors.append(['mobile reload',str(exc)]))
 b.set_content(html,wait_until='load')
 b.wait_for_function("window.LivestockCloud.getStatus().state==='synced'",timeout=15000)
 assert b.locator('.animal-card').count()==2, f"Phone cards: {b.locator('.animal-card').count()}"
 print('mobile sees two animals')
 def edit(page,name,note):
  page.locator('.animal-card').filter(has=page.get_by_role('heading',name=name,exact=True)).locator('[data-edit]').click()
  page.locator('#sellerRemarks').fill(note)
  page.locator('#animalSubmitButton').click()
 edit(a,'qqq','Laptop V5 smoke')
 edit(b,'Ttt','Phone V5 smoke')
 a.wait_for_function("window.LivestockCloud.getStatus().state==='synced'",timeout=15000)
 b.wait_for_function("window.LivestockCloud.getStatus().state==='synced'",timeout=15000)
 results={r['data']['name']:r['data'].get('sellerRemarks') for r in api.animals.values()}
 print('concurrent notes:',results)
 assert results=={'qqq':'Laptop V5 smoke','Ttt':'Phone V5 smoke'},results
 # Simultaneous photo and weight updates to the SAME animal on different devices.
 a.locator('.animal-card').filter(has=a.get_by_role('heading',name='qqq',exact=True)).locator('[data-edit]').click()
 b.locator('.animal-card').filter(has=b.get_by_role('heading',name='qqq',exact=True)).locator('[data-edit]').click()
 from pathlib import Path
 a.locator('#animalPhoto').set_input_files(str(ROOT/'assets'/'livestock-logo.png'))
 a.wait_for_timeout(300)  # Allow the real FileReader/canvas photo callback to finish.
 b.locator('#weight').fill('475')
 a.locator('#animalSubmitButton').click()
 b.locator('#animalSubmitButton').click()
 a.wait_for_function("window.LivestockCloud.getStatus().state==='synced'",timeout=15000)
 b.wait_for_function("window.LivestockCloud.getStatus().state==='synced'",timeout=15000)
 cow=next(row for row in api.animals.values() if row['data']['name']=='qqq')
 assert cow['data']['weight']==475,cow['data']
 assert cow['photo'].startswith('data:image/'),cow['photo'][:60]
 print('same-animal weight (475 kg) + photo upload both survived')
 assert not errors,errors
 print('BROWSER UI SMOKE PASS: actual HTML, animal forms, mobile layout, images, cloud sync, concurrent edits, no page errors')
 browser.close()
