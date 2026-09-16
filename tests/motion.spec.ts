import { expect, test, type Page } from '@playwright/test';
import { cssTimeToMilliseconds } from '../src/motion/settings';

const graphicSelector = '[data-hero-graphic]';
type DrawnPoint = [number, number, number, number];
interface CapturedFrame {
  points: DrawnPoint[];
  draws: number;
  pending: number;
}

declare global {
  interface Window {
    stepHeroMotion: (delta: number) => void;
    captureHeroFrame: () => CapturedFrame;
  }
}

// Observe the real canvas commands; no test hooks are shipped in the site.
async function installClock(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    let timestamp = 0;
    let id = 0;
    let draws = 0;
    let points: DrawnPoint[] = [];
    const callbacks = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = (callback) => {
      callbacks.set(++id, callback);
      return id;
    };
    window.cancelAnimationFrame = (frame) => {
      callbacks.delete(frame);
    };
    window.stepHeroMotion = (delta) => {
      timestamp += delta;
      const pending = [...callbacks.values()];
      callbacks.clear();
      pending.forEach((callback) => callback(timestamp));
    };
    window.captureHeroFrame = () => ({ points, draws, pending: callbacks.size });
    const clear = CanvasRenderingContext2D.prototype.clearRect;
    const arc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.clearRect = function (...args) {
      if (this.canvas.matches('.hero-graphic__surface')) {
        points = [];
        draws++;
      }
      return clear.apply(this, args);
    };
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      if (this.canvas.matches('.hero-graphic__surface')) {
        points.push([args[0], args[1], args[2], this.globalAlpha]);
      }
      return arc.apply(this, args);
    };
  });
}

async function step(page: Page, count = 1, delta = 1000 / 60): Promise<CapturedFrame> {
  return page.evaluate(
    ({ count, delta }) => {
      for (let index = 0; index < count; index++) window.stepHeroMotion(delta);
      return window.captureHeroFrame();
    },
    { count, delta },
  );
}

function displacement(a: CapturedFrame, b: CapturedFrame) {
  expect(a.points.length).toBeGreaterThan(1000);
  expect(a.points.length).toBe(b.points.length);
  return Math.max(
    ...a.points.map(([x, y], index) => Math.hypot(x - b.points[index][0], y - b.points[index][1])),
  );
}

async function sampleGraphic(page: Page) {
  return page
    .locator('canvas.hero-graphic__surface')
    .evaluate((element: HTMLCanvasElement) => element.toDataURL());
}

async function showGraphic(page: Page) {
  await page.locator(graphicSelector).scrollIntoViewIfNeeded();
  await expect(page.locator(graphicSelector)).toHaveAttribute('data-motion-state', 'running');
}

async function startClock(page: Page) {
  if (page.url().startsWith('http')) await page.reload();
  else await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await showGraphic(page);
  return step(page, 1, 0);
}

