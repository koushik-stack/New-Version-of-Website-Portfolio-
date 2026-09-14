import { expect, test, type Locator } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { experience } from '../src/data/experience';

const entriesSelector = '#experience .experience-entry';

async function sampleToggle(panel: Locator) {
  return panel.evaluate(async (element) => {
    const toggle = document.getElementById(element.getAttribute('aria-labelledby')!)!;
    const samples: { height: number; opacity: number }[] = [];
    const sample = () => ({
      height: element.getBoundingClientRect().height,
      opacity: Number(getComputedStyle(element).opacity),
    });
    samples.push(sample());
    toggle.click();
    samples.push(sample());
    const durations = element
      .getAnimations()
      .map((animation) => animation.effect!.getTiming().duration);
    const start = performance.now();
    await new Promise<void>((resolve) => {
      function record() {
        samples.push(sample());
        if (performance.now() - start < 450) requestAnimationFrame(record);
        else resolve();
      }
      requestAnimationFrame(record);
    });
    return { samples, durations };
  });
}

async function expectFullyExpanded(panel: Locator) {
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS('opacity', '1');
  const dimensions = await panel.evaluate((element) => {
    const content = element.firstElementChild as HTMLElement;
    return {
      height: element.getBoundingClientRect().height,
      contentHeight: content.scrollHeight,
      clipped: content.scrollHeight > content.clientHeight,
    };
  });
  expect(dimensions.height).toBeGreaterThan(0);
  expect(Math.abs(dimensions.height - dimensions.contentHeight)).toBeLessThanOrEqual(1);
  expect(dimensions.clipped).toBe(false);
}

test('every experience entry keeps its summary visible and opens independently by mouse or touch', async ({
  page,
  hasTouch,
}) => {
  await page.goto('/#experience');
  const entries = page.locator(entriesSelector);
  await expect(entries).toHaveCount(experience.length);
  const controlIds: string[] = [];

  for (const [index, entry] of experience.entries()) {
    const item = entries.nth(index);
    const toggle = item.getByRole('button', { name: entry.company, exact: true });
    const panel = item.locator('.experience-entry__details');
    await expect(toggle).toHaveAttribute('aria-expanded', String(index === 0));
    await expect(item.getByRole('heading', { name: entry.company, exact: true })).toBeVisible();
    await expect(item.locator('.experience-entry__role')).toHaveText(entry.role);
    await expect(item.locator('.experience-entry__role')).toBeVisible();
    await expect(item.locator('.experience-entry__period')).toHaveText(entry.period);
    await expect(item.locator('.experience-entry__period')).toBeVisible();
    await expect(item.locator('.experience-entry__description li')).toHaveText(entry.description);
    await expect(item.locator('.tag-list li')).toHaveText(entry.focus);
    const controlId = (await toggle.getAttribute('aria-controls'))!;
    controlIds.push(controlId);
    await expect(panel).toHaveAttribute('id', controlId);
    if (index === 0) await expectFullyExpanded(panel);
    else await expect(panel).toBeHidden();
  }
  expect(new Set(controlIds).size).toBe(experience.length);

  for (let index = 1; index < experience.length; index++) {
    const toggle = entries.nth(index).getByRole('button');
    if (hasTouch) await toggle.tap();
    else await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expectFullyExpanded(entries.nth(index).locator('.experience-entry__details'));
  }
  await expect(page.locator(`${entriesSelector} button[aria-expanded="true"]`)).toHaveCount(
    experience.length,
  );

  for (let index = 0; index < experience.length; index++) {
    const item = entries.nth(index);
    const toggle = item.getByRole('button');
    if (hasTouch) await toggle.tap();
    else await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(item.locator('.experience-entry__details')).toBeHidden();
    await expect(item.getByRole('heading')).toBeVisible();
    await expect(item.locator('.experience-entry__role')).toBeVisible();
    await expect(item.locator('.experience-entry__period')).toBeVisible();
    await expect(page.locator(`${entriesSelector} button[aria-expanded="true"]`)).toHaveCount(
      experience.length - index - 1,
    );
  }
});

