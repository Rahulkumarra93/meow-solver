import { defineConfig, type Plugin } from 'vitest/config';

/**
 * R10, enforced by the browser: the published page may load only its own files and may not
 * open any network connection, so the screenshot cannot leave the device even by mistake.
 * Added at build time only, because the dev server needs a live connection for reloads.
 */
const CSP =
  "default-src 'self'; connect-src 'none'; img-src 'self' data: blob:; " +
  "style-src 'self' 'unsafe-inline'; script-src 'self'; form-action 'none'; base-uri 'none'";

function contentSecurityPolicy(): Plugin {
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

// Relative base so the build works at https://<user>.github.io/meow-solver/
export default defineConfig({
  base: './',
  plugins: [contentSecurityPolicy()],
  build: {
    // Vite's preload helper uses fetch; the app is one small script, so it isn't needed.
    modulePreload: { polyfill: false },
  },
  test: {
    include: ['tests/**/*.test.ts'],
  },
});
