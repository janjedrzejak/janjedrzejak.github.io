"""Exercise the live reference with Playwright. Raw original site code is not distributed.

    BOOKSHELF_CHROMIUM=/path/to/chrome REFERENCE_NATIVE_NETWORK=1 python measure.py

Use public original responses, native inputs, and 1 CSS-pixel PNGs. Named mid-frames
use Playwright's clock for JS/rAF and seek the page's own Web Animations to the
same timestamp. This lets two implementations use equal elapsed time. The
catalog/touch/interrupt tests below run the ordinary clocks in additional tabs.
"""
import argparse
import asyncio
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from time import monotonic

from playwright.async_api import async_playwright
from reference_transport import BROWSER, ORIGIN, prepare

DATA = Path(__file__).resolve().parent
STAGE = '[class*="_stage"]'
SHELF = '[class*="_shelf"]'
ACTIVE_LINE = 'section[aria-label="Book shelf"] [aria-live]'
DIALOG = '[role="dialog"][class*="_shown"]'
CAP = """() => {
  const sc = document.querySelector('[class*="_stage"]');
  const rect = (el) => {
    if (!el) return null;
    const {x,y,width,height} = el.getBoundingClientRect();
    return [x,y,width,height].map(v=>+v.toFixed(3));
  };
  const all = Array.from(sc.querySelectorAll('[data-v]')).filter(x=>x.style.visibility!=='hidden');
  const center = all.reduce((a,x)=>+x.style.zIndex>+a.style.zIndex?x:a,all[0]);
  const selected = Array.from(document.querySelectorAll('button[data-g]')).find(x=>x.hasAttribute('data-on'));
  const viable = all.map(x=>({index:+x.dataset.v, label:x.querySelector('[class*="_st"]').textContent,
      pose:x.style.transform||null, zIndex:x.style.zIndex,
      spine:rect(x.firstElementChild),front:rect(x.lastElementChild),frontShade:x.lastElementChild.style.getPropertyValue('--shade')}));
  const dlg = document.querySelector('[role="dialog"][class*="_shown"]');
  const h=+parseFloat(sc.style.getPropertyValue('--hpx')).toFixed(3);
  return {url:location.pathname,viewport:[innerWidth,innerHeight,devicePixelRatio],
    center:rect(sc),height:h,spineWidth:+parseFloat(sc.style.getPropertyValue('--ws')).toFixed(3),
    active:document.querySelector('section[aria-label="Book shelf"] [aria-live]')?.textContent,
    category:selected?.textContent, modelCount:sc.querySelectorAll('[data-v]').length,
    activeModel:+center.dataset.v, visible:viable,
    dialog:dlg?{title:dlg.querySelector('h2')?.textContent, clip:getComputedStyle(dlg).clipPath,
      transform:getComputedStyle(dlg).transform, opacity:getComputedStyle(dlg).opacity,
      heading:rect(dlg.querySelector('h2')), poster:rect(dlg.querySelector('[role="img"]')||dlg.querySelector('svg:last-of-type')),
      scrollHeight:dlg.scrollHeight, clientHeight:dlg.clientHeight,
      kb:document.activeElement?.textContent?.trim().slice(0,20),
      circles:Array.from(dlg.querySelectorAll('circle')).map(c=>+parseFloat(c.getAttribute('r')).toFixed(2))}:null};
}"""

async def stage_xy(page):
    return await page.locator(STAGE).evaluate("e=>{const r=e.getBoundingClientRect();return [r.x,r.y]}")

async def coords_click(page,loc):
    rect=await loc.bounding_box()
    if rect is None: raise RuntimeError('click target hidden')
    await page.mouse.click(rect['x']+rect['width']/2,rect['y']+rect['height']/2)

async def wait_normal(page,ms):
    await page.wait_for_timeout(ms)

async def save_frame(page,name,frames,ms):
    f = await page.evaluate(CAP)
    f.update({"name":name,"atMs":ms})
    frames.append(f)
    await page.screenshot(path=DATA/(name+'.png'), animations='allow',scale='css')
    print(f"{name}: {f['active']} {ms}ms",flush=True)

