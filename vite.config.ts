import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' keeps asset links relative, so the build works at the root of a
// Netlify site and also if you ever host it in a sub-folder.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { sourcemap: false }
});
