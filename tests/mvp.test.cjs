const { test } = require('node:test'), assert = require('node:assert/strict');
const { load, plain } = require('./load-ts.cjs');
const { appReducer, emptyState, readState } = load('src/features/v2/model.ts');
const { catalog, previewCatalog, parseDuration } = load('src/features/v2/catalog.ts');
const { recommend, initialFilters } = load('src/features/v2/recommendations.ts');
const { makeEvent, weeklyUsage } = load('src/features/v2/analytics.ts');
const { inspectContent } = load('src/features/v2/review.ts');
const { nextDays, swapRecipe, shoppingList } = load('src/features/v2/planning.ts');
const context = { mode: 'preview', favorites: [], introduced: [], used: [], excludedIngredients: [], requiresClinicalGuidance: false };
test('existing catalog is reused with stable IDs and no fabricated clinical reviews', () => {
  assert.equal(catalog.length, 291); assert.equal(new Set(catalog.map(r => r.id)).size, 291);
  assert.ok(catalog.every(r => r.review.status === 'pending'));
  assert.ok(previewCatalog.every(r => r.automaticReview.status === 'no-automatic-issues'));
});
test('recommendations use only published recipes; the specialist queue and blocking flags never appear', () => {
  const all = recommend(catalog, { ...initialFilters, months: 12, maxMinutes: 999 }, { ...context, mode: 'live' });
  assert.ok(all.length >= 280);
  assert.ok(all.every(r => r.published && r.editorialStatus !== 'needs_specialist_review' && !r.safetyFlags.some(f => f.severity === 'blocking')));
  assert.equal(recommend([{ ...catalog[0], published: false }], { ...initialFilters, months: 12 }, { ...context, mode: 'live' }).length, 0);
});
test('stage, ingredient, duration, exclusions and favorites combine without relaxing safety', () => {
  const filters = { ...initialFilters, months: 6, ingredientIds: ['dovlecel'], maxMinutes: 15 };
  const matches = recommend(catalog, filters, context);
  assert.ok(matches.length > 0);
  assert.ok(matches.every(r => r.minimumMonths <= 6 && r.minutes <= 15 && r.ingredientIds.includes('dovlecel')));
  assert.equal(recommend(catalog, filters, { ...context, excludedIngredients: ['dovlecel'] }).length, 0);
  assert.equal(recommend(catalog, { ...filters, favoritesOnly: true }, context).length, 0);
  assert.equal(recommend(catalog, filters, { ...context, requiresClinicalGuidance: true }).length, 0);
});
test('favorite status cannot override unreviewed or flagged content', () => {
  const unsafe = { ...catalog[0], automaticReview: { status: 'safety-issue', reasons: ['fixture'] } };
  assert.equal(recommend([unsafe], initialFilters, { ...context, favorites: [unsafe.id] }).length, 0);
});
test('automatic triage flags explicit risks but never awards medical approval', () => {
  assert.equal(inspectContent('6 luni. 1 lingură miere').status, 'safety-issue');
  assert.equal(inspectContent('nuci întregi').status, 'safety-issue');
  assert.equal(inspectContent('lapte de orez').status, 'safety-issue');
  assert.equal(inspectContent('4 luni. piure').status, 'needs-review');
  assert.equal(inspectContent('fără miere, dovlecel fiert').status, 'no-automatic-issues');
});
test('unknown preparation time is excluded; ranges use conservative upper bound', () => {
  assert.equal(parseDuration('15-20 min'), 20); assert.equal(parseDuration('1 oră 10 min'), 70); assert.equal(parseDuration('după preferință'), null);
  // Regression 2026-11-02: "1h" was read as 1 minute and let long stews into the 30-minute filter.
  assert.equal(parseDuration('1h'), 60); assert.equal(parseDuration('2h'), 120); assert.equal(parseDuration('1h 30min'), 90);
  assert.equal(parseDuration('1½ ore'), 90); assert.equal(parseDuration('1 oră'), 60); assert.equal(parseDuration('5 min + peste noapte'), null);
  assert.ok(catalog.every((r) => r.minutes === null || r.minutes >= 3), 'no recipe parses to an implausible duration');
  assert.equal(recommend([{ ...catalog[0], minutes: null }], initialFilters, context).length, 0);
});
test('three core flows: discover, save, plan, replace, confirm, reload and reuse', () => {
  const results = recommend(catalog, initialFilters, context), recipe = results[0];
  let state = appReducer(emptyState, { type: 'favorite', recipeId: recipe.id });
  state = appReducer(state, { type: 'plan', slot: '2026-10-27', recipeId: recipe.id });
  const replacement = swapRecipe(results, state.plan, '2026-10-27'); assert.notEqual(replacement.id, recipe.id);
  state = appReducer(state, { type: 'plan', slot: '2026-10-27', recipeId: replacement.id });
  assert.equal(state.plan.length, 1);
  const use = { id: 'synthetic-1', recipeId: recipe.id, day: '2026-10-27', confirmedAt: '2026-10-27T10:00:00Z' };
  state = appReducer(state, { type: 'confirm', use }); state = appReducer(state, { type: 'confirm', use: { ...use, id: 'retry' } });
  assert.equal(state.uses.length, 1);
  const restored = readState(JSON.stringify(state), new Set(catalog.map(r => r.id)), new Set());
  assert.deepEqual(plain(restored.favorites), [recipe.id]); assert.equal(restored.plan[0].recipeId, replacement.id);
  assert.equal(appReducer(restored, { type: 'confirm', use: { ...use, id: 'synthetic-2', day: '2026-10-28' } }).uses.length, 2);
});
test('corrupt or legacy account payloads cannot enter the demo state', () => {
  for (const raw of ['{', 'null', '{"password":"secret","accounts":[]}', '{"version":2}']) assert.deepEqual(plain(readState(raw, new Set(), new Set())), plain(emptyState));
  const state = readState(JSON.stringify({ version: 1, favorites: ['missing'], stage: 999, plan: [{ slot: 'x', recipeId: 'missing' }], password: 'secret' }), new Set(), new Set());
  assert.equal(state.stage, 8); assert.equal(state.favorites.length, 0); assert.equal(state.plan.length, 0); assert.ok(!('password' in state));
});
test('analytics drops arbitrary fields, health, age, names and free text', () => {
  const event = makeEvent('recipe_saved', { recipeId: 'piure-dovlecel', name: 'PRIVATE', allergies: 'PRIVATE', stage: 8, email: 'PRIVATE' }, '2026-10-27T00:00:00Z', 'test');
  assert.deepEqual(plain(event.properties), {}); assert.doesNotMatch(JSON.stringify(event), /PRIVATE/);
  assert.deepEqual(plain(makeEvent('first_relevant_choice', { elapsedMs: Infinity, recipeId: '<script>' }, '', '').properties), {});
});
test('North Star requires 3 distinct confirmations in at least 2 days', () => {
  const uses = [{ recipeId: 'a', day: '2026-10-27' }, { recipeId: 'b', day: '2026-10-27' }, { recipeId: 'c', day: '2026-10-27' }];
  assert.equal(weeklyUsage(uses, '2026-10-26', '2026-11-01').northStar, false);
  uses[2].day = '2026-10-28'; assert.equal(weeklyUsage(uses, '2026-10-26', '2026-11-01').northStar, true);
  assert.equal(weeklyUsage([uses[0], uses[0], uses[2]], '2026-10-26', '2026-11-01').northStar, false);
});
test('shopping keeps uncertain quantities separate and removes pantry ingredients', () => {
  const recipes = [{ id: 'a', name: 'A', ingredients: ['1 morcov', '100 g orez'] }, { id: 'b', name: 'B', ingredients: ['1 morcov', '2 linguri orez'] }];
  const plan = [{ slot: '1', recipeId: 'a' }, { slot: '2', recipeId: 'b' }];
  const list = shoppingList(plan, recipes, []); assert.equal(list.length, 3); assert.equal(list.find(r => r.label === '1 morcov').recipes.length, 2);
  assert.equal(shoppingList(plan, recipes, ['morcov']).length, 2);
});
test('date keys remain correct over daylight saving boundaries', () => {
  const days = nextDays(new Date('2026-10-25T23:30:00Z')); assert.equal(days[0].key, '2026-10-26'); assert.equal(days.length, 7); assert.equal(days[6].key, '2026-11-01');
});
