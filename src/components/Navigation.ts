import { navigationLinks, portfolio } from '../data/portfolio';
import { escapeHtml } from '../utils/escapeHtml';
import { renderIcon } from './Icon';
import { readMotionSettings, reducedMotionQuery } from '../motion/settings';

export function renderNavigation(): string {
  return `<a class="skip-link" href="#main-content">Skip to content</a>
    <header class="site-header">
      <div class="site-header__inner container">
        <a class="wordmark" href="#home" aria-label="${escapeHtml(portfolio.name)} — home">
          <span class="wordmark__symbol" aria-hidden="true">k.</span>
          <span>${escapeHtml(portfolio.name.toLowerCase())}<span class="accent">.</span></span>
        </a>
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation">
          <span class="menu-toggle__label">Menu</span>
          <span class="menu-toggle__lines" aria-hidden="true"></span>
        </button>
        <nav id="primary-navigation" class="primary-navigation" aria-label="Main navigation">
          <ul>${navigationLinks
            .map(
              (link) => `<li>
            <a href="${link.href}">
              ${link.label}${link.href === '#contact' ? renderIcon('arrowUpRight') : ''}
            </a>
          </li>`,
            )
            .join('')}</ul>
        </nav>
      </div>
    </header>`;
}

export function initializeNavigation(): () => void {
  const header = document.querySelector<HTMLElement>('.site-header');
  const menuButton = document.querySelector<HTMLButtonElement>('.menu-toggle');
  const navigation = document.querySelector<HTMLElement>('#primary-navigation');
  if (!header || !menuButton || !navigation) return () => {};

  // Keep this breakpoint in sync with Navigation.css.
  const mobileViewport = window.matchMedia('(max-width: 767px)');
  const events = new AbortController();
  const { signal } = events;
  const preference = window.matchMedia(reducedMotionQuery);
  const motion = readMotionSettings();
  let menuAnimation: Animation | null = null;

  const setMenuOpen = (isOpen: boolean, immediate = false) => {
    const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
    // Focus leaving an inert menu can request the same close again. Preserve its exit.
    if (wasOpen === isOpen && !immediate) return;
    const current = getComputedStyle(navigation);
    const from = {
      opacity: navigation.hidden ? '0' : current.opacity,
      transform: navigation.hidden ? 'translateY(-8px)' : current.transform,
    };
    menuAnimation?.cancel();
    menuAnimation = null;
    menuButton.setAttribute('aria-expanded', String(isOpen));
    const closed = mobileViewport.matches && !isOpen;
    navigation.inert = closed;
    if (closed) navigation.setAttribute('aria-hidden', 'true');
    else navigation.removeAttribute('aria-hidden');
    if (
      !mobileViewport.matches ||
      immediate ||
      preference.matches ||
      !navigation.animate ||
      wasOpen === isOpen
    ) {
      navigation.hidden = closed;
      return;
    }
    navigation.hidden = false;
    menuAnimation = navigation.animate(
      [
        from,
        { opacity: isOpen ? '1' : '0', transform: isOpen ? 'translateY(0)' : 'translateY(-8px)' },
      ],
      { duration: motion.menu, easing: motion.easing },
    );
    menuAnimation.onfinish = () => {
      navigation.hidden = closed;
      menuAnimation = null;
    };
  };

  const syncViewport = () => {
    // A resize must not leave keyboard focus inside newly hidden navigation.
    if (mobileViewport.matches && navigation.contains(document.activeElement)) {
      menuButton.focus();
    }
    setMenuOpen(false, true);
  };

  menuButton.addEventListener(
    'click',
    () => {
      setMenuOpen(menuButton.getAttribute('aria-expanded') !== 'true');
    },
    { signal },
  );

  header.addEventListener(
    'keydown',
    (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenuOpen(false);
        menuButton.focus();
      }
    },
    { signal },
  );

  header.addEventListener(
    'focusout',
    (event) => {
      if (!header.contains(event.relatedTarget as Node | null)) setMenuOpen(false);
    },
    { signal },
  );

  document.addEventListener(
    'click',
    (event) => {
      if (!header.contains(event.target as Node)) setMenuOpen(false);
    },
    { signal },
  );

  navigation.addEventListener(
    'click',
    (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>('a');
      if (!link) return;
      setMenuOpen(false);
    },
    { signal },
  );

  const links = navigation.querySelectorAll<HTMLAnchorElement>('a');
  const observer =
    typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (!entry.isIntersecting) continue;
              for (const link of links) {
                if (link.hash === `#${entry.target.id}`)
                  link.setAttribute('aria-current', 'location');
                else link.removeAttribute('aria-current');
              }
            }
          },
          { rootMargin: '-15% 0px -65% 0px', threshold: 0 },
        )
      : null;

  document.querySelectorAll('main > section[id]').forEach((section) => observer?.observe(section));
  mobileViewport.addEventListener('change', syncViewport, { signal });
  preference.addEventListener(
    'change',
    () => setMenuOpen(menuButton.getAttribute('aria-expanded') === 'true', true),
    { signal },
  );
  syncViewport();

  return () => {
    events.abort();
    menuAnimation?.cancel();
    observer?.disconnect();
  };
}
