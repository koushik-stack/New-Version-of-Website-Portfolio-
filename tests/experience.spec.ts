import { expect, test, type Locator, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { experience } from '../src/data/experience';

const tabsSelector = '#experience [role="tab"]';
const panelsSelector = '#experience [role="tabpanel"]';

async function expectSettled(page: Page, index: number) {
  const panel = page.locator(panelsSelector).nth(index);
  await expect(page.locator(tabsSelector).nth(index)).toHaveAttribute('aria-selected', 'true');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveCSS('opacity', '1');
  await expect(page.locator('#experience .experience-panels')).not.toHaveAttribute(
    'style',
    /height/,
  );
  const geometry = await panel.evaluate((element) => {
    const stage = element.parentElement!;
    return {
      height: element.getBoundingClientRect().height,
      stageHeight: stage.getBoundingClientRect().height,
      clipped: element.scrollHeight > element.clientHeight + 1,
      overflow: getComputedStyle(stage).overflow,
      visiblePanels: stage.querySelectorAll('.is-visible').length,
    };
  });
  expect(geometry.height).toBeGreaterThan(0);
  expect(Math.abs(geometry.height - geometry.stageHeight)).toBeLessThan(1);
  expect(geometry.clipped).toBe(false);
  expect(geometry.overflow).toBe('visible');
  expect(geometry.visiblePanels).toBe(1);
}

async function waitForEntrance(page: Page) {
  await expect
    .poll(() =>
      page
        .locator('#experience')
        .evaluate((element) => element.getAnimations({ subtree: true }).length),
    )
    .toBe(0);
}

async function sampleSwitches(stage: Locator, sequence: number[], interval = 90) {
  return stage.evaluate(
    async (element, { sequence, interval }) => {
      const tabs = Array.from(
        document.querySelectorAll<HTMLButtonElement>('#experience [role="tab"]'),
      );
      const panels = Array.from(element.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
      const timing = new Map<Animation, EffectTiming>();
      const snapshot = () => {
        const bounds = element.getBoundingClientRect();
        const painted = panels.filter(
          (panel) =>
            getComputedStyle(panel).visibility === 'visible' &&
            Number(getComputedStyle(panel).opacity) > 0.001,
        );
        for (const target of [element, ...panels]) {
          for (const animation of target.getAnimations())
            timing.set(animation, animation.effect!.getTiming());
        }
        return {
          height: bounds.height,
          opacity: panels.map((panel) => Number(getComputedStyle(panel).opacity)),
          painted: painted.length,
          contained: painted.every(
            (panel) => panel.getBoundingClientRect().bottom <= bounds.bottom + 1,
          ),
          nextSectionClear: painted.every(
            (panel) =>
              panel.getBoundingClientRect().bottom <=
              document.querySelector('#projects')!.getBoundingClientRect().top,
          ),
        };
      };
      const samples = [snapshot()];
      const jumps: number[] = [];
      let index = 0;
      const start = performance.now();
      const click = () => {
        const before = snapshot();
        tabs[sequence[index++]].click();
        const after = snapshot();
        jumps.push(Math.abs(after.height - before.height));
        samples.push(after);
      };
      click();
      await new Promise<void>((resolve) => {
        function record() {
          const elapsed = performance.now() - start;
          samples.push(snapshot());
          if (index < sequence.length && elapsed >= index * interval) click();
          if (elapsed < (sequence.length - 1) * interval + 1000) requestAnimationFrame(record);
          else resolve();
        }
        requestAnimationFrame(record);
      });
      return { samples, jumps, timing: [...timing.values()] };
    },
    { sequence, interval },
  );
}

test('company tabs preserve every role, date, contribution and tag in the original order', async ({
  page,
  hasTouch,
}) => {
  await page.goto('/#experience');
  const tabs = page.locator(tabsSelector);
  const panels = page.locator(panelsSelector);
  await expect(tabs).toHaveText(experience.map((entry) => entry.company));
  await expect(panels).toHaveCount(experience.length);
  await expectSettled(page, 0);
  await expect(page.locator('#experience-heading')).toHaveText('Where I’ve contributed');

  for (const [index, entry] of experience.entries()) {
    const tab = tabs.nth(index);
    const panel = panels.nth(index);
    expect(await tab.getAttribute('aria-controls')).toBe(await panel.getAttribute('id'));
    expect(await panel.getAttribute('aria-labelledby')).toBe(await tab.getAttribute('id'));
    if (hasTouch) await tab.tap();
    else await tab.click();
    await expectSettled(page, index);
    await expect(panel.getByRole('heading')).toHaveText(
      `${entry.role.trim()} @ ${entry.company.trim()}`,
    );
    await expect(panel.locator('.experience-entry__role')).toHaveText(entry.role);
    await expect(panel.locator('.experience-entry__period')).toHaveText(entry.period);
    await expect(panel.locator('.experience-entry__description li')).toHaveText(entry.description);
    await expect(panel.locator('.tag-list li')).toHaveText(entry.focus);
    await expect(page.locator('#experience [role="tab"][aria-selected="true"]')).toHaveCount(1);
    await expect(page.getByRole('tabpanel')).toHaveCount(1);
    await expect(page.locator('#experience [role="tabpanel"][inert]')).toHaveCount(
      experience.length - 1,
    );
  }
});

test('tabs support arrows, wraparound, Home, End, Enter, Space and visible keyboard focus', async ({
  page,
}) => {
  await page.goto('/#experience');
  const tabs = page.locator(tabsSelector);
  const horizontal = page.viewportSize()!.width <= 767;
  const next = horizontal ? 'ArrowRight' : 'ArrowDown';
  const previous = horizontal ? 'ArrowLeft' : 'ArrowUp';
  await tabs.first().focus();
  await expect(tabs.first()).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press(previous);
  await expect(tabs.last()).toBeFocused();
  await expectSettled(page, experience.length - 1);
  await page.keyboard.press(next);
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press('End');
  await expect(tabs.last()).toBeFocused();
  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();
  await page.keyboard.press(next);
  await expect(tabs.nth(1)).toBeFocused();
  await expect(tabs.nth(1)).toHaveCSS('outline-style', 'solid');
  await page.keyboard.press('Tab');
  await expect(page.locator(panelsSelector).nth(1)).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(tabs.nth(1)).toBeFocused();
  await tabs.nth(2).focus();
  await page.keyboard.press('Enter');
  await expectSettled(page, 2);
  await tabs.nth(3).focus();
  await page.keyboard.press('Space');
  await expectSettled(page, 3);
  await expect(page.locator('#experience [role="tab"][tabindex="0"]')).toHaveCount(1);

  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.keyboard.press('Home');
  // Keyboard users can enter the new panel without waiting for its reveal.
  await page.keyboard.press('Tab');
  await expect(page.locator(panelsSelector).first()).toBeFocused();
  await expectSettled(page, 0);
});

test('desktop columns and mobile scrolling stay aligned without page overflow', async ({
  page,
}, testInfo) => {
  await page.goto('/#experience');
  const horizontal = page.viewportSize()!.width <= 767;
  const list = page.getByRole('tablist', { name: 'Companies' });
  await expect(list).toHaveAttribute('aria-orientation', horizontal ? 'horizontal' : 'vertical');
  for (const index of [0, 3]) {
    await page.locator(tabsSelector).nth(index).click();
    await expectSettled(page, index);
    const geometry = await page.locator('#experience').evaluate((section) => {
      const list = section.querySelector<HTMLElement>('[role="tablist"]')!;
      const tab = section.querySelector<HTMLElement>('[aria-selected="true"]')!;
      const panel = section.querySelector<HTMLElement>('.experience-entry.is-visible')!;
      const bounds = (element: Element) => element.getBoundingClientRect().toJSON();
      return {
        list: bounds(list),
        tab: bounds(tab),
        panel: bounds(panel),
        scrollable: list.scrollWidth > list.clientWidth,
        pageOverflow: document.documentElement.scrollWidth > innerWidth,
        indicator: getComputedStyle(tab, '::before').backgroundColor,
        companyColor: getComputedStyle(panel.querySelector('.experience-entry__company')!).color,
      };
    });
    expect(geometry.pageOverflow).toBe(false);
    expect(geometry.indicator).toBe('rgb(120, 230, 195)');
    expect(geometry.companyColor).toBe(geometry.indicator);
    if (horizontal) {
      expect(geometry.scrollable).toBe(true);
      expect(geometry.list.bottom).toBeLessThan(geometry.panel.top);
      expect(Math.abs(geometry.list.left - geometry.panel.left)).toBeLessThan(1);
      expect(geometry.tab.left).toBeGreaterThanOrEqual(geometry.list.left - 1);
      expect(geometry.tab.right).toBeLessThanOrEqual(geometry.list.right + 1);
    } else {
      expect(geometry.scrollable).toBe(false);
      expect(geometry.list.right).toBeLessThan(geometry.panel.left);
      expect(Math.abs(geometry.list.top - geometry.panel.top)).toBeLessThanOrEqual(10);
    }
    await page
      .locator('#experience')
      .screenshot({ path: testInfo.outputPath(`experience-${index}.png`) });
  }
});

test('height and content keep the 350 ms reveal without clipping or overlapping either panel', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#experience');
  await waitForEntrance(page);
  const stage = page.locator('#experience .experience-panels');
  await page
    .locator(panelsSelector)
    .nth(1)
    .locator('.experience-entry__description')
    .evaluate((list) => {
      const bullet = document.createElement('li');
      bullet.textContent =
        'Longer contributions remain readable while switching companies. '.repeat(20);
      list.append(bullet);
    });
  for (const index of [1, 3]) {
    const transition = await sampleSwitches(stage, [index]);
    expect(transition.jumps.every((jump) => jump < 1)).toBe(true);
    expect(transition.timing.length).toBeGreaterThanOrEqual(3);
    for (const timing of transition.timing) {
      expect(timing.duration).toBe(350);
      expect(timing.easing).toBe('cubic-bezier(0.25, 0.85, 0.3, 1)');
    }
    expect(
      transition.samples.every(
        (sample) => sample.painted <= 1 && sample.contained && sample.nextSectionClear,
      ),
    ).toBe(true);
    expect(
      transition.samples.some((sample) => sample.opacity[index] > 0 && sample.opacity[index] < 1),
    ).toBe(true);
    const heights = transition.samples.map((sample) => sample.height);
    expect(Math.max(...heights) - Math.min(...heights)).toBeGreaterThan(100);
    expect(new Set(heights).size).toBeGreaterThan(4);
    await expectSettled(page, index);
  }
});

test('rapid switching and reversals settle on the last company without height jumps or stale panels', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#experience');
  await waitForEntrance(page);
  const stage = page.locator('#experience .experience-panels');
  for (const interval of [90, 400]) {
    const transition = await sampleSwitches(stage, [1, 2, 0, 3, 1, 3], interval);
    expect(transition.jumps.every((jump) => jump < 1)).toBe(true);
    expect(
      transition.samples.every(
        (sample) => sample.painted <= 1 && sample.contained && sample.nextSectionClear,
      ),
    ).toBe(true);
    await expectSettled(page, 3);
  }
});