test('hover indents only nearby particles and returns smoothly at 30, 60, and 144 Hz', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Requires a fine pointer.');
  await installClock(page);
  await startClock(page);
  const restAtOneSecond = await step(page, 60);
  const restAtSixSeconds = await step(page, 300);
  const entered: CapturedFrame[] = [];

  for (const fps of [30, 60, 144]) {
    await page.mouse.move(0, 0);
    const initial = await startClock(page);
    const surface = page.locator('.hero-graphic__surface');
    const bounds = (await surface.boundingBox())!;
    const cursor = { x: 385, y: 315 };
    await page.mouse.move(
      bounds.x + (bounds.width * cursor.x) / 520,
      bounds.y + (bounds.height * cursor.y) / 500,
    );
    expect((await page.evaluate(() => window.captureHeroFrame())).draws).toBe(initial.draws);
    const first = await step(page, 1, 1000 / fps);
    expect(displacement(initial, first)).toBeGreaterThan(0.1);
    expect(displacement(initial, first)).toBeLessThan(9);
    const hovering = await step(page, fps - 1, 1000 / fps);
    expect(displacement(hovering, restAtOneSecond)).toBeGreaterThan(8);
    expect(displacement(hovering, restAtOneSecond)).toBeLessThan(20.1);
    const farDisplacements = hovering.points.flatMap(([x, y], index) => {
      const [restX, restY] = restAtOneSecond.points[index];
      return Math.hypot(restX - cursor.x, restY - cursor.y) > 85
        ? [Math.hypot(x - restX, y - restY)]
        : [];
    });
    expect(Math.max(...farDisplacements)).toBeLessThan(0.001);
    expect(
      hovering.points.some((point, index) => point[3] - restAtOneSecond.points[index][3] > 0.04),
    ).toBe(true);
    entered.push(hovering);

    await page.mouse.move(bounds.x + bounds.width * 0.3, bounds.y + bounds.height * 0.5);
    const reversing = await step(page, 1, 1000 / fps);
    expect(displacement(hovering, reversing)).toBeLessThan(9);
    expect(displacement(hovering, reversing)).toBeGreaterThan(0.1);
    await page.mouse.move(0, 0);
    const returned = await step(page, fps * 5 - 1, 1000 / fps);
    expect(displacement(returned, restAtSixSeconds)).toBeLessThan(0.001);
    expect(returned.pending).toBe(1);
    expect(await surface.boundingBox()).toEqual(bounds);
    expect(
      returned.points.every(
        ([x, y, radius]) =>
          x - radius > 0 && x + radius < 520 && y - radius > 0 && y + radius < 500,
      ),
    ).toBe(true);
  }
  expect(displacement(entered[0], entered[1])).toBeLessThan(0.3);
  expect(displacement(entered[1], entered[2])).toBeLessThan(0.3);
});

test('touch input leaves the perspective unchanged while particles keep moving', async ({
  page,
}) => {
  await installClock(page);
  const initial = await startClock(page);
  const untouched = await step(page, 60);
  expect(displacement(initial, untouched)).toBeGreaterThan(1);
  await startClock(page);
  const surface = page.locator('.hero-graphic__surface');
  const bounds = (await surface.boundingBox())!;
  await surface.dispatchEvent('pointermove', {
    pointerType: 'touch',
    clientX: bounds.x + bounds.width * 0.9,
    clientY: bounds.y + bounds.height * 0.1,
  });
  expect(displacement(await step(page, 60), untouched)).toBeLessThan(0.0001);
});

async function moveOnGraphic(page: Page, x: number, y: number) {
  const bounds = (await page.locator('.hero-graphic__surface').boundingBox())!;
  await page.mouse.move(bounds.x + (x / 520) * bounds.width, bounds.y + (y / 500) * bounds.height);
}

async function slowParticleFlow(page: Page) {
  // Isolate rotation from the traveling wave using the existing CSS timing controls.
  await page.route('**/*.css', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /(--motion-(?:ambient|pulse):)\s*[^;}]+/g,
        (_match, prefix: string) => `${prefix}1000000000s`,
      ),
    });
  });
}

test('grabbing pauses rotation, dragging persists, and release momentum decays', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Mouse gesture coverage.');
  await installClock(page);
  await slowParticleFlow(page);
  const initial = await startClock(page);
  const surface = page.locator('.hero-graphic__surface');
  await expect(surface).toHaveCSS('cursor', 'grab');
  await moveOnGraphic(page, 90, 40);
  await page.mouse.down();
  await expect(surface).toHaveCSS('cursor', 'grabbing');
  expect(displacement(initial, await step(page, 60))).toBeLessThan(0.001);

  let previous = await step(page);
  for (let index = 1; index <= 18; index++) {
    await moveOnGraphic(page, 90 + index * 15, 40);
    const current = await step(page);
    expect(displacement(previous, current)).toBeLessThan(16);
    previous = current;
  }
  expect(displacement(initial, previous)).toBeGreaterThan(45);
  await page.mouse.up();
  await page.mouse.move(0, 0);
  await expect(surface).toHaveCSS('cursor', 'grab');
  expect(displacement(previous, await page.evaluate(() => window.captureHeroFrame()))).toBe(0);
  const released = await step(page);
  const releaseSpeed = displacement(previous, released);
  expect(releaseSpeed).toBeGreaterThan(0.5);
  expect(releaseSpeed).toBeLessThan(13);
  const settled = await step(page, 150);
  const settledSpeed = displacement(settled, await step(page));
  expect(settledSpeed).toBeLessThan(releaseSpeed * 0.1);
  expect(displacement(initial, settled)).toBeGreaterThan(45);
  expect(settled.pending).toBe(1);

  // Regrabbing arrests momentum at the visible angle without snapping to a target.
  await moveOnGraphic(page, 90, 40);
  const beforeGrab = await page.evaluate(() => window.captureHeroFrame());
  await page.mouse.down();
  expect(displacement(beforeGrab, await step(page, 30))).toBeLessThan(0.001);
  await page.mouse.up();
});

