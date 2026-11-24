"""Verify the final composited frame from a WebKit recording on Linux/WPE."""

import argparse
import asyncio
import subprocess
import tempfile
import time
from pathlib import Path

from browser_qa import VIEWPORTS, Results, active, center_point, context, details
from PIL import Image
from playwright.async_api import async_playwright


async def test(browser, opts, report, directory, width, height):
    ctx, page = await context(browser, opts, report, width, height, video_dir=directory)
    video = page.video
    scene = await active(page, 0, timeout=45)
    await page.wait_for_function(
        """()=>{const candidates=[...document.querySelectorAll('[data-book-id="csapp"] .cover-front')];
      const selected=candidates.filter(f=>getComputedStyle(f).visibility!=='hidden').sort((a,b)=>
        Math.abs(a.getBoundingClientRect().x+a.getBoundingClientRect().width/2-innerWidth/2)
        -Math.abs(b.getBoundingClientRect().x+b.getBoundingClientRect().width/2-innerWidth/2))[0];
      const img=selected?.querySelector('img');
      return img?.dataset.status==='loaded' && img.naturalWidth>1 && selected.style.backgroundImage.includes(img.currentSrc);
    }""",
        timeout=60000,
    )
    loaded = await page.evaluate("""async()=>{await Promise.all(
      [...document.querySelectorAll('[data-book-id="csapp"] .cover-front img[src]')].map(img=>img.decode()));
      await document.fonts.load('40px "Instrument Serif"');
      await document.fonts.ready;
      return {msFromNavigation:Math.round(performance.now()),fontState:document.fonts.status,
        cover:getComputedStyle(document.querySelector('h1')).fontFamily};}""")
    # Do not derive a visually ready frame from response headers alone. Allow
    # the video-producing compositor to present its full-resolution layers.
    await page.wait_for_timeout(3000)
    idle = time.monotonic()
    await page.wait_for_timeout(850)
    await center_point(page, width < 1024)
    await details(page)
    await page.wait_for_timeout(1550)
    detail = time.monotonic()
    await page.wait_for_timeout(500)
    end = time.monotonic()
    await ctx.close()
    out = report.folder / f"{width}x{height}.webm"
    await video.save_as(out)
    duration = float(
        await asyncio.to_thread(
            subprocess.check_output,
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                str(out),
            ],
        )
    )
    phases = {"idle": idle, "details": detail}
    name = f"mobile-{width}" if width < 1024 else "desktop"
    for phase, at in phases.items():
        ts = max(0, duration - (end - at))
        frame = report.folder / f"{name}-{phase}.png"
        await asyncio.to_thread(
            subprocess.run,
            [
                "ffmpeg",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                str(ts),
                "-i",
                str(out),
                "-frames:v",
                "1",
                "-threads",
                "1",
                str(frame),
            ],
            check=True,
        )
        if phase == "idle":
            box = scene["faces"][0]["front"]
            with Image.open(frame) as image:
                crop = image.convert("RGB").crop(
                    (
                        int(box["x"] + box["width"] * 0.22),
                        int(box["y"] + box["height"] * 0.32),
                        int(box["x"] + box["width"] * 0.77),
                        int(box["y"] + box["height"] * 0.75),
                    )
                )
                palette = crop.getcolors(crop.width * crop.height)
            colorful = sum(
                count for count, rgb in palette if max(rgb) - min(rgb) > 32
            ) / sum(count for count, rgb in palette)
            tests = {
                "orange": lambda r, g, b: r > 135 and r > g + 19 and g > b + 14,
                "green": lambda r, g, b: g > 100 and g > r + 10 and g > b + 10,
                "violet": lambda r, g, b: b > 90 and b > g + 14 and r > g + 5,
                "cyan": lambda r, g, b: b > 105 and g > 100 and min(g, b) > r + 15,
            }
            fractions = {
                k: sum(count for count, rgb in palette if f(*rgb))
                / (crop.width * crop.height)
                for k, f in tests.items()
            }
            report.check(
                f"{width}x{height} composited pixels paint CSAPP cover",
                len(palette) > 256 and min(fractions.values()) > 0.003,
                {
                    "saturatedFraction": round(colorful, 3),
                    "artworkColorFractions": {
                        k: round(v, 3) for k, v in fractions.items()
                    },
                    "sampleRegion": "central artwork of the verified CSAPP cover",
                    "readiness": loaded,
                    "timestampSeconds": round(ts, 2),
                },
            )
    print(f"{width}x{height} composited recording and frames captured", flush=True)


async def main(opts):
    async with async_playwright() as playwright:
        browser = await playwright.webkit.launch(
            **({"executable_path": opts.executable} if opts.executable else {})
        )
        report = Results(opts, browser.version)
        try:
            with tempfile.TemporaryDirectory(
                prefix="bookshelf-webkit-composite-"
            ) as tmp:
                for w, h in VIEWPORTS:
                    if opts.widths and w not in opts.widths:
                        continue
                    await test(browser, opts, report, Path(tmp), w, h)
        finally:
            await browser.close()
        return int(any(not c["pass"] for c in report.data["checks"]))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--widths",
        type=int,
        nargs="+",
        help="select widths from the canonical viewport matrix",
    )
    parser.add_argument("url")
    parser.add_argument("--out", type=Path, default=Path("qa/output/composited"))
    parser.add_argument("--executable")
    parser.add_argument("--static-dir", type=Path)
    parser.add_argument("--system-fetch", action="store_true")
    options = parser.parse_args()
    options.browser = "webkit"
    raise SystemExit(asyncio.run(main(options)))
