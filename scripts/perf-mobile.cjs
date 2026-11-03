// Mobile performance on a cold cache: slow 4G (1.6 Mbps down, 750 kbps up, 150 ms RTT) and 4× CPU slowdown.
//   node scripts/perf-mobile.cjs [baseUrl] [outFile]
// Metrics: LCP, CLS, total blocking time (long tasks over 50 ms), bytes transferred (all / JavaScript / images).
const { chromium } = require('@playwright/test'), fs = require('node:fs');
const base = process.argv[2] || 'http://127.0.0.1:3100', out = process.argv[3];
const pages = [['Acasă', '/v2'], ['Bibliotecă', '/v2/idei'], ['Rețetă cu fotografie', '/v2/retete/piure-broccoli-cartof-6'], ['Plan', '/v2/plan']];

(async () => {
  const browser = await chromium.launch();
  const rows = [];
  for (const [name, url] of pages) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await context.route('**/*', (r) => (new URL(r.request().url()).hostname === '127.0.0.1' ? r.continue() : r.abort()));
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.addInitScript(() => {
      window.__perf = { lcp: 0, cls: 0, tbt: 0 };
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__perf.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__perf.tbt += Math.max(0, e.duration - 50); }).observe({ type: 'longtask', buffered: true });
    });
    const started = Date.now();
    await page.goto(base + url, { waitUntil: 'networkidle', timeout: 120000 });
    await page.waitForTimeout(1500);
    const m = await page.evaluate(() => {
      const res = performance.getEntriesByType('resource'), nav = performance.getEntriesByType('navigation')[0];
      const sum = (f) => Math.round(res.filter(f).reduce((s, e) => s + (e.transferSize || 0), 0) / 1024);
      return { ...window.__perf, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? 0, totalKb: sum(() => true) + Math.round((nav?.transferSize || 0) / 1024), jsKb: sum((e) => e.initiatorType === 'script' || /\.js(\?|$)/.test(e.name)), imgKb: sum((e) => e.initiatorType === 'img' || /\.(webp|png|jpe?g|svg)(\?|$)/.test(e.name)), requests: res.length + 1 };
    });
    rows.push({ name, url, fcpMs: Math.round(m.fcp), lcpMs: Math.round(m.lcp), cls: +m.cls.toFixed(3), tbtMs: Math.round(m.tbt), totalKb: m.totalKb, jsKb: m.jsKb, imgKb: m.imgKb, requests: m.requests, loadedMs: Date.now() - started });
    await context.close();
  }
  await browser.close();
  console.log('| Pagină | FCP | LCP | CLS | TBT | Total | JS | Imagini | Cereri |\n|---|---|---|---|---|---|---|---|---|');
  for (const r of rows) console.log(`| ${r.name} (\`${r.url}\`) | ${(r.fcpMs / 1000).toFixed(1)} s | ${(r.lcpMs / 1000).toFixed(1)} s | ${r.cls} | ${r.tbtMs} ms | ${r.totalKb} KB | ${r.jsKb} KB | ${r.imgKb} KB | ${r.requests} |`);
  if (out) fs.writeFileSync(out, JSON.stringify(rows, null, 2));
})().catch((e) => { console.error(e.message); process.exit(1); });
