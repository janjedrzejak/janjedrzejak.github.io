"""Exercise a running production build with real browser input.

pip install playwright && playwright install chromium webkit
python qa/browser_qa.py https://your-shelf.example --browser chromium --out qa-output
See qa/README.md for the scope and capture protocol.
"""

import argparse
import asyncio
import json
import mimetypes
import os
import re
import shutil
import subprocess
import tempfile
import time
from collections import Counter
from datetime import UTC, datetime
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import unquote, urlsplit
from urllib.request import Request, urlopen

from playwright.async_api import Error as BrowserError
from playwright.async_api import async_playwright

VIEWPORTS = [(390, 844), (393, 852), (430, 932), (768, 1024), (1440, 900)]
BOOKS = json.loads(
    (Path(__file__).resolve().parents[1] / "src/data/personal-books.json").read_text()
)
TITLES = [book["title"] for book in BOOKS]
GEOMETRY = """() => {
    const faces = [];
    for (const book of document.querySelectorAll('[data-book-index]')) {
        if (getComputedStyle(book).visibility === 'hidden') continue;
        const front = book.querySelector('.cover-front'), spine = book.querySelector('.spine');
        if (!front || !spine) continue;
        const rect = node => {
            const {x,y,width,height} = node.getBoundingClientRect();
            return {x,y,width,height};
        };
        const f = rect(front);
        if (f.x + f.width < 0 || f.x > innerWidth || f.height < 1) continue;
        const solid = book.matches('.book-solid') ? book : book.querySelector('.book-solid');
        const image = front.querySelector('img');
        faces.push({index:Number(book.dataset.bookIndex), front:f, spine:rect(spine),
          pose:solid?.style.transform ?? '', image:image?.currentSrc ?? '',
          decoded:image?.naturalWidth ?? 0, decodedHeight:image?.naturalHeight ?? 0});
    }
    faces.sort((a,b) => b.front.width * b.front.height - a.front.width * a.front.height);
    return {phase:document.querySelector('#experience')?.dataset.phase,
      href:location.hash, width:innerWidth, height:innerHeight,
      maxWidth:document.documentElement.scrollWidth, faces,
      nodes:document.querySelectorAll('[data-book-index]').length,
      dialog:document.querySelector('#book-details h2')?.textContent ?? ''};
}"""
AUDIT = """() => {
    window.__qaFrameCount = 0;
    const raf = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => raf(ts => { window.__qaFrameCount++; callback(ts); });
    window.__qaEvents = [];
    for (const type of ['click','pointerdown','pointerup','keydown']) {
        window.addEventListener(type, event => {
            window.__qaEvents.push({type, pointerType:event.pointerType ?? '', key:event.key ?? '', t:performance.now()});
            if (window.__qaEvents.length > 15) window.__qaEvents.shift();
        }, true);
    }
}"""
SOURCE_HEADERS = {
    "content-type",
    "access-control-allow-origin",
    "cross-origin-resource-policy",
    "cache-control",
    "etag",
    "last-modified",
    "vary",
}
network_cache = {}


def web_get(url):
    request = Request(
        url,
        headers={
            "Accept-Encoding": "identity",
            "User-Agent": "Mozilla/5.0 (bookshelf QA)",
        },
    )
    try:
        response = urlopen(request, timeout=40)
    except HTTPError as exc:
        response = exc
    with response:
        return (
            response.status,
            {k: v for k, v in response.headers.items() if k.lower() in SOURCE_HEADERS},
            response.read(),
        )


async def bridge_https(route):
    """TLS-validating transport only for managed runners lacking native upstream routing."""
    url = route.request.url
    if route.request.method != "GET" or not url.startswith("https://"):
        return await route.continue_()
    if url not in network_cache:
        network_cache[url] = asyncio.create_task(asyncio.to_thread(web_get, url))
    try:
        status, headers, body = await network_cache[url]
        await route.fulfill(status=status, headers=headers, body=body)
    except (OSError, BrowserError, TimeoutError):
        network_cache.pop(url, None)
        await route.abort()


class Results:
    def __init__(self, opts, version):
        self.opts = opts
        self.folder = opts.out / opts.browser
        self.folder.mkdir(parents=True, exist_ok=True)
        self.data = {
            "runUtc": datetime.now(UTC).isoformat(),
            "url": opts.url,
            "browser": opts.browser,
            "version": version,
            "application": "verified local production files"
            if opts.static_dir
            else "live origin",
            "network": "TLS-validating system transport for HTTPS GET"
            if opts.system_fetch
            else "native browser",
            "checks": [],
            "frames": {},
            "errors": [],
            "failedRequests": [],
        }

    def check(self, name, passed, detail=None):
        row = {"name": name, "pass": bool(passed)}
        if detail is not None:
            row["detail"] = detail
        self.data["checks"].append(row)
        if not passed:
            print("FAIL:", name, str(detail)[:250], flush=True)
        self.write()

    def write(self):
        (self.folder / "results.json").write_text(
            json.dumps(self.data, indent=2, ensure_ascii=False)
        )


