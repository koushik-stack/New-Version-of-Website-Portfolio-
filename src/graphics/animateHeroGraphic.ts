import { readMotionSettings, reducedMotionQuery } from '../motion/settings';
import { createParticleField, fieldSize, type PointerPosition } from './particleField';

const pauseStorageKey = 'portfolio-motion-paused';
const pointerResponse = 280;
const fullTurn = Math.PI * 2;

export function initializeHeroGraphic(): () => void {
  const root = document.querySelector<HTMLElement>('[data-hero-graphic]');
  const surface = root?.querySelector<HTMLCanvasElement>('.hero-graphic__surface');
  const button = root?.querySelector<HTMLButtonElement>('.motion-toggle');
  const context = surface?.getContext('2d');
  if (!root || !surface || !button || !context) return () => {};

  const motion = readMotionSettings();
  const preference = window.matchMedia(reducedMotionQuery);
  const pointerDevice = window.matchMedia('(hover: hover) and (pointer: fine)');
  const events = new AbortController();
  const { signal } = events;
  const render = createParticleField(context);
  const label = button.querySelector<HTMLElement>('.motion-toggle__label')!;
  const pauseIcon = button.querySelector<HTMLElement>('.motion-toggle__pause')!;
  const playIcon = button.querySelector<HTMLElement>('.motion-toggle__play')!;
  let paused = false;
  try {
    paused = sessionStorage.getItem(pauseStorageKey) === 'true';
  } catch {
    // The control still works when browser storage is unavailable.
  }

  let frame: number | null = null;
  let previousTime: number | null = null;
  let elapsed = 0;
  let inViewport = false;
  let needsDraw = true;
  let size = { width: 0, height: 0 };
  let pixelRatio = 0;
  let bounds: DOMRect | null = null;
  const pointer: PointerPosition = { x: 0, y: 0 };
  const target: PointerPosition = { x: 0, y: 0 };

  function draw() {
    const canvas = surface!;
    const ctx = context!;
    // Resize the backing store and redraw in the same frame. CSS owns layout;
    // uniform scaling preserves the composition at every size and display DPR.
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(size.width * ratio));
    const height = Math.max(1, Math.round(size.height * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    pixelRatio = ratio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const scale = Math.min(width / fieldSize.width, height / fieldSize.height);
    ctx.setTransform(
      scale,
      0,
      0,
      scale,
      (width - fieldSize.width * scale) / 2,
      (height - fieldSize.height * scale) / 2,
    );
    render(
      (elapsed / Math.max(1, motion.ambient)) * fullTurn,
      (elapsed / Math.max(1, motion.pulse)) * fullTurn,
      pointer,
    );
    needsDraw = false;
  }

  const isVisible = () => inViewport && !document.hidden;
  const isRunning = () => isVisible() && !paused && !preference.matches;

  function schedule() {
    if (frame === null && isVisible()) frame = requestAnimationFrame(tick);
  }

  function tick(timestamp: number) {
    frame = null;
    if (!isVisible()) return;
    const running = isRunning();
    if (!running) {
      if (needsDraw) draw();
      // A media preference can change before its change event is delivered.
      synchronize();
      return;
    }
    // Hidden time never enters the clock; cap long foreground stalls too.
    const delta = previousTime === null ? 0 : Math.min(timestamp - previousTime, 64);
    previousTime = timestamp;
    elapsed += delta;
    const damping = 1 - Math.exp(-delta / pointerResponse);
    pointer.x += (target.x - pointer.x) * damping;
    pointer.y += (target.y - pointer.y) * damping;
    draw();
    schedule();
  }

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
  }

  function synchronize() {
    const reduced = preference.matches;
    root!.dataset.motionState = reduced
      ? 'reduced'
      : paused
        ? 'paused'
        : document.hidden
          ? 'hidden'
          : !inViewport
            ? 'offscreen'
            : 'running';
    button!.disabled = reduced;
    button!.setAttribute(
      'aria-label',
      reduced
        ? 'Decorative animation disabled by reduced motion preference'
        : paused
          ? 'Resume decorative animation'
          : 'Pause decorative animation',
    );
    label.textContent = reduced ? 'Motion reduced' : paused ? 'Resume motion' : 'Pause motion';
    pauseIcon.hidden = paused && !reduced;
    playIcon.hidden = !paused || reduced;
    if (!isRunning()) stop();
    // Pausing and reduced motion freeze the current view, without a snap.
    if (isRunning() || needsDraw) schedule();
  }

  const resetPointer = () => {
    target.x = target.y = 0;
    bounds = null;
  };
  const updatePointer = (event: PointerEvent) => {
    if (!pointerDevice.matches || event.pointerType === 'touch' || !isRunning()) return;
    bounds ??= surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    target.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    target.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
  };
  const measure = () => {
    const rect = surface.getBoundingClientRect();
    bounds = null;
    if (
      rect.width !== size.width ||
      rect.height !== size.height ||
      pixelRatio !== Math.min(window.devicePixelRatio || 1, 2)
    ) {
      size = { width: rect.width, height: rect.height };
      needsDraw = true;
      schedule();
    }
    // If IntersectionObserver is unavailable, keep a functional static/animated view.
    if (!observer) {
      inViewport = rect.bottom > 0 && rect.top < innerHeight;
      synchronize();
    }
  };
  surface.addEventListener('pointerenter', updatePointer, { signal, passive: true });
  surface.addEventListener('pointermove', updatePointer, { signal, passive: true });
  surface.addEventListener('pointerleave', resetPointer, { signal });
  surface.addEventListener('pointercancel', resetPointer, { signal });
  window.addEventListener(
    'scroll',
    () => {
      bounds = null;
      if (!observer) measure();
    },
    { signal, passive: true, capture: true },
  );
  window.addEventListener(
    'resize',
    () => {
      resetPointer();
      measure();
    },
    { signal, passive: true },
  );
  window.addEventListener('blur', resetPointer, { signal });
  pointerDevice.addEventListener('change', resetPointer, { signal });
  document.addEventListener(
    'visibilitychange',
    () => {
      resetPointer();
      synchronize();
    },
    { signal },
  );
  preference.addEventListener(
    'change',
    () => {
      resetPointer();
      synchronize();
    },
    { signal },
  );
  button.addEventListener(
    'click',
    () => {
      paused = !paused;
      resetPointer();
      try {
        sessionStorage.setItem(pauseStorageKey, String(paused));
      } catch {
        // Pausing does not require storage permission.
      }
      synchronize();
    },
    { signal },
  );

  const observer =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(([entry]) => {
          inViewport = entry.isIntersecting;
          if (!inViewport) resetPointer();
          synchronize();
        });
  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
  measure();
  synchronize();
  observer?.observe(surface);
  resizeObserver?.observe(surface);
  button.hidden = false;

  return () => {
    stop();
    events.abort();
    observer?.disconnect();
    resizeObserver?.disconnect();
    button.hidden = true;
    delete root.dataset.motionState;
  };
}
