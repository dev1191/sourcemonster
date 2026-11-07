import tailwindcss from "@tailwindcss/vite";
import { defineConfig, passthroughImageService } from 'astro/config';
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  site: 'https://sourcemonster.in',
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  security: {
    checkOrigin: false,
  },
  image: {
    service: passthroughImageService(),
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
