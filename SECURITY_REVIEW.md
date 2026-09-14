Security and bug review — 14 September 2026

The review found two reproducible navigation bugs and missing browser security headers. Both bugs are fixed in the working tree, and security headers are configured for the next deployment. No externally exploitable vulnerability was demonstrated in the local code reviewed. The dependency audit reported zero known vulnerabilities.

1. **Missing security headers — low severity, hardening.** A read-only HEAD request to `https://kupersonaleportfolio.netlify.app/` returned HTTP 200 with HSTS, but without Content-Security-Policy, X-Frame-Options, or X-Content-Type-Options. Added [public/_headers](public/_headers) with a policy allowing the site's own scripts, styles, fonts, and images; framing and MIME-sniffing protection; and referrer and browser-permission policies. Browser tests confirmed that the production page and animations still work and that an injected inline script is blocked. Netlify applies this file from the publish directory; these protections are **not active on the public site until deployment**. [Netlify custom-header documentation](https://docs.netlify.com/manage/routing/headers/).

2. **Project deep links could lose a race with closing animations — functional bug, fixed locally.** Opening a link to a project while its dropdown was closing left the destination collapsed. The native `open` attribute was already present during the closing animation, so setting it again did not cancel the close. [Anchor navigation](src/utils/anchorNavigation.ts) now signals the destination before measuring it, and [project dropdowns](src/components/ProjectList.ts) settle open when that signal arrives. A regression test reproduced the failure before the fix and passes afterward.

3. **Some anchor links scrolled without moving keyboard focus — accessibility bug, fixed locally.** Calling `focus()` on a heading without a tabindex left focus at the previous link. Anchor navigation now makes otherwise unfocusable destinations programmatically focusable. The legacy `#aboutMe` alias focuses its visible section instead of its aria-hidden marker. Regression tests cover both cases.

Validation completed:

- `npm audit --json`: zero known vulnerabilities across the reported 184-package dependency tree, including development dependencies. `npm ls --depth=0` found no invalid direct dependencies.
- `npm run build` and `npm run lint`: passed. The build includes `dist/_headers`.
- Credential-pattern and sensitive-filename checks: no matches in the reviewed source or deployable `public/` and `dist/` assets. The deployment-asset scan included ignored and hidden files.
- Browser checks covered desktop, tablet, mobile, and narrow viewports; keyboard and touch controls; rapid toggling; reduced motion; resizing; accessibility; malformed/HTML-like URL fragments; and CSP compatibility.
- The complete 108-test run passed 107 checks. One existing animation test compared its closing height to a stale opening snapshot, differing by 0.28 px. Its assertion now compares the height immediately before and after the closing click; the focused rerun passed. No application change was needed for that test correction.

Content observations, left for review: [experience data](src/data/experience.ts) contains two identical “Amazon & Meta” internship entries and an Anthropic description bullet containing only a period. These are content issues, not security findings.

Scope: current workspace code, dependencies, production assets, local browser behavior, and public-site response headers. The live site's JavaScript, Netlify account configuration, platform internals, and complete Git history were not audited. This review does not establish that every possible vulnerability is absent. The current site has no backend, authentication, or visitor-submitted content; adding those would change its security requirements.
