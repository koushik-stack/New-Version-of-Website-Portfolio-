import { expect, test, type Page } from '@playwright/test';

const graphicSelector = '[data-hero-graphic]';

async function sampleGraphic(page: Page) {
  return page.locator('.hero-graphic__surface').evaluate((element) => element.innerHTML);
}

async function showGraphic(page: Page) {
  await page.locator(graphicSelector).scrollIntoViewIfNeeded();
  await expect(page.locator(graphicSelector)).toHaveAttribute('data-motion-state', 'running');
}

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
  const initial = await sampleGraphic(page);
  await page.mouse.move(200, 300);
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
  const nodeBefore = await page
    .locator('.hero-graphic__nodes > g')
    .first()
    .getAttribute('transform');
  const nodeAfter = await page.evaluate(async () => {
    Reflect.deleteProperty(document, 'hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(requestAnimationFrame);
    return document.querySelector('.hero-graphic__nodes > g')!.getAttribute('transform');
  });
  expect(nodeAfter).toBe(nodeBefore);
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
      if (this instanceof HTMLElement && this.hasAttribute('data-reveal')) {
        this.dataset.entranceCount = String(Number(this.dataset.entranceCount ?? 0) + 1);
      }
      return animate.call(this, keyframes, options);
    };
  });
  await page.goto('/');
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
  await expect(page.locator('.hero-graphic__grid path')).toHaveCount(48);
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
