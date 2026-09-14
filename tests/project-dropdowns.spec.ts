import { expect, test, type Locator } from '@playwright/test';

const rows = '.more-projects .project-list__item';

async function sampleToggle(details: Locator, reverse = false) {
  return details.evaluate(async (element, shouldReverse) => {
    const disclosure = element as HTMLDetailsElement;
    const summary = disclosure.querySelector('summary')!;
    const panel = disclosure.querySelector<HTMLElement>('.project-list__panel')!;
    const content = disclosure.querySelector<HTMLElement>('.project-list__details')!;
    const indicator = summary.querySelector<SVGElement>('.icon')!;
    const row = disclosure.parentElement!;
    const nextRow = row.nextElementSibling as HTMLElement;
    const snapshot = () => {
      const styles = getComputedStyle(content);
      const iconMatrix = new DOMMatrixReadOnly(getComputedStyle(indicator).transform);
      return {
        height: disclosure.getBoundingClientRect().height,
        nextTop: nextRow.offsetTop - row.offsetTop,
        opacity: Number(styles.opacity),
        y: new DOMMatrixReadOnly(styles.transform).m42,
        angle: (Math.atan2(iconMatrix.b, iconMatrix.a) * 180) / Math.PI,
        open: disclosure.open,
      };
    };
    const samples = [snapshot()];
    summary.click();
    samples.push(snapshot());
    const timing = [panel, content, indicator].flatMap((target) =>
      target.getAnimations().map((animation) => animation.effect!.getTiming()),
    );
    const reversals: { before: ReturnType<typeof snapshot>; after: ReturnType<typeof snapshot> }[] =
      [];
    const start = performance.now();
    await new Promise<void>((resolve) => {
      function record() {
        const elapsed = performance.now() - start;
        samples.push(snapshot());
        if (shouldReverse && reversals.length < 2 && elapsed >= (reversals.length + 1) * 100) {
          const before = snapshot();
          summary.click();
          reversals.push({ before, after: snapshot() });
        }
        if (elapsed < (shouldReverse ? 750 : 500)) requestAnimationFrame(record);
        else resolve();
      }
      requestAnimationFrame(record);
    });
    return { samples, timing, reversals };
  }, reverse);
}

async function expectNaturalHeight(details: Locator) {
  await expect(details.locator('summary')).toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(() =>
      details.locator('.project-list__panel').evaluate((panel) => panel.getAnimations().length),
    )
    .toBe(0);
  const geometry = await details.evaluate((element) => {
    const panel = element.querySelector<HTMLElement>('.project-list__panel')!;
    const content = element.querySelector<HTMLElement>('.project-list__details')!;
    return {
      panel: panel.getBoundingClientRect().height,
      content: content.getBoundingClientRect().height,
      clipped: content.scrollHeight > content.clientHeight,
      overflow: getComputedStyle(panel).overflow,
    };
  });
  expect(geometry.panel).toBeGreaterThan(0);
  expect(Math.abs(geometry.panel - geometry.content)).toBeLessThan(1);
  expect(geometry.clipped).toBe(false);
  expect(geometry.overflow).toBe('visible');
}

test('project dropdowns animate actual height, content, indicator, and adjacent rows on opening and closing', async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const first = page.locator(rows).first();
  await first.locator('summary').focus();
  const opening = await sampleToggle(first);
  expect(opening.timing).toHaveLength(3);
  for (const timing of opening.timing) {
    expect(timing.duration).toBe(425);
    expect(timing.easing).toBe('cubic-bezier(0.22, 1, 0.36, 1)');
  }
  const collapsed = opening.samples[0].height;
  const expanded = opening.samples.at(-1)!.height;
  expect(opening.samples[1].height).toBeCloseTo(collapsed, 1);
  expect(opening.samples[1].y).toBeCloseTo(4, 1);
  expect(expanded).toBeGreaterThan(collapsed + 200);
  expect(
    opening.samples.filter((sample) => sample.height > collapsed && sample.height < expanded)
      .length,
  ).toBeGreaterThan(3);
  expect(
    opening.samples.some(
      (sample) =>
        sample.opacity > 0 &&
        sample.opacity < 1 &&
        sample.y > 0 &&
        sample.y < 4 &&
        sample.angle > 0 &&
        sample.angle < 45,
    ),
  ).toBe(true);
  for (const sample of opening.samples)
    expect(Math.abs(sample.nextTop - sample.height)).toBeLessThan(1.5);
  await expectNaturalHeight(first);
  await page
    .locator('.more-projects')
    .screenshot({ path: testInfo.outputPath('expanded.png'), animations: 'disabled' });

  const closing = await sampleToggle(first);
  expect(closing.samples[1].height).toBeCloseTo(closing.samples[0].height, 1);
  expect(closing.samples[1].open).toBe(true);
  expect(
    closing.samples.some(
      (sample) =>
        sample.open &&
        sample.height > collapsed &&
        sample.height < expanded &&
        sample.opacity < 1 &&
        sample.opacity > 0,
    ),
  ).toBe(true);
  for (const sample of closing.samples)
    expect(Math.abs(sample.nextTop - sample.height)).toBeLessThan(1.5);
  expect(closing.samples.at(-1)!.height).toBeCloseTo(collapsed, 1);
  expect(closing.samples.at(-1)!.open).toBe(false);
  await expect(first.locator('.project-list__details')).toBeHidden();
  await expect(first.locator('summary')).toHaveAttribute('aria-expanded', 'false');
});

