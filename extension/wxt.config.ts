import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// Syncty extension config. Targets Chromium + Firefox from one codebase.
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  webExt: {
    disabled: true,
  },
  vite: () => ({
    plugins: [tailwindcss()],
    define: {
      // ponytail: API base injected at build time from .env (VITE_API_BASE).
      // Falls back to localhost for `wxt dev`.
      __API_BASE__: JSON.stringify(process.env.VITE_API_BASE ?? 'https://syncty.byztma.workers.dev'),
    },
  }),
  manifest: {
    name: 'Syncty',
    description: 'Sinkronisasi bookmark terenkripsi antar browser & OS.',
    permissions: ['bookmarks', 'storage', 'alarms'],
    host_permissions: ['https://*/*'],
    icons: {
      '16': 'icons/logo-16.png',
      '32': 'icons/logo-32.png',
      '48': 'icons/logo-48.png',
      '128': 'icons/logo-128.png',
    },
    action: {
      default_icon: {
        '16': 'icons/logo-16.png',
        '32': 'icons/logo-32.png',
        '48': 'icons/logo-48.png',
      },
    },
    // ponytail: override the new-tab page so the Syncty dashboard replaces it.
    chrome_url_overrides: { newtab: 'newtab.html' },
  },
});
