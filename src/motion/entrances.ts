import { readMotionSettings, reducedMotionQuery } from './settings';

export function initializeEntrances(): () => void {
  // Nothing is hidden in the stylesheet: a failed enhancement leaves readable content.
  if (typeof IntersectionObserver === 'undefined' || !Element.prototype.animate) return () => {};

  const motion = readMotionSettings();
  const preference = window.matchMedia(reducedMotionQuery);
  const events = new AbortController();
  const animations = new Map<Element, Animation>();

  function enter(element: Element, delay = 0, hero = false) {
    if (preference.matches || element.contains(document.activeElement)) return;
    try {
      const { entrance, distance, easing } = readMotionSettings(element);
      const animation = element.animate(
        [
          { opacity: hero ? 0.85 : 0, transform: `translateY(${hero ? 6 : distance}px)` },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: entrance, delay, easing, fill: 'backwards' },
      );
      animations.set(element, animation);
      animation.onfinish = animation.oncancel = () => animations.delete(element);
    } catch {
      // The underlying HTML remains visible if Web Animations is unavailable.
    }
  }

  const observer = new IntersectionObserver(
    (entries) => {
      const groups = new Map<Element, number>();
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const group = entry.target.closest('[data-stagger]');
        const index = group ? (groups.get(group) ?? 0) : 0;
        if (group) groups.set(group, index + 1);
        enter(entry.target, Math.min(index, 3) * motion.stagger);
      }
    },
    { threshold: 0, rootMargin: '0px 0px -32px 0px' },
  );

  document.querySelectorAll('[data-reveal]').forEach((element) => observer.observe(element));
  if (!window.location.hash || window.location.hash === '#home') {
    document.querySelectorAll('[data-hero-enter]').forEach((element, index) => {
      enter(element, index * motion.stagger, true);
    });
  }

  const cancelAnimations = () => {
    animations.forEach((animation) => animation.cancel());
    animations.clear();
  };
  preference.addEventListener('change', cancelAnimations, { signal: events.signal });
  document.addEventListener(
    'focusin',
    (event) => {
      animations.forEach((animation, element) => {
        if (element.contains(event.target as Node)) animation.cancel();
      });
    },
    { signal: events.signal },
  );

  return () => {
    events.abort();
    observer.disconnect();
    cancelAnimations();
  };
}
