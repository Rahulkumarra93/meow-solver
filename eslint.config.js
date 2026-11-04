import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    rules: {
      // R10: the screenshot must never leave the browser.
      'no-restricted-globals': [
        'error',
        { name: 'fetch', message: 'R10: no network calls; the image must stay in the browser.' },
        { name: 'XMLHttpRequest', message: 'R10: no network calls; the image must stay in the browser.' },
        { name: 'WebSocket', message: 'R10: no network calls; the image must stay in the browser.' },
      ],
      'no-restricted-properties': [
        'error',
        { object: 'navigator', property: 'sendBeacon', message: 'R10: no network calls.' },
        { object: 'window', property: 'fetch', message: 'R10: no network calls.' },
      ],
    },
  },
);
