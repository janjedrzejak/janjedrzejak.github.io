# Jan Jędrzejak — portfolio redesign

## Build and publish

GitHub Actions renders the root HTML sources into `_site/`, validates local links and SEO, then publishes that directory to GitHub Pages. Do not upload the root sources directly.

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_site.py
python scripts/validate_site.py
```

The existing English URLs are preserved. Polish equivalents use `/pl/`. Edit bilingual data attributes in the root HTML files, home translations in `scripts/home-pl.json`, and page metadata in `scripts/seo-pages.json`. The language selector is a normal link to the equivalent translated URL; internal links preserve that language. No localStorage language preference overrides the URL.

See [SEO.md](SEO.md) for implementation details, validation scope and measurement guidance.

## Responsive regression preview

Build `_site/` first, then run `npm ci` and `npm run dev`. Vite is a development-only preview; GitHub Pages still publishes the Python build without a Node dependency. The preview-only `/__qa?width=390&height=844&path=/pl/` route embeds the built page in a same-origin viewport. It is not included in the published site. Rebuild after source changes.

Check 320, 390 and 430 CSS-pixel widths, both languages, and menu, cookie settings and chat open/close cycles at the footer. Compare `document.scrollingElement.scrollHeight` with `.site-footer.getBoundingClientRect().bottom + window.scrollY` (within 2 px), and check horizontal overflow and link visibility. Use `.site-footer`, since the cookie modal also contains a `footer`. Iframe testing covers responsive layout; test touch gestures and software-keyboard behavior separately on real mobile browsers.

## AI portfolio guide
The site-wide AI guide is implemented in `chatbot.js` and `chatbot.css`. It follows the page language, keeps conversation state only in memory and sends bounded requests to a server-side API.

The Groq API key must remain a server-side secret. Never add it to this repository, frontend JavaScript, HTML, GitHub Actions variables exposed to builds or browser storage. The public endpoint URL is configured as `CHAT_API_URL` in `chatbot.js`.

When the provider, hosting or data flow changes, review `privacy.html` and `cookies-policy.html`.

## Portrait

The page uses `img/me.webp`, a compressed version of the existing 1760 × 2432 portrait. Its composition and dimensions are unchanged. The original JPG remains available at its previous URL.

## Legal review
The privacy and cookie pages reflect the current static portfolio configuration. Review them before publication and whenever hosting, analytics, forms, embedded media or other providers change.
