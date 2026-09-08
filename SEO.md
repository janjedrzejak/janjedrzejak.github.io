# SEO and AEO implementation, 8 September 2026

The site previously relied on JavaScript to switch English to Polish at the same URL. Several article bodies contained only short fallback sentences in their HTML; complete paragraphs lived in data attributes. Polish articles could not be linked or indexed independently. The source also referenced missing favicon, manifest, touch-icon and social-image files. The Raspberry Pi guide contained incorrect memory specifications and unsubstantiated capacity claims.

## What is published

The English URLs remain unchanged. Equivalent Polish pages use `/pl/`, including `/pl/blog.html`, `/pl/projects.html` and `/pl/blog-posts/*.html`. Both versions deliver complete content directly in HTML. The language control navigates to the equivalent page with a normal link, and internal navigation remains in the selected language. No browser preference overrides a URL's language.

Each language has a self-referencing canonical URL, reciprocal `en`/`pl`/`x-default` alternates, unique titles and descriptions, consistent social metadata and localized structured data. Articles include source-linked authorship, visible publication and modification dates, a table of contents, direct answers and related reading. Breadcrumb markup matches the visible navigation. Person credentials remain connected to the existing verification sources. No ratings, customer results, commercial services or certifications have been invented.

The homepage introduces the main topics directly and links to three practical guides. Existing articles about automation, API integration and AI project management now include usable checklists and clearly illustrative examples. The Raspberry Pi article has a complete Polish version and a revised, scoped Docker learning example. Its commands have not been tested on physical Raspberry Pi hardware. Existing publication dates are preserved; actual editorial changes are recorded as 2026-09-08.

The portrait is transcoded without changing its dimensions or composition: 1,108,223 bytes to 394,996 bytes (64.4% smaller). Missing asset references and the unused external copy of the consent library are removed. Local scripts load with `defer`, and the main hero text is visible immediately. The existing GA4 identifier, Search Console verification, consent choices, chatbot endpoint, mobile overflow repairs and project filters remain in place. The old language-storage statement was removed from the policies because language now follows the URL.

## Build and validation

```sh
python -m pip install -r scripts/requirements.txt
python scripts/build_site.py
python scripts/validate_site.py
```

Edit the root English HTML sources and their bilingual `data-en`/`data-pl` attributes. Home translations live in `scripts/home-pl.json`; page metadata and genuine modification dates live in `scripts/seo-pages.json`. The build renders `_site/`, strips translation attributes and generates the sitemap. Do not edit generated output.

The publication workflow builds and validates before uploading `_site/`. Validation checks all 24 HTML pages: local assets, internal links and fragments, one H1, unique titles/descriptions, canonical URLs, language alternates, structured data, visible dates, complete article bodies, no-JavaScript visibility rules and sitemap coverage. The NFC utility page and error page remain `noindex`. A sitemap entry means that a URL is available for indexing; it does not mean Google has indexed it.

## Search topics and measurement

| Topic / intent | Primary Polish page |
| --- | --- |
| Jan Jędrzejak, automatyzacja n8n, AI, integracje API | `/pl/` |
| n8n Raspberry Pi, n8n Docker, instalacja n8n | `/pl/blog-posts/n8n-raspberry-pi.html` |
| dlaczego automatyzacja nie działa, checklista workflow | `/pl/blog-posts/automation-failures.html` |
| integracja systemów API, kontrakt danych, idempotencja | `/pl/blog-posts/system-integration.html` |
| AI w zarządzaniu projektami | `/pl/blog-posts/ai-project-management.html` |
| n8n Professional Certificate | `/pl/blog-posts/n8n-professional-certificate.html` |
| SnapClip, menedżer schowka macOS | `/pl/blog-posts/snapclip.html` |

These are relevance-based targets, not measured keyword-volume or ranking claims. Search Console and GA4 account reports were not available for this implementation. No starting traffic, CTR, ranking, conversion or Core Web Vitals result has been inferred.

After publication, submit or re-check `https://janjedrzejak.github.io/sitemap.xml` in Search Console and inspect the Polish homepage plus the main guides. Compare comparable periods and separate branded from non-branded queries, PL from EN URLs, and country/device where sample size permits. Use clicks and qualified contact/CV interactions as outcomes; use impressions, CTR and indexation to diagnose progress. Existing consent-based GA4 tracks email, phone, LinkedIn, CV downloads, article opens, scroll depth and web vitals. No analytics is enabled before consent.

Further content should follow actual query data and verified experience. Good candidates for validation include HTTP 429 handling in n8n, missing records in automated reports and choosing webhook versus scheduled synchronization. A useful article should solve a specific problem, include reproducible examples and clearly state limits. Avoid near-duplicate keyword pages, invented case metrics and mass-produced filler.

Google states that AI Overviews and AI Mode use the same SEO fundamentals and do not require special AI files or special schema. This implementation makes text and sources accessible; it does not promise AI citations, indexation or a particular ranking.

## Primary references

- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: localized versions and hreflang](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: article structured data](https://developers.google.com/search/docs/appearance/structured-data/article)
- [Raspberry Pi 3 Model B+ specification](https://www.raspberrypi.com/products/raspberry-pi-3-model-b-plus/)
- [n8n official repository and Docker example](https://github.com/n8n-io/n8n)
- [Docker: Debian installation](https://docs.docker.com/engine/install/debian/)
- [Docker: published ports](https://docs.docker.com/engine/network/port-publishing/)
