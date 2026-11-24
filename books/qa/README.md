# Browser acceptance tests

Build and serve the project. Run the tests against the resulting origin from a separate terminal. The tests read the personal collection from the book data file. They drive real browser engines and take screenshots from those engines.

```sh
python -m pip install playwright pillow
python -m playwright install chromium webkit
python qa/browser_qa.py http://localhost:4173/ --out qa/output
python qa/browser_qa.py http://localhost:4173/ --browser webkit --out qa/output
```

Use `--executable` to select an existing compatible headless browser. An optional `--system-fetch` mode uses the operating system’s TLS-validating HTTPS transport on managed runners whose browser lacks upstream proxy configuration. The normal mode uses the native browser network. The failure scenario deliberately aborts image requests in an isolated context. The other scenarios request real assets.

The viewport matrix uses 390 × 844, 393 × 852, 430 × 932, 768 × 1024 and 1440 × 900 CSS pixels. The four smaller viewports enable mobile and touch emulation. Comparison captures use DPR 1 so each image pixel corresponds to one CSS pixel. A separate iPhone 15 Pro device-profile test uses DPR 3 and a genuine touch event. Functional checks use the natural browser clock. Linux WebKit supplies Safari-engine coverage. Physical device results should be recorded separately.

Choose a subset with `--suites views,cycles,interruptions,touch,variants`. The desktop `capture` suite uses an emulated animation clock to reproduce the original measurement times. Its steps select the next book, restore the first, enter details and exit using Escape. The midpoint of each adjacent move is captured at 133 ms. The detail reveal is captured at 525 and 2400 ms and the return at 400 ms. The automated Chromium gesture suite sends a single real touch stream through CDP. Functional coverage includes keyboard input, browser history, all available books, interrupted motion, resize, texture failure, reduced motion, stable DOM size and idle animation callbacks.

Each engine writes `results.json` and actual viewport PNGs under its own output directory. A failed assertion returns a nonzero status. To assemble comparison sheets from a prior reference recording, pass the recording folder containing its PNGs and geometry logs.

```sh
python qa/compare.py path/to/reference qa/output/chromium qa/output/comparison
```

The geometry report compares axis-aligned rectangles of the front face and records the largest discrepancy between corresponding edges in CSS pixels. It supplements direct visual review of the image sheets.


A managed preview can live in a different network namespace from the automation runner. In that case add `--static-dir dist` to mount the exact production assets inside the test browser. The report labels this build-only transport. Omit it for verification of a publicly deployed origin.

The `memory` suite measures two warm batches of fourteen open/close cycles of the same title and compares surviving dialog weak references after collection. Chromium also reports heap size and native DOM counters. The `performance` suite samples frame intervals during one warm navigation, opening and closing. Run it on its own for a meaningful local measurement. Add `video` to record an uninterrupted desktop take.

Some WPE WebKit snapshot APIs omit accelerated CSS 3D layers. The following test captures the browser compositor video, extracts the settled shelf and details frames at every viewport, and verifies that the central artwork actually painted. FFmpeg and FFprobe must be on PATH.

```sh
python qa/composited_webkit.py http://localhost:4173/ --out qa/output/composited
```