test('one click produces an outward ripple that settles; a drag never produces a ripple', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Compare deterministic mouse gestures.');
  await installClock(page);
  const sampleCounts = [12, 15, 21, 120];
  const sequences: CapturedFrame[][] = [];
  for (const click of [false, true]) {
    await page.mouse.move(0, 0);
    await startClock(page);
    await moveOnGraphic(page, 260, 250);
    await page.mouse.down();
    if (!click) await page.locator('.hero-graphic__surface').dispatchEvent('pointercancel');
    await page.mouse.up();
    await page.mouse.move(0, 0);
    const frames = [];
    for (const count of sampleCounts) frames.push(await step(page, count));
    sequences.push(frames);
  }
  const radii: number[] = [];
  for (let index = 0; index < 3; index++) {
    const rest = sequences[0][index];
    const ripple = sequences[1][index];
    expect(displacement(rest, ripple)).toBeGreaterThan(0.4);
    expect(displacement(rest, ripple)).toBeLessThan(7);
    let weightedRadius = 0;
    let totalWeight = 0;
    ripple.points.forEach(([x, y], pointIndex) => {
      const [restX, restY] = rest.points[pointIndex];
      const weight = Math.hypot(x - restX, y - restY);
      weightedRadius += Math.hypot(restX - 260, restY - 250) * weight;
      totalWeight += weight;
    });
    radii.push(weightedRadius / totalWeight);
  }
  expect(radii[1]).toBeGreaterThan(radii[0] + 20);
  expect(radii[2]).toBeGreaterThan(radii[1] + 30);
  expect(displacement(sequences[0][3], sequences[1][3])).toBeLessThan(0.001);

  const afterDrag: CapturedFrame[] = [];
  for (const cancel of [false, true]) {
    await startClock(page);
    await moveOnGraphic(page, 260, 250);
    await page.mouse.down();
    await moveOnGraphic(page, 320, 250);
    await step(page, 12);
    // Returning to the starting point is still a drag, not a click.
    await moveOnGraphic(page, 260, 250);
    await step(page, 90);
    if (cancel) await page.locator('.hero-graphic__surface').dispatchEvent('pointercancel');
    await page.mouse.up();
    await page.mouse.move(0, 0);
    afterDrag.push(await step(page, 15));
  }
  expect(displacement(afterDrag[0], afterDrag[1])).toBeLessThan(0.001);
});

