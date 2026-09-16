export const reducedMotionQuery = '(prefers-reduced-motion: reduce)';

export function cssTimeToMilliseconds(value: string, fallback = 0): number {
  const match = value.trim().match(/^(\d*\.?\d+)(ms|s)$/i);
  if (!match) return fallback;
  const milliseconds = Number(match[1]) * (match[2].toLowerCase() === 's' ? 1000 : 1);
  return Number.isFinite(milliseconds) ? milliseconds : fallback;
}

// CSS is the timing source. Normalize units, including values minified to seconds.
export function readMotionSettings(element: Element = document.documentElement) {
  const styles = getComputedStyle(element);
  const milliseconds = (name: string, fallback: number) =>
    cssTimeToMilliseconds(styles.getPropertyValue(name), fallback);

  return {
    feedback: milliseconds('--motion-feedback', 220),
    menu: milliseconds('--motion-menu', 340),
    entrance: milliseconds('--motion-entrance', 600),
    stagger: milliseconds('--motion-stagger', 70),
    ambient: milliseconds('--motion-ambient', 28000),
    pulse: milliseconds('--motion-pulse', 4400),
    distance: Number.parseFloat(styles.getPropertyValue('--motion-distance')) || 12,
    easing: styles.getPropertyValue('--motion-ease').trim(),
  };
}
