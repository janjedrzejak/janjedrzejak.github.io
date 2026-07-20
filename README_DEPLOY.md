# Jan Jędrzejak — portfolio redesign

## Files to deploy
Copy the package contents into the root of `janjedrzejak/janjedrzejak.github.io`.

Core files:
- `index.html`, `home.css`, `home.js`
- `projects.html`, `blog.html`, `privacy.html`, `cookies-policy.html`
- `pages.css`, `pages.js`
- `blog-posts/*.html`
- `img/favicon.svg`, PNG/ICO variants and `site.webmanifest`

The redesign references existing repository assets:
- `img/me.jpg` — portrait (source dimensions 632 × 640)
- `img/og-image.jpg`
- `resJanJedrzejakCV.pdf`
- `cookie/` consent-manager assets

## Language
English is the default language on a first visit. A user-selected EN/PL preference is saved in `localStorage` as `portfolio-language` and shared across all pages.

## Portrait
The profile frame uses the source aspect ratio `632 / 640`; the image is not stretched. `object-fit: cover` may crop minimally when responsive constraints require it.

## Legal review
The privacy and cookie pages reflect the current static portfolio configuration. Review them before publication and whenever hosting, analytics, forms, embedded media or other providers change.

## GitHub permissions
The connected GitHub integration previously returned `403 Resource not accessible by integration`. Grant **Contents: Read and write** to allow automated branch creation, commit and pull request publication.