test('experience headings support Tab, Shift+Tab, Enter, and Space with visible focus', async ({
  page,
}) => {
  await page.goto('/#experience');
  const toggles = page.locator(`${entriesSelector} button`);
  await toggles.first().focus();
  await expect(toggles.first()).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Enter');
  await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
  await expect(toggles.first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(toggles.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'true');
  await expectFullyExpanded(
    page.locator(entriesSelector).nth(1).locator('.experience-entry__details'),
  );
  await page.keyboard.press('Tab');
  await expect(toggles.nth(2)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(toggles.nth(1)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(toggles.nth(1)).toHaveAttribute('aria-expanded', 'false');
  await expect(toggles.first()).toHaveAttribute('aria-expanded', 'false');
});

test('experience height and opacity animate in both directions over 350 ms without truncating long content', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#experience');
  const entry = page.locator(entriesSelector).nth(1);
  const panel = entry.locator('.experience-entry__details');
  await entry.evaluate((element) => element.scrollIntoView({ behavior: 'instant' }));
  await panel.locator('.experience-entry__description').evaluate((element) => {
    const bullet = document.createElement('li');
    bullet.textContent =
      'Longer experience descriptions should always remain fully readable. '.repeat(80);
    element.append(bullet);
  });

  const opening = await sampleToggle(panel);
  expect(opening.durations.length).toBeGreaterThanOrEqual(2);
  expect(opening.durations.every((duration) => duration === 350)).toBe(true);
  expect(opening.samples[0].height).toBe(0);
  expect(opening.samples[1].height).toBeLessThan(1);
  const fullHeight = opening.samples.at(-1)!.height;
  expect(fullHeight).toBeGreaterThan(350);
  expect(
    opening.samples.filter((sample) => sample.height > 0 && sample.height < fullHeight).length,
  ).toBeGreaterThan(3);
  expect(opening.samples.some((sample) => sample.opacity > 0 && sample.opacity < 1)).toBe(true);
  await expectFullyExpanded(panel);
  await expect(entry.locator('.experience-entry__chevron')).toHaveCSS(
    'transform',
    'matrix(-1, 0, 0, -1, 0, 0)',
  );

  const closing = await sampleToggle(panel);
  expect(Math.abs(closing.samples[1].height - fullHeight)).toBeLessThan(1);
  expect(
    closing.samples.filter((sample) => sample.height > 0 && sample.height < fullHeight).length,
  ).toBeGreaterThan(3);
  expect(closing.samples.some((sample) => sample.opacity > 0 && sample.opacity < 1)).toBe(true);
  expect(closing.samples.at(-1)).toEqual({ height: 0, opacity: 0 });
  await expect(panel).toBeHidden();
  await expect(entry.locator('.experience-entry__chevron')).toHaveCSS('transform', 'none');
});

test('experience animation reverses smoothly and fits content after resizing', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#experience');
  const panel = page.locator(entriesSelector).nth(1).locator('.experience-entry__details');
  const reversals = await panel.evaluate(async (element) => {
    const toggle = document.getElementById(element.getAttribute('aria-labelledby')!)!;
    const changes: number[] = [];
    const waitForFrames = (duration: number) =>
      new Promise<void>((resolve) => {
        const start = performance.now();
        function frame() {
          if (performance.now() - start < duration) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    element.getBoundingClientRect();
    toggle.click();
    for (let index = 0; index < 2; index++) {
      await waitForFrames(100);
      const before = element.getBoundingClientRect().height;
      toggle.click();
      changes.push(Math.abs(element.getBoundingClientRect().height - before));
    }
    return changes;
  });
  expect(reversals.every((change) => change < 1)).toBe(true);
  await expectFullyExpanded(panel);
  await page.setViewportSize({ width: 320, height: 740 });
  await expectFullyExpanded(panel);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expectFullyExpanded(panel);
});

test('reduced motion settles experience panels immediately, including preference changes during animation', async ({
  page,
}) => {
  await page.goto('/#experience');
  const entry = page.locator(entriesSelector).nth(1);
  const panel = entry.locator('.experience-entry__details');
  const toggle = entry.getByRole('button');
  const immediate = await panel.evaluate((element) => {
    const button = document.getElementById(element.getAttribute('aria-labelledby')!)!;
    button.click();
    const opened = {
      height: element.getBoundingClientRect().height,
      opacity: getComputedStyle(element).opacity,
    };
    button.click();
    const closed = {
      height: element.getBoundingClientRect().height,
      opacity: getComputedStyle(element).opacity,
    };
    return { opened, closed };
  });
  expect(immediate.opened.height).toBeGreaterThan(0);
  expect(immediate.opened.opacity).toBe('1');
  expect(immediate.closed).toEqual({ height: 0, opacity: '0' });
  await expect(panel).toBeHidden();
  expect(await entry.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
    0,
  );

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await toggle.evaluate((element) => (element as HTMLButtonElement).click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectFullyExpanded(panel);
  expect(await entry.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
    0,
  );
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await toggle.evaluate((element) => (element as HTMLButtonElement).click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(panel).toBeHidden();
  expect(await panel.evaluate((element) => element.getBoundingClientRect().height)).toBe(0);
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('experience buttons and panels have accessible semantics in collapsed and expanded states', async ({
  page,
}) => {
  await page.goto('/#experience');
  const audit = () =>
    new AxeBuilder({ page })
      .include('#experience')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
  expect((await audit()).violations).toEqual([]);
  for (const toggle of await page.locator(`${entriesSelector} button`).all()) {
    if ((await toggle.getAttribute('aria-expanded')) === 'false') await toggle.click();
  }
  await expect(page.locator(`${entriesSelector} button[aria-expanded="true"]`)).toHaveCount(
    experience.length,
  );
  expect((await audit()).violations).toEqual([]);
});