test('rapid project toggles reverse height, opacity, movement, and the indicator from their current position', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const first = page.locator(rows).first();
  await first.locator('summary').focus();
  const opening = await sampleToggle(first, true);
  const closing = await sampleToggle(first, true);
  for (const transition of [opening, closing]) {
    expect(transition.reversals).toHaveLength(2);
    for (const { before, after } of transition.reversals) {
      expect(Math.abs(after.height - before.height)).toBeLessThan(1);
      expect(Math.abs(after.opacity - before.opacity)).toBeLessThan(0.01);
      expect(Math.abs(after.y - before.y)).toBeLessThan(0.1);
      expect(Math.abs(after.angle - before.angle)).toBeLessThan(0.1);
    }
  }
  expect(opening.samples.at(-1)!.open).toBe(true);
  expect(closing.samples.at(-1)!.open).toBe(false);
  expect(closing.samples.at(-1)!.height).toBeCloseTo(opening.samples[0].height, 1);
});

test('project dropdowns preserve independent native keyboard and touch controls and bookmarked links', async ({
  page,
  hasTouch,
}) => {
  await page.goto('/');
  const items = page.locator(rows);
  const first = items.nth(0);
  const second = items.nth(1);
  await first.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expectNaturalHeight(first);
  await expect(first.locator('summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first.getByRole('link', { name: /^View image:/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(second.locator('summary')).toBeFocused();
  await page.keyboard.press('Space');
  await expectNaturalHeight(second);
  await expect(first).toHaveAttribute('open', '');
  if (hasTouch) await first.locator('summary').tap();
  else await first.locator('summary').click();
  await expect(first).not.toHaveAttribute('open');
  await expect(first.locator('.project-list__panel')).toHaveAttribute('inert', '');
  await expect(second).toHaveAttribute('open', '');
  await page.goto('/#project-play');
  await expectNaturalHeight(page.locator('#project-play'));
  await expect(page.locator('#project-play .project-list__note')).toBeVisible();
});

test('project panels accommodate long content and viewport changes during an animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  const first = page.locator(rows).first();
  await first.locator('.project-list__details').evaluate((content) => {
    const paragraph = document.createElement('p');
    paragraph.textContent =
      'Additional project information remains fully readable at every screen size. '.repeat(70);
    content.append(paragraph);
  });
  await first.locator('summary').evaluate((summary) => (summary as HTMLElement).click());
  await page.setViewportSize({ width: 320, height: 740 });
  await expectNaturalHeight(first);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expectNaturalHeight(first);
  await first.locator('summary').evaluate((summary) => (summary as HTMLElement).click());
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(first).not.toHaveAttribute('open');
  await expect(first.locator('.project-list__details')).toBeHidden();
});

test('project dropdowns honor reduced motion, live preference changes, and unavailable animation APIs', async ({
  page,
}) => {
  await page.goto('/');
  const first = page.locator(rows).first();
  const summary = first.locator('summary');
  await summary.click();
  await expectNaturalHeight(first);
  expect(await first.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
    0,
  );
  await summary.click();
  await expect(first).not.toHaveAttribute('open');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await summary.evaluate((element) => (element as HTMLElement).click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expectNaturalHeight(first);
  expect(await first.evaluate((element) => element.getAnimations({ subtree: true }).length)).toBe(
    0,
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await summary.evaluate((element) => (element as HTMLElement).click());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(first).not.toHaveAttribute('open');
  await page.addInitScript(() =>
    Object.defineProperty(Element.prototype, 'animate', { value: undefined }),
  );
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await summary.focus();
  await page.keyboard.press('Enter');
  await expectNaturalHeight(first);
  await page.keyboard.press('Space');
  await expect(first).not.toHaveAttribute('open');
});
