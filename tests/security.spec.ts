import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

test('an anchor to a project interrupts its closing animation and reveals the destination', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/#project-verdant-edge');
  const project = page.locator('#project-verdant-edge');
  await expect(project.locator('summary')).toHaveAttribute('aria-expanded', 'true');
  await project.evaluate(async (element) => {
    element.querySelector('summary')!.click();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const link = document.createElement('a');
    link.href = '#project-verdant-edge';
    link.textContent = 'Open project';
    document.body.append(link);
    link.click();
    link.remove();
  });
  await expect(project.locator('summary')).toHaveAttribute('aria-expanded', 'true');
  await expect
    .poll(() =>
      project.locator('.project-list__panel').evaluate((element) => element.getAnimations().length),
    )
    .toBe(0);
  await expect(project).toHaveAttribute('open', '');
  await expect(project.locator('.project-list__details')).toBeVisible();
});

test('anchor navigation moves keyboard focus to a heading without a tabindex', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const link = document.createElement('a');
    link.href = '#experience-heading';
    link.textContent = 'Jump to experience heading';
    link.id = 'focus-test-link';
    document.body.append(link);
  });
  await page.locator('#focus-test-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#experience-heading')).toBeFocused();
  await page.locator('#focus-test-link').evaluate((link) => link.setAttribute('href', '#aboutMe'));
  await page.locator('#focus-test-link').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#about')).toBeFocused();
});

test('malformed and HTML-like URL fragments stay inert and do not break the page', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const fragment of ['%E0%A4%A', '%3Cimg%20src=x%20onerror=alert(1)%3E']) {
    await page.goto(`/?q=%3Cscript%3Ealert(1)%3C/script%3E#${fragment}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('[onerror], script:not([src])')).toHaveCount(0);
  }
  expect(errors).toEqual([]);
});

test('production security headers allow the site and its animations while blocking injected script', async ({
  page,
}) => {
  const headers = Object.fromEntries(
    readFileSync('public/_headers', 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.startsWith('  '))
      .map((line) => {
        const separator = line.indexOf(':');
        return [line.slice(0, separator).trim().toLowerCase(), line.slice(separator + 1).trim()];
      }),
  );
  // Vite preview does not apply Netlify's _headers, so serve the built page with them here.
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() !== 'document') return route.continue();
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), ...headers } });
  });
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (event) => {
      document.documentElement.dataset.cspViolations = `${document.documentElement.dataset.cspViolations ?? ''}${event.effectiveDirective};`;
    });
  });
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const response = await page.goto('/');
  expect(response!.headers()['content-security-policy']).toBe(headers['content-security-policy']);
  expect(response!.headers()['x-content-type-options']).toBe('nosniff');
  expect(response!.headers()['x-frame-options']).toBe('DENY');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  const project = page.locator('#project-verdant-edge');
  await project.locator('summary').click();
  await expect(project.locator('.project-list__details')).toBeVisible();
  await expect
    .poll(() =>
      project.locator('.project-list__panel').evaluate((element) => element.getAnimations().length),
    )
    .toBe(0);
  await expect
    .poll(() =>
      project.locator('img').evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await project.locator('summary').click();
  await expect(project).not.toHaveAttribute('open');
  const experience = page.locator('.experience-entry').nth(1);
  await experience.getByRole('button').click();
  await expect(experience.locator('.experience-entry__details')).toHaveCSS('opacity', '1');
  expect(await page.locator('html').getAttribute('data-csp-violations')).toBeNull();
  expect(errors).toEqual([]);

  await page.evaluate(() => {
    const script = document.createElement('script');
    script.textContent = 'document.documentElement.dataset.injectedScriptRan = "true"';
    document.head.append(script);
  });
  await expect(page.locator('html')).toHaveAttribute('data-csp-violations', /script-src/);
  expect(await page.locator('html').getAttribute('data-injected-script-ran')).toBeNull();
});