test('rapid reversals, pointer loss, resizing, and hidden time remain bounded', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Exercise interruptible mouse capture.');
  await installClock(page);
  await startClock(page);
  const surface = page.locator('.hero-graphic__surface');
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await moveOnGraphic(page, 260, 250);
  await page.mouse.down();
  let previous = await step(page);
  for (let index = 0; index < 24; index++) {
    await moveOnGraphic(page, index % 2 ? 30 : 490, index % 3 ? 45 : 455);
    const current = await step(page);
    expect(displacement(previous, current)).toBeLessThan(20);
    expect(current.pending).toBe(1);
    expect(
      current.points.every(
        ([x, y, radius]) =>
          Number.isFinite(x + y + radius) &&
          x - radius > 0 &&
          x + radius < 520 &&
          y - radius > 0 &&
          y + radius < 500,
      ),
    ).toBe(true);
    previous = current;
  }
  // Pointer capture keeps a drag working outside the surface and releases cleanly.
  await page.mouse.move(1200, 900);
  await step(page);
  await page.mouse.up();
  await expect(surface).toHaveCSS('cursor', 'grab');
  await moveOnGraphic(page, 260, 250);
  await page.mouse.down();
  await moveOnGraphic(page, 350, 260);
  previous = await step(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await step(page, 10, 1000);
  expect(hidden.draws).toBe(previous.draws);
  expect(hidden.pending).toBe(0);
  await expect(surface).toHaveCSS('cursor', 'grab');
  await page.evaluate(() => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(displacement(previous, await step(page, 1, 10000))).toBe(0);
  await page.mouse.up();

  previous = await step(page, 10);
  const count = previous.points.length;
  await page.setViewportSize({ width: 1024, height: 1000 });
  await page.waitForTimeout(100);
  const resized = await step(page, 1, 0);
  expect(resized.points.length).toBe(count);
  expect(displacement(previous, resized)).toBe(0);
  await surface.dispatchEvent('pointercancel');
  const stalled = await step(page, 1, 30000);
  expect(displacement(resized, stalled)).toBeLessThan(20);
  expect(stalled.pending).toBe(1);
  expect(errors).toEqual([]);
});

test('native touch taps ripple, horizontal drags rotate, and vertical swipes scroll', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === 'desktop', 'Requires an emulated touch device.');
  await installClock(page);
  await startClock(page);
  const untouched = await step(page, 15);
  await startClock(page);
  const surface = page.locator('.hero-graphic__surface');
  await expect(surface).toHaveCSS('touch-action', 'pan-y pinch-zoom');
  let bounds = (await surface.boundingBox())!;
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  const tapped = await step(page, 15);
  expect(displacement(untouched, tapped)).toBeGreaterThan(1);
  expect(displacement(untouched, tapped)).toBeLessThan(7);

  await startClock(page);
  bounds = (await surface.boundingBox())!;
  const initial = await step(page);
  const session = await page.context().newCDPSession(page);
  const startX = bounds.x + bounds.width * 0.35;
  const startY = bounds.y + bounds.height * 0.5;
  const scrollBefore = await page.evaluate(() => scrollY);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: startX, y: startY, id: 1 }],
  });
  for (let index = 1; index <= 16; index++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: startX + bounds.width * 0.025 * index, y: startY, id: 1 }],
    });
    await step(page);
  }
  await expect(page.locator(graphicSelector)).toHaveAttribute('data-dragging');
  const dragged = await step(page);
  expect(displacement(initial, dragged)).toBeGreaterThan(40);
  expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect(page.locator(graphicSelector)).not.toHaveAttribute('data-dragging');
  expect(displacement(dragged, await step(page))).toBeGreaterThan(0.1);

  await showGraphic(page);
  bounds = (await surface.boundingBox())!;
  const scrollStart = await page.evaluate(() => scrollY);
  const x = bounds.x + bounds.width / 2;
  const y = Math.min(bounds.y + bounds.height * 0.75, page.viewportSize()!.height - 30);
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x, y, id: 1 }],
  });
  for (let index = 1; index <= 10; index++) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - index * 15, id: 1 }],
    });
    await page.waitForTimeout(20);
    await step(page);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(scrollStart + 60);
  await expect(page.locator(graphicSelector)).not.toHaveAttribute('data-dragging');
  await session.detach();
});

test('CSS seconds and milliseconds produce identical slow motion in the production bundle', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The compiled timing is shared across viewports.');
  expect(cssTimeToMilliseconds('24s')).toBe(24000);
  expect(cssTimeToMilliseconds('24000ms')).toBe(24000);
  expect(cssTimeToMilliseconds(' .18s ')).toBe(180);
  expect(cssTimeToMilliseconds('0s')).toBe(0);
  expect(cssTimeToMilliseconds('invalid', 24000)).toBe(24000);
  expect(cssTimeToMilliseconds('24', 24000)).toBe(24000);

  await installClock(page);
  let unit = '24s';
  await page.route('**/*.css', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: (await response.text()).replace(
        /--motion-ambient:\s*[^;}]+/g,
        '--motion-ambient:' + unit,
      ),
    });
  });
  const initial = await startClock(page);
  const seconds = await step(page, 60);
  expect(displacement(initial, seconds)).toBeGreaterThan(1);
  expect(displacement(initial, seconds)).toBeLessThan(16);
  unit = '24000ms';
  await startClock(page);
  const milliseconds = await step(page, 60);
  expect(displacement(seconds, milliseconds)).toBeLessThan(0.0001);
});