async def context(
    browser,
    opts,
    report,
    width,
    height,
    reduced=False,
    missing_cover=False,
    clock=False,
    profile=None,
    video_dir=None,
):
    touch = width < 1024
    emulation = {"user_agent": profile["user_agent"]} if profile else {}
    if video_dir:
        emulation.update(
            record_video_dir=str(video_dir),
            record_video_size={"width": width, "height": height},
        )
    ctx = await browser.new_context(
        **emulation,
        viewport={"width": width, "height": height},
        screen={"width": width, "height": height},
        device_scale_factor=profile["device_scale_factor"] if profile else 1,
        is_mobile=touch,
        has_touch=touch,
        reduced_motion="reduce" if reduced else "no-preference",
        locale="en-US",
        color_scheme="light",
    )
    await ctx.add_init_script("(" + AUDIT + ")()")
    if opts.system_fetch:
        await ctx.route("https://**/*", bridge_https)
    if opts.static_dir:
        base = urlsplit(opts.url)
        origin = base.scheme + "://" + base.netloc
        mount = base.path.rstrip("/") + "/"
        root = opts.static_dir.resolve()

        async def artifact(route):
            resource = unquote(urlsplit(route.request.url).path)
            relative = resource.removeprefix(mount) or "index.html"
            path = (root / relative).resolve()
            if not path.is_relative_to(root) or not path.is_file():
                return await route.fulfill(status=404, body="File unavailable")
            await route.fulfill(
                status=200,
                path=str(path),
                content_type=mimetypes.guess_type(str(path))[0]
                or "application/octet-stream",
            )

        await ctx.route(origin + mount + "**", artifact)
    if missing_cover:

        async def missing(route):
            if (
                route.request.resource_type == "image"
                and not route.request.url.endswith(".svg")
            ):
                return await route.abort("failed")
            return await route.fallback()

        await ctx.route("**/*", missing)
    page = await ctx.new_page()
    if clock:
        await page.clock.install()
    page.on("pageerror", lambda e: report.data["errors"].append(str(e)))
    if not missing_cover:
        page.on(
            "requestfailed",
            lambda req: report.data["failedRequests"].append(
                {"type": req.resource_type, "url": req.url, "reason": req.failure}
            ),
        )
    await page.goto(opts.url, wait_until="domcontentloaded", timeout=75000)
    await page.locator("#experience[data-phase]").wait_for(
        state="attached", timeout=25000
    )
    await page.evaluate("document.fonts.ready")
    return ctx, page


async def sample(page):
    return await page.evaluate(GEOMETRY)


async def active(page, index=None, decoded=True, near_center=True, timeout=12):
    end = time.monotonic() + timeout
    last = {}
    while time.monotonic() < end:
        last = await sample(page)
        if last["faces"]:
            f = last["faces"][0]
            box = f["front"]
            valid_x = abs(box["x"] + box["width"] / 2 - last["width"] / 2) < 8
            if (
                (index is None or f["index"] == index)
                and (f["decoded"] > 1 or not decoded)
                and (not near_center or valid_x)
            ):
                return last
        await asyncio.sleep(0.048)
    raise AssertionError(
        "Center did not settle or decode. "
        + str(
            {
                "phase": last.get("phase"),
                "index": index,
                "first": (last.get("faces") or [None])[0],
            }
        )[:550]
    )


async def details(page, opened=True):
    dialog = page.locator("#book-details[role=dialog]")
    await dialog.wait_for(state="visible" if opened else "hidden", timeout=9000)
    await page.wait_for_function(
        "(state) => state.includes(document.querySelector('#experience')?.dataset.phase)",
        arg=["details"] if opened else ["idle", "browsing"],
        timeout=10000,
    )
    return dialog


async def center_point(page, touch=False):
    scene = await active(page)
    f = scene["faces"][0]["front"]
    pt = (f["x"] + f["width"] / 2, f["y"] + f["height"] / 2)
    if touch:
        await page.touchscreen.tap(*pt)
    else:
        await page.mouse.click(*pt)
    return scene


def slim(scene):
    return {
        k: scene[k] for k in ("phase", "width", "height", "href", "nodes", "dialog")
    } | {
        "faces": [
            {
                "index": f["index"],
                "front": f["front"],
                "spine": f["spine"],
                "pose": f["pose"],
            }
            for f in scene["faces"][:3]
        ]
    }


async def screenshot(page, report, name, event=None, target=None):
    # These timestamps bracket the actual capture rather than assuming Playwright
    # took its screenshot exactly at the nominal phase.
    event_t = None
    if event:
        event_t = await page.evaluate(
            "(kind) => window.__qaEvents.filter(e=>e.type===kind).at(-1)?.t", event
        )
    if event_t is not None and target:
        now = await page.evaluate("performance.now()")
        await asyncio.sleep(max(0, (event_t + target - now) / 1000))
    before = await page.evaluate("performance.now()")
    state = await sample(page)
    await page.screenshot(
        path=report.folder / (name + ".png"), animations="allow", caret="hide"
    )
    after = await page.evaluate("performance.now()")
    report.data["frames"][name] = {
        "targetMs": target,
        "geometry": slim(state),
        "captureWindowMs": [round(before - event_t, 1), round(after - event_t, 1)]
        if event_t is not None
        else None,
    }
    report.write()


