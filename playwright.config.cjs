const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests/e2e', timeout: 40000, expect: { timeout: 7000 },
  fullyParallel: false, workers: 1, retries: 0,
  use: { baseURL: 'http://127.0.0.1:3100', browserName: 'chromium', headless: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', trace: 'off', screenshot: 'only-on-failure' },
  reporter: [['list'], ['json', { outputFile: '../finalization/playwright-results.json' }]],
});
