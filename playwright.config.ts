import { defineConfig, devices } from '@playwright/test';

const apiBaseUrl = process.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:4010';
const frontendBaseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const configuredSlowMo = Number(process.env.PLAYWRIGHT_SLOW_MO ?? 0);
const launchOptions =
  Number.isFinite(configuredSlowMo) && configuredSlowMo > 0
    ? { slowMo: configuredSlowMo }
    : undefined;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: frontendBaseUrl,
    ...(launchOptions ? { launchOptions } : {}),
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run backend:dev',
      env: {
        DATABASE_URL:
          process.env.DATABASE_URL ?? 'postgres://booking:booking@localhost:5432/booking',
        HOST: '127.0.0.1',
        PORT: '4010',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: `${apiBaseUrl}/event-types`,
    },
    {
      command: 'npm -w frontend run dev -- --port 5173 --strictPort',
      env: {
        VITE_API_BASE_URL: apiBaseUrl,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: frontendBaseUrl,
    },
  ],
});
