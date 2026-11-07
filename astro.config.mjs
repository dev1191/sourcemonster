import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from 'astro/config';
import vue from '@astrojs/vue';
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  integrations: [vue()],
  output: 'server',
  adapter: node({
    mode: 'standalone',
  }),
  security: {
    checkOrigin: false,
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
