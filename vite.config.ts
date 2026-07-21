/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages 项目页：部署在 ranpin.github.io/resume/，base 必须为 '/resume/'
export default defineConfig({
  base: '/resume/',
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
  },
});
