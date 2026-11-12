import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      '**/next-env.d.ts',
      'coverage/**',
      '.local/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['packages/game-{sdk,core,quiz}/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: ['@prisma/*', '@nestjs/*', 'socket.io', 'react', 'next/*'] },
      ],
    },
  },
  {
    files: ['apps/web/**/*.ts', 'apps/web/**/*.tsx', 'packages/ui/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@prisma/*',
            '@duoquest/game-quiz',
            '@duoquest/game-core',
            '@nestjs/*',
            '@duoquest/ui-lab',
            '**/ui-lab/**',
          ],
        },
      ],
    },
  },
  {
    files: ['apps/ui-lab/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@prisma/*',
            '@nestjs/*',
            'socket.io-client',
            '@duoquest/web',
            '@duoquest/ui',
            '**/web/**',
            '**/api/**',
            '**/packages/ui/**',
          ],
        },
      ],
    },
  },
);