async def set_native_timeline(page,elapsed,include_descendants=True):
    # JS clock controls shelf rAF and the poster mask; native WAAPI is sought independently.
    await page.evaluate("""([ms,descendants])=>{const dialog=document.querySelector('[role=dialog]');
      if(dialog) dialog.getAnimations({subtree:descendants}).forEach(a=>{
          a.pause(); a.currentTime=ms;
      });
    }""",[elapsed,include_descendants])

async def frame_test(browser):
    frames=[]
    context,page=await prepare(browser,1440,900,clock=True)
    future=(await page.evaluate('Date.now()'))/1000+0.35
    await page.clock.pause_at(datetime.fromtimestamp(future,tz=timezone.utc))
    await page.clock.run_for(850)
    await save_frame(page,'desktop-idle',frames,0)
    await coords_click(page,page.get_by_role('button',name='Next book'))
    await page.clock.run_for(133)
    await save_frame(page,'desktop-next-mid',frames,133)
    await page.clock.run_for(2067)
    await save_frame(page,'desktop-next',frames,2200)
    await coords_click(page,page.get_by_role('button',name='Previous book'))
    await page.clock.run_for(133)
    await save_frame(page,'desktop-return-mid',frames,133)
    await page.clock.run_for(2067)
    await save_frame(page,'desktop-return',frames,2200)
    sx,sy=await stage_xy(page)
    await page.mouse.click(sx,sy)
    await page.locator(DIALOG).wait_for(state='attached',timeout=8000)
    await set_native_timeline(page,0)
    await page.clock.run_for(525)
    await set_native_timeline(page,525)
    await save_frame(page,'desktop-open-mid',frames,525)
    await page.clock.run_for(1875)
    await set_native_timeline(page,2400)
    await save_frame(page,'desktop-details',frames,2400)
    # Release naturally complete entry animations before initiating the close.
    await page.evaluate("""()=>document.querySelector('[role=dialog]').getAnimations({subtree:true}).forEach(a=>a.finish())""")
    await page.keyboard.press('Escape')
    await set_native_timeline(page,0,False)
    await page.clock.run_for(400)
    await set_native_timeline(page,400,False)
    await save_frame(page,'desktop-close-mid',frames,400)
    await page.evaluate("""()=>document.querySelector('[role=dialog]')?.getAnimations().forEach(a=>a.finish())""")
    await page.mouse.move(4,4)
    await page.clock.run_for(1500)
    await page.locator(DIALOG).wait_for(state='detached',timeout=8000)
    await save_frame(page,'desktop-restored',frames,1500)
    (DATA/'keyframes.json').write_text(json.dumps(frames,indent=2))
    await context.close()

async def active_id(page):
    s=await page.locator(ACTIVE_LINE).text_content()
    return int(re.search(r'Stage (\d+)',s).group(1))

async def wait_active(page,i):
    await page.wait_for_function("""v=>document.querySelector('section[aria-label="Book shelf"] [aria-live]')?.textContent.includes('Stage '+String(v).padStart(2,'0')+' ·')""",arg=i,timeout=6000)

