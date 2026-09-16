import { readMotionSettings, reducedMotionQuery } from '../motion/settings';
import {
  createParticleField,
  fieldSize,
  rippleDuration,
  type FieldRotation,
  type ParticleRipple,
  type PointerPosition,
} from './particleField';

const pauseStorageKey = 'portfolio-motion-paused';
const fullTurn = Math.PI * 2;
const clamp = (value: number, limit: number) => Math.max(-limit, Math.min(limit, value));

interface Gesture {
  id: number;
  touch: boolean;
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  started: number;
  dragging: boolean;
}

export function initializeHeroGraphic(): () => void {
  const root = document.querySelector<HTMLElement>('[data-hero-graphic]');
  const surface = root?.querySelector<HTMLCanvasElement>('.hero-graphic__surface');
  const button = root?.querySelector<HTMLButtonElement>('.motion-toggle');
  const context = surface?.getContext('2d');
  if (!root || !surface || !button || !context) return () => {};

  const motion = readMotionSettings();
  const preference = window.matchMedia(reducedMotionQuery);
  const events = new AbortController();
  const { signal } = events;
  const render = createParticleField(context, surface.getBoundingClientRect().width < 380);
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
  let pointer: PointerPosition | null = null;
  let gesture: Gesture | null = null;
  const rotation: FieldRotation = { yaw: 0, pitch: -0.16 };
  const target: FieldRotation = { ...rotation };
  const velocity: FieldRotation = { yaw: 0, pitch: 0 };
  const input: FieldRotation = { yaw: 0, pitch: 0 };
  const ripples: ParticleRipple[] = [];

  const isVisible = () => inViewport && !document.hidden && size.width > 0 && size.height > 0;
  const isRunning = () => isVisible() && !paused && !preference.matches;

  function draw(delta = 0) {
    const canvas = surface!;
    const ctx = context!;
    // CSS owns layout. Keep the same logical coordinates and particle identities
    // across resizes; only the backing store and uniform projection scale change.
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
    render({
      phase: ((elapsed * 1000) / Math.max(1, motion.ambient)) * fullTurn,
      pulse: ((elapsed * 1000) / Math.max(1, motion.pulse)) * fullTurn,
      delta,
      rotation,
      pointer,
      ripples,
    });
    needsDraw = false;
  }

  function advanceRotation(delta: number) {
    if (!delta) return;
    if (gesture || input.yaw || input.pitch) {
      const follow = 1 - Math.exp(-delta * 26);
      const response = 1 - Math.exp(-delta * 22);
      for (const axis of ['yaw', 'pitch'] as const) {
        const change = clamp((target[axis] - rotation[axis]) * follow, delta * 3);
        rotation[axis] += change;
        // Measure visible movement in the render clock, rather than noisy event
        // timestamps. A flick released between frames is consumed here as well.
        velocity[axis] += (clamp(change / delta, 1.8) - velocity[axis]) * response;
      }
    } else {
      const decay = Math.exp(-delta * 3.6);
      for (const axis of ['yaw', 'pitch'] as const) {
        rotation[axis] += (velocity[axis] * (1 - decay)) / 3.6;
        velocity[axis] *= decay;
      }
      rotation.yaw += delta * 0.018;
      rotation.pitch = clamp(rotation.pitch, 0.9);
    }
    input.yaw = input.pitch = 0;
    // Release from the visible angle: no stored target can pull the formation
    // onward or back. Ambient motion and decaying momentum share this rotation.
    if (!gesture) {
      target.yaw = rotation.yaw;
      target.pitch = rotation.pitch;
    }
  }

  function schedule() {
    if (frame === null && isVisible()) frame = requestAnimationFrame(tick);
  }

  function tick(timestamp: number) {
    frame = null;
    if (!isVisible()) return;
    if (!isRunning()) {
      if (needsDraw) draw();
      synchronize();
      return;
    }
    // Hidden time never enters the clock. Bound foreground stalls as well, so
    // particle damping, rotation, and ripples always advance together safely.
    const delta = previousTime === null ? 0 : Math.min((timestamp - previousTime) / 1000, 0.05);
    previousTime = timestamp;
    elapsed += delta;
    advanceRotation(delta);
    for (let index = ripples.length - 1; index >= 0; index--) {
      ripples[index].age += delta;
      if (ripples[index].age >= rippleDuration) ripples.splice(index, 1);
    }
    draw(delta);
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
    // Freeze the exact current view for pause/reduced motion, including offsets.
    if (isRunning() || needsDraw) schedule();
  }

  function releaseGesture() {
    const id = gesture?.id;
    gesture = null;
    delete root!.dataset.dragging;
    if (id !== undefined && surface!.hasPointerCapture(id)) surface!.releasePointerCapture(id);
  }

  function interrupt() {
    releaseGesture();
    pointer = null;
    bounds = null;
    velocity.yaw = velocity.pitch = input.yaw = input.pitch = 0;
    target.yaw = rotation.yaw;
    target.pitch = rotation.pitch;
  }

  function locate(event: PointerEvent): PointerPosition | null {
    bounds ??= surface!.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    if (x < 0 || y < 0 || x > bounds.width || y > bounds.height) return null;
    const scale = Math.min(bounds.width / fieldSize.width, bounds.height / fieldSize.height);
    return {
      x: (x - (bounds.width - fieldSize.width * scale) / 2) / scale,
      y: (y - (bounds.height - fieldSize.height * scale) / 2) / scale,
    };
  }

  function updatePointer(event: PointerEvent) {
    if (!isRunning()) return;
    if (event.pointerType !== 'touch') pointer = locate(event);
    if (!gesture || event.pointerId !== gesture.id) return;
    const dx = event.clientX - gesture.lastX;
    const dy = event.clientY - gesture.lastY;
    gesture.lastX = event.clientX;
    gesture.lastY = event.clientY;
    if (!gesture.dragging) {
      const travelX = Math.abs(event.clientX - gesture.startX);
      const travelY = Math.abs(event.clientY - gesture.startY);
      if (Math.hypot(travelX, travelY) < (gesture.touch ? 8 : 4)) return;
      // Let native pan-y/pinch-zoom claim vertical or multi-touch gestures.
      if (gesture.touch && travelY >= travelX) {
        interrupt();
        return;
      }
      gesture.dragging = true;
      root!.dataset.dragging = '';
      surface!.setPointerCapture(event.pointerId);
    }
    bounds ??= surface!.getBoundingClientRect();
    const yaw = rotation.yaw + clamp(target.yaw + (dx / bounds.width) * 2.8 - rotation.yaw, 0.65);
    const pitch = clamp(target.pitch + (gesture.touch ? 0 : (dy / bounds.height) * 2.3), 0.9);
    input.yaw += yaw - target.yaw;
    input.pitch += pitch - target.pitch;
    target.yaw = yaw;
    target.pitch = pitch;
  }

  surface.addEventListener('pointerenter', updatePointer, { signal, passive: true });
  surface.addEventListener('pointermove', updatePointer, { signal, passive: true });
  surface.addEventListener(
    'pointerdown',
    (event) => {
      if (!event.isPrimary) {
        interrupt();
        return;
      }
      if (event.button !== 0 || !isRunning() || gesture) return;
      interrupt();
      gesture = {
        id: event.pointerId,
        touch: event.pointerType === 'touch',
        startX: event.clientX,
        startY: event.clientY,
        lastX: event.clientX,
        lastY: event.clientY,
        started: performance.now(),
        dragging: false,
      };
      if (!gesture.touch) {
        pointer = locate(event);
        root.dataset.dragging = '';
        surface.setPointerCapture(event.pointerId);
      }
    },
    { signal, passive: true },
  );
  surface.addEventListener(
    'pointerup',
    (event) => {
      if (!gesture || event.pointerId !== gesture.id) return;
      const position = locate(event);
      const travel = Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY);
      if (
        !gesture.dragging &&
        travel < (gesture.touch ? 8 : 4) &&
        performance.now() - gesture.started < 450 &&
        position &&
        isRunning() &&
        ripples.length < 4
      ) {
        ripples.push({ ...position, age: 0 });
      }
      pointer = gesture.touch ? null : position;
      releaseGesture();
    },
    { signal, passive: true },
  );
  surface.addEventListener(
    'pointerleave',
    () => {
      pointer = null;
    },
    { signal },
  );
  surface.addEventListener('pointercancel', interrupt, { signal });
  surface.addEventListener(
    'lostpointercapture',
    () => {
      if (gesture) interrupt();
    },
    { signal },
  );
  surface.addEventListener('dragstart', (event) => event.preventDefault(), { signal });

  const measure = () => {
    const rect = surface.getBoundingClientRect();
    bounds = null;
    if (
      rect.width !== size.width ||
      rect.height !== size.height ||
      pixelRatio !== Math.min(window.devicePixelRatio || 1, 2)
    ) {
      interrupt();
      previousTime = null;
      size = { width: rect.width, height: rect.height };
      needsDraw = true;
      schedule();
    }
    if (!observer) {
      inViewport = rect.bottom > 0 && rect.top < innerHeight;
      synchronize();
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      interrupt();
      if (!observer) measure();
    },
    { signal, passive: true, capture: true },
  );
  window.addEventListener('resize', measure, { signal, passive: true });
  window.addEventListener(
    'blur',
    () => {
      interrupt();
      previousTime = null;
    },
    { signal },
  );
  document.addEventListener(
    'visibilitychange',
    () => {
      interrupt();
      synchronize();
    },
    { signal },
  );
  preference.addEventListener(
    'change',
    () => {
      interrupt();
      synchronize();
    },
    { signal },
  );
  button.addEventListener(
    'click',
    () => {
      paused = !paused;
      interrupt();
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
          if (!inViewport) interrupt();
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
    releaseGesture();
    events.abort();
    observer?.disconnect();
    resizeObserver?.disconnect();
    button.hidden = true;
    delete root.dataset.motionState;
  };
}
