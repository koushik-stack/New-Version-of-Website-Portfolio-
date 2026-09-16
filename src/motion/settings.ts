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
    feedback: milliseconds('--motion-feedback', 180),
    menu: milliseconds('--motion-menu', 300),
    entrance: milliseconds('--motion-entrance', 560),
    stagger: milliseconds('--motion-stagger', 80),
    ambient: milliseconds('--motion-ambient', 24000),
    pulse: milliseconds('--motion-pulse', 4000),
    distance: Number.parseFloat(styles.getPropertyValue('--motion-distance')) || 14,
    easing: styles.getPropertyValue('--motion-ease').trim(),
  };
}