async def ground_test(browser):
    ctx,pg=await prepare(browser,1440,900)
    result={'visits':[],'categories':[],'checks':{}, 'clock':'native'}
    errors=[]
    pg.on('pageerror',lambda error:errors.append(str(error)))
    async def action(category,expected):
        await pg.get_by_role('button',name=category,exact=True).click()
        await wait_active(pg,expected)
        await wait_normal(pg,1100)
        f=await pg.evaluate(CAP)
        result['categories'].append({'button':category,'stage':await active_id(pg),'highlight':f['category'],
          'logicalTitles':len(set(x['label'] for x in f['visible'])), 'domModels':f['modelCount'],
          'visibleOtherCategories':len(set(x['index']%14 for x in f['visible']))>4})
    await action('Backend',4); await action('Infra & Ops',7); await action('AI',11); await action('Foundations',1); await action('All',1)
    sx,sy=await stage_xy(pg)
    state=await pg.evaluate(CAP)
    center=state['activeModel']; right=next(x for x in state['visible'] if x['index']==center+1)
    rx=right['spine'][0]+right['spine'][2]/2
    await pg.mouse.move(rx,sy);await wait_normal(pg,650)
    over=await pg.evaluate(CAP)
    await pg.screenshot(path=DATA/'desktop-hover-spine.png',scale='css')
    await pg.mouse.move(0,0);await wait_normal(pg,850)
    gone=await pg.evaluate(CAP)
    result['checks']['hover']={'before':right,'during':next(x for x in over['visible'] if x['index']==right['index']),
        'after':next(x for x in gone['visible'] if x['index']==right['index'])}
    await pg.mouse.move(sx+90,sy-80);await wait_normal(pg,700)
    front=await pg.evaluate(CAP)
    await pg.screenshot(path=DATA/'desktop-hover-cover.png',scale='css')
    result['checks']['coverTilt']=next(x for x in front['visible'] if x['index']==center)
    await pg.mouse.click(rx,sy)
    await wait_active(pg,2);await wait_normal(pg,1100)
    result['checks']['sideClick']={'stage':await active_id(pg),'detailCount':await pg.locator(DIALOG).count()}
    await pg.get_by_role('button',name='All',exact=True).click();await wait_active(pg,1);await wait_normal(pg,1000)
    for stage in range(1,15):
        if stage>1:
            await pg.get_by_role('button',name='Next book').click()
            await wait_active(pg,stage);await wait_normal(pg,480)
        before=await pg.evaluate(CAP)
        sx,sy=await stage_xy(pg);await pg.mouse.click(sx,sy)
        dialog=pg.locator(DIALOG)
        await dialog.wait_for(state='visible',timeout=8000)
        title=await dialog.locator('h2').text_content()
        relative=pg.url.removeprefix(ORIGIN)
        await wait_normal(pg,1120)
        await (pg.get_by_role('button',name='Close').click() if stage%2 else pg.keyboard.press('Escape'))
        await dialog.wait_for(state='detached',timeout=5000)
        same=await active_id(pg)
        assert same==stage and pg.url==ORIGIN+'/engineering',(stage,same,pg.url)
        result['visits'].append({'stage':stage,'title':title,'detailsPath':relative,'returnedStage':same,
                  'close':'button' if stage%2 else 'Escape', 'result':'pass'})
        print('catalog',stage,title,flush=True)
        (DATA/'reference-desktop-tests.partial.json').write_text(json.dumps(result,indent=2))
    await pg.get_by_role('button',name='Next book').click();await wait_active(pg,1);await wait_normal(pg,700)
    result['checks']['wrap']={'after14':await active_id(pg)}
    await pg.mouse.click(*(await stage_xy(pg)));await pg.locator(DIALOG).wait_for(state='attached')
    await wait_normal(pg,140)
    await pg.keyboard.press('Escape');await pg.locator(DIALOG).wait_for(state='detached',timeout=5000)
    result['checks']['interrupt']={'stage':await active_id(pg),'url':pg.url}
    await pg.keyboard.press('ArrowRight');await pg.keyboard.press('ArrowRight');await pg.keyboard.press('ArrowLeft')
    await wait_normal(pg,1400);result['checks']['rapidKeyboard']={'stage':await active_id(pg)}
    await coords_click(pg,pg.get_by_role('button',name='Next book')); await coords_click(pg,pg.get_by_role('button',name='Next book')); await coords_click(pg,pg.get_by_role('button',name='Previous book'))
    await wait_normal(pg,1400);result['checks']['rapidArrowClicks']={'stage':await active_id(pg)}
    await pg.mouse.move(sx,sy);await pg.mouse.wheel(0,180);await wait_normal(pg,1200)
    result['checks']['wheel']={'stage':await active_id(pg)}
    await pg.mouse.move(sx,sy);await pg.mouse.down();await pg.mouse.move(sx-125,sy+2,steps=8);await pg.mouse.up();await wait_normal(pg,1000)
    result['checks']['mouseDrag']={'stage':await active_id(pg),'detailCount':await pg.locator(DIALOG).count()}
    sx,sy=await stage_xy(pg);await pg.mouse.click(sx,sy);await pg.locator(DIALOG).wait_for(state='visible')
    await pg.go_back();await pg.locator(DIALOG).wait_for(state='detached',timeout=5000)
    await pg.go_forward();await pg.locator(DIALOG).wait_for(state='visible',timeout=5000)
    result['checks']['browserBackForward']={'url':pg.url,'title':await pg.locator('h2').text_content()}
    result['javascriptErrors']=errors
    (DATA/'reference-desktop-tests.json').write_text(json.dumps(result,indent=2))
    await ctx.close()