async def capture(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 1440, 900, clock=True)

    async def snap(name, t):
        await screenshot(pg, r, "desktop-" + name)
        r.data["frames"]["desktop-" + name]["virtualElapsedMs"] = t
        r.write()

    async def seek_dialog(ms, children=True):
        await pg.evaluate(
            """([ms,children])=>document.querySelector('#book-details')?.getAnimations({subtree:children})
            .forEach(a=>{a.pause();a.currentTime=ms;})""",
            [ms, children],
        )

    async def finish_dialog():
        await pg.evaluate("""()=>document.querySelector('#book-details')?.getAnimations({subtree:true})
            .forEach(a=>{if(a.effect?.getComputedTiming().endTime!==Infinity) a.finish();})""")

    async def click_control(name):
        box = await pg.get_by_role("button", name=name, exact=True).bounding_box()
        await pg.mouse.click(box["x"] + box["width"] / 2, box["y"] + box["height"] / 2)

    try:
        await active(pg, 0, timeout=45)
        # Load the exposed originals before freezing the virtual clock. A busy
        # CDN may deliver a neighboring cover after its first comparison frame.
        await pg.wait_for_function(
            """()=>{const images=[...document.querySelectorAll('.cover-front img[src]')];
          return images.length>=2 && images.every(i=>i.complete && i.naturalWidth>1);}""",
            timeout=70000,
        )
        await pg.mouse.move(4, 4)
        future = await pg.evaluate("Date.now()")
        await pg.clock.pause_at(datetime.fromtimestamp(future / 1000 + 0.35, tz=UTC))
        await pg.clock.run_for(850)
        await snap("idle", 0)
        for control, prefix in [("Następna książka", "next"), ("Poprzednia książka", "return")]:
            await click_control(control)
            await pg.clock.run_for(133)
            await snap(prefix + "-mid", 133)
            await pg.clock.run_for(2067)
            await snap(prefix, 2200)
        frame = await sample(pg)
        front = frame["faces"][0]["front"]
        await pg.mouse.click(frame["width"] / 2, front["y"] + front["height"] / 2 + 9)
        # Set both the JS time driving the shelf and the browser animation time.
        # Advancing just one leaves native Web Animations out of sync with RAF.
        await pg.clock.run_for(16)
        await seek_dialog(0)
        await pg.clock.run_for(509)
        await seek_dialog(525)
        await snap("open-mid", 525)
        await pg.clock.run_for(1875)
        await seek_dialog(2400)
        await snap("details", 2400)
        await finish_dialog()
        await pg.keyboard.press("Escape")
        await seek_dialog(0, False)
        await pg.clock.run_for(400)
        await seek_dialog(400, False)
        await snap("close-mid", 400)
        await finish_dialog()
        await pg.mouse.move(4, 4)
        await pg.clock.run_for(1500)
        await snap("restored", 1500)
        r.check("desktop captures complete", True)
    finally:
        await ctx.close()


async def inspect_view(browser, opts, r, width, height):
    ctx, pg = await context(browser, opts, r, width, height)
    label = f"{width}x{height}"
    touch = width < 1024
    try:
        scene = await active(pg, 0, timeout=45)
        f = scene["faces"][0]["front"]
        r.check(
            label + " focused cover inside viewport",
            f["x"] >= 0
            and f["y"] >= 0
            and f["x"] + f["width"] <= width + 0.5
            and f["y"] + f["height"] <= height + 0.5
            and scene["maxWidth"] <= width + 1,
            {**f, "documentWidth": scene["maxWidth"]},
        )
        if width != 1440:
            await asyncio.sleep(0.48)
            await screenshot(pg, r, f"mobile-{width}-idle")
        s = next((i["spine"] for i in scene["faces"] if i["index"] == 1), None)
        if s and s["x"] < width and s["x"] + s["width"] > 0:
            x = max(3, min(width - 3, s["x"] + s["width"] / 2))
            y = s["y"] + s["height"] / 2
            if touch:
                await pg.touchscreen.tap(x, y)
            else:
                await pg.mouse.click(x, y)
            await active(pg, 1, timeout=40)
            r.check(
                label + " tap/click neighboring spine focuses only",
                await pg.locator("[role=dialog]:visible").count() == 0,
            )
            await pg.get_by_role("button", name="Poprzednia książka").click()
            await active(pg, 0)
            await asyncio.sleep(0.50)
        else:
            r.check(label + " neighboring spine has a hit target", False)
        await center_point(pg, touch)
        dialog = await details(pg)
        await asyncio.sleep(1.15)
        title = await dialog.locator("h2").inner_text()
        r.check(
            label + " center opens requested title",
            TITLES[0].lower() in title.lower(),
            title,
        )
        if width != 1440:
            await screenshot(pg, r, f"mobile-{width}-details")
        await pg.get_by_role("button", name="Zamknij", exact=True).click()
        await details(pg, False)
        await pg.mouse.move(1, 1)
        restored = await active(pg, 0)
        r.check(
            label + " close returns to correct title and clears route",
            not restored["href"].startswith("#book/"),
        )
        r.check(
            label + " collection contains all personal books",
            await pg.locator("[data-book-index]").evaluate_all(
                "(els) => new Set(els.map(e=>e.dataset.bookIndex)).size"
            )
            == len(BOOKS),
        )
    finally:
        await ctx.close()


