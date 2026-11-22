import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests drive the real app in a browser. All network data
 * (weather, climate, soil, AI) is mocked per test, so they run offline and
 * give the same result every day.
 *
 *   npm run e2e
 *
 * First run on a new machine: npx playwright install chromium
 */
export default defineConfig({
  testDir: 'e2e',
  timeout: 45_000,
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3123',
    trace: 'off',
  },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { viewport: { width: 1280, height: 860 } } },
  ],
  webServer: {
    command: 'npx tsx server.ts',
    env: { PORT: '3123', ANTHROPIC_API_KEY: '' },
    url: 'http://localhost:3123/api/health',
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