async def touch_swipe(cdp,x,y,dx,dy):
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[{'x':x,'y':y}]})
    for i in range(1,9):
        await cdp.send('Input.dispatchTouchEvent',{'type':'touchMove','touchPoints':[{'x':x+dx*i/8,'y':y+dy*i/8}]})
        await asyncio.sleep(.018)
    await cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})

async def mobile_test(browser,w,h,engine):
    ctx,pg=await prepare(browser,w,h)
    prefix=f'mobile-{w}' if engine=='Chromium' else f'webkit-{w}'
    result={'viewport':[w,h], 'engine':engine,'mobileEmulation':True, 'dpr':1, 'checks':{}}
    f=await pg.evaluate(CAP);result['idle']=f
    if engine=='Chromium':
        await pg.screenshot(path=DATA/(prefix+'-idle.png'),scale='css')
    x,y=await stage_xy(pg)
    await pg.touchscreen.tap(x,y);dlg=pg.locator(DIALOG)
    await dlg.wait_for(state='visible');await wait_normal(pg,2300)
    if engine=='Chromium':
        await pg.screenshot(path=DATA/(prefix+'-details.png'),scale='css')
    result['detail']=await pg.evaluate(CAP)
    result['checks']['touchToOpen']={'stage':await active_id(pg),'title':await dlg.locator('h2').text_content()}
    await pg.get_by_role('button',name='Close').tap()
    await dlg.wait_for(state='detached',timeout=5000)
    result['checks']['closeReturned']=await active_id(pg)
    if engine=='Chromium':
        cdp=await ctx.new_cdp_session(pg)
        await touch_swipe(cdp,x,y,-98,4);await wait_normal(pg,1000)
        result['checks']['swipeHorizontal']={'stage':await active_id(pg),'dialogCount':await dlg.count()}
        previous=await active_id(pg)
        await touch_swipe(cdp,x,y,0,-115);await wait_normal(pg,400)
        result['checks']['swipeVertical']={'stageBefore':previous,'stageAfter':await active_id(pg),'dialogCount':await dlg.count()}
        await pg.get_by_role('button',name='All',exact=True).tap();await wait_active(pg,1);await wait_normal(pg,800)
        st=await pg.evaluate(CAP)
        right=next(v for v in st['visible'] if v['index']==st['activeModel']+1)
        lx=right['spine'][0]+right['spine'][2]/2
        await pg.touchscreen.tap(min(w-3,lx),y);await wait_active(pg,2);await wait_normal(pg,500)
        result['checks']['tapSide']={'stage':await active_id(pg),'dialogCount':await dlg.count()}
    (DATA/(prefix+'-results.json')).write_text(json.dumps(result,indent=2))
    print(prefix,'tested',flush=True);await ctx.close()

async def main(parts):
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=BROWSER,args=['--no-sandbox'])
        jobs=[]
        if 'frames' in parts: jobs.append(frame_test(b))
        if 'catalog' in parts: jobs.append(ground_test(b))
        if 'mobile' in parts: jobs.extend(mobile_test(b,w,h,'Chromium') for w,h in [(390,844),(393,852),(430,932),(768,1024)])
        wb=None
        if 'webkit' in parts:
            exe=os.environ.get('BOOKSHELF_WEBKIT')
            wb=await p.webkit.launch(headless=True,**({'executable_path':exe} if exe else {}))
            jobs.append(mobile_test(wb,390,844,'WebKit'))
        done=await asyncio.gather(*jobs,return_exceptions=True);await b.close()
        if wb: await wb.close()
        for x in done:
            if isinstance(x,BaseException):
                import traceback; traceback.print_exception(type(x),x,x.__traceback__)
        if any(isinstance(x,BaseException) for x in done):raise SystemExit(1)

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('parts',nargs='*',default=['frames','catalog','mobile'])
    asyncio.run(main(ap.parse_args().parts))
