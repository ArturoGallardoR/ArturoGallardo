import { defineConfig } from 'vite';

import { cloudflare } from "@cloudflare/vite-plugin";

// base relativa: funciona igual en GitHub Pages (/<repo>/) y en Cloudflare Pages (/).
// three.js se carga con import() dinamico desde main.js, asi que queda en su propio chunk.
export default defineConfig({
  base: './',
  plugins: [cloudflare()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 0,
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});