test('panels recover their natural height when resized during a transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#experience');
  await waitForEntrance(page);
  await page
    .locator(tabsSelector)
    .nth(1)
    .evaluate((tab) => (tab as HTMLButtonElement).click());
  await page.setViewportSize({ width: 320, height: 740 });
  await expectSettled(page, 1);
  await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal');
  await page
    .locator(tabsSelector)
    .nth(3)
    .evaluate((tab) => (tab as HTMLButtonElement).click());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expectSettled(page, 3);
  await expect(page.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical');
});

test('reduced motion settles immediately and cancels pending switches when the preference changes', async ({
  page,
}) => {
  await page.goto('/#experience');
  const immediate = await page
    .locator(tabsSelector)
    .nth(1)
    .evaluate((tab) => {
      (tab as HTMLButtonElement).click();
      const panel = document.querySelector<HTMLElement>('#experience [aria-hidden="false"]')!;
      return {
        opacity: getComputedStyle(panel).opacity,
        height: panel.getBoundingClientRect().height,
      };
    });
  expect(immediate.opacity).toBe('1');
  expect(immediate.height).toBeGreaterThan(0);
  await expectSettled(page, 1);
  for (const index of [3, 0]) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page
      .locator(tabsSelector)
      .nth(index)
      .evaluate((tab) => (tab as HTMLButtonElement).click());
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expectSettled(page, index);
    expect(
      await page
        .locator('#experience')
        .evaluate((element) => element.getAnimations({ subtree: true }).length),
    ).toBe(0);
  }
});

