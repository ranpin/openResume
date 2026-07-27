/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 项目页：部署在 ranpin.github.io/openResume/，base 必须为 '/openResume/'
export default defineConfig({
  base: '/openResume/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