test('desktop columns swap and mobile keeps the introduction above a stable canvas', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Exercise all breakpoints in one browser.');
  await page.goto('/');
  for (const width of [1920, 1440, 1024, 768, 767, 390, 320, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    const content = (await page.locator('.hero__content').boundingBox())!;
    const graphic = (await page.locator(graphicSelector).boundingBox())!;
    if (width >= 768) {
      expect(graphic.x + graphic.width).toBeLessThan(content.x);
      expect(
        Math.abs(graphic.y + graphic.height / 2 - content.y - content.height / 2),
      ).toBeLessThan(1);
    } else {
      expect(content.y + content.height).toBeLessThan(graphic.y);
    }
    await expect(page.locator('.hero__content')).toHaveCSS('text-align', 'left');
    const surface = page.locator('canvas.hero-graphic__surface');
    await surface.scrollIntoViewIfNeeded();
    await expect
      .poll(() =>
        surface.evaluate((canvas: HTMLCanvasElement) => {
          const rect = canvas.getBoundingClientRect();
          return Math.abs(canvas.width - Math.round(rect.width * Math.min(devicePixelRatio, 2)));
        }),
      )
      .toBe(0);
    const box = (await surface.boundingBox())!;
    expect(box.width / box.height).toBeCloseTo(520 / 500, 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await surface.evaluate((canvas: HTMLCanvasElement) => {
        const pixels = canvas
          .getContext('2d')!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        return pixels.some((value, index) => index % 4 === 3 && value > 0);
      }),
    ).toBe(true);
  }
});

test('decorative motion runs, pauses with the keyboard, persists, and suspends offscreen', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await showGraphic(page);
  const start = await sampleGraphic(page);
  await expect.poll(() => sampleGraphic(page)).not.toBe(start);

  const pause = page.getByRole('button', { name: 'Pause decorative animation', exact: true });
  await pause.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(graphicSelector)).toHaveAttribute('data-motion-state', 'paused');
  const paused = await sampleGraphic(page);
  await page.waitForTimeout(250);
  expect(await sampleGraphic(page)).toBe(paused);
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Resume decorative animation', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Resume decorative animation', exact: true }).click();
  await showGraphic(page);

  await page
    .locator('#projects')
    .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }));
  await expect(page.locator(graphicSelector)).toHaveAttribute('data-motion-state', 'offscreen');
  const offscreen = await sampleGraphic(page);
  await page.waitForTimeout(250);
  expect(await sampleGraphic(page)).toBe(offscreen);
  await showGraphic(page);
  await expect.poll(() => sampleGraphic(page)).not.toBe(offscreen);
});

test('reduced motion stays static and responds to preference changes', async ({ page }) => {
  await page.goto('/');
  const graphic = page.locator(graphicSelector);
  await expect(graphic).toHaveAttribute('data-motion-state', 'reduced');
  await expect(page.getByRole('button', { name: /disabled by reduced motion/ })).toBeDisabled();
  await page.locator('.hero-graphic__surface').scrollIntoViewIfNeeded();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const initial = await sampleGraphic(page);
  await page.locator('.hero-graphic__surface').hover();
  await page.mouse.down();
  await moveOnGraphic(page, 390, 250);
  await page.mouse.up();
  await page.locator('.hero-graphic__surface').click();
  await page.waitForTimeout(250);
  expect(await sampleGraphic(page)).toBe(initial);
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await showGraphic(page);
  await expect.poll(() => sampleGraphic(page)).not.toBe(initial);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(graphic).toHaveAttribute('data-motion-state', 'reduced');
  const reduced = await sampleGraphic(page);
  await page.waitForTimeout(250);
  expect(await sampleGraphic(page)).toBe(reduced);
});

