import { defineConfig } from 'vitest/config';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = dirname(fileURLToPath(import.meta.url));
export default defineConfig({ test: { environment: 'jsdom', globals: true, include: ['src/**/*.test.{ts,tsx}'] }, resolve: { alias: { '@': resolve(root, 'src') } } });
