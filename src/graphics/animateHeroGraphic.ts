import { readMotionSettings, reducedMotionQuery } from '../motion/settings';
import {
  createSurfaceFrame,
  createWireframeLines,
  fullTurn,
  linePath,
  nodePoint,
  travellingNodes,
  type Point,
} from './wireframeGeometry';
import { wireframeSettings as settings } from './wireframeSettings';

const pauseStorageKey = 'portfolio-motion-paused';

export function initializeHeroGraphic(): () => void {
  const root = document.querySelector<HTMLElement>('[data-hero-graphic]');
  const grid = root?.querySelector<SVGGElement>('.hero-graphic__grid');
  const surface = root?.querySelector<SVGSVGElement>('.hero-graphic__surface');
  const spotlight = root?.querySelector<SVGEllipseElement>('.hero-graphic__spotlight');
  const button = root?.querySelector<HTMLButtonElement>('.motion-toggle');
  if (
    !root ||
    !grid ||
    !surface ||
    !spotlight ||
    !button ||
    typeof IntersectionObserver === 'undefined'
  )
    return () => {};

  const motion = readMotionSettings();
  const preference = window.matchMedia(reducedMotionQuery);
  const mobile = window.matchMedia('(max-width: 767px)');
  const pointerDevice = window.matchMedia('(hover: hover) and (pointer: fine)');
  const events = new AbortController();
  const { signal } = events;
  const nodes = root.querySelectorAll<SVGGElement>('.hero-graphic__nodes > g');
  const markers = root.querySelectorAll<SVGGElement>('.hero-graphic__marker');
  const points = root.querySelectorAll<SVGCircleElement>('.hero-graphic__point');
  const indicator = root.querySelector<HTMLElement>('.status-dot')!;
  const label = button.querySelector<HTMLElement>('.motion-toggle__label')!;
  const pauseIcon = button.querySelector<HTMLElement>('.motion-toggle__pause')!;
  const playIcon = button.querySelector<HTMLElement>('.motion-toggle__play')!;
  let paused = false;
  try {
    paused = sessionStorage.getItem(pauseStorageKey) === 'true';
  } catch {
    // The control still works when browser storage is unavailable.
  }
  let density = mobile.matches ? settings.mobile : settings.desktop;
  let lines = createWireframeLines(density);
  let paths: SVGPathElement[] = [];
  let frame: number | null = null;
  let previousTime: number | null = null;
  let elapsed = 0;
  let inViewport = false;
  let bounds: DOMRect | null = null;
  let hover = 0;
  let targetHover = 0;
  const pointer: Point = { x: 0, y: 0 };
  const target: Point = { x: 0, y: 0 };

  function draw(delta = 0) {
    const interpolation = 1 - Math.exp(-delta / settings.pointerResponse);
    pointer.x += (target.x - pointer.x) * interpolation;
    pointer.y += (target.y - pointer.y) * interpolation;
    hover += (targetHover - hover) * interpolation;
    const phase = (elapsed / motion.ambient) * fullTurn;
    const projection = createSurfaceFrame(phase, pointer);
    paths.forEach((path, index) => path.setAttribute('d', linePath(lines[index], projection)));
    nodes.forEach((node, index) => {
      const point = nodePoint(travellingNodes[index], phase, projection);
      node.setAttribute('transform', `translate(${point.x.toFixed(2)} ${point.y.toFixed(2)})`);
    });
    markers.forEach((marker, index) => {
      const offset = phase + index * 1.8;
      marker.setAttribute(
        'transform',
        `translate(${(Math.sin(offset) * settings.markerDrift + pointer.x * 5).toFixed(2)} ${(Math.cos(offset) * settings.markerDrift + pointer.y * 5).toFixed(2)})`,
      );
    });
    const pulse = (elapsed / motion.pulse) * fullTurn;
    points.forEach((point, index) =>
      point.setAttribute('opacity', (0.68 + Math.cos(pulse + index * 2) * 0.22).toFixed(3)),
    );
    indicator.style.opacity = (0.8 + Math.cos(pulse) * 0.2).toFixed(3);
    spotlight!.setAttribute('cx', (260 + pointer.x * 200).toFixed(2));
    spotlight!.setAttribute('cy', (250 + pointer.y * 190).toFixed(2));
    spotlight!.setAttribute('opacity', hover.toFixed(3));
  }

  function tick(timestamp: number) {
    // One clock owns the surface, nodes, markers, and indicator. A resumed tab
    // continues from its last frame instead of jumping through hidden time.
    const delta = previousTime === null ? 0 : Math.min(timestamp - previousTime, 64);
    previousTime = timestamp;
    elapsed += delta;
    draw(delta);
    frame = requestAnimationFrame(tick);
  }

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousTime = null;
  }

  function synchronize() {
    const reduced = preference.matches;
    const state = reduced
      ? 'reduced'
      : paused
        ? 'paused'
        : document.hidden
          ? 'hidden'
          : !inViewport
            ? 'offscreen'
            : 'running';
    root!.dataset.motionState = state;
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
    if (state === 'running') {
      if (frame === null) frame = requestAnimationFrame(tick);
    } else {
      stop();
      if (reduced) {
        elapsed = 0;
        pointer.x = pointer.y = target.x = target.y = 0;
        hover = targetHover = 0;
        draw();
      }
    }
  }

  function updateDensity() {
    density = mobile.matches ? settings.mobile : settings.desktop;
    lines = createWireframeLines(density);
    const elements = lines.map((line) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('opacity', line.opacity.toFixed(2));
      return path;
    });
    grid!.replaceChildren(...elements);
    paths = elements;
    draw();
  }

  const resetPointer = () => {
    target.x = target.y = 0;
    targetHover = 0;
    bounds = null;
  };
  const updatePointer = (event: PointerEvent) => {
    if (!pointerDevice.matches || event.pointerType === 'touch' || paused || preference.matches)
      return;
    // Read layout once on entry, then only after scrolling or resizing.
    bounds ??= surface.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;
    targetHover = 1;
    target.x = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
    target.y = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
  };
  const invalidateBounds = () => {
    bounds = null;
  };
  surface.addEventListener('pointerenter', updatePointer, { signal, passive: true });
  surface.addEventListener('pointermove', updatePointer, { signal, passive: true });
  surface.addEventListener('pointerleave', resetPointer, { signal });
  surface.addEventListener('pointercancel', resetPointer, { signal });
  window.addEventListener('scroll', invalidateBounds, { signal, passive: true, capture: true });
  window.addEventListener('resize', invalidateBounds, { signal, passive: true });
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
  preference.addEventListener('change', synchronize, { signal });
  mobile.addEventListener(
    'change',
    () => {
      resetPointer();
      updateDensity();
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

  const observer = new IntersectionObserver(([entry]) => {
    inViewport = entry.isIntersecting;
    if (!inViewport) resetPointer();
    synchronize();
  });
  updateDensity();
  synchronize();
  observer.observe(root);
  button.hidden = false;

  return () => {
    stop();
    events.abort();
    observer.disconnect();
    button.hidden = true;
    delete root.dataset.motionState;
  };
}
