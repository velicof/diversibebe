const { chromium } = require("playwright");
const path = require("node:path"),
  fs = require("node:fs");
(async () => {
  const out = path.resolve(__dirname, "../../../outputs/mvp-final/capturi");
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/*", (route) => {
    const u = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(u.hostname) ||
      u.protocol === "data:"
      ? route.continue()
      : route.abort();
  });
  await page.goto("http://127.0.0.1:3100/v2", { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(out, "landing-1440-initial.png"),
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      title: await page.title(),
      heading: await page.locator("h1").innerText(),
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      errors,
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://127.0.0.1:3100/v2/azi", { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(out, "dashboard-390-initial.png"),
    fullPage: true,
  });
  console.log(
    JSON.stringify({
      heading: await page.locator("h1").innerText(),
      overflow: await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      errors,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
