"""Capture native, uninterrupted browser motion through Chrome's screencast API."""
import asyncio
import base64
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
from time import time
from playwright.async_api import async_playwright
from reference_transport import BROWSER, prepare
from measure import DATA, DIALOG, stage_xy, touch_swipe, wait_active

async def record(browser,w,h,name):
    ctx,pg=await prepare(browser,w,h)
    cd=await ctx.new_cdp_session(pg)
    directory=Path(tempfile.mkdtemp(prefix='bookshelf-native-capture-'))
    raw=[]; marks=[]; acks=set()
    def collect(event):
        i=len(raw)
        filename=directory/f'{i:05}.jpg'
        filename.write_bytes(base64.b64decode(event['data']))
        raw.append((filename,event['metadata'].get('timestamp',time())))
        task=asyncio.create_task(cd.send('Page.screencastFrameAck',{'sessionId':event['sessionId']}))
        acks.add(task);task.add_done_callback(acks.discard)
    cd.on('Page.screencastFrame',collect)
    await cd.send('Page.startScreencast',{'format':'jpeg','quality':84,'maxWidth':w,'maxHeight':h,'everyNthFrame':1})
    async def log(label):
        marks.append((label,await pg.evaluate('Date.now()/1000')))
    await log('idle');await pg.wait_for_timeout(650)
    x,y=await stage_xy(pg)
    if w==1440:
        await log('next');await pg.get_by_role('button',name='Next book').click()
        await pg.wait_for_timeout(1400)
        await log('previous');await pg.get_by_role('button',name='Previous book').click()
        await pg.wait_for_timeout(1400)
        await log('hover front');await pg.mouse.move(x+40,y-60)
        await pg.wait_for_timeout(450)
        await log('open front');await pg.mouse.click(x,y)
    else:
        await log('swipe left');await touch_swipe(cd,x,y,-56,2)
        await pg.wait_for_timeout(1100)
        await log('tap front');await pg.touchscreen.tap(x,y)
    await pg.locator(DIALOG).wait_for(state='visible')
    await pg.wait_for_timeout(2400)
    await log('close');await (pg.get_by_role('button',name='Close').click() if w==1440 else pg.get_by_role('button',name='Close').tap())
    await pg.locator(DIALOG).wait_for(state='detached')
    await pg.wait_for_timeout(450)
    await log('end')
    await cd.send('Page.stopScreencast')
    if acks:await asyncio.gather(*acks,return_exceptions=True)
    await ctx.close()
    assert len(raw)>4, len(raw)
    listing=directory/'frames.txt'
    seq=[]
    for i,(filename,stamp) in enumerate(raw):
        end=raw[i+1][1] if i+1<len(raw) else max(stamp+0.05,marks[-1][1])
        seq.extend([f"file '{filename}'",f'duration {max(.001,end-stamp):.6f}'])
    seq.append(f"file '{raw[-1][0]}'")
    listing.write_text('\n'.join(seq)+'\n')
    out=DATA/(name+'.mp4')
    await asyncio.to_thread(subprocess.run,['ffmpeg','-hide_banner','-loglevel','error','-y','-f','concat','-safe','0','-i',str(listing),
                '-vf','fps=24,format=yuv420p','-c:v','libx264','-preset','fast','-crf','23','-threads','2','-movflags','+faststart',str(out)],check=True)
    (DATA/(name+'.json')).write_text(json.dumps({'viewport':[w,h],'capturedFrames':len(raw),'frameSize':out.stat().st_size,'eventsSecondsFromFirstFrame':{n:round(t-raw[0][1],3) for n,t in marks}},indent=2))
    shutil.rmtree(directory)
    print(name,len(raw),out.stat().st_size,flush=True)

async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=BROWSER,args=['--no-sandbox'])
        await asyncio.gather(record(b,1440,900,'desktop-native-interaction'),record(b,390,844,'mobile-native-interaction'))
        await b.close()
if __name__=='__main__':asyncio.run(main())
