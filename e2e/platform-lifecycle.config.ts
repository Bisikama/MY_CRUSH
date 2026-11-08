import { defineConfig } from '@playwright/test';

// Separate from DB-backed E2E: owns its web port, never stops/reuses a user's dev server.
export default defineConfig({
  testDir: '.',
  testMatch: 'platform-lifecycle.spec.ts',
  timeout: 45_000,
  workers: 1,
  reporter: 'list',
  outputDir: '../test-results/platform-lifecycle',
  use: {
    baseURL: 'http://127.0.0.1:3177',
    channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @duoquest/web exec next start --hostname 127.0.0.1 --port 3177',
    url: 'http://127.0.0.1:3177',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
