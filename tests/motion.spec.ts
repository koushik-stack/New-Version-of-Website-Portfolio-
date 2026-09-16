import { expect, test, type Page } from '@playwright/test';
import { cssTimeToMilliseconds } from '../src/motion/settings';

const graphicSelector = '[data-hero-graphic]';
type DrawnPoint = [number, number, number];
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
      if (this.canvas.matches('.hero-graphic__surface')) points.push([args[0], args[1], args[2]]);
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

test('mouse hover eases, reverses, and returns to rest at 60 and 144 Hz', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Requires a fine pointer.');
  await installClock(page);
  await startClock(page);
  const restAtOneSecond = await step(page, 60);
  const restAtSixSeconds = await step(page, 300);
  const entered: CapturedFrame[] = [];

  for (const fps of [60, 144]) {
    await page.mouse.move(0, 0);
    const initial = await startClock(page);
    const surface = page.locator('.hero-graphic__surface');
    const bounds = (await surface.boundingBox())!;
    await page.mouse.move(bounds.x + bounds.width * 0.9, bounds.y + bounds.height * 0.15);
    expect((await page.evaluate(() => window.captureHeroFrame())).draws).toBe(initial.draws);
    const first = await step(page, 1, 1000 / fps);
    expect(displacement(initial, first)).toBeGreaterThan(0.1);
    expect(displacement(initial, first)).toBeLessThan(3);
    const hovering = await step(page, fps - 1, 1000 / fps);
    expect(displacement(hovering, restAtOneSecond)).toBeGreaterThan(8);
    entered.push(hovering);

    await page.mouse.move(bounds.x + bounds.width * 0.1, bounds.y + bounds.height * 0.85);
    const reversing = await step(page, 1, 1000 / fps);
    expect(displacement(hovering, reversing)).toBeLessThan(5);
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
  expect(displacement(entered[0], entered[1])).toBeLessThan(0.0001);
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
