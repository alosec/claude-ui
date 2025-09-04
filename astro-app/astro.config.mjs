// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import cloudflare from '@astrojs/cloudflare';
import AstroPWA from '@vite-pwa/astro';

// Deployment configuration
const isCloudflare = process.env.CF_PAGES === '1' || process.env.CLOUDFLARE_WORKERS === '1';
const isDev = process.env.NODE_ENV === 'development';

// Choose adapter and output directory based on deployment target
const adapter = isCloudflare 
  ? cloudflare({
      platformProxy: {
        enabled: true
      }
    })
  : node({
      mode: 'standalone'
    });

const outputDir = isCloudflare ? './dist-cf' : './dist-vps';

console.log(`🚀 Using ${isCloudflare ? 'Cloudflare' : 'Node'} adapter`);
console.log(`📁 Output directory: ${outputDir}`);

// https://astro.build/config
export default defineConfig({
  integrations: [
    react(),
    AstroPWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/404',
        navigateFallbackAllowlist: [/^\/project\//]
      },
      includeAssets: ['icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'Project Manager',
        short_name: 'ProjectMgr',
        description: 'An Astro application for project management',
        theme_color: '#000000',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        navigation_scope: '/',
        icons: [
          {
            src: 'icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable any'
          },
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable any'
          }
        ]
      }
    })
  ],
  output: 'server',
  outDir: outputDir,
  adapter
});
