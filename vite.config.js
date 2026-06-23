import { defineConfig } from 'vite';

// 静的出力。Cloudflare Pages (saya-sound.pages.dev) 想定。
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
  },
  server: {
    port: 5174,
    open: false,
  },
});
