# Jan Jędrzejak portfolio redesign

This bundle is a drop-in redesign for `janjedrzejak/janjedrzejak.github.io`.

## Files

- `index.html` — complete homepage replacement
- `home.css` — isolated homepage design system and responsive styles
- `home.js` — progressive animation, parallax, canvas network, reveal, cursor and mobile menu logic

The existing `styl.css`, `projects.html`, `blog.html`, cookie scripts and assets remain untouched. This protects the current secondary pages from regressions.

## Deployment

Copy the three files to the repository root and commit them on a feature branch:

```bash
git switch -c agent/immersive-portfolio-redesign
cp /path/to/index.html ./index.html
cp /path/to/home.css ./home.css
cp /path/to/home.js ./home.js
git add index.html home.css home.js
git commit -m "Redesign portfolio with immersive motion system"
git push -u origin agent/immersive-portfolio-redesign
```

Then open a pull request into `main`.

## Design and implementation notes

- No framework migration: remains compatible with GitHub Pages.
- No animation dependency: all effects use native CSS, Canvas and browser APIs.
- Supports `prefers-reduced-motion`.
- Canvas rendering pauses outside the viewport.
- Device pixel ratio is capped to limit GPU cost.
- Touch devices do not receive cursor, tilt or magnetic interactions.
- Existing project, blog, résumé, privacy, cookie, contact and asset URLs are preserved.
- Homepage styles are isolated in `home.css`, so replacing `styl.css` is unnecessary.

## Suggested verification

1. Test at 1440px, 1024px, 768px, 390px and 320px widths.
2. Run Lighthouse for Performance, Accessibility, Best Practices and SEO.
3. Verify `projects.html`, `blog.html`, `resJanJedrzejakCV.pdf`, cookie consent and contact links.
4. Test with reduced motion enabled at OS/browser level.
