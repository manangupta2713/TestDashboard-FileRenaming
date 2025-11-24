import { sveltekit } from '@sveltejs/kit/vite';
import UnoCSS from 'unocss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), UnoCSS()],
  server: {
    port: 5174,
    host: '127.0.0.1'
  }
});
