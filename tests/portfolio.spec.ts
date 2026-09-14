import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { renderResumeLink } from '../src/components/Link';
import { escapeHtml } from '../src/utils/escapeHtml';

test('the page loads without browser errors, overflow, or broken media', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  await page.goto('/#home');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Hi, I’mKoushik.');
  await expect(page.getByRole('link', { name: 'View projects', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'View projects', exact: true }).click();
  await expect(page).toHaveURL(/#projects$/);

  // Open disclosures so the hidden project images are checked too.
  await page.locator('details').evaluateAll((items) => {
    items.forEach((item) => {
      (item as HTMLDetailsElement).open = true;
    });
  });
  for (const image of await page.locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
    expect(await image.getAttribute('width')).toBeTruthy();
    expect(await image.getAttribute('height')).toBeTruthy();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(errors).toEqual([]);

  const links = await page.locator('a').evaluateAll((anchors) =>
    anchors.map((anchor) => ({
      href: anchor.getAttribute('href'),
      target: anchor.getAttribute('target'),
      rel: anchor.getAttribute('rel'),
    })),
  );
  for (const link of links) {
    expect(link.href).toBeTruthy();
    expect(link.href).not.toBe('#');
    if (link.target === '_blank') expect(link.rel).toContain('noopener');
  }
  await expect(
    page.locator('a[href*="huggingface.co/NeuroRiftV3/python-to-triton-llm-trained-model"]'),
  ).toBeVisible();
  await expect(
    page.locator('a[href*="discordapp.com/users/457081376873644034"]').first(),
  ).toBeVisible();
  await expect(page.locator('.resume-link')).toHaveCount(0);
});

test('mobile menu supports keyboard, touch, Escape, outside click, and resize', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  const navigation = page.getByRole('navigation', { name: 'Main navigation' });
  await expect(navigation).toBeHidden();

  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(navigation.getByRole('link', { name: 'About' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(navigation).toBeHidden();

  await menu.click();
  await navigation.getByRole('link', { name: 'Work' }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(navigation).toBeHidden();
  await expect(page.locator('#projects')).toBeFocused();

  await menu.click();
  await page.mouse.click(380, 500);
  await expect(navigation).toBeHidden();
  await page.setViewportSize({ width: 1000, height: 900 });
  await expect(navigation).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(navigation).toBeHidden();
});

test('bookmarked original anchors and additional project links reach their content', async ({
  page,
}) => {
  for (const anchor of ['home', 'aboutMe', 'projects', 'posts', 'hardware', 'contact']) {
    await page.goto(`/#${anchor}`);
    const position = await page
      .locator(`#${anchor}`)
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(position).toBeGreaterThanOrEqual(0);
    expect(position).toBeLessThan(page.viewportSize()!.height);
  }
  await page.goto('/#project-play');
  await expect(page.locator('#project-play')).toHaveAttribute('open', '');
  await expect(page.locator('#project-play')).toContainText('Retired in 2020');
});

test('writing, hardware, and additional work expand with the keyboard', async ({ page }) => {
  await page.goto('/#posts');
  const note = page.locator('#anthropic-interview');
  await note.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(note).toHaveAttribute('open', '');
  await expect(note.locator('.post__content')).toContainText('30-minute recruiter call');
  await page.keyboard.press('Enter');
  await expect(note).not.toHaveAttribute('open');

  const hardware = page.locator('.hardware-details');
  await hardware.locator('summary').focus();
  await page.keyboard.press('Space');
  await expect(hardware).toHaveAttribute('open', '');
  await expect(hardware).toContainText('Ryzen 7 7800X3D');

  const project = page.locator('#project-verdant-edge');
  await project.locator('summary').focus();
  await page.keyboard.press('Enter');
  await expect(project).toHaveAttribute('open', '');
  await expect(project).toContainText('developed the tool for a client');
});

test('skip link, focus visibility, reduced motion, and accessible semantics', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();
  expect(await skipLink.evaluate((element) => getComputedStyle(element).outlineStyle)).toBe(
    'solid',
  );
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe(
    'auto',
  );

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);

  await page.locator('details').evaluateAll((items) => {
    items.forEach((item) => {
      (item as HTMLDetailsElement).open = true;
    });
  });
  const expandedResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(expandedResults.violations).toEqual([]);
});

test('plain text stays text and résumé links are conditional', () => {
  expect(escapeHtml('<img src=x onerror="alert(1)"> & text')).toBe(
    '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; text',
  );
  expect(renderResumeLink(null)).toBe('');
  const resume = renderResumeLink({ label: 'Download résumé', href: '/resume.pdf' });
  expect(resume).toContain('href="/resume.pdf"');
  expect(resume).toContain('noopener noreferrer');
});