async def heap_sample(cdp):
    if not cdp:
        return None
    await cdp.send("HeapProfiler.collectGarbage")
    metrics = (await cdp.send("Performance.getMetrics"))["metrics"]
    return {
        m["name"]: round(m["value"])
        for m in metrics
        if m["name"] in {"JSHeapUsedSize", "Nodes", "Documents", "JSEventListeners"}
    }


async def cycles(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 1440, 900)
    try:
        original = await active(pg, 0, timeout=45)
        hashes = set()
        sources = set()
        first_nodes = original["nodes"]
        cdp = await ctx.new_cdp_session(pg) if opts.browser == "chromium" else None
        if cdp:
            await cdp.send("Performance.enable")
        heap_first = None
        for i, title in enumerate(TITLES):
            if i:
                await pg.get_by_role("button", name="Następna książka").click()
            await active(pg, i, timeout=45)
            await pg.mouse.move(1, 1)
            await asyncio.sleep(0.80)
            before = await active(pg, i)
            await center_point(pg)
            dialog = await details(pg)
            heading = await dialog.locator("h2").inner_text()
            route = await pg.evaluate("location.hash")
            text = " ".join((await dialog.inner_text()).split())
            front = before["faces"][0]
            await pg.wait_for_function(
                """()=>[...document.querySelectorAll('#book-details img')]
              .some(img=>img.complete&&img.naturalWidth>1)""",
                timeout=45000,
            )
            pixels = await dialog.evaluate("""d => [...d.querySelectorAll('img,image')].map(el =>
                ({url:el.currentSrc || el.href?.baseVal || el.getAttribute('src'), width:el.naturalWidth ?? null}))""")
            urls = [p["url"] for p in pixels if p["url"]]
            # Image href can be relative for local assets.
            image_in_detail = any(
                u == front["image"] or front["image"].endswith(u) for u in urls
            )
            good = (
                title.casefold() in heading.replace("‑", "-").casefold()
                and route.startswith("#book/")
                and front["decoded"] > 1
                and image_in_detail
                and route not in hashes
                and front["image"] not in sources
            )
            r.check(
                f"book {i + 1:02} title, unique edition texture and detail",
                good,
                {
                    "heading": heading,
                    "texture": front["image"],
                    "imageDimensions": [front["decoded"], front["decodedHeight"]],
                    "detailImages": pixels,
                    "route": route,
                },
            )
            hashes.add(route)
            sources.add(front["image"])
            r.check(
                f"book {i + 1:02} ISBN visible in details",
                bool(re.search(r"97[89](?:[- ]?\d){10}", text)),
            )
            await pg.get_by_role("button", name="Zamknij", exact=True).click()
            await details(pg, False)
            await pg.mouse.move(1, 1)
            await asyncio.sleep(0.35)
            after = await active(pg, i)
            r.check(
                f"book {i + 1:02} return to same slot",
                after["faces"][0]["index"] == i
                and not after["href"].startswith("#book/"),
            )
            if i == 0:
                heap_first = await heap_sample(cdp)
        heap_last = await heap_sample(cdp)
        if cdp:
            r.data["postGcHeap"] = {
                "afterFirstCycle": heap_first,
                "afterLastCycle": heap_last,
            }
        close_nodes = await pg.locator("[data-book-index]").count()
        await pg.mouse.move(1, 1)
        await asyncio.sleep(2)
        counters = await pg.evaluate("""async () => {
          const frames = window.__qaFrameCount, nodes = document.querySelectorAll('*').length;
          const a = document.getAnimations().filter(x=>x.playState==='running').length;
          await new Promise(r=>setTimeout(r,1000));
          return {appFrameCallbacks:window.__qaFrameCount-frames, nodesBefore:nodes,
            nodesAfter:document.querySelectorAll('*').length, runningAnimationsBefore:a,
            runningAnimationsAfter:document.getAnimations().filter(x=>x.playState==='running').length};
        }""")
        r.check(
            "no replica growth across fourteen cycles",
            close_nodes == first_nodes,
            {"before": first_nodes, "after": close_nodes},
        )
        r.check(
            "shelf rests without advancing frame callbacks or growing DOM",
            counters["appFrameCallbacks"] <= 2
            and counters["nodesBefore"] == counters["nodesAfter"],
            counters,
        )
    finally:
        await ctx.close()


async def hover_test(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 1440, 900)
    try:
        await active(pg, 0, timeout=45)
        await pg.mouse.move(4, 4)
        await asyncio.sleep(0.50)
        before = await sample(pg)
        initial = before["faces"][0]["front"]
        spine = next(f for f in before["faces"] if f["index"] == 1)["spine"]
        await pg.mouse.move(
            spine["x"] + spine["width"] / 2, spine["y"] + spine["height"] / 2
        )
        await asyncio.sleep(0.7)
        hovered = await sample(pg)
        lifted = next(f for f in hovered["faces"] if f["index"] == 1)["spine"]
        diff = spine["y"] - lifted["y"]
        r.check(
            "neighbor spine lifts while hovered",
            diff > 8,
            {"beforeY": spine["y"], "hoverY": lifted["y"], "liftPx": diff},
        )
        await screenshot(pg, r, "desktop-hover-spine")
        await pg.mouse.move(
            initial["x"] + initial["width"] * 0.75,
            initial["y"] + initial["height"] * 0.32,
        )
        await asyncio.sleep(0.75)
        tilted = await sample(pg)
        r.check(
            "center cover tips toward fine pointer",
            tilted["faces"][0]["pose"] != before["faces"][0]["pose"],
            tilted["faces"][0]["pose"],
        )
        await screenshot(pg, r, "desktop-hover-cover")
        await pg.mouse.move(4, 4)
        await asyncio.sleep(1.9)
        after = await sample(pg)
        box = after["faces"][0]["front"]
        differential = max(
            abs(box[k] - initial[k]) for k in ("x", "y", "width", "height")
        )
        r.check(
            "hover exit restores front-face geometry",
            differential < 1.5,
            {"maxBoundsDeltaPx": differential},
        )
    finally:
        await ctx.close()


