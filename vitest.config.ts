import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [
      'packages/**/*.test.ts',
      'apps/api/**/*.test.ts',
      'apps/web/**/*.test.ts',
      'apps/ui-lab/src/**/*.test.ts',
    ],
    testTimeout: 10000,
  },
});