test('the section retains its entrance motion and remains usable without the entrance animation API', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const animation = animate.call(this, keyframes, options);
      if (this instanceof HTMLElement && this.matches('#experience [data-reveal]')) {
        this.dataset.entrance = JSON.stringify({
          keyframes,
          options: animation.effect!.getTiming(),
        });
      }
      return animation;
    };
  });
  await page.goto('/#experience');
  for (const selector of ['.section-heading', '.experience-companies', '.experience-details']) {
    const target = page.locator(`#experience ${selector}`);
    await expect(target).toHaveAttribute('data-entrance');
    const entrance = JSON.parse((await target.getAttribute('data-entrance'))!);
    expect(entrance.options.duration).toBe(600);
    expect(entrance.options.easing).toBe('cubic-bezier(0.25, 0.85, 0.3, 1)');
    expect(entrance.keyframes[0]).toEqual({ opacity: 0, transform: 'translateY(12px)' });
  }
  await page.addInitScript(() =>
    Object.defineProperty(Element.prototype, 'animate', { value: undefined }),
  );
  await page.reload();
  await page.locator(tabsSelector).nth(2).click();
  await expectSettled(page, 2);
});

test('company tabs and selected details pass the accessibility audit', async ({ page }) => {
  await page.goto('/#experience');
  for (const index of [0, 3]) {
    await page.locator(tabsSelector).nth(index).click();
    const audit = await new AxeBuilder({ page })
      .include('#experience')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();
    expect(audit.violations).toEqual([]);
  }
});
