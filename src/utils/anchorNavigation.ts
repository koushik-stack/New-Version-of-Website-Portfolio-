import { reducedMotionQuery } from '../motion/settings';

export const revealTargetEvent = 'portfolio:reveal-target';

export function initializeAnchorNavigation(): () => void {
  const events = new AbortController();
  const preference = window.matchMedia(reducedMotionQuery);

  function findTarget(hash: string): HTMLElement | null {
    try {
      return document.getElementById(decodeURIComponent(hash.slice(1)));
    } catch {
      return null;
    }
  }

  function navigate(target: HTMLElement, instant = false, focus = false) {
    // Animated disclosures must settle open before the destination is measured.
    target.dispatchEvent(new Event(revealTargetEvent, { bubbles: true }));
    // Open bookmarked projects and any enclosing native disclosure before measuring.
    for (let parent: HTMLElement | null = target; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    if (focus) {
      const focusTarget =
        target.getAttribute('aria-hidden') === 'true'
          ? (target.closest<HTMLElement>('section') ?? target)
          : target;
      if (focusTarget.tabIndex < 0 && !focusTarget.hasAttribute('tabindex')) {
        focusTarget.tabIndex = -1;
      }
      focusTarget.focus({ preventScroll: true });
    }
    target.scrollIntoView({
      behavior: instant || preference.matches ? 'instant' : 'smooth',
      block: 'start',
    });
  }

  document.addEventListener(
    'click',
    (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (
        !link ||
        link.target ||
        link.hasAttribute('download') ||
        link.origin !== location.origin ||
        link.pathname !== location.pathname ||
        link.search !== location.search
      )
        return;
      const target = findTarget(link.hash);
      if (!target) return;
      event.preventDefault();
      if (location.hash !== link.hash) history.pushState(null, '', link.hash);
      navigate(target, false, true);
    },
    { signal: events.signal },
  );

  const restoreAnchor = () => {
    const target = findTarget(location.hash);
    if (target) navigate(target);
  };
  const initialFrame = requestAnimationFrame(() => {
    const target = findTarget(location.hash);
    if (target) navigate(target, true);
  });
  window.addEventListener('hashchange', restoreAnchor, { signal: events.signal });

  return () => {
    cancelAnimationFrame(initialFrame);
    events.abort();
  };
}
