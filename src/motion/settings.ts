export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

// CSS is the single source for interface and ambient timing. Values use milliseconds.
export function readMotionSettings(element: Element = document.documentElement) {
  const styles = getComputedStyle(element);
  const milliseconds = (name: string) => Number.parseFloat(styles.getPropertyValue(name));

  return {
    feedback: milliseconds('--motion-feedback'),
    menu: milliseconds('--motion-menu'),
    entrance: milliseconds('--motion-entrance'),
    stagger: milliseconds('--motion-stagger'),
    ambient: milliseconds('--motion-ambient'),
    pulse: milliseconds('--motion-pulse'),
    distance: milliseconds('--motion-distance'),
    easing: styles.getPropertyValue('--motion-ease').trim(),
  };
}
