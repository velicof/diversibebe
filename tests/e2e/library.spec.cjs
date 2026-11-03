// Full library (291 existing recipes) and the specialist review console, in the real browser.
const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

const axe = async (page) =>
  (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) }));
const shown = async (page) => Number((await page.getByRole("heading", { name: /idei de explorat$/ }).textContent()).match(/\d+/)[0]);

test("the library shows the whole published catalog with categories, allergen exclusions and season", async ({ page }) => {
  await page.goto("/v2/idei", { waitUntil: "networkidle" });
  await page.locator("#v2-stage").selectOption("12");
  await page.getByRole("button", { name: "Oricât", exact: true }).click();
  const total = await shown(page);
  expect(total).toBeGreaterThanOrEqual(280);
  await expect(page.getByText(/BIBLIOTECA DIVERSIBEBE · 289 REȚETE/)).toBeVisible();
  const tabs = page.getByRole("group", { name: "Momentul mesei" });
  await tabs.getByRole("button", { name: /^Gustare/ }).click();
  expect(await shown(page)).toBe(25);
  await tabs.getByRole("button", { name: /^Toate/ }).click();
  await page.getByRole("button", { name: "Fără Lapte", exact: true }).click();
  const noMilk = await shown(page);
  expect(noMilk).toBeLessThan(total);
  await page.getByRole("button", { name: "Mai multe idei", exact: false }).click();
  await expect(page.locator(".v2-card-meta").filter({ hasText: /Lapte/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Fără Lapte", exact: true }).click();
  await page.getByLabel("Doar rețete de sezon").check();
  expect(await shown(page)).toBeLessThan(total);
  expect(await axe(page)).toEqual([]);
});

test("a corrected recipe explains its changes; a recipe in specialist review is not reachable", async ({ page }) => {
  await page.goto("/v2/retete/paste-pesto-pui", { waitUntil: "networkidle" });
  await expect(page.getByText("1 lingură nuci sau migdale, măcinate fin în pesto")).toBeVisible();
  await expect(page.getByText(/Am ajustat această rețetă/)).toBeVisible();
  await expect(page.getByText(/Nu este un aviz medical/)).toBeVisible();
  await expect(page.getByText("Status: Corectată editorial")).toBeVisible();
  await page.goto("/v2/retete/omlet%C4%83-legume-8", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/omlet/i);
  await page.goto("/v2/retete/pate-ficat-pui-pere", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Nu am găsit această idee." })).toBeVisible();
  await expect(page.getByText(/ficat/i)).toHaveCount(0);
});

test("the review console lists all 291 recipes, filters the exceptions and exports a batch", async ({ page }) => {
  await page.goto("/v2/revizie", { waitUntil: "networkidle" });
  await expect(page.getByText("291 rețete afișate · 0 selectate pentru lot")).toBeVisible();
  await page.getByLabel("Risc").selectOption("blocking");
  await expect(page.getByText("2 rețete afișate · 0 selectate pentru lot")).toBeVisible();
  await page.locator(".v2-review-item summary").first().click();
  await expect(page.getByText(/vitamina A/).first()).toBeVisible();
  await page.getByRole("button", { name: "Selectează toate afișate" }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: /Exportă lotul/ }).click();
  const csv = await (await download).createReadStream();
  const text = await new Promise((resolve) => { let s = ""; csv.on("data", (c) => (s += c)); csv.on("end", () => resolve(s)); });
  expect(text).toContain("DECIZIE (aprobat / modificari / respins)");
  expect(text).toContain("pate-ficat-pui-pere");
  expect(text.trim().split(/\r?\n/)).toHaveLength(3);
  expect(await axe(page)).toEqual([]);
});
