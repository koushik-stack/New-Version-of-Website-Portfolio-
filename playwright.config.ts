import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    // Use an installed Edge when requested; otherwise use Playwright Chromium.
    channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
    contextOptions: { reducedMotion: 'reduce' },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
    { name: 'tablet', use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
    {
      name: 'mobile',
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
    {
      name: 'narrow',
      use: { viewport: { width: 320, height: 740 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: 'npm run preview -- --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
