const { defineConfig } = require('@playwright/test');
// V2_PORT (with V2_DIST_DIR) runs the suite against a second build, e.g. beside a preview already on 3100.
const base = `http://127.0.0.1:${process.env.V2_PORT || 3100}`;
module.exports = defineConfig({
  testDir: './tests/e2e', timeout: process.env.V2_NATIVE==='1'?90000:40000, expect: { timeout: 7000 },
  fullyParallel: false, workers: 1, retries: 0,
  use: { baseURL: base, browserName: 'chromium', headless: true, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', trace: 'off', screenshot: 'only-on-failure' },
  reporter: [['list'], ['json', { outputFile: process.env.V2_QA_REPORT_FILE || '../finalization/playwright-results.json' }]],
  webServer: [
    ...(!process.env.V2_TEST_API_URL || process.env.V2_TEST_API_URL === 'http://127.0.0.1:54329' ? [{
      command: `"${process.execPath}" scripts/test-api.cjs`, url: 'http://127.0.0.1:54329/health', reuseExistingServer: true, timeout: 60000,
    }] : []),
    { command: `"${process.execPath}" scripts/preview-v2.cjs`, url: `${base}/v2`, reuseExistingServer: true, timeout: 60000 },
  ],
});
