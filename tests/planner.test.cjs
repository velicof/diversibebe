const { test } = require('node:test'), assert = require('node:assert/strict');
const { load, plain } = require('./load-ts.cjs');
const season = load('src/features/v2/season.ts');
const { catalog, previewCatalog } = load('src/features/v2/catalog.ts');
const { recommend, initialFilters } = load('src/features/v2/recommendations.ts');
const P = load('src/features/v2/planning.ts');
const { appReducer, emptyState, readState } = load('src/features/v2/model.ts');
const { canTransition, isPublishable } = load('src/features/v2/review.ts');
const { makeEvent } = load('src/features/v2/analytics.ts');
const { editorialShortlist } = load('src/features/v2/content/shortlist.ts');

const ctx = (extra = {}) => ({ mode: 'preview', favorites: [], introduced: [], used: [], excludedIngredients: [], requiresClinicalGuidance: false, ...extra });
const days = ['2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
const recipe = (id, ingredients, extra = {}) => ({ ...catalog[0], id, name: id, ingredients, ingredientIds: [], minutes: 10, minimumMonths: 6, mealType: 'pranz', automaticReview: { status: 'no-automatic-issues', reasons: [] }, ...extra });

test('Romanian season calendar classifies produce by month without false matches', () => {
  const by = (id) => season.produce.find((p) => p.id === id);
  assert.equal(season.availability(by('dovleac'), 11), 'local');
  assert.equal(season.availability(by('dovleac'), 1), 'depozit');
  assert.equal(season.availability(by('dovlecel'), 11), 'import');
  assert.equal(season.availability(by('dovlecel'), 7), 'local');
  assert.equal(season.availability(by('ovaz'), 3), 'tot-anul');
  assert.equal(season.availability(by('banana'), 7), 'import');
  const ids = (lines) => plain(season.detectProduce(lines).map((p) => p.id));
  assert.deepEqual(ids(['1 lingură mare de ulei']), []);
  assert.deepEqual(ids(['1 cartof dulce']), ['cartof-dulce']);
  assert.ok(ids(['2 mere', '1 cartof']).includes('mar') && ids(['2 mere', '1 cartof']).includes('cartof'));
  assert.equal(season.calendar().length, season.produce.length);
  assert.equal(season.calendar()[0].months.length, 12);
});

test('seasonality only re-orders eligible recipes and never outweighs a preference', () => {
  const inSeason = recipe('a-dovleac', ['200 g dovleac', '1 morcov', '1 pastarnac', '1 telina']);
  const favorite = recipe('b-favorit', ['100 g orez']);
  const tooOld = recipe('c-12-luni', ['200 g dovleac'], { minimumMonths: 12 });
  const flagged = recipe('d-flag', ['200 g dovleac'], { automaticReview: { status: 'safety-issue', reasons: ['x'] } });
  const all = [inSeason, favorite, tooOld, flagged];
  const nov = recommend(all, { ...initialFilters, months: 8 }, ctx({ month: 11 }));
  assert.deepEqual(plain(nov.map((r) => r.id)), ['a-dovleac', 'b-favorit']);
  const withFavorite = recommend(all, { ...initialFilters, months: 8 }, ctx({ month: 11, favorites: ['b-favorit'] }));
  assert.equal(withFavorite[0].id, 'b-favorit', 'favorites (priority 5) beat seasonality (priority 6)');
  assert.equal(recommend(all, { ...initialFilters, months: 8 }, ctx({ month: 11, requiresClinicalGuidance: true })).length, 0);
});

test('5-day proposal: distinct eligible meals, ingredient reuse, kept days and non-overlapping alternatives', () => {
  const eligible = recommend(catalog, { ...initialFilters, months: 12 }, ctx({ month: 11 }));
  const proposal = P.proposePlan(eligible, days, { reuseIngredients: true });
  assert.equal(proposal.length, 5);
  assert.deepEqual(plain(proposal.map((d) => d.slot)), days);
  const ids = proposal.map((d) => d.recipeId);
  assert.equal(new Set(ids).size, 5);
  for (const id of ids) assert.ok(eligible.some((r) => r.id === id), id + ' must be eligible');
  const alts = proposal.flatMap((d) => d.alternatives);
  assert.ok(alts.every((id) => !ids.includes(id)) && new Set(alts).size === alts.length);
  const pick = (p) => p.map((d) => catalog.find((r) => r.id === d.recipeId));
  const shared = (p) => P.reusedIngredients(pick(p)).reduce((n, r) => n + r.recipes, 0);
  assert.ok(shared(proposal) >= shared(P.proposePlan(eligible, days, { reuseIngredients: false })), 'reuse never lowers shared produce');
  const kept = new Map([[days[2], eligible[30]]]);
  const withKept = P.proposePlan(eligible, days, { reuseIngredients: true, kept });
  assert.equal(withKept[2].recipeId, eligible[30].id);
  assert.equal(withKept[2].kept, true);
  assert.equal(withKept.filter((d) => d.recipeId === eligible[30].id).length, 1);
  assert.deepEqual(plain(P.proposePlan([], days, { reuseIngredients: true })), []);
});

test('ingredient parser never invents quantities', () => {
  const a = (line) => plain(P.parseIngredient(line).amount);
  assert.deepEqual(a('1 kg cartofi'), { value: 1000, unit: 'g' });
  assert.deepEqual(a('250 ml lapte'), { value: 250, unit: 'ml' });
  assert.deepEqual(a('1/2 banană'), { value: 0.5, unit: 'buc' });
  assert.deepEqual(a('2 morcovi medii (200g)'), { value: 2, unit: 'buc' });
  assert.deepEqual(a('2 linguri ulei'), { value: 2, unit: 'lingură' });
  for (const line of ['2-3 căpșuni', 'Sare după gust', '1 vârf scorțișoară', '2 felii ananas (opțional)', 'Fructe la alegere', 'o lingură unt'])
    assert.equal(a(line), null, line);
});

test('shopping list sums only compatible units, keeps notes and honours "am acasă"', () => {
  const r1 = recipe('r1', ['200 g morcov', '1 morcov', '1 lingură ulei de măsline', 'Apă după nevoie']);
  const r2 = recipe('r2', ['300 g morcovi', '2 linguri ulei de măsline', '2-3 căpșuni']);
  const plan = [{ slot: days[0], recipeId: 'r1' }, { slot: days[1], recipeId: 'r2' }];
  const { toBuy, atHome } = P.buildShoppingList(plan, [r1, r2], []);
  const morcov = toBuy.find((i) => i.key === 'p:morcov');
  assert.deepEqual(plain(morcov.amounts), [{ value: 500, unit: 'g' }, { value: 1, unit: 'buc' }]);
  assert.equal(P.formatAmounts(morcov.amounts), '500 g + 1 buc');
  assert.deepEqual(plain(toBuy.find((i) => i.key === 'n:ulei de masline').amounts), [{ value: 3, unit: 'lingură' }]);
  assert.equal(toBuy.find((i) => i.key === 'n:ulei de masline').name, 'Ulei de măsline', 'display keeps diacritics');
  assert.equal(P.formatAmounts([{ value: 0.13, unit: 'linguriță' }, { value: 1.25, unit: 'cană' }, { value: 3, unit: 'lingură' }]), '⅛ linguriță + 1¼ căni + 3 linguri');
  assert.ok(!P.buildShoppingList([{ slot: days[0], recipeId: 'w' }], [recipe('w', ['400 ml apă sau supă de legume'])], []).toBuy.length, 'measured water is not shopping');
  assert.deepEqual(plain(toBuy.find((i) => i.key === 'p:capsuni').notes), ['2-3 căpșuni']);
  assert.ok(!toBuy.some((i) => /apa/.test(i.key)), 'water is not shopping');
  assert.equal(atHome.length, 0);
  const home = P.buildShoppingList(plan, [r1, r2], ['p:morcov']);
  assert.ok(home.atHome.some((i) => i.key === 'p:morcov') && !home.toBuy.some((i) => i.key === 'p:morcov'));
  assert.ok(P.buildShoppingList(plan, [r1, r2], ['morcov']).atHome.some((i) => i.key === 'p:morcov'), 'legacy pantry ids still work');
  const universe = P.shoppingKeyUniverse(catalog);
  for (const item of P.buildShoppingList(days.map((slot, i) => ({ slot, recipeId: catalog[i * 7].id })), catalog, []).toBuy) assert.ok(universe.has(item.key), item.key);
});

test('plan-many writes only the given days and validated state keeps pantry separate from introduced foods', () => {
  let state = appReducer(emptyState, { type: 'plan', slot: '2026-11-10', recipeId: catalog[0].id });
  state = appReducer(state, { type: 'plan-many', entries: days.map((slot, i) => ({ slot, recipeId: catalog[i].id })) });
  assert.equal(state.plan.length, 6);
  state = appReducer(state, { type: 'plan-many', entries: [{ slot: days[0], recipeId: catalog[9].id }] });
  assert.equal(state.plan.length, 6);
  assert.equal(state.plan.find((p) => p.slot === days[0]).recipeId, catalog[9].id);
  const keys = P.shoppingKeyUniverse(catalog);
  const raw = JSON.stringify({ version: 1, onboarded: true, stage: 8, introduced: ['morcov', 'p:morcov'], favorites: [], plan: [], uses: [], pantry: ['p:morcov', 'morcov', 'p:nu-exista'], shoppingChecked: ['p:morcov', 'x'] });
  const read = readState(raw, new Set(catalog.map((r) => r.id)), new Set(['morcov']), keys, new Set(['morcov', ...keys]));
  assert.deepEqual(plain(read.introduced), ['morcov']);
  assert.deepEqual(plain(read.pantry), ['p:morcov', 'morcov']);
  assert.deepEqual(plain(read.shoppingChecked), ['p:morcov']);
});

test('editorial workflow cannot reach approval or publication without a documented clinical review', () => {
  const pending = { status: 'pending' };
  const reviewed = { status: 'reviewed', reviewer: 'Dr. Test', credentials: 'medic pediatru', reviewedAt: '2026-11-01T10:00:00Z', sourceUrls: ['https://example.org/ghid'], version: '1' };
  assert.equal(canTransition('draft', 'review_required', pending), true);
  assert.equal(canTransition('review_required', 'clinically_approved', pending), false);
  assert.equal(canTransition('draft', 'published', reviewed), false);
  assert.equal(canTransition('review_required', 'clinically_approved', reviewed), true);
  assert.equal(canTransition('clinically_approved', 'published', reviewed), true);
  assert.equal(isPublishable('published', pending), false);
  assert.equal(isPublishable('published', reviewed), true);
});

test('new events carry only aggregate counts', () => {
  const e = makeEvent('shopping_list_generated', { count: 7, recipe: 'x', childName: 'Ana' }, '2026-11-02T10:00:00Z', 'id-1');
  assert.deepEqual(plain(e.properties), { count: 7 });
  assert.deepEqual(plain(makeEvent('recipe_viewed', { recipeId: 'x', age: 8 }, '2026-11-02T10:00:00Z', 'id-2').properties), {});
});

test('editorial shortlist is 80-100 existing, automatically clean recipes awaiting clinical review', () => {
  assert.ok(editorialShortlist.length >= 80 && editorialShortlist.length <= 100);
  const ids = editorialShortlist.map((r) => r.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const { id, status } of editorialShortlist) {
    const r = catalog.find((x) => x.id === id);
    assert.ok(r, id);
    assert.equal(r.automaticReview.status, 'no-automatic-issues');
    assert.ok(r.minutes !== null && r.minutes <= 30);
    assert.equal(status, 'review_required');
    assert.equal(r.review.status, 'pending');
  }
  for (const meal of ['mic-dejun', 'pranz', 'cina', 'gustare']) assert.ok(editorialShortlist.some(({ id }) => catalog.find((r) => r.id === id).mealType === meal));
  assert.ok(previewCatalog.length > 0);
});
