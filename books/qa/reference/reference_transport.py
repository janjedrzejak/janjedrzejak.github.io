"""Read-only QA transport. Fetch the public site using the executor's trusted CA.
Set REFERENCE_NATIVE_NETWORK=1 to use the browser's ordinary network on your machine.
"""

import asyncio
from hashlib import sha256
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlparse
from urllib.request import Request, urlopen
import json
import gzip
import subprocess
import zlib
import os

ORIGIN = 'https://layoffsandhires.com'
BROWSER = os.getenv('BOOKSHELF_CHROMIUM')
CACHE = Path(os.getenv('REFERENCE_QA_CACHE', '/tmp/bookshelf-reference-http-cache'))
CACHE.mkdir(exist_ok=True)
_inflight = {}

def _get(url):
    key = sha256(url.encode()).hexdigest()
    cached = CACHE / (key + '.body')
    meta = CACHE / (key + '.json')
    if cached.exists() and meta.exists():
        m = json.loads(meta.read_text())
        return m['status'], m['headers'], cached.read_bytes()
    try:
        res = urlopen(Request(url, headers={'Accept-Encoding': 'identity', 'User-Agent': 'Mozilla/5.0 (reference QA; read-only)'}),timeout=30)
    except HTTPError as e:
        res = e
    with res:
        data = res.read()
        encoding = res.headers.get('Content-Encoding','').lower()
        if encoding == 'gzip':
            data = gzip.decompress(data)
        elif encoding == 'br':
            data = subprocess.run(['node','-e',"process.stdin.on('data', c=>parts.push(c)).on('end',()=>process.stdout.write(require('zlib').brotliDecompressSync(Buffer.concat(parts))));const parts=[]"],input=data,stdout=subprocess.PIPE,check=True).stdout
        elif encoding == 'deflate':
            data = zlib.decompress(data)
        status = res.status
        headers = {key: value for key, value in res.headers.items() if key.lower() in {
            'content-type','access-control-allow-origin','timing-allow-origin','vary','content-language',
            'cross-origin-resource-policy','cross-origin-opener-policy','cross-origin-embedder-policy',
            'content-security-policy','x-content-type-options'}}
    if status == 200 and ('immutable' in url or '/engineering/' in url or url == ORIGIN+'/engineering'):
        cached.write_bytes(data)
        meta.write_text(json.dumps({'status':status,'headers':headers}))
    return status, headers, data

async def public_route(route):
    url = route.request.url
    if route.request.method != 'GET':
        await route.fulfill(status=204, body='')
        return
    if not url.startswith(ORIGIN + '/'):
        await route.continue_()
        return
    try:
        if url not in _inflight:
            _inflight[url] = asyncio.create_task(asyncio.to_thread(_get, url))
        status, headers, body = await _inflight[url]
        await route.fulfill(status=status, headers=headers, body=body)
    except Exception as e:
        print('Transport', url[:140],str(e)[:130], flush=True)
        await route.abort()

async def prepare(browser,width,height,clock=False):
    touch = width < 1024
    ctx = await browser.new_context(viewport={'width':width,'height':height}, screen={'width':width,'height':height},
             device_scale_factor=1, is_mobile=touch, has_touch=touch, locale='en-US',color_scheme='light')
    if os.environ.get('REFERENCE_NATIVE_NETWORK') != '1':
        await ctx.route('**/*',public_route)
    page = await ctx.new_page()
    if clock:
        await page.clock.install()
    await page.goto(ORIGIN+'/engineering',wait_until='domcontentloaded',timeout=70000)
    await page.locator('[class*="_stage"][class*="_ready"]').wait_for(state='attached', timeout=60000)
    await page.evaluate('document.fonts.ready')
    await page.wait_for_timeout(650)
    return ctx,page
