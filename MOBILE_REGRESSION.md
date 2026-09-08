# Mobile footer regression — 2026-09-08

## Environment and result

PASS in Chrome with real responsive CSS layout inside a same-origin iframe served by the development-only Vite preview. Frame widths: 320, 390 and 430 CSS px; height: 844 px. This is responsive browser testing, **not physical iOS/Safari testing or mobile-device emulation**. Safe-area insets and an actual mobile keyboard were not emulated.

The reported very large area beyond the footer was not reproduced in the baseline Chrome layout, including menu, chat and cookie-dialog cycles. The verified change reduces excessive spacing inside the mobile footer, while keeping utility buttons clear of its copyright text. Do not describe this test as proof of an iOS-specific root cause.

Measurements use `.site-footer`; a generic `footer` selector would incorrectly select the hidden cookie-dialog footer. Gap = documentElement.scrollHeight − (.site-footer.getBoundingClientRect().bottom + scrollY). Subpixel differences up to 0.5 px result from integer scrollHeight rounding.

## Before / after: Polish homepage, 390 × 844

| Measurement | Baseline | Final |
|---|---:|---:|
| Document scrollHeight | 15496 | 15460 |
| Body / footer bottom | 15495.78125 | 15459.78125 |
| Space beyond footer | 0.21875 | 0.21875 |
| ScrollY at end | 14652 | 14616 |
| Horizontal overflow | 0 | 0 |

Final footer is 36 px shorter. At the end of the page, copyright bottom is 775.78125 px and chat launcher top is 780 px: **4.21875 px clearance**. Visual inspection confirmed the footer ends with the page and the fixed controls do not overlap its copyright.

## Final responsive matrix

Each cell is document scrollHeight / footer bottom (CSS px). All 21 combinations had horizontal overflow 0 and absolute footer gap ≤ 0.5 px. These full-document geometry checks were taken after page load at scrollY 0; the Polish homepage additionally received end-of-page visual and interaction checks.

| Page | 320 px | 390 px | 430 px |
|---|---:|---:|---:|
| `/` | 15965 / 15964.688 | 14967 / 14966.813 | 14609 / 14609.219 |
| `/pl/` | 16729 / 16729.344 | 15460 / 15459.781 | 15143 / 15142.781 |
| `/pl/projects.html` | 9174 / 9174.453 | 8307 / 8306.906 | 8112 / 8111.719 |
| `/pl/blog.html` | 5504 / 5503.500 | 5033 / 5033.375 | 4849 / 4848.641 |
| `/pl/blog-posts/n8n-raspberry-pi.html` | 9949 / 9948.828 | 8437 / 8436.766 | 7785 / 7784.953 |
| `/pl/privacy.html` | 7479 / 7479.109 | 6352 / 6352.266 | 5898 / 5897.906 |
| `/pl/cookies-policy.html` | 4276 / 4276.344 | 3848 / 3847.828 | 3709 / 3708.641 |

## Interaction regression at the footer

At 390 × 844 on `/pl/`, independently verified opening and closing the mobile menu, AI chat, and cookie preferences. After each completed close: scrollY 14616, scrollHeight 15460, footer gap 0.21875 px, horizontal overflow 0, and no `page-scroll-locked` class. The baseline also passed these cycles.

One immediate click on “Zapisz i zamknij” during cookie-dialog opening did not close the still-rendered dialog. DOM inspection confirmed it remained open; a subsequent click on the ready dialog closed it and released the scroll lock correctly. No chat message or external contact form was submitted.

## Additional checks and scope

The initial generated site passed `python scripts/validate_site.py`: 24 HTML pages / 22 indexable URLs, local links and fragments, metadata, language links, structured data and sitemap. The root agent owns the final build validation and publication checks.

Public baseline desktop (1363 × 936) also had footer gap within ±0.5 px on Polish home, projects, blog, privacy, cookies and Raspberry Pi article. Mobile results above are from the local final build, not a claim of a physical-phone production test.