async def interruptions(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 1440, 900)
    try:
        await active(pg, 0, timeout=45)
        groups = [
            ("Technologia", "Technologia i AI"),
            ("Reportaż", "Reportaż i biografie"),
            ("Literatura", "Literatura"),
            ("Produkt", "Produkt i strategia"),
        ]
        starts = {
            label: next(i for i, b in enumerate(BOOKS) if b["category"] == category)
            for label, category in groups
        }
        focused = starts["Technologia"]
        for category, i in [*starts.items(), ("Wszystkie", 0)]:
            await pg.get_by_role("button", name=category, exact=True).click()
            result = await active(pg, i, timeout=45)
            r.check(
                "category " + category,
                result["faces"][0]["index"] == i
                and len(
                    set(
                        await pg.locator("[data-book-index]").evaluate_all(
                            "(els)=>els.map(e=>e.dataset.bookIndex)"
                        )
                    )
                )
                == len(BOOKS),
            )
        # Real neighboring-spine input arrives before the earlier track movement settles.
        seen = []
        for x in (1200, 240, 1090, 290):
            hit = await pg.evaluate(
                "([x,y])=>document.elementFromPoint(x,y)?.closest('[data-book-index]')?.dataset.bookIndex",
                [x, 490],
            )
            if hit is not None:
                await pg.mouse.click(x, 490)
                seen.append(hit)
        await pg.get_by_role("button", name="Technologia", exact=True).click()
        result = await active(pg, focused, timeout=45)
        r.check(
            "quick target changes end at last category",
            len(seen) >= 2 and result["faces"][0]["index"] == focused,
            seen,
        )
        await asyncio.sleep(0.65)
        await center_point(pg)
        await pg.wait_for_timeout(120)
        await pg.keyboard.press("Escape")
        await details(pg, False)
        result = await active(pg, focused)
        r.check("Escape interrupts opening", not result["href"].startswith("#book/"))
        await pg.get_by_role("button", name="Otwórz książkę", exact=True).focus()
        await pg.keyboard.press("Enter")
        await details(pg)
        r.check(
            "Enter on accessible open control",
            await pg.locator("[role=dialog]:visible").count() == 1,
        )
        before_url = pg.url
        await pg.go_back()
        await details(pg, False)
        await pg.go_forward()
        dialog = await details(pg)
        r.check(
            "native history back and forward",
            pg.url == before_url
            and TITLES[focused] in await dialog.locator("h2").inner_text(),
        )
        # A direct visit must rebuild the same focused book; all history entries
        # also remain usable when a visitor reloads a detail deep link.
        await pg.reload(wait_until="domcontentloaded")
        dialog = await details(pg)
        r.check(
            "reloaded deep link opens the named book",
            TITLES[focused] in await dialog.locator("h2").inner_text(),
        )
        await pg.set_viewport_size({"width": 393, "height": 852})
        close = pg.get_by_role("button", name="Zamknij", exact=True)
        await close.click()
        await details(pg, False)
        await active(pg, focused)
        r.check("resize detail to phone then close", True)
        await pg.get_by_role("button", name="Następna książka").click()
        await pg.set_viewport_size({"width": 844, "height": 390})
        await active(pg, focused + 1)
        # A short landscape viewport scrolls to fit the track.
        await pg.locator(".track").scroll_into_view_if_needed()
        result = await active(pg, focused + 1)
        b = result["faces"][0]["front"]
        r.check(
            "resize during shelf motion preserves a target that can scroll into view",
            b["x"] >= -1 and b["y"] >= -1 and b["y"] + b["height"] <= 391,
            b,
        )
    finally:
        await ctx.close()


