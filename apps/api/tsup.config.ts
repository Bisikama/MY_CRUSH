import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  platform: 'node',
  target: 'node22',
  splitting: false,
  clean: true,
  sourcemap: true,
  noExternal: [/^@duoquest\//],
});
