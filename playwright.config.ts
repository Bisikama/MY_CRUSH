import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command:
        process.env.RUN_AUTH_E2E === '1'
          ? 'pnpm --filter @duoquest/api exec tsx --tsconfig tsconfig.json test/browser-api.ts'
          : 'pnpm --filter @duoquest/api start',
      url: 'http://127.0.0.1:4000/api/health/ready',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: 'pnpm --filter @duoquest/web start',
      url: 'http://127.0.0.1:3000',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