async def touches(browser, opts, r):
    if opts.browser != "chromium":
        return
    ctx, pg = await context(browser, opts, r, 390, 844)
    try:
        scene = await active(pg, 0, timeout=45)
        f = scene["faces"][0]["front"]
        y = f["y"] + f["height"] / 2
        cdp = await ctx.new_cdp_session(pg)

        async def gesture(start, stop):
            for j in range(9):
                t = j / 8
                x = start[0] + (stop[0] - start[0]) * t
                yy = start[1] + (stop[1] - start[1]) * t
                await cdp.send(
                    "Input.dispatchTouchEvent",
                    {
                        "type": "touchStart" if not j else "touchMove",
                        "touchPoints": [
                            {"x": x, "y": yy, "radiusX": 4, "radiusY": 4, "id": 1}
                        ],
                    },
                )
                await asyncio.sleep(0.017)
            await cdp.send(
                "Input.dispatchTouchEvent", {"type": "touchEnd", "touchPoints": []}
            )

        await gesture((262, y), (82, y + 3))
        await asyncio.sleep(1.8)
        after = await active(pg, timeout=45)
        r.check(
            "horizontal one-finger swipe browses without opening",
            after["faces"][0]["index"] != 0 and not after["href"].startswith("#book/"),
        )
        prior = after["faces"][0]["index"]
        await gesture((192, y + 100), (195, y - 75))
        await asyncio.sleep(0.5)
        after = await active(pg)
        r.check(
            "vertical gesture does not open or select a neighbor",
            after["faces"][0]["index"] == prior
            and not after["href"].startswith("#book/"),
        )
        await center_point(pg, True)
        dlg = await details(pg)
        scroll = await dlg.evaluate(
            "(d)=>({height:d.clientHeight,full:d.scrollHeight,before:d.scrollTop})"
        )
        if scroll["full"] > scroll["height"] + 5:
            await gesture((191, 675), (193, 210))
            await asyncio.sleep(0.4)
            delta = await dlg.evaluate("d=>d.scrollTop")
            r.check(
                "vertical detail content scrolls natively",
                delta > scroll["before"],
                {"before": scroll, "after": delta},
            )
        else:
            r.check(
                "detail content fits without vertical scrolling",
                scroll["full"] <= scroll["height"] + 5,
                scroll,
            )
        await pg.get_by_role("button", name="Zamknij", exact=True).tap()
        await details(pg, False)
    finally:
        await ctx.close()


async def catalog_test(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 1440, 900)
    try:
        await active(pg, 0, timeout=45)
        await pg.get_by_role("link", name="Katalog", exact=True).click()
        await pg.get_by_role("heading", name="Katalog ważnych książek").wait_for()
        rows = pg.locator(".catalog-list > li")
        r.check("catalog lists all personal titles", await rows.count() == len(BOOKS))
        await pg.get_by_role("button", name="Produkt", exact=True).click()
        selected = [book for book in BOOKS if book["category"] == "Produkt i strategia"]
        names = await rows.locator("h2").all_text_contents()
        r.check("catalog filters to Product titles", names == [b["title"] for b in selected], names)
        await rows.locator("h2 a").first.click()
        dlg = await details(pg)
        r.check(
            "catalog title links to matching physical book details",
            selected[0]["title"] in await dlg.locator("h2").inner_text()
            and pg.url.endswith("#book/" + selected[0]["id"]),
        )
        await pg.go_back()
        await pg.get_by_role("heading", name="Katalog ważnych książek").wait_for()
        r.check(
            "browser Back from catalog-selected book restores catalog URL",
            pg.url.endswith("/catalog.html"),
        )
        await pg.get_by_role("button", name="Wszystkie", exact=True).click()
        r.check("catalog can restore all titles after Back", await rows.count() == len(BOOKS))
    finally:
        await ctx.close()


async def live_smoke(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 390, 844)
    try:
        s = await active(pg, 0, timeout=60)
        r.check(
            "live shelf and publisher cover rendered",
            s["faces"][0]["decoded"] > 1,
            s["faces"][0]["image"],
        )
        await pg.get_by_role("button", name="Następna książka").click()
        s = await active(pg, 1, timeout=70)
        r.check(
            "live cover of the next book decoded",
            s["faces"][0]["decoded"] > 1,
            s["faces"][0]["image"],
        )
        await center_point(pg, True)
        dlg = await details(pg)
        r.check(
            "live touch opens correct detail",
            TITLES[1] in await dlg.locator("h2").inner_text(),
        )
        await pg.get_by_role("button", name="Zamknij", exact=True).tap()
        await details(pg, False)
        s = await active(pg, 1)
        r.check("live touch returns to selected book", s["faces"][0]["index"] == 1)
    finally:
        await ctx.close()


async def warm_memory(browser, opts, r):
    # Use one title and reduced motion to isolate repeated allocation from
    # network, typefaces, and first-time texture decode. The separate full
    # catalogue cycle uses ordinary unreduced animations.
    ctx, pg = await context(browser, opts, r, 1440, 900, reduced=True)
    try:
        await active(pg, 0, timeout=45)
        cdp = await ctx.new_cdp_session(pg) if opts.browser == "chromium" else None
        if cdp:
            await cdp.send("Performance.enable")
        await pg.evaluate("""()=>{
          window.__qaRetired=[];
          const observer=new MutationObserver(changes=>{
            for (const change of changes) for (const n of change.removedNodes) {
              if (n.nodeType===1 && n.id==='book-details') window.__qaRetired.push(new WeakRef(n));
            }
          });
          observer.observe(document.querySelector('#experience'),{childList:true,subtree:true});
        }""")

        async def batch(count):
            await pg.get_by_role("button", name="Otwórz książkę", exact=True).focus()
            for _ in range(count):
                await pg.keyboard.press("Enter")
                handle = await pg.wait_for_function(
                    "document.querySelector('#experience')?.dataset.phase==='details'"
                )
                await handle.dispose()
                await pg.keyboard.press("Escape")
                handle = await pg.wait_for_function(
                    "document.querySelector('#experience')?.dataset.phase==='idle'"
                )
                await handle.dispose()

        async def measure():
            await asyncio.sleep(0.30)
            await pg.request_gc()
            await asyncio.sleep(0.15)
            native = await heap_sample(cdp)
            if cdp:
                native["domCounters"] = await cdp.send("Memory.getDOMCounters")
            summary = await pg.evaluate("""()=>({nodes:document.querySelectorAll('*').length,
              copies:document.querySelectorAll('[data-book-index]').length,
              liveDialogs:document.querySelectorAll('#book-details').length,
              retired:window.__qaRetired.length, referenced:window.__qaRetired.filter(r=>r.deref()).length,
              activeAnimations:document.getAnimations().filter(a=>a.playState==='running').length})""")
            return {"dom": summary, "native": native}

        await batch(3)
        before = await measure()
        await batch(14)
        first = await measure()
        await batch(14)
        last = await measure()
        samples = {"warmup3": before, "after14": first, "after28": last}
        r.data["warmMemory"] = samples
        r.check(
            "two warm 14-cycle batches preserve shelf DOM and release retired dialogs",
            last["dom"]["nodes"] == before["dom"]["nodes"]
            and last["dom"]["copies"] == before["dom"]["copies"]
            and last["dom"]["liveDialogs"] == 0
            and last["dom"]["referenced"] <= 1
            and last["dom"]["activeAnimations"] == 0,
            samples,
        )
        if cdp:
            growth = (
                last["native"]["JSHeapUsedSize"] - first["native"]["JSHeapUsedSize"]
            )
            r.check(
                "post-GC JS heap growth in second warm 14-cycle batch stays below 256 KiB",
                growth < 256 * 1024,
                {"bytes": growth, "first": first["native"], "second": last["native"]},
            )
    finally:
        await ctx.close()


