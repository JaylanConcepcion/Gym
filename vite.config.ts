import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Display version: 1.N where N auto-increments with every push.
 * Derived from the git commit count; the baseline of 3 makes the
 * commit that introduced versioning show as 1.0.
 */
function computeVersion(): string {
  try {
    const count = Number(execSync('git rev-list --count HEAD').toString().trim());
    return `1.${Math.max(0, count - 3)}`;
  } catch {
    return '1.x';
  }
}

export default defineConfig({
  // Must match the GitHub repo name so assets resolve on GitHub Pages.
  base: '/Gym/',
  define: {
    __APP_VERSION__: JSON.stringify(computeVersion())
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}']
      },
      manifest: {
        name: 'Powerlifting Tracker',
        short_name: 'PL Tracker',
        description:
          'Log lifts with RPE, auto-estimate your 1RM, and track week-to-week strength and bodyweight progress.',
        theme_color: '#0b0c0f',
        background_color: '#0b0c0f',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ]
});
