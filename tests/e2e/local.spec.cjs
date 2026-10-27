const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const path = require("node:path"),
  fs = require("node:fs");
const captures = path.resolve(
  __dirname,
  "../../../../outputs/mvp-final/capturi",
);
const widths = [320, 375, 390, 430, 768, 1440];
const screens = [
  ["landing", "/v2"],
  ["onboarding", "/v2/onboarding"],
  ["dashboard", "/v2/azi"],
  ["descoperire", "/v2/idei"],
  ["reteta", "/v2/retete/piure-dovlecel"],
  ["plan", "/v2/plan"],
  ["jurnal", "/v2/jurnal"],
  ["profil", "/v2/profil"],
  ["premium", "/v2/premium"],
];
test.beforeEach(async ({ context }) => {
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    return ["127.0.0.1", "localhost"].includes(u.hostname) ||
      u.protocol === "data:"
      ? route.continue()
      : route.abort();
  });
});
for (const width of widths)
  for (const [name, url] of screens)
    test(`responsive ${name} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width >= 768 ? 1000 : 844 });
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(url, { waitUntil: "networkidle" });
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator('.v2-sync-status [role="alert"]')).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const broken = await page
        .locator("img")
        .evaluateAll((images) =>
          images
            .filter((i) => !i.complete || !i.naturalWidth)
            .map((i) => i.src),
        );
      expect(broken).toEqual([]);
      expect(errors).toEqual([]);
      fs.mkdirSync(captures, { recursive: true });
      await page.screenshot({
        path: path.join(captures, `${name}-${width}.png`),
        fullPage: true,
      });
    });
test("three core flows persist across reload with optional confirmation", async ({
  page,
}) => {
  await page.goto("/v2/onboarding");
  await page.getByRole("button", { name: /Primele descoperiri/ }).click();
  await page.getByRole("button", { name: "Continuă", exact: true }).click();
  await page.getByRole("button", { name: "Morcov", exact: true }).click();
  await page.getByRole("button", { name: "Să descoperim idei" }).click();
  await expect(page).toHaveURL(/\/v2\/azi/);
  await page.goto("/v2/idei");
  await expect(page.getByLabel("Etapa din catalog")).toHaveValue("6");
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByRole("button", { name: "Dovlecel", exact: true }).click();
  await page.getByLabel("Cauți ceva anume?").fill("Piure de dovlecel");
  await page
    .getByRole("link", { name: "Piure de dovlecel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Salvează Piure de dovlecel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Adaugă în plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Am folosit ideea", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Confirmată azi", exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Confirmată azi", exact: true }),
  ).toBeDisabled();
  await page.goto("/v2/plan");
  await expect(
    page.getByRole("heading", { name: "Piure de dovlecel", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Înlocuiește masa/ })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { name: "Piure de dovlecel", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: /De cumpărat/ }).click();
  await expect(page.locator(".v2-shopping-list")).toBeVisible();
  await page.locator(".v2-shopping-list input").first().check();
  await page.reload();
  await page.getByRole("button", { name: /De cumpărat/ }).click();
  await expect(page.locator(".v2-shopping-list input").first()).toBeChecked();
  await page.goto("/v2/jurnal");
  await expect(
    page.getByRole("heading", { name: "Piure de dovlecel", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Refolosește ideea" }).click();
  await expect(page).toHaveURL(/piure-dovlecel/);
});
test("empty results, favorite filter, cooking steps and keyboard navigation", async ({
  page,
}) => {
  await page.goto("/v2/idei");
  await page.getByLabel("Cauți ceva anume?").fill("nu-exista-reteta");
  await expect(
    page.getByRole("heading", { name: "Nu am găsit o combinație deocamdată" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Resetează filtrele", exact: true })
    .click();
  await page.getByLabel("Doar ideile salvate").check();
  await expect(
    page.getByRole("heading", { name: "Nu am găsit o combinație deocamdată" }),
  ).toBeVisible();
  await page.goto("/v2/retete/piure-dovlecel");
  await page.getByRole("button", { name: "Un pas pe ecran" }).click();
  await page.getByRole("button", { name: "Următorul", exact: true }).click();
  await expect(page.getByText(/PASUL 2 DIN/)).toBeVisible();
  await page.getByRole("button", { name: "Toți pașii", exact: true }).click();
  await expect(page.locator(".v2-recipe-steps")).toBeVisible();
  await page.goto("/v2/azi");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Sari la conținut" }),
  ).toBeFocused();
});
for (const [name, url] of screens)
  test(`accessibility ${name}`, async ({ page }) => {
    await page.goto(url, { waitUntil: "networkidle" });
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  });