test('the visibility lifecycle stops the clock and resumes without a jump', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await showGraphic(page);
  // Simulate the visibility event in every emulated viewport; backgrounding
  // headless tabs is not consistent across Chromium platforms.
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect(page.locator(graphicSelector)).toHaveAttribute('data-motion-state', 'hidden');
  const hidden = await sampleGraphic(page);
  await page.waitForTimeout(300);
  expect(await sampleGraphic(page)).toBe(hidden);
  const frameBefore = await sampleGraphic(page);
  const frameAfter = await page.evaluate(async () => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(requestAnimationFrame);
    return document.querySelector<HTMLCanvasElement>('.hero-graphic__surface')!.toDataURL();
  });
  expect(frameAfter).toBe(frameBefore);
  await expect(page.locator(graphicSelector)).toHaveAttribute('data-motion-state', 'running');
  await expect.poll(() => sampleGraphic(page)).not.toBe(hidden);
});

test('entrances play once and content remains available without animation APIs', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      if (this instanceof HTMLElement && this.matches('[data-reveal], [data-hero-enter]')) {
        this.dataset.entranceCount = String(Number(this.dataset.entranceCount ?? 0) + 1);
      }
      return animate.call(this, keyframes, options);
    };
  });
  await page.goto('/#main-content');
  await expect(page.locator('#hero-heading')).toHaveAttribute('data-entrance-count', '1');
  const heading = page.locator('#projects .section-heading');
  await heading.evaluate((element) => element.scrollIntoView({ behavior: 'instant' }));
  await expect(heading).toHaveAttribute('data-entrance-count', '1');
  await page.waitForTimeout(650);
  await page
    .locator('#home')
    .evaluate((element) => element.scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(100);
  await heading.evaluate((element) => element.scrollIntoView({ behavior: 'instant' }));
  await expect(heading).toHaveAttribute('data-entrance-count', '1');
  expect(await heading.evaluate((element) => element.getAnimations().length)).toBe(0);

  await page.addInitScript(() => {
    Object.defineProperty(window, 'IntersectionObserver', { value: undefined });
    Object.defineProperty(Element.prototype, 'animate', { value: undefined });
  });
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('canvas.hero-graphic__surface')).toBeVisible();
  await expect(page.getByRole('link', { name: 'View projects', exact: true })).toBeVisible();
  expect(await heading.evaluate((element) => getComputedStyle(element).opacity)).toBe('1');
});

test('anchor navigation scrolls smoothly with header clearance and keyboard focus', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const samples = await page.evaluate(async () => {
    const link = document.querySelector<HTMLAnchorElement>('.hero__actions a[href="#projects"]')!;
    link.click();
    const values: number[] = [];
    await new Promise<void>((resolve) => {
      function record() {
        values.push(scrollY);
        if (values.length < 18) requestAnimationFrame(record);
        else resolve();
      }
      requestAnimationFrame(record);
    });
    return values;
  });
  expect(new Set(samples).size).toBeGreaterThan(3);
  await expect(page.locator('#projects')).toBeFocused();
  const expectedTop = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop),
  );
  await expect
    .poll(() =>
      page
        .locator('#projects')
        .evaluate((element) => Math.round(element.getBoundingClientRect().top)),
    )
    .toBe(Math.round(expectedTop));
  await expect(page).toHaveURL(/#projects$/);
  await page.goBack();
  await expect(page).not.toHaveURL(/#projects$/);
});

test('mobile menu remains reliable when interrupted and never traps hidden focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  const navigation = page.locator('#primary-navigation');
  await menu.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'About', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(navigation).toHaveAttribute('inert', '');
  await expect(navigation).toBeHidden();
  await menu.click();
  await page.getByRole('link', { name: 'Work', exact: true }).click();
  await expect(page.locator('#projects')).toBeFocused();
  await expect(navigation).toBeHidden();
});
