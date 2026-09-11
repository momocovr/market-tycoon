import { defineConfig } from 'vite';
// base './' so the build works on GitHub Pages under /<repo>/ as well as at a root URL.
export default defineConfig({ base: './', build: { target: 'es2022' } });
