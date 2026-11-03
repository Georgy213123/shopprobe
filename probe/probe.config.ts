import { defineConfig } from './src/config';

/**
 * Настройка прогона по демо-витрине «Чайная полка».
 * Для другой витрины достаточно поменять BASE_URL и routes.
 */
export default defineConfig({
  baseUrl: process.env.BASE_URL ?? 'http://localhost:5201',
  routes: [
    '/',
    '/catalog',
    '/catalog?category=green&origin=china',
    '/product/shu-puer-staroe-derevo',
    '/product/sencha-utrennyaya',
    '/cart',
  ],
  viewports: [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ],
  retest: { attempts: 3 },
  thresholds: { failOn: 'moderate', overflowTolerancePx: 1 },
  a11y: { tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'], minImpact: 'serious' },
  outputDir: process.env.PROBE_OUT ?? 'reports/latest',
});