async def performance_test(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 1440, 900)
    try:
        await active(pg, 0, timeout=45)
        await pg.get_by_role("button", name="Następna książka").click()
        await active(pg, 1, timeout=45)
        await pg.get_by_role("button", name="Poprzednia książka").click()
        await active(pg, 0, timeout=45)
        await asyncio.sleep(0.9)
        await pg.evaluate("""()=>{window.__qaGaps=[];window.__qaCollect=true;
          let last=0;const tick=t=>{if(last)window.__qaGaps.push(t-last);last=t;
            if(window.__qaCollect)requestAnimationFrame(tick);};requestAnimationFrame(tick);}""")
        await pg.get_by_role("button", name="Następna książka").click()
        await active(pg, 1)
        await asyncio.sleep(0.55)
        await center_point(pg)
        await details(pg)
        await asyncio.sleep(0.6)
        await pg.get_by_role("button", name="Zamknij", exact=True).click()
        await details(pg, False)
        numbers = await pg.evaluate(
            "()=>{window.__qaCollect=false;return window.__qaGaps;}"
        )
        if not numbers:
            return r.check("animation frame timings collected", False)
        t = sorted(numbers)
        result = {
            "n": len(t),
            "p50Ms": round(t[len(t) // 2], 1),
            "p95Ms": round(t[round((len(t) - 1) * 0.95)], 1),
            "maxMs": round(t[-1], 1),
            "over50ms": sum(v > 50 for v in t),
        }
        r.data["frameTimes"] = result
        r.check(
            "warm navigation, reveal and return rendered without a 250 ms pause",
            t[-1] < 250,
            result,
        )
    finally:
        await ctx.close()


async def recording(browser, opts, r):
    if opts.browser != "chromium":
        return
    with tempfile.TemporaryDirectory(prefix="bookshelf-recording-") as folder:
        ctx, pg = await context(browser, opts, r, 1440, 900, video_dir=folder)
        video = pg.video
        clock = time.monotonic
        marks = {}
        await active(pg, 0, timeout=45)
        marks["idle"] = clock()
        await pg.wait_for_timeout(650)
        for name, control in [("next", "Następna książka"), ("previous", "Poprzednia książka")]:
            marks[name] = clock()
            await pg.get_by_role("button", name=control).click()
            await pg.wait_for_timeout(1400)
        f = (await sample(pg))["faces"][0]["front"]
        x = f["x"] + f["width"] / 2
        y = f["y"] + f["height"] / 2
        marks["hover"] = clock()
        await pg.mouse.move(x + 40, y - 60)
        await pg.wait_for_timeout(450)
        marks["open"] = clock()
        await pg.mouse.click(x, y)
        await pg.wait_for_timeout(2400)
        marks["close"] = clock()
        await pg.get_by_role("button", name="Zamknij", exact=True).click()
        await details(pg, False)
        await pg.wait_for_timeout(450)
        marks["end"] = clock()
        await ctx.close()
        path = Path(await video.path())
        seconds = marks["end"] - marks["idle"]
        target = r.folder / "desktop-native-interaction.mp4"
        # Cut the loading lead-in. The rest is one uninterrupted native-speed take.
        if shutil.which("ffmpeg"):
            await asyncio.to_thread(
                subprocess.run,
                [
                    "ffmpeg",
                    "-hide_banner",
                    "-loglevel",
                    "error",
                    "-y",
                    "-sseof",
                    f"-{seconds:.3f}",
                    "-i",
                    str(path),
                    "-c:v",
                    "libx264",
                    "-an",
                    "-threads",
                    "2",
                    "-movflags",
                    "+faststart",
                    "-pix_fmt",
                    "yuv420p",
                    str(target),
                ],
                check=True,
            )
        else:
            target = target.with_suffix(".webm")
            shutil.copy2(path, target)
        r.data["recording"] = {
            "file": target.name,
            "seconds": round(seconds, 2),
            "secondsFromIdle": {
                k: round(v - marks["idle"], 3) for k, v in marks.items()
            },
        }
        r.check(
            "native-speed interaction recording",
            target.stat().st_size > 2000,
            r.data["recording"],
        )


async def retina_test(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 393, 852, profile=opts.phone)
    try:
        await active(pg, 0, timeout=45)
        await center_point(pg, True)
        await details(pg)
        state = await pg.evaluate("""()=>({dpr:devicePixelRatio, touch:navigator.maxTouchPoints, input:window.__qaEvents.filter(e=>e.type==='pointerdown').at(-1)?.pointerType,
             viewport:[innerWidth,innerHeight], current:location.hash,
             canvas:[...document.querySelectorAll('#book-details canvas')].map(c=>[c.width,c.height])})""")
        r.check(
            "iPhone profile opens with touch at device pixel ratio 3",
            state["dpr"] == 3
            and state["input"] == "touch"
            and state["current"].startswith("#book/"),
            state,
        )
        if state["canvas"]:
            r.check(
                "reveal texture allocation remains bounded on Retina",
                all(w * h < 1000000 for w, h in state["canvas"]),
                state["canvas"],
            )
        await pg.get_by_role("button", name="Zamknij", exact=True).tap()
        await details(pg, False)
    finally:
        await ctx.close()


async def variants(browser, opts, r):
    ctx, pg = await context(browser, opts, r, 393, 852, reduced=True)
    try:
        await active(pg, 0, timeout=45)
        await center_point(pg, True)
        await details(pg)
        times = await pg.evaluate("""() => ({event:window.__qaEvents.filter(e=>e.type==='click').at(-1)?.t,
          end:performance.now(),animations:document.getAnimations().filter(a=>a.playState==='running').length})""")
        r.check(
            "reduced-motion detail appears without long animation",
            times["end"] - times["event"] < 400,
            times,
        )
        await pg.get_by_role("button", name="Zamknij", exact=True).tap()
        await details(pg, False)
    finally:
        await ctx.close()
    ctx, pg = await context(
        browser, opts, r, 393, 852, reduced=True, missing_cover=True
    )
    try:
        await active(pg, 0, decoded=False)
        await asyncio.sleep(0.35)
        await pg.get_by_role("button", name="Otwórz książkę", exact=True).focus()
        await pg.keyboard.press("Enter")
        dlg = await details(pg)
        words = " ".join((await dlg.inner_text()).split())
        r.check(
            "image failure exposes notice and preserves catalog access",
            "Okładka niedostępna" in words,
            words[:500],
        )
        await pg.get_by_role("button", name="Zamknij", exact=True).tap()
        await details(pg, False)
    finally:
        await ctx.close()


async def run(opts):
    async with async_playwright() as p:
        opts.phone = p.devices["iPhone 15 Pro"]
        engine = getattr(p, opts.browser)
        launch = {}
        executable = opts.executable or os.environ.get(
            "BOOKSHELF_" + opts.browser.upper()
        )
        if executable:
            launch["executable_path"] = executable
        browser = await engine.launch(**launch)
        r = Results(opts, browser.version)

        async def check_suite(name, fn, *args):
            try:
                await fn(browser, opts, r, *args)
            except (
                AssertionError,
                BrowserError,
                OSError,
                RuntimeError,
                StopIteration,
                subprocess.CalledProcessError,
            ) as error:
                r.check(name + " completed", False, repr(error)[:700])

        try:
            for suite in opts.suites.split(","):
                if suite == "views":
                    for width, height in VIEWPORTS:
                        await check_suite(
                            f"{width}x{height}", inspect_view, width, height
                        )
                else:
                    await check_suite(
                        suite,
                        {
                            "capture": capture,
                            "cycles": cycles,
                            "interruptions": interruptions,
                            "touch": touches,
                            "hover": hover_test,
                            "variants": variants,
                            "performance": performance_test,
                            "memory": warm_memory,
                            "catalog": catalog_test,
                            "live": live_smoke,
                            "retina": retina_test,
                            "video": recording,
                        }[suite],
                    )
            r.check(
                "no uncaught browser exceptions", not r.data["errors"], r.data["errors"]
            )
        finally:
            await browser.close()
        n = Counter(c["pass"] for c in r.data["checks"])
        r.write()
        print(
            f"{opts.browser} {r.data['version']}: {n[True]} passed, {n[False]} failed.",
            flush=True,
        )
        return 1 if n[False] else 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--browser", choices=["chromium", "webkit"], default="chromium")
    parser.add_argument(
        "--executable", help="optional path to an existing browser binary"
    )
    parser.add_argument(
        "--static-dir",
        type=Path,
        help="mount exact built assets inside this test browser when its preview network is isolated",
    )
    parser.add_argument("--out", type=Path, default=Path("qa/output"))
    parser.add_argument(
        "--suites",
        default="capture,views,cycles,interruptions,hover,touch,variants,retina,performance,memory,catalog",
    )
    parser.add_argument(
        "--system-fetch",
        action="store_true",
        help="use system CA/proxy for public HTTPS resources",
    )
    raise SystemExit(asyncio.run(run(parser.parse_args())))